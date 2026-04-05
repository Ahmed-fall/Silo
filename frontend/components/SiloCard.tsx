"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { AlertTriangle, ShieldCheck, Flame, MapPin, ShieldAlert, Thermometer, Droplets } from "lucide-react";
import CropIcon from "@/components/CropIcon";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "none" | "low" | "medium" | "high";

export interface Silo {
  id: string;
  name: string;
  location: string;
  risk_level: RiskLevel;
  crop_type?: string;
  temperature?: number;
  humidity?: number;
}

// ─── Risk config ──────────────────────────────────────────────────────────────

const RISK = {
  none: {
    from: "#64748b", via: "#94a3b8", to: "#1e293b",
    badgeBg: "linear-gradient(150deg,#2e3f52 0%,#1a2638 60%,#111c2b 100%)",
    glossy: "inset 0 1px 0 rgba(255,255,255,0.13),inset 0 -1px 0 rgba(0,0,0,0.30)",
    glow:   "0 0 0px 0px rgba(100,116,139,0)",
    glowPk: "0 0 18px 4px rgba(100,116,139,0.28)",
    border: "rgba(148,163,184,0.22)", text: "#cbd5e1",
    label: "Nominal", icon: <ShieldCheck size={11} className="text-slate-300" />,
    pulse: false as const,
    cardHover: "0 0 40px 4px rgba(100,116,139,0.15)",
  },
  low: {
    from: "#34d399", via: "#2dd4bf", to: "#065f46",
    badgeBg: "linear-gradient(150deg,#064e3b 0%,#042e22 60%,#021810 100%)",
    glossy: "inset 0 1px 0 rgba(52,211,153,0.18),inset 0 -1px 0 rgba(0,0,0,0.35)",
    glow:   "0 0 6px 1px rgba(52,211,153,0.15)",
    glowPk: "0 0 22px 5px rgba(52,211,153,0.42)",
    border: "rgba(52,211,153,0.30)", text: "#6ee7b7",
    label: "Low Risk", icon: <ShieldCheck size={11} className="text-emerald-300" />,
    pulse: false as const,
    cardHover: "0 0 50px 6px rgba(52,211,153,0.18)",
  },
  medium: {
    from: "#fbbf24", via: "#f97316", to: "#92400e",
    badgeBg: "linear-gradient(150deg,#78350f 0%,#451e05 60%,#2a1000 100%)",
    glossy: "inset 0 1px 0 rgba(251,191,36,0.22),inset 0 -1px 0 rgba(0,0,0,0.40)",
    glow:   "0 0 8px 2px rgba(251,191,36,0.22)",
    glowPk: "0 0 24px 6px rgba(251,191,36,0.50)",
    border: "rgba(251,191,36,0.32)", text: "#fcd34d",
    label: "Med Risk", icon: <AlertTriangle size={11} className="text-amber-300" />,
    pulse: true as const, pulseDuration: 2.2,
    cardHover: "0 0 50px 6px rgba(251,191,36,0.18)",
  },
  high: {
    from: "#fb7185", via: "#f43f5e", to: "#881337",
    badgeBg: "linear-gradient(150deg,#9f1239 0%,#5e001e 60%,#3a000d 100%)",
    glossy: "inset 0 1px 0 rgba(251,113,133,0.26),inset 0 -1px 0 rgba(0,0,0,0.45)",
    glow:   "0 0 12px 3px rgba(244,63,94,0.38)",
    glowPk: "0 0 28px 8px rgba(244,63,94,0.62)",
    border: "rgba(244,63,94,0.42)", text: "#fda4af",
    label: "High Risk", icon: <Flame size={11} className="text-rose-300" />,
    pulse: true as const, pulseDuration: 1.5,
    cardHover: "0 0 60px 8px rgba(244,63,94,0.22)",
  },
} as const;

// ─── 3D Glossy Risk Badge ─────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: RiskLevel | string }) {
  // Bulletproof fallback: sanitize and check if valid key
  const sanitizedRisk = (risk?.toLowerCase() || "none") as RiskLevel;
  const c = RISK[sanitizedRisk] || RISK.none;

  const baseBox = `${c.glow}, ${c.glossy}`;
  const peakBox = `${c.glowPk}, ${c.glossy}`;

  return (
    <motion.span
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{
        background: c.badgeBg,
        border: `1px solid ${c.border}`,
        outline: `1px solid ${c.border.replace(/[\d.]+\)$/, "0.09)")}`,
        outlineOffset: "2px",
        color: c.text,
      }}
      animate={
        c.pulse
          ? { boxShadow: [baseBox, peakBox, baseBox] }
          : { boxShadow: baseBox }
      }
      transition={c.pulse ? { duration: c.pulseDuration, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      {c.icon}
      {c.label}
    </motion.span>
  );
}

