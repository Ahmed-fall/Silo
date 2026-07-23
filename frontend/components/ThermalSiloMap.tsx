"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// WebGL touches `window`/`document` at module load — must never run during SSR.
const ThermalSilo3D = dynamic(() => import("./ThermalSilo3D"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl animate-pulse"
      style={{ width: 340, height: 380, backgroundColor: "var(--accent-subtle)" }}
    />
  ),
});

// ─── Types & defaults ─────────────────────────────────────────────────────────

export interface ThermalZone {
  label: string;
  /** Temperature in °C */
  temp: number;
  /** Fraction of the cylinder body this zone occupies (all must sum to 1) */
  heightFraction: number;
}

export const DEFAULT_ZONES: ThermalZone[] = [
  { label: "Top",    temp: 22, heightFraction: 0.24 },
  { label: "Upper",  temp: 27, heightFraction: 0.26 },
  { label: "Lower",  temp: 31, heightFraction: 0.26 },
  { label: "Bottom", temp: 35, heightFraction: 0.24 },
];

// ─── Thermal theme resolver (LIGHT MODE) ────────────────────────────────────────

interface ThermalTheme {
  bg: string;
  glowColor: string;
  border: string;
  textColor: string;
  label: string;
}

function tempTheme(t: number): ThermalTheme {
  if (t <= 23) return {
    bg:        "rgba(59,130,246,0.30)",
    glowColor: "rgba(59,130,246,0.35)",
    border:    "rgba(96,165,250,0.35)",
    textColor: "#2563eb",
    label:     "Safe",
  };
  if (t <= 27) return {
    bg:        "rgba(64,224,208,0.22)",
    glowColor: "rgba(64,224,208,0.30)",
    border:    "rgba(64,224,208,0.35)",
    textColor: "#0d9488",
    label:     "Normal",
  };
  if (t <= 32) return {
    bg:        "rgba(205,127,50,0.18)",
    glowColor: "rgba(205,127,50,0.30)",
    border:    "rgba(205,127,50,0.35)",
    textColor: "#b45309",
    label:     "Caution",
  };
  return {
    bg:        "rgba(225,29,72,0.15)",
    glowColor: "rgba(225,29,72,0.30)",
    border:    "rgba(225,29,72,0.35)",
    textColor: "#be123c",
    label:     "Critical",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ThermalSiloMapProps {
  zones?: ThermalZone[];
  title?: string;
}

export default function ThermalSiloMap({
  zones = DEFAULT_ZONES,
  title = "Thermal Digital Twin",
}: ThermalSiloMapProps) {
  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>
            {title}
          </p>
          <p className="font-plus-jakarta text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Live thermal zone distribution
          </p>
        </div>
        {/* Pulsing "live" indicator */}
        <div className="flex items-center gap-1.5">
          <motion.span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-outfit text-[9px] tracking-wider uppercase" style={{ color: "var(--accent)" }}>Live</span>
        </div>
      </div>

      {/* ── Main layout: silo + legend ── */}
      <div className="flex items-center gap-8 flex-1 justify-center">

        {/* ── The Silo (3D digital twin) ── */}
        <div className="shrink-0" style={{ width: 340, height: 380 }}>
          <ThermalSilo3D zones={zones} />
        </div>


        {/* ── Zone legend ── */}
        <div className="flex flex-col gap-2.5 min-w-0">
          {[...zones].reverse().map((zone) => {
            const theme = tempTheme(zone.temp);
            return (
              <div key={zone.label} className="flex items-center gap-2.5">
                {/* Color swatch */}
                <motion.div
                  className="shrink-0 rounded-sm"
                  style={{
                    width:     10,
                    height:    10,
                    background: theme.bg,
                    border:    `1px solid ${theme.border}`,
                    boxShadow: `0 0 6px ${theme.glowColor}`,
                  }}
                  animate={{ boxShadow: [`0 0 4px ${theme.glowColor}`, `0 0 10px ${theme.glowColor}`, `0 0 4px ${theme.glowColor}`] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="min-w-0">
                  <p
                    className="font-outfit text-[10px] font-semibold leading-none"
                    style={{ color: theme.textColor }}
                  >
                    {zone.temp}°C
                    <span className="font-normal ml-1" style={{ color: "var(--text-muted)" }}>· {theme.label}</span>
                  </p>
                  <p className="font-plus-jakarta text-[9px] mt-0.5 leading-none" style={{ color: "var(--text-secondary)" }}>{zone.label}</p>
                </div>
              </div>
            );
          })}

          {/* Divider */}
          <div className="h-px my-1" style={{ backgroundColor: "var(--border-muted)" }} />

          {/* Scale reference */}
          <div className="flex flex-col gap-1">
            {[
              { range: "≤ 23°C", label: "Safe",     color: "#2563eb" },
              { range: "24-27°C",label: "Normal",   color: "#0d9488" },
              { range: "28-32°C",label: "Caution",  color: "#b45309" },
              { range: "> 32°C", label: "Critical", color: "#be123c" },
            ].map(({ range, label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="font-outfit text-[9px]" style={{ color }}>{range}</span>
                <span className="font-plus-jakarta text-[9px]" style={{ color: "var(--text-secondary)" }}>→ {label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
