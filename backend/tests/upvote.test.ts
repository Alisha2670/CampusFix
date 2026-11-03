import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import {
  ROLES,
  CATEGORIES,
  PRIORITIES,
  COMPLAINT_STATUSES,
} from '../src/constants/enums.js';
import { ENV } from '../src/config/env.js';

let mongoServer: MongoMemoryServer;
let student1Token: string;
let student1Id: string;
let student2Token: string;
let student2Id: string;
let adminToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed Student 1
  const student1 = await User.create({
    name: 'Alice Student',
    email: 'alice.upvote@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  student1Id = student1._id.toString();
  student1Token = jwt.sign(
    { id: student1Id, email: student1.email, role: student1.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Student 2
  const student2 = await User.create({
    name: 'Bob Student',
    email: 'bob.upvote@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  student2Id = student2._id.toString();
  student2Token = jwt.sign(
    { id: student2Id, email: student2.email, role: student2.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Admin
  const admin = await User.create({
    name: 'Admin Carol',
    email: 'carol.upvote@campus.edu',
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

describe('Student Upvoting & Campus Community Feed Tests', () => {
  describe('POST /api/complaints/:id/upvote (Me Too / +1 System)', () => {
    it('should allow a student to upvote a complaint and increment upvoteCount', async () => {
      const complaint = await Complaint.create({
        complaintId: 'FC-9001',
        studentId: new mongoose.Types.ObjectId(student1Id),
        title: 'Water cooler leaking on Floor 2',
        description: 'Large puddle forming outside Room 204 near the stairs.',
        location: { building: 'Science Block', floor: '2', room: 'Hallway' },
        category: CATEGORIES.PLUMBING,
        priority: PRIORITIES.HIGH,
        status: COMPLAINT_STATUSES.SUBMITTED,
      });

      const res = await request(app)
        .post(`/api/complaints/${complaint._id}/upvote`)
        .set('Cookie', [`token=${student2Token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.upvoteCount).toBe(1);
      expect(res.body.data.hasUpvoted).toBe(true);

      // Verify in DB
      const updated = await Complaint.findById(complaint._id);
      expect(updated?.upvoteCount).toBe(1);
      expect(updated?.upvotes?.map((id) => id.toString())).toContain(student2Id);
    });

    it('should allow toggling off an upvote when clicked again', async () => {
      const complaint = await Complaint.create({
        complaintId: 'FC-9002',
        studentId: new mongoose.Types.ObjectId(student1Id),
        title: 'Broken AC in Lab 301',
        description: 'Room temperature is too hot for servers.',
        location: { building: 'Tech Block', floor: '3', room: '301' },
        category: CATEGORIES.ELECTRICAL,
        priority: PRIORITIES.MEDIUM,
        status: COMPLAINT_STATUSES.SUBMITTED,
        upvotes: [new mongoose.Types.ObjectId(student2Id)],
        upvoteCount: 1,
      });

      // Student 2 clicks again to un-vote
      const res = await request(app)
        .post(`/api/complaints/${complaint._id}/upvote`)
        .set('Cookie', [`token=${student2Token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.upvoteCount).toBe(0);
      expect(res.body.data.hasUpvoted).toBe(false);

      const updated = await Complaint.findById(complaint._id);
      expect(updated?.upvoteCount).toBe(0);
      expect(updated?.upvotes?.length).toBe(0);
    });

    it('should support multiple distinct students upvoting the same complaint', async () => {
      const complaint = await Complaint.create({
        complaintId: 'FC-9003',
        studentId: new mongoose.Types.ObjectId(student1Id),
        title: 'Elevator B stuck on Ground Floor',
        description: 'Doors will not open and emergency light is blinking.',
        location: { building: 'Library', floor: '0', room: 'Elevator B' },
        category: CATEGORIES.INFRASTRUCTURE,
        priority: PRIORITIES.URGENT,
        status: COMPLAINT_STATUSES.SUBMITTED,
      });

      // Student 1 upvotes
      await request(app)
        .post(`/api/complaints/${complaint._id}/upvote`)
        .set('Cookie', [`token=${student1Token}`]);

      // Student 2 upvotes
      const res2 = await request(app)
        .post(`/api/complaints/${complaint._id}/upvote`)
        .set('Cookie', [`token=${student2Token}`]);

      expect(res2.status).toBe(200);
      expect(res2.body.data.upvoteCount).toBe(2);
      expect(res2.body.data.hasUpvoted).toBe(true);

      const inDb = await Complaint.findById(complaint._id);
      expect(inDb?.upvoteCount).toBe(2);
      expect(inDb?.upvotes?.length).toBe(2);
    });

    it('should return 404 when upvoting a non-existent complaint', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/complaints/${nonExistentId}/upvote`)
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should block non-students (e.g. Admin) from upvoting with 403 Forbidden', async () => {
      const complaint = await Complaint.create({
        complaintId: 'FC-9004',
        studentId: new mongoose.Types.ObjectId(student1Id),
        title: 'Flickering lights in lecture hall',
        description: 'Lights keep flickering continuously in hall 10.',
        location: { building: 'Block C', floor: '1', room: '10' },
        category: CATEGORIES.ELECTRICAL,
        priority: PRIORITIES.LOW,
        status: COMPLAINT_STATUSES.SUBMITTED,
      });

      const res = await request(app)
        .post(`/api/complaints/${complaint._id}/upvote`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated upvote requests with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/complaints/FC-9004/upvote');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/complaints/feed (Campus Community Feed)', () => {
    beforeEach(async () => {
      // Seed 3 complaints with different buildings, categories, and upvotes
      await Complaint.create([
        {
          complaintId: 'FC-101',
          studentId: new mongoose.Types.ObjectId(student1Id),
          title: 'Wi-Fi completely dead in Library 3rd floor',
          description: 'No student can connect to eduroam or CampusNet.',
          location: { building: 'Library', floor: '3', room: 'Reading Hall' },
          category: CATEGORIES.IT_SUPPORT,
          priority: PRIORITIES.HIGH,
          status: COMPLAINT_STATUSES.SUBMITTED,
          upvotes: [
            new mongoose.Types.ObjectId(student1Id),
            new mongoose.Types.ObjectId(student2Id),
          ],
          upvoteCount: 2,
        },
        {
          complaintId: 'FC-102',
          studentId: new mongoose.Types.ObjectId(student2Id),
          title: 'Broken chair in Classroom 102',
          description: 'One chair has a broken leg in the back row.',
          location: { building: 'Block B', floor: '1', room: '102' },
          category: CATEGORIES.INFRASTRUCTURE,
          priority: PRIORITIES.LOW,
          status: COMPLAINT_STATUSES.ACKNOWLEDGED,
          upvotes: [],
          upvoteCount: 0,
        },
        {
          complaintId: 'FC-103',
          studentId: new mongoose.Types.ObjectId(student1Id),
          title: 'Water fountain filter dirty',
          description: 'Water has a strange metallic taste.',
          location: { building: 'Library', floor: '1', room: 'Entrance' },
          category: CATEGORIES.PLUMBING,
          priority: PRIORITIES.MEDIUM,
          status: COMPLAINT_STATUSES.IN_PROGRESS,
          upvotes: [new mongoose.Types.ObjectId(student2Id)],
          upvoteCount: 1,
        },
      ]);
    });

    it('should return all active complaints sorted by mostUpvoted by default', async () => {
      const res = await request(app)
        .get('/api/complaints/feed')
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints.length).toBe(3);

      // Default sort is mostUpvoted: FC-101 (2 votes), FC-103 (1 vote), FC-102 (0 votes)
      expect(res.body.data.complaints[0].complaintId).toBe('FC-101');
      expect(res.body.data.complaints[1].complaintId).toBe('FC-103');
      expect(res.body.data.complaints[2].complaintId).toBe('FC-102');
    });

    it('should indicate whether the requesting student has upvoted each complaint', async () => {
      const res = await request(app)
        .get('/api/complaints/feed')
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(200);
      const items = res.body.data.complaints;

      const item101 = items.find((c: any) => c.complaintId === 'FC-101');
      const item102 = items.find((c: any) => c.complaintId === 'FC-102');
      const item103 = items.find((c: any) => c.complaintId === 'FC-103');

      expect(item101.hasUpvoted).toBe(true); // Student 1 upvoted FC-101
      expect(item102.hasUpvoted).toBe(false); // Student 1 did not upvote FC-102
      expect(item103.hasUpvoted).toBe(false); // Only Student 2 upvoted FC-103
    });

    it('should protect reporter privacy in public feed by not leaking email or phone', async () => {
      const res = await request(app)
        .get('/api/complaints/feed')
        .set('Cookie', [`token=${student2Token}`]);

      expect(res.status).toBe(200);
      const first = res.body.data.complaints[0];
      // Student object should only contain safe public attributes like name
      expect(first.studentId).toBeDefined();
      expect(first.studentId.name).toBe('Alice Student');
      expect(first.studentId.email).toBeUndefined();
      expect(first.studentId.phone).toBeUndefined();
    });

    it('should filter feed by building and category', async () => {
      const res = await request(app)
        .get('/api/complaints/feed?building=Library&category=Plumbing')
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.complaints.length).toBe(1);
      expect(res.body.data.complaints[0].complaintId).toBe('FC-103');
    });

    it('should allow sorting by newest (createdAt)', async () => {
      const res = await request(app)
        .get('/api/complaints/feed?sort=newest')
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.complaints.length).toBe(3);
    });

    it('should reject unauthenticated requests to feed with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/complaints/feed');
      expect(res.status).toBe(401);
    });
  });
});
