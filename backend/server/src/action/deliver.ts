import { recordTraceStage } from "@/lib/trace";

// Paper's action module (Fig. 2c / "Action Module and Feedback Module"): once
// the cloud LLM has produced a personalized warning, this module decides how
// it's conveyed to the driver by selecting from three delivery methods based
// on severity — critical faults get an urgent dashboard alert with an audio
// alarm, less-urgent issues get a dashboard reminder shown at an appropriate
// time, and non-fault recommendations become a passive memo the driver can
// consult at their convenience.
export const SEVERITIES = ["critical", "reminder", "advisory"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const DELIVERY_CHANNELS = [
  "dashboard_alert",
  "dashboard_reminder",
  "memo",
] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

// Deterministic per the paper: the action module's job is choosing the
// channel, not the LLM's — severity is the only input.
const CHANNEL_BY_SEVERITY: Record<Severity, DeliveryChannel> = {
  critical: "dashboard_alert",
  reminder: "dashboard_reminder",
  advisory: "memo",
};

export interface ActionResult {
  message: string;
  severity: Severity;
  deliveryChannel: DeliveryChannel;
  // True when the cloud LLM's output couldn't be parsed as the expected
  // {message, severity} JSON and a fallback heuristic was used instead.
  usedFallback: boolean;
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}

// The cloud LLM is instructed to return raw JSON, but models sometimes wrap
// it in a markdown code fence anyway — strip that before parsing.
function extractJsonPayload(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

// Best-effort severity guess for responses that fail JSON parsing, so the
// driver still gets a delivery channel instead of the request failing
// outright. Defaults to "reminder" — safer than silently downgrading a
// possibly-critical warning to a passive memo, but not as alarming as
// forcing every unparseable response into a dashboard alert.
function fallbackClassify(raw: string): { message: string; severity: Severity } {
  const lower = raw.toLowerCase();
  let severity: Severity = "reminder";
  if (/\bcritical\b|\bunsafe\b|do not drive|pull over/.test(lower)) {
    severity = "critical";
  } else if (/\badvisory\b|\brecommend/.test(lower) && !/\breminder\b/.test(lower)) {
    severity = "advisory";
  }
  return { message: raw.trim(), severity };
}

// Parses the cloud LLM's structured output and deterministically maps its
// severity classification to a delivery channel (see paper section "Action
// Module and Feedback Module").
export function runActionModule(rawResponse: string): ActionResult {
  let message: string;
  let severity: Severity;
  let usedFallback = false;

  try {
    const parsed = JSON.parse(extractJsonPayload(rawResponse)) as {
      message?: unknown;
      severity?: unknown;
    };
    if (typeof parsed.message === "string" && isSeverity(parsed.severity)) {
      message = parsed.message;
      severity = parsed.severity;
    } else {
      throw new Error("Missing or invalid message/severity fields");
    }
  } catch {
    usedFallback = true;
    const fallback = fallbackClassify(rawResponse);
    message = fallback.message;
    severity = fallback.severity;
  }

  const result: ActionResult = {
    message,
    severity,
    deliveryChannel: CHANNEL_BY_SEVERITY[severity],
    usedFallback,
  };

  recordTraceStage("action.deliver", result);

  return result;
}
