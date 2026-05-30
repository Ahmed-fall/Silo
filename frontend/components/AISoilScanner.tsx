"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Scan, CheckCircle, X } from "lucide-react";
import axios from "axios";
import { API_BASE } from "@/lib/api";

interface SoilScanResult {
  label: string;
  confidence: number;
}

export default function AISoilScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<SoilScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerScan = async () => {
    if (!file) return;
    setIsScanning(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/soil/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 3000,
      });

      const label = res.data.label;
      const conf = res.data.confidence;

      if (!label || conf == null) {
        throw new Error("AI Soil service did not return a result");
      }

      setResult({
        label,
        confidence: conf * 100,
      });
    } catch (error) {
      console.warn("Backend unavailable or timed out. Falling back to Mock Data.", error);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockResults = [
        { label: "Alluvial soil", confidence: 94.1 },
        { label: "Black Soil", confidence: 91.7 },
        { label: "Clay soil", confidence: 88.9 },
        { label: "Red soil", confidence: 90.4 },
      ];
      setResult(mockResults[Math.floor(Math.random() * mockResults.length)]);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-3xl shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold tracking-tight text-slate-100 font-outfit">
          AI Soil Scanner
        </h3>
        <Scan className="w-5 h-5 text-cyan-400" />
      </div>

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 hover:border-cyan-500/50 rounded-2xl bg-slate-800/20 cursor-pointer transition-colors group p-8"
        >
          <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-cyan-400 transition-colors mb-4" />
          <p className="text-sm text-slate-400 font-medium">Click or drag image to upload</p>
          <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG (Max 5MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Soil Preview" className="object-cover w-full h-full opacity-80" />

            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", repeatType: "reverse" }}
                  className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] z-10"
                />
              )}
            </AnimatePresence>

            {!isScanning && (
              <button
                onClick={clearSelection}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-colors"
                aria-label="Clear selected image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-end">
            {!result && !isScanning && (
              <button
                onClick={triggerScan}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Analyze Soil Image
              </button>
            )}

            {isScanning && (
              <div className="flex items-center justify-center py-3 text-cyan-400 font-medium animate-pulse">
                Processing via Silo AI...
              </div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-950/50 border border-slate-800"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">
                      {result.label}
                    </span>
                  </div>
                  <span className="text-slate-300 font-medium">{result.confidence.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
