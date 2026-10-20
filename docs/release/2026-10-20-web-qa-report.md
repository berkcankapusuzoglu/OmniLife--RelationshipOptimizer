# Couplemetric — Live Web QA Report (2026-10-20)

Target: https://omnilife-relationship-optimizer.vercel.app (iPhone 14 390x844 + 360x740 emulation). 12 journeys explored, 17 critical/high items re-tested by a skeptic agent. Note: the live deployment runs `main`; the local `feat/monetization` branch already changes some of the billing behaviour noted below.

## 1. Executive summary

- **Two first-run blockers hit every new user**: after Register/Login the `/onboarding` redirect renders a solid black page until manual reload (verified 5x across journeys, caused by the `redirect('/overview')` → layout `redirect('/onboarding')` chain), and during onboarding the bottom nav lets users client-navigate past the onboarding guard into an empty dashboard.
- **Money and legal are not ready for Play closed testing**: live Stripe charges Pro at $4.99 while /pricing advertises $3.99 (verified, live mode), checkout is branded "OmniLife Pro / LLC Luna", the privacy/terms pages ship internal operator to-do text with no contact address, and the landing page shows fabricated social proof (fake live toast, random "12,8xx+ couples" counter, "Verified" testimonials).
- **Silent failure is the dominant pattern**: five separate forms (onboarding partner email, settings profile name, partner code link, weights save, share fallback) swallow server errors and leave the user with a stuck button or no feedback. The free-tier exercise paywall is not enforced. Accessibility baseline: `maximum-scale=1` blocks pinch zoom everywhere, and all 9 onboarding/weights sliders are unlabelled.

### Scorecard (1–5)

| Journey | Functional | UX | Visual | A11y | Perf | Completed |
|---|---|---|---|---|---|---|
| auth | 3 | 3 | 4 | 2 | 2 | yes |
| onboarding | 2 | 3 | 4 | 2 | 4 | yes |
| daily-log | 2 | 2 | 4 | 3 | 4 | no (blocked by D-05) |
| score-reveal | 3 | 2 | 3 | 3 | 4 | yes |
| exercises | 2 | 2 | 4 | 3 | 4 | yes |
| partner | 3 | 3 | 3 | 3 | 4 | yes |
| compare-insights | 3 | 3 | 3 | 3 | 4 | yes |
| pricing | 2 | 3 | 4 | 3 | 4 | yes |
| settings | 3 | 3 | 4 | 2 | 4 | yes |
| delete-account | 4 | 3 | 4 | 3 | 4 | yes |
| quiz | 4 | 3 | 3 | 3 | 4 | yes |
| landing-legal | 4 | 3 | 3 | 3 | 4 | yes |
| coaching | 5 | 3 | 4 | 3 | 5 | yes |

## 2. Ranked defect list (deduplicated)

Evidence root: `C:/Users/berkc/AppData/Local/Temp/claude/H--OmniLife--RelationshipOptimizer/b3099a19-b2c1-40d2-8f52-1298e21eb4f1/scratchpad/qa/` (abbreviated `qa/` below). "Verified" = reproduced by the skeptic agent on live or by deterministic source trace.

### Critical

| # | Journey | Screen | Issue | Repro | Evidence | Fix | Effort |
|---|---|---|---|---|---|---|---|
| D-01 (verified) | pricing, exercises | Stripe Checkout (Pro monthly) | Live-mode checkout shows "OmniLife Pro $4.99/month" while /pricing advertises Pro $3.99/mo; other 3 price mappings are correct. | Login free user → /pricing Monthly → Go Pro → Stripe page | `qa/pricing/verify-stripe-pro-monthly.png`, `qa/pricing/16-stripe-pro-monthly.png` | Correct `STRIPE_PRO_MONTHLY_PRICE_ID` in Vercel env (code mapping in `src/lib/stripe/config.ts` is right), or deploy `feat/monetization` which removes Pro from sale and reconcile pricing copy. | S (env) |

### High

