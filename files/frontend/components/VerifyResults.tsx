"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Shield,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Verdict color map ─── */
const VERDICT_STYLES: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  True: { color: "#4ADE80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)", icon: CheckCircle2 },
  False: { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)", icon: XCircle },
  "Partially True": { color: "#FBBF24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", icon: AlertTriangle },
  Unverifiable: { color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", icon: HelpCircle },
};

function getVerdictStyle(verdict: string) {
  return VERDICT_STYLES[verdict] || VERDICT_STYLES["Unverifiable"];
}

/* ─── Step progress bar ─── */
const PIPELINE_STEPS = [
  { key: "preprocess", label: "Pre-processing", icon: FileText },
  { key: "extract", label: "Extracting Claims", icon: Search },
  { key: "research", label: "Researching", icon: Search },
  { key: "verdict", label: "Generating Verdicts", icon: Shield },
  { key: "report", label: "Final Report", icon: CheckCircle2 },
];

interface VerifyResultsProps {
  query: string;
  onBack: () => void;
}

export default function VerifyResults({ query, onBack }: VerifyResultsProps) {
  const [currentStep, setCurrentStep] = useState("");
  const [stepStatus, setStepStatus] = useState<Record<string, string>>({});
  const [stepDetails, setStepDetails] = useState<Record<string, any>>({});
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);
  const [urlMetadata, setUrlMetadata] = useState<any>(null);
  const [extractedClaims, setExtractedClaims] = useState<any[]>([]);
  const eventSourceRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    eventSourceRef.current = abortController;

    async function startVerification() {
      try {
        // Determine if input is URL or text
        const isUrl = /^https?:\/\//i.test(query.trim());
        const body = isUrl ? { url: query.trim() } : { text: query.trim() };

        const response = await fetch(`${API_URL}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEventType = "";
          let currentData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              currentData = line.slice(6).trim();

              try {
                const data = JSON.parse(currentData);

                if (currentEventType === "pipeline_step") {
                  const step = data.step;
                  const status = data.status;
                  setCurrentStep(step);
                  setStepStatus((prev) => ({ ...prev, [step]: status }));
                  if (data.detail) {
                    setStepDetails((prev) => ({ ...prev, [step]: data.detail }));
                    // Capture URL metadata from the preprocess completed event
                    if (step === "preprocess" && status === "completed" && data.detail.url_metadata) {
                      setUrlMetadata(data.detail.url_metadata);
                    }
                    // Capture extracted claims from the extract completed event
                    if (step === "extract" && status === "completed" && data.detail.claims) {
                      setExtractedClaims(data.detail.claims);
                    }
                  }
                } else if (currentEventType === "complete") {
                  setReport(data);
                  setLoading(false);
                } else if (currentEventType === "error") {
                  setError(data.message || "An error occurred");
                  setLoading(false);
                }
              } catch {
                // Skip non-JSON data lines
              }

              currentEventType = "";
              currentData = "";
            }
          }
        }

        setLoading(false);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Connection failed");
          setLoading(false);
        }
      }
    }

    startVerification();

    return () => {
      abortController.abort();
    };
  }, [query]);

  /* ─── Credibility gauge ─── */
  const credibility = report?.overall_assessment?.overall_credibility ?? 0;
  const credibilityPercent = Math.round(credibility * 100);
  const credibilityColor =
    credibilityPercent >= 70 ? "#4ADE80" : credibilityPercent >= 40 ? "#FBBF24" : "#F87171";

  return (
    <div className="min-h-screen bg-[#080C14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(8,12,20,0.9)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate" style={{ fontFamily: "var(--font-display)" }}>
              Verification Results
            </h1>
            <p className="text-xs text-slate-500 truncate" style={{ fontFamily: "var(--font-body)" }}>
              {query.slice(0, 120)}{query.length > 120 ? "..." : ""}
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Loader2 size={14} className="text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400" style={{ fontFamily: "var(--font-body)" }}>Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Pipeline progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl"
          style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-sm font-semibold text-slate-400 mb-4 tracking-wider uppercase" style={{ fontFamily: "var(--font-display)" }}>
            Pipeline Progress
          </h2>
          <div className="flex flex-wrap gap-3">
            {PIPELINE_STEPS.map((step, i) => {
              const status = stepStatus[step.key];
              const isActive = currentStep === step.key && loading;
              const isCompleted = status === "completed";
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300"
                  style={{
                    background: isCompleted ? "rgba(74,222,128,0.08)" : isActive ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isCompleted ? "rgba(74,222,128,0.2)" : isActive ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)"}`,
                    color: isCompleted ? "#4ADE80" : isActive ? "#60A5FA" : "#64748B",
                  }}
                >
                  {isActive ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <StepIcon size={14} />
                  )}
                  <span style={{ fontFamily: "var(--font-body)" }}>{step.label}</span>
                </div>
              );
            })}
          </div>
          {/* Step details */}
          {currentStep && stepDetails[currentStep] && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-xs text-slate-500"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {stepDetails[currentStep]?.message || JSON.stringify(stepDetails[currentStep])}
            </motion.p>
          )}
        </motion.div>

        {/* URL Metadata Preview */}
        <AnimatePresence>
          {urlMetadata && urlMetadata.title && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl overflow-hidden flex flex-col sm:flex-row group"
              style={{
                background: "rgba(13,19,32,0.8)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              {urlMetadata.image && (
                <div className="w-full sm:w-64 h-48 sm:h-auto shrink-0 relative overflow-hidden bg-white/5">
                  <img
                    src={urlMetadata.image}
                    alt={urlMetadata.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 border-r border-white/5" />
                </div>
              )}
              <div className="p-6 flex flex-col justify-center min-w-0 flex-1">
                {urlMetadata.site_name && (
                  <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-2" style={{ fontFamily: "var(--font-display)" }}>
                    {urlMetadata.site_name}
                  </span>
                )}
                <h3 className="text-lg font-bold text-white leading-tight mb-2 line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                  {urlMetadata.title}
                </h3>
                {urlMetadata.description && (
                  <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                    {urlMetadata.description}
                  </p>
                )}
                <a
                  href={query.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors w-max"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <ExternalLink size={12} />
                  <span>View Original Article</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extracted Claims Display */}
        <AnimatePresence>
          {extractedClaims.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl"
              style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(59,130,246,0.15)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.1)" }}>
                  <Search size={18} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    Extracted Claims
                  </h2>
                  <p className="text-xs text-slate-500" style={{ fontFamily: "var(--font-body)" }}>
                    {extractedClaims.length} verifiable claim{extractedClaims.length !== 1 ? "s" : ""} identified
                    {loading && currentStep !== "extract" && " · Now researching via Tavily..."}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {extractedClaims.map((claim: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i }}
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA" }}
                    >
                      {claim.id || i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                        {claim.claim_text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {claim.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
                            style={{ background: "rgba(139,92,246,0.1)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.2)" }}>
                            {claim.category}
                          </span>
                        )}
                        {claim.importance && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
                            style={{
                              background: claim.importance >= 4 ? "rgba(251,191,36,0.1)" : "rgba(148,163,184,0.1)",
                              color: claim.importance >= 4 ? "#FBBF24" : "#94A3B8",
                              border: `1px solid ${claim.importance >= 4 ? "rgba(251,191,36,0.2)" : "rgba(148,163,184,0.15)"}`,
                            }}>
                            Importance: {claim.importance}/5
                          </span>
                        )}
                      </div>
                      {claim.context && (
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                          {claim.context}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            <div className="flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <p className="text-red-300 text-sm" style={{ fontFamily: "var(--font-body)" }}>{error}</p>
            </div>
          </motion.div>
        )}

        {/* Report */}
        <AnimatePresence>
          {report && (
            <>
              {/* Overall Assessment Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl"
                style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Credibility gauge */}
                  <div className="relative flex-shrink-0">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke={credibilityColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${credibilityPercent * 3.14} 314`}
                        transform="rotate(-90 60 60)"
                        style={{ filter: `drop-shadow(0 0 8px ${credibilityColor})` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold" style={{ color: credibilityColor, fontFamily: "var(--font-display)" }}>
                        {credibilityPercent}%
                      </span>
                      <span className="text-xs text-slate-500">Credibility</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                      Overall Assessment
                    </h2>
                    <p className="text-sm text-slate-400 mb-4" style={{ fontFamily: "var(--font-body)" }}>
                      {report.overall_assessment?.summary}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "True", count: report.overall_assessment?.true_count ?? 0, color: "#4ADE80" },
                        { label: "False", count: report.overall_assessment?.false_count ?? 0, color: "#F87171" },
                        { label: "Partial", count: report.overall_assessment?.partial_count ?? 0, color: "#FBBF24" },
                        { label: "Unverifiable", count: report.overall_assessment?.unverifiable_count ?? 0, color: "#94A3B8" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                          style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}30` }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                          <span style={{ color: stat.color, fontFamily: "var(--font-body)" }}>
                            {stat.count} {stat.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Individual Verdicts */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase" style={{ fontFamily: "var(--font-display)" }}>
                  Claim-by-Claim Analysis ({report.verdicts?.length || 0} claims)
                </h2>
                {report.verdicts?.map((v: any, i: number) => {
                  const style = getVerdictStyle(v.verdict);
                  const VerdictIcon = style.icon;
                  const isExpanded = expandedClaim === i;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: "rgba(13,19,32,0.7)", border: `1px solid ${style.border}` }}
                    >
                      {/* Claim header */}
                      <button
                        onClick={() => setExpandedClaim(isExpanded ? null : i)}
                        className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="mt-0.5 p-2 rounded-lg" style={{ background: style.bg }}>
                          <VerdictIcon size={18} style={{ color: style.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                            {v.claim_text}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                              {v.verdict}
                            </span>
                            <span className="text-xs text-slate-500">
                              {Math.round((v.confidence || 0) * 100)}% confidence
                            </span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-500 mt-1" /> : <ChevronDown size={18} className="text-slate-500 mt-1" />}
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t overflow-hidden"
                            style={{ borderColor: "rgba(255,255,255,0.05)" }}
                          >
                            <div className="p-5 space-y-4">
                              {/* Explanation */}
                              <div>
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>
                                  Explanation
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                                  {v.explanation}
                                </p>
                              </div>

                              {/* Key Evidence */}
                              {v.key_evidence && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>
                                    Key Evidence
                                  </h4>
                                  <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                                    {v.key_evidence}
                                  </p>
                                </div>
                              )}

                              {/* Sources */}
                              {v.sources && v.sources.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>
                                    Sources
                                  </h4>
                                  <div className="space-y-2">
                                    {v.sources.map((src: any, j: number) => (
                                      <a
                                        key={j}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                                        style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                                      >
                                        <ExternalLink size={14} className="text-slate-500 group-hover:text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-sm text-slate-300 font-medium truncate group-hover:text-blue-300 transition-colors">
                                            {src.title}
                                          </p>
                                          {src.relevance && (
                                            <p className="text-xs text-slate-500 mt-0.5">{src.relevance}</p>
                                          )}
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && !report && !error && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-2xl animate-pulse"
                style={{ background: "rgba(13,19,32,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="h-4 w-3/4 rounded bg-white/5 mb-3" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
