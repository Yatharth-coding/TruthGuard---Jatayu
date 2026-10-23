import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Document from '../src/models/Document.js';
import DocumentChunk from '../src/models/DocumentChunk.js';
import Conversation from '../src/models/Conversation.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/truthguard_test';

describe('Express REST API Endpoints Integration Test Suite', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let documentId;
  let conversationId;

  const user1Email = `api_user1_${Date.now()}@truthguard.test`;
  const user2Email = `api_user2_${Date.now()}@truthguard.test`;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    }

    // Register User 1
    const regRes1 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'API Test User 1',
        email: user1Email,
        password: 'Password123!'
      });
    user1Token = regRes1.body.token;
    user1Id = regRes1.body.user.id;

    // Register User 2
    const regRes2 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'API Test User 2',
        email: user2Email,
        password: 'Password123!'
      });
    user2Token = regRes2.body.token;
    user2Id = regRes2.body.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [user1Email, user2Email] } });
    await Document.deleteMany({ owner: { $in: [user1Id, user2Id] } });
    await DocumentChunk.deleteMany({ owner: { $in: [user1Id, user2Id] } });
    await Conversation.deleteMany({ owner: { $in: [user1Id, user2Id] } });
  });

  // 1. Health Endpoint
  describe('GET /api/health', () => {
    it('returns 200 with system operational status and provider information', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.aiProvider).toBeDefined();
    });
  });

  // 2. Authentication Endpoints
  describe('Authentication Routes (/api/auth)', () => {
    it('GET /api/auth/me returns current user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(user1Email.toLowerCase());
      expect(res.body.user.password).toBeUndefined(); // Never expose hashed password
    });

    it('GET /api/auth/me returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/logout successfully clears authentication session', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 3. Document Routes
  describe('Document Routes (/api/documents)', () => {
    it('POST /api/documents uploads and registers a document', async () => {
      const sampleText = 'Data retention policy: Customer telemetry data must be expunged within 90 days of account termination.';
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('title', 'Data Retention Policy 2026')
        .field('category', 'Legal')
        .field('versionLabel', 'v2.1')
        .field('effectiveDate', '2026-06-01')
        .attach('file', Buffer.from(sampleText), 'data_retention.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.document._id).toBeDefined();
      expect(res.body.document.title).toBe('Data Retention Policy 2026');
      documentId = res.body.document._id;
    });

    it('GET /api/documents lists user documents with search, pagination, and sorting', async () => {
      const res = await request(app)
        .get('/api/documents?search=Retention&sort=newest&page=1&limit=10')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.documents.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/documents/:id returns full document metadata', async () => {
      const res = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.document._id).toBe(documentId);
      expect(res.body.document.versionLabel).toBe('v2.1');
    });

    it('GET /api/documents/:id/versions returns version history chain', async () => {
      const res = await request(app)
        .get(`/api/documents/${documentId}/versions`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.versions)).toBe(true);
      expect(res.body.versions.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 4. Conversation Routes
  describe('Conversation Routes (/api/conversations)', () => {
    it('POST /api/conversations creates a new empty conversation session', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Policy Q&A Session' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation._id).toBeDefined();
      expect(res.body.conversation.title).toBe('Policy Q&A Session');
      conversationId = res.body.conversation._id;
    });

    it('GET /api/conversations lists conversations for authenticated user', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversations.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/conversations/:id returns conversation details and message history', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation._id).toBe(conversationId);
      expect(Array.isArray(res.body.conversation.messages)).toBe(true);
    });

    it('Enforces multi-tenant isolation: User 2 cannot access User 1 conversation', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // 5. Adversarial QA Endpoint
  describe('Adversarial QA Route (/api/qa/ask)', () => {
    it('POST /api/qa/ask rejects request with missing or empty question (400)', async () => {
      const res = await request(app)
        .post('/api/qa/ask')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ question: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors[0].message).toContain('Question must not be empty');
    });

    it('POST /api/qa/ask executes full verification pipeline with MockProvider', async () => {
      // Allow async document indexing to finish
      await new Promise(r => setTimeout(r, 600));

      const res = await request(app)
        .post('/api/qa/ask')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          question: 'What is the retention period for customer telemetry data?',
          conversationId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.answer).toBeDefined();
      expect(res.body.verificationStatus).toBeDefined();
      expect(['supported', 'conflict_detected', 'unresolved', 'insufficient_evidence', 'verification_error']).toContain(res.body.verificationStatus);
      expect(Array.isArray(res.body.citations)).toBe(true);
      expect(Array.isArray(res.body.conflicts)).toBe(true);
      expect(res.body.conversationId).toBe(conversationId);
    });

    it('POST /api/qa/ask automatically spawns a new conversation when conversationId is omitted', async () => {
      const res = await request(app)
        .post('/api/qa/ask')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          question: 'How long do we store customer telemetry data?'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversationId).toBeDefined();
      expect(res.body.conversationId).not.toBe(conversationId);

      // Clean up auto-spawned conversation
      await Conversation.findByIdAndDelete(res.body.conversationId);
    });
  });

  // 6. Cleanup & Cascading Deletion
  describe('DELETE /api/documents/:id & DELETE /api/conversations/:id', () => {
    it('DELETE /api/conversations/:id removes conversation', async () => {
      const res = await request(app)
        .delete(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Conversation.findById(conversationId);
      expect(check).toBeNull();
    });

    it('DELETE /api/documents/:id deletes document and cleans up associated chunks', async () => {
      const res = await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify cascading chunk cleanup
      const orphanChunks = await DocumentChunk.find({ document: documentId });
      expect(orphanChunks.length).toBe(0);

      const checkDoc = await Document.findById(documentId);
      expect(checkDoc).toBeNull();
    });
  });
});