| # | Journey | Screen | Issue | Repro | Evidence | Fix | Effort |
|---|---|---|---|---|---|---|---|
| D-02 (verified) | auth, onboarding, daily-log, score-reveal, partner, settings, delete-account | /onboarding right after Register or Login | Black screen; body holds only RSC flight scripts + cookie banner; up to 340 looping `GET /onboarding?_rsc` fetches; only manual reload recovers. 5 independent reproductions. | Register fresh account on iPhone 14 viewport → observe /onboarding | `qa/verify/01-after-register.png`, `qa/delete-account/retest-02-after-register-6s.png`, `qa/auth/04-after-register.png` | In `src/lib/auth/actions.ts` (lines ~65, ~100) redirect to `/onboarding` directly when `onboardingCompleted=false` instead of `/overview`; alternatively make the layout guard not depend on `x-pathname` (route-group layout that excludes `/onboarding`). | S |
| D-03 (verified) | onboarding, delete-account | /onboarding bottom nav / hamburger | Client-side nav (Home/Daily) bypasses the onboarding guard in `(dashboard)/layout.tsx`; renders empty dashboard, wizard progress lost. | New account on /onboarding → tap Home in bottom nav | `qa/onboarding/verify-02-home.png`, `qa/onboarding/12-guard-bypass-daily.png` | Hide bottom nav/sidebar while `onboardingCompleted=false`, and enforce the guard in `src/proxy.ts` or a `template.tsx` / per-page check. | S–M |
| D-04 (verified) | onboarding, partner | /onboarding step 5 Complete Setup | Invalid partner email → `onboardingInput.parse` throws → HTTP 500; client `catch {}` never resets `submitting`; button stuck "Setting up..." forever, reload wipes all answers. | Step 5, type `not-an-email`, Complete Setup | `qa/onboarding/verify-01-stuck.png`, `qa/partner/10-after-complete-setup.png` | `onboarding/actions.ts`: return `{error}` on validation failure; `onboarding-client.tsx` handleSubmit: rethrow redirect errors, else `setSubmitting(false)` + show error; client-side email check. | S |
| D-05 (verified, downgraded from critical) | daily-log, score-reveal, compare-insights | /daily on signup day | Onboarding self-assessment consumes the day's single log; Quick/Detailed wizard, mode toggle, milestone toast and confetti unreachable on day one; no edit path (`/daily/edit` 404). | Complete onboarding with default 5s → open /daily | `qa/verify/08-daily.png`, `qa/daily-log/10-daily-initial.png` | In `daily/page.tsx` allow editing/replacing today's entry (or skip the day gate when the only log is the onboarding-sourced one); show per-dimension values in the already-logged state. | M |
| D-06 (verified) | partner, compare-insights | /partner Link Partner | Own code or invalid code → zero feedback. `linkPartner` discards `claimPartnerInvite` boolean; client sets `justLinked=true` unconditionally; invalid-format code throws uncaught. | Generate Code → paste own code → Link Partner | `qa/verify/selflink.png`, `qa/verify/invalid.png` | `partner/actions.ts` return `{ok,error}`; `partner-client.tsx` render inline error. | S |
| D-07 (verified) | score-reveal | /share/result share card | Card is `overflow-hidden aspect-square`; radar SVG (y 496–696) clipped at y=582: lower axis labels, date and footer hidden; ~400px dead space above. | Open any /share/result URL on phone | `qa/verify/01-share.png` | `src/components/score-card.tsx:171`: drop `aspect-square`/overflow-hidden or size radar to fit. | S |
| D-08 (verified) | score-reveal, quiz | /share/result, /api/og | Stale branding on viral surfaces: "O" logo and "omnilife.app" footer; OG image fabricates Life/Rel scores from quiz total and omits archetype. | Open /share/result or /api/og?total=54... | `qa/score-reveal/16-share-result.png`, `qa/quiz/11-og-image.png` | Rebrand score-card and OG route to Couplemetric + live domain; pass archetype into OG for quiz shares. | S |
| D-09 (verified) | exercises, pricing | /exercises | Free tier "3 exercises per week" not enforced: `exercises.slice(0, exerciseLimit)` with completed items dropping out, so unlimited rotation; no counter/locked cards/upsell. | Free user completes 5 exercises in a row | `qa/exercises/14-after-5-completed.png` | Track weekly completions server-side and gate at the limit; show locked cards + UpgradePrompt. Align with `feat/monetization` limit (5). | M |
| D-10 (verified) | compare-insights | Insights › Advanced › Focus Optimizer | Tradeoff text uses unclamped Nelder-Mead solution: "stress may decrease by ~479.2 points", "Predicted 100.0". | Default-5 onboarding → /insights Advanced | `qa/verify/adv.png` | `src/lib/engine/optimizer.ts` ~line 199: compute deltas from clamped 0–10 solution; cap predicted gain; hide optimizer until ≥N logs. | S |
| D-11 (verified) | pricing | Stripe Checkout (all plans) | Merchant "LLC Luna", products "OmniLife Pro/Premium" at the payment moment. | Go Pro / Go Premium → Stripe page | `qa/pricing/16-stripe-pro-monthly.png` | Stripe Dashboard: public business name, statement descriptor, product names → Couplemetric. | S (owner) |
| D-12 (verified) | landing-legal | /privacy, /terms | Internal operator to-dos published ("has not yet been verified by the operator", "must be published here before the Play launch"); no contact email anywhere. Play/GDPR/CCPA blocker. | Open /privacy §6, §9, §11; /terms §14 | `qa/landing-legal/run2/14-privacy-bottom.png` | Set `ACCOUNT_DELETION_CONTACT_VERIFIED=true` + contact value in Vercel; rewrite placeholder sections in `src/app/(public)/privacy/page.tsx`, terms, delete-account. | S–M |
| D-13 (verified) | landing-legal | Landing page / | Fabricated social proof: random-incrementing "12,847+ couples", fake live toast ("Sarah & James just completed..."), "Verified" testimonials. | Load / twice, wait 5s | `qa/landing-legal/run2/03-landing-toast-under-cookie.png` | `src/app/(public)/landing-client.tsx` lines ~149–172: remove counter/toast/Verified badges or label as illustrative. | S |
| D-14 (unverified) | settings | /settings Profile | Empty or 2000-char name → `profileName.parse` throws, client has no try/catch → "Saving..." stuck forever. Source-confirmed, downgraded to medium by skeptic (reload recovers). | Clear Name → Save | `qa/settings/03c-profile-empty-stuck.png` | `settings-client.tsx:112-118` try/catch + inline error; `maxLength` on input. | S |

