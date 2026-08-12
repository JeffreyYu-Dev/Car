import { add, scale, softmax, zeros } from "@/lib/vector-math";
import { previewVector, recordTraceStage } from "@/lib/trace";
import type { HistoricalMatch } from "./historical-store";

export interface AggregateResult {
  finalEmbedding: number[];
  // z(qk, qinit) per match, same order as the input `matches` array.
  weights: number[];
}

// q_final = alpha * q_init + (1 - alpha) * sum_k z(qk, qinit) * qk
// where z(qk, qinit) = softmax over cosine(qinit, qk) for the K same-prefix
// historical queries. See paper Eq. (1).
export function aggregateQueryEmbedding(input: {
  queryEmbedding: number[];
  matches: HistoricalMatch[];
  alpha: number;
}): AggregateResult {
  const { queryEmbedding, matches, alpha } = input;

  if (matches.length === 0) {
    recordTraceStage("augmentation.aggregate", {
      alpha,
      matchCount: 0,
      weights: [],
      note: "no same-prefix historical matches; final embedding equals query embedding",
      finalEmbedding: previewVector(queryEmbedding),
    });
    return { finalEmbedding: queryEmbedding, weights: [] };
  }

  const weights = softmax(matches.map((m) => m.similarity));

  const weightedHistorical = matches.reduce(
    (acc, match, i) => add(acc, scale(match.embedding, weights[i]!)),
    zeros(queryEmbedding.length),
  );

  const finalEmbedding = add(
    scale(queryEmbedding, alpha),
    scale(weightedHistorical, 1 - alpha),
  );

  recordTraceStage("augmentation.aggregate", {
    alpha,
    matchCount: matches.length,
    weights: matches.map((m, i) => ({
      qdrantPointId: m.qdrantPointId,
      similarity: m.similarity,
      weight: weights[i],
    })),
    queryEmbedding: previewVector(queryEmbedding),
    finalEmbedding: previewVector(finalEmbedding),
  });

  return { finalEmbedding, weights };
}
