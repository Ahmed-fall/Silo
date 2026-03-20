"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorReading {
  recorded_at: string; // ISO-8601
  temperature: number;
  humidity: number;
}

// ─── SVG glow filter (embedded inline in the chart) ───────────────────────────

function GlowDefs() {
  return (
    <defs>
      {/* Emerald glow — Temperature */}
      <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur1" />
        <feGaussianBlur stdDeviation="6" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Cyan glow — Humidity */}
      <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur1" />
        <feGaussianBlur stdDeviation="6" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
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
    <div
      className="
        rounded-xl border border-slate-700/80
        bg-slate-950/90 backdrop-blur-md
        px-4 py-3 shadow-2xl shadow-black/60
        text-sm
      "
    >
      <p className="font-space-grotesk text-slate-400 text-xs mb-2 tracking-widest uppercase">
        {time}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300 capitalize">{entry.name}</span>
          <span
            className="font-space-grotesk font-bold ml-auto pl-4"
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

// ─── Legend renderer ──────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6 mt-1">
      {[
        { color: "#10b981", label: "Temperature (°C)" },
        { color: "#06b6d4", label: "Humidity (%)" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
          <span className="text-slate-400 text-xs">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart component ──────────────────────────────────────────────────────────

export default function SensorChart({ data }: { data: SensorReading[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        No sensor readings available.
      </div>
    );
  }

  /* Format tick labels */
  const formatTick = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <CustomLegend />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
        >
          {/* Inject SVG glow filters */}
          {/* @ts-expect-error Recharts accepts children in LineChart for defs */}
          <GlowDefs />

          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(148,163,184,0.07)"
            vertical={false}
          />

          <XAxis
            dataKey="recorded_at"
            tickFormatter={formatTick}
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "var(--font-space-grotesk)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />

          <YAxis
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "var(--font-space-grotesk)" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "rgba(148,163,184,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          {/* Hidden recharts Legend — we render our own */}
          <Legend content={() => null} />

          {/* Temperature — Neon Emerald */}
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#10b981", stroke: "#10b981", strokeWidth: 0 }}
            filter="url(#glow-emerald)"
          />

          {/* Humidity — Neon Cyan */}
          <Line
            type="monotone"
            dataKey="humidity"
            stroke="#06b6d4"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#06b6d4", stroke: "#06b6d4", strokeWidth: 0 }}
            filter="url(#glow-cyan)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
