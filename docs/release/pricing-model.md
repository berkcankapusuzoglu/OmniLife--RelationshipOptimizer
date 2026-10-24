# Pricing model and the path to $500/month

All figures are **net to us**: Google Play takes 15% on the first $1M/year.
Assumes a 60/40 split of payers choosing yearly over monthly, which is the usual
mix once a yearly plan is preselected on the paywall.

One subscription covers both linked partners, so "a payer" here means a couple.

## The core table

| Plan | Monthly | Yearly | Yearly discount | Net per couple / month | Couples needed for $500/mo |
|---|---|---|---|---|---|
| **Current** | $4.99 | $24.99 | 58% | **$2.76** | **182** |
| Fix the yearly only | $4.99 | $39.99 | 33% | $3.40 | 148 |
| Modest raise | $7.99 | $39.99 | 58% | $4.42 | 114 |
| Category median | $9.99 | $49.99 | 58% | $5.52 | 91 |

## What that means in installs

Android download→paid conversion is ~0.9% industry-wide; ~1.5% is decent; 2% is a
genuinely good funnel. Installs required for $500/month net:

| Plan | at 0.9% | at 1.5% | at 2.0% |
|---|---|---|---|
| Current ($4.99/$24.99) | 20,500 | 12,500 | 9,500 |
| Fix yearly ($4.99/$39.99) | 16,500 | 10,000 | 7,500 |
| Modest raise ($7.99/$39.99) | 13,000 | 8,000 | 6,000 |
| Category median ($9.99/$49.99) | 10,500 | 6,500 | 5,000 |

Read the diagonal, not the rows. Price and funnel quality compound: the difference
between the worst and best cell is **20,500 installs versus 5,000** for the same
$500. Pricing is the cheaper of the two levers to pull, because it costs one
afternoon and no distribution.

## The yearly plan is the actual problem — but not for the reason I first gave

**Correction.** I initially called the 58% annual discount "unusually aggressive".
The benchmark research says the opposite: published average annual discounts are
**67% off (RevenueCat 2025) to ~75% off (Adapty 2026 medians: $12.99/mo, $38.42/yr)**.
Our 58% is *shallower* than typical. The discount ratio is not the problem.

The problem is the **absolute price**, which the ratio was hiding. Benchmarks pair
those deep discounts with a **$12.99 median monthly**. We pair ours with $4.99. So:

- Our yearly nets **$1.77 per couple per month**.
- Adapty's median yearly ($38.42) nets ~$2.72/month *after* a deeper discount.
- **Paired charges $79.99 per couple per year** at standard price, with the same
  "one partner subscribes for both" structure as ours — **3.2x our yearly**.

Full competitor pricing (point estimates; Play does not expose subscription SKU
prices, so most come from iOS listings and vendor snapshots — see
`growth-strategy.md` for confidence tags):

| App | Monthly | Yearly | Covers both |
|---|---|---|---|
| Paired | — | **$79.99** | Yes |
| Lasting | $11.99 | $79.99 | Yes |
| Connected | $12.99 | $77.99 | Yes |
| Couply | ~$14.99 | ~$70.99 | ? |
| Evergreen | $9.99–$12.99 | ~$49.99 | ? |
| Agapé | $9.99–$14.99 | ~$49.99 | ? |
| Flamme | $12.99 | ~$44.99 | Yes |
| Candle | $12.99–$14.99 | $39.99–$49.99 | ? |
| Lovewick | $9.99 | $29.99 | ? |
| **Couplemetric** | **$4.99** | **$24.99** | **Yes** |

**Median: $12.99/month, ~$49.99/year.** We are at 38% of the median monthly and
roughly half the median yearly — the second-lowest yearly in the entire set, beaten
only by Between, which is a messaging app in a different category.

Note also that our yearly is **5.0 months of monthly**, and peers run 3.5–6 months.
Our ratio is squarely normal. It is the absolute price that is the outlier.

A yearly subscriber at $24.99 is still worth less over a full year than a monthly
subscriber who stays five months. That arithmetic holds regardless of the ratio.

Annual is also where the retention is: RevenueCat reports **33.9% of annual
subscribers active after one year versus 13.8% of monthly** (Airbridge: 44.1% vs
17.5%). We are underpricing the plan that both retains best and carries ~60% of
category revenue.

## How confident is the price increase?

**Also tempering an earlier claim.** I said a 60% increase "very rarely" costs 38%
of conversions. The evidence does not support that strongly:

- Adapty travel app: +30% price → conversion −5%, ARPU +102%. Self-reported.
- Superwall PropGPT: +43% price → proceeds/user +47.5%. Self-reported.
- Superwall BuyBye: +50% price → proceeds/user +25%. Self-reported.

