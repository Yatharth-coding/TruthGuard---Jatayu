import { GeminiProvider } from '../src/services/agents/geminiProvider.js';
import { SynthesizerAgent } from '../src/services/agents/synthesizerAgent.js';
import { CriticAgent } from '../src/services/agents/criticAgent.js';
import { ResolutionService } from '../src/services/verification/resolutionService.js';

async function testGeminiPipeline() {
  console.log('[Test Gemini Agents] Initializing Gemini Provider...');
  const provider = new GeminiProvider();
  const synthesizer = new SynthesizerAgent(provider);
  const critic = new CriticAgent(provider);
  const resolutionService = new ResolutionService();

  const testPassages = [
    {
      chunkId: 'chunk-101',
      chunkText: 'Remote Work Policy 2023 (v1.0): Effective January 1, 2023. Eligible employees may work remotely up to 2 days per week with manager coordination.',
      chunkIndex: 0,
      documentId: '507f1f77bcf86cd799439011',
      documentTitle: 'Corporate Remote Work Policy 2023',
      versionLabel: 'v1.0',
      effectiveDate: new Date('2023-01-01'),
      score: 5
    },
    {
      chunkId: 'chunk-201',
      chunkText: 'Remote Work Policy 2024 (v2.0): Effective January 1, 2024. Under our revised flexibility program, employees may work remotely up to 5 days per week.',
      chunkIndex: 0,
      documentId: '507f1f77bcf86cd799439012',
      documentTitle: 'Corporate Remote Work Policy 2024',
      versionLabel: 'v2.0',
      effectiveDate: new Date('2024-01-01'),
      score: 5
    }
  ];

  console.log('\n--- 1. Testing Synthesizer with Gemini ---');
  const question = 'How many days per week are employees permitted to work remotely?';
  const synthResult = await synthesizer.synthesize(question, testPassages);
  console.log('✓ Synthesizer Answer:');
  console.log(' ', synthResult.answer);
  console.log('✓ Citations count:', synthResult.citations.length);

  console.log('\n--- 2. Testing Adversarial Critic with Gemini ---');
  const criticResult = await critic.critique(question, synthResult.answer, synthResult.citations, testPassages);
  console.log('✓ Critic Contradictions detected:', criticResult.contradictions.length);
  if (criticResult.contradictions.length > 0) {
    console.log('  Description:', criticResult.contradictions[0].description);
  }
  console.log('✓ Staleness findings:', criticResult.stalenessFindings.length);

  console.log('\n--- 3. Testing Resolution Service ---');
  const finalResult = resolutionService.resolve(question, synthResult, criticResult, testPassages);
  console.log('✓ Final Verification Status:', finalResult.verificationStatus);
  console.log('✓ Final Answer Snippet:', finalResult.answer.slice(0, 160) + '...');

  console.log('\n🎉 GEMINI MULTI-AGENT VERIFICATION PIPELINE FULLY OPERATIONAL!');
}

testGeminiPipeline().catch(err => {
  console.error('❌ Pipeline test failed:', err);
  process.exit(1);
});
