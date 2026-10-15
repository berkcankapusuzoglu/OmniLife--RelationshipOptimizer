# Task 7 — Dependency and Quality Gate Hardening

Implementation commit: `48e3b4b0c236405d1c367cbc19609017324f0fb3` (`fix(deps): harden launch dependencies and restore quality gates`).

Verified on 2026-10-15 in `H:\OmniLife--RelationshipOptimizer\.worktrees\play-launch-readiness`, branch `codex/play-launch-readiness`, Node.js `22.14.0`, npm `10.9.2`.

## Result

All required gates pass. The production audit reports **zero vulnerabilities**, with no production exceptions. All 254 tests pass; lint exits 0 with 22 warnings; the production Webpack build succeeds, including TypeScript and 52 static pages.

## Exact resolved versions

| Package | Resolved version | Change |
| --- | --- | --- |
| next | 16.4.1 | From 16.2.0; exact pin |
| eslint-config-next | 16.4.1 | Matches Next.js exactly |
| @capacitor/android, @capacitor/core, @capacitor/ios | 8.5.3 | Compatible Capacitor 8 upgrade |
| @capacitor/cli | 8.5.3 | Upgrade and move to devDependencies |
| drizzle-orm | 0.45.4 | Stable patch; no 1.0 prerelease |
| drizzle-kit | 0.31.11 | Stable patch; remains a development tool |
| resend | 6.12.4 | Minimum fixed release family; manifest `~6.12.3` |
| uuid | 13.0.2 | Fixed patch within existing major |
| source-map-js | 1.2.2 | Compatible transitive security update |
| qs | 6.16.1 | Compatible transitive security update |
| baseline-browser-mapping | 2.11.28 | Compatible transitive security update |
| sharp (Next.js production graph) | 0.35.5 | Fixed image-processing dependency |
| postcss | 8.5.23 | Fixed dependency supplied by upgraded Next.js |
| shadcn | 4.1.0 | Move to devDependencies |
| react, react-dom | 19.2.4 | Retained |
| eslint | 9.39.4 | Retained |
| typescript | 5.9.3 | Retained |

The remaining Capacitor plugins retain their compatible versions: app 8.1.0, browser 8.0.2, haptics/splash-screen/status-bar 8.0.1. No RevenueCat or push-notification package exists in the resulting lockfile.

## Scope and changes

- `package.json`, `package-lock.json`: fixed dependencies, compatible transitive updates, CLI dependency classification, documented Webpack production fallback.
- `src/app/(auth)/forgot-password/page.tsx`, `src/app/(dashboard)/onboarding/onboarding-client.tsx`, `src/app/(dashboard)/onboarding/page.tsx`, `src/app/(dashboard)/weekly-report/report-client.tsx`: escape JSX apostrophes without changing displayed text.
- `src/app/(public)/landing-client.tsx`: remove effect-driven counter reset; synchronize ticker dismissal with browser storage through `useSyncExternalStore`, including a server-safe snapshot. Only these lint hunks were staged; pre-existing pricing edits remain unstaged.
- `src/components/cookie-consent.tsx`: use the external-store subscription for persistent consent, including same-document notification after dismissal.
- `src/components/milestone-toast.tsx`: deterministic confetti values avoid impure render-time randomness.
- `src/lib/auth/__tests__/authorization.test.ts`, `tests/e2e/feature-check.spec.ts`: replace explicit `any` with actual mock/query/locator types and preserve hostile-input test coverage.

CLI move evidence: the only Capacitor CLI source import is a type in `capacitor.config.ts`; shadcn supplies a static stylesheet imported by `globals.css`, compiled during the build. No application JavaScript imports either CLI. The successful build's server `.nft.json` traces contain neither `node_modules/shadcn` nor `node_modules/@capacitor/cli`. Build and native sync environments must continue installing devDependencies. No runtime package was moved speculatively.

All pre-existing dirty/untracked user files were preserved. Staging used explicit file names and a selected landing-page patch; staged names and diff statistics were inspected before committing. No reset, checkout, clean, or stash was used.

## Next.js guides and constraints

Read the repository `AGENTS.md` and these exact bundled guides before framework-related changes, then checked the installed 16.4.1 versions:

- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`

Constraints applied: Node.js >=20.9 and TypeScript >=5.1; Capacitor CLI additionally requires Node.js >=22. Async request APIs/params remain asynchronous. ESLint uses the existing flat Core Web Vitals and TypeScript configs and runs independently because `next lint` is removed and `next build` does not lint. No legacy eslint configuration or rule suppression was added. React Compiler/Cache Components were not enabled. No cache or image API migration was needed. The installed guide requires a second argument for `revalidateTag`; the project has no calls.

Turbopack is the Next.js 16 default, but its CSS worker repeatedly exited before the parent process connected on this Windows host. The installed upgrade guide explicitly documents `next build --webpack` as the supported opt-out. Both production build scripts now use that flag; development remains on its existing default. The standard `npm run build` was rerun after this script change and passed.

## Commands and observed results

| Command | Result |
| --- | --- |
| Initial `npm audit --omit=dev --json` | 36 findings: 5 critical, 21 high, 8 moderate, 2 low |
| Initial `npm run lint` | 55 errors, 21 warnings |
| Official `npm view` release/engine/peer queries | Selected stable, matching, compatible versions above |
| `npm install --ignore-scripts` | Exit 0; selected dependency upgrades installed |
| `npm audit fix --ignore-scripts` and lockfile-only variant | npm 10.9.2 Arborist crashed reading `edgesOut` while resolving Vitest peers; no forced downgrade/major migration applied |
| `npm update source-map-js qs baseline-browser-mapping --ignore-scripts` | Exit 0; fixed the three remaining production advisories within existing ranges |
| `npm ci` | Exit 0; 1170 packages installed from the final dependency lockfile |
| `npm test` | Exit 0; 20 files, 254 tests passed |
| `npm run lint` | Exit 0; 0 errors, 22 warnings |
| `npx tsc --noEmit` | Exit 0 |
| `npm run build` (final scripts) | Exit 0; Next.js 16.4.1 Webpack, TypeScript passed, 52/52 static pages |
| `npm audit --omit=dev --audit-level=high` | Exit 0; found 0 vulnerabilities |
| `npm run check:secrets` | Exit 0; 295 tracked paths checked |
| `git diff --cached --check` | Exit 0 |

TEMP and TMP were redirected to project-local `.cache/task-7-temp` for checks after the sandbox's system temporary directory caused EPERM renames. The initial tests could not collect for that environment reason; with local TEMP, one browser-storage mock failure was fixed and the full final suite passed. Registry operations required network escalation after sandbox DNS failed. Google Fonts downloads required an escalated production build after sandbox network access failed. Git staging/commit required escalation because worktree Git metadata is outside its writable checkout path. No credentials or environment values were printed.

## Advisory evidence and residual risks

Version/advisory selection used official npm registry metadata and its live audit endpoint, with primary release/security references:

- [Next.js 16.4.1 security release](https://github.com/vercel/next.js/releases/tag/v16.4.1)
- [Next.js ImageResponse advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
- [UUID bounds-check advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

The complete audit including devDependencies still reports 49 findings (3 critical, 30 high, 14 moderate, 2 low). These are development/build/native tooling, including Capacitor assets/CLI, shadcn, Drizzle Kit's legacy esbuild loader, ESLint tooling, and Vitest/Vite. Critical chains include development `handlebars`, `proxy-addr`, and `tar`; production audit is zero. Some audit suggestions downgrade supported tools to old major versions, and Capacitor assets' old Sharp chain has no automatic fix. These were not forced into unrelated or incompatible migrations. Treat developer tooling inputs, downloaded registries, archive files, asset conversion, and development servers as trusted/local; keep these tooling services inaccessible publicly and omit devDependencies from runtime installations. Further development-tool remediation remains a follow-up risk, not a production exception.

Lint warnings are unused variables plus the newly reported settings-page relative `window.location.href` warning. The build also reports the existing Edge Runtime deprecation in the OG routes and missing `metadataBase` for social images; these are logged for a focused follow-up because the routes still compile. [Next.js deprecation guidance](https://nextjs.org/docs/messages/edge-runtime-deprecated) recommends migrating to Node.js, which should include OG rendering tests before changing deployment behavior.

This task verifies the current working tree, including pre-existing changes. It does not claim a clean-checkout whole-release verification, Android sync/build/device test, deployed email delivery, or database migration; those remain with the release/Android tasks.
