"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  History,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Link,
  Image as ImageIcon,
  Mic,
  Clock,
} from "lucide-react";

interface HistoryItem {
  id: string;
  label: string;
  type: string;
  timestamp: Date;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  history: HistoryItem[];
  onBack: () => void;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: History, label: "History", active: false },
];

const TYPE_ICONS: Record<string, any> = {
  text: FileText,
  url: Link,
  document: FileText,
  image: ImageIcon,
  audio: Mic,
};

export default function DashboardLayout({ children, history, onBack }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#080C14] flex">
      {/* Left Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen z-50 flex flex-col border-r overflow-hidden"
        style={{
          background: "rgba(10,14,24,0.95)",
          borderColor: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #0891B2 100%)" }}
          >
            <Shield size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="min-w-0"
              >
                <h1 className="text-base font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Praman AI
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Fact Checker</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <div className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={item.label === "Dashboard" ? undefined : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                item.active
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
              style={item.active ? { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" } : {}}
            >
              <item.icon size={18} className={item.active ? "text-blue-400" : ""} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>

        {/* History Section */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-2 px-3 mb-3">
                  <Clock size={12} className="text-slate-600" />
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Recent</span>
                </div>
                <div className="space-y-1">
                  {history.length === 0 ? (
                    <p className="text-xs text-slate-600 px-3 py-2" style={{ fontFamily: "var(--font-body)" }}>
                      No history yet
                    </p>
                  ) : (
                    history.slice(0, 10).map((item) => {
                      const TypeIcon = TYPE_ICONS[item.type] || FileText;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/[0.03] transition-colors cursor-default"
                        >
                          <TypeIcon size={14} className="text-slate-600 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: "var(--font-body)" }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle */}
        <div className="px-3 pb-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors text-xs"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Back to Home */}
        <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={onBack}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft size={18} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontFamily: "var(--font-body)" }}>
                  Back to Home
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        animate={{ marginLeft: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 min-h-screen"
      >
        {children}
      </motion.main>
    </div>
  );
}
