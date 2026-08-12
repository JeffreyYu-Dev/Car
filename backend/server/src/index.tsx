import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";
import z from "zod";
import { runWithTrace, TraceStore } from "@/lib/trace";
import {
  ensureHistoricalQueriesCollection,
  ensureKnowledgeBaseCollection,
} from "./qdrant/collections";
import { augmentQuery } from "./augmentation/query-augmentation";
import {
  listHistoricalQueries,
  setDriverFeedback,
  setExpertScore,
  setHistoricalQueryResponse,
} from "./augmentation/historical-store";
import { searchKnowledgeBase } from "./knowledge/retrieval";
import {
  clearKnowledgeBase,
  deleteKnowledgeEntry,
  ingestKnowledge,
  listKnowledgeEntries,
  type KnowledgeSourceType,
} from "./knowledge/ingest";
import { extractPdfText } from "./knowledge/pdf";
import { buildCloudLlmPrompt } from "./llm/prompt";
import { callCloudLlm } from "./llm/client";
import { maybeReinsertIntoKnowledgeBase } from "./feedback/reinsertion";
import { runActionModule } from "./action/deliver";

const app = new Hono();
const traceStore = new TraceStore();
const { upgradeWebSocket, websocket } = createBunWebSocket();

app.use("*", cors());

// Wraps each LLM query pipeline request (POST /api/vehicle-query) in a trace
// context so any traceStage/recordTraceStage call made anywhere downstream
// (embeddings, qdrant, postgres, ...) attaches to the same trace. A trace is
// recorded as soon as the request starts (status "in progress") and updated
// live as each stage completes, then finalized once the response is ready —
// the same start -> per-stage -> finish lifecycle as onboard's
// DiagnosticStore. See src/lib/trace.ts and the GET /api/traces* endpoints
// below.
app.use("*", async (c, next) => {
  // The dashboard only cares about the LLM query pipeline itself — health
  // checks and the dashboard's own polling/streaming of trace data would
  // otherwise pollute the log with low-signal entries.
  if (c.req.path !== "/api/vehicle-query") {
    return next();
  }

  const start = performance.now();
  const timestamp = new Date().toISOString();
  const query = Object.fromEntries(new URL(c.req.url).searchParams);

  let body: unknown = undefined;
  if (!["GET", "HEAD"].includes(c.req.method)) {
    try {
      body = await c.req.json();
    } catch {
      body = undefined;
    }
  }

  const trace = traceStore.start({
    method: c.req.method,
    path: c.req.path,
    timestamp,
    request: { query, body },
  });

  let error: string | undefined;
  const { promise } = runWithTrace(
    () => next(),
    (stage) => traceStore.appendStage(trace.id, stage),
  );
  try {
    await promise;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  let response: unknown;
  try {
    response = await c.res.clone().json();
  } catch {
    response = undefined;
  }

  traceStore.finish(trace.id, {
    status: c.res.status,
    durationMs: Math.round(performance.now() - start),
    response,
    error,
  });

  if (error) throw new Error(error);
});

await ensureHistoricalQueriesCollection();
await ensureKnowledgeBaseCollection();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", (c) => {
  return c.text("ok");
});

const vehicleQuerySchema = z.object({
  // Predefined prefix generated on-board, e.g.
  // "Error Type: Engine; Driver Experience: Inadequate".
  prefix: z.string().min(1),
  query: z.string().min(1),
  driverProfileId: z.number().int().nullish(),
  // The backend has no access to onboard's sqlite db, so the on-board unit
  // sends the profile fields needed for personalization alongside the query.
  driverProfile: z
    .object({
      name: z.string().optional(),
      age: z.number().int().optional(),
      licenseType: z.enum(["learner", "intermediate", "full"]).optional(),
      yearsExperience: z.enum(["<1", "1-3", "3-10", "10+"]).optional(),
      selfRatedProficiency: z
        .enum(["novice", "basic", "intermediate", "advanced"])
        .optional(),
      preferredGuidanceStyle: z
        .enum(["safety_only", "technical", "both"])
        .optional(),
      physicalLimitations: z.array(z.string()).optional(),
      maintenanceRelationship: z.enum(["diy", "mechanic", "mix"]).optional(),
    })
    .nullish(),
  vehicle: z
    .object({
      make: z.string().optional(),
      model: z.string().optional(),
      year: z.number().int().optional(),
    })
    .optional(),
  topM: z.number().int().positive().default(5),
});

