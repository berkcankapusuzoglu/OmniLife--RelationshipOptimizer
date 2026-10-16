# Minimum Safe Google Play Launch Design

Status (2026-10-16): This is the approved design, not evidence that all acceptance gates are complete. Use [the closed-test checklist](../../release/1.0.3-closed-test-checklist.md) for current verification, deployment, provider configuration, signing, device and owner gates. The keepalive job uses only Vercel's daily scheduler with required `CRON_SECRET`; no GitHub backup scheduler is retained.

## Intent

Ship the smallest credible Android release that protects users, satisfies Google Play's account and privacy requirements, and can complete closed testing without depending on unfinished billing infrastructure.

The first Android public release will be free. Stripe may continue to serve the web product, but the Android experience must not advertise, link to, or initiate external digital purchases. Google Play Billing and RevenueCat are a separate post-launch project.

This release keeps the existing Play listing, package `com.omnilife.app`, OmniLife name, and Vercel deployment URL. The owner must explicitly accept or resolve the documented naming risk before production rollout; a rename is not part of engineering readiness.

## Goals

- Make sessions tamper-resistant and derive every user identity on the server.
- Enforce ownership for every read and write of user, partner, and relationship data.
- Remove committed credentials and prevent recurrence.
- Provide complete account deletion in the app and from a public web entry point.
- Make the privacy policy and Play declarations accurately describe the implementation.
- Upgrade release-critical vulnerable dependencies without changing product behavior.
- Put reproducible Android source under version control while excluding keys and outputs.
- Produce a fresh, tested AAB suitable for a 12-person closed test.
- Leave a concise operator checklist for actions that require the owner's external accounts.

## Non-goals

- Google Play subscriptions, RevenueCat monetization, or new pricing.
- Push notifications.
- New product features, UI redesign, analytics expansion, or algorithm changes.
- Rewriting the authentication system around a new identity provider.
- Automatically rewriting published Git history or rotating third-party credentials.
- Automatically recruiting or impersonating testers, submitting declarations on the owner's behalf, or releasing to production without an explicit final confirmation.

## Architecture

### Authentication and authorization

Keep the existing email/password system but replace the forgeable cookie with an HMAC-SHA-256 signed, versioned session payload using a required `SESSION_SECRET`. Verification must reject malformed, expired, incorrectly signed, and legacy unsigned cookies using constant-time signature comparison. Authentication helpers return the current database user.

Every server action and authenticated route derives the current user from the verified session. Client-provided `userId` values are removed where practical and never used for authorization. Mutations by resource ID include an ownership predicate or verify ownership before changing data. Partner comparison is limited to the authenticated user's active linked partner relationship.

### Account deletion

Add one deletion service used by both the dashboard settings flow and a public `/delete-account` page. The user must authenticate, explicitly confirm, and re-enter their password. Deletion removes or anonymizes all owned personal/relationship data in a transaction, invalidates the session, and returns the user to a confirmation page. The public page also explains how to request help when login is unavailable.

Active application data is deleted immediately. A surviving partner keeps only records they own: their partner link is cleared, tasks created by the deleted user are removed, assignments to the deleted user are cleared, and couple sync data/referrals originating from the deleted user are removed. Matching account-associated marketing records are removed. Existing Stripe subscriptions must be cancelled and the Stripe customer deleted where an identifier exists; dormant RevenueCat records are handled through a documented operator request if they exist. The policy describes actual provider backup retention rather than promising deletion from backups sooner than the provider supports.

### Free Android release boundary

Native Android must not display Stripe checkout, pricing purchase buttons, RevenueCat purchase controls, or links that direct users to external digital purchases. Existing free functionality remains available. Web Stripe behavior remains unchanged. RevenueCat code can remain dormant, but missing RevenueCat configuration must not create errors or broken controls in Android.

Existing server-side Pro/Premium entitlements remain honored on Android as access-only entitlements. Free users may see a neutral locked state, but no price, purchase instruction, external link, or upgrade control. The free release removes the RevenueCat native SDK, Play Billing permission, push-notification plugin/startup flow, and notification permissions; each can return in a later dedicated project.

### Release hardening

Upgrade Next.js, Capacitor, Drizzle ORM, Resend, UUID, and affected transitive dependencies to non-vulnerable compatible versions. Follow the installed Next.js 16 documentation before changing framework-dependent code. Move build-only CLI packages out of production dependencies where applicable.

Track the Android project except keystores, credentials, local configuration, generated build folders, and artifacts. Increment the Android version code and rebuild only after application verification passes.

## Privacy and store truthfulness

The privacy policy must describe signed—not encrypted—sessions and list the actual processors and flows used by the released build, including hosting/database, email, AI coaching, analytics, Stripe on the web, and Google Play/RevenueCat only if active. It must document retention and deletion behavior and avoid medical claims.

The operator checklist must map actual behavior to Data Safety, Health Apps, content rating, ads, target audience, app access, and account-deletion declarations. Unknown legal or business answers remain owner decisions and must be clearly marked.

## Testing and acceptance

- Tests prove unsigned, altered, malformed, and expired session cookies are rejected.
- Authorization tests prove one account cannot read, update, or delete another account's resources.
- Deletion tests prove all scoped data is removed and sessions become unusable.
- Android/native-mode tests prove no external digital-purchase path is visible or callable.
- Unit tests, TypeScript/build, lint, production smoke tests, and a dependency audit pass with no critical/high production vulnerabilities accepted silently.
- A clean checkout can reproduce the Android build without the signing key being tracked.
- The new AAB targets API 36, has a version code above 5, and receives a clean or triaged Play pre-launch report.

## Agent execution model

Work is mostly sequential because authentication touches nearly every subsystem and the current working tree contains unfinished changes. Use focused implementation agents with a fresh review agent after each security-sensitive task. Parallelize only documentation/store-readiness work that does not edit the same files. Preserve all pre-existing working-tree changes and never expose secrets in logs or reports.

## Owner-only gates

- Rotate the exposed production/admin credential and Android keystore password.
- Supply a strong production `SESSION_SECRET` through Vercel secrets.
- Confirm final privacy and Play declaration answers.
- Confirm account eligibility and, where required, recruit at least 12 real closed-test users and keep them opted in for 14 continuous days.
- Explicitly approve Play submissions and production rollout.
- Confirm that the displayed privacy/support contact is monitored before deployment.
