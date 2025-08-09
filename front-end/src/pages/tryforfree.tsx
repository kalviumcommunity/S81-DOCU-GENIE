import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import './trythis.css';
function Tryfor() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-purple-500">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              STYLUX
            </h1>
            <ChevronDown className="w-5 h-5 text-white ml-2" />
          </div>
          <button className="px-6 py-2 bg-gradient-to-r from-[#A894FF] to-purple-500 hover:from-purple-700 hover:to-purple-700 transition-colors rounded-full text-white text-sm font-medium">
            <Link to='/'>Home</Link>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className='trythis'>
      <main className="px-6 py-12">

        <h2 className="text-5xl font-bold text-center text-purple-500 mb-16">
          Pricing
        </h2>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="relative p-8 rounded-3xl border border-purple-500/30 bg-black/50 backdrop-blur-sm">
            <h3 className="text-3xl font-bold text-white mb-4">Free</h3>
            <p className="text-gray-300 mb-8">
              An essential tool for efficiently managing bookings and guests, ideal for small or emerging fashion businesses."
            </p>
            
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">$</span>
              <span className="text-6xl font-bold text-white">0</span>
              <p className="text-gray-400 mt-2">Free</p>
            </div>

            <button className="w-full py-3 rounded-xl bg-gray-600/50 text-white font-semibold mb-8">
              Current Plan
            </button>

            <ul className="space-y-4">
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-pink-300 mr-3" />
                Basic features included
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-pink-300 mr-3" />
                Limited access
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-purple-700 to-purple-900">
            <h3 className="text-3xl font-bold text-white mb-4">Pro</h3>
            <p className="text-gray-200 mb-8">
              An essential tool for efficiently managing bookings and guests, ideal for small or emerging fashion businesses."
            </p>
            
            <div className="mb-8 flex items-center">
              <span className="text-4xl font-bold text-white">$</span>
              <span className="text-6xl font-bold text-white">0</span>
              <span className="ml-4 text-2xl text-gray-300 line-through">$9.99</span>
            </div>
            <p className="text-gray-200 mb-8">Per agent ,per month,billed annually</p>

            <button className="w-full py-3 rounded-xl bg-black/25 hover:bg-black/40 text-white font-semibold transition-colors mb-8">
              Upgrade to Pro
            </button>

            <ul className="space-y-4">
              <li className="flex items-center text-gray-200">
                <Check className="w-5 h-5 text-pink-200 mr-3" />
                All features included
              </li>
              <li className="flex items-center text-gray-200">
                <Check className="w-5 h-5 text-pink-200 mr-3" />
                Premium support
              </li>
            </ul>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

export default Tryfor;