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
let studentId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const admin = await User.create({
    name: 'Admin Analytics',
    email: 'admin.analytics@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.ADMIN,
  });
  adminToken = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: admin.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const student = await User.create({
    name: 'Student Analytics',
    email: 'student.analytics@campus.edu',
    passwordHash: 'dummy_hash',
    role: ROLES.STUDENT,
  });
  studentId = student._id as mongoose.Types.ObjectId;
  studentToken = jwt.sign(
    { id: student._id.toString(), email: student.email, role: student.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Complaint.deleteMany({});
});

describe('Admin Analytics Aggregations Tests (Day 6 Phase 6.1)', () => {
  it('should return empty analytics structure gracefully when no complaints exist', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const { summary, byStatus, byCategory, byPriority, departmentWorkload, avgResolutionHours, dailyTrend } =
      res.body.data;

    expect(summary.totalComplaints).toBe(0);
    expect(summary.resolvedComplaints).toBe(0);
    expect(summary.openComplaints).toBe(0);
    expect(summary.resolutionRate).toBe(0);
    expect(summary.urgentActive).toBe(0);
    expect(summary.aiCompleted).toBe(0);

    expect(byStatus).toHaveLength(7);
    expect(byCategory).toHaveLength(5);
    expect(byPriority).toHaveLength(4);
    expect(departmentWorkload).toHaveLength(0);
    expect(avgResolutionHours).toBe(0);
    expect(dailyTrend).toHaveLength(7);
  });

  it('should accurately aggregate metrics across complaints, categories, priorities and departments', async () => {
    // Seed 4 complaints with different statuses, categories, priorities, and departments
    await Complaint.create([
      {
        complaintId: 'FC-TEST-1',
        studentId,
        title: 'Water pipe leaking',
        description: 'Pipes leaking on 2nd floor hall.',
        category: CATEGORIES.PLUMBING,
        priority: PRIORITIES.URGENT,
        status: COMPLAINT_STATUSES.SUBMITTED,
        assignedDepartment: 'Plumbing & Sanitation',
        location: { building: 'Hostel A', floor: '2', room: '201' },
      },
      {
        complaintId: 'FC-TEST-2',
        studentId,
        title: 'Flickering lights in lab',
        description: 'Lights flickering intermittently.',
        category: CATEGORIES.ELECTRICAL,
        priority: PRIORITIES.HIGH,
        status: COMPLAINT_STATUSES.IN_PROGRESS,
        assignedDepartment: 'Electrical Maintenance',
        location: { building: 'Block C', floor: '1', room: '105' },
      },
      {
        complaintId: 'FC-TEST-3',
        studentId,
        title: 'Broken chair in library',
        description: 'Chair leg is detached.',
        category: CATEGORIES.INFRASTRUCTURE,
        priority: PRIORITIES.LOW,
        status: COMPLAINT_STATUSES.RESOLVED,
        assignedDepartment: 'Carpentry',
        location: { building: 'Library', floor: 'G', room: 'Reading Hall' },
      },
      {
        complaintId: 'FC-TEST-4',
        studentId,
        title: 'Network switch down',
        description: 'Switch port has no connectivity.',
        category: CATEGORIES.IT_SUPPORT,
        priority: PRIORITIES.MEDIUM,
        status: COMPLAINT_STATUSES.ACKNOWLEDGED,
        assignedDepartment: null,
        location: { building: 'Block A', floor: '3', room: '302' },
      },
    ]);

    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary, byStatus, byCategory, byPriority, departmentWorkload, dailyTrend } =
      res.body.data;

    // Summary checks
    expect(summary.totalComplaints).toBe(4);
    expect(summary.resolvedComplaints).toBe(1);
    expect(summary.openComplaints).toBe(3);
    expect(summary.resolutionRate).toBe(25); // 1 / 4 = 25%
    expect(summary.urgentActive).toBe(1); // 1 urgent complaint that is not resolved

    // Status checks
    const resolvedStatus = byStatus.find((s: any) => s.status === COMPLAINT_STATUSES.RESOLVED);
    expect(resolvedStatus?.count).toBe(1);
    expect(resolvedStatus?.percentage).toBe(25);

    // Category checks
    const plumbingCategory = byCategory.find((c: any) => c.category === CATEGORIES.PLUMBING);
    expect(plumbingCategory?.count).toBe(1);
    expect(plumbingCategory?.percentage).toBe(25);

    // Priority checks
    const urgentPriority = byPriority.find((p: any) => p.priority === PRIORITIES.URGENT);
    expect(urgentPriority?.count).toBe(1);
    expect(urgentPriority?.percentage).toBe(25);

    // Department Workload checks
    expect(departmentWorkload.length).toBeGreaterThanOrEqual(3);
    const unassignedDept = departmentWorkload.find((d: any) => d.department === 'Unassigned');
    expect(unassignedDept?.total).toBe(1);

    // Daily Trend
    expect(dailyTrend).toHaveLength(7);
    const todayCount = dailyTrend[dailyTrend.length - 1].count;
    expect(todayCount).toBe(4);
  });

  it('should block regular students from accessing analytics with 403 Forbidden (RBAC)', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Cookie', [`token=${studentToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should block unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/admin/analytics');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
