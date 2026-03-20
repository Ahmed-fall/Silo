"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api";
import CropIcon from "@/components/CropIcon";
import {
  Thermometer, Droplets, AlertTriangle, ShieldCheck, Flame,
  RefreshCw, ArrowLeft, MapPin, Clock, ShieldAlert, Wifi, WifiOff,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "medium" | "high";

interface SiloDetail {
  id: string; name: string; location: string;
  risk_level: RiskLevel; crop_type: string;
  temperature?: number; humidity?: number;
}

interface SensorPoint { recorded_at: string; temperature: number; humidity: number; }

interface SiloAlert {
  id: string; message: string; severity: "critical" | "warning" | "info";
  timestamp: string; read: boolean;
}

// ─── Mock data factory ────────────────────────────────────────────────────────

function makeMockSensor(n = 24): SensorPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - i) * 3600_000);
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
  temperature: 28.4, humidity: 71.2,
};

const MOCK_ALERTS: SiloAlert[] = [
  { id:"a1", message:"Temperature exceeded 28°C threshold", severity:"warning",  timestamp: new Date(Date.now()-600000).toISOString(),  read:false },
  { id:"a2", message:"Humidity spike detected — 78%",        severity:"critical", timestamp: new Date(Date.now()-1800000).toISOString(), read:false },
  { id:"a3", message:"Scheduled ventilation cycle complete", severity:"info",     timestamp: new Date(Date.now()-3600000).toISOString(), read:true  },
  { id:"a4", message:"Sensor calibration recommended",       severity:"info",     timestamp: new Date(Date.now()-7200000).toISOString(), read:true  },
];

// ─── Risk config ──────────────────────────────────────────────────────────────

const RISK = {
  none:   { color:"#94a3b8", glow:"rgba(148,163,184,0.4)", label:"Nominal",   icon:<ShieldCheck size={13} className="text-slate-300"/> },
  low:    { color:"#34d399", glow:"rgba(52,211,153,0.45)", label:"Low Risk",  icon:<ShieldCheck size={13} className="text-emerald-300"/> },
  medium: { color:"#fbbf24", glow:"rgba(251,191,36,0.5)",  label:"Med Risk",  icon:<AlertTriangle size={13} className="text-amber-300"/> },
  high:   { color:"#f43f5e", glow:"rgba(244,63,94,0.55)",  label:"High Risk", icon:<Flame       size={13} className="text-rose-300"/> },
} as const;

