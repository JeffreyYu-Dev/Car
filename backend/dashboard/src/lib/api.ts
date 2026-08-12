// The browser (client fetches, WebSocket) reaches the backend via its
// published host port. Route loaders can also run on the server (SSR)
// though, where "localhost" means the dashboard container itself, not the
// backend — that needs the backend's in-network service address instead.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
const SERVER_API_URL =
  (import.meta.env.VITE_API_URL_INTERNAL as string | undefined) ?? API_URL;

function baseUrl(): string {
  return typeof window === "undefined" ? SERVER_API_URL : API_URL;
}

export interface TraceStage {
  name: string;
  startedAt: string;
  durationMs: number;
  data?: unknown;
  error?: string;
}

export interface Trace {
  id: number;
  method: string;
  path: string;
  timestamp: string;
  request: {
    query: Record<string, string>;
    body: unknown;
  };
  stages: TraceStage[];
  // False while the request is still moving through the pipeline.
  finished: boolean;
  status?: number;
  durationMs?: number;
  response?: unknown;
  error?: string;
}

export async function fetchTraces(): Promise<Trace[]> {
  const res = await fetch(`${baseUrl()}/api/traces`);
  if (!res.ok) throw new Error(`Failed to fetch traces: ${res.status}`);
  return res.json();
}

export async function fetchTrace(id: number | string): Promise<Trace> {
  const res = await fetch(`${baseUrl()}/api/traces/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch trace ${id}: ${res.status}`);
  return res.json();
}

export type KnowledgeSourceType =
  | "manual"
  | "service_bulletin"
  | "recall_notice"
  | "forum"
  | "feedback"
  | "other";

export interface KnowledgeEntry {
  id: number;
  qdrantPointId: string;
  content: string;
  source: string | null;
  sourceType: KnowledgeSourceType;
  reliabilityScore: number;
  createdAt: string;
}

export async function fetchKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const res = await fetch(`${baseUrl()}/api/knowledge`);
  if (!res.ok) throw new Error(`Failed to fetch knowledge entries: ${res.status}`);
  return res.json();
}

export async function ingestKnowledgeText(input: {
  content: string;
  source?: string;
  sourceType: KnowledgeSourceType;
  reliabilityScore: number;
}): Promise<void> {
  const res = await fetch(`${baseUrl()}/api/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ? JSON.stringify(body.error) : `Ingest failed: ${res.status}`);
  }
}

export async function uploadKnowledgeFile(input: {
  file: File;
  source?: string;
  sourceType: KnowledgeSourceType;
  reliabilityScore: number;
}): Promise<void> {
  const form = new FormData();
  form.set("file", input.file);
  if (input.source) form.set("source", input.source);
  form.set("sourceType", input.sourceType);
  form.set("reliabilityScore", String(input.reliabilityScore));

  const res = await fetch(`${baseUrl()}/api/knowledge/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ? JSON.stringify(body.error) : `Upload failed: ${res.status}`);
  }
}

export async function deleteKnowledgeEntry(id: number): Promise<void> {
  const res = await fetch(`${baseUrl()}/api/knowledge/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete knowledge entry: ${res.status}`);
}

export async function clearKnowledgeBase(): Promise<{ deletedCount: number }> {
  const res = await fetch(`${baseUrl()}/api/knowledge`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to clear knowledge base: ${res.status}`);
  return res.json();
}

// Paper's action module: severity the cloud LLM classified the response as,
// and the delivery channel deterministically derived from it (see backend
// src/action/deliver.ts).
export type Severity = "critical" | "reminder" | "advisory";
export type DeliveryChannel = "dashboard_alert" | "dashboard_reminder" | "memo";

export interface HistoricalQuery {
  id: number;
  qdrantPointId: string;
  prefix: string;
  queryText: string;
  driverProfileId: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  responseText: string | null;
  driverHelpful: boolean | null;
  expertScore: number | null;
  severity: Severity | null;
  deliveryChannel: DeliveryChannel | null;
  insertedIntoKnowledgeBase: boolean;
  knowledgeEntryId: number | null;
  createdAt: string;
}

export async function fetchHistoricalQueries(): Promise<HistoricalQuery[]> {
  const res = await fetch(`${baseUrl()}/api/historical-queries`);
  if (!res.ok) throw new Error(`Failed to fetch historical queries: ${res.status}`);
  return res.json();
}

export async function setExpertScore(id: number, expertScore: number): Promise<HistoricalQuery> {
  const res = await fetch(`${baseUrl()}/api/historical-queries/${id}/expert-score`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expertScore }),
  });
  if (!res.ok) throw new Error(`Failed to set expert score: ${res.status}`);
  return res.json();
}

export function subscribeToTraces(onTrace: (trace: Trace) => void): () => void {
  const wsUrl = `${API_URL.replace(/^http/, "ws")}/api/traces/stream`;
  const socket = new WebSocket(wsUrl);
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse((event as MessageEvent).data) as {
        type: string;
        trace: Trace;
      };
      if (message.type === "trace") onTrace(message.trace);
    } catch {
      // ignore malformed messages
    }
  });
  return () => socket.close();
}
