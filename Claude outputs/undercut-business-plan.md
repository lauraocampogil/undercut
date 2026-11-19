# Undercut · Business plan

**Verdict: Profitable**

- ✓ Each paying agency per month earns $22.07 before fixed costs (88% contribution).
- ✓ Year 1 operating profit: $1,690.
- ✓ Break-even is 8 paying agency per months a day against a capacity of 1000.
- ✓ 5 of 20 simulated buyers buy (25%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $25.00 a paying agency per month |
| Profit margin at plan | 67% per paying agency per month |
| Break-even | 8 paying agency per months a day |
| Year 1 operating profit | $1,690 |
| Startup spend | $800 |
| Cash needed before it pays for itself | $1,281 |
| Startup money earned back | month 11 |
| Buyer panel | 5 buy · 15 pass |

## The idea

- What it is: an analytics SaaS for agencies: one screen per client showing where leads come from (forms, calls, WhatsApp counted by a cookieless snippet), traffic, Google Search (Search Console), SEO + real Lighthouse checks, heatmaps, campaigns (UTM), app store tracking, paywall and error tracking for apps, client goals with next actions, one-click SEO fixes applied by the snippet, and a white-label monthly client report.
- Who it is for: owners / project leads of small web, app and communication agencies (1–15 people) in Belgium, France and the Netherlands who manage 5–40 client sites or apps and report to clients monthly.
- What it sells, at what price: monthly subscription per agency: Freelance €19 (3 clients), Agency €59 (15 clients), Studio €149 (50 clients). Free beta for the first 30 agencies.
- Where and how: online (getundercut.app), self-hosted on one VPS (Hetzner + Coolify), Supabase for multi-tenant data. Found through outreach to agencies, landing page, communities.
- Budget and constraints: solo founder (Laura, Brussels, web & mobile developer, runs a small freelance studio), near-zero budget, product already built and live in beta with her own client sites; no paying customers yet. Not yet: Stripe billing, Google OAuth verification, legal pages.

## Summary

Undercut is an analytics and client-reporting SaaS for small web, app and communication agencies (1–15 people) in Belgium, France and the Netherlands: per client, where the leads came from, what changed and what to fix this week, sent as a white-label report.

**Verdict: Profitable — barely, and only on estimates.** Contribution 88% per paying agency (€22 of a €25 blended year-1 price), break-even at 8 paying agencies, year-1 operating profit ≈ €1.7k at 32 agencies by month 12 — founder pay not included. To earn a living (~€3k/month) Undercut needs roughly 100–150 paying agencies at list prices.

**Panel and board agree:** trust and switching effort block the sale, not price. Narrowing to one promise and adding a trust pack moved the simulated buy rate from 5% to 25% and removed every trust objection; habit (GA4/Looker/existing tools) remains. Retainer-selling agencies are the beachhead (3/3 bought). **They disagree** on the moat: the Monopoly lens passes (crowded market, no 10× edge), Offers and Product fund it if narrowed and proven.

**Biggest risk:** no real proof yet — zero paying agencies, no case study. Answer: the founding-agency test (50 Belgian retainer agencies, pass bar 5 connect a real client in 7 days, 2 say they'd pay).

**To start:** ~€1.3k of cash at most (legal review, small tests) and ~2.5 weeks of product fixes (DPA/Privacy/Terms, review/undo on fixes, read-only report flow, public sample report).

**This week:** publish a real sample report page and the DPA/privacy pages, then message the first 20 Belgian agencies that sell maintenance/SEO retainers.

_The panel is simulated buyers and the numbers are projections — real agencies and real invoices confirm them. Not financial, legal or tax advice._

## What the board said

**Vote: 2 FUND IF · 1 PASS — average 3.7/10** (Offers 4 FUND IF · Monopoly 3 PASS · Product 4 FUND IF)

### Risks raised by more than one member
1. Trust is missing (no proof, no DPA/EU-hosting page, unverified Google OAuth, script editing client sites) — all three.
2. Too many features, no single "one thing" — Offers + Product + Monopoly.
3. Switching cost/habit vs GA4, Looker Studio and existing tools — Offers + Monopoly.

### Conditions (checklist)
- [ ] One core loop: leads by source + "fix this week" → white-label report; hide the rest until asked
- [ ] Review/approve/undo + change log on every fix
- [ ] EU hosting statement, DPA, Privacy/Terms, verified Google OAuth, billing
- [ ] Time to first insight < 10 minutes, sample report public
- [ ] 3 named agencies with real before/after numbers
- [ ] Risk-reversal guarantee + free migration/setup
- [ ] 5–10 paying agencies within 60 days, one repeatable channel, known cost

### Strongest version the board can see
Not "all-in-one analytics", but **the retainer-proof report for small EU agencies**: every month, per client, where the leads came from and what was fixed — with your logo, ready in 10 minutes, hosted in the EU. The rest of Undercut (heatmaps, apps, goals) becomes the depth behind that one promise.

Disagreement kept: the Monopoly lens doubts any durable moat even then; Offers and Product think the narrowed offer can sell to a niche.

## The competition

Sources read on 2026-11-19. Several price write-ups are published by competing tools (Coupler, Seline, Swydo): verify on each vendor's own price page before quoting them publicly.

### Who is there

| name | type | comparable price | notes |
| --- | --- | --- | --- |
| AgencyAnalytics | direct | $25/client/month (monthly) · $20 annual → **15 clients ≈ $300–375/month**, 50 clients ≈ $1,000–1,250 | the reference tool; add-ons extra (rank tracker $41.67/500 kw); 14-day trial, 30-day money-back. [coupler.io](https://blog.coupler.io/agencyanalytics-pricing/) |
| Whatagraph | direct | **from $812/month**, annual only | out of reach for 1–15 person agencies. [coupler.io](https://blog.coupler.io/?p=86143) |
| Swydo | direct | **$69/month** (10 sources, unlimited clients) + $2–4.50/extra source | closest on price; reporting + monitoring. [swydo.com](https://swydo.com/blog/swydo-vs-agencyanalytics/) |
| DashThis | direct | priced by dashboards/sources (price page not read) | each GA4 property = 1 source. [dashthis.com](https://dashthis.com/blog/new-pricing-2026/) |
| GA4 + Search Console + Looker Studio | substitute | free (but hours to build/maintain) | what 11/20 simulated buyers said they use out of habit |
| Plausible | indirect | ~$9–19/month for 1–10 sites | cookieless analytics, no agency reporting or leads. [seline.com](https://seline.com/blog/plausible-analytics-pricing) |
| Hotjar / Clarity | indirect | Clarity free | heatmaps only |

**Price range for "reporting for ~15 clients":** lowest ≈ $69 (Swydo, if ≤10 sources) · median ≈ $300 (AgencyAnalytics) · highest ≈ $812+ (Whatagraph). **Undercut Agency: €59 for 15 clients.**

### Positioning map (price × "tells you what to do")

- Expensive + data dashboards: Whatagraph, AgencyAnalytics
- Mid + data reports: Swydo, DashThis
- Free + DIY: Looker Studio/GA4
- Cheap + single job: Plausible (analytics), Clarity (heatmaps)
- **Empty corner: cheap + "what to fix this week" + leads + fixes it for you** → Undercut

### What their customers complain about (AgencyAnalytics, Capterra 4.8/117)

1. Rigid report customisation / white-label (≈7 of ~25 visible reviews) — e.g. "the inflexibility of the reporting". [capterra](https://www.capterra.com/p/158746/Agency-Analytics/reviews/)
2. Price per client too high (≈3) — "Pricing could be lower per client".
3. Missing features, e.g. Google Maps grid tracking (≈3, thin).
4. Bugs / support (≈2, thin). Learning curve (1, thin).

Whatagraph: entry price and annual-only billing (author's view, competitor source).

### The gap

- **Price for small agencies:** a 15-client agency pays ~$300+/month at AgencyAnalytics; Undercut is €59. That is a 5× difference — but the simulated panel said price was *not* the blocker; trust and habit were. So price is a door-opener in messaging ("the reporting tool built for 1–15 person agencies"), not the reason to switch.
- **Action, not dashboards:** every direct competitor sells reports/dashboards of data. None (in what was read) leads with "this week's to-do" + leads by source + fixes applied for you.
- **EU / GDPR-native + cookieless:** strong in BE/FR/NL, but only if proven (EU hosting, DPA) — today it is a claim.

### The threat

- AgencyAnalytics already ships "AgencyAI insights" and goals/alerts: it can add a "to-do" view fast.
- Swydo (NL, $69, unlimited clients) is the most direct price competitor for small EU agencies.
- Google can improve Looker Studio templates / GA4 insights for free.

## The buyer panel

**5 buy · 15 pass** (25% buy) out of 20 simulated buyers. Seed 737936, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Freelancer / solo studio (1-2 people, 3-10 clients) | 7 | 29%  (thin) |
| Small web or app agency (3-8 people, 10-25 clients) | 8 | 25% |
| Communication / marketing agency (5-15 people, campaigns + social) | 5 | 20%  (thin) |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Sells retainers / maintenance | 3 | 100%  (thin) |
| Tool collector | 3 | 33%  (thin) |
| No reporting at all | 4 | 25%  (thin) |
| Uses an agency reporting tool | 3 | 0%  (thin) |
| GA4 + Looker Studio loyal | 4 | 0%  (thin) |
| Price-sensitive | 3 | 0%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| under $56,000 | 6 | 33%  (thin) |
| $85,000 and up | 7 | 29%  (thin) |
| $56,000 to $85,000 | 7 | 14%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| habit | 14 | "I already pay for a reporting tool and my clients are used to those reports. Switching means rebuilding templates and re-connecting every client, and I have never heard of Undercut. The price is fine, it's the hassle and the risk of a tool that might not exist next year." (P001) · "I already have Looker Studio templates built on GA4 for my clients and they cost me nothing. Redoing that in a new tool for a 10-minute saving doesn't feel worth it, and I'd be wary of putting my clients' data in something from a one-founder startup I've never heard of." (P003) |
| need | 1 | "I'd probably sign up for the free trial because I do that with everything, but that's not buying. My clients don't read the reports I already send, so a nicer one doesn't fix anything for me. I'd only pay if it clearly saved me hours or got clients to react." (P013) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 4 | "A client just asked me why their leads dropped and I had nothing to show them, so a report I can send in ten minutes is a real gap. It's free until January and read-only, so trying it costs me an hour, not money." (P002) · "The monthly PDF is a time sink and my clients never read it, so a report they understand in 10 minutes is worth a try, especially free until January and read-only so I don't touch client sites. I'd connect one or two clients first, not all of them." (P012) |
| convenience | 1 | "It's free until end of January, EU-hosted with a DPA and read-only start, so the GDPR question I always ask is answered and I lose nothing by connecting Google for one client. I sign up for trials like this all the time, so I'd try it, but I wouldn't commit to paying yet." (P017) |

### What would flip a no

- A real sample report I could send to a client as-is, plus proof that other small agencies already use it and that it does the leads (forms, calls, WhatsApp) part better than my current tool.
- A way to import or mirror my existing Looker Studio layouts, or a case study from an agency like mine showing the monthly report really takes 10 minutes. I'd also want to see a real sample report with a client's data before connecting anything.
- A real sample report for a site like my clients' that answers 'why did leads go down' better than what I send now, plus proof that I can run it next to my current tool for a month without migrating anything.
- A client actually asking me for proof that the retainer works, or seeing a report in 10 minutes that I could use to justify raising a retainer price or stop a client from cancelling.
- Seeing a real report for a client like mine, plus proof it replaces my current tool for one client at no cost, with a founder I can reach.
- A client asking me for monthly numbers, or a case from another small agency like mine that lost a client for lack of a report. Better still, one client where I connect Google myself in 10 minutes and get a report I can send the same day without asking anyone.
- A Looker Studio template import or a clear migration path so I don't lose my existing reports, plus a few named agencies I recognise already using it for a year or more.
- A real sample report for a small client site that I can read in two minutes, plus proof that the read-only Google connection touches nothing on the client's site and nothing gets changed without me.
- Proof that it tracks calls and WhatsApp leads reliably, which GA4 can't do, plus a first client report that looks better than my Looker one with no template work on my side. I'd try the free period, but I'd only pay if it replaced Looker rather than sitting beside it.
- A real sample report for an agency like mine that looks better than my Looker Studio one, plus proof that I can import or match my existing templates so I don't redo the work. Seeing another agency in Belgium use it would help.
- Seeing a real report that one of my clients would actually reply to, or proof it cuts my monthly reporting from hours to minutes on my own 5-8 clients.
- A real sample report I could show a client that explains why their leads dropped, and that tracks calls and WhatsApp leads, which GA doesn't do well. If a client asked for it, or it saved me a few hours each month, I'd pay.

Buyers say they would buy **1.0 times** in the first month on average.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Simulated buyers (20, two rounds). Use to choose what to test, not as the final word.

| | v1 pitch (19/59/149) | v2 pitch (founding offer) |
| --- | ---: | ---: |
| Point of marginal cheapness | €14.9 | €11.9 |
| Optimal (least resistance) | €15.1 | €15.4 |
| Indifference (bargain = expensive) | €35.2 | €30.1 |
| Point of marginal expensiveness | €90.0 | €78.8 |
| **Acceptable range** | **€15–90** | **€12–79** |

Competitors for ~15 clients: Swydo $69 (≤10 sources), AgencyAnalytics ≈$300–375, Whatagraph $812+ (see competitors.md).

### Recommendation (to test)
- **Solo €19/month — 5 clients** (the panel's freelancers had 5–10 clients; 3 was too few)
- **Studio €39/month — 12 clients** (sits on the indifference point ~€30–35)
- **Agency €79/month — 30 clients** (just under the "too expensive" line, still 4× cheaper than AgencyAnalytics)
- **Founding agencies (first 30): −50% for life**, free until 31 Jan 2027. Write the real price next to it ("€39 → €19.50"), the v2 panel was confused by "50% off" on already-listed prices.
- Annual: 2 months free.

### The cheap test
Put these three prices on the landing + /beta form and ask "which plan would you pick after the beta?" — count real answers from real agencies before turning on Stripe.

## The offer

### Problem list (buyer's words, from the panel)
Before buying: "GA4/Search Console are free" · "I already have Looker Studio / a reporting tool" · "rebuilding my reports is work" · "unknown solo founder, will it exist next year?" · "GDPR: where is the data, is there a DPA?" · "a script editing my clients' sites is risky" · "my clients don't read reports" · "3 clients is too small a plan" · "I need my clients' agreement to install a snippet".
During: "no time to learn another dashboard" · "is the WhatsApp / call tracking accurate?" · "I want to see my own client's data in 10 minutes".
After: "can I export if it shuts down?" · "what if a fix breaks a layout?" · "will clients actually react?"

### The stack (value high / cost low kept)
- **Core:** the monthly client report your clients understand — leads by source, what changed, what to fix this week — white-label, ready in 10 minutes.
- **Bonus 1 — Read-only start:** first report from the Google connection alone, no snippet, no client sign-off (kills "snippet on every site", "client must agree").
- **Bonus 2 — Trust pack:** EU hosting (Germany), signable DPA, export anytime, public status/changelog (kills GDPR + "will it exist").
- **Bonus 3 — Safe fixes:** fixes are suggestions; preview → approve → undo, change log, checked live in a real browser (kills "script is risky").
- **Bonus 4 — Done-with-you setup:** 20-minute call with the founder to set up the first client (kills "no time to learn"). Costs founder time only.
- **Guarantee:** first client report within 24 h of connecting Google, or the founder sets it up with you on a call. Cancel anytime, keep your export.
- **Urgency (true):** 30 founding seats; founding price for life.
- **Name:** "The Founding Agency Plan".

### Value equation (1–10, before → after)
- Dream outcome: 6 → 7 (leads report clients understand)
- Perceived likelihood: 3 → 6 (trust pack, read-only start, guarantee)
- Time to result: 5 → 8 (10 minutes, 24 h promise)
- Effort & sacrifice: 3 → 6 (no snippet needed, done-with-you)

### Re-test (same 20 buyers, same seed)
- **v1: 1 buy · 19 pass (5%) → v2: 5 buy · 15 pass (25%).**
- Trust objections: **7 → 0**. Habit: 11 → 14 (now the only big blocker).
- "Sells retainers / maintenance": **3/3 buy** → the beachhead segment.
- GA4/Looker-loyal and agencies on a reporting tool: still 0% → don't target them first.
- #1 thing that would flip the rest: **a real sample report** (asked by ~12/15), then "import/mirror my Looker template" and "proof call/WhatsApp tracking is accurate".

What must be true before promising it: the DPA page, review/undo on fixes, the read-only report flow and the sample report must exist in the product (see the fix list).

## The numbers

Every number below comes from the input file. Nothing is looked up or guessed.

### One paying agency per month

| line | per paying agency per month |
| --- | ---: |
| Price | $25.00 |
| Stripe fees (~1.5% + €0.25, EU cards) | -$0.93 |
| AI summaries + alt texts (Anthropic API, estimate) | -$1.50 |
| Emails (Resend) + storage per agency (estimate) | -$0.50 |
| **Contribution** (what each paying agency per month leaves to pay the fixed costs) | **$22.07** (88%) |

### The margin that matters

Fixed costs: $170 a month (VPS Hetzner (estimate) $20, Supabase Pro (when the free tier is outgrown) $25, Domain, Resend, backups, monitoring (estimate) $25, Accounting / social status as self-employed in Belgium (estimate, founder pay not included) $100).

- **Break-even: 8 paying agency per months a day.** Below that you lose money every month.
- **Profit margin at your plan** (32 a day): **67%** of every sale, after every cost.
- Capacity: 1000 a day.

### Year 1, month by month

| month | paying agency per months a day | revenue | profit | cumulative (after $800 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | $0 | -$170 | -$970 |
| 2 | 0 | $0 | -$170 | -$1,140 |
| 3 | 3 | $75 | -$104 | -$1,244 |
| 4 | 6 | $150 | -$38 | -$1,281 |
| 5 | 9 | $225 | $29 | -$1,253 |
| 6 | 12 | $300 | $95 | -$1,158 |
| 7 | 15 | $375 | $161 | -$997 |
| 8 | 18 | $450 | $227 | -$770 |
| 9 | 21 | $525 | $293 | -$476 |
| 10 | 25 | $625 | $382 | -$94 |
| 11 | 28 | $700 | $448 | $354 |
| 12 | 32 | $800 | $536 | $890 |

- **Year 1 operating profit: $1,690** on $4,225 of revenue.
- After the $800 startup spend: $890.
- Startup money earned back: month 11.
- Cash you need before it pays for itself: **$1,281**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 67% | 8 | $1,690 |
| Price -10% | 63% | 9 | $1,267 |
| Volume -20% | 62% | 8 | $944 |
| Unit costs +15% | 65% | 8 | $1,616 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.

## Marketing

### Positioning (recommended: A)
**A.** For small agencies that sell monthly retainers and need to prove they're worth it, Undercut is the client report that shows where the leads came from and what was fixed this month — in plain words, with your logo — unlike GA4/Looker dashboards clients never read.
B. For freelancers whose clients ask "is the website working?", Undercut gives a one-screen answer per client in 10 minutes.
C. The EU-hosted, cookieless reporting tool built for 1–15 person agencies, 4× cheaper than AgencyAnalytics.
Evidence: v2 panel — retainer sellers 3/3 buy; "a client asked why leads dropped" is the strongest buy trigger; price is a door-opener, not the reason (competitors.md).

### Channels (start with 2, plus your network)
1. **Direct outreach (LinkedIn + email) to BE agencies selling maintenance/SEO retainers** — free, measurable (reply rate, demo booked). Target list: Webflow/WordPress agencies on Clutch/Sortlist/Google Maps Brussels-Wallonia-Flanders, 1–15 people. 10 personal messages/day.
2. **Communities where these people are:** Belgian/French web & Webflow/WordPress groups, Indie Hackers, r/agency, Slack/Discord of Webflow & SvelteKit, BeCentral/Brussels startup events. Show, don't pitch: post one real anonymised report.
3. **Your own network:** EhB alumni, AKIS.studio contacts, freelancers you know, Unix Creative Studio clients' other agencies.
Not now: paid ads (no proof yet, max CAC too low), Product Hunt (wait for 3 case studies).

### The most you can pay for an agency
Contribution ≈ €22/agency/month (year-1 blended €25 − ~€3 costs, cfo.md). If an agency stays 12 months → ~€264. Keep acquisition under **€65 (3-month payback)** → founder time + free channels only for now.

### Ten hooks (each answers one panel objection)
1. "Your client asked why their leads dropped. Here's the answer in one screen." (need trigger)
2. "Prove your retainer is worth it — every month, in 10 minutes." (retainer sellers)
3. "No snippet needed. Connect Google, get your first client report today." (switching effort)
4. "Hosted in Germany. DPA ready to sign. Your clients' data never leaves the EU." (GDPR)
5. "Every SEO fix is a suggestion. You approve it, you can undo it." (script risk)
6. "Looker Studio shows data. Undercut shows what to do." (habit)
7. "AgencyAnalytics: ~$300/month for 15 clients. Undercut: €39." (price, door-opener)
8. "Calls, forms and WhatsApp counted per channel — no events to set up." (leads accuracy)
9. "Built in Brussels by an agency founder, for agencies like yours." (unknown founder)
10. "See a real report before you connect anything." (#1 flip: sample report)

### 30-day calendar (launch day = 8 Dec 2026, founding seats open)
- **24–30 Nov (T-14…T-8):** finish trust fixes (DPA page, Privacy/Terms, review/undo, sample report). Build target list of 150 BE agencies (retainer sellers first). Write 3 message variants (hooks 1, 2, 3).
- **1–7 Dec (T-7…T-1):** record a 90-second Loom on BSA's real report. Publish the public sample report page. Warm DMs to 20 people in your network. Post "building in public" on LinkedIn (behind the scenes: one real fix verified live).
- **8 Dec (launch):** LinkedIn post (hook 2 + sample report link), email/DM to the 150-agency list in batches of 30/day for 5 days, community posts.
- **9–14 Dec:** 30 DMs/day, book 20-min setup calls (bonus 4). Share one tip/day from real data (hooks 6, 8).
- **15–24 Dec:** follow-ups (2 max), case study #1 drafted with first agency's permission. Seats-left update only if true.
- **Holiday pause 25 Dec–1 Jan:** scheduled LinkedIn posts only.
- **2–9 Jan (T+25…T+32):** follow-up wave + first case study published; ask beta agencies which plan they'd pick (pricing test).

### Weekly numbers (and the "change something" line)
- Outreach → reply rate (< 8% → change the message/hook)
- Replies → setup calls booked (< 30% → change the offer/landing)
- Calls → agency connected a real client within 24 h (< 60% → fix onboarding)

## Brand

- Name: **Undercut** (already in use, domain getundercut.app owned). Checks to run yourself before spending on brand: EUIPO/BOIP trademark search for "Undercut" in class 42 (SaaS) and 35 (marketing services); LinkedIn/Instagram/X handle "getundercut".
- Promise: "Where the leads came from, what to fix this week — for every client, in plain words."
- Voice: direct, a bit rebellious against dashboard bloat, never jargon; numbers + one action. Do: short sentences, "your client", concrete examples. Don't: "insights", "synergy", hype, fake urgency.
- Look: dark + lime gradient landing (current), light dashboard; Instrument Serif headlines + Geist; the "cut" bar motif.
- Trust signals to add: founder face/name + Brussels address on landing, EU hosting badge, DPA link, changelog.

## Operations

### Stack & costs (feed cfo)
Hetzner VPS + Coolify (Germany) · Supabase (Frankfurt) · Resend (email) · Anthropic API (summaries, alt texts) · Google APIs (OAuth, GA4, GSC, PageSpeed) · Stripe (billing, to add) · GitHub. ~€70/month infra + ~€100 accounting/self-employed costs (estimates).

### Day-one routines
- Daily (10 min): Undercut on itself — Errors page, alerts, failed deployments in Coolify, waitlist/new signups.
- Weekly: backups restore test (monthly), reply to every beta agency, ship one improvement from their feedback, review the 3 marketing numbers.
- Per new agency: 20-min setup call within 48 h (bonus 4), check first report sent.

### Permits / legal to check (not legal advice)
- Belgian self-employed status + VAT number (EU B2B reverse charge), invoices via Stripe Tax/Invoicing.
- GDPR: privacy policy, DPA (Undercut = processor for agencies), sub-processor list (Hetzner, Supabase, Resend, Anthropic, Google), records of processing.
- Terms of service with liability cap (fixes on client sites!) and acceptable use.
- Google API: OAuth verification + Limited Use policy compliance for Google user data.

### Risk register
| risk | likelihood | impact | mitigation |
| --- | --- | --- | --- |
| VPS down / data loss | medium | high | daily off-site backups of /app/.data + Supabase PITR; uptime alert |
| A fix breaks a client site | low | high | suggestions only, preview/approve/undo, live check, liability cap in Terms |
| Google OAuth not verified / revoked | medium | high | start verification now; read-only scopes by default, manage scopes optional |
| Leaked keys | happened | high | rotate Supabase/Resend/SerpApi/cron keys; secrets only in Coolify |
| Founder burnout / time (solo + job search) | high | high | narrow scope to the core loop; 2 fixed weekly slots for customers |
| Competitor copies "to-do" view | medium | medium | speed + EU niche + done-with-you service |

## Launch plan

### Cheap real-world test first (this week)
Landing + public sample report + "Reserve a founding seat" form with the 3 prices ("which plan after the beta?"). Send to 50 Belgian retainer agencies. **Pass bar: ≥ 5 real agencies connect a real client within 7 days, ≥ 2 say they'd pay.** If not, change the message before building more.

### Countdown (launch = 8 Dec 2026)
- T-14 (24 Nov): DPA + Privacy + Terms live; review/undo on fixes; read-only report flow; sample report page.
- T-10 (28 Nov): Stripe test mode with founding prices; Resend domain verified; Google OAuth verification submitted.
- T-7 (1 Dec): Loom demo; 150-agency list; messages ready; backups + uptime alert on.
- T-3 (5 Dec): full run-through as a new agency (signup → report in < 10 min) on a phone and a laptop.
- T-1 (7 Dec): warm DMs; seats counter set to the real number.

### Launch-day run sheet (8 Dec)
09:00 LinkedIn post · 09:30 first 30 DMs/emails · 12:00 community posts · 14:00 answer every reply within 1 h · 17:00 book setup calls · 20:00 note numbers (sent, replies, signups, connected clients).

### First 30 days
Week 1: 20-min setup calls, fix every onboarding bug same day. Week 2: first agencies send their first white-label report to a real client — ask what the client said. Week 3: case study #1 (real numbers, permission). Week 4: pricing question to every beta agency; decide Stripe go-live for 1 Feb 2027.

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
