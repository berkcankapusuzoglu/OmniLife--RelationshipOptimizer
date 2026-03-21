# Deployment Guide — OmniLife Relationship Optimizer

## Prerequisites

- Node.js 20+
- A Supabase project with Transaction Pooler enabled
- A Stripe account (test mode for staging)
- A GitHub repository connected to Vercel

## Step-by-step

### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New Project** and import your GitHub repo.
3. Vercel auto-detects Next.js — accept the defaults.

### 2. Set Environment Variables

In the Vercel dashboard under **Settings > Environment Variables**, add:

| Variable | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Your Supabase **Transaction Pooler** connection string (port 6543, `?pgbouncer=true`) | Production, Preview |
| `STRIPE_SECRET_KEY` | `sk_live_...` (production) or `sk_test_...` (preview) | Production, Preview |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe dashboard | Production |
| `STRIPE_MONTHLY_PRICE_ID` | `price_...` | Production, Preview |
| `STRIPE_YEARLY_PRICE_ID` | `price_...` | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Production |

Use different values for Production vs Preview where noted.

### 3. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Settings > Database > Connection string** and copy the **Transaction Pooler** URI (port 6543).
3. Push the schema:
   ```bash
   # Locally, with .env.local containing DATABASE_URL
   npm run db:push
   ```

### 4. Set Up Stripe

1. In the [Stripe Dashboard](https://dashboard.stripe.com), create two products:
   - **Monthly Plan** — set a recurring monthly price. Copy the `price_...` ID.
   - **Yearly Plan** — set a recurring yearly price. Copy the `price_...` ID.
2. Go to **Developers > Webhooks** and add an endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copy the webhook signing secret (`whsec_...`).

### 5. Deploy

Push to your main branch. Vercel builds and deploys automatically.

```bash
git push origin main
```

### 6. Verify

After deployment:

- [ ] Visit the production URL — landing page loads
- [ ] Register a new account
- [ ] Log in and access the dashboard
- [ ] Submit a daily log and confirm scores compute
- [ ] Test Stripe checkout flow (use test card `4242 4242 4242 4242`)
- [ ] Confirm webhook events arrive in Stripe dashboard

### 7. Custom Domain (optional)

1. In Vercel **Settings > Domains**, add your domain.
2. Update DNS records as instructed by Vercel.
3. Update `NEXT_PUBLIC_APP_URL` to match.
4. Update the Stripe webhook URL to the new domain.

## Troubleshooting

- **Build fails with DATABASE_URL error**: The app uses a lazy DB singleton (`getDb()`), so builds should succeed without a database. If not, ensure no top-level DB calls exist outside of `getDb()`.
- **"Connection refused" on preview deploys**: Ensure `DATABASE_URL` is set for the Preview environment in Vercel.
- **Stripe webhooks failing**: Verify the webhook signing secret matches and the endpoint URL is correct. Check Stripe's webhook logs for details.
