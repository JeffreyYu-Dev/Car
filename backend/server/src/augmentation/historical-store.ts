import { desc, eq } from "drizzle-orm";
import { client } from "@/qdrant";
import { HISTORICAL_QUERIES_COLLECTION } from "@/qdrant/collections";
import { db } from "@/db/db";
import { historicalQueries } from "@/db/schemas/historical-queries";
import { traceStage } from "@/lib/trace";

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
}

export interface HistoricalMatch {
  qdrantPointId: string;
  queryText: string;
  embedding: number[];
  // Cosine similarity to the incoming query, as scored by Qdrant.
  similarity: number;
}

// Finds past queries that share the same predefined prefix as the incoming
// one — the prefix bound keeps semantically-unrelated-but-lexically-similar
// queries out of the match set (see paper section "Knowledge Retrieval
// Module").
export async function findSimilarHistoricalQueries(input: {
  prefix: string;
  embedding: number[];
  topK: number;
}): Promise<HistoricalMatch[]> {
  return traceStage(
    "qdrant.historical_search",
    async () => {
      const { points } = await client.query(HISTORICAL_QUERIES_COLLECTION, {
        query: input.embedding,
        limit: input.topK,
        with_vector: true,
        with_payload: true,
        filter: {
          must: [{ key: "prefix", match: { value: input.prefix } }],
        },
      });

      return points.map((r) => ({
        qdrantPointId: String(r.id),
        queryText: (r.payload?.queryText as string) ?? "",
        embedding: r.vector as number[],
        similarity: r.score,
      }));
    },
    (matches) => ({
      collection: HISTORICAL_QUERIES_COLLECTION,
      prefix: input.prefix,
      topK: input.topK,
      matchCount: matches.length,
      matches: matches.map((m) => ({
        qdrantPointId: m.qdrantPointId,
        queryText: m.queryText,
        similarity: m.similarity,
      })),
    }),
  );
}

// Persists the incoming query so future vehicles' queries can be augmented
// with it. Written to both stores: Qdrant holds the embedding for
// similarity search, Postgres holds the structured record (driver/vehicle
// linkage, and later the response + feedback scores).
export async function recordHistoricalQuery(input: {
  prefix: string;
  queryText: string;
  embedding: number[];
  driverProfileId?: number | null;
  vehicle?: VehicleInfo;
}): Promise<{ pgId: number; qdrantPointId: string }> {
  return traceStage(
    "persist.record_historical_query",
    async () => {
      const qdrantPointId = crypto.randomUUID();

      await client.upsert(HISTORICAL_QUERIES_COLLECTION, {
        points: [
          {
            id: qdrantPointId,
            vector: input.embedding,
            payload: {
              prefix: input.prefix,
              queryText: input.queryText,
              driverProfileId: input.driverProfileId ?? null,
              vehicleMake: input.vehicle?.make ?? null,
              vehicleModel: input.vehicle?.model ?? null,
              vehicleYear: input.vehicle?.year ?? null,
            },
          },
        ],
      });

      const [row] = await db
        .insert(historicalQueries)
        .values({
          qdrantPointId,
          prefix: input.prefix,
          queryText: input.queryText,
          driverProfileId: input.driverProfileId ?? null,
          vehicleMake: input.vehicle?.make ?? null,
          vehicleModel: input.vehicle?.model ?? null,
          vehicleYear: input.vehicle?.year ?? null,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to persist historical query");
      }

      return { pgId: row.id, qdrantPointId };
    },
    (result) => ({
      qdrantCollection: HISTORICAL_QUERIES_COLLECTION,
      postgresTable: "historical_queries",
      prefix: input.prefix,
      queryText: input.queryText,
      driverProfileId: input.driverProfileId ?? null,
      vehicle: input.vehicle ?? null,
      ...result,
    }),
  );
}

// Fills in the cloud LLM's response once it's generated, along with the
// action module's severity classification and derived delivery channel (see
// src/action/deliver.ts), so the row is ready for the feedback module
// (driver + expert review both read/write this same record).
export async function setHistoricalQueryResponse(
  id: number,
  input: {
    responseText: string;
    severity: string;
    deliveryChannel: string;
  },
) {
  const [row] = await db
    .update(historicalQueries)
    .set({
      responseText: input.responseText,
      severity: input.severity,
      deliveryChannel: input.deliveryChannel,
    })
    .where(eq(historicalQueries.id, id))
    .returning();
  return row ?? null;
}

// Paper's feedback module, layer 1: simple binary feedback from drivers
// ("helpful or not helpful") on the response they received.
export async function setDriverFeedback(id: number, helpful: boolean) {
  const [row] = await db
    .update(historicalQueries)
    .set({ driverHelpful: helpful })
    .where(eq(historicalQueries.id, id))
    .returning();
  return row ?? null;
}

// Paper's feedback module, layer 2: a human professional's nuanced score
// (relevance, technical accuracy, safety compliance, clarity) — deliberately
// independent of driverHelpful, since the paper notes an unhelpful-to-the-
// driver response can still be a valuable (low-scored) training example.
export async function setExpertScore(id: number, score: number) {
  const [row] = await db
    .update(historicalQueries)
    .set({ expertScore: score })
    .where(eq(historicalQueries.id, id))
    .returning();
  return row ?? null;
}

// Marks a historical query as fed back into the RAG knowledge base, and
// links the resulting knowledge_entries row — see src/feedback/reinsertion.ts.
export async function markInsertedIntoKnowledgeBase(id: number, knowledgeEntryId: number) {
  const [row] = await db
    .update(historicalQueries)
    .set({ insertedIntoKnowledgeBase: true, knowledgeEntryId })
    .where(eq(historicalQueries.id, id))
    .returning();
  return row ?? null;
}

export async function listHistoricalQueries() {
  return db
    .select()
    .from(historicalQueries)
    .orderBy(desc(historicalQueries.createdAt));
}
