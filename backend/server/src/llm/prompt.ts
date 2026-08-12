import { recordTraceStage } from "@/lib/trace";
import type { KnowledgeItem } from "@/knowledge/retrieval";
import type { VehicleInfo } from "@/augmentation/historical-store";

// Mirrors onboard/server/src/db/schemas/driver-profile.ts. The backend has no
// access to onboard's sqlite db, so the caller (on-board unit) sends the
// profile fields relevant to personalization alongside the query.
export interface DriverProfile {
  name?: string;
  age?: number;
  licenseType?: "learner" | "intermediate" | "full";
  yearsExperience?: "<1" | "1-3" | "3-10" | "10+";
  selfRatedProficiency?: "novice" | "basic" | "intermediate" | "advanced";
  preferredGuidanceStyle?: "safety_only" | "technical" | "both";
  physicalLimitations?: string[];
  maintenanceRelationship?: "diy" | "mechanic" | "mix";
}

export interface BuildCloudLlmPromptInput {
  prefix: string;
  initialQuery: string;
  driverProfile?: DriverProfile | null;
  vehicle?: VehicleInfo;
  knowledge: KnowledgeItem[];
  matchedHistoricalQueries: {
    queryText: string;
    similarity: number;
  }[];
}

// Mirrors onboard's ChatMessage (src/llama-cpp.ts) — the standard
// system/user chat-completions shape, so both the on-board and cloud prompts
// render the same way in their respective dashboards and can be sent
// directly to any OpenAI-compatible chat completions endpoint.
export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export type CloudLlmPrompt = ChatMessage[];

const SYSTEM_PROMPT = `You are the response-generating LLM in an on-board diagnostics (OBD) system for vehicles. A lightweight on-board LLM has already condensed raw sensor data and the driver's profile into the query below; your job is to reason over it, the retrieved knowledge, and the driver profile to produce a single personalized vehicle health warning.

Rules:
- Ground every factual/technical claim in the retrieved knowledge below. If the knowledge doesn't cover something, say so instead of guessing — do not hallucinate part numbers, diagnostic codes, or procedures.
- Diagnose from the evidence, don't just describe it. The query gives you raw sensor readings; the retrieved knowledge should give you what counts as a normal range and what patterns of deviation mean (e.g. what an elevated-CO-and-HC pattern indicates, vs. a low-MAP-with-reduced-power pattern, vs. contradictory/implausible readings suggesting a sensor fault rather than a real mechanical issue). Use the retrieved knowledge to interpret the readings yourself — name the likely condition and its real-world consequence, don't just restate "some readings are elevated."
- Tailor tone and technical depth to the driver profile: novice/safety_only drivers get plain-language, reassurance-oriented guidance (is it safe to keep driving, what to do next); advanced/technical drivers get precise diagnostic detail (codes, part numbers, procedures).
- Account for the driver's physical limitations when recommending self-repair vs. professional service (e.g. don't suggest lifting heavy components to a driver who can't).
- Classify the severity of the situation as exactly one of the three below. Base the call on how far the readings deviate from the normal ranges in the retrieved knowledge and how many systems are affected together, not on pattern-matching a single example:
  - "critical" — the evidence indicates it's unsafe to continue driving right now, or immediate action is required: multiple readings are severely outside the normal ranges described in the retrieved knowledge in a way that matches a hazardous pattern there (e.g. a combustion or safety-relevant fault with real consequences like component damage or fire risk), or the retrieved knowledge explicitly says to stop driving / pull over for a pattern like this one.
  - "reminder" — a real, active fault is present (a nonzero fault code, or one or more readings clearly outside normal per the retrieved knowledge) but nothing in the evidence indicates it's dangerous to keep driving carefully in the near term. This is the right call when there's a genuine fault but the deviation is moderate, or when the readings are ambiguous/contradictory enough that the retrieved knowledge would call it an uncertain diagnosis rather than a specific hazardous one.
  - "advisory" — no active fault at all (fault code 0 / all readings within the normal ranges); only habit or maintenance-lifespan tips, nothing to act on now.
  A reported fault code by itself is never "advisory" — it's always at least "reminder". Don't reflexively default to "reminder" out of caution, and don't reflexively escalate to "critical" either — reason about the actual magnitude and pattern of deviation using the retrieved knowledge, the same way a technician would compare a reading against a spec before deciding it's a problem.
- Do not decide the delivery channel yourself — the severity you choose determines it deterministically downstream.
- Respond with ONLY a single JSON object (no markdown fences, no prose outside it) matching this shape:
  {"message": "<short driver-facing message>", "severity": "critical" | "reminder" | "advisory"}`;

