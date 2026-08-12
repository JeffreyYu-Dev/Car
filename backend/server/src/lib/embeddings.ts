import { env } from "@/config/env";
import { previewVector, traceStage } from "@/lib/trace";

interface EmbeddingResponse {
  data: { embedding: number[] }[];
}

// Calls the llama.cpp server (started with --embedding) hosting
// Qwen3-Embedding-0.6B via its OpenAI-compatible endpoint.
export async function embedText(text: string): Promise<number[]> {
  return traceStage(
    "embedding.generate",
    async () => {
      const response = await fetch(`${env.EMBEDDING_URL}/v1/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });

      if (!response.ok) {
        throw new Error(
          `Embedding request failed with status ${response.status}: ${await response.text()}`,
        );
      }

      const data = (await response.json()) as EmbeddingResponse;
      const embedding = data.data[0]?.embedding;
      if (!embedding) {
        throw new Error("Embedding response did not contain a vector");
      }

      return embedding;
    },
    (embedding) => ({
      endpoint: `${env.EMBEDDING_URL}/v1/embeddings`,
      text,
      ...previewVector(embedding),
    }),
  );
}
