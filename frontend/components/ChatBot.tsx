"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || undefined;

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: DEFAULT_MODEL,
          history: messages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error (${response.status})`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Could not connect to the AI server.\n\n**Details:** ${errorMsg}\n\n**Fix:** Make sure the backend is running and Ollama is accessible.`
      }]);
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
            className="w-[340px] sm:w-[400px] h-[500px] mb-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: "var(--bg-elevated)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid var(--border-glass)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 24px 60px rgba(0,0,0,0.06)",
            }}
          >
            {/* Header */}
            <div className="p-4 flex justify-between items-center shrink-0"
              style={{
                backgroundColor: "var(--accent-subtle)",
                borderBottom: "1px solid var(--border-glass)",
              }}
            >
              <div className="flex items-center gap-2 font-outfit font-bold" style={{ color: "var(--text-primary)" }}>
                <div className="flex items-center justify-center size-7 rounded-full"
                  style={{
                    backgroundColor: "var(--accent)",
                    boxShadow: "0 0 10px var(--accent-glow)",
                  }}
                >
                  <MessageSquare size={14} style={{ color: "#ffffff" }} />
                </div>
                Ask Silo AI
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar"
              style={{ backgroundColor: "var(--bg-base)" }}
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] p-3 text-sm font-plus-jakarta rounded-2xl shadow-sm"
                    style={{
                      backgroundColor: msg.role === 'user' ? "var(--accent)" : "var(--bg-surface)",
                      color: msg.role === 'user' ? "#ffffff" : "var(--text-primary)",
                      borderBottomRightRadius: msg.role === 'user' ? "4px" : undefined,
                      borderTopLeftRadius: msg.role === 'assistant' ? "4px" : undefined,
                      border: msg.role === 'assistant' ? "1px solid var(--border-glass)" : "none",
                    }}
                  >
                    <div className="space-y-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>strong]:font-bold">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Quick Ask Suggestions */}
              {messages.length === 1 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-2 mt-2"
                >
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all text-left"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        color: "var(--accent)",
                        border: "1px solid var(--border-glass)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <Sparkles size={12} />
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div
                    className="p-3 rounded-2xl text-sm flex items-center gap-2"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-glass)",
                      color: "var(--text-secondary)",
                      borderBottomLeftRadius: "4px",
                    }}
                  >
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                    Analyzing...
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="p-3 flex gap-2 shrink-0"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderTop: "1px solid var(--border-muted)",
              }}
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about risk levels..."
                disabled={isLoading}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-plus-jakarta transition-all focus:outline-none"
                style={{
                  backgroundColor: "var(--bg-base)",
                  border: "1px solid var(--border-muted)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-subtle)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-muted)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center w-11 h-11"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#ffffff",
                  boxShadow: isLoading ? "none" : "0 0 12px var(--accent-glow)",
                }}
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
              className="absolute right-[70px] whitespace-nowrap text-sm font-plus-jakarta px-4 py-2.5 rounded-2xl shadow-xl flex items-center"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-glass)",
                color: "var(--text-primary)",
              }}
            >
              Hi there! Need help? 👋
              <div
                className="absolute top-1/2 -right-[5px] -translate-y-1/2 border-y-4 border-y-transparent"
                style={{ borderLeft: "6px solid var(--border-glass)" }}
              />
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
          className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors relative z-10"
          style={{
            backgroundColor: "var(--accent)",
            boxShadow: "0 0 20px var(--accent-glow)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </motion.button>
      </div>
    </div>
  );
}
