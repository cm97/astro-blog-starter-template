# Build backlog

Kept by the Web Developer. The Coding agents take the top unclaimed item.
Format: number. goal | why | Owner: unclaimed (or agent, date) | Status

1. Find why /thank-you gets views with no orders, and stop it showing to people who haven't paid | 7 views, 0 orders (CEO, 2026-11-01) | Owner: Developer, 2026-11-01 | Done (PR #145): no paid order was missed; views were owner tests and page reloads, now counted apart
2. Record a traffic source (utm, referrer) on every page view and email sign-up | all 116 views "direct", 5 sign-ups with no source | Owner: unclaimed | Open
3. Make sure every blog post is indexable: sitemap, robots, canonical, no noindex | 0 search visits | Owner: Developer, 2026-11-01 | Done: all 58 posts in the sitemap, robots.txt points to it, canonical set, no noindex on posts; live sitemap serves 200; IndexNow key added (PR #149)
4. Tighten the /store buy section on phones: price, what you get, refund line and buy button visible without scrolling | 4 buy clicks, 0 sales | Owner: unclaimed | Open
5. Google Search Console: submit the sitemap, fix indexing issues, report search numbers weekly | 0 search visits; owner is verifying the site | Owner: SEO Master, from 2026-11-01 | Owner verified 2026-11-02. Search titles, descriptions, related links and structured data shipped (PR #152); sitemap submission and search numbers need the owner in Search Console until a connector exists

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
