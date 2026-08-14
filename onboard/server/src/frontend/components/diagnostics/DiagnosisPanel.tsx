import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Send,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Separator } from "@/frontend/components/ui/separator";
import { ActionMessage } from "@/frontend/components/diagnostics/DeliveryChannelIndicator";
import {
  parseBackendResponse,
  type DiagnosticEntry,
} from "@/frontend/diagnostics/types";
import { cn } from "@/frontend/lib/utils";

function StatusBadge({ status }: { status: DiagnosticEntry["status"] }) {
  switch (status) {
    case "summarizing":
      return (
        <Badge variant="secondary">
          <Loader2 className="animate-spin" />
          Analyzing the fault
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="secondary">
          <Loader2 className="animate-spin" />
          Waiting for diagnosis
        </Badge>
      );
    case "completed":
      return <Badge>Diagnosis ready</Badge>;
    case "error":
      return <Badge variant="destructive">Failed</Badge>;
    case "skipped":
      return <Badge variant="outline">Skipped</Badge>;
  }
}

function FeedbackButtons({ entry }: { entry: DiagnosticEntry }) {
  const [pending, setPending] = useState(false);

  async function submit(helpful: boolean) {
    setPending(true);
    try {
      const res = await fetch(`/api/diagnostics/${entry.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
      if (!res.ok) throw new Error("Failed to send feedback");
      toast.success("Thanks for the feedback");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send feedback");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-muted-foreground">Was this helpful?</p>
      <Button
        type="button"
        size="sm"
        variant={entry.feedback === true ? "default" : "outline"}
        disabled={pending}
        onClick={() => submit(true)}
      >
        <ThumbsUp />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={entry.feedback === false ? "default" : "outline"}
        disabled={pending}
        onClick={() => submit(false)}
      >
        <ThumbsDown />
      </Button>
    </div>
  );
}

function FollowUpChat({ entry }: { entry: DiagnosticEntry }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    setMessage("");
    try {
      const res = await fetch(`/api/diagnostics/${entry.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to reach the on-board assistant");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Ask a follow-up</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Answered on-vehicle by the local assistant, grounded in this diagnosis — no
        connection needed.
      </p>

      {entry.chat.length > 0 && (
        <div className="flex flex-col gap-2">
          {entry.chat.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-md px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {m.content}
            </div>
          ))}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Is it okay to drive to work tomorrow?"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !message.trim()}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}

export function DiagnosisPanel({ entry }: { entry: DiagnosticEntry }) {
  const backendResponse = parseBackendResponse(entry);
  const hasCloudDiagnosis = Boolean(backendResponse?.cloudLlmResponse);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="size-4" />
            Latest diagnostic
          </CardTitle>
          <CardDescription>
            {new Date(entry.receivedAt).toLocaleString()}
          </CardDescription>
        </div>
        <StatusBadge status={entry.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            The problem
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Fault {entry.payload.status.fault}</Badge>
          </div>
          {entry.summary ? (
            <p className="mt-2 text-sm">{entry.summary}</p>
          ) : entry.status === "summarizing" ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Condensing the sensor readings…
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No summary available.
            </p>
          )}
        </div>

        <Separator />

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Solution
          </p>
          {backendResponse?.action ? (
            <ActionMessage action={backendResponse.action} />
          ) : backendResponse?.cloudLlmResponse ? (
            <p className="whitespace-pre-wrap text-sm">
              {backendResponse.cloudLlmResponse}
            </p>
          ) : backendResponse?.cloudLlmError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{backendResponse.cloudLlmError}</p>
            </div>
          ) : entry.status === "sent" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Waiting for the cloud diagnosis…
            </p>
          ) : entry.status === "error" ? (
            <p className="text-sm text-destructive">{entry.error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not available yet.</p>
          )}
        </div>

        {hasCloudDiagnosis && (
          <>
            <Separator />
            <FeedbackButtons entry={entry} />
            <Separator />
            <FollowUpChat entry={entry} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
