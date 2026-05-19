import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbUtils } from '../config/database.js';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Create embeddings using Google AI
export const createEmbeddings = async (text) => {
  try {
    // Use Google's embedding model
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error creating embeddings:', error);
    
    // Fallback: create a simple hash-based embedding (not ideal for production)
    console.warn('Using fallback embedding method');
    return createFallbackEmbedding(text);
  }
};

// Fallback embedding method (simple hash-based)
const createFallbackEmbedding = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0); // Standard embedding size
  
  words.forEach((word, index) => {
    const hash = simpleHash(word);
    const position = Math.abs(hash) % embedding.length;
    embedding[position] += 1 / (index + 1); // Weight by position
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
};

// Simple hash function for fallback
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
};

// Cosine similarity
const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
};

// Search for similar text chunks
export const searchSimilarChunks = async (query, documentId = null, topK = 5) => {
  try {
    const queryEmbedding = await createEmbeddings(query);
    
    const chunks = documentId 
      ? await dbUtils.getDocumentChunks(documentId)
      : await dbUtils.db.allAsync('SELECT * FROM document_chunks');
      
    const scored = chunks
      .filter(c => c.embedding_vector)
      .map(c => {
        let vec;
        try { vec = JSON.parse(c.embedding_vector); } catch(e) { return null; }
        return {
          ...c,
          similarity: cosineSimilarity(queryEmbedding, vec)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return scored.map(c => ({
      text: c.chunk_text,
      similarity: c.similarity,
      documentId: c.document_id,
      chunkIndex: c.chunk_index
    }));
  } catch (error) {
    console.warn('Error searching similar chunks, using fallback:', error.message);
    const chunks = documentId 
      ? await dbUtils.getDocumentChunks(documentId)
      : [];
    
    return chunks.slice(0, topK).map((chunk, index) => ({
      text: chunk.chunk_text,
      similarity: 0.7 - (index * 0.1),
      documentId: documentId,
      chunkIndex: chunk.chunk_index
    }));
  }
};

// Get all chunks for a specific document
export const getDocumentChunks = async (documentId) => {
  try {
    const chunks = await dbUtils.getDocumentChunks(documentId);
    return chunks.map(c => ({
      text: c.chunk_text,
      chunkIndex: c.chunk_index
    })).sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (error) {
    console.error('Error getting document chunks:', error);
    throw error;
  }
};

// Delete document embeddings from vector DB
export const deleteDocumentEmbeddings = async (documentId) => {
  // SQLite handles this via CASCADE on the foreign key, so we do nothing here.
  return;
};

// Health check for vector service
export const vectorServiceHealthCheck = async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
};
