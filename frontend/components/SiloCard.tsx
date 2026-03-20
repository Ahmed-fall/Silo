"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  Wheat,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Flame,
  MapPin,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "none" | "low" | "medium" | "high";

export interface Silo {
  id: string;
  name: string;
  location: string;
  risk_level: RiskLevel;
}

// ─── Risk-level style map ─────────────────────────────────────────────────────

const RISK_CONFIG: Record<
  RiskLevel,
  {
    /* conic-gradient colour stops for the spinning border */
    from: string;
    via: string;
    to: string;
    /* tailwind glow shadow */
    shadow: string;
    /* badge */
    badgeBg: string;
    badgeText: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  none: {
    from: "#64748b",
    via: "#94a3b8",
    to: "#1e293b",
    shadow: "0 0 32px 4px rgba(100,116,139,0.35)",
    badgeBg: "bg-slate-700/60",
    badgeText: "text-slate-300",
    label: "Nominal",
    icon: <ShieldCheck size={20} className="text-slate-400" />,
  },
  low: {
    from: "#34d399",
    via: "#2dd4bf",
    to: "#065f46",
    shadow: "0 0 36px 6px rgba(52,211,153,0.4)",
    badgeBg: "bg-emerald-900/50",
    badgeText: "text-emerald-300",
    label: "Low Risk",
    icon: <ShieldCheck size={20} className="text-emerald-400" />,
  },
  medium: {
    from: "#fbbf24",
    via: "#f97316",
    to: "#92400e",
    shadow: "0 0 36px 6px rgba(251,191,36,0.4)",
    badgeBg: "bg-amber-900/50",
    badgeText: "text-amber-300",
    label: "Medium Risk",
    icon: <AlertTriangle size={20} className="text-amber-400" />,
  },
  high: {
    from: "#fb7185",
    via: "#f43f5e",
    to: "#881337",
    shadow: "0 0 40px 8px rgba(244,63,94,0.55)",
    badgeBg: "bg-rose-900/50",
    badgeText: "text-rose-300",
    label: "High Risk",
    icon: <Flame size={20} className="text-rose-400" />,
  },
};

// ─── Animated border hook ─────────────────────────────────────────────────────
// Drives a CSS custom property `--angle` from 0° → 360° on a loop.
// Speed is controlled by `duration`.

function useSpinBorder(
  ref: React.RefObject<HTMLDivElement | null>,
  duration: number
) {
  const angle = useMotionValue(0);
  const angleStr = useTransform(angle, (v) => `${v}deg`);

  useEffect(() => {
    let ctrl: ReturnType<typeof animate>;

    function startLoop(from: number) {
      ctrl = animate(angle, from + 360, {
        duration,
        ease: "linear",
        onComplete: () => startLoop(from + 360),
      });
    }

    startLoop(angle.get());
    return () => ctrl?.stop();
  }, [angle, duration]);

  // Write the CSS custom property onto the DOM node whenever the value changes
  useEffect(() => {
    return angleStr.on("change", (v) => {
      if (ref.current) ref.current.style.setProperty("--angle", v);
    });
  }, [angleStr, ref]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SiloCard({ silo }: { silo: Silo }) {
  const cfg = RISK_CONFIG[silo.risk_level];

  // Two separate refs + spin hooks — idle (3 s) and hover (0.9 s)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const idleAngle = useMotionValue(0);
  const hoverAngle = useMotionValue(0);
  const isHoveredRef = useRef(false);

  // Single spinning angle that we manually control
  const spinAngle = useMotionValue(0);
  const angleStr = useTransform(spinAngle, (v) => `${v}deg`);

  // Track the current animation controller so we can .stop() it
  const ctrlRef = useRef<ReturnType<typeof animate> | null>(null);

  function startLoop(from: number, dur: number) {
    ctrlRef.current?.stop();
    ctrlRef.current = animate(spinAngle, from + 360, {
      duration: dur,
      ease: "linear",
      onComplete: () => startLoop(spinAngle.get(), isHoveredRef.current ? 0.9 : 3),
    });
  }

  // Suppress unused-variable warnings
  void idleAngle;
  void hoverAngle;

  useEffect(() => {
    startLoop(0, 3);
    return () => ctrlRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push angle to CSS custom property
  useEffect(() => {
    return angleStr.on("change", (v) => {
      if (wrapperRef.current) wrapperRef.current.style.setProperty("--angle", v);
    });
  }, [angleStr]);

  function handleHoverStart() {
    isHoveredRef.current = true;
    startLoop(spinAngle.get(), 0.9);
  }

  function handleHoverEnd() {
    isHoveredRef.current = false;
    startLoop(spinAngle.get(), 3);
  }

  return (
    <Link href={`/silos/${silo.id}`} className="block focus:outline-none group">
      <motion.div
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
        whileHover={{ scale: 1.025 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative h-full"
        style={{
          // Applied on hover via CSS variable written by motion
          "--glow": cfg.shadow,
        } as React.CSSProperties}
      >
        {/* ── Animated border wrapper ─────────────────────────────────────── */}
        <div
          ref={wrapperRef}
          className="relative rounded-2xl p-[2px] overflow-hidden h-full"
          style={
            {
              /* The spinning border is a conic-gradient behind the card.
                 --angle is written by the Framer Motion listener above. */
              background: `conic-gradient(from var(--angle, 0deg), ${cfg.from}, ${cfg.via}, ${cfg.to}, ${cfg.from})`,
            } as React.CSSProperties
          }
        >
          {/* ── Card face ──────────────────────────────────────────────────── */}
          <motion.div
            className="
              relative h-full rounded-[14px]
              bg-slate-950
              px-5 py-5
              flex flex-col gap-4
            "
            /* Glow shadow fades in on hover */
            whileHover={{
              boxShadow: cfg.shadow,
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              {/* Icon bubble */}
              <div
                className="
                  flex items-center justify-center
                  size-10 rounded-xl shrink-0
                  bg-slate-900 border border-slate-800
                "
              >
                <Wheat size={20} className="text-slate-400 group-hover:text-slate-200 transition-colors" />
              </div>

              {/* Risk badge */}
              <span
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                  border border-slate-700/60
                  ${cfg.badgeBg} ${cfg.badgeText}
                `}
              >
                {cfg.icon}
                {cfg.label}
              </span>
            </div>

            {/* Silo name */}
            <div>
              <h2
                className="font-space-grotesk text-lg font-bold text-slate-100 tracking-tight leading-snug line-clamp-1"
              >
                {silo.name}
              </h2>

              {/* Location */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={12} className="text-slate-600 shrink-0" />
                <span className="text-slate-500 text-xs truncate">{silo.location}</span>
              </div>
            </div>

            {/* Footer divider + ID */}
            <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="font-space-grotesk text-[10px] text-slate-600 tracking-widest uppercase">
                ID #{silo.id}
              </span>
              <ShieldAlert size={13} className="text-slate-700" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}
