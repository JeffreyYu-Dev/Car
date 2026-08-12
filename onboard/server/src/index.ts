import { serve } from "bun";
import app from "@/frontend/index.html";
import dashboard from "@/frontend/dashboard.html";
import db from "@/db";
import { driverProfile } from "@/db/schemas/driver-profile";
import {
  getActiveDriverId,
  getActiveDriverProfile,
  setActiveDriverId,
} from "@/active-driver";
import { env } from "@/config/env";
import { DiagnosticStore, type DiagnosticEntry } from "@/diagnostics/store";
import { generateRandomFault } from "@/fault-simulator";
import { LogStore } from "@/frontend/logs/store";
import {
  buildDiagnosticPrompt,
  buildDriverProfile,
  buildQueryPrefix,
  chatFollowUp,
  summarizeWithLocalModel,
  type ChatMessage,
  type DriverProfile,
  type FollowUpChatMessage,
  type MonitoringPayload,
} from "@/llama-cpp";

const logStore = new LogStore();
const diagnosticStore = new DiagnosticStore();

const LOGS_TOPIC = "logs";
const DIAGNOSTICS_TOPIC = "diagnostics";
const ACTIVE_DRIVER_TOPIC = "active-driver";

function broadcastDiagnostic(entry: DiagnosticEntry) {
  server.publish(
    DIAGNOSTICS_TOPIC,
    JSON.stringify({ kind: "diagnostic", data: entry }),
  );
}

function recordLog(payload: MonitoringPayload) {
  const entry = logStore.add(payload);
  server.publish(LOGS_TOPIC, JSON.stringify({ kind: "log", data: entry }));
}

// The backend's full JSON response is stored as-is on entry.response (see
// sendSummaryToBackend) — this pulls out the two fields the feedback/chat
// endpoints below need from it.
function parseBackendResponse(
  entry: DiagnosticEntry,
): { historicalQueryId: number | null; cloudLlmResponse: string | null } | null {
  if (!entry.response) return null;
  try {
    const parsed = JSON.parse(entry.response) as {
      historicalQueryId?: number | null;
      cloudLlmResponse?: string | null;
    };
    return {
      historicalQueryId: parsed.historicalQueryId ?? null,
      cloudLlmResponse: parsed.cloudLlmResponse ?? null,
    };
  } catch {
    return null;
  }
}

