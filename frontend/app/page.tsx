"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion, useAnimationControls } from "framer-motion";
import { API_BASE } from "@/lib/api";
import SiloCard, { type Silo } from "@/components/SiloCard";
import { useSettings } from "@/context/SettingsContext";
import { RefreshCw, ServerCrash, Wheat } from "lucide-react";
import ChatBot from '@/components/ChatBot';
import SplashScreen from "@/components/SplashScreen";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SILOS: Silo[] = [
  { id: "s-001", name: "Alpha Depot", location: "Cairo Governorate, EG", risk_level: "none", crop_type: "wheat", temperature: 22.4, humidity: 51.2 },
  { id: "s-002", name: "Beta Reserve", location: "Giza Plateau, EG", risk_level: "low", crop_type: "rice", temperature: 24.1, humidity: 63.8 },
  { id: "s-003", name: "Gamma Storage", location: "Alexandria Coast, EG", risk_level: "medium", crop_type: "corn", temperature: 29.7, humidity: 72.5 },
  { id: "s-004", name: "Delta Vault", location: "Luxor Upper Egypt", risk_level: "high", crop_type: "barley", temperature: 34.2, humidity: 81.3 },
  { id: "s-005", name: "Epsilon Hub", location: "Port Said, EG", risk_level: "low", crop_type: "sorghum", temperature: 23.6, humidity: 58.9 },
  { id: "s-006", name: "Zeta Station", location: "Aswan, EG", risk_level: "none", crop_type: "soybean", temperature: 21.0, humidity: 44.7 },
  { id: "s-007", name: "Eta Compound", location: "Mansoura, EG", risk_level: "medium", crop_type: "wheat", temperature: 28.3, humidity: 69.1 },
  { id: "s-008", name: "Theta Terminal", location: "Ismailia, EG", risk_level: "high", crop_type: "corn", temperature: 33.8, humidity: 79.4 },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="animate-pulse h-48 rounded-[6px]"
      style={{ border: "1px solid var(--border-muted)", backgroundColor: "rgba(250,247,240,0.6)" }}
    >
      <div className="p-5 flex flex-col gap-3 h-full">
        <div className="flex justify-between items-start">
          <div className="size-8 rounded-[4px]" style={{ backgroundColor: "var(--border-muted)" }} />
          <div className="h-5 w-16 rounded-[3px]" style={{ backgroundColor: "var(--border-muted)" }} />
        </div>
        <div className="mt-1 space-y-2">
          <div className="h-4 w-3/4 rounded-[3px]" style={{ backgroundColor: "var(--border-muted)" }} />
          <div className="h-3 w-1/2 rounded-[3px]" style={{ backgroundColor: "rgba(62,53,41,0.05)" }} />
        </div>
        <div className="mt-auto h-px" style={{ backgroundColor: "var(--border-muted)" }} />
        <div className="h-3 w-1/3 rounded-[3px]" style={{ backgroundColor: "rgba(62,53,41,0.05)" }} />
      </div>
    </div>
  );
}

// ─── Typewriter counter hook ─────────────────────────────────────────────────

function useCountUp(target: number, duration = 1100, delay = 0): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start: ReturnType<typeof setTimeout>;
    start = setTimeout(() => {
      const steps = Math.min(target, 22);
      const stepMs = duration / steps;
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + Math.ceil(target / steps), target);
        setCount(current);
        if (current >= target) clearInterval(interval);
      }, stepMs);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(start);
  }, [target, duration, delay]);
  return count;
}

function CountStat({
  value, label, color, delay = 0,
}: { value: number; label: string; color: string; delay?: number }) {
  const displayed = useCountUp(value, 1100, delay);
  return (
    <div>
      <span
        className="block leading-none tabular-nums"
        style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "22px",
          fontWeight: 600,
          color,
          minWidth: "2ch",
        }}
      >
        {displayed}
      </span>
      <span
        className="block mt-1.5"
        style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "8px",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Grid animation variants ──────────────────────────────────────────────────

