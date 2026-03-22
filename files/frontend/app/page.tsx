"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Flow from "@/components/Flow";
import Features from "@/components/Features";
import Powers from "@/components/Powers";
import Footer from "@/components/Footer";
import VerifyResults from "@/components/VerifyResults";

export default function Home() {
  const [verifyQuery, setVerifyQuery] = useState<string | null>(null);

  if (verifyQuery) {
    return (
      <VerifyResults
        query={verifyQuery}
        onBack={() => setVerifyQuery(null)}
      />
    );
  }

  return (
    <main className="bg-[#080C14] min-h-screen overflow-x-hidden">
      <Hero onVerify={(q) => setVerifyQuery(q)} />
      <About />
      <Flow />
      <Features />
      <Powers />
      <Footer />
    </main>
  );
}
