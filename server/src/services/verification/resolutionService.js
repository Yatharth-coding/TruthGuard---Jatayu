/**
 * ResolutionService arbitrates between the SynthesizerAgent and CriticAgent,
 * determining the authoritative verificationStatus and constructing the final response payload.
 */
export class ResolutionService {
  /**
   * Resolve synthesized answer and critique findings into a verified result.
   * 
   * @param {string} question 
   * @param {object} synthesizerResult 
   * @param {object} criticResult 
   * @param {Array<object>} passages 
   * @returns {object}
   */
  resolve(question, synthesizerResult, criticResult, passages = []) {
    // 1. Check for insufficient evidence
    const hasEvidence = passages && passages.length > 0;
    const synthIndicatesNoEvidence =
      !synthesizerResult ||
      !synthesizerResult.answer ||
      synthesizerResult.answer.toLowerCase().includes('insufficient evidence') ||
      (synthesizerResult.citations && synthesizerResult.citations.length === 0 && !hasEvidence);

    if (!hasEvidence || synthIndicatesNoEvidence) {
      return {
        answer: 'There is insufficient evidence in your indexed documents to answer this question. Please upload relevant documents or adjust your query.',
        verificationStatus: 'insufficient_evidence',
        citations: [],
        conflicts: [],
        limitations: [
          'No matching or authoritative passages found in the knowledge base.'
        ],
        processingTime: 0
      };
    }

    // 2. Check for critic execution errors or failures
    if (!criticResult || criticResult.criticError) {
      return {
        answer: synthesizerResult.answer,
        verificationStatus: 'verification_error',
        citations: this.enrichCitations(synthesizerResult.citations || [], passages),
        conflicts: [],
        limitations: [
          'Adversarial critique could not be completed (critic model failure, timeout, or unavailable provider). Verification status unconfirmed.'
        ],
        processingTime: 0
      };
    }

    const contradictions = Array.isArray(criticResult.contradictions)
      ? criticResult.contradictions
      : [];
    const unsupportedClaims = Array.isArray(criticResult.unsupportedClaims)
      ? criticResult.unsupportedClaims
      : [];
    const unresolvedContradictions = contradictions.filter(
      c => c.status === 'unresolved' || !c.status
    );

    // 3. Determine Verification Status
    let verificationStatus = 'supported';
    if (unresolvedContradictions.length > 0) {
      verificationStatus = 'conflict_detected';
    } else if (unsupportedClaims.length > 0) {
      verificationStatus = 'unresolved';
    } else {
      verificationStatus = 'supported';
    }

    // 4. Construct Final Answer
    let finalAnswer = synthesizerResult.answer;

    if (verificationStatus === 'conflict_detected') {
      const conflictSummaries = unresolvedContradictions
        .map((c, i) => `**Conflict ${i + 1}**: ${c.description}`)
        .join('\n\n');

      const banner = `> ⚠️ **CONFLICT DETECTED ACROSS SOURCES**\n> TruthGuard detected conflicting or superseded provisions across your uploaded documents.\n>\n> ${conflictSummaries.replace(/\n/g, '\n> ')}\n\n`;
      finalAnswer = `${banner}### Document Synthesis & Version Comparison\n\n${synthesizerResult.answer}`;
    } else if (verificationStatus === 'unresolved') {
      const unsupportedText = unsupportedClaims
        .map(u => `- **${u.claim}**: ${u.reason}`)
        .join('\n');

      const warning = `> ⚠️ **PARTIAL VERIFICATION NOTICE**\n> Certain claims could not be independently substantiated by the retrieved evidence:\n>\n> ${unsupportedText.replace(/\n/g, '\n> ')}\n\n`;
      finalAnswer = `${warning}${synthesizerResult.answer}`;
    }

    // 5. Enrich Citations with Document Metadata
    const enrichedCitations = this.enrichCitations(
      synthesizerResult.citations || [],
      passages
    );

    // 6. Enrich Conflicts with Metadata
    const enrichedConflicts = unresolvedContradictions.map(c => ({
      description: c.description || 'Discrepancy detected between sources',
      passages: (c.passages || []).map(p => {
        const matchingPassage = passages.find(
          orig =>
            (p.documentId && String(orig.documentId) === String(p.documentId)) ||
            (p.chunkId && orig.chunkId === p.chunkId)
        );

        return {
          documentId: p.documentId || matchingPassage?.documentId || null,
          documentTitle: p.documentTitle || matchingPassage?.documentTitle || 'Document',
          excerpt: p.excerpt || matchingPassage?.chunkText?.slice(0, 200) || '',
          versionLabel: p.versionLabel || matchingPassage?.versionLabel || '',
          effectiveDate: p.effectiveDate || matchingPassage?.effectiveDate || null,
          uploadDate: matchingPassage?.publicationDate || null
        };
      }),
      resolution: c.resolution || 'Requires manual version reconciliation.',
      status: c.status || 'unresolved'
    }));

    // 7. Aggregate Limitations
    const allLimitations = new Set([
      ...(synthesizerResult.limitations || []),
      ...(criticResult.evidenceGaps || []).map(g => g.description),
      ...(criticResult.stalenessFindings || []).map(s => `Staleness: ${s.description}`)
    ]);

    return {
      answer: finalAnswer,
      verificationStatus,
      citations: enrichedCitations,
      conflicts: enrichedConflicts,
      limitations: Array.from(allLimitations).filter(Boolean),
      processingTime: 0
    };
  }

  /**
   * Enrich citations array with metadata from retrieved passages.
   */
  enrichCitations(citations, passages) {
    if (!citations || citations.length === 0) {
      return passages.slice(0, 3).map(p => ({
        documentId: p.documentId,
        chunkId: p.chunkId,
        documentTitle: p.documentTitle,
        excerpt: p.chunkText.slice(0, 200),
        versionLabel: p.versionLabel,
        effectiveDate: p.effectiveDate
      }));
    }

    // Only allow citations that genuinely match retrieved passages
    const validCitations = [];
    for (const c of citations) {
      const match = passages.find(
        p => (c.chunkId && p.chunkId === c.chunkId) || (c.documentId && String(p.documentId) === String(c.documentId))
      );

      if (match) {
        validCitations.push({
          documentId: match.documentId,
          chunkId: match.chunkId,
          documentTitle: match.documentTitle || c.documentTitle || 'Reference Document',
          excerpt: c.excerpt || match.chunkText?.slice(0, 200) || '',
          versionLabel: match.versionLabel || '',
          effectiveDate: match.effectiveDate || null
        });
      }
    }

    // If all citations provided by the synthesizer were fabricated/unmatched, fallback to top retrieved evidence
    if (validCitations.length === 0 && passages.length > 0) {
      return passages.slice(0, 2).map(p => ({
        documentId: p.documentId,
        chunkId: p.chunkId,
        documentTitle: p.documentTitle,
        excerpt: p.chunkText.slice(0, 200),
        versionLabel: p.versionLabel,
        effectiveDate: p.effectiveDate
      }));
    }

    return validCitations;
  }
}

export default ResolutionService;