// ─── Reusable glassmorphic panel ──────────────────────────────────────────────

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)] ${className}`}>
      {children}
    </div>
  );
}

// ─── Gradient number ──────────────────────────────────────────────────────────

function GradientValue({ value, unit, gradient, glow }:
  { value: number; unit: string; gradient: string; glow: string }
) {
  return (
    <p className={`font-outfit font-extrabold text-3xl bg-clip-text text-transparent ${gradient}`}
      style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
    >
      {value.toFixed(1)}<span className="text-lg font-semibold ml-1">{unit}</span>
    </p>
  );
}

// ─── Sensor Widget ─────────────────────────────────────────────────────────────

function SensorWidget({ icon, label, value, unit, gradient, glow }: {
  icon: React.ReactNode; label: string; value: number;
  unit: string; gradient: string; glow: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="font-plus-jakarta text-xs uppercase tracking-widest">{label}</span>
      </div>
      <GradientValue value={value} unit={unit} gradient={gradient} glow={glow} />
    </div>
  );
}

// ─── Neon Chart SVG defs ───────────────────────────────────────────────────────

function NeonDefs() {
  return (
    <defs>
      <linearGradient id="dc-grad-temp" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>
      <linearGradient id="dc-grad-hum" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <filter id="dc-glow-temp" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b1" />
        <feFlood floodColor="#f97316" floodOpacity="0.6" result="c1" />
        <feComposite in="c1" in2="b1" operator="in" result="g1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
        <feFlood floodColor="#f43f5e" floodOpacity="0.4" result="c2" />
        <feComposite in="c2" in2="b2" operator="in" result="g2" />
        <feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="dc-glow-hum" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b1" />
        <feFlood floodColor="#06b6d4" floodOpacity="0.6" result="c1" />
        <feComposite in="c1" in2="b1" operator="in" result="g1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
        <feFlood floodColor="#3b82f6" floodOpacity="0.4" result="c2" />
        <feComposite in="c2" in2="b2" operator="in" result="g2" />
        <feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  );
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const time = label ? new Date(label).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "";
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <p className="font-outfit text-slate-500 text-[10px] tracking-widest uppercase mb-2">{time}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="size-2 rounded-full inline-block" style={{ background: e.color, boxShadow: `0 0 6px ${e.color}` }} />
          <span className="font-plus-jakarta text-slate-300 capitalize text-xs">{e.name}</span>
          <span className="font-outfit font-bold ml-auto pl-3 text-sm" style={{ color: e.color }}>
            {e.value.toFixed(1)}{e.name === "temperature" ? "°C" : "%"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Alert severity config ─────────────────────────────────────────────────────

const SEV_CFG = {
  critical: { icon:<Flame size={13}/>,        dot:"bg-rose-500",  text:"text-rose-300",  border:"border-rose-500/30"  },
  warning:  { icon:<AlertTriangle size={13}/>, dot:"bg-amber-400", text:"text-amber-300", border:"border-amber-500/30" },
  info:     { icon:<ShieldCheck size={13}/>,   dot:"bg-sky-400",   text:"text-sky-300",   border:"border-sky-500/20"   },
} as const;

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: SiloAlert }) {
  const s = SEV_CFG[alert.severity];
  const time = new Date(alert.timestamp).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{    opacity: 0, x: 20 }}
      transition={{ type:"spring", stiffness:300, damping:28 }}
      className={`relative flex items-start gap-2.5 px-4 py-3 rounded-2xl border ${s.border} bg-slate-950/60 ${alert.read ? "opacity-50" : ""}`}
    >
      {!alert.read && <span className={`absolute top-3 right-3 size-1.5 rounded-full ${s.dot} animate-pulse`} />}
      <span className={s.text}>{s.icon}</span>
      <div className="flex-1 min-w-0 pr-3">
        <p className={`text-xs leading-snug ${alert.read ? "text-slate-500" : s.text}`}>{alert.message}</p>
        <p className="text-[10px] text-slate-600 mt-1 font-mono">{time}</p>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-800/60 ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiloDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [silo,    setSilo]    = useState<SiloDetail | null>(null);
  const [sensors, setSensors] = useState<SensorPoint[]>([]);
  const [alerts,  setAlerts]  = useState<SiloAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const spinCtrl = useAnimationControls();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const timeout = 5_000;
    const [s, sens, al] = await Promise.allSettled([
      axios.get<SiloDetail>(`${API_BASE}/silos/${id}`,   { timeout }),
      axios.get<SensorPoint[]>(`${API_BASE}/sensors/${id}`, { timeout }),
      axios.get<SiloAlert[]>(`${API_BASE}/alerts/${id}`,    { timeout }),
    ]);
    setSilo(  s.status    === "fulfilled" ? s.value.data    : { ...MOCK_SILO, id: id ?? MOCK_SILO.id });
    setSensors(sens.status === "fulfilled" ? sens.value.data : makeMockSensor(24));
    setAlerts( al.status   === "fulfilled" ? al.value.data   : MOCK_ALERTS);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleRefresh() {
    spinCtrl.start({ rotate:[0,360], transition:{ duration:0.7, ease:[0.4,0,0.2,1] } });
    await fetchAll();
    spinCtrl.set({ rotate:0 });
  }

  const riskCfg = silo ? RISK[silo.risk_level] : RISK.none;
  const formatTick = (iso: string) => new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

  return (
    <div className="min-h-full flex flex-col gap-6">

      {/* ── Topbar: Back + Title + Refresh ── */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="flex items-start gap-3">
          <Link href="/"
            className="flex items-center justify-center size-9 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/8 transition-all shrink-0 mt-0.5"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            {loading
              ? <><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-3 w-32" /></>
              : <>
                  <h1 className="font-outfit font-extrabold text-2xl text-white leading-none">{silo?.name}</h1>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <MapPin size={11} className="text-slate-600" />
                    <span className="font-plus-jakarta text-slate-500 text-xs">{silo?.location}</span>
                  </div>
                </>
            }
          </div>
        </div>

        <motion.button
          onClick={handleRefresh}
          whileHover={{ scale:1.08, boxShadow:"0 0 20px rgba(52,211,153,0.25)" }}
          whileTap={{ scale:0.94 }}
          transition={{ type:"spring", stiffness:340, damping:24 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/9 text-slate-300 font-outfit font-medium text-sm backdrop-blur-md hover:text-white hover:border-white/15 transition-colors"
        >
          <motion.span animate={spinCtrl} className="inline-flex"><RefreshCw size={13} /></motion.span>
          Refresh
        </motion.button>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ══ LEFT COL: Info + Sensors ══ */}
        <Panel className="lg:col-span-1 p-6 flex flex-col gap-5">

          {/* Risk badge + crop icon */}
          {loading
            ? <div className="flex items-start gap-3"><Skeleton className="size-14 rounded-2xl" /><Skeleton className="h-9 w-28 rounded-full" /></div>
            : <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-white/5 border border-white/10 text-slate-300 shrink-0">
                  <CropIcon crop={silo?.crop_type ?? "wheat"} size={30} className="text-current" />
                </div>

                {/* 3D Risk badge */}
                <motion.span
                  animate={{ boxShadow: ["0 0 0px transparent, inset 0 1px 0 rgba(255,255,255,0.15)",
                    `0 0 22px 5px ${riskCfg.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                    "0 0 0px transparent, inset 0 1px 0 rgba(255,255,255,0.15)"] }}
                  transition={{ duration: silo?.risk_level === "high" ? 1.5 : 2.4, repeat: Infinity, ease:"easeInOut" }}
                  className="self-start flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold font-outfit"
                  style={{
                    background: `linear-gradient(150deg, ${riskCfg.color}25 0%, ${riskCfg.color}10 100%)`,
                    border: `1px solid ${riskCfg.color}55`,
                    color: riskCfg.color,
                  }}
                >
                  {riskCfg.icon}
                  {riskCfg.label}
                </motion.span>
              </div>
          }

          <div className="h-px bg-white/5" />

          {/* Section header */}
          <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-slate-600">Live Readings</p>

          {/* Sensor widgets */}
          {loading
            ? <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
            : <div className="grid grid-cols-2 gap-3">
                <SensorWidget
                  icon={<Thermometer size={13} />} label="Temp"
                  value={silo?.temperature ?? 0} unit="°C"
                  gradient="bg-gradient-to-r from-amber-400 to-orange-500"
                  glow="rgba(251,146,60,0.55)"
                />
                <SensorWidget
                  icon={<Droplets size={13} />} label="Humidity"
                  value={silo?.humidity ?? 0} unit="%"
                  gradient="bg-gradient-to-r from-cyan-400 to-blue-500"
                  glow="rgba(34,211,238,0.55)"
                />
              </div>
          }

          {/* Crop info */}
          {!loading && silo?.crop_type && (
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
              <span className="font-plus-jakarta text-slate-600 text-[10px] tracking-widest uppercase">Stored crop</span>
              <span className="font-outfit font-semibold text-slate-200 text-sm capitalize">{silo.crop_type}</span>
            </div>
          )}
        </Panel>

        {/* ══ RIGHT COL: Alerts ══ */}
        <Panel className="lg:col-span-1 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-slate-500" />
              <h2 className="font-outfit font-bold text-sm text-white">Recent Alerts</h2>
            </div>
            {alerts.some((a) => !a.read) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600/80 text-white text-[9px] font-bold font-outfit">
                {alerts.filter((a) => !a.read).length} new
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-72 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
            {loading
              ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
              : <AnimatePresence initial={false}>
                  {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
                </AnimatePresence>
            }
          </div>

          {/* WS status */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            <Wifi size={11} className="text-emerald-500" />
            <span className="font-plus-jakarta text-emerald-500 text-[10px]">WebSocket live</span>
            <span className="ml-auto font-plus-jakarta text-slate-600 text-[10px]">{alerts.length} total</span>
          </div>
        </Panel>

        {/* ══ BOTTOM: Sensor Chart ══ (spans full width on large screens) */}
        <Panel className="lg:col-span-3 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-outfit font-bold text-sm text-white">Sensor History — 24h</h2>
              <p className="font-plus-jakarta text-slate-500 text-[11px] mt-0.5">Temperature and humidity over the last 24 hours</p>
            </div>
            <div className="flex items-center gap-4">
              {[
                { label:"Temp (°C)",  gradient:"linear-gradient(90deg,#f59e0b,#f43f5e)", glow:"rgba(249,115,22,0.7)" },
                { label:"Humidity (%)",gradient:"linear-gradient(90deg,#06b6d4,#3b82f6)", glow:"rgba(6,182,212,0.7)" },
              ].map(({ label, gradient, glow }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.75 w-5 rounded-full" style={{ background:gradient, boxShadow:`0 0 5px ${glow}` }} />
                  <span className="font-plus-jakarta text-slate-500 text-[11px]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart — explicit height fixes the -1px Recharts warning */}
          <div className="w-full h-64">
            {loading
              ? <Skeleton className="w-full h-full" />
              : <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensors} margin={{ top:8, right:12, left:-12, bottom:0 }}>
                    {/* @ts-expect-error Recharts allows SVG children */}
                    <NeonDefs />
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.06)" vertical={false} />
                    <XAxis dataKey="recorded_at" tickFormatter={formatTick}
                      tick={{ fill:"#475569", fontSize:10, fontFamily:"var(--font-outfit)" }}
                      axisLine={false} tickLine={false} minTickGap={40}
                    />
                    <YAxis tick={{ fill:"#475569", fontSize:10, fontFamily:"var(--font-outfit)" }}
                      axisLine={false} tickLine={false} width={34}
                    />
                    <Tooltip content={<ChartTooltip />}
                      cursor={{ stroke:"rgba(148,163,184,0.08)", strokeWidth:1, strokeDasharray:"4 4" }}
                    />
                    <Legend content={() => null} />
                    <Line type="monotone" dataKey="temperature"
                      stroke="url(#dc-grad-temp)" strokeWidth={2.5} dot={false}
                      activeDot={{ r:5, fill:"#fb923c", stroke:"rgba(249,115,22,0.4)", strokeWidth:4 }}
                      filter="url(#dc-glow-temp)"
                    />
                    <Line type="monotone" dataKey="humidity"
                      stroke="url(#dc-grad-hum)" strokeWidth={2.5} dot={false}
                      activeDot={{ r:5, fill:"#38bdf8", stroke:"rgba(56,189,248,0.4)", strokeWidth:4 }}
                      filter="url(#dc-glow-hum)"
                    />
                  </LineChart>
                </ResponsiveContainer>
            }
          </div>
        </Panel>
      </div>
    </div>
  );
}
