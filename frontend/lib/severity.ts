// Shared risk_level -> UI severity mapping. Single definition instead of
// the same three-entry map hand-copied per component.
export type AlertSeverity = "critical" | "warning" | "info";

export const SEVERITY_MAP: Record<string, AlertSeverity> = {
  high: "critical",
  medium: "warning",
  low: "info",
};
