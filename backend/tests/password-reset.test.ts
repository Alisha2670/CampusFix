import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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

describe('Password Recovery Architecture Tests (Forgot / Reset Password)', () => {
  it('should generate a SHA-256 hashed reset token with 15-minute expiration on valid request', async () => {
    const passwordHash = await bcrypt.hash('OldPassword123!', 10);
    const user = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@campus.edu',
      passwordHash,
      role: ROLES.STUDENT,
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'rohan@campus.edu' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.resetUrl).toContain('/reset-password?token=');

    const rawToken = res.body.data.token;
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Verify token was stored as SHA-256 hash in DB, NOT plain text
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.passwordResetToken).toBe(expectedHash);
    expect(updatedUser?.passwordResetExpires).toBeDefined();

    // Verify expiry is approximately 15 minutes from now
    const expiresAt = updatedUser!.passwordResetExpires!.getTime();
    const now = Date.now();
    expect(expiresAt).toBeGreaterThan(now + 13 * 60 * 1000); // at least 13 min in future
    expect(expiresAt).toBeLessThanOrEqual(now + 15 * 60 * 1000 + 5000);
  });

  it('should allow user to reset password with valid token and successfully login with new password', async () => {
    const oldPasswordHash = await bcrypt.hash('OldPassword123!', 10);
    await User.create({
      name: 'Priya Patel',
      email: 'priya@campus.edu',
      passwordHash: oldPasswordHash,
      role: ROLES.STUDENT,
    });

    // 1. Request reset
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'priya@campus.edu' });

    const rawToken = forgotRes.body.data.token;

    // 2. Perform password reset with new password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        password: 'BrandNewSecurePassword123!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.data.user.email).toBe('priya@campus.edu');

    // 3. Verify token and expiry were cleared in DB
    const inDb = await User.findOne({ email: 'priya@campus.edu' });
    expect(inDb?.passwordResetToken).toBeNull();
    expect(inDb?.passwordResetExpires).toBeNull();

    // 4. Verify old password no longer works
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'priya@campus.edu',
        password: 'OldPassword123!',
      });
    expect(oldLoginRes.status).toBe(401);

    // 5. Verify new password logs in successfully
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'priya@campus.edu',
        password: 'BrandNewSecurePassword123!',
      });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
  });

  it('should reject expired tokens (>15 minutes old) with 400 Bad Request', async () => {
    const rawToken = 'sample_expired_raw_token_12345';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await User.create({
      name: 'Expired User',
      email: 'expired@campus.edu',
      passwordHash: 'dummy_hash',
      role: ROLES.STUDENT,
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes in the past
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        password: 'SomeNewPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('should reject tampered or non-existent tokens with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'completely_fabricated_and_invalid_token',
        password: 'SomeNewPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('should defend against replay attacks (token cannot be used twice)', async () => {
    const passwordHash = await bcrypt.hash('InitialPassword123!', 10);
    await User.create({
      name: 'Replay Target',
      email: 'replay@campus.edu',
      passwordHash,
      role: ROLES.STUDENT,
    });

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'replay@campus.edu' });

    const rawToken = forgotRes.body.data.token;

    // First reset succeeds
    const firstReset = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        password: 'FirstNewPassword123!',
      });
    expect(firstReset.status).toBe(200);

    // Second replay attempt with same token fails
    const secondReset = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        password: 'AttackerHijackPassword123!',
      });
    expect(secondReset.status).toBe(400);
    expect(secondReset.body.error?.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('should defend against user enumeration (returns 200 for non-existent emails)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost_non_existent@campus.edu' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('If an account with this email exists');
    // Ensure no token leaked for non-existent user
    expect(res.body.data.token).toBeUndefined();
  });
});
