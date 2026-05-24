"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  X, MapPin, Thermometer, Droplets, ShieldCheck,
  AlertTriangle, Flame, Cpu, ExternalLink, Globe, Activity,
  DatabaseZap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "medium" | "high";
type AIStatus = "healthy" | "warning" | "critical" | "scanning";

interface MapSilo {
  id: string;
  name: string;
  location: string;
  risk_level: RiskLevel;
  temperature?: number;
  humidity?: number;
  crop_type: string;
  fill_pct?: number;
  ai_status: AIStatus;
  /** Percentage of the map-container div */
  top: string;
  left: string;
}

interface ApiSilo {
  id: string;
  name: string;
  location: string;
  risk_level: string;
  temperature?: number;
  humidity?: number;
  crop_type: string;
  fill_pct?: number;
}

// ─── Risk / AI configs (STRICT LIGHT MODE: Turquoise / Bronze / Red) ─────────

const RISK_CFG: Record<RiskLevel, {
  dot: string; ring: string; badge: string; label: string;
  icon: React.ReactNode; drawerBorder: string; dur: number; border: string;
}> = {
  none: { dot: "#40E0D0", ring: "rgba(64,224,208,0.40)", badge: "glass-tactical", label: "Nominal", icon: <ShieldCheck size={11} style={{ color: "var(--accent)" }} />, drawerBorder: "from-[#40E0D0]/60 via-[#40E0D0]/15 to-transparent", dur: 2.8, border: "rgba(64,224,208,0.30)" },
  low: { dot: "#40E0D0", ring: "rgba(64,224,208,0.35)", badge: "glass-tactical", label: "Low Risk", icon: <ShieldCheck size={11} style={{ color: "var(--accent)" }} />, drawerBorder: "from-[#40E0D0]/50 via-[#40E0D0]/10 to-transparent", dur: 2.6, border: "rgba(64,224,208,0.30)" },
  medium: { dot: "#CD7F32", ring: "rgba(205,127,50,0.40)", badge: "glass-tactical", label: "Caution", icon: <AlertTriangle size={11} style={{ color: "var(--warning)" }} />, drawerBorder: "from-[#CD7F32]/60 via-[#CD7F32]/15 to-transparent", dur: 2.0, border: "rgba(205,127,50,0.25)" },
  high: { dot: "#E11D48", ring: "rgba(225,29,72,0.45)", badge: "glass-tactical", label: "Critical", icon: <Flame size={11} style={{ color: "var(--alert)" }} />, drawerBorder: "from-[#E11D48]/65 via-[#E11D48]/15 to-transparent", dur: 1.5, border: "rgba(225,29,72,0.25)" },
};

const AI_CFG: Record<AIStatus, { label: string; detail: string; color: string; bg: string; border: string }> = {
  healthy: { label: "All Clear", detail: "No pathogens or infestations detected.", color: "var(--accent)", bg: "var(--accent-subtle)", border: "var(--border-glass)" },
  warning: { label: "Anomaly Detected", detail: "Unclassified signature found. Review recommended.", color: "var(--warning)", bg: "rgba(205,127,50,0.08)", border: "rgba(205,127,50,0.25)" },
  critical: { label: "Infestation Confirmed", detail: "Aphid colony signatures confirmed. Quarantine active.", color: "var(--alert)", bg: "rgba(225,29,72,0.06)", border: "rgba(225,29,72,0.25)" },
  scanning: { label: "Scan In Progress", detail: "Model inference running — est. 42 s remaining.", color: "#6366f1", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.25)" },
};

// ─── Manual Calibration Coordinates (For max-w-4xl size) ───

const LOCATION_COORDS: Record<string, { top: string; left: string }> = {
  // ── الساحل الغربي / Western Coast ──
  "matrouh":       { top: "25%", left: "25%" },
  "marsamatruh":   { top: "25%", left: "25%" },

  // ── الدلتا والإسكندرية / Delta & Alexandria ──
  "alexandria":    { top: "10%", left: "42%" },
  "iskanderia":    { top: "10%", left: "42%" },
  "beheira":       { top: "22%", left: "42%" },
  "kafrelshiekh":  { top: "18%", left: "46%" },
  "gharbia":       { top: "21%", left: "46%" },
  "tanta":         { top: "21%", left: "46%" },
  "menoufia":      { top: "24%", left: "47%" },
  "dakahlia":      { top: "19%", left: "49%" },
  "mansoura":      { top: "19%", left: "49%" },

  // ── مدن القناة / Canal Cities ──
  "damietta":      { top: "16%", left: "51%" },
  "portsaid":      { top: "17%", left: "54%" },
  "ismailia":      { top: "22%", left: "55%" },
  "suez":          { top: "26%", left: "56%" },

  // ── القاهرة الكبرى / Greater Cairo ──
  "cairo":         { top: "26%", left: "49%" },
  "giza":          { top: "29%", left: "47%" },
  "helwan":        { top: "28%", left: "49%" },
  "qaliubiya":     { top: "24%", left: "49%" },
  "6thofoctober":  { top: "29%", left: "45%" },

  // ── سيناء / Sinai ──
  "northsinai":    { top: "20%", left: "62%" },
  "southsinai":    { top: "35%", left: "62%" },
  "sinai":         { top: "28%", left: "62%" },
  "sharmelsheikh": { top: "40%", left: "63%" },

  // ── الصعيد / Upper Egypt ──
  "fayoum":        { top: "32%", left: "46%" },
  "benisuef":      { top: "36%", left: "48%" },
  "minya":         { top: "43%", left: "46%" },
  "assiut":        { top: "52%", left: "49%" },
  "asyut":         { top: "52%", left: "49%" },
  "sohag":         { top: "58%", left: "52%" },
  "qena":          { top: "63%", left: "55%" },
  "luxor":         { top: "74%", left: "52%" },
  "alaqsor":       { top: "74%", left: "52%" },
  "aswan":         { top: "80%", left: "52%" },
  "aswangovernorate": { top: "80%", left: "52%" },

  // ── البحر الأحمر / Red Sea ──
  "redsea":        { top: "45%", left: "62%" },
  "hurghada":      { top: "42%", left: "61%" },
  "marsaalam":     { top: "60%", left: "66%" },

  // ── الوادي الجديد / New Valley ──
  "newvalley":     { top: "60%", left: "35%" },
  "wadi":          { top: "60%", left: "35%" },
};




// ─── Fuzzy coordinate resolver ────────────────────────────────────────────────

function getCoordinates(raw = ""): { top: string; left: string } {
  const norm = raw.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const keys = Object.keys(LOCATION_COORDS);

  // 1. Exact key match
  if (LOCATION_COORDS[norm]) return LOCATION_COORDS[norm];

  // 2. Key contains norm or norm contains key
  const sub = keys.find(k => norm.includes(k) || k.includes(norm));
  if (sub) return LOCATION_COORDS[sub];

  // 3. Word-level scan of original string
  for (const word of raw.toLowerCase().split(/[\s,.\-_]+/)) {
    const w = word.replace(/[^a-z]/g, "");
    if (w.length < 3) continue;
    const match = keys.find(k => k.includes(w) || w.includes(k));
    if (match) return LOCATION_COORDS[match];
  }

  // 4. Fallback with Jitter avoiding exact center overlap
  console.warn("⚠️ UNMAPPED LOCATION FROM DB:", raw);
  // Spread fallback nodes slightly with a jitter (e.g. 48% to 52%)
  const jitterTop = 48 + Math.random() * 4;
  const jitterLeft = 48 + Math.random() * 4;

  return { top: `${jitterTop.toFixed(1)}%`, left: `${jitterLeft.toFixed(1)}%` };
}

// ─── API transform ────────────────────────────────────────────────────────────

function apiToMap(s: ApiSilo): MapSilo {
  const raw = s.risk_level?.toLowerCase() ?? "none";
  const risk = (["none", "low", "medium", "high"].includes(raw) ? raw : "none") as RiskLevel;
  const ai: AIStatus = risk === "high" ? "critical" : risk === "medium" ? "warning" : "healthy";
  const coords = getCoordinates(s.location ?? s.name ?? "");
  return {
    id: s.id,
    name: s.name,
    location: s.location,
    risk_level: risk,
    temperature: s.temperature,
    humidity: s.humidity,
    crop_type: s.crop_type ?? "wheat",
    fill_pct: s.fill_pct,
    ai_status: ai,
    top: coords.top,
    left: coords.left,
  };
}

// ─── Pulse node ───────────────────────────────────────────────────────────────

