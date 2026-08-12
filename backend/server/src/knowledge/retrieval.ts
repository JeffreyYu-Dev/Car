import { client } from "@/qdrant";
import { KNOWLEDGE_BASE_COLLECTION } from "@/qdrant/collections";
import { previewVector, traceStage } from "@/lib/trace";

export interface KnowledgeItem {
  id: string;
  content: string;
  source?: string;
  // Qdrant cosine similarity to the query embedding.
  relevance: number;
  // Expert-verification / historical-feedback score stored on the entry
  // (paper's "pre-ranking mechanism"). Defaults to neutral (1) when absent.
  reliabilityScore: number;
  // Combined score used for final ranking.
  rank: number;
}

// Retrieves the top-M knowledge base entries for q_final.
//
// NOTE: ingestion (manuals, service bulletins, recall notices, forums) into
// the `knowledge_base` Qdrant collection is a separate pipeline that hasn't
// been built yet. Until it exists, this returns an empty list instead of
// throwing so the rest of the pipeline (query augmentation, historical
// storage) can be exercised standalone.
export async function searchKnowledgeBase(
  embedding: number[],
  topM: number,
  reliabilityWeight = 0.3,
): Promise<KnowledgeItem[]> {
  return traceStage(
    "qdrant.knowledge_search",
    async () => {
      let points;
      try {
        ({ points } = await client.query(KNOWLEDGE_BASE_COLLECTION, {
          query: embedding,
          limit: topM * 3, // over-fetch so reliability re-ranking has room to work with
          with_payload: true,
        }));
      } catch (err) {
        console.warn(
          `Knowledge base search failed (collection may not be ingested yet): ${
            err instanceof Error ? err.message : err
          }`,
        );
        return [];
      }

      return points
        .map((r) => {
          const reliabilityScore = (r.payload?.reliabilityScore as number) ?? 1;
          return {
            id: String(r.id),
            content: (r.payload?.content as string) ?? "",
            source: r.payload?.source as string | undefined,
            relevance: r.score,
            reliabilityScore,
            rank: (1 - reliabilityWeight) * r.score + reliabilityWeight * reliabilityScore,
          };
        })
        .sort((a, b) => b.rank - a.rank)
        .slice(0, topM);
    },
    (items) => ({
      collection: KNOWLEDGE_BASE_COLLECTION,
      queryEmbedding: previewVector(embedding),
      topM,
      reliabilityWeight,
      resultCount: items.length,
      items,
    }),
  );
}
