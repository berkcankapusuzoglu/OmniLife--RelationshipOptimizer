# How to win this: the strategy, from four research passes (2026-10-24)

Research passes: competitor teardown, subscription-pricing benchmarks, growth
channels, Play ASO keywords. Every number below carries its confidence level,
because a lot of what came back was vendor-published and self-reported.

**Honesty note up front:** two claims I made before this research were wrong, and
both are corrected in `pricing-model.md`. The 58% annual discount is *not*
unusually aggressive (published averages are 67–75% off), and my confidence that a
+60% price rise is safe was overstated (published cases only cover +30% to +50%,
all self-reported wins, none in our category).

---

## The one-sentence version

Store search will not launch this app; **the partner-invite loop and faceless
slideshow video will**, and the single highest-leverage change available today is
**pricing**, because it needs no distribution and costs one afternoon.

## 1. The numbers that set the whole strategy

| Fact | Value | Source | Confidence |
|---|---|---|---|
| Android download→paid, median | **0.9%** (iOS 2.6%) | RevenueCat SoSA 2026, 115k+ apps | High |
| Trial→paid, Android vs iOS | 32.5% vs 32.6% | RevenueCat 2026 | High |
| Trial starts on install day | 89.4% | RevenueCat 2026 | High |
| **Freemium vs hard paywall conversion** | **2.1% vs 10.7%** at day 35 | RevenueCat 2026 | High |
| Play cancellations that are billing errors | **32.3%** (App Store 15.2%) | RevenueCat 2026 | High |
| Annual subscriber 1-yr retention | 33.9% vs 13.8% monthly | RevenueCat 2026 | High |
| Paired's standard price | **$79.99 per couple per year** | Paired FAQ | High |
| Organic Play-search installs, new app, months 1–3 | **0–30/week** | Indie anecdotes only | Low — but directionally safe |

The Android funnel is weak at the **top**, not the bottom. Trial→paid is identical
to iOS; Android users just never reach the trial. That is a paywall-placement and
onboarding problem, not a product problem.

## 2. Pricing — do this first

Full model in `pricing-model.md`. Headline: we net **$2.76 per couple per month**,
so $500/mo needs **182 paying couples ≈ 12,500 installs** at a decent 1.5%
conversion. At $7.99/$39.99 that drops to **114 couples ≈ 8,000 installs**.

The decisive fact is not the discount ratio, it is that **Paired charges $79.99 per
couple per year for the same one-subscription-covers-both structure — 3.2x our
yearly.** We are not slightly cheap; we are a third of the category benchmark.

Break-even is exact arithmetic: at $7.99/$39.99 we need to keep **more than 62%**
of paying couples. Whether we will is genuinely unknown — do not let me pretend
otherwise. But we have zero subscribers today, Play price-locks existing
subscribers, and raising prices later requires an opt-in flow that generates churn
and 1-star reviews. **The change is free this week and expensive every week after.**

Minimum viable move if the full raise feels like too much: **yearly only**, $24.99 →
$39.99. It changes the number nobody comparison-shops and captures most of the gain.

## 3. The title is an intent trap — fix before public launch

`Couplemetric: Couples Tracker` targets the wrong people. A live Play search for
"relationship tracker" / "couples tracker" returns almost entirely
days-together counters (Love Counter, LoveDays, Been Together, Count Love,
The Couple, Mi & Ju). Those searchers want a how-long-we-have-been-together widget.
We would rank, acquire, and churn them.

**Recommended: `Couplemetric: Couples Check-In`** (exactly 30 chars). The check-in
cluster is the only place where demand matches the product and competition is thin
— two titled competitors total, against Paired's 1M+ installs and 64K ratings
guarding "couples app". Almost no competitor title uses **daily**, **score** or
**health**: those words are unclaimed.

The title cannot be A/B tested on Play (experiments cover short description, full
description and graphics only). One-way bet, make it deliberately, once.

## 4. ASO is a conversion tool, not an acquisition channel

Expect **0–30 organic installs per week** in months 1–3 — tens to low hundreds
total. Play weighs install velocity and ratings, and we have neither. Play Console
will also hide keyword data below its privacy threshold, so we will be flying blind
on which terms work for a while.

So ASO work is justified only because it is cheap and compounding, not because it
will produce launch volume. Do the two things that matter and stop:
1. The expanded full description (1,549 → 3,146 indexed chars) — drafted.
2. The title fix.

Everything else — Play Experiments, localisation — waits until there is traffic to
experiment on.

## 5. Acquisition: two channels, in this order

### a. The partner-invite loop (highest leverage, already built)
Every active user has exactly one person they want on the other side. This is the
only channel with built-in virality and it costs nothing per install. Instrument it,
measure invite-sent → invite-accepted, and make the invite a first-class moment in
onboarding rather than a settings screen.

