import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/constants/enums.js';
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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Authentication & Authorization Module Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new student and return a 201 with auth cookie', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Student',
          email: 'jane.student@campus.edu',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('jane.student@campus.edu');
      expect(response.body.data.user.role).toBe(ROLES.STUDENT);
      expect(response.body.data.user.passwordHash).toBeUndefined();

      // Check cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);

      // Verify record in database
      const dbUser = await User.findOne({ email: 'jane.student@campus.edu' });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.role).toBe(ROLES.STUDENT);
      expect(dbUser!.passwordHash).not.toBe('Password123!');
    });

    it('should reject registration if email is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Student',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration if password is too short or lacks numbers', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Student',
          email: 'jane@campus.edu',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration if email already exists with 409 Conflict', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Jane Student',
        email: 'duplicate@campus.edu',
        password: 'Password123!',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another Student',
          email: 'duplicate@campus.edu',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_ENTRY');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Jane Student',
        email: 'login.test@campus.edu',
        password: 'Password123!',
      });
    });

    it('should login successfully with valid credentials and return auth cookie', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'login.test@campus.edu',
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login.test@campus.edu');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with incorrect password with 401', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'login.test@campus.edu',
        password: 'WrongPassword999!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent email with 401', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@campus.edu',
        password: 'Password123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the current user profile when authenticated', async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Current User',
        email: 'me.test@campus.edu',
        password: 'Password123!',
      });

      const token = registerRes.body.data.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('me.test@campus.edu');
    });

    it('should reject unauthenticated request with 401', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the token cookie on logout', async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Logout User',
        email: 'logout.test@campus.edu',
        password: 'Password123!',
      });

      const token = registerRes.body.data.token;

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
      const cookies = logoutRes.headers['set-cookie'];
      expect(cookies[0]).toMatch(/token=;/);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should block a student from accessing an admin-only endpoint (403 Forbidden)', async () => {
      const studentRes = await request(app).post('/api/auth/register').send({
        name: 'Student User',
        email: 'student.rbac@campus.edu',
        password: 'Password123!',
      });

      const studentToken = studentRes.body.data.token;

      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should permit an admin to access an admin-only endpoint (200 OK)', async () => {
      // Create admin user directly in DB (simulating admin provisioning)
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin.rbac@campus.edu',
        passwordHash: 'hashed_pw',
        role: ROLES.ADMIN,
      });

      // Generate admin token using static import
      const adminToken = jwt.sign(
        { id: admin._id.toString(), email: admin.email, role: admin.role },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorized).toBe(true);
    });
  });
});
