import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  Siren,
  Stethoscope,
  StickyNote,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/frontend/components/ui/empty";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { cn } from "@/frontend/lib/utils";
import type { ChatMessage, DiagnosticEntry } from "@/frontend/diagnostics/types";

const MAX_ROWS = 100;

type LoadState = "loading" | "error" | "ready";

function StatusBadge({ status }: { status: DiagnosticEntry["status"] }) {
  switch (status) {
    case "summarizing":
      return (
        <Badge variant="secondary">
          <Loader2 className="animate-spin" />
          Condensing on-board summary
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="secondary">
          <Loader2 className="animate-spin" />
          Waiting for backend
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default">
          <CheckCircle2 />
          Response received
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <XCircle />
          Failed
        </Badge>
      );
    case "skipped":
      return (
        <Badge variant="outline">
          <AlertCircle />
          No driver selected
        </Badge>
      );
  }
}

type StageStatus = "done" | "loading" | "pending" | "error" | "skipped";

interface Stage {
  title: string;
  description: string;
  status: StageStatus;
  content?: ReactNode;
}

function StageStatusBadge({ status }: { status: StageStatus }) {
  switch (status) {
    case "done":
      return (
        <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 />
          Done
        </Badge>
      );
    case "loading":
      return (
        <Badge variant="secondary">
          <Loader2 className="animate-spin" />
          In progress
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <XCircle />
          Failed
        </Badge>
      );
    case "skipped":
      return (
        <Badge variant="outline">
          <AlertCircle />
          Skipped
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Circle />
          Pending
        </Badge>
      );
  }
}

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  return (
    <Card
      className={cn(
        stage.status === "pending" && "opacity-60",
        stage.status === "error" && "border-destructive",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-sm">
          {index + 1}. {stage.title}
        </CardTitle>
        <StageStatusBadge status={stage.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{stage.description}</p>
        {stage.content}
      </CardContent>
    </Card>
  );
}

function EcuReadingGrid({ ecu }: { ecu: DiagnosticEntry["payload"]["ecu"] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted p-3 text-xs sm:grid-cols-3">
      {Object.entries(ecu).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-2">
          <span className="text-muted-foreground">{key}</span>
          <span className="font-medium">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function PromptMessages({ prompt }: { prompt: DiagnosticEntry["prompt"] }) {
  if (!prompt) return null;
  return (
    <div className="flex flex-col gap-2">
      {prompt.map((message, i) => (
        <div key={i} className="rounded-md border p-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            {message.role}
          </span>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
            {message.content}
          </pre>
        </div>
      ))}
    </div>
  );
}

type Severity = "critical" | "reminder" | "advisory";
type DeliveryChannel = "dashboard_alert" | "dashboard_reminder" | "memo";

interface DiagnosisAction {
  message: string;
  severity: Severity;
  deliveryChannel: DeliveryChannel;
  usedFallback: boolean;
}

interface BackendResponsePayload {
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
  // string (see backend's llm/prompt.ts); `action` below is the parsed,
  // driver-facing form and should be preferred for display.
  cloudLlmResponse?: string | null;
  cloudLlmError?: string | null;
  action?: DiagnosisAction | null;
}

const DELIVERY_CHANNEL_META: Record<
  DeliveryChannel,
  { label: string; icon: typeof Siren; className: string }
> = {
  dashboard_alert: {
    label: "Urgent alert",
    icon: Siren,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  dashboard_reminder: {
    label: "Reminder",
    icon: BellRing,
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  memo: {
    label: "Advisory memo",
    icon: StickyNote,
    className: "border-border bg-muted text-muted-foreground",
  },
};

// Full, un-truncated content — used for the diagnosis text and prompt/
// knowledge bodies below, as opposed to the line-clamped list rows.
function ExpandableText({ text, className }: { text: string; className?: string }) {
  return <p className={cn("whitespace-pre-wrap", className)}>{text}</p>;
}

function BackendResponseView({ response }: { response: string }) {
  let parsed: BackendResponsePayload | null = null;
  try {
    parsed = JSON.parse(response) as BackendResponsePayload;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return (
      <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
        {response}
      </p>
    );
  }

  const matches = parsed.matchedHistoricalQueries ?? [];
  const knowledge = parsed.retrievedKnowledge ?? [];

  return (
    <div className="flex flex-col gap-4 text-xs">
      {parsed.action ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border p-3",
            DELIVERY_CHANNEL_META[parsed.action.deliveryChannel].className,
          )}
        >
          {(() => {
            const Icon = DELIVERY_CHANNEL_META[parsed.action.deliveryChannel].icon;
            return <Icon className="mt-0.5 size-4 shrink-0" />;
          })()}
          <div className="flex flex-col gap-1">
            <p className="font-semibold uppercase text-muted-foreground">
              {DELIVERY_CHANNEL_META[parsed.action.deliveryChannel].label} (severity:{" "}
              {parsed.action.severity})
            </p>
            <ExpandableText text={parsed.action.message} className="text-sm text-foreground" />
          </div>
        </div>
      ) : (
        parsed.cloudLlmResponse && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="mb-1 font-semibold uppercase text-muted-foreground">
              Personalized diagnosis
            </p>
            <ExpandableText text={parsed.cloudLlmResponse} className="text-sm" />
          </div>
        )
      )}

      {parsed.cloudLlmError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="mb-1 font-semibold uppercase text-destructive">
            Cloud LLM error
          </p>
          <ExpandableText text={parsed.cloudLlmError} className="text-destructive" />
        </div>
      )}

      <div>
        <p className="mb-1 font-semibold uppercase text-muted-foreground">
          Matched historical queries ({matches.length})
        </p>
        <p className="mb-1 text-muted-foreground">
          Same-prefix queries from other vehicles blended into the retrieval
          embedding (q_final) — capped at the server's configured top-K.
        </p>
        {matches.length > 0 ? (
          <div className="flex flex-col gap-1">
            {matches.map((m, i) => (
              <div key={i} className="rounded-md border p-2">
                <ExpandableText text={m.queryText} />
                <p className="mt-1 text-muted-foreground">
                  similarity {m.similarity.toFixed(3)} · weight {m.weight.toFixed(3)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No same-prefix historical queries were similar enough to blend in.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1 font-semibold uppercase text-muted-foreground">
          Retrieved knowledge ({knowledge.length})
        </p>
        {knowledge.length > 0 ? (
          <div className="flex flex-col gap-1">
            {knowledge.map((k, i) => (
              <div key={i} className="rounded-md border p-2">
                <ExpandableText text={k.content} />
                <p className="mt-1 text-muted-foreground">
                  {k.source && <>source: {k.source} · </>}
                  {k.relevance !== undefined && (
                    <>relevance {k.relevance.toFixed(3)} · </>
                  )}
                  {k.reliabilityScore !== undefined && (
                    <>reliability {k.reliabilityScore.toFixed(2)}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Nothing came back from the knowledge base — it may still be empty.
          </p>
        )}
      </div>

      {parsed.cloudLlmPrompt && parsed.cloudLlmPrompt.length > 0 && (
        <div>
          <p className="mb-1 font-semibold uppercase text-muted-foreground">
            Prompt sent to the cloud LLM
          </p>
          <PromptMessages prompt={parsed.cloudLlmPrompt} />
        </div>
      )}
    </div>
  );
}

// Builds the fixed 4-stage pipeline view for a diagnostic entry: raw
// telemetry -> on-board prompt -> on-board summary -> backend diagnosis.
// Each stage's status is derived from the entry's lifecycle state so the
// dashboard shows exactly where a fault currently sits in the pipeline.
function buildStages(entry: DiagnosticEntry): Stage[] {
  const promptStatus: StageStatus = entry.prompt ? "done" : "skipped";

  const summaryStatus: StageStatus = !entry.prompt
    ? "skipped"
    : entry.summary
      ? "done"
      : entry.status === "summarizing"
        ? "loading"
        : entry.status === "error"
          ? "error"
          : "pending";

  const backendStatus: StageStatus =
    summaryStatus === "skipped"
      ? "skipped"
      : entry.status === "completed"
        ? "done"
        : entry.status === "sent"
          ? "loading"
          : entry.status === "error" && entry.summary
            ? "error"
            : "pending";

  return [
    {
      title: "ECU Telemetry",
      description:
        "Raw sensor readings captured from the engine control unit at the moment the fault was detected.",
      status: "done",
      content: <EcuReadingGrid ecu={entry.payload.ecu} />,
    },
    {
      title: "On-Board Prompt",
      description:
        "Vehicle telemetry and the driver's profile assembled into a prompt for the local model.",
      status: promptStatus,
      content: entry.prompt ? (
        <PromptMessages prompt={entry.prompt} />
      ) : (
        <p className="text-xs text-muted-foreground">
          No prompt was built — no driver was selected when this fault came in.
        </p>
      ),
    },
    {
      title: "On-Board Summary",
      description:
        "The on-board LLM condenses the prompt into a short, factual query — the only thing that leaves the vehicle.",
      status: summaryStatus,
      content:
        summaryStatus === "loading" ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Condensing the prompt into a short summary…
          </p>
        ) : entry.summary ? (
          <p className="rounded-md bg-muted p-3 text-xs">{entry.summary}</p>
        ) : summaryStatus === "error" ? (
          <p className="text-xs text-muted-foreground">
            The on-board model failed before it could summarize this fault.
          </p>
        ) : summaryStatus === "pending" ? (
          <p className="text-xs text-muted-foreground">Not started yet.</p>
        ) : null,
    },
    {
      title: "Backend Diagnosis",
      description:
        "The condensed query is sent to the cloud backend, which augments it with similar historical queries and retrieves relevant knowledge before generating personalized guidance.",
      status: backendStatus,
      content:
        backendStatus === "loading" ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Waiting for the backend to respond…
          </p>
        ) : entry.response ? (
          <BackendResponseView response={entry.response} />
        ) : backendStatus === "error" ? (
          <p className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            {entry.error}
          </p>
        ) : backendStatus === "pending" ? (
          <p className="text-xs text-muted-foreground">Not started yet.</p>
        ) : null,
    },
  ];
}

function DiagnosticCard({
  entry,
  canRetry,
  onRetry,
}: {
  entry: DiagnosticEntry;
  canRetry: boolean;
  onRetry: (id: number) => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const stages = buildStages(entry);

  async function handleRetry() {
    setRetrying(true);
    try {
      onRetry(entry.id);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-sm">
            Fault {entry.payload.status.fault} · Diagnostic #{entry.id}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(entry.receivedAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {stages.map((stage, i) => (
          <StageCard key={stage.title} stage={stage} index={i} />
        ))}

        {(entry.status === "skipped" || entry.status === "error") && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canRetry || retrying}
              onClick={handleRetry}
            >
              <RefreshCw />
              Retry
            </Button>
            {!canRetry && (
              <p className="mt-1 text-xs text-muted-foreground">
                Select a driver on the vehicle's home screen to retry.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DiagnosticsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [activeDriverId, setActiveDriverId] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/diagnostics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load diagnostics");
        return res.json() as Promise<DiagnosticEntry[]>;
      })
      .then((initial) => {
        if (cancelled) return;
        setEntries(initial.slice(-MAX_ROWS).reverse());
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    fetch("/api/active-driver")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { driverId: number | null } | null) => {
        if (!cancelled && data) setActiveDriverId(data.driverId);
      })
      .catch(() => {
        // best-effort
      });

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/`);
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as {
          kind?: string;
          data?: unknown;
        };

        if (message.kind === "active-driver") {
          const data = message.data as { driverId: number | null };
          setActiveDriverId(data.driverId);
          return;
        }

        if (message.kind !== "diagnostic" || !message.data) {
          return;
        }
        const entry = message.data as DiagnosticEntry;

        if (entry.status === "skipped") {
          toast.error("Fault detected with no driver selected", {
            description: entry.error ?? undefined,
          });
        }

        setEntries((prev) => {
          const existingIndex = prev.findIndex((e) => e.id === entry.id);
          if (existingIndex === -1) {
            return [entry, ...prev].slice(0, MAX_ROWS);
          }
          const next = [...prev];
          next[existingIndex] = entry;
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

  async function handleRetry(id: number) {
    try {
      const res = await fetch(`/api/diagnostics/${id}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to retry diagnostic");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to retry");
    }
  }

  async function handleSimulateFault() {
    setSimulating(true);
    try {
      const res = await fetch("/api/simulate-fault", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to simulate a fault");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to simulate fault");
    } finally {
      setSimulating(false);
    }
  }

  const simulateButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={simulating}
      onClick={handleSimulateFault}
    >
      {simulating ? <Loader2 className="animate-spin" /> : <Zap />}
      Simulate fault
    </Button>
  );

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="text-sm text-destructive">Failed to load diagnostics.</p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{simulateButton}</div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Stethoscope />
            </EmptyMedia>
            <EmptyTitle>No faults yet</EmptyTitle>
            <EmptyDescription>
              When a fault comes in, its prompt and backend response will
              appear here in real time. Use "Simulate fault" to test the
              pipeline without a real one.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{simulateButton}</div>
      {entries.map((entry) => (
        <DiagnosticCard
          key={entry.id}
          entry={entry}
          canRetry={activeDriverId !== null}
          onRetry={handleRetry}
        />
      ))}
    </div>
  );
}
