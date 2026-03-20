"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ─── App Settings Context ───────────────────────────────────────────────────

export interface AppSettings {
  muteAlerts: boolean;
  compactGrid: boolean;
}

interface AppSettingsContextValue {
  settings: AppSettings;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  toggleSetting: (key: keyof AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  muteAlerts: false,
  compactGrid: false,
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("silo-app-settings");
      if (stored) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch { /* ignore */ }
  }, []);

  const save = (newSettings: AppSettings) => {
    setSettingsState(newSettings);
    try { localStorage.setItem("silo-app-settings", JSON.stringify(newSettings)); } catch {}
  };

  const setSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  const toggleSetting = useCallback((key: keyof AppSettings) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      save(next);
      return next;
    });
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, setSetting, toggleSetting }}>
      {children}
    </AppSettingsContext.Provider>
  );
}
