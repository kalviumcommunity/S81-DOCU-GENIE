import express from 'express';
import passport from '../middleware/googleAuth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { dbUtils } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const oauthCodes = new Map(); // In-memory store (or Redis in prod)

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  (req, res) => {
    const code = crypto.randomBytes(32).toString('hex');
    oauthCodes.set(code, { userId: req.user.id, expiresAt: Date.now() + 60000 }); // 60s TTL
    
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://docugenie-ai.netlify.app'
      : 'http://localhost:5173'; // Make sure your local frontend is on 5173 or 5174
      
    res.redirect(`${frontendUrl}/chat?code=${code}`);
  }
);

// Add new endpoint: GET /api/auth/exchange
router.get('/exchange', asyncHandler(async (req, res) => {
  const { code } = req.query;
  const entry = oauthCodes.get(code);
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }
  oauthCodes.delete(code);
  const token = generateToken(entry.userId);
  const user = await dbUtils.getUserById(entry.userId);
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
}));

// Validation middleware
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  // Log the incoming request for debugging
  console.log('🔍 Registration request received for email:', req.body.email);
  
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await dbUtils.getUserByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = await dbUtils.createUser(username, email, passwordHash);

  // Generate token
  const token = generateToken(userId);

  // Return success response
  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: userId,
      username,
      email
    },
    token
  });
}));

// Login user
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  // Log the incoming request for debugging
  console.log('🔍 Login request received for email:', req.body.email);
  
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await dbUtils.getUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate token
  const token = generateToken(user.id);

  // Return success response
  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    token
  });
}));

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logout successful. Please remove the token from client storage.'
  });
});

// Verify token endpoint
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No token provided',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    const user = await dbUtils.getUserById(decoded.userId);

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}));

export default router;
