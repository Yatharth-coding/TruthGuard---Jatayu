import config from '../../config/index.js';
import { getProvider } from './providerFactory.js';
import { retrieveEvidence } from '../retrieval/retrievalService.js';
import { SynthesizerAgent } from './synthesizerAgent.js';
import { CriticAgent } from './criticAgent.js';
import { ResolutionService } from '../verification/resolutionService.js';

/**
 * AgentOrchestrator coordinates the 4-stage TruthGuard pipeline:
 * Stage 1: Evidence Retrieval
 * Stage 2: Synthesis
 * Stage 3: Adversarial Critique
 * Stage 4: Verification & Resolution
 */
export class AgentOrchestrator {
  constructor() {
    this.provider = getProvider(config.aiProvider);
    this.synthesizer = new SynthesizerAgent(this.provider);
    this.critic = new CriticAgent(this.provider);
    this.resolutionService = new ResolutionService();
  }

  /**
   * Run the 4-stage verification pipeline for a question and user context.
   * 
   * @param {string} question 
   * @param {string|mongoose.Types.ObjectId} userId 
   * @param {object} options 
   * @returns {Promise<object>}
   */
  async process(question, userId, options = {}) {
    const startTime = Date.now();

    // Stage 1: Retrieve Evidence
    const retrievalResult = await retrieveEvidence(question, userId, {
      limit: options.limit || 10
    });
    const passages = retrievalResult.passages || [];

    // Early exit if no evidence is found in the user's documents
    if (passages.length === 0) {
      const processingTime = Date.now() - startTime;
      return {
        answer: 'There is insufficient evidence in your indexed documents to answer this question. Please upload relevant documents or adjust your query.',
        verificationStatus: 'insufficient_evidence',
        citations: [],
        conflicts: [],
        limitations: [
          'No relevant or authoritative passages were retrieved from the indexed knowledge base.'
        ],
        processingTime
      };
    }

    // Stage 2: Synthesize Answer
    const synthResult = await this.synthesizer.synthesize(question, passages);

    // Stage 3: Adversarial Critique
    let criticResult = null;
    try {
      criticResult = await this.critic.critique(
        question,
        synthResult.answer,
        synthResult.citations,
        passages
      );
    } catch (criticErr) {
      console.error('[AgentOrchestrator] Critic execution failed:', criticErr);
      criticResult = null;
    }

    // Stage 4: Verification Resolution
    const resolvedResult = this.resolutionService.resolve(
      question,
      synthResult,
      criticResult,
      passages
    );

    // Calculate total processing duration
    resolvedResult.processingTime = Date.now() - startTime;

    return resolvedResult;
  }
}

// Export singleton instance as default
export const orchestrator = new AgentOrchestrator();
export default orchestrator;
