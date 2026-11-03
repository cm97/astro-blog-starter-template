# Build backlog

Kept by the Web Developer. The Coding agents take the top unclaimed item.
Format: number. goal | why | Owner: unclaimed (or agent, date) | Status

00. Thank-you page tells an unpaid session "Payment received": `/thank-you?s=cs_test_neverPaid123` shows "Payment received. Unlocking your app…", then "Payment received." The page never asks Stripe, so any made-up session id gets told it paid. No access is granted. Show neutral "Checking your payment…" wording until the order is on record | Test team 2026-11-03, check 17 | Owner: Test team, 2026-11-03 | PR #172 open, Needs owner review (`src/pages/thank-you.astro`)
0a. Homepage buy path: `/` has 41 views and 0 buy clicks since launch, while /store converts 2 of 29 (7%). Put the $49 offer card with its price, refund line and buy button in the first screen of `/`, plus a "See it working" link to /demo once it exists | funnel_daily 2026-10-20 to 2026-11-02 (SEO Master) | Owner: Coding agent 1, 2026-11-02 | Done: hero offer card ($49, one-time, refund line, Stripe + PayPal buttons) in the first screen at 375px and 1280px; /demo link still to add when /demo exists
0b. Owner decision: /apps-pro sells a separate $29 "Apps Pro" through PayPal, or by email request when PayPal is off. CLAUDE.md rule 5 says only the $49 Digital System is buyable. It is the best-converting page (2 buy clicks from 16 views, 12.5%). Owner: keep it, fold it into the $49 offer, or remove it | Owner: owner | Open
0c. Update the `buzzyfly-agent` AI worker (agent.buzzyfly.com, a back-end worker for buzzyfly.com) so its `/catalog` matches CLAUDE.md. The deployed version still lists zip downloads, the $15/$19/$29 packs as products and the retired $97 bundle, so any bot or tool reading it would push retired offers. Keep only the $49 Digital System as buyable (the others "Coming soon"), describe it as a browser web app, and sync it from `src/data/monetization.ts` if possible | deployed code read 2026-11-02 (SEO Master) | Owner: Developer | Open
0d. Jobs membership self-serve cancel: a Stripe customer-portal link on /jobs and in the membership email, so members can cancel any time without emailing (support mandate, 2026-11-02). Payment and access code, so leave it as "Needs owner review" | owner support policy | Owner: unclaimed | Open
0e. Owner decision, then build: automatic checkout-recovery emails (1h, 24h, 72h) for people who start a Stripe checkout and don't pay. Needs the owner's yes, consent wording, an unsubscribe and a postal address (CAN-SPAM). Stripe Payment Links have no recovery feature, so this would need Stripe Checkout Sessions. Payment code, so "Needs owner review" | sales mandate 2026-11-02 | Owner: owner | Open
0f. Fulfillment watchdog: in the Worker's scheduled run, compare paid Stripe sessions with `fulfillments` and `fulfillment_alerts` every 15 minutes; regenerate a missing access key or flag it to the owner. Delivery code, so "Needs owner review" | tech-ops mandate 2026-11-02 | Owner: Developer | Open
1. Find why /thank-you gets views with no orders, and stop it showing to people who haven't paid | 7 views, 0 orders (CEO, 2026-11-01) | Owner: Developer, 2026-11-01 | Done (PR #145): no paid order was missed; views were owner tests and page reloads, now counted apart
2. Record a traffic source (utm, referrer) on every page view and email sign-up | all 116 views "direct", 5 sign-ups with no source | Owner: Developer, 2026-11-02 | Done: without utm tags the referring site is now the source (google__organic, reddit__social, <host>__referral) on views, buy links and sign-ups; utm still wins
3. Make sure every blog post is indexable: sitemap, robots, canonical, no noindex | 0 search visits | Owner: Developer, 2026-11-01 | Done: all 58 posts in the sitemap, robots.txt points to it, canonical set, no noindex on posts; live sitemap serves 200; IndexNow key added (PR #149)
4. Tighten the /store buy section on phones: price, what you get, refund line and buy button visible without scrolling | 4 buy clicks, 0 sales | Owner: unclaimed | Open
5. Google Search Console: submit the sitemap, fix indexing issues, report search numbers weekly | 0 search visits; owner is verifying the site | Owner: SEO Master, from 2026-11-01 | Owner verified 2026-11-02. Search titles, descriptions, related links and structured data shipped (PR #152); sitemap submission and search numbers need the owner in Search Console until a connector exists
6. International versions of `/store` and `/` under /es/, /pt/, /fr/, /de/ (store first, then home, one per run), with hreflang and a language link. Same $49 USD price, same Payment Link, same refund meaning. The app itself stays in English and each page says so | reach Spanish, Portuguese, French and German speaking freelancers; 0 non-English pages | Owner: builders-a, 2026-11-02 | In progress: /es/store done (PR #168); next /es/ home, then /pt/store

## SEO plan (SEO Master, 2026-11-02)

Five posts for the Marketer, picked for buyer intent and because no post on the
site covers them yet. No keyword volumes: Ahrefs has no API access on this plan
and there is no Search Console connector, so these are chosen from the buyer
problems the Digital System solves. Keep each title under 60 characters (or add
`seoTitle`), the description under 160, link to 2 related posts and end on /store.

1. **"Testimonial request email: the exact ask after a project ends"**:
   target "how to ask a client for a testimonial". Link to
   `project-wrap-up-checklist-that-gets-referrals` and `reconnect-with-past-clients-email`.
2. **"Client contract checklist for freelancers: 8 lines to include"**:
   target "freelance contract checklist". Link to `scope-creep-script` and
   `get-paid-before-you-start-deposit-script`.
3. **"How to say no to a client politely (with exact wording)"**:
   target "how to say no to a client". Link to `can-you-just-add-this-exact-reply`
   and `client-messages-after-hours-boundary-email`.
4. **"Client check-in email template for ongoing projects"**:
   target "client check-in email template". Link to `weekly-status-email-that-keeps-clients`
   and `client-quiet-mid-project-exact-follow-up`.
5. **"Freelance client tracker: what to track each week"**:
   target "freelance client tracker". Link to `monday-scan-open-proposals-deposits-quiet-clients`
   and `weekly-reset`, then pitch the Digital System's Today dashboard.
