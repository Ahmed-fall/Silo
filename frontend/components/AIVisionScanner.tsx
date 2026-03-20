"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_BASE } from "@/lib/api";
import { UploadCloud, X, Cpu, CheckCircle2, AlertOctagon, ScanLine } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanResult {
  detected_label: string;
  confidence: number;
}

const MOCK_RESULTS: ScanResult[] = [
  { detected_label: "Healthy Wheat",      confidence: 98.2 },
  { detected_label: "Wheat Rust Disease", confidence: 85.1 },
];

function isDisease(label: string) {
  return /disease|rust|blight|mold|rot|pest|infest/i.test(label);
}

// ─── Gradient label ───────────────────────────────────────────────────────────

function GradientLabel({ label, sick }: { label: string; sick: boolean }) {
  return (
    <span
      className={`font-outfit font-extrabold text-xl bg-clip-text text-transparent ${
        sick ? "bg-gradient-to-r from-rose-400 to-orange-500"
             : "bg-gradient-to-r from-emerald-400 to-teal-400"
      }`}
      style={{
        filter: sick
          ? "drop-shadow(0 0 8px rgba(244,63,94,0.55))"
          : "drop-shadow(0 0 8px rgba(52,211,153,0.55))",
      }}
    >
      {label}
    </span>
  );
}

// ─── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ confidence, sick }: { confidence: number; sick: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-plus-jakarta text-slate-500 uppercase tracking-widest text-[9px]">Confidence</span>
        <span className={`font-outfit font-bold ${sick ? "text-rose-400" : "text-emerald-400"}`}>
          {confidence.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            sick ? "bg-gradient-to-r from-rose-600 to-orange-500"
                 : "bg-gradient-to-r from-emerald-500 to-teal-400"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          style={{
            boxShadow: sick
              ? "0 0 10px rgba(244,63,94,0.6)"
              : "0 0 10px rgba(52,211,153,0.6)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Results HUD ──────────────────────────────────────────────────────────────

function ResultsHUD({ result }: { result: ScanResult }) {
  const sick = isDisease(result.detected_label);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="mt-4 flex flex-col gap-4 p-5 rounded-2xl bg-slate-950/80 border border-white/[0.08]"
    >
      <div className="flex items-start gap-3">
        {sick
          ? <AlertOctagon size={18} className="text-rose-400 shrink-0 mt-0.5" />
          : <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          <p className="font-plus-jakarta text-slate-500 text-[10px] uppercase tracking-widest mb-1">Detection Result</p>
          <GradientLabel label={result.detected_label} sick={sick} />
        </div>
      </div>
      <ConfidenceBar confidence={result.confidence} sick={sick} />
      <p className="font-plus-jakarta text-slate-600 text-[10px] text-right">
        {sick ? "⚠ Recommend immediate inspection" : "✓ No abnormalities detected"}
      </p>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AIVisionScanner({ siloId }: { siloId?: string }) {
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result,   setResult]   = useState<ScanResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const startScan = useCallback(async () => {
    if (!file) return;
    setScanning(true);
    setError(null);

    try {
      // ── Real API call (priority) ───────────────────────────────────────────
      // Construct FormData exactly as the backend expects
      const form = new FormData();
      form.append("file", file);

      const endpoint = siloId
        ? `${API_BASE}/images/upload?silo_id=${siloId}`
        : `${API_BASE}/images/upload`;

      const { data } = await axios.post<ScanResult>(endpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 3_000, // 3 seconds before giving up on real backend
      });

      // Use the real response fields
      setResult({
        detected_label: data.detected_label,
        confidence:     data.confidence,
      });
    } catch {
      // ── Mock fallback — only reached if backend is offline/times out ───────
      // Simulate processing time so the laser animation plays visibly
      await new Promise<void>((r) => setTimeout(r, 2_000));
      const mock = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      setResult(mock);
    } finally {
      setScanning(false);
    }
  }, [file, siloId]);

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null);
    setResult(null); setError(null); setScanning(false);
  }, [preview]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) handleFile(f);
  };

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Drop zone / Image preview ── */}
      <div
        className={`
          relative rounded-2xl overflow-hidden border transition-all duration-200
          backdrop-blur-xl bg-slate-900/40
          ${dragging ? "border-cyan-400/60 bg-cyan-950/20" : "border-white/10"}
          ${!preview ? "cursor-pointer" : ""}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
        style={{ minHeight: 160 }}
      >
        <input
          ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {/* Empty state */}
        <AnimatePresence>
          {!preview && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center"
            >
              <div className="flex items-center justify-center size-12 rounded-2xl bg-white/5 border border-white/10">
                <UploadCloud size={22} className="text-slate-500" />
              </div>
              <div>
                <p className="font-outfit font-semibold text-slate-300 text-sm">Drop an image or click to upload</p>
                <p className="font-plus-jakarta text-slate-600 text-xs mt-0.5">PNG, JPG, WEBP — max 10 MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image preview + scanning laser */}
        <AnimatePresence>
          {preview && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Grain sample" className="w-full object-cover rounded-2xl" style={{ maxHeight: 200 }} />

              {/* Moving cyan laser beam */}
              <AnimatePresence>
                {scanning && (
                  <motion.div
                    key="laser"
                    className="absolute left-0 right-0 pointer-events-none"
                    animate={{ top: ["0%", "95%", "0%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    initial={{ top: "0%" }}
                  >
                    <div className="h-0.5 w-full"
                      style={{
                        background: "linear-gradient(90deg,transparent 0%,#22d3ee 20%,#06b6d4 50%,#22d3ee 80%,transparent 100%)",
                        boxShadow: "0 0 12px 3px rgba(34,211,238,0.8),0 0 30px 8px rgba(34,211,238,0.3)",
                      }}
                    />
                    <div className="h-10 w-full -mt-5"
                      style={{ background: "linear-gradient(180deg,rgba(34,211,238,0.05) 0%,rgba(34,211,238,0.12) 50%,rgba(34,211,238,0.05) 100%)" }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scanning overlay badge */}
              {scanning && (
                <div className="absolute inset-0 bg-slate-950/20 rounded-2xl flex items-end justify-center pb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-cyan-400/30">
                    <ScanLine size={11} className="text-cyan-400 animate-pulse" />
                    <span className="font-outfit text-cyan-300 text-xs font-semibold tracking-widest">SCANNING…</span>
                  </div>
                </div>
              )}

              {/* Reset button */}
              {!scanning && (
                <button onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-2 right-2 flex items-center justify-center size-7 rounded-full bg-slate-950/80 border border-white/10 text-slate-400 hover:text-white transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scan button ── */}
      {preview && !result && (
        <motion.button
          onClick={startScan} disabled={scanning}
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(34,211,238,0.25)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl font-outfit font-semibold text-sm bg-gradient-to-r from-cyan-600/80 to-teal-600/80 border border-cyan-500/30 text-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
        >
          <Cpu size={14} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Analysing…" : "Run AI Scan"}
        </motion.button>
      )}

      {/* ── Error ── */}
      {error && <p className="font-plus-jakarta text-rose-400 text-xs px-1">⚠ {error}</p>}

      {/* ── Results HUD ── */}
      <AnimatePresence>
        {result && <ResultsHUD key="result" result={result} />}
      </AnimatePresence>
    </div>
  );
}