function formatDriverProfile(profile?: DriverProfile | null): string {
  if (!profile) return "No driver profile available — use general, cautious guidance.";

  const lines = [
    profile.name && `Name: ${profile.name}`,
    profile.age !== undefined && `Age: ${profile.age}`,
    profile.licenseType && `License: ${profile.licenseType}`,
    profile.yearsExperience && `Driving experience: ${profile.yearsExperience} years`,
    profile.selfRatedProficiency && `Self-rated mechanical proficiency: ${profile.selfRatedProficiency}`,
    profile.preferredGuidanceStyle && `Preferred guidance style: ${profile.preferredGuidanceStyle}`,
    profile.maintenanceRelationship && `Maintenance relationship: ${profile.maintenanceRelationship}`,
    profile.physicalLimitations?.length
      ? `Physical limitations: ${profile.physicalLimitations.join(", ")}`
      : undefined,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "No driver profile available — use general, cautious guidance.";
}

function formatVehicle(vehicle?: VehicleInfo): string {
  if (!vehicle || (!vehicle.make && !vehicle.model && !vehicle.year)) {
    return "Unknown vehicle.";
  }
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

function formatKnowledge(knowledge: KnowledgeItem[]): string {
  if (knowledge.length === 0) {
    return "(none retrieved — the RAG knowledge base may not be ingested yet; answer conservatively and say a definitive diagnosis isn't available.)";
  }
  return knowledge
    .map(
      (item, i) =>
        `[${i + 1}] (relevance ${(item.relevance * 100).toFixed(0)}%, reliability ${item.reliabilityScore.toFixed(2)}${item.source ? `, source: ${item.source}` : ""})\n${item.content}`,
    )
    .join("\n\n");
}

function formatHistoricalContext(
  matches: { queryText: string; similarity: number }[],
): string {
  if (matches.length === 0) return "(none — no similar past queries were found)";
  return matches
    .map((m) => `- "${m.queryText}" (${(m.similarity * 100).toFixed(0)}% similar)`)
    .join("\n");
}

// Assembles the final augmented query sent to the cloud LLM: driver profile +
// vehicle + the on-board LLM's initial query + retrieved RAG knowledge (see
// paper section "Knowledge Retrieval Module" — "The knowledge, driver
// profile, and queries are combined and fed to the cloud LLM"). Similar
// historical queries are included as context only, since q_final (the
// embedding blended with them) is used purely for retrieval, not as the
// literal text handed to the LLM.
export function buildCloudLlmPrompt(input: BuildCloudLlmPromptInput): CloudLlmPrompt {
  const user = `## Vehicle
${formatVehicle(input.vehicle)}

## Driver Profile
${formatDriverProfile(input.driverProfile)}

## Vehicle Health Query
${input.prefix}
Query: ${input.initialQuery}

## Similar Past Queries (other vehicles, for context only)
${formatHistoricalContext(input.matchedHistoricalQueries)}

## Retrieved Knowledge
${formatKnowledge(input.knowledge)}

Generate the personalized vehicle health warning now.`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];

  recordTraceStage("llm.build_prompt", { messages });

  return messages;
}
