import mongoose from 'mongoose';
import DocumentChunk from '../../models/DocumentChunk.js';
import Document from '../../models/Document.js';
import { escapeRegex } from '../../utils/helpers.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'can', 'could', 'of', 'at', 'by', 'for',
  'with', 'about', 'against', 'between', 'through', 'during', 'before',
  'after', 'above', 'below', 'to', 'from', 'in', 'on', 'up', 'out',
  'off', 'over', 'under', 'again', 'further', 'then', 'once', 'and',
  'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same',
  'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
  'into', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me',
  'my', 'we', 'our', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'how', 'all', 'any', 'if'
]);

/**
 * Tokenize a question into relevant search keywords.
 * @param {string} text 
 * @returns {string[]}
 */
export function extractQueryTokens(text) {
  if (!text || typeof text !== 'string') return [];

  const rawTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/);

  const seen = new Set();
  const validTokens = [];

  for (const token of rawTokens) {
    if (token.length >= 2 && !STOP_WORDS.has(token) && !seen.has(token)) {
      seen.add(token);
      validTokens.push(token);
    }
  }

  return validTokens;
}

/**
 * Retrieve evidence passages matching a query.
 * 
 * @param {string} question 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {object} options 
 * @returns {Promise<{passages: Array<object>, status: string}>}
 */
export async function retrieveEvidence(question, userId, options = {}) {
  const limit = options.limit || 10;
  const tokens = extractQueryTokens(question);

  if (tokens.length === 0 || mongoose.connection.readyState !== 1) {
    return {
      passages: [],
      status: 'no_evidence'
    };
  }

  // 1. Find processed documents owned by this user
  const processedDocs = await Document.find({
    owner: userId,
    processingStatus: 'processed'
  }).select('_id title versionLabel effectiveDate publicationDate category supersedesDocument supersededByDocument');

  if (!processedDocs || processedDocs.length === 0) {
    return {
      passages: [],
      status: 'no_evidence'
    };
  }

  const docMap = new Map();
  for (const doc of processedDocs) {
    docMap.set(doc._id.toString(), doc);
  }

  const processedDocIds = Array.from(docMap.keys());

  // 2. Query DocumentChunks with $or regex on chunkText
  const regexClauses = tokens.map(token => ({
    chunkText: { $regex: escapeRegex(token), $options: 'i' }
  }));

  const chunks = await DocumentChunk.find({
    owner: userId,
    document: { $in: processedDocIds },
    $or: regexClauses
  }).lean();

  if (!chunks || chunks.length === 0) {
    return {
      passages: [],
      status: 'no_evidence'
    };
  }

  // 3. Score matching chunks
  // Score = distinct query tokens found in chunk text + bonus for title matches
  const scoredPassages = chunks.map(chunk => {
    const chunkTextLower = chunk.chunkText.toLowerCase();
    const doc = docMap.get(chunk.document.toString()) || {};
    const titleLower = (doc.title || chunk.metadata?.title || '').toLowerCase();

    let score = 0;
    for (const token of tokens) {
      if (chunkTextLower.includes(token)) {
        score += 1;
      }
      if (titleLower.includes(token)) {
        score += 0.5;
      }
    }

    return {
      chunkId: chunk.chunkId,
      chunkText: chunk.chunkText,
      chunkIndex: chunk.chunkIndex,
      startPosition: chunk.startPosition,
      endPosition: chunk.endPosition,
      documentId: chunk.document,
      documentTitle: doc.title || chunk.metadata?.title || 'Untitled Document',
      versionLabel: doc.versionLabel || chunk.metadata?.versionLabel || '',
      effectiveDate: doc.effectiveDate || chunk.metadata?.effectiveDate || null,
      publicationDate: doc.publicationDate || chunk.metadata?.publicationDate || null,
      category: doc.category || chunk.metadata?.category || 'General',
      supersedesDocument: doc.supersedesDocument || chunk.metadata?.supersedesDocument || null,
      supersededByDocument: doc.supersededByDocument || chunk.metadata?.supersededByDocument || null,
      score
    };
  });

  // 4. Sort by score descending
  scoredPassages.sort((a, b) => b.score - a.score);

  // 5. Deduplicate overlapping chunks from same document
  const deduplicated = [];
  const seenDocChunks = new Map();

  for (const passage of scoredPassages) {
    const docKey = passage.documentId.toString();
    if (!seenDocChunks.has(docKey)) {
      seenDocChunks.set(docKey, []);
    }
    const docList = seenDocChunks.get(docKey);

    // Check if this chunk heavily overlaps with an already selected chunk from the same doc
    const isAdjacentOrDuplicate = docList.some(existing => {
      // If chunkIndex is adjacent (diff === 1) and score is lower, or exact same index
      return Math.abs(existing.chunkIndex - passage.chunkIndex) <= 0;
    });

    if (!isAdjacentOrDuplicate) {
      docList.push(passage);
      deduplicated.push(passage);
    }
  }

  const finalPassages = deduplicated.slice(0, limit);

  return {
    passages: finalPassages,
    status: finalPassages.length > 0 ? 'evidence_found' : 'no_evidence'
  };
}

export default {
  extractQueryTokens,
  retrieveEvidence
};
