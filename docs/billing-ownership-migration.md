# Billing ownership release gate

Run this migration against the intended database before deploying the billing
handlers. Application startup and the production build do not run the migration
or record it as complete. Adding the column alone does not resolve historical
ownership. Keep the release blocked until the read-only check returns exit 0.

Back up the database first. Use an operator account and the intended
`DATABASE_URL`; the command can also read `.env.local`. Keep account manifests
and provider exports outside the repository. No Stripe or RevenueCat API calls
are made by this script.

Database connections require certificate verification. Set the optional
server-only `DATABASE_SSL_CA` to the PEM certificate contents (including the
`BEGIN CERTIFICATE` and `END CERTIFICATE` lines) when the provider CA is not in
the system trust store. Do not set it to a file path. Runtime and this operator
command use the same strict TLS options; malformed explicit PEM is a static
configuration error. Omitting the CA uses system roots and does not prove that
the provider connection will succeed. This verifies client-to-pooler TLS; the
pooler's internal `pg_stat_ssl` view describes a separate pooler-to-database
connection.

1. Run `node scripts/migrate-add-subscription-source.mjs --dry-run`.
   This makes no schema or data changes, including when the column is absent.
   It prints counts and returns exit 2 while ownership is unresolved.
2. Reconcile paid accounts against current provider records or owner-confirmed
   complimentary grant records. Stored Stripe IDs
   alone are insufficient: an old ID can remain after another provider granted
   access. Verify the account, current subscription, current tier, provider
   status/period, and that Stripe owns the account entitlement. Prepare the
   manifest below from that evidence and the current database row snapshot.
   For a manual grant, confirm the account UUID, current tier and exact expiry,
   that the grant is complimentary, and that both stored Stripe IDs are null.
   Do not infer manual ownership from an email or from missing provider IDs.
3. Run the dry run with `--ownership-manifest <private-path>` to inspect proposed
   counts. Then run `node scripts/migrate-add-subscription-source.mjs --apply
   --ownership-manifest <private-path>` during a maintenance window.
   `--stripe-manifest` remains an alias; supply only one manifest argument.
   It adds the
   nullable source and pending-checkout columns, locks the users table against
   concurrent writes for the transaction, and sets only the owner on exact
   matching null-source paid rows. Every manifest entry is checked under the
   lock before any backfill: a changed snapshot, missing account, or conflicting
   owner prevents backfills for the entire manifest. It preflights source values across all users,
   including free accounts; invalid values block all DDL/backfill. After a clean
   preflight it installs and validates `users_subscription_source_check`, which
   allows only SQL NULL, `stripe`, `revenuecat`, or `manual`. Repeated apply runs recreate
   that check canonically and validate it under the lock.
   It changes no tier, expiry, or Stripe IDs. Repeating it is safe.
4. Reconcile remaining paid rows with unknown ownership. This includes legacy
   RevenueCat accounts; the script never infers RevenueCat ownership. Inspect
   current RevenueCat subscriber entitlements and account identity, rule out a
   conflicting Stripe subscription, then have the database owner perform a
   reviewed conditional backfill to `revenuecat` for those verified accounts.
   Confirmed complimentary accounts use the explicit `manual` allowlist below.
   Preserve their current finite expiry or null lifetime expiry exactly. This
   migration records ownership only; it cannot create, extend, or upgrade a grant.
5. Run `node scripts/migrate-add-subscription-source.mjs --check` without a
   manifest. Archive its output with the operator's evidence. Release requires
   `sourceColumnPresent: true`, `checkoutStateColumnsPresent: true`,
   `sourceConstraintValidated: true`, `invalidSourceRows: 0`,
   `unresolvedPaidRows: 0`, and `ready: true`. The constraint check verifies its
   canonical definition as well as validation state. A named, validated older
   two-provider constraint is not ready for manual ownership.

The command prints `proposedStripeBackfills`, `appliedStripeBackfills`,
`alreadyOwnedStripeRows`, `proposedManualBackfills`, `appliedManualBackfills`,
`alreadyOwnedManualRows`, `unmatchedManifestRecords`, and `unresolvedPaidRows`.
Only aggregate counts are printed; account IDs and manifest contents are private.
`invalidSourceRows` counts every non-null value outside the ownership allowlist,
regardless of account tier. Inspect and reconcile those values from evidence;
the migration never silently normalizes or deletes them.
Exit 0 means the ownership check is ready, exit 2 means a release gate remains,
and exit 1 means a command/validation/database error. A failed or unresolved run
must not be treated as migration completion. An apply run may commit verified
backfills while still returning exit 2 for unresolved accounts outside its
manifest. Any unmatched manifest entry blocks all backfills in that run.

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

## Private manual ownership manifest

The same manifest retains the required `stripe` array and can include an optional
`manual` array. Either nonempty array requires `verifiedAt` within the last 24
hours, with no future timestamp. Duplicate account UUIDs within either array or
across both arrays are rejected, including different letter casing.

Each manual entry requires the existing paid tier (`pro` or `premium`), the exact
current `recordedExpiresAt` as an ISO timestamp or JSON `null`, both Stripe IDs
explicitly JSON `null`, and `ownerConfirmed: true`. Confirmation means the owner
has reviewed the complimentary grant and ruled out conflicting provider billing.
The database snapshot must have those same null Stripe IDs, tier, and expiry.
Expiry matching preserves PostgreSQL's full microsecond precision and compares
equivalent ISO timezone offsets as the same instant. Use at most six fractional
second digits; unsupported timestamp formats or precision are rejected rather
than rounded. This also applies to Stripe expiry evidence.
The following account UUID is synthetic; keep actual evidence outside the repo.

```json
{
  "verifiedAt": "2026-10-15T16:00:00Z",
  "stripe": [],
  "manual": [
    {
      "userId": "00000000-0000-4000-8000-000000000002",
      "subscriptionTier": "premium",
      "recordedExpiresAt": null,
      "stripeCustomerId": null,
      "stripeSubscriptionId": null,
      "ownerConfirmed": true
    }
  ]
}
```

After reconciliation, repeating apply reports `alreadyOwnedManualRows` without
changing those rows. Finite complimentary periods are preserved even if already
elapsed; access decisions continue to use the recorded expiry. Manual ownership
also preserves null lifetime grants. Do not change an expiry to satisfy a check.
The legacy `scripts/grant-premium.ts` is disabled and exits before reading
credentials or connecting to a database. Use this reviewed reconciliation path
for existing grants; new grants require a separately reviewed operator process.

## Handler lifecycle rules

A paid null-source legacy row is preserved pending reconciliation. Neither
provider can take the other's entitlement, including for a paid event. Provider
webhooks and RevenueCat sync preserve manual ownership and its tier/expiry;
Stripe checkout refuses paid manual accounts before creating a paid session.

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
