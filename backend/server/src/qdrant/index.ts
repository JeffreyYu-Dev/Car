import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/config/env";

// or connect to Qdrant Cloud
export const client = new QdrantClient({
  url: env.QDRANT_ENDPOINT,
  apiKey: env.QDRANT_API_KEY,
});
