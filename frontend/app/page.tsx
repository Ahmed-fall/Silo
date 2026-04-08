"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion, useAnimationControls } from "framer-motion";
import { API_BASE } from "@/lib/api";
import SiloCard, { type Silo } from "@/components/SiloCard";
import { useSettings } from "@/context/SettingsContext";
import { RefreshCw, ServerCrash, Wheat, LayoutGrid } from "lucide-react";
import ChatBot from '@/components/ChatBot';

// ─── Mock data — includes temperature + humidity for sensor widgets ───────────

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
    <div className="rounded-[22px] p-[1.5px] bg-slate-800/50 animate-pulse h-57.5">
      <div className="h-full rounded-[21px] bg-slate-900/80 p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="size-11 rounded-2xl bg-slate-800" />
          <div className="h-7 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 rounded-lg bg-slate-800" />
          <div className="h-3 w-1/2 rounded-lg bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-xl bg-slate-800" />
          <div className="h-10 rounded-xl bg-slate-800" />
        </div>
        <div className="h-5 w-16 rounded-lg bg-slate-800 mt-auto" />
      </div>
    </div>
  );
}

// ─── Grid animation variants ──────────────────────────────────────────────────

const gridVars  = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVars = {
  hidden:  { opacity: 0, y: 24, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SilosDashboard() {
  const { compactMode } = useSettings();
  const router = useRouter();

  const [silos, setSilos] = useState<Silo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  // Ref keeps the latest fetchSilos for the auto-refresh interval (if ever added)
  const spinControls = useAnimationControls();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchSilos = useCallback(async (signal?: AbortSignal) => {
    // ── Strict state reset at fetch start ──────────────────────────────────
    setLoading(true); setError(null); setUsingMock(false);
    try {
  const { data } = await axios.get<Silo[]>(`${API_BASE}/silos`, {
    timeout: 10_000,  // More realistic than 2s
    signal,           // Keep AbortSignal for cleanup
  });
  
  // Normalize data with safe defaults
  setSilos(data.map((s: Silo) => ({
    ...s,
    risk_level: (s.risk_level ?? "none") as Silo["risk_level"],
    crop_type: (s.crop_type ?? "wheat") as Silo["crop_type"],
    temperature: s.temperature ?? undefined,
    humidity: s.humidity ?? undefined,
  })));
  
} catch (err) {
  // Ignore cancelled/aborted requests
  if (axios.isCancel(err) || err instanceof Error && err.name === "CanceledError") return;
  
  // Fallback to mock on real errors
  setSilos(MOCK_SILOS);
  setUsingMock(true);
}
        finally {
      // Guaranteed unblock — ONLY runs when the request was NOT aborted.
      // (The early `return` in the catch above prevents this from firing
      //  on cancellation, so the new mount's own finally handles cleanup.)
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  const controller = new AbortController();
  
  // Initial fetch
  fetchSilos(controller.signal);
  
  // Auto-refresh when tab regains focus (UX improvement)
  const onFocus = () => fetchSilos(controller.signal);
  window.addEventListener("focus", onFocus);
  
  // Cleanup
  return () => {
    controller.abort();
    window.removeEventListener("focus", onFocus);
  };
}, [fetchSilos]); // 

  // ── Premium 360° refresh handler ──
  async function handleRefresh() {
    // Spin the icon concurrently with the fetch
    spinControls.start({
      rotate: [0, 360],
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
    });
    await fetchSilos();
    spinControls.set({ rotate: 0 });
  }

  const total = silos.length;
  const atRisk = silos.filter((s) => s.risk_level === "high" || s.risk_level === "medium").length;
  const nominal = silos.filter((s) => s.risk_level === "none" || s.risk_level === "low").length;

  // ── Dynamic grid classes from UIContext ──
  const gridGap = compactMode ? "gap-3" : "gap-5";
  const gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="min-h-full flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={13} className="text-slate-600" />
            <span className="font-plus-jakarta text-slate-600 text-[10px] tracking-[0.2em] uppercase">Command Centre</span>
          </div>
          <h1 className="font-outfit font-extrabold text-[2rem] text-white tracking-tight leading-none">
            Silos Dashboard
          </h1>
          <p className="font-plus-jakarta text-slate-500 text-sm mt-2">
            Real-time status across all monitored grain facilities.
          </p>
        </div>

        {/* ── Premium Glassmorphic Refresh Button ── */}
        <motion.button
          onClick={handleRefresh}
          disabled={false}
          whileHover={{ scale: 1.08, boxShadow: "0 0 24px rgba(52,211,153,0.25)" }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="
            self-start sm:self-auto
            flex items-center gap-2.5 px-4 py-2.5 rounded-xl
            bg-white/5 border border-white/9
            text-slate-300 font-outfit font-medium text-sm
            backdrop-blur-md
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors hover:text-white hover:border-white/15
          "
          aria-label="Refresh silo data"
        >
          <motion.span animate={spinControls} className="inline-flex">
            <RefreshCw size={14} />
          </motion.span>
          Refresh
        </motion.button>
      </div>

      {/* ── Stats row ── */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Total Silos", value: total, accent: "text-slate-100" },
            { label: "At Risk", value: atRisk, accent: "text-rose-400" },
            { label: "Nominal", value: nominal, accent: "text-emerald-400" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-2xl bg-white/2.5 border border-white/5">
              <span className={`font-outfit font-bold text-2xl ${accent}`}>{value}</span>
              <span className="font-plus-jakarta text-slate-600 text-[10px] tracking-widest uppercase">{label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Compact mode indicator ── */}
      {compactMode && !loading && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-emerald-400 text-xs w-fit"
        >
          <LayoutGrid size={11} className="shrink-0" />
          Compact grid active
        </motion.div>
      )}

      {/* ── Mock notice ── */}
      {usingMock && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-800/30 text-amber-400 text-xs"
        >
          <Wheat size={13} className="shrink-0" />
          Backend unavailable — showing demo data.
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
          className="flex flex-col items-center gap-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 py-20 text-center"
        >
          <ServerCrash size={36} className="text-rose-600" />
          <div>
            <p className="font-outfit font-bold text-rose-300 text-lg">Failed to load silos</p>
            <p className="font-plus-jakarta text-slate-500 text-sm mt-1">{error}</p>
          </div>
          <button onClick={handleRefresh} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-900/30 border border-rose-800/40 text-rose-300 text-sm hover:bg-rose-900/50 transition-all">
            <RefreshCw size={13} /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Silo grid — gap controlled by compactGrid ── */}
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
          className="flex flex-col items-center gap-3 py-24 rounded-2xl border border-white/4"
        >
          <Wheat size={36} className="text-slate-800" />
          <p className="font-plus-jakarta text-slate-600 text-sm">No silos registered yet.</p>
        </motion.div>
      )}

      {/* ── Floating AI Assistant ── */}
      <ChatBot />
    </div>
  );
}
