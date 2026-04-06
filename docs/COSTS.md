# OmniLife Cost Reference

**Last updated:** April 2026  
**Pricing:** Pro $3.99/mo or $29.99/yr · Premium $4.99/mo or $39.99/yr

---

## 1. Current Monthly Burn (Today)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (free) | $0 |
| Supabase | Free tier | $0 |
| Stripe | Pay-as-you-go (no monthly fee) | $0 |
| RevenueCat | Free (< $2,500 MTR) | $0 |
| Resend | Free (100 emails/day) | $0 |
| Apple Developer | $99/yr (required for iOS) | $0* |
| Google Play | $25 one-time (already paid) | $0 |
| **Total** | | **$0/mo** |

\* Apple Developer $99/yr = ~$8.25/mo amortized. Required before any iOS distribution.

---

## 2. Cost Per Subscriber Math

### Web (Stripe): 2.9% + $0.30 per transaction

| Tier | Gross | Stripe Fee | **Net Revenue** |
|------|-------|-----------|----------------|
| Pro Monthly | $3.99 | $0.42 | **$3.57** |
| Pro Yearly | $29.99 | $1.17 | **$28.82** |
| Premium Monthly | $4.99 | $0.44 | **$4.55** |
| Premium Yearly | $39.99 | $1.46 | **$38.53** |

### Native iOS (Apple IAP): 15% small business rate

| Tier | Gross | Apple Fee (15%) | **Net Revenue** |
|------|-------|----------------|----------------|
| Pro Monthly | $3.99 | $0.60 | **$3.39** |
| Pro Yearly | $29.99 | $4.50 | **$25.49** |
| Premium Monthly | $4.99 | $0.75 | **$4.24** |
| Premium Yearly | $39.99 | $6.00 | **$33.99** |

### Native Android (Google IAP): 15% small business rate

| Tier | Gross | Google Fee (15%) | **Net Revenue** |
|------|-------|-----------------|----------------|
| Pro Monthly | $3.99 | $0.60 | **$3.39** |
| Pro Yearly | $29.99 | $4.50 | **$25.49** |
| Premium Monthly | $4.99 | $0.75 | **$4.24** |
| Premium Yearly | $39.99 | $6.00 | **$33.99** |

> **Note:** Apple and Google drop to 30% after $1M annual revenue per developer. Small business rate (15%) applies when earning < $1M/yr. See Section 5 for enrollment details.

---

## 3. Growth Milestones & When Costs Kick In

| Cost Trigger | Monthly Cost | When It Kicks In |
|---|---|---|
| **Apple Developer Program** | $8.25/mo ($99/yr) | Day 1 — required before any iOS TestFlight or App Store distribution |
| **Google Play** | $0 (one-time $25) | Already paid. No recurring fee. |
| **Supabase Pro** | $25/mo | Upgrade immediately if uptime matters — free tier **pauses DB after 7 days of inactivity**. At 500 MAU, pause risk is unacceptable. Also needed for daily backups, branching, and SLA. |
| **Vercel Pro** | $20/mo | At ~5k–10k DAU, or when you need cron jobs, longer function timeouts (300s vs 10s), or team features. The 10s timeout may already be a problem for the optimizer/AI coaching on large payloads. |
| **Resend Starter** | $20/mo | When weekly digest emails or password reset volume exceeds 3,000/mo (100/day free cap). A weekly email to 1,000 users = ~4,300 emails/mo — triggers immediately. |
| **RevenueCat Starter** | $99/mo | At ~$2,500 MTR (monthly tracked revenue) — approximately 400+ active native paid subscribers. Free below that threshold. |

---

## 4. Realistic Monthly Cost at Different Scale Points

| Stage | MAU | Monthly Cost | Monthly Revenue Potential |
|-------|-----|--------------|--------------------------|
| Pre-launch | 0 | $0 | $0 |
| Early (add Supabase Pro) | 0–500 | $25 | $0–$500 |
| Growing (add Resend) | 500–2k | $45 | $500–$5k |
| Scale (add Vercel Pro + RC) | 2k–10k | $164 | $5k–$40k |
| Large | 10k+ | $164+ | $40k+ |

