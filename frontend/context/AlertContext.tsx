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

const SEVERITY_MAP: Record<string, AlertSeverity> = {
  high: "critical",
  medium: "warning",
  low: "info",
};

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

  // ── Initial hydration ────────────────────────────────────────────────────
  // The website has no per-user login (it's the unauthenticated,
  // all-silos government dashboard), so it hydrates by listing every silo
  // and fanning out /alerts/{silo_id} — that's correct here, not a
  // workaround, since there's no "current user" to scope a single feed to.

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const { data: silos } = await axios.get(`${API_BASE}/silos`);
        const perSilo = await Promise.all(
          (silos as { id: string }[]).map((s) =>
            axios
              .get(`${API_BASE}/alerts/${s.id}`)
              .then((res) => res.data)
              .catch(() => [])
          )
        );

        type AlertRow = {
          id: string;
          silo_id: string;
          message: string;
          risk_level: string;
          triggered_at: string;
          is_read: boolean;
        };

        const hydrated: Alert[] = (perSilo.flat() as AlertRow[]).map((a) => ({
          id: a.id,
          silo_id: a.silo_id,
          message: a.message,
          severity: SEVERITY_MAP[a.risk_level] ?? "info",
          timestamp: a.triggered_at,
          read: a.is_read,
        }));

        if (cancelled) return;

        setAlerts((prev) => {
          const hydratedIds = new Set(hydrated.map((a) => a.id));
          const wsOnly = prev.filter((a) => !hydratedIds.has(a.id));
          return [...hydrated, ...wsOnly].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
        setUnreadCount(hydrated.filter((a) => !a.read).length);
      } catch (err) {
        console.warn("[AlertContext] Failed to hydrate alerts from API", err);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

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
