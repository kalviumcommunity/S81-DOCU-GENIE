import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Send, 
  Upload, 
  File, 
  Brain, 
  LogOut, 
  MessageSquare,
  User,
  Bot,
  Plus,
  FileText,
  X,
  Menu,
  Trash2,
  Download
} from 'lucide-react';
import apiService from '../services/api';

const Chat = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('userId');
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: "Hello! I'm Docu Genie. Upload your documents and I'll help you understand them better. What would you like to know about your files today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { documentId } = useParams();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // If redirected from Google, set authentication and store JWT token
    const token = queryParams.get('token');
    if (userId && token) {
      // Set all required localStorage items before navigation
      localStorage.setItem('googleUserId', userId);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', token);
      setTimeout(() => {
        navigate('/chat', { replace: true });
      }, 100); // Ensure localStorage is set before navigation
      return;
    }

    // Robust authentication check
    const isAuth = localStorage.getItem('isAuthenticated');
    const googleId = localStorage.getItem('googleUserId');
    const jwtToken = localStorage.getItem('token');
    if ((!isAuth && !googleId) || !jwtToken) {
      // Show loading spinner briefly before redirecting to login
      setTimeout(() => {
        navigate('/login');
      }, 100);
    } else {
      loadFiles();
    }
  }, [navigate, userId]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getFiles();
      setFiles(response.documents);
      
      // If URL has a documentId, set that as active; otherwise default to first
      if (response.documents.length > 0) {
        const docFromUrl = documentId ? response.documents.find(d => String(d.id) === String(documentId)) : null;
        if (docFromUrl) {
          setActiveFile(docFromUrl);
        } else if (!activeFile) {
          setActiveFile(response.documents[0]);
        }
      }
    } catch (error) {
      console.error('Error loading files:', error);
      showToastNotification('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh files to update processing status
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if there are files that are still processing
      if (files.some(file => !file.processed)) {
        loadFiles();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [files]);

  // Check for newly processed files and show notification
  useEffect(() => {
    files.forEach(file => {
      if (file.processed && !file._notified) {
        showToastNotification(`${file.name} is now ready for questions!`);
        // Mark as notified to avoid duplicate notifications
        file._notified = true;
      }
    });
  }, [files]);

  // Manual refresh function
  const refreshFiles = () => {
    loadFiles();
  };

  const showToastNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const loadConversationForFile = async (fileId) => {
    try {
      setIsLoading(true);
      // Find existing conversation for this document
      const convResp = await apiService.getConversations();
      const existing = convResp.conversations.find(c => String(c.documentId) === String(fileId));
      if (existing) {
        setCurrentConversationId(existing.id);
        const msgsResp = await apiService.getConversationMessages(existing.id);
        const mapped = msgsResp.messages.map(m => ({
          id: String(m.id),
          content: m.content,
          sender: m.role === 'user' ? 'user' : 'ai',
          timestamp: new Date(m.timestamp || Date.now())
        }));
        setMessages(mapped.length > 0 ? mapped : [
          {
            id: '1',
            content: "Hello! I'm Docu Genie. Upload your documents and I'll help you understand them better. What would you like to know about your files today?",
            sender: 'ai',
            timestamp: new Date()
          }
        ]);
      } else {
        // No conversation yet for this document
        setCurrentConversationId(null);
        setMessages([
          {
            id: '1',
            content: "Hello! I'm Docu Genie. Upload your documents and I'll help you understand them better. What would you like to know about your files today?",
            sender: 'ai',
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Send message to API
      const response = await apiService.sendMessage(
        inputMessage, 
        activeFile?.id, 
        currentConversationId
      );

      // Update conversation ID if this is a new conversation
      if (response.conversationId) {
        setCurrentConversationId(response.conversationId);
      }

      // Add AI response
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: 'ai',
        timestamp: new Date(),
        sources: response.sources || [],
        confidence: response.confidence || 0
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsLoading(true);
        const response = await apiService.uploadFile(file);
        
        // Add new file to the list
        const newFile = {
          id: response.document.id,
          name: response.document.filename,
          type: response.document.type,
          size: `${(response.document.size / (1024 * 1024)).toFixed(1)} MB`,
          processed: response.document.processed
        };
        
        setFiles(prev => [...prev, newFile]);
        setActiveFile(newFile);
        setShowUploadModal(false);
        showToastNotification(`Successfully uploaded ${file.name}`);
        
        // Reload files to get updated processing status
        setTimeout(() => loadFiles(), 2000);
      } catch (error) {
        console.error('Error uploading file:', error);
        showToastNotification(error?.message || 'Failed to upload file');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    navigate('/');
  };

  const askAboutFile = () => {
    if (activeFile) {
      const suggestion = `Tell me about the key concepts in ${activeFile.name}`;
      setInputMessage(suggestion);
    }
  };

  // When user selects a different file, navigate to its dedicated chat route and load its conversation
  useEffect(() => {
    if (activeFile) {
      navigate(`/chat/${activeFile.id}`);
      loadConversationForFile(activeFile.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await apiService.deleteFile(fileId);
        showToastNotification('File deleted successfully');
        loadFiles();
        if (activeFile?.id === fileId) {
          setActiveFile(null);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        showToastNotification('Failed to delete file');
      }
    }
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Upload Study Material</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors duration-300"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500">PDF, DOCX files up to 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden lg:relative absolute z-30 h-full`}>
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-8 h-8 text-green-400" />
              <span className="text-xl font-bold">Docu Genie</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" />
            <span>Upload New File</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Your Files</h3>
            <button
              onClick={refreshFiles}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Refresh files"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No files uploaded yet</p>
              <p className="text-xs text-gray-600">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 rounded-lg transition-all duration-200 ${
                    activeFile?.id === file.id
                      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div 
                        className="cursor-pointer"
                        onClick={() => setActiveFile(file)}
                      >
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            file.processed 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {file.processed ? 'Ready' : 'Processing...'}
                          </span>
                          {!file.processed && (
                            <div className="w-3 h-3">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors py-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden p-2 text-gray-400 hover:text-white transition-colors ${sidebarOpen ? 'hidden' : 'block'}`}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <File className="w-5 h-5 text-green-400" />
                <span className="font-medium text-white">
                  {activeFile ? activeFile.name : 'No file selected'}
                </span>
              </div>
            </div>
            <button
              onClick={askAboutFile}
              disabled={!activeFile}
              className="bg-blue-500 hover:bg-blue-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Ask about this file
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-3 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div
                  className={`p-4 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-white border border-gray-700'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-6">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question about your study materials..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Chat;