async function sendSummaryToBackend(
  entryId: number,
  summary: string,
  profile: DriverProfile,
) {
  try {
    const response = await fetch(`${env.backendUrl}/api/vehicle-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: buildQueryPrefix(profile),
        query: summary,
        driverProfileId: profile.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    const message =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const updated = diagnosticStore.complete(entryId, message);
    if (updated) broadcastDiagnostic(updated);
  } catch (err) {
    const updated = diagnosticStore.fail(
      entryId,
      err instanceof Error ? err.message : "Failed to reach backend",
    );
    if (updated) broadcastDiagnostic(updated);
  }
}

async function runDiagnosticPipeline(
  entryId: number,
  prompt: ChatMessage[],
  profile: DriverProfile,
) {
  let summary: string;
  try {
    summary = await summarizeWithLocalModel(prompt);
  } catch (err) {
    const updated = diagnosticStore.fail(
      entryId,
      err instanceof Error
        ? `On-board summary failed: ${err.message}`
        : "On-board summary failed",
    );
    if (updated) broadcastDiagnostic(updated);
    return;
  }

  const updated = diagnosticStore.summarize(entryId, summary);
  if (updated) broadcastDiagnostic(updated);

  await sendSummaryToBackend(entryId, summary, profile);
}

async function handleFault(payload: MonitoringPayload) {
  const profile = await getActiveDriverProfile();
  if (!profile) {
    const entry = diagnosticStore.skip(
      payload,
      "No driver selected. Choose a driver on the vehicle's home screen, then retry.",
    );
    broadcastDiagnostic(entry);
    return;
  }

  const prompt = buildDiagnosticPrompt(payload, profile);
  const entry = diagnosticStore.create(payload, prompt, profile.id);
  broadcastDiagnostic(entry);
  await runDiagnosticPipeline(entry.id, prompt, profile);
}

const server = serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    if (server.upgrade(req) && url.pathname === "/ws") {
      return;
    }

    return new Response("Upgrade failed", { status: 500 });
  },

  websocket: {
    open(ws) {
      ws.subscribe(LOGS_TOPIC);
      ws.subscribe(DIAGNOSTICS_TOPIC);
      ws.subscribe(ACTIVE_DRIVER_TOPIC);
    },
    message(ws, message) {
      let payload: MonitoringPayload | null;
      try {
        console.log(message.toString());
        payload = JSON.parse(message.toString());
        if (!payload) {
          return;
        }

        recordLog(payload);
        if (!payload.status.healthy) {
          void handleFault(payload);
        }
      } catch {
        return;
      }
    },
  },

  routes: {
    "/": app,
    "/dashboard": dashboard,
    "/api/llm": {
      async POST(req) {
        server.timeout(req, 0);

        const response = await fetch(
          "http://llama-cpp:8080/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: "how to make chocolate chip cookies?",
                },
              ],
            }),
          },
        );

        const data = await response.json();
        console.log(data);
        return Response.json(data);
      },
    },
    "/api/logs": {
      async GET() {
        return Response.json(logStore.getAll());
      },
    },
    "/api/simulate-fault": {
      async POST() {
        const ecu = await generateRandomFault();
        const payload: MonitoringPayload = {
          status: { fault: ecu.Fault, healthy: false },
          ecu,
        };
        recordLog(payload);
        void handleFault(payload);
        return Response.json(payload, { status: 202 });
      },
    },
    "/api/diagnostics": {
      async GET() {
        return Response.json(diagnosticStore.getAll());
      },
    },
    "/api/diagnostics/:id/retry": {
      async POST(req) {
        const id = Number(req.params.id);
        const entry = diagnosticStore.getAll().find((e) => e.id === id);
        if (!entry) {
          return Response.json(
            { error: "Diagnostic not found" },
            { status: 404 },
          );
        }

        const profile = await getActiveDriverProfile();
        if (!profile) {
          return Response.json(
            { error: "No driver selected" },
            { status: 409 },
          );
        }

        const prompt = buildDiagnosticPrompt(entry.payload, profile);
        const updated = diagnosticStore.retry(entry.id, prompt, profile.id);
        if (!updated) {
          return Response.json(
            { error: "Diagnostic not found" },
            { status: 404 },
          );
        }

        broadcastDiagnostic(updated);
        void runDiagnosticPipeline(updated.id, prompt, profile);
        return Response.json(updated);
      },
    },
    // Driver's binary helpful/not-helpful signal on a completed diagnosis —
    // paper's feedback module, layer 1 ("simple binary feedback from
    // drivers"). Forwarded to the backend's historical_queries row so it's
    // available for the layer-2 expert review too.
    "/api/diagnostics/:id/feedback": {
      async POST(req) {
        const id = Number(req.params.id);
        const entry = diagnosticStore.getAll().find((e) => e.id === id);
        if (!entry) {
          return Response.json(
            { error: "Diagnostic not found" },
            { status: 404 },
          );
        }

        let body: { helpful: boolean };
        try {
          body = await req.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        if (typeof body.helpful !== "boolean") {
          return Response.json(
            { error: "helpful must be a boolean" },
            { status: 400 },
          );
        }

        const backendResponse = parseBackendResponse(entry);
        if (backendResponse?.historicalQueryId != null) {
          try {
            await fetch(
              `${env.backendUrl}/api/historical-queries/${backendResponse.historicalQueryId}/feedback`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ driverHelpful: body.helpful }),
              },
            );
          } catch {
            // Best-effort — still reflect the feedback locally even if the
            // backend is unreachable.
          }
        }

        const updated = diagnosticStore.setFeedback(id, body.helpful);
        if (updated) broadcastDiagnostic(updated);
        return Response.json(updated);
      },
    },
    // Follow-up Q&A with the on-board LLM, grounded in the cloud diagnosis
    // once it exists — "a way to talk with the local LLM with the returned
    // data from the cloud if there is enough data". Rejects with 409 while
    // there isn't a cloud diagnosis yet.
    "/api/diagnostics/:id/chat": {
      async POST(req) {
        const id = Number(req.params.id);
        const entry = diagnosticStore.getAll().find((e) => e.id === id);
        if (!entry) {
          return Response.json(
            { error: "Diagnostic not found" },
            { status: 404 },
          );
        }

        let body: { message: string };
        try {
          body = await req.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        if (typeof body.message !== "string" || body.message.trim().length === 0) {
          return Response.json(
            { error: "message is required" },
            { status: 400 },
          );
        }

        const backendResponse = parseBackendResponse(entry);
        if (!backendResponse?.cloudLlmResponse) {
          return Response.json(
            {
              error:
                "Not enough data yet — wait for the cloud diagnosis before asking follow-up questions.",
            },
            { status: 409 },
          );
        }

        const profile = entry.driverProfileId
          ? await buildDriverProfile(entry.driverProfileId)
          : null;

        const userMessage: FollowUpChatMessage = {
          role: "user",
          content: body.message.trim(),
        };
        const withUser = diagnosticStore.appendChatMessages(id, [userMessage]);
        if (withUser) broadcastDiagnostic(withUser);

        try {
          const reply = await chatFollowUp(
            entry.payload,
            profile,
            backendResponse.cloudLlmResponse,
            withUser?.chat ?? [userMessage],
          );
          const updated = diagnosticStore.appendChatMessages(id, [
            { role: "assistant", content: reply },
          ]);
          if (updated) broadcastDiagnostic(updated);
          return Response.json(updated);
        } catch (err) {
          return Response.json(
            {
              error:
                err instanceof Error ? err.message : "Follow-up chat failed",
            },
            { status: 502 },
          );
        }
      },
    },
    "/api/active-driver": {
      async GET() {
        const profile = await getActiveDriverProfile();
        return Response.json({ driverId: getActiveDriverId(), profile });
      },

      async POST(req) {
        let body: { driverId: number | null };
        try {
          body = await req.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { driverId } = body;
        if (driverId !== null && typeof driverId !== "number") {
          return Response.json(
            { error: "driverId must be a number or null" },
            { status: 400 },
          );
        }

        if (driverId !== null) {
          const profile = await buildDriverProfile(driverId);
          if (!profile) {
            return Response.json(
              { error: "Driver not found" },
              { status: 404 },
            );
          }
        }

        setActiveDriverId(driverId);
        const profile = await getActiveDriverProfile();
        server.publish(
          ACTIVE_DRIVER_TOPIC,
          JSON.stringify({
            kind: "active-driver",
            data: { driverId, profile },
          }),
        );
        return Response.json({ driverId, profile });
      },
    },
    "/api/profile": {
      // gets all profiles
      async GET(req) {
        const profiles = await db.select().from(driverProfile);
        return Response.json(profiles);
      },

      // creates new profile
      async POST(req) {
        let body: Record<string, unknown>;
        try {
          body = await req.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        try {
          const [profile] = await db
            .insert(driverProfile)
            .values({
              name: body.name as string,
              age: body.age as number,
              licenseType: body.licenseType as
                "learner" | "intermediate" | "full",
              yearsExperience: body.yearsExperience as
                "<1" | "1-3" | "3-10" | "10+",
              mechanicalActions: (body.mechanicalActions as string[]) ?? [],
              selfRatedProficiency: body.selfRatedProficiency as
                "novice" | "basic" | "intermediate" | "advanced",
              preferredGuidanceStyle: body.preferredGuidanceStyle as
                "safety_only" | "technical" | "both",
              physicalLimitations: (body.physicalLimitations as string[]) ?? [],
              physicalLimitationsOther:
                (body.physicalLimitationsOther as string | null) ?? null,
              maintenanceRelationship: (body.maintenanceRelationship ??
                null) as "diy" | "mechanic" | "mix" | null,
            })
            .returning();
          return Response.json(profile, { status: 201 });
        } catch (err) {
          return Response.json(
            {
              error:
                err instanceof Error ? err.message : "Failed to save profile",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});

console.log(`Server is listening on ${server.url.href}`);
console.log(`Web is running on ${server.url.href}`);
console.log(`websockets is running on ws://${server.url.host}`);