### Medium

| # | Journey | Screen | Issue | Repro | Evidence | Fix | Effort |
|---|---|---|---|---|---|---|---|
| D-15 | all | every page | `maximum-scale=1` in viewport meta blocks pinch zoom (WCAG 1.4.4); axe `meta-viewport` on every screen. | Inspect meta viewport | `qa/onboarding/axe-step1-goals.json` | `app/layout.tsx`: remove `maximum-scale=1` (keep `viewport-fit=cover`). | S |
| D-16 | onboarding, score-reveal, settings | Sliders / selects / icon buttons | 9 onboarding sliders + 19 Weights controls unlabelled (axe `label` critical); Type/Dimension selects unnamed; copy-code buttons on /partner and /refer have no name; score help buttons all "Help". | Run axe on step 2, Weights tab, /partner | `qa/onboarding/axe-step2-assessment.json`, `qa/settings/06-weights.png` | Add `aria-label`/`aria-labelledby` to range inputs, selects, icon buttons. | S |
| D-17 | onboarding, quiz, score-reveal, exercises | Wizard state | Onboarding, quiz and in-progress exercise timer all reset on reload/Back; browser Back leaves the flow. | Reach step 3, reload or Back | `qa/onboarding/16-back-result.png`, `qa/quiz/21-after-browser-back.png` | Persist wizard state in sessionStorage; push history entries per step. | M |
| D-18 | partner, daily-log, score-reveal | Fixed bottom nav | Nav overlaps primary CTAs (Next / Complete Setup / Link Partner at 390px; Exercise + Share Score at 360px); first tap on Next intercepted 3/3 runs. | Onboarding step 1, tap Next without scrolling | `qa/partner/06-onboarding-step.png`, `qa/score-reveal/22-overview-360-overlap.png` | Add bottom padding = nav height (+safe area) to dashboard content container; sticky action bar above nav. | S |
| D-19 | onboarding | Step 4 Add Constraint | Min 99999999 / Max −5 / 400-char name accepted; unbroken name widens viewport to 704px and breaks layout until reload. | Add constraint with those values | `qa/onboarding/09-step4-constraint-boundary.png` | min/max/step attrs, zod clamp 1–10, min<=max, name maxLength, `break-words`. | S |
| D-20 | settings | Weights tab | 999 in Vitality → siblings −300, total still "1.00"; save silently fails; happy-path save has no feedback. | Type 999 into Vitality | `qa/settings/07-weights-negative.png` | Clamp on input, disable Save when invalid, add Saving/Saved state. | S |
| D-21 | partner | Unlink Partner | Executes on single tap, no confirmation, no toast; affects both accounts. | Linked user taps Unlink | `qa/partner/29-after-unlink-B.png` | Confirmation dialog + toast. | S |
| D-22 | score-reveal, settings, quiz | Share/export dates | Dates use UTC (`toISOString`), showing tomorrow for UTC-negative users; streak shows "1 day" dated a day ahead; share text uses Overall not Relationship score. | Share Score at 21:05 UTC-4 | `qa/score-reveal/16-share-result.png` | Use local date helper client-side for display; pass user tz or client date for daily log date. | M |
| D-23 | score-reveal | Share Score button | Clipboard fallback silent; copies even after share AbortError; triple-tap fires 3 shares. | Tap Share Score w/o Web Share | `qa/score-reveal/15c-share-fallback.png` | Toast on copy, ignore AbortError, in-flight guard. | S |
| D-24 | pricing | /pricing Go Premium | Double tap creates two live Checkout sessions (disabled set async). | Double-tap Go Premium | `qa/pricing/07-gopro-result.png` | Synchronous ref guard before fetch. | S |
| D-25 | daily-log | /overview Quick Actions | "View Today's Log" links to /insights, duplicate of "View Insights". | Tap card | `qa/daily-log/14-overview-quick-actions.png` | `dashboard-client.tsx:424` link to /daily. | S |
| D-26 | compare-insights | Insights Recommendations tab | "Log your daily scores..." dead end while app says today is logged; Advanced tab already shows a plan. | Default onboarding → /insights | `qa/compare-insights/03-insights-initial.png` | Generate recommendations from the onboarding log or link to next action. | S |
| D-27 | compare-insights | Advanced › More info popover | Popover clipped off right edge on phones. | Tap (?) at 390px | `qa/compare-insights/13-more-info-tooltip.png` | Collision-aware positioning / `max-w-[calc(100vw-32px)]`. | S |
| D-28 | settings | /scenarios, /constraints | Pro-locked for free users right after onboarding let them pick a scenario and add constraints; aria-hidden-focus + 22 contrast failures on blurred content. | Free user → menu › Scenarios | `qa/settings/14-scenarios.png` | Either gate in onboarding or unlock basics; `inert` on blurred content. | S–M |
| D-29 | partner | /partner at 360px | scrollWidth 399: Linked chip, streak badge, Couple Bonus clipped. | 360px linked view | `qa/partner/27-partner-360.png` | `flex-wrap`/`min-w-0` on header row. | S |
| D-30 | landing-legal | Landing vs /pricing | Landing shows Free+Premium only, /pricing shows Pro too; "Save 37%" only true for Pro (Premium is 33%). | Compare both pages | `qa/landing-legal/run2/12-pricing-yearly.png` | Single source (`TIERS`) for both; per-tier savings badge. | S |
| D-31 | landing-legal | Public Back button | On / Back goes to about:blank; on deep-linked /terms does nothing. | Open / in fresh tab, tap Back | `qa/landing-legal/run2/02-landing-after-back.png` | Hide on `/`; fallback to `/` when `history.length<=1`. | S |
| D-32 | landing-legal | Blog post | Tag row doesn't wrap: scrollWidth 522 at 390px, page zooms out. | Open any blog post | `qa/landing-legal/run2/22-blogpost-390-hscroll.png` | `flex-wrap` on tag row. | S |
| D-33 | landing-legal | Landing overlays | Cookie banner + fake toast + sticky quiz bar stack over bottom 160px; toast dismiss unreachable. | Fresh load of / | `qa/landing-legal/run2/03-landing-toast-under-cookie.png` | Remove toast (D-13); one overlay at a time. | S |
| D-34 | quiz | /quiz/result radar | "Stress"/"Fairness" labels clipped by SVG bounds. | Open /quiz/result?s=OCwxLDcsMiw5 | `qa/quiz/08b-result-top-settled.png` | `overflow: visible` on svg or widen viewBox. | S |
| D-35 | quiz | Question screens | Next disabled at default 5 with no hint; must move slider. | Start quiz, tap Next | `qa/quiz/02-q1.png` | Enable with default or show hint. | S |
| D-36 | auth | /login, /register | Server errors not announced (no role=alert/aria-live, no aria-invalid). | Wrong password → Sign in | `qa/auth/08-login-wrong-password.png` | `role="alert"` + `aria-describedby`. | S |
| D-37 | delete-account | /settings during onboarding | Settings/deletion unreachable until 5-step onboarding done; nav items shown but bounce. | New account → /settings | `qa/delete-account/04-settings.png` | Resolved by D-03 (hide nav) + allow /settings or onboarding skip. | S |
| D-38 | coaching | /coaching paywall | "Upgrade — $4.99/mo" and "Compare Plans" both go to /pricing with nothing pre-selected. | Tap Upgrade | `qa/coaching/10-upgrade-result.png` | Deep-link `/pricing?plan=premium` or start checkout directly (web only). | S |
| D-39 | exercises | Active exercise | Tapping a star at 0:00 instantly completes, no confirmation/toast/history. | Start Exercise → tap star 5 | `qa/exercises/11-exercise-rated.png` | Require timer start or confirm; completion toast; history entry. | M |
| D-40 | pricing | /pricing | Contrast failure on "Save 37%", toggle lacks aria-pressed, name reads "YearlySave 37%". | axe on /pricing | `qa/pricing/02-pricing-yearly.png` | Fix badge colour, `aria-pressed`, separate badge label. | S |

