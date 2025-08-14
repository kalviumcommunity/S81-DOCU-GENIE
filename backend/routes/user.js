import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { dbUtils } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user profile
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await dbUtils.getUserById(req.user.id);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Get user statistics
  const documents = await dbUtils.getDocumentsByUserId(req.user.id);
  const conversations = await dbUtils.getConversationsByUserId(req.user.id);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    },
    statistics: {
      documentsCount: documents.length,
      conversationsCount: conversations.length,
      totalFileSize: documents.reduce((sum, doc) => sum + doc.file_size, 0)
    }
  });
}));

// Update user profile
router.patch('/profile', [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { username, email } = req.body;
  const userId = req.user.id;

  // Check if new email is already taken by another user
  if (email) {
    const existingUser = await dbUtils.getUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Email is already taken', 409, 'EMAIL_TAKEN');
    }
  }

  // Update user information
  const updateFields = [];
  const updateValues = [];

  if (username) {
    updateFields.push('username = ?');
    updateValues.push(username);
  }

  if (email) {
    updateFields.push('email = ?');
    updateValues.push(email);
  }

  if (updateFields.length > 0) {
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    await dbUtils.db.runAsync(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
  }

  // Get updated user data
  const updatedUser = await dbUtils.getUserById(userId);

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      updatedAt: updatedUser.updated_at
    }
  });
}));

// Change password
router.patch('/password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get user with password hash
  const user = await dbUtils.getUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await dbUtils.db.runAsync(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, userId]
  );

  res.json({
    message: 'Password updated successfully'
  });
}));

// Get user dashboard data
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user documents
  const documents = await dbUtils.getDocumentsByUserId(userId);
  
  // Get recent conversations
  const conversations = await dbUtils.getConversationsByUserId(userId);
  const recentConversations = conversations.slice(0, 5);

  // Calculate statistics
  const totalFileSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
  const processedDocuments = documents.filter(doc => doc.processed).length;
  const recentDocuments = documents.slice(0, 5);

  res.json({
    statistics: {
      totalDocuments: documents.length,
      processedDocuments,
      totalConversations: conversations.length,
      totalFileSize,
      processingRate: documents.length > 0 ? Math.round((processedDocuments / documents.length) * 100) : 0
    },
    recentDocuments: recentDocuments.map(doc => ({
      id: doc.id,
      name: doc.original_name,
      size: doc.file_size,
      processed: Boolean(doc.processed),
      uploadedAt: doc.created_at
    })),
    recentConversations: recentConversations.map(conv => ({
      id: conv.id,
      title: conv.title || 'Untitled Conversation',
      documentId: conv.document_id,
      updatedAt: conv.updated_at
    }))
  });
}));

// Delete user account
router.delete('/account', [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { password } = req.body;
  const userId = req.user.id;

  // Get user with password hash
  const user = await dbUtils.getUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Password is incorrect', 400, 'INVALID_PASSWORD');
  }

  // Delete user (will cascade delete all related data)
  await dbUtils.db.runAsync('DELETE FROM users WHERE id = ?', [userId]);

  res.json({
    message: 'Account deleted successfully'
  });
}));

export default router;
