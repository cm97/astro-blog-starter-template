# SEO-REPORT — Making buzzyfly.com findable by buyers

Date: 2026-10-08 · Branch: `ccr-fa2d33c5-7wojii`

**Short version.**
- **Fixed in code:** the site had no robots.txt, and every share on social media showed the Astro starter-template image ("Build the web you want"). The sitemap listed 13 admin pages and the order-confirmation pages. The homepage title was the single word "Buzzyfly". Three posts described the contents of the $49 zip in three different ways. All of that is fixed.
- **New posts:** three, aimed at onboarding and follow-up searches that had no dedicated page. One goes live on merge. Two are unlisted drafts for weeks 2 and 3.
- **Not done here:** getting pages indexed, building backlinks, and checking real search volume. These need your accounts. See §5.

> **Method and limits.** I read every page by running the built site locally and crawling it. That covered titles, descriptions, canonicals, Open Graph tags, H1s, image alt text, internal links, robots.txt and the sitemap.
>
> The search phrases in §2 are judgment, not measured volume. I did not use a keyword tool or Search Console. Check them in Google Search Console after a few weeks of data, and re-rank §4 by real impressions.

---

## 1. Audit findings

### 1.1 Site-wide (all fixed)

| # | Problem | Impact | Fix | File |
|---|---|---|---|---|
| 1 | **No robots.txt** (404). | Crawlers get no sitemap pointer. Admin and API paths are not marked off-limits. | Added. Allows everything except `/admin`, `/api/`, `/buy/` and `/apps/open/`. Points to the sitemap. | `public/robots.txt` |
| 2 | **Default share image was the Astro starter's "Build the web you want".** | Every shared link that didn't pass an image (home, store, blog index, checklist and most others) showed someone else's brand. | Rendered the Buzzyfly brand card to a real 1200×630 JPG (28 KB) and made it the default. | `public/og-default.jpg`, `BaseHead.astro` |
| 3 | **Blog share image was an SVG.** `buzzyfly-brand-about.jpg` is actually an SVG file. | Facebook, LinkedIn, X and Slack don't render SVG, so posts shared with no image. | Posts now share a raster image: the post's own photo if it has one, otherwise the brand JPG. | `BlogPost.astro` |
| 4 | **Sitemap had 63 URLs, including 13 `/admin/*` pages**, plus `/success`, `/thank-you`, `/unsubscribe`, `/products` (a redirect) and `/app` (a PWA shell). | Wasted crawl budget. It also invites Google to index the admin login and order confirmations. | Sitemap filter in `astro.config.mjs`. It now has 47 URLs: content pages plus the three free tools, which weren't listed before. | `astro.config.mjs` |
| 5 | **Free tools named the wrong canonical.** `/tools/*.html` declared the `.html` URL as canonical, but that URL 307-redirects to the extensionless one. | Google is told the "real" page is a redirect. | Canonical and `og:url` are now the extensionless URLs. Internal links point there directly. | `public/tools/*.html` |
| 6 | **Homepage title was "Buzzyfly"** (8 characters, no keywords). | The most-linked page told Google nothing about what it sells. | "Client Onboarding, Follow-Up & Weekly Planning Templates \| Buzzyfly". Also added `Organization` + `WebSite` JSON-LD. | `src/pages/index.astro` |
| 7 | Store title was "Store — Buzzyfly". Blog index title was "Blog \| Buzzyfly", with the generic site description. | Two high-intent pages with no keywords in their titles. | Product names are now in the store title. The blog index has its own title and description. | `store.astro`, `blog/index.astro` |
| 8 | `og:type` was `website` on every page. `og:url` used the raw request URL, so query strings and tracking tags leaked into shares. No structured data anywhere. | Weaker rich results. Shared links could point at tagged URLs. | Posts are `article` with `article:published_time`. `og:url` is the canonical URL. Every post has `BlogPosting` JSON-LD. | `BaseHead.astro`, `BlogPost.astro` |
| 9 | `/thank-you` had no noindex. `/app` had no meta tags and no noindex. | Thin pages competing in the index. | `noindex`. | `thank-you.astro`, `app.astro` |
| 10 | Footer links to `/kids`, `/kids-course` and `/tools/index.html` each took a redirect hop. | Small crawl and speed cost on every page. | They now link to the final URLs. | `Footer.astro`, `kids-course.astro`, `tools.astro` |

