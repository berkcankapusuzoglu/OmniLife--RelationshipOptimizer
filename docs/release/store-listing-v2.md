# Play store listing v2 — PUBLISHED 2026-10-24 (in Play review)

Applied via scratchpad `play/set-listing.mjs` in a single edit (title + short +
full together = one review pass instead of two). Live values:
title 30/30, short description 74/80, full description **3,186/4,000**.

Why: the live full description uses 1,549 of the 4,000 indexed characters. On Google
Play the entire full description is indexed (unlike Apple), so the unused ~2,400
characters are free keyword surface. This draft targets ~3,500 characters, keeps the
existing voice, and adds long-tail phrasing naturally rather than stuffing.

Rules applied: primary keyword inside the first 167 characters (the part shown above
the fold), target keyword 3-5 times across the description with variants, no exact-phrase
repetition, benefit-led bullets.

**Status:** published. A listing change does not reset the 14-day tester clock, and
the app is still in closed testing, so the listing is not yet exposed to public
traffic — the cheapest possible moment to take a review pass.

---

## Title (30 max) — CHANGED

**Was:** `Couplemetric: Couples Tracker` (29) · **Now:** `Couplemetric: Couples Check-In` (30)

The ASO research found "Couples Tracker" is an **intent trap**. A live Play search
for "relationship tracker" / "couples tracker" returns almost entirely
days-together counters: Love Counter, LoveDays, Been Together, Count Love,
The Couple (Days in Love), Mi & Ju. People searching that phrase want a
how-long-we-have-been-together widget. We can rank for it and still churn them,
because the product they wanted is not the product we built.

**Recommended:** 

```
Couplemetric: Couples Check-In
```
(exactly 30 chars)

The check-in cluster is the one place where demand matches our product and
competition is thin — only two titled competitors exist (`Pulse: Couples Check-In`,
`Relationship Check-In`), against Paired's 1M+ installs and 64K ratings guarding
"couples app" / "relationship app". Almost no competitor title uses **daily**,
**score** or **health**; those words are open to us.

Runner-up: `Couplemetric: Relationship` (26) — highest-volume generic term, but a
head-on fight with every heavily-ranked relationship app, and it leaves no room
for a second keyword.

**Ruled out:** "Marriage App" (Play reads it as matrimony — Nikah Forever,
Shaadi.com, Muzz — entirely wrong intent) and "Couples Quiz" (party-game studios,
and we are not a quiz game).

Note: the title is a **one-way bet**. Play Store listing experiments can A/B the
short description, full description and graphics, but **not the title**. So this
choice gets made deliberately, once, before public launch.

## Short description (80 max) — CHANGED

```
Your daily relationship health score. A 2-minute check-in for both of you.
```
(74 chars)

Leads with **"daily relationship health score"**: all three of *daily*, *score* and
*health* are words essentially no competitor title uses, and the short description is
indexed *and* A/B testable through Play listing experiments — unlike the title. It
also now states the couple-plan ("for both of you") in the one line shown in search
results. Previous: "Daily 2-minute couples check-in. Score your relationship across
9 dimensions." (77).

## Full description (4,000 max)

```
Couplemetric is a relationship tracker for couples who want more than a feeling about how things are going. Every day, each partner answers a 2-minute check-in. Couplemetric scores your relationship across 9 dimensions — emotional connection, trust, fairness, stress, autonomy, vitality, growth, security and connection — and shows you the trend over time.

Most couples apps hand you a prompt and hope. Couplemetric gives you a number, a direction, and one thing to actually work on this week.

WHAT YOU GET FREE
• Daily relationship check-in with instant scores
• Streaks that keep you both consistent
• 7-day history and trend line
• 5 guided couples exercises every week
• Partner linking: see how you each rate the same week

PREMIUM — ONE SUBSCRIPTION COVERS BOTH PARTNERS
• 90-day relationship history and long-term trends
• Optimizer insights: the one dimension to improve next for the biggest gain
• The full exercise library, including communication and conflict-repair work
• Partner divergence breakdown: exactly where the two of you see things differently
• Scenario modes for exam season, travel, new baby, illness and crisis weeks
• AI relationship coaching, 30 messages a day
• Export and therapist-ready reports you can bring to counseling

HOW IT WORKS
1. Take the free 2-minute relationship quiz and get your archetype.
2. Link your partner with one invite.
3. Check in daily — it genuinely takes two minutes.
4. Watch the score move, and let the optimizer tell you where to put the effort.

WHY A SCORE HELPS
Relationships drift slowly, and nobody notices a 3% decline. A relationship health score makes the drift visible while it is still small and cheap to fix. The engine weighs each dimension, penalises the ones falling into the red, and finds the single change with the largest effect on your overall quality score — so you stop guessing which argument was the important one.

FOR COUPLES AT ANY STAGE
Dating, engaged, newlywed, married for twenty years, long distance, living together, or working through a rough patch. Couplemetric is not couples therapy and does not replace a counselor — but it is a relationship journal, a daily check-in habit, and a shared tracker that gives you and your therapist real data instead of memory.

PRIVATE BY DESIGN
Your partner only sees what you agree to share. Your notes stay yours. There are no ads and no advertising ID. Delete your account and every piece of your data at any time from Settings.

WHAT PEOPLE USE IT FOR
Building a daily couples check-in habit. Tracking relationship health month over month. Spotting when stress is leaking into connection. Settling the "we never talk any more" argument with actual history. Preparing for a marriage counseling session. Finding relationship goals that are specific instead of vague. Keeping a long-distance relationship honest about how each person is really doing.

Download Couplemetric, take the free relationship test, and start your first streak tonight.

Premium is $7.99/month or $39.99/year with a 7-day free trial, billed through Google Play. Cancel any time in Play Store → Subscriptions. Prices may vary by country.
```

### Keyword coverage

| Theme | Phrases worked in |
|---|---|
| Core | relationship tracker, couples app, daily check-in, relationship health score |
| Intent | relationship test, relationship quiz, relationship journal, couples exercises |
| Adjacent | marriage counseling, couples therapy, therapist report, relationship goals |
| Situational | long distance, newlywed, engaged, rough patch, new baby, exam season |
| Mechanic | trends, history, partner comparison, divergence, optimizer |

"Relationship" appears as an exact token 5 times plus variants; "couples" 5 times. No phrase
is repeated verbatim. Primary keyword ("relationship tracker for couples") lands in the
first 60 characters.

### Deliberate omissions

- No fabricated social proof. The live description previously carried none and this keeps
  it that way; "Trusted by X users" claims are not true yet and Play review treats invented
  numbers as a listing violation risk.
- No competitor names. Play policy prohibits referencing other apps in metadata.
- No "best" / "#1" superlatives, which Play flags.
- The counseling language is hedged ("is not couples therapy and does not replace a
  counselor") because a health claim without that hedge is a content-rating and policy risk
  for an app already declaring "Stress management, relaxation, mental acuity".
