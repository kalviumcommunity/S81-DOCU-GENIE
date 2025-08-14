import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { dbUtils } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { processDocument } from '../services/documentProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

// Ensure upload directory exists
try {
  await fs.mkdir(uploadDir, { recursive: true });
} catch (error) {
  console.error('Failed to create upload directory:', error);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only PDF and Word documents are allowed.', 400, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload file endpoint
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file provided', 400, 'NO_FILE');
  }

  const { filename, originalname, path: filePath, size, mimetype } = req.file;

  try {
    // Save file info to database
    const documentId = await dbUtils.createDocument(
      req.user.id,
      filename,
      originalname,
      filePath,
      size,
      mimetype
    );

    // Process document asynchronously
    processDocument(documentId, filePath, mimetype)
      .then(() => {
        console.log(`✅ Document ${documentId} processed successfully`);
      })
      .catch((error) => {
        console.error(`❌ Failed to process document ${documentId}:`, error);
      });

    res.status(201).json({
      message: 'File uploaded successfully',
      document: {
        id: documentId,
        filename: originalname,
        size,
        type: mimetype,
        processed: false
      }
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Failed to clean up uploaded file:', unlinkError);
    }
    throw error;
  }
}));

// Get user's files
router.get('/list', asyncHandler(async (req, res) => {
  const documents = await dbUtils.getDocumentsByUserId(req.user.id);

  const formattedDocuments = documents.map(doc => ({
    id: doc.id,
    name: doc.original_name,
    filename: doc.filename,
    size: doc.file_size,
    type: doc.mime_type,
    processed: Boolean(doc.processed),
    uploadedAt: doc.created_at
  }));

  res.json({
    documents: formattedDocuments,
    count: formattedDocuments.length
  });
}));

// Get specific file info
router.get('/:id', asyncHandler(async (req, res) => {
  const documentId = parseInt(req.params.id);
  
  if (isNaN(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  const document = await dbUtils.getDocumentById(documentId);
  
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Check if user owns the document
  if (document.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  res.json({
    id: document.id,
    name: document.original_name,
    filename: document.filename,
    size: document.file_size,
    type: document.mime_type,
    processed: Boolean(document.processed),
    uploadedAt: document.created_at
  });
}));

// Delete file
router.delete('/:id', asyncHandler(async (req, res) => {
  const documentId = parseInt(req.params.id);
  
  if (isNaN(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  const document = await dbUtils.getDocumentById(documentId);
  
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Check if user owns the document
  if (document.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  try {
    // Delete file from filesystem
    await fs.unlink(document.file_path);
  } catch (error) {
    console.error('Failed to delete file from filesystem:', error);
    // Continue with database deletion even if file deletion fails
  }

  // Delete from database (will cascade to chunks)
  await dbUtils.deleteDocument(documentId);

  res.json({
    message: 'Document deleted successfully'
  });
}));

// Download file
router.get('/:id/download', asyncHandler(async (req, res) => {
  const documentId = parseInt(req.params.id);
  
  if (isNaN(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  const document = await dbUtils.getDocumentById(documentId);
  
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Check if user owns the document
  if (document.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  try {
    // Check if file exists
    await fs.access(document.file_path);
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Type', document.mime_type);
    
    // Send file
    res.sendFile(path.resolve(document.file_path));
  } catch (error) {
    throw new AppError('File not found on server', 404, 'FILE_NOT_FOUND');
  }
}));

export default router;
