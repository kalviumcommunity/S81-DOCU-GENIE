import jwt from 'jsonwebtoken';
import { dbUtils } from '../config/database.js';

// Middleware to authenticate JWT tokens
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await dbUtils.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token - user not found',
        code: 'INVALID_TOKEN'
      });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error during authentication',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// Middleware to optionally authenticate token (for public endpoints that can benefit from auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await dbUtils.getUserById(decoded.userId);
    
    req.user = user ? {
      id: user.id,
      username: user.username,
      email: user.email
    } : null;

    next();
  } catch (error) {
    // For optional auth, we don't return errors, just set user to null
    req.user = null;
    next();
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};
