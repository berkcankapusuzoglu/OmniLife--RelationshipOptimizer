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
   nullable source and pending-checkout columns, locks the users table against
   concurrent writes for the transaction, and sets only the owner on exact
   matching null-source paid rows. It preflights source values across all users,
   including free accounts; invalid values block all DDL/backfill. After a clean
   preflight it installs and validates `users_subscription_source_check`, which
   allows only SQL NULL, `stripe`, or `revenuecat`. Repeated apply runs recreate
   that check canonically and validate it under the lock.
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
   `sourceColumnPresent: true`, `checkoutStateColumnsPresent: true`,
   `sourceConstraintValidated: true`, `invalidSourceRows: 0`,
   `unresolvedPaidRows: 0`, and `ready: true`.

The command prints `proposedStripeBackfills`, `appliedStripeBackfills`,
`alreadyOwnedStripeRows`, `unmatchedManifestRecords`, and `unresolvedPaidRows`.
`invalidSourceRows` counts every non-null value outside the provider allowlist,
regardless of account tier. Inspect and reconcile those values from evidence;
the migration never silently normalizes or deletes them.
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

## Handler lifecycle rules

A paid null-source legacy row is preserved pending reconciliation. Neither
provider can take the other's entitlement, including for a paid event.

RevenueCat purchase/renewal and active sync require a finite future expiry. They
may claim an explicitly free, source-null account, or atomically advance a known
RevenueCat expiry strictly forward. Equal/older periods are inert, including
replays that would change tier. Cancellation never changes the entitlement
period. Expiration requires an already-elapsed event expiry that exactly matches
the current RevenueCat period in the UPDATE predicate. An empty sync can clear
only a known RevenueCat period that had elapsed before its fetch began. Missing
or lifetime expiry evidence cannot mutate existing lifecycle state; verify such
accounts manually rather than inventing an expiry. Existing lifetime grants are
preserved. Early revocation/refund cases require verified reconciliation.

Checkout issuance atomically reserves a fresh random token on the account, creates
a Stripe session carrying that token, and binds the returned session ID before
returning its URL. Only the latest issued checkout can complete. Completion must
match both pending token and session ID in its UPDATE, and consumes both fields.
Subscription deletion cannot recreate that state. Therefore replayed checkout A
cannot replace binding B or restore A/B after deletion. A legitimate checkout
after an ended subscription reserves fresh state and can complete normally.
Session metadata also propagates token/account identity to the subscription;
deletion or inactive updates revoke only matching pending state, even if they
arrive before completion. Older subscription events cannot revoke newer tokens.

Before rollout, expire or reconcile outstanding legacy checkout sessions without
this issued state. Their completion cannot grant access automatically. Never
backfill arbitrary tokens from webhook payloads to bypass the check. If multiple
checkouts or provider ownership changes overlap, reconcile any superseded paid
session with Stripe; entitlement protection is not automatic payment refunding.

Stripe subscription updates/deletions also require the current Stripe owner,
subscription ID, and customer. A failed payment keeps Stripe ownership for later
recovery; deletion clears access and ownership. Unknown/ambiguous Stripe prices
grant no default tier. These bounded rules do not implement a ledger for every
possible provider event type. Native billing and notification SDKs remain off.
