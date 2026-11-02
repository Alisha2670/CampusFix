import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { Notification } from '../src/models/Notification.js';
import {
  ROLES,
  CATEGORIES,
  PRIORITIES,
  COMPLAINT_STATUSES,
  AI_ANALYSIS_STATUSES,
} from '../src/constants/enums.js';

let mongoServer: MongoMemoryServer;
let originalFetch: typeof global.fetch;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Mock global.fetch so asynchronous AiService calls return 200 OK without live FastAPI server
  originalFetch = global.fetch;
  global.fetch = jest.fn().mockImplementation(async (url: any) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        suggestedCategory: 'Plumbing',
        suggestedPriority: 'Medium',
        possibleDuplicates: [
          {
            complaintId: 'FC-1001',
            similarity: 0.792,
          },
        ],
        confidence: 0.88,
      }),
    } as any;
  });

  // Seed standard administrator
  const passwordHash = await bcrypt.hash('AdminPass123!', 10);
  await User.create({
    name: 'Admin Supervisor',
    email: 'admin.e2e@campus.edu',
    passwordHash,
    role: ROLES.ADMIN,
  });
});

afterAll(async () => {
  global.fetch = originalFetch;
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Master End-to-End System Journey Tests (Day 7 Phase 7.1)', () => {
  let student1Cookie: string;
  let student2Cookie: string;
  let adminCookie: string;
  let complaint1Id: string;
  let complaint2Id: string;
  let complaint1ObjectId: string;
  let complaint2ObjectId: string;

  it('1. Student 1 Onboarding & Authentication Session', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Johnson',
        email: 'alice.e2e@campus.edu',
        password: 'Password123!',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.role).toBe(ROLES.STUDENT);

    const cookies = regRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    student1Cookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

    // Verify session
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [student1Cookie]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('alice.e2e@campus.edu');
  });

  it('2. Student 1 Files Initial Complaint (Save Before AI)', async () => {
    const complaintRes = await request(app)
      .post('/api/complaints')
      .set('Cookie', [student1Cookie])
      .send({
        title: 'Water dripping from ceiling vent in Room 204',
        description: 'Water droplets falling steadily onto desks in Room 204 of Block A.',
        category: CATEGORIES.PLUMBING,
        priority: PRIORITIES.MEDIUM,
        location: {
          building: 'Engineering Block A',
          floor: '2',
          room: '204',
        },
      });

    expect(complaintRes.status).toBe(201);
    expect(complaintRes.body.success).toBe(true);

    const data = complaintRes.body.data;
    expect(data.complaintId).toMatch(/^FC-\d{4,}$/);
    expect(data.status).toBe(COMPLAINT_STATUSES.SUBMITTED);
    expect(data.aiAnalysisStatus).toBe(AI_ANALYSIS_STATUSES.PENDING);

    complaint1Id = data.complaintId;

    // Verify in MongoDB directly
    const stored = await Complaint.findOne({ complaintId: complaint1Id });
    expect(stored).toBeDefined();
    expect(stored!.statusHistory).toHaveLength(1);
    expect(stored!.statusHistory[0].status).toBe(COMPLAINT_STATUSES.SUBMITTED);
    complaint1ObjectId = stored!._id.toString();

    // Ensure AI analysis is completed
    await new Promise((r) => setTimeout(r, 150));
    await Complaint.findByIdAndUpdate(complaint1ObjectId, {
      'aiAnalysis.status': AI_ANALYSIS_STATUSES.COMPLETED,
      'aiAnalysis.suggestedCategory': CATEGORIES.PLUMBING,
      'aiAnalysis.suggestedPriority': PRIORITIES.MEDIUM,
      'aiAnalysis.analyzedAt': new Date(),
    });
  });

  it('3. Student 2 Onboards & Files Duplicate Incident', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob Smith',
        email: 'bob.e2e@campus.edu',
        password: 'Password123!',
      });

    expect(regRes.status).toBe(201);
    const cookies = regRes.headers['set-cookie'];
    student2Cookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

    const complaintRes = await request(app)
      .post('/api/complaints')
      .set('Cookie', [student2Cookie])
      .send({
        title: 'Severe ceiling leak onto classroom desks',
        description: 'Ceiling vent leaking water in Room 204 Block A.',
        category: CATEGORIES.PLUMBING,
        priority: PRIORITIES.HIGH,
        location: {
          building: 'Engineering Block A',
          floor: '2',
          room: '204',
        },
      });

    expect(complaintRes.status).toBe(201);
    complaint2Id = complaintRes.body.data.complaintId;

    const stored2 = await Complaint.findOne({ complaintId: complaint2Id });
    expect(stored2).toBeDefined();
    complaint2ObjectId = stored2!._id.toString();

    // Ensure AI analysis is completed
    await new Promise((r) => setTimeout(r, 150));
    await Complaint.findByIdAndUpdate(complaint2ObjectId, {
      'aiAnalysis.status': AI_ANALYSIS_STATUSES.COMPLETED,
      'aiAnalysis.suggestedCategory': CATEGORIES.PLUMBING,
      'aiAnalysis.suggestedPriority': PRIORITIES.HIGH,
      'aiAnalysis.possibleDuplicates': [
        {
          complaintId: complaint1Id,
          similarity: 0.792,
        },
      ],
      'aiAnalysis.analyzedAt': new Date(),
    });
  });

  it('4. Administrator Authenticates and Queries Filtered Triage Feed', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin.e2e@campus.edu',
        password: 'AdminPass123!',
      });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    adminCookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

    // Query admin complaints filtered by category
    const triageRes = await request(app)
      .get(`/api/admin/complaints?category=${CATEGORIES.PLUMBING}&status=${COMPLAINT_STATUSES.SUBMITTED}`)
      .set('Cookie', [adminCookie]);

    expect(triageRes.status).toBe(200);
    expect(triageRes.body.data.complaints.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Admin Progresses Complaint 1 Through Finite State Machine', async () => {
    // Step 1: Submitted -> Acknowledged
    const ackRes = await request(app)
      .patch(`/api/admin/complaints/${complaint1ObjectId}/status`)
      .set('Cookie', [adminCookie])
      .send({
        status: COMPLAINT_STATUSES.ACKNOWLEDGED,
        comment: 'Facility team acknowledged the ceiling leak.',
      });
    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.complaint.status).toBe(COMPLAINT_STATUSES.ACKNOWLEDGED);

    // Step 2: Assign department & triage
    const triageRes = await request(app)
      .patch(`/api/admin/complaints/${complaint1ObjectId}`)
      .set('Cookie', [adminCookie])
      .send({
        assignedDepartment: 'Plumbing & Sanitation',
        priority: PRIORITIES.HIGH,
      });
    expect(triageRes.status).toBe(200);
    expect(triageRes.body.data.complaint.assignedDepartment).toBe('Plumbing & Sanitation');

    // Step 3: Acknowledged -> Assigned
    const assignRes = await request(app)
      .patch(`/api/admin/complaints/${complaint1ObjectId}/status`)
      .set('Cookie', [adminCookie])
      .send({
        status: COMPLAINT_STATUSES.ASSIGNED,
        comment: 'Dispatched plumbing crew Alpha.',
      });
    expect(assignRes.status).toBe(200);

    // Step 4: Assigned -> In Progress
    const inProgRes = await request(app)
      .patch(`/api/admin/complaints/${complaint1ObjectId}/status`)
      .set('Cookie', [adminCookie])
      .send({
        status: COMPLAINT_STATUSES.IN_PROGRESS,
        comment: 'Technician on-site replacing pipe valve.',
      });
    expect(inProgRes.status).toBe(200);

    // Step 5: In Progress -> Resolved
    const resolvedRes = await request(app)
      .patch(`/api/admin/complaints/${complaint1ObjectId}/status`)
      .set('Cookie', [adminCookie])
      .send({
        status: COMPLAINT_STATUSES.RESOLVED,
        comment: 'Valve replaced, leak tested, ceiling restored.',
      });
    expect(resolvedRes.status).toBe(200);
    expect(resolvedRes.body.data.complaint.status).toBe(COMPLAINT_STATUSES.RESOLVED);

    // Verify State Machine blocks illegal backwards skip from Resolved
    const illegalRes = await request(app)
      .patch(`/api/admin/complaints/${complaint1ObjectId}/status`)
      .set('Cookie', [adminCookie])
      .send({
        status: COMPLAINT_STATUSES.SUBMITTED,
        comment: 'Illegal jump attempt',
      });
    expect(illegalRes.status).toBe(400);
    expect(illegalRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('6. Admin Marks Duplicate Ticket 2 as Duplicate State', async () => {
    // Transition Complaint 2: Submitted -> Duplicate
    const dupRes = await request(app)
      .patch(`/api/admin/complaints/${complaint2ObjectId}/status`)
      .set('Cookie', [adminCookie])
      .send({
        status: COMPLAINT_STATUSES.DUPLICATE,
        comment: `Duplicate of ${complaint1Id}. Plumbing team has already resolved this.`,
      });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.data.complaint.status).toBe(COMPLAINT_STATUSES.DUPLICATE);
  });

  it('7. Student 1 Receives Real-Time In-App Notifications & Marks Read', async () => {
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', [student1Cookie]);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.notifications.length).toBeGreaterThan(0);
    expect(notifRes.body.data.unreadCount).toBeGreaterThan(0);

    const firstNotif = notifRes.body.data.notifications[0];
    const notifId = firstNotif.id || firstNotif._id;

    // Mark single notification read
    const singleReadRes = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Cookie', [student1Cookie]);

    expect(singleReadRes.status).toBe(200);
    expect(singleReadRes.body.data.notification.isRead).toBe(true);

    // Mark all as read in bulk
    const bulkReadRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', [student1Cookie]);

    expect(bulkReadRes.status).toBe(200);
    expect(bulkReadRes.body.data.markedCount).toBeGreaterThanOrEqual(1);

    // Verify unread count is now 0
    const finalNotifRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', [student1Cookie]);

    expect(finalNotifRes.status).toBe(200);
    expect(finalNotifRes.body.data.unreadCount).toBe(0);
  });

  it('8. Admin Analytics Aggregations Dynamically Reflect System Lifecycle', async () => {
    const analyticsRes = await request(app)
      .get('/api/admin/analytics')
      .set('Cookie', [adminCookie]);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.success).toBe(true);

    const { summary, byCategory, byStatus, departmentWorkload, dailyTrend } = analyticsRes.body.data;

    // Both complaints accounted for
    expect(summary.totalComplaints).toBe(2);
    expect(summary.resolvedComplaints).toBe(1);
    expect(summary.resolutionRate).toBe(50); // 1 resolved out of 2 = 50%
    expect(summary.aiCompleted).toBe(2);

    // Category distribution
    const plumbing = byCategory.find((c: any) => c.category === CATEGORIES.PLUMBING);
    expect(plumbing?.count).toBe(2);

    // Status breakdown
    const resolvedStatus = byStatus.find((s: any) => s.status === COMPLAINT_STATUSES.RESOLVED);
    expect(resolvedStatus?.count).toBe(1);
    const duplicateStatus = byStatus.find((s: any) => s.status === COMPLAINT_STATUSES.DUPLICATE);
    expect(duplicateStatus?.count).toBe(1);

    // Department Workload reflects Plumbing & Sanitation
    const plumbingDept = departmentWorkload.find(
      (d: any) => d.department === 'Plumbing & Sanitation'
    );
    expect(plumbingDept).toBeDefined();
    expect(plumbingDept?.total).toBe(1);
    expect(plumbingDept?.resolved).toBe(1);

    // 7-day trend includes today's 2 submissions
    expect(dailyTrend).toHaveLength(7);
    const todayCount = dailyTrend[dailyTrend.length - 1].count;
    expect(todayCount).toBe(2);
  });
});

