// Distinct, hand-crafted SVG crop icons.
// Each icon is visually identifiable without reading the label.

import React from "react";

export type CropType =
  | "wheat"
  | "rice"
  | "corn"
  | "maize"
  | "barley"
  | "sorghum"
  | "soybean"
  | "soy"
  | "default";

interface IconProps {
  size?: number;
  className?: string;
}

// ─── Wheat ───────────────────────────────────────────────────────────────────
// Classic head-of-wheat silhouette with angled barbs

function WheatIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      {/* Central stem */}
      <line x1="14" y1="26" x2="14" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Grain pairs — stacked */}
      {[9, 12, 15, 18].map((y, i) => (
        <g key={i}>
          <ellipse cx="10.5" cy={y} rx="3.2" ry="1.6" transform={`rotate(-30 10.5 ${y})`} fill="currentColor" opacity={0.85 - i * 0.05} />
          <ellipse cx="17.5" cy={y} rx="3.2" ry="1.6" transform={`rotate(30 17.5 ${y})`} fill="currentColor" opacity={0.85 - i * 0.05} />
        </g>
      ))}
      {/* Tip grain */}
      <ellipse cx="14" cy="6.5" rx="2.2" ry="3.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

// ─── Rice ─────────────────────────────────────────────────────────────────────
// Drooping rice panicle with seed clusters

function RiceIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      {/* Main drooping stem */}
      <path d="M14 4 Q14 14 10 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Drooping panicle branches */}
      {[
        { x1: 14, y1: 7, x2: 19, y2: 12 },
        { x1: 14, y1: 10, x2: 20, y2: 16 },
        { x1: 14, y1: 13, x2: 18, y2: 19 },
        { x1: 14, y1: 7, x2: 9,  y2: 13 },
        { x1: 14, y1: 10, x2: 8,  y2: 17 },
      ].map((l, i) => (
        <g key={i}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          {/* Grain at tip */}
          <ellipse cx={l.x2} cy={l.y2} rx="1.6" ry="2.4"
            transform={`rotate(${i < 3 ? 30 : -30} ${l.x2} ${l.y2})`}
            fill="currentColor" opacity="0.9" />
        </g>
      ))}
    </svg>
  );
}

// ─── Corn / Maize ─────────────────────────────────────────────────────────────
// Cob with husk leaves

function CornIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      {/* Cob body */}
      <rect x="10" y="7" width="8" height="15" rx="4" fill="currentColor" opacity="0.8" />
      {/* Kernel rows — horizontal lines across cob */}
      {[10, 13, 16, 19].map((y) => (
        <line key={y} x1="10" y1={y} x2="18" y2={y}
          stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      ))}
      {/* Left husk */}
      <path d="M10 10 Q4 12 5 20 Q9 16 11 22" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" fill="currentColor" fillOpacity="0.12" />
      {/* Right husk */}
      <path d="M18 10 Q24 12 23 20 Q19 16 17 22" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" fill="currentColor" fillOpacity="0.12" />
      {/* Silk threads */}
      {[12, 14, 16].map((x) => (
        <line key={x} x1={x} y1="7" x2={x - 1} y2="3"
          stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      ))}
    </svg>
  );
}

// ─── Barley ───────────────────────────────────────────────────────────────────
// Distinctive long awns (whiskers) extending from the spike

function BarleyIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      {/* Stem */}
      <line x1="14" y1="27" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Grain hulls — alternating */}
      {[10, 14, 18].map((y, i) => (
        <g key={i}>
          <ellipse cx={i % 2 === 0 ? 11.5 : 16.5} cy={y}
            rx="2.8" ry="1.5"
            transform={`rotate(${i % 2 === 0 ? -20 : 20} ${i % 2 === 0 ? 11.5 : 16.5} ${y})`}
            fill="currentColor" opacity="0.9" />
          {/* Long awn */}
          <line
            x1={i % 2 === 0 ? 9.5 : 18.5} y1={y - 1}
            x2={i % 2 === 0 ? 5 : 23} y2={y - 5}
            stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"
          />
        </g>
      ))}
    </svg>
  );
}

// ─── Sorghum ──────────────────────────────────────────────────────────────────
// Dense rounded panicle head on a long stem

function SorghumIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      {/* Stem */}
      <line x1="14" y1="27" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Dense round panicle */}
      <ellipse cx="14" cy="9" rx="6" ry="7" fill="currentColor" opacity="0.85" />
      {/* Grain texture dots */}
      {[
        [11, 7], [14, 6], [17, 7],
        [10, 10], [14, 9], [18, 10],
        [11, 13], [14, 12], [17, 13],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.1"
          fill="rgba(0,0,0,0.3)" />
      ))}
    </svg>
  );
}

// ─── Soybean ─────────────────────────────────────────────────────────────────
// Trifoliate leaf + pod silhouette

function SoybeanIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      {/* Trifoliate leaf cluster */}
      <ellipse cx="14" cy="9" rx="4" ry="5.5" fill="currentColor" opacity="0.8" />
      <ellipse cx="8" cy="12" rx="3.5" ry="5"
        transform="rotate(-30 8 12)" fill="currentColor" opacity="0.7" />
      <ellipse cx="20" cy="12" rx="3.5" ry="5"
        transform="rotate(30 20 12)" fill="currentColor" opacity="0.7" />
      {/* Stem */}
      <line x1="14" y1="14" x2="14" y2="22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Pod */}
      <rect x="11" y="20" width="6" height="5" rx="3" fill="currentColor" opacity="0.85" />
      {/* Beans inside pod */}
      <circle cx="14" cy="21.5" r="1.2" fill="rgba(0,0,0,0.25)" />
      <circle cx="14" cy="23.8" r="1.2" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}

// ─── Default / Unknown ───────────────────────────────────────────────────────

function DefaultCropIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" className={className}
    >
      <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path d="M14 8 Q18 11 18 14 Q18 19 14 21 Q10 19 10 14 Q10 11 14 8Z"
        fill="currentColor" opacity="0.7" />
    </svg>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function CropIcon({
  crop,
  size = 28,
  className = "",
}: {
  crop: string;
  size?: number;
  className?: string;
}) {
  const key = crop.toLowerCase().trim() as CropType;

  switch (key) {
    case "wheat":   return <WheatIcon   size={size} className={className} />;
    case "rice":    return <RiceIcon    size={size} className={className} />;
    case "corn":
    case "maize":   return <CornIcon    size={size} className={className} />;
    case "barley":  return <BarleyIcon  size={size} className={className} />;
    case "sorghum": return <SorghumIcon size={size} className={className} />;
    case "soybean":
    case "soy":     return <SoybeanIcon size={size} className={className} />;
    default:        return <DefaultCropIcon size={size} className={className} />;
  }
}
