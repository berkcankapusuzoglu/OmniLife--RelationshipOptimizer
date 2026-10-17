import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const migrationPath = path.resolve("scripts/migrate-add-subscription-source.mjs");
const userId = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-15T12:00:00Z");
const paidRow = () => ({ id: userId, subscriptionSource: null, subscriptionTier: "pro", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", subscriptionExpiresAt: "2026-11-01T00:00:00Z" });
const manifest = () => ({ verifiedAt: "2026-10-15T11:00:00Z", stripe: [{ userId, stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", subscriptionTier: "pro", recordedExpiresAt: "2026-11-01T00:00:00Z", providerStatus: "active", providerExpiresAt: "2026-11-01T00:00:00Z" }] });
const manualRow = () => ({ ...paidRow(), stripeCustomerId: null, stripeSubscriptionId: null });
const manualManifest = () => ({ verifiedAt: "2026-10-15T11:00:00Z", stripe: [], manual: [{ userId, subscriptionTier: "pro", recordedExpiresAt: "2026-11-01T00:00:00Z", stripeCustomerId: null, stripeSubscriptionId: null, ownerConfirmed: true }] });
let temporaryDirectory;
afterEach(() => {
  if (temporaryDirectory) {
    if (path.dirname(temporaryDirectory) !== path.resolve(tmpdir()) || !path.basename(temporaryDirectory).startsWith("billing-migration-help-")) throw new Error("Unexpected temporary directory");
    rmSync(temporaryDirectory, { recursive: true, force: true }); temporaryDirectory = undefined;
  }
});

function database(rows, columnPresent = false, constraintExpression = null) {
  const writes = [];
  let checkoutColumnsPresent = constraintExpression !== null;
  let constraintValidated = constraintExpression !== null;
  const sql = async (strings, ...values) => {
    const query = strings.join("?").replace(/\s+/g, " ").trim().toLowerCase();
    if (query.startsWith("select") && query.includes("pg_constraint")) return constraintValidated ? [{ validated: true, expression: constraintExpression }] : [];
    if (query.startsWith("select") && query.includes("stripe_pending_checkout")) return [{ present: checkoutColumnsPresent }];
    if (query.startsWith("select exists")) return [{ present: columnPresent }];
    if (query.startsWith("select")) return rows.map(row => ({ ...row }));
    writes.push(query);
    if (query.startsWith("alter")) {
      if (query.includes("add column if not exists subscription_source")) columnPresent = true;
      if (query.includes("stripe_pending_checkout_session_id")) checkoutColumnsPresent = true;
      if (query.includes("drop constraint")) constraintValidated = false;
      if (query.includes("add constraint")) {
        expect(query).toContain("check (subscription_source in ('stripe', 'revenuecat', 'manual')) not valid");
        constraintExpression = "(subscription_source = ANY (ARRAY['stripe'::text, 'revenuecat'::text, 'manual'::text]))";
      }
      if (query.includes("validate constraint")) constraintValidated = true;
      return [];
    }
    if (query.startsWith("lock")) return [];
    if (query.startsWith("update")) {
      // Assert the emitted write contract, including an optimistic expiry snapshot.
      const manual = query.includes("set subscription_source = 'manual'");
      expect(query).toMatch(/^update users set subscription_source = '(stripe|manual)' where /);
      for (const condition of ["subscription_source is null", "id = ?", "subscription_tier = ?", "subscription_expires_at is not distinct from ?"]) expect(query).toContain(condition);
      if (manual) for (const condition of ["stripe_customer_id is null", "stripe_subscription_id is null"]) expect(query).toContain(condition);
      else for (const condition of ["stripe_customer_id = ?", "stripe_subscription_id = ?"]) expect(query).toContain(condition);
      const [id, customer, subscription, tier, expiry] = manual ? [values[0], null, null, values[1], values[2]] : values;
      const row = rows.find(row => row.id === id && row.stripeCustomerId === customer && row.stripeSubscriptionId === subscription && row.subscriptionTier === tier && row.subscriptionSource === null && (row.subscriptionExpiresAt == null || expiry == null ? row.subscriptionExpiresAt === expiry : new Date(row.subscriptionExpiresAt).getTime() === new Date(expiry).getTime()));
      if (!row) return [];
      row.subscriptionSource = manual ? "manual" : "stripe"; return [{ id }];
    }
    throw new Error(`Unexpected migration statement: ${query}`);
  };
  sql.begin = callback => callback(sql);
  return { sql, writes };
}

describe("subscription ownership migration", () => {
  it("previews manual ownership without writing", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([manualRow()]);
    expect(await migrateSubscriptionSource(db.sql, { manifest: manualManifest(), now })).toMatchObject({ proposedManualBackfills: 1, appliedManualBackfills: 0, alreadyOwnedManualRows: 0, unresolvedPaidRows: 1, ready: false });
    expect(db.writes).toEqual([]);
  });
  it.each(["2026-11-01T00:00:00Z", null])("preserves the manual tier and exact %s expiry across repeated applies", async expiry => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const row = { ...manualRow(), subscriptionTier: "premium", subscriptionExpiresAt: expiry }; const before = { ...row };
    const input = manualManifest(); Object.assign(input.manual[0], { subscriptionTier: "premium", recordedExpiresAt: expiry });
    const db = database([row]);
    expect(await migrateSubscriptionSource(db.sql, { apply: true, manifest: input, now })).toMatchObject({ proposedManualBackfills: 1, appliedManualBackfills: 1, alreadyOwnedManualRows: 0, unresolvedPaidRows: 0, ready: true });
    expect(row).toEqual({ ...before, subscriptionSource: "manual" });
    expect(await migrateSubscriptionSource(db.sql, { apply: true, manifest: input, now })).toMatchObject({ proposedManualBackfills: 0, appliedManualBackfills: 0, alreadyOwnedManualRows: 1, ready: true });
  });
  it("rejects stale, future, unconfirmed, malformed, provider-linked, and duplicate manual evidence before writes", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const entry = manualManifest().manual[0];
    const cases = [
      { ...manualManifest(), verifiedAt: "2026-10-14T11:59:59Z" },
      { ...manualManifest(), verifiedAt: "2026-10-15T12:00:01Z" },
      { ...manualManifest(), verifiedAt: undefined },
      ...[{ ownerConfirmed: false }, { ownerConfirmed: undefined }, { stripeCustomerId: "cus_test" }, { stripeSubscriptionId: "sub_test" }, { stripeCustomerId: undefined }, { subscriptionTier: "free" }, { recordedExpiresAt: undefined }, { recordedExpiresAt: "yesterday" }, { userId: "invalid" }].map(change => ({ ...manualManifest(), manual: [{ ...entry, ...change }] })),
      { ...manualManifest(), manual: [entry, entry] },
      { ...manifest(), manual: [entry] },
      { ...manifest(), stripe: [{ ...manifest().stripe[0], userId: "aaaaaaaa-0000-4000-8000-000000000001" }], manual: [{ ...entry, userId: "AAAAAAAA-0000-4000-8000-000000000001" }] },
      { ...manualManifest(), manual: {} },
    ];
    for (const input of cases) {
      const db = database([manualRow()]);
      await expect(migrateSubscriptionSource(db.sql, { apply: true, manifest: input, now })).rejects.toThrow(); expect(db.writes).toEqual([]);
    }
  });
  it.each([{ stripeCustomerId: "cus_test" }, { stripeSubscriptionId: "sub_test" }, { subscriptionTier: "premium" }, { subscriptionExpiresAt: null }, { subscriptionSource: "stripe" }, { subscriptionSource: "revenuecat" }, { id: "00000000-0000-4000-8000-000000000003" }])("blocks every backfill if any manual snapshot conflicts: %j", async change => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const stripeRow = { ...paidRow(), id: "00000000-0000-4000-8000-000000000002" };
    const input = { ...manifest(), manual: manualManifest().manual }; input.stripe[0].userId = stripeRow.id;
    const db = database([{ ...manualRow(), ...change }, stripeRow], true);
    const result = await migrateSubscriptionSource(db.sql, { apply: true, manifest: input, now });
    expect(result).toMatchObject({ appliedStripeBackfills: 0, appliedManualBackfills: 0, unmatchedManifestRecords: 1, ready: false });
    expect(db.writes.filter(query => query.startsWith("update"))).toEqual([]); expect(stripeRow.subscriptionSource).toBeNull();
  });
  it("blocks manual writes too when a Stripe snapshot conflicts", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const input = { ...manifest(), manual: manualManifest().manual }; input.stripe[0].userId = "00000000-0000-4000-8000-000000000002";
    const row = manualRow(); const db = database([row]);
    expect(await migrateSubscriptionSource(db.sql, { apply: true, manifest: input, now })).toMatchObject({ appliedManualBackfills: 0, unmatchedManifestRecords: 1, ready: false });
    expect(db.writes.filter(query => query.startsWith("update"))).toEqual([]); expect(row.subscriptionSource).toBeNull();
  });
  it.each(["(subscription_source = ANY (ARRAY['stripe'::text, 'revenuecat'::text]))", "true"])("rejects a named validated noncanonical constraint: %s", async expression => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([{ ...manualRow(), subscriptionSource: "manual" }], true, expression);
    expect(await migrateSubscriptionSource(db.sql, { now })).toMatchObject({ sourceConstraintValidated: false, invalidSourceRows: 0, unresolvedPaidRows: 0, ready: false });
    expect(db.writes).toEqual([]);
  });
  it("disables the legacy premium grant before credentials or a DB connection", () => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "billing-migration-help-"));
    const source = readFileSync(path.resolve("scripts/grant-premium.ts"), "utf8");
    // No dependency can be linked, so this regression can never open a database.
    const input = `import { SourceTextModule, createContext } from "node:vm";
const module = new SourceTextModule(${JSON.stringify(source)}, { context: createContext({ console, process: { set exitCode(value) { process.exitCode = value; } } }) });
await module.link(() => { throw new Error("Grant entry point must not import dependencies"); });
await module.evaluate();`;
    const result = spawnSync(process.execPath, ["--experimental-vm-modules", "--input-type=module"], { input, cwd: temporaryDirectory, encoding: "utf8", env: { ...process.env, DATABASE_URL: "" } });
    expect(result.status).toBe(1); expect(result.stderr).toContain("billing-ownership-migration.md"); expect(result.stderr).toContain("disabled"); expect(result.stdout).toBe("");
  });
  it("advertises the ownership manifest alias and rejects duplicate manifest arguments before credentials", () => {
    const help = spawnSync(process.execPath, [migrationPath, "--help"], { encoding: "utf8" });
    expect(help.stdout).toContain("--ownership-manifest"); expect(help.stdout).toContain("--stripe-manifest");
    const duplicate = spawnSync(process.execPath, [migrationPath, "--ownership-manifest", "unused", "--stripe-manifest", "unused"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: "" } });
    expect(duplicate.status).toBe(1); expect(duplicate.stderr).toContain("one manifest");
  });
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
  it.each(["free", "pro"])("reports invalid source values on %s rows before any constraint change", async tier => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([{ ...paidRow(), subscriptionTier: tier, subscriptionSource: "strpie" }], true);
    for (const apply of [false, true]) {
      const result = await migrateSubscriptionSource(db.sql, { apply, now });
      expect(result).toMatchObject({ invalidSourceRows: 1, ready: false });
    }
    expect(db.writes.filter(query => query.startsWith("alter"))).toEqual([]);
  });
  it("requires a validated source constraint and checkout state columns for readiness", async () => {
    const { migrateSubscriptionSource } = await import("./subscription-source-migration.mjs");
    const db = database([{ ...paidRow(), subscriptionSource: "stripe" }], true);
    const before = await migrateSubscriptionSource(db.sql, { now });
    expect(before).toMatchObject({ sourceConstraintValidated: false, checkoutStateColumnsPresent: false, ready: false });
    const after = await migrateSubscriptionSource(db.sql, { apply: true, now });
    expect(after).toMatchObject({ sourceConstraintValidated: true, checkoutStateColumnsPresent: true, invalidSourceRows: 0, ready: true });
    expect(db.writes.some(query => query.includes("validate constraint users_subscription_source_check"))).toBe(true);
  });
});
