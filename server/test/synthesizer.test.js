import { describe, it, expect } from 'vitest';
import { SynthesizerAgent } from '../src/services/agents/synthesizerAgent.js';
import { MockProvider } from '../src/services/agents/mockProvider.js';

describe('SynthesizerAgent Unit & Robustness Test Suite', () => {
  const samplePassages = [
    {
      chunkId: 'chunk-101',
      documentId: 'doc-001',
      documentTitle: 'Remote Work Policy 2024',
      chunkText: 'Employees are entitled to two remote days per week upon manager approval.',
      versionLabel: 'v1.0',
      effectiveDate: new Date('2024-01-01')
    },
    {
      chunkId: 'chunk-102',
      documentId: 'doc-002',
      documentTitle: 'Remote Work Policy 2025',
      chunkText: 'Full-time staff may work remotely three days per week across all departments.',
      versionLabel: 'v2.0',
      effectiveDate: new Date('2025-01-01')
    }
  ];

  it('1. Returns immediate insufficient_evidence answer when passages array is empty', async () => {
    const mockProvider = new MockProvider();
    const synthesizer = new SynthesizerAgent(mockProvider);

    const result = await synthesizer.synthesize('What is the remote work policy?', []);

    expect(result.answer).toContain('insufficient evidence');
    expect(result.citations).toEqual([]);
    expect(result.limitations).toContain('No relevant document passages were retrieved.');
  });

  it('2. Synthesizes an evidence-grounded answer with citations using MockProvider', async () => {
    const mockProvider = new MockProvider();
    const synthesizer = new SynthesizerAgent(mockProvider);

    const result = await synthesizer.synthesize('How many days can I work remotely?', samplePassages);

    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].documentId).toBeDefined();
    expect(result.citations[0].chunkId).toBeDefined();
  });

  it('3. Rejects hallucinated citations referencing non-existent document/chunk IDs', async () => {
    // Provider that returns a fabricated citation
    const hallucinatingProvider = {
      completeJSON: async () => ({
        answer: 'You can work remotely 5 days a week according to fictitious policy.',
        citations: [
          {
            documentId: 'doc-FABRICATED-999',
            chunkId: 'chunk-FABRICATED-999',
            documentTitle: 'Imaginary Policy',
            excerpt: 'Hallucinated text never in knowledge base'
          },
          {
            documentId: 'doc-001',
            chunkId: 'chunk-101',
            documentTitle: 'Remote Work Policy 2024',
            excerpt: 'Employees are entitled to two remote days per week'
          }
        ],
        limitations: []
      })
    };

    const synthesizer = new SynthesizerAgent(hallucinatingProvider);
    const result = await synthesizer.synthesize('How many remote days?', samplePassages);

    // The fabricated citation MUST be dropped
    expect(result.citations.length).toBe(1);
    expect(result.citations[0].documentId).toBe('doc-001');
    expect(result.citations[0].chunkId).toBe('chunk-101');
  });

  it('4. Handles provider error (e.g. rate limit, timeout) gracefully without throwing', async () => {
    const failingProvider = {
      completeJSON: async () => {
        throw new Error('429 Rate limit exceeded on AI endpoint');
      }
    };

    const synthesizer = new SynthesizerAgent(failingProvider);
    const result = await synthesizer.synthesize('What is the policy?', samplePassages);

    expect(result.answer).toContain('Answer synthesis encountered an error');
    expect(result.answer).toContain('429 Rate limit exceeded');
    expect(result.limitations).toContain('Synthesis processing failed partially.');
    // Provides fallback citations from retrieved passages
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('5. Handles malformed or non-string answer responses from provider safely', async () => {
    const malformedProvider = {
      completeJSON: async () => ({
        answer: null, // missing or null answer field
        citations: [],
        limitations: ['Data ambiguous']
      })
    };

    const synthesizer = new SynthesizerAgent(malformedProvider);
    const result = await synthesizer.synthesize('What is the policy?', samplePassages);

    expect(result.answer).toBe('Unable to formulate an answer from the provided evidence.');
    expect(result.limitations).toContain('Data ambiguous');
  });
});
