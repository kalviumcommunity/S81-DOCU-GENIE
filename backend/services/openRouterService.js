import axios from 'axios';
import { searchSimilarChunks } from './vectorService.js';
import { dbUtils } from '../config/database.js';

// OpenRouter configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// Use the specific GPT-OSS-20B model
const MODEL_ID = 'openai/gpt-oss-20b:free';

// Get the specific model
const getModel = () => {
  return MODEL_ID;
};

// Get API key dynamically (to handle timing issues)
const getApiKey = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY is missing from environment variables');
    throw new Error('OpenRouter API key not configured');
  }
  return apiKey;
};

// Initialize OpenRouter client dynamically
const createOpenRouterClient = () => {
  const apiKey = getApiKey();
  return axios.create({
    baseURL: OPENROUTER_API_URL,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'Docu Genie'
    }
  });
};

// Debug OpenRouter configuration
const debugConfig = () => {
  console.log('🔍 OpenRouter Configuration:');
  console.log('📝 API URL:', OPENROUTER_API_URL);
  console.log('📝 API Key:', process.env.OPENROUTER_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('📝 Model ID:', MODEL_ID);
};

// Generate AI response using OpenRouter
export const generateDocumentResponse = async (query, documentId, conversationHistory = []) => {
  try {
    // Debug configuration on first use
    debugConfig();
    
    // Search for relevant chunks in the document
    let relevantChunks = [];
    try {
      // Use fewer chunks to reduce verbatim copying and improve focus
      relevantChunks = await searchSimilarChunks(query, documentId, 3);
    } catch (error) {
      console.log('Error searching document chunks, proceeding without context');
      relevantChunks = [];
    }
    
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
    const prompt = `You are Docu Genie, an intelligent assistant that helps users understand their documents. Maintain a professional, concise, and friendly tutoring tone. You have access to content from "${documentName}" and should provide helpful, accurate answers based on the document content.

Context from the document:
${context}

${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}

Current question: ${query}

Instructions:
1. Synthesize the answer in your own words based on the context. Do not copy long passages. Quote only short phrases when necessary and keep quotes under ~20 words.
2. Format your response using plain text (no Markdown needed) with clear sections and bullets:
   - Title: a short, professional heading
   - Answer: 1–2 sentences
   - Key points: 3–5 concise bullets (prefix with "- ")
   - Optional example: 1 short example if helpful (paraphrased)
   - Next steps: 1 follow-up suggestion if context is incomplete
3. Keep the response concise (under 200–250 words) and conversational yet professional.
4. If the context is insufficient, state what’s missing and ask a targeted follow-up question.
5. Do not repeat the context verbatim and do not invent facts not grounded in the context.

Answer:`;

    // Generate response using OpenRouter
    const model = getModel();
    console.log(`🤖 Calling OpenRouter API with model: ${model}`);
    
    const openRouterClient = createOpenRouterClient();
    const response = await openRouterClient.post('/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Docu Genie, a helpful document assistant. Use a professional tutoring tone. Synthesize in your own words. Start with a brief answer, then provide clean bullet points. Avoid copying long passages.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.5,
      top_p: 0.9
    });

    console.log('✅ OpenRouter API response received');
    const aiResponse = response.data.choices[0].message.content;

    // Calculate confidence based on relevance scores
    const avgConfidence = relevantChunks.length > 0 
      ? relevantChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / relevantChunks.length
      : 0;

    return {
      response: aiResponse,
      sources: relevantChunks.map(chunk => ({
        text: chunk.text.substring(0, 200) + '...',
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity
      })),
      confidence: Math.round(avgConfidence * 100),
      documentName,
      model: model
    };

  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
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
    let relevantChunks = [];
    try {
      relevantChunks = await searchSimilarChunks(query, null, 3);
    } catch (error) {
      console.log('No documents available for context search, proceeding without context');
      relevantChunks = [];
    }

    const historyContext = conversationHistory.length > 0 
      ? conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    let prompt = `You are Docu Genie, a helpful document assistant. Maintain a professional, concise, and friendly tutoring tone. `;

    if (relevantChunks.length > 0) {
      const context = relevantChunks.map((chunk, index) => 
        `[Context ${index + 1}]: ${chunk.text}`
      ).join('\n\n');

      prompt += `I found some relevant information from your uploaded documents:

${context}

${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}

Question: ${query}

Please provide a helpful response based on the available context and your knowledge.

Instructions:
1. Synthesize in your own words; do not copy long passages from the context.
2. Use plain-text sections and bullets:
   - Title
   - Answer (1–2 sentences)
   - Key points (3–5 bullets with "- ")
   - Optional example (paraphrased)
   - Next steps (if needed)
3. Keep it concise (under 200–250 words).`;
    } else {
      prompt += `${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}

Question: ${query}

Please provide a helpful educational response in a conversational, professional tone. If this is about study materials, suggest that the user upload their documents for more specific help. Format with Title, Answer, Key points (bullets), and Next steps when suitable.`;
    }

    const model = getModel();
    console.log(`🤖 Calling OpenRouter API with model: ${model}`);
    
    const openRouterClient = createOpenRouterClient();
    const response = await openRouterClient.post('/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Docu Genie, a helpful document assistant. Write in a conversational tutoring tone, synthesize in your own words, and avoid copying long passages.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.5,
      top_p: 0.9
    });

    console.log('✅ OpenRouter API response received');
    const aiResponse = response.data.choices[0].message.content;

    return {
      response: aiResponse,
      sources: relevantChunks.map(chunk => ({
        text: chunk.text.substring(0, 200) + '...',
        documentId: chunk.documentId,
        similarity: chunk.similarity
      })),
      confidence: relevantChunks.length > 0 ? 75 : 50,
      model: model
    };

  } catch (error) {
    console.error('❌ Error generating general response:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return {
      response: "I'm sorry, I encountered an error while processing your question. Please try again.",
      sources: error.message,
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
    const openRouterClient = createOpenRouterClient();
    const response = await openRouterClient.post('/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Docu Genie. Generate helpful questions based on the given content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.9
    });

    const text = response.data.choices[0].message.content;

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
    const openRouterClient = createOpenRouterClient();
    const response = await openRouterClient.post('/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Docu Genie. Provide concise, helpful summaries of documents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.95
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Error summarizing document:', error);
    return "I'm sorry, I couldn't generate a summary for this document at the moment.";
  }
};
