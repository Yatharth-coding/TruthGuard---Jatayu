/**
 * SynthesizerAgent responsible for producing an evidence-grounded answer
 * strictly based on retrieved passages, with direct citations and documented limitations.
 */
export class SynthesizerAgent {
  /**
   * @param {object} provider - Instance of OpenAIProvider or MockProvider
   */
  constructor(provider) {
    if (!provider) {
      throw new Error('SynthesizerAgent requires an AI provider instance');
    }
    this.provider = provider;
  }

  /**
   * Synthesize an answer from retrieved passages for a given user question.
   * 
   * @param {string} question 
   * @param {Array<object>} passages 
   * @returns {Promise<{answer: string, citations: Array<object>, limitations: Array<string>}>}
   */
  async synthesize(question, passages = []) {
    if (!passages || passages.length === 0) {
      return {
        answer: 'There is insufficient evidence in the knowledge base to answer this question.',
        citations: [],
        limitations: ['No relevant document passages were retrieved.']
      };
    }

    const systemPrompt = `You are TruthGuard's Document Synthesizer Agent.
Your objective is to answer the user's question using ONLY the provided evidence passages.

CRITICAL RULES:
1. Ground every claim directly in the evidence passages. Never hallucinate, assume, or inject external knowledge.
2. If multiple versions or documents contain conflicting information, explicitly state the conflicting versions, dates, and provisions.
3. Every citation MUST reference the exact documentId and chunkId from the provided passages, along with an exact or near-exact excerpt from that passage.
4. If the provided evidence cannot answer parts of the question, explicitly list them under "limitations".
5. Return your response as a valid JSON object matching this schema:
{
  "answer": "A coherent, thorough markdown answer directly referencing cited facts",
  "citations": [
    {
      "documentId": "string ID from passage metadata",
      "chunkId": "string chunk ID from passage metadata",
      "documentTitle": "string title",
      "excerpt": "short verbatim passage excerpt (max 200 chars)",
      "versionLabel": "string or empty",
      "effectiveDate": "ISO string date or null"
    }
  ],
  "limitations": [
    "string describing any gaps, ambiguities, or unanswerable aspects"
  ]
}`;

    // Format numbered passages
    const passagesText = passages
      .map((p, index) => {
        const meta = [
          `Doc ID: ${p.documentId}`,
          `Chunk ID: ${p.chunkId}`,
          `Title: ${p.documentTitle || 'Untitled'}`,
          p.versionLabel ? `Version: ${p.versionLabel}` : null,
          p.effectiveDate ? `Effective Date: ${new Date(p.effectiveDate).toISOString().split('T')[0]}` : null,
          p.category ? `Category: ${p.category}` : null
        ]
          .filter(Boolean)
          .join(', ');

        return `Passage [${index + 1}] (${meta}):\n${p.chunkText}\n`;
      })
      .join('\n');

    const userPrompt = `Question: ${question}\n\nRetrieved Evidence Passages:\n${passagesText}\n\nTask: Synthesize a complete, fact-grounded answer with citations based solely on the passages above. Return valid JSON.`;

    try {
      const response = await this.provider.completeJSON(systemPrompt, userPrompt);

      // Validate and sanitize response structure
      const answer = typeof response.answer === 'string' && response.answer.trim().length > 0
        ? response.answer.trim()
        : 'Unable to formulate an answer from the provided evidence.';

      const citations = Array.isArray(response.citations)
        ? response.citations
            .map(c => {
              const matchedPassage = passages.find(
                p => (c.chunkId && p.chunkId === c.chunkId) || (c.documentId && String(p.documentId) === String(c.documentId))
              );

              if (!matchedPassage) return null; // Drop hallucinated citations with no evidence match

              return {
                documentId: matchedPassage.documentId,
                chunkId: c.chunkId || matchedPassage.chunkId || '',
                documentTitle: matchedPassage.documentTitle || c.documentTitle || '',
                excerpt: (c.excerpt && typeof c.excerpt === 'string' && c.excerpt.trim()) ? c.excerpt.trim() : (matchedPassage.chunkText?.slice(0, 150) || ''),
                versionLabel: matchedPassage.versionLabel || c.versionLabel || '',
                effectiveDate: matchedPassage.effectiveDate || c.effectiveDate || null
              };
            })
            .filter(Boolean)
        : passages.slice(0, 3).map(p => ({
            documentId: p.documentId,
            chunkId: p.chunkId,
            documentTitle: p.documentTitle,
            excerpt: p.chunkText.slice(0, 150),
            versionLabel: p.versionLabel,
            effectiveDate: p.effectiveDate
          }));

      const limitations = Array.isArray(response.limitations)
        ? response.limitations.map(l => String(l).trim()).filter(Boolean)
        : [];

      return {
        answer,
        citations,
        limitations
      };
    } catch (error) {
      console.error('[SynthesizerAgent] Synthesis error:', error);
      // Fallback response on error
      return {
        answer: `Answer synthesis encountered an error: ${error.message}. Refer to retrieved passages directly.`,
        citations: passages.slice(0, 2).map(p => ({
          documentId: p.documentId,
          chunkId: p.chunkId,
          documentTitle: p.documentTitle,
          excerpt: p.chunkText.slice(0, 150),
          versionLabel: p.versionLabel,
          effectiveDate: p.effectiveDate
        })),
        limitations: ['Synthesis processing failed partially.']
      };
    }
  }
}

export default SynthesizerAgent;
