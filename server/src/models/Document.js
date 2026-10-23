import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    storedFilename: {
      type: String,
      required: [true, 'Stored filename is required'],
      trim: true
    },
    filePath: {
      type: String,
      required: [true, 'File path is required']
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: ['pdf', 'txt', 'md']
    },
    fileSize: {
      type: Number,
      default: 0
    },
    extractedText: {
      type: String,
      default: ''
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    processingError: {
      type: String,
      default: null
    },
    versionLabel: {
      type: String,
      trim: true,
      default: ''
    },
    effectiveDate: {
      type: Date,
      default: null
    },
    publicationDate: {
      type: Date,
      default: null
    },
    expirationDate: {
      type: Date,
      default: null
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    supersedesDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },
    supersededByDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },
    chunkCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index on owner and processingStatus for fast retrieval
documentSchema.index({ owner: 1, processingStatus: 1 });
documentSchema.index({ owner: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;
