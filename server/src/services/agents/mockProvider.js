/**
 * MockProvider for offline / demo mode testing and deterministic verification.
 * Simulates intelligent multi-agent synthesis and critique without external LLM API keys.
 */
export class MockProvider {
  constructor() {
    this.name = 'MockProvider';
  }

  /**
   * Complete raw text prompt.
   * @param {string} systemPrompt 
   * @param {string} userPrompt 
   * @returns {Promise<string>}
   */
  async complete(systemPrompt, userPrompt) {
    const questionMatch = userPrompt.match(/Question:\s*([^\n]+)/i);
    const question = questionMatch ? questionMatch[1].trim() : 'Document inquiry';
    return `[Mock Response] Verified analysis for query: "${question}". Based on uploaded documentation.`;
  }

  /**
   * Complete structured JSON prompt.
   * @param {string} systemPrompt 
   * @param {string} userPrompt 
   * @returns {Promise<object>}
   */
  async completeJSON(systemPrompt, userPrompt) {
    const isCritic =
      systemPrompt.toLowerCase().includes('critic') ||
      systemPrompt.toLowerCase().includes('adversarial') ||
      userPrompt.includes('Synthesized Answer:') ||
      userPrompt.includes('"contradictions"');

    // Parse passages from prompt text
    const passages = this.extractPassagesFromPrompt(userPrompt);

    if (isCritic) {
      return this.generateCriticResponse(userPrompt, passages);
    } else {
      return this.generateSynthesizerResponse(userPrompt, passages);
    }
  }

  /**
   * Extract passage blocks and metadata from prompt text.
   */
  extractPassagesFromPrompt(prompt) {
    const passages = [];
    // Match blocks formatted like "Passage [N] (Document: title, ID: id, Chunk: cid...)"
    const passageRegex = /Passage\s*\[(\d+)\]\s*(?:\(([^)]*)\))?:\s*\n([\s\S]*?)(?=(?:\n\s*Passage\s*\[|\n\s*Task:|\n\s*Instructions:|$))/gi;
    let match;

    while ((match = passageRegex.exec(prompt)) !== null) {
      const index = parseInt(match[1], 10);
      const metaStr = match[2] || '';
      const text = match[3].trim();

      const docIdMatch = metaStr.match(/Doc(?:ument)? ID:\s*([a-f0-9]+)/i);
      const chunkIdMatch = metaStr.match(/Chunk ID:\s*([a-f0-9-]+)/i);
      const titleMatch = metaStr.match(/Title:\s*([^,;]+)/i);
      const versionMatch = metaStr.match(/Version:\s*([^,;]+)/i);
      const dateMatch = metaStr.match(/Effective Date:\s*([^,;]+)/i);

      passages.push({
        index,
        documentId: docIdMatch ? docIdMatch[1] : null,
        chunkId: chunkIdMatch ? chunkIdMatch[1] : `chunk-${index}`,
        documentTitle: titleMatch ? titleMatch[1].trim() : `Document ${index}`,
        versionLabel: versionMatch ? versionMatch[1].trim() : '',
        effectiveDate: dateMatch ? dateMatch[1].trim() : null,
        text
      });
    }

    return passages;
  }