**Checked and fine:**
- Every page has exactly one canonical, which matches its own URL.
- No image is missing an `alt` attribute. The blog hero image is decorative, with `alt=""`.
- The re-crawl found **0 broken internal links across 62 unique links**.
- Nothing scrolls sideways at 375px with real mobile emulation (home, store, five posts).

### 1.2 Blog posts

| Problem | Posts | Fix |
|---|---|---|
| **Starter-template URLs.** The slug had nothing to do with the topic. | `/blog/first-post`, `/blog/second-post`, `/blog/markdown-style-guide` ("Templates vs. Systems"), `/blog/using-mdx` | Renamed to `why-i-built-the-buzzyfly-digital-system`, `signs-your-business-is-running-you`, `templates-vs-systems` and `how-to-use-the-buzzyfly-digital-system`, each with a 301 from the old URL. |
| **Three contradictory file lists for the $49 zip.** `the-product` used folders `01-onboarding/`…`05-retention/`. `product-contents` (linked from the store) used `checklists/`, `templates/`, `scripts/`. `using-mdx` used a third layout. A buyer can't trust all three. | `the-product`, `product-contents`, `using-mdx` | Rewrote `product-contents` from `PRODUCT_ZIP_README.md`, the only file list documented in the repo. Merged `the-product` into it with a 301, and fixed the list in the how-to post. **Owner: confirm this matches the zip actually in R2.** |
| **Thin duplicates.** `the-product` had 181 words and two H1s. `lead-magnet-ideas` had 111 words and two H1s. | — | Merged with 301s into `product-contents` and `free-checklist-lead-magnet`. |
| **An unsupported product claim.** `free-checklist-lead-magnet` said "the full sequence — all four emails… — is in the Buzzyfly Digital System". Nothing in the product file list backs that up. It also had profanity. | `free-checklist-lead-magnet` | Removed the claim and the profanity, and folded in the useful list from `lead-magnet-ideas`. |
| **Wrong product in the callout.** The best-matched post for the $19 Follow-Up Email Templates promoted the $49 system. `follow-up-email-after-no-response` lists the same five emails the $19 pack contains. | `follow-up-email-after-no-response`, `proposal-follow-up-cadence-freelancers` | The callout is now Follow-Up Email Templates. |
| **Titles over about 65 characters** (cut off in results), and **descriptions over 165 or under 70 characters**. | 12 posts | Rewrote the titles and descriptions. Every rewrite keeps the target phrase near the start. |
| **Long posts with no links between them.** The new topics only existed as sections inside longer posts. | onboarding checklist, intake form, follow-up | Added links from those sections to the new standalone posts, and back. |

### 1.3 Flagged, not changed

- **`/agent` has two H1s.** `/apps/` has no meta description or canonical (static file in `public/apps/`). `/apps-pro/` has a 177-character description. `/domains`, `/jobs` and `/videos` have descriptions under 70 characters. These are low priority. None of them targets the core buyer.
- **Kids pages (`/kids`, `/kids-course`) are a different audience.** They are a children's game and a K–8 course on a B2B templates site. They don't hurt directly, but they spread the site's topic. Consider moving them to a subdomain or a separate site if they grow.
- **Off-target posts.** `free-checklist-lead-magnet` and `why-i-built-the-buzzyfly-digital-system` are written for marketers, or about the creator, not for the buyer. They are fine to keep, but don't spend promotion on them.
- **Overlapping follow-up posts.** Four posts compete for "proposal follow-up email": `follow-up-email-after-no-response`, `proposal-follow-up-cadence-freelancers`, `your-pipeline-dies-when-you-stop-following-up` and `templates-people-ask-for-after-a-client-ghosts`. Once Search Console shows which one Google prefers, merge `your-pipeline-dies…` into `proposal-follow-up-cadence-freelancers` with a 301.
- **Thin posts worth expanding:** `pricing-your-time-without-guessing` (314 words), `client-discovery-questions` (390 words), `templates-vs-systems` (177 words), `delivery-is-eating-your-business-alive` (461 words).
- **The sticky bar on every post says "$49 — See the system"**, even when the post's callout is the $29 kit or the $19 pack. This is a conversion question more than an SEO one. Consider matching the bar to the callout product.