// Takes the on-board LLM's condensed query, augments it with relevant
// historical queries from other vehicles (see src/augmentation), retrieves
// the top-M matching knowledge base entries for it, builds the final
// system/user prompt that goes to the cloud LLM (see src/llm/prompt.ts),
// then sends it to the cloud LLM (see src/llm/client.ts — any
// OpenAI-compatible provider, swappable via env config). The persisted
// historical_queries row is filled in with the response below, so it's
// ready for the feedback module (see PATCH /api/historical-queries/:id/*).
app.post("/api/vehicle-query", async (c) => {
  const parsed = vehicleQuerySchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { prefix, query, driverProfileId, driverProfile, vehicle, topM } =
    parsed.data;

  const augmented = await augmentQuery({
    prefix,
    queryText: query,
    driverProfileId,
    vehicle,
  });

  const knowledge = await searchKnowledgeBase(augmented.finalEmbedding, topM);

  const cloudLlmPrompt = buildCloudLlmPrompt({
    prefix,
    initialQuery: query,
    driverProfile,
    vehicle,
    knowledge,
    matchedHistoricalQueries: augmented.matchedHistoricalQueries,
  });

  // Degrades gracefully (like knowledge retrieval above) rather than
  // failing the whole request — lets the pipeline up to and including the
  // prompt be inspected even without CLOUD_LLM_API_KEY configured.
  let cloudLlmResponse: string | null = null;
  let cloudLlmError: string | null = null;
  try {
    const result = await callCloudLlm(cloudLlmPrompt);
    cloudLlmResponse = result.content;
  } catch (err) {
    cloudLlmError = err instanceof Error ? err.message : String(err);
    console.warn(`Cloud LLM call failed: ${cloudLlmError}`);
  }

  // Action module (paper section "Action Module and Feedback Module"):
  // classifies severity and deterministically derives the delivery channel
  // the driver-facing message should be conveyed through.
  let action: ReturnType<typeof runActionModule> | null = null;
  if (cloudLlmResponse) {
    action = runActionModule(cloudLlmResponse);
    await setHistoricalQueryResponse(augmented.historicalQueryId, {
      responseText: cloudLlmResponse,
      severity: action.severity,
      deliveryChannel: action.deliveryChannel,
    });
  }

  return c.json({
    historicalQueryId: augmented.historicalQueryId,
    matchedHistoricalQueries: augmented.matchedHistoricalQueries,
    retrievedKnowledge: knowledge,
    cloudLlmPrompt,
    cloudLlmResponse,
    cloudLlmError,
    action,
  });
});

const KNOWLEDGE_SOURCE_TYPES = [
  "manual",
  "service_bulletin",
  "recall_notice",
  "forum",
  "other",
] as const satisfies readonly KnowledgeSourceType[];

const ingestKnowledgeSchema = z.object({
  content: z.string().min(1),
  source: z.string().optional(),
  sourceType: z.enum(KNOWLEDGE_SOURCE_TYPES).default("other"),
  reliabilityScore: z.number().min(0).max(1).default(1),
});

// Adds material to the RAG knowledge base by pasting text directly —
// e.g. a manual excerpt, a service bulletin, a recall notice, or a forum
// thread. Long content is chunked (see src/knowledge/ingest.ts) so
// retrieval works at paragraph granularity rather than whole-document
// granularity.
app.post("/api/knowledge", async (c) => {
  const parsed = ingestKnowledgeSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const chunks = await ingestKnowledge(parsed.data);
  return c.json({ chunks });
});

const KNOWLEDGE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024; // 20MB

