import z from "zod";

const createEnv = () => {
  const envSchema = z.object({
    DATABASE_URL: z.string(),
    QDRANT_API_KEY: z.string(),
    QDRANT_ENDPOINT: z.string(),
    // llama.cpp server (started with --embedding) that turns query text into
    // vectors for both historical-query matching and knowledge retrieval.
    EMBEDDING_URL: z.string().default("http://localhost:8080"),
    // Must match the embedding model's output dimension (Qwen3-Embedding-0.6B = 1024).
    EMBEDDING_DIM: z.coerce.number().default(1024),
    // alpha in q_final = alpha*q_init + (1-alpha)*sum(z_k * q_k)
    QUERY_AUGMENTATION_ALPHA: z.coerce.number().min(0).max(1).default(0.5),
    // K: number of same-prefix historical queries to blend in.
    HISTORICAL_QUERY_TOP_K: z.coerce.number().default(5),
    // Feedback module's reinsertion step: a historical query/response pair
    // is fed back into the RAG knowledge base once its expert score (0-1)
    // reaches this threshold, independent of driverHelpful — the paper notes
    // even driver-unhelpful responses can be valuable (negative) examples.
    REINSERTION_EXPERT_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
    // Cloud response-generator LLM. Any OpenAI-compatible chat-completions
    // endpoint works here (Groq, OpenAI, together.ai, a self-hosted
    // llama.cpp/vLLM server, ...) — swapping providers is just changing
    // these three values, not the code. Defaults to Groq's free Llama 3.3
    // 70B model.
    CLOUD_LLM_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
    CLOUD_LLM_MODEL: z.string().default("llama-3.3-70b-versatile"),
    // Sent as `Authorization: Bearer <key>` when set. Left unset, requests
    // go out with no auth header (e.g. a local llama.cpp server).
    CLOUD_LLM_API_KEY: z.string().optional(),
  });

  const { success, data } = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    QDRANT_ENDPOINT: process.env.QDRANT_ENDPOINT,
    EMBEDDING_URL: process.env.EMBEDDING_URL,
    EMBEDDING_DIM: process.env.EMBEDDING_DIM,
    QUERY_AUGMENTATION_ALPHA: process.env.QUERY_AUGMENTATION_ALPHA,
    HISTORICAL_QUERY_TOP_K: process.env.HISTORICAL_QUERY_TOP_K,
    REINSERTION_EXPERT_SCORE_THRESHOLD: process.env.REINSERTION_EXPERT_SCORE_THRESHOLD,
    CLOUD_LLM_BASE_URL: process.env.CLOUD_LLM_BASE_URL,
    CLOUD_LLM_MODEL: process.env.CLOUD_LLM_MODEL,
    CLOUD_LLM_API_KEY: process.env.CLOUD_LLM_API_KEY,
  });

  if (!success) {
    throw new Error("Invalid Env");
  }

  return data ?? {};
};

export const env = createEnv();