### Low (grouped)

- **Validation limits**: 600-char / whitespace-only name accepted at /register (D-41, `qa/auth/17-register-long-name.png`); 300-char newsletter local part accepted (D-42). Fix: `maxLength` + zod `.trim().min(1).max(100)`. S
- **Password UX**: no show/hide toggle, rules hidden until native bubble (D-43). S
- **Inline links colour-only** on auth pages (axe `link-in-text-block`) (D-44). S
- **Card footer seam** on auth cards (D-45). S
- **First-visit copy**: "Welcome back" seconds after signup, "Longest: 1 days", gratitude card claims "improvements" on first log (D-46, `qa/score-reveal/12-overview-first.png`). S
- **Scroll position retained** between onboarding steps (D-47). S
- **Chips lack aria-pressed** (onboarding step 1) (D-48). S
- **Quiz**: "I'm a The Growth Seeker" share text (D-49); archetype contradicts bars (Growth 2/10 → "Growth Seeker") (D-50); two "Back" controls (D-51); quiz→register loses score context (D-52). S–M
- **Delete account**: self-referencing help link (D-53); sign-in link lacks return URL (D-54); DELETE text cleared on wrong password, no pending state (D-55); "Cannot sign in?" shows internal placeholder (covered by D-12). S
- **Export Data**: no feedback, double download (D-56). S
- **Privacy typo** "databasehosted", dev-facing "event handler logs in development" copy (D-57). S
- **Landing**: duplicate header/footer (D-58); no link to /blog (D-59); logged-out Free card says "Current Plan" (D-60); 404 for blog slug lacks title/main (D-61). S
- **Exercises a11y**: star buttons 28px, no labels; heading-order (D-62). S
- **Recharts zero-size warning** on /insights, /compare (D-63). S
- **Dark-only theme** ignores `prefers-color-scheme: light` on every page (D-64) — known backlog; declare `color-scheme: dark` meta at minimum. S
- **Coaching**: Back control 53x20px (D-65); paywall shows no teaser of locked content (D-66). S
- **Partner**: owner opening own invite link sees "Invitation unavailable"; already-linked user still sees invite step (D-67). S

