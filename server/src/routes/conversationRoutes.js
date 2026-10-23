import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import conversationController from '../controllers/conversationController.js';

const router = Router();

// All conversation routes require authentication
router.use(authenticate);

router.get('/', conversationController.getConversations);
router.post('/', conversationController.createConversation);
router.get('/:id', conversationController.getConversation);
router.delete('/:id', conversationController.deleteConversation);

export default router;
