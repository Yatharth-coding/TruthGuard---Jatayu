import OpenAI from 'openai';
import config from '../../config/index.js';

export class OpenAIProvider {
  constructor(apiKey = config.openaiApiKey, model = config.openaiModel) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.model = model || 'gpt-4o-mini';

    if (!this.apiKey) {
      console.warn('[OpenAIProvider] Warning: OPENAI_API_KEY is not set. OpenAI calls will fail unless configured.');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey || 'dummy-key-for-init'
    });
  }

  /**
   * Complete a prompt returning raw text content.
   * 
   * @param {string} systemPrompt 
   * @param {string} userPrompt 
   * @param {object} options 
   * @returns {Promise<string>}
   */
  async complete(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing. Set OPENAI_API_KEY or enable DEMO_MODE=true.');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature !== undefined ? options.temperature : 0.2,
        max_tokens: options.maxTokens || 2000
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (!messageContent) {
        throw new Error('Empty response received from OpenAI API');
      }

      return messageContent.trim();
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Check your configuration.');
      }
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded or quota exhausted.');
      }
      if (error.code === 'ETIMEDOUT' || error.type === 'timeout') {
        throw new Error('OpenAI API request timed out.');
      }
      throw error;
    }
  }

  /**
   * Complete a prompt requesting structured JSON output.
   * 
   * @param {string} systemPrompt 
   * @param {string} userPrompt 
   * @param {object} options 
   * @returns {Promise<object>}
   */
  async completeJSON(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing. Set OPENAI_API_KEY or enable DEMO_MODE=true.');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\nIMPORTANT: You must return valid JSON strictly following the requested structure.`
          },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature !== undefined ? options.temperature : 0.2,
        max_tokens: options.maxTokens || 2000
      });

      const rawContent = response.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Empty response received from OpenAI API');
      }

      return JSON.parse(rawContent);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse JSON response from OpenAI: ${error.message}`);
      }
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Check your configuration.');
      }
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded or quota exhausted.');
      }
      throw error;
    }
  }
}

export default OpenAIProvider;
