import { pgTable, real, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

// One row per embedded chunk (see src/knowledge/ingest.ts — long documents
// are split into retrieval-sized chunks before ingestion, so a single
// uploaded manual becomes many rows sharing the same `source`).
// Mirrors the vector stored in Qdrant (qdrantPointId links the two records),
// same pattern as historical_queries.
export const knowledgeEntries = pgTable("knowledge_entries", {
  id: serial("id").primaryKey(),
  qdrantPointId: uuid("qdrant_point_id").notNull().unique(),

  content: text("content").notNull(),
  // Free-text citation, e.g. "2019 Corolla Owner's Manual p.42" or a URL.
  source: text("source"),
  // "feedback" = auto-inserted from a top-scoring historical query/response
  // pair (see src/feedback/reinsertion.ts), the rest are manually ingested.
  sourceType: text("source_type", {
    enum: ["manual", "service_bulletin", "recall_notice", "forum", "feedback", "other"],
  })
    .notNull()
    .default("other"),

  // Expert-verification / historical-feedback score (paper's "pre-ranking
  // mechanism" — see src/knowledge/retrieval.ts). Defaults to neutral until
  // reviewed.
  reliabilityScore: real("reliability_score").notNull().default(1),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertKnowledgeEntry = typeof knowledgeEntries.$inferInsert;
export type SelectKnowledgeEntry = typeof knowledgeEntries.$inferSelect;