**And make it actually work.** The competitor teardown found partner linking is the
single most common failure across the category — Paired ("I paid for premium access
and it doesn't work, my partner is unable to join"), Flamme ("all I got was a
paywall"), Couples Analytics, Couply. Covering both partners for one price is
**parity, not a differentiator** (Paired, Lasting, Connected and Flamme all do it,
and nobody monetizes the partner separately). The differentiator available to us is
making the promise work reliably, which is a QA target, not a marketing line.

### b. Faceless slideshow video (proven in this exact niche)
Verified: **Couple Joy**, a couples app, moved from video to static image carousels
and reports **2M+ views across 200+ posts, top post 400K+**. A seller listing for an
unnamed couples app claims 34,000 users and 713 subscribers almost entirely from two
faceless TikTok slideshow accounts — self-reported, treat as anecdote.

Format: hook slide, then 4–8 slides of "would you rather", "red flag vs green flag",
or archetype reveals, final slide pointing at **the quiz, not the Play listing**.
Batch ten an hour from a template. Expect most to do nothing and roughly 1 in 20–50
to break out. No camera appearance required.

**Critical gap:** the quiz is on the web, the app is Android-only. Every iPhone
viewer we send to the quiz is currently unconvertible. Capture email at the result
screen, or that traffic is wasted.

## 6. The strategic tension worth deciding deliberately

**Freemium converts 2.1%; hard paywalls convert 10.7%** — a ~5x gap, and the 1-year
retention of annual subscribers is the same either way (28% vs 27%).

That is an argument for a harder paywall. But our entire acquisition plan is the
quiz funnel and the partner-invite loop, both of which depend on the free tier being
genuinely usable so people share it. A hard paywall would raise conversion and kill
the distribution.

Recommendation: **keep freemium, but move the paywall earlier in the experience** —
a soft paywall after the first score reveal, yearly preselected, trial toggle, one-tap
skip. 89.4% of trials start on install day, so a paywall the user meets on day 4 has
already missed almost all of its chances. This captures most of the hard-paywall gain
without breaking the loop.

## 6b. The competitors' 1–3 star reviews are our product roadmap

Cross-cutting complaints across Paired, Lasting, Candle, Coral, Couply, Agapé,
Evergreen and Cozy (reviews dated Sep–Oct 2026):

| Their complaint | Our move |
|---|---|
| **Billing and cancellation failures** — charges after cancelling, trial charges, "refund me". Present in six of the apps. | Make cancellation obvious and in-app, link straight to Play subscriptions, and never let the trial surprise anyone. Send our own pre-renewal reminder. |
| **Free tier shrinking** — Evergreen, Cozy, Lovewick and Candle all moved formerly-free features behind the paywall and got punished for it. | Commit publicly to the free tier and never claw it back. Our funnel depends on it anyway. |
| **Streak anxiety** — "one off day it's all gone"; Paired called "passive aggressive when you miss a day". | We ship streaks. Add a forgiving mechanic (streak freeze / rest day) and never guilt-trip in copy. Cheap, and directly contrarian. |
| **Partner linking failures** — the most common complaint in the category. | See above: reliability is the differentiator. |
| **AI fatigue** — "Stop putting AI slop into everything" (Candle). | Keep AI coaching as a Premium extra, never the headline. The optimizer is maths, not an LLM, and that is a better story right now. |

## 6c. Is the "scored relationship" angle proven?

Honest answer: **unoccupied, but unproven.** No app at scale leads with a
relationship score. The two that do are both tiny and young — Connected (launched
Mar 2026, 5K+ installs) and Couples Analytics (10K+ installs). The leaders are all
question, game or content products: Paired 1M+, Couple Joy 1M+, Love8 10M+,
Lasting 500K+. No 9-dimension or optimizer product exists on Play at all.

The researcher also found **no documented case of a scoring app that failed**. So
the absence is equally consistent with "nobody has cracked it" and with "it does
not sell". Treat the data angle as a genuine opening, but do not assume the market
is waiting for it — the quiz and the archetype hook are what people actually click,
and the score is what keeps them.

## 7. Free wins, highest value per minute

1. **Widen the involuntary-churn recovery window.** 32.3% of Play cancellations are
   billing errors. Our base plans sit at the 7-day grace / 30-day hold minimum;
   Google permits 30 + 30. Google reported ~10% lower involuntary churn for
   developers who extended the recovery window from 30 to 60 days.
   Script is ready at scratchpad `play/widen-recovery.mjs` (classifier blocks me
   from running it — run it yourself; zero subscribers today so it is risk-free).
2. **Ask for ratings early and only after a success moment** (third daily log, via
   the In-App Review API). Play ratings **never reset** — every star is permanent.
   This is the single most unforgiving asymmetry on Play.
3. **Reply to every 1–3 star review.** Replies are indexed by Play search and invite
   re-rating.

## 8. Is $500/month realistic?

Yes, but understand the shape. At the recommended price it is **~114 paying couples
≈ 8,000 installs** with a decent funnel. That is not a launch outcome; it is the
result of running the slideshow + invite loop for months. RevenueCat's own data
shows the spread between apps is enormous (top quartile grows MRR 80%+, bottom
quartile shrinks 33%+), so category medians are a weak prior for a first app.

The honest framing: the code is done and is better than most of what it competes
with. From here this is a distribution business, and the limiting resource is
sustained posting, not engineering.

## What the research explicitly does NOT support

- Any elasticity estimate for *our* app. No published failed price increases exist,
  so the case studies are survivor-biased.
- That 3, 7 or 14 days is the right trial length — the evidence is contradictory.
  Keep 7.
- That Google Play emails users before a trial converts. Unverified; consider
  sending our own reminder.
- That bundling two people under one price raises willingness to pay. No study found.
- Any Play keyword volume figure. No ASO tool was reachable; all volume/difficulty
  calls are qualitative reads of live search results, to be confirmed in AppTweak or
  Appfigures before betting on them.
- Subreddit rules. Reddit is blocked from this environment entirely. **Read each
  sub's rules yourself before posting** — r/relationships, r/Marriage and
  r/relationship_advice are heavily moderated peer-support subs where a link drop
  risks a ban for negligible upside.