## 2. Content gaps by product

✅ means a dedicated post exists. ◐ means it's only a section inside another post. ❌ means nothing exists.

### Client Onboarding Kit ($29)
| Buyer search phrase | Existing post | Status |
|---|---|---|
| client onboarding checklist (freelancer / coach) | `client-onboarding-checklist-template` | ✅ |
| client intake form template | `client-intake-form-template` | ✅ |
| **client welcome email template / new client welcome email** | section in the onboarding checklist | ◐ → **new post** |
| **client kickoff meeting agenda template** | section in the onboarding checklist | ◐ → **new post** |
| client onboarding process for freelancers | onboarding checklist (aimed at coaches) | ◐ (description now names freelancers) |

### Follow-Up Email Templates ($19)
| Buyer search phrase | Existing post | Status |
|---|---|---|
| follow up email after no response | `follow-up-email-after-no-response` | ✅ |
| proposal follow up email | 3–4 posts | ✅ (overlap, see §1.3) |
| **how to ask clients for referrals (email template)** | section in the follow-up post | ◐ → **new post** |
| follow up email after a discovery call / consultation | — | ❌ next to write |
| check-in email to a client mid-project | section only | ◐ |
| breakup email template (final follow-up) | section only | ◐ |

### Weekly Reset Checklist ($15)
| Buyer search phrase | Existing post | Status |
|---|---|---|
| weekly planning template for small business | `weekly-planning-template-small-business` | ✅ |
| weekly reset checklist | `weekly-reset` | ✅ |
| monday planning routine | `monday-reset-when-you-are-already-behind` | ✅ |
| time blocking for solo business / freelancers | `time-blocking-for-solo-operators` | ✅ |
| inbox clearing routine for small business owners (matches "Inbox-clearing routine" in the checklist) | — | ❌ |
| weekly review / Friday review template (in the $49 system, not the $15 checklist) | — | ❌ |

### Buzzyfly Digital System ($49) and Complete Bundle ($97)
| Buyer search phrase | Existing post | Status |
|---|---|---|
| how to systematize your business | `how-to-systematize-your-business` | ✅ |
| business systems for coaches | `coaching-business-systems-for-coaches` | ✅ |
| scope creep email / how to say no to extra work | `scope-creep-script` | ✅ |
| freelance proposal template | `proposal-that-closes` | ✅ |
| client retention checklist | `retention-checklist` | ✅ |
| freelance pricing worksheet | `pricing-your-time-without-guessing` | ✅ (thin) |
| freelancer / small business template bundle | — | Target with the store page, not a post |

## 3. New posts

All three follow the copy rules: no stats, no testimonials, no income claims, short sentences. Each ends with the matching product callout through `featuredProductTitle`, and the BlogPost layout renders `ProductCallout` from it. Each links to two or three related posts, and those posts link back.

| Post | Target phrase | Callout | Words | State |
|---|---|---|---|---|
| `/blog/client-welcome-email-template/` | client welcome email template | Client Onboarding Kit ($29) | ~1,200 | **Live on merge** |
| `/blog/client-kickoff-call-agenda/` | client kickoff meeting agenda | Client Onboarding Kit ($29) | ~1,050 | `draft: true` |
| `/blog/referral-request-email-template/` | how to ask clients for referrals | Follow-Up Email Templates ($19) | ~930 | `draft: true` |

