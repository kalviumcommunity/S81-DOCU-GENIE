import React, { useState } from 'react';
import { User } from 'lucide-react';
import './signup.css'
import { Link } from "react-router-dom";
function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <User className="h-8 w-8 text-white" />
          <span className="text-white text-2xl font-bold">STYLUX</span>
        </div>
        <div className='hmom'>
        <button className='bg-purple-500 text-white px-6 py-2 rounded-full hover:bg-purple-600 transition-colors'>
          <Link to='/'>Home</Link>
        </button>
        </div>
        <div className='rue'>
        <button className="bg-purple-500 text-white px-6 py-2 rounded-full hover:bg-purple-600 transition-colors">
          <Link to='/try'>Try for free</Link>
        </button>
        </div>
        
      </header>

      {/* Main Content */}
      <main className="flex justify-center items-center px-4 py-8">
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-8 rounded-3xl w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <User className="h-16 w-16 text-white mb-4" />
            <h1 className="text-4xl font-bold text-white">Sign up</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                className="bg-purple-700/50 text-white placeholder-purple-300 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                className="bg-purple-700/50 text-white placeholder-purple-300 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <input
              type="tel"
              name="mobile"
              placeholder="Mobile Number"
              value={formData.mobile}
              onChange={handleChange}
              className="bg-purple-700/50 text-white placeholder-purple-300 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="bg-purple-700/50 text-white placeholder-purple-300 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="bg-purple-700/50 text-white placeholder-purple-300 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <div className="flex justify-center mt-8">
              <button
                type="submit"
                className="bg-purple-600 text-white px-8 py-3 rounded-full hover:bg-purple-700 transition-colors transform hover:scale-105 duration-200"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Signup;