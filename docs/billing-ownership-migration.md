# Billing ownership release gate

Run this migration against the intended database before deploying the billing
handlers. Application startup and the production build do not run the migration
or record it as complete. Adding the column alone does not resolve historical
ownership. Keep the release blocked until the read-only check returns exit 0.

Back up the database first. Use an operator account and the intended
`DATABASE_URL`; the command can also read `.env.local`. Keep account manifests
and provider exports outside the repository. No Stripe or RevenueCat API calls
are made by this script.

1. Run `node scripts/migrate-add-subscription-source.mjs --dry-run`.
   This makes no schema or data changes, including when the column is absent.
   It prints counts and returns exit 2 while ownership is unresolved.
2. Reconcile paid accounts against current provider records. Stored Stripe IDs
   alone are insufficient: an old ID can remain after another provider granted
   access. Verify the account, current subscription, current tier, provider
   status/period, and that Stripe owns the account entitlement. Prepare the
   manifest below from that evidence and the current database row snapshot.
3. Run the dry run with `--stripe-manifest <private-path>` to inspect proposed
   counts. Then run `node scripts/migrate-add-subscription-source.mjs --apply
   --stripe-manifest <private-path>` during a maintenance window. It adds the
   nullable column, locks the users table against concurrent writes for the
   transaction, and sets only the owner on exact matching null-source paid rows.
   It changes no tier, expiry, or Stripe IDs. Repeating it is safe.
4. Reconcile remaining paid rows with unknown ownership. This includes legacy
   RevenueCat accounts; the script never infers RevenueCat ownership. Inspect
   current RevenueCat subscriber entitlements and account identity, rule out a
   conflicting Stripe subscription, then have the database owner perform a
   reviewed conditional backfill to `revenuecat` for those verified accounts.
   Manually granted/lifetime accounts need an explicit ownership/lifecycle
   decision; do not label them as a provider to make the count disappear.
5. Run `node scripts/migrate-add-subscription-source.mjs --check` without a
   manifest. Archive its output with the operator's evidence. Release requires
   `sourceColumnPresent: true`, `unresolvedPaidRows: 0`, and `ready: true`.

The command prints `proposedStripeBackfills`, `appliedStripeBackfills`,
`alreadyOwnedStripeRows`, `unmatchedManifestRecords`, and `unresolvedPaidRows`.
Exit 0 means the ownership check is ready, exit 2 means a release gate remains,
and exit 1 means a command/validation/database error. A failed or unresolved run
must not be treated as migration completion. An apply run may commit verified
backfills while still returning exit 2 for unresolved accounts.

## Private Stripe manifest

`verifiedAt` must be within the last 24 hours. `providerStatus` must be `active`
or `trialing`, and `providerExpiresAt` must be in the future. `recordedExpiresAt`
is the exact current database expiry (or JSON `null`), not a desired replacement.
When present, it must match the verified provider expiry. Resolve a conflicting
or previously truncated expiry with verified provider evidence before backfill;
adding ownership must not certify a damaged expiry as reconciled.
Do not copy these synthetic example IDs into an actual backfill.

```json
{
  "verifiedAt": "2026-10-15T16:00:00Z",
  "stripe": [
    {
      "userId": "00000000-0000-4000-8000-000000000001",
      "stripeCustomerId": "cus_example",
      "stripeSubscriptionId": "sub_example",
      "subscriptionTier": "pro",
      "recordedExpiresAt": "2026-11-01T00:00:00Z",
      "providerStatus": "active",
      "providerExpiresAt": "2026-11-01T00:00:00Z"
    }
  ]
}
```

The updater requires matching user ID, customer ID, subscription ID, tier, and
expiry snapshot. It rejects stale/inactive evidence, duplicates, mismatched
snapshots, and conflicting ownership. It never overwrites a known owner.

## Handler ownership rules

Paid RevenueCat purchase/renewal/sync and completed Stripe subscription checkout
may renew their own provider or claim a null-source row whose tier is explicitly
`free`. A paid null-source legacy row is preserved pending reconciliation.
Neither provider may take the other provider's entitlement, even for a paid
event. Explicit same-provider checkout can replace a Stripe subscription ID;
subsequent updates/deletions must match the current stored subscription ID.

RevenueCat cancellation, expiration, and free sync require RevenueCat ownership
in the UPDATE predicate. Stripe updates/deletions require Stripe ownership and
the exact current subscription ID and customer. A failed Stripe payment can
remove access while keeping ownership for later recovery; deletion clears both
access and ownership. Unknown or ambiguous Stripe prices grant no default tier.

These predicates protect against cross-provider races. They do not provide a
complete same-provider event ordering ledger. Keep historical webhook delivery
and reconciliation under review, particularly if a subscription changes during
checkout. Native billing and notification SDKs remain disabled in this release.
