import { env } from "@/config/env";
import { traceStage } from "@/lib/trace";
import { ingestKnowledge } from "@/knowledge/ingest";
import { markInsertedIntoKnowledgeBase } from "@/augmentation/historical-store";
import type { SelectHistoricalQuery } from "@/db/schemas/historical-queries";

// Paper's feedback module, closing loop: "the top-scoring query-response
// pairs, regardless of whether they were positive or negative examples, are
// selected for insertion into the RAG knowledge database." "Positive or
// negative" refers to the driver's layer-1 helpful/not-helpful signal, which
// is deliberately not part of the selection criterion here — the paper notes
// an expert can rate a driver-unhelpful response highly if it's still a
// valuable (e.g. instructive negative) example. Selection is driven purely
// by the layer-2 expert score, since that's the paper's final, most
// authoritative signal.
//
// Called whenever an expert score is set (see PATCH
// /api/historical-queries/:id/expert-score in src/index.tsx). Idempotent:
// a pair is only ever inserted once (insertedIntoKnowledgeBase guards it),
// even if the expert later edits the score again.
export async function maybeReinsertIntoKnowledgeBase(
  query: SelectHistoricalQuery,
): Promise<{ inserted: boolean; knowledgeEntryId?: number }> {
  if (query.insertedIntoKnowledgeBase) {
    return { inserted: false };
  }
  if (!query.responseText) {
    return { inserted: false };
  }
  const expertScore = query.expertScore;
  if (expertScore === null || expertScore < env.REINSERTION_EXPERT_SCORE_THRESHOLD) {
    return { inserted: false };
  }

  return traceStage(
    "feedback.reinsert_into_knowledge_base",
    async () => {
      const vehicle = [query.vehicleYear, query.vehicleMake, query.vehicleModel]
        .filter(Boolean)
        .join(" ");

      const content = [
        `Query: ${query.queryText}`,
        `Response: ${query.responseText}`,
      ].join("\n\n");

      const [entry] = await ingestKnowledge({
        content,
        source: `Historical query #${query.id}${vehicle ? ` (${vehicle})` : ""}`,
        sourceType: "feedback",
        // Reliability of a feedback-derived entry is the expert's own score —
        // it feeds directly into searchKnowledgeBase's reliability-weighted
        // ranking (src/knowledge/retrieval.ts).
        reliabilityScore: expertScore,
      });

      if (!entry) {
        throw new Error("Failed to ingest feedback pair into knowledge base");
      }

      await markInsertedIntoKnowledgeBase(query.id, entry.id);

      return { inserted: true, knowledgeEntryId: entry.id };
    },
    (result) => ({
      historicalQueryId: query.id,
      expertScore: query.expertScore,
      threshold: env.REINSERTION_EXPERT_SCORE_THRESHOLD,
      ...result,
    }),
  );
}
