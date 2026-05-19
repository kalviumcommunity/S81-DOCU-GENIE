import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from './middleware/googleAuth.js';

// Import routes
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/user.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';

// Import database initialization
import { initializeDatabase } from './config/database.js';

// Ensure Google OAuth credentials are present
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ Google OAuth credentials missing in .env file');
}

// Debug environment variables
console.log('🔍 Environment variables loaded:');
console.log('📝 PORT:', process.env.PORT);
console.log('📝 NODE_ENV:', process.env.NODE_ENV);

const requiredEnvVars = ['JWT_SECRET', 'OPENROUTER_API_KEY', 'GOOGLE_API_KEY', 'SESSION_SECRET'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Note: OpenRouter configuration will be debugged when first used

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import crypto from 'crypto';

if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is not set. Server will not start in production.');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');

const app = express();
// Express session setup (required for passport)
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Upload limit reached' });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Slow down! Too many messages' });
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://docugenie-ai.netlify.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/files/upload', uploadLimiter);
app.use('/api/files', authenticateToken, fileRoutes);
app.use('/api/chat', authenticateToken, chatLimiter, chatRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use(generalLimiter); // fallback

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});


app.use(errorHandler);

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