### Dropped / not reproduced

- pricing-03 "double submission on register" — not reproduced; submit already `disabled={isPending}`. Dropped.
- exercises-01 was a duplicate of D-01 (confirmed via the pricing journey).

## 3. Compared to Paired / Flamme / Candle

**Where Couplemetric is weaker**
- First-run experience: Paired/Flamme persist onboarding answers across app kills and carry quiz answers into onboarding; Couplemetric loses all wizard state on reload/Back and lands new users on a blank screen (D-02, D-17, D-52).
- Celebration and feedback: competitors celebrate the first check-in and exercise completion explicitly; Couplemetric shows no reveal, no toast, no confetti on day one, and exercises complete silently with no history (D-05, D-39).
- Paywall conversion: competitors deep-link the paywall CTA straight into the purchase sheet and show a teaser of locked content; here two CTAs both land on a generic /pricing page and the coaching gate is a single empty card (D-38, D-66).
- Trust at payment: competitors show their own brand on the store sheet; here the user meets "OmniLife Pro / LLC Luna" at the wrong price (D-01, D-11).
- Destructive actions: Paired/Flamme confirm before unlinking a partner (D-21).
- Theming: competitors follow the system light/dark preference (D-64).
- Social proof: competitors cite real store ratings; the landing page fabricates it (D-13).
- Weights UI: nine free-text 0–100 number inputs vs competitors' presets/balance sliders (D-20 note).

