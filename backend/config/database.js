import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database connection
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Create proper async wrapper functions for SQLite3
db.runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

db.getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

db.allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    // Enable foreign keys
    await db.runAsync('PRAGMA foreign_keys = ON');
    
    // Users table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Document chunks table (for vector storage)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        embedding_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
      )
    `);

    // Conversations table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        document_id INTEGER,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
      )
    `);

    // Messages table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks (document_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id)');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id)');

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Database utility functions
export const dbUtils = {
  db, // Export db instance for direct access
  // User operations
  async createUser(username, email, passwordHash) {
    const result = await db.runAsync(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    return result.lastID;
  },

  async getUserByEmail(email) {
    return await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
  },

  async getUserById(id) {
    return await db.getAsync('SELECT * FROM users WHERE id = ?', [id]);
  },

  // Document operations
  async createDocument(userId, filename, originalName, filePath, fileSize, mimeType) {
    const result = await db.runAsync(
      'INSERT INTO documents (user_id, filename, original_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, filename, originalName, filePath, fileSize, mimeType]
    );
    return result.lastID;
  },

  async getDocumentsByUserId(userId) {
    return await db.allAsync('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  },

  async getDocumentById(id) {
    return await db.getAsync('SELECT * FROM documents WHERE id = ?', [id]);
  },

  async updateDocumentProcessed(id, processed = true) {
    await db.runAsync('UPDATE documents SET processed = ? WHERE id = ?', [processed, id]);
  },

  async deleteDocument(id) {
    await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
  },

  // Document chunks operations
  async createDocumentChunk(documentId, chunkText, chunkIndex, embeddingId = null) {
    const result = await db.runAsync(
      'INSERT INTO document_chunks (document_id, chunk_text, chunk_index, embedding_id) VALUES (?, ?, ?, ?)',
      [documentId, chunkText, chunkIndex, embeddingId]
    );
    return result.lastID;
  },

  async getDocumentChunks(documentId) {
    return await db.allAsync('SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index', [documentId]);
  },

  // Conversation operations
  async createConversation(userId, documentId = null, title = null) {
    const result = await db.runAsync(
      'INSERT INTO conversations (user_id, document_id, title) VALUES (?, ?, ?)',
      [userId, documentId, title]
    );
    return result.lastID;
  },

  async getConversationsByUserId(userId) {
    return await db.allAsync('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
  },

  async updateConversation(id, title) {
    await db.runAsync(
      'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, id]
    );
  },

  // Message operations
  async createMessage(conversationId, role, content) {
    const result = await db.runAsync(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [conversationId, role, content]
    );
    return result.lastID;
  },

  async getMessagesByConversationId(conversationId) {
    return await db.allAsync(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
  }
};

export default db;
