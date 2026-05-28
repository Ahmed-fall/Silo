"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertProvider } from "@/context/AlertContext";
import { SettingsProvider } from "@/context/SettingsContext";
import LiveAlertsPanel from "@/components/LiveAlertsPanel";
import Sidebar from "@/components/Sidebar";
import WheatParallaxField from "@/components/WheatParallaxField";
import SettingsDrawer from "@/components/SettingsDrawer";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <WheatParallaxField />

      <SettingsProvider>
        <AlertProvider>
          {/* Sidebar */}
          <div className="relative z-10 shrink-0 flex">
            <Sidebar
              settingsOpen={settingsOpen}
              onSettingsOpen={() => setSettingsOpen(true)}
            />
          </div>

          {/* Settings panel — inline flex item, pushes main content right */}
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                key="settings-panel"
                initial={{ width: 0 }}
                animate={{ width: 288 }}
                exit={{ width: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 38 }}
                className="relative z-20 shrink-0 overflow-hidden flex"
              >
                <SettingsDrawer onClose={() => setSettingsOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main content */}
          <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
            <header
              className="shrink-0 flex items-center justify-between px-4 lg:px-8 py-3"
              style={{
                borderBottom: "1px solid var(--border-muted)",
                backgroundColor: "var(--bg-elevated)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center gap-2 lg:hidden">
                <span
                  className="font-cinzel font-semibold text-sm tracking-widest uppercase"
                  style={{ color: "var(--text-primary)" }}
                >
                  Silo
                </span>
              </div>
              <div className="hidden lg:block" />
              <LiveAlertsPanel />
            </header>
            <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
              {children}
            </main>
          </div>
        </AlertProvider>
      </SettingsProvider>
    </>
  );
}
