"use client";

import { useState } from "react";
import Hero, { VerifyPayload } from "@/components/Hero";
import About from "@/components/About";
import Flow from "@/components/Flow";
import Features from "@/components/Features";
import Powers from "@/components/Powers";
import Footer from "@/components/Footer";
import VerifyResults from "@/components/VerifyResults";

interface HistoryItem {
  id: string;
  label: string;
  type: string;
  timestamp: Date;
}

export default function Home() {
  const [verifyPayload, setVerifyPayload] = useState<VerifyPayload | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleVerify = (payload: VerifyPayload) => {
    // Add to history
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      label: payload.query || payload.file?.name || "Uploaded file",
      type: payload.type,
      timestamp: new Date(),
    };
    setHistory((prev) => [newItem, ...prev]);
    setVerifyPayload(payload);
  };

  const handleNewVerification = (payload: VerifyPayload) => {
    // Save current report label to history (already there) and start new verification
    handleVerify(payload);
  };

  if (verifyPayload) {
    return (
      <VerifyResults
        payload={verifyPayload}
        onBack={() => setVerifyPayload(null)}
        history={history}
        onNewVerification={handleNewVerification}
      />
    );
  }

  return (
    <main className="bg-[#080C14] min-h-screen overflow-x-hidden">
      <Hero onVerify={handleVerify} />
      <About />
      <Flow />
      <Features />
      <Powers />
      <Footer />
    </main>
  );
}
