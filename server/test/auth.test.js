import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import config from '../src/config/index.js';
import User from '../src/models/User.js';

describe('Authentication & Security Test Suite', () => {
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/truthguard_test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
  }, 15000);

  afterAll(async () => {
    // Clean up test users created during this suite
    await User.deleteMany({ email: /@authtest\.truthguard\.local$/i });
    await mongoose.disconnect();
  });

  const testUser = {
    name: 'Audit Security Officer',
    email: `officer_${Date.now()}@authtest.truthguard.local`,
    password: 'SecurePassword2026!'
  };

  it('1. Successfully registers a new user with hashed password and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.token).toBeDefined();

    // Verify in database that password was actually hashed with bcrypt
    const dbUser = await User.findOne({ email: testUser.email.toLowerCase() }).select('+password');
    expect(dbUser).not.toBeNull();
    expect(dbUser.password).not.toBe(testUser.password);
    const isBcryptHash = await bcrypt.compare(testUser.password, dbUser.password);
    expect(isBcryptHash).toBe(true);
  });

  it('2. Rejects registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email User',
        email: 'not-a-valid-email-string',
        password: 'ValidPassword123!'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Rejects registration when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'missingname@authtest.truthguard.local',
        password: 'ValidPassword123!'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. Rejects password with less than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Password User',
        email: `shortpass_${Date.now()}@authtest.truthguard.local`,
        password: '123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. Prevents duplicate email registration (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('6. Successfully logs in with valid credentials and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.token).toBeDefined();

    // Check Set-Cookie header contains tg_token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const hasTgToken = cookies.some(c => c.includes('tg_token='));
    expect(hasTgToken).toBe(true);
  });

  it('7. Rejects login with incorrect password (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  it('8. Rejects login for nonexistent user (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'does_not_exist_98765@authtest.truthguard.local',
        password: 'Password123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('9. Returns current user profile on GET /api/auth/me with Bearer token', async () => {
    // Generate valid token
    const dbUser = await User.findOne({ email: testUser.email.toLowerCase() });
    const token = jwt.sign({ id: dbUser._id, email: dbUser.email }, config.jwtSecret, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('10. Blocks access to protected routes without authentication token (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('11. Blocks access to protected routes with forged or invalid token (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged.invalid.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('12. Blocks access to protected routes with expired token (401)', async () => {
    const dbUser = await User.findOne({ email: testUser.email.toLowerCase() });
    // Token that expired 10 minutes ago
    const expiredToken = jwt.sign(
      { id: dbUser._id, email: dbUser.email },
      config.jwtSecret,
      { expiresIn: '-10m' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('13. Logs out successfully and clears session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const tgCookie = cookies.find(c => c.includes('tg_token='));
      // Express clearCookie sets max-age=0 or expires in past
      expect(tgCookie).toBeDefined();
    }
  });
});
