// One-off data seeding script: fills the knowledge base (manuals, service
// bulletins, recall notices, forum threads) and generates ~400 synthetic
// driver queries (historical_queries) so the app has real data to demo
// against instead of empty collections.
//
// Run from backend/server with the embedding server reachable at
// EMBEDDING_URL (defaults to localhost:8080; the docker-compose embedding
// service is published on 5173 on the host):
//
//   EMBEDDING_URL=http://localhost:5173 bun run scripts/seed.ts
//
// Talks directly to the same modules the HTTP API uses (ingestKnowledge,
// augmentQuery, ...) rather than going through the server over HTTP, so it
// does NOT call the cloud LLM per query — responses are fabricated locally
// and pushed through the same setHistoricalQueryResponse/runActionModule
// path a real cloud LLM response would take.

import { ingestKnowledge } from "@/knowledge/ingest";
import { augmentQuery } from "@/augmentation/query-augmentation";
import {
  setHistoricalQueryResponse,
  setDriverFeedback,
  setExpertScore,
} from "@/augmentation/historical-store";
import { maybeReinsertIntoKnowledgeBase } from "@/feedback/reinsertion";
import { runActionModule, type Severity } from "@/action/deliver";
import { KNOWLEDGE_SEEDS } from "./seed-data/knowledge";
import {
  DRIVER_EXPERIENCES,
  QUERY_TEMPLATES,
  VEHICLES,
  type DriverExperienceLabel,
} from "./seed-data/queries";

// Deterministic PRNG so re-runs (e.g. after a crash partway through) produce
// the same filler choices — not cryptographic, just for repeatable seeding.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;

const MILEAGES = [
  "12,000", "18,500", "24,000", "31,000", "38,500", "45,000", "52,000",
  "61,000", "68,500", "74,000", "82,000", "91,500", "97,000", "105,000",
  "118,000", "126,500", "134,000", "142,000", "155,000", "168,000",
];
const TIMEFRAMES = [
  "the past couple of days", "about a week now", "the last month",
  "just today", "the past couple weeks", "a few days ago", "this morning",
  "the last three or four drives", "since yesterday", "on and off for a while now",
];
const CONDITIONS = [
  "in cold weather", "on the highway", "in stop-and-go traffic",
  "right after starting the car", "after driving for about 20 minutes",
  "when it's raining", "going up a hill", "when turning", "at idle",
  "randomly, with no clear pattern", "when braking", "under hard acceleration",
  "on rough roads", "first thing in the morning", "after a long drive",
];

function fillTemplate(template: string): string {
  return template
    .replaceAll("{mileage}", pick(MILEAGES))
    .replaceAll("{timeframe}", pick(TIMEFRAMES))
    .replaceAll("{condition}", pick(CONDITIONS));
}

interface GeneratedQuery {
  errorType: string;
  driverExperience: DriverExperienceLabel;
  prefix: string;
  queryText: string;
  vehicle: { make: string; model: string; year: number };
}

function generateQueries(): GeneratedQuery[] {
  const results: GeneratedQuery[] = [];

  for (const { errorType, templates } of QUERY_TEMPLATES) {
    const seen = new Set<string>();
    let attempts = 0;
    while (seen.size < 20 && attempts < 500) {
      attempts++;
      const template = templates[seen.size % templates.length]!;
      let queryText = fillTemplate(template);
      if (seen.has(queryText)) {
        // Template has no placeholders (or we re-rolled into the same
        // fillers) — force uniqueness with a natural trailing clause rather
        // than re-rolling forever.
        queryText = `${queryText} (Mileage is around ${pick(MILEAGES)}, been like this for ${pick(TIMEFRAMES)}.)`;
        if (seen.has(queryText)) continue;
      }
      seen.add(queryText);

      const driverExperience = DRIVER_EXPERIENCES[seen.size % DRIVER_EXPERIENCES.length]!;
      const vehicle = pick(VEHICLES);
      const year = 2014 + Math.floor(rng() * 11); // 2014-2024

      results.push({
        errorType,
        driverExperience,
        prefix: `Error Type: ${errorType}; Driver Experience: ${driverExperience}`,
        queryText,
        vehicle: { ...vehicle, year },
      });
    }
  }

  return results;
}

