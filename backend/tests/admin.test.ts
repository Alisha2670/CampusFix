import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { ROLES, CATEGORIES, PRIORITIES, COMPLAINT_STATUSES } from '../src/constants/enums.js';
import { ENV } from '../src/config/env.js';

let mongoServer: MongoMemoryServer;
let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create Admin
  const admin = await User.create({
    name: 'Admin Carol',
    email: 'admin.test@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.ADMIN,
  });
  adminToken = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: admin.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create Student
  const student = await User.create({
    name: 'Student Dave',
    email: 'student.test@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  studentToken = jwt.sign(
    { id: student._id.toString(), email: student.email, role: student.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Complaints
  await Complaint.create([
    {
      complaintId: 'FC-ADMIN-1',
      studentId: student._id,
      title: 'Broken projector in lecture hall',
      description: 'The projector is dead and smells burnt.',
      category: CATEGORIES.ELECTRICAL,
      priority: PRIORITIES.HIGH,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Science Block', floor: '1', room: '101' },
    },
    {
      complaintId: 'FC-ADMIN-2',
      studentId: student._id,
      title: 'Water leaking in 2nd floor bathroom',
      description: 'Major leak from the main pipe.',
      category: CATEGORIES.PLUMBING,
      priority: PRIORITIES.URGENT,
      status: COMPLAINT_STATUSES.IN_PROGRESS,
      location: { building: 'Science Block', floor: '2', room: 'Restroom' },
    },
    {
      complaintId: 'FC-ADMIN-3',
      studentId: student._id,
      title: 'Wi-Fi router offline in Library',
      description: 'No internet connection available in reading hall.',
      category: CATEGORIES.IT_SUPPORT,
      priority: PRIORITIES.MEDIUM,
      status: COMPLAINT_STATUSES.RESOLVED,
      location: { building: 'Library', floor: '1', room: 'Reading Hall' },
    },
  ]);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Admin Complaint Retrieval & Triage Tests (Day 3)', () => {
  describe('GET /api/admin/complaints', () => {
    it('should allow an admin to retrieve all complaints with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/complaints?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints.length).toBe(3);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.totalPages).toBe(1);
      expect(res.body.data.complaints[0].studentId.name).toBe('Student Dave');
    });

    it('should filter complaints by status (e.g. status=In Progress)', async () => {
      const res = await request(app)
        .get(`/api/admin/complaints?status=${COMPLAINT_STATUSES.IN_PROGRESS}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints.length).toBe(1);
      expect(res.body.data.complaints[0].complaintId).toBe('FC-ADMIN-2');
    });

    it('should filter complaints by category (e.g. category=Electrical)', async () => {
      const res = await request(app)
        .get(`/api/admin/complaints?category=${CATEGORIES.ELECTRICAL}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints.length).toBe(1);
      expect(res.body.data.complaints[0].category).toBe(CATEGORIES.ELECTRICAL);
    });

    it('should search complaints by keyword in title or complaintId', async () => {
      const res = await request(app)
        .get('/api/admin/complaints?search=Library')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints.length).toBe(1);
      expect(res.body.data.complaints[0].complaintId).toBe('FC-ADMIN-3');
    });

    it('should block a regular student from accessing admin complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should block unauthenticated access (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/admin/complaints');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

