import Conversation from '../models/Conversation.js';

/**
 * Get all conversations for current user with pagination.
 * GET /api/conversations
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { owner: userId };

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('title messages createdAt updatedAt')
        .lean(),
      Conversation.countDocuments(query)
    ]);

    // Format list response: include message count and last message snippet
    const formatted = conversations.map(c => ({
      _id: c._id,
      title: c.title,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    const pages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      conversations: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single conversation with full message history.
 * GET /api/conversations/:id
 */
export const getConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      _id: id,
      owner: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    return res.status(200).json({
      success: true,
      conversation
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new empty conversation.
 * POST /api/conversations
 */
export const createConversation = async (req, res, next) => {
  try {
    const { title } = req.body;
    const conversation = await Conversation.create({
      owner: req.user.id,
      title: (title && title.trim()) || 'New Conversation',
      messages: []
    });

    return res.status(201).json({
      success: true,
      conversation
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a conversation.
 * DELETE /api/conversations/:id
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOneAndDelete({
      _id: id,
      owner: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation
};
