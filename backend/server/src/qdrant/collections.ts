import { client } from "@/qdrant";
import { env } from "@/config/env";

export const HISTORICAL_QUERIES_COLLECTION = "historical_queries";

// Populated via POST /api/knowledge and /api/knowledge/upload (manuals,
// service bulletins, recall notices, forums — see src/knowledge/ingest.ts).
// Retrieval against it degrades gracefully (see src/knowledge/retrieval.ts)
// while it's still empty.
export const KNOWLEDGE_BASE_COLLECTION = "knowledge_base";

export async function ensureHistoricalQueriesCollection() {
  const exists = await client.collectionExists(HISTORICAL_QUERIES_COLLECTION);
  if (exists.exists) return;

  await client.createCollection(HISTORICAL_QUERIES_COLLECTION, {
    vectors: { size: env.EMBEDDING_DIM, distance: "Cosine" },
  });

  // Historical-query matching is always scoped to queries sharing the same
  // predefined prefix, so index it for fast filtered search.
  await client.createPayloadIndex(HISTORICAL_QUERIES_COLLECTION, {
    field_name: "prefix",
    field_schema: "keyword",
  });
}

export async function ensureKnowledgeBaseCollection() {
  const exists = await client.collectionExists(KNOWLEDGE_BASE_COLLECTION);
  if (exists.exists) return;

  await client.createCollection(KNOWLEDGE_BASE_COLLECTION, {
    vectors: { size: env.EMBEDDING_DIM, distance: "Cosine" },
  });
}
