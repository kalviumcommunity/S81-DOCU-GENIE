import fs from 'fs/promises';
import mammoth from 'mammoth';
// Import internal pdf-parse implementation directly to avoid debug harness in index.js under ESM
import pdf from 'pdf-parse/lib/pdf-parse.js';
import Tesseract from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import path from 'path';
import { dbUtils } from '../config/database.js';
import { createEmbeddings, storeInVectorDB } from './vectorService.js';

// Main document processing function
export const processDocument = async (documentId, filePath, mimeType) => {
  try {
    console.log(`🔄 Processing document ${documentId} (${mimeType})`);

    // Extract text based on file type
    let extractedText = '';
    let documentInfo = {};
    
    if (mimeType === 'application/pdf') {
      extractedText = await extractPDFText(filePath);
      documentInfo = { type: 'PDF', processing: 'Text extraction completed' };
    } else if (mimeType === 'application/msword' || 
               mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await extractWordText(filePath);
      documentInfo = { type: 'Word Document', processing: 'Text extraction completed' };
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!extractedText.trim()) {
      throw new Error('No text content found in document');
    }

    console.log(`📄 Extracted ${extractedText.length} characters from ${documentInfo.type}`);

    // Split text into chunks
    const chunks = splitTextIntoChunks(extractedText);
    console.log(`📄 Document split into ${chunks.length} chunks`);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Create embedding for the chunk
        const embedding = await createEmbeddings(chunk);
        
        // Store in vector database
        const embeddingId = await storeInVectorDB(documentId, chunk, embedding, i);
        
        // Store chunk in database
        await dbUtils.createDocumentChunk(documentId, chunk, i, embeddingId);
        
        console.log(`✅ Chunk ${i + 1}/${chunks.length} processed successfully`);
      } catch (chunkError) {
        console.error(`❌ Error processing chunk ${i + 1}:`, chunkError);
        // Continue with other chunks
      }
    }

    // Mark document as processed
    await dbUtils.updateDocumentProcessed(documentId, true);

    console.log(`✅ Document ${documentId} processed successfully`);
    return { 
      success: true, 
      chunksCreated: chunks.length,
      documentInfo,
      textLength: extractedText.length
    };

  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    
    // Mark document as failed
    await dbUtils.updateDocumentProcessed(documentId, false);
    
    throw error;
  }
};

