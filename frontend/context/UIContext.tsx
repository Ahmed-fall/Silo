"use client";

import React, { createContext, useContext, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIState {
  /** Shrinks the silo grid gaps/padding */
  compactGrid:    boolean;
  setCompactGrid: (v: boolean) => void;
  toggleCompactGrid: () => void;

  /** Greys out the alerts badge and suppresses notification highlights */
  alertsMuted:    boolean;
  setAlertsMuted: (v: boolean) => void;
  toggleAlertsMuted: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UIContext = createContext<UIState>({
  compactGrid:       false,
  setCompactGrid:    () => {},
  toggleCompactGrid: () => {},
  alertsMuted:       false,
  setAlertsMuted:    () => {},
  toggleAlertsMuted: () => {},
});

export function useUI() {
  return useContext(UIContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [compactGrid,  setCompactGrid]  = useState(false);
  const [alertsMuted,  setAlertsMuted]  = useState(false);

  return (
    <UIContext.Provider value={{
      compactGrid,
      setCompactGrid,
      toggleCompactGrid: () => setCompactGrid((v) => !v),
      alertsMuted,
      setAlertsMuted,
      toggleAlertsMuted: () => setAlertsMuted((v) => !v),
    }}>
      {children}
    </UIContext.Provider>
  );
}
