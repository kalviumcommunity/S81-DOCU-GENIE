# Docu Genie Backend

A powerful backend API for document processing and AI-powered Q&A system using Google's Gemini AI.

## Features

- 🔐 **Authentication**: JWT-based user authentication and authorization
- 📄 **Document Processing**: PDF and Word document text extraction and processing
- 🧠 **AI Integration**: Google Gemini AI for intelligent responses
- 🔍 **Vector Search**: ChromaDB for semantic search and document retrieval
- 💬 **Chat System**: Conversation management with context awareness
- 📊 **User Management**: Profile management and usage statistics

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: SQLite with async operations
- **Vector Store**: ChromaDB
- **AI Service**: Google Gemini AI
- **Authentication**: JWT with bcrypt
- **File Processing**: pdf-parse, mammoth
- **Security**: Helmet, CORS, rate limiting

## Quick Start

### Prerequisites

- Node.js 18+ 
- Google AI API key
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your_super_secret_jwt_key_here
   GOOGLE_API_KEY=your_google_ai_api_key_here
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

The server will start on `http://localhost:3001`

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/login`
Login with existing credentials.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### File Management Endpoints

#### POST `/api/files/upload`
Upload a document (PDF, DOC, DOCX).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Document file (max 10MB)

#### GET `/api/files/list`
Get user's uploaded documents.

**Response:**
```json
{
  "documents": [
    {
      "id": 1,
      "name": "study-notes.pdf",
      "size": 2048576,
      "type": "application/pdf",
      "processed": true,
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### Chat Endpoints

#### POST `/api/chat/message`
Send a message and get AI response.

**Request Body:**
```json
{
  "message": "Explain the main concepts in this document",
  "documentId": 1,
  "conversationId": 1
}
```

**Response:**
```json
{
  "message": "The main concepts include...",
  "conversationId": 1,
  "sources": [
    {
      "text": "Relevant excerpt from document...",
      "chunkIndex": 0,
      "similarity": 0.85
    }
  ],
  "confidence": 85
}
```

#### GET `/api/chat/conversations`
Get user's conversation history.

#### GET `/api/chat/documents/:id/suggestions`
Get suggested questions for a document.

#### GET `/api/chat/documents/:id/summary`
Get AI-generated document summary.

### User Management Endpoints

#### GET `/api/user/profile`
Get user profile and statistics.

#### PATCH `/api/user/profile`
Update user profile information.

#### GET `/api/user/dashboard`
Get dashboard data with recent activity.

## Architecture

### Database Schema

The system uses SQLite with the following main tables:

- **users**: User accounts and authentication
- **documents**: Uploaded file metadata
- **document_chunks**: Processed text chunks with embeddings
- **conversations**: Chat conversation threads
- **messages**: Individual chat messages

### Document Processing Pipeline

1. **Upload**: File uploaded via multer middleware
2. **Storage**: File saved to disk, metadata in database
3. **Extraction**: Text extracted using pdf-parse or mammoth
4. **Chunking**: Text split into manageable chunks
5. **Embedding**: Chunks converted to vector embeddings
6. **Indexing**: Embeddings stored in ChromaDB for search

### AI Response Generation

1. **Query Processing**: User question analyzed
2. **Context Retrieval**: Relevant chunks found via semantic search
3. **Prompt Engineering**: Context and query formatted for AI
4. **Response Generation**: Google Gemini generates contextual response
5. **Response Formatting**: Results formatted with sources and confidence

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment mode | development |
| `JWT_SECRET` | JWT signing secret | Required |
| `GOOGLE_API_KEY` | Google AI API key | Required |
| `DATABASE_URL` | SQLite database path | ./database.sqlite |
| `UPLOAD_DIR` | File upload directory | ./uploads |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 10485760 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |

### Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 12 salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **File Validation**: MIME type and size checking
- **CORS Protection**: Configured for frontend origin
- **Helmet Security**: Security headers middleware
- **Input Validation**: express-validator for all inputs

## Development

### Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Error handling
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── files.js             # File management routes
│   ├── chat.js              # Chat and AI routes
│   └── user.js              # User management routes
├── services/
│   ├── documentProcessor.js # Document text extraction
│   ├── vectorService.js     # ChromaDB and embeddings
│   └── aiService.js         # Google AI integration
├── uploads/                 # File upload directory
├── server.js               # Main application entry
└── package.json
```

### Running in Development

```bash
# Install nodemon globally (optional)
npm install -g nodemon

# Start with auto-reload
npm run dev

# Run tests (when implemented)
npm test
```

### API Testing

Use tools like Postman, Insomnia, or curl to test endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123"}'
```

## Deployment

### Production Setup

1. **Environment**: Set `NODE_ENV=production`
2. **Security**: Use strong JWT secrets
3. **Database**: Consider PostgreSQL for production
4. **File Storage**: Use cloud storage (AWS S3, Google Cloud)
5. **Process Management**: Use PM2 or similar
6. **Reverse Proxy**: Nginx for static files and SSL

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Google AI API Errors**
   - Verify API key is correct
   - Check API quotas and limits
   - Ensure billing is enabled

2. **File Upload Issues**
   - Check file size limits
   - Verify MIME types are supported
   - Ensure upload directory exists and is writable

3. **Database Errors**
   - Check SQLite file permissions
   - Verify database path is correct
   - Run database initialization

4. **ChromaDB Connection**
   - Ensure ChromaDB service is running
   - Check network connectivity
   - Verify collection configuration

### Logs and Debugging

- Server logs are output to console
- Enable debug mode with `NODE_ENV=development`
- Check error details in API responses
- Monitor file system permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review API documentation
