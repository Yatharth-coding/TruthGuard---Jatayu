import { Router } from 'express';
import mongoose from 'mongoose';
import config from '../config/index.js';

const router = Router();

router.get('/', (req, res) => {
  const dbStatusMap = {
    0: 'Disconnected',
    1: 'Connected (MongoDB)',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demoMode: config.demoMode,
    aiProvider: config.aiProvider,
    database: dbStatusMap[mongoose.connection.readyState] || 'Unknown',
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

export default router;
