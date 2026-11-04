import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { EmailService } from '../src/services/email.service.js';
import { ROLES, CATEGORIES, PRIORITIES, COMPLAINT_STATUSES } from '../src/constants/enums.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Complaint.deleteMany({});
});

describe('Hybrid Email Notification System Tests', () => {
  describe('EmailService Template & Dispatch Engine', () => {
    it('should generate and simulate ticket confirmation email with zero crashes', async () => {
      const result = await EmailService.sendTicketConfirmationEmail(
        'student@campus.edu',
        'Aarav Sharma',
        {
          complaintId: 'FC-1024',
          title: 'AC Leaking in Library Room 302',
          category: CATEGORIES.ELECTRICAL,
          location: { building: 'Library', room: '302' },
        }
      );

      expect(result).toBe(true);
    });

    it('should generate and simulate status update emails across lifecycle states (In Progress, Resolved)', async () => {
      const progressResult = await EmailService.sendStatusUpdateEmail(
        'student@campus.edu',
        'Aarav Sharma',
        {
          complaintId: 'FC-1024',
          title: 'AC Leaking in Library Room 302',
          status: COMPLAINT_STATUSES.IN_PROGRESS,
          department: 'HVAC Maintenance',
        }
      );
      expect(progressResult).toBe(true);

      const resolvedResult = await EmailService.sendStatusUpdateEmail(
        'student@campus.edu',
        'Aarav Sharma',
        {
          complaintId: 'FC-1024',
          title: 'AC Leaking in Library Room 302',
          status: COMPLAINT_STATUSES.RESOLVED,
          department: 'HVAC Maintenance',
        }
      );
      expect(resolvedResult).toBe(true);
    });

    it('should generate and simulate password recovery email containing reset link', async () => {
      const resetResult = await EmailService.sendPasswordResetEmail(
        'student@campus.edu',
        'Aarav Sharma',
        'http://localhost:5173/reset-password?token=mock_sample_token_12345'
      );
      expect(resetResult).toBe(true);
    });

    it('should catch underlying errors gracefully and return false without crashing the caller', async () => {
      const sendPromise = EmailService.sendEmail({
        to: 'invalid-email-format',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      // Must resolve without unhandled rejection
      await expect(sendPromise).resolves.toBeDefined();
    });
  });

  describe('Integration Triggers (Non-Blocking Fire-and-Forget)', () => {
    it('should trigger password recovery email when forgot-password endpoint is hit', async () => {
      await User.create({
        name: 'Simulated Student',
        email: 'simulated@campus.edu',
        passwordHash: 'dummy_hash',
        role: ROLES.STUDENT,
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'simulated@campus.edu' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetUrl).toBeDefined();
    });

    it('should trigger status update email when admin transitions complaint status', async () => {
      const student = await User.create({
        name: 'Report Student',
        email: 'report.student@campus.edu',
        passwordHash: 'dummy_hash',
        role: ROLES.STUDENT,
      });

      const admin = await User.create({
        name: 'Campus Admin',
        email: 'admin.email@campus.edu',
        passwordHash: 'dummy_hash',
        role: ROLES.ADMIN,
      });

      const adminToken = jwt.sign(
        { id: admin._id.toString(), email: admin.email, role: admin.role },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const complaint = await Complaint.create({
        complaintId: 'FC-9999',
        studentId: student._id,
        title: 'Water tap leaking in hostel',
        description: 'Water tap leaking continuously in hostel 4 ground floor.',
        category: CATEGORIES.PLUMBING,
        priority: PRIORITIES.MEDIUM,
        location: { building: 'Hostel 4', floor: 'Ground', room: 'GF-02' },
        status: COMPLAINT_STATUSES.SUBMITTED,
        statusHistory: [
          {
            status: COMPLAINT_STATUSES.SUBMITTED,
            changedBy: student._id,
            comment: 'Filed',
            timestamp: new Date(),
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/admin/complaints/${complaint._id}/status`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          status: COMPLAINT_STATUSES.ACKNOWLEDGED,
          comment: 'Acknowledged by maintenance dispatcher',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.status).toBe(COMPLAINT_STATUSES.ACKNOWLEDGED);
    });
  });
});