// Extract text from PDF files with OCR fallback for image-based content
const extractPDFText = async (filePath) => {
  try {
    console.log(`🔄 Extracting text from PDF: ${filePath}`);
    
    // Read the PDF file
    const dataBuffer = await fs.readFile(filePath);
    
    // Extract text using pdf-parse
    const data = await pdf(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      console.log('📷 PDF contains no extractable text - attempting OCR for image-based content...');
      const ocrText = await extractTextWithOCR(filePath);
      if (ocrText && ocrText.trim().length > 100) { // Only use OCR if we get substantial text
        return ocrText;
      } else {
        throw new Error('OCR failed to extract sufficient text from images');
      }
    }
    
    console.log(`✅ PDF text extracted successfully - ${data.text.length} characters`);
    return data.text;
    
  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    
    if (error.message.includes('Invalid PDF')) {
      throw new Error('The uploaded file is not a valid PDF document. Please ensure it\'s a properly formatted PDF file.');
    } else if (error.message.includes('Password')) {
      throw new Error('This PDF is password-protected. Please remove the password protection and try again.');
    } else if (error.code === 'ENOENT') {
      throw new Error('PDF file not found or not accessible.');
    } else if (error.message.includes('OCR failed to extract sufficient text')) {
      // Try OCR as last resort
      console.log('🔄 Attempting OCR as final fallback...');
      try {
        const ocrText = await extractTextWithOCR(filePath);
        if (ocrText && ocrText.trim().length > 50) {
          return ocrText;
        } else {
          throw new Error('OCR processing failed to extract usable text');
        }
      } catch (ocrError) {
        throw new Error(`Both text extraction and OCR failed: ${error.message}. OCR error: ${ocrError.message}`);
      }
    } else {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
};

// Extract text from image-based PDFs using OCR
const extractTextWithOCR = async (filePath) => {
  try {
    console.log('🔄 Starting OCR processing for image-based PDF...');
    
    // Convert PDF pages to images with optimized settings for speed
    const options = {
      density: 150,           // Reduced DPI for faster processing (was 300)
      saveFilename: "page",
      savePath: path.dirname(filePath),
      format: "png",
      width: 1240,            // Reduced width for faster processing
      height: 1754            // Reduced height for faster processing
    };
    
    const convert = fromPath(filePath, options);
    const pageCount = await convert.bulk(-1); // Convert all pages
    
    console.log(`📄 Converting ${pageCount.length} PDF pages to images for OCR...`);
    
    let extractedText = '';
    const maxPages = Math.min(pageCount.length, 10); // Limit to first 10 pages for speed
    
    // Process each page with OCR (limited for speed)
    for (let i = 0; i < maxPages; i++) {
      const page = pageCount[i];
      console.log(`🔄 Processing page ${i + 1}/${maxPages} with OCR...`);
      
      try {
        // Extract text from the image using Tesseract with timeout
        const { data: { text } } = await Promise.race([
          Tesseract.recognize(
            page.path,
            'eng', // English language
            {
              logger: m => {
                if (m.status === 'recognizing text') {
                  console.log(`📝 OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
              }
            }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR timeout')), 30000) // 30 second timeout
          )
        ]);
        
        if (text && text.trim()) {
          const cleanText = text.trim().replace(/\s+/g, ' '); // Clean up whitespace
          if (cleanText.length > 10) { // Only add if we got meaningful text
            extractedText += `\n\n--- Page ${i + 1} ---\n${cleanText}`;
            console.log(`✅ Page ${i + 1} OCR completed - ${cleanText.length} characters`);
          } else {
            console.log(`⚠️ Page ${i + 1} OCR returned minimal text: "${cleanText}"`);
          }
        } else {
          console.log(`⚠️ Page ${i + 1} OCR returned no text`);
        }
        
        // Clean up the temporary image file
        await fs.unlink(page.path);
        
      } catch (pageError) {
        console.error(`❌ OCR failed for page ${i + 1}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Clean up remaining temporary files
    for (let i = maxPages; i < pageCount.length; i++) {
      try {
        await fs.unlink(pageCount[i].path);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup page ${i + 1}:`, cleanupError);
      }
    }
    
    if (!extractedText.trim()) {
      throw new Error('OCR processing failed to extract any text from the PDF');
    }
    
    console.log(`✅ OCR text extraction completed - Total: ${extractedText.length} characters`);
    console.log(`📝 Sample OCR text: "${extractedText.substring(0, 200)}..."`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    throw new Error(`OCR text extraction failed: ${error.message}`);
  }
};

// Extract text from Word documents
const extractWordText = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error('Word document extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  }
};

// Split text into manageable chunks with improved handling for OCR text
const splitTextIntoChunks = (text, maxChunkSize = 1000, overlapSize = 200) => {
  const chunks = [];
  
  // Clean up OCR text by removing excessive whitespace and normalizing
  const cleanedText = text
    .replace(/\s+/g, ' ')           // Replace multiple whitespace with single space
    .replace(/\n+/g, '\n')          // Replace multiple newlines with single newline
    .replace(/--- Page \d+ ---/g, '') // Remove page markers
    .trim();
  
  const sentences = cleanedText.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // If adding this sentence would exceed the max chunk size
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlapSize / 10)); // Approximate word overlap
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If no chunks were created, split by character limit
  if (chunks.length === 0 && cleanedText.length > 0) {
    return splitByCharacterLimit(cleanedText, maxChunkSize, overlapSize);
  }
  
  return chunks;
};

// Fallback method to split by character limit
const splitByCharacterLimit = (text, maxChunkSize = 1000, overlapSize = 200) => {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    // If not the last chunk, try to break at word boundary
    if (end < text.length) {
      const lastSpaceIndex = text.lastIndexOf(' ', end);
      if (lastSpaceIndex > start) {
        end = lastSpaceIndex;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlapSize; // Create overlap
  }
  
  return chunks.filter(chunk => chunk.length > 0);
};

// Clean and preprocess text
export const preprocessText = (text) => {
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
};

// Get document processing status
export const getProcessingStatus = async (documentId) => {
  try {
    const document = await dbUtils.getDocumentById(documentId);
    const chunks = await dbUtils.getDocumentChunks(documentId);
    
    return {
      documentId,
      processed: Boolean(document?.processed),
      chunksCount: chunks.length,
      lastUpdated: document?.updated_at
    };
  } catch (error) {
    console.error('Error getting processing status:', error);
    throw error;
  }
};
