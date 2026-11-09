# GROWTH-REPORT.md

Date: 2026-11-09

## Phase 1 — Audit findings

Public pages checked: homepage, /store, /blog, robots.txt, sitemap-index.xml, sitemap-0.xml, sample blog posts, buy pages via monetization.ts.

**What is solid**
- Unique title and meta description on homepage and /store via BaseHead.astro.
- Canonicals present.
- Open Graph and Twitter cards set (default OG image 1200x630).
- robots.txt exists and correctly points to sitemap-index.xml. Disallows /admin, /app/, /api/, thank-you, success, unsubscribe.
- Sitemap-index and sitemap-0 include homepage, store, blog index, and all current blog posts plus key pages (tools, videos, privacy, etc.).
- Internal product links and EmailOptin present on key pages.
- ProductCallout used on posts that set featuredProduct* fields.
- Structured data on homepage (Organization + WebSite) and store (Product).

**Flags**
- No dedicated alt text issues spotted on main product images (default OG used where needed).
- Thin or origin-story posts remain (first-post.md was under 400 words; expanded in this PR). free-checklist-lead-magnet.md, the-product.md, and a few early posts are still short.
- Some older posts use long titles without seoTitle (schema now enforces <=60 or seoTitle).
- Free tools (/tools, /overdue-invoice-email, /scope-creep-reply, /checklist) exist and are linked; confirm each ends with a clear path to the $49 or $19 product.
- Kids section (/kids-course) is in sitemap; low commercial relevance for current products.
- No tracking pixels or paid ad scripts added (per rules).
- Duplicated phrasing across many "exact reply" posts is intentional for long-tail but creates thin differentiation risk.

No broken robots or missing sitemap. Canonicals and OG look consistent.

## Phase 2 — Content gaps

Products in monetization.ts:
- Weekly Reset App $15
- Follow-Ups App $19
- Onboarding App $29
- Buzzyfly Digital System $49

Buyer search phrases from existing strategy and live demand:
- "client onboarding checklist freelancer" — covered by client-onboarding-checklist-template.md, onboarding-checklist-20-minute-solo-coach.md, onboarding-checklist-20-minutes.md.
- "follow-up email templates for coaches" — related posts exist (follow-up-email-after-no-response.md, many exact-reply posts, coaching-business-systems-for-coaches.md) but no dedicated post with that exact phrase in title/description.
- "weekly planning template solo business" — covered by weekly-planning-template-small-business.md and weekly-reset posts.

Highest-demand gap chosen: **follow-up email templates for coaches**. Search results show active demand for coach-specific email templates (session follow-ups, proposal silence, renewals). Existing posts are strong on freelancers and general solo operators; a coach-focused set of five paste-ready templates fills the gap without duplicating the 40+ existing exact-reply posts.

## Phase 3 — What was written

New post: `src/content/blog/follow-up-email-templates-for-coaches.md`
- Title and seoTitle target the phrase.
- ~900 words, paste-ready templates, Monday scan, ends with ProductCallout-style links to the $19 Follow-Ups App and $49 Digital System.
- Frontmatter matches existing schema (featuredProductTitle/Price/Description).

Improved: `src/content/blog/first-post.md`
- Added seoTitle, updatedDate, practical bullets, internal links to the three main checklist posts, and explicit buy link. Still short but no longer pure origin story.

Sitemap and robots.txt: no change needed. New post will be included automatically on next build via Astro content collection.

## Phase 4 — Prioritized next publishes

1. **Expand free-checklist-lead-magnet.md** (currently ~1.8kB) into a full 800-word post that ends on the free opt-in + $15 Weekly Reset App. High top-of-funnel value.
2. **Client onboarding checklist freelancer** — write a dedicated post if search console later shows the exact phrase under-performing, or expand client-onboarding-checklist-template.md with a freelancer-specific section and stronger internal links.
3. **Weekly reset for freelancers with 3+ clients** — already have 12-minute and 20-minute posts; consider one more that explicitly names the $15 app.
4. Add 2–3 internal links from high-traffic exact-reply posts to the new coaches follow-up post.
5. Confirm free tools pages each end with a single primary CTA to the matching paid product.

No income promises, no testimonials, no fake stats. Astro stack unchanged. Mobile-first, low page weight preserved.
