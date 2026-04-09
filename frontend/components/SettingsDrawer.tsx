"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bell, Activity, Shield, Zap, LayoutGrid, ChevronRight, RefreshCw,
  Sun, Moon,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

// ─── Animated Toggle Switch ───────────────────────────────────────────────────

type Accent = "accent" | "alert" | "warning";

function Toggle({ on, onToggle, color = "accent" }: {
  on: boolean; onToggle: () => void; color?: Accent;
}) {
  const tracks: Record<Accent, string> = {
    accent: "var(--accent)", alert: "var(--alert)", warning: "var(--warning)",
  };
  const glows: Record<Accent, string> = {
    accent: "var(--accent-glow)", alert: "var(--alert-glow)", warning: "var(--warning-glow)",
  };
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      className="relative shrink-0 w-12 h-[26px] rounded-full border transition-colors duration-250 cursor-pointer"
      style={{
        backgroundColor: on ? tracks[color] : "var(--border-muted)",
        borderColor: on ? "transparent" : "var(--border-muted)",
      }}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 38 }}
        className="absolute top-[3px] size-5 rounded-full bg-white"
        style={{
          left: on ? "calc(100% - 23px)" : "3px",
          boxShadow: on ? `0 0 10px ${glows[color]}` : "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────

function SettingRow({ icon, label, description, on, onToggle, color = "accent" }: {
  icon: React.ReactNode; label: string; description: string;
  on: boolean; onToggle: () => void; color?: Accent;
}) {
  return (
    <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onToggle}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer glass-tactical"
    >
      <div className="flex items-center justify-center size-8 rounded-xl shrink-0 border transition-colors"
        style={{
          backgroundColor: "var(--accent-subtle)",
          borderColor: "var(--border-glass)",
          color: on ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-outfit font-semibold text-sm transition-colors"
          style={{ color: on ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {label}
        </p>
        <p className="font-plus-jakarta text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>
      <Toggle on={on} onToggle={onToggle} color={color} />
    </motion.div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    theme,             toggleTheme,
    compactMode,       toggleCompactMode,
    alertsMuted,       toggleAlertsMuted,
    diagnosticsEnabled,  toggleDiagnostics,
    animationsEnabled, toggleAnimations,
    autoRefresh,       toggleAutoRefresh,
  } = useSettings();

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.15)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside key="drawer"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 35 }}
            className="fixed top-0 left-0 h-full z-50 w-80 flex flex-col shadow-[8px_0_60px_rgba(0,0,0,0.08)]"
            style={{
              backgroundColor: "var(--bg-elevated)",
              backdropFilter: "blur(28px)",
              borderRight: "1px solid var(--border-glass)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-7 pb-5"
              style={{ borderBottom: "1px solid var(--border-muted)" }}
            >
              <div>
                <h2 className="font-outfit font-bold text-lg" style={{ color: "var(--text-primary)" }}>Settings</h2>
                <p className="font-plus-jakarta text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Dashboard preferences</p>
              </div>
              <button onClick={onClose}
                className="flex items-center justify-center size-8 rounded-xl transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--accent-subtle)",
                  border: "1px solid var(--border-glass)",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
              {/* Appearance */}
              <p className="px-2 pt-2 pb-2 text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--text-muted)" }}>
                Appearance
              </p>

              {/* Dark / Light Mode */}
              <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer glass-tactical"
              >
                <div className="flex items-center justify-center size-8 rounded-xl shrink-0 border transition-colors"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    borderColor: "var(--border-glass)",
                    color: isDark ? "#818cf8" : "var(--accent)",
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={isDark ? "moon" : "sun"}
                      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.18 }}
                    >
                      {isDark ? <Moon size={15} /> : <Sun size={15} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-outfit font-semibold text-sm transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </p>
                  <p className="font-plus-jakarta text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                    {isDark ? "Click to switch to light" : "Click to switch to dark"}
                  </p>
                </div>
                <Toggle on={isDark} onToggle={toggleTheme} color="warning" />
              </motion.div>

              {/* 1. Compact Grid */}
              <SettingRow
                icon={<LayoutGrid size={15} />}
                label="Compact Grid"
                description="Shrinks card gaps for a denser view."
                on={compactMode} onToggle={toggleCompactMode} color="accent"
              />

              {/* 2. Mute All Alerts */}
              <SettingRow
                icon={<Bell size={15} />}
                label="Mute All Alerts"
                description="Greys out badges & disables pulse animations."
                on={alertsMuted} onToggle={toggleAlertsMuted} color="alert"
              />

              {/* Performance */}
              <p className="px-2 pt-5 pb-2 text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--text-muted)" }}>
                Performance & Data
              </p>

              {/* 3. System Diagnostics */}
              <SettingRow
                icon={<Activity size={15} />}
                label="System Diagnostics"
                description="Show ping, FPS & data sync in topbar."
                on={diagnosticsEnabled} onToggle={toggleDiagnostics} color="accent"
              />

              {/* 4. Background Animations */}
              <SettingRow
                icon={<Zap size={15} />}
                label="Background Animations"
                description="Pulse rings, glow effects & spinning borders."
                on={animationsEnabled} onToggle={toggleAnimations} color="accent"
              />

              {/* 5. Auto-Refresh Data */}
              <SettingRow
                icon={<RefreshCw size={15} />}
                label="Auto-Refresh Data"
                description="Refetch silo data every 60 seconds."
                on={autoRefresh} onToggle={toggleAutoRefresh} color="warning"
              />
            </div>

            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid var(--border-muted)" }}
            >
              <p className="font-plus-jakarta text-[10px]" style={{ color: "var(--text-muted)" }}>
                Silo v0.1.0 — Settings persist across sessions
              </p>
              <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
