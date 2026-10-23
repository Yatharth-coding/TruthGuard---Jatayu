/**
 * CriticAgent responsible for adversarial verification of the synthesized answer.
 * Checks for contradictions between sources, staleness, unsupported claims, and evidence gaps.
 * Merges LLM critique with deterministic rule-based checks.
 */
export class CriticAgent {
  /**
   * @param {object} provider - Instance of OpenAIProvider or MockProvider
   */
  constructor(provider) {
    if (!provider) {
      throw new Error('CriticAgent requires an AI provider instance');
    }
    this.provider = provider;
  }

  /**
   * Critically verify the synthesized answer against evidence passages.
   * 
   * @param {string} question 
   * @param {string} answer 
   * @param {Array<object>} citations 
   * @param {Array<object>} passages 
   * @returns {Promise<object>}
   */
  async critique(question, answer, citations = [], passages = []) {
    // If no passages, return immediate failure result
    if (!passages || passages.length === 0) {
      return {
        contradictions: [],
        supportedClaims: [],
        unsupportedClaims: [
          { claim: answer, reason: 'No evidence passages exist to support any claim.' }
        ],
        stalenessFindings: [],
        evidenceGaps: [{ description: 'Knowledge base provided zero relevant passages.' }],
        overallAssessment: 'Failed verification: Answer has no supporting evidence.'
      };
    }

    const systemPrompt = `You are TruthGuard's Adversarial Critic Agent.
Your role is to rigorously cross-examine the synthesized answer and underlying evidence passages to find discrepancies, stale policies, hallucinations, or contradictions.

Evaluate the following criteria:
1. CONTRADICTIONS: Do multiple passages make incompatible claims (e.g., policy rules, timelines, quantities, dates)?
2. STALENESS / SUPERSESSION: Is an older document version cited without accounting for updates in newer versions?
3. UNSUPPORTED CLAIMS: Does the synthesized answer state anything that is NOT explicitly supported by the passage excerpts?
4. EVIDENCE GAPS: Are critical aspects of the user's question left unanswered due to missing evidence?

Return your critique as a valid JSON object matching this schema:
{
  "contradictions": [
    {
      "description": "Clear explanation of the contradictory facts or rules",
      "passages": [
        {
          "documentId": "ID of document",
          "documentTitle": "Title of document",
          "excerpt": "Specific passage excerpt",
          "versionLabel": "Version if available",
          "effectiveDate": "Date or null"
        }
      ],
      "resolution": "Explanation of which source should take precedence or why unresolved",
      "status": "unresolved"
    }
  ],
  "supportedClaims": [
    {
      "claim": "Claim made in answer",
      "evidence": "Direct passage excerpt supporting it"
    }
  ],
  "unsupportedClaims": [
    {
      "claim": "Claim made in answer that lacks evidence",
      "reason": "Why this claim is unsupported"
    }
  ],
  "stalenessFindings": [
    {
      "description": "Explanation of potential outdated policy or version issue",
      "newerDocument": "Title/Version of newer doc",
      "olderDocument": "Title/Version of older doc",
      "isSupersessionEstablished": false,
      "evidence": "Excerpts or dates showing the discrepancy"
    }
  ],
  "evidenceGaps": [
    {
      "description": "What information was missing to give a definitive answer"
    }
  ],
  "overallAssessment": "Summary judgment of answer veracity and conflict status"
}`;

    const passagesText = passages
      .map((p, index) => {
        const meta = [
          `Doc ID: ${p.documentId}`,
          `Title: ${p.documentTitle}`,
          p.versionLabel ? `Version: ${p.versionLabel}` : null,
          p.effectiveDate ? `Effective Date: ${new Date(p.effectiveDate).toISOString().split('T')[0]}` : null
        ]
          .filter(Boolean)
          .join(', ');

        return `Passage [${index + 1}] (${meta}):\n${p.chunkText}\n`;
      })
      .join('\n');

    const userPrompt = `User Question: ${question}

Synthesized Answer to verify:
${answer}

Citations Provided:
${JSON.stringify(citations, null, 2)}

Evidence Passages:
${passagesText}

Task: Perform adversarial verification and return the critique JSON object.`;

    let llmCritique = null;
    try {
      llmCritique = await this.provider.completeJSON(systemPrompt, userPrompt);
    } catch (err) {
      console.warn('[CriticAgent] LLM completion failed, using deterministic checks only:', err.message);
    }

    // Run deterministic rule-based checks
    const deterministicFindings = this.runDeterministicChecks(answer, passages);

    // Merge and harmonize results
    return this.mergeCritiqueResults(llmCritique, deterministicFindings, passages);
  }

