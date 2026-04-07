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
  RefreshCw, ArrowLeft, MapPin, ShieldAlert, Clock,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "medium" | "high";

interface SiloDetail {
  id: string; name: string; location: string;
  risk_level: RiskLevel; crop_type: string;
  temperature?: number; humidity?: number;
}

interface SiloAlert {
  id: string; message: string;
  severity: "critical" | "warning" | "info";
  timestamp: string; read: boolean;
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
};

const MOCK_ALERTS: SiloAlert[] = [
  { id: "a1", message: "Temperature exceeded 28 °C threshold", severity: "warning", timestamp: new Date(Date.now() - 600_000).toISOString(), read: false },
  { id: "a2", message: "Humidity spike detected — 78 %", severity: "critical", timestamp: new Date(Date.now() - 1_800_000).toISOString(), read: false },
  { id: "a3", message: "Scheduled ventilation cycle complete", severity: "info", timestamp: new Date(Date.now() - 3_600_000).toISOString(), read: true },
  { id: "a4", message: "Sensor calibration recommended", severity: "info", timestamp: new Date(Date.now() - 7_200_000).toISOString(), read: true },
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
    <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07]">
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

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: SiloAlert }) {
  const s = SEV[alert.severity];
  const time = new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <motion.li layout
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`relative flex items-start gap-2.5 px-4 py-3 rounded-xl border ${s.border} bg-slate-950/60 ${alert.read ? "opacity-50" : ""}`}
    >
      {!alert.read && <span className={`absolute top-3 right-3 size-1.5 rounded-full ${s.dot} animate-pulse`} />}
      <span className={`${s.text} shrink-0 mt-0.5`}>{s.icon}</span>
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-xs leading-snug ${alert.read ? "text-slate-500" : s.text}`}>{alert.message}</p>
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
  const [alerts, setAlerts] = useState<SiloAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const timeout = 2_000;
    const [s, sens, al] = await Promise.allSettled([
      axios.get<SiloDetail>(`${API_BASE}/silos/${id}`, { timeout }),
      axios.get<SensorReading[]>(`${API_BASE}/sensors/${id}`, { timeout }),
      axios.get<SiloAlert[]>(`${API_BASE}/alerts/${id}`, { timeout }),
    ]);
    setSilo(s.status === "fulfilled" ? s.value.data : { ...MOCK_SILO, id: id ?? MOCK_SILO.id });
    setSensors(sens.status === "fulfilled" ? sens.value.data : makeMockSensor(24));
setAlerts(al.status === "fulfilled" ? al.value.data.map((a: any) => ({
  ...a,
  severity: a.risk_level === "high" ? "critical" : a.risk_level === "medium" ? "warning" : "info",
  timestamp: a.triggered_at,
  read: a.is_read,
})) : MOCK_ALERTS);    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }

  const risk = RISK[silo?.risk_level ?? "none"];

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
        <motion.button onClick={handleRefresh}
          whileHover={{ scale: 1.06, boxShadow: "0 0 18px rgba(52,211,153,0.22)" }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-300 font-outfit font-medium text-sm hover:text-white hover:border-white/[0.15] transition-colors backdrop-blur-md"
        >
          <motion.span
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.3 }}
            className="inline-flex"
          >
            <RefreshCw size={13} />
          </motion.span>            Refresh
        </motion.button>
      </div>

      {/* ── TOP ROW: Identity + Risk + Live Readings (horizontal) ── */}
      {loading
        ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        : <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* Silo identity + risk */}
          <div className="col-span-2 sm:col-span-2 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.07]">
            <div className="flex items-center justify-center size-11 rounded-2xl bg-slate-800 border border-white/[0.07] text-slate-300 shrink-0">
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
        </div>
      }

      {/* ── MIDDLE ROW: Sensor History Chart (full width) ── */}
      <section>
        <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] text-slate-600 uppercase mb-2">
          Sensor History — 24 h
        </p>
        <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] p-4">
          <div className="h-56">
            {loading
              ? <Skeleton className="w-full h-full" />
              : <SensorChart data={sensors} />
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
            {alerts.some((a) => !a.read) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600/80 text-white text-[9px] font-bold font-outfit">
                {alerts.filter((a) => !a.read).length} new
              </span>
            )}
          </div>

          {loading
            ? <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            : <ul className="flex flex-col gap-2 overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
              <AnimatePresence initial={false}>
                {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
              </AnimatePresence>
            </ul>
          }

          {/* Connection status footer */}
          <div className="flex items-center gap-2 pt-3 mt-auto border-t border-white/[0.05]">
            <ShieldAlert size={11} className="text-slate-700" />
            <span className="font-plus-jakarta text-slate-600 text-[10px]">{alerts.length} alerts loaded</span>
          </div>
        </section>
      </div>
    </div>
  );
}