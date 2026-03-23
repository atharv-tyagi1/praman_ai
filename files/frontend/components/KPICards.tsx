"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, HelpCircle, Bot, UserCheck } from "lucide-react";

interface KPICardsProps {
  totalClaims: number;
  trueCount: number;
  falseCount: number;
  partialCount: number;
  unverifiableCount: number;
  overallCredibility: number;
  aiDetected: boolean | null;
  aiConfidence: number;
}

export default function KPICards({
  totalClaims,
  trueCount,
  falseCount,
  partialCount,
  unverifiableCount,
  overallCredibility,
  aiDetected,
  aiConfidence,
}: KPICardsProps) {
  const credibilityPercent = Math.round(overallCredibility * 100);
  const truePercent = totalClaims > 0 ? Math.round((trueCount / totalClaims) * 100) : 0;
  const falsePercent = totalClaims > 0 ? Math.round((falseCount / totalClaims) * 100) : 0;
  const unverifiedPercent = totalClaims > 0 ? Math.round(((unverifiableCount + partialCount) / totalClaims) * 100) : 0;
  const aiConfPercent = Math.round(aiConfidence * 100);

  const cards = [
    {
      label: "Total Claims",
      value: totalClaims,
      icon: CheckCircle2,
      iconBg: "rgba(59,130,246,0.15)",
      iconColor: "#60A5FA",
      badgeText: `${credibilityPercent}% credibility`,
      badgeColor: credibilityPercent >= 70 ? "#4ADE80" : credibilityPercent >= 40 ? "#FBBF24" : "#F87171",
      trend: credibilityPercent >= 50 ? "up" : "down",
      sparkColor: "#3B82F6",
    },
    {
      label: "True Claims",
      value: trueCount,
      icon: CheckCircle2,
      iconBg: "rgba(74,222,128,0.15)",
      iconColor: "#4ADE80",
      badgeText: `${truePercent}%`,
      badgeColor: "#4ADE80",
      trend: "up" as const,
      sparkColor: "#4ADE80",
    },
    {
      label: "False Claims",
      value: falseCount,
      icon: XCircle,
      iconBg: "rgba(248,113,113,0.15)",
      iconColor: "#F87171",
      badgeText: `${falsePercent}%`,
      badgeColor: "#F87171",
      trend: "down" as const,
      sparkColor: "#F87171",
    },
    {
      label: "Unverified",
      value: unverifiableCount + partialCount,
      icon: HelpCircle,
      iconBg: "rgba(148,163,184,0.15)",
      iconColor: "#94A3B8",
      badgeText: `${unverifiedPercent}%`,
      badgeColor: "#FBBF24",
      trend: "down" as const,
      sparkColor: "#FBBF24",
    },
    {
      label: "AI Detection",
      value: aiDetected === null ? "..." : aiDetected ? "AI" : "Human",
      icon: aiDetected ? Bot : UserCheck,
      iconBg: aiDetected === null ? "rgba(148,163,184,0.15)" : aiDetected ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)",
      iconColor: aiDetected === null ? "#94A3B8" : aiDetected ? "#F87171" : "#4ADE80",
      badgeText: aiDetected === null ? "Analyzing..." : `${aiConfPercent}% confidence`,
      badgeColor: aiDetected === null ? "#94A3B8" : aiDetected ? "#F87171" : "#4ADE80",
      trend: aiDetected ? "down" as const : "up" as const,
      sparkColor: aiDetected === null ? "#94A3B8" : aiDetected ? "#F87171" : "#4ADE80",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => {
        const CardIcon = card.icon;
        const TrendIcon = card.trend === "up" ? TrendingUp : TrendingDown;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
            className="p-5 rounded-2xl relative overflow-hidden group"
            style={{
              background: "rgba(13,19,32,0.7)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at 50% 50%, ${card.sparkColor}08, transparent 70%)` }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: card.iconBg }}>
                  <CardIcon size={18} style={{ color: card.iconColor }} />
                </div>
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: `${card.badgeColor}15`, color: card.badgeColor }}
                >
                  <TrendIcon size={12} />
                  {card.badgeText}
                </div>
              </div>

              <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {card.value}
              </div>
              <div className="text-xs text-slate-500" style={{ fontFamily: "var(--font-body)" }}>
                {card.label}
              </div>

              {/* Mini bar */}
              <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(parseInt(String(card.badgeText)) || 0, 5)}%` }}
                  transition={{ delay: 0.3 + 0.1 * i, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: card.sparkColor }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