  /**
   * Deterministic rule-based checks for dates, numbers, and supersessions.
   */
  runDeterministicChecks(answer, passages) {
    const findings = {
      contradictions: [],
      stalenessFindings: [],
      unsupportedClaims: []
    };

    if (!passages || passages.length === 0) return findings;

    // 1. Check for multiple documents with different effective dates
    const datedPassages = passages.filter(p => p.effectiveDate);
    if (datedPassages.length >= 2) {
      // Group by normalized title
      const byTitle = new Map();
      for (const p of datedPassages) {
        const key = (p.documentTitle || '').toLowerCase().trim();
        if (!byTitle.has(key)) byTitle.set(key, []);
        byTitle.get(key).push(p);
      }

      for (const [titleKey, pList] of byTitle.entries()) {
        if (pList.length >= 2) {
          const sorted = [...pList].sort(
            (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
          );
          const newest = sorted[0];
          const oldest = sorted[sorted.length - 1];

          if (
            new Date(newest.effectiveDate).getTime() !== new Date(oldest.effectiveDate).getTime()
          ) {
            findings.stalenessFindings.push({
              description: `Multiple versions of document "${newest.documentTitle}" exist with differing effective dates (${new Date(oldest.effectiveDate).toISOString().split('T')[0]} vs ${new Date(newest.effectiveDate).toISOString().split('T')[0]}).`,
              newerDocument: `${newest.documentTitle} (${newest.versionLabel || 'newer'})`,
              olderDocument: `${oldest.documentTitle} (${oldest.versionLabel || 'older'})`,
              isSupersessionEstablished: false,
              evidence: `Older passage: "${oldest.chunkText.slice(0, 100)}..." vs Newer passage: "${newest.chunkText.slice(0, 100)}..."`
            });
          }
        }
      }
    }

    // 2. Check for numeric tokens in the answer that do not appear anywhere in passages
    const numberMatches = answer.match(/\b\d+(\.\d+)?%?|\$\d+(\.\d+)?\b/g) || [];
    const fullPassagesText = passages.map(p => p.chunkText).join(' ');

    for (const num of numberMatches) {
      // Disregard single-digit common list indices like "1.", "2."
      if (num.length <= 1) continue;

      if (!fullPassagesText.includes(num)) {
        findings.unsupportedClaims.push({
          claim: `Numeric value "${num}" in synthesized answer`,
          reason: `The value "${num}" was not found in any retrieved document passage excerpts.`
        });
      }
    }

    return findings;
  }

  /**
   * Merge LLM critique output with deterministic rule findings.
   */
  mergeCritiqueResults(llmResult, deterministic, passages) {
    const contradictions = Array.isArray(llmResult?.contradictions)
      ? [...llmResult.contradictions]
      : [];
    const supportedClaims = Array.isArray(llmResult?.supportedClaims)
      ? [...llmResult.supportedClaims]
      : [];
    const unsupportedClaims = Array.isArray(llmResult?.unsupportedClaims)
      ? [...llmResult.unsupportedClaims]
      : [];
    const stalenessFindings = Array.isArray(llmResult?.stalenessFindings)
      ? [...llmResult.stalenessFindings]
      : [];
    const evidenceGaps = Array.isArray(llmResult?.evidenceGaps)
      ? [...llmResult.evidenceGaps]
      : [];

    // Merge deterministic staleness findings if not already present
    for (const item of deterministic.stalenessFindings) {
      const alreadyReported = stalenessFindings.some(s =>
        s.description?.toLowerCase().includes('multiple versions') ||
        (s.olderDocument && item.olderDocument && s.olderDocument.includes(item.olderDocument))
      );
      if (!alreadyReported) {
        stalenessFindings.push(item);
      }
    }

    // Merge deterministic unsupported numbers
    for (const item of deterministic.unsupportedClaims) {
      const alreadyReported = unsupportedClaims.some(u =>
        u.claim?.includes(item.claim)
      );
      if (!alreadyReported) {
        unsupportedClaims.push(item);
      }
    }

    // If staleness was found and conflicting guidance exists, ensure at least one contradiction record
    if (stalenessFindings.length > 0 && contradictions.length === 0 && passages.length >= 2) {
      contradictions.push({
        description: stalenessFindings[0].description,
        passages: passages.slice(0, 2).map(p => ({
          documentId: p.documentId,
          documentTitle: p.documentTitle,
          excerpt: p.chunkText.slice(0, 180),
          versionLabel: p.versionLabel,
          effectiveDate: p.effectiveDate
        })),
        resolution: 'Potential policy revision. Verify whether newer document supersedes prior version.',
        status: 'unresolved'
      });
    }

    return {
      contradictions,
      supportedClaims,
      unsupportedClaims,
      stalenessFindings,
      evidenceGaps,
      overallAssessment:
        llmResult?.overallAssessment ||
        (contradictions.length > 0
          ? 'Contradictions or version conflicts detected.'
          : unsupportedClaims.length > 0
          ? 'Unsupported claims identified.'
          : 'Answer is supported by evidence.')
    };
  }
}

export default CriticAgent;
