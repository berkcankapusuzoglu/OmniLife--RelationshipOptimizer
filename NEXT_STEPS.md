# Next Steps — OmniLife Relationship Optimizer

Last updated: 2026-03-22

## Current Status

- **Live at**: https://omnilife-relationship-optimizer.vercel.app
- **DB**: Supabase PostgreSQL (active, schema synced)
- **Payments**: Stripe code ready, needs product creation + env vars
- **Native app**: Capacitor configured, needs `npx cap add ios/android`

## Immediate (This Week)

### 1. Custom Domain
- [ ] Buy domain (recommended: `omnilife.app` or similar)
- [ ] Add in Vercel → Settings → Domains
- [ ] Update DNS records per Vercel instructions
- [ ] Update `NEXT_PUBLIC_APP_URL` env var
- [ ] Update `metadataBase` in `src/app/layout.tsx`

### 2. Stripe Setup
- [ ] Create Stripe account at dashboard.stripe.com (if not done)
- [ ] Create product: "OmniLife Premium Monthly" → $7.99/mo recurring
- [ ] Create product: "OmniLife Premium Yearly" → $59.99/yr recurring
- [ ] Copy price IDs (`price_...`)
- [ ] Add env vars to Vercel:
  - `STRIPE_SECRET_KEY` = `sk_test_...`
  - `STRIPE_MONTHLY_PRICE_ID` = `price_...`
  - `STRIPE_YEARLY_PRICE_ID` = `price_...`
- [ ] Add webhook endpoint: `https://YOUR-DOMAIN/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Add `STRIPE_WEBHOOK_SECRET` = `whsec_...` to Vercel
- [ ] Redeploy: `npx vercel --prod --yes`
- [ ] Test with card `4242 4242 4242 4242`

### 3. Native App (iOS/Android)
- [ ] On a Mac: `npx cap add ios && npx cap sync && npx cap open ios`
- [ ] Configure Apple Developer account ($99/yr)
- [ ] Set up Firebase project for push notifications
- [ ] Upload APNs key to Firebase
- [ ] Build and submit to App Store
- [ ] On any machine: `npx cap add android && npx cap sync && npx cap open android`
- [ ] Build and submit to Google Play ($25 one-time)

## Short Term (Weeks 2-4)

### 4. Marketing Launch
- [ ] Create TikTok account (@omnilife.app)
- [ ] Create Instagram account
- [ ] Record first TikTok: "Taking our relationship quiz live"
- [ ] Post to r/relationship_advice (organic, helpful, no hard sell)
- [ ] Submit to Product Hunt
- [ ] Submit to Indie Hackers

### 5. Google Search Console
- [ ] Add site to Google Search Console
- [ ] Submit sitemap: `https://YOUR-DOMAIN/sitemap.xml`
- [ ] Monitor indexing of blog posts

### 6. Analytics
- [ ] Set up PostHog or Mixpanel (swap `trackEvent` implementation)
- [ ] Monitor: quiz completion rate, signup conversion, daily log retention

## Medium Term (Months 2-3)

### 7. Content Growth
- [ ] Write 5 more blog posts per month
- [ ] Create YouTube Shorts / TikToks weekly
- [ ] Build email newsletter (subscribers table already exists)
- [ ] Guest post on relationship blogs

### 8. Product Improvements
- [ ] Social sign-in (Apple, Google) — reduces mobile signup friction
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Weekly email digest with score summary
- [ ] AI-powered insight generation from daily log notes

### 9. Partnerships
- [ ] Reach out to couples therapists for free pro accounts
- [ ] Contact relationship podcasts for sponsorship ($200-500/ep)
- [ ] Connect with wedding planners for pre-marriage assessments

## Revenue Targets

| Timeline | Users | Paying (15%) | MRR |
|----------|-------|-------------|-----|
| Month 3 | 500 | 75 | $600 |
| Month 6 | 2,000 | 300 | $2,400 |
| Month 12 | 10,000 | 1,500 | $12,000 |
| Month 18 | 30,000 | 4,500 | $36,000 |

## Architecture Notes

- The app uses a lazy DB singleton — builds succeed without DATABASE_URL
- Stripe is optional — the app works fully without Stripe env vars (payments disabled)
- Capacitor loads the live Vercel URL — no static export needed
- All public pages have OG images via `/api/og` for social sharing
- The daily log wizard is 11 steps, designed for <45 second completion on mobile
