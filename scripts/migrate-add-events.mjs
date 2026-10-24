import { databaseConnectionOptions } from "../src/lib/db/connection-options.mjs";

// Adds the analytics `events` table. Mirrors src/lib/db/schema.ts.
//
// Written by hand rather than with drizzle-kit generate: the drizzle meta snapshot
// is behind production, so a generated migration tries to CREATE tables that
// already exist and fails. Every statement here is additive and idempotent.
//
// `user_id` is nullable with ON DELETE SET NULL: most funnel events happen before
// signup, and deleting an account must not delete the aggregate funnel history,
// only the link to the person.

export const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "session_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS "events_name_created_at_idx" ON "events" ("name", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "events_session_idx" ON "events" ("session_id")`,
  // Same posture as the v1.1.0 tables: the app connects as `postgres` and bypasses
  // RLS; enabling RLS with an explicit deny-all policy keeps the Supabase anon and
  // authenticated API roles from reading the table.
  `ALTER TABLE "events" ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Server only: deny all" ON "events"`,
  `CREATE POLICY "Server only: deny all" ON "events" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)`,
];

const help = `Usage: node scripts/migrate-add-events.mjs [--dry-run | --apply]
Defaults to --dry-run, which prints the SQL and touches nothing.
--apply runs the statements in one transaction against DATABASE_URL from .env.local.
Every statement is idempotent, so re-running --apply is safe.`;

export function renderSql(statements = MIGRATION_STATEMENTS) {
  return statements.map((statement) => `${statement};`).join("\n\n");
}

async function main(args) {
  if (args.includes("--help")) { console.log(help); return; }
  const unknown = args.filter((arg) => !["--dry-run", "--apply"].includes(arg));
  if (unknown.length) throw new Error(`Unknown migration argument: ${unknown.join(" ")}`);
  if (args.includes("--dry-run") && args.includes("--apply")) throw new Error("Choose only one migration mode");
  const apply = args.includes("--apply");

  console.log(`-- events migration (${apply ? "apply" : "dry-run"}): ${MIGRATION_STATEMENTS.length} statements`);
  console.log(renderSql());
  if (!apply) return;

  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured in .env.local");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, databaseConnectionOptions(process.env.DATABASE_SSL_CA));
  try {
    await sql.begin(async (tx) => {
      for (const statement of MIGRATION_STATEMENTS) await tx.unsafe(statement);
    });
    console.log(`Applied ${MIGRATION_STATEMENTS.length} statements.`);
  } finally { await sql.end(); }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/migrate-add-events.mjs")) {
  main(process.argv.slice(2)).catch((error) => {
    console.error("events migration failed:", error.message);
    process.exitCode = 1;
  });
}
