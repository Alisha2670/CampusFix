import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { Notification } from '../src/models/Notification.js';
import { ROLES, CATEGORIES, PRIORITIES, COMPLAINT_STATUSES } from '../src/constants/enums.js';
import { ENV } from '../src/config/env.js';

let mongoServer: MongoMemoryServer;
let student1Token: string;
let student2Token: string;
let student1Id: mongoose.Types.ObjectId;
let student2Id: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Student 1
  const student1 = await User.create({
    name: 'Student One',
    email: 'student1.sec@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  student1Id = student1._id as mongoose.Types.ObjectId;
  student1Token = jwt.sign(
    { id: student1._id.toString(), email: student1.email, role: student1.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Student 2
  const student2 = await User.create({
    name: 'Student Two',
    email: 'student2.sec@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  student2Id = student2._id as mongoose.Types.ObjectId;
  student2Token = jwt.sign(
    { id: student2._id.toString(), email: student2.email, role: student2.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Security & Boundary Auditing Tests (Day 7 Phase 7.2)', () => {
  describe('1. Privilege Escalation & Mass-Assignment Defense', () => {
    it('should strictly reject or ignore role escalation attempts during registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker Joe',
          email: 'hacker@campus.edu',
          password: 'Password123!',
          role: 'admin', // Malicious attempt to escalate role
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);

      // Verify in MongoDB that role was forced to 'student'
      const stored = await User.findOne({ email: 'hacker@campus.edu' });
      expect(stored!.role).toBe(ROLES.STUDENT);
    });
  });

  describe('2. JWT Authentication Boundaries & Tampering Defense', () => {
    it('should reject requests with forged or tampered JWT signatures (401)', async () => {
      const forgedToken = jwt.sign(
        { id: student1Id.toString(), email: 'forged@campus.edu', role: ROLES.ADMIN },
        'WRONG_SIGNING_KEY',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${forgedToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT tokens (401)', async () => {
      const expiredToken = jwt.sign(
        { id: student1Id.toString(), email: 'expired@campus.edu', role: ROLES.STUDENT },
        ENV.JWT_SECRET,
        { expiresIn: '-10s' } // Expired in the past
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${expiredToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject unauthenticated requests to protected endpoints (401)', async () => {
      const res = await request(app).get('/api/complaints/my');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. Insecure Direct Object Reference (IDOR) Defenses', () => {
    let student1Complaint: any;
    let student1Notification: any;

    beforeAll(async () => {
      student1Complaint = await Complaint.create({
        complaintId: 'FC-SEC-01',
        studentId: student1Id,
        title: 'Private room issue',
        description: 'Private dorm issue that should not be visible to other students.',
        category: CATEGORIES.INFRASTRUCTURE,
        priority: PRIORITIES.LOW,
        status: COMPLAINT_STATUSES.SUBMITTED,
        location: { building: 'Hostel 1', floor: '3', room: '305' },
      });

      student1Notification = await Notification.create({
        userId: student1Id,
        complaintId: student1Complaint._id,
        message: 'Your private ticket was logged.',
        isRead: false,
      });
    });

    it('should block Student 2 from viewing Student 1 complaint details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/complaints/${student1Complaint._id}`)
        .set('Cookie', [`token=${student2Token}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should block Student 2 from marking Student 1 notification as read (404/IDOR Defense)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${student1Notification._id}/read`)
        .set('Cookie', [`token=${student2Token}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('4. Role-Based Access Control (RBAC) Boundaries', () => {
    it('should block regular students from accessing admin triage endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/admin/complaints')
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should block regular students from accessing admin analytics (403)', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Cookie', [`token=${student1Token}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
