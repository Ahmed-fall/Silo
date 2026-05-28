"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { LayoutDashboard, Map, BarChart2, Settings, X, BookOpen } from "lucide-react";

const NAV = [
  {
    type: "link" as const,
    href: "/",
    label: "Command Registry",
    sub: "DASHBOARD",
    icon: <LayoutDashboard size={14} />,
    match: (p: string) => p === "/",
  },
  {
    type: "link" as const,
    href: "/live-map",
    label: "Facility Map",
    sub: "LIVE MAP",
    icon: <Map size={14} />,
    match: (p: string) => p.startsWith("/live-map"),
  },
  {
    type: "link" as const,
    href: "/diseases",
    label: "Disease Encyclopedia",
    sub: "REFERENCE",
    icon: <BookOpen size={14} />,
    match: (p: string) => p.startsWith("/diseases"),
  },
  { type: "coming" as const, label: "Analytics", sub: "REPORTS", icon: <BarChart2 size={14} />, name: "Analytics & Reports" },
  { type: "settings" as const, label: "Configuration", sub: "SETTINGS", icon: <Settings size={14} /> },
];

interface Toast { id: number; label: string }

function ComingSoonToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl w-64 glass-archival"
    >
      <div className="flex-1">
        <p className="font-cinzel text-xs tracking-widest uppercase" style={{ color: "var(--text-primary)" }}>{toast.label}</p>
        <p className="font-plus-jakarta text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Coming soon</p>
      </div>
      <button onClick={onDismiss} style={{ color: "var(--text-muted)" }} className="hover:opacity-70 transition-opacity mt-0.5">
        <X size={12} />
      </button>
    </motion.div>
  );
}

// Small inline wheat SVG mark for the brand area
function WheatMark() {
  return (
    <svg width="20" height="32" viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="30" x2="10" y2="6" stroke="#A48259" strokeWidth="1.2" strokeLinecap="round"/>
      {[6, 10, 14, 18, 22].map((y, i) => {
        const s = 1 - i * 0.08;
        return (
          <g key={y}>
            <path d={`M10 ${y} Q${10 - 7 * s} ${y - 2 * s} ${10 - 4 * s} ${y - 5 * s} Q${10 - 1 * s} ${y - 3 * s} 10 ${y}`}
              stroke="#A48259" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
            <path d={`M10 ${y} Q${10 + 7 * s} ${y - 2 * s} ${10 + 4 * s} ${y - 5 * s} Q${10 + 1 * s} ${y - 3 * s} 10 ${y}`}
              stroke="#A48259" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
          </g>
        );
      })}
    </svg>
  );
}

export default function Sidebar({
  settingsOpen,
  onSettingsOpen,
}: {
  settingsOpen: boolean;
  onSettingsOpen: () => void;
}) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  let _id = 0;

  const addToast = useCallback((label: string) => {
    const id = ++_id;
    setToasts((p) => [...p.slice(-2), { id, label }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <aside
        className="hidden lg:flex flex-col shrink-0 w-60 relative z-10"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* ── Brand Mark ── */}
        <div className="flex items-center gap-4 px-6 pt-8 pb-7">
          <div className="shrink-0 opacity-90">
            <WheatMark />
          </div>
          <div>
            <p
              className="font-cinzel font-semibold leading-none tracking-[0.22em] uppercase"
              style={{ color: "var(--text-primary)", fontSize: "15px" }}
            >
              Silo
            </p>
            <p
              className="font-plus-jakarta mt-1.5 leading-none"
              style={{ color: "var(--text-muted)", fontSize: "8px", letterSpacing: "0.18em" }}
            >
              GRAIN INTELLIGENCE SYSTEM
            </p>
          </div>
        </div>

        {/* ── Ruled Divider ── */}
        <div style={{ height: "1px", backgroundColor: "var(--border-muted)", margin: "0 24px 20px" }} />

        {/* ── Nav Section Label ── */}
        <p
          className="px-6 mb-3"
          style={{ color: "var(--text-muted)", fontSize: "8px", letterSpacing: "0.22em", fontFamily: "var(--font-outfit)", fontWeight: 600 }}
        >
          REGISTRY INDEX
        </p>

        {/* ── Navigation Items ── */}
        <nav className="flex-1 px-4 space-y-0.5">
          {NAV.map((item, i) => {
            if (item.type === "link") {
              const isActive = item.match(pathname);
              return (
                <Link key={i} href={item.href}
                  className="group relative flex items-center gap-3 px-3 py-3 text-sm transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? "rgba(164,130,89,0.09)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    borderRadius: "6px",
                  }}
                >
                  {/* Active left-border tab */}
                  {isActive && (
                    <motion.span layoutId="nav-tab"
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
                      style={{ backgroundColor: "var(--accent)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} className="shrink-0 transition-colors">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-plus-jakarta font-medium text-[13px] leading-none">{item.label}</p>
                    <p className="font-plus-jakarta mt-1 leading-none"
                      style={{ fontSize: "8px", letterSpacing: "0.18em", color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                      {item.sub}
                    </p>
                  </div>
                </Link>
              );
            }
            if (item.type === "settings") {
              return (
                <button key={i} onClick={() => onSettingsOpen()}
                  className="group w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-all duration-200"
                  style={{
                    backgroundColor: settingsOpen ? "rgba(164,130,89,0.09)" : "transparent",
                    color: settingsOpen ? "var(--text-primary)" : "var(--text-secondary)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: settingsOpen ? "var(--accent)" : "var(--text-muted)" }} className="shrink-0 transition-colors">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-plus-jakarta font-medium text-[13px] leading-none">{item.label}</p>
                    <p className="font-plus-jakarta mt-1 leading-none"
                      style={{ fontSize: "8px", letterSpacing: "0.18em", color: settingsOpen ? "var(--accent)" : "var(--text-muted)" }}>
                      {item.sub}
                    </p>
                  </div>
                </button>
              );
            }
            return (
              <button key={i} onClick={() => addToast(item.name)}
                className="group w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-all"
                style={{ color: "var(--text-muted)", borderRadius: "6px" }}
              >
                <span className="shrink-0">{item.icon}</span>
                <div>
                  <p className="font-plus-jakarta font-medium text-[13px] leading-none" style={{ color: "var(--text-secondary)" }}>
                    {item.label}
                  </p>
                  <p className="font-plus-jakarta mt-1 leading-none"
                    style={{ fontSize: "8px", letterSpacing: "0.18em", color: "var(--text-muted)" }}>
                    {item.sub}
                  </p>
                </div>
                <span className="ml-auto font-outfit text-[8px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(164,130,89,0.08)", color: "var(--text-muted)", border: "1px solid var(--border-glass)" }}>
                  Soon
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Bottom Registry Stamp ── */}
        <div className="px-6 py-5 mt-auto">
          <div style={{ height: "1px", backgroundColor: "var(--border-muted)", marginBottom: "14px" }} />
          <div className="flex items-center justify-between">
            <p className="font-plus-jakarta"
              style={{ color: "var(--text-muted)", fontSize: "8px", letterSpacing: "0.18em" }}>
              REGISTRY v0.1 // SECURE
            </p>
            <div
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 0 5px var(--accent-glow)",
              }}
            />
          </div>
        </div>
      </aside>

      {/* Toast Stack */}
      <div className="fixed bottom-6 left-4 z-[60] flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ComingSoonToast key={t.id} toast={t} onDismiss={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
