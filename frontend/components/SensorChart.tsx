"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorReading {
  recorded_at: string;
  temperature: number;
  humidity: number;
}

// Multi-silo palette for future comparative views
export const NEON_PALETTE = [
  "#10b981", "#6366f1", "#f59e0b", "#06b6d4",
  "#ec4899", "#84cc16", "#f43f5e", "#a78bfa",
];

// ─── SVG Defs — gradient strokes + layered glow filters ──────────────────────

function ChartDefs() {
  return (
    <defs>
      {/* ── Temperature: Amber → Rose warm gradient ── */}
      <linearGradient id="grad-temp" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#f59e0b" />
        <stop offset="50%"  stopColor="#fb923c" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>

      {/* ── Humidity: Cyan → Blue cool gradient ── */}
      <linearGradient id="grad-hum" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#06b6d4" />
        <stop offset="50%"  stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>

      {/* ── Temperature glow: warm amber-rose blur ── */}
      <filter id="glow-temp" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
        <feFlood floodColor="#f97316" floodOpacity="0.55" result="color" />
        <feComposite in="color" in2="blur1" operator="in" result="glow1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5"   result="blur2" />
        <feFlood floodColor="#f43f5e" floodOpacity="0.35" result="color2" />
        <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
        <feMerge>
          <feMergeNode in="glow2" />
          <feMergeNode in="glow1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* ── Humidity glow: cyan-blue blur ── */}
      <filter id="glow-hum" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
        <feFlood floodColor="#06b6d4" floodOpacity="0.55" result="color" />
        <feComposite in="color" in2="blur1" operator="in" result="glow1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5"   result="blur2" />
        <feFlood floodColor="#3b82f6" floodOpacity="0.35" result="color2" />
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
  const time = label
    ? new Date(label).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="
      rounded-2xl border border-white/[0.08]
      bg-slate-950/95 backdrop-blur-xl
      px-4 py-3 shadow-2xl shadow-black/70
      text-sm
    ">
      <p className="font-outfit text-slate-500 text-[10px] mb-2.5 tracking-[0.18em] uppercase">
        {time}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1.5 last:mb-0">
          <span
            className="inline-block size-2 rounded-full"
            style={{
              backgroundColor: entry.color,
              boxShadow: `0 0 6px ${entry.color}`,
            }}
          />
          <span className="font-plus-jakarta text-slate-300 capitalize text-xs">{entry.name}</span>
          <span
            className="font-outfit font-bold ml-auto pl-4 text-sm"
            style={{ color: entry.color }}
          >
            {entry.value.toFixed(1)}
            {entry.name === "temperature" ? "°C" : "%"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Custom Legend ─────────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6">
      {[
        {
          label: "Temperature (°C)",
          /* Show a gradient swatch instead of a flat dot */
          gradient: "linear-gradient(90deg, #f59e0b, #f43f5e)",
          glow: "rgba(251,146,60,0.6)",
        },
        {
          label: "Humidity (%)",
          gradient: "linear-gradient(90deg, #06b6d4, #3b82f6)",
          glow: "rgba(6,182,212,0.6)",
        },
      ].map(({ label, gradient, glow }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="inline-block h-[3px] w-6 rounded-full"
            style={{
              background: gradient,
              boxShadow: `0 0 6px ${glow}`,
            }}
          />
          <span className="font-plus-jakarta text-slate-400 text-xs">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export default function SensorChart({ data }: { data: SensorReading[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        No sensor readings available.
      </div>
    );
  }

  const formatTick = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <CustomLegend />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          {/* @ts-expect-error Recharts accepts children in LineChart for defs */}
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

          {/* Temperature — fiery warm gradient stroke + amber-rose glow */}
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="url(#grad-temp)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: "#fb923c",
              stroke: "rgba(249,115,22,0.4)",
              strokeWidth: 4,
            }}
            filter="url(#glow-temp)"
          />

          {/* Humidity — liquid cool gradient stroke + cyan-blue glow */}
          <Line
            type="monotone"
            dataKey="humidity"
            stroke="url(#grad-hum)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: "#38bdf8",
              stroke: "rgba(56,189,248,0.4)",
              strokeWidth: 4,
            }}
            filter="url(#glow-hum)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
