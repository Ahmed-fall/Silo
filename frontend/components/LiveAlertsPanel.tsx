"use client";

import { useAlerts } from "@/context/AlertContext";
import { useSettings } from "@/context/SettingsContext";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Flame, Bell, BellOff, Info, Wifi, WifiOff, CheckCircle2, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info";

const SEV = {
  critical: {
    icon: <Flame size={13} className="text-rose-400 shrink-0" />,
    dot: "bg-rose-500",
    text: "text-rose-300",
    border: "border-rose-500/30",
    glow: "shadow-rose-900/50",
  },
  warning: {
    icon: <AlertTriangle size={13} className="text-amber-400 shrink-0" />,
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-500/30",
    glow: "shadow-amber-900/40",
  },
  info: {
    icon: <Info size={13} className="text-sky-400 shrink-0" />,
    dot: "bg-sky-400",
    text: "text-sky-300",
    border: "border-sky-500/30",
    glow: "shadow-sky-900/30",
  },
};

// ─── Dynamic Island pill ──────────────────────────────────────────────────────
// Shown at top-center. Morphs on new alerts.

function DynamicIsland({ muted }: { muted: boolean }) {
  const { alerts, unreadCount, isConnected } = useAlerts();
  const [expanded, setExpanded] = useState(false);
  const prevLen = useRef(alerts.length);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latest = alerts[0];
  const hasCritical = alerts.some((a) => !a.read && a.severity === "critical");

  // Auto-expand when new alert arrives, then collapse after 4 s
  useEffect(() => {
    if (alerts.length > prevLen.current) {
      setExpanded(true);
      collapseTimer.current && clearTimeout(collapseTimer.current);
      collapseTimer.current = setTimeout(() => setExpanded(false), 4000);
    }
    prevLen.current = alerts.length;
    return () => { collapseTimer.current && clearTimeout(collapseTimer.current); };
  }, [alerts.length]);

  const sevCfg = latest ? SEV[latest.severity as Severity] : SEV.info;

  // When muted, show a small greyed pill
  if (muted) {
    return (
      <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-slate-900/70 border border-white/[0.05]">
        <BellOff size={12} className="text-slate-600" />
        <span className="font-outfit text-slate-600 text-xs">Muted</span>
      </div>
    );
  }

  return (
    <motion.div
      layout
      onClick={() => setExpanded((v) => !v)}
      animate={{
        width: expanded ? "auto" : unreadCount > 0 ? 80 : 44,
        height: expanded ? "auto" : 36,
        borderRadius: expanded ? 18 : 18,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={`
        relative flex items-center gap-2.5 overflow-hidden cursor-pointer select-none
        bg-slate-950/90 backdrop-blur-xl
        border ${expanded && latest ? sevCfg.border : "border-white/[0.08]"}
        shadow-xl ${expanded && latest ? sevCfg.glow : ""}
        px-3
      `}
      style={{ minWidth: 44 }}
    >
      {/* Connection dot */}
      <span className={`
        shrink-0 size-2 rounded-full
        ${isConnected
          ? hasCritical ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
          : "bg-slate-600 animate-pulse"
        }
        ${expanded ? "" : "mx-auto"}
      `} />

      {/* Collapsed: just badge */}
      {!expanded && unreadCount > 0 && (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-outfit font-bold text-xs text-slate-200 whitespace-nowrap"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </motion.span>
      )}

      {/* Expanded: latest alert content */}
      <AnimatePresence>
        {expanded && latest && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 py-1.5 pr-1 min-w-0"
          >
            {sevCfg.icon}
            <p className={`text-xs font-medium whitespace-nowrap max-w-[220px] truncate ${sevCfg.text}`}>
              {latest.message}
            </p>
            {unreadCount > 1 && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold">
                +{unreadCount - 1}
              </span>
            )}
          </motion.div>
        )}
        {expanded && !latest && (
          <motion.div
            key="no-alerts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-1 pr-1"
          >
            <p className="text-slate-500 text-xs whitespace-nowrap">No alerts</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Full floating panel (triggered by Bell in topbar) ───────────────────────

function AlertRow({ alert, onMark, pending }: {
  alert: { id: string; message: string; severity: string; timestamp: string; read: boolean };
  onMark: (id: string) => void;
  pending: boolean;
}) {
  const sev = SEV[(alert.severity as Severity) ?? "info"];
  const time = new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      onClick={() => !alert.read && !pending && onMark(alert.id)}
      className={`
        relative flex items-start gap-2.5 rounded-2xl px-4 py-3
        border ${sev.border} bg-slate-950/80
        shadow-lg ${sev.glow}
        transition-all
        ${!alert.read ? "cursor-pointer hover:brightness-110 active:scale-[0.98]" : "opacity-55"}
      `}
    >
      {!alert.read && (
        <span className={`absolute top-3 right-3 size-1.5 rounded-full ${sev.dot} animate-pulse`} />
      )}
      {sev.icon}
      <div className="flex-1 min-w-0 pr-3">
        <p className={`text-xs leading-snug ${alert.read ? "text-slate-400" : sev.text}`}>
          {alert.message}
        </p>
        <p className="text-slate-600 text-[10px] mt-1 font-mono">{time}</p>
      </div>
      {pending
        ? <Loader2 size={12} className="animate-spin text-slate-500 shrink-0 mt-0.5" />
        : alert.read && <CheckCircle2 size={12} className="text-emerald-600/60 shrink-0 mt-0.5" />
      }
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LiveAlertsPanel() {
  const { alerts, unreadCount, markAsRead, markingIds, markError, isConnected } = useAlerts();
  const { alertsMuted } = useSettings();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      {/* ── Dynamic Island: top-center floating pill ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <DynamicIsland muted={alertsMuted} />
      </div>

      {/* ── Bell button in topbar ── */}
      <div className="relative z-50">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={`
            relative flex items-center justify-center size-9 rounded-xl
            border transition-all active:scale-95
            ${alertsMuted
              ? "bg-white/[0.02] border-white/[0.04] text-slate-700"
              : "bg-white/[0.04] border-white/[0.07] text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}
          `}
          aria-label="Toggle alerts panel"
        >
          {alertsMuted ? <BellOff size={16} /> : <Bell size={16} />}
          {/* Badge — hidden when muted */}
          {!alertsMuted && unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="
                absolute -top-1.5 -right-1.5 size-[18px]
                flex items-center justify-center
                bg-rose-600 text-white text-[9px] font-bold rounded-full
                ring-2 ring-slate-950 shadow-lg shadow-rose-900/60
              "
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </button>

        {/* ── Floating dropdown panel ── */}
        <AnimatePresence>
          {panelOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="bd"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setPanelOpen(false)}
              />

              {/* Panel */}
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                className="
                  absolute right-0 top-12 z-50 w-80
                  rounded-2xl overflow-hidden
                  bg-slate-950/95 backdrop-blur-xl
                  border border-white/[0.07]
                  shadow-[0_24px_80px_rgba(0,0,0,0.8)]
                "
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-slate-500" />
                    <span className="font-outfit font-semibold text-sm text-slate-200">
                      Live Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {isConnected
                      ? <><Wifi size={11} className="text-emerald-400" /><span className="text-emerald-400">Live</span></>
                      : <><WifiOff size={11} className="text-slate-600 animate-pulse" /><span className="text-slate-600">Reconnecting</span></>
                    }
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {markError && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="bg-rose-950/50 border-b border-rose-800/40 px-4 py-2"
                    >
                      <p className="text-rose-400 text-[11px]">⚠ {markError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Alerts list */}
                <div className="flex flex-col gap-2 px-3 py-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-slate-600">
                      <Bell size={28} />
                      <p className="text-xs text-center">No alerts yet.<br />All clear for now.</p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {alerts.map((a) => (
                        <AlertRow
                          key={a.id}
                          alert={a}
                          onMark={markAsRead}
                          pending={markingIds.has(a.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-white/[0.04] text-center">
                  <p className="text-slate-700 text-[10px]">
                    {alerts.length} alert{alerts.length !== 1 ? "s" : ""} loaded
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
