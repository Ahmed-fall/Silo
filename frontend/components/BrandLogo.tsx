/**
 * Aegis Strata — Brand Logo
 *
 * Vertical abstract pillars (physical silos) + sweeping horizontal radar arc
 * (intelligence layer). Designed for the clean white sidebar: pillars use
 * var(--text-primary), the radar conduit uses the turquoise accent #40E0D0.
 */

import React from "react";

export function BrandLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width="100%"
      height="100%"
      {...props}
    >
      {/* ── Vertical Silo Pillars ─────────────────────────────────────── */}
      {/* Five staggered pillars representing the physical infrastructure */}
      <rect x="3"  y="17" width="4" height="12" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="9"  y="13" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.50" />
      <rect x="15" y="9"  width="4" height="20" rx="1.5" fill="currentColor" opacity="0.70" />
      <rect x="21" y="13" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.50" />
      <rect x="27" y="17" width="4" height="12" rx="1.5" fill="currentColor" opacity="0.35" />

      {/* ── Radar / Topographic Conduit ───────────────────────────────── */}
      {/* Sweeping arc: the intelligence layer spanning the national grid */}
      <path
        d="M 1 8  Q 16 -2 31 8"
        stroke="#40E0D0"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Subtle secondary echo arc — depth without clutter */}
      <path
        d="M 5 12 Q 16 5 27 12"
        stroke="#40E0D0"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
    </svg>
  );
}
