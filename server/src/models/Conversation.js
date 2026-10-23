import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    chunkId: {
      type: String
    },
    documentTitle: {
      type: String,
      default: ''
    },
    excerpt: {
      type: String,
      default: ''
    },
    versionLabel: {
      type: String,
      default: ''
    },
    effectiveDate: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const conflictPassageSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    documentTitle: {
      type: String,
      default: ''
    },
    excerpt: {
      type: String,
      default: ''
    },
    versionLabel: {
      type: String,
      default: ''
    },
    effectiveDate: {
      type: Date,
      default: null
    },
    uploadDate: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const conflictSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true
    },
    passages: [conflictPassageSchema],
    resolution: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: 'unresolved'
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    question: {
      type: String,
      default: ''
    },
    answer: {
      type: String,
      default: ''
    },
    verificationStatus: {
      type: String,
      enum: [
        'supported',
        'conflict_detected',
        'unresolved',
        'insufficient_evidence',
        'verification_error',
        'pending'
      ],
      default: 'pending'
    },
    evidenceStatus: {
      type: String,
      enum: [
        'supported',
        'conflict_detected',
        'unresolved',
        'insufficient_evidence',
        'verification_error',
        'pending'
      ],
      default: 'pending'
    },
    citations: [citationSchema],
    conflicts: [conflictSchema],
    limitations: [{ type: String }],
    processingTime: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true
    },
    messages: [messageSchema]
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ owner: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
