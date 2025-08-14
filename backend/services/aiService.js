import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchSimilarChunks } from './vectorService.js';
import { dbUtils } from '../config/database.js';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Get the Gemini model
const getModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-pro',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  });
};

// Generate AI response based on document context
export const generateDocumentResponse = async (query, documentId, conversationHistory = []) => {
  try {
    // Search for relevant chunks in the document
    const relevantChunks = await searchSimilarChunks(query, documentId, 5);
    
    if (relevantChunks.length === 0) {
      return {
        response: "I couldn't find relevant information in the document to answer your question. Could you try rephrasing your question or asking about a different topic from the document?",
        sources: [],
        confidence: 0
      };
    }

    // Get document info
    const document = await dbUtils.getDocumentById(documentId);
    const documentName = document ? document.original_name : 'the document';

    // Prepare context from relevant chunks
    const context = relevantChunks.map((chunk, index) => 
      `[Context ${index + 1}]: ${chunk.text}`
    ).join('\n\n');

    // Prepare conversation history for context
    const historyContext = conversationHistory.length > 0 
      ? conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    // Create comprehensive prompt
    const prompt = `You are Docu Genie, an intelligent assistant that helps users understand their documents. You have access to content from "${documentName}" and should provide helpful, accurate answers based on the document content.

Context from the document:
${context}

${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}

Current question: ${query}

Instructions:
1. Answer the question based primarily on the provided document context
2. Be conversational and educational in your tone
3. If the context doesn't fully answer the question, acknowledge this and provide what information you can
4. Use examples from the document when helpful
5. If asked to explain concepts, break them down clearly
6. Keep responses focused and concise (under 500 words)
7. Don't make up information that's not in the provided context

Answer:`;

    // Generate response using Gemini
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Calculate confidence based on relevance scores
    const avgConfidence = relevantChunks.length > 0 
      ? relevantChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / relevantChunks.length
      : 0;

    return {
      response: text,
      sources: relevantChunks.map(chunk => ({
        text: chunk.text.substring(0, 200) + '...',
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity
      })),
      confidence: Math.round(avgConfidence * 100),
      documentName
    };

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Return fallback response
    return {
      response: "I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.",
      sources: [],
      confidence: 0,
      error: error.message
    };
  }
};

// Generate a general response (without specific document context)
export const generateGeneralResponse = async (query, conversationHistory = []) => {
  try {
    // Search across all documents for relevant context
    const relevantChunks = await searchSimilarChunks(query, null, 3);

    const historyContext = conversationHistory.length > 0 
      ? conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    let prompt = `You are Docu Genie, a helpful document assistant. `;

    if (relevantChunks.length > 0) {
      const context = relevantChunks.map((chunk, index) => 
        `[Context ${index + 1}]: ${chunk.text}`
      ).join('\n\n');

      prompt += `I found some relevant information from your uploaded documents:

${context}

${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}

Question: ${query}

Please provide a helpful response based on the available context and your knowledge.`;
    } else {
      prompt += `${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}

Question: ${query}

Please provide a helpful educational response. If this is about study materials, suggest that the user upload their documents for more specific help.`;
    }

    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      response: text,
      sources: relevantChunks.map(chunk => ({
        text: chunk.text.substring(0, 200) + '...',
        documentId: chunk.documentId,
        similarity: chunk.similarity
      })),
      confidence: relevantChunks.length > 0 ? 75 : 50
    };

  } catch (error) {
    console.error('Error generating general response:', error);
    
    return {
      response: "I'm sorry, I encountered an error while processing your question. Please try again.",
      sources: [],
      confidence: 0,
      error: error.message
    };
  }
};

// Suggest questions based on document content
export const suggestQuestions = async (documentId) => {
  try {
    const document = await dbUtils.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Get some chunks from the document
    const chunks = await dbUtils.getDocumentChunks(documentId);
    if (chunks.length === 0) {
      return [];
    }

    // Use first few chunks to generate questions
    const sampleContent = chunks.slice(0, 3).map(chunk => chunk.chunk_text).join('\n\n');

    const prompt = `Based on this content from "${document.original_name}", suggest 3-5 good study questions that would help a student understand the key concepts:

Content:
${sampleContent}

Generate questions that are:
1. Specific to the content
2. Educational and thought-provoking
3. Suitable for studying/review
4. Varied in difficulty

Format as a simple list of questions:`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse questions from response
    const questions = text
      .split('\n')
      .filter(line => line.trim() && (line.includes('?') || line.match(/^\d+\./)))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 10)
      .slice(0, 5);

    return questions;

  } catch (error) {
    console.error('Error suggesting questions:', error);
    return [
      "What are the main concepts covered in this document?",
      "Can you explain the key points in simple terms?",
      "What are some practical applications of this material?"
    ];
  }
};

// Summarize document content
export const summarizeDocument = async (documentId) => {
  try {
    const document = await dbUtils.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const chunks = await dbUtils.getDocumentChunks(documentId);
    if (chunks.length === 0) {
      return "This document hasn't been processed yet or contains no readable content.";
    }

    // Use representative chunks for summary
    const contentSample = chunks
      .slice(0, Math.min(5, chunks.length))
      .map(chunk => chunk.chunk_text)
      .join('\n\n');

    const prompt = `Please provide a concise summary of this document "${document.original_name}":

Content:
${contentSample}

Summary requirements:
1. Capture the main topics and key points
2. Keep it under 200 words
3. Make it helpful for studying
4. Use clear, educational language

Summary:`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    return response.text();

  } catch (error) {
    console.error('Error summarizing document:', error);
    return "I'm sorry, I couldn't generate a summary for this document at the moment.";
  }
};
