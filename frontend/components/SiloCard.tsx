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

// ─── Risk config (Light Mode: White cards, colored accents only) ──────────────

const RISK = {
  none: {
    from: "#40E0D0", via: "#5EEAD4", to: "#CCFBF1",
    border: "rgba(64,224,208,0.35)",
    text: "var(--accent)",
    label: "Nominal", icon: <ShieldCheck size={11} style={{ color: "var(--accent)" }} />,
    pulse: false as const,
    cardHover: "0 0 32px 2px rgba(64,224,208,0.12)",
  },
  low: {
    from: "#40E0D0", via: "#2DD4BF", to: "#99F6E4",
    border: "rgba(64,224,208,0.40)",
    text: "var(--accent)",
    label: "Low Risk", icon: <ShieldCheck size={11} style={{ color: "var(--accent)" }} />,
    pulse: false as const,
    cardHover: "0 0 40px 4px rgba(64,224,208,0.15)",
  },
  medium: {
    from: "#CD7F32", via: "#D4A574", to: "#F5DEB3",
    border: "rgba(205,127,50,0.40)",
    text: "var(--warning)",
    label: "Med Risk", icon: <AlertTriangle size={11} style={{ color: "var(--warning)" }} />,
    pulse: true as const, pulseDuration: 2.2,
    cardHover: "0 0 40px 4px rgba(205,127,50,0.12)",
  },
  high: {
    from: "#E11D48", via: "#FB7185", to: "#FECDD3",
    border: "rgba(225,29,72,0.40)",
    text: "var(--alert)",
    label: "High Risk", icon: <Flame size={11} style={{ color: "var(--alert)" }} />,
    pulse: true as const, pulseDuration: 1.5,
    cardHover: "0 0 48px 6px rgba(225,29,72,0.12)",
  },
} as const;

// ─── 3D Risk Badge ─────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: RiskLevel | string }) {
  const sanitizedRisk = (risk?.toLowerCase() || "none") as RiskLevel;
  const c = RISK[sanitizedRisk] || RISK.none;

  return (
    <motion.span
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{
        backgroundColor: "rgba(255,255,255,0.9)",
        border: `1.5px solid ${c.border}`,
        color: c.text,
        boxShadow: c.pulse ? `0 0 8px 1px ${c.border}` : "0 1px 4px rgba(0,0,0,0.06)",
      }}
      animate={
        c.pulse
          ? { boxShadow: [`0 0 4px 1px ${c.border}`, `0 0 16px 4px ${c.border}`, `0 0 4px 1px ${c.border}`] }
          : {}
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
  icon, value, unit,
}: {
  icon: React.ReactNode;
  value: number;
  unit: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: "var(--bg-base)",
        border: "1px solid var(--border-muted)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }} className="shrink-0">{icon}</span>
      <p className="font-outfit font-bold text-base leading-none" style={{ color: "var(--text-primary)" }}>
        {value.toFixed(1)}<span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{unit}</span>
      </p>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function SiloCard({ silo }: { silo: Silo }) {
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
            className="relative h-full rounded-[21px] pt-6 pb-5 px-5 flex flex-col gap-4"
            style={{ backgroundColor: "rgba(255,255,255,0.97)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex items-center justify-center size-11 rounded-2xl shrink-0 transition-colors"
                style={{
                  backgroundColor: "var(--bg-base)",
                  border: "1px solid var(--border-muted)",
                  color: "var(--text-secondary)",
                }}
              >
                <CropIcon crop={silo.crop_type ?? "wheat"} size={24} className="text-current" />
              </div>
              <RiskBadge risk={riskKey} />
            </div>

            {/* Name + location */}
            <div>
              <h2 className="font-outfit font-bold text-lg tracking-tight leading-snug line-clamp-1" style={{ color: "var(--text-primary)" }}>{silo.name}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={11} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                <span className="font-plus-jakarta text-xs truncate" style={{ color: "var(--text-secondary)" }}>{silo.location}</span>
              </div>
            </div>

            {/* Sensor widgets */}
            {hasSensors && (
              <div className="grid grid-cols-2 gap-2">
                {silo.temperature !== undefined && (
                  <SensorWidget
                    icon={<Thermometer size={12} />}
                    value={silo.temperature}
                    unit="°C"
                  />
                )}
                {silo.humidity !== undefined && (
                  <SensorWidget
                    icon={<Droplets size={12} />}
                    value={silo.humidity}
                    unit="%"
                  />
                )}
              </div>
            )}

            {/* Crop chip */}
            {silo.crop_type && (
              <span
                className="self-start px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize tracking-wide"
                style={{
                  backgroundColor: "var(--accent-subtle)",
                  border: "1px solid var(--border-glass)",
                  color: "var(--text-secondary)",
                }}
              >
                {silo.crop_type}
              </span>
            )}

            {/* Footer */}
            <div className="mt-auto pt-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-muted)" }}>
              <span className="font-outfit text-[9px] tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>#{silo.id.toUpperCase()}</span>
              <ShieldAlert size={12} style={{ color: "var(--text-muted)" }} />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Export spin controls hook for external use ───────────────────────────────
export { useAnimationControls };
