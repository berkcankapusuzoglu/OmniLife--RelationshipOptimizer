import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const migrationPath = path.resolve("scripts/migrate-add-subscription-source.mjs");
const userId = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-15T12:00:00Z");
const paidRow = () => ({ id: userId, subscriptionSource: null, subscriptionTier: "pro", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", subscriptionExpiresAt: "2026-11-01T00:00:00Z" });
const manifest = () => ({ verifiedAt: "2026-10-15T11:00:00Z", stripe: [{ userId, stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", subscriptionTier: "pro", recordedExpiresAt: "2026-11-01T00:00:00Z", providerStatus: "active", providerExpiresAt: "2026-11-01T00:00:00Z" }] });
let temporaryDirectory;
afterEach(() => {
  if (temporaryDirectory) {
    if (path.dirname(temporaryDirectory) !== path.resolve(tmpdir()) || !path.basename(temporaryDirectory).startsWith("billing-migration-help-")) throw new Error("Unexpected temporary directory");
    rmSync(temporaryDirectory, { recursive: true, force: true }); temporaryDirectory = undefined;
  }
});

function database(rows, columnPresent = false) {
  const writes = [];
  const sql = async (strings, ...values) => {
    const query = strings.join("?").replace(/\s+/g, " ").trim().toLowerCase();
    if (query.startsWith("select exists")) return [{ present: columnPresent }];
    if (query.startsWith("select")) return rows.map(row => ({ ...row }));
    writes.push(query);
    if (query.startsWith("alter")) { columnPresent = true; return []; }
    if (query.startsWith("lock")) return [];
    if (query.startsWith("update")) {
      // Assert the emitted write contract, including an optimistic expiry snapshot.
      for (const condition of ["subscription_source is null", "id = ?", "stripe_customer_id = ?", "stripe_subscription_id = ?", "subscription_tier = ?", "subscription_expires_at is not distinct from ?"]) expect(query).toContain(condition);
      const [id, customer, subscription, tier, expiry] = values;
      const row = rows.find(row => row.id === id && row.stripeCustomerId === customer && row.stripeSubscriptionId === subscription && row.subscriptionTier === tier && row.subscriptionSource === null && new Date(row.subscriptionExpiresAt).getTime() === new Date(expiry).getTime());
      if (!row) return [];
      row.subscriptionSource = "stripe"; return [{ id }];
    }
    throw new Error(`Unexpected migration statement: ${query}`);
  };
  sql.begin = callback => callback(sql);
  return { sql, writes };
}

describe("subscription ownership migration", () => {
  it("offers help without reading credentials or opening a database", () => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "billing-migration-help-"));
    const result = spawnSync(process.execPath, [migrationPath, "--help"], { cwd: temporaryDirectory, encoding: "utf8", env: { ...process.env, DATABASE_URL: "" } });
    expect(result.status).toBe(0); expect(result.stdout).toContain("--apply"); expect(result.stdout).toContain("--check");
  });
  it("defaults to dry-run counts without any DDL or backfill writes", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([paidRow()]);
    const result = await migrateSubscriptionSource(db.sql, { manifest: manifest(), now });
    expect(db.writes).toEqual([]); expect(result).toMatchObject({ sourceColumnPresent: false, proposedStripeBackfills: 1, appliedStripeBackfills: 0, unresolvedPaidRows: 1, ready: false });
  });
  it("never infers active Stripe ownership from stored Stripe IDs alone", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([paidRow()], true);
    const result = await migrateSubscriptionSource(db.sql, { now });
    expect(result).toMatchObject({ proposedStripeBackfills: 0, unresolvedPaidRows: 1, ready: false }); expect(db.writes).toEqual([]);
  });
  it("applies verified Stripe ownership idempotently without guessing RevenueCat", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const rcLegacy = { ...paidRow(), id: "00000000-0000-4000-8000-000000000002", stripeCustomerId: null, stripeSubscriptionId: null };
    const rows = [paidRow(), rcLegacy]; const db = database(rows);
    const first = await migrateSubscriptionSource(db.sql, { apply: true, manifest: manifest(), now });
    expect(first).toMatchObject({ sourceColumnPresent: true, appliedStripeBackfills: 1, unresolvedPaidRows: 1, ready: false }); expect(rcLegacy.subscriptionSource).toBeNull();
    const second = await migrateSubscriptionSource(db.sql, { apply: true, manifest: manifest(), now });
    expect(second).toMatchObject({ proposedStripeBackfills: 0, appliedStripeBackfills: 0, alreadyOwnedStripeRows: 1, unresolvedPaidRows: 1, ready: false });
  });
  it("requires a fresh active-provider manifest and rejects duplicates", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const cases = [
      { ...manifest(), verifiedAt: "2026-10-01T00:00:00Z" },
      { ...manifest(), stripe: [{ ...manifest().stripe[0], providerStatus: "canceled" }] },
      { ...manifest(), stripe: [{ ...manifest().stripe[0], providerExpiresAt: "2020-01-01T00:00:00Z" }] },
      { ...manifest(), stripe: [{ ...manifest().stripe[0], recordedExpiresAt: "2026-10-01T00:00:00Z" }] },
      { ...manifest(), stripe: [manifest().stripe[0], manifest().stripe[0]] },
    ];
    for (const input of cases) {
      const db = database([paidRow()]);
      await expect(migrateSubscriptionSource(db.sql, { apply: true, manifest: input, now })).rejects.toThrow(); expect(db.writes).toEqual([]);
    }
  });
  it("blocks mismatched snapshots and conflicting ownership", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    for (const change of [{ stripeSubscriptionId: "sub_replacement" }, { subscriptionTier: "premium" }, { subscriptionExpiresAt: null }, { subscriptionSource: "revenuecat" }]) {
      const db = database([{ ...paidRow(), ...change }], true);
      const result = await migrateSubscriptionSource(db.sql, { apply: true, manifest: manifest(), now });
      expect(result).toMatchObject({ proposedStripeBackfills: 0, appliedStripeBackfills: 0, unmatchedManifestRecords: 1, ready: false }); expect(db.writes.filter(query => query.startsWith("update"))).toEqual([]);
    }
  });
  it("reports readiness only when the column exists and all paid ownership is known", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([paidRow()]);
    const result = await migrateSubscriptionSource(db.sql, { apply: true, manifest: manifest(), now });
    expect(result).toMatchObject({ sourceColumnPresent: true, unresolvedPaidRows: 0, unmatchedManifestRecords: 0, ready: true });
    const check = await migrateSubscriptionSource(db.sql, { now }); expect(check.ready).toBe(true);
  });
  it("keeps the script syntactically valid without executing a migration", () => {
    expect(() => execFileSync(process.execPath, ["--check", migrationPath])).not.toThrow();
  });
});
