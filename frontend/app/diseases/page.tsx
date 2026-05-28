"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, ChevronRight, ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import axios from "axios";
import { API_BASE } from "@/lib/api";

interface TreatmentTier {
  tier: number;
  confidence_min: number;
  confidence_max: number;
  severity_label: string;
  treatment: string;
  duration: string;
  precautions: string[];
}

type AllProtocols = Record<string, TreatmentTier[]>;

const DISEASE_ORDER = [
  "Healthy Wheat",
  "Aphid", "Black Rust", "Blast", "Brown Rust",
  "Fusarium Head Blight", "Leaf Blight", "Mildew",
  "Mite", "Septoria", "Smut", "Stem fly",
  "Tan spot", "Yellow Rust",
];

function tierColors(tier: number) {
  if (tier <= 3) return { text: "var(--accent)", bg: "rgba(164,130,89,0.08)", border: "rgba(164,130,89,0.22)" };
  if (tier <= 7) return { text: "var(--warning)", bg: "rgba(193,122,43,0.08)", border: "rgba(193,122,43,0.22)" };
  return { text: "var(--alert)", bg: "rgba(201,48,71,0.08)", border: "rgba(201,48,71,0.22)" };
}

// ── Tier row ──────────────────────────────────────────────────────────────────
function TierRow({ tier, expanded, onToggle }: {
  tier: TreatmentTier;
  expanded: boolean;
  onToggle: () => void;
}) {
  const c = tierColors(tier.tier);
  return (
    <div className="glass-tactical rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(164,130,89,0.03)] transition-colors"
      >
        <span
          className="shrink-0 text-[10px] font-outfit font-bold w-6 h-6 flex items-center justify-center rounded-full"
          style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
        >
          {tier.tier}
        </span>

        <span className="text-[11px] font-outfit text-[var(--text-muted)] w-16 shrink-0 tabular-nums">
          {tier.confidence_min}–{tier.confidence_max}%
        </span>

        <span className="text-xs font-semibold font-outfit flex-1 text-left" style={{ color: c.text }}>
          {tier.severity_label}
        </span>

        <span className="text-[11px] font-plus-jakarta text-[var(--text-muted)] shrink-0 mr-2 hidden sm:block">
          {tier.duration}
        </span>

        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
          : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-2"
              style={{ borderTop: "1px solid rgba(164,130,89,0.10)" }}
            >
              <p className="text-xs text-[var(--text-secondary)] font-plus-jakarta leading-relaxed mb-3">
                {tier.treatment}
              </p>

              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] font-outfit">
                  Duration:
                </span>
                <span className="text-[11px] font-plus-jakarta font-medium text-[var(--text-secondary)]">
                  {tier.duration}
                </span>
              </div>

              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 font-outfit">
                Precautions
              </p>
              <ul className="flex flex-col gap-1">
                {tier.precautions.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)] font-plus-jakarta">
                    <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: c.text }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DiseasesPage() {
  const [protocols, setProtocols] = useState<AllProtocols>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);

  useEffect(() => {
    axios
      .get<AllProtocols>(`${API_BASE}/treatments/all`, { timeout: 5000 })
      .then((res) => {
        setProtocols(res.data);
        setSelected("Aphid");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const diseases = useMemo(() => {
    const ordered = DISEASE_ORDER.filter((d) => d in protocols);
    if (!search.trim()) return ordered;
    const q = search.toLowerCase();
    return ordered.filter((d) => d.toLowerCase().includes(q));
  }, [protocols, search]);

  const tiers = selected ? (protocols[selected] ?? []) : [];
  const isHealthy = selected === "Healthy Wheat";

  const handleSelect = (name: string) => {
    setSelected(name);
    setExpandedTier(null);
  };

  const toggleTier = (n: number) => setExpandedTier((prev) => (prev === n ? null : n));

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="mb-6 shrink-0">
        <p
          className="font-outfit text-[10px] font-semibold tracking-[0.2em] uppercase mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Treatment Reference
        </p>
        <h1
          className="font-cinzel font-bold text-2xl lg:text-3xl tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          Disease Encyclopedia
        </h1>
        <p className="font-plus-jakarta text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
          Complete treatment protocols for all 14 monitored wheat pathogens — 10 confidence tiers each
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[var(--text-muted)] animate-pulse font-outfit text-sm">
            <FlaskConical className="w-5 h-5" />
            Loading protocols...
          </div>
        </div>
      ) : (
        <div className="flex gap-5 flex-1 min-h-0">
          {/* ── Left: disease list ── */}
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
              {diseases.map((name) => {
                const isSel = selected === name;
                const healthy = name === "Healthy Wheat";
                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
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
                    <span
                      className="inline-block mt-1 text-[8px] font-outfit font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                      style={healthy
                        ? { backgroundColor: "rgba(164,130,89,0.1)", color: "var(--accent)" }
                        : { backgroundColor: "rgba(201,48,71,0.07)", color: "var(--alert)" }
                      }
                    >
                      {healthy ? "Healthy" : "Pathogen"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: tier detail ── */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-4">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Disease header */}
                  <div
                    className="glass-tactical rounded-2xl p-5 mb-4 shadow-float"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2
                          className="font-cinzel font-bold text-xl tracking-wide"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {selected}
                        </h2>
                        <p className="font-plus-jakarta text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {isHealthy
                            ? "No active pathogen — tiers reflect routine monitoring intensity."
                            : `${tiers.length} confidence tiers · 0–100% detection range · escalating treatment protocols`
                          }
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-[10px] font-outfit font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border"
                        style={isHealthy
                          ? { color: "var(--accent)", borderColor: "rgba(164,130,89,0.3)", backgroundColor: "rgba(164,130,89,0.06)" }
                          : { color: "var(--alert)", borderColor: "rgba(201,48,71,0.28)", backgroundColor: "rgba(201,48,71,0.06)" }
                        }
                      >
                        {isHealthy ? "Healthy" : "Pathogen"}
                      </span>
                    </div>

                    {/* Tier severity strip */}
                    <div className="flex mt-4 rounded-lg overflow-hidden h-2">
                      {tiers.map((t) => (
                        <div
                          key={t.tier}
                          className="flex-1 cursor-pointer transition-opacity hover:opacity-80"
                          title={`Tier ${t.tier}: ${t.severity_label}`}
                          style={{
                            backgroundColor: t.tier <= 3
                              ? "var(--accent)"
                              : t.tier <= 7
                                ? "var(--warning)"
                                : "var(--alert)",
                            opacity: expandedTier === t.tier ? 1 : 0.5,
                          }}
                          onClick={() => toggleTier(t.tier)}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 px-0.5">
                      <span className="text-[9px] font-outfit text-[var(--text-muted)]">0% — Negligible</span>
                      <span className="text-[9px] font-outfit text-[var(--text-muted)]">100% — Catastrophic</span>
                    </div>
                  </div>

                  {/* Tier rows */}
                  <div className="flex flex-col gap-1.5">
                    {tiers.map((t) => (
                      <TierRow
                        key={t.tier}
                        tier={t}
                        expanded={expandedTier === t.tier}
                        onToggle={() => toggleTier(t.tier)}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <BookOpen className="w-10 h-10 mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="font-cinzel text-sm tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Select a disease to view protocols
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
