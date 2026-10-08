# FUNNEL.md — Make the Buzzyfly Funnel Visible and Find Buyers

You are a senior growth engineer and funnel optimizer working on the Buzzyfly repo (cm97/astro-blog-starter-template), the Astro site at buzzyfly.com on Cloudflare Workers. The site already has a working store, Stripe checkout, D1 database, R2 product delivery, an admin console, a blog, free tools, and an email opt-in. The AUDIT.md prompt (if already run) may have produced AUDIT-REPORT.md — read it first and treat its findings as your starting point.

Your job: make this funnel visible to the internet and make it find buyers on its own. A funnel that nobody can find sells nothing. A funnel that buyers can find converts.

## Phase 1 — Diagnose the funnel as it exists

1. **Map the full funnel.** Trace every path a stranger can take from landing on any page to handing over money: homepage → store → buy page → Stripe/PayPal checkout → fulfillment email → upsell. Also map the free paths: free tools in public/tools and public/apps, the kids section, the blog, the email opt-in. For each path, state where a visitor can drop off and why.
2. **Check the email opt-in.** Read EmailOptin.astro and the email sequence logic (src/data/emailSequence.ts, src/lib/emailSequence.ts). Is the opt-in visible above the fold on the homepage? Does it work? Does the sequence actually send? Is there a double opt-in? Is the first email delivering the promised free checklist?
3. **Check the upsell flow.** Read UPSELL_MAP in monetization.ts and fulfillment.ts. After a purchase, does the buyer get an email pitching the next product? Is that email actually wired up and sending, or is it dead code?
4. **Check analytics.** Is there any way to see visitors, page views, or conversions? If not, flag it — you cannot optimize what you cannot measure. Do NOT add third-party tracking pixels. If Cloudflare Web Analytics or similar is already configured in wrangler.json, note it.

## Phase 2 — Fix the funnel internals

1. Make the email opt-in impossible to miss on the homepage — above the fold, clear benefit, single field, one button. If it's buried below the fold or missing, add it.
2. Make sure the first email in the sequence delivers the free checklist immediately and sets up the pitch for the $15 Weekly Reset Checklist within 2-3 emails.
3. Wire the upsell emails so every purchase triggers the next logical product pitch (checklist → onboarding kit → digital system → bundle).
4. Fix any dead links, broken buy buttons, or placeholder checkout URLs on public pages.
5. Run npm run build and make sure it passes clean.

## Phase 3 — Make the funnel findable (SEO and content)

1. **SEO pass on every public page.** Unique title tags, meta descriptions, canonical URLs, Open Graph tags. Target the exact phrases buyers search: "client onboarding checklist freelancer", "follow-up email templates for coaches", "weekly planning template solo business", and similar. Read the blog posts in src/content/blog/ and make sure each one targets one of these problems with a product callout at the end.
2. **Publish or improve the sitemap and robots.txt** if they exist or are missing.
3. **Add internal links** between blog posts, free tools, and the store so every page feeds the funnel.
4. **Check that the free tools are genuinely useful** and end with a soft pitch to the paid products — free tools are the top of the funnel.

## Phase 4 — Deliverables

Write a report to FUNNEL-REPORT.md in the repo root containing:

1. **Funnel map.** Every path from stranger to buyer, with drop-off points.
2. **What's broken.** Dead links, missing opt-in, unwired upsells, SEO gaps — with file paths.
3. **What you fixed.** Every change made, with file paths.
4. **Visibility plan.** The specific SEO targets and content changes that will make buyers find this site.
5. **Measurement.** What you can and cannot currently measure, and what to add (without third-party pixels).
6. **Next actions.** Prioritized list ordered by expected impact on finding buyers.

## Rules

- Do not rebuild the site. The Astro + Cloudflare stack stays.
- Do not remove or break Stripe checkout, D1, R2 delivery, or the admin console.
- Do not invent testimonials, revenue numbers, or fake stats.
- Do not promise specific income results in any copy.
- Do not add third-party tracking pixels or analytics scripts.
- Do not add a cart system. One-click buy buttons are the pattern.
- Keep page weight low. Mobile-first. Respect existing CSS variables.
- Prefer smaller changes when in doubt.

Work through all four phases. End with FUNNEL-REPORT.md committed to the repo.
