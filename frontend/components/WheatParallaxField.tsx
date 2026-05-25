"use client";

import { useEffect, useRef } from "react";

// ─── Single Wheat Stalk SVG ────────────────────────────────────────────────────

function WheatStalkSVG({
  scale,
  opacity,
  rotation,
  swayDuration,
  swayDelay,
}: {
  scale: number;
  opacity: number;
  rotation: number;
  swayDuration: number;
  swayDelay: number;
}) {
  const tufts = [5, 10, 15, 20, 26, 32];

  return (
    <svg
      width={26 * scale}
      height={78 * scale}
      viewBox="0 0 26 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        opacity,
        display: "block",
        animation: `wheatFieldSway ${swayDuration}s ease-in-out ${swayDelay}s infinite alternate`,
        transformOrigin: "50% 100%",
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Stem */}
      <line x1="13" y1="76" x2="13" y2="6" stroke="#A48259" strokeWidth="1.1" strokeLinecap="round" />

      {/* Tufts — alternating pair */}
      {tufts.map((y, i) => {
        const s = Math.max(0.3, 1 - i * 0.12);
        return (
          <g key={y}>
            <path
              d={`M13 ${y} Q${13 - 9 * s} ${y - 2.5 * s} ${13 - 5 * s} ${y - 8 * s} Q${13 - 1.5 * s} ${y - 4 * s} 13 ${y}`}
              stroke="#A48259" strokeWidth="0.8" fill="none" strokeLinecap="round"
            />
            <path
              d={`M13 ${y} Q${13 + 9 * s} ${y - 2.5 * s} ${13 + 5 * s} ${y - 8 * s} Q${13 + 1.5 * s} ${y - 4 * s} 13 ${y}`}
              stroke="#A48259" strokeWidth="0.8" fill="none" strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Terminal kernel */}
      <ellipse cx="13" cy="3" rx="2.2" ry="3.5" stroke="#A48259" strokeWidth="0.75" fill="none" />
    </svg>
  );
}

// ─── Seeded pseudo-random (deterministic for SSR safety) ───────────────────────

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ─── Stalk configuration ──────────────────────────────────────────────────────

interface Stalk {
  id: number;
  x: number;       // % of viewport width
  y: number;       // % of viewport height
  scale: number;
  opacity: number;
  rotation: number;
  depth: number;   // parallax strength: 0.15 (far) → 1.0 (close)
  swayDuration: number;
  swayDelay: number;
}

const COUNT = 26;

const STALKS: Stalk[] = (() => {
  const r = seededRand(0xf00dcafe);
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    x:            r() * 100,
    y:            r() * 125 - 10,
    scale:        0.5 + r() * 1.2,
    opacity:      0.055 + r() * 0.085,
    rotation:     -28 + r() * 56,
    depth:        0.18 + r() * 0.82,
    swayDuration: 3.2 + r() * 3.0,
    swayDelay:    r() * 4.0,
  }));
})();

// ─── Main component ────────────────────────────────────────────────────────────

export default function WheatParallaxField() {
  const stalkRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurr   = useRef({ x: 0, y: 0 });
  const rafRef      = useRef<number>(0);

  // How far each stalk can move — generous values for clearly visible response
  const MAX_X = 55;  // px
  const MAX_Y = 32;  // px
  const LERP  = 0.072; // snappiness — 0.072 ≈ 0.4 s lag at 60 fps

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Normalise cursor to -1 → +1 range
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    }

    function tick() {
      // Lerp current → target for buttery lag
      mouseCurr.current.x += (mouseTarget.current.x - mouseCurr.current.x) * LERP;
      mouseCurr.current.y += (mouseTarget.current.y - mouseCurr.current.y) * LERP;

      const cx = mouseCurr.current.x;
      const cy = mouseCurr.current.y;

      stalkRefs.current.forEach((el, i) => {
        if (!el) return;
        const stalk = STALKS[i];
        // Closer stalks (higher depth) move MORE — true parallax feel
        const dx = -cx * MAX_X * stalk.depth;
        const dy = -cy * MAX_Y * stalk.depth;
        el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes wheatFieldSway {
          0%   { transform: rotate(0deg) skewX(0deg);   }
          100% { transform: rotate(4deg) skewX(0.8deg); }
        }
      `}</style>

      {/* Fixed canvas — z:0, no pointer events, bleeds behind all UI */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {STALKS.map((stalk, i) => (
          <div
            key={stalk.id}
            ref={(el) => { stalkRefs.current[i] = el; }}
            style={{
              position: "absolute",
              left: `${stalk.x}%`,
              top:  `${stalk.y}%`,
              willChange: "transform",
              // Transition: none — RAF handles it
            }}
          >
            <WheatStalkSVG
              scale={stalk.scale}
              opacity={stalk.opacity}
              rotation={stalk.rotation}
              swayDuration={stalk.swayDuration}
              swayDelay={stalk.swayDelay}
            />
          </div>
        ))}
      </div>
    </>
  );
}
