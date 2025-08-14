import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Brain, Upload, MessageSquare } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 md:p-8">
        <div className="flex items-center space-x-2">
          <Brain className="w-8 h-8 text-green-400" />
          <span className="text-2xl font-bold">Docu Genie</span>
        </div>
        <div className="space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-6 py-2 bg-green-500 hover:bg-green-400 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <Brain className="w-20 h-20 text-green-400 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-green-400 bg-clip-text text-transparent">
              Docu Genie
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 font-light">
              Upload Notes. Get Answers. Study Smart.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/login"
              className="px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-black rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 min-w-[160px]"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-green-500/25 min-w-[160px]"
            >
              Get Started
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <Upload className="w-12 h-12 text-green-400 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Upload Notes</h3>
              <p className="text-gray-400">
                Upload your study materials in PDF, DOCX, and other formats
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <MessageSquare className="w-12 h-12 text-blue-400 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Ask Questions</h3>
              <p className="text-gray-400">
                Get instant answers about your uploaded study materials
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <BookOpen className="w-12 h-12 text-green-400 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Study Smart</h3>
              <p className="text-gray-400">
                AI-powered insights to enhance your learning experience
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;