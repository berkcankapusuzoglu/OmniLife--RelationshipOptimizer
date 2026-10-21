// One-off: grant the Play reviewer account a manual Premium entitlement.
// Usage: node scripts/grant-reviewer-premium.mjs [email]
import { config } from "dotenv";
import { databaseConnectionOptions } from "../src/lib/db/connection-options.mjs";

config({ path: ".env.local" });
const { default: postgres } = await import("postgres");
const sql = postgres(process.env.DATABASE_URL, databaseConnectionOptions(process.env.DATABASE_SSL_CA));
const email = process.argv[2] ?? "demo-shots-17383@example.com";
try {
  const rows = await sql`
    update users
    set subscription_tier = 'premium',
        subscription_source = 'manual',
        subscription_expires_at = now() + interval '2 years',
        onboarding_completed = true
    where email = ${email}
    returning email, subscription_tier, subscription_source, subscription_expires_at`;
  console.log(rows.length ? rows[0] : `no user with email ${email}`);
} finally {
  await sql.end();
}