**Where Couplemetric is stronger**
- Account deletion is more transparent and self-service than Paired/Flamme (password + typed DELETE, explicit list of what is deleted, partner/Stripe caveats).
- Partner linking has an explicit consent review step listing exactly what is and is not shared before linking; linking is reciprocal and immediate with side-by-side compare.
- Legal pages are unusually transparent about data flows (Gemini, Stripe, Resend, partner visibility) once the placeholder text is removed.
- Scoring depth: radar, Pareto "At Your Best", optimizer and per-dimension compare go beyond competitors' single check-in score (once D-10 is fixed).
- Quiz robustness: tampered result URLs degrade cleanly; zero console errors across all public pages; fast loads (~176ms nav, ~660ms TTFB).
- No account enumeration on forgot-password; case-insensitive duplicate-email handling.

## 4. Top 10 fixes before Play closed testing

**Auth / routing — `src/lib/auth/actions.ts`, `src/app/(dashboard)/layout.tsx`, `src/proxy.ts`, nav components**
- [ ] 1. Redirect register/login straight to `/onboarding` when `onboardingCompleted=false`; make the guard independent of `x-pathname` (D-02).
- [ ] 2. Hide bottom nav/sidebar while onboarding is incomplete and enforce the guard on client navigation (proxy or template) (D-03, D-37).

**Onboarding — `src/app/(dashboard)/onboarding/actions.ts`, `onboarding-client.tsx`, `src/lib/auth/action-inputs.ts`**
- [ ] 3. Return `{error}` from `completeOnboarding` on validation failure, reset `submitting`, validate partner email client-side; clamp constraint min/max/name (D-04, D-19).
- [ ] 4. Add bottom padding for the fixed nav so Next/Complete Setup/Link Partner are tappable; label the 9 sliders and selects (D-18, D-16).

**Partner — `src/app/(dashboard)/partner/actions.ts`, `partner-client.tsx`**
- [ ] 5. Return `{ok,error}` from `linkPartner` and render inline errors; add Unlink confirmation (D-06, D-21).

