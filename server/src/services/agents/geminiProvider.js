import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config/index.js';

export class GeminiProvider {
  constructor(apiKey = config.geminiApiKey, model = config.geminiModel) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.modelName = model || 'gemini-3.5-flash-lite';

    if (!this.apiKey) {
      console.warn('[GeminiProvider] Warning: GEMINI_API_KEY is not set. Gemini calls will fail unless configured.');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey || 'dummy-key-for-init');
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
      throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in .env or enable DEMO_MODE=true.');
    }

    const modelsToTry = [
      options.model || this.modelName,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash'
    ];
    const uniqueModels = [...new Set(modelsToTry)];

    let lastError = null;
    for (const modelName of uniqueModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: options.temperature !== undefined ? options.temperature : 0.2,
            maxOutputTokens: options.maxTokens || 2048,
          }
        });

        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        return response.text().trim();
      } catch (error) {
        lastError = error;
        if (error.status === 503 || error.message?.includes('503')) {
          console.warn(`[GeminiProvider] ${modelName} returned 503, attempting fallback...`);
          continue;
        }
        break;
      }
    }

    if (lastError?.message?.includes('API_KEY_INVALID') || lastError?.status === 400) {
      throw new Error(`Gemini API error: ${lastError.message}`);
    }
    if (lastError?.status === 429) {
      throw new Error('Gemini rate limit exceeded or quota exhausted.');
    }
    throw lastError;
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
      throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in .env or enable DEMO_MODE=true.');
    }

    const modelsToTry = [
      options.model || this.modelName,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash'
    ];
    const uniqueModels = [...new Set(modelsToTry)];

    let lastError = null;
    for (const modelName of uniqueModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: `${systemPrompt}\n\nIMPORTANT: You must return valid JSON strictly following the requested structure. Do not include markdown code block syntax.`,
          generationConfig: {
            temperature: options.temperature !== undefined ? options.temperature : 0.2,
            maxOutputTokens: options.maxTokens || 2048,
            responseMimeType: 'application/json'
          }
        });

        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const rawText = response.text().trim();

        // Clean markdown code blocks if present
        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();

        return JSON.parse(cleaned);
      } catch (error) {
        lastError = error;
        if (error.status === 503 || error.message?.includes('503')) {
          console.warn(`[GeminiProvider] ${modelName} returned 503, attempting fallback...`);
          continue;
        }
        break;
      }
    }

    if (lastError instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON response from Gemini: ${lastError.message}`);
    }
    if (lastError?.message?.includes('API_KEY_INVALID')) {
      throw new Error(`Gemini API error: ${lastError.message}`);
    }
    if (lastError?.status === 429) {
      throw new Error('Gemini rate limit exceeded or quota exhausted.');
    }
    throw lastError;
  }
}

export default GeminiProvider;
