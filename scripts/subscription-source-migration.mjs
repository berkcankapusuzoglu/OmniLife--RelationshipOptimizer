// Imported only by the explicit operator command, never by application startup.
function validateManifest(manifest, now) {
  if (!manifest || !Array.isArray(manifest.stripe)) throw new Error("Expected a Stripe ownership manifest");
  if (manifest.stripe.length) {
    const verifiedAt = Date.parse(manifest.verifiedAt);
    if (!Number.isFinite(verifiedAt) || verifiedAt > now.getTime() || now.getTime() - verifiedAt > 24 * 60 * 60 * 1000) {
      throw new Error("Stripe ownership evidence must be verified within the last 24 hours");
    }
  }
  const seen = new Set();
  for (const entry of manifest.stripe) {
    if (!entry || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.userId ?? "") ||
      !/^cus_[A-Za-z0-9]+$/.test(entry.stripeCustomerId ?? "") || !/^sub_[A-Za-z0-9]+$/.test(entry.stripeSubscriptionId ?? "") ||
      !["pro", "premium"].includes(entry.subscriptionTier) || !["active", "trialing"].includes(entry.providerStatus) ||
      !Number.isFinite(Date.parse(entry.providerExpiresAt)) || Date.parse(entry.providerExpiresAt) <= now.getTime() ||
      !(entry.recordedExpiresAt === null || (typeof entry.recordedExpiresAt === "string" && Number.isFinite(Date.parse(entry.recordedExpiresAt))))) {
      throw new Error("Invalid or inactive Stripe ownership evidence");
    }
    if (entry.recordedExpiresAt !== null && Date.parse(entry.recordedExpiresAt) !== Date.parse(entry.providerExpiresAt)) {
      throw new Error("Recorded expiry differs from verified Stripe expiry; reconcile the account before backfill");
    }
    if (seen.has(entry.userId)) throw new Error("Duplicate manifest account");
    seen.add(entry.userId);
  }
}

async function readRows(sql) {
  // to_jsonb permits a read-only preflight even before the new column exists.
  return sql`select id, subscription_tier as "subscriptionTier",
    to_jsonb(u)->>'subscription_source' as "subscriptionSource",
    stripe_customer_id as "stripeCustomerId", stripe_subscription_id as "stripeSubscriptionId",
    subscription_expires_at as "subscriptionExpiresAt" from users u
    where subscription_tier in ('pro', 'premium')`;
}

function sameExpiry(left, right) {
  return left == null || right == null ? left == null && right == null : new Date(left).getTime() === new Date(right).getTime();
}

function planBackfill(rows, manifest) {
  const eligible = [];
  let alreadyOwned = 0;
  let unmatched = 0;
  for (const entry of manifest.stripe) {
    const row = rows.find(row => row.id === entry.userId);
    const matches = row && row.stripeCustomerId === entry.stripeCustomerId && row.stripeSubscriptionId === entry.stripeSubscriptionId &&
      row.subscriptionTier === entry.subscriptionTier && sameExpiry(row.subscriptionExpiresAt, entry.recordedExpiresAt);
    if (!matches || (row.subscriptionSource !== null && row.subscriptionSource !== "stripe")) unmatched++;
    else if (row.subscriptionSource === "stripe") alreadyOwned++;
    else eligible.push(entry);
  }
  return { eligible, alreadyOwned, unmatched };
}

function report(rows, plan, columnPresent, applied) {
  const unresolved = rows.filter(row => row.subscriptionSource !== "stripe" && row.subscriptionSource !== "revenuecat").length;
  return {
    sourceColumnPresent: columnPresent,
    proposedStripeBackfills: plan.eligible.length,
    appliedStripeBackfills: applied,
    alreadyOwnedStripeRows: plan.alreadyOwned,
    unmatchedManifestRecords: plan.unmatched,
    unresolvedPaidRows: unresolved,
    ready: columnPresent && unresolved === 0 && plan.unmatched === 0,
  };
}

export async function migrateSubscriptionSource(sql, { apply = false, manifest = { stripe: [] }, now = new Date() } = {}) {
  validateManifest(manifest, now);
  if (!apply) {
    const [{ present }] = await sql`select exists (select 1 from information_schema.columns
      where table_schema = current_schema() and table_name = 'users' and column_name = 'subscription_source') as present`;
    const rows = await readRows(sql);
    return report(rows, planBackfill(rows, manifest), present, 0);
  }
  return sql.begin(async transaction => {
    await transaction`alter table users add column if not exists subscription_source text`;
    await transaction`lock table users in share row exclusive mode`;
    const rows = await readRows(transaction);
    const plan = planBackfill(rows, manifest);
    let applied = 0;
    for (const entry of plan.eligible) {
      const updated = await transaction`update users set subscription_source = 'stripe'
        where subscription_source is null and id = ${entry.userId}
        and stripe_customer_id = ${entry.stripeCustomerId} and stripe_subscription_id = ${entry.stripeSubscriptionId}
        and subscription_tier = ${entry.subscriptionTier} and subscription_expires_at is not distinct from ${entry.recordedExpiresAt}::timestamptz
        returning id`;
      applied += updated.length;
    }
    return report(await readRows(transaction), plan, true, applied);
  });
}
