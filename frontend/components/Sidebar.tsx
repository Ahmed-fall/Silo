"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import {
  LayoutDashboard,
  Wheat,
  Map,
  BarChart2,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem =
  | { href: string; label: string; icon: React.ReactNode; live: true }
  | { href?: never; label: string; icon: React.ReactNode; live: false; coming: string };

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard size={16} />,
    live: true,
  },
  {
    href: "/silos",
    label: "Silos",
    icon: <Wheat size={16} />,
    live: true,
  },
  {
    label: "Live Map",
    icon: <Map size={16} />,
    live: false,
    coming: "Live Map",
  },
  {
    label: "Reports",
    icon: <BarChart2 size={16} />,
    live: false,
    coming: "Analytics & Reports",
  },
  {
    label: "Settings",
    icon: <Settings size={16} />,
    live: false,
    coming: "Settings Panel",
  },
];

// ─── Coming soon toast ────────────────────────────────────────────────────────

interface Toast {
  id: number;
  label: string;
}

function ComingSoonToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="
        flex items-start gap-3
        px-4 py-3 rounded-2xl
        bg-slate-900/90 backdrop-blur-xl
        border border-white/8
        shadow-[0_8px_40px_rgba(0,0,0,0.6)]
        text-sm w-64
      "
    >
      <Sparkles size={15} className="text-indigo-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-outfit font-semibold text-slate-200 text-sm leading-snug">
          {toast.label}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          Coming soon — stay tuned!
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-600 hover:text-slate-300 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastId = 0;

  const addToast = useCallback((label: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, label }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      {/* ── Sidebar panel ── */}
      <aside className="
        hidden lg:flex flex-col shrink-0 w-60
        border-r border-white/[0.04]
        bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950
        relative z-10
      ">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-7 pb-6">
          <div className="
            flex items-center justify-center size-9 rounded-xl shrink-0
            bg-gradient-to-br from-emerald-400 to-teal-600
            shadow-[0_0_20px_rgba(52,211,153,0.4)]
          ">
            <Wheat size={17} className="text-white" />
          </div>
          <div>
            <p className="font-outfit font-bold text-[17px] text-white tracking-tight leading-none">
              Silo
            </p>
            <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mt-0.5">
              Grain Intelligence
            </p>
          </div>
        </div>

        {/* Section label */}
        <p className="px-5 mb-2 text-[9px] font-semibold tracking-[0.18em] text-slate-600 uppercase">
          Navigation
        </p>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.live && pathname === item.href;

            if (item.live) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-sm font-medium transition-all duration-150
                    ${isActive
                      ? "bg-white/[0.07] text-white"
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-emerald-400"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className={isActive ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-400 transition-colors"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            }

            // "Coming soon" nav button
            return (
              <button
                key={item.label}
                onClick={() => addToast(item.coming)}
                className="
                  group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                  text-sm font-medium text-slate-600
                  hover:text-slate-400 hover:bg-white/[0.03]
                  transition-all duration-150
                "
              >
                <span className="text-slate-700 group-hover:text-slate-500 transition-colors">
                  {item.icon}
                </span>
                {item.label}
                <span className="ml-auto text-[9px] font-semibold tracking-widest uppercase text-slate-700">
                  Soon
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 mt-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 font-plus-jakarta">v0.1.0 — Beta</p>
            </div>
            <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          </div>
        </div>
      </aside>

      {/* ── Coming soon toast stack (bottom-left, above sidebar) ── */}
      <div className="fixed bottom-6 left-4 z-50 flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ComingSoonToast
              key={t.id}
              toast={t}
              onDismiss={() => dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
