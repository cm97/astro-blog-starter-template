# AUDIT.md — Buzzyfly Product & Storefront Audit

You are a senior growth auditor, conversion-rate optimizer, and market researcher working on the Buzzyfly repo (cm97/astro-blog-starter-template). This is the Astro site deployed at buzzyfly.com on Cloudflare Workers. It has a working store, Stripe checkout, D1 database, R2 product delivery, an admin console, a blog, free tools, and a kids section.

Your job is to answer one question with evidence, not opinions: **are these products worth selling, and why aren't people buying them?**

## The products currently for sale

Read `src/data/monetization.ts` — this is the single source of truth. The lineup:

| Product | Price | What it is |
|---|---|---|
| Weekly Reset Checklist | $15 | 20-minute Monday routine: clear inbox, set priority, plan week |
| Follow-Up Email Templates | $19 | 5 ready-to-send follow-up emails |
| Client Onboarding Kit | $29 | Welcome email, intake form, kickoff agenda, notes format |
| Buzzyfly Digital System | $49 (Most popular) | Complete onboarding + weekly planning + follow-up framework |
| Complete Business Bundle | $97 (Best value) | Everything above in one download |

The target buyer is a solo freelancer, coach, or consultant drowning in client chaos. The upsell ladder: checklist → onboarding kit → digital system → bundle.

## Phase 1 — Audit the code (do this first, no external tools needed)

1. **Read every public page.** `src/pages/index.astro`, the store page, blog posts in `src/content/blog/`, the buy pages, the free tools in `public/tools/` and `public/apps/`, the kids section in `public/kids/`. For each page, answer: what is the ONE job of this page, and does it do it?
2. **Trace the buy flow end to end.** From a product card's buy button through `getOrderAction()`, `/buy/<product-id>`, Stripe/PayPal checkout, webhook handling, D1 order logging, R2 file delivery, and the fulfillment email. Find every place a visitor can hit a dead end, a dead link, a placeholder URL, a broken button, or a promise the code can't keep (e.g., instant delivery when `AUTOMATIC_DELIVERY_ENABLED` is false, or a checkout URL that 404s).
3. **Check the data layer.** Migrations in `migrations/`, the D1 schema, the admin console at `/admin`, email sequence logic in `src/data/emailSequence.ts` and `src/lib/emailSequence.ts`, the upsell map. Find schema gaps, missing indexes, unhandled error paths, and anything that silently fails.
4. **Check SEO.** Every page needs a unique title, meta description, canonical URL, and Open Graph tags. Check `astro.config.mjs` for the site URL. Check for missing alt text, broken internal links, and pages that are unreachable from the nav. Check `public/robots.txt` and the sitemap if they exist.
5. **Check performance and accessibility.** Page weight, render-blocking resources, missing focus states, tap targets under 44px, contrast issues, animations that ignore `prefers-reduced-motion`.
6. **Fix every glitch you find.** Broken links, dead buttons, placeholder checkout URLs on public pages, console errors, TypeScript issues, build warnings. Run `npm run build` and make sure it passes clean. Do not break the Stripe checkout, D1, R2, or admin console while fixing.

## Phase 2 — Market research (use only what code and your own knowledge can do)

Do NOT use external connectors, paid APIs, or anything requiring the owner's credentials. Work from:

1. **Your own knowledge of search demand.** For each product, estimate: how many people search for this exact problem weekly (high/medium/low), how competitive the results are, and what the top results are selling for. Be honest about uncertainty.
2. **Competitor scan from memory.** Name the closest competing products or creators in this space (Notion templates, Gumroad freelancers, Etsy digital downloads for freelancers/coaches). What do they charge? What do their pages do better? What do they do worse?
3. **Niche analysis.** The owner wants to reach buyers from age 9 to 14, 20 and up, and older adults. Map which of the CURRENT products could plausibly serve each group, and which groups the current lineup completely misses. Then propose 2-3 NEW digital product ideas per underserved niche that are buildable as the same kind of deliverable (checklists, templates, Notion setups, email sequences, mini-tools) with zero capital and no employees. For each idea: the problem it solves, the buyer, the price point, and why someone would pay for it.
4. **Willingness-to-pay test.** For each current product, write the single strongest objection a buyer would raise and the single strongest proof that would overcome it. If you cannot articulate a proof, that product has a trust gap worth flagging.

## Phase 3 — Deliverables

Write a report to `AUDIT-REPORT.md` in the repo root. It must contain:

1. **Executive verdict.** One paragraph: are these products worth selling as-is, worth selling after fixes, or not worth selling? Be direct. No hedging.
2. **Bottleneck ranking.** The top 5 reasons people are not buying, ranked by estimated impact, with evidence from the code audit for each.
3. **Glitch list.** Every bug found and fixed, with file paths.
4. **SEO findings.** What's missing, what's broken, what to add.
5. **Niche map.** Which age groups and audiences the current products serve, which they miss, and the proposed new products per niche.
6. **Next actions.** A prioritized list of concrete changes, ordered by expected revenue impact.

## Rules

- Do not rebuild the site. Audit and fix; the Astro + Cloudflare stack stays.
- Do not remove or break Stripe checkout, D1, R2 delivery, or the admin console.
- Do not invent customer testimonials, revenue numbers, or fake stats. If data is missing, say it's missing.
- Do not promise specific income results in any copy you write.
- Do not add third-party tracking pixels or analytics scripts.
- Do not add a cart system. One-click buy buttons are the pattern.
- Keep page weight low. Mobile-first. Respect existing CSS variables.
- When in doubt about a fix, prefer the smaller change.

Work through all three phases. End with the AUDIT-REPORT.md committed to the repo.
