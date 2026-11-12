# Undercut — analytics that agencies understand in 30 seconds

MVP built with SvelteKit 3 + Svelte 5 + Tailwind 4.

## How the app is organised

- **Overview** — the agency's week: the 2 most urgent tasks per client, and every client with a health score and a status dot per area.
- **Client** — *Summary* (health, one tile per area, one to-do list you tick off) → *Traffic* → *Search & Maps* → *SEO* (automatic audit) → *Heatmaps* → *App* → *Setup*. Tabs only appear for what the agency manages (website, app or both).
- **Keywords** — keyword research: monthly searches + competition, questions people ask, trends, pages that rank, and where the client already ranks.
- **Settings** — your agency, white-label client reports, connections.

## Undercut AI & one-button fixes

- **⚡ Fix** appears wherever Undercut can fix a problem itself (titles, descriptions, image texts, canonicals, business info, keywords) — published live through the snippet.
- **How to fix** appears for everything else (speed, console errors, W3C errors, accessibility, tracking…): clear steps + code, "Copy for the developer", or ask the AI.
- **Undercut AI** (button bottom-right, `⌘J`): chat about the client you are looking at. It reads the real data and proposes actions as buttons — nothing changes on a site until you click. Uses Claude with tools when `ANTHROPIC_API_KEY` is set; otherwise a built-in assistant handles status, "fix everything", keywords and how-to questions (EN/FR/ES).
- **Account menu** (top-right): client setup & invite, Team, Billing & usage (plans, usage meters, Stripe checkout + portal when `STRIPE_*` keys are set), Agency settings, Connections, My account.

## Run it

```bash
npm install
cp .env.example .env   # optional: works without it, in demo mode
npm run dev
```

Open http://localhost:5173. Four example clients load with demo data straight away.

## What works now

| Feature | Status |
| --- | --- |
| Agency overview: all clients, health score, what needs attention first | ✅ |
| Client dashboard: visits, sources, pages, Google Search, Maps, contacts | ✅ demo data, live once Google is linked |
| "What to do now": every number explained + one action | ✅ rule-based |
| Weekly summary | ✅ rule-based, or Claude if `ANTHROPIC_API_KEY` is set |
| **Fix it here (auto-fix)**: Undercut writes the fix (Google titles, descriptions, image alt texts, canonical tags, LocalBusiness structured data — with Claude if `ANTHROPIC_API_KEY` is set), the agency edits/approves, and it goes **live on the site through the snippet**. Undo anytime; "code for the CMS" for a permanent fix | ✅ **live** (tested end-to-end) |
| **Lighthouse** (Performance, Accessibility, Best practices, SEO + failing audits) and **W3C HTML validation** on the homepage | ✅ live (PageSpeed API + validator.w3.org) |
| **Automatic SEO audit** per client (no URL to type): homepage + sitemap pages — titles, descriptions, H1, canonical, noindex, alt texts, thin content, structured data, share image, speed, robots.txt, sitemap, HTTPS + Core Web Vitals via PageSpeed. Cached 24 h, "check again" button | ✅ **live** |
| **Heatmaps** (Hotjar-style): one cookieless snippet → click map, scroll map, rage clicks, "clicks on things that are not links", drawn on a snapshot of the real page; desktop / mobile | ✅ **live** (tested end-to-end) |
| **App analytics**: active users, new users, DAU/MAU, sessions, crash-free users, iOS vs Android, versions, screens (GA4/Firebase), retention cohorts, App Store rating + reviews (public, live) | ✅ usage live via GA4 · App Store live · Google Play & downloads demo |
| Lighthouse **mobile + desktop**, browser **console errors** | ✅ |
| Tasks: every finding becomes a task you can tick off, per client and across clients | ✅ |
| Add client → its sitemap is checked live | ✅ |
| One "Connect with Google" → GA4, Search Console, Business Profile, Tag Manager | ✅ code ready, needs your Google Cloud keys |
| Pick each client's property from dropdowns | ✅ once Google is connected |
| White-label client report (`/r/<client>`) + Save as PDF | ✅ |
| Agency branding (name, colour, footer) | ✅ |
| **Search Console page** per client: searches, pages, countries, devices, sortable + filter, quick wins (page 2 → page 1, almost top 3, seen-not-clicked) | ✅ demo, live once linked |
| **Content ideas** (AnswerThePublic + Google Trends + BuzzSumo in one search): questions people ask, prepositions, comparisons, A–Z, 12-month trend, rising searches, pages that already rank, CSV export, FR/NL/EN/ES × BE/FR/NL/LU/ES | ✅ questions live from Google autocomplete (free); trends + ranking pages live with `SERPAPI_KEY` |

