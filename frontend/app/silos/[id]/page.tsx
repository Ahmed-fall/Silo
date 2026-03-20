"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import SensorChart, { type SensorReading } from "@/components/SensorChart";
import AIVisionScanner from "@/components/AIVisionScanner";
import {
  ArrowLeft,
  MapPin,
  Thermometer,
  Droplets,
  AlertTriangle,
  ShieldCheck,
  Flame,
  Activity,
  Bell,
  Wheat,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "medium" | "high";

interface SiloDetail {
  id: string;
  name: string;
  location: string;
  risk_level: RiskLevel;
  capacity_tons?: number;
  grain_type?: string;
}

interface AlertEntry {
  id: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  read: boolean;
}

// ─── Risk style map ───────────────────────────────────────────────────────────

const RISK_CFG: Record<RiskLevel, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
  none:   { label: "Nominal",     color: "text-slate-300",  glow: "shadow-slate-700/40",   icon: <ShieldCheck size={16} className="text-slate-400" /> },
  low:    { label: "Low Risk",    color: "text-emerald-300",glow: "shadow-emerald-700/40", icon: <ShieldCheck size={16} className="text-emerald-400" /> },
  medium: { label: "Medium Risk", color: "text-amber-300",  glow: "shadow-amber-700/40",   icon: <AlertTriangle size={16} className="text-amber-400" /> },
  high:   { label: "High Risk",   color: "text-rose-300",   glow: "shadow-rose-700/60",    icon: <Flame size={16} className="text-rose-400" /> },
};