// Rough per-category severity weighting so fabricated responses aren't
// uniformly random — brake/safety-restraint/engine issues skew more
// critical, cosmetic/comfort categories skew advisory.
const SEVERITY_WEIGHTS: Record<string, Record<Severity, number>> = {
  Engine: { critical: 0.35, reminder: 0.45, advisory: 0.2 },
  Brakes: { critical: 0.5, reminder: 0.4, advisory: 0.1 },
  Transmission: { critical: 0.3, reminder: 0.5, advisory: 0.2 },
  Electrical: { critical: 0.15, reminder: 0.5, advisory: 0.35 },
  Battery: { critical: 0.2, reminder: 0.55, advisory: 0.25 },
  Tires: { critical: 0.25, reminder: 0.5, advisory: 0.25 },
  "Cooling System": { critical: 0.4, reminder: 0.4, advisory: 0.2 },
  Exhaust: { critical: 0.2, reminder: 0.45, advisory: 0.35 },
  Suspension: { critical: 0.15, reminder: 0.55, advisory: 0.3 },
  "Climate Control": { critical: 0.05, reminder: 0.35, advisory: 0.6 },
  "Fuel System": { critical: 0.2, reminder: 0.5, advisory: 0.3 },
  "Dashboard Warning Lights": { critical: 0.25, reminder: 0.45, advisory: 0.3 },
  Steering: { critical: 0.35, reminder: 0.45, advisory: 0.2 },
  "Exterior Lights": { critical: 0.1, reminder: 0.4, advisory: 0.5 },
  "Wipers & Visibility": { critical: 0.05, reminder: 0.35, advisory: 0.6 },
  "Unusual Noise": { critical: 0.15, reminder: 0.55, advisory: 0.3 },
  "Fluid Leak": { critical: 0.3, reminder: 0.5, advisory: 0.2 },
  "Safety Restraint System": { critical: 0.45, reminder: 0.4, advisory: 0.15 },
  "Fuel Economy": { critical: 0.02, reminder: 0.28, advisory: 0.7 },
  "Infotainment & Connectivity": { critical: 0.02, reminder: 0.28, advisory: 0.7 },
};

function pickSeverity(errorType: string): Severity {
  const weights = SEVERITY_WEIGHTS[errorType] ?? { critical: 0.2, reminder: 0.5, advisory: 0.3 };
  const r = rng();
  if (r < weights.critical) return "critical";
  if (r < weights.critical + weights.reminder) return "reminder";
  return "advisory";
}

const RESPONSE_TEMPLATES: Record<Severity, (errorType: string) => string> = {
  critical: (errorType) =>
    `Based on what you're describing, this looks like it could be a safety-relevant issue related to your ${errorType.toLowerCase()}. We'd recommend avoiding hard driving and getting it inspected by a technician as soon as possible — ideally before your next longer trip.`,
  reminder: (errorType) =>
    `This looks like a ${errorType.toLowerCase()} issue worth scheduling a service appointment for soon. It's not an immediate emergency, but it's a good idea to get it checked within the next couple of weeks so it doesn't develop into something bigger.`,
  advisory: (errorType) =>
    `This seems like a minor ${errorType.toLowerCase()}-related item. Keep an eye on it, and it's fine to just mention it at your next scheduled maintenance visit rather than making a special trip in.`,
};

async function seedKnowledge() {
  console.log(`Ingesting ${KNOWLEDGE_SEEDS.length} knowledge base entries...`);
  let done = 0;
  for (const seed of KNOWLEDGE_SEEDS) {
    try {
      const chunks = await ingestKnowledge(seed);
      done++;
      console.log(`  [${done}/${KNOWLEDGE_SEEDS.length}] ${seed.source} (${chunks.length} chunk(s))`);
    } catch (err) {
      console.error(`  FAILED: ${seed.source}:`, err instanceof Error ? err.message : err);
    }
  }
}

async function seedQueries() {
  const queries = generateQueries();
  console.log(`Generated ${queries.length} synthetic driver queries. Persisting...`);

  let done = 0;
  let reinsertedCount = 0;

  for (const q of queries) {
    try {
      const augmented = await augmentQuery({
        prefix: q.prefix,
        queryText: q.queryText,
        vehicle: q.vehicle,
      });

      const severity = pickSeverity(q.errorType);
      const message = RESPONSE_TEMPLATES[severity](q.errorType);
      const action = runActionModule(JSON.stringify({ message, severity }));

      await setHistoricalQueryResponse(augmented.historicalQueryId, {
        responseText: action.message,
        severity: action.severity,
        deliveryChannel: action.deliveryChannel,
      });

      // ~55% of queries get a driver helpful/not-helpful signal, skewed
      // toward helpful (paper's feedback module, layer 1).
      const feedbackRoll = rng();
      if (feedbackRoll < 0.55) {
        await setDriverFeedback(augmented.historicalQueryId, feedbackRoll < 0.4);
      }

      // ~25% of queries get an expert score (layer 2). Most land in a
      // realistic 0.4-0.85 spread; occasionally high enough to cross the
      // reinsertion threshold and demonstrate the feedback loop closing.
      if (rng() < 0.25) {
        const expertScore = Math.round((0.35 + rng() * 0.6) * 100) / 100;
        const row = await setExpertScore(augmented.historicalQueryId, expertScore);
        if (row) {
          const reinsertion = await maybeReinsertIntoKnowledgeBase(row);
          if (reinsertion.inserted) reinsertedCount++;
        }
      }

      done++;
      if (done % 20 === 0) {
        console.log(`  [${done}/${queries.length}] queries persisted (${reinsertedCount} reinserted into KB so far)`);
      }
    } catch (err) {
      console.error(`  FAILED on "${q.queryText.slice(0, 60)}...":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Done. ${done}/${queries.length} queries persisted, ${reinsertedCount} fed back into the knowledge base.`);
}

async function main() {
  await seedKnowledge();
  await seedQueries();
}

main()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
