# Undercut

Paste your Shopify store URL → see your 5 closest competitors → follow their sales, price changes and new products every day.

**Stack:** SvelteKit 2 (Svelte 5) · Tailwind 4 · Supabase · PostHog (EU) · Sentry · Resend · Vercel Cron.
Roadmap: see the "Undercut — Build Roadmap" doc. Design: Figma file "Undercut — Brand & Product".

---

## 1. Run it in 2 minutes (demo mode, no accounts)

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

Without keys the app runs in **demo mode**: data lives in `data/db.json`, login skips email verification, and automatic discovery is off (you add competitors by hand). PostHog and Sentry stay off until their keys are set.

### Try everything offline with simulated stores

```bash
# terminal 1
npm run fake-shopify   # 8 fake Shopify stores on http://localhost:4545
# terminal 2: add  FAKE_SHOPIFY_URL=http://localhost:4545  to .env
npm run dev
```

1. On the homepage, analyze **retrokits.be** (your "store"). You get 5 competitors; the beauty and plant stores are filtered out.
2. Create an account with any email.
3. Simulate a day of changes: `curl localhost:4545/__tick`
4. In the dashboard click **Refresh now** → sales, price drops and new products appear.
5. Test summary: `npm run cron -- --reminders` (in demo mode the email prints in the console).

Remove `FAKE_SHOPIFY_URL` to use real stores.

---

## 2. Going live

| Service | What for | Variables |
|---|---|---|
| [Supabase](https://supabase.com) (Frankfurt) | Database + magic-link login | `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| [SerpApi](https://serpapi.com) **or** [Brave Search API](https://brave.com/search/api/) | Competitor discovery | `SERPAPI_KEY` or `BRAVE_SEARCH_KEY` |
| [PostHog](https://posthog.com/eu) (EU Cloud) | Analytics, funnels, heatmaps, session replays | `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` |
| [Sentry](https://sentry.io) | Errors, performance, cron monitoring | `PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel for source maps) |
| [Resend](https://resend.com) | Login emails + weekly summary fallback | `RESEND_API_KEY`, `EMAIL_FROM` |
| [Anthropic](https://console.anthropic.com) (optional) | Smarter search queries | `ANTHROPIC_API_KEY` |

**Supabase:** create a project in Frankfurt → *SQL Editor* → run `supabase/schema.sql` → *Authentication → URL Configuration*: add `http://localhost:5173/auth/callback` (and your domain) to *Redirect URLs* → copy the 3 keys. Demo mode turns off by itself.

**Vercel:** import the repo, paste the variables (including `CRON_SECRET` and `PUBLIC_APP_URL`). `vercel.json` already schedules the daily cron at 06:00 UTC. Hobby is fine for the free beta; switch to Pro before charging customers.

---

## 3. Analytics and monitoring

- **PostHog loads only after the visitor accepts cookies** (`src/lib/components/CookieBanner.svelte`). Session replays mask every input; add `data-private` to any element whose text must be hidden.
- **Every event name lives in `src/lib/analytics.ts`** — never call PostHog directly. Current plan:
  `cta_clicked`, `analysis_started`, `analysis_completed`, `analysis_failed`, `competitor_removed`, `competitor_added`, `signup_started`, `signup_completed`, `dashboard_viewed`, `refresh_clicked`, `push_enabled`, `notification_opened`, `plan_upgraded`.
- **Sentry** runs in the browser (`src/hooks.client.ts`, replay only on errors) and on the server (`src/hooks.server.ts`). The daily cron reports to **Sentry Crons** as `daily-sync`, so a missed or failed run raises an alert.
- Weekly 30-minute review: funnel drop-offs → 5 replays of people who left → top Sentry errors. Fix the worst one before building anything new.

---

## 4. How it works

```
src/lib/server/engine/
  shopify.ts    reads /products.json (public catalog) and the homepage (name, currency, country, language)
  queries.ts    builds search queries from your catalog (heuristics, or an LLM if a key is set)
  search.ts     SerpApi / Brave → domains; drops marketplaces and social networks
  discover.ts   keeps Shopify stores and scores them: 60% catalog (TF-IDF) · 20% prices · 12% market · 8% size
  track.ts      syncs a store: saves products, a daily snapshot and the changes
  report.ts     instant report (price by category, sales) and dashboard headlines
src/lib/server/db/   one interface for Supabase and for the demo JSON file
src/lib/components/  Mascot, AppIcon, Brand, landing sections, cookie banner
src/routes/
  /                     landing page + analysis
  /analyze/[id]         5 competitors (remove / add) + instant report
  /login, /onboard/[id] account → saves competitors
  /dashboard            changes feed + competitors
  /dashboard/product/…  price history of one product
  /dashboard/settings   weekly summary day
  /api/cron/daily       daily check + weekly summaries
  /privacy, /terms      placeholders until Phase 5
```

**Detected changes:** price drop / raise, sale start / end (`compare_at_price`), sold out / back in stock, and new product (only if Shopify created it less than 14 days ago, to avoid false positives). The first read of a store is its baseline and creates no changes.

## Scripts

- `npm run dev` · `npm run build` · `npm run check` · `npm test`
- `npm run fake-shopify` — simulated stores
- `npm run cron` — runs the cron against the local server (`-- --reminders` forces the summaries)

## Brand

Colors: Ink `#111111`, Cream `#FFF1D6`, Tangerine `#FF6A3D`, Lime `#C8F25A`, Sand `#EADFC6`. Type: Bricolage Grotesque (display, condensed via `.display`) + Geist (UI). Mascot: `<Mascot mood="spy|shock|happy" color="tangerine|ink" size={…} />`.
