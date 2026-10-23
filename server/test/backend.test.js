import { describe, it, expect } from 'vitest';
import { sanitizeFilename, generateChunkId, normalizeText, isValidObjectId, escapeRegex } from '../src/utils/helpers.js';
import { chunkTextContent } from '../src/services/document/processor.js';
import { extractQueryTokens } from '../src/services/retrieval/retrievalService.js';
import { MockProvider } from '../src/services/agents/mockProvider.js';
import { SynthesizerAgent } from '../src/services/agents/synthesizerAgent.js';
import { CriticAgent } from '../src/services/agents/criticAgent.js';
import { ResolutionService } from '../src/services/verification/resolutionService.js';
import { AgentOrchestrator } from '../src/services/agents/orchestrator.js';

describe('TruthGuard Helper Utilities', () => {
  it('sanitizes filenames correctly', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('.._.._.._etc_passwd');
    expect(sanitizeFilename('my report (2024).pdf')).toBe('my_report_2024_.pdf');
  });

  it('generates valid chunk uuid', () => {
    const id = generateChunkId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });

  it('normalizes whitespace and line breaks', () => {
    const raw = '  Hello   world \r\n\r\n\n\n Next   line.  ';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('Hello world \n\n Next line.');
  });

  it('validates object IDs', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('invalid-id')).toBe(false);
  });
});

describe('Document Chunking', () => {
  it('splits text into overlapping chunks', () => {
    const text = 'Paragraph 1 sentence. '.repeat(100);
    const chunks = chunkTextContent(text, 500, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].start).toBe(0);
    expect(chunks[0].text.length).toBeLessThanOrEqual(500);
  });
});

describe('Retrieval Query Tokenization', () => {
  it('filters stop words and extracts query tokens', () => {
    const tokens = extractQueryTokens('What is the remote work policy for employees in 2024?');
    expect(tokens).toContain('remote');
    expect(tokens).toContain('work');
    expect(tokens).toContain('policy');
    expect(tokens).toContain('employees');
    expect(tokens).toContain('2024');
    expect(tokens).not.toContain('what');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('for');
    expect(tokens).not.toContain('in');
  });
});

describe('Multi-Agent Pipeline (Mock Provider)', () => {
  const provider = new MockProvider();
  const synthesizer = new SynthesizerAgent(provider);
  const critic = new CriticAgent(provider);
  const resolutionService = new ResolutionService();

  const mockPassages = [
    {
      chunkId: 'c1',
      chunkText: 'Remote work policy 2023: Employees may work remotely up to 2 days per week.',
      chunkIndex: 0,
      documentId: '507f1f77bcf86cd799439011',
      documentTitle: 'Remote Work Policy 2023',
      versionLabel: 'v1.0',
      effectiveDate: new Date('2023-01-01'),
      score: 3
    },
    {
      chunkId: 'c2',
      chunkText: 'Remote work policy 2024: Employees are permitted to work remotely 5 days per week with manager approval.',
      chunkIndex: 0,
      documentId: '507f1f77bcf86cd799439012',
      documentTitle: 'Remote Work Policy 2024',
      versionLabel: 'v2.0',
      effectiveDate: new Date('2024-01-01'),
      score: 3
    }
  ];

  it('SynthesizerAgent produces grounded answer and citations', async () => {
    const result = await synthesizer.synthesize('What is the remote work policy?', mockPassages);
    expect(result.answer).toBeDefined();
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('CriticAgent detects conflict across different document versions', async () => {
    const synthResult = await synthesizer.synthesize('What is the remote work policy?', mockPassages);
    const criticResult = await critic.critique(
      'What is the remote work policy?',
      synthResult.answer,
      synthResult.citations,
      mockPassages
    );

    expect(criticResult.contradictions.length).toBeGreaterThan(0);
  });

  it('ResolutionService detects conflict status and produces warning banner', () => {
    const synthResult = {
      answer: 'Employees may work remotely 2 days or 5 days depending on the year.',
      citations: [{ documentId: '507f1f77bcf86cd799439011', chunkId: 'c1', excerpt: '...' }]
    };
    const criticResult = {
      contradictions: [
        {
          description: 'Conflict between 2023 and 2024 policy',
          passages: [],
          status: 'unresolved'
        }
      ],
      unsupportedClaims: []
    };

    const resolved = resolutionService.resolve(
      'What is the remote work policy?',
      synthResult,
      criticResult,
      mockPassages
    );

    expect(resolved.verificationStatus).toBe('conflict_detected');
    expect(resolved.answer).toContain('CONFLICT DETECTED ACROSS SOURCES');
  });

  it('ResolutionService handles insufficient evidence when passages are empty', () => {
    const resolved = resolutionService.resolve(
      'Unknown question',
      null,
      null,
      []
    );

    expect(resolved.verificationStatus).toBe('insufficient_evidence');
    expect(resolved.citations).toEqual([]);
  });

  it('AgentOrchestrator runs end-to-end pipeline with insufficient evidence on empty DB', async () => {
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.process('test question', '507f1f77bcf86cd799439011');
    expect(result.verificationStatus).toBe('insufficient_evidence');
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });
});