Every published case is a **survivor** — teams publish wins, and the researcher
found **no published failed price increases**. The cases are +30% to +50%, mostly
iOS, none in our category. Our proposed +60% sits **outside** that range.

What survives scrutiny:
- The break-even arithmetic is exact: at $7.99/$39.99 we need to keep **more than
  62%** of paying couples. That is a fact about our numbers, not a forecast.
- Direction of evidence is consistent: in every published case conversion fell by
  less than price rose.
- We are 3.2x below Paired, the category benchmark, on the directly comparable
  per-couple-per-year figure.

What does not survive:
- Any claim about *our* elasticity. We have no data and will not have enough
  volume for a significant price test for a long time.

## Recommendation

**Raise to $7.99/month and $39.99/year, before public launch.**

Do it now rather than later, for a mechanical reason: existing subscribers are
price-locked on Google Play, and raising prices on people who already subscribed
requires an opt-in flow and generates churn and 1-star reviews. Right now there are
zero paying subscribers, so the change is free. Every week of delay makes it more
expensive.

If that feels like too big a jump, the **minimum viable change is the yearly plan
alone**: $4.99/mo stays, $39.99/yr replaces $24.99/yr. It captures most of the gain,
changes the number nobody compares, and is almost risk-free.

What to keep unchanged:
- The 7-day free trial. It is working as a qualifier and sits in the range that
  converts best.
- One subscription covering both partners. **Correction: this is parity, not a
  differentiator** — Paired, Lasting, Connected and Flamme all do it, and nobody in
  the set monetizes the partner separately. Keep it, say it on the paywall
  ("$39.99/year — for both of you"), but do not build positioning on it.
- The free tier staying genuinely usable daily. The whole funnel depends on the
  habit forming before the paywall is relevant.

## Mechanics of changing it

1. Play Console → Subscriptions → `premium` → the `premium-monthly` and
   `premium-yearly` base plans. Prices are regional; set the US price and let Play
   convert, then spot-check the large markets.
2. RevenueCat picks the new prices up automatically — native prices always come
   from the store offering, never from `TIERS` in code.
3. `src/lib/subscription/tiers.ts` still needs updating for the **web/Stripe** path
   and all marketing copy, since the landing and pricing pages render from `TIERS`.
4. Stripe needs matching new prices; the old price IDs stay recognised for existing
   subscribers only.
5. Re-check the store listing's closing line, which states the price.

This is a ~1 hour change across both stores and the copy, and it is worth more
than several thousand installs.

---

## Decision taken 2026-10-24: $7.99 / $39.99

An independent expert pass was asked to choose, given the full research and without
being told which way this document leaned. It chose **$7.99/month and $39.99/year**,
keep the 7-day trial, keep freemium.

**It also corrected the central framing of this document.** Everything above measured
$7.99 against $4.99 and asked whether we would lose more than 38% of payers. That test
is meaningless: **there are zero subscribers, so $4.99 is a price nobody has ever
paid.** This is an *initial* price, not an increase. The elasticity literature — and
the worry that +60% sits outside the published +30–50% range — simply does not apply.
The only valid comparison is the market, where $7.99 is still ~38% below the $12.99
median monthly and $39.99 is ~20% below the ~$49.99 median yearly. We remain the
cheap option; we stop being the second-cheapest app in the category.

Corollary it drew that this document had backwards: **keep the 58% annual discount.**
At $7.99 the yearly is 5.0 months of monthly, inside the peer range of 3.5–6, and it
steers buyers toward the plan that retains 33.9% at one year versus 13.8% for monthly.
Chasing the 67–75% "average" discount would be optimising a ratio at the cost of price.

On freemium it declined to harden the paywall despite the 10.7% vs 2.1% gap, because
(a) a wall suppresses ratings exactly when we have none, (b) the partner who did not
download cannot try it, which breaks the couple-plan pitch, and (c) partner-linking
failure is already the category's top 1-star complaint and a paywall in front of it
adds more. Its alternative: **keep freemium but move the trial offer to install day**,
immediately after the first check-in score, dismissible. 89.4% of trial starts happen
on install day, so a paywall first met on day 4 has already missed nearly all of them.

### Status

| Step | State |
|---|---|
| Play base-plan prices → $7.99 / $39.99 | **Pending** — run scratchpad `play/set-prices.mjs --apply` (classifier blocks it for Claude) |
| Stripe prices for the web path | Pending owner — create new prices, then set the env price IDs |
| `src/lib/subscription/tiers.ts` + marketing copy | **Deliberately held** until the two above land |

The code change is held on purpose. Native prices always come from the store offering,
so Android is unaffected by `TIERS` — but the web and marketing pages render from it,
and Stripe would still charge the old $4.99 price IDs. Publishing $7.99 on the web
while Stripe charges $4.99 would be a billing mismatch. Sequence: Play prices →
Stripe prices + env → code and copy in one commit.
