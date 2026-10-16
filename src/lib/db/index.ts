import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  // Supabase's shared transaction pooler requires unnamed statements.
  // Bound each serverless instance to one connection and a 10-second connect wait.
  const client = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    connect_timeout: 10,
    max: 1,
  });
  return drizzle(client, { schema });
}

export function getDb() {
  if (!db) {
    db = createDb();
  }
  return db;
}
