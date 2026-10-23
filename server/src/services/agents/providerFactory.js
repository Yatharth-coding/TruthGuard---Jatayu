import config from '../../config/index.js';
import OpenAIProvider from './openaiProvider.js';
import GeminiProvider from './geminiProvider.js';
import MockProvider from './mockProvider.js';

/**
 * Factory function to retrieve the configured AI provider.
 * 
 * @param {string} providerName 
 * @returns {GeminiProvider|OpenAIProvider|MockProvider}
 */
export function getProvider(providerName = config.aiProvider) {
  const normalized = (providerName || '').toLowerCase().trim();

  // If DEMO_MODE is active, environment is test, or provider is explicitly 'mock'
  if (config.demoMode || config.nodeEnv === 'test' || normalized === 'mock') {
    return new MockProvider();
  }

  if (normalized === 'gemini') {
    return new GeminiProvider();
  }

  if (normalized === 'openai') {
    return new OpenAIProvider();
  }

  throw new Error(`Unsupported AI provider: "${providerName}". Expected "gemini", "openai", or "mock".`);
}

export default {
  getProvider
};
