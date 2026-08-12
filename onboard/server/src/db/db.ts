import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const sqlite = new Database("db.sqlite", { create: true });
const db = drizzle({ client: sqlite });

export default db;
