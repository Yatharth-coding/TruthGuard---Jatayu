import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document reference is required'],
      index: true
    },
    chunkId: {
      type: String,
      required: [true, 'Chunk ID is required'],
      unique: true,
      index: true
    },
    chunkText: {
      type: String,
      required: [true, 'Chunk text is required']
    },
    chunkIndex: {
      type: Number,
      required: [true, 'Chunk index is required']
    },
    startPosition: {
      type: Number,
      default: 0
    },
    endPosition: {
      type: Number,
      default: 0
    },
    metadata: {
      title: { type: String, default: '' },
      versionLabel: { type: String, default: '' },
      effectiveDate: { type: Date, default: null },
      publicationDate: { type: Date, default: null },
      category: { type: String, default: 'General' },
      originalFilename: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for searching chunks by owner & document
documentChunkSchema.index({ owner: 1, document: 1 });
documentChunkSchema.index({ owner: 1, chunkIndex: 1 });

const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);
export default DocumentChunk;
