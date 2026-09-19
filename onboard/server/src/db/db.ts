import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { env } from "@/config/env";

// The file is named by DATABASE rather than fixed here, so a deployment can
// put it on a mounted volume (e.g. /data/db.sqlite) instead of inside the
// container's filesystem, where it would be lost on every redeploy.
const sqlite = new Database(env.database, { create: true });
const db = drizzle({ client: sqlite });

export default db;
