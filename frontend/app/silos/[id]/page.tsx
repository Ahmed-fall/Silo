"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api";
import CropIcon from "@/components/CropIcon";
import SensorChart, { type SensorReading } from "@/components/SensorChart";
import AIVisionScanner from "@/components/AIVisionScanner";
import {
  Thermometer, Droplets, AlertTriangle, ShieldCheck, Flame,
  RefreshCw, ArrowLeft, MapPin, ShieldAlert, Clock, Download,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "medium" | "high";

interface SiloDetail {
  id: string; name: string; location: string;
  risk_level: RiskLevel; crop_type: string;
  temperature?: number; humidity?: number;
  capacity_kg?: number; fill_pct?: number;
}

interface SiloAlert {
  id: string;
  message: string;
  risk_level: string;
  triggered_at: string;
  is_read: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeMockSensor(n = 24): SensorReading[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - i) * 3_600_000);
    return {
      recorded_at: d.toISOString(),
      temperature: 22 + Math.sin(i / 3) * 6 + Math.random() * 2,
      humidity: 58 + Math.cos(i / 4) * 12 + Math.random() * 3,
    };
  });
}

const MOCK_SILO: SiloDetail = {
  id: "s-001", name: "Alpha Depot",
  location: "Cairo Governorate, EG",
  risk_level: "medium", crop_type: "wheat",
  temperature: 28.4, humidity: 71.2,
  capacity_kg: 500000, fill_pct: 68,
};

const MOCK_ALERTS: SiloAlert[] = [
  { id: "a1", message: "Temperature exceeded 28 °C threshold", risk_level: "medium", triggered_at: new Date(Date.now() - 600_000).toISOString(), is_read: false },
  { id: "a2", message: "Humidity spike detected — 78 %", risk_level: "high", triggered_at: new Date(Date.now() - 1_800_000).toISOString(), is_read: false },
  { id: "a3", message: "Scheduled ventilation cycle complete", risk_level: "low", triggered_at: new Date(Date.now() - 3_600_000).toISOString(), is_read: true },
  { id: "a4", message: "Sensor calibration recommended", risk_level: "low", triggered_at: new Date(Date.now() - 7_200_000).toISOString(), is_read: true },
];

// ─── Risk config ──────────────────────────────────────────────────────────────

const RISK = {
  none: { label: "Nominal", color: "text-slate-400", bg: "bg-slate-800/60", border: "border-slate-600/40", glow: "rgba(148,163,184,0)", peak: "rgba(148,163,184,0.22)", icon: <ShieldCheck size={12} />, pulse: false as const, dur: 0 },
  low: { label: "Low Risk", color: "text-emerald-300", bg: "bg-emerald-950/60", border: "border-emerald-600/40", glow: "rgba(52,211,153,0)", peak: "rgba(52,211,153,0.35)", icon: <ShieldCheck size={12} />, pulse: false as const, dur: 0 },
  medium: { label: "Med Risk", color: "text-amber-300", bg: "bg-amber-950/60", border: "border-amber-600/40", glow: "rgba(251,191,36,0)", peak: "rgba(251,191,36,0.45)", icon: <AlertTriangle size={12} />, pulse: true as const, dur: 2.2 },
  high: { label: "High Risk", color: "text-rose-300", bg: "bg-rose-950/60", border: "border-rose-600/40", glow: "rgba(244,63,94,0)", peak: "rgba(244,63,94,0.55)", icon: <Flame size={12} />, pulse: true as const, dur: 1.5 },
} as const;

// ─── Alert severity config ─────────────────────────────────────────────────────

