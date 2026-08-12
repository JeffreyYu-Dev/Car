import type { EngineReading } from "@/frontend/logs/types";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

// A message in the follow-up conversation with the on-board LLM (distinct
// from ChatMessage above, which is the fixed system/user summarization
// prompt) — see DiagnosisPanel's chat UI.
export interface FollowUpMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MonitoringPayload {
  status: {
    fault: number | string;
    healthy: boolean;
  };
  ecu: EngineReading;
}

export type DiagnosticStatus =
  | "summarizing"
  | "sent"
  | "completed"
  | "error"
  | "skipped";

export interface DiagnosticEntry {
  id: number;
  receivedAt: string;
  payload: MonitoringPayload;
  // Which driver this fault was diagnosed for — null for "skipped" entries.
  driverProfileId: number | null;
  prompt: ChatMessage[] | null;
  status: DiagnosticStatus;
  summary: string | null;
  response: string | null;
  error: string | null;
  respondedAt: string | null;
  // Driver's helpful/not-helpful signal (paper's feedback module, layer 1).
  feedback: boolean | null;
  // Follow-up Q&A with the on-board LLM, grounded in the cloud diagnosis.
  chat: FollowUpMessage[];
}

// Paper's action module (backend/server/src/action/deliver.ts): the severity
// the cloud LLM classified the response as, and the delivery channel
// deterministically derived from it.
export type Severity = "critical" | "reminder" | "advisory";
export type DeliveryChannel = "dashboard_alert" | "dashboard_reminder" | "memo";

export interface DiagnosisAction {
  message: string;
  severity: Severity;
  deliveryChannel: DeliveryChannel;
  usedFallback: boolean;
}

// Shape of the JSON string stored in DiagnosticEntry.response (the
// backend's full /api/vehicle-query response — see backend/server/src/
// index.tsx).
export interface BackendResponsePayload {
  historicalQueryId?: number | null;
  matchedHistoricalQueries?: {
    queryText: string;
    similarity: number;
    weight: number;
  }[];
  retrievedKnowledge?: {
    content: string;
    source?: string;
    relevance?: number;
    reliabilityScore?: number;
    rank?: number;
  }[];
  cloudLlmPrompt?: ChatMessage[];
  // Raw text from the cloud LLM — now a JSON-encoded {message, severity}
  // string (see backend's llm/prompt.ts), so driver-facing UI should prefer
  // `action` below instead of rendering this directly.
  cloudLlmResponse?: string | null;
  cloudLlmError?: string | null;
  action?: DiagnosisAction | null;
}

export function parseBackendResponse(
  entry: Pick<DiagnosticEntry, "response">,
): BackendResponsePayload | null {
  if (!entry.response) return null;
  try {
    return JSON.parse(entry.response) as BackendResponsePayload;
  } catch {
    return null;
  }
}