function PulseNode({ silo, isSelected, onClick }: {
  silo: MapSilo; isSelected: boolean; onClick: () => void;
}) {
  const cfg = RISK_CFG[silo.risk_level];
  const DOT = isSelected ? 13 : 10;
  return (
    <motion.button
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none group z-10 hover:z-50"
      style={{ top: silo.top, left: silo.left }}
      whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      aria-label={`Select ${silo.name}`}
    >
      {/* Outer pulse ring */}
      <motion.span className="absolute rounded-full"
        style={{ inset: -(DOT / 2), backgroundColor: cfg.ring }}
        animate={{ scale: [1, 2.8, 1], opacity: [0.65, 0, 0.65] }}
        transition={{ duration: cfg.dur, repeat: Infinity, ease: "easeOut" }}
      />
      {/* Inner pulse ring (offset) */}
      <motion.span className="absolute rounded-full"
        style={{ inset: -(DOT / 2), backgroundColor: cfg.ring }}
        animate={{ scale: [1, 1.9, 1], opacity: [0.45, 0, 0.45] }}
        transition={{ duration: cfg.dur, repeat: Infinity, ease: "easeOut", delay: cfg.dur * 0.44 }}
      />
      {/* Core dot */}
      <motion.span
        className="relative block rounded-full z-10"
        style={{
          width: DOT, height: DOT, backgroundColor: cfg.dot,
          boxShadow: `0 0 ${isSelected ? 16 : 8}px ${cfg.dot}`,
          transition: "width .18s, height .18s, box-shadow .18s",
        }}
        animate={isSelected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Hover tooltip — white glass */}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 rounded-lg whitespace-nowrap font-outfit text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-glass)",
          color: "var(--text-primary)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        {silo.name}
      </span>
    </motion.button>
  );
}

// ─── Slide-over drawer ────────────────────────────────────────────────────────

