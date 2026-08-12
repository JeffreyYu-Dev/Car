import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Mirrors the vector stored in Qdrant (qdrantPointId links the two records).
// Postgres holds the structured/queryable fields; Qdrant holds the embedding
// used for the attention-based query augmentation (see src/augmentation).
export const historicalQueries = pgTable("historical_queries", {
  id: serial("id").primaryKey(),
  qdrantPointId: uuid("qdrant_point_id").notNull().unique(),

  // Predefined prefix (e.g. "Error Type: Engine; Driver Experience:
  // Inadequate") used to bound similarity comparisons to same-topic queries.
  prefix: text("prefix").notNull(),
  queryText: text("query_text").notNull(),

  driverProfileId: integer("driver_profile_id"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleYear: integer("vehicle_year"),

  // Filled in once the cloud LLM has responded, for the feedback module.
  responseText: text("response_text"),
  driverHelpful: boolean("driver_helpful"),
  expertScore: real("expert_score"),

  // Paper's action module: the cloud LLM's severity classification and the
  // delivery channel deterministically derived from it (see
  // src/action/deliver.ts). Null until the cloud LLM has responded.
  severity: text("severity"), // "critical" | "reminder" | "advisory"
  deliveryChannel: text("delivery_channel"), // "dashboard_alert" | "dashboard_reminder" | "memo"

  // Set once this query/response pair has been fed back into the RAG
  // knowledge base (paper's feedback module: "top-scoring query-response
  // pairs ... are selected for insertion into the RAG knowledge database").
  // Prevents re-inserting the same pair every time its expert score is
  // edited. See src/feedback/reinsertion.ts.
  insertedIntoKnowledgeBase: boolean("inserted_into_knowledge_base")
    .notNull()
    .default(false),
  knowledgeEntryId: integer("knowledge_entry_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertHistoricalQuery = typeof historicalQueries.$inferInsert;
export type SelectHistoricalQuery = typeof historicalQueries.$inferSelect;
