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

  describe('PATCH /api/admin/complaints/:id/status (State Machine Lifecycle)', () => {
    it('should transition complaint from Submitted to Acknowledged and record statusHistory', async () => {
      const res = await request(app)
        .patch('/api/admin/complaints/FC-ADMIN-1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: COMPLAINT_STATUSES.ACKNOWLEDGED,
          comment: 'Acknowledged by facility management',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.status).toBe(COMPLAINT_STATUSES.ACKNOWLEDGED);
      expect(res.body.data.complaint.statusHistory.length).toBeGreaterThan(0);

      const latestHistory = res.body.data.complaint.statusHistory.slice(-1)[0];
      expect(latestHistory.status).toBe(COMPLAINT_STATUSES.ACKNOWLEDGED);
      expect(latestHistory.comment).toBe('Acknowledged by facility management');
    });

    it('should reject an illegal jump directly from Submitted to Resolved (400 Bad Request)', async () => {
      // Re-create a fresh Submitted complaint
      const freshTicket = await Complaint.create({
        complaintId: 'FC-ILLEGAL-TEST',
        studentId: new mongoose.Types.ObjectId(),
        title: 'Flickering lights in room 300',
        description: 'Lights keep turning off every 2 minutes.',
        category: CATEGORIES.ELECTRICAL,
        priority: PRIORITIES.LOW,
        status: COMPLAINT_STATUSES.SUBMITTED,
        location: { building: 'Arts Block', floor: '3', room: '300' },
      });

      const res = await request(app)
        .patch(`/api/admin/complaints/${freshTicket.complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: COMPLAINT_STATUSES.RESOLVED,
          comment: 'Illegal jump attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(res.body.message).toContain('Cannot transition complaint status');
    });

    it('should prevent transitioning out of a terminal state like Resolved', async () => {
      const res = await request(app)
        .patch('/api/admin/complaints/FC-ADMIN-3/status') // FC-ADMIN-3 is Resolved
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: COMPLAINT_STATUSES.IN_PROGRESS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should block a regular student from changing status (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/admin/complaints/FC-ADMIN-1/status')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          status: COMPLAINT_STATUSES.ACKNOWLEDGED,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/admin/complaints/:id (Triage & Assignment)', () => {
    it('should assign a department and adjust priority successfully', async () => {
      const res = await request(app)
        .patch('/api/admin/complaints/FC-ADMIN-2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedDepartment: 'Plumbing & Water Supply',
          priority: PRIORITIES.HIGH,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.assignedDepartment).toBe('Plumbing & Water Supply');
      expect(res.body.data.complaint.priority).toBe(PRIORITIES.HIGH);
    });

    it('should block a student from updating triage metadata (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/admin/complaints/FC-ADMIN-2')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignedDepartment: 'Student Union',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

