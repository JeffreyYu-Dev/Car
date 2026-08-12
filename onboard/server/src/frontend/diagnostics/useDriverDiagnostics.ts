import { useEffect, useState } from "react";
import type { DiagnosticEntry } from "@/frontend/diagnostics/types";

// Fetches diagnostic entries and keeps them live over the same websocket
// DiagnosticsPage (the admin dashboard) uses, so the driver-facing app
// reflects a fault the moment it's detected/summarized/answered — not just
// on next page load.
export function useDriverDiagnostics() {
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/diagnostics")
      .then((res) => (res.ok ? (res.json() as Promise<DiagnosticEntry[]>) : []))
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/`);

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as {
          kind?: string;
          data?: unknown;
        };
        if (message.kind !== "diagnostic" || !message.data) return;
        const entry = message.data as DiagnosticEntry;
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.id === entry.id);
          if (idx === -1) return [entry, ...prev];
          const next = [...prev];
          next[idx] = entry;
          return next;
        });
      } catch {
        // ignore malformed messages
      }
    });

    return () => {
      cancelled = true;
      socket.close();
    };
  }, []);

  return { entries, loading };
}

// Most recent diagnostic entry for a given driver — what the driver
// selection flow shows as "your latest diagnostic".
export function latestEntryForDriver(
  entries: DiagnosticEntry[],
  driverProfileId: number,
): DiagnosticEntry | null {
  let latest: DiagnosticEntry | null = null;
  for (const entry of entries) {
    if (entry.driverProfileId !== driverProfileId) continue;
    if (!latest || entry.id > latest.id) latest = entry;
  }
  return latest;
}
