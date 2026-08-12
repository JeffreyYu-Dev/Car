import { desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { knowledgeEntries } from "@/db/schemas/knowledge-entries";
import { client } from "@/qdrant";
import {
  KNOWLEDGE_BASE_COLLECTION,
  ensureKnowledgeBaseCollection,
} from "@/qdrant/collections";
import { embedText } from "@/lib/embeddings";
import { traceStage } from "@/lib/trace";

export type KnowledgeSourceType =
  | "manual"
  | "service_bulletin"
  | "recall_notice"
  | "forum"
  | "feedback"
  | "other";

export interface IngestKnowledgeInput {
  content: string;
  source?: string | null;
  sourceType?: KnowledgeSourceType;
  reliabilityScore?: number;
}

export interface IngestedChunk {
  id: number;
  qdrantPointId: string;
  content: string;
}

const CHUNK_SIZE = 1500; // characters — keeps each embedded chunk retrieval-sized
const CHUNK_OVERLAP = 150;

// Splits a long document into retrieval-sized chunks instead of embedding
// the whole thing as one vector — the paper's knowledge retrieval selects
// the "top M items", which only makes sense at chunk granularity, not
// whole-manual granularity. Splits on paragraph boundaries where possible;
// a paragraph longer than chunkSize gets hard-cut with overlap so it isn't
// silently dropped.
export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < para.length; i += chunkSize - overlap) {
        chunks.push(para.slice(i, i + chunkSize));
      }
      continue;
    }

    if (current.length + para.length + 2 > chunkSize) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

// Chunks, embeds, and stores a document in both Qdrant (vector, for search)
// and Postgres (structured record, for listing/management in the
// dashboard) — same dual-store pattern as historical queries.
export async function ingestKnowledge(
  input: IngestKnowledgeInput,
): Promise<IngestedChunk[]> {
  const sourceType = input.sourceType ?? "other";
  const reliabilityScore = input.reliabilityScore ?? 1;
  const source = input.source ?? null;
  const chunks = chunkText(input.content);

  return traceStage(
    "knowledge.ingest",
    async () => {
      const results: IngestedChunk[] = [];

      for (const content of chunks) {
        const embedding = await embedText(content);
        const qdrantPointId = crypto.randomUUID();

        await client.upsert(KNOWLEDGE_BASE_COLLECTION, {
          points: [
            {
              id: qdrantPointId,
              vector: embedding,
              payload: { content, source, sourceType, reliabilityScore },
            },
          ],
        });

        const [row] = await db
          .insert(knowledgeEntries)
          .values({ qdrantPointId, content, source, sourceType, reliabilityScore })
          .returning();

        if (!row) {
          throw new Error("Failed to persist knowledge entry");
        }

        results.push({ id: row.id, qdrantPointId, content });
      }

      return results;
    },
    (results) => ({
      source,
      sourceType,
      reliabilityScore,
      chunkCount: results.length,
    }),
  );
}

export async function listKnowledgeEntries() {
  return db
    .select()
    .from(knowledgeEntries)
    .orderBy(desc(knowledgeEntries.createdAt));
}

// Removes both the Postgres record and its Qdrant vector so it stops
// surfacing in retrieval immediately.
export async function deleteKnowledgeEntry(id: number) {
  const [row] = await db
    .delete(knowledgeEntries)
    .where(eq(knowledgeEntries.id, id))
    .returning();

  if (row) {
    await client.delete(KNOWLEDGE_BASE_COLLECTION, {
      points: [row.qdrantPointId],
    });
  }

  return row ?? null;
}

// Wipes the entire knowledge base — every Postgres row and the whole Qdrant
// collection — for starting over (e.g. re-ingesting a cleaned-up manual set)
// instead of deleting entries one at a time. Recreates the Qdrant collection
// immediately after dropping it so ingestion/retrieval keep working without
// a server restart.
export async function clearKnowledgeBase(): Promise<{ deletedCount: number }> {
  return traceStage(
    "knowledge.clear",
    async () => {
      const deleted = await db.delete(knowledgeEntries).returning({ id: knowledgeEntries.id });

      await client.deleteCollection(KNOWLEDGE_BASE_COLLECTION);
      await ensureKnowledgeBaseCollection();

      return { deletedCount: deleted.length };
    },
    (result) => result,
  );
}
