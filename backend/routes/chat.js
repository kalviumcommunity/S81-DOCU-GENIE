import express from 'express';
import { body, validationResult } from 'express-validator';
import { dbUtils } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { 
  generateDocumentResponse, 
  generateGeneralResponse, 
  suggestQuestions,
  summarizeDocument 
} from '../services/openRouterService.js';

const router = express.Router();

// Validation middleware
const validateMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  
  body('documentId')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1;
    })
    .withMessage('Document ID must be a positive integer or null'),
  
  body('conversationId')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1;
    })
    .withMessage('Conversation ID must be a positive integer or null')
];

// Send message and get AI response
router.post('/message', validateMessage, asyncHandler(async (req, res) => {
  // Log the incoming request for debugging
  console.log('🔍 Chat message request received:', {
    body: req.body,
    userId: req.user.id
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Chat message validation errors:', errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { message, documentId, conversationId } = req.body;
  const userId = req.user.id;

  // Verify document ownership if documentId is provided
  if (documentId) {
    const document = await dbUtils.getDocumentById(documentId);
    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
    if (document.user_id !== userId) {
      throw new AppError('Access denied to document', 403, 'ACCESS_DENIED');
    }
  }

  // Get or create conversation
  let currentConversationId = conversationId;
  if (!currentConversationId) {
    currentConversationId = await dbUtils.createConversation(
      userId, 
      documentId, 
      message.substring(0, 50) + '...'
    );
  }

  // Get conversation history
  const conversationHistory = await dbUtils.getMessagesByConversationId(currentConversationId);

  // Save user message
  await dbUtils.createMessage(currentConversationId, 'user', message);

  try {
    // Generate AI response
    let aiResult;
    if (documentId) {
      aiResult = await generateDocumentResponse(message, documentId, conversationHistory);
    } else {
      aiResult = await generateGeneralResponse(message, conversationHistory);
    }

    // Save AI response
    await dbUtils.createMessage(currentConversationId, 'assistant', aiResult.response);

    // Update conversation timestamp
    await dbUtils.updateConversation(currentConversationId, null);

    res.json({
      message: aiResult.response,
      conversationId: currentConversationId,
      sources: aiResult.sources || [],
      confidence: aiResult.confidence || 0,
      documentName: aiResult.documentName || null
    });

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Save error message
    const errorMessage = "I'm sorry, I encountered an error while processing your question. Please try again.";
    await dbUtils.createMessage(currentConversationId, 'assistant', errorMessage);

    res.json({
      message: errorMessage,
      conversationId: currentConversationId,
      sources: [],
      confidence: 0,
      error: 'AI_ERROR'
    });
  }
}));

// Get conversation history
router.get('/conversations', asyncHandler(async (req, res) => {
  const conversations = await dbUtils.getConversationsByUserId(req.user.id);
  
  const formattedConversations = conversations.map(conv => ({
    id: conv.id,
    title: conv.title || 'Untitled Conversation',
    documentId: conv.document_id,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at
  }));

  res.json({
    conversations: formattedConversations,
    count: formattedConversations.length
  });
}));

// Get specific conversation messages
router.get('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id);
  
  if (isNaN(conversationId)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }

  // Verify conversation belongs to user
  const conversations = await dbUtils.getConversationsByUserId(req.user.id);
  const conversation = conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  const messages = await dbUtils.getMessagesByConversationId(conversationId);
  
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.created_at
  }));

  res.json({
    conversationId,
    messages: formattedMessages,
    count: formattedMessages.length
  });
}));

// Get suggested questions for a document
router.get('/documents/:id/suggestions', asyncHandler(async (req, res) => {
  const documentId = parseInt(req.params.id);
  
  if (isNaN(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  // Verify document ownership
  const document = await dbUtils.getDocumentById(documentId);
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }
  if (document.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const suggestions = await suggestQuestions(documentId);

  res.json({
    documentId,
    suggestions,
    count: suggestions.length
  });
}));

// Get document summary
router.get('/documents/:id/summary', asyncHandler(async (req, res) => {
  const documentId = parseInt(req.params.id);
  
  if (isNaN(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  // Verify document ownership
  const document = await dbUtils.getDocumentById(documentId);
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }
  if (document.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const summary = await summarizeDocument(documentId);

  res.json({
    documentId,
    documentName: document.original_name,
    summary
  });
}));

// Delete conversation
router.delete('/conversations/:id', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id);
  
  if (isNaN(conversationId)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }

  // Verify conversation belongs to user
  const conversations = await dbUtils.getConversationsByUserId(req.user.id);
  const conversation = conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  // Delete conversation (messages will be cascade deleted)
  await dbUtils.db.runAsync('DELETE FROM conversations WHERE id = ?', [conversationId]);

  res.json({
    message: 'Conversation deleted successfully'
  });
}));

// Update conversation title
router.patch('/conversations/:id', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id);
  const { title } = req.body;
  
  if (isNaN(conversationId)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }

  if (!title || title.trim().length === 0) {
    throw new AppError('Title is required', 400, 'TITLE_REQUIRED');
  }

  // Verify conversation belongs to user
  const conversations = await dbUtils.getConversationsByUserId(req.user.id);
  const conversation = conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  await dbUtils.updateConversation(conversationId, title.trim());

  res.json({
    message: 'Conversation title updated successfully',
    conversationId,
    title: title.trim()
  });
}));

export default router;
