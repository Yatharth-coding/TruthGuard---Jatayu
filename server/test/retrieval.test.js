import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import User from '../src/models/User.js';
import Document from '../src/models/Document.js';
import DocumentChunk from '../src/models/DocumentChunk.js';
import { extractQueryTokens, retrieveEvidence } from '../src/services/retrieval/retrievalService.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/truthguard_test';

describe('Retrieval Engine & Evidence Scoping Test Suite', () => {
  let user1Id;
  let user2Id;
  let docAId;
  let docBId;
  let docUnprocessedId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    }

    // Clean up collections
    await User.deleteMany({ email: { $regex: /@retrieval-test\.com$/ } });
    await Document.deleteMany({ originalFilename: { $regex: /retrieval_test/ } });

    // Seed User 1 & User 2
    const u1 = await User.create({
      name: 'Retrieval User 1',
      email: `u1_${Date.now()}@retrieval-test.com`,
      password: 'Password123!'
    });
    user1Id = u1._id;

    const u2 = await User.create({
      name: 'Retrieval User 2',
      email: `u2_${Date.now()}@retrieval-test.com`,
      password: 'Password123!'
    });
    user2Id = u2._id;

    // Seed Processed Document A for User 1 (Remote Work v1)
    const docA = await Document.create({
      owner: user1Id,
      title: 'Remote Work Policy 2024',
      originalFilename: 'retrieval_test_docA.txt',
      storedFilename: 'retrieval_test_docA.txt',
      filePath: 'dummy/path',
      fileType: 'txt',
      fileSize: 500,
      processingStatus: 'processed',
      versionLabel: 'v1.0',
      effectiveDate: new Date('2024-01-01'),
      category: 'Human Resources'
    });
    docAId = docA._id;

    // Seed Processed Document B for User 1 (Remote Work v2, supersedes docA)
    const docB = await Document.create({
      owner: user1Id,
      title: 'Remote Work Policy 2025',
      originalFilename: 'retrieval_test_docB.txt',
      storedFilename: 'retrieval_test_docB.txt',
      filePath: 'dummy/path',
      fileType: 'txt',
      fileSize: 600,
      processingStatus: 'processed',
      versionLabel: 'v2.0',
      effectiveDate: new Date('2025-01-01'),
      category: 'Human Resources',
      supersedesDocument: docAId
    });
    docBId = docB._id;

    // Seed Unprocessed Document (pending) for User 1
    const docUnproc = await Document.create({
      owner: user1Id,
      title: 'Unprocessed Draft Policy',
      originalFilename: 'retrieval_test_draft.txt',
      storedFilename: 'retrieval_test_draft.txt',
      filePath: 'dummy/path',
      fileType: 'txt',
      fileSize: 300,
      processingStatus: 'pending',
      versionLabel: 'draft',
      category: 'Human Resources'
    });
    docUnprocessedId = docUnproc._id;

    // Seed Chunks for Document A
    await DocumentChunk.create({
      owner: user1Id,
      document: docAId,
      chunkId: uuidv4(),
      chunkText: 'Under the 2024 remote work policy, employees may work remotely up to two days per week with manager approval.',
      chunkIndex: 0,
      startPosition: 0,
      endPosition: 110,
      metadata: { title: 'Remote Work Policy 2024', versionLabel: 'v1.0', effectiveDate: new Date('2024-01-01') }
    });

    // Seed Chunks for Document B
    await DocumentChunk.create({
      owner: user1Id,
      document: docBId,
      chunkId: uuidv4(),
      chunkText: 'Under the updated 2025 policy, full-time staff may work remotely three days per week across all departments.',
      chunkIndex: 0,
      startPosition: 0,
      endPosition: 110,
      metadata: { title: 'Remote Work Policy 2025', versionLabel: 'v2.0', effectiveDate: new Date('2025-01-01'), supersedesDocument: docAId }
    });

    // Seed Unprocessed Document Chunk
    await DocumentChunk.create({
      owner: user1Id,
      document: docUnprocessedId,
      chunkId: uuidv4(),
      chunkText: 'Confidential draft: remote work may be eliminated entirely in 2027.',
      chunkIndex: 0,
      startPosition: 0,
      endPosition: 70
    });

    // Seed Document & Chunk for User 2 (Secret salary data)
    const docUser2 = await Document.create({
      owner: user2Id,
      title: 'User 2 Confidential Salary Data',
      originalFilename: 'retrieval_test_user2.txt',
      storedFilename: 'retrieval_test_user2.txt',
      filePath: 'dummy/path',
      fileType: 'txt',
      fileSize: 400,
      processingStatus: 'processed',
      category: 'Executive'
    });

    await DocumentChunk.create({
      owner: user2Id,
      document: docUser2._id,
      chunkId: uuidv4(),
      chunkText: 'Executive remote work compensation and bonus allowances for 2025.',
      chunkIndex: 0,
      startPosition: 0,
      endPosition: 70
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@retrieval-test\.com$/ } });
    await Document.deleteMany({ originalFilename: { $regex: /retrieval_test/ } });
    await DocumentChunk.deleteMany({ owner: { $in: [user1Id, user2Id] } });
  });

  it('1. Correctly tokenizes search queries and removes stopwords', () => {
    const question = 'What is the policy for remote work in 2025?';
    const tokens = extractQueryTokens(question);

    expect(tokens).toContain('policy');
    expect(tokens).toContain('remote');
    expect(tokens).toContain('work');
    expect(tokens).toContain('2025');

    // Stopwords must be filtered out
    expect(tokens).not.toContain('what');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('for');
    expect(tokens).not.toContain('in');
  });

  it('2. Retrieves matching passages for User 1 with correct scores', async () => {
    const result = await retrieveEvidence('How many days can employees work remotely?', user1Id);

    expect(result.status).toBe('evidence_found');
    expect(result.passages.length).toBeGreaterThanOrEqual(2);
    // Both doc A and doc B should be retrieved
    const titles = result.passages.map(p => p.documentTitle);
    expect(titles).toContain('Remote Work Policy 2024');
    expect(titles).toContain('Remote Work Policy 2025');
  });

  it('3. Ranks higher-relevance passages above lower-relevance passages', async () => {
    // Specifically search with tokens matching doc B title and text
    const result = await retrieveEvidence('updated 2025 full-time staff remote work', user1Id);

    expect(result.status).toBe('evidence_found');
    expect(result.passages.length).toBeGreaterThan(0);
    // The top passage must be Document B because of multiple keyword matches
    expect(result.passages[0].documentTitle).toBe('Remote Work Policy 2025');
    expect(result.passages[0].score).toBeGreaterThan(result.passages[1]?.score || 0);
  });

  it('4. Returns explicit no_evidence status when query has no matching keywords', async () => {
    const result = await retrieveEvidence('astronomy black holes quantum mechanics', user1Id);

    expect(result.status).toBe('no_evidence');
    expect(result.passages).toEqual([]);
  });

  it('5. Strictly isolates user data: User 1 cannot retrieve User 2 passages', async () => {
    // Query contains tokens from User 2's document ("executive bonus salary")
    const result = await retrieveEvidence('Executive salary bonus remote work', user1Id);

    // Any passages returned must belong strictly to User 1
    for (const passage of result.passages) {
      expect(passage.documentTitle).not.toContain('User 2 Confidential Salary Data');
    }
  });

  it('6. Excludes documents that are not in "processed" state', async () => {
    const result = await retrieveEvidence('Confidential draft eliminated entirely', user1Id);

    // Should not return the pending draft document
    const unprocPassage = result.passages.find(p => p.documentTitle === 'Unprocessed Draft Policy');
    expect(unprocPassage).toBeUndefined();
  });

  it('7. Preserves versionLabel, effectiveDate, and supersession metadata', async () => {
    const result = await retrieveEvidence('Remote work policy 2025', user1Id);

    const docBPassage = result.passages.find(p => p.documentTitle === 'Remote Work Policy 2025');
    expect(docBPassage).toBeDefined();
    expect(docBPassage.versionLabel).toBe('v2.0');
    expect(docBPassage.effectiveDate).toBeDefined();
    expect(docBPassage.supersedesDocument).toBeDefined();
    expect(docBPassage.supersedesDocument.toString()).toBe(docAId.toString());
  });

  it('8. Deduplicates identical or duplicate chunk indices from same document', async () => {
    // Insert a duplicate chunk for Doc A with same chunkIndex
    const dupChunk = await DocumentChunk.create({
      owner: user1Id,
      document: docAId,
      chunkId: uuidv4(),
      chunkText: 'Under the 2024 remote work policy, employees may work remotely up to two days per week with manager approval.',
      chunkIndex: 0,
      startPosition: 0,
      endPosition: 110
    });

    const result = await retrieveEvidence('remote work 2024', user1Id);
    const docAOccurrences = result.passages.filter(p => p.documentId.toString() === docAId.toString());

    // Deduplication should retain only one entry for chunkIndex 0 of docA
    expect(docAOccurrences.length).toBe(1);

    await DocumentChunk.findByIdAndDelete(dupChunk._id);
  });
});
