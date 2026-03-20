"use client";

import { useAlerts } from "@/context/AlertContext";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Info, Loader2, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  critical: {
    border: "border-red-500/60",
    glow: "shadow-red-900/40",
    icon: <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />,
    badge: "bg-red-600",
    dot: "bg-red-400",
  },
  warning: {
    border: "border-amber-500/60",
    glow: "shadow-amber-900/30",
    icon: <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />,
    badge: "bg-amber-500",
    dot: "bg-amber-400",
  },
  info: {
    border: "border-sky-500/40",
    glow: "shadow-sky-900/20",
    icon: <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />,
    badge: "bg-sky-600",
    dot: "bg-sky-400",
  },
} as const;

// ─── Single alert row ─────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onMarkRead,
  isPending,
}: {
  alert: { id: string; silo_id: string; message: string; severity: "critical" | "warning" | "info"; timestamp: string; read: boolean };
  onMarkRead: (id: string) => void;
  isPending: boolean;
}) {
  const styles = SEVERITY_STYLES[alert.severity];
  const ts = new Date(alert.timestamp);
  const timeLabel = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative rounded-xl border ${styles.border}
        bg-slate-900/70 backdrop-blur-sm p-3
        shadow-lg ${styles.glow}
        transition-all duration-200
        ${alert.read ? "opacity-60" : "cursor-pointer hover:brightness-110 active:scale-[0.98]"}
      `}
      onClick={() => !alert.read && !isPending && onMarkRead(alert.id)}
      role={!alert.read ? "button" : undefined}
      tabIndex={!alert.read ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && !alert.read && !isPending && onMarkRead(alert.id)}
      aria-label={`Alert: ${alert.message}${!alert.read ? " — click to mark as read" : ""}`}
    >
      {/* Unread indicator dot */}
      {!alert.read && (
        <span
          className={`absolute top-2.5 right-2.5 size-2 rounded-full ${styles.dot} animate-pulse`}
        />
      )}

      <div className="flex items-start gap-2 pr-3">
        {styles.icon}
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-xs leading-snug line-clamp-2">{alert.message}</p>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <span className="text-slate-500 text-[10px] font-mono truncate">
              Silo {alert.silo_id}
            </span>
            <span className="text-slate-500 text-[10px] font-mono">{timeLabel}</span>
          </div>
        </div>
      </div>

      {/* Loading / read states */}
      {isPending && (
        <div className="absolute inset-0 rounded-xl bg-slate-950/60 flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-slate-400" />
        </div>
      )}
      {alert.read && !isPending && (
        <CheckCircle2
          size={12}
          className="absolute bottom-2 right-2 text-emerald-500/70"
        />
      )}
    </motion.div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function LiveAlertsPanel() {
  const { alerts, unreadCount, markAsRead, markingIds, markError, isConnected } =
    useAlerts();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ── Trigger button (fixed top-right) ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center justify-center size-10 rounded-xl
          bg-slate-900/70 border border-slate-800 backdrop-blur-md
          text-slate-400 hover:text-slate-100 hover:border-slate-600
          shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Toggle Alerts panel"
      >
        <Bell size={18} />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1
                flex items-center justify-center
                bg-red-600 text-white text-[10px] font-bold rounded-full
                ring-2 ring-slate-950 shadow-lg shadow-red-900/60"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Glow effect when there are critical unread alerts */}
        {alerts.some((a) => !a.read && a.severity === "critical") && (
          <span className="absolute inset-0 rounded-xl bg-red-600/10 animate-pulse pointer-events-none" />
        )}
      </button>

      {/* ── Slide-out panel ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel itself */}
            <motion.aside
              key="panel"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 35 }}
              className="
                fixed top-0 right-0 h-full z-50
                w-80 flex flex-col
                bg-slate-950/80 border-l border-slate-800 backdrop-blur-xl
                shadow-2xl shadow-black/60
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-200 tracking-wide">
                    Live Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold shadow shadow-red-900/60">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* WS connection indicator */}
                  {isConnected ? (
                    <span title="Live connection active" className="flex items-center gap-1 text-emerald-400 text-[10px]">
                      <Wifi size={12} />
                      <span className="hidden sm:inline">Live</span>
                    </span>
                  ) : (
                    <span title="Reconnecting…" className="flex items-center gap-1 text-slate-500 text-[10px] animate-pulse">
                      <WifiOff size={12} />
                      <span className="hidden sm:inline">Reconnecting</span>
                    </span>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-500 hover:text-slate-200 transition-colors p-0.5 rounded"
                    aria-label="Close panel"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Error toast */}
              <AnimatePresence>
                {markError && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-red-950/60 border-b border-red-800/60 px-4 py-2"
                  >
                    <p className="text-red-400 text-[11px]">⚠ {markError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Alerts list */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                    <Bell size={36} />
                    <p className="text-sm text-center">No alerts yet.<br />They&apos;ll appear here in real time.</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {alerts.map((alert) => (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        onMarkRead={markAsRead}
                        isPending={markingIds.has(alert.id)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-800 text-center">
                <p className="text-slate-600 text-[10px]">
                  {alerts.length} alert{alerts.length !== 1 ? "s" : ""} loaded
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