**How drafts work.** This is a new `draft` frontmatter field in `src/content.config.ts`.
- **While `draft: true` is set:** the post still renders at its URL, so links to it from live posts never break. But it is `noindex`, and it's left out of the blog list, RSS, site search, the sitemap and prev/next/related links. Admin > Posts marks it "(draft: unlisted, not indexed)".
- **To publish:** delete the `draft: true` line. Also change `pubDate` to the day you publish, so the post shows the real date. Then deploy.

## 4. Publishing order

The order is by buyer intent and product match. Re-rank with real Search Console data after about six weeks.

1. **Week 1: client welcome email template.** Already live on merge. It has the highest intent of the three: someone who just signed a client. It sells the $29 kit directly.
2. **Week 2: client kickoff call agenda.** Remove `draft: true` and update `pubDate`. It completes the onboarding cluster with the welcome email and the checklist.
3. **Week 3: how to ask clients for referrals.** Remove `draft: true` and update `pubDate`. It's the first post that sells the $19 pack directly.
4. **Week 4: write the follow-up email after a discovery call.** It's the largest gap with no coverage at all, and it fits the $19 pack.
5. **Week 5: expand `pricing-your-time-without-guessing` and `client-discovery-questions`** to 1,000+ words each. They target real searches but are thin.
6. **Week 6: write the inbox-clearing routine post**, for the $15 checklist. Then merge the overlapping follow-up posts (§1.3).

## 5. What only you can do

1. **Make sure deploys actually happen.** The GitHub deploy workflow has no `CLOUDFLARE_API_TOKEN` and skips the deploy silently (see the last session's notes). None of these fixes reach buzzyfly.com until a deploy runs. Check Workers & Pages → `buzzyfly` → Deployments after merging.
2. **Google Search Console.** Verify buzzyfly.com, which takes a DNS TXT record in Cloudflare. Submit `https://buzzyfly.com/sitemap-index.xml`. After each weekly publish, use URL Inspection → Request indexing on the new post.
3. **Bing Webmaster Tools.** The verification meta tag is already on every page. Submit the same sitemap there.
4. **Confirm the zip contents.** `/blog/product-contents/` now lists the files from `PRODUCT_ZIP_README.md`. Open the real zip in R2 and make sure the list matches. If it doesn't, update the post. A wrong file list is a refund risk.
5. **Test a share preview.** Paste the homepage and one post into LinkedIn's Post Inspector or the Facebook Sharing Debugger after deploying. Both should show the Buzzyfly card, not the Astro image. They may need a re-scrape to drop the cached old image.
6. **Get a few real links.** Forums, groups and newsletters for coaches and freelancers are where these posts get read. Indexing alone won't make them rank.
7. **Re-rank this plan with data.** After about six weeks, Search Console → Performance shows the queries you actually get impressions for. Write the next posts for those.

## 6. Files changed

- **New:** `public/robots.txt`, `public/og-default.jpg`, `SEO-REPORT.md`, and three posts in `src/content/blog/`.
- **SEO plumbing:** `astro.config.mjs` (sitemap filter, tools in sitemap, 6 new 301s), `src/components/BaseHead.astro`, `src/layouts/BlogPost.astro`, `src/content.config.ts` (`draft`), `src/pages/blog/[...slug].astro`, `src/pages/blog/index.astro`, `src/pages/rss.xml.js`, `src/pages/search.json.js`, `src/pages/admin/posts/index.astro`.
- **Page meta:** `src/pages/index.astro`, `src/pages/store.astro`, `src/pages/thank-you.astro`, `src/pages/app.astro`, `src/pages/tools.astro`, `src/pages/kids-course.astro`, `src/components/Footer.astro`, `public/tools/*.html`.
- **Posts:** 4 renamed, 2 merged and deleted, 14 edited (titles, descriptions, callouts, links, the corrected file list).

**Verified:**
- `npm run build` and `tsc --noEmit` pass.
- The local crawl found 0 broken internal links.
- Old URLs return 301 to the new ones.
- The sitemap has no admin, confirmation or draft URLs.
- Nothing scrolls sideways at 375px.
