import fs from 'fs';
import path from 'path';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { processDocument } from '../services/document/processor.js';
import { escapeRegex } from '../utils/helpers.js';

/**
 * Get all documents for the authenticated user with search, filter, and pagination.
 * GET /api/documents
 */
export const getDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      search,
      status,
      category,
      sort = 'newest',
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { owner: userId };

    // Search filter across title and originalFilename
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { originalFilename: { $regex: sanitized, $options: 'i' } }
      ];
    }

    // Status filter
    if (status && typeof status === 'string' && status.trim().length > 0) {
      query.processingStatus = status.trim();
    }

    // Category filter
    if (category && typeof category === 'string' && category.trim().length > 0) {
      query.category = category.trim();
    }

    // Sorting
    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'title') {
      sortObj = { title: 1 };
    } else if (sort === 'effectiveDate') {
      sortObj = { effectiveDate: -1 };
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('supersedesDocument', 'title versionLabel effectiveDate')
        .populate('supersededByDocument', 'title versionLabel effectiveDate')
        .lean(),
      Document.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      documents,
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
 * Get a single document by ID.
 * GET /api/documents/:id
 */
export const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({ _id: id, owner: req.user.id })
      .populate('supersedesDocument', 'title versionLabel effectiveDate')
      .populate('supersededByDocument', 'title versionLabel effectiveDate');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or you do not have permission to view it'
      });
    }

    return res.status(200).json({
      success: true,
      document
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload and create a new document.
 * POST /api/documents
 */
export const createDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File upload is required (field name: "file")'
      });
    }

    const {
      title,
      versionLabel,
      effectiveDate,
      publicationDate,
      expirationDate,
      category,
      description,
      supersedesDocument
    } = req.body;

    const originalFilename = req.file.originalname;
    const storedFilename = req.file.filename;
    const filePath = req.file.path;
    const fileSize = req.file.size;

    // Determine file type
    const ext = path.extname(originalFilename).replace('.', '').toLowerCase();
    let fileType = 'pdf';
    if (ext === 'txt') fileType = 'txt';
    else if (ext === 'md') fileType = 'md';
    else if (ext === 'pdf') fileType = 'pdf';
    else {
      // Clean up uploaded file if type unsupported
      await fs.promises.unlink(filePath).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type. Only PDF, TXT, and MD files are allowed.'
      });
    }

    // Create document record with pending status
    const documentData = {
      owner: req.user.id,
      title: (title && title.trim()) || path.parse(originalFilename).name,
      originalFilename,
      storedFilename,
      filePath,
      fileType,
      fileSize,
      processingStatus: 'pending',
      versionLabel: versionLabel ? versionLabel.trim() : '',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      publicationDate: publicationDate ? new Date(publicationDate) : null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      category: category ? category.trim() : 'General',
      description: description ? description.trim() : ''
    };

    if (supersedesDocument && supersedesDocument.trim() !== '') {
      const priorDoc = await Document.findOne({
        _id: supersedesDocument.trim(),
        owner: req.user.id
      });
      if (priorDoc) {
        documentData.supersedesDocument = priorDoc._id;
      }
    }

    const document = await Document.create(documentData);

    // If supersedesDocument was specified, update that document's supersededByDocument link
    if (document.supersedesDocument) {
      await Document.findByIdAndUpdate(document.supersedesDocument, {
        supersededByDocument: document._id
      }).catch(err => {
        console.warn('Failed to update supersededByDocument link:', err);
      });
    }

    // Trigger async processing (do NOT await it so upload responds quickly)
    processDocument(document._id).catch(err => {
      console.error(`Background document processing failed for ${document._id}:`, err);
    });

    return res.status(201).json({
      success: true,
      document
    });
  } catch (err) {
    if (req.file && req.file.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
};

/**
 * Delete a document, its file on disk, and its chunk records.
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({ _id: id, owner: req.user.id });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or you do not have permission to delete it'
      });
    }

    // 1. Delete associated DocumentChunk records
    await DocumentChunk.deleteMany({ document: document._id, owner: req.user.id });

    // 2. Remove file from disk
    try {
      if (document.filePath && fs.existsSync(document.filePath)) {
        await fs.promises.unlink(document.filePath);
      }
    } catch (diskErr) {
      console.warn(`[deleteDocument] Failed to delete file on disk at ${document.filePath}:`, diskErr.message);
    }

    // 3. Unlink supersession references in other documents
    await Promise.all([
      Document.updateMany(
        { supersedesDocument: document._id, owner: req.user.id },
        { $unset: { supersedesDocument: 1 } }
      ),
      Document.updateMany(
        { supersededByDocument: document._id, owner: req.user.id },
        { $unset: { supersededByDocument: 1 } }
      )
    ]);

    // 4. Delete the document record
    await Document.findByIdAndDelete(document._id);

    return res.status(200).json({
      success: true,
      message: 'Document and its index chunks deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get version chain and related documents for a document.
 * GET /api/documents/:id/versions
 */
export const getDocumentVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({ _id: id, owner: req.user.id });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Find documents with identical title OR linked via supersession
    const linkedIds = [document._id];
    if (document.supersedesDocument) linkedIds.push(document.supersedesDocument);
    if (document.supersededByDocument) linkedIds.push(document.supersededByDocument);

    const versions = await Document.find({
      owner: req.user.id,
      $or: [
        { title: { $regex: `^${escapeRegex(document.title)}$`, $options: 'i' } },
        { _id: { $in: linkedIds } },
        { supersedesDocument: document._id },
        { supersededByDocument: document._id }
      ]
    })
      .sort({ effectiveDate: 1, createdAt: 1 })
      .select('title versionLabel effectiveDate publicationDate processingStatus category fileSize originalFilename')
      .lean();

    return res.status(200).json({
      success: true,
      versions
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getDocuments,
  getDocument,
  createDocument,
  deleteDocument,
  getDocumentVersions
};
