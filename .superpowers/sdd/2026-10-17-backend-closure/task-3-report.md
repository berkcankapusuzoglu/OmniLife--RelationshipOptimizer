# Task 3 report: shared certificate-verified database options

Implemented `databaseConnectionOptions` and wired both the application database
client and ownership migration CLI to use it. Connections always use
`rejectUnauthorized: true`, fixed `prepare: false`, `max: 1`, and
`connect_timeout: 10`. An optional `DATABASE_SSL_CA` must contain valid PEM
certificate content; malformed explicit values throw the static
`Invalid DATABASE_SSL_CA configuration` error. No verification-disable option
is accepted.

Added tests covering system roots, a valid explicit CA, malformed values, fixed
pooler options, both callers, and postgres.js resolution of explicit strict TLS
options against a synthetic URL containing `sslmode=disable`. No database or
network connection was opened. `.env.example` and the migration guide describe
multiline PEM configuration and distinguish client-to-pooler TLS from the
pooler's internal `pg_stat_ssl` view.

Verification:

- Focused test: 7 passed.
- Full test suite: 29 files and 421 tests passed.
- `npm run lint`: passed with 37 existing warnings; no errors.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.

The TDD test first failed because the new helper module did not exist, then
passed after implementation. The first Vitest attempt hit a sandbox temporary
directory rename restriction; rerunning with a worktree-local temp directory
worked. No live connection or production operation was performed.
