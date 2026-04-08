"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsState {
  /** Shrinks silo grid gaps in real-time */
  compactMode: boolean;
  toggleCompactMode: () => void;

  /** Greys out alerts UI globally */
  alertsMuted: boolean;
  toggleAlertsMuted: () => void;
}

const defaultState: SettingsState = {
  compactMode:       false,
  toggleCompactMode: () => {},
  alertsMuted:       false,
  toggleAlertsMuted: () => {},
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [compactMode, setCompactMode]  = useState(false);
  const [alertsMuted, setAlertsMuted]  = useState(false);

  // Run only on the client — avoids SSR/client mismatch
  useEffect(() => {
    const c = readStorage<boolean>("silo:compact", false);
    const m = readStorage<boolean>("silo:muted",   false);
    setCompactMode(c);
    setAlertsMuted(m);
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
      compactMode, toggleCompactMode,
      alertsMuted, toggleAlertsMuted,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