  /**
   * Generate synthesis JSON response.
   */
  generateSynthesizerResponse(prompt, passages) {
    // If no passages found
    if (!passages || passages.length === 0) {
      return {
        answer: 'Based on the provided documents, there is insufficient evidence to answer your question.',
        citations: [],
        limitations: [
          'No relevant passages were retrieved from the knowledge base for this question.'
        ]
      };
    }

    // Check if multiple documents with differing dates or version labels exist
    const distinctDocTitles = new Set(passages.map(p => p.documentTitle));
    const distinctDates = new Set(passages.map(p => p.effectiveDate).filter(Boolean));
    const hasPotentialConflict = distinctDocTitles.size > 1 || distinctDates.size > 1;

    // Check for conflicting numbers, durations, or statuses
    const combinedText = passages.map(p => p.text).join(' ');
    const conflictSignals = [
      /\b(remote|work from home|wfh)\b/i,
      /\b(refund|return|reimbursement)\b/i,
      /\b(sla|response time|turnaround)\b/i,
      /\b(supersed|replac|deprecat|amend|updat)/i,
      /\b(v1|v2|2023|2024|2025|2026)\b/i
    ];

    const hasConflictTheme = conflictSignals.some(pattern => pattern.test(combinedText));

    if (hasPotentialConflict && hasConflictTheme && passages.length >= 2) {
      // Build synthesis highlighting both documents
      const p1 = passages[0];
      const p2 = passages[1];

      const p1DateStr = p1.effectiveDate ? ` (effective ${p1.effectiveDate})` : (p1.versionLabel ? ` (${p1.versionLabel})` : '');
      const p2DateStr = p2.effectiveDate ? ` (effective ${p2.effectiveDate})` : (p2.versionLabel ? ` (${p2.versionLabel})` : '');

      const answer = `Based on the retrieved documents, conflicting policies exist across versions:

1. According to **${p1.documentTitle}**${p1DateStr}:
   "${p1.text.slice(0, 250)}..."

2. However, according to **${p2.documentTitle}**${p2DateStr}:
   "${p2.text.slice(0, 250)}..."

The later document appears to revise previous guidance, but a direct conflict exists between the earlier and later recorded terms.`;

      return {
        answer,
        citations: passages.slice(0, 3).map(p => ({
          documentId: p.documentId,
          chunkId: p.chunkId,
          documentTitle: p.documentTitle,
          excerpt: p.text.slice(0, 200),
          versionLabel: p.versionLabel,
          effectiveDate: p.effectiveDate
        })),
        limitations: [
          'Multiple document versions contain contradictory terms regarding this question.',
          'Review superseded dates before relying on earlier policies.'
        ]
      };
    }

    // Default supported synthesis from available passages
    const primaryPassage = passages[0];
    const excerpt = primaryPassage.text.slice(0, 300);
    const answer = `According to **${primaryPassage.documentTitle}**${primaryPassage.versionLabel ? ` (${primaryPassage.versionLabel})` : ''}:

${excerpt}

This information is verified against the uploaded knowledge base.`;

    return {
      answer,
      citations: passages.slice(0, 2).map(p => ({
        documentId: p.documentId,
        chunkId: p.chunkId,
        documentTitle: p.documentTitle,
        excerpt: p.text.slice(0, 200),
        versionLabel: p.versionLabel,
        effectiveDate: p.effectiveDate
      })),
      limitations: []
    };
  }

  /**
   * Generate adversarial critique response.
   */
  generateCriticResponse(prompt, passages) {
    if (!passages || passages.length === 0) {
      return {
        contradictions: [],
        supportedClaims: [],
        unsupportedClaims: [
          {
            claim: 'General inquiry answer',
            reason: 'No evidence passages were retrieved to substantiate the response.'
          }
        ],
        stalenessFindings: [],
        evidenceGaps: [{ description: 'No supporting documentation found.' }],
        overallAssessment: 'Insufficient evidence to verify claims.'
      };
    }

    // Check if prompt exhibits conflict between passages
    const distinctDocs = [...new Map(passages.map(p => [p.documentTitle, p])).values()];
    const dates = passages.map(p => p.effectiveDate).filter(Boolean);

    // Conflict detection heuristic
    const hasMultipleVersions = distinctDocs.length > 1;
    const hasDifferentDates = new Set(dates).size > 1;

    if (hasMultipleVersions || hasDifferentDates) {
      const doc1 = passages[0];
      const doc2 = passages[1] || passages[0];

      return {
        contradictions: [
          {
            description: `Contradictory provisions identified between "${doc1.documentTitle}" and "${doc2.documentTitle}". The earlier provisions do not align with subsequent updates.`,
            passages: [
              {
                documentId: doc1.documentId,
                documentTitle: doc1.documentTitle,
                excerpt: doc1.text.slice(0, 180),
                versionLabel: doc1.versionLabel,
                effectiveDate: doc1.effectiveDate
              },
              {
                documentId: doc2.documentId,
                documentTitle: doc2.documentTitle,
                excerpt: doc2.text.slice(0, 180),
                versionLabel: doc2.versionLabel,
                effectiveDate: doc2.effectiveDate
              }
            ],
            resolution: `The newer document (${doc2.documentTitle}) should take precedence if supersession is confirmed, but unresolved contradiction remains in effect.`,
            status: 'unresolved'
          }
        ],
        supportedClaims: [
          {
            claim: `Provisions cited from ${doc1.documentTitle}`,
            evidence: doc1.text.slice(0, 120)
          }
        ],
        unsupportedClaims: [],
        stalenessFindings: [
          {
            description: `Potential stale reference: "${doc1.documentTitle}" may be superseded by "${doc2.documentTitle}".`,
            newerDocument: doc2.documentTitle,
            olderDocument: doc1.documentTitle,
            isSupersessionEstablished: false,
            evidence: `Discrepancy observed between versions.`
          }
        ],
        evidenceGaps: [],
        overallAssessment: 'Conflict detected between distinct document versions.'
      };
    }

    // Fully supported critique
    const doc = passages[0];
    return {
      contradictions: [],
      supportedClaims: [
        {
          claim: 'Answer claims are faithfully extracted from the source passage.',
          evidence: doc.text.slice(0, 150)
        }
      ],
      unsupportedClaims: [],
      stalenessFindings: [],
      evidenceGaps: [],
      overallAssessment: 'All claims are verified and backed by the single canonical document.'
    };
  }
}

export default MockProvider;
