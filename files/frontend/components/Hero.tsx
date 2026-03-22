"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, ArrowRight, ShieldCheck, Zap, Globe, Settings, LogOut, Moon, Sun } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, label: "98.4% Accuracy" },
  { icon: Zap, label: "< 3s Verification" },
  { icon: Globe, label: "50+ Sources" },
];

interface HeroProps {
  onVerify?: (query: string) => void;
}

export default function Hero({ onVerify }: HeroProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, -60]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const handleVerify = () => {
    if (query.trim() && onVerify) {
      onVerify(query.trim());
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
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
             style={{ background: "rgba(13,19,32,0.85)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
           >
              {/* User profile section */}
              <div className="p-4 border-b bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                 <div className="font-semibold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Alex Researcher</div>
                 <div className="text-xs text-slate-400 mt-1" style={{ fontFamily: "var(--font-body)" }}>alex@praman.ai</div>
              </div>
              
              {/* Options */}
              <div className="p-2 space-y-1" style={{ fontFamily: "var(--font-body)" }}>
                 <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowSettings(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-slate-300 transition-colors text-sm">
                   <div className="flex items-center gap-3">
                     {theme === 'dark' ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-amber-400" />}
                     <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
                   </div>
                   <div className="w-8 h-4 rounded-full relative transition-colors" style={{ background: theme === 'dark' ? "rgba(59,130,246,0.2)" : "rgba(245,158,11,0.2)" }}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full shadow-sm transition-all ${theme === 'dark' ? 'right-0.5 bg-blue-400' : 'left-0.5 bg-amber-400'}`} />
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
        {/* Top-left blob */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Top-right blob */}
        <div
          className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Bottom center blob */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-10"
          style={{
            background:
              "radial-gradient(ellipse, rgba(6,182,212,0.5) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial fade over grid */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, #080C14 100%)",
          }}
        />
      </div>

      {/* Floating orb decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[
          { top: "15%", left: "8%", size: 6, delay: 0, color: "#3B82F6" },
          { top: "30%", left: "92%", size: 4, delay: 1.5, color: "#06B6D4" },
          { top: "70%", left: "5%", size: 5, delay: 0.8, color: "#818CF8" },
          { top: "80%", left: "88%", size: 3, delay: 2, color: "#3B82F6" },
          { top: "20%", left: "75%", size: 7, delay: 0.4, color: "#06B6D4" },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size * 2,
              height: orb.size * 2,
              background: orb.color,
              boxShadow: `0 0 ${orb.size * 4}px ${orb.color}`,
            }}
            animate={{ y: [0, -16, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{
              duration: 4 + orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: orb.delay,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        style={{ opacity, y }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col items-center text-center"
      >
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: "#60A5FA",
              letterSpacing: "0.15em",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              style={{ boxShadow: "0 0 6px #60A5FA" }}
            />
            AI-Powered Fact Verification Engine
          </span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-5"
        >
          <h1
            className="text-7xl sm:text-8xl md:text-9xl font-bold leading-none tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="text-white">Praman</span>
            <span className="gradient-text"> AI</span>
          </h1>
        </motion.div>

        {/* Sub headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-400 max-w-3xl mb-12 leading-relaxed"
          style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}
        >
          The AI detective that{" "}
          <span className="text-slate-200 font-medium">
            instantly verifies facts
          </span>
          , exposes misinformation, and builds trust — powered by real-time evidence.
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-4xl mb-10"
        >
          <div
            className="relative rounded-2xl transition-all duration-300"
            style={{
              background: "rgba(13,19,32,0.8)",
              border: focused
                ? "1px solid rgba(59,130,246,0.5)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: focused
                ? "0 0 0 4px rgba(59,130,246,0.08), 0 20px 60px rgba(0,0,0,0.5)"
                : "0 20px 60px rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Search icon */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search
                size={20}
                style={{ color: focused ? "#60A5FA" : "#475569" }}
                className="transition-colors duration-200"
              />
            </div>

            {/* Textarea */}
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleVerify();
                }
              }}
              placeholder="Paste an article, text, or URL to verify facts..."
              rows={3}
              className="w-full bg-transparent pl-14 pr-6 pt-5 pb-14 text-slate-200 placeholder-slate-500 resize-none outline-none text-base leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            />

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 pb-4">
              <span className="text-xs text-slate-600">
                {query.length > 0 ? `${query.length} characters` : "Press Enter to verify"}
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleVerify}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #0891B2 100%)",
                  boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Verify
                <ArrowRight size={15} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {BADGES.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-slate-400"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <badge.icon size={14} className="text-blue-400" />
              <span style={{ fontFamily: "var(--font-body)" }}>
                {badge.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-slate-600 tracking-widest uppercase">
          Explore
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5"
          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="w-1 h-2 rounded-full bg-blue-500 opacity-70" />
        </motion.div>
      </motion.div>
    </section>
  );
}
