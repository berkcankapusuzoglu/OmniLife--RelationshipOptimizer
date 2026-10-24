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

## The yearly plan is the actual problem

At $4.99/mo and $24.99/yr, the yearly plan is **five months of monthly for twelve
months of service** — a 58% discount. Because 60% of payers take the yearly plan,
most of our revenue comes in at an effective **$1.77 per couple per month**.

A yearly subscriber at $24.99 is worth less over a full year than a monthly
subscriber who stays five months.

The standard annual discount is far shallower than ours. Raising the yearly to
$39.99 while leaving the monthly untouched lifts net revenue per couple by 23%
and removes 34 couples from the target — with no change to the monthly price
point that people compare first.

## Can we raise the monthly price without losing more than we gain?

Going $4.99 → $7.99 (with yearly $24.99 → $39.99) multiplies net revenue per
couple by **1.60**. So revenue holds as long as the number of paying couples falls
by **less than 38%**.

That is a wide margin. A 60% price increase very rarely costs 38% of conversions in
subscription apps, for three reasons specific to our situation:

1. We are below every meaningful anchor in the category, so $7.99 still reads as
   cheap rather than as a decision point.
2. The price is split across two people. "$7.99 for both of us" is $4 each — the
   couple framing is a real willingness-to-pay advantage, and it should be stated
   on the paywall explicitly.
3. The 7-day free trial means the price is evaluated *after* the product has
   proven itself, not before. Trial-gated pricing is substantially less elastic
   than up-front pricing.

> **Evidence status:** the elasticity argument above is reasoning from our own
> numbers plus category norms. The dedicated pricing-benchmark research is tracked
> separately; if it contradicts any of this, this section gets rewritten rather
> than defended.

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
- One subscription covering both partners. This is the differentiator; do not
  monetize the partner separately. It should be the headline on the paywall:
  "$39.99/year — for both of you."
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
