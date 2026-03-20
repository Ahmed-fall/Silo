"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api";
import SiloCard, { type Silo } from "@/components/SiloCard";
import {
  RefreshCw,
  ServerCrash,
  Wheat,
  LayoutGrid,
} from "lucide-react";

// ─── Mock data (used when the backend is unavailable) ────────────────────────

const MOCK_SILOS: Silo[] = [
  { id: "s-001", name: "Alpha Depot",     location: "Cairo Governorate, EG",    risk_level: "none"   },
  { id: "s-002", name: "Beta Reserve",    location: "Giza Plateau, EG",         risk_level: "low"    },
  { id: "s-003", name: "Gamma Storage",   location: "Alexandria Coast, EG",     risk_level: "medium" },
  { id: "s-004", name: "Delta Vault",     location: "Luxor Upper Egypt",        risk_level: "high"   },
  { id: "s-005", name: "Epsilon Hub",     location: "Port Said, EG",            risk_level: "low"    },
  { id: "s-006", name: "Zeta Station",    location: "Aswan, EG",                risk_level: "none"   },
  { id: "s-007", name: "Eta Compound",    location: "Mansoura, EG",             risk_level: "medium" },
  { id: "s-008", name: "Theta Terminal",  location: "Ismailia, EG",             risk_level: "high"   },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-[2px] bg-slate-800/60 animate-pulse h-[188px]">
      <div className="h-full rounded-[14px] bg-slate-900 p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="size-10 rounded-xl bg-slate-800" />
          <div className="h-6 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 rounded-md bg-slate-800" />
          <div className="h-3 w-1/2 rounded-md bg-slate-800" />
        </div>
        <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-slate-800" />
          <div className="h-3 w-3 rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

// ─── Container animation ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 26 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SilosDashboard() {
  const [silos, setSilos] = useState<Silo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  async function fetchSilos() {
    setLoading(true);
    setError(null);
    setUsingMock(false);

    try {
      const { data } = await axios.get<Silo[]>(`${API_BASE}/silos`, {
        timeout: 6_000,
      });
      setSilos(data);
    } catch {
      // Backend not available — silently fall back to mock data
      setSilos(MOCK_SILOS);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSilos();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const total   = silos.length;
  const atRisk  = silos.filter((s) => s.risk_level === "high" || s.risk_level === "medium").length;
  const nominal = silos.filter((s) => s.risk_level === "none" || s.risk_level === "low").length;

  return (
    <div className="min-h-full flex flex-col gap-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid size={16} className="text-slate-500" />
            <span className="text-slate-500 text-xs tracking-widest uppercase">
              Command Centre
            </span>
          </div>
          <h1 className="font-space-grotesk text-3xl font-bold text-white tracking-tight">
            Silos Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time status for all monitored grain facilities.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchSilos}
          disabled={loading}
          className="
            flex items-center gap-2 self-start sm:self-auto
            px-4 py-2 rounded-xl text-sm font-medium
            bg-slate-800 border border-slate-700 text-slate-300
            hover:bg-slate-700 hover:text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200 active:scale-95
          "
          aria-label="Refresh silo list"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Total Silos",   value: total,   color: "text-slate-200" },
            { label: "At Risk",        value: atRisk,  color: "text-rose-400"  },
            { label: "Nominal",        value: nominal, color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="
                flex flex-col items-center justify-center gap-0.5
                rounded-xl bg-slate-900/60 border border-slate-800
                backdrop-blur-sm py-3 px-4
              "
            >
              <span className={`font-space-grotesk text-2xl font-bold ${color}`}>
                {value}
              </span>
              <span className="text-slate-500 text-xs tracking-wide">{label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Mock data notice ─────────────────────────────────────────────── */}
      {usingMock && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="
            flex items-center gap-2.5 px-4 py-2.5 rounded-xl
            bg-amber-950/40 border border-amber-800/50
            text-amber-300 text-sm
          "
        >
          <Wheat size={15} className="shrink-0" />
          Backend unavailable — showing demo data. Live data will load once the server is reachable.
        </motion.div>
      )}

      {/* ── Loading skeleton grid ─────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Hard error state ─────────────────────────────────────────────── */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="
            flex flex-col items-center justify-center gap-4
            rounded-2xl border border-red-900/50 bg-red-950/30
            py-20 text-center
          "
        >
          <ServerCrash size={40} className="text-red-500" />
          <div>
            <p className="text-red-300 font-semibold text-lg">Failed to load silos</p>
            <p className="text-slate-500 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchSilos}
            className="
              mt-2 flex items-center gap-2 px-5 py-2 rounded-xl
              bg-red-900/40 border border-red-800 text-red-300 text-sm
              hover:bg-red-800/40 transition-all
            "
          >
            <RefreshCw size={14} /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Silo grid ────────────────────────────────────────────────────── */}
      {!loading && !error && silos.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {silos.map((silo) => (
            <motion.div key={silo.id} variants={itemVariants} className="h-full">
              <SiloCard silo={silo} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !error && silos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="
            flex flex-col items-center justify-center gap-3
            rounded-2xl border border-slate-800 py-24 text-center
          "
        >
          <Wheat size={40} className="text-slate-700" />
          <p className="text-slate-500">No silos registered yet.</p>
        </motion.div>
      )}
    </div>
  );
}
