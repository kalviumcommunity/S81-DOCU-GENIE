import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Chat from './components/Chat.jsx';
import { isAuthenticated } from './utils/auth.js';

const ProtectedRoute = ({ children }) => {
  // Allow the OAuth callback through even before the token exists in
  // localStorage - Chat.jsx exchanges ?code= for a token on mount and
  // only then is isAuthenticated() true.
  const hasOAuthCode = new URLSearchParams(window.location.search).has('code');

  if (!isAuthenticated() && !hasOAuthCode) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/chat/:documentId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;