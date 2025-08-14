import { ChromaClient } from 'chromadb';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Initialize ChromaDB client
let chromaClient;
let collection;

const initializeChromaDB = async () => {
  try {
    chromaClient = new ChromaClient();
    
    // Create or get collection for document embeddings
    collection = await chromaClient.getOrCreateCollection({
      name: 'document_embeddings',
      metadata: { description: 'Document chunks with embeddings for Q&A' }
    });
    
    console.log('✅ ChromaDB initialized successfully');
    return collection;
  } catch (error) {
    console.warn('⚠️ ChromaDB not available - using fallback storage:', error.message);
    // Don't throw error, just log warning and continue without ChromaDB
    return null;
  }
};

// Ensure ChromaDB is initialized
const getCollection = async () => {
  if (!collection) {
    await initializeChromaDB();
  }
  return collection;
};

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

// Store embedding in ChromaDB
export const storeInVectorDB = async (documentId, text, embedding, chunkIndex) => {
  try {
    const coll = await getCollection();
    
    if (!coll) {
      console.warn('ChromaDB not available, skipping vector storage');
      return `fallback_doc_${documentId}_chunk_${chunkIndex}`;
    }
    
    const embeddingId = `doc_${documentId}_chunk_${chunkIndex}`;
    
    await coll.add({
      ids: [embeddingId],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        document_id: documentId,
        chunk_index: chunkIndex,
        timestamp: new Date().toISOString()
      }]
    });
    
    return embeddingId;
  } catch (error) {
    console.warn('Error storing in vector DB, using fallback:', error.message);
    return `fallback_doc_${documentId}_chunk_${chunkIndex}`;
  }
};

// Search for similar text chunks
export const searchSimilarChunks = async (query, documentId = null, topK = 5) => {
  try {
    const coll = await getCollection();
    
    if (!coll) {
      console.warn('ChromaDB not available, using fallback search');
      // Fallback: return chunks from database without similarity search
      const { dbUtils } = await import('../config/database.js');
      const chunks = documentId 
        ? await dbUtils.getDocumentChunks(documentId)
        : [];
      
      return chunks.slice(0, topK).map((chunk, index) => ({
        text: chunk.chunk_text,
        metadata: { document_id: documentId, chunk_index: chunk.chunk_index },
        similarity: 0.8 - (index * 0.1), // Mock similarity scores
        documentId: documentId,
        chunkIndex: chunk.chunk_index
      }));
    }
    
    // Create embedding for the query
    const queryEmbedding = await createEmbeddings(query);
    
    // Prepare where clause for filtering by document if specified
    const whereClause = documentId ? { document_id: documentId } : undefined;
    
    // Search for similar chunks
    const results = await coll.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where: whereClause,
      include: ['documents', 'metadatas', 'distances']
    });
    
    // Format results
    const formattedResults = [];
    if (results.documents && results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        formattedResults.push({
          text: results.documents[0][i],
          metadata: results.metadatas[0][i],
          similarity: 1 - (results.distances[0][i] || 0), // Convert distance to similarity
          documentId: results.metadatas[0][i].document_id,
          chunkIndex: results.metadatas[0][i].chunk_index
        });
      }
    }
    
    return formattedResults;
  } catch (error) {
    console.warn('Error searching similar chunks, using fallback:', error.message);
    // Fallback to database search
    const { dbUtils } = await import('../config/database.js');
    const chunks = documentId 
      ? await dbUtils.getDocumentChunks(documentId)
      : [];
    
    return chunks.slice(0, topK).map((chunk, index) => ({
      text: chunk.chunk_text,
      metadata: { document_id: documentId, chunk_index: chunk.chunk_index },
      similarity: 0.7 - (index * 0.1),
      documentId: documentId,
      chunkIndex: chunk.chunk_index
    }));
  }
};

// Get all chunks for a specific document
export const getDocumentChunks = async (documentId) => {
  try {
    const coll = await getCollection();
    
    const results = await coll.get({
      where: { document_id: documentId },
      include: ['documents', 'metadatas']
    });
    
    const chunks = [];
    if (results.documents) {
      for (let i = 0; i < results.documents.length; i++) {
        chunks.push({
          text: results.documents[i],
          metadata: results.metadatas[i],
          chunkIndex: results.metadatas[i].chunk_index
        });
      }
    }
    
    // Sort by chunk index
    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (error) {
    console.error('Error getting document chunks:', error);
    throw error;
  }
};

// Delete document embeddings from vector DB
export const deleteDocumentEmbeddings = async (documentId) => {
  try {
    const coll = await getCollection();
    
    // Get all embeddings for this document
    const results = await coll.get({
      where: { document_id: documentId },
      include: ['ids']
    });
    
    if (results.ids && results.ids.length > 0) {
      await coll.delete({
        ids: results.ids
      });
      console.log(`✅ Deleted ${results.ids.length} embeddings for document ${documentId}`);
    }
  } catch (error) {
    console.error('Error deleting document embeddings:', error);
    throw error;
  }
};

// Health check for vector service
export const vectorServiceHealthCheck = async () => {
  try {
    const coll = await getCollection();
    const count = await coll.count();
    
    return {
      status: 'healthy',
      totalEmbeddings: count,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Initialize the service when module is imported
initializeChromaDB().catch(console.error);
