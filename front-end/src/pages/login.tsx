import React, { useState } from 'react';
import { ChevronDown, User2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import './login.css'
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-black p-4 md:p-6">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            STYLUX
          </h1>
          <ChevronDown className="w-5 h-5 text-purple-400" />
        </div>
        <div className='hmeo'>
        <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-full transition-colors">
          <Link to='/'>Home</Link>
        </button>
        </div>
        <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-full transition-colors">
          <Link to='/try'>Try for free</Link>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto mt-8">
        <div className="bg-purple-700/30 rounded-3xl p-8 md:p-12 backdrop-blur-sm flex flex-col md:flex-row gap-8 items-center">
          {/* Left Side - Image */}
          <div className="w-full md:w-1/2">
            <img
              src="src\images\image_24-removebg-preview (1).png"
              alt="Fashion Display"
              className="w-full h-auto rounded-2xl object-cover"
            />
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full md:w-1/2 text-center">
            <div className="mb-8 flex justify-center">
              <div className="p-3 bg-white/10 rounded-full">
                <User2 className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Welcome back
            </h2>
            <p className="text-gray-300 mb-8">
              Glad to see you again 👋
              <br />
              Let's get started to get access to Stylux AI
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Email address*"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-purple-600/40 border border-purple-500/30 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-purple-600/40 border border-purple-500/30 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />

              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Login
              </button>
            </form>

            <p className="mt-6 text-gray-300">
              Don't have an account?{' '}
              <a href="/sign-up" className="text-purple-400 hover:text-purple-300">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;