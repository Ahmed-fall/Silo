"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark";

interface SettingsState {
  /** light | dark colour scheme */
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  /** Shrinks silo grid gaps in real-time */
  compactMode: boolean;
  setCompactMode: (v: boolean) => void;
  toggleCompactMode: () => void;

  /** Greys out alerts UI globally */
  alertsMuted: boolean;
  setAlertsMuted: (v: boolean) => void;
  toggleAlertsMuted: () => void;

  /** Shows mock diagnostics widget in topbar */
  diagnosticsEnabled: boolean;
  setDiagnosticsEnabled: (v: boolean) => void;
  toggleDiagnostics: () => void;

  /** Disables all Framer Motion pulse/glow/spin animations */
  animationsEnabled: boolean;
  setAnimationsEnabled: (v: boolean) => void;
  toggleAnimations: () => void;

  /** Initiates 60s interval data refetch */
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  toggleAutoRefresh: () => void;
}

const defaultState: SettingsState = {
  theme:             "light",
  setTheme:          () => {},
  toggleTheme:       () => {},
  compactMode:       false,
  setCompactMode:    () => {},
  toggleCompactMode: () => {},
  alertsMuted:       false,
  setAlertsMuted:    () => {},
  toggleAlertsMuted: () => {},
  diagnosticsEnabled:false,
  setDiagnosticsEnabled: () => {},
  toggleDiagnostics: () => {},
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
  toggleAnimations:  () => {},
  autoRefresh:       false,
  setAutoRefresh:    () => {},
  toggleAutoRefresh: () => {},
};

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsState>(defaultState);

export function useSettings() {
  return useContext(SettingsContext);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not critical */ }
}

const STORAGE_KEYS = {
  theme:     "silo:theme",
  compact:   "silo:compact",
  muted:     "silo:muted",
  diag:      "silo:diagnostics",
  anims:     "silo:animations",
  refresh:   "silo:autoRefresh",
} as const;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // All state initialises to SSR-safe defaults, then syncs from localStorage
  const [theme,               setThemeState]        = useState<Theme>("light");
  const [compactMode,       setCompactMode]       = useState(false);
  const [alertsMuted,       setAlertsMuted]       = useState(false);
  const [diagnosticsEnabled,  setDiagnosticsEnabled]  = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [autoRefresh,       setAutoRefresh]       = useState(false);

  // Apply the theme class to <html>
  const applyTheme = useCallback((t: Theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
    }
  }, []);

  // Run only on the client — avoids SSR/client mismatch
  useEffect(() => {
    const t = readStorage<Theme>(STORAGE_KEYS.theme, "light");
    setThemeState(t);
    applyTheme(t);
    setCompactMode(      readStorage<boolean>(STORAGE_KEYS.compact,  false));
    setAlertsMuted(      readStorage<boolean>(STORAGE_KEYS.muted,    false));
    setDiagnosticsEnabled(readStorage<boolean>(STORAGE_KEYS.diag,     false));
    setAnimationsEnabled(readStorage<boolean>(STORAGE_KEYS.anims,     true));
    setAutoRefresh(      readStorage<boolean>(STORAGE_KEYS.refresh,   false));
  }, [applyTheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    writeStorage(STORAGE_KEYS.theme, t);
    applyTheme(t);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      writeStorage(STORAGE_KEYS.theme, next);
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  const toggleCompactMode = useCallback(() => {
    setCompactMode((prev) => { writeStorage(STORAGE_KEYS.compact, !prev); return !prev; });
  }, []);

  const toggleAlertsMuted = useCallback(() => {
    setAlertsMuted((prev) => { writeStorage(STORAGE_KEYS.muted, !prev); return !prev; });
  }, []);

  const toggleDiagnostics = useCallback(() => {
    setDiagnosticsEnabled((prev) => { writeStorage(STORAGE_KEYS.diag, !prev); return !prev; });
  }, []);

  const toggleAnimations = useCallback(() => {
    setAnimationsEnabled((prev) => { writeStorage(STORAGE_KEYS.anims, !prev); return !prev; });
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => { writeStorage(STORAGE_KEYS.refresh, !prev); return !prev; });
  }, []);

  return (
    <SettingsContext.Provider value={{
      theme,               setTheme,               toggleTheme,
      compactMode,       setCompactMode,       toggleCompactMode,
      alertsMuted,       setAlertsMuted,       toggleAlertsMuted,
      diagnosticsEnabled,  setDiagnosticsEnabled,  toggleDiagnostics,
      animationsEnabled, setAnimationsEnabled, toggleAnimations,
      autoRefresh,       setAutoRefresh,       toggleAutoRefresh,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