const gridVars = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const cardVars = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SilosDashboard() {
  const { compactMode } = useSettings();
  const router = useRouter();

  const [showSplash, setShowSplash] = useState(true);
  const [silos, setSilos] = useState<Silo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const spinControls = useAnimationControls();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchSilos = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null); setUsingMock(false);
    try {
      const { data } = await axios.get<Silo[]>(`${API_BASE}/silos`, { timeout: 10_000, signal });
      setSilos(data.map((s: Silo) => ({
        ...s,
        risk_level: (s.risk_level ?? "none") as Silo["risk_level"],
        crop_type: (s.crop_type ?? "wheat") as Silo["crop_type"],
        temperature: s.temperature ?? undefined,
        humidity: s.humidity ?? undefined,
      })));
    } catch (err) {
      if (axios.isCancel(err) || err instanceof Error && err.name === "CanceledError") return;
      setSilos(MOCK_SILOS);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSilos(controller.signal);
    const onFocus = () => fetchSilos(controller.signal);
    window.addEventListener("focus", onFocus);
    return () => { controller.abort(); window.removeEventListener("focus", onFocus); };
  }, [fetchSilos]);

  async function handleRefresh() {
    spinControls.start({ rotate: [0, 360], transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } });
    await fetchSilos();
    spinControls.set({ rotate: 0 });
  }

  const total   = silos.length;
  const atRisk  = silos.filter((s) => s.risk_level === "high" || s.risk_level === "medium").length;
  const nominal = silos.filter((s) => s.risk_level === "none" || s.risk_level === "low").length;

  const gridGap  = compactMode ? "gap-3" : "gap-4";
  const gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  // Formatted timestamp
  const now = new Date();
  const timestamp = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <div className="min-h-full flex flex-col gap-8 max-w-[1600px]">

        {/* ══ Registry Header ══ */}
        <div className="flex flex-col gap-5 pt-2">
          {/* Top line: eyebrow + refresh */}
          <div className="flex items-start justify-between">
            <div>
              <p
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "9px",
                  letterSpacing: "0.26em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                NATIONAL GRAIN INTELLIGENCE SYSTEM
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-cinzel)",
                  fontSize: "26px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                  textTransform: "uppercase",
                }}
              >
                Command Registry
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-plus-jakarta)",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "8px",
                  letterSpacing: "0.03em",
                }}
              >
                Real-time preservation status across all registered facilities
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              {/* Timestamp stamp */}
              <span
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "8px",
                  letterSpacing: "0.18em",
                  color: "var(--text-muted)",
                }}
              >
                {timestamp}
              </span>

              {/* Refresh */}
              <motion.button
                onClick={handleRefresh}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 340, damping: 24 }}
                className="flex items-center gap-2 px-3 py-2 glass-archival"
                style={{
                  color: "var(--text-muted)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-outfit)",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                }}
                aria-label="Refresh registry"
              >
                <motion.span animate={spinControls} className="inline-flex">
                  <RefreshCw size={12} />
                </motion.span>
                Refresh
              </motion.button>
            </div>
          </div>

          {/* ── Horizontal ruled line ── */}
          <div style={{ height: "1px", backgroundColor: "var(--border-muted)" }} />

          {/* ── Registry stats — three ink-stamped field entries ── */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-0"
            >
              {[
                { label: "Total Registered", value: total,   color: "var(--text-primary)", delay: 0 },
                { label: "Anomalies Detected", value: atRisk,  color: "var(--alert)",        delay: 180 },
                { label: "Nominal Status",     value: nominal, color: "var(--accent)",       delay: 360 },
              ].map(({ label, value, color, delay }, idx) => (
                <div key={label} className="flex items-center">
                  {idx > 0 && (
                    <div style={{ width: "1px", height: "36px", backgroundColor: "var(--border-muted)", margin: "0 28px" }} />
                  )}
                  <CountStat value={value} label={label} color={color} delay={delay} />
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Demo data notice ── */}
        {usingMock && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs"
            style={{
              backgroundColor: "rgba(193,122,43,0.06)",
              border: "1px solid rgba(193,122,43,0.22)",
              color: "var(--warning)",
              borderRadius: "4px",
              fontFamily: "var(--font-plus-jakarta)",
            }}
          >
            <Wheat size={12} className="shrink-0" />
            Backend unavailable — displaying demonstration data
          </motion.div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className={`grid ${gridCols} ${gridGap}`}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error state ── */}
        {error && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-20 text-center"
            style={{
              border: "1px solid rgba(201,48,71,0.2)",
              backgroundColor: "rgba(201,48,71,0.03)",
              borderRadius: "6px",
            }}
          >
            <ServerCrash size={32} style={{ color: "var(--alert)" }} />
            <div>
              <p
                style={{ fontFamily: "var(--font-cinzel)", fontSize: "15px", color: "var(--alert)", letterSpacing: "0.06em" }}
              >
                Registry Unreachable
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-plus-jakarta)" }}>{error}</p>
            </div>
            <button onClick={handleRefresh}
              className="flex items-center gap-2 px-5 py-2 text-xs transition-all"
              style={{
                backgroundColor: "rgba(201,48,71,0.06)",
                border: "1px solid rgba(201,48,71,0.22)",
                color: "var(--alert)",
                borderRadius: "4px",
                fontFamily: "var(--font-outfit)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              <RefreshCw size={11} /> Retry
            </button>
          </motion.div>
        )}

        {/* ── Facilities grid ── */}
        {!loading && !error && silos.length > 0 && (
          <motion.div
            variants={gridVars} initial="hidden" animate="visible"
            className={`grid ${gridCols} ${gridGap}`}
          >
            {silos.map((silo) => (
              <motion.div key={silo.id} variants={cardVars} className="h-full">
                <SiloCard silo={silo} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && silos.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-24"
            style={{ border: "1px solid var(--border-muted)", borderRadius: "6px" }}
          >
            <Wheat size={28} style={{ color: "var(--text-muted)" }} />
            <p
              style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase" }}
            >
              No facilities registered
            </p>
          </motion.div>
        )}

        {/* ── Floating AI Assistant ── */}
        <ChatBot />
      </div>
    </>
  );
}