const SEVERITY_CFG = {
  critical: { border: "border-rose-700/50",  bg: "bg-rose-950/30",  text: "text-rose-300",  icon: <Flame size={13} className="text-rose-400 shrink-0 mt-0.5" /> },
  warning:  { border: "border-amber-700/50", bg: "bg-amber-950/30", text: "text-amber-300", icon: <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" /> },
  info:     { border: "border-sky-700/50",   bg: "bg-sky-950/30",   text: "text-sky-300",   icon: <Bell size={13} className="text-sky-400 shrink-0 mt-0.5" /> },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

function buildMockSensors(id: string): SensorReading[] {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => ({
    recorded_at: new Date(now - (23 - i) * 3600_000).toISOString(),
    temperature: 22 + Math.sin(i / 4) * 4 + (id.charCodeAt(3) % 3),
    humidity:    55 + Math.cos(i / 3) * 8 + (id.charCodeAt(4) % 5),
  }));
}

const MOCK_SILO: SiloDetail = {
  id: "s-001", name: "Alpha Depot", location: "Cairo Governorate, EG",
  risk_level: "medium", capacity_tons: 5000, grain_type: "Wheat",
};

const MOCK_ALERTS: AlertEntry[] = [
  { id: "a1", message: "Temperature spike detected — check ventilation.",  severity: "warning",  timestamp: new Date(Date.now() - 3600_000).toISOString(), read: false },
  { id: "a2", message: "Humidity exceeded 70% threshold.",                 severity: "critical", timestamp: new Date(Date.now() - 7200_000).toISOString(), read: false },
  { id: "a3", message: "Scheduled maintenance completed successfully.",    severity: "info",     timestamp: new Date(Date.now() - 86400_000).toISOString(), read: true  },
];

// ─── Skeleton widget ──────────────────────────────────────────────────────────

function SkeletonWidget({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse ${className}`}
    />
  );
}

// ─── Bento Glass Widget ───────────────────────────────────────────────────────

function Widget({
  children,
  className = "",
  title,
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-800
        bg-slate-900/40 backdrop-blur-md
        p-5 flex flex-col gap-4
        ${className}
      `}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          {icon && <span className="text-slate-500">{icon}</span>}
          <span className="font-space-grotesk text-xs font-semibold text-slate-400 tracking-widest uppercase">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
      <div className="text-slate-500">{icon}</div>
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-widest">{label}</p>
        <p className="font-space-grotesk text-slate-100 text-lg font-bold leading-none mt-0.5">
          {value}<span className="text-slate-500 text-xs ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiloDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [silo, setSilo]         = useState<SiloDetail | null>(null);
  const [sensors, setSensors]   = useState<SensorReading[]>([]);
  const [alerts, setAlerts]     = useState<AlertEntry[]>([]);
  const [loadingSilo, setLoadingSilo]     = useState(true);
  const [loadingSensors, setLoadingSensors] = useState(true);
  const [loadingAlerts, setLoadingAlerts]   = useState(true);
  const [siloError, setSiloError] = useState<string | null>(null);

  // Fetch silo info
  useEffect(() => {
    axios.get<SiloDetail>(`${API_BASE}/silos/${id}`, { timeout: 6_000 })
      .then(({ data }) => setSilo(data))
      .catch(() => { setSilo({ ...MOCK_SILO, id }); })
      .finally(() => setLoadingSilo(false));
  }, [id]);

  // Fetch sensor readings
  useEffect(() => {
    axios.get<SensorReading[]>(`${API_BASE}/sensors/${id}`, { timeout: 6_000 })
      .then(({ data }) => setSensors(data))
      .catch(() => { setSensors(buildMockSensors(id)); })
      .finally(() => setLoadingSensors(false));
  }, [id]);

  // Fetch alerts
  useEffect(() => {
    axios.get<AlertEntry[]>(`${API_BASE}/alerts/${id}`, { timeout: 6_000 })
      .then(({ data }) => setAlerts(data))
      .catch(() => { setAlerts(MOCK_ALERTS); })
      .finally(() => setLoadingAlerts(false));
  }, [id]);

  // Derived latest sensor values
  const latest = sensors.at(-1);
  const risk = (silo?.risk_level ?? "none") as RiskLevel;
  const riskCfg = RISK_CFG[risk];

  void siloError; // unused — we always fall back to mock

  return (
    <div className="flex flex-col gap-6 min-h-full">

      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="
            flex items-center gap-2 text-slate-500 hover:text-slate-200
            text-sm transition-colors group
          "
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          All Silos
        </Link>
        <span className="text-slate-700">/</span>
        {loadingSilo
          ? <div className="h-4 w-28 rounded bg-slate-800 animate-pulse" />
          : <span className="text-slate-300 text-sm">{silo?.name}</span>
        }
      </div>

      {/* ── Page title ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!loadingSilo && silo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
          >
            <div>
              <h1 className="font-space-grotesk text-3xl font-bold text-white tracking-tight">
                {silo.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-sm">
                <MapPin size={13} />
                {silo.location}
              </div>
            </div>

            {/* Risk badge */}
            <div
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl
                border border-slate-700/60 bg-slate-900/60
                shadow-lg ${riskCfg.glow}
              `}
            >
              {riskCfg.icon}
              <span className={`font-space-grotesk font-semibold text-sm ${riskCfg.color}`}>
                {riskCfg.label}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bento Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">

        {/* ── 1. Live Stats — col 1, spans 1 col on md ─────────────────── */}
        {loadingSilo || loadingSensors ? (
          <SkeletonWidget className="md:col-span-1 h-52" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="md:col-span-1"
          >
            <Widget title="Live Readings" icon={<Activity size={14} />} className="h-full">
              <div className="flex flex-col gap-3">
                <StatChip
                  icon={<Thermometer size={18} />}
                  label="Temperature"
                  value={latest?.temperature.toFixed(1) ?? "—"}
                  unit="°C"
                />
                <StatChip
                  icon={<Droplets size={18} />}
                  label="Humidity"
                  value={latest?.humidity.toFixed(1) ?? "—"}
                  unit="%"
                />
                {silo?.capacity_tons && (
                  <StatChip
                    icon={<Wheat size={18} />}
                    label="Capacity"
                    value={silo.capacity_tons.toLocaleString()}
                    unit="t"
                  />
                )}
              </div>
            </Widget>
          </motion.div>
        )}

        {/* ── 2. Neon Sensor Chart — col 2–3 ───────────────────────────── */}
        {loadingSensors ? (
          <SkeletonWidget className="md:col-span-2 h-72" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2"
          >
            <Widget title="Sensor History (24 h)" icon={<Activity size={14} />} className="h-full">
              <div className="h-56">
                <SensorChart data={sensors} />
              </div>
            </Widget>
          </motion.div>
        )}

        {/* ── 3. AI Vision Scanner — col 1–2 ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="md:col-span-2"
        >
          <Widget title="AI Vision Scanner" icon={<Activity size={14} />} className="h-full">
            <AIVisionScanner siloId={id} />
          </Widget>
        </motion.div>

        {/* ── 4. Alerts feed — col 3 ───────────────────────────────────── */}
        {loadingAlerts ? (
          <SkeletonWidget className="md:col-span-1 h-80" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-1"
          >
            <Widget title="Recent Alerts" icon={<Bell size={14} />} className="h-full">
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72 pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                {alerts.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-slate-600 text-sm">
                    No alerts for this silo.
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {alerts.map((alert, i) => {
                      const scfg = SEVERITY_CFG[alert.severity];
                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`
                            rounded-xl border px-3 py-2.5
                            ${scfg.border} ${scfg.bg}
                            ${alert.read ? "opacity-50" : ""}
                          `}
                        >
                          <div className="flex items-start gap-2">
                            {scfg.icon}
                            <p className={`text-xs leading-snug ${scfg.text}`}>
                              {alert.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-slate-600 text-[10px]">
                            <Clock size={10} />
                            {new Date(alert.timestamp).toLocaleString([], {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </Widget>
          </motion.div>
        )}
      </div>
    </div>
  );
}
