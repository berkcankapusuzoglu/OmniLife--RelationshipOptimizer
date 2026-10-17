// Imported only by the explicit operator command, never by application startup.
function validateManifest(manifest, now) {
  if (!manifest || !Array.isArray(manifest.stripe) || (manifest.manual !== undefined && !Array.isArray(manifest.manual))) throw new Error("Expected an ownership manifest");
  if (manifest.stripe.length || manifest.manual?.length) {
    const verifiedAt = Date.parse(manifest.verifiedAt);
    if (!Number.isFinite(verifiedAt) || verifiedAt > now.getTime() || now.getTime() - verifiedAt > 24 * 60 * 60 * 1000) {
      throw new Error("Ownership evidence must be verified within the last 24 hours");
    }
  }
  const seen = new Set();
  for (const entry of manifest.stripe) {
    if (!entry || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.userId ?? "") ||
      !/^cus_[A-Za-z0-9]+$/.test(entry.stripeCustomerId ?? "") || !/^sub_[A-Za-z0-9]+$/.test(entry.stripeSubscriptionId ?? "") ||
      !["pro", "premium"].includes(entry.subscriptionTier) || !["active", "trialing"].includes(entry.providerStatus) ||
      timestampMicros(entry.providerExpiresAt) === undefined || timestampMicros(entry.providerExpiresAt) <= BigInt(now.getTime()) * 1000n ||
      !(entry.recordedExpiresAt === null || timestampMicros(entry.recordedExpiresAt) !== undefined)) {
      throw new Error("Invalid or inactive Stripe ownership evidence");
    }
    if (entry.recordedExpiresAt !== null && !sameExpiry(entry.recordedExpiresAt, entry.providerExpiresAt)) {
      throw new Error("Recorded expiry differs from verified Stripe expiry; reconcile the account before backfill");
    }
    if (seen.has(entry.userId.toLowerCase())) throw new Error("Duplicate manifest account");
    seen.add(entry.userId.toLowerCase());
  }
  for (const entry of manifest.manual ?? []) {
    if (!entry || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.userId ?? "") ||
      !["pro", "premium"].includes(entry.subscriptionTier) || entry.stripeCustomerId !== null || entry.stripeSubscriptionId !== null || entry.ownerConfirmed !== true ||
      !(entry.recordedExpiresAt === null || timestampMicros(entry.recordedExpiresAt) !== undefined)) {
      throw new Error("Invalid or unconfirmed manual ownership evidence");
    }
    if (seen.has(entry.userId.toLowerCase())) throw new Error("Duplicate manifest account");
    seen.add(entry.userId.toLowerCase());
  }
}

async function readRows(sql) {
  // to_jsonb permits a read-only preflight even before the new column exists.
  // JSON timestamp text retains microseconds that the driver's Date parser loses.
  return sql`select id, subscription_tier as "subscriptionTier",
    to_jsonb(u)->>'subscription_source' as "subscriptionSource",
    stripe_customer_id as "stripeCustomerId", stripe_subscription_id as "stripeSubscriptionId",
    to_jsonb(u)->>'subscription_expires_at' as "subscriptionExpiresAt" from users u`;
}

async function readSchemaState(sql) {
  const [{ present: sourceColumnPresent }] = await sql`select exists (select 1 from information_schema.columns
    where table_schema = current_schema() and table_name = 'users' and column_name = 'subscription_source') as present`;
  const [{ present: checkoutStateColumnsPresent }] = await sql`select count(*) = 2 as present from information_schema.columns
    where table_schema = current_schema() and table_name = 'users'
    and column_name in ('stripe_pending_checkout_token', 'stripe_pending_checkout_session_id')`;
  const [constraint] = await sql`select convalidated as validated, pg_get_expr(conbin, conrelid) as expression from pg_constraint
    where conrelid = 'users'::regclass and conname = 'users_subscription_source_check' and contype = 'c'`;
  // Compare PostgreSQL's complete canonical expression without changing SQL literals.
  const sourceConstraintValidated = constraint?.validated === true && constraint.expression ===
    "(subscription_source = ANY (ARRAY['stripe'::text, 'revenuecat'::text, 'manual'::text]))";
  return { sourceColumnPresent, checkoutStateColumnsPresent, sourceConstraintValidated };
}

function invalidSourceRows(rows) {
  return rows.filter(row => row.subscriptionSource !== null && !["stripe", "revenuecat", "manual"].includes(row.subscriptionSource)).length;
}

function timestampMicros(value) {
  if (typeof value !== "string") return undefined;
  // PostgreSQL stores microseconds. Reject greater precision and unsupported formats.
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match || match[1].startsWith("0000")) return undefined;
  const milliseconds = Date.parse(`${match[1]}Z`);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 19) !== match[1]) return undefined;
  const offsetHours = Number(match[5] ?? 0);
  const offsetMinutes = Number(match[6] ?? 0);
  if (offsetHours > 15 || offsetMinutes > 59) return undefined;
  const offset = (offsetHours * 60 + offsetMinutes) * (match[4] === "-" ? -1 : 1);
  return BigInt(milliseconds) * 1000n + BigInt((match[2] ?? "").padEnd(6, "0")) - BigInt(offset) * 60_000_000n;
}

