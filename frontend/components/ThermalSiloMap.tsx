"use client";

import { motion } from "framer-motion";

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

// ─── Thermal theme resolver ───────────────────────────────────────────────────

interface ThermalTheme {
  bg: string;
  glowColor: string;
  border: string;
  textColor: string;
  label: string;
}

function tempTheme(t: number): ThermalTheme {
  if (t <= 23) return {
    bg:        "rgba(29,78,216,0.55)",
    glowColor: "rgba(59,130,246,0.50)",
    border:    "rgba(96,165,250,0.45)",
    textColor: "#93c5fd",
    label:     "Safe",
  };
  if (t <= 27) return {
    bg:        "rgba(6,95,70,0.55)",
    glowColor: "rgba(16,185,129,0.45)",
    border:    "rgba(52,211,153,0.45)",
    textColor: "#6ee7b7",
    label:     "Normal",
  };
  if (t <= 32) return {
    bg:        "rgba(146,64,14,0.62)",
    glowColor: "rgba(245,158,11,0.50)",
    border:    "rgba(251,191,36,0.45)",
    textColor: "#fcd34d",
    label:     "Caution",
  };
  return {
    bg:        "rgba(153,27,27,0.68)",
    glowColor: "rgba(239,68,68,0.55)",
    border:    "rgba(248,113,113,0.50)",
    textColor: "#fca5a5",
    label:     "Critical",
  };
}

// ─── Dimensions ───────────────────────────────────────────────────────────────

const SILO_W   = 140;   // px — cylinder width
const BODY_H   = 220;   // px — cylinder body height
const CAP_H    = 22;    // px — ellipse cap height

// ─── Component ────────────────────────────────────────────────────────────────

interface ThermalSiloMapProps {
  zones?: ThermalZone[];
  title?: string;
}

