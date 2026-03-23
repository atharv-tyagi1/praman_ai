"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Upload,
  Paperclip,
  Bot,
  User,
  Loader2,
  Sparkles,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  reportContext: string;
  onNewSource: (payload: { type: string; query?: string; file?: File }) => void;
}

export default function ChatWidget({ reportContext, onNewSource }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your report assistant. Ask me anything about the verification results, or upload a new source to analyze.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, report_context: reportContext }),
      });
      const data = await res.json();
      const reply = data.success ? data.reply : "Sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Connection error. Please check if the backend is running.", timestamp: new Date() },
      ]);
    }
    setIsLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowUploadMenu(false);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: `📎 Uploading new source: ${file.name}`, timestamp: new Date() },
      { id: (Date.now() + 1).toString(), role: "assistant", content: "Starting verification of the new source. The current report will be saved to history.", timestamp: new Date() },
    ]);
    setTimeout(() => {
      onNewSource({ type: "document", file });
    }, 800);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextSource = () => {
    setShowUploadMenu(false);
    const text = prompt("Paste the text or URL you want to verify:");
    if (!text?.trim()) return;
    const isUrl = /^https?:\/\//i.test(text.trim());
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: `📝 New source: ${text.slice(0, 80)}...`, timestamp: new Date() },
      { id: (Date.now() + 1).toString(), role: "assistant", content: "Starting verification. Your current report will be saved to history.", timestamp: new Date() },
    ]);
    setTimeout(() => {
      onNewSource({ type: isUrl ? "url" : "text", query: text.trim() });
    }, 800);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #2563EB 0%, #0891B2 100%)",
          boxShadow: "0 8px 32px rgba(37,99,235,0.4)",
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={22} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-6 z-[100] w-[380px] max-h-[520px] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "rgba(10,14,24,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              backdropFilter: "blur(30px)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(37,99,235,0.05)" }}
            >
              <div className="p-2 rounded-xl" style={{ background: "rgba(37,99,235,0.15)" }}>
                <Sparkles size={16} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                  Report Assistant
                </h3>
                <p className="text-[10px] text-slate-500">Ask about your report or analyze new sources</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 340 }}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(37,99,235,0.15)" }}>
                      <Bot size={14} className="text-blue-400" />
                    </div>
                  )}
                  <div
                    className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed"
                    style={{
                      background: msg.role === "user" ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${msg.role === "user" ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.06)"}`,
                      color: msg.role === "user" ? "#93C5FD" : "#CBD5E1",
                      fontFamily: "var(--font-body)",
                      borderTopRightRadius: msg.role === "user" ? 4 : undefined,
                      borderTopLeftRadius: msg.role === "assistant" ? 4 : undefined,
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(74,222,128,0.12)" }}>
                      <User size={14} className="text-green-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-2 items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(37,99,235,0.15)" }}>
                    <Bot size={14} className="text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                    <span className="text-xs text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div
              className="flex items-center gap-2 px-3 py-3 border-t flex-shrink-0 relative"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(13,19,32,0.5)" }}
            >
              {/* Upload Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  title="Upload new source"
                >
                  <Paperclip size={16} className="text-slate-500 hover:text-slate-300" />
                </button>
                <AnimatePresence>
                  {showUploadMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-11 left-0 w-48 rounded-xl overflow-hidden"
                      style={{
                        background: "rgba(13,19,32,0.97)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                      }}
                    >
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <Upload size={14} className="text-blue-400" />
                        <span className="text-xs text-slate-300" style={{ fontFamily: "var(--font-body)" }}>Upload File</span>
                      </button>
                      <button
                        onClick={handleTextSource}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-t"
                        style={{ borderColor: "rgba(255,255,255,0.05)" }}
                      >
                        <MessageCircle size={14} className="text-green-400" />
                        <span className="text-xs text-slate-300" style={{ fontFamily: "var(--font-body)" }}>Paste Text / URL</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                placeholder="Ask about the report..."
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none px-2"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg transition-colors disabled:opacity-30"
                style={{ background: input.trim() ? "rgba(37,99,235,0.2)" : "transparent" }}
              >
                <Send size={16} className={input.trim() ? "text-blue-400" : "text-slate-600"} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
