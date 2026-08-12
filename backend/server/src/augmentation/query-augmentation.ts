import { env } from "@/config/env";
import { embedText } from "@/lib/embeddings";
import { aggregateQueryEmbedding } from "./aggregate";
import {
  findSimilarHistoricalQueries,
  recordHistoricalQuery,
  type VehicleInfo,
} from "./historical-store";

export interface AugmentQueryInput {
  prefix: string;
  queryText: string;
  driverProfileId?: number | null;
  vehicle?: VehicleInfo;
  topK?: number;
  alpha?: number;
}

export interface AugmentQueryResult {
  historicalQueryId: number;
  qdrantPointId: string;
  queryEmbedding: number[];
  // Embedding to use for the downstream RAG knowledge-base search — blends
  // the incoming query with relevant historical queries from other vehicles.
  finalEmbedding: number[];
  matchedHistoricalQueries: {
    qdrantPointId: string;
    queryText: string;
    similarity: number;
    weight: number;
  }[];
}

export async function augmentQuery(
  input: AugmentQueryInput,
): Promise<AugmentQueryResult> {
  const alpha = input.alpha ?? env.QUERY_AUGMENTATION_ALPHA;
  const topK = input.topK ?? env.HISTORICAL_QUERY_TOP_K;

  const queryEmbedding = await embedText(input.queryText);

  const matches = await findSimilarHistoricalQueries({
    prefix: input.prefix,
    embedding: queryEmbedding,
    topK,
  });

  const { finalEmbedding, weights } = aggregateQueryEmbedding({
    queryEmbedding,
    matches,
    alpha,
  });

  // Persists the incoming query so future vehicles' queries can be
  // augmented with it (see findSimilarHistoricalQueries above), and so this
  // row exists for the feedback module once the cloud LLM responds —
  // index.tsx fills in responseText, then driver/expert feedback attach to
  // this same id.
  const persisted = await recordHistoricalQuery({
    prefix: input.prefix,
    queryText: input.queryText,
    embedding: queryEmbedding,
    driverProfileId: input.driverProfileId,
    vehicle: input.vehicle,
  });

  return {
    historicalQueryId: persisted.pgId,
    qdrantPointId: persisted.qdrantPointId,
    queryEmbedding,
    finalEmbedding,
    matchedHistoricalQueries: matches.map((m, i) => ({
      qdrantPointId: m.qdrantPointId,
      queryText: m.queryText,
      similarity: m.similarity,
      weight: weights[i]!,
    })),
  };
}
