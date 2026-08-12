import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const driverProfile = sqliteTable("driver_profile", {
  id: int().primaryKey({ autoIncrement: true }),

  // Identity & licensing
  name: text().notNull(),
  age: int().notNull(),
  licenseType: text({ enum: ["learner", "intermediate", "full"] }).notNull(),
  yearsExperience: text({ enum: ["<1", "1-3", "3-10", "10+"] }).notNull(),

  // Mechanical proficiency — the concrete tasks the driver picked, plus the
  // proficiency level we derive from that pattern (see onboarding/derive.ts).
  mechanicalActions: text({ mode: "json" }).$type<string[]>().notNull(),
  selfRatedProficiency: text({
    enum: ["novice", "basic", "intermediate", "advanced"],
  }).notNull(),

  // Guidance preference
  preferredGuidanceStyle: text({
    enum: ["safety_only", "technical", "both"],
  }).notNull(),

  // Physical considerations — all skippable, so nothing here is required.
  physicalLimitations: text({ mode: "json" }).$type<string[]>().notNull(),
  physicalLimitationsOther: text(),

  // Maintenance relationship — optional, can be backfilled later.
  maintenanceRelationship: text({ enum: ["diy", "mechanic", "mix"] }),
});
