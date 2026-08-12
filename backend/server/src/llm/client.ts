import { env } from "@/config/env";
import { traceStage } from "@/lib/trace";
import type { ChatMessage } from "./prompt";

export interface CloudLlmResult {
  content: string;
  model: string;
  baseUrl: string;
}

interface ChatCompletionsResponse {
  choices?: { message?: { content?: string } }[];
}

// Sends the assembled prompt to the cloud response-generator LLM. Targets
// the OpenAI-compatible chat-completions shape that Groq, OpenAI,
// together.ai, and self-hosted llama.cpp/vLLM servers all speak, so
// switching providers or pointing at your own model is just a matter of
// changing CLOUD_LLM_BASE_URL / CLOUD_LLM_MODEL / CLOUD_LLM_API_KEY in the
// environment — no code change. CLOUD_LLM_API_KEY is optional: omit it for
// providers (e.g. a local server) that don't need bearer auth.
export async function callCloudLlm(
  messages: ChatMessage[],
): Promise<CloudLlmResult> {
  return traceStage(
    "llm.cloud_completion",
    async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (env.CLOUD_LLM_API_KEY) {
        headers.Authorization = `Bearer ${env.CLOUD_LLM_API_KEY}`;
      }

      const response = await fetch(`${env.CLOUD_LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: env.CLOUD_LLM_MODEL, messages }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Cloud LLM request failed (${response.status}): ${body.slice(0, 500)}`,
        );
      }

      const data = (await response.json()) as ChatCompletionsResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("Cloud LLM returned an empty response");
      }

      return {
        content: content.trim(),
        model: env.CLOUD_LLM_MODEL,
        baseUrl: env.CLOUD_LLM_BASE_URL,
      };
    },
    (result) => result,
  );
}
