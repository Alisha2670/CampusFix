import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { Notification } from '../src/models/Notification.js';
import { ENV } from '../src/config/env.js';
import {
  ROLES,
  CATEGORIES,
  PRIORITIES,
  COMPLAINT_STATUSES,
} from '../src/constants/enums.js';

let mongoServer: MongoMemoryServer;
let studentToken: string;
let studentId: string;
let secondStudentToken: string;
let secondStudentId: string;
let adminToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed Student 1
  const student = await User.create({
    name: 'Alice Student',
    email: 'alice.notif@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  studentId = student._id.toString();
  studentToken = jwt.sign(
    { id: studentId, email: student.email, role: student.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Student 2 (for IDOR tests)
  const secondStudent = await User.create({
    name: 'Bob Student',
    email: 'bob.notif@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  secondStudentId = secondStudent._id.toString();
  secondStudentToken = jwt.sign(
    { id: secondStudentId, email: secondStudent.email, role: secondStudent.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Seed Admin
  const admin = await User.create({
    name: 'Carol Admin',
    email: 'carol.notif@campus.edu',
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
  await Notification.deleteMany({});
  await Complaint.deleteMany({});
});

describe('In-App Notification System Tests (Day 4 Phase 4.2)', () => {
  it('should auto-create a notification when admin updates complaint status', async () => {
    // 1. Create a complaint for Student 1
    const complaint = await Complaint.create({
      complaintId: 'FC-NOTIF-01',
      studentId: new mongoose.Types.ObjectId(studentId),
      title: 'Water leak in cafeteria',
      description: 'Major water pipe bursting in the main cafeteria dining area.',
      category: CATEGORIES.PLUMBING,
      priority: PRIORITIES.HIGH,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Cafeteria', floor: '1', room: 'Main Hall' },
    });

    // 2. Admin transitions status to Acknowledged
    const updateRes = await request(app)
      .patch(`/api/admin/complaints/${complaint.complaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: COMPLAINT_STATUSES.ACKNOWLEDGED,
        comment: 'Technician dispatched to inspect valve.',
      });

    expect(updateRes.status).toBe(200);

    // 3. Student fetches notifications
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.success).toBe(true);
    expect(notifRes.body.data.notifications.length).toBe(1);
    expect(notifRes.body.data.unreadCount).toBe(1);
    expect(notifRes.body.data.notifications[0].message).toContain('Acknowledged');
    expect(notifRes.body.data.notifications[0].isRead).toBe(false);
  });

  it('should auto-create a notification when admin assigns a department', async () => {
    const complaint = await Complaint.create({
      complaintId: 'FC-NOTIF-02',
      studentId: new mongoose.Types.ObjectId(studentId),
      title: 'Flickering lights in lecture hall',
      description: 'The front row lights flicker constantly during class.',
      category: CATEGORIES.ELECTRICAL,
      priority: PRIORITIES.MEDIUM,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Science Block', floor: '2', room: '202' },
    });

    const triageRes = await request(app)
      .patch(`/api/admin/complaints/${complaint.complaintId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedDepartment: 'Electrical Maintenance',
      });

    expect(triageRes.status).toBe(200);

    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.notifications.length).toBe(1);
    expect(notifRes.body.data.notifications[0].message).toContain('Electrical Maintenance');
  });

  it('should allow a student to mark a single notification as read', async () => {
    const complaint = await Complaint.create({
      complaintId: 'FC-NOTIF-03',
      studentId: new mongoose.Types.ObjectId(studentId),
      title: 'Lab AC unit failure',
      description: 'AC unit is blowing hot air in the server room.',
      category: CATEGORIES.ELECTRICAL,
      priority: PRIORITIES.URGENT,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'IT Block', floor: '1', room: 'Server Room' },
    });

    const notif = await Notification.create({
      userId: new mongoose.Types.ObjectId(studentId),
      complaintId: complaint._id,
      message: 'Your ticket has been updated',
      isRead: false,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.isRead).toBe(true);

    // Verify unread count is now 0
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(listRes.body.data.unreadCount).toBe(0);
  });

  it('should prevent another student from marking a notification as read (IDOR Defense: 404)', async () => {
    const complaint = await Complaint.create({
      complaintId: 'FC-NOTIF-04',
      studentId: new mongoose.Types.ObjectId(studentId),
      title: 'Broken chair in library',
      description: 'Chair leg is detached and posing a safety hazard.',
      category: CATEGORIES.INFRASTRUCTURE,
      priority: PRIORITIES.LOW,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Library', floor: '2', room: 'Study Area' },
    });

    const notif = await Notification.create({
      userId: new mongoose.Types.ObjectId(studentId), // Belongs to Student 1
      complaintId: complaint._id,
      message: 'Private alert for Student 1',
      isRead: false,
    });

    // Student 2 attempts to mark Student 1's notification
    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${secondStudentToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should mark all notifications as read in bulk', async () => {
    const complaint = await Complaint.create({
      complaintId: 'FC-NOTIF-05',
      studentId: new mongoose.Types.ObjectId(studentId),
      title: 'Water tap leaking',
      description: 'Water tap in first floor restroom is dripping continuously.',
      category: CATEGORIES.PLUMBING,
      priority: PRIORITIES.LOW,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Main Block', floor: '1', room: 'Restroom' },
    });

    await Notification.create([
      {
        userId: new mongoose.Types.ObjectId(studentId),
        complaintId: complaint._id,
        message: 'Alert 1',
        isRead: false,
      },
      {
        userId: new mongoose.Types.ObjectId(studentId),
        complaintId: complaint._id,
        message: 'Alert 2',
        isRead: false,
      },
      {
        userId: new mongoose.Types.ObjectId(studentId),
        complaintId: complaint._id,
        message: 'Alert 3',
        isRead: false,
      },
    ]);

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.markedCount).toBe(3);

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(listRes.body.data.unreadCount).toBe(0);
    expect(listRes.body.data.notifications.every((n: any) => n.isRead === true)).toBe(true);
  });

  it('should block unauthenticated access to notification endpoints (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

