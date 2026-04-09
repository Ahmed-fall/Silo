"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { LayoutDashboard, Map, BarChart2, Settings, Sparkles, X } from "lucide-react";
import SettingsDrawer from "@/components/SettingsDrawer";
import { BrandLogo } from "@/components/BrandLogo";

const NAV = [
  {
    type: "link" as const,
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard size={16} />,
    match: (p: string) => p === "/",
  },
  {
    type: "link" as const,
    href: "/live-map",
    label: "Live Map",
    icon: <Map size={16} />,
    match: (p: string) => p.startsWith("/live-map"),
  },
  { type: "coming" as const, label: "Reports",  icon: <BarChart2 size={16} />, name: "Analytics & Reports" },
  { type: "settings" as const, label: "Settings", icon: <Settings size={16} /> },
];

interface Toast { id: number; label: string }

function ComingSoonToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl w-64 glass-tactical"
    >
      <Sparkles size={14} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
      <div className="flex-1">
        <p className="font-outfit font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{toast.label}</p>
        <p className="font-plus-jakarta text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Coming soon!</p>
      </div>
      <button onClick={onDismiss} style={{ color: "var(--text-muted)" }} className="hover:opacity-70 transition-opacity">
        <X size={13} />
      </button>
    </motion.div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  let _id = 0;

  const addToast = useCallback((label: string) => {
    const id = ++_id;
    setToasts((p) => [...p.slice(-2), { id, label }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <aside
        className="hidden lg:flex flex-col shrink-0 w-60 relative z-10"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderRight: "1px solid var(--border-glass)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-7 pb-6">
          <div
            className="flex items-center justify-center size-9 rounded-xl shrink-0 overflow-hidden"
            style={{
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 20px var(--accent-glow)",
            }}
          >
            <BrandLogo className="size-6 text-white" />
          </div>
          <div>
            <p className="font-outfit font-bold text-[17px] tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>Silo</p>
            <p className="text-[9px] tracking-[0.2em] uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>Grain Intelligence</p>
          </div>
        </div>

        <p className="px-5 mb-2 text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--text-muted)" }}>Navigation</p>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map((item, i) => {
            if (item.type === "link") {
              const isActive = item.match(pathname);
              return (
                <Link key={i} href={item.href}
                  className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? "var(--accent-subtle)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {isActive && (
                    <motion.span layoutId="nav-pill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                      style={{ backgroundColor: "var(--accent)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} className="transition-colors">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }
            if (item.type === "settings") {
              return (
                <button key={i} onClick={() => setSettingsOpen(true)}
                  className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-150"
                  style={{
                    backgroundColor: settingsOpen ? "var(--accent-subtle)" : "transparent",
                    color: settingsOpen ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  <span style={{ color: settingsOpen ? "var(--accent)" : "var(--text-muted)" }} className="transition-colors">{item.icon}</span>
                  {item.label}
                </button>
              );
            }
            return (
              <button key={i} onClick={() => addToast(item.name)}
                className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all"
                style={{ color: "var(--text-muted)" }}
              >
                <span style={{ color: "var(--text-muted)" }} className="transition-colors">{item.icon}</span>
                <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                <span className="ml-auto text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Soon</span>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 mt-auto">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{
              backgroundColor: "var(--accent-subtle)",
              border: "1px solid var(--border-glass)",
            }}
          >
            <p className="flex-1 font-plus-jakarta text-[10px]" style={{ color: "var(--text-secondary)" }}>v0.1.0 — Beta</p>
            <div
              className="size-2 rounded-full"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 0 6px var(--accent-glow)",
              }}
            />
          </div>
        </div>
      </aside>

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
