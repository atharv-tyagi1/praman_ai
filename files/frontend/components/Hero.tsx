"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Search, ArrowRight, ShieldCheck, Zap, Globe, Settings, LogOut, Moon, Sun, Flame,
  Type, Link, FileText, ImageIcon, Mic, Upload, X, File as FileIcon
} from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, label: "98.4% Accuracy" },
  { icon: Zap, label: "< 3s Verification" },
  { icon: Globe, label: "50+ Sources" },
];

const SOURCE_TYPES = [
  { key: "text", label: "Text", icon: Type, accept: undefined },
  { key: "url", label: "URL", icon: Link, accept: undefined },
  { key: "document", label: "Document", icon: FileText, accept: ".pdf,.docx,.doc,.txt" },
  { key: "image", label: "Picture", icon: ImageIcon, accept: ".jpg,.jpeg,.png,.gif,.webp,.bmp" },
  { key: "audio", label: "Audio/Video", icon: Mic, accept: ".mp3,.wav,.m4a,.ogg,.webm,.mp4,.mpeg" },
];

/* ─── Title animation variants ─── */
const TITLE_VARIANTS = [
  { main: "Praman", accent: " AI" },
  { main: "प्रमाण", accent: " Ai" },
];

/* ─── Rotating taglines ─── */
const TAGLINES = [
  {
    hindi: "Data ki is Mahabharat mein, Praman Ai hai aapka sarthi.",
    english: "In this Mahabharat of data, Praman Ai is your charioteer.",
  },
  {
    hindi: "Faisle wahi, jiska ho sacha Praman. Unlock your Divya Drishti.",
    english: "Only decisions backed by true proof. Unlock your divine vision.",
  },
  {
    hindi: "Kurukshetra ho ya Corporate, jeet usi ki jiske paas ho Praman.",
    english: "Whether it's Kurukshetra or Corporate, victory belongs to the one with the proof.",
  },
  {
    hindi: "Bhavishya ka gyan, Praman ke astra ke saath.",
    english: "Knowledge of the future, with the weapon of Praman.",
  },
  {
    hindi: "Satyamev Jayate, ab AI se Pramanit.",
    english: "Truth alone triumphs, now proven by AI.",
  },
];

export interface VerifyPayload {
  type: string;
  query?: string;
  file?: File;
}

interface HeroProps {
  onVerify?: (payload: VerifyPayload) => void;
}

