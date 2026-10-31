import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { ROLES, CATEGORIES, PRIORITIES, COMPLAINT_STATUSES, AI_ANALYSIS_STATUSES } from '../src/constants/enums.js';
import { ENV } from '../src/config/env.js';

let mongoServer: MongoMemoryServer;
let studentToken: string;
let studentId: string;
let anotherStudentToken: string;
let anotherStudentId: string;
let adminToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed Student 1
  const student = await User.create({
    name: 'Alice Student',
    email: 'alice.student@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  studentId = student._id.toString();
  studentToken = jwt.sign(
    { id: studentId, email: student.email, role: student.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Student 2
  const anotherStudent = await User.create({
    name: 'Bob Student',
    email: 'bob.student@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  anotherStudentId = anotherStudent._id.toString();
  anotherStudentToken = jwt.sign(
    { id: anotherStudentId, email: anotherStudent.email, role: anotherStudent.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Admin
  const admin = await User.create({
    name: 'Admin Carol',
    email: 'carol.admin@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.ADMIN,
  });
  adminToken = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: admin.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Complaint.deleteMany({});
});

describe('Complaint Submission Pipeline Tests (Day 2)', () => {
  describe('POST /api/complaints', () => {
    it('should successfully create a complaint with valid fields and return 201', async () => {
      const payload = {
        title: 'Projector not working in Room 204',
        description: 'The overhead projector does not turn on even after switching cords.',
        category: CATEGORIES.ELECTRICAL,
        priority: PRIORITIES.HIGH,
        location: {
          building: 'Block A',
          floor: '2',
          room: '204',
        },
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaintId).toMatch(/^FC-\d+/);
      expect(res.body.data.status).toBe(COMPLAINT_STATUSES.SUBMITTED);
      expect(res.body.data.aiAnalysisStatus).toBe(AI_ANALYSIS_STATUSES.PENDING);

      // Verify in MongoDB
      const saved = await Complaint.findOne({ complaintId: res.body.data.complaintId });
      expect(saved).not.toBeNull();
      expect(saved!.studentId.toString()).toBe(studentId);
      expect(saved!.statusHistory.length).toBe(1);
      expect(saved!.statusHistory[0].status).toBe(COMPLAINT_STATUSES.SUBMITTED);
      expect(saved!.location.room).toBe('204');
    });

    it('should reject complaint creation if category is invalid', async () => {
      const payload = {
        title: 'Broken chair in cafeteria',
        description: 'The leg of the chair is detached and dangerous.',
        category: 'NonExistentCategory',
        location: { building: 'Cafeteria', floor: '1', room: 'Dining' },
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject complaint creation if description is under 10 characters', async () => {
      const payload = {
        title: 'Broken fan',
        description: 'Broken',
        category: CATEGORIES.ELECTRICAL,
        location: { building: 'Block B', floor: '1', room: '101' },
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should block non-students from submitting a complaint (403 Forbidden)', async () => {
      const payload = {
        title: 'Water tap leaking in washroom',
        description: 'Continuous dripping from the main faucet.',
        category: CATEGORIES.PLUMBING,
        location: { building: 'Block C', floor: '3', room: 'Restroom' },
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should accept an image attachment and assign an imageUrl', async () => {
      const validPngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Leaking pipe under sink')
        .field('description', 'Heavy water pooling under sink in chemistry lab.')
        .field('category', CATEGORIES.PLUMBING)
        .field('location', JSON.stringify({ building: 'Science Lab', floor: '1', room: 'Chem Lab' }))
        .attach('image', validPngBuffer, 'sample.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.imageUrl).toBeDefined();
    });
  });

  describe('GET /api/complaints/my', () => {
    beforeEach(async () => {
      // Create 2 complaints for student 1
      await Complaint.create({
        complaintId: 'FC-TEST-1',
        studentId: new mongoose.Types.ObjectId(studentId),
        title: 'Ticket 1 for Alice',
        description: 'First test ticket for Alice student',
        category: CATEGORIES.ELECTRICAL,
        location: { building: 'A', floor: '1', room: '10' },
        status: COMPLAINT_STATUSES.SUBMITTED,
      });

      await Complaint.create({
        complaintId: 'FC-TEST-2',
        studentId: new mongoose.Types.ObjectId(studentId),
        title: 'Ticket 2 for Alice',
        description: 'Second test ticket for Alice student',
        category: CATEGORIES.IT_SUPPORT,
        location: { building: 'A', floor: '2', room: '20' },
        status: COMPLAINT_STATUSES.SUBMITTED,
      });

      // Create 1 complaint for student 2 (Bob)
      await Complaint.create({
        complaintId: 'FC-TEST-3',
        studentId: new mongoose.Types.ObjectId(anotherStudentId),
        title: 'Ticket for Bob',
        description: 'Bob test ticket description',
        category: CATEGORIES.PLUMBING,
        location: { building: 'B', floor: '1', room: '05' },
        status: COMPLAINT_STATUSES.SUBMITTED,
      });
    });

    it('should return only complaints belonging to the requesting student', async () => {
      const res = await request(app)
        .get('/api/complaints/my')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints.length).toBe(2);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.complaints[0].title).toMatch(/Alice/);
    });
  });

  describe('GET /api/complaints/:id (Ownership & IDOR Protection)', () => {
    let aliceComplaintId: string;

    beforeEach(async () => {
      const complaint = await Complaint.create({
        complaintId: 'FC-ALICE-1',
        studentId: new mongoose.Types.ObjectId(studentId),
        title: 'Alice Private Complaint',
        description: 'Detailed description of issue in dormitory room',
        category: CATEGORIES.INFRASTRUCTURE,
        location: { building: 'Hostel 1', floor: '3', room: '302' },
        status: COMPLAINT_STATUSES.SUBMITTED,
      });
      aliceComplaintId = complaint._id.toString();
    });

    it('should allow the owner to view their own complaint', async () => {
      const res = await request(app)
        .get(`/api/complaints/${aliceComplaintId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.title).toBe('Alice Private Complaint');
    });

    it('should prevent another student from viewing the complaint (IDOR Defense: 403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/complaints/${aliceComplaintId}`)
        .set('Authorization', `Bearer ${anotherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow an administrator to view any student complaint', async () => {
      const res = await request(app)
        .get(`/api/complaints/${aliceComplaintId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.title).toBe('Alice Private Complaint');
    });
  });
});
