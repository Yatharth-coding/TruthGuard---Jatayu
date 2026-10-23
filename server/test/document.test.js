import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import config from '../src/config/index.js';
import User from '../src/models/User.js';
import Document from '../src/models/Document.js';
import DocumentChunk from '../src/models/DocumentChunk.js';
import { sanitizeFilename } from '../src/utils/helpers.js';

describe('Document Upload, Processing & Multi-Tenant Isolation Test Suite', () => {
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/truthguard_test';
  let user1, user1Token;
  let user2, user2Token;
  let uploadedDocId;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);

    // Create User 1
    user1 = await User.create({
      name: 'Document Owner User',
      email: `docowner_${Date.now()}@doctest.truthguard.local`,
      password: 'StrongPassword123!'
    });
    user1Token = jwt.sign({ id: user1._id, email: user1.email }, config.jwtSecret, { expiresIn: '1h' });

    // Create User 2 (for multi-tenant isolation tests)
    user2 = await User.create({
      name: 'Unrelated User',
      email: `unrelated_${Date.now()}@doctest.truthguard.local`,
      password: 'StrongPassword123!'
    });
    user2Token = jwt.sign({ id: user2._id, email: user2.email }, config.jwtSecret, { expiresIn: '1h' });
  }, 15000);

  afterAll(async () => {
    // Cleanup database records and files
    await User.deleteMany({ email: /@doctest\.truthguard\.local$/i });
    const docs = await Document.find({ owner: { $in: [user1._id, user2._id] } });
    for (const d of docs) {
      if (d.filePath && fs.existsSync(d.filePath)) {
        await fs.promises.unlink(d.filePath).catch(() => {});
      }
    }
    await Document.deleteMany({ owner: { $in: [user1._id, user2._id] } });
    await DocumentChunk.deleteMany({ owner: { $in: [user1._id, user2._id] } });
    await mongoose.disconnect();
  });

  it('1. Uploads valid TXT document and returns 201 with pending status', async () => {
    const fileContent = 'TruthGuard Confidentiality Policy 2026.\nAll company documents must remain classified.';
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .field('title', 'Confidentiality Policy 2026')
      .field('category', 'Compliance')
      .field('versionLabel', 'v1.0')
      .field('effectiveDate', '2026-01-01')
      .attach('file', Buffer.from(fileContent), 'confidentiality_policy.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.document.title).toBe('Confidentiality Policy 2026');
    expect(res.body.document.fileType).toBe('txt');
    uploadedDocId = res.body.document._id;
  });

  it('2. Processes uploaded document, creates chunks, and transitions status to processed', async () => {
    // Wait briefly for asynchronous processing
    await new Promise(r => setTimeout(r, 800));

    const dbDoc = await Document.findById(uploadedDocId);
    expect(dbDoc.processingStatus).toBe('processed');
    expect(dbDoc.chunkCount).toBeGreaterThan(0);
    expect(dbDoc.extractedText).toContain('TruthGuard Confidentiality Policy');

    const chunks = await DocumentChunk.find({ document: uploadedDocId });
    expect(chunks.length).toBe(dbDoc.chunkCount);
    expect(chunks[0].chunkText).toContain('TruthGuard Confidentiality Policy');
    expect(chunks[0].chunkId).toBeDefined();
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('3. Uploads valid Markdown document (.md) successfully', async () => {
    const mdContent = '# Security Guide\n\n## Section 1\nMulti-factor authentication is mandatory for all access.';
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .field('title', 'Security Guide')
      .attach('file', Buffer.from(mdContent), 'security_guide.md');

    expect(res.status).toBe(201);
    expect(res.body.document.fileType).toBe('md');
  });

  it('4. Rejects upload with unsupported file extension (.exe)', async () => {
    const maliciousScript = 'Binary executable payload';
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .field('title', 'Malicious File')
      .attach('file', Buffer.from(maliciousScript), 'exploit.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. Rejects upload request without any file attached', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'No File Document' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('File upload is required');
  });

  it('6. Marks document as failed when uploaded file contains no text', async () => {
    const emptyFile = '';
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .field('title', 'Empty Policy')
      .attach('file', Buffer.from(emptyFile), 'empty_policy.txt');

    expect(res.status).toBe(201);
    const emptyDocId = res.body.document._id;

    // Wait for processor to execute
    await new Promise(r => setTimeout(r, 600));

    const dbDoc = await Document.findById(emptyDocId);
    expect(dbDoc.processingStatus).toBe('failed');
    expect(dbDoc.processingError).toBeDefined();
  });

  it('7. Enforces tenant data isolation: User 2 cannot view User 1 document (404)', async () => {
    const res = await request(app)
      .get(`/api/documents/${uploadedDocId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('8. Enforces tenant data isolation: User 2 document list does not contain User 1 documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.documents.length).toBe(0);
  });

  it('9. Enforces tenant data isolation: User 2 cannot delete User 1 document (404)', async () => {
    const res = await request(app)
      .delete(`/api/documents/${uploadedDocId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);

    // Verify document still exists in database
    const dbDoc = await Document.findById(uploadedDocId);
    expect(dbDoc).not.toBeNull();
  });

  it('10. Deletes document, associated chunks, and disk file when authorized owner deletes it', async () => {
    const dbDocBefore = await Document.findById(uploadedDocId);
    const diskPath = dbDocBefore.filePath;

    const res = await request(app)
      .delete(`/api/documents/${uploadedDocId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify document deleted from MongoDB
    const dbDocAfter = await Document.findById(uploadedDocId);
    expect(dbDocAfter).toBeNull();

    // Verify associated chunks deleted from MongoDB
    const chunksAfter = await DocumentChunk.find({ document: uploadedDocId });
    expect(chunksAfter.length).toBe(0);

    // Verify file unlinked from disk
    expect(fs.existsSync(diskPath)).toBe(false);
  });

  it('11. Sanitizes path traversal attempts in filenames', () => {
    const unsafeName = '../../../../../../etc/shadow';
    const sanitized = sanitizeFilename(unsafeName);
    expect(sanitized).not.toContain('/');
    expect(sanitized).not.toContain('\\');
    expect(sanitized).toBe('.._.._.._.._.._.._etc_shadow');
  });
});
