import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import qaController from '../controllers/qaController.js';

const router = Router();

const askSchema = z.object({
  question: z.string().min(1, 'Question must not be empty').max(2000),
  conversationId: z.string().optional().nullable()
});

// All Q&A routes require authentication
router.use(authenticate);

router.post('/ask', validate(askSchema), qaController.ask);

export default router;
