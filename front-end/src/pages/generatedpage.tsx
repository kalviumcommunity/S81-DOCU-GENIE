import { useState } from 'react';
import { Menu, Search,  Globe2, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './generated.css';

interface GeneratedPageProps {
  initialMessage?: string;
}

function GeneratedPage({ initialMessage }: GeneratedPageProps) {
  const [message, setMessage] = useState(initialMessage || '');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navigate = useNavigate();

  const handleMessage = () => {
    navigate('/messages');
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-purple-900">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-screen w-60 bg-zinc-900/50 backdrop-blur-md p-4 border-r border-white/10 transition-transform ${sidebarVisible ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Top Icons */}
        <div className="flex items-center gap-2 mb-8">
          <button onClick={toggleSidebar} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Menu className="w-6 h-6 text-zinc-400" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Search className="w-6 h-6 text-zinc-400" />
          </button>
        </div>
        
        {/* Navigation Items */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-white text-sm font-medium">S</span>
            </div>
            <span className="text-white font-medium">STYLUX</span>
          </div>
          
          <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-zinc-400">Explore STYLUX</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-4">
        {/* Header */}
        <header className="p-4 flex justify-between items-center border-b border-white/10">
          <button onClick={toggleSidebar} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-xl font-medium">STYLUX</span>
            <ChevronDown className="w-5 h-5 text-purple-400" />
          </div>
          
          <div className='ho'>
          <button className="px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors">
           <Link to='/'> Home</Link>
          </button>
          </div>
          <div className='tr'>
          <button className="px-6 py-2 bg-purple-500 hover:bg-purple-600 transition-colors rounded-full text-white text-sm font-medium ">
            <Link to="/try">Try for free</Link>
          </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-20">
          <h1 className="text-white text-7xl font-bold text-center mb-20">
            Introducing STYLUX
          </h1>

          {/* Message Input Box */}
          <div>
          <Link to='/messages'><button className="px-8 py-4 bg-purple-500 hover:bg-purple-600 transition-colors rounded-full text-white text-sm font-medium">
                  Try STYLUX
                </button></Link>
                <h4>Sign up STYLUX</h4>
          
                </div>

        </main>
      </div>
    </div>
  );
}

export default GeneratedPage;
