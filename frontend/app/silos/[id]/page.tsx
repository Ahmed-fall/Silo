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
import ThermalSiloMap, { type ThermalZone } from "@/components/ThermalSiloMap";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "medium" | "high";

interface SiloDetail {
  id: string; name: string; location: string;
  risk_level: RiskLevel; crop_type: string;
  temperature?: number; humidity?: number;
  capacity_kg?: number; fill_pct?: number;
}

interface SiloAlert {
  id: string; message: string; risk_level: string;
  triggered_at: string; is_read: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeMockSensor(n = 24): SensorReading[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - i) * 3_600_000);
    return {
      recorded_at: d.toISOString(),
      temperature: 22 + Math.sin(i / 3) * 6 + Math.random() * 2,
      humidity:    58 + Math.cos(i / 4) * 12 + Math.random() * 3,
    };
  });
}

const MOCK_SILO: SiloDetail = {
  id: "s-001", name: "Alpha Depot", location: "Cairo Governorate, EG",
  risk_level: "medium", crop_type: "wheat",
  temperature: 28.4, humidity: 71.2, capacity_kg: 500000, fill_pct: 68,
};

const MOCK_ALERTS: SiloAlert[] = [
  { id: "a1", message: "Temperature exceeded 28 °C threshold", risk_level: "medium", triggered_at: new Date(Date.now() - 600_000).toISOString(), is_read: false },
  { id: "a2", message: "Humidity spike detected — 78 %", risk_level: "high", triggered_at: new Date(Date.now() - 1_800_000).toISOString(), is_read: false },
  { id: "a3", message: "Scheduled ventilation cycle complete", risk_level: "low", triggered_at: new Date(Date.now() - 3_600_000).toISOString(), is_read: true },
  { id: "a4", message: "Sensor calibration recommended", risk_level: "low", triggered_at: new Date(Date.now() - 7_200_000).toISOString(), is_read: true },
];

// ─── Thermal zone builder ────────────────────────────────────────────────────

function buildThermalZones(temp?: number, humidity?: number): ThermalZone[] {
  const base    = temp ?? 27;
  const hFactor = ((humidity ?? 65) - 50) / 100;
  return [
    { label: "Top",    temp: parseFloat((base - 5 + hFactor).toFixed(1)),          heightFraction: 0.24 },
    { label: "Upper",  temp: parseFloat((base - 1.5 + hFactor * 1.2).toFixed(1)), heightFraction: 0.26 },
    { label: "Lower",  temp: parseFloat((base + 2 + hFactor * 1.5).toFixed(1)),   heightFraction: 0.26 },
    { label: "Bottom", temp: parseFloat((base + 5.5 + hFactor * 2).toFixed(1)),   heightFraction: 0.24 },
  ];
}

// ─── Risk & severity config (LIGHT MODE) ─────────────────────────────────────

const RISK = {
  none:   { label: "Nominal",  color: "var(--text-muted)",    bg: "var(--accent-subtle)",  border: "var(--border-glass)",      glow: "rgba(64,224,208,0)",  peak: "rgba(64,224,208,0.22)",  icon: <ShieldCheck size={12} style={{ color: "var(--accent)" }} />,   pulse: false as const, dur: 0 },
  low:    { label: "Low Risk", color: "var(--accent)",        bg: "var(--accent-subtle)",  border: "var(--border-glass)",      glow: "rgba(64,224,208,0)",  peak: "rgba(64,224,208,0.35)",  icon: <ShieldCheck size={12} style={{ color: "var(--accent)" }} />,   pulse: false as const, dur: 0 },
  medium: { label: "Med Risk", color: "var(--warning)",       bg: "rgba(205,127,50,0.08)", border: "rgba(205,127,50,0.25)",    glow: "rgba(205,127,50,0)",  peak: "rgba(205,127,50,0.45)",  icon: <AlertTriangle size={12} style={{ color: "var(--warning)" }} />, pulse: true  as const, dur: 2.2 },
  high:   { label: "High Risk",color: "var(--alert)",         bg: "rgba(225,29,72,0.06)",  border: "rgba(225,29,72,0.25)",     glow: "rgba(225,29,72,0)",   peak: "rgba(225,29,72,0.55)",    icon: <Flame size={12} style={{ color: "var(--alert)" }} />,          pulse: true  as const, dur: 1.5 },
} as const;

