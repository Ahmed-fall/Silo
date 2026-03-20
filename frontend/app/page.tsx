"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api";
import SiloCard, { type Silo } from "@/components/SiloCard";
import { RefreshCw, ServerCrash, Wheat, LayoutGrid } from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SILOS: Silo[] = [
  { id: "s-001", name: "Alpha Depot",     location: "Cairo Governorate, EG",  risk_level: "none",   crop_type: "wheat"   },
  { id: "s-002", name: "Beta Reserve",    location: "Giza Plateau, EG",       risk_level: "low",    crop_type: "rice"    },
  { id: "s-003", name: "Gamma Storage",   location: "Alexandria Coast, EG",   risk_level: "medium", crop_type: "corn"    },
  { id: "s-004", name: "Delta Vault",     location: "Luxor Upper Egypt",      risk_level: "high",   crop_type: "barley"  },
  { id: "s-005", name: "Epsilon Hub",     location: "Port Said, EG",          risk_level: "low",    crop_type: "sorghum" },
  { id: "s-006", name: "Zeta Station",    location: "Aswan, EG",              risk_level: "none",   crop_type: "soybean" },
  { id: "s-007", name: "Eta Compound",    location: "Mansoura, EG",           risk_level: "medium", crop_type: "wheat"   },
  { id: "s-008", name: "Theta Terminal",  location: "Ismailia, EG",           risk_level: "high",   crop_type: "corn"    },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-[22px] p-[1.5px] bg-slate-800/50 animate-pulse h-[210px]">
      <div className="h-full rounded-[21px] bg-slate-900/80 p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="size-11 rounded-2xl bg-slate-800" />
          <div className="h-6 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 rounded-lg bg-slate-800" />
          <div className="h-3 w-1/2 rounded-lg bg-slate-800" />
        </div>
        <div className="h-5 w-16 rounded-lg bg-slate-800" />
        <div className="mt-auto pt-3 border-t border-slate-800 flex justify-between">
          <div className="h-2.5 w-12 rounded bg-slate-800" />
          <div className="h-2.5 w-2.5 rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

// ─── Animation variants ────────────────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 28, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SilosDashboard() {
  const [silos,    setSilos]    = useState<Silo[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [usingMock,setUsingMock]= useState(false);

  async function fetchSilos() {
    setLoading(true); setError(null); setUsingMock(false);
    try {
      const { data } = await axios.get<Silo[]>(`${API_BASE}/silos`, { timeout: 6_000 });
      setSilos(data);
    } catch {
      setSilos(MOCK_SILOS); setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSilos(); }, []);

  const total   = silos.length;
  const atRisk  = silos.filter((s) => s.risk_level === "high" || s.risk_level === "medium").length;
  const nominal = silos.filter((s) => s.risk_level === "none"  || s.risk_level === "low").length;

  return (
    <div className="min-h-full flex flex-col gap-8">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={13} className="text-slate-600" />
            <span className="font-plus-jakarta text-slate-600 text-[10px] tracking-[0.2em] uppercase">
              Command Centre
            </span>
          </div>
          <h1 className="font-outfit font-extrabold text-[2rem] text-white tracking-tight leading-none">
            Silos Dashboard
          </h1>
          <p className="font-plus-jakarta text-slate-500 text-sm mt-2">
            Real-time status across all monitored grain facilities.
          </p>
        </div>

        <button
          onClick={fetchSilos}
          disabled={loading}
          className="
            self-start sm:self-auto
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
            bg-white/[0.04] border border-white/[0.07] text-slate-400
            hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]
            disabled:opacity-40 disabled:cursor-not-allowed
            shadow-float transition-all duration-200 active:scale-95
          "
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Total Silos", value: total,   accent: "text-slate-100" },
            { label: "At Risk",     value: atRisk,  accent: "text-rose-400"  },
            { label: "Nominal",     value: nominal, accent: "text-emerald-400" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="
              flex flex-col items-center justify-center gap-1 py-4 px-3
              rounded-2xl bg-white/[0.025]
              border border-white/[0.05]
              shadow-float
            ">
              <span className={`font-outfit font-bold text-2xl ${accent}`}>{value}</span>
              <span className="font-plus-jakarta text-slate-600 text-[10px] tracking-widest uppercase">{label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Mock notice ───────────────────────────────────────────────── */}
      {usingMock && !loading && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-800/30 text-amber-400 text-xs"
        >
          <Wheat size={13} className="shrink-0" />
          Backend unavailable — showing demo data.
        </motion.div>
      )}

      {/* ── Skeleton grid ─────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────── */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 py-20 text-center"
        >
          <ServerCrash size={36} className="text-rose-600" />
          <div>
            <p className="font-outfit font-bold text-rose-300 text-lg">Failed to load</p>
            <p className="font-plus-jakarta text-slate-500 text-sm mt-1">{error}</p>
          </div>
          <button onClick={fetchSilos} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-900/30 border border-rose-800/40 text-rose-300 text-sm hover:bg-rose-900/50 transition-all">
            <RefreshCw size={13} /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Silo grid ─────────────────────────────────────────────────── */}
      {!loading && !error && silos.length > 0 && (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {silos.map((silo) => (
            <motion.div key={silo.id} variants={cardVariants} className="h-full">
              <SiloCard silo={silo} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && !error && silos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-24 rounded-2xl border border-white/[0.04]"
        >
          <Wheat size={36} className="text-slate-800" />
          <p className="font-plus-jakarta text-slate-600 text-sm">No silos registered yet.</p>
        </motion.div>
      )}
    </div>
  );
}
