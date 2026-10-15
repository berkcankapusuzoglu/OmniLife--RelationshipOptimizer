import { readFile } from "node:fs/promises";
import { migrateSubscriptionSource } from "./subscription-source-migration.mjs";

const help = `Usage: node scripts/migrate-add-subscription-source.mjs [--dry-run | --check | --apply] [--stripe-manifest PATH]
Defaults to read-only dry-run. --check is the read-only deployment readiness gate.
--apply adds the nullable column and backfills only operator-verified Stripe rows.
Exit 0 means ownership is reconciled; exit 2 means an operator gate remains; exit 1 means an error.
See docs/billing-ownership-migration.md for manifest evidence and legacy RevenueCat reconciliation.`;

async function main(args) {
  if (args.includes("--help")) { console.log(help); return; }
  const modes = args.filter(arg => ["--dry-run", "--check", "--apply"].includes(arg));
  if (modes.length > 1) throw new Error("Choose only one migration mode");
  let manifest;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--stripe-manifest") {
      const filename = args[++index];
      if (!filename || filename.startsWith("--") || manifest) throw new Error("Expected one manifest path");
      manifest = JSON.parse(await readFile(filename, "utf8"));
    } else if (!["--dry-run", "--check", "--apply"].includes(args[index])) {
      throw new Error("Unknown migration argument");
    }
  }
  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured for the operator command");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const result = await migrateSubscriptionSource(sql, { apply: modes[0] === "--apply", manifest });
    console.log(JSON.stringify({ mode: modes[0]?.slice(2) ?? "dry-run", ...result }, null, 2));
    if (!result.ready) {
      console.error("RELEASE GATE: reconcile remaining paid ownership and rerun --check. Column creation alone is not migration completion.");
      process.exitCode = 2;
    }
  } finally { await sql.end(); }
}

main(process.argv.slice(2)).catch(error => {
  console.error("Subscription ownership migration failed:", error.message);
  process.exitCode = 1;
});
