import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try resolving .env from server cwd, project root, and config directory
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env')
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/truthguard',
  jwtSecret: process.env.JWT_SECRET || 'truthguard-super-secure-jwt-secret-key-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  aiProvider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  demoMode: process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 20,
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20
};

export default config;
