import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const rows = await sql`
    UPDATE users
    SET subscription_tier = 'premium',
        subscription_expires_at = ${oneYearFromNow.toISOString()}
    WHERE email = 'admin@omnilife.app'
    RETURNING id, email, subscription_tier, subscription_expires_at
  `;

  if (rows.length === 0) {
    console.error("No user found with email admin@omnilife.app");
    process.exit(1);
  }

  console.log("Updated user:", rows[0]);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
