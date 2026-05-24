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
    <div className="rounded-[22px] p-[1.5px] animate-pulse h-57.5" style={{ backgroundColor: "var(--border-glass)" }}>
      <div className="h-full rounded-[21px] p-5 flex flex-col gap-4 glass-tactical" style={{ backgroundColor: "var(--bg-surface)" }}>
        <div className="flex items-start justify-between">
          <div className="size-11 rounded-2xl" style={{ backgroundColor: "var(--accent-subtle)" }} />
          <div className="h-7 w-24 rounded-full" style={{ backgroundColor: "var(--accent-subtle)" }} />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 rounded-lg" style={{ backgroundColor: "var(--accent-subtle)" }} />
          <div className="h-3 w-1/2 rounded-lg" style={{ backgroundColor: "var(--accent-subtle)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-xl" style={{ backgroundColor: "var(--accent-subtle)" }} />
          <div className="h-10 rounded-xl" style={{ backgroundColor: "var(--accent-subtle)" }} />
        </div>
        <div className="h-5 w-16 rounded-lg mt-auto" style={{ backgroundColor: "var(--accent-subtle)" }} />
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

  const spinControls = useAnimationControls();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchSilos = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null); setUsingMock(false);
    try {
      const { data } = await axios.get<Silo[]>(`${API_BASE}/silos`, {
        timeout: 10_000,
        signal,
      });
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
    }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSilos(controller.signal);
    const onFocus = () => fetchSilos(controller.signal);
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchSilos]);

  async function handleRefresh() {
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

  const gridGap = compactMode ? "gap-3" : "gap-5";
  const gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="min-h-full flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={13} style={{ color: "var(--text-muted)" }} />
            <span className="font-plus-jakarta text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--text-muted)" }}>Command Centre</span>
          </div>
          <h1 className="font-outfit font-extrabold text-[2rem] tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>
            Silos Dashboard
          </h1>
          <p className="font-plus-jakarta text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Real-time status across all monitored grain facilities.
          </p>
        </div>

        {/* ── Refresh Button ── */}
        <motion.button
          onClick={handleRefresh}
          whileHover={{ scale: 1.08, boxShadow: "0 0 24px var(--accent-glow)" }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="self-start sm:self-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass-tactical font-outfit font-medium text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
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
            { label: "Total Silos", value: total, color: "var(--text-primary)" },
            { label: "At Risk", value: atRisk, color: "var(--alert)" },
            { label: "Nominal", value: nominal, color: "var(--accent)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-2xl glass-tactical">
              <span className="font-outfit font-bold text-2xl" style={{ color }}>{value}</span>
              <span className="font-plus-jakarta text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Compact mode indicator ── */}
      {compactMode && !loading && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs w-fit"
          style={{
            backgroundColor: "var(--accent-subtle)",
            border: "1px solid var(--border-glass)",
            color: "var(--accent)",
          }}
        >
          <LayoutGrid size={11} className="shrink-0" />
          Compact grid active
        </motion.div>
      )}

      {/* ── Mock notice ── */}
      {usingMock && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs"
          style={{
            backgroundColor: "rgba(205, 127, 50, 0.08)",
            border: "1px solid rgba(205, 127, 50, 0.25)",
            color: "var(--warning)",
          }}
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
          className="flex flex-col items-center gap-4 rounded-2xl py-20 text-center"
          style={{
            border: "1px solid rgba(225, 29, 72, 0.2)",
            backgroundColor: "rgba(225, 29, 72, 0.04)",
          }}
        >
          <ServerCrash size={36} style={{ color: "var(--alert)" }} />
          <div>
            <p className="font-outfit font-bold text-lg" style={{ color: "var(--alert)" }}>Failed to load silos</p>
            <p className="font-plus-jakarta text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all"
            style={{
              backgroundColor: "rgba(225, 29, 72, 0.08)",
              border: "1px solid rgba(225, 29, 72, 0.25)",
              color: "var(--alert)",
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Silo grid ── */}
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
          className="flex flex-col items-center gap-3 py-24 rounded-2xl"
          style={{ border: "1px solid var(--border-muted)" }}
        >
          <Wheat size={36} style={{ color: "var(--text-muted)" }} />
          <p className="font-plus-jakarta text-sm" style={{ color: "var(--text-secondary)" }}>No silos registered yet.</p>
        </motion.div>
      )}

      {/* ── Floating AI Assistant ── */}
      <ChatBot />
    </div>
  );
}