const SEV = {
  critical: { icon: <Flame size={12} style={{ color: "var(--alert)" }} />,     dot: "var(--alert)",      text: "var(--alert)",   border: "rgba(225,29,72,0.25)" },
  warning:  { icon: <AlertTriangle size={12} style={{ color: "var(--warning)" }} />, dot: "var(--warning)", text: "var(--warning)", border: "rgba(205,127,50,0.25)" },
  info:     { icon: <ShieldCheck size={12} style={{ color: "var(--accent)" }} />,  dot: "var(--accent)",   text: "var(--accent)",  border: "var(--border-glass)" },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ backgroundColor: "var(--accent-subtle)" }} />;
}

function SensorWidget({ icon, label, value, unit }: {
  icon: React.ReactNode; label: string;
  value: number; unit: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl glass-tactical">
      <div className="flex items-center gap-1.5 text-[10px] font-plus-jakarta uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
        {icon}{label}
      </div>
      <p className="font-outfit font-extrabold text-2xl leading-tight" style={{ color: "var(--text-primary)" }}>
        {value.toFixed(1)}<span className="text-base font-semibold ml-0.5" style={{ color: "var(--text-secondary)" }}>{unit}</span>
      </p>
    </div>
  );
}

function CapacityWidget({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const theme =
    clamped < 50  ? { wave: "#22d3ee", wave2: "#06b6d4", text: "#0891b2",  glow: "rgba(6,182,212,0.45)" } :
    clamped <= 80 ? { wave: "#fbbf24", wave2: "#f97316", text: "#d97706", glow: "rgba(251,191,36,0.45)" } :
                   { wave: "#fb7185", wave2: "#f43f5e", text: "#e11d48",  glow: "rgba(225,29,72,0.45)"  };
  const fillY    = 100 - clamped;
  const wavePath1 = `M0,${fillY+4} C15,${fillY-4} 35,${fillY+8} 50,${fillY+2} C65,${fillY-4} 85,${fillY+6} 100,${fillY+2} L100,100 L0,100 Z`;
  const wavePath2 = `M0,${fillY+2} C15,${fillY+8} 35,${fillY-4} 50,${fillY+4} C65,${fillY+8} 85,${fillY-2} 100,${fillY+4} L100,100 L0,100 Z`;
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl glass-tactical items-center justify-center">
      <div className="flex items-center gap-1.5 text-[10px] font-plus-jakarta uppercase tracking-widest self-start" style={{ color: "var(--text-secondary)" }}>Fill Level</div>
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" style={{ filter: `drop-shadow(0 0 6px ${theme.glow})` }}>
          <defs><clipPath id="circle-clip"><circle cx="50" cy="50" r="47" /></clipPath></defs>
          <circle cx="50" cy="50" r="47" fill="var(--bg-base)" />
          <g clipPath="url(#circle-clip)">
            <motion.path d={wavePath1} fill={theme.wave2} fillOpacity={0.4}
              animate={{ d: [wavePath1, wavePath2, wavePath1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
            <motion.path d={wavePath2} fill={theme.wave} fillOpacity={0.85}
              animate={{ d: [wavePath2, wavePath1, wavePath2] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
          </g>
          <circle cx="50" cy="50" r="47" fill="none" stroke={theme.wave} strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-outfit font-extrabold text-xl leading-none"
            style={{ color: theme.text, textShadow: `0 0 10px ${theme.glow}` }}>
            {Math.round(clamped)}<span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: SiloAlert }) {
  const severityMap: Record<string, keyof typeof SEV> = { low: "info", medium: "warning", high: "critical" };
  const sevKey = (severityMap[alert.risk_level?.toLowerCase()] || "info") as keyof typeof SEV;
  const s      = SEV[sevKey] || SEV.info;
  const dateObj = new Date(alert.triggered_at);
  const time    = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  return (
    <motion.li layout
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`relative flex items-start gap-2.5 px-4 py-3 rounded-xl border glass-tactical ${alert.is_read ? "opacity-50" : ""}`}
      style={{ borderColor: s.border }}
    >
      {!alert.is_read && <span className="absolute top-3 right-3 size-1.5 rounded-full animate-pulse" style={{ backgroundColor: s.dot }} />}
      <span className="shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-xs leading-snug" style={{ color: alert.is_read ? "var(--text-muted)" : s.text }}>{alert.message}</p>
        <div className="flex items-center gap-1 mt-1">
          <Clock size={9} style={{ color: "var(--text-muted)" }} />
          <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{time}</p>
        </div>
      </div>
    </motion.li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiloDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [silo,     setSilo]     = useState<SiloDetail | null>(null);
  const [sensors,  setSensors]  = useState<SensorReading[]>([]);
  const [forecast, setForecast] = useState<SensorReading[]>([]);
  const [alerts,   setAlerts]   = useState<SiloAlert[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const timeout = 2_000;
    const [s, sens, al, fc] = await Promise.allSettled([
      axios.get<SiloDetail>(`${API_BASE}/silos/${id}`, { timeout }),
      axios.get<SensorReading[]>(`${API_BASE}/sensors/${id}`, { timeout }),
      axios.get<SiloAlert[]>(`${API_BASE}/alerts/${id}`, { timeout }),
      axios.get<SensorReading[]>(`${API_BASE}/ai-predictive/forecast/${id}`, { timeout }),
    ]);
    setSilo(s.status    === "fulfilled" ? s.value.data    : { ...MOCK_SILO, id: id ?? MOCK_SILO.id });
    setSensors(sens.status === "fulfilled" ? sens.value.data : makeMockSensor(24));
    setAlerts(al.status === "fulfilled" 
  ? al.value.data.map((a: SiloAlert) => ({
      ...a,
      // Ensure consistent shape for AlertRow component
      risk_level: (a.risk_level ?? "low") as RiskLevel,
      triggered_at: a.triggered_at,
      is_read: a.is_read ?? false,
    }))
  : MOCK_ALERTS
);

// Set forecast data (empty array fallback is fine)
setForecast(fc.status === "fulfilled" ? fc.value.data : []);

// Always end with setLoading(false)
setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleRefresh() { setIsRefreshing(true); await fetchAll(); setIsRefreshing(false); }

  // ── PDF Report ────────────────────────────────────────────────────────────
  const [isPrinting, setIsPrinting] = useState(false);
  function handlePrint() {
    setIsPrinting(true);
    const dateStr = new Date().toLocaleString([], { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    document.body.setAttribute("data-print-date", dateStr);
    setTimeout(() => { window.print(); setIsPrinting(false); document.body.removeAttribute("data-print-date"); }, 120);
  }

  const riskKey = (silo?.risk_level?.toLowerCase() || "none") as RiskLevel;
  const risk    = RISK[riskKey] || RISK.none;

  return (
    <div className="min-h-full flex flex-col gap-5 max-w-6xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <Link href="/"
            className="flex items-center justify-center size-9 rounded-xl glass-tactical transition-all shrink-0 mt-0.5 hover:scale-105"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            {loading
              ? <><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-3 w-36" /></>
              : <>
                <h1 className="font-outfit font-extrabold text-2xl leading-tight" style={{ color: "var(--text-primary)" }}>{silo?.name}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin size={11} style={{ color: "var(--text-muted)" }} />
                  <span className="font-plus-jakarta text-xs" style={{ color: "var(--text-secondary)" }}>{silo?.location}</span>
                </div>
              </>
            }
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2" data-print-hide="true">
          <motion.button onClick={handleRefresh}
            whileHover={{ scale: 1.06, boxShadow: "0 0 18px var(--accent-glow)" }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-tactical font-outfit font-medium text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
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

          <motion.button onClick={handlePrint} disabled={isPrinting}
            whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(139,92,246,0.35), 0 0 40px rgba(139,92,246,0.15)" }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-outfit font-medium text-sm backdrop-blur-md overflow-hidden border"
            style={{
              background: isPrinting ? "rgba(139,92,246,0.12)" : "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(168,85,247,0.05) 100%)",
              borderColor: "rgba(139,92,246,0.25)",
              color: isPrinting ? "#9333ea" : "#7c3aed",
            }}
          >
            <motion.span className="absolute inset-0 rounded-xl"
              animate={isPrinting ? { opacity: [0.05, 0.15, 0.05] } : { opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)" }}
            />
            <Download size={13} className="relative z-10" />
            <span className="relative z-10">{isPrinting ? "Preparing…" : "PDF Report"}</span>
          </motion.button>
        </div>
      </div>

      {/* ── TOP ROW: Identity + Risk + Readings ── */}
      {loading
        ? <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="col-span-2 sm:col-span-2 flex items-center gap-3 px-4 py-3.5 rounded-2xl glass-tactical">
              <div className="flex items-center justify-center size-11 rounded-2xl shrink-0 glass-tactical" style={{ color: "var(--text-secondary)" }}>
                <CropIcon crop={silo?.crop_type ?? "wheat"} size={24} className="text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-outfit font-bold text-sm capitalize truncate" style={{ color: "var(--text-primary)" }}>{silo?.crop_type}</p>
                <p className="font-plus-jakarta text-[10px]" style={{ color: "var(--text-muted)" }}>#{silo?.id.toUpperCase()}</p>
              </div>
              <motion.span
                animate={risk.pulse ? { boxShadow: [`0 0 0px ${risk.glow}`, `0 0 14px 3px ${risk.peak}`, `0 0 0px ${risk.glow}`] } : { boxShadow: `0 0 0px ${risk.glow}` }}
                transition={risk.pulse ? { duration: risk.dur, repeat: Infinity, ease: "easeInOut" } : {}}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold font-outfit border shrink-0`}
                style={{ color: risk.color, backgroundColor: risk.bg, borderColor: risk.border }}
              >
                {risk.icon}{risk.label}
              </motion.span>
            </div>
            <SensorWidget icon={<Thermometer size={11} style={{ color: "#f59e0b" }} />} label="Temperature" value={silo?.temperature ?? 0} unit="°C" />
            <SensorWidget icon={<Droplets size={11} style={{ color: "#0ea5e9" }} />}    label="Humidity"    value={silo?.humidity ?? 0}    unit="%" />
            <CapacityWidget pct={silo?.fill_pct ?? 0} />
          </div>
      }

      {/* ── MIDDLE ROW: Sensor Chart ── */}
      <section>
        <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-secondary)" }}>
          Sensor History &amp; AI Forecast
        </p>
        <div className="rounded-2xl glass-tactical p-4">
          <div className="h-56">
            {loading ? <Skeleton className="w-full h-full" /> : <SensorChart data={sensors} forecastData={forecast} />}
          </div>
        </div>
      </section>

      {/* ── THERMAL ROW ── */}
      <section data-print-section="avoid-break">
        <div className="rounded-2xl glass-tactical p-5">
          {loading
            ? <Skeleton className="h-56 w-full" />
            : <ThermalSiloMap title="Thermal Digital Twin" zones={buildThermalZones(silo?.temperature, silo?.humidity)} />
          }
        </div>
      </section>

      {/* ── BOTTOM ROW: AI Scanner + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-6">
        <section className="flex flex-col">
          <div className="mb-2">
            <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>AI Vision Scanner</p>
            <p className="font-plus-jakarta text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Upload a grain photo for disease detection</p>
          </div>
          <AIVisionScanner siloId={(id as string) || "unknown"} />
        </section>

        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>Recent Alerts</p>
            {alerts.some(a => !a.is_read) && (
              <span className="px-2 py-0.5 rounded-full text-white text-[9px] font-bold font-outfit"
                style={{ backgroundColor: "var(--alert)" }}>
                {alerts.filter(a => !a.is_read).length} new
              </span>
            )}
          </div>
          {loading
            ? <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            : <ul className="flex flex-col gap-2 overflow-y-auto max-h-96">
                <AnimatePresence initial={false}>
                  {alerts.map(a => <AlertRow key={a.id} alert={a} />)}
                </AnimatePresence>
              </ul>
          }
          <div className="flex items-center gap-2 pt-3 mt-auto" style={{ borderTop: "1px solid var(--border-muted)" }}>
            <ShieldAlert size={11} style={{ color: "var(--text-muted)" }} />
            <span className="font-plus-jakarta text-[10px]" style={{ color: "var(--text-muted)" }}>{alerts.length} alerts loaded</span>
          </div>
        </section>
      </div>
    </div>
  );
}