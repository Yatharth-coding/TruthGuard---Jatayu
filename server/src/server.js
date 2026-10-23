import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root (.env)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import config and app after environment variables are loaded
import config from './config/index.js';
import app from './app.js';

let server = null;

async function startServer() {
  try {
    console.log('[TruthGuard] Connecting to MongoDB at:', config.mongoUri);
    await mongoose.connect(config.mongoUri);
    console.log('[TruthGuard] Connected to MongoDB database successfully.');

    server = app.listen(config.port, () => {
      console.log('====================================================');
      console.log(`🛡️  TruthGuard Server is running on port: ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🤖 AI Provider: ${config.aiProvider} (Demo Mode: ${config.demoMode})`);
      console.log(`🔗 Health Check: http://localhost:${config.port}/api/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('[TruthGuard] Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[TruthGuard] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[TruthGuard] HTTP server closed.');
      try {
        await mongoose.connection.close();
        console.log('[TruthGuard] MongoDB connection closed.');
      } catch (err) {
        console.error('[TruthGuard] Error closing MongoDB connection:', err);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[TruthGuard] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[TruthGuard] Uncaught Exception:', error);
  process.exit(1);
});

startServer();
