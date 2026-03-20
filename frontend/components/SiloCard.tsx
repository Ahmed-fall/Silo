"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { AlertTriangle, ShieldCheck, Flame, MapPin, ShieldAlert } from "lucide-react";
import CropIcon from "@/components/CropIcon";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "none" | "low" | "medium" | "high";

export interface Silo {
  id: string;
  name: string;
  location: string;
  risk_level: RiskLevel;
  crop_type?: string;
}

// ─── Risk config ──────────────────────────────────────────────────────────────
// Badge uses a proper 3D glossy pill: gradient bg + inner highlight + outer glow

const RISK = {
  none: {
    // Conic border colours
    from: "#64748b", via: "#94a3b8", to: "#1e293b",
    // Badge gradient (bg)
    badgeBg: "linear-gradient(160deg, #2e3a4a 0%, #1c2533 60%, #141c28 100%)",
    // Inset highlight (top gloss)
    gloss: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.35)",
    // Outer glow
    outerGlow: "0 0 0px 0px rgba(100,116,139,0)",
    outerGlowPeak: "0 0 18px 4px rgba(100,116,139,0.30)",
    border: "rgba(148,163,184,0.25)",
    text: "#cbd5e1",
    label: "Nominal",
    icon: <ShieldCheck size={11} className="text-slate-300" />,
    pulse: false,
    // Card spin border glow on hover
    cardGlowHover: "0 0 40px 4px rgba(100,116,139,0.18)",
  },
  low: {
    from: "#34d399", via: "#2dd4bf", to: "#065f46",
    badgeBg: "linear-gradient(160deg, #064e3b 0%, #052e1f 60%, #021a12 100%)",
    gloss: "inset 0 1px 0 rgba(52,211,153,0.20), inset 0 -1px 0 rgba(0,0,0,0.40)",
    outerGlow: "0 0 6px 1px rgba(52,211,153,0.15)",
    outerGlowPeak: "0 0 20px 5px rgba(52,211,153,0.40)",
    border: "rgba(52,211,153,0.30)",
    text: "#6ee7b7",
    label: "Low Risk",
    icon: <ShieldCheck size={11} className="text-emerald-300" />,
    pulse: false,
    cardGlowHover: "0 0 50px 6px rgba(52,211,153,0.20)",
  },
  medium: {
    from: "#fbbf24", via: "#f97316", to: "#92400e",
    badgeBg: "linear-gradient(160deg, #78350f 0%, #451e05 60%, #291100 100%)",
    gloss: "inset 0 1px 0 rgba(251,191,36,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
    outerGlow: "0 0 8px 2px rgba(251,191,36,0.25)",
    outerGlowPeak: "0 0 22px 6px rgba(251,191,36,0.50)",
    border: "rgba(251,191,36,0.35)",
    text: "#fcd34d",
    label: "Med Risk",
    icon: <AlertTriangle size={11} className="text-amber-300" />,
    pulse: true,
    pulseDuration: 2.2,
    cardGlowHover: "0 0 50px 6px rgba(251,191,36,0.20)",
  },
  high: {
    from: "#fb7185", via: "#f43f5e", to: "#881337",
    badgeBg: "linear-gradient(160deg, #9f1239 0%, #600020 60%, #3b000f 100%)",
    gloss: "inset 0 1px 0 rgba(251,113,133,0.28), inset 0 -1px 0 rgba(0,0,0,0.50)",
    outerGlow: "0 0 12px 3px rgba(244,63,94,0.40)",
    outerGlowPeak: "0 0 28px 8px rgba(244,63,94,0.65)",
    border: "rgba(244,63,94,0.45)",
    text: "#fda4af",
    label: "High Risk",
    icon: <Flame size={11} className="text-rose-300" />,
    pulse: true,
    pulseDuration: 1.5,
    cardGlowHover: "0 0 60px 8px rgba(244,63,94,0.25)",
  },
} as const;

// ─── Risk Badge — 3D Glossy Pill ─────────────────────────────────────────────

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cfg = RISK[risk];

  return (
    <motion.span
      animate={
        cfg.pulse
          ? {
              boxShadow: [
                `${cfg.outerGlow}, ${cfg.gloss}`,
                `${cfg.outerGlowPeak}, ${cfg.gloss}`,
                `${cfg.outerGlow}, ${cfg.gloss}`,
              ],
            }
          : { boxShadow: `${cfg.outerGlow}, ${cfg.gloss}` }
      }
      transition={
        cfg.pulse
          ? { duration: cfg.pulseDuration, repeat: Infinity, ease: "easeInOut" }
          : {}
      }
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{
        background: cfg.badgeBg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
        // ring layer via outline
        outline: `1px solid ${cfg.border.replace("0.35", "0.12").replace("0.30", "0.10").replace("0.45", "0.15").replace("0.25", "0.08")}`,
        outlineOffset: "2px",
      }}
    >
      {cfg.icon}
      {cfg.label}
    </motion.span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function SiloCard({ silo }: { silo: Silo }) {
  const cfg = RISK[silo.risk_level];

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

  useEffect(() =>
    angleStr.on("change", (v) => {
      wrapperRef.current?.style.setProperty("--angle", v);
    }), [angleStr]);

  return (
    <Link href={`/silos/${silo.id}`} className="block focus:outline-none group">
      <motion.div
        onHoverStart={() => { hovered.current = true;  startLoop(spinAngle.get(), 0.85); }}
        onHoverEnd={()  => { hovered.current = false; startLoop(spinAngle.get(), 3.5);  }}
        whileHover={{ y: -5, scale: 1.012 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="relative h-full"
      >
        {/* Conic border wrapper */}
        <div
          ref={wrapperRef}
          className="relative rounded-[22px] p-[1.5px] overflow-hidden h-full"
          style={{
            background: `conic-gradient(from var(--angle,0deg), ${cfg.from}, ${cfg.via}, ${cfg.to}, ${cfg.from})`,
          } as React.CSSProperties}
        >
          {/* Card face */}
          <motion.div
            whileHover={{ boxShadow: cfg.cardGlowHover }}
            transition={{ duration: 0.4 }}
            className="
              relative h-full rounded-[21px]
              bg-slate-950/96
              pt-6 pb-5 px-5
              flex flex-col gap-4
            "
          >
            {/* Crop icon + risk badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="
                flex items-center justify-center size-11 rounded-2xl shrink-0
                bg-white/[0.04] border border-white/[0.06]
                shadow-[0_2px_12px_rgba(0,0,0,0.5)]
                text-slate-400 group-hover:text-slate-200 transition-colors
              ">
                <CropIcon crop={silo.crop_type ?? "wheat"} size={24} className="text-current" />
              </div>

              <RiskBadge risk={silo.risk_level} />
            </div>

            {/* Name + location */}
            <div>
              <h2 className="font-outfit font-bold text-lg text-white tracking-tight leading-snug line-clamp-1">
                {silo.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={11} className="text-slate-600 shrink-0" />
                <span className="font-plus-jakarta text-slate-500 text-xs truncate">{silo.location}</span>
              </div>
            </div>

            {/* Crop chip */}
            {silo.crop_type && (
              <span className="
                self-start px-2.5 py-1 rounded-lg text-[10px] font-medium
                bg-white/[0.03] border border-white/[0.05]
                text-slate-500 capitalize tracking-wide
              ">
                {silo.crop_type}
              </span>
            )}

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-white/[0.05] flex items-center justify-between">
              <span className="font-outfit text-[9px] text-slate-700 tracking-[0.15em] uppercase">
                #{silo.id.toUpperCase()}
              </span>
              <ShieldAlert size={12} className="text-slate-800" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}