**Billing / Stripe — Vercel env, Stripe Dashboard, `src/lib/subscription/tiers.ts`, landing + pricing pages**
- [ ] 6. Fix `STRIPE_PRO_MONTHLY_PRICE_ID` (or deploy `feat/monetization`), rename Stripe products/business name to Couplemetric, reconcile landing vs /pricing tiers and savings badge (D-01, D-11, D-30).

**Legal / landing — `src/app/(public)/privacy/page.tsx`, terms, delete-account, `landing-client.tsx`, Vercel env**
- [ ] 7. Set `ACCOUNT_DELETION_CONTACT_VERIFIED` + a real contact; remove operator placeholder sections and the "databasehosted" typo (D-12, D-57).
- [ ] 8. Remove fake live toast, random counter and "Verified" testimonial badges (D-13, D-33).

**Share / branding — `src/components/score-card.tsx`, `src/app/api/og/route.tsx`, `src/app/share/result`**
- [ ] 9. Rebrand share card and OG image to Couplemetric, fix radar clipping, use local date and Relationship score in share text, add archetype to quiz OG (D-07, D-08, D-22).

**Engine / daily — `src/lib/engine/optimizer.ts`, `src/app/(dashboard)/daily/page.tsx`, `app/layout.tsx`**
- [ ] 10. Compute optimizer tradeoffs from the clamped solution; allow editing today's log on signup day; remove `maximum-scale=1` from the viewport meta (D-10, D-05, D-15).

## 5. Accounts created (cleanup)

All use password `Qa!test12345` unless noted.

- qa-auth-0-1102@example.com
- qa-auth-long-<4 digits>@example.com (600 x "A" name; suffix not captured — find by name length)
- qa-verify-auth-6504@example.com
- qa-onboarding-1-5007@example.com
- qa-verify-onboarding-7g2k@example.com
- qa-daily-log-2-k7x3@example.com
- qa-verify-daily-log-2542@example.com
- qa-score-reveal-3-ea24@example.com
- qa-verify-score-reveal-25619@example.com
- qa-exercises-4-0791@example.com
- qa-partner-5-k7m2@example.com (QA Alice)
- qa-partner-5-p9x4@example.com (QA Bravo)
- qa-partner-5-2h07@example.com (earlier aborted run)
- qa-compare-insights-6-7629@example.com
- qa-verify-compare-insights-x9m4@example.com
- qa-pricing-7-k4m9@example.com
- qa-verify-pricing-x7q2@example.com (two abandoned live Stripe Checkout sessions created, no payment)
- qa-settings-8-k7q2@example.com
- qa-delete-account-9-k7q2@example.com (deleted during the journey)
- qa-verify-delete-account-31411@example.com
- qa-coaching-12-5210@example.com

Suggested cleanup: `delete from users where email like 'qa-%@example.com'` via the reviewed operator procedure (cascades per schema); also expire the abandoned `cs_live_` Checkout sessions in the Stripe dashboard.

## Appendix: why qa-swarm burns tokens

- Every subagent (12 journeys + 17 skeptic re-tests ≈ 30 agents) starts with the full system prompt: CLAUDE.md + AGENTS.md + ~150 skill descriptions (aso-skills, revenuecat-*, n8n-* are all injected) + tool schemas ≈ 30–40K tokens before any work, re-sent on every turn.
- Browser steps are turn-heavy: each snapshot/get-text/screenshot of a Next.js page returns thousands of tokens (RSC flight payloads alone ~5K), repeated across register → onboarding → page → reload → 360px → light mode → axe per journey, plus session restarts when agent-browser hung.
- The aggregated reports themselves (this input was ~45K tokens) get re-fed to the lead.
- Cheaper next time: run 3–4 journeys per agent in one logged-in session instead of one per agent; only re-verify findings with confidence < 0.9; use text snapshots (`snapshot -i`) over screenshots; grep page text rather than dumping it; trim the installed plugin list for QA runs; cap network/console dumps per step.
