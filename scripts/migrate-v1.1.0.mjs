import { databaseConnectionOptions } from "../src/lib/db/connection-options.mjs";

// v1.1.0 schema migration (Phase 2 monetization). Mirrors src/lib/db/schema.ts.
// Plain, idempotent SQL because drizzle-kit push is broken with CHECK constraints
// (drizzle-kit 0.31.x). Every statement is additive: ADD COLUMN IF NOT EXISTS /
// CREATE TABLE IF NOT EXISTS. Nothing is dropped, renamed, or backfilled.

export const MIGRATION_STATEMENTS = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_trial_ends_at" timestamp with time zone`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_product_id" text`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_reminder_sent_at" timestamp with time zone`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_hour_utc" integer`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_opt_in" boolean NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS "billing_events" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS "push_tokens" (
  "token" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "platform" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS "coaching_usage" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "day" date NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "coaching_usage_user_id_day_pk" PRIMARY KEY ("user_id", "day")
)`,
];

const help = `Usage: node scripts/migrate-v1.1.0.mjs [--dry-run | --apply]
Defaults to --dry-run, which prints the SQL and touches nothing.
--apply runs the statements in one transaction against DATABASE_URL from .env.local.
All statements are idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS),
so re-running --apply is safe.`;

export function renderSql(statements = MIGRATION_STATEMENTS) {
  return statements.map((statement) => `${statement};`).join("\n\n");
}

async function main(args) {
  if (args.includes("--help")) { console.log(help); return; }
  const unknown = args.filter((arg) => !["--dry-run", "--apply"].includes(arg));
  if (unknown.length) throw new Error(`Unknown migration argument: ${unknown.join(" ")}`);
  if (args.includes("--dry-run") && args.includes("--apply")) throw new Error("Choose only one migration mode");
  const apply = args.includes("--apply");

  console.log(`-- v1.1.0 migration (${apply ? "apply" : "dry-run"}): ${MIGRATION_STATEMENTS.length} statements`);
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

// Only run when executed directly, so the statements stay importable by tests.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/migrate-v1.1.0.mjs")) {
  main(process.argv.slice(2)).catch((error) => {
    console.error("v1.1.0 migration failed:", error.message);
    process.exitCode = 1;
  });
}
