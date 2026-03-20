"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BellOff, Sun, Moon, LayoutGrid } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAppSettings } from "@/context/AppSettingsContext";

// ─── Premium Animated Toggle Switch ──────────────────────────────────────────

interface ToggleProps {
  on: boolean;
  onToggle: () => void;
  color?: "emerald" | "rose" | "amber" | "indigo" | "sky";
}

function Toggle({ on, onToggle, color = "emerald" }: ToggleProps) {
  const trackDark: Record<typeof color, string> = {
    emerald: "dark:bg-emerald-500",
    rose:    "dark:bg-rose-500",
    amber:   "dark:bg-amber-500",
    indigo:  "dark:bg-indigo-500",
    sky:     "dark:bg-sky-500",
  };
  const trackLight: Record<typeof color, string> = {
    emerald: "bg-emerald-500",
    rose:    "bg-rose-500",
    amber:   "bg-amber-500",
    indigo:  "bg-indigo-500",
    sky:     "bg-sky-500",
  };
  const glow: Record<typeof color, string> = {
    emerald: "0 0 12px rgba(52,211,153,0.7)",
    rose:    "0 0 12px rgba(244,63,94,0.7)",
    amber:   "0 0 12px rgba(251,191,36,0.7)",
    indigo:  "0 0 12px rgba(99,102,241,0.7)",
    sky:     "0 0 12px rgba(56,189,248,0.7)",
  };

  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`
        relative flex-shrink-0 w-12 h-[26px] rounded-full
        border border-slate-300 dark:border-white/[0.08] transition-colors duration-300 cursor-pointer
        ${on ? `${trackLight[color]} ${trackDark[color]} border-transparent dark:border-transparent` : "bg-slate-300 dark:bg-slate-700/80"}
      `}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="absolute top-[3px] size-[18px] rounded-full bg-white flex items-center justify-center"
        style={{
          left: on ? "calc(100% - 21px)" : "3px",
          boxShadow: on ? glow[color] : "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const { settings, toggleSetting } = useAppSettings();

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-slate-950/50 backdrop-blur-sm transition-colors"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 35 }}
            className="
              fixed top-0 left-0 h-full z-50 w-80 flex flex-col
              bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl
              border-r border-slate-200 dark:border-white/[0.06]
              shadow-[8px_0_60px_rgba(0,0,0,0.2)] dark:shadow-[8px_0_60px_rgba(0,0,0,0.7)]
              transition-colors duration-300
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-7 pb-5 border-b border-slate-200 dark:border-white/[0.05]">
              <div>
                <h2 className="font-outfit font-bold text-lg text-slate-800 dark:text-white tracking-tight">Settings</h2>
                <p className="font-plus-jakarta text-slate-500 text-xs mt-0.5">Control your workspace</p>
              </div>
              <button
                onClick={onClose}
                className="
                  flex items-center justify-center size-8 rounded-xl
                  bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.07]
                  text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white
                  dark:hover:bg-white/[0.09] transition-all active:scale-95
                "
                aria-label="Close settings"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Theme row ── */}
            <div className="px-3 pt-5 pb-3">
              <p className="px-2 pb-2 text-[9px] font-semibold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-600">
                Appearance
              </p>

              <motion.div
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer
                  bg-slate-100 dark:bg-white/[0.025] hover:bg-slate-200 dark:hover:bg-white/[0.04]
                  border border-slate-200 dark:border-white/[0.05] transition-colors
                "
                onClick={toggleTheme}
              >
                <div className="
                  flex items-center justify-center size-8 rounded-xl shrink-0
                  bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]
                ">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={isDark ? "moon" : "sun"}
                      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isDark
                        ? <Moon size={14} className="text-indigo-400" />
                        : <Sun  size={14} className="text-amber-500" />
                      }
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-outfit font-semibold text-[13px] text-slate-800 dark:text-slate-100">
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </p>
                  <p className="font-plus-jakarta text-slate-500 dark:text-slate-500 text-[11px] mt-0.5">
                    {isDark ? "System dark theme" : "System light theme"}
                  </p>
                </div>
                <Toggle on={isDark} onToggle={toggleTheme} color="indigo" />
              </motion.div>
            </div>

            {/* ── Meaningful Functional Settings ── */}
            <p className="px-5 pb-2 pt-2 text-[9px] font-semibold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-600">
              Dashboard Controls
            </p>

            <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5 scrollbar-thin">
              {/* Mute Alerts */}
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer
                  bg-slate-100 dark:bg-white/[0.025] hover:bg-slate-200 dark:hover:bg-white/[0.04]
                  border border-slate-200 dark:border-white/[0.05] transition-colors
                "
                onClick={() => toggleSetting("muteAlerts")}
              >
                <div className={`
                  flex items-center justify-center size-8 rounded-xl shrink-0
                  bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]
                  transition-colors ${settings.muteAlerts ? "text-rose-500" : "text-slate-600 dark:text-slate-400"}
                `}>
                  <BellOff size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-outfit font-semibold text-[13px] transition-colors ${settings.muteAlerts ? "text-slate-800 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    Mute Live Alerts
                  </p>
                  <p className="font-plus-jakarta text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                    Silences incoming WebSocket events.
                  </p>
                </div>
                <Toggle on={settings.muteAlerts} onToggle={() => toggleSetting("muteAlerts")} color="rose" />
              </motion.div>

              {/* Compact Grid */}
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer
                  bg-slate-100 dark:bg-white/[0.025] hover:bg-slate-200 dark:hover:bg-white/[0.04]
                  border border-slate-200 dark:border-white/[0.05] transition-colors
                "
                onClick={() => toggleSetting("compactGrid")}
              >
                <div className={`
                  flex items-center justify-center size-8 rounded-xl shrink-0
                  bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]
                  transition-colors ${settings.compactGrid ? "text-emerald-500" : "text-slate-600 dark:text-slate-400"}
                `}>
                  <LayoutGrid size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-outfit font-semibold text-[13px] transition-colors ${settings.compactGrid ? "text-slate-800 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    Compact Grid
                  </p>
                  <p className="font-plus-jakarta text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                    Reduce silo card padding to see more.
                  </p>
                </div>
                <Toggle on={settings.compactGrid} onToggle={() => toggleSetting("compactGrid")} color="emerald" />
              </motion.div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
