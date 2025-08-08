# S81-DOCU-GENIE

---

## 🚀 Features

- 📤 Upload and preview PDF, DOCX files
- 🧠 AI-based doubt clearing & summaries (powered by Ollama or Gemini)
- 💬 Ask natural language questions about uploaded files
- 🕹️ Chat UI with conversation history
- 🔐 Authentication system with JWT
- 🗃️ Save chat history and file metadata
- 📌 Highlighting Q&A references in the document

---

## 🧑‍💻 Tech Stack

### 🖥️ Frontend
- **React.js** (with Vite)
- **Tailwind CSS** (UI Styling)
- **React Dropzone** (File upload)
- **React-PDF** / **react-doc-viewer** (Document preview)
- **Axios** (API calls)
- **React Router Dom**

### 🔧 Backend
- **Node.js + Express.js**
- **Multer** (File upload handling)
- **pdf-parse**, **mammoth**, **textract** (Content extraction)
- **JWT + bcrypt** (Auth)
- **Ollama / OpenAI / Gemini API** (LLM integration)
- **LangChain (optional)** (Advanced document-level querying)

### 🛢️ Database
- **MongoDB + Mongoose**

### 🧠 AI Integration
- **Ollama (Local LLM)** or
- **Google Gemini API** or
- **OpenAI GPT Models**

---