export default function Hero({ onVerify }: HeroProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "vedic">("dark");
  const [sourceType, setSourceType] = useState("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, -60]);

  // Theme application
  useEffect(() => {
    document.documentElement.classList.remove('light-theme', 'vedic-theme');
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else if (theme === 'vedic') {
      document.documentElement.classList.add('vedic-theme');
    }
  }, [theme]);

  // Title animation — swap every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % TITLE_VARIANTS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Tagline rotation — swap every 5 seconds (offset from title)
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentSourceConfig = SOURCE_TYPES.find(s => s.key === sourceType)!;
  const isFileType = ["document", "image", "audio"].includes(sourceType);
  const isVedic = theme === "vedic";

  const handleVerify = () => {
    if (!onVerify) return;
    if (isFileType) {
      if (selectedFile) {
        onVerify({ type: sourceType, file: selectedFile });
      }
    } else {
      if (query.trim()) {
        onVerify({ type: sourceType, query: query.trim() });
      }
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSourceChange = (key: string) => {
    setSourceType(key);
    setSelectedFile(null);
    setQuery("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'vedic';
      return 'dark';
    });
    setShowSettings(false);
  };

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Flame;
  const themeLabel = theme === 'dark' ? 'Dark Theme' : theme === 'light' ? 'Light Theme' : 'Vedic Theme';
  const ThemeIcon = themeIcon;

  /* ─── Theme-aware colors ─── */
  const accentColor = isVedic ? "#D97706" : "#3B82F6";
  const accentColorLight = isVedic ? "#F59E0B" : "#60A5FA";
  const accentGradient = isVedic
    ? "linear-gradient(135deg, #D97706 0%, #B45309 100%)"
    : "linear-gradient(135deg, #2563EB 0%, #0891B2 100%)";
  const accentGlow = isVedic
    ? "0 4px 20px rgba(217,119,6,0.4)"
    : "0 4px 20px rgba(37,99,235,0.4)";
  const bgColor = isVedic ? "#1A120B" : "#080C14";
  const surfaceBg = isVedic ? "rgba(37,26,16,0.8)" : "rgba(13,19,32,0.8)";

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: bgColor }}
    >
      {/* Settings Header */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-10 z-[100]">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.02)] relative"
          style={{ backdropFilter: "blur(10px)" }}
        >
          <Settings size={20} className="text-slate-300" />
        </button>
        
        {showSettings && (
           <motion.div 
             initial={{ opacity: 0, y: -10, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             className="absolute right-0 mt-3 w-64 rounded-2xl border shadow-2xl overflow-hidden"
             style={{ background: isVedic ? "rgba(37,26,16,0.95)" : "rgba(13,19,32,0.85)", borderColor: isVedic ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
           >
              <div className="p-4 border-b bg-white/[0.02]" style={{ borderColor: isVedic ? "rgba(217,119,6,0.1)" : "rgba(255,255,255,0.05)" }}>
                 <div className="font-semibold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Alex Researcher</div>
                 <div className="text-xs text-slate-400 mt-1" style={{ fontFamily: "var(--font-body)" }}>alex@praman.ai</div>
              </div>
              <div className="p-2 space-y-1" style={{ fontFamily: "var(--font-body)" }}>
                 <button onClick={cycleTheme} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-slate-300 transition-colors text-sm">
                   <div className="flex items-center gap-3">
                     <ThemeIcon size={16} style={{ color: isVedic ? "#F59E0B" : theme === 'dark' ? "#60A5FA" : "#F59E0B" }} />
                     <span>{themeLabel}</span>
                   </div>
                   <div className="w-8 h-4 rounded-full relative transition-colors" style={{ background: isVedic ? "rgba(217,119,6,0.2)" : theme === 'dark' ? "rgba(59,130,246,0.2)" : "rgba(245,158,11,0.2)" }}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full shadow-sm transition-all ${theme === 'vedic' ? 'right-0.5 bg-amber-500' : theme === 'dark' ? 'right-0.5 bg-blue-400' : 'left-0.5 bg-amber-400'}`} />
                   </div>
                 </button>
                 <button onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-slate-300 hover:text-red-400 transition-colors text-sm group">
                   <LogOut size={16} className="text-slate-500 group-hover:text-red-400 transition-colors" />
                   <span>Sign Out</span>
                 </button>
              </div>
           </motion.div>
        )}
      </div>

      {/* Ambient background blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${isVedic ? "rgba(217,119,6,0.4)" : "rgba(59,130,246,0.4)"} 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${isVedic ? "rgba(180,83,9,0.4)" : "rgba(99,102,241,0.4)"} 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-10"
          style={{ background: `radial-gradient(ellipse, ${isVedic ? "rgba(245,158,11,0.5)" : "rgba(6,182,212,0.5)"} 0%, transparent 70%)`, filter: "blur(50px)" }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, ${bgColor} 100%)` }} />
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[
          { top: "15%", left: "8%", size: 6, delay: 0, color: isVedic ? "#D97706" : "#3B82F6" },
          { top: "30%", left: "92%", size: 4, delay: 1.5, color: isVedic ? "#F59E0B" : "#06B6D4" },
          { top: "70%", left: "5%", size: 5, delay: 0.8, color: isVedic ? "#B45309" : "#818CF8" },
          { top: "80%", left: "88%", size: 3, delay: 2, color: isVedic ? "#D97706" : "#3B82F6" },
          { top: "20%", left: "75%", size: 7, delay: 0.4, color: isVedic ? "#F59E0B" : "#06B6D4" },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              top: orb.top, left: orb.left,
              width: orb.size * 2, height: orb.size * 2,
              background: orb.color, boxShadow: `0 0 ${orb.size * 4}px ${orb.color}`,
            }}
            animate={{ y: [0, -16, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 4 + orb.delay, repeat: Infinity, ease: "easeInOut", delay: orb.delay }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        style={{ opacity, y }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col items-center text-center"
      >
        {/* Top badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColorLight, letterSpacing: "0.15em" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColorLight, boxShadow: `0 0 6px ${accentColorLight}` }} />
            AI-Powered Fact Verification Engine
          </span>
        </motion.div>

        {/* ─── ANIMATED TITLE ─── */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="mb-5 h-[1.2em]" style={{ fontSize: "clamp(4rem, 10vw, 9rem)" }}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={titleIndex}
              initial={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="text-7xl sm:text-8xl md:text-9xl font-bold leading-none tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontSize: "inherit" }}
            >
              <span className="text-white">{TITLE_VARIANTS[titleIndex].main}</span>
              <span className={isVedic ? "gradient-text-gold" : "gradient-text"}>{TITLE_VARIANTS[titleIndex].accent}</span>
            </motion.h1>
          </AnimatePresence>
        </motion.div>

        {/* ─── ROTATING TAGLINES ─── */}
        <div className="mb-12 h-[4.5em] flex items-center justify-center max-w-3xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={taglineIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-center"
            >
              <p
                className="text-lg sm:text-xl leading-relaxed mb-1"
                style={{ fontFamily: "var(--font-body)", fontWeight: 400, color: isVedic ? "#FDE68A" : "#CBD5E1" }}
              >
                &ldquo;{TAGLINES[taglineIndex].hindi}&rdquo;
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontStyle: "italic", color: isVedic ? "#D4A373" : "#94A3B8" }}
              >
                ({TAGLINES[taglineIndex].english})
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Search Bar with Source Tags */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-4xl mb-10"
        >
          {/* Source Type Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {SOURCE_TYPES.map((src) => {
              const isActive = sourceType === src.key;
              const SrcIcon = src.icon;
              return (
                <motion.button
                  key={src.key}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSourceChange(src.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer"
                  style={{
                    background: isActive
                      ? isVedic
                        ? "linear-gradient(135deg, rgba(217,119,6,0.25) 0%, rgba(180,83,9,0.2) 100%)"
                        : "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(6,182,212,0.2) 100%)"
                      : "rgba(255,255,255,0.03)",
                    border: isActive
                      ? `1px solid ${isVedic ? "rgba(217,119,6,0.5)" : "rgba(59,130,246,0.5)"}`
                      : "1px solid rgba(255,255,255,0.08)",
                    color: isActive ? accentColorLight : "#94A3B8",
                    boxShadow: isActive ? `0 0 20px ${accentColor}25` : "none",
                  }}
                >
                  <SrcIcon size={15} />
                  <span style={{ fontFamily: "var(--font-body)" }}>{src.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Input Area */}
          <div
            className="relative rounded-2xl transition-all duration-300"
            style={{
              background: surfaceBg,
              border: (focused || dragActive)
                ? `1px solid ${accentColor}80`
                : `1px solid ${isVedic ? "rgba(217,119,6,0.12)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: (focused || dragActive)
                ? `0 0 0 4px ${accentColor}14, 0 20px 60px rgba(0,0,0,0.5)`
                : "0 20px 60px rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Text / URL input modes */}
            {!isFileType && (
              <>
                {sourceType === "url" ? (
                  /* URL mode — single line with inline layout */
                  <div className="flex items-center gap-3 px-5 py-4">
                    <Search size={20} style={{ color: focused ? accentColorLight : "#475569" }} className="transition-colors duration-200 flex-shrink-0" />
                    <input
                      type="url"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleVerify(); } }}
                      placeholder="Paste a URL to verify (e.g. https://example.com/article)..."
                      className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-base"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleVerify}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex-shrink-0"
                      style={{ background: accentGradient, boxShadow: accentGlow, fontFamily: "var(--font-display)" }}
                    >
                      Verify <ArrowRight size={15} />
                    </motion.button>
                  </div>
                ) : (
                  /* Text mode — textarea with absolute bottom bar */
                  <>
                    <div className="absolute left-5 top-5 pointer-events-none">
                      <Search size={20} style={{ color: focused ? accentColorLight : "#475569" }} className="transition-colors duration-200" />
                    </div>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleVerify(); }
                      }}
                      placeholder="Paste an article, text, or claim to verify facts..."
                      rows={3}
                      className="w-full bg-transparent pl-14 pr-6 pt-5 pb-14 text-slate-200 placeholder-slate-500 resize-none outline-none text-base leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 pb-4">
                      <span className="text-xs text-slate-600">
                        {query.length > 0 ? `${query.length} characters` : "Press Enter to verify"}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleVerify}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                        style={{ background: accentGradient, boxShadow: accentGlow, fontFamily: "var(--font-display)" }}
                      >
                        Verify <ArrowRight size={15} />
                      </motion.button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* File upload mode */}
            {isFileType && (
              <div
                className="p-6"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={currentSourceConfig.accept}
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload-input"
                />

                <AnimatePresence mode="wait">
                  {!selectedFile ? (
                    <motion.label
                      key="dropzone"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      htmlFor="file-upload-input"
                      className="flex flex-col items-center justify-center py-10 cursor-pointer rounded-xl transition-all duration-300"
                      style={{
                        border: `2px dashed ${dragActive ? `${accentColor}99` : "rgba(255,255,255,0.1)"}`,
                        background: dragActive ? `${accentColor}0D` : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <motion.div
                        animate={dragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                        className="p-4 rounded-2xl mb-4"
                        style={{ background: `${accentColor}18` }}
                      >
                        <Upload size={28} style={{ color: accentColorLight }} />
                      </motion.div>
                      <p className="text-slate-300 text-sm font-medium mb-1" style={{ fontFamily: "var(--font-body)" }}>
                        {dragActive ? "Drop your file here" : "Click to browse or drag & drop"}
                      </p>
                      <p className="text-slate-500 text-xs" style={{ fontFamily: "var(--font-body)" }}>
                        {sourceType === "document" && "Supports PDF, DOCX, DOC, TXT"}
                        {sourceType === "image" && "Supports JPG, PNG, GIF, WebP, BMP"}
                        {sourceType === "audio" && "Supports MP3, WAV, M4A, OGG, WebM, MP4"}
                      </p>
                    </motion.label>
                  ) : (
                    <motion.div
                      key="file-selected"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ background: `${accentColor}0F`, border: `1px solid ${accentColor}26` }}
                    >
                      <div className="p-3 rounded-xl" style={{ background: `${accentColor}18` }}>
                        <FileIcon size={22} style={{ color: accentColorLight }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>
                          {selectedFile.name}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                          {formatFileSize(selectedFile.size)} · {selectedFile.type || "unknown type"}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleVerify}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                        style={{ background: accentGradient, boxShadow: accentGlow, fontFamily: "var(--font-display)" }}
                      >
                        Verify <ArrowRight size={15} />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats badges */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {BADGES.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-slate-400"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isVedic ? "rgba(217,119,6,0.1)" : "rgba(255,255,255,0.06)"}` }}>
              <badge.icon size={14} style={{ color: accentColorLight }} />
              <span style={{ fontFamily: "var(--font-body)" }}>{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-slate-600 tracking-widest uppercase">Explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5"
          style={{ border: `1px solid ${isVedic ? "rgba(217,119,6,0.2)" : "rgba(255,255,255,0.1)"}` }}
        >
          <div className="w-1 h-2 rounded-full opacity-70" style={{ background: accentColor }} />
        </motion.div>
      </motion.div>
    </section>
  );
}
