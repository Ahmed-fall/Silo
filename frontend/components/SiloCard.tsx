"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { AlertTriangle, ShieldCheck, Flame, MapPin, Thermometer, Droplets } from "lucide-react";
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

// ─── Risk config — Crimson for danger, Bronze/warm for safe ──────────────────

const RISK = {
  none: {
    from: "#C8A97A", via: "#E6D4B8", to: "#F0E8D8",
    border: "rgba(164,130,89,0.40)",
    text: "#8A6E48",
    bg: "rgba(252,249,243,0.97)",
    label: "Nominal",
    icon: <ShieldCheck size={10} />,
    pulse: false as const,
    cardHover: "0 0 32px 2px rgba(164,130,89,0.12)",
    dotColor: "#A48259",
    stripColor: "#C4A882",
    stripPulse: false,
  },
  low: {
    from: "#B89A6A", via: "#D4B896", to: "#EAD9C0",
    border: "rgba(164,130,89,0.45)",
    text: "#7A6040",
    bg: "rgba(252,249,243,0.97)",
    label: "Low Risk",
    icon: <ShieldCheck size={10} />,
    pulse: false as const,
    cardHover: "0 0 36px 3px rgba(164,130,89,0.14)",
    dotColor: "#A48259",
    stripColor: "#B89A72",
    stripPulse: false,
  },
  medium: {
    from: "#C17A2B", via: "#D4A574", to: "#F5DEB3",
    border: "rgba(193,122,43,0.45)",
    text: "#9E6422",
    bg: "rgba(253,248,241,0.97)",
    label: "Med Risk",
    icon: <AlertTriangle size={10} />,
    pulse: true as const, pulseDuration: 2.2,
    cardHover: "0 0 40px 4px rgba(193,122,43,0.14)",
    dotColor: "#C17A2B",
    stripColor: "#C17A2B",
    stripPulse: false,
  },
  high: {
    from: "#C93047", via: "#E05470", to: "#F8C4CF",
    border: "rgba(201,48,71,0.45)",
    text: "#C93047",
    bg: "rgba(253,242,244,0.97)",
    label: "High Risk",
    icon: <Flame size={10} />,
    pulse: true as const, pulseDuration: 1.4,
    cardHover: "0 0 48px 6px rgba(201,48,71,0.14)",
    dotColor: "#C93047",
    stripColor: "#C93047",
    stripPulse: true,
  },
} as const;

