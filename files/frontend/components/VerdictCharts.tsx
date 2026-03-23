"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface VerdictChartsProps {
  trueCount: number;
  falseCount: number;
  partialCount: number;
  unverifiableCount: number;
  verdicts: any[];
  overallCredibility: number;
}

const COLORS = {
  True: "#4ADE80",
  False: "#F87171",
  "Partially True": "#FBBF24",
  Unverifiable: "#94A3B8",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg text-xs"
        style={{
          background: "rgba(13,19,32,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          fontFamily: "var(--font-body)",
        }}
      >
        <span style={{ color: payload[0].payload.fill || payload[0].color }}>
          {payload[0].name}: {payload[0].value}
        </span>
      </div>
    );
  }
  return null;
};

export default function VerdictCharts({
  trueCount,
  falseCount,
  partialCount,
  unverifiableCount,
  verdicts,
  overallCredibility,
}: VerdictChartsProps) {
  // Donut chart data
  const donutData = [
    { name: "True", value: trueCount, fill: COLORS.True },
    { name: "False", value: falseCount, fill: COLORS.False },
    { name: "Partial", value: partialCount, fill: COLORS["Partially True"] },
    { name: "Unverifiable", value: unverifiableCount, fill: COLORS.Unverifiable },
  ].filter((d) => d.value > 0);

  // Confidence bar chart data
  const confidenceData = verdicts.map((v: any, i: number) => ({
    name: `C${i + 1}`,
    confidence: Math.round((v.confidence || 0) * 100),
    fill: COLORS[v.verdict as keyof typeof COLORS] || COLORS.Unverifiable,
    fullName: v.claim_text?.slice(0, 40) + "...",
  }));

  const totalClaims = trueCount + falseCount + partialCount + unverifiableCount;
  const accuracyPercent = Math.round(overallCredibility * 100);
  const accuracyColor = accuracyPercent >= 70 ? "#4ADE80" : accuracyPercent >= 40 ? "#FBBF24" : "#F87171";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl"
        style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Verdict Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
              Breakdown by category
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(139,92,246,0.1)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            Donut
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-44 h-44 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center accuracy label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-2xl font-bold"
                style={{ color: accuracyColor, fontFamily: "var(--font-display)" }}
              >
                {accuracyPercent}%
              </motion.span>
              <span className="text-[10px] text-slate-500" style={{ fontFamily: "var(--font-body)" }}>
                Accuracy
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3 flex-1">
            {donutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="text-xs text-slate-400" style={{ fontFamily: "var(--font-body)" }}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {item.value}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    ({totalClaims > 0 ? Math.round((item.value / totalClaims) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Confidence Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl"
        style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Confidence per Claim
            </h3>
            <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
              Verification confidence levels
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(59,130,246,0.1)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            Bar
          </span>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748B" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#64748B" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Bar dataKey="confidence" radius={[4, 4, 0, 0]}>
                {confidenceData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
