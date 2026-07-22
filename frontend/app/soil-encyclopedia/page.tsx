"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, ChevronRight, Sprout,
  Droplets, FlaskConical, AlertTriangle, Wheat,
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "@/lib/api";

interface SoilProtocol {
  description: string;
  suitable_crops: string[];
  irrigation_guidance: string;
  fertilization_guidance: string;
  risk_notes: string;
}

type SoilEncyclopedia = Record<string, SoilProtocol>;

// Matches the ai-soil model's class order (see ai-soil/app/main.py CLASS_NAMES)
const SOIL_ORDER = ["Alluvial soil", "Black Soil", "Clay soil", "Red soil"];

function InfoBlock({ icon, label, text, accent }: {
  icon: React.ReactNode; label: string; text: string; accent?: string;
}) {
  return (
    <div className="glass-tactical rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accent ?? "var(--accent)" }} className="shrink-0">{icon}</span>
        <p
          className="font-outfit text-[9px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      </div>
      <p className="text-xs font-plus-jakarta leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {text}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SoilEncyclopediaPage() {
  const [protocols, setProtocols] = useState<SoilEncyclopedia>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<SoilEncyclopedia>(`${API_BASE}/soil/encyclopedia`, { timeout: 5000 })
      .then((res) => {
        setProtocols(res.data);
        setSelected(SOIL_ORDER.find((s) => s in res.data) ?? Object.keys(res.data)[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const soilTypes = useMemo(() => {
    const known = Object.keys(protocols);
    const ordered = [
      ...SOIL_ORDER.filter((s) => known.includes(s)),
      ...known.filter((s) => !SOIL_ORDER.includes(s)),
    ];
    if (!search.trim()) return ordered;
    const q = search.toLowerCase();
    return ordered.filter((s) => s.toLowerCase().includes(q));
  }, [protocols, search]);

  const detail = selected ? protocols[selected] : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="mb-6 shrink-0">
        <p
          className="font-outfit text-[10px] font-semibold tracking-[0.2em] uppercase mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Soil Reference
        </p>
        <h1
          className="font-cinzel font-bold text-2xl lg:text-3xl tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          Soil Encyclopedia
        </h1>
        <p className="font-plus-jakarta text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
          Crop suitability, irrigation, and fertilization guidance for all soil types the AI Soil Scanner classifies
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[var(--text-muted)] animate-pulse font-outfit text-sm">
            <Sprout className="w-5 h-5" />
            Loading soil protocols...
          </div>
        </div>
      ) : (
        <div className="flex gap-5 flex-1 min-h-0">
          {/* ── Left: soil type list ── */}
          <div className="w-56 shrink-0 flex flex-col gap-2 min-h-0">
            <div className="relative shrink-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-plus-jakarta rounded-xl border outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-glass)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 pr-0.5">
              {soilTypes.map((name) => {
                const isSel = selected === name;
                return (
                  <button
                    key={name}
                    onClick={() => setSelected(name)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border transition-all"
                    style={{
                      backgroundColor: isSel ? "rgba(164,130,89,0.08)" : "transparent",
                      borderColor: isSel ? "rgba(164,130,89,0.28)" : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-plus-jakarta font-medium text-[12px] truncate"
                        style={{ color: isSel ? "var(--text-primary)" : "var(--text-secondary)" }}
                      >
                        {name}
                      </span>
                      {isSel && <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--accent)" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: soil detail ── */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-4">
            <AnimatePresence mode="wait">
              {selected && detail ? (
                <motion.div
                  key={selected}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-3"
                >
                  {/* Soil header */}
                  <div className="glass-tactical rounded-2xl p-5 shadow-float">
                    <h2
                      className="font-cinzel font-bold text-xl tracking-wide"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selected}
                    </h2>
                    <p className="font-plus-jakarta text-xs mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {detail.description}
                    </p>

                    {/* Suitable crops */}
                    <div className="flex items-center gap-1.5 mt-4 mb-2">
                      <Wheat className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                      <p
                        className="font-outfit text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Suitable Crops
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.suitable_crops.map((crop) => (
                        <span
                          key={crop}
                          className="text-[11px] font-plus-jakarta font-medium px-2.5 py-1 rounded-full border"
                          style={{
                            color: "var(--accent)",
                            backgroundColor: "rgba(164,130,89,0.08)",
                            borderColor: "rgba(164,130,89,0.22)",
                          }}
                        >
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Guidance blocks */}
                  <InfoBlock
                    icon={<Droplets className="w-4 h-4" />}
                    label="Irrigation Guidance"
                    text={detail.irrigation_guidance}
                    accent="#0ea5e9"
                  />
                  <InfoBlock
                    icon={<FlaskConical className="w-4 h-4" />}
                    label="Fertilization Guidance"
                    text={detail.fertilization_guidance}
                    accent="var(--accent)"
                  />
                  <InfoBlock
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="Risk Notes"
                    text={detail.risk_notes}
                    accent="var(--warning)"
                  />
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <BookOpen className="w-10 h-10 mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="font-cinzel text-sm tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Select a soil type to view guidance
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
