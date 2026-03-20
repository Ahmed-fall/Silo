"use client";

import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api";
import {
  Upload,
  ScanLine,
  CheckCircle2,
  AlertOctagon,
  Loader2,
  ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanResult {
  detected_label: string;
  confidence: number; // 0–1
}

type ScanState = "idle" | "scanning" | "done" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Heuristic: "healthy" labels contain no disease keywords */
const DISEASE_KEYWORDS = [
  "mold", "mould", "fungus", "rot", "blight", "rust",
  "disease", "infected", "damage", "pest", "contamination",
];

function isDiseaseLabel(label: string): boolean {
  const l = label.toLowerCase();
  return DISEASE_KEYWORDS.some((kw) => l.includes(kw));
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({
  onFile,
  disabled,
}: {
  onFile: (f: File) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) onFile(file);
    },
    [onFile, disabled]
  );

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      animate={{
        borderColor: dragging
          ? "rgba(99,102,241,0.8)"
          : "rgba(51,65,85,0.8)",
        backgroundColor: dragging
          ? "rgba(99,102,241,0.06)"
          : "rgba(15,23,42,0.3)",
      }}
      transition={{ duration: 0.2 }}
      className="
        relative flex flex-col items-center justify-center gap-3
        rounded-xl border-2 border-dashed
        py-10 px-6 text-center cursor-pointer select-none
        transition-colors group
      "
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <motion.div
        animate={{ scale: dragging ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <ImageIcon
          size={36}
          className="text-slate-600 group-hover:text-indigo-400 transition-colors"
        />
      </motion.div>

      <div>
        <p className="text-slate-300 text-sm font-medium">
          {dragging ? "Release to scan" : "Drop an image or click to browse"}
        </p>
        <p className="text-slate-600 text-xs mt-0.5">PNG, JPG, WEBP up to 10 MB</p>
      </div>

      <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-indigo-900/30 border border-indigo-700/40">
        <ScanLine size={13} className="text-indigo-400" />
        <span className="text-indigo-300 text-xs font-medium">AI Vision Scan</span>
      </div>
    </motion.div>
  );
}

// ─── Scanning preview with laser ──────────────────────────────────────────────

function ScanningView({ previewUrl }: { previewUrl: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden aspect-video w-full bg-slate-900">
      {/* Preview image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt="Scanning preview"
        className="w-full h-full object-cover opacity-70"
      />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/60" />

      {/* Corner brackets — HUD feel */}
      {[
        "top-2 left-2 border-t-2 border-l-2",
        "top-2 right-2 border-t-2 border-r-2",
        "bottom-2 left-2 border-b-2 border-l-2",
        "bottom-2 right-2 border-b-2 border-r-2",
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-5 h-5 rounded-sm border-indigo-400 ${cls}`}
        />
      ))}

      {/* Scanning laser line */}
      <motion.div
        className="absolute left-0 right-0 h-[3px] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #818cf8 20%, #c7d2fe 50%, #818cf8 80%, transparent 100%)",
          boxShadow: "0 0 16px 4px rgba(129,140,248,0.7), 0 0 40px 10px rgba(99,102,241,0.3)",
        }}
        initial={{ top: "10%" }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{
          duration: 2.2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
        }}
      />

      {/* Scanning label */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
        <Loader2 size={13} className="animate-spin text-indigo-400" />
        <span className="text-indigo-300 text-xs tracking-widest uppercase font-medium">
          Analysing…
        </span>
      </div>
    </div>
  );
}

// ─── Results HUD ──────────────────────────────────────────────────────────────

function ResultsHUD({
  result,
  previewUrl,
  onReset,
}: {
  result: ScanResult;
  previewUrl: string;
  onReset: () => void;
}) {
  const isDisease = isDiseaseLabel(result.detected_label);
  const pct = Math.round(result.confidence * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Thumbnail */}
      <div className="relative rounded-xl overflow-hidden aspect-video w-full bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Scanned image"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent" />
        {/* Status icon overlay */}
        <div className="absolute top-3 right-3">
          {isDisease ? (
            <AlertOctagon size={24} className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          ) : (
            <CheckCircle2 size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          )}
        </div>
      </div>

      {/* Label */}
      <div
        className={`
          rounded-xl border px-4 py-3 flex items-center gap-3
          ${isDisease
            ? "border-rose-800/60 bg-rose-950/40"
            : "border-emerald-800/60 bg-emerald-950/40"
          }
        `}
      >
        {isDisease
          ? <AlertOctagon size={18} className="text-rose-400 shrink-0" />
          : <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
        }
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Detected</p>
          <p
            className={`font-space-grotesk font-bold text-base capitalize ${
              isDisease ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {result.detected_label}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-slate-400 text-xs uppercase tracking-widest">
            Confidence
          </span>
          <span
            className={`font-space-grotesk font-bold text-sm ${
              isDisease ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {pct}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isDisease
                ? "linear-gradient(90deg, #881337, #f43f5e)"
                : "linear-gradient(90deg, #065f46, #10b981)",
              boxShadow: isDisease
                ? "0 0 10px 2px rgba(244,63,94,0.5)"
                : "0 0 10px 2px rgba(52,211,153,0.5)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          />
        </div>
      </div>

      {/* Re-scan button */}
      <button
        onClick={onReset}
        className="
          flex items-center justify-center gap-2
          px-4 py-2.5 rounded-xl text-sm font-medium
          bg-slate-800 border border-slate-700 text-slate-300
          hover:bg-slate-700 hover:text-white
          transition-all active:scale-95
        "
      >
        <Upload size={14} />
        Scan Another Image
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIVisionScanner({ siloId }: { siloId: string }) {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    // Create local preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanState("scanning");
    setResult(null);
    setErrorMsg(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await axios.post<ScanResult>(
        `${API_BASE}/images/upload?silo_id=${encodeURIComponent(siloId)}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setResult(data);
      setScanState("done");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail ?? err.message)
        : "Upload failed";
      setErrorMsg(msg as string);
      setScanState("error");
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg(null);
    setScanState("idle");
  }

  return (
    <AnimatePresence mode="wait">
      {scanState === "idle" && (
        <motion.div
          key="drop"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <DropZone onFile={handleFile} disabled={false} />
        </motion.div>
      )}

      {scanState === "scanning" && previewUrl && (
        <motion.div
          key="scan"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ScanningView previewUrl={previewUrl} />
        </motion.div>
      )}

      {scanState === "done" && result && previewUrl && (
        <motion.div
          key="result"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <ResultsHUD result={result} previewUrl={previewUrl} onReset={reset} />
        </motion.div>
      )}

      {scanState === "error" && (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-3 py-8 text-center"
        >
          <AlertOctagon size={32} className="text-rose-500" />
          <p className="text-rose-300 text-sm font-medium">Scan failed</p>
          <p className="text-slate-500 text-xs">{errorMsg}</p>
          <button
            onClick={reset}
            className="
              mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm
              bg-slate-800 border border-slate-700 text-slate-300
              hover:bg-slate-700 transition-all active:scale-95
            "
          >
            <Upload size={13} /> Try Again
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