// ─── Risk Badge ───────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: RiskLevel | string }) {
  const sanitizedRisk = (risk?.toLowerCase() || "none") as RiskLevel;
  const c = RISK[sanitizedRisk] || RISK.none;

  return (
    <motion.span
      className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-semibold tracking-widest uppercase"
      style={{
        backgroundColor: "transparent",
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: "3px",
        fontFamily: "var(--font-outfit)",
        boxShadow: c.pulse ? `0 0 8px 1px ${c.border}` : "none",
      }}
      animate={
        c.pulse
          ? { boxShadow: [`0 0 4px 1px ${c.border}`, `0 0 14px 3px ${c.border}`, `0 0 4px 1px ${c.border}`] }
          : {}
      }
      transition={c.pulse ? { duration: c.pulseDuration, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <span style={{ color: c.text }}>{c.icon}</span>
      {c.label}
    </motion.span>
  );
}

// ─── Sensor Reading ───────────────────────────────────────────────────────────

function SensorReading({ icon, value, unit }: { icon: React.ReactNode; value: number; unit: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--text-muted)" }} className="shrink-0">{icon}</span>
      <p style={{ fontFamily: "var(--font-outfit)", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, lineHeight: 1 }}>
        {value.toFixed(1)}<span style={{ fontSize: "9px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "1px" }}>{unit}</span>
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
      onComplete: () => startLoop(spinAngle.get(), hovered.current ? 1.0 : 4.0),
    });
  }

  useEffect(() => {
    startLoop(0, 4.0);
    return () => ctrlRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => angleStr.on("change", (v) => {
    wrapperRef.current?.style.setProperty("--angle", v);
  }), [angleStr]);

  const hasSensors = silo.temperature !== undefined || silo.humidity !== undefined;
  const shortId = silo.id.split("-")[0].toUpperCase();

  return (
    <Link href={`/silos/${silo.id}`} className="block focus:outline-none group">
      <motion.div
        onHoverStart={() => { hovered.current = true;  startLoop(spinAngle.get(), 1.0); }}
        onHoverEnd={()  => { hovered.current = false; startLoop(spinAngle.get(), 4.0); }}
        whileHover={{ y: -4, scale: 1.010 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative h-full"
      >
        {/* Spinning conic border frame */}
        <div
          ref={wrapperRef}
          className="relative rounded-[6px] overflow-hidden h-full"
          style={{
            padding: "1px",
            background: `conic-gradient(from var(--angle,0deg), ${c.from}, ${c.via}, ${c.to}, ${c.from})`,
          } as React.CSSProperties}
        >
          {/* Card body */}
          <motion.div
            whileHover={{ boxShadow: c.cardHover }}
            transition={{ duration: 0.4 }}
            className="relative h-full flex flex-col gap-0"
            style={{ backgroundColor: c.bg, borderRadius: "5px" }}
          >
            {/* ── Vertical dossier classification strip ── */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "4px",
                borderRadius: "5px 0 0 5px",
                backgroundColor: c.stripColor,
                opacity: 0.85,
                animation: c.stripPulse
                  ? "stripPulse 1.6s ease-in-out infinite alternate"
                  : "none",
              }}
            />
            {/* ── Top meta strip ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: "32px", height: "32px",
                    border: "1px solid var(--border-muted)",
                    borderRadius: "4px",
                    color: "var(--text-muted)",
                    backgroundColor: "rgba(164,130,89,0.04)",
                  }}
                >
                  <CropIcon crop={silo.crop_type ?? "wheat"} size={16} className="text-current" />
                </div>
                <div>
                  <p style={{
                    fontFamily: "var(--font-outfit)", fontSize: "8px",
                    letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase"
                  }}>
                    {silo.crop_type ?? "GRAIN"}
                  </p>
                </div>
              </div>
              <RiskBadge risk={riskKey} />
            </div>

            {/* ── Divider ── */}
            <div style={{ height: "1px", backgroundColor: "var(--border-muted)", margin: "0 20px" }} />

            {/* ── Main content ── */}
            <div className="px-5 py-4 flex-1 flex flex-col gap-3">

              {/* Name + location */}
              <div>
                <h2
                  className="leading-tight line-clamp-1"
                  style={{
                    fontFamily: "var(--font-cinzel)",
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: "var(--text-primary)",
                  }}
                >
                  {silo.name}
                </h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={9} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                  <span
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-plus-jakarta)",
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {silo.location}
                  </span>
                </div>
              </div>

              {/* Sensor readings — horizontal row */}
              {hasSensors && (
                <div className="flex items-center gap-5 mt-1">
                  {silo.temperature !== undefined && (
                    <SensorReading icon={<Thermometer size={11} />} value={silo.temperature} unit="°C" />
                  )}
                  {silo.humidity !== undefined && (
                    <SensorReading icon={<Droplets size={11} />} value={silo.humidity} unit="%" />
                  )}
                </div>
              )}
            </div>

            {/* ── Catalog footer ── */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: "1px solid var(--border-muted)" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "8px",
                  letterSpacing: "0.18em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                REG-{shortId}
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor: c.dotColor,
                    boxShadow: c.pulse ? `0 0 5px ${c.dotColor}` : "none",
                    animation: c.pulse ? "pulse-dot 2s infinite" : "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-outfit)",
                    fontSize: "8px",
                    letterSpacing: "0.14em",
                    color: c.text,
                    textTransform: "uppercase",
                  }}
                >
                  {c.label}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Export animation controls hook ──────────────────────────────────────────
export { useAnimationControls };
