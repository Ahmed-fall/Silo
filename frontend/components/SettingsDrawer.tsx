"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Moon, Sun, Activity, Shield, Zap, LayoutGrid, ChevronRight } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

// ─── Animated Toggle Switch ───────────────────────────────────────────────────

type Accent = "emerald" | "rose" | "indigo" | "amber" | "sky";

function Toggle({ on, onToggle, color = "emerald" }: { on: boolean; onToggle: () => void; color?: Accent }) {
  const tracks: Record<Accent, string> = {
    emerald: "bg-emerald-500", rose: "bg-rose-500",
    indigo: "bg-indigo-500",  amber: "bg-amber-500", sky: "bg-sky-500",
  };
  const glows: Record<Accent, string> = {
    emerald: "0 0 12px rgba(52,211,153,0.75)",  rose: "0 0 12px rgba(244,63,94,0.75)",
    indigo:  "0 0 12px rgba(99,102,241,0.75)",  amber: "0 0 12px rgba(251,191,36,0.75)",
    sky:     "0 0 12px rgba(56,189,248,0.75)",
  };
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      className={`relative shrink-0 w-12 h-[26px] rounded-full border border-white/8 transition-colors duration-250 cursor-pointer ${on ? tracks[color] : "bg-slate-700/80"}`}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 38 }}
        className="absolute top-[3px] size-5 rounded-full bg-white"
        style={{ left: on ? "calc(100% - 23px)" : "3px", boxShadow: on ? glows[color] : "0 1px 3px rgba(0,0,0,0.4)" }}
      />
    </button>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────

function SettingRow({ icon, label, description, on, onToggle, color = "emerald" }: {
  icon: React.ReactNode; label: string; description: string;
  on: boolean; onToggle: () => void; color?: Accent;
}) {
  return (
    <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onToggle}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer bg-white/2.5 border border-white/5"
    >
      <div className={`flex items-center justify-center size-8 rounded-xl shrink-0 bg-white/4 border border-white/6 transition-colors ${on ? "text-slate-200" : "text-slate-600"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-outfit font-semibold text-sm transition-colors ${on ? "text-slate-100" : "text-slate-400"}`}>{label}</p>
        <p className="font-plus-jakarta text-slate-600 text-[11px] mt-0.5 line-clamp-1">{description}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} color={color} />
    </motion.div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, toggleTheme, compactMode, toggleCompactMode, alertsMuted, toggleAlertsMuted } = useSettings();
  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm" onClick={onClose}
          />
          <motion.aside key="drawer"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 35 }}
            className="fixed top-0 left-0 h-full z-50 w-80 flex flex-col bg-slate-950/80 backdrop-blur-2xl border-r border-white/6 shadow-[8px_0_60px_rgba(0,0,0,0.7)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-7 pb-5 border-b border-white/5">
              <div>
                <h2 className="font-outfit font-bold text-lg text-white">Settings</h2>
                <p className="font-plus-jakarta text-slate-500 text-xs mt-0.5">Dashboard preferences</p>
              </div>
              <button onClick={onClose}
                className="flex items-center justify-center size-8 rounded-xl bg-white/5 border border-white/7 text-slate-400 hover:text-white hover:bg-white/9 transition-all active:scale-95"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
              {/* Appearance */}
              <p className="px-2 pb-2 text-[9px] font-semibold tracking-[0.2em] uppercase text-slate-600">Appearance</p>

              {/* Dark / Light Mode — FUNCTIONAL via SettingsContext */}
              <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer bg-white/2.5 border border-white/5"
              >
                <div className="flex items-center justify-center size-8 rounded-xl shrink-0 bg-white/4 border border-white/6">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={isDark ? "moon" : "sun"}
                      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0,   opacity: 1, scale: 1 }}
                      exit={{    rotate:  90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.18 }}
                    >
                      {isDark ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-400" />}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="flex-1">
                  <p className="font-outfit font-semibold text-sm text-slate-100">{isDark ? "Dark Mode" : "Light Mode"}</p>
                  <p className="font-plus-jakarta text-slate-600 text-[11px] mt-0.5">{isDark ? "Click to switch to light" : "Click to switch to dark"}</p>
                </div>
                <Toggle on={isDark} onToggle={toggleTheme} color="indigo" />
              </motion.div>

              {/* System Controls */}
              <p className="px-2 pt-3 pb-2 text-[9px] font-semibold tracking-[0.2em] uppercase text-slate-600">System Controls</p>

              {/* Compact Grid — FUNCTIONAL */}
              <SettingRow
                icon={<LayoutGrid size={15} />}
                label="Compact Grid"
                description="Shrinks card gaps for a denser view."
                on={compactMode} onToggle={toggleCompactMode} color="emerald"
              />

              {/* Mute Alerts — FUNCTIONAL */}
              <SettingRow
                icon={<Bell size={15} />}
                label="Mute All Alerts"
                description="Greys out alerts badge & highlights."
                on={alertsMuted} onToggle={toggleAlertsMuted} color="rose"
              />

              {/* Visual-only toggles */}
              <SettingRow icon={<Activity size={15} />} label="System Diagnostics"
                description="Show performance metrics in topbar."
                on={false} onToggle={() => {}} color="indigo"
              />
              <SettingRow icon={<Zap size={15} />} label="Background Animations"
                description="Gradient mesh & glow animations."
                on={true} onToggle={() => {}} color="emerald"
              />
              <SettingRow icon={<Shield size={15} />} label="Auto-Refresh Data"
                description="Refetch silo list every 60 seconds."
                on={false} onToggle={() => {}} color="sky"
              />
            </div>

            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
              <p className="font-plus-jakarta text-slate-700 text-[10px]">Silo v0.1.0 — Settings persist across sessions</p>
              <ChevronRight size={12} className="text-slate-800" />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
