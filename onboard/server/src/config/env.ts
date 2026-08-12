import z from "zod";

const createEnv = () => {
  const envSchema = z.object({
    database: z.string(),
    // Base URL of the backend service that receives the condensed vehicle
    // health prompt and generates the diagnostic response.
    backendUrl: z.string().default("http://localhost:4000"),
    // Base URL of the on-board llama.cpp server that condenses the prompt
    // into a short summary before it's sent to the backend.
    llamaUrl: z.string().default("http://llama-cpp:8080"),
  });

  const { success, data } = envSchema.safeParse({
    database: process.env.DATABASE,
    backendUrl: process.env.BACKEND_URL,
    llamaUrl: process.env.LLAMA_URL,
  });

  if (!success) {
    throw new Error("invalid .env file");
  }

  return data ?? {};
};

export const env = createEnv();
