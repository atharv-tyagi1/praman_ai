"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  ExternalLink,
  Shield,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { VerifyPayload } from "./Hero";
import DashboardLayout from "./DashboardLayout";
import KPICards from "./KPICards";
import VerdictCharts from "./VerdictCharts";
import ChatWidget from "./ChatWidget";

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

/* ─── Pipeline steps ─── */
const PIPELINE_STEPS = [
  { key: "preprocess", label: "Pre-processing", icon: FileText },
  { key: "extract", label: "Extracting Claims", icon: Search },
  { key: "research", label: "Researching", icon: Search },
  { key: "verdict", label: "Generating Verdicts", icon: Shield },
  { key: "report", label: "Final Report", icon: BarChart3 },
];

interface VerifyResultsProps {
  payload: VerifyPayload;
  onBack: () => void;
  history: { id: string; label: string; type: string; timestamp: Date }[];
  onNewVerification: (payload: VerifyPayload) => void;
}

export default function VerifyResults({ payload, onBack, history, onNewVerification }: VerifyResultsProps) {
  const [currentStep, setCurrentStep] = useState("");
  const [stepStatus, setStepStatus] = useState<Record<string, string>>({});
  const [stepDetails, setStepDetails] = useState<Record<string, any>>({});
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);
  const [urlMetadata, setUrlMetadata] = useState<any>(null);
  const [extractedClaims, setExtractedClaims] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"processing" | "report">("processing");
  const [aiDetected, setAiDetected] = useState<boolean | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const eventSourceRef = useRef<AbortController | null>(null);

  const queryLabel = payload.query || payload.file?.name || "Uploaded file";
  const sourceText = payload.query || "";

  useEffect(() => {
    const abortController = new AbortController();
    eventSourceRef.current = abortController;

    async function startVerification() {
      try {
        let response: Response;

        if (payload.type === "text" || payload.type === "url") {
          const isUrl = payload.type === "url" || /^https?:\/\//i.test((payload.query || "").trim());
          const body = isUrl ? { url: (payload.query || "").trim() } : { text: (payload.query || "").trim() };

          response = await fetch(`${API_URL}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: abortController.signal,
          });
        } else {
          const formData = new FormData();
          if (payload.file) formData.append("file", payload.file);
          formData.append("source_type", payload.type);

          response = await fetch(`${API_URL}/verify-upload`, {
            method: "POST",
            body: formData,
            signal: abortController.signal,
          });
        }

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const jsonResp = await response.json();
          if (jsonResp.error) { setError(jsonResp.error); setLoading(false); return; }
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEventType = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const currentData = line.slice(6).trim();
              try {
                const data = JSON.parse(currentData);

                if (currentEventType === "pipeline_step") {
                  const step = data.step;
                  const status = data.status;
                  setCurrentStep(step);
                  setStepStatus((prev) => ({ ...prev, [step]: status }));
                  if (data.detail) {
                    setStepDetails((prev) => ({ ...prev, [step]: data.detail }));
                    if (step === "preprocess" && status === "completed" && data.detail.url_metadata) {
                      setUrlMetadata(data.detail.url_metadata);
                    }
                    if (step === "extract" && status === "completed" && data.detail.claims) {
                      setExtractedClaims(data.detail.claims);
                    }
                  }
                } else if (currentEventType === "complete") {
                  setReport(data);
                  setLoading(false);
                  setActiveTab("report");
                } else if (currentEventType === "error") {
                  setError(data.message || "An error occurred");
                  setLoading(false);
                }
              } catch { /* skip */ }
              currentEventType = "";
            }
          }
        }
        setLoading(false);
      } catch (err: any) {
        if (err.name !== "AbortError") { setError(err.message || "Connection failed"); setLoading(false); }
      }
    }

    startVerification();
    return () => { abortController.abort(); };
  }, [payload]);

  // AI Detection — run after report is ready
  useEffect(() => {
    if (!report || !sourceText) return;

    async function detectAI() {
      try {
        const textToCheck = sourceText.slice(0, 3000); // limit length
        const res = await fetch(`${API_URL}/detect-ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToCheck }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          setAiDetected(data.result.is_ai_generated ?? false);
          setAiConfidence(data.result.ai_score ?? data.result.confidence ?? 0);
        }
      } catch {
        // AI detection failed silently — not critical
        setAiDetected(false);
        setAiConfidence(0);
      }
    }

    detectAI();
  }, [report, sourceText]);

  /* ─── Report data ─── */
  const overallAssessment = report?.overall_assessment || {};
  const credibility = overallAssessment.overall_credibility ?? 0;
  const credibilityPercent = Math.round(credibility * 100);
  const credibilityColor = credibilityPercent >= 70 ? "#4ADE80" : credibilityPercent >= 40 ? "#FBBF24" : "#F87171";
  const trueCount = overallAssessment.true_count ?? 0;
  const falseCount = overallAssessment.false_count ?? 0;
  const partialCount = overallAssessment.partial_count ?? 0;
  const unverifiableCount = overallAssessment.unverifiable_count ?? 0;
  const totalClaims = report?.verdicts?.length ?? 0;
  const reportReady = !!report && !loading;

  // Build report context string for chat
  const reportContext = report
    ? JSON.stringify({
        summary: overallAssessment.summary,
        credibility: credibilityPercent,
        totalClaims,
        trueCount,
        falseCount,
        partialCount,
        unverifiableCount,
        verdicts: report.verdicts?.map((v: any) => ({
          claim: v.claim_text,
          verdict: v.verdict,
          confidence: v.confidence,
          explanation: v.explanation,
        })),
        aiDetected,
        aiConfidence,
      })
    : "";

  const handleNewSource = (src: { type: string; query?: string; file?: File }) => {
    onNewVerification(src as VerifyPayload);
  };

  return (
    <DashboardLayout history={history} onBack={onBack}>
      {/* Dashboard Header */}
      <div
        className="sticky top-0 z-40 border-b px-6 py-4"
        style={{ background: "rgba(8,12,20,0.9)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Dashboard
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
              {queryLabel.slice(0, 100)}{queryLabel.length > 100 ? "..." : ""}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setActiveTab("processing")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === "processing" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              style={activeTab === "processing" ? { background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)" } : {}}
            >
              <span style={{ fontFamily: "var(--font-body)" }}>Processing</span>
            </button>
            <button
              onClick={() => reportReady && setActiveTab("report")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                reportReady
                  ? activeTab === "report" ? "text-white" : "text-slate-500 hover:text-slate-300"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              style={activeTab === "report" && reportReady ? { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" } : {}}
            >
              {reportReady ? <Unlock size={12} className="text-green-400" /> : <Lock size={12} />}
              <span style={{ fontFamily: "var(--font-body)" }}>Final Report</span>
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full ml-3" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Loader2 size={14} className="text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400" style={{ fontFamily: "var(--font-body)" }}>Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* ═══════════════ PROCESSING TAB ═══════════════ */}
          {activeTab === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Pipeline Progress */}
              <div className="p-6 rounded-2xl" style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-semibold text-slate-400 mb-4 tracking-wider uppercase" style={{ fontFamily: "var(--font-display)" }}>
                  Pipeline Progress
                </h2>
                <div className="flex flex-wrap gap-3">
                  {PIPELINE_STEPS.map((step) => {
                    const status = stepStatus[step.key];
                    const isActive = currentStep === step.key && loading;
                    const isCompleted = status === "completed";
                    const isReport = step.key === "report";
                    const isReportLocked = isReport && !reportReady;
                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                          isReport && reportReady ? "cursor-pointer" : ""
                        }`}
                        onClick={() => { if (isReport && reportReady) setActiveTab("report"); }}
                        style={{
                          background: isCompleted ? "rgba(74,222,128,0.08)" : isActive ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${isCompleted ? "rgba(74,222,128,0.2)" : isActive ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)"}`,
                          color: isCompleted ? "#4ADE80" : isActive ? "#60A5FA" : isReportLocked ? "#334155" : "#64748B",
                        }}
                      >
                        {isActive ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 size={14} />
                        ) : isReportLocked ? (
                          <Lock size={14} />
                        ) : (
                          <StepIcon size={14} />
                        )}
                        <span style={{ fontFamily: "var(--font-body)" }}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
                {currentStep && stepDetails[currentStep] && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-slate-500" style={{ fontFamily: "var(--font-body)" }}>
                    {stepDetails[currentStep]?.message || JSON.stringify(stepDetails[currentStep])}
                  </motion.p>
                )}
              </div>

              {/* URL Metadata Preview */}
              {urlMetadata && urlMetadata.title && (
                <div
                  className="rounded-2xl overflow-hidden flex flex-col sm:flex-row group"
                  style={{ background: "rgba(13,19,32,0.8)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                >
                  {urlMetadata.image && (
                    <div className="w-full sm:w-56 h-40 sm:h-auto shrink-0 relative overflow-hidden bg-white/5">
                      <img src={urlMetadata.image} alt={urlMetadata.title} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col justify-center min-w-0 flex-1">
                    {urlMetadata.site_name && (
                      <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-1">{urlMetadata.site_name}</span>
                    )}
                    <h3 className="text-base font-bold text-white leading-tight mb-1 line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>{urlMetadata.title}</h3>
                    {urlMetadata.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{urlMetadata.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Extracted Claims */}
              {extractedClaims.length > 0 && (
                <div className="p-6 rounded-2xl" style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.1)" }}>
                      <Search size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>Extracted Claims</h2>
                      <p className="text-xs text-slate-500">{extractedClaims.length} verifiable claim{extractedClaims.length !== 1 ? "s" : ""} identified</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {extractedClaims.map((claim: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA" }}>
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-200 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{claim.claim_text}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-5 rounded-2xl" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <div className="flex items-center gap-3">
                    <XCircle size={20} className="text-red-400" />
                    <p className="text-red-300 text-sm" style={{ fontFamily: "var(--font-body)" }}>{error}</p>
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && !report && !error && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 rounded-2xl animate-pulse" style={{ background: "rgba(13,19,32,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="h-4 w-3/4 rounded bg-white/5 mb-3" />
                      <div className="h-3 w-1/2 rounded bg-white/5" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ FINAL REPORT TAB ═══════════════ */}
          {activeTab === "report" && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Source Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl"
                style={{ background: "rgba(13,19,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.1)" }}>
                    <BookOpen size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>Source Summary</h2>
                    <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "var(--font-body)" }}>Overview of the analyzed content</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                  {overallAssessment.summary || `Analyzed ${totalClaims} claims from the provided ${payload.type} source.`}
                </p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Source:</span>
                    <span className="text-xs text-slate-400 capitalize">{payload.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Claims found:</span>
                    <span className="text-xs text-white font-semibold">{totalClaims}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Accuracy:</span>
                    <span className="text-xs font-semibold" style={{ color: credibilityColor }}>{credibilityPercent}%</span>
                  </div>
                </div>
              </motion.div>

              {/* KPI Cards */}
              <KPICards
                totalClaims={totalClaims}
                trueCount={trueCount}
                falseCount={falseCount}
                partialCount={partialCount}
                unverifiableCount={unverifiableCount}
                overallCredibility={credibility}
                aiDetected={aiDetected}
                aiConfidence={aiConfidence}
              />

              {/* Charts */}
              <VerdictCharts
                trueCount={trueCount}
                falseCount={falseCount}
                partialCount={partialCount}
                unverifiableCount={unverifiableCount}
                verdicts={report.verdicts || []}
                overallCredibility={credibility}
              />

              {/* Claims Analysis */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase" style={{ fontFamily: "var(--font-display)" }}>
                    Claim-by-Claim Analysis ({totalClaims} claims)
                  </h2>
                </div>
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
                      <button
                        onClick={() => setExpandedClaim(isExpanded ? null : i)}
                        className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="mt-0.5 p-2 rounded-lg" style={{ background: style.bg }}>
                          <VerdictIcon size={18} style={{ color: style.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{v.claim_text}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                              {v.verdict}
                            </span>
                            <span className="text-xs text-slate-500">{Math.round((v.confidence || 0) * 100)}% confidence</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-500 mt-1" /> : <ChevronDown size={18} className="text-slate-500 mt-1" />}
                      </button>

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
                              <div>
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>Explanation</h4>
                                <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{v.explanation}</p>
                              </div>
                              {v.key_evidence && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>Key Evidence</h4>
                                  <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{v.key_evidence}</p>
                                </div>
                              )}
                              {v.sources && v.sources.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>Sources</h4>
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
                                          <p className="text-sm text-slate-300 font-medium truncate group-hover:text-blue-300 transition-colors">{src.title}</p>
                                          {src.relevance && <p className="text-xs text-slate-500 mt-0.5">{src.relevance}</p>}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Widget */}
      {reportReady && (
        <ChatWidget
          reportContext={reportContext}
          onNewSource={handleNewSource}
        />
      )}
    </DashboardLayout>
  );
}
