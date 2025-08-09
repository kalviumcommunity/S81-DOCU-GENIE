import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import './chatbot.css'
// Define types for messages
interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

interface ApiResponse {
  response: string;
  suggested_options?: string[];
}

const Chatbot: React.FC = () => {
  const [userInput, setUserInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessage: Message = {
      sender: "user",
      text: userInput,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChatHistory((prevHistory) => [...prevHistory, newMessage]);
    setUserInput("");

    try {
      // Send both message and conversation_history for context
      const response = await axios.post<ApiResponse>(
        "http://localhost:8000/chat",
        {
          message: userInput,
          conversation_history: chatHistory,
        }
      );
      const botMessage: Message = {
        sender: "bot",
        text: response.data.response,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prevHistory) => [...prevHistory, botMessage]);
    } catch (error) {
      console.error("Error fetching response:", error);
      const errorMessage: Message = {
        sender: "bot",
        text: "Sorry, I couldn't process that request.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prevHistory) => [...prevHistory, errorMessage]);
    }
  };

  // Function to re-use a previous question from the sidebar
  

  return (
    <div className="min-h-screen w-screen h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-purple-900">
      <div className="w-full h-full flex flex-col rounded-none shadow-none bg-gray-800/90 border-0 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-purple-700">
          <h2 className="text-3xl font-bold text-purple-400 tracking-wide">STYLUX AI Fashion Chatbot</h2>
          <span className="text-sm text-gray-400">Powered by AI</span>
        </div>
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-transparent">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-6 py-4 max-w-[60%] shadow-md text-base font-medium ${msg.sender === "user" ? "bg-gradient-to-br from-purple-600 to-purple-400 text-white" : "bg-gray-700 text-purple-100 border border-purple-600"}`}
              >
                {msg.text}
                <div className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>
        {/* Input Section */}
        <div className="px-8 py-6 border-t border-purple-700 bg-gray-900/80 flex items-center gap-4">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask your fashion question..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 p-4 rounded-xl bg-gray-800 text-white placeholder-purple-300 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg transition"
          />
          <button
            onClick={handleSendMessage}
            className="bg-gradient-to-br from-purple-600 to-purple-400 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:from-purple-700 hover:to-purple-500 text-lg transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
