"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { API_BASE, WS_URL } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  silo_id: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string; // ISO-8601
  read: boolean;
}

interface AlertContextValue {
  alerts: Alert[];
  unreadCount: number;
  markAsRead: (alertId: string) => Promise<void>;
  markingIds: Set<string>;   // IDs currently being PATCH'ed
  markError: string | null;  // last error message
  isConnected: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlerts(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used inside <AlertProvider>");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [markError, setMarkError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── WebSocket lifecycle ──────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const incoming: Alert = JSON.parse(event.data as string);
        setAlerts((prev) => [incoming, ...prev]);
        if (!incoming.read) {
          setUnreadCount((n) => n + 1);
        }
      } catch {
        console.warn("[AlertContext] Could not parse WebSocket message", event.data);
      }
    };

    ws.onerror = () => {
      console.warn("[AlertContext] WebSocket error — will retry in 5 s");
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimer.current = setTimeout(connect, 5_000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      reconnectTimer.current && clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── markAsRead ───────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (alertId: string) => {
    setMarkingIds((prev) => new Set(prev).add(alertId));
    setMarkError(null);

    try {
      await axios.patch(`${API_BASE}/alerts/${alertId}/read`);

      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? (err.response?.data?.detail ?? err.message)
          : "Unknown error";
      setMarkError(message as string);
      console.error("[AlertContext] markAsRead failed:", message);
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, []);

  // ── Value ────────────────────────────────────────────────────────────────

  const value: AlertContextValue = {
    alerts,
    unreadCount,
    markAsRead,
    markingIds,
    markError,
    isConnected,
  };

  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
}
