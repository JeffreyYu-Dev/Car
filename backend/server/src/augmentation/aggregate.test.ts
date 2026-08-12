import { describe, expect, test } from "bun:test";
import { aggregateQueryEmbedding } from "./aggregate";

describe("aggregateQueryEmbedding", () => {
  test("returns q_init unchanged when there are no historical matches", () => {
    const queryEmbedding = [1, 0, 0];
    const { finalEmbedding, weights } = aggregateQueryEmbedding({
      queryEmbedding,
      matches: [],
      alpha: 0.5,
    });

    expect(finalEmbedding).toEqual(queryEmbedding);
    expect(weights).toEqual([]);
  });

  test("weights favor the more similar historical query", () => {
    const { weights } = aggregateQueryEmbedding({
      queryEmbedding: [1, 0],
      matches: [
        { qdrantPointId: "a", queryText: "close", embedding: [1, 0], similarity: 0.9 },
        { qdrantPointId: "b", queryText: "far", embedding: [0, 1], similarity: 0.1 },
      ],
      alpha: 0.5,
    });

    expect(weights[0]!).toBeGreaterThan(weights[1]!);
    expect(weights[0]! + weights[1]!).toBeCloseTo(1, 10);
  });

  test("alpha=1 ignores historical queries entirely", () => {
    const queryEmbedding = [1, 2, 3];
    const { finalEmbedding } = aggregateQueryEmbedding({
      queryEmbedding,
      matches: [
        { qdrantPointId: "a", queryText: "x", embedding: [10, 10, 10], similarity: 0.99 },
      ],
      alpha: 1,
    });

    expect(finalEmbedding).toEqual(queryEmbedding);
  });

  test("alpha=0 uses only the (softmax-weighted) historical query", () => {
    const { finalEmbedding } = aggregateQueryEmbedding({
      queryEmbedding: [1, 0],
      matches: [
        { qdrantPointId: "a", queryText: "x", embedding: [5, 5], similarity: 0.5 },
      ],
      alpha: 0,
    });

    // Single match => softmax weight is 1, so result equals that embedding.
    expect(finalEmbedding[0]!).toBeCloseTo(5, 10);
    expect(finalEmbedding[1]!).toBeCloseTo(5, 10);
  });
});