// ─── Sensor Widget ────────────────────────────────────────────────────────────

function SensorWidget({
  icon, value, unit, gradient, glow,
}: {
  icon: React.ReactNode;
  value: number;
  unit: string;
  gradient: string;  // Tailwind gradient classes for text
  glow: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
      <span className="text-slate-600 shrink-0">{icon}</span>
      <div>
        <p className={`font-outfit font-bold text-base leading-none bg-clip-text text-transparent ${gradient}`}
          style={{ filter: `drop-shadow(0 0 5px ${glow})` }}
        >
          {value.toFixed(1)}<span className="text-[10px] font-medium ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function SiloCard({ silo }: { silo: Silo }) {
  // Bulletproof fallback: sanitize and check if valid key
  const riskKey = (silo.risk_level?.toLowerCase() || "none") as RiskLevel;
  const c = RISK[riskKey] || RISK.none;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const spinAngle  = useMotionValue(0);
  const angleStr   = useTransform(spinAngle, (v) => `${v}deg`);
  const ctrlRef    = useRef<ReturnType<typeof animate> | null>(null);
  const hovered    = useRef(false);

  function startLoop(from: number, dur: number) {
    ctrlRef.current?.stop();
    ctrlRef.current = animate(spinAngle, from + 360, {
      duration: dur, ease: "linear",
      onComplete: () => startLoop(spinAngle.get(), hovered.current ? 0.85 : 3.5),
    });
  }

  useEffect(() => {
    startLoop(0, 3.5);
    return () => ctrlRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => angleStr.on("change", (v) => {
    wrapperRef.current?.style.setProperty("--angle", v);
  }), [angleStr]);

  const hasSensors = silo.temperature !== undefined || silo.humidity !== undefined;

  return (
    <Link href={`/silos/${silo.id}`} className="block focus:outline-none group">
      <motion.div
        onHoverStart={() => { hovered.current = true;  startLoop(spinAngle.get(), 0.85); }}
        onHoverEnd={()  => { hovered.current = false; startLoop(spinAngle.get(), 3.5);  }}
        whileHover={{ y: -5, scale: 1.012 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="relative h-full"
      >
        <div ref={wrapperRef} className="relative rounded-[22px] p-[1.5px] overflow-hidden h-full"
          style={{ background: `conic-gradient(from var(--angle,0deg), ${c.from}, ${c.via}, ${c.to}, ${c.from})` } as React.CSSProperties}
        >
          <motion.div
            whileHover={{ boxShadow: c.cardHover }}
            transition={{ duration: 0.4 }}
            className="relative h-full rounded-[21px] bg-slate-950/97 pt-6 pb-5 px-5 flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center justify-center size-11 rounded-2xl shrink-0 bg-white/4 border border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.5)] text-slate-400 group-hover:text-slate-200 transition-colors">
                <CropIcon crop={silo.crop_type ?? "wheat"} size={24} className="text-current" />
              </div>
              <RiskBadge risk={riskKey} />
            </div>

            {/* Name + location */}
            <div>
              <h2 className="font-outfit font-bold text-lg text-white tracking-tight leading-snug line-clamp-1">{silo.name}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={11} className="text-slate-600 shrink-0" />
                <span className="font-plus-jakarta text-slate-500 text-xs truncate">{silo.location}</span>
              </div>
            </div>

            {/* Sensor widgets — gradient text */}
            {hasSensors && (
              <div className="grid grid-cols-2 gap-2">
                {silo.temperature !== undefined && (
                  <SensorWidget
                    icon={<Thermometer size={12} />}
                    value={silo.temperature}
                    unit="°C"
                    gradient="bg-gradient-to-r from-amber-400 to-orange-500"
                    glow="rgba(251,146,60,0.5)"
                  />
                )}
                {silo.humidity !== undefined && (
                  <SensorWidget
                    icon={<Droplets size={12} />}
                    value={silo.humidity}
                    unit="%"
                    gradient="bg-gradient-to-r from-cyan-400 to-blue-500"
                    glow="rgba(34,211,238,0.5)"
                  />
                )}
              </div>
            )}

            {/* Crop chip */}
            {silo.crop_type && (
              <span className="self-start px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white/3 border border-white/5 text-slate-500 capitalize tracking-wide">
                {silo.crop_type}
              </span>
            )}

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="font-outfit text-[9px] text-slate-700 tracking-[0.15em] uppercase">#{silo.id.toUpperCase()}</span>
              <ShieldAlert size={12} className="text-slate-800" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Export spin controls hook for external use ───────────────────────────────
export { useAnimationControls };
