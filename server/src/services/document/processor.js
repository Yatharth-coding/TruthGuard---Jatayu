import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { extractText } from 'unpdf';
import Document from '../../models/Document.js';
import DocumentChunk from '../../models/DocumentChunk.js';
import { normalizeText, generateChunkId } from '../../utils/helpers.js';

/**
 * Split normalized text into overlapping chunks.
 * Chunk size: ~1000 characters with ~200 characters overlap.
 * Attempts to break cleanly at sentence or word boundaries.
 * 
 * @param {string} text 
 * @param {number} chunkSize 
 * @param {number} overlap 
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export function chunkTextContent(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  const textLength = text.length;

  if (textLength === 0) {
    return chunks;
  }

  if (textLength <= chunkSize) {
    chunks.push({
      text,
      start: 0,
      end: textLength
    });
    return chunks;
  }

  let start = 0;
  const step = chunkSize - overlap;

  while (start < textLength) {
    let end = Math.min(start + chunkSize, textLength);

    // If not at the very end of text, try to find a natural boundary
    if (end < textLength) {
      // Look for a newline or sentence boundary within 100 chars before target end
      const windowStart = Math.max(start + step, end - 100);
      const windowSlice = text.substring(windowStart, end);

      const lastBreak = Math.max(
        windowSlice.lastIndexOf('\n\n'),
        windowSlice.lastIndexOf('\n'),
        windowSlice.lastIndexOf('. '),
        windowSlice.lastIndexOf('? '),
        windowSlice.lastIndexOf('! ')
      );

      if (lastBreak !== -1) {
        end = windowStart + lastBreak + (windowSlice[lastBreak] === '\n' ? 1 : 2);
      } else {
        // Fall back to space boundary
        const lastSpace = windowSlice.lastIndexOf(' ');
        if (lastSpace !== -1) {
          end = windowStart + lastSpace + 1;
        }
      }
    }

    const chunkStr = text.substring(start, end).trim();
    if (chunkStr.length > 0) {
      chunks.push({
        text: chunkStr,
        start,
        end
      });
    }

    if (end >= textLength) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

/**
 * Process uploaded document: extract text, normalize, chunk, and index into MongoDB.
 * 
 * @param {string|mongoose.Types.ObjectId} documentId 
 * @returns {Promise<Document>}
 */
export async function processDocument(documentId) {
  let doc = null;
  try {
    doc = await Document.findById(documentId);
    if (!doc) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    doc.processingStatus = 'processing';
    doc.processingError = null;
    await doc.save();

    // Verify file exists on disk
    if (!fs.existsSync(doc.filePath)) {
      throw new Error(`File not found on disk at path: ${doc.filePath}`);
    }

    const fileBuffer = await fs.promises.readFile(doc.filePath);
    let rawText = '';

    const ext = (doc.fileType || path.extname(doc.originalFilename).replace('.', '')).toLowerCase();

    if (ext === 'pdf') {
      try {
        const result = await extractText(new Uint8Array(fileBuffer));
        rawText = Array.isArray(result.text) ? result.text.join('\n\n') : (result.text || '');
      } catch (unpdfErr) {
        // Fallback to pdfParse
        try {
          const parsedPdf = await pdfParse(fileBuffer);
          rawText = parsedPdf.text || '';
        } catch (pdfParseErr) {
          throw new Error(`Failed to extract text from PDF: ${unpdfErr.message || pdfParseErr.message}`);
        }
      }

      if (!rawText || rawText.trim().length === 0) {
        throw new Error('Non-searchable or empty PDF. Scanned images without OCR are not supported.');
      }
    } else if (ext === 'txt' || ext === 'md') {
      rawText = fileBuffer.toString('utf-8');
    } else {
      // Default to utf-8 string reading
      rawText = fileBuffer.toString('utf-8');
    }

    const normalized = normalizeText(rawText);
    if (!normalized || normalized.length === 0) {
      throw new Error('Document contains no readable text content after normalization.');
    }

    // Generate chunks
    const rawChunks = chunkTextContent(normalized, 1000, 200);
    if (rawChunks.length === 0) {
      throw new Error('Failed to generate chunks from document text.');
    }

    // Clean up existing chunks if reprocessing
    await DocumentChunk.deleteMany({ document: doc._id });

    // Prepare DocumentChunk records
    const chunkRecords = rawChunks.map((chunk, index) => ({
      owner: doc.owner,
      document: doc._id,
      chunkId: generateChunkId(),
      chunkText: chunk.text,
      chunkIndex: index,
      startPosition: chunk.start,
      endPosition: chunk.end,
      metadata: {
        title: doc.title,
        versionLabel: doc.versionLabel || '',
        effectiveDate: doc.effectiveDate || null,
        publicationDate: doc.publicationDate || null,
        category: doc.category || 'General',
        originalFilename: doc.originalFilename
      }
    }));

    await DocumentChunk.insertMany(chunkRecords);

    // Update document record
    doc.extractedText = normalized.slice(0, 100000); // Store up to first 100k chars for preview
    doc.chunkCount = chunkRecords.length;
    doc.processingStatus = 'processed';
    doc.processingError = null;
    await doc.save();

    return doc;
  } catch (error) {
    if (doc) {
      doc.processingStatus = 'failed';
      doc.processingError = error.message || 'Unknown processing error';
      await doc.save().catch(() => {});
    }
    console.error(`[DocumentProcessor] Error processing document ${documentId}:`, error);
    throw error;
  }
}

export default {
  processDocument,
  chunkTextContent
};