function sameExpiry(left, right) {
  if (left === null || right === null) return left === right;
  const instant = timestampMicros(left);
  return instant !== undefined && instant === timestampMicros(right);
}

function planBackfill(rows, entries, source) {
  const eligible = [];
  let alreadyOwned = 0;
  let unmatched = 0;
  for (const entry of entries) {
    const row = rows.find(row => row.id.toLowerCase() === entry.userId.toLowerCase());
    const matches = row && row.stripeCustomerId === entry.stripeCustomerId && row.stripeSubscriptionId === entry.stripeSubscriptionId &&
      row.subscriptionTier === entry.subscriptionTier && sameExpiry(row.subscriptionExpiresAt, entry.recordedExpiresAt);
    if (!matches || (row.subscriptionSource !== null && row.subscriptionSource !== source)) unmatched++;
    else if (row.subscriptionSource === source) alreadyOwned++;
    else eligible.push(entry);
  }
  return { eligible, alreadyOwned, unmatched };
}

function planOwnership(rows, manifest) {
  return { stripe: planBackfill(rows, manifest.stripe, "stripe"), manual: planBackfill(rows, manifest.manual ?? [], "manual") };
}

function report(rows, plan, schema, appliedStripe = 0, appliedManual = 0) {
  const unresolved = rows.filter(row => ["pro", "premium"].includes(row.subscriptionTier) && !["stripe", "revenuecat", "manual"].includes(row.subscriptionSource)).length;
  const invalid = invalidSourceRows(rows);
  return {
    ...schema,
    proposedStripeBackfills: plan.stripe.eligible.length,
    appliedStripeBackfills: appliedStripe,
    alreadyOwnedStripeRows: plan.stripe.alreadyOwned,
    proposedManualBackfills: plan.manual.eligible.length,
    appliedManualBackfills: appliedManual,
    alreadyOwnedManualRows: plan.manual.alreadyOwned,
    unmatchedManifestRecords: plan.stripe.unmatched + plan.manual.unmatched,
    unresolvedPaidRows: unresolved,
    invalidSourceRows: invalid,
    ready: schema.sourceColumnPresent && schema.checkoutStateColumnsPresent && schema.sourceConstraintValidated && invalid === 0 && unresolved === 0 && plan.stripe.unmatched === 0 && plan.manual.unmatched === 0,
  };
}

export async function migrateSubscriptionSource(sql, { apply = false, manifest = { stripe: [] }, now = new Date() } = {}) {
  validateManifest(manifest, now);
  if (!apply) {
    const schema = await readSchemaState(sql);
    const rows = await readRows(sql);
    return report(rows, planOwnership(rows, manifest), schema);
  }
  return sql.begin(async transaction => {
    await transaction`lock table users in share row exclusive mode`;
    const schema = await readSchemaState(transaction);
    const rows = await readRows(transaction);
    const plan = planOwnership(rows, manifest);
    // Inspect every row, including free accounts, before constraint DDL/backfill.
    if (invalidSourceRows(rows) || plan.stripe.unmatched || plan.manual.unmatched) return report(rows, plan, schema);
    await transaction`alter table users add column if not exists subscription_source text`;
    await transaction`alter table users add column if not exists stripe_pending_checkout_token text`;
    await transaction`alter table users add column if not exists stripe_pending_checkout_session_id text`;
    // Recreate our named check canonically; the table lock prevents concurrent writes.
    await transaction`alter table users drop constraint if exists users_subscription_source_check`;
    await transaction`alter table users add constraint users_subscription_source_check
      check (subscription_source in ('stripe', 'revenuecat', 'manual')) not valid`;
    await transaction`alter table users validate constraint users_subscription_source_check`;
    let applied = 0;
    // Bind expiry as text so the driver's timestamptz serializer cannot truncate it.
    for (const entry of plan.stripe.eligible) {
      const updated = await transaction`update users set subscription_source = 'stripe'
        where subscription_source is null and id = ${entry.userId}
        and stripe_customer_id = ${entry.stripeCustomerId} and stripe_subscription_id = ${entry.stripeSubscriptionId}
        and subscription_tier = ${entry.subscriptionTier} and subscription_expires_at is not distinct from ${entry.recordedExpiresAt}::text::timestamptz
        returning id`;
      if (updated.length !== 1) throw new Error("Ownership snapshot changed; no backfills committed");
      applied += updated.length;
    }
    let appliedManual = 0;
    for (const entry of plan.manual.eligible) {
      const updated = await transaction`update users set subscription_source = 'manual'
        where subscription_source is null and id = ${entry.userId}
        and stripe_customer_id is null and stripe_subscription_id is null
        and subscription_tier = ${entry.subscriptionTier} and subscription_expires_at is not distinct from ${entry.recordedExpiresAt}::text::timestamptz
        returning id`;
      if (updated.length !== 1) throw new Error("Ownership snapshot changed; no backfills committed");
      appliedManual += updated.length;
    }
    return report(await readRows(transaction), plan, {
      sourceColumnPresent: true, checkoutStateColumnsPresent: true, sourceConstraintValidated: true,
    }, applied, appliedManual);
  });
}