function SiloDrawer({ silo, onClose }: {
  silo: MapSilo | null; onClose: () => void;
}) {
  const riskKey = silo ? RISK_CFG[silo.risk_level] : null;

  return (
    <AnimatePresence>
      {silo && riskKey && (
        <>
          {/* Backdrop */}
          <motion.div className="absolute inset-0 z-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ backgroundColor: "rgba(15,23,42,0.08)" }}
          />
          {/* Panel */}
          <motion.aside key={silo.id}
            className="absolute top-0 right-0 h-full w-full max-w-[22rem] z-30 flex"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            {/* Gradient border strip */}
            <div className={`w-[2.5px] shrink-0 bg-gradient-to-b ${riskKey.drawerBorder}`} />

            <div className="flex-1 flex flex-col overflow-hidden"
              style={{
                background: "var(--bg-elevated)",
                backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
                borderLeft: "1px solid var(--border-muted)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b shrink-0"
                style={{ borderColor: "var(--border-muted)" }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin size={10} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                    <span className="font-plus-jakarta text-[10px] tracking-wide uppercase truncate" style={{ color: "var(--text-secondary)" }}>{silo.location}</span>
                  </div>
                  <h2 className="font-outfit font-bold text-[1.15rem] leading-tight truncate" style={{ color: "var(--text-primary)" }}>{silo.name}</h2>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold font-outfit border glass-tactical`}
                      style={{ borderColor: riskKey.border, color: riskKey.dot }}
                    >
                      {riskKey.icon}{riskKey.label}
                    </span>
                    <span className="font-plus-jakarta text-[10px] capitalize" style={{ color: "var(--text-secondary)" }}>{silo.crop_type}</span>
                  </div>
                </div>
                <button onClick={onClose}
                  className="shrink-0 flex items-center justify-center size-8 rounded-xl border ml-3 transition-colors"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    borderColor: "var(--border-glass)",
                    color: "var(--text-secondary)",
                  }}
                  aria-label="Close drawer"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Sensor cards */}
                <div className="grid grid-cols-2 gap-3 p-5">
                  {[
                    {
                      icon: <Thermometer size={12} style={{ color: "#f59e0b" }} />,
                      label: "Temperature",
                      value: silo.temperature !== undefined && silo.temperature !== null ? `${silo.temperature.toFixed(1)}°C` : "--",
                      color: silo.temperature !== undefined && silo.temperature !== null ? (silo.temperature > 30 ? "var(--alert)" : silo.temperature > 26 ? "var(--warning)" : "var(--accent)") : "var(--text-muted)"
                    },
                    {
                      icon: <Droplets size={12} style={{ color: "#0ea5e9" }} />,
                      label: "Humidity",
                      value: silo.humidity !== undefined && silo.humidity !== null ? `${silo.humidity.toFixed(1)}%` : "--",
                      color: silo.humidity !== undefined && silo.humidity !== null ? (silo.humidity > 75 ? "var(--alert)" : silo.humidity > 65 ? "var(--warning)" : "#0ea5e9") : "var(--text-muted)"
                    },
                    {
                      icon: <Activity size={12} style={{ color: "#8b5cf6" }} />,
                      label: "Fill Level",
                      value: silo.fill_pct !== undefined && silo.fill_pct !== null ? `${silo.fill_pct}%` : "--",
                      color: silo.fill_pct !== undefined && silo.fill_pct !== null ? (silo.fill_pct > 80 ? "var(--alert)" : silo.fill_pct > 50 ? "var(--warning)" : "#8b5cf6") : "var(--text-muted)"
                    },
                    {
                      icon: <Globe size={12} style={{ color: "var(--accent)" }} />,
                      label: "Crop",
                      value: silo.crop_type,
                      color: "var(--text-primary)"
                    },
                  ].map(({ icon, label, value, color }) => (
                    <div key={label}
                      className="rounded-xl p-3.5 border"
                      style={{
                        backgroundColor: "var(--bg-base)",
                        borderColor: "var(--border-muted)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        {icon}
                        <span className="font-plus-jakarta text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</span>
                      </div>
                      <p className="font-outfit font-bold text-xl leading-none" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* AI Diagnostics */}
                <div className="px-5 pb-5">
                  <div className="rounded-xl p-4 border"
                    style={{
                      backgroundColor: AI_CFG[silo.ai_status].bg,
                      borderColor: AI_CFG[silo.ai_status].border,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Cpu size={12} style={{ color: AI_CFG[silo.ai_status].color }} />
                        <span className="font-outfit font-semibold text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>AI Vision Diagnostics</span>
                      </div>
                      <motion.span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: AI_CFG[silo.ai_status].color }}
                        animate={{ opacity: [1, 0.25, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                    <p className="font-outfit font-bold text-sm" style={{ color: AI_CFG[silo.ai_status].color }}>{AI_CFG[silo.ai_status].label}</p>
                    <p className="font-plus-jakarta text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{AI_CFG[silo.ai_status].detail}</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-6">
                  <Link href={`/silos/${silo.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-outfit font-semibold border transition-all"
                    style={{
                      backgroundColor: "var(--text-primary)",
                      borderColor: "var(--text-primary)",
                      color: "#ffffff",
                    }}
                  >
                    <ExternalLink size={13} />Open Full Diagnostics
                  </Link>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ count, label, color, pulse = false }: { count: number; label: string; color: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border glass-tactical">
      <motion.span className="size-1.5 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 5px ${color}` }}
        animate={pulse ? { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] } : undefined}
        transition={pulse ? { duration: 1.2, repeat: Infinity } : undefined}
      />
      <span className="font-outfit font-semibold text-[11px]" style={{ color }}>{count}</span>
      <span className="font-plus-jakarta text-[10px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveMapPage() {
  const [silos, setSilos] = useState<MapSilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapSilo | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    axios.get<ApiSilo[]>(`${API_BASE}/silos`, { timeout: 5000, signal: ctrl.signal })
      .then((res) => {
        console.log("Fetched Silos:", res.data);
        setSilos(res.data.map(apiToMap));
      })
      .catch(err => {
        if (!axios.isCancel(err)) {
          console.error("Failed to fetch silos:", err);
          setError("Failed to connect to database");
          setSilos([]);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  const nominalCount = silos.filter(s => s.risk_level === "none" || s.risk_level === "low").length;
  const cautionCount = silos.filter(s => s.risk_level === "medium").length;
  const criticalCount = silos.filter(s => s.risk_level === "high").length;

  return (
    <div
      className="flex flex-col -m-4 lg:-m-6 overflow-hidden"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* ── Command bar ── */}
      <div
        className="flex items-center justify-between shrink-0 px-5 py-3 border-b z-10"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-muted)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center gap-3">
          <Globe size={14} style={{ color: "var(--text-secondary)" }} />
          <h1 className="font-outfit font-bold text-[15px] leading-none" style={{ color: "var(--text-primary)" }}>
            Geospatial Command Map
          </h1>
          <div className="hidden sm:block h-4 w-px" style={{ backgroundColor: "var(--border-muted)" }} />
          <span className="hidden sm:block font-plus-jakarta text-[11px]" style={{ color: "var(--text-secondary)" }}>
            National Grain Network · Egypt
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {loading
            ? <span className="font-plus-jakarta text-[10px] animate-pulse" style={{ color: "var(--text-muted)" }}>Loading silos…</span>
            : error
              ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg border text-[11px] font-outfit"
                  style={{
                    backgroundColor: "rgba(225,29,72,0.06)",
                    borderColor: "rgba(225,29,72,0.25)",
                    color: "var(--alert)",
                  }}
                >
                  <DatabaseZap size={12} />
                  {error}
                </div>
              )
              : <>
                <StatusPill count={nominalCount} label="Nominal" color="var(--accent)" />
                <StatusPill count={cautionCount} label="Caution" color="var(--warning)" />
                {criticalCount > 0 && <StatusPill count={criticalCount} label="Critical" color="var(--alert)" pulse />}
              </>
          }
        </div>
      </div>

      {/* ── Map area ── */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: "var(--bg-base)" }}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* ── Map Surface ── */}
        <div className="absolute inset-0 p-10 flex items-center justify-center">
          <div className="relative w-full h-full max-w-4xl mx-auto">

            {/* ── Inline SVG Map Layer ── */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="219.09 -2.5 521.83 526"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <g fill="#E2E8F0" stroke="rgba(64,224,208,0.40)" strokeWidth="0.8">
                <path d="M455.45,20.84L455.61,23.14L454.67,25.01L453.76,28.25L449.5,30.96L446.57,33.69L448.99,35.79L448.53,38.64L447.54,40.8L450.09,44.67L456.13,51.35L451.76,59.19L447.12,61.6L443.38,62.93L441.64,63.2L440.4,65.36L439.32,69.74L435.99,38.04L435.77,34.86L437.85,33.19L439.11,31.81L441.75,29.7L442.82,27.89L443.84,28.8L444.25,28.67L445.47,27.49L446.47,26.18L446.09,26L446.47,24.94L447.47,25.14L449.95,23.01L450.46,22.29L451.5,21.37L451.88,20.55L453.11,20.15L453.59,19.4L453.47,18.89L454.57,18.42L454.59,19.34Z" />
                <path d="M553.73,520.53L548.52,520.52L548.49,519.47L549.36,516.59L550.57,514.21L551.57,513.11L552.55,511.23L551.78,510.33L551.11,509.15L550.43,508.96L549.58,509.82L545.9,512.41L545.38,512.37L544.44,512.27L541.77,512.57L540.11,510.08L540.72,507.02L544.92,504.53L547.89,503.51L551.92,503.65L554.72,500.61L556.51,498.2L557.25,496.45L557.63,494.69L557.29,492.92L557.02,488.09L556.65,485.63L557.38,483.58L558.74,481.65L559.88,481.09L562.67,481.07L564.74,481.33L566.34,481.08L568.56,480.26L577.08,477.56L582.49,475.76L583.5,476.19L586.11,476.47L588.73,477.05L590.76,478.39L592.31,479.14L593.89,478.11L595.38,474.42L596.2,472.19L597.29,469.77L597.92,467.14L598.97,464.03L600.49,461.04L601.66,458.52L602.98,454.93L604.51,452.14L605.77,449.53L606,448.46L605.38,446.27L603.31,446.39L601.62,446.82L598.9,446.43L593.62,445.07L592.11,443.25L592.25,439.61L593.54,433.06L594.82,430.84L596.31,429.72L598.52,428.22L600.65,427.21L602.61,426.6L604.63,424.7L604.21,423.31L602.63,421.97L600.38,419.73L599.98,416.27L601.28,414.74L602.53,414.2L604.3,413.18L607.77,408.88L607.69,401.79L607.48,398.53L607.77,393.92L607.54,390.16L608.04,386.34L608.44,382.52L608.23,379.36L608.55,375.73L606.49,371.91L605.77,369.51L604.35,365.62L604.12,363.25L603.95,360.4L603.44,358.38L601.68,356.19L598.82,353.43L595.21,351.67L595.91,347.83L595.58,343.94L597.62,345.83L600.12,347.45L602.08,349.37L606.64,352.67L610.34,358.68L611.05,362.33L611.91,372.81L614.15,377.77L617.59,383.36L617.94,385.07L617.84,389.47L614.83,392.39L613.06,395.65L613.1,398.25L612.33,402.16L612.76,408.79L613.68,410.83L614.22,414.12L615.22,415.37L616.55,417.72L616.88,419.76L617.31,421.32L618.42,423.28L620.12,424.3L621.68,426.1L622.2,431.1L623.3,431.55L623.27,433.59L622.61,434.39L622.09,435.48L621.85,437.91L622.08,440.5L623.3,444.25L624.91,444.65L625.87,446.77L626.75,448.38L626.62,449.89L625.91,451.15L625.41,453.58L624.5,455.84L623.04,457.65L622.02,459.13L620.91,461.4L619.7,462.97L619.72,464.3L620.76,465.24L623.43,467.98L626.48,468.25L627.57,469.34L631.07,471.94L633.55,475.85L634,479.53L632.94,481.78L630.19,481.34L627.21,478.07L625.62,475.94L622.76,476.42L620.13,475.56L618.21,474.25L615.46,472.22L612.31,472.58L609.41,474.4L610.05,480.55L609.1,484.34L606.95,487.21L604.31,488.98L600.74,491.71L597.77,494.77L592.29,496.62L588.73,494.93L586.22,492.39L584.63,490.28L582.41,488.79L579.7,489.53L578.81,494.47L578.57,497.1L577.57,500.3L576.65,502.49L575.37,504.43L572.71,505.72L568.37,504.97L567.13,508.47L565.28,510.67L562.61,512.27L554.62,515.34Z" />
                <path d="M541.57,260.75L539.36,260.74L538.38,258.74L537.27,257.69L536.24,255.56L535.29,254.32L533.51,254.12L533.02,255.29L532.01,257.08L531.2,257.77L529.56,258.8L528.45,259.85L527.82,260.06L525.31,256.07L523.17,251.45L521.1,247.48L519.18,244.46L516.39,242.8L514.72,242.38L512.56,242.12L511.54,241.55L509.3,239.54L505.09,235.41L503.66,234.57L502.41,232.8L501.74,230.51L500.22,228.54L499.12,226.35L498.49,223.62L497.43,223.12L497.11,221.04L496.27,220.21L496.19,217.81L497.22,217.71L500.23,217.71L502.08,218.23L504.52,218.64L505.97,217.19L508.74,217.39L508.33,221.02L509.27,226.06L509.99,227.72L511.59,229.6L512.55,230.09L516.02,231.37L517.48,232.51L521.46,234.15L522.61,234.25L526.16,236.18L527.85,240.92L530.84,243.26L533.55,245.6L534.9,246.57L536.52,249.88L539.09,253.93L540.87,258.07Z" />
                <path d="M635.32,215.75L636.06,216.43L636.28,217.53L635.84,218.24L635.15,217.51L634.69,216.43ZM641.75,222.63L643.17,222.78L644.04,223.67L644.76,223.96L646.11,224.9L646.97,227.09L646.35,227.24L645.71,226.36L644.04,224.98L643.63,225.02L642.47,224.35L641.86,224.44L641.23,223.73ZM625.81,209.23L626.27,209.51L626.21,210.23L625.3,209.96ZM634.05,217.8L634.61,218.34L634.6,219.33L635.88,220.36L635.32,221.17L634.22,221.34L634.43,220.63L633.07,220.05L633.75,217.85ZM646.71,263.58L647.82,264.41L647.75,265.31L648.19,266.09L648.21,266.99L647.03,265.75L646.24,264.29ZM641.87,237.21L642.87,238.08L642.93,238.92L643.4,239.5L643.66,240.55L642.81,240.31L642.5,239.67L641.3,238.45L641.9,238.34ZM544.81,145.02L546.05,147.24L551.08,146.2L557.62,146.09L565.16,140.89L569.28,139.65L572.98,137.19L578.27,136.99L578.82,137.78L578.72,139.26L577.53,140.43L577.18,141.23L577.63,142.26L577.39,142.65L577.31,144.34L577.97,145.58L579.44,147.17L580.44,149.43L580.41,149.99L580.9,150.87L581.72,151.68L582.59,152.2L583.19,153.59L584.17,154.55L585.49,154.82L586.21,155.39L587.02,156.92L587.46,158.06L587.8,158.34L587.76,159.44L588.61,161.11L588.58,161.87L589.12,162.49L589.69,164.29L590.14,166.97L591.63,167.63L592.65,167.8L593.39,168.47L593.88,169.42L594.4,169.87L595.12,171.04L596.2,171.28L596.42,172.04L597.44,172.75L598.3,174.42L598.92,176.07L600.28,177.83L601.61,178.35L602.05,180.64L602.63,181.19L602.67,181.94L604.23,183.12L604.54,184.34L605.46,185.24L605.67,185.88L606.72,186.53L608.49,188.68L608.66,190.01L609.71,190.04L611.23,191.81L612.93,193.14L612.94,194.1L613.33,194.89L614.44,195.1L615.04,196.08L616.32,195.87L617.14,196.59L617.69,196.7L618.63,197.74L619.92,198.32L621.95,201.36L622.45,201.89L622.94,203.03L623.59,203.46L623.83,204.64L624.51,205.67L625.05,205.94L625.01,207.85L625.42,208.73L624.4,208.48L623.98,207.64L623.25,207.86L621.85,206.8L620.37,206.63L620.05,207.8L620.53,208.52L620.98,208.57L622.1,210.29L622.52,211.2L623.32,211.06L624,210.48L624.3,210.95L623.52,213.57L623.89,213.7L624.13,214.74L623.34,214.76L622.11,216.01L622.17,217.01L623.76,218.34L624.91,220.08L625.17,221.77L625.01,222.38L625.23,223.36L626.72,223.66L627.32,224.72L628.13,224.93L628.6,226.52L629,227.24L629.94,227.91L630.1,228.37L630.96,229.08L631.59,230.62L631.42,231.49L631.57,232.47L632.03,232.69L632.12,233.66L632.66,233.95L633.44,235.03L634.8,235.35L636.23,236.8L637.42,237.49L638.56,237.65L639.37,238.51L639.07,239.34L639.18,240.13L639.65,240.85L639.13,241.13L638.71,242.08L639.08,245.04L638.98,245.69L640.23,246.94L641.51,247.33L642.56,248.77L641.78,249.35L641.79,249.89L643.06,251.69L642.9,252.29L643.58,252.63L644.59,255.28L645.52,256.12L646.17,257.55L646.47,257.11L647.32,256.96L647.03,257.92L647.78,259.91L647.07,259.95L646.38,259.07L645.91,259.23L645.61,260.48L645.19,261.09L645.58,261.98L645.1,262.8L645.46,264.22L645.82,264.55L645.69,266.08L645.38,266.62L645.63,267.79L645.36,268.89L646.11,270.33L647.29,270.73L648.41,271.44L648.8,272.18L649.57,272.6L649.61,273.35L650.5,274.84L650.44,275.2L651.28,276.3L651.44,276.89L652.27,277.84L652.37,278.68L652.85,279.75L652.92,280.51L653.69,281.68L654.37,283.55L655.14,284.04L655.64,285.19L657.24,287.06L658.04,288.16L658.32,288.97L658.36,290.29L659.13,291.32L659.65,292.61L659.96,294.13L661.06,295.72L661.35,296.75L662.44,297.8L662.57,298.46L663.59,299.49L663.36,300.19L664.16,300.72L664.89,301.98L665.1,303.01L666.47,306.11L666.96,306.79L668.13,307.46L668.5,308.34L669.12,308.88L669.98,310.69L670.1,311.84L670.56,312.39L670.86,313.64L671.67,314.41L672.81,314.76L673.64,316.42L674.53,317.62L675.18,317.92L676.28,319.04L677.11,321.45L677.59,321.6L677.57,322.66L677.82,323.3L678.49,323.63L678.51,324.36L678.93,325.6L679.49,326.45L680.62,327.35L681.28,328.25L681.77,330.84L682.25,332.09L682.83,332.35L683.43,333.17L683.57,334.38L684.2,335.1L684.49,336.96L685.04,337.89L686.42,339.47L687.22,341.68L687.13,342.3L688.75,344.37L689.78,346.07L689.77,346.61L691.08,348.92L692.18,349.89L692.76,351.33L693.71,352.78L694.12,354.44L694.94,355.28L695.87,357.19L695.98,357.84L696.75,358.9L697.36,359.4L697.57,360.32L697.12,361.42L697.48,362.28L698.67,363.36L699.29,364.63L699.69,364.99L699.82,366.68L700.19,366.95L700.35,368.79L701.34,369.96L701.87,370.29L703.77,372.67L703.99,372.67L704.97,374.85L704.74,376.54L705.16,377.25L705.94,377.35L705.77,379.07L707.44,380.57L707.98,382.05L708.86,382.61L709.07,383.11L708.2,383.52L708.39,384.31L707.86,384.97L707.87,385.54L709.54,387.29L710.61,387.72L712.11,390.91L713.24,392.11L713.89,392.25L714.17,393.01L715.66,393.94L716.66,393.83L717.01,395.13L717.81,395.91L718.83,396.42L719.15,397.36L720.22,398.56L721.42,400.34L721.55,401.14L722.3,402.04L722.03,402.64L723.13,404.41L725.37,406.35L725.41,407.32L726.29,407.37L726.3,406.44L727.03,407.04L727.72,407.06L729.12,408.06L729.85,408.97L730.45,410.5L730.49,412.11L731.95,413.07L732.56,413.17L733.66,412.94L735.43,413.47L736.62,414.1L737.91,415.15L738.41,416.06L738.07,416.73L737.3,416.57L736.44,416.91L735.16,418.11L733.11,417.32L732.79,417L731.33,417.23L730.37,416.93L729.57,415.88L728.25,414.88L727.08,414.46L726.34,414.5L725.93,416.73L725.6,417.18L725.82,418.65L725.76,420.21L726.08,421.28L725.74,421.57L726.02,423.03L725.69,424.38L726.27,425.72L726.88,424.92L727.39,424.85L727.68,425.6L727.66,426.43L726.5,426.23L727.21,427.14L727.55,428.7L727.84,432.62L727.38,433.19L727.78,435.26L728.08,435.48L728,438.26L727.19,440.1L727.8,441.55L728.7,442.97L729.73,444.11L730.56,446.94L730.99,447.63L731.01,450.2L731.31,451.68L732.08,453.16L731.99,453.93L732.24,455.64L733.1,456.21L733.48,457.43L734.26,458.28L734.79,459.3L719.66,476.28L717.62,478.58L706.81,475.1L705.6,474.79L695.83,504.92L681.47,507.85L672.13,509.81L669.48,520.72L627.85,520.62L599.6,520.73L579.94,520.75L576.17,520.78L572.52,520.6L553.73,520.53L554.62,515.34L562.61,512.27L565.28,510.67L567.13,508.47L568.37,504.97L572.71,505.72L575.37,504.43L576.65,502.49L577.57,500.3L578.57,497.1L578.81,494.47L579.7,489.53L582.41,488.79L584.63,490.28L586.22,492.39L588.73,494.93L592.29,496.62L597.77,494.77L600.74,491.71L604.31,488.98L606.95,487.21L609.1,484.34L610.05,480.55L609.41,474.4L612.31,472.58L615.46,472.22L618.21,474.25L620.13,475.56L622.76,476.42L625.62,475.94L627.21,478.07L630.19,481.34L632.94,481.78L634,479.53L633.55,475.85L631.07,471.94L627.57,469.34L626.48,468.25L623.43,467.98L620.76,465.24L619.72,464.3L619.7,462.97L620.91,461.4L622.02,459.13L623.04,457.65L624.5,455.84L625.41,453.58L625.91,451.15L626.62,449.89L626.75,448.38L625.87,446.77L624.91,444.65L623.3,444.25L622.08,440.5L621.85,437.91L622.09,435.48L622.61,434.39L623.27,433.59L623.3,431.55L622.2,431.1L621.68,426.1L620.12,424.3L618.42,423.28L617.31,421.32L616.88,419.76L616.55,417.72L615.22,415.37L614.22,414.12L613.68,410.83L612.76,408.79L612.33,402.16L613.1,398.25L613.06,395.65L614.83,392.39L617.84,389.47L617.94,385.07L617.59,383.36L614.15,377.77L611.91,372.81L611.05,362.33L610.34,358.68L606.64,352.67L602.08,349.37L600.12,347.45L597.62,345.83L594.83,343.24L593.1,340.55L592.11,337.8L591.71,331.95L592.37,329.95L593.95,327.96L595.61,324.58L601.08,320.49L602.8,317.08L604.12,311.11L604.23,309.92L603.92,305.99L603.31,302.28L601.99,299.6L601.21,297.23L599.61,294.76L596.05,292.28L591.52,291.24L585.47,291.31L583.07,292.21L580.31,294.41L578.37,296.07L576.99,296.89L575.32,297.02L573.3,296.07L573.36,294.3L573.02,294.16L570.77,291.13L569.54,288.33L567.64,286.89L563.53,285.58L560.68,283.72L559.82,282.81L558.53,280.9L557.06,277.01L556.4,273.79L554.72,273.22L553.66,271.84L553.08,270.12L550.88,267.36L544.73,262.13L542.09,261.11L541.57,260.75L540.87,258.07L539.09,253.93L536.52,249.88L534.9,246.57L533.55,245.6L530.84,243.26L527.85,240.92L526.16,236.18L522.61,234.25L521.46,234.15L517.48,232.51L516.02,231.37L512.55,230.09L511.59,229.6L509.99,227.72L509.27,226.06L508.33,221.02L508.74,217.39L508.86,213.82L508.24,208.75L506.86,204.88L505.92,198.63L502.01,190.44L500.93,184.03L500.63,181.65L501.15,178.67L502.21,176.29L504.2,172.54L503.78,165.37L504.76,161.44L505.09,159.73L501.37,159.21L504.02,158.27L504.34,154.4L506.89,149.04L508.91,148.14L510.09,145.91L510.82,144.12L512.12,141.88L514.1,138.91L514.78,138.16L514.64,134.74L516.25,133.25L516.13,128.48L519,131.13L521.19,133.36L524.66,138.36L528.04,140.83L532.49,141.5L537.05,143.36L543.59,145.02Z" />
                <path d="M475.73,26.88L479.31,26.52L485,31.73L485.22,34.65L486.85,35.89L486.94,38.62L487.79,38.93L488.01,41.65L487.49,42.35L488.49,42.82L489.03,43.98L489.86,44.92L489.43,45.85L488.67,46.71L488.8,48.42L489.46,48.65L489.47,50.37L489.24,51.53L489.66,52.86L490.52,52.74L490.65,57.57L490.81,57.99L491.87,58.06L491.56,59.95L492.79,60.87L492.67,62.66L493.37,64.26L493.79,68.45L493.87,70.37L492.52,70.53L492.53,72.43L486.29,79.8L483.7,80.17L477.01,87.96L472.86,94.78L472.24,96.14L471.53,96.61L469.76,93.36L468.02,92.24L465.19,91.67L457.3,85.82L455.29,84.83L448.62,79.58L444.42,79.43L441.19,77.82L439.77,75.7L439.32,69.74L440.4,65.36L441.64,63.2L443.38,62.93L447.12,61.6L451.76,59.19L456.13,51.35L450.09,44.67L447.54,40.8L448.53,38.64L448.99,35.79L446.57,33.69L449.5,30.96L453.76,28.25L454.67,25.01L455.61,23.14L455.45,20.84L457.05,21.36L458.52,21.33L458.83,21.56L461.24,20.73L462.4,20.04L464.09,18.37L464.99,17.02L465.83,14.86L466.29,13.16L466.81,10.63L467.2,10.9L468.31,10.96L469.31,10.51L471.35,11.4L472.16,16.45L475.17,19.76Z" />
                <path d="M450.52,157.28L452.14,154.77L452.29,151.46L452.45,145.54L453.4,139.18L456.25,139.62L461.95,140.37L472.65,142.45L474.82,143.64L474.8,145.43L475.81,145.85L477.22,145.75L498.96,139.14L503.85,129.79L506.86,124.28L509.48,122.14L510.02,121.7L512.38,122.71L514.66,123.25L515.65,123.92L516.13,128.48L516.25,133.25L514.64,134.74L514.78,138.16L514.1,138.91L512.12,141.88L510.82,144.12L510.09,145.91L508.91,148.14L506.89,149.04L504.34,154.4L504.02,158.27L501.37,159.21L498.35,157.08L495.84,155.59L462.87,156.76L461.36,156.73L452.99,157.04Z" />
                <path d="M539.1,76.51L539.55,80.22L541.12,84.66L542.17,89.75L544.15,98.74L544.47,103.29L544.41,130.02L544.81,145.02L543.59,145.02L537.05,143.36L532.49,141.5L528.04,140.83L524.66,138.36L521.19,133.36L519,131.13L516.13,128.48L515.65,123.92L514.66,123.25L514.13,123.13L513.81,121.53L513.86,119.98L514.09,119.19L514.81,118.63L515.04,117.92L514.97,116.22L515.67,114.74L515.48,110.7L515.56,109.5L516.27,108.85L516.22,106.8L515.1,105.81L514.82,102.98L516.01,102.82L515.46,93.99L512.77,93.05L512.46,91.15L511.4,89.44L512.24,88.69L511.61,82.7L513.53,82.91L515.22,81.15L519.41,79.29L523.83,78.98L528.34,78.98L531.29,77L537.11,72.42L537.44,72.83Z" />
                <path d="M519.95,12.05L520.1,13.91L518.65,14.75L517.17,15.4L517.3,16.99L519.68,16.95L521.41,16.71L521.68,18.79L522.67,18.99L523.9,19.64L524.92,20.58L524.8,23.14L524.39,27.17L528.24,25.1L531.16,23.3L532.82,22.9L535.51,23.22L538.76,23.1L539.49,23.53L540.87,23.8L541.61,25.35L541.36,26.52L542.9,28.32L542.54,29.13L542.89,30.18L539.72,31.51L534.78,32.28L531.26,32.21L530.34,34.08L530.36,36.13L527.78,39.21L527.89,42.19L525.67,42.38L525.66,44.07L524.42,44.81L524.34,46.33L515.68,46.59L514.48,47.8L515.03,54.52L515.92,55.33L515.22,57.78L513.39,59.84L512.23,59.77L511.04,57.92L510.09,57.3L510.09,57.17L511.21,55.85L510.79,52.27L510.11,51.99L510.11,50.94L509.06,49.85L508.48,46.4L508.5,43.78L508.88,40.98L509,38.65L509.89,37.44L510.62,36.97L511.37,34.54L509.25,34.83L507.16,34.84L507.34,33.27L507.87,32.16L507.52,29.09L509.16,29.41L509.8,28.85L509.42,27.1L508.45,16.15L507.91,15.12L507.59,12.14L506.53,12.23L506.27,10.08L507.18,9.15L508.4,9.25L508.15,6.48L508.69,6.68L514.56,10.08L516.48,11.09L518.4,11.9Z" />
                <path d="M535.11,8.78L535.5,9.52L534.9,9.88L534.08,8.04L534.73,7.94ZM532.82,22.9L531.16,23.3L528.24,25.1L524.39,27.17L524.8,23.14L524.92,20.58L523.9,19.64L522.67,18.99L521.68,18.79L521.41,16.71L519.68,16.95L517.3,16.99L517.17,15.4L518.65,14.75L520.1,13.91L519.95,12.05L520.76,12.05L522.92,11.59L525.61,10.81L528.69,9.73L530.17,8.92L531.92,7.75L532.21,8.47L532.09,9.2L532.35,9.92L533.28,11.18L533.22,12.38L531.87,10.66L531.32,11.31L531.38,12.36L532.19,11.83L532.81,12.56L532.62,12.97L533.47,14.22L532.35,13.97L532.16,14.38L532.76,15.26L531.9,15.62L532.78,16.44L534.2,17.14L533.83,19.17L533.41,20.51L532.81,20.38L532.54,22.25ZM535.26,7.7L536.34,8.31L537.38,9.52L536.81,10.16L536.22,9.24L534.97,7.91ZM538.53,12.59L539.46,14L542.93,16.79L544.25,17.42L546.38,18.75L547.78,19.88L547.14,19.99L544.85,18.54L543.47,17.87L540.89,15.75L539.1,15.07L538.56,15.9L538.04,15.29L538.77,14.55L538.76,13.39Z" />
                <path d="M453.4,139.18L459.1,131.58L461.11,130.54L467.34,121.9L468.8,121.75L474.37,114.3L477.96,113.26L481.68,110.58L485.39,107.75L486.95,107.45L489.32,105.87L490.64,104.58L490.69,103.43L504.48,103.3L504.42,104.76L504.55,107.68L505.38,108.68L506.92,111.61L508.08,116.89L509.11,120.49L509.48,122.14L506.86,124.28L503.85,129.79L498.96,139.14L477.22,145.75L475.81,145.85L474.8,145.43L474.82,143.64L472.65,142.45L461.95,140.37L456.25,139.62Z" />
                <path d="M490.52,52.74L489.66,52.86L489.24,51.53L489.47,50.37L489.46,48.65L488.8,48.42L488.67,46.71L489.43,45.85L489.86,44.92L489.03,43.98L488.49,42.82L487.49,42.35L488.01,41.65L487.79,38.93L486.94,38.62L486.85,35.89L485.22,34.65L485,31.73L485.59,32.28L487.77,35.88L488.98,35.89L489.36,36.97L493.95,36.97L494.17,35.01L499.31,35.1L498.84,29.31L499.77,29.38L504.85,28.94L507.52,29.09L507.87,32.16L507.34,33.27L507.16,34.84L509.25,34.83L511.37,34.54L510.62,36.97L509.89,37.44L509,38.65L508.88,40.98L508.5,43.78L508.48,46.4L509.06,49.85L510.11,50.94L510.11,51.99L510.79,52.27L511.21,55.85L510.09,57.17L506.23,55.37L503.18,55.35L503.05,54.28L502.49,53.03L498.12,53.08L497.68,52.24L496.55,52.19L496.4,51.26L494.02,51.26L493.95,52.28Z" />
                <path d="M511.61,82.7L512.24,88.69L511.4,89.44L512.46,91.15L512.77,93.05L515.46,93.99L516.01,102.82L514.82,102.98L515.1,105.81L516.22,106.8L516.27,108.85L515.56,109.5L515.48,110.7L515.67,114.74L514.97,116.22L515.04,117.92L514.81,118.63L514.09,119.19L513.86,119.98L513.81,121.53L514.13,123.13L512.38,122.71L510.02,121.7L509.48,122.14L509.11,120.49L508.08,116.89L506.92,111.61L505.38,108.68L504.55,107.68L504.42,104.76L504.48,103.3L490.69,103.43L490.64,104.58L489.32,105.87L486.95,107.45L485.39,107.75L481.68,110.58L477.96,113.26L474.37,114.3L468.8,121.75L467.34,121.9L461.11,130.54L459.1,131.58L453.4,139.18L452.45,145.54L452.29,151.46L452.14,154.77L450.52,157.28L449.72,161.87L448.38,164.95L447.45,168.49L446.3,174.17L445.54,180.08L443.36,182.45L440.97,184.58L436.51,187.89L433.04,191.44L430.55,192.15L428.15,194.28L424.54,195.7L420.65,199.01L417.64,200.67L412.44,201.85L410.94,202.79L409.45,203.98L408.8,205.87L408.56,208.23L408.1,210.13L407.28,212.49L406.11,215.44L349.77,215.58L347.83,215.58L364.92,167.25L405.64,156.61L435.18,123.15L440.93,114.46L447.34,112.74L468.53,97.03L471.53,96.61L472.24,96.14L472.86,94.78L477.01,87.96L483.7,80.17L486.29,79.8L492.53,72.43L493.95,72.31L494.56,71.71L496.64,71.85L496.98,75.16L498.38,75.09L499.34,76.02L499.56,77.88L500.52,78.82L502.14,79.13L502.87,78.19L504.55,78.93L506.41,78.16L508.26,81.05L510.75,82.6Z" />
                <path d="M551.04,23.21L551.46,23.71L551.99,23.38L552.6,25.13L552.5,25.51L550.92,24.8L550.41,25.52L550.01,25.07L549.03,24.91L547.84,25.24L546.79,24.13L547.68,23.23L549.58,23.29L549.99,23.59ZM554.66,30.87L556.83,31.04L558.81,32.04L562.05,33.24L565.17,35.24L568.27,36.08L569.1,43.13L571.67,61.35L575.27,66.6L577.17,69.68L578.9,73.69L579.9,76.6L574.22,76.32L569.73,76.85L568.14,78.33L562.06,77.88L559.39,77.04L541.06,77.15L539.19,77.33L539.1,76.51L537.44,72.83L537.11,72.42L535.71,67.33L534.91,62.59L533.19,61.69L532.88,59.97L535.12,60.07L535.61,60.98L539.34,61.18L539.85,60.28L544.78,59.97L544.96,59L549.04,52.01L548.74,49.21L547.52,45.22L548.94,40.97L549.01,39.07L550.67,39.01L550,33.19L548.06,33.1L547.3,31.85L546.57,30.96L546.77,30.35L547.49,29.93L547.17,28.83L548.43,28.82L548.26,26.91L548.61,26.39L549.33,26.75L550,28.81L549.74,30.3L552.33,29.79L552.97,29.01L553.96,29.21Z" />
                <path d="M583.92,94.59L585.77,94.67L586.01,94.5L592.49,94.05L602.15,94.36L610.49,95.59L611.52,95.89L615.72,95.82L623.97,97.82L625.85,98.83L634.16,104.08L637.65,106.39L641.3,107.62L645.19,108.55L651.48,112.41L655.15,113.6L657.83,114.71L659.22,114.59L659.55,114.88L663.42,115.5L666.87,115.8L670.61,116.57L674.29,116.41L676.71,117.03L674.95,117.8L674.52,118.39L674.37,119.86L673.61,121.04L672.63,122.21L672.74,123.11L671.87,123.65L671.6,125.31L670.93,125.61L670.12,126.92L670.34,127.85L670.32,129.44L669.96,130.01L670.46,131.95L670.24,133.12L669.75,133.71L669.66,134.51L668.54,135.01L668.63,135.84L668.21,137.9L668.34,138.5L667.99,139.58L668.2,140.69L667.85,141.29L668.39,142.59L668.89,143.08L669.11,144.79L667.7,145.43L667.22,146.02L667.25,147.05L667.87,149.46L667.7,150.28L667.96,151.35L666.88,152.31L667.19,153.95L667.25,155.86L667.47,156.47L667.23,157.62L667.42,158.58L666.86,160.31L665.71,162.43L665.79,164.09L664.83,164.8L664.63,166.47L663.58,167.93L663.45,169.87L663.92,170.8L663.46,172.36L662.97,171.88L662.42,172.01L661.91,173.09L661.88,173.86L661.31,174.27L661.46,175.11L661.06,176.43L661.23,177.24L660.99,178.36L660.18,179.2L659.76,180.46L660.04,183.66L660.36,184.32L660.19,184.89L660.4,185.76L660.94,186.7L661.99,187.72L662.26,189.56L661.89,190.18L662.12,191.02L661.9,192.71L661.57,193.19L661.79,194.01L662.23,194.39L662.19,195.63L662.49,196.17L662.22,198.43L661.61,199.66L660.87,199.78L660.38,200.97L659.68,201.36L659.66,202.05L658.72,202.64L658.1,202.38L657.71,204.13L657.92,204.88L657.64,205.96L657.04,205.96L656.68,205.18L655.68,205.63L655.72,206.81L655.29,209L654.51,209.25L652.95,209.03L653.07,209.61L653.74,210.41L655.12,210.63L655.67,212.21L654.84,212.13L653.86,211.11L652.91,209.71L651.28,209.08L651.03,209.35L649.92,208.76L647.76,208.7L646.85,208.37L645.76,207.65L644.72,206.26L643.96,205.73L642.81,203.94L641.13,203.47L639.05,201.03L638.42,201.36L637.5,201.01L636.76,200.06L635.07,199.18L633.53,197.2L632.39,196.7L632.37,195.72L632.02,195.06L629.85,194.13L629.59,192.92L628.75,192.06L628.23,190.9L627.64,190.54L627.49,189.21L625.74,188.25L625.42,187.56L625.17,185.49L624.61,184.83L623.72,184.53L623.34,183.23L622.86,183.07L622.36,181.87L621.58,181.66L620.8,180.87L619.38,180.33L618.75,179.53L616.1,178.08L614.73,176.75L612.88,174.14L612.88,173.56L612.03,172.61L611.32,172.46L608.87,170.2L608.01,168.18L607.96,167.34L607.34,166.34L606.42,166.47L605.82,166.08L605.6,163.85L604.95,163.04L604.45,161.68L604.68,160.05L604.62,159.12L605.06,158.43L605.47,156.32L604.79,155.6L604.09,154.21L603.44,153.65L602.45,151.74L602.37,150.6L602.61,150.05L602.28,149.49L602.86,148.08L601.9,146.05L602.19,143.8L601.24,143.43L600.84,142.59L599.66,142.04L599.34,141.42L598.27,141.32L598.16,140.75L597.18,140.21L597.16,139.17L595.83,137.78L595.29,137.44L594.73,136.57L594.26,136.48L593.29,135.03L592.33,134.82L591.18,132.85L589.89,132.76L589.06,131.85L587.99,131.25L587.46,130.12L587.66,129.33L587.11,128.26L585.71,126.98L585.22,126.83L585.08,125.22L584.4,124.62L584.53,123.33L584.34,122.19L583.52,121.76L582.61,120.46L581.12,119.82L579.95,118.72L580.26,117.79L579.67,116.58L579.33,114.03L578.63,112.1L577.37,111.74L577.78,110.5L577.11,108.33L577.43,107.13L577.25,106.42L577.65,105.54L577.47,104.43L576.62,103.05L576.02,102.98L575.75,102.22L575.12,101.5L581.5,96.06L583.99,95.44Z" />
                <path d="M511.61,82.7L510.75,82.6L508.26,81.05L506.41,78.16L505.85,73.34L504.85,71.52L504.3,69.58L505.33,66.81L507.44,65.17L509.67,63.27L510.08,61.98L510.09,57.3L511.04,57.92L512.23,59.77L513.39,59.84L512.25,61.19L512.38,63.77L511.74,63.81L511.96,66.53L513.14,67.63L514.36,69.17L515.76,71.65L516.98,74.44L519.22,76.18L521.74,77.58L521.96,77.86L523.83,78.98L519.41,79.29L515.22,81.15L513.53,82.91Z" />
                <path d="M508.15,6.48L508.4,9.25L507.18,9.15L506.27,10.08L506.53,12.23L507.59,12.14L507.91,15.12L508.45,16.15L509.42,27.1L509.8,28.85L509.16,29.41L507.52,29.09L504.85,28.94L499.77,29.38L498.84,29.31L499.31,35.1L494.17,35.01L493.95,36.97L489.36,36.97L488.98,35.89L487.77,35.88L485.59,32.28L485,31.73L479.31,26.52L475.73,26.88L475.19,19.76L472.18,16.45L471.37,11.4L473.29,11.4L475.71,10.84L482.25,8.45L485.15,7.67L486.95,6.36L487.57,6.57L488.58,6.07L491.79,5.22L493.17,4.4L493.28,5.69L492.2,5.38L488.88,6.36L487.45,7.23L486.95,7.84L485.21,8.82L482.09,10.05L481.12,11.09L480.84,11.95L479.52,12.26L478.06,12.32L477.75,12.87L477,12.99L475.92,12.75L475.13,13.06L475.05,15.08L477.07,15.33L479.95,15.25L480.36,13.24L481.44,13.55L483.23,14.81L483.82,13.98L483.99,13.24L485.7,11.95L486.22,11.83L487.26,12.99L488.34,12.69L491.3,13.04L492.34,12.34L494.52,11.72L495.26,10.45L495.72,9.01L496.29,8.08L498.65,8.27L498.8,9.33L499.49,9.6L500,7.71L499.16,6.67L497.18,5.44L495.79,4.83L493.93,4.47L494.78,4L496.23,3.59L498.8,3.5L503.84,5.03L506.3,5.67Z" />
                <path d="M595.21,351.67L592.69,350.36L590.07,347.96L588.74,346.91L587.28,343.43L586.65,340.16L586.72,338.47L585.84,336.82L585.46,333.42L584.12,330.71L583.41,329.54L583.34,326.99L584.11,324.79L585.75,322.79L588.3,321.55L590.74,318.87L592.25,316.73L592.83,315.08L592.63,312.19L593.02,310.47L594.36,307.51L595.53,305.37L595.11,302.93L593.72,300.47L592.74,299.64L590.16,299.51L587.67,300.61L585.88,302.12L581.84,303.98L580.75,304.74L578.91,305.43L577.08,305.57L575.05,305.98L573.66,306.46L568.86,306.6L567.22,305.92L562.06,301.32L559.69,298.45L560.29,297.22L561.19,296.19L562.55,295.15L563.86,295.15L565.03,294.67L566.27,293.64L566.87,292.4L567.72,292.27L568.97,292.95L569.3,294.47L570.07,296.33L571.79,297.36L572.86,298.8L574.07,298.8L575.32,297.02L576.99,296.89L578.37,296.07L580.31,294.41L583.07,292.21L585.47,291.31L591.52,291.24L596.05,292.28L599.61,294.76L601.21,297.23L601.99,299.6L603.31,302.28L603.92,305.99L604.23,309.92L604.12,311.11L602.8,317.08L601.08,320.49L595.61,324.58L593.95,327.96L592.37,329.95L591.71,331.95L592.11,337.8L593.1,340.55L594.83,343.24L595.58,343.94L595.91,347.83ZM589.41,325.4L591.27,325.76L592.7,325.49L593.52,324.02L594.02,322.46L594.2,320.71L591.51,320.44L590.38,324.02Z" />
                <path d="M589.41,325.4L590.38,324.02L591.51,320.44L594.2,320.71L594.02,322.46L593.52,324.02L592.7,325.49L591.27,325.76Z" />
                <path d="M406.11,215.44L407.28,212.49L408.1,210.13L408.56,208.23L408.8,205.87L409.45,203.98L410.94,202.79L412.44,201.85L417.64,200.67L420.65,199.01L424.54,195.7L428.15,194.28L430.55,192.15L433.04,191.44L436.51,187.89L440.97,184.58L443.36,182.45L445.54,180.08L446.3,174.17L447.45,168.49L448.38,164.95L449.72,161.87L450.52,157.28L452.99,157.04L461.36,156.73L462.87,156.76L495.84,155.59L498.35,157.08L501.37,159.21L505.09,159.73L504.76,161.44L503.78,165.37L504.2,172.54L502.21,176.29L501.15,178.67L500.63,181.65L500.93,184.03L502.01,190.44L505.92,198.63L506.86,204.88L508.24,208.75L508.86,213.82L508.74,217.39L505.97,217.19L504.52,218.64L502.08,218.23L500.23,217.71L497.22,217.71L496.99,215.63L407.54,215.44Z" />
                <path d="M510.09,57.17L510.09,57.3L510.08,61.98L509.67,63.27L507.44,65.17L505.33,66.81L504.3,69.58L504.85,71.52L505.85,73.34L506.41,78.16L504.55,78.93L502.87,78.19L502.14,79.13L500.52,78.82L499.56,77.88L499.34,76.02L498.38,75.09L496.98,75.16L496.64,71.85L494.56,71.71L493.95,72.31L492.53,72.43L492.52,70.53L493.87,70.37L493.79,68.45L493.37,64.26L492.67,62.66L492.79,60.87L491.56,59.95L491.87,58.06L490.81,57.99L490.65,57.57L490.52,52.74L493.95,52.28L494.02,51.26L496.4,51.26L496.55,52.19L497.68,52.24L498.12,53.08L502.49,53.03L503.05,54.28L503.18,55.35L506.23,55.37Z" />
                <path d="M435.77,34.86L435.99,38.04L439.32,69.74L439.77,75.7L441.19,77.82L444.42,79.43L448.62,79.58L455.29,84.83L457.3,85.82L465.19,91.67L468.02,92.24L469.76,93.36L471.53,96.61L468.53,97.03L447.34,112.74L440.93,114.46L435.18,123.15L405.64,156.61L364.92,167.25L347.83,215.58L243.81,215.57L243.01,215.57L237.93,130.32L237.39,129.36L235.73,125.17L233.38,120.6L232.81,119.01L232,117.87L230.83,115.01L230.66,114.25L231.29,112.16L232.11,110.99L232.07,109.77L230.08,105.25L228.16,101.27L227.95,99.86L227.87,96.03L227.45,94.27L224.21,84.74L221.59,81.88L221.97,80.09L222.94,77.73L223.92,75.63L224.28,74.39L224.73,72.04L226.87,70.01L227.83,68.61L228.48,66.82L229.07,65.73L230.56,63.97L231.28,60.51L231.23,58.77L231.42,57.63L232.3,55.16L232.67,51.47L233.53,48.66L233.59,47.96L232.05,43.45L232,42.38L231.45,40.68L230.59,39.39L229.98,37.88L229.57,36.04L228.19,32.43L227.45,31.1L226.38,28.77L226.02,26.99L225.99,25.61L226.15,21.87L225.95,19.62L225.62,18.54L224.94,17.51L224.38,14.65L224.45,14.12L227.69,11.26L228.7,10.12L232.84,6.8L233.17,5.98L233.35,3.87L233.78,2.6L234.91,1.29L235.43,0.07L236.18,0L236.19,1.69L236.61,2.2L236.9,3.22L237.89,5.39L237.09,5.79L237.45,6.84L238.14,7.44L239.47,7.99L243.15,8.78L246.27,8.76L247.64,8.89L249.95,8.26L251.32,8.19L252.48,7.93L254.91,6.99L256.59,6.51L265.83,2.89L267.13,2.65L268.77,2.11L269.73,2.11L272.11,2.77L273.58,2.93L274.24,3.23L275.78,3.45L278.14,4.06L278.52,4.37L280.18,4.74L280.44,4.98L286.81,6.81L287.32,7.18L290.9,8.13L292.34,8.13L294.44,8.53L296.17,9.31L298.38,9.03L300.31,9.66L302.86,9.57L305.51,10.05L307.38,9.94L308.7,10.53L309.17,11.23L310.48,11.6L311.78,12.24L315.4,12.22L317.25,12.03L318.85,13.01L319.52,13.96L321,14.07L321.77,15.04L323.39,15.79L326.53,15.72L326.75,16.59L328,16.48L329.49,16.77L330.09,16.21L330.9,16.24L333.36,15.88L334.5,16.39L334.32,17.68L335.15,18.86L336.07,20.79L336.29,21.87L337.28,23.04L338.13,23.76L339.32,24.45L341.06,24.82L343.87,24.89L344.78,25.73L346.47,25.45L347.68,25.42L348.15,26.43L349.87,26.53L350.28,26.2L351.57,25.91L355.86,24.24L356.57,23.79L357.24,22.72L357.63,22.93L357.69,24.51L357.99,25.72L359,26.81L358.95,27.86L359.39,29.66L359.76,30.14L360.81,30.75L362,31.02L365.17,31.27L367.84,31.35L370.27,31.01L371.45,31.14L372.16,31.69L373.23,32.11L374.8,31.99L377.26,32.08L378.88,32.38L381.59,31.44L383.41,31.3L385.67,32.89L387.23,33.4L388.64,33.31L389.2,33.68L390.58,34.09L390.84,34.91L391.41,35.23L393.38,35.78L395.79,35.86L396.54,36.74L397.64,36.8L398.58,37.86L399.71,38.38L401.31,38.52L401.53,39.93L402.73,41.04L404.26,41.77L405,42.73L407.82,43.91L409.25,45.41L410.32,45.26L412.64,45.72L415.07,45.66L416.14,45.48L418.66,44.79L420.87,43.82L423.25,43.04L426.87,41.25L427.74,40.6L429.39,39.82L431.03,38.65L432.67,37.67L434.1,36.23Z" />
                <path d="M556.75,24.28L559.37,25.75L559.58,26.14L560.84,27.07L562.8,29.39L562.9,29.9L564.88,31.62L566.33,32.51L568,32.93L568.27,36.08L565.17,35.24L562.05,33.24L558.81,32.04L556.83,31.04L554.66,30.87L554.37,30.19L555.22,29.42L557.1,25.81ZM555.12,23.28L554.33,24.54L554.06,23.37L553.48,22.16L553.03,23.37L552.49,24.1L551.8,22.6L551.93,21.61L552.21,21.23L553.68,21.33L554.43,22.12L554.52,22.71Z" />
                <path d="M575.32,297.02L574.07,298.8L572.86,298.8L571.79,297.36L570.07,296.33L569.3,294.47L568.97,292.95L567.72,292.27L566.87,292.4L566.27,293.64L565.03,294.67L563.86,295.15L562.55,295.15L561.19,296.19L560.29,297.22L559.69,298.45L558.56,297.08L556.76,294.53L555.84,294.12L554.29,292.4L551.15,288.34L548.58,284.59L544.85,279.9L542.68,276.73L540.34,273.44L539.12,271.43L537.01,269.78L534.47,269.27L531.23,265.54L528.47,262.04L527.82,260.06L528.45,259.85L529.56,258.8L531.2,257.77L532.01,257.08L533.02,255.29L533.51,254.12L535.29,254.32L536.24,255.56L537.27,257.69L538.38,258.74L539.36,260.74L541.57,260.75L542.09,261.11L544.73,262.13L550.88,267.36L553.08,270.12L553.66,271.84L554.72,273.22L556.4,273.79L557.06,277.01L558.53,280.9L559.82,282.81L560.68,283.72L563.53,285.58L567.64,286.89L569.54,288.33L570.77,291.13L573.02,294.16L573.36,294.3L573.3,296.07Z" />
                <path d="M547.3,31.85L548.06,33.1L550,33.19L550.67,39.01L549.01,39.07L549.01,40.97L547.52,45.22L548.74,49.21L549.04,52.01L544.96,59L544.78,59.97L539.85,60.28L539.34,61.18L535.61,60.98L535.12,60.07L532.88,59.97L533.19,61.69L534.91,62.59L535.71,67.33L537.11,72.42L531.29,77L528.34,78.98L523.83,78.98L521.96,77.86L521.74,77.58L519.22,76.18L516.98,74.44L515.76,71.65L514.36,69.17L513.14,67.63L511.96,66.53L511.74,63.81L512.38,63.77L512.25,61.19L513.39,59.84L515.22,57.78L515.92,55.33L515.03,54.52L514.48,47.8L515.68,46.59L524.34,46.33L524.42,44.81L525.66,44.07L525.67,42.38L527.89,42.19L527.78,39.21L530.36,36.13L530.34,34.08L531.26,32.21L534.78,32.28L539.72,31.51L542.89,30.18L542.58,31.35L543.24,31.16L545.1,31.72L544.75,30.95L545.6,30.98L546.68,31.92Z" />
                <path d="M590.46,23.53L588.21,23.86L588.19,24.83L586.82,25.01L584.93,26.19L584.33,26.78L582.32,27.66L587.53,24.06L588.91,23.61ZM676.71,117.03L674.29,116.41L670.61,116.57L666.87,115.8L663.42,115.5L659.55,114.88L659.22,114.59L657.83,114.71L655.15,113.6L651.48,112.41L645.19,108.55L641.3,107.62L637.65,106.39L634.16,104.08L625.85,98.83L623.97,97.82L615.72,95.82L611.52,95.89L610.49,95.59L602.15,94.36L592.49,94.05L586.01,94.5L585.77,94.67L583.92,94.59L583.76,92.67L582.23,92.51L581.37,80.63L580.01,76.61L579.9,76.6L578.9,73.69L577.17,69.68L575.27,66.6L571.67,61.35L569.1,43.13L568.27,36.08L568,32.93L569.65,32.95L571.28,32.77L574.14,32.05L574.07,32.46L572.41,32.83L572.44,34.04L573.22,34.25L573.85,33.52L574.66,33.8L575.73,33.61L576.61,32.55L577.87,31.72L579.32,31.29L581.21,31.33L581.82,31.5L582.08,30.7L583.26,31.14L583.96,32.69L584.45,33.34L585.34,33.34L586.05,32.46L585.25,32.19L585.33,31.69L586.74,30.69L587.03,30.01L586.06,29.72L585.86,30.87L583.19,31.03L584.75,29.64L585.6,27.83L588.49,26.38L589.24,26.72L589.9,27.65L590.28,28.68L589.83,28.94L589.48,29.78L590.02,30.15L590.1,31.03L591.23,31.65L591.32,33.03L591.14,33.65L592.39,33.46L593.55,32.8L593.53,32.34L594.46,31.99L596.23,31.78L597.42,30.99L598.08,31.3L598.87,30L599.34,30.09L600.97,29.8L600.96,28.59L601.94,26.93L599.64,25.84L600.85,25.82L603.09,26.91L604.49,28.32L604.77,28.79L606,28.95L606.4,29.31L608.46,29.78L611.47,29.87L614.72,29.64L618.15,28.83L620.64,27.95L623.49,27.16L627.69,25.33L630.81,23.64L632.8,22.35L635.5,20.3L637.82,17.98L640.08,23.94L644.86,36.64L648.08,44.41L652.73,53.02L654.51,58.63L654.64,61.58L656.77,63.96L656.1,66.68L656.36,68.33L659.63,70.47L660.85,74.05L667.46,89.65L667.44,90.47L673.15,103.96L673.34,106.56L674.26,108.03L674.55,109.04L674.47,110.51L674.18,111.99L674.78,114.46L675.47,115.63Z" />
                <path d="M544.81,145.02L544.41,130.02L544.47,103.29L544.15,98.74L542.17,89.75L541.12,84.66L539.55,80.22L539.19,77.33L541.06,77.15L559.39,77.04L562.06,77.88L568.14,78.33L569.73,76.85L574.22,76.32L580.01,76.61L581.37,80.63L582.23,92.51L583.76,92.67L583.92,94.59L583.99,95.44L581.5,96.06L575.12,101.5L574.39,100.33L573.27,99.4L573.88,98.76L574.12,97.06L572.77,95.66L572.24,95.34L571.65,94.49L571.07,94.73L570.63,94.19L570.28,93.1L570.24,92.17L568.64,92.4L569.48,100.56L568.4,102.02L566.63,103.48L565.45,106.04L565.37,109.33L564.99,113.17L565.35,116.34L566.8,117.33L567.37,117.52L567.72,118.27L568.68,118.96L569.14,119.78L570.08,120.17L570.37,121.05L573.2,123.08L574.56,125.2L575.43,128L575.47,128.84L575.97,129.2L576.07,130.08L576.73,130.98L576.51,131.85L576.9,132.91L577.71,134.29L577.78,135.55L578.27,136.99L572.98,137.19L569.28,139.65L565.16,140.89L557.62,146.09L551.08,146.2L546.05,147.24Z" />
                <path d="M407.54,215.44L496.99,215.63L497.22,217.71L496.19,217.81L496.27,220.21L497.11,221.04L497.43,223.12L498.49,223.62L499.12,226.35L500.22,228.54L501.74,230.51L502.41,232.8L503.66,234.57L505.09,235.41L509.3,239.54L511.54,241.55L512.56,242.12L514.72,242.38L516.39,242.8L519.18,244.46L521.1,247.48L523.17,251.45L525.31,256.07L527.82,260.06L528.47,262.04L531.23,265.54L534.47,269.27L537.01,269.78L539.12,271.43L540.34,273.44L542.68,276.73L544.85,279.9L548.58,284.59L551.15,288.34L554.29,292.4L555.84,294.12L556.76,294.53L558.56,297.08L559.69,298.45L562.06,301.32L567.22,305.92L568.86,306.6L573.66,306.46L575.05,305.98L577.08,305.57L578.91,305.43L580.75,304.74L581.84,303.98L585.88,302.12L587.67,300.61L590.16,299.51L592.74,299.64L593.72,300.47L595.11,302.93L595.53,305.37L594.36,307.51L593.02,310.47L592.63,312.19L592.83,315.08L592.25,316.73L590.74,318.87L588.3,321.55L585.75,322.79L584.11,324.79L583.34,326.99L583.41,329.54L584.12,330.71L585.46,333.42L585.84,336.82L586.72,338.47L586.65,340.16L587.28,343.43L588.74,346.91L590.07,347.96L592.69,350.36L595.21,351.67L598.82,353.43L601.68,356.19L603.44,358.38L603.95,360.4L604.12,363.25L604.35,365.62L605.77,369.51L606.49,371.91L608.55,375.73L608.23,379.36L608.44,382.52L608.04,386.34L607.54,390.16L607.77,393.92L607.48,398.53L607.69,401.79L607.77,408.88L604.3,413.18L602.53,414.2L601.28,414.74L599.98,416.27L600.38,419.73L602.63,421.97L604.21,423.31L604.63,424.7L602.61,426.6L600.65,427.21L598.52,428.22L596.31,429.72L594.82,430.84L593.54,433.06L592.25,439.61L592.11,443.25L593.62,445.07L598.9,446.43L601.62,446.82L603.31,446.39L605.38,446.27L606,448.46L605.77,449.53L604.51,452.14L602.98,454.93L601.66,458.52L600.49,461.04L598.97,464.03L597.92,467.14L597.29,469.77L596.2,472.19L595.38,474.42L593.89,478.11L592.31,479.14L590.76,478.39L588.73,477.05L586.11,476.47L583.5,476.19L582.49,475.76L577.08,477.56L568.56,480.26L566.34,481.08L564.74,481.33L562.67,481.07L559.88,481.09L558.74,481.65L557.38,483.58L556.65,485.63L557.02,488.09L557.29,492.92L557.63,494.69L557.25,496.45L556.51,498.2L554.72,500.61L551.92,503.65L547.89,503.51L544.92,504.53L540.72,507.02L540.11,510.08L541.77,512.57L544.44,512.27L545.38,512.37L545.7,514.77L545.34,515.78L545.32,516.73L544.3,520.61L541.64,520.54L531.54,520.59L528.87,520.5L522.47,520.6L521.98,520.52L484.69,520.68L484.71,521L479.14,520.7L469.6,520.66L453.82,520.73L453.57,520.63L450.67,520.67L428.94,520.54L424.81,520.6L399.93,520.55L397.04,520.66L395.14,520.56L385.14,520.58L383.59,520.52L379.56,520.61L377.71,520.54L346.67,520.68L325.36,520.56L320.82,520.64L264.93,520.72L258.64,521L243.01,215.57L243.81,215.57L347.83,215.58L349.77,215.58Z" />
              </g>
            </svg>

            {/* ── Interactive nodes strictly on top ── */}
            {!loading && !error && silos.map(silo => (
              <PulseNode
                key={silo.id}
                silo={silo}
                isSelected={selected?.id === silo.id}
                onClick={() => setSelected(prev => prev?.id === silo.id ? null : silo)}
              />
            ))}

            {/* Loading / Error states over the map */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="size-8 rounded-full border-2 border-slate-300"
                  style={{ borderTopColor: "var(--accent)" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Slide-over drawer ── */}
        <SiloDrawer silo={selected} onClose={() => setSelected(null)} />

        {/* ── Legend ── */}
        <motion.div
          className="absolute bottom-4 left-4 px-3 py-3 rounded-xl border flex flex-col gap-2 glass-tactical"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        >
          <p className="font-outfit uppercase tracking-[0.18em] text-[8.5px]" style={{ color: "var(--text-secondary)" }}>Legend</p>
          {[
            { color: "var(--accent)", label: "Nominal / Low Risk" },
            { color: "var(--warning)", label: "Caution" },
            { color: "var(--alert)", label: "High Risk / Critical" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="size-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
              <span className="font-plus-jakarta text-[10px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
            </div>
          ))}
        </motion.div>

        <div
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl border font-outfit text-[9.5px] glass-tactical"
          style={{ color: "var(--text-secondary)" }}
        >
          22°N – 32°N · 24°E – 37°E · EGY
        </div>
      </div>
    </div>
  );
}