import type {
  ChatMessage,
  FollowUpChatMessage,
  MonitoringPayload,
} from "@/llama-cpp";

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
  // Which driver this fault was diagnosed for — null for "skipped" entries
  // (no driver was selected when the fault came in). Lets the driver-facing
  // UI find "my" latest diagnostic without guessing from active-driver state.
  driverProfileId: number | null;
  // null while the entry is "skipped" — there was no driver profile to
  // build a prompt from yet.
  prompt: ChatMessage[] | null;
  status: DiagnosticStatus;
  // Condensed output from the on-board llama.cpp model — the "query" the
  // paper describes, built from the prompt above.
  summary: string | null;
  response: string | null;
  error: string | null;
  respondedAt: string | null;
  // Driver's binary helpful/not-helpful signal (paper's feedback module,
  // layer 1) — null until the driver responds. See POST
  // /api/diagnostics/:id/feedback.
  feedback: boolean | null;
  // Follow-up conversation with the on-board LLM, grounded in the cloud
  // diagnosis — only usable once `response` contains a cloudLlmResponse
  // (see POST /api/diagnostics/:id/chat).
  chat: FollowUpChatMessage[];
}

const MAX_ENTRIES = 200;

// Tracks the lifecycle of a fault event as it moves from raw telemetry to a
// condensed prompt, to an on-board summary, to a backend response, so the
// dashboard can visualize each stage of the pipeline.
export class DiagnosticStore {
  private entries: DiagnosticEntry[] = [];
  private nextId = 1;

  constructor(private readonly maxEntries = MAX_ENTRIES) {}

  create(
    payload: MonitoringPayload,
    prompt: ChatMessage[],
    driverProfileId: number,
  ): DiagnosticEntry {
    const entry: DiagnosticEntry = {
      id: this.nextId++,
      receivedAt: new Date().toISOString(),
      payload,
      driverProfileId,
      prompt,
      status: "summarizing",
      summary: null,
      response: null,
      error: null,
      respondedAt: null,
      feedback: null,
      chat: [],
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  // Recorded when a fault comes in with no driver selected — no prompt is
  // built, and the entry sits at "skipped" until someone selects a driver
  // and retries it.
  skip(payload: MonitoringPayload, reason: string): DiagnosticEntry {
    const entry: DiagnosticEntry = {
      id: this.nextId++,
      receivedAt: new Date().toISOString(),
      payload,
      driverProfileId: null,
      prompt: null,
      status: "skipped",
      summary: null,
      response: null,
      error: reason,
      respondedAt: null,
      feedback: null,
      chat: [],
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  // Re-runs a skipped (or previously failed) entry now that a driver is
  // available, reusing the same id so the dashboard updates it in place.
  retry(
    id: number,
    prompt: ChatMessage[],
    driverProfileId: number,
  ): DiagnosticEntry | undefined {
    return this.patch(id, {
      driverProfileId,
      prompt,
      status: "summarizing",
      summary: null,
      response: null,
      error: null,
      respondedAt: null,
      feedback: null,
      chat: [],
    });
  }

  // The on-board model produced a condensed summary; now waiting on the
  // backend for the final response.
  summarize(id: number, summary: string): DiagnosticEntry | undefined {
    return this.patch(id, { status: "sent", summary });
  }

  complete(id: number, response: string): DiagnosticEntry | undefined {
    return this.patch(id, {
      status: "completed",
      response,
      respondedAt: new Date().toISOString(),
    });
  }

  fail(id: number, error: string): DiagnosticEntry | undefined {
    return this.patch(id, {
      status: "error",
      error,
      respondedAt: new Date().toISOString(),
    });
  }

  // Driver's binary helpful/not-helpful signal — paper's feedback module,
  // layer 1. Can be called more than once if the driver changes their mind.
  setFeedback(id: number, helpful: boolean): DiagnosticEntry | undefined {
    return this.patch(id, { feedback: helpful });
  }

  appendChatMessages(
    id: number,
    messages: FollowUpChatMessage[],
  ): DiagnosticEntry | undefined {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return undefined;
    entry.chat = [...entry.chat, ...messages];
    return entry;
  }

  getAll(): DiagnosticEntry[] {
    return this.entries;
  }

  private patch(
    id: number,
    changes: Partial<DiagnosticEntry>,
  ): DiagnosticEntry | undefined {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) {
      return undefined;
    }
    Object.assign(entry, changes);
    return entry;
  }
}
