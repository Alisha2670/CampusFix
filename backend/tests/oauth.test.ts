import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/constants/enums.js';

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
});

describe('Google OAuth 2.0 Single Sign-On Tests (Day 8 Phase 2)', () => {
  it('should auto-provision a new student account when signing in with Google for the first time', async () => {
    const mockToken = 'mock_test_google_token_:alisha.google@campus.edu:Alisha Google:gid_987654321';

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: mockToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('alisha.google@campus.edu');
    expect(res.body.data.user.name).toBe('Alisha Google');
    expect(res.body.data.user.role).toBe(ROLES.STUDENT);

    // Verify session cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies as string];
    expect(cookieArray.some((c: string) => c.startsWith('token='))).toBe(true);

    // Verify persisted in DB
    const inDb = await User.findOne({ email: 'alisha.google@campus.edu' });
    expect(inDb).toBeDefined();
    expect(inDb?.googleId).toBe('gid_987654321');
  });

  it('should link existing student account when logging in with Google without creating duplicate', async () => {
    // Existing student registered with email/password
    const existing = await User.create({
      name: 'Existing Student',
      email: 'existing.student@campus.edu',
      passwordHash: 'dummy_hash',
      role: ROLES.STUDENT,
    });

    const mockToken = 'mock_test_google_token_:existing.student@campus.edu:Existing Student:gid_11223344';

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: mockToken });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('existing.student@campus.edu');

    // Verify no duplicate was created
    const count = await User.countDocuments({ email: 'existing.student@campus.edu' });
    expect(count).toBe(1);

    // Verify googleId attached
    const updated = await User.findById(existing._id);
    expect(updated?.googleId).toBe('gid_11223344');
  });

  it('should reject requests without a credential payload with 400 Bad Request', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid or forged Google tokens with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'forged_unauthorized_token_xyz' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

