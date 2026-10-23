import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { authenticate } from '../middleware/auth.js';
import documentController from '../controllers/documentController.js';

const router = Router();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// Multer file filter for supported document types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/octet-stream' // fallback for some markdown uploads
  ];

  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only PDF, TXT, and Markdown (.md) documents are accepted.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024
  }
});

// All document routes require authentication
router.use(authenticate);

router.get('/', documentController.getDocuments);
router.post('/', upload.single('file'), documentController.createDocument);
router.get('/:id', documentController.getDocument);
router.delete('/:id', documentController.deleteDocument);
router.get('/:id/versions', documentController.getDocumentVersions);

export default router;
