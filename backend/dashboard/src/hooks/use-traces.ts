import { useEffect, useState } from "react";
import { fetchTraces, subscribeToTraces, type Trace } from "#/lib/api";

const MAX_TRACES = 200;

export function useTraces() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchTraces()
      .then((initial) => {
        if (cancelled) return;
        setTraces([...initial].reverse());
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    setConnected(true);
    const unsubscribe = subscribeToTraces((trace) => {
      setTraces((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === trace.id);
        if (existingIndex === -1) {
          return [trace, ...prev].slice(0, MAX_TRACES);
        }
        const next = [...prev];
        next[existingIndex] = trace;
        return next;
      });
    });

    return () => {
      cancelled = true;
      setConnected(false);
      unsubscribe();
    };
  }, []);

  return { traces, loading, error, connected };
}
