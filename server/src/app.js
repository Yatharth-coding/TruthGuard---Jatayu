import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import qaRoutes from './routes/qaRoutes.js';

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Cookie parsing
app.use(cookieParser());

// Request body parsing with 10mb limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Rate limiting on /api/auth routes
const authLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Static serving for uploads directory
app.use('/uploads', express.static(config.uploadDir));

// API Route Mounts
app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/qa', qaRoutes);

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
