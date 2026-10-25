# Product audit vs. the category leaders (2026-10-25)

What is still wrong or sub-optimal, checked against the competitor teardown
(Paired, Lasting, Candle, Evergreen, Flamme, Couply, Connected) and the
subscription benchmarks. Ordered by revenue impact, not by effort.

Everything below was verified in the code, not assumed.

---

## 1. Android users cannot buy anything from a locked feature — BLOCKER

`PremiumGate` is what a free user hits on Insights, Compare, Coaching,
Scenarios, Constraints, Export and Exercises. On the web it shows an upgrade
button and the price. **On native it renders exactly this:**

> "This feature is not available for your account."

No button. No price. No route to purchase. It reads like an account error rather
than an offer. The *only* places an Android user can actually subscribe are
`/settings` and `/pricing`, both of which they have to go looking for.

Why this is the single most expensive defect:
- RevenueCat's 2026 data puts Android download→paid at **0.9% against iOS 2.6%**,
  and attributes the gap to Android users never reaching a paywall. We have built
  exactly that failure in.
- **89.4% of all trial starts happen on install day.** A paywall a user must hunt
  for in Settings is a paywall almost nobody sees on install day.
- Every feature gate is a moment of demonstrated intent — the user just tried to
  do the thing. Converting that moment is free; recreating it later is not.

Constraint to respect: both policy tests forbid a `pricing` href and any web
price in native markup, deliberately, so the fix must route to the **in-app
store paywall** (store-supplied prices) and must not carry `$` figures.

## 2. Web still advertises the old price — LIVE INCONSISTENCY

`src/lib/subscription/tiers.ts` still says `monthlyPrice: 4.99, yearlyPrice: 24.99`.
Google Play now charges **$7.99 / $39.99**. Android is unaffected (native prices
always come from the store offering), but every web page that renders from
`TIERS` — landing, pricing, the premium gates — is quoting a price we no longer
sell. Stripe would also still charge the old price IDs.

This was a deliberate hold: changing `TIERS` before the Stripe prices exist would
advertise $7.99 and charge $4.99. It needs closing, in this order: create the
Stripe prices → set the env IDs → update `TIERS` and copy in one commit.

## 3. No rating prompt anywhere — and ratings are permanent on Play

There is no In-App Review integration at all. Zero occurrences of
`requestReviewFlow` in the codebase.

- Play ratings **never reset**, unlike Apple's. Every star is permanent.
- Play ranking weighs ratings heavily, and we currently have **none**, which is
  part of why a zero-install app cannot rank.
- The leaders sit at 4.58–4.78 with thousands of ratings (Paired 4.58/64K,
  Cozy Couples 4.72, Gottman 4.78). That is the bar.

Correct implementation: the Play In-App Review API, fired after a success moment
— the third completed daily log, not a cold open — and never after an error. Done
wrong this permanently damages the one number we cannot undo.

## 4. Streaks have no forgiveness — a known category wound

`src/lib/streaks/` has no freeze, grace day or repair. Miss one day and the
streak is gone.

The teardown found this is precisely where competitors are punished in reviews:
Evergreen — *"one off day it's all gone"*; Paired described as *"passive
aggressive when you miss a day"*. For an app whose core loop is a daily habit
between two people, a brittle streak converts a single bad day into a churn
event.

A single "rest day" per week, or one automatic freeze per month, is cheap to
build and directly contrarian to the complaints the category already generates.

## 5. Onboarding has no skip

Five steps, no way past them. `CLAUDE.md` lists "Onboarding skip" as planned; it
was never built. Five steps is not egregious — the target from the competitor work
was ≤10 — but a returning or impatient user has no escape hatch, and onboarding is
the last gate before the first score, which is the app's aha moment.

Now partly mitigated: the quiz answers prefill the self-assessment step, so a
user arriving from the quiz has less to do.

## 6. No trial offer at the aha moment

The trial exists (7 days, Play-managed) but is only discoverable from the paywall
surfaces in (1). Nothing offers it immediately after the first score is revealed,
which is both the moment of peak demonstrated value and — per the 89.4% figure —
effectively the only moment that converts.

This is the same root problem as (1), but worth listing separately because fixing
the gates does not by itself create the install-day offer.

## 7. Referral rewards never complete

`src/lib/referrals/` counts rows with status `rewarded`, but nothing in the code
ever transitions a referral to `rewarded` — records stay `signed_up` forever. The
stats page therefore under-reports, and the promised bonus tiers (6 months at 5
referrals) are not implemented; the code only adds +1 month at 5.

Low priority while there is no user base, but it is a promise currently made and
not kept.

## 8. Dark mode is forced

`src/app/layout.tsx` hard-codes `className="dark"`. There is no light theme and no
toggle. Defensible as a deliberate aesthetic, and most couples apps in the set
lean dark — but it is a stated gap in `CLAUDE.md` and some users will bounce. Low
priority.

---

## What is already good, and should not be touched

Worth saying plainly, because the list above is all problems:

- **The free tier is genuinely usable daily.** Four competitors (Evergreen, Cozy,
  Lovewick, Candle) are being punished in reviews right now for shrinking their
  free tiers. Ours is a real asset — do not claw it back.
- **One subscription covers both partners.** Parity with the leaders rather than a
  differentiator, but the leaders *fail* at it: Paired, Flamme and Couples
  Analytics all have recent 1-star reviews where the paying partner's access did
  not carry over. Reliability here is a winnable differentiator.
- **AI is not the headline.** Candle is getting *"stop putting AI slop into
  everything"*. Our optimizer is real mathematics and a better story; coaching
  sits correctly as a secondary Premium extra.
- **Price is now sane.** $7.99/$39.99 against a $12.99/$49.99 category median
  leaves room to be the value option without being the cheapest thing on the shelf.

---

## Recommended order

1. **(1) Native purchase path from every gate.** Biggest revenue defect; everything
   else is downstream of it.
2. **(3) Rating prompt after the third log.** Compounding, permanent, and the
   longer we have zero ratings the longer we cannot rank.
3. **(2) Close the price inconsistency** once Stripe is set up.
4. **(4) Streak forgiveness.** Cheap, retention-positive, contrarian.
5. (6), (5), (7), (8) as capacity allows.