**Scale breakdown ($164/mo):** Supabase Pro $25 + Vercel Pro $20 + Resend $20 + RevenueCat $99 = $164

At 10k MAU with 5% paid conversion (500 subscribers) averaging $4/mo net = **$2,000 MRR** — well above the $164 cost floor.

---

## 5. Apple/Google App Store Fees

### Apple App Store
- **Apple Developer Program**: $99/yr — required for TestFlight beta distribution and App Store submission
- **Revenue share**: 15% for developers earning < $1M/yr (Apple Small Business Program), 30% above $1M
- **How to apply for Small Business Program**: Go to [developer.apple.com/programs/small-business](https://developer.apple.com/programs/small-business/). Must have < $1M in App Store proceeds the prior calendar year. Apply in December/January for the following year. Approval is automatic if eligible.
- **Subscriptions**: Apple takes 15% after 1 year of continuous subscription (regardless of Small Business Program)
- **Payout**: Net 45 days after end of month

### Google Play
- **Google Play Developer account**: $25 one-time registration fee (already paid)
- **Revenue share**: 15% on first $1M/yr per developer (automatic, no application needed since Nov 2021), 30% above $1M
- **Subscriptions**: Google takes 15% on subscriptions after the first year as well
- **Payout**: ~30 days after end of month

### RevenueCat Free Threshold
- **Free** while MTR (monthly tracked revenue) < $2,500
- **Starter plan** $99/mo: unlocked at $2,500+ MTR — includes up to $10k MTR, priority support, integrations
- **Pro plan** $299/mo: > $10k MTR
- At current pricing, $2,500 MTR ≈ 400 Pro monthly subscribers (native) or ~85 Premium yearly subscribers

---

## 6. Free Tier Risk Summary

| Service | Risk | Mitigation |
|---------|------|-----------|
| **Supabase Free** | DB **pauses after 7 days of inactivity** — all users get errors until manually resumed | Upgrade to Supabase Pro ($25/mo) at first paying user |
| **Vercel Hobby** | **10-second function timeout** — the Nelder-Mead optimizer and AI coaching streaming may exceed this on slow cold starts | Upgrade to Vercel Pro ($20/mo) at ~5k DAU or if timeouts appear in logs |
| **Resend Free** | **100 emails/day cap** — password reset emails could be silently dropped during spikes | Fine for < 100 signups/day; add Resend Starter ($20/mo) before launching weekly emails |
| **RevenueCat Free** | No real risk — gracefully transitions to paid at $2,500 MTR; no service interruption | None needed until threshold |

---

## 7. AI Coaching Cost (If Implemented)

Claude AI coaching is a Premium-only feature. Cost depends on which model is used.

### Recommended Model: claude-haiku-4-5

**Pricing (approximate as of April 2026):**
- Input: ~$0.80 per 1M tokens
- Output: ~$4.00 per 1M tokens

### Token Estimates Per Coaching Session

| Component | Tokens |
|-----------|--------|
| System prompt (relationship context, user profile) | ~800 input |
| Conversation history (last 10 turns) | ~2,000 input |
| User message | ~100 input |
| Coach response | ~400 output |
| **Total per session** | **~2,900 input + 400 output** |

### Monthly Cost at Scale

| Sessions/mo | Input cost | Output cost | **Total** |
|-------------|-----------|------------|----------|
| 100 | $0.23 | $0.16 | **$0.39** |
| 1,000 | $2.32 | $1.60 | **$3.92** |
| 10,000 | $23.20 | $16.00 | **$39.20** |

### Recommendations

- **Gate behind Premium only** — at $4.99/mo, even 1,000 Premium subscribers = $4,990 MRR, covering $3.92 AI cost with 99.9% margin
- **Rate-limit to 5 sessions/day per user** — prevents abuse; a daily power user generates ~$0.01/day in AI cost
- **Cache system prompt** — Anthropic prompt caching reduces repeated context costs by ~90%
- **Use claude-haiku-4-5** not claude-sonnet-4-5 for coaching — haiku is ~10x cheaper and sufficient for structured relationship advice
- At 10,000 sessions/mo the AI cost is $39/mo — negligible against Premium revenue at that scale