// Same as POST /api/knowledge, but the content comes from an uploaded file
// (multipart/form-data) instead of pasted text — .pdf, .txt, and .md are
// supported. This is the "upload a manual" path.
app.post("/api/knowledge/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "Missing file" }, 400);
  }
  if (file.size > KNOWLEDGE_UPLOAD_MAX_BYTES) {
    return c.json({ error: "File exceeds 20MB limit" }, 400);
  }

  const sourceTypeParsed = z
    .enum(KNOWLEDGE_SOURCE_TYPES)
    .default("other")
    .safeParse(body.sourceType);
  const reliabilityParsed = z.coerce
    .number()
    .min(0)
    .max(1)
    .default(1)
    .safeParse(body.reliabilityScore);
  if (!sourceTypeParsed.success || !reliabilityParsed.success) {
    return c.json({ error: "Invalid sourceType or reliabilityScore" }, 400);
  }

  const source =
    typeof body.source === "string" && body.source.trim().length > 0
      ? body.source.trim()
      : file.name;

  let content: string;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    content = await extractPdfText(bytes);
  } else {
    // .txt, .md, or anything else — treat as plain text.
    content = await file.text();
  }

  if (content.trim().length === 0) {
    return c.json({ error: "No extractable text found in the uploaded file" }, 400);
  }

  const chunks = await ingestKnowledge({
    content,
    source,
    sourceType: sourceTypeParsed.data,
    reliabilityScore: reliabilityParsed.data,
  });
  return c.json({ chunks });
});

// Lists ingested knowledge base chunks for the dashboard's management page.
app.get("/api/knowledge", async (c) => {
  const entries = await listKnowledgeEntries();
  return c.json(entries);
});

app.delete("/api/knowledge/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const deleted = await deleteKnowledgeEntry(id);
  if (!deleted) {
    return c.json({ error: "Knowledge entry not found" }, 404);
  }
  return c.json(deleted);
});

// Wipes every entry from the RAG knowledge base — Postgres rows and the
// Qdrant collection — in one shot, for the dashboard's "Clear knowledge
// base" button. Registered after DELETE /api/knowledge/:id but the two
// don't collide: this is an exact path match, that one requires a segment.
app.delete("/api/knowledge", async (c) => {
  const result = await clearKnowledgeBase();
  return c.json(result);
});

// Lists persisted query/response pairs for the dashboard's feedback page —
// the "feed" the paper's feedback module reads from and writes back into.
app.get("/api/historical-queries", async (c) => {
  const rows = await listHistoricalQueries();
  return c.json(rows);
});

const driverFeedbackSchema = z.object({ driverHelpful: z.boolean() });

// Paper's feedback module, layer 1 — binary helpful/not-helpful signal from
// the driver. Called by onboard's POST /api/diagnostics/:id/feedback.
app.patch("/api/historical-queries/:id/feedback", async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = driverFeedbackSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const updated = await setDriverFeedback(id, parsed.data.driverHelpful);
  if (!updated) {
    return c.json({ error: "Historical query not found" }, 404);
  }
  return c.json(updated);
});

const expertScoreSchema = z.object({ expertScore: z.number().min(0).max(1) });

// Paper's feedback module, layer 2 — a human professional's nuanced score
// (relevance/accuracy/safety/clarity, collapsed to 0-1 here), independent of
// driverHelpful. Intended for the dashboard's feedback review page.
app.patch("/api/historical-queries/:id/expert-score", async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = expertScoreSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const updated = await setExpertScore(id, parsed.data.expertScore);
  if (!updated) {
    return c.json({ error: "Historical query not found" }, 404);
  }

  // Feedback module, closing loop: reinsert into the RAG knowledge base if
  // this pair just crossed the top-scoring threshold (no-op otherwise).
  const reinsertion = await maybeReinsertIntoKnowledgeBase(updated);
  if (reinsertion.inserted) {
    updated.insertedIntoKnowledgeBase = true;
    updated.knowledgeEntryId = reinsertion.knowledgeEntryId ?? null;
  }

  return c.json(updated);
});

// Full pipeline traces for the dashboard: incoming request, every
// embedding/db/vector-search stage in between, and the final response.
app.get("/api/traces", (c) => {
  return c.json(traceStore.getAll());
});

// Registered before /api/traces/:id — otherwise "stream" matches :id first
// and this route never gets hit.
// Live feed of new traces as they're recorded, for the dashboard.
app.get(
  "/api/traces/stream",
  upgradeWebSocket(() => {
    let unsubscribe: () => void = () => {};
    return {
      onOpen(_event, ws) {
        unsubscribe = traceStore.subscribe((trace) => {
          ws.send(JSON.stringify({ type: "trace", trace }));
        });
      },
      onClose() {
        unsubscribe();
      },
    };
  }),
);

app.get("/api/traces/:id", (c) => {
  const id = Number(c.req.param("id"));
  const trace = traceStore.getById(id);
  if (!trace) {
    return c.json({ error: "Trace not found" }, 404);
  }
  return c.json(trace);
});

export default {
  fetch: app.fetch,
  port: 4000,
  websocket,
};