## Connect real Google data (~10 min)

1. [Google Cloud Console](https://console.cloud.google.com) → new project.
2. Enable: Google Analytics Data API, Google Analytics Admin API, Google Search Console API, Tag Manager API, My Business Account Management API, My Business Business Information API, Business Profile Performance API.
3. OAuth consent screen → External → add your Gmail as test user.
4. Credentials → Create OAuth client ID → Web application → redirect URI `http://localhost:5173/auth/google/callback`.
5. Put the ID and secret in `.env`, restart `npm run dev`, go to **Connections → Connect with Google**.
6. Open a client → **Connect data** → pick its GA4 property, Search Console site, Maps location, GTM container.

Notes: the Business Profile APIs need an access request to Google (quota is 0 until approved). Public launch needs Google OAuth app verification for these scopes — start both early.

## Design

Serif + sans: **Instrument Serif** for titles, **Geist** for UI and the big light numerals. Self-hosted through Fontsource (no Google Fonts request, GDPR-friendly). Palette: paper `#EFEFEB`, ink `#0D0D0D`, lime `#C6F432`. Tokens live in `src/routes/layout.css`.

## Project map

```
src/lib/server/google.ts    OAuth + GA4 / Search Console / Business Profile / Tag Manager calls (plain fetch)
src/lib/server/sitemap.ts   live sitemap.xml + robots.txt analysis
src/lib/server/insights.ts  numbers → plain-language findings, health score, AI summary
src/lib/server/overview.ts  gathers every area of a client → tiles + one task list
src/lib/server/seo-audit.ts automatic SEO audit
src/lib/server/tracking.ts  heatmap events, snapshots, aggregation (+ src/routes/u.js = the snippet)
src/lib/server/app-analytics.ts  app usage (GA4/Firebase), App Store ratings & reviews
src/lib/server/ideas.ts     content ideas: autocomplete questions + SerpApi trends / top content
src/lib/server/demo.ts      deterministic demo data per client
src/lib/server/store.ts     MVP storage in ./.data (JSON). Swap for Supabase: supabase/schema.sql
src/routes/app/...          agency app
src/routes/r/[id]           white-label client report
```

## Google connection: fast & stable

- One refresh at a time, 15 s timeouts, 3 retries with backoff on 429/5xx/network errors, automatic refresh + retry on 401.
- Answers cached 10 min (dashboards open instantly, quota spared); stale data served if Google is down.
- A revoked/expired login disconnects cleanly with a clear message; Settings shows the connection status with **Test connection** and **Refresh data**.
- Setup pre-selects the GA4 / Search Console / Maps / GTM property that matches the client's domain or name.
- Note: while the Google Cloud app is in "Testing" mode, Google expires refresh tokens after 7 days — publish the OAuth app to avoid weekly reconnects.

## Heatmap snippet

```html
<script defer src="https://YOUR-UNDERCUT-URL/u.js" data-site="CLIENT_ID"></script>
```

Cookieless, no IP stored, form fields never recorded, `data-undercut-mask` hides any element's text. Each client's snippet (with its id) is on *Client → Setup*.

## App analytics — how it works

1. **Usage** (active users, retention, screens, versions, crashes): the app uses Firebase; link the Firebase project to a GA4 property and pick it in *Setup*. Undercut reads it with the same Google login (platform iOS + Android).
2. **Ratings & reviews**: App Store ID in *Setup* → loaded live from Apple's public API. Google Play reviews need a Play Console service account (next step).
3. **Downloads**: App Store Connect API key + Play Console reports (next step).

## Next steps to production

- Supabase Auth + the schema in `supabase/schema.sql` instead of `./.data` (Vercel's disk is not persistent).
- Refresh token in Supabase Vault; daily cron writes `snapshots` so dashboards don't hit Google live.
- Signed report links (`report_token`) instead of `/r/<id>`.
- Stripe plans: Freelance (3 clients) · Agency (15) · Studio (50).
- FR / NL translations.
