const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://s81-docu-genie.onrender.com/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// API service class
class ApiService {
  // Authentication
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await handleResponse(response);
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async signup(email, password, username) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, username }),
    });
    
    const data = await handleResponse(response);
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  }

  // File management
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });

    return handleResponse(response);
  }

  async getFiles() {
    const response = await fetch(`${API_BASE_URL}/files/list`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  async deleteFile(fileId) {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  // Chat functionality
  async sendMessage(message, documentId = null, conversationId = null) {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        message,
        documentId,
        conversationId,
      }),
    });

    return handleResponse(response);
  }

  async getConversations() {
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  async getConversationMessages(conversationId) {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  async deleteConversation(conversationId) {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  async updateConversationTitle(conversationId, title) {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ title }),
    });

    return handleResponse(response);
  }

  async getDocumentSuggestions(documentId) {
    const response = await fetch(`${API_BASE_URL}/chat/documents/${documentId}/suggestions`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  async getDocumentSummary(documentId) {
    const response = await fetch(`${API_BASE_URL}/chat/documents/${documentId}/summary`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    return handleResponse(response);
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return handleResponse(response);
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;

