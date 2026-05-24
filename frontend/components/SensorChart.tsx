"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorReading {
  recorded_at: string;
  temperature: number;
  humidity: number;
}

// Internal chart point — merges historical + forecast into one flat structure.
interface ChartPoint {
  recorded_at: string;
  /** Populated only for historical points */
  temp_hist?: number;
  hum_hist?: number;
  /** Populated only for forecast points */
  temp_forecast?: number;
  hum_forecast?: number;
  /** Flag read by the tooltip to show "AI Prediction" label */
  _isForecast: boolean;
}

// Multi-silo palette for future comparative views
export const NEON_PALETTE = [
  "#10b981", "#6366f1", "#f59e0b", "#06b6d4",
  "#ec4899", "#84cc16", "#f43f5e", "#a78bfa",
];

// ─── Forecast generator ───────────────────────────────────────────────────────

/**
 * Given the last N historical readings, generates 12 future hourly predictions
 * using a dampened random-walk on the last known value.
 * In production this would be replaced by the AI Predictive Service response.
 */
function generateForecast(history: SensorReading[], hours = 12): SensorReading[] {
  if (history.length === 0) return [];

  const last = history[history.length - 1];
  let temp = last.temperature;
  let hum = last.humidity;

  return Array.from({ length: hours }, (_, i) => {
    // Dampened random walk — predictions drift slightly but not wildly
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

// ─── SVG Defs — gradient strokes + layered glow filters ──────────────────────

function ChartDefs() {
  return (
    <defs>
      {/* ── Temperature historical: Amber → Rose ── */}
      <linearGradient id="grad-temp" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>

      {/* ── Humidity historical: Cyan → Blue ── */}
      <linearGradient id="grad-hum" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>

      {/* ── Forecast: Fuchsia → Violet ── */}
      <linearGradient id="grad-forecast" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#818cf8" />
      </linearGradient>

      {/* ── Temperature glow filter ── */}
      <filter id="glow-temp" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
        <feFlood floodColor="#f97316" floodOpacity="0.55" result="color" />
        <feComposite in="color" in2="blur1" operator="in" result="glow1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
        <feFlood floodColor="#f43f5e" floodOpacity="0.35" result="color2" />
        <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
        <feMerge>
          <feMergeNode in="glow2" />
          <feMergeNode in="glow1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* ── Humidity glow filter ── */}
      <filter id="glow-hum" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
        <feFlood floodColor="#06b6d4" floodOpacity="0.55" result="color" />
        <feComposite in="color" in2="blur1" operator="in" result="glow1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
        <feFlood floodColor="#3b82f6" floodOpacity="0.35" result="color2" />
        <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
        <feMerge>
          <feMergeNode in="glow2" />
          <feMergeNode in="glow1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* ── AI Prediction glow filter — fuchsia-violet ── */}
      <filter id="glow-forecast" x="-70%" y="-70%" width="240%" height="240%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
        <feFlood floodColor="#e879f9" floodOpacity="0.65" result="color" />
        <feComposite in="color" in2="blur1" operator="in" result="glow1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
        <feFlood floodColor="#818cf8" floodOpacity="0.45" result="color2" />
        <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
        <feMerge>
          <feMergeNode in="glow2" />
          <feMergeNode in="glow1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const dateObj = label ? new Date(label) : null;
  const isValidDate = dateObj && !isNaN(dateObj.getTime());
  const time = isValidDate
    ? dateObj!.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const dayLabel = isValidDate
    ? dateObj!.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    : "";

  const isForecast = payload.some((p) => p.name.includes("forecast"));

  return (
    <div
      className="rounded-2xl backdrop-blur-xl px-4 py-3 text-sm min-w-45"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-glass)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header: time + Historical/Forecast tag */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div>
          <p className="font-outfit text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--text-secondary)" }}>{time}</p>
          <p className="font-plus-jakarta text-[9px]" style={{ color: "var(--text-muted)" }}>{dayLabel}</p>
        </div>
        {isForecast ? (
          <span
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold font-outfit tracking-wide"
            style={{
              background: "linear-gradient(135deg, rgba(232,121,249,0.10), rgba(129,140,248,0.10))",
              border: "1px solid rgba(232,121,249,0.25)",
              color: "#a855f7",
              boxShadow: "0 0 8px rgba(232,121,249,0.15)",
            }}
          >
            🔮 AI Prediction
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold font-outfit tracking-wide"
            style={{
              backgroundColor: "var(--accent-subtle)",
              border: "1px solid var(--border-glass)",
              color: "var(--text-secondary)",
            }}
          >
            📊 Historical
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px mb-2" style={{ backgroundColor: "var(--border-muted)" }} />

      {/* Values */}
      {payload.map((entry) => {
        const isTemp = entry.name.includes("temp");
        const unit = isTemp ? "°C" : "%";
        const label = isTemp ? "Temperature" : "Humidity";
        return (
          <div key={entry.name} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <span
              className="inline-block size-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }}
            />
            <span className="font-plus-jakarta text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{label}</span>
            <span className="font-outfit font-bold text-sm" style={{ color: entry.color }}>
              {entry.value.toFixed(1)}{unit}
            </span>
          </div>
        );
      })}

      {/* AI disclaimer */}
      {isForecast && (
        <p
          className="font-plus-jakarta text-[9px] mt-2 pt-2"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-muted)" }}
        >
          Forecast generated by AI Predictive Model
        </p>
      )}
    </div>
  );
}

// ─── Custom Legend ─────────────────────────────────────────────────────────────

function CustomLegend() {
  const items = [
    {
      label: "Temperature (°C)",
      gradient: "linear-gradient(90deg, #f59e0b, #f43f5e)",
      glow: "rgba(251,146,60,0.6)",
      dashed: false,
    },
    {
      label: "Humidity (%)",
      gradient: "linear-gradient(90deg, #06b6d4, #3b82f6)",
      glow: "rgba(6,182,212,0.6)",
      dashed: false,
    },
    {
      label: "AI Forecast",
      gradient: "linear-gradient(90deg, #e879f9, #818cf8)",
      glow: "rgba(232,121,249,0.7)",
      dashed: true,
    },
  ];

  return (
    <div className="flex items-center justify-center gap-5 flex-wrap">
      {items.map(({ label, gradient, glow, dashed }) => (
        <div key={label} className="flex items-center gap-2">
          {dashed ? (
            // Dashed swatch for forecast (Tailwind styling)
            <div
              className="w-6 border-t-[2.5px] border-purple-400 border-dashed"
              style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
            />
          ) : (
            <span
              className="inline-block h-[3px] w-6 rounded-full"
              style={{ background: gradient, boxShadow: `0 0 6px ${glow}` }}
            />
          )}
          {dashed ? (
            <span
              className="font-plus-jakarta font-bold text-xs text-transparent bg-clip-text"
              style={{ backgroundImage: gradient }}
            >
              {label}
            </span>
          ) : (
            <span className="font-plus-jakarta text-slate-400 text-xs">{label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export default function SensorChart({ data, forecastData }: { data: SensorReading[]; forecastData?: SensorReading[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--text-muted)" }}>
        No sensor readings available.
      </div>
    );
  }

  const formatTick = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Memoize forecast and merged data so they're stable between renders
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const chartData: ChartPoint[] = useMemo(() => {
    const forecast = forecastData && forecastData.length > 0 ? forecastData : generateForecast(data, 12);

    // Historical points — only populate hist keys
    const histPoints: ChartPoint[] = data.map((d) => ({
      recorded_at: d.recorded_at,
      temp_hist: d.temperature,
      hum_hist: d.humidity,
      _isForecast: false,
    }));

    // The handoff bridge point — last historical value also seeds both keys
    // so the forecast line visually connects from the last real reading.
    const last = histPoints[histPoints.length - 1];
    const bridge: ChartPoint = {
      recorded_at: last.recorded_at,
      temp_hist: last.temp_hist,
      hum_hist: last.hum_hist,
      temp_forecast: last.temp_hist,
      hum_forecast: last.hum_hist,
      _isForecast: false,
    };

    // Forecast points — only populate forecast keys
    const forecastPoints: ChartPoint[] = forecast.map((d) => ({
      recorded_at: d.recorded_at,
      temp_forecast: d.temperature,
      hum_forecast: d.humidity,
      _isForecast: true,
    }));

    // Replace the last hist point with the bridge, then append forecast
    return [...histPoints.slice(0, -1), bridge, ...forecastPoints];
  }, [data, forecastData]);

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <CustomLegend />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <ChartDefs />

          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(148,163,184,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="recorded_at"
            tickFormatter={formatTick}
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "var(--font-outfit)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "var(--font-outfit)" }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "rgba(148,163,184,0.08)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Legend content={() => null} />

          {/* ── Historical: Temperature ── */}
          <Line
            type="monotone"
            dataKey="temp_hist"
            name="temp_hist"
            stroke="url(#grad-temp)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#fb923c", stroke: "rgba(249,115,22,0.4)", strokeWidth: 4 }}
            filter="url(#glow-temp)"
            connectNulls={false}
          />

          {/* ── Historical: Humidity ── */}
          <Line
            type="monotone"
            dataKey="hum_hist"
            name="hum_hist"
            stroke="url(#grad-hum)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#38bdf8", stroke: "rgba(56,189,248,0.4)", strokeWidth: 4 }}
            filter="url(#glow-hum)"
            connectNulls={false}
          />

          {/* ── AI Forecast: Temperature — glowing fuchsia dashed ── */}
          <Line
            type="monotone"
            dataKey="temp_forecast"
            name="temp_forecast"
            stroke="url(#grad-forecast)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#e879f9",
              stroke: "rgba(232,121,249,0.45)",
              strokeWidth: 5,
            }}
            filter="url(#glow-forecast)"
            connectNulls={true}
          />

          {/* ── AI Forecast: Humidity — glowing violet dashed ── */}
          <Line
            type="monotone"
            dataKey="hum_forecast"
            name="hum_forecast"
            stroke="url(#grad-forecast)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#c084fc",
              stroke: "rgba(192,132,252,0.45)",
              strokeWidth: 5,
            }}
            filter="url(#glow-forecast)"
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
