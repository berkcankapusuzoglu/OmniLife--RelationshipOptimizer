import { expect, it } from "vitest";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";

it("keeps provider ownership nullable with a database allowlist constraint", () => {
  const config = getTableConfig(users);
  expect(users.subscriptionSource.notNull).toBe(false);
  const constraint = config.checks.find(check => check.name === "users_subscription_source_check");
  expect(constraint).toBeDefined();
  expect(new PgDialect().sqlToQuery(constraint!.value).sql).toBe('"users"."subscription_source" in (\'stripe\', \'revenuecat\')');
});
