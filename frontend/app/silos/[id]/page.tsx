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

function generateMockForecast(history: SensorReading[], hours = 12): SensorReading[] {
  if (history.length === 0) return [];
  const last = history[history.length - 1];
  let temp = last.temperature;
  let hum = last.humidity;
  return Array.from({ length: hours }, (_, i) => {
    temp = temp + (Math.random() - 0.48) * 1.4;
    hum = hum + (Math.random() - 0.48) * 1.8;
    const t = new Date(last.recorded_at);
    t.setHours(t.getHours() + i + 1);
    return {
      recorded_at: t.toISOString(),
      temperature: parseFloat(temp.toFixed(2)),
      humidity: parseFloat(hum.toFixed(2)),
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
    const siloData = s.status === "fulfilled" ? s.value.data : { ...MOCK_SILO, id: id ?? MOCK_SILO.id };
    const sensorsData = sens.status === "fulfilled" ? sens.value.data : makeMockSensor(24);
    
    setSilo(siloData);
    setSensors(sensorsData);
    setAlerts(al.status === "fulfilled" 
      ? al.value.data.map((a: SiloAlert) => ({
          ...a,
          risk_level: (a.risk_level ?? "low") as RiskLevel,
          triggered_at: a.triggered_at,
          is_read: a.is_read ?? false,
        }))
      : MOCK_ALERTS
    );

    // Compute forecast in parent so both screen SensorChart and handlePrint share the exact same dataset
    const forecastData = fc.status === "fulfilled" ? fc.value.data : generateMockForecast(sensorsData, 12);
    setForecast(forecastData);

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
    
    // Dynamic diagnostic summaries
    const riskKey = (silo?.risk_level?.toLowerCase() || "none") as RiskLevel;
    const risk = RISK[riskKey] || RISK.none;
    const calculatedGrainMass = silo 
      ? Math.round((silo.capacity_kg ?? 0) * (silo.fill_pct ?? 0) / 100).toLocaleString() 
      : "0";
    
    let aiHeadline = "NOMINAL PRESERVATION CONDITIONS";
    let aiDescription = `Storage facility #${silo?.id?.toUpperCase() || ""} environment is verified safe. Core temperature and humidity readings reside comfortably within optimal botanical preservation boundaries for crop specimen: ${silo?.crop_type || ""}. No action required.`;
    
    if (riskKey === "high") {
      aiHeadline = "CRITICAL BREACH STATE DETECTED";
      aiDescription = `Environmental thresholds have been severely compromised at #${silo?.id?.toUpperCase() || ""}. Temperature is recorded at ${silo?.temperature?.toFixed(1) || "0.0"}°C and relative humidity at ${silo?.humidity?.toFixed(1) || "0.0"}%. Prompt administrative action, ventilation activation, and crop salvage protocols are required immediately.`;
    } else if (riskKey === "medium") {
      aiHeadline = "ELEVATED PRESERVATION ANOMALIES";
      aiDescription = `Registry alert: #${silo?.id?.toUpperCase() || ""} is currently showing elevated risk metrics. Relative humidity levels or ambient temperatures are hovering near maximum safety limits. Preventive ventilation sweeps are recommended to stabilize the grain mass.`;
    }

    const activeAlerts = alerts.filter(a => !a.is_read);
    let alertsHtml = "";
    if (activeAlerts.length === 0) {
      alertsHtml = `
        <div style="background: rgba(164, 130, 89, 0.04); border: 1px dashed rgba(164, 130, 89, 0.25); padding: 16px; font-size: 8.5pt; color: #6B5E4E; text-align: center;">
          No active alerts or incident bulletins recorded for this storage asset.
        </div>
      `;
    } else {
      alertsHtml = `
        <table class="alerts-table">
          <thead>
            <tr>
              <th style="width: 15%;">Alert ID</th>
              <th style="width: 15%;">Risk Level</th>
              <th style="width: 50%;">Security Bulletin / Incident Description</th>
              <th style="width: 20%;">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${activeAlerts.map(a => {
              const alertRisk = a.risk_level?.toLowerCase() || "info";
              const timeStr = a.triggered_at 
                ? new Date(a.triggered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " " + new Date(a.triggered_at).toLocaleDateString([], { month: "short", day: "numeric" })
                : "N/A";
              return `
                <tr>
                  <td style="font-family: 'IBM Plex Mono', monospace; font-weight: 600; color: #A48259;">#${a.id.toUpperCase()}</td>
                  <td>
                    <span class="status-badge ${alertRisk === "high" ? "status-high" : alertRisk === "medium" ? "status-medium" : "status-nominal"}" style="font-size: 7.5pt; padding: 1px 6px;">
                      ${a.risk_level}
                    </span>
                  </td>
                  <td>${a.message}</td>
                  <td style="font-family: 'IBM Plex Mono', monospace; color: #6B5E4E; font-size: 8pt;">${timeStr}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    }

    // ── Thermal Layer Data Compiler ──
    const tempTheme = (t: number) => {
      if (t <= 23) return {
        bg: "rgba(59,130,246,0.12)",
        border: "rgba(96,165,250,0.35)",
        textColor: "#2563eb",
        label: "Safe",
      };
      if (t <= 27) return {
        bg: "rgba(64,224,208,0.12)",
        border: "rgba(64,224,208,0.35)",
        textColor: "#0d9488",
        label: "Normal",
      };
      if (t <= 32) return {
        bg: "rgba(205,127,50,0.12)",
        border: "rgba(205,127,50,0.35)",
        textColor: "#b45309",
        label: "Caution",
      };
      return {
        bg: "rgba(225,29,72,0.10)",
        border: "rgba(225,29,72,0.35)",
        textColor: "#be123c",
        label: "Critical",
      };
    };

    const zones = buildThermalZones(silo?.temperature, silo?.humidity);
    const topTheme = tempTheme(zones[0].temp);
    const bottomTheme = tempTheme(zones[zones.length - 1].temp);

    const thermalTwinHtml = `
      <div class="twin-container">
        <!-- Silo Cylinder Visual -->
        <div class="silo-visual">
          <div class="silo-cap-top" style="background: ${topTheme.bg}; border-color: ${topTheme.border};"></div>
          <div class="silo-body">
            ${zones.map((zone, idx) => {
              const theme = tempTheme(zone.temp);
              return `
                <div class="silo-zone" style="height: ${zone.heightFraction * 100}%; background: ${theme.bg};">
                  <span class="silo-zone-label">${zone.label}</span>
                  <span class="silo-zone-temp" style="color: ${theme.textColor};">${zone.temp}°C</span>
                </div>
              `;
            }).join("")}
          </div>
          <div class="silo-cap-bottom" style="background: ${bottomTheme.bg}; border-color: ${bottomTheme.border};"></div>
          <div class="silo-shadow"></div>
        </div>

        <!-- Legend Block -->
        <div class="twin-legend">
          <div class="legend-header">Thermal Stratification Analysis</div>
          ${[...zones].reverse().map(zone => {
            const theme = tempTheme(zone.temp);
            return `
              <div class="legend-row">
                <div class="legend-swatch" style="background: ${theme.bg}; border-color: ${theme.border};"></div>
                <div class="legend-text">
                  <span class="legend-temp" style="color: ${theme.textColor};">${zone.temp}°C</span>
                  <span class="legend-desc">· ${zone.label} Layer (${theme.label})</span>
                </div>
              </div>
            `;
          }).join("")}
          
          <div style="border-top: 1px dashed rgba(164, 130, 89, 0.2); margin: 8px 0; padding-top: 6px;"></div>
          
          <div class="legend-thresholds">
            <div>&le; 23&deg;C <span style="color: #2563eb;">&rarr; Safe</span></div>
            <div>24-27&deg;C <span style="color: #0d9488;">&rarr; Normal</span></div>
            <div>28-32&deg;C <span style="color: #b45309;">&rarr; Caution</span></div>
            <div>&gt; 32&deg;C <span style="color: #be123c;">&rarr; Critical</span></div>
          </div>
        </div>
      </div>
    `;

    // ── Static SVG Vector Chart Compiler ──
    const allReadings = [...sensors];
    const forecastReadings = [...forecast];
    if (allReadings.length === 0) {
      allReadings.push(...makeMockSensor(24));
    }
    
    const svgW = 550;
    const svgH = 135;
    const paddingLeft = 32;
    const paddingRight = 32;
    const paddingTop = 15;
    const paddingBottom = 15;
    const totalPoints = allReadings.length + forecastReadings.length;

    const getX = (idx: number, total: number) => paddingLeft + (idx / (total - 1)) * (svgW - paddingLeft - paddingRight);
    
    const getTempY = (val: number) => {
      const minT = 10;
      const maxT = 45;
      return svgH - paddingBottom - ((val - minT) / (maxT - minT)) * (svgH - paddingTop - paddingBottom);
    };
    
    const getHumY = (val: number) => {
      const minH = 30;
      const maxH = 95;
      return svgH - paddingBottom - ((val - minH) / (maxH - minH)) * (svgH - paddingTop - paddingBottom);
    };

    let tempHistoricPath = "";
    let humHistoricPath = "";
    
    allReadings.forEach((r, idx) => {
      const x = getX(idx, totalPoints);
      const ty = getTempY(r.temperature ?? 0);
      const hy = getHumY(r.humidity ?? 0);
      
      if (idx === 0) {
        tempHistoricPath += `M ${x} ${ty}`;
        humHistoricPath += `M ${x} ${hy}`;
      } else {
        tempHistoricPath += ` L ${x} ${ty}`;
        humHistoricPath += ` L ${x} ${hy}`;
      }
    });
    
    let tempForecastPath = "";
    let humForecastPath = "";
    
    if (forecastReadings.length > 0) {
      const startIdx = allReadings.length - 1;
      const startX = getX(startIdx, totalPoints);
      const startR = allReadings[startIdx];
      
      tempForecastPath = `M ${startX} ${getTempY(startR.temperature ?? 0)}`;
      humForecastPath = `M ${startX} ${getHumY(startR.humidity ?? 0)}`;
      
      forecastReadings.forEach((r, idx) => {
        const pointIdx = allReadings.length + idx;
        const x = getX(pointIdx, totalPoints);
        const ty = getTempY(r.temperature ?? 0);
        const hy = getHumY(r.humidity ?? 0);
        
        tempForecastPath += ` L ${x} ${ty}`;
        humForecastPath += ` L ${x} ${hy}`;
      });
    }

    const dividerX = getX(allReadings.length - 1, totalPoints);

    const sensorChartHtml = `
      <div class="chart-container">
        <svg viewBox="0 0 ${svgW} ${svgH}" class="chart-svg">
          <!-- Horizontal Grid Lines -->
          <line x1="${paddingLeft}" y1="${paddingTop}" x2="${svgW - paddingRight}" y2="${paddingTop}" stroke="rgba(164, 130, 89, 0.08)" stroke-width="1" />
          <line x1="${paddingLeft}" y1="${(svgH - paddingBottom - paddingTop) / 2 + paddingTop}" x2="${svgW - paddingRight}" y2="${(svgH - paddingBottom - paddingTop) / 2 + paddingTop}" stroke="rgba(164, 130, 89, 0.08)" stroke-width="1" />
          <line x1="${paddingLeft}" y1="${svgH - paddingBottom}" x2="${svgW - paddingRight}" y2="${svgH - paddingBottom}" stroke="rgba(164, 130, 89, 0.15)" stroke-width="1.5" />
          
          <!-- Axis scale values -->
          <text x="${paddingLeft - 6}" y="${paddingTop + 3}" class="chart-axis-text" text-anchor="end">45°C</text>
          <text x="${paddingLeft - 6}" y="${svgH - paddingBottom + 2}" class="chart-axis-text" text-anchor="end">10°C</text>
          
          <text x="${svgW - paddingRight + 6}" y="${paddingTop + 3}" class="chart-axis-text blue" text-anchor="start">95%</text>
          <text x="${svgW - paddingRight + 6}" y="${svgH - paddingBottom + 2}" class="chart-axis-text blue" text-anchor="start">30%</text>
          
          <!-- Mid values -->
          <text x="${paddingLeft - 6}" y="${(svgH - paddingBottom - paddingTop) / 2 + paddingTop + 3}" class="chart-axis-text" text-anchor="end">27.5°</text>
          <text x="${svgW - paddingRight + 6}" y="${(svgH - paddingBottom - paddingTop) / 2 + paddingTop + 3}" class="chart-axis-text blue" text-anchor="start">62.5%</text>

          <!-- Forecast boundary marker line -->
          ${forecastReadings.length > 0 ? `
            <line x1="${dividerX}" y1="5" x2="${dividerX}" y2="${svgH - 5}" stroke="rgba(164, 130, 89, 0.35)" stroke-dasharray="3,3" stroke-width="1" />
            <text x="${dividerX - 6}" y="12" class="chart-boundary-text" text-anchor="end">HISTORIC LOGS</text>
            <text x="${dividerX + 6}" y="12" class="chart-boundary-text">AI FORECAST (72H)</text>
          ` : ""}

          <!-- Historic curves -->
          <path d="${tempHistoricPath}" class="chart-path temp" />
          <path d="${humHistoricPath}" class="chart-path hum" />
          
          <!-- Forecasted curves -->
          ${tempForecastPath ? `<path d="${tempForecastPath}" class="chart-path temp forecast" />` : ""}
          ${humForecastPath ? `<path d="${humForecastPath}" class="chart-path hum forecast" />` : ""}
        </svg>

        <!-- Chart Legend -->
        <div class="chart-legend-box">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 3px; background: #f59e0b;"></div>
            <span style="font-size: 7.5pt; font-weight: 600; color: #2A2418;">Core Temperature (&deg;C)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 3px; background: #0ea5e9;"></div>
            <span style="font-size: 7.5pt; font-weight: 600; color: #2A2418;">Relative Humidity (%)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 3px; border-top: 1.5px dashed #6B5E4E;"></div>
            <span style="font-size: 7.5pt; color: #6B5E4E;">Predictive Forecast Curve</span>
          </div>
        </div>
      </div>
    `;

    const contentHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Silo Report - ${silo?.name || "Archive"}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          
          body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background: #ffffff;
            color: #2A2418;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 10pt;
            line-height: 1.45;
          }

          .report-container {
            border: 1px solid rgba(164, 130, 89, 0.25);
            padding: 20px;
            position: relative;
            background: #FCFAF6;
            box-sizing: border-box;
            min-height: 250mm; /* Safe full A4 page stretch without overflow */
          }

          .report-container::after {
            content: "";
            position: absolute;
            inset: 4px;
            border: 1px solid rgba(164, 130, 89, 0.12);
            pointer-events: none;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #A48259;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }

          .header-left h2 {
            font-family: 'Cinzel', serif;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #6B5E4E;
            margin: 0 0 4px 0;
          }

          .header-left h1 {
            font-family: 'Cinzel', serif;
            font-size: 16pt;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: #2A2418;
            margin: 0;
            text-transform: uppercase;
          }

          .header-right {
            text-align: right;
          }

          .case-badge {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 8pt;
            font-weight: 600;
            background: rgba(164, 130, 89, 0.08);
            border: 1px solid rgba(164, 130, 89, 0.2);
            color: #A48259;
            padding: 3px 6px;
            letter-spacing: 0.05em;
            display: inline-block;
            margin-bottom: 4px;
          }

          .report-date {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 7.5pt;
            color: #6B5E4E;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }

          .meta-card {
            background: #FFFFFF;
            border: 1px solid rgba(164, 130, 89, 0.15);
            padding: 10px;
            box-shadow: 0 2px 6px rgba(62, 53, 41, 0.01);
          }

          .meta-label {
            font-size: 7pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #6B5E4E;
            margin-bottom: 2px;
          }

          .meta-value {
            font-family: 'Cinzel', serif;
            font-size: 10pt;
            font-weight: 700;
            color: #2A2418;
          }

          .meta-value.mono {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 9pt;
          }

          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            border-radius: 2px;
            border: 1px solid;
          }

          .status-nominal {
            background: rgba(164, 130, 89, 0.08);
            border-color: rgba(164, 130, 89, 0.3);
            color: #A48259;
          }

          .status-medium {
            background: rgba(193, 122, 43, 0.08);
            border-color: rgba(193, 122, 43, 0.3);
            color: #C17A2B;
          }

          .status-high {
            background: rgba(201, 48, 71, 0.08);
            border-color: rgba(201, 48, 71, 0.3);
            color: #C93047;
          }

          .section-title {
            font-family: 'Cinzel', serif;
            font-size: 8.5pt;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #A48259;
            border-bottom: 1px dashed rgba(164, 130, 89, 0.3);
            padding-bottom: 4px;
            margin: 16px 0 10px 0;
          }

          .metrics-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }

          .metric-card {
            background: #FFFFFF;
            border: 1px solid rgba(164, 130, 89, 0.18);
            border-left: 3px solid #A48259;
            padding: 10px;
            display: flex;
            flex-direction: column;
          }

          .metric-card.alert {
            border-left-color: #C93047;
          }

          .metric-card.warning {
            border-left-color: #C17A2B;
          }

          .metric-label {
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #6B5E4E;
            margin-bottom: 4px;
          }

          .metric-value {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 14pt;
            font-weight: 600;
            color: #2A2418;
          }

          .metric-value span {
            font-size: 9pt;
            color: #6B5E4E;
            margin-left: 1px;
          }

          .diagnostic-box {
            background: #FFFFFF;
            border: 1px solid rgba(164, 130, 89, 0.18);
            padding: 12px;
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }

          .diagnostic-text {
            flex: 1;
          }

          .diagnostic-headline {
            font-family: 'Cinzel', serif;
            font-size: 9pt;
            font-weight: 700;
            color: #2A2418;
            margin: 0 0 4px 0;
          }

          .diagnostic-desc {
            font-size: 8.5pt;
            color: #6B5E4E;
            margin: 0;
            line-height: 1.35;
          }

          .seal-container {
            width: 56px;
            height: 56px;
            position: relative;
            flex-shrink: 0;
          }

          /* Thermal Twin Visuals */
          .twin-container {
            display: flex;
            gap: 24px;
            align-items: center;
            justify-content: center;
            background: #FFFFFF;
            border: 1px solid rgba(164, 130, 89, 0.15);
            padding: 16px;
            margin-bottom: 16px;
          }

          .silo-visual {
            width: 90px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            flex-shrink: 0;
          }

          .silo-cap-top {
            width: 100%;
            height: 12px;
            border-radius: 50%;
            border: 1px solid;
            margin-bottom: -6px;
            z-index: 2;
          }

          .silo-body {
            width: 100%;
            height: 140px;
            border-left: 1.5px solid rgba(164, 130, 89, 0.18);
            border-right: 1.5px solid rgba(164, 130, 89, 0.18);
            position: relative;
            z-index: 1;
            background: rgba(164, 130, 89, 0.02);
            display: flex;
            flex-direction: column;
          }

          .silo-zone {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 8px;
            box-sizing: border-box;
            border-top: 1px solid rgba(164, 130, 89, 0.08);
          }

          .silo-zone-temp {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 8pt;
            font-weight: 700;
          }

          .silo-zone-label {
            font-size: 6.5pt;
            text-transform: uppercase;
            color: #6B5E4E;
            font-weight: 600;
            letter-spacing: 0.04em;
          }

          .silo-cap-bottom {
            width: 100%;
            height: 12px;
            border-radius: 50%;
            border: 1px solid;
            margin-top: -6px;
            z-index: 2;
          }

          .silo-shadow {
            width: 80%;
            height: 4px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.05);
            margin-top: 2px;
          }

          .twin-legend {
            flex: 1;
          }

          .legend-header {
            font-family: 'Cinzel', serif;
            font-size: 8.5pt;
            font-weight: 700;
            color: #A48259;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 10px;
            border-bottom: 1px dashed rgba(164, 130, 89, 0.2);
            padding-bottom: 4px;
          }

          .legend-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }

          .legend-swatch {
            width: 10px;
            height: 10px;
            border: 1px solid;
            border-radius: 1px;
          }

          .legend-text {
            font-size: 8pt;
          }

          .legend-temp {
            font-family: 'IBM Plex Mono', monospace;
            font-weight: 700;
          }

          .legend-desc {
            color: #6B5E4E;
          }

          .legend-thresholds {
            font-size: 7pt;
            color: #6B5E4E;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 4px;
          }

          /* Chart Visuals */
          .chart-container {
            background: #FFFFFF;
            border: 1px solid rgba(164, 130, 89, 0.15);
            padding: 12px;
            margin-bottom: 16px;
          }

          .chart-svg {
            width: 100%;
            height: auto;
          }

          .chart-axis-text {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 6.5pt;
            fill: #A48259;
          }

          .chart-axis-text.blue {
            fill: #0ea5e9;
          }

          .chart-boundary-text {
            font-family: 'Cinzel', serif;
            font-size: 6pt;
            font-weight: 700;
            fill: #CD7F32;
            letter-spacing: 0.05em;
          }

          .chart-path {
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
          }

          .chart-path.temp {
            stroke: #f59e0b;
          }

          .chart-path.hum {
            stroke: #0ea5e9;
          }

          .chart-path.forecast {
            stroke-dasharray: 4, 3;
          }

          .chart-legend-box {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-top: 8px;
            border-top: 1px dashed rgba(164, 130, 89, 0.1);
            padding-top: 6px;
          }

          /* Alerts Table */
          .alerts-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }

          .alerts-table th {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            text-align: left;
            background: rgba(164, 130, 89, 0.06);
            border-bottom: 1px solid rgba(164, 130, 89, 0.25);
            color: #6B5E4E;
            padding: 6px 10px;
          }

          .alerts-table td {
            font-size: 8pt;
            padding: 8px 10px;
            border-bottom: 1px solid rgba(164, 130, 89, 0.1);
            color: #2A2418;
          }

          .footer-stamp-area {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid rgba(164, 130, 89, 0.2);
          }

          .signature-block {
            width: 180px;
          }

          .sig-line {
            border-bottom: 1px solid #A48259;
            height: 28px;
            margin-bottom: 4px;
          }

          .sig-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #6B5E4E;
            font-weight: 600;
          }

          .official-seal-watermark {
            text-align: center;
            position: relative;
          }

          .wax-seal {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            border: 2px dashed rgba(164, 130, 89, 0.35);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Cinzel', serif;
            font-size: 6pt;
            font-weight: 800;
            color: rgba(164, 130, 89, 0.5);
            letter-spacing: 0.05em;
            text-transform: uppercase;
            padding: 3px;
            box-sizing: border-box;
          }

          .wax-seal span {
            font-size: 4.5pt;
            font-family: 'IBM Plex Mono', monospace;
            color: rgba(164, 130, 89, 0.4);
          }

          .system-footnote {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 6pt;
            color: #A0917E;
            margin-top: 16px;
            text-align: center;
            letter-spacing: 0.05em;
          }

          /* Force strict page layout */
          .page-break {
            page-break-before: always;
            break-before: page;
          }
        </style>
      </head>
      <body>
        <!-- ==================== PAGE 1 ==================== -->
        <div class="report-container">
          <div class="header">
            <div class="header-left">
              <h2>National Smart Grain Registry & Storage</h2>
              <h1>Silo Diagnostic Ledger</h1>
            </div>
            <div class="header-right">
              <div class="case-badge">REG-${silo?.id?.toUpperCase() || "UNKNOWN"}</div>
              <div class="report-date">${dateStr}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Silo Identifier</div>
              <div class="meta-value mono">#${silo?.id?.toUpperCase() || "UNKNOWN"}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Facility Depot</div>
              <div class="meta-value">${silo?.name || "N/A"}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Depot Location</div>
              <div class="meta-value">${silo?.location || "N/A"}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Crop Specimen</div>
              <div class="meta-value" style="text-transform: capitalize;">${silo?.crop_type || "N/A"}</div>
            </div>
          </div>

          <div class="section-title">Preservation Metrics Inventory</div>
          <div class="metrics-row">
            <div class="metric-card ${riskKey === "high" ? "alert" : riskKey === "medium" ? "warning" : ""}">
              <div class="metric-label">Status Risk Assessment</div>
              <div class="metric-value" style="font-family: 'Cinzel', serif; font-size: 11pt; margin-top: 2px;">
                <span class="status-badge ${riskKey === "high" ? "status-high" : riskKey === "medium" ? "status-medium" : "status-nominal"}">
                  ${risk.label}
                </span>
              </div>
            </div>
            <div class="metric-card ${silo?.temperature && silo.temperature > 28 ? "warning" : ""}">
              <div class="metric-label">Core Temperature</div>
              <div class="metric-value">${silo?.temperature?.toFixed(1) || "0.0"}<span>°C</span></div>
            </div>
            <div class="metric-card ${silo?.humidity && silo.humidity > 70 ? "alert" : ""}">
              <div class="metric-label">Relative Humidity</div>
              <div class="metric-value">${silo?.humidity?.toFixed(1) || "0.0"}<span>%</span></div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Current Capacity</div>
              <div class="metric-value">${silo?.fill_pct || 0}<span>%</span></div>
            </div>
          </div>

          <div class="metrics-row" style="grid-template-columns: repeat(2, 1fr); margin-top: -10px; display: grid;">
            <div class="metric-card">
              <div class="meta-label" style="margin-bottom: 1px;">Calculated Grain Mass</div>
              <div class="metric-value" style="font-size: 13pt;">
                ${calculatedGrainMass} <span style="font-size: 9pt; font-weight: 500;">kg</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="meta-label" style="margin-bottom: 1px;">Total Storage Limit</div>
              <div class="metric-value" style="font-size: 13pt; color: #6B5E4E;">
                ${silo?.capacity_kg?.toLocaleString() || "0"} <span style="font-size: 9pt; font-weight: 500;">kg</span>
              </div>
            </div>
          </div>

          <div class="section-title">Automated Diagnostics Summary</div>
          <div class="diagnostic-box">
            <div class="diagnostic-text">
              <h4 class="diagnostic-headline">${aiHeadline}</h4>
              <p class="diagnostic-desc">${aiDescription}</p>
            </div>
            <div class="seal-container">
              <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: none; stroke: rgba(164, 130, 89, 0.25); stroke-width: 1.5;">
                <path d="M50,90 L50,15" />
                <path d="M50,75 C60,65 62,55 50,45 C38,55 40,65 50,75 Z" fill="rgba(164, 130, 89, 0.05)" />
                <path d="M50,55 C60,45 62,35 50,25 C38,45 40,45 50,55 Z" fill="rgba(164, 130, 89, 0.05)" />
                <path d="M50,35 C58,27 60,18 50,10 C40,18 42,27 50,35 Z" fill="rgba(164, 130, 89, 0.05)" />
              </svg>
            </div>
          </div>

          <div class="section-title">Thermal Digital Twin Distribution</div>
          ${thermalTwinHtml}

          <div class="system-footnote" style="margin-top: auto; padding-top: 10px; border-top: 1px dashed rgba(164,130,89,0.15)">
            REGISTRY OFFICE RECORD · SECTION I: STORAGE CORE & THERMAL TWIN ANALYSIS · PAGE 1 OF 2
          </div>
        </div>

        <!-- ==================== PAGE 2 ==================== -->
        <div class="report-container page-break">
          <div class="header">
            <div class="header-left">
              <h2>National Smart Grain Registry & Storage</h2>
              <h1 style="font-size: 14pt;">Incident Bulletins & Graphs</h1>
            </div>
            <div class="header-right">
              <div class="case-badge">REG-${silo?.id?.toUpperCase() || "UNKNOWN"}</div>
              <div class="report-date">${dateStr}</div>
            </div>
          </div>

          <div class="section-title">Sensor History & AI Forecast Chart</div>
          ${sensorChartHtml}

          <div class="section-title">Active Registry Alerts &amp; Incident Bulletins</div>
          ${alertsHtml}

          <div class="footer-stamp-area">
            <div class="signature-block">
              <div class="sig-line"></div>
              <div class="sig-label">Registry Officer Signature</div>
            </div>
            
            <div class="official-seal-watermark">
              <div class="wax-seal">
                STATE ARCHIVE
                <span style="margin: 2px 0; font-size: 5pt; display: block; font-family: 'IBM Plex Mono', monospace; color: rgba(164, 130, 89, 0.4);">OFFICIAL USE</span>
                <span>VERIFIED</span>
              </div>
            </div>

            <div class="signature-block" style="text-align: right;">
              <div class="sig-line"></div>
              <div class="sig-label">Storage Inspector Sign-Off</div>
            </div>
          </div>

          <div class="system-footnote" style="margin-top: 24px;">
            DOCUMENT CLASSIFICATION: OFFICIAL REGISTRY RECORD · INTEGRATED AI DIAGNOSTIC SYSTEM V0.1 · PAGE 2 OF 2
          </div>
        </div>
      </body>
      </html>
    `;

    // Create and Print background iframe
    const iframe = document.createElement("iframe");
    // Place off-screen with visible dimension and styles to ensure modern browsers consider it fully rendered.
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    iframe.style.border = "0";
    iframe.style.visibility = "visible";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(contentHtml);
      doc.close();

      // Give 300ms for browser parsing of inline styles and structure
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setIsPrinting(false);
        // Delay removal slightly to allow the print engine pipeline to finalize source data ingestion
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 300);
    } else {
      setIsPrinting(false);
    }
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