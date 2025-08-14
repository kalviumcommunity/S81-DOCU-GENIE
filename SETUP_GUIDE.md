# Docu Genie - Document Q&A Setup Guide

## 🚀 Overview
Docu Genie is a powerful document Q&A system that allows users to upload PDF and Word documents, process them using AI, and ask questions about the content. The system uses OpenRouter's free LLM models for intelligent responses.

## ✨ Features
- **Document Upload**: Support for PDF and Word documents (.pdf, .doc, .docx)
- **AI-Powered Q&A**: Ask questions about your documents using free LLM models
- **Vector Search**: Intelligent document chunking and semantic search
- **Real-time Chat**: Interactive conversation interface
- **User Authentication**: Secure user accounts and document management
- **Responsive UI**: Modern, mobile-friendly interface

## 🛠️ Prerequisites
- Node.js 18+ and npm
- Git
- OpenRouter API key (free)

## 📋 Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd S81-DOCU-GENIE

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for a free account
3. Go to your dashboard and copy your API key
4. The free tier includes access to multiple LLM models

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
# Create .env file
touch .env  # On Windows: echo. > .env
```

Add the following content to `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=./database.sqlite

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=7d

# OpenRouter Configuration (Free LLM Models)
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Replace `your_actual_openrouter_api_key_here` with your real OpenRouter API key.

### 4. Initialize the Database

```bash
cd backend
npm run setup
```

This will create the SQLite database with all necessary tables.

### 5. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

### 6. Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🔧 How It Works

### Document Processing Pipeline
1. **Upload**: User uploads PDF/Word document
2. **Text Extraction**: 
   - PDF: Uses `pdf-parse` library
   - Word: Uses `mammoth` library
3. **Chunking**: Document is split into manageable chunks (1000 chars with 200 char overlap)
4. **Vectorization**: Each chunk is converted to embeddings using ChromaDB
5. **Storage**: Chunks and embeddings stored in SQLite + ChromaDB

### AI Response Generation
1. **Query Processing**: User asks a question
2. **Semantic Search**: System finds most relevant document chunks
3. **Context Building**: Relevant chunks are combined with conversation history
4. **LLM Generation**: OpenRouter generates response using free models
5. **Response Delivery**: AI response with source citations

### Free LLM Models Available
- **Mistral 7B Instruct**: Fast, efficient responses
- **Llama 2 7B Chat**: Meta's open-source model
- **Phi-2**: Microsoft's lightweight model
- **Nous Hermes 2**: High-quality instruction following

## 📁 Project Structure

```
S81-DOCU-GENIE/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Authentication & error handling
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   │   ├── aiService.js        # Google AI (legacy)
│   │   ├── openRouterService.js # OpenRouter integration
│   │   ├── documentProcessor.js # Document processing
│   │   └── vectorService.js    # Vector operations
│   ├── uploads/         # Document storage
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API integration
│   │   └── App.jsx      # Main app component
│   └── package.json
└── README.md
```

## 🧪 Testing the System

### 1. Create an Account
- Visit `http://localhost:5173`
- Click "Sign Up" and create an account

### 2. Upload a Document
- Login to your account
- Click "Upload New File" in the sidebar
- Select a PDF or Word document
- Wait for processing (you'll see "Processing..." status)

### 3. Ask Questions
- Select your uploaded document
- Type questions in the chat interface
- Get AI-powered answers based on document content

## 🔍 Troubleshooting

### Common Issues

**Backend won't start:**
- Check if `.env` file exists and has correct values
- Ensure OpenRouter API key is valid
- Check if port 3001 is available

**Document processing fails:**
- Verify file format (PDF, DOC, DOCX only)
- Check file size (max 10MB)
- Ensure ChromaDB is properly initialized

**Frontend can't connect to backend:**
- Verify backend is running on port 3001
- Check CORS configuration
- Ensure API endpoints are accessible

**Authentication issues:**
- Clear browser localStorage
- Check JWT_SECRET in .env
- Verify database is initialized

### Debug Mode

Enable debug logging by setting in `.env`:
```env
NODE_ENV=development
DEBUG=true
```

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Use strong, unique JWT_SECRET
2. **Database**: Consider PostgreSQL for production
3. **File Storage**: Use cloud storage (AWS S3, etc.)
4. **Rate Limiting**: Adjust based on expected load
5. **SSL**: Enable HTTPS in production

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up --build
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### File Management
- `POST /api/files/upload` - Upload document
- `GET /api/files/list` - List user documents
- `DELETE /api/files/:id` - Delete document

### Chat & AI
- `POST /api/chat/message` - Send message, get AI response
- `GET /api/chat/conversations` - Get conversation history
- `GET /api/chat/documents/:id/suggestions` - Get question suggestions
- `GET /api/chat/documents/:id/summary` - Get document summary

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the console logs
3. Verify environment configuration
4. Open an issue with detailed error information

---

**Happy Document Q&A! 📚✨**
