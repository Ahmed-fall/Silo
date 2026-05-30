"use client";

import AISoilScanner from "@/components/AISoilScanner";
import { motion } from "framer-motion";
import { ArrowLeft, Sprout } from "lucide-react";
import Link from "next/link";

export default function SoilAnalysisPage() {
  return (
    <div className="min-h-full flex flex-col gap-5 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="flex items-center justify-center size-9 rounded-xl glass-tactical transition-all shrink-0 mt-0.5 hover:scale-105"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="font-outfit font-extrabold text-2xl leading-tight" style={{ color: "var(--text-primary)" }}>
              Soil Analysis
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Sprout size={11} style={{ color: "var(--text-muted)" }} />
              <span className="font-plus-jakarta text-xs" style={{ color: "var(--text-secondary)" }}>
                Soil type classification from field imagery
              </span>
            </div>
          </div>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-6"
      >
        <div className="flex flex-col min-h-[30rem]">
          <div className="mb-2">
            <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>
              AI Soil Scanner
            </p>
            <p className="font-plus-jakarta text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              Upload a soil photo for type and confidence analysis
            </p>
          </div>
          <AISoilScanner />
        </div>
      </motion.section>
    </div>
  );
}
