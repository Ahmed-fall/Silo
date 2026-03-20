"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  AlertTriangle, ShieldCheck, Flame, MapPin, ShieldAlert,
} from "lucide-react";
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

const RISK_CONFIG = {
  none: {
    from: "#64748b", via: "#94a3b8", to: "#1e293b",
    shadow: "0 0 32px 4px rgba(100,116,139,0.30)",
    badgeBg: "bg-slate-800/60", badgeText: "text-slate-400",
    label: "Nominal",
    icon: <ShieldCheck size={12} className="text-slate-400" />,
  },
  low: {
    from: "#34d399", via: "#2dd4bf", to: "#065f46",
    shadow: "0 0 40px 6px rgba(52,211,153,0.35)",
    badgeBg: "bg-emerald-950/60", badgeText: "text-emerald-300",
    label: "Low Risk",
    icon: <ShieldCheck size={12} className="text-emerald-400" />,
  },
  medium: {
    from: "#fbbf24", via: "#f97316", to: "#92400e",
    shadow: "0 0 40px 6px rgba(251,191,36,0.35)",
    badgeBg: "bg-amber-950/60", badgeText: "text-amber-300",
    label: "Medium Risk",
    icon: <AlertTriangle size={12} className="text-amber-400" />,
  },
  high: {
    from: "#fb7185", via: "#f43f5e", to: "#881337",
    shadow: "0 0 48px 8px rgba(244,63,94,0.50)",
    badgeBg: "bg-rose-950/60", badgeText: "text-rose-300",
    label: "High Risk",
    icon: <Flame size={12} className="text-rose-400" />,
  },
} satisfies Record<RiskLevel, unknown>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SiloCard({ silo }: { silo: Silo }) {
  const cfg = RISK_CONFIG[silo.risk_level];

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
        whileHover={{ y: -4, scale: 1.015 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="relative h-full"
      >
        {/* ── Spinning border shell ── */}
        <div
          ref={wrapperRef}
          className="relative rounded-[22px] p-[1.5px] overflow-hidden h-full"
          style={{
            background: `conic-gradient(from var(--angle,0deg), ${cfg.from}, ${cfg.via}, ${cfg.to}, ${cfg.from})`,
          } as React.CSSProperties}
        >
          {/* ── Card face ── */}
          <motion.div
            whileHover={{ boxShadow: cfg.shadow }}
            transition={{ duration: 0.35 }}
            className="
              relative h-full rounded-[21px]
              bg-slate-950/95
              flex flex-col
              pt-6 pb-5 px-5
              gap-4
              shadow-float
            "
          >
            {/* Header row: crop icon + risk badge */}
            <div className="flex items-start justify-between gap-2">
              {/* Crop icon bubble */}
              <div className="
                flex items-center justify-center
                size-11 rounded-2xl shrink-0
                bg-slate-900/80 border border-white/[0.06]
                shadow-[0_2px_12px_rgba(0,0,0,0.5)]
                text-slate-400 group-hover:text-slate-200 transition-colors
              ">
                <CropIcon
                  crop={silo.crop_type ?? "wheat"}
                  size={24}
                  className="text-current"
                />
              </div>

              {/* Risk badge */}
              <span className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full
                text-[10px] font-semibold tracking-wide
                border border-white/[0.06]
                ${cfg.badgeBg} ${cfg.badgeText}
              `}>
                {cfg.icon}
                {cfg.label}
              </span>
            </div>

            {/* Silo name */}
            <div>
              <h2 className="font-outfit font-bold text-lg text-white tracking-tight leading-snug line-clamp-1">
                {silo.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={11} className="text-slate-600 shrink-0" />
                <span className="font-plus-jakarta text-slate-500 text-xs truncate">{silo.location}</span>
              </div>
            </div>

            {/* Crop type label */}
            {silo.crop_type && (
              <span className="
                self-start px-2.5 py-1 rounded-lg text-[10px] font-medium
                bg-white/[0.04] border border-white/[0.06]
                text-slate-500 capitalize tracking-wide
              ">
                {silo.crop_type}
              </span>
            )}

            {/* Footer */}
            <div className="
              mt-auto pt-3 border-t border-white/[0.05]
              flex items-center justify-between
            ">
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
