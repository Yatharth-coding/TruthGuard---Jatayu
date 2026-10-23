import Conversation from '../models/Conversation.js';
import orchestrator from '../services/agents/orchestrator.js';

/**
 * Ask a question against the user's document knowledge base.
 * POST /api/qa/ask
 */
export const ask = async (req, res, next) => {
  try {
    const { question, conversationId } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const trimmedQuestion = question.trim();
    let conversation = null;

    // 1. Locate or create conversation
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        owner: req.user.id
      });
    }

    if (!conversation) {
      // Create new conversation with title derived from question
      const title = trimmedQuestion.length > 50
        ? `${trimmedQuestion.slice(0, 47)}...`
        : trimmedQuestion;

      conversation = await Conversation.create({
        owner: req.user.id,
        title,
        messages: []
      });
    }

    // 2. Execute 4-Stage Verification Pipeline
    const result = await orchestrator.process(trimmedQuestion, req.user.id);

    // 3. Append User Message
    conversation.messages.push({
      role: 'user',
      content: trimmedQuestion,
      question: trimmedQuestion,
      createdAt: new Date()
    });

    // 4. Append Assistant Message with full verification metadata
    conversation.messages.push({
      role: 'assistant',
      content: result.answer,
      question: trimmedQuestion,
      answer: result.answer,
      verificationStatus: result.verificationStatus,
      evidenceStatus: result.verificationStatus,
      citations: result.citations,
      conflicts: result.conflicts,
      limitations: result.limitations,
      processingTime: result.processingTime,
      createdAt: new Date()
    });

    await conversation.save();

    // 5. Return complete response
    return res.status(200).json({
      success: true,
      answer: result.answer,
      verificationStatus: result.verificationStatus,
      evidenceStatus: result.verificationStatus,
      citations: result.citations,
      conflicts: result.conflicts,
      limitations: result.limitations,
      processingTime: result.processingTime,
      conversationId: conversation._id
    });
  } catch (err) {
    next(err);
  }
};

export default {
  ask
};