export default function ThermalSiloMap({
  zones = DEFAULT_ZONES,
  title = "Thermal Digital Twin",
}: ThermalSiloMapProps) {
  const topTheme    = tempTheme(zones[0].temp);
  const bottomTheme = tempTheme(zones[zones.length - 1].temp);

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-outfit font-semibold text-[10px] tracking-[0.2em] text-slate-600 uppercase">
            {title}
          </p>
          <p className="font-plus-jakarta text-slate-500 text-[11px] mt-0.5">
            Live thermal zone distribution
          </p>
        </div>
        {/* Pulsing "live" indicator */}
        <div className="flex items-center gap-1.5">
          <motion.span
            className="size-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-outfit text-[9px] text-emerald-500 tracking-wider uppercase">Live</span>
        </div>
      </div>

      {/* ── Main layout: silo + legend ── */}
      <div className="flex items-center gap-8 flex-1 justify-center">

        {/* ── The Silo ── */}
        <div className="relative flex flex-col items-center shrink-0">

          {/* Top cap ellipse */}
          <div
            style={{
              width:        SILO_W,
              height:       CAP_H,
              borderRadius: "50%",
              background:   `linear-gradient(to bottom, ${topTheme.bg}, rgba(15,23,42,0.9))`,
              border:       `1.5px solid ${topTheme.border}`,
              boxShadow:    `0 -4px 18px ${topTheme.glowColor}`,
              zIndex:       2,
              position:     "relative",
              marginBottom: -1, // overlap slightly with the body
            }}
          />

          {/* Cylinder body */}
          <div
            style={{
              width:    SILO_W,
              height:   BODY_H,
              position: "relative",
              overflow: "hidden",
              borderLeft:  `1.5px solid rgba(148,163,184,0.18)`,
              borderRight: `1.5px solid rgba(148,163,184,0.18)`,
            }}
          >
            {/* ── Thermal zones ── */}
            {zones.map((zone, i) => {
              const theme = tempTheme(zone.temp);
              const zoneH = zone.heightFraction * BODY_H;
              return (
                <motion.div
                  key={zone.label}
                  style={{
                    height:     zoneH,
                    background: theme.bg,
                    borderTop:  i === 0 ? "none" : `1px solid rgba(148,163,184,0.08)`,
                    position:   "relative",
                    overflow:   "hidden",
                  }}
                  // Gentle breathing pulse per zone, staggered
                  animate={{
                    background: [
                      theme.bg,
                      theme.bg.replace(/[\d.]+\)$/, (m) => `${Math.min(parseFloat(m) + 0.1, 0.9)})`),
                      theme.bg,
                    ],
                  }}
                  transition={{
                    duration: 2.8 + i * 0.4,
                    repeat:   Infinity,
                    ease:     "easeInOut",
                    delay:    i * 0.3,
                  }}
                >
                  {/* Inner glow vignette */}
                  <div
                    style={{
                      position:   "absolute",
                      inset:      0,
                      background: `radial-gradient(ellipse at 50% 50%, ${theme.glowColor} 0%, transparent 75%)`,
                      opacity:    0.6,
                    }}
                  />

                  {/* Zone temperature label */}
                  <div
                    style={{
                      position:     "absolute",
                      right:        8,
                      top:          "50%",
                      transform:    "translateY(-50%)",
                      fontSize:     10,
                      fontFamily:   "var(--font-outfit, system-ui)",
                      fontWeight:   700,
                      color:        theme.textColor,
                      textShadow:   `0 0 8px ${theme.glowColor}`,
                      whiteSpace:   "nowrap",
                      lineHeight:   1,
                    }}
                  >
                    {zone.temp}°
                  </div>
                </motion.div>
              );
            })}

            {/* ── Radar scanner overlay ── */}
            <motion.div
              style={{
                position: "absolute",
                top:      0,
                left:     0,
                right:    0,
                height:   36,
                pointerEvents: "none",
                zIndex:   10,
              }}
              animate={{ y: [0, BODY_H - 36, 0] }}
              transition={{
                duration:   3.6,
                repeat:     Infinity,
                ease:       "easeInOut",
                repeatType: "loop",
              }}
            >
              {/* Bright scanner line */}
              <div
                style={{
                  height:     1.5,
                  background: "rgba(52,211,153,0.95)",
                  boxShadow:  "0 0 6px 1px rgba(52,211,153,0.8), 0 0 14px 2px rgba(52,211,153,0.4)",
                }}
              />
              {/* Fading trail below the line */}
              <div
                style={{
                  height:     34,
                  background: "linear-gradient(to bottom, rgba(52,211,153,0.20), transparent)",
                }}
              />
            </motion.div>

            {/* ── Left side ruler ticks ── */}
            {zones.map((_, i) => {
              const y = zones.slice(0, i + 1).reduce((acc, z) => acc + z.heightFraction * BODY_H, 0);
              if (i === zones.length - 1) return null;
              return (
                <div
                  key={i}
                  style={{
                    position:   "absolute",
                    left:       0,
                    top:        y,
                    width:      6,
                    height:     1,
                    background: "rgba(148,163,184,0.3)",
                  }}
                />
              );
            })}
          </div>

          {/* Bottom cap ellipse */}
          <div
            style={{
              width:        SILO_W,
              height:       CAP_H,
              borderRadius: "50%",
              background:   `linear-gradient(to top, ${bottomTheme.bg}, rgba(15,23,42,0.9))`,
              border:       `1.5px solid ${bottomTheme.border}`,
              boxShadow:    `0 4px 18px ${bottomTheme.glowColor}`,
              zIndex:       2,
              position:     "relative",
              marginTop:    -1,
            }}
          />

          {/* Silo floor shadow */}
          <div
            style={{
              width:        SILO_W * 0.75,
              height:       6,
              borderRadius: "50%",
              background:   "rgba(0,0,0,0.5)",
              filter:       "blur(4px)",
              marginTop:    4,
            }}
          />
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
                    <span className="font-normal text-slate-600 ml-1">· {theme.label}</span>
                  </p>
                  <p className="font-plus-jakarta text-slate-600 text-[9px] mt-0.5 leading-none">{zone.label}</p>
                </div>
              </div>
            );
          })}

          {/* Divider */}
          <div className="h-px bg-white/5 my-1" />

          {/* Scale reference */}
          <div className="flex flex-col gap-1">
            {[
              { range: "≤ 23°C", label: "Safe",     color: "#93c5fd" },
              { range: "24-27°C",label: "Normal",   color: "#6ee7b7" },
              { range: "28-32°C",label: "Caution",  color: "#fcd34d" },
              { range: "> 32°C", label: "Critical", color: "#fca5a5" },
            ].map(({ range, label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="font-outfit text-[9px]" style={{ color }}>{range}</span>
                <span className="font-plus-jakarta text-slate-700 text-[9px]">→ {label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
