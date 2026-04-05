"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  "Which silos are at high risk?",
  "What are the signs of wheat spoilage?",
  "How can I lower the temperature?",
  "Show me Alpha Depot status"
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am the Silo Assistant. How can I help you with your crops today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // We separated the sending logic so both the form and the quick buttons can use it
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model: "llama3.2" }),
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Could not connect to the AI server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[340px] sm:w-[400px] h-[500px] mb-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shadow-md z-10">
              <div className="flex items-center gap-2 text-white font-outfit font-bold">
                <div className="flex items-center justify-center size-7 rounded-full bg-emerald-500/20 text-emerald-400">
                  <MessageSquare size={14} />
                </div>
                Ask Silo AI
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-700 p-1 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-900/50">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[85%] p-3 text-sm font-plus-jakarta rounded-2xl shadow-sm
                    ${msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                    }
                  `}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Quick Ask Suggestions (Only shows if no messages have been sent yet) */}
              {messages.length === 1 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-2 mt-2"
                >
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl transition-all text-left shadow-sm hover:shadow-emerald-500/10"
                    >
                      <Sparkles size={12} />
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-sm text-slate-400 text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-emerald-500" />
                    Analyzing...
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about risk levels..."
                disabled={isLoading}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all font-plus-jakarta shadow-inner"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center w-11 h-11 shadow-md hover:shadow-lg"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button & Hover Tooltip */}
      <div
        className="relative flex items-center mt-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isHovered && !isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-[70px] whitespace-nowrap bg-slate-800 border border-slate-700 text-slate-200 text-sm font-plus-jakarta px-4 py-2.5 rounded-2xl shadow-xl flex items-center"
            >
              Hi there! Need help? 👋
              <div className="absolute top-1/2 -right-[5px] -translate-y-1/2 border-y-4 border-y-transparent border-l-[6px] border-l-slate-700" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsOpen(!isOpen);
            setIsHovered(false);
          }}
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(5,150,105,0.4)] flex items-center justify-center text-white transition-colors border border-emerald-400/30 relative z-10"
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </motion.button>
      </div>
    </div>
  );
}