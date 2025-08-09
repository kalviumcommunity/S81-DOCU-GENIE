import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import Home from "./pages/home";
import Chatbot from "./pages/chatbot";
import Generatedpage from "./pages/generatedpage";
import Signup from "./pages/signup";
import Tryfor from "./pages/tryforfree";
import Login from "./pages/login";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/dashboard";
import "./app.css";

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gradient-to-br from-black via-black to-purple-500">
        <header>
          <SignedOut>
            
          </SignedOut>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generated-page" element={<Generatedpage />} />
            <Route path="/messages" element={<Chatbot />} />
            <Route path="/sign-up" element={<Signup />} />
            <Route path="/try" element={<Tryfor />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </header>
      </div>
    </Router>
  );
}