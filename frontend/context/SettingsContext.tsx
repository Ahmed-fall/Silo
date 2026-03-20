"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "dark" | "light";

interface SettingsState {
  /** Current colour scheme */
  theme: Theme;
  toggleTheme: () => void;

  /** Shrinks silo grid gaps in real-time */
  compactMode: boolean;
  toggleCompactMode: () => void;

  /** Greys out alerts UI globally */
  alertsMuted: boolean;
  toggleAlertsMuted: () => void;
}

const defaultState: SettingsState = {
  theme:               "dark",
  toggleTheme:         () => {},
  compactMode:         false,
  toggleCompactMode:   () => {},
  alertsMuted:         false,
  toggleAlertsMuted:   () => {},
};

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsState>(defaultState);

export function useSettings() {
  return useContext(SettingsContext);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyTheme(t: Theme) {
  // Toggle Tailwind's "dark" class on <html>
  document.documentElement.classList.toggle("dark", t === "dark");
}

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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // All state initialises to SSR-safe defaults, then syncs from localStorage
  const [theme,       setThemeState]   = useState<Theme>("dark");
  const [compactMode, setCompactMode]  = useState(false);
  const [alertsMuted, setAlertsMuted]  = useState(false);

  // Run only on the client — avoids SSR/client mismatch
  useEffect(() => {
    const t = readStorage<Theme>("silo:theme", "dark");
    const c = readStorage<boolean>("silo:compact", false);
    const m = readStorage<boolean>("silo:muted",   false);
    setThemeState(t);
    setCompactMode(c);
    setAlertsMuted(m);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      writeStorage("silo:theme", next);
      return next;
    });
  }, []);

  const toggleCompactMode = useCallback(() => {
    setCompactMode((prev) => {
      writeStorage("silo:compact", !prev);
      return !prev;
    });
  }, []);

  const toggleAlertsMuted = useCallback(() => {
    setAlertsMuted((prev) => {
      writeStorage("silo:muted", !prev);
      return !prev;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{
      theme, toggleTheme,
      compactMode, toggleCompactMode,
      alertsMuted, toggleAlertsMuted,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
