import { Link, Outlet, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react"; 
import { Cat as  Github, Linkedin, Youtube, Twitter,  Mail } from "lucide-react";

function Home() {
  const navigate = useNavigate();
  const { openSignUp } = useClerk();

  // Navigate to generated page
  const handleGenerate = () => {
    navigate('/messages');
  };

  // Open Clerk's sign-up page
  const handleSignUp = () => {
    openSignUp();
  };

  return (
    <>
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="src\images\image 3.png" alt="logo" className="w-8 h-8 rounded-full " />
            <span className="text-2xl font-bold">
              <span className="text-purple-400">STY</span>
              <span className="text-purple-500">LUX</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              className="px-6 py-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-500 transition-colors" 
              onClick={handleSignUp} 
            >
              Sign up
            </button>
            <Link to="/try" className="px-6 py-2 bg-gradient-to-r from-[#A894FF] to-purple-500 hover:from-purple-700 hover:to-purple-700 transition-colors rounded-full text-white text-sm font-medium">
              Try for free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 pt-20 pb-32 text-center">
        <h1 className="text-5xl md:text-5xl font-bold text-white mb-6">
          The <span className="text-purple-400">fastest</span> way to get trendy collections with
        </h1> 
        <h2 className="text-5xl md:text-5xl font-bold text-purple-400 mb-16">STYLUX AI</h2>

        {/* Message Input */}
        <div className="relative max-w-2xl mx-auto">
        <div className="flex justify-center">
  <button 
    onClick={handleGenerate}
    className="px-10 py-4 text-2xl bg-gradient-to-r from-[#A894FF] to-purple-500 hover:from-purple-700 hover:to-purple-700 transition-colors rounded-full text-white text-sm font-medium"
  >
    Generate
  </button>
</div>

          <p className="text-zinc-400 text-sm mt-4">
            By clicking "Generate" you agree to our <a href="#" className="text-purple-400 hover:underline">Privacy Notice</a>
          </p>
        </div>

        {/* Additional Links */}
        

        <Outlet />
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-purple-900 bg-opacity-50 backdrop-blur-sm py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                STYLUX
              </h1>
            </div>

            <div className="text-zinc-400">© StyluxAI 2025</div>

            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-white hover:text-purple-400 transition-colors"><Twitter className="w-6 h-6" /></a>
              <a href="mailto:styluxai1337@gmail.com" className="text-white hover:text-purple-400 transition-colors"><Youtube className="w-6 h-6" /></a>
              <a href="#" className="text-white hover:text-purple-400 transition-colors"><Linkedin className="w-6 h-6" /></a>
              <a href="#" className="text-white hover:text-purple-400 transition-colors"><Github className="w-6 h-6" /></a>
              <a href="mailto:styluxai1337@gmail.com" className="text-white hover:text-purple-400 transition-colors"><Mail className="w-6 h-6" /></a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Home;