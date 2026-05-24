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
    icon: <Flame size={13} style={{ color: "var(--alert)" }} className="shrink-0" />,
    dot: "var(--alert)",
    text: "var(--alert)",
    border: "rgba(225,29,72,0.25)",
    glow: "0 4px 16px rgba(225,29,72,0.10)",
  },
  warning: {
    icon: <AlertTriangle size={13} style={{ color: "var(--warning)" }} className="shrink-0" />,
    dot: "var(--warning)",
    text: "var(--warning)",
    border: "rgba(205,127,50,0.25)",
    glow: "0 4px 16px rgba(205,127,50,0.08)",
  },
  info: {
    icon: <Info size={13} style={{ color: "var(--accent)" }} className="shrink-0" />,
    dot: "var(--accent)",
    text: "var(--accent)",
    border: "var(--border-glass)",
    glow: "0 4px 16px rgba(64,224,208,0.08)",
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
      <div className="flex items-center gap-2 px-3 h-9 rounded-full glass-tactical">
        <BellOff size={12} style={{ color: "var(--text-muted)" }} />
        <span className="font-outfit text-xs" style={{ color: "var(--text-muted)" }}>Muted</span>
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
      className="relative flex items-center gap-2.5 overflow-hidden cursor-pointer select-none glass-tactical px-3"
      style={{
        minWidth: 44,
        boxShadow: expanded && latest ? sevCfg.glow : "0 4px 16px rgba(0,0,0,0.06)",
        borderColor: expanded && latest ? sevCfg.border : "var(--border-glass)",
      }}
    >
      {/* Connection dot */}
      <span className={`shrink-0 size-2 rounded-full ${expanded ? "" : "mx-auto"}`}
        style={{
          backgroundColor: isConnected
            ? hasCritical ? "var(--alert)" : "var(--accent)"
            : "var(--text-muted)",
          opacity: isConnected ? 1 : 0.5,
          animation: !isConnected || hasCritical ? "pulse 2s infinite" : "none",
        }}
      />

      {/* Collapsed: just badge */}
      {!expanded && unreadCount > 0 && (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-outfit font-bold text-xs whitespace-nowrap"
          style={{ color: "var(--text-primary)" }}
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
            <p className="text-xs font-medium whitespace-nowrap max-w-[220px] truncate"
              style={{ color: sevCfg.text }}>
              {latest.message}
            </p>
            {unreadCount > 1 && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  backgroundColor: "var(--accent-subtle)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-glass)",
                }}
              >
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
            <p className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>No alerts</p>
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
      className="relative flex items-start gap-2.5 rounded-2xl px-4 py-3 glass-tactical transition-all"
      style={{
        borderColor: sev.border,
        boxShadow: !alert.read ? sev.glow : "none",
        cursor: !alert.read ? "pointer" : "default",
        opacity: alert.read ? 0.55 : 1,
      }}
    >
      {!alert.read && (
        <span className="absolute top-3 right-3 size-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: sev.dot }} />
      )}
      {sev.icon}
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-xs leading-snug" style={{ color: alert.read ? "var(--text-muted)" : sev.text }}>
          {alert.message}
        </p>
        <p className="text-[10px] mt-1 font-mono" style={{ color: "var(--text-muted)" }}>{time}</p>
      </div>
      {pending
        ? <Loader2 size={12} className="animate-spin shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
        : alert.read && <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
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
          className="relative flex items-center justify-center size-9 rounded-xl border transition-all active:scale-95 glass-tactical"
          style={{
            color: alertsMuted ? "var(--text-muted)" : "var(--text-secondary)",
          }}
          aria-label="Toggle alerts panel"
        >
          {alertsMuted ? <BellOff size={16} /> : <Bell size={16} />}
          {/* Badge — hidden when muted */}
          {!alertsMuted && unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 size-[18px] flex items-center justify-center text-white text-[9px] font-bold rounded-full"
              style={{
                backgroundColor: "var(--alert)",
                boxShadow: "0 0 8px rgba(225,29,72,0.5)",
              }}
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
                className="absolute right-0 top-12 z-50 w-80 rounded-2xl overflow-hidden glass-tactical"
                style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.10)" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3"
                  style={{ borderBottom: "1px solid var(--border-muted)" }}
                >
                  <div className="flex items-center gap-2">
                    <Bell size={14} style={{ color: "var(--text-secondary)" }} />
                    <span className="font-outfit font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      Live Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold"
                        style={{ backgroundColor: "var(--alert)" }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {isConnected
                      ? <><Wifi size={11} style={{ color: "var(--accent)" }} /><span style={{ color: "var(--accent)" }}>Live</span></>
                      : <><WifiOff size={11} className="animate-pulse" style={{ color: "var(--text-muted)" }} /><span style={{ color: "var(--text-muted)" }}>Reconnecting</span></>
                    }
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {markError && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="px-4 py-2"
                      style={{
                        backgroundColor: "rgba(225,29,72,0.06)",
                        borderBottom: "1px solid rgba(225,29,72,0.15)",
                      }}
                    >
                      <p className="text-[11px]" style={{ color: "var(--alert)" }}>⚠ {markError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Alerts list */}
                <div className="flex flex-col gap-2 px-3 py-3 max-h-72 overflow-y-auto custom-scrollbar">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10" style={{ color: "var(--text-muted)" }}>
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
                <div className="px-4 py-2.5 text-center"
                  style={{ borderTop: "1px solid var(--border-muted)" }}
                >
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