const SEV = {
  critical: { icon: <Flame size={12} />, dot: "bg-rose-500", text: "text-rose-300", border: "border-rose-500/30" },
  warning: { icon: <AlertTriangle size={12} />, dot: "bg-amber-400", text: "text-amber-300", border: "border-amber-500/30" },
  info: { icon: <ShieldCheck size={12} />, dot: "bg-sky-400", text: "text-sky-300", border: "border-sky-500/20" },
} as const;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-800/70 ${className}`} />;
}

// ─── Gradient sensor reading ───────────────────────────────────────────────────

function SensorWidget({ icon, label, value, unit, gradient, glow }: {
  icon: React.ReactNode; label: string;
  value: number; unit: string; gradient: string; glow: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-slate-900/60 border border-white/7">
      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-plus-jakarta uppercase tracking-widest">
        {icon}{label}
      </div>
      <p
        className={`font-outfit font-extrabold text-2xl bg-clip-text text-transparent ${gradient} leading-tight`}
        style={{ filter: `drop-shadow(0 0 7px ${glow})` }}
      >
        {value.toFixed(1)}<span className="text-base font-semibold ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

// ─── Capacity Widget (Liquid Wave) ───────────────────────────────────────────

function CapacityWidget({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));

  // Color logic: <50 cyan, 50-80 amber, >80 rose
  const theme =
    clamped < 50
      ? { wave: "#22d3ee", wave2: "#06b6d4", text: "text-cyan-300", glow: "rgba(34,211,238,0.55)", label: "text-cyan-400" }
      : clamped <= 80
      ? { wave: "#fbbf24", wave2: "#f97316", text: "text-amber-300", glow: "rgba(251,191,36,0.55)", label: "text-amber-400" }
      : { wave: "#fb7185", wave2: "#f43f5e", text: "text-rose-300", glow: "rgba(244,63,94,0.55)", label: "text-rose-400" };

  // SVG viewBox is 100×100. Fill top edge sits at y = 100 - pct.
  const fillY = 100 - clamped;

  // Wave path: two sine humps that span the 100-wide box.
  // We animate between two phase-shifted versions of the wave.
  const wavePath1 = `M0,${fillY + 4} C15,${fillY - 4} 35,${fillY + 8} 50,${fillY + 2} C65,${fillY - 4} 85,${fillY + 6} 100,${fillY + 2} L100,100 L0,100 Z`;
  const wavePath2 = `M0,${fillY + 2} C15,${fillY + 8} 35,${fillY - 4} 50,${fillY + 4} C65,${fillY + 8} 85,${fillY - 2} 100,${fillY + 4} L100,100 L0,100 Z`;

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-slate-900/60 border border-white/7 items-center justify-center">
      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-plus-jakarta uppercase tracking-widest self-start">
        Fill Level
      </div>

      {/* Circular liquid container */}
      <div className="relative size-16 shrink-0">
        {/* Outer ring glow */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" style={{ filter: `drop-shadow(0 0 6px ${theme.glow})` }}>
          {/* Clipping mask — circle */}
          <defs>
            <clipPath id="circle-clip">
              <circle cx="50" cy="50" r="47" />
            </clipPath>
          </defs>

          {/* Background fill area */}
          <circle cx="50" cy="50" r="47" fill="rgba(15,23,42,0.9)" />

          {/* Animated wave fill */}
          <g clipPath="url(#circle-clip)">
            {/* Back wave (slightly transparent) */}
            <motion.path
              d={wavePath1}
              fill={theme.wave2}
              fillOpacity={0.4}
              animate={{ d: [wavePath1, wavePath2, wavePath1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Front wave */}
            <motion.path
              d={wavePath2}
              fill={theme.wave}
              fillOpacity={0.85}
              animate={{ d: [wavePath2, wavePath1, wavePath2] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>

          {/* Circle border ring */}
          <circle cx="50" cy="50" r="47" fill="none" stroke={theme.wave} strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>

        {/* Percentage label centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p
            className={`font-outfit font-extrabold text-xl leading-none ${theme.text}`}
            style={{ filter: `drop-shadow(0 0 6px ${theme.glow})`, textShadow: `0 0 10px ${theme.glow}` }}
          >
            {Math.round(clamped)}<span className="text-[10px] font-semibold">%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: SiloAlert }) {
  // Map backend risk_level to frontend severity configuration
  const severityMap: Record<string, keyof typeof SEV> = {
    low: "info",
    medium: "warning",
    high: "critical",
  };

  const sevKey = (severityMap[alert.risk_level?.toLowerCase()] || "info") as keyof typeof SEV;
  const s = SEV[sevKey] || SEV.info;

  // Safe date parsing using backend's triggered_at
  const dateObj = new Date(alert.triggered_at);
  const isValidDate = !isNaN(dateObj.getTime());
  const time = isValidDate 
    ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";

  return (
    <motion.li layout
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`relative flex items-start gap-2.5 px-4 py-3 rounded-xl border ${s.border} bg-slate-950/60 ${alert.is_read ? "opacity-50" : ""}`}
    >
      {!alert.is_read && <span className={`absolute top-3 right-3 size-1.5 rounded-full ${s.dot} animate-pulse`} />}
      <span className={`${s.text} shrink-0 mt-0.5`}>{s.icon}</span>
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-xs leading-snug ${alert.is_read ? "text-slate-500" : s.text}`}>{alert.message}</p>
        <div className="flex items-center gap-1 mt-1">
          <Clock size={9} className="text-slate-600" />
          <p className="text-[10px] text-slate-600 font-mono">{time}</p>
        </div>
      </div>
    </motion.li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiloDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [silo, setSilo] = useState<SiloDetail | null>(null);
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [forecast, setForecast] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SiloAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const timeout = 2_000;
    const [s, sens, al, fc] = await Promise.allSettled([
      axios.get<SiloDetail>(`${API_BASE}/silos/${id}`, { timeout }),
      axios.get<SensorReading[]>(`${API_BASE}/sensors/${id}`, { timeout }),
      axios.get<SiloAlert[]>(`${API_BASE}/alerts/${id}`, { timeout }),
      // AI Predictive Service — optional; falls back to [] if offline
      axios.get<SensorReading[]>(`${API_BASE}/ai-predictive/forecast/${id}`, { timeout }),
    ]);
    setSilo(s.status === "fulfilled" ? s.value.data : { ...MOCK_SILO, id: id ?? MOCK_SILO.id });
    setSensors(sens.status === "fulfilled" ? sens.value.data : makeMockSensor(24));
    setAlerts(al.status === "fulfilled" ? al.value.data : MOCK_ALERTS);
    // Forecast is non-critical — empty array = graceful no-forecast mode
    setForecast(fc.status === "fulfilled" ? fc.value.data : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }

  // ── PDF Report via native browser print ──────────────────────────────────
  const [isPrinting, setIsPrinting] = useState(false);

  function handlePrint() {
    setIsPrinting(true);
    // Stamp today's date as a data attribute so CSS body::after can read it
    const dateStr = new Date().toLocaleString([], {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    document.body.setAttribute("data-print-date", dateStr);

    // Let React finish re-render (tiny delay), then print
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.body.removeAttribute("data-print-date");
    }, 120);
  }

  const riskKey = (silo?.risk_level?.toLowerCase() || "none") as RiskLevel;
  const risk = RISK[riskKey] || RISK.none;

  return (
    <div className="min-h-full flex flex-col gap-5 max-w-6xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <Link href="/"
            className="flex items-center justify-center size-9 rounded-xl bg-slate-900 border border-white/[0.07] text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 mt-0.5"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            {loading
              ? <><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-3 w-36" /></>
              : <>
                <h1 className="font-outfit font-extrabold text-2xl text-white leading-tight">{silo?.name}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin size={11} className="text-slate-600" />
                  <span className="font-plus-jakarta text-slate-500 text-xs">{silo?.location}</span>
                </div>
              </>
            }
          </div>
        </div>
        {/* ── Action buttons (hidden in print) ── */}
        <div className="flex items-center gap-2" data-print-hide="true">
          {/* Refresh */}
          <motion.button onClick={handleRefresh}
            whileHover={{ scale: 1.06, boxShadow: "0 0 18px rgba(52,211,153,0.22)" }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/8 text-slate-300 font-outfit font-medium text-sm hover:text-white hover:border-white/15 transition-colors backdrop-blur-md"
          >
            <motion.span
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.3 }}
              className="inline-flex"
            >
              <RefreshCw size={13} />
            </motion.span>
            Refresh
          </motion.button>

          {/* Generate PDF Report */}
          <motion.button
            onClick={handlePrint}
            disabled={isPrinting}
            whileHover={{
              scale: 1.06,
              boxShadow: "0 0 20px rgba(139,92,246,0.35), 0 0 40px rgba(139,92,246,0.15)",
            }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-outfit font-medium text-sm backdrop-blur-md overflow-hidden"
            style={{
              background: isPrinting
                ? "rgba(139,92,246,0.25)"
                : "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(168,85,247,0.1) 100%)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: isPrinting ? "#c084fc" : "#a78bfa",
            }}
          >
            {/* Subtle shimmer overlay */}
            <motion.span
              className="absolute inset-0 rounded-xl"
              animate={isPrinting ? { opacity: [0.1, 0.3, 0.1] } : { opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.2), transparent)" }}
            />
            <motion.span
              animate={isPrinting ? { y: [0, -2, 0] } : { y: 0 }}
              transition={isPrinting ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}}
              className="inline-flex relative z-10"
            >
              <Download size={13} />
            </motion.span>
            <span className="relative z-10">{isPrinting ? "Preparing…" : "PDF Report"}</span>
          </motion.button>
        </div>
      </div>

      {/* ── TOP ROW: Identity + Risk + Live Readings (horizontal) ── */}
      {loading
        ? <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        : <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

          {/* Silo identity + risk */}
          <div className="col-span-2 sm:col-span-2 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07]">
            <div className="flex items-center justify-center size-11 rounded-2xl bg-slate-800 border border-white/7 text-slate-300 shrink-0">
              <CropIcon crop={silo?.crop_type ?? "wheat"} size={24} className="text-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-outfit font-bold text-slate-100 text-sm capitalize truncate">{silo?.crop_type}</p>
              <p className="font-plus-jakarta text-slate-600 text-[10px]">#{silo?.id.toUpperCase()}</p>
            </div>
            {/* Pulsing risk badge */}
            <motion.span
              animate={risk.pulse
                ? { boxShadow: [`0 0 0px ${risk.glow}`, `0 0 14px 3px ${risk.peak}`, `0 0 0px ${risk.glow}`] }
                : { boxShadow: `0 0 0px ${risk.glow}` }
              }
              transition={risk.pulse ? { duration: risk.dur, repeat: Infinity, ease: "easeInOut" } : {}}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold font-outfit border ${risk.color} ${risk.bg} ${risk.border} shrink-0`}
            >
              {risk.icon}{risk.label}
            </motion.span>
          </div>

          {/* Temperature */}
          <SensorWidget
            icon={<Thermometer size={11} />} label="Temperature"
            value={silo?.temperature ?? 0} unit="°C"
            gradient="bg-gradient-to-r from-amber-400 to-orange-600"
            glow="rgba(251,146,60,0.55)"
          />

          {/* Humidity */}
          <SensorWidget
            icon={<Droplets size={11} />} label="Humidity"
            value={silo?.humidity ?? 0} unit="%"
            gradient="bg-gradient-to-r from-cyan-400 to-blue-500"
            glow="rgba(34,211,238,0.55)"
          />

          {/* Fill Level */}
          <CapacityWidget pct={silo?.fill_pct ?? 0} />
        </div>
      }

      {/* ── MIDDLE ROW: Sensor History Chart (full width) ── */}
      <section>
        <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] text-slate-600 uppercase mb-2">
          Sensor History &amp; AI Forecast
        </p>
        <div className="rounded-2xl bg-slate-900/60 border border-white/6 p-4">
          <div className="h-56">
            {loading
              ? <Skeleton className="w-full h-full" />
              : <SensorChart data={sensors} forecastData={forecast} />
            }
          </div>
        </div>
      </section>

      {/* ── BOTTOM ROW: AI Vision Scanner + Alerts — side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-6">

        {/* AI Vision Scanner */}
        <section className="flex flex-col">
          <div className="mb-2">
            <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] text-slate-600 uppercase">AI Vision Scanner</p>
            <p className="font-plus-jakarta text-slate-600 text-[11px] mt-0.5">Upload a grain photo for disease detection</p>
          </div>
          {/* هنا الـ id متأمن عشان لو بـ undefined مايضربش */}
          <AIVisionScanner siloId={(id as string) || "unknown"} />
        </section>

        {/* Alerts */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] text-slate-600 uppercase">Recent Alerts</p>
            {alerts.some((a) => !a.is_read) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600/80 text-white text-[9px] font-bold font-outfit">
                {alerts.filter((a) => !a.is_read).length} new
              </span>
            )}
          </div>

          {loading
            ? <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            : <ul className="flex flex-col gap-2 overflow-y-auto max-h-105 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
              <AnimatePresence initial={false}>
                {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
              </AnimatePresence>
            </ul>
          }

          {/* Connection status footer */}
          <div className="flex items-center gap-2 pt-3 mt-auto border-t border-white/5">
            <ShieldAlert size={11} className="text-slate-700" />
            <span className="font-plus-jakarta text-slate-600 text-[10px]">{alerts.length} alerts loaded</span>
          </div>
        </section>
      </div>
    </div>
  );
}