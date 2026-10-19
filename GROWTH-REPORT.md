# GROWTH-REPORT.md — Buzzyfly SEO and Content Audit

Date: 2026-10-19

## Phase 1 — Audit findings

### Title tags and meta descriptions
- Homepage, store, and most blog posts have unique titles and descriptions that match buyer language (onboarding checklists, follow-up emails, weekly planning).
- Blog posts use frontmatter title + description. These render correctly via BaseHead.
- No major duplicates spotted on public marketing pages. Admin routes appear in the sitemap (see below) but are not linked from public nav.

### Canonicals and Open Graph
- Site URL is set to https://buzzyfly.com in astro.config.mjs. Canonicals and OG tags are handled by BaseHead on public pages.
- Blog posts inherit the same.

### Alt text
- Hero images on blog posts use a brand SVG when placeholder images are detected. Alt is empty on the hero img in BlogPost.astro (acceptable for decorative, but could be improved with post title).
- Product and store pages use text-heavy layouts. No critical missing alts on money pages.

### Internal links
- Blog posts link to related posts and the store. ProductCallout appears automatically at the end of every post.
- Store is linked from homepage and most callouts.

### robots.txt and sitemap
- Live robots.txt returns a non-standard "content signals" block with no User-agent, Allow, or Sitemap lines. This does not block crawling but also does not guide it.
- /sitemap.xml returns 404. Astro generates sitemap-index.xml + sitemap-0.xml, both of which are live and contain the full public URL set (including admin paths that should ideally be excluded).
- Recommendation: ship a standard public/robots.txt that points to the existing sitemap-index.xml and disallows /admin/. (Done in this PR.)

### Other notes
- No tracking pixels or paid ad scripts present.
- Pages are mobile-first, low weight, Astro stack intact.
- Some older blog posts (first-post.md, lead-magnet-ideas.md) are short and could be expanded later, but are not the highest-priority gaps.

## Phase 2 — Content gaps

Products in monetization.ts:
- Weekly Reset Checklist ($15)
- Follow-Up Email Templates ($19)
- Client Onboarding Kit ($29)
- Buzzyfly Digital System ($49)
- Complete Business Bundle ($97)
- Buzzyfly Monthly Drop ($19/month)

Buyer search phrases checked against existing posts:
- "client onboarding checklist freelancer" / coach — covered by client-onboarding-checklist-template.md and related onboarding posts.
- "weekly planning template solo business" — covered by weekly-planning-template-small-business.md and weekly-reset.md.
- "follow-up email templates for coaches" — existing posts cover general proposal follow-ups and no-response sequences, but nothing targets the coach-specific post-session, discovery-call, and quiet-lead sequence that buyers search for.

Highest-demand gap chosen: follow-up email templates for coaches (session recaps + discovery + quiet leads).

## Phase 3 — New post

File: src/content/blog/follow-up-email-templates-for-coaches.md

- Title and meta target the exact phrase "follow-up email templates for coaches".
- ~950 words. Paste-ready templates for post-session recap, 48-hour check-in, discovery follow-up, quiet lead, and proposal break-up.
- Frontmatter sets featuredProductTitle to "Follow-Up Email Templates" so the automatic ProductCallout at the end of the post points to the $19 pack.
- No fake stats, no income promises, no testimonials.
- Follows existing frontmatter format.

No thin existing posts were rewritten in this change set (smaller changes preferred). The new post is the priority.

## Phase 4 — What to publish next (prioritized)

1. Post-session and between-session check-in templates for coaches (already shipped in this PR).
2. "Client onboarding checklist for coaches" — slight angle shift from the existing freelancer-focused checklist if search volume warrants a dedicated coach version.
3. Discovery call script + follow-up pair (links cleanly to both the $19 follow-up pack and the $29 onboarding kit).
4. Expand the short first-post.md or lead-magnet-ideas.md only if traffic data shows they rank or get impressions.
5. Add lastmod dates or exclude /admin/ from the sitemap config if the adapter supports it, so the index stays clean.

All changes stay inside the existing Astro + Cloudflare stack. No new tracking. No paid scripts.
