import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schemas/index.ts",
  out: "./drizzle",
  dbCredentials: {
    // Same source of truth as src/db/db.ts, so `drizzle-kit push` migrates
    // the database the server actually opens — including when that's a file
    // on a mounted volume.
    url: process.env.DATABASE ?? "./db.sqlite",
  },
});
