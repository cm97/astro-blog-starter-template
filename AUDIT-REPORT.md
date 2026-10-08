# Buzzyfly Growth Audit

Date: 2026-10-08. Scope: the whole repo (`cm97/astro-blog-starter-template`) as deployed at buzzyfly.com.

**What this report can and cannot see.** It is built from the code, the content, a local run of the site (`wrangler dev`, Chromium at 375px), and general market knowledge. It had no access to production secrets, Cloudflare, Stripe, PayPal, D1 data, R2 files, analytics or search-volume tools. So there are no real traffic, conversion or order numbers here. Every market figure in Phase 2 is an estimate from memory and is labelled that way. Where data is missing, the report says so instead of guessing.

---

## 1. Executive verdict

**Worth selling after fixes. Not worth selling as-is.**

The core idea is sound. The $49 Digital System is checklists and scripts for a solo service provider's client process. Freelancers and coaches do pay for this, and the copy and email content are better than most competitors at this price.

Three things block sales today, and none of them is the copy:

1. **The buy button may open an email client instead of a checkout.** Production PayPal setup can't be confirmed from the repo. The Stripe fallback for the flagship is now fixed.
2. **The site gives away free versions of three of the five products.** The free versions are the weekly reset, the follow-up writer and the onboarding pack.
3. **There is no proof anywhere.** No testimonials, no screenshots of the files, and two listings that contradict each other about what is in the zip.

The single kits and the bundle mostly repackage content that is inside the $49 system. That makes the ladder look like the same product sold four times.

Fix checkout, stop the cannibalisation, and show the actual files. After that, the $49 system is a reasonable product to sell. Do not expect the $15 and $97 tiers to earn much until their contents are clearly distinct.

---

## 2. Top 5 bottlenecks, ranked by estimated impact

### 1. Checkout can turn into a `mailto:` link (highest impact)

Every buy button links to `/buy/<product>` (`src/data/monetization.ts`, `getOrderAction`, `ALL_PRODUCTS[].buyUrl`). When `PAYPAL_CLIENT_ID` or `PAYPAL_SECRET` is missing, `src/pages/buy/[product].ts` redirects to `mailto:coachmanager@gmail.com?subject=Order…`. A visitor clicks "Buy now" and their mail app opens. On a phone with no mail app configured, nothing happens.

The repo never sets those secrets. `.github/workflows/bootstrap.yml` sets only `STRIPE_WEBHOOK_SECRET` and `DOWNLOAD_TOKEN_SECRET`. The GitHub deploy workflow also has no Cloudflare credentials: its `wrangler deploy` fails and is masked by `|| echo`. So whether PayPal works in production cannot be confirmed from code.

Meanwhile a live Stripe Payment Link for the Digital System (`STRIPE_CHECKOUT_URL`) existed with full webhook fulfillment (`src/pages/api/webhook.ts`). No buy button used it.

- **Fixed:** `/buy/buzzyfly-digital-system` now falls back to the Stripe Payment Link when PayPal isn't configured.
- **Fixed:** the admin dashboard now says plainly when PayPal or `DOWNLOAD_TOKEN_SECRET` is missing.
- **Still open:** the other four products fall back to email orders until PayPal is set, or until each gets its own Stripe Payment Link with `metadata.item_id`.

### 2. The site gives away three of the five products for free

| Paid product | Free version on the same site |
|---|---|
| Weekly Reset Checklist, $15 | The newsletter lead magnet ("Send me the 20-minute weekly reset checklist", `BUZZYFLY_CONFIG.newsletterTitle`). The free tool `public/tools/weekly-reset.html`. The full blog post `/blog/weekly-reset/`. Email 1 links straight to it. |
| Follow-Up Email Templates, $19 | `public/tools/follow-up-writer.html` generates the five follow-ups. `/blog/follow-up-email-after-no-response/` publishes "5 templates". Emails 2–3 give away the bump and break-up emails. |
| Client Onboarding Kit, $29 | `public/tools/client-onboarding.html` produces the welcome email, intake questions, kickoff agenda and notes format. That is the kit's exact feature list. |

A visitor who reads one blog post has no reason to pay $15–$29 for the same material. The free content is good, and it should stay as a lead magnet. But it should be clearly a "lite" version of something paid, not the paid thing.

### 3. No proof, and contradictory listings

- **There are zero testimonials or customer quotes** anywhere. Correctly, none were invented.
- **No product preview exists.** There's no screenshot, sample page or file thumbnail. The only "look inside" is a file tree.
- **The two file trees disagree.** `PRODUCT_ZIP_README.md` (folders `01-onboarding/` … `05-retention/`, 14 files) contradicts `src/content/blog/product-contents.md` and the store table (`checklists/`, `templates/`, `scripts/`, 13 files). One of them is wrong. The 30-day guarantee in `src/pages/terms.astro` covers a product "not as listed", so this is a refund risk.
- **The files are Markdown (`.md`).** Nothing on the site says so. Many coaches won't know how to open a `.md` file, and $49 feels like a lot for plain text files. Many competitors ship Notion, Google Docs or Canva versions.

### 4. The sales email sequence can be silently paused

`src/lib/emailSequence.ts` holds every weekly email until a postal address is set (required by CAN-SPAM). The default `BUZZYFLY_CONFIG.mailingAddress` is `""`. The only signal was a `console.log`.

If the address was never set in Admin > Settings, then every subscriber since launch got email 1 and nothing else. That includes the two pitch emails that are designed to sell the $49 system. D1 can't be inspected from here to confirm.

- **Fixed:** the admin dashboard now shows a red "Fix these to stop losing sales" box with a link to Settings.

### 5. Focus is split across unrelated offers

The header and sitemap send buyer traffic to:

- a free kids platformer (`/kids`)
- a $29 K–8 pack sold only by email request (`/kids-course`)
- a 7-app "Apps Pro" bundle (`/apps-pro`)
- a domain-name idea tool (`/domains`)
- a remote-jobs board (`/jobs`)
- a video page styled as a YouTube clone (`/videos`)

None of these serve the stated buyer, a solo freelancer or coach. Each one dilutes the site's topical authority for search and gives a visitor a reason to leave the funnel. The header shows "Apps" next to "Store".

Kids Course order requests (`purchase_requests`) appear only in `/admin/orders`. Nothing emails the owner when one arrives.

### Also worth knowing (lower impact)

- **The bundle overlaps the system.** The $97 Complete Bundle is "Everything in the Digital System" plus the three kits. By the README, the system already includes onboarding, weekly planning and follow-ups. A buyer paying $97 may get little beyond the $49 product. That invites refunds and damages trust. The "$112 if bought separately" strikethrough added in PR #62 was removed for this reason. The sum of the list prices is real, but it implies $112 of distinct value that may not exist.
- **The upsell ladder is circular.** `weekly-reset-checklist → client-onboarding-kit → buzzyfly-digital-system` (`UPSELL_MAP`). Someone who buys the $29 kit is then offered a $49 product that contains the kit, at full price, with no credit for what they paid.
- **"Lifetime access + future updates" has no mechanism behind it.** Download links expire in 3 days (`src/lib/fulfillment.ts`, delivery email copy). The re-download cookie lasts 30 days. No code notifies buyers of updates. Re-delivery is a manual reply-to-email. The Terms ("future updates we choose to add") make this defensible, but it is a manual promise.

---

## 3. Bugs found and fixed in this pass

| Problem | Fix | Files |
|---|---|---|
| Flagship buy button fell back to a `mailto:` when PayPal wasn't configured, though a live Stripe link existed | Fall back to `STRIPE_CHECKOUT_URL` for the Digital System | `src/pages/buy/[product].ts` |
| Silent setup failures (sequence paused, PayPal missing, download secret missing) were only console logs | Red warning box on the admin dashboard | `src/pages/admin/index.astro` |
| `buzzyfly-brand-about.jpg` was an SVG file with a `.jpg` name. It was served as `image/jpeg`, so it rendered broken on blog cards and failed as a social share image | Rendered to a real 1200×630 JPEG (30 KB) | `public/buzzyfly-brand-about.jpg` |
| Blog posts with the brand hero shared an SVG `og:image`, which Facebook, X and LinkedIn reject | Posts now share the JPEG | `src/layouts/BlogPost.astro` |
| Default share image was a stock placeholder (`blog-placeholder-1.jpg`) | Default is now the brand image | `src/components/BaseHead.astro` |
| Horizontal scroll at 375px on 14 pages: `/videos`, all 8 `/videos/*`, `/checklist`, `/request`, `/unsubscribe`, `/agent`, `/thank-you`. Pages overrode `main`'s max-width but kept a fixed 720px width | Global `main { width: min(720px, 100% - 2em) }`. The thank-you CTA can now wrap. `/agent`'s `<pre>` wraps | `src/styles/global.css`, `src/pages/thank-you.astro`, `src/pages/agent.astro` |
| `/app` was a dead mockup. Its "Automations", "Templates", "Settings" etc. were buttons with no handlers, styled with Tailwind classes that never loaded, and pinch-zoom was disabled | 301 to the working free tools at `/tools/` | `src/pages/app.astro` |
| Web manifest pointed at `/app` and at icon files that don't exist (`/icons/icon-*.png`) | `start_url: /tools/`, icon is the existing SVG logo | `public/manifest.webmanifest` |
| `/apps/` said "Free tools", but 7 of its 10 apps are paid Apps Pro | Honest subtitle linking to Apps Pro. Added the missing description, canonical and OG tags | `public/apps/index.html` |
| `/agent` is an internal sales-paste page ("This page is the agent…"). It was in the sitemap, indexable, with two `<h1>`s | `noindex`, single `<h1>`, out of the sitemap | `src/pages/agent.astro`, `src/layouts/BlogPost.astro`, `src/components/BaseHead.astro` |
| Duplicate `<h1>` in two posts (the Markdown `# ` plus the layout title) | Removed the Markdown heading | `src/content/blog/lead-magnet-ideas.md`, `src/content/blog/the-product.md` |
| `/kids` page weighed 1.24 MB. A 1408px image was shown at 640px, and a 1792px background was drawn on a 960px canvas | Resized: 638 KB → 82 KB, 581 KB → 134 KB, 42 KB → 9 KB | `public/kids/*.jpg` |
| Tap targets under 44px: blog category pills, free-tool buttons, inputs and logo link, Apps Pro unlock form, Kids Course order form, video page controls | `min-height: 44px` on each. Focus-visible and reduced-motion rules added to the static tools | `src/pages/blog/index.astro`, `public/tools/*.html`, `src/pages/apps-pro.astro`, `src/pages/kids-course.astro`, `src/pages/videos.astro`, `src/pages/videos/[slug].astro` |
| Bundle strikethrough implied distinct value the contents may not have | Removed (see bottleneck notes) | `src/components/ProductCallout.astro`, `src/components/MoneyPrinterBanner.astro`, `src/data/monetization.ts` |

Verification after the fixes:

- `npm run build` passes clean.
- `tsc --noEmit` passes.
- `wrangler deploy --dry-run` passes.
- A local crawl of 63 pages at 375px found 0 broken internal links and 0 pages with horizontal scroll.
- Stripe checkout, the webhook, D1 writes, R2 delivery and the admin console are unchanged, apart from the added dashboard warnings.

### Buy flow, traced end to end

- **Button → checkout.** Every button calls `getOrderAction(id)` → `/buy/<id>`. That leads to the PayPal Orders API (`src/lib/paypal.ts`). Without PayPal, it falls back to Stripe for the flagship or to a mailto for the rest.
- **PayPal return** (`src/pages/buy/paypal-return.ts`):
  - It refuses to capture if `DOWNLOAD_TOKEN_SECRET` is missing.
  - It captures idempotently and verifies status, currency and amount.
  - It writes to D1 `fulfillments`, issues an HMAC download token, emails once and shows a download button.
  - Solid.
- **Stripe** (`src/pages/api/webhook.ts`):
  - It verifies the signature and reads `metadata.item_id`.
  - Retries are idempotent through D1. It mints a token and emails the link.
  - It does not check the amount paid. That's acceptable for fixed-price Payment Links.
- **Download** (`src/pages/api/download.ts`):
  - It verifies the token, which is bound to one product, and sets an HttpOnly cookie.
  - It streams from R2, falling back to D1 `product_files`.
  - It is rate-limited.
  - Unverifiable from here: whether the five R2 objects (`products/*.zip`) actually exist.
- **After purchase** (`src/worker-entry.ts`, hourly cron):
  - an owner alert email
  - a 2-day follow-up with the `UPSELL_MAP` upsell
  - the weekly subscriber sequence
- **Weak points:** the mailto fallback, the silent sequence pause (now surfaced), and the Kids Course, which has no checkout at all.

---

## 4. SEO findings

**Fixed in this pass**

- `robots.txt` didn't exist. Added: disallows `/admin`, `/api/`, `/buy/`, `/apps/open/` and points to the sitemap.
- The sitemap listed 13 `/admin/*` pages plus redirect and transactional URLs (`/products`, `/success`, `/tools`, `/app`, `/thank-you`, `/unsubscribe`, `/agent`). They are now filtered out. The static tools (`/tools/`, three tool pages, `/apps/`) were missing and are now listed (`astro.config.mjs`).
- The homepage `<title>` was just "Buzzyfly". It now names what the site sells.
- `/blog` reused the site-wide description and had a generic title. It now has its own.
- The share image, duplicate H1s and the `/apps/` meta fixes are listed in section 3.

**Checked and fine**

- Every Astro page has a unique title and description, a canonical and Open Graph tags (`BaseHead.astro`).
- All 29 posts have a unique title, description and category.
- Old post slugs are 301-redirected (`astro.config.mjs`).
- No broken internal links.
- Every `<img>` has an `alt` attribute.

**Open (needs the owner)**

- **Starter-template slugs on real posts.** `/blog/first-post/`, `/blog/second-post/`, `/blog/markdown-style-guide/` ("Templates vs. Systems") and `/blog/using-mdx/` ("How to Use the System") carry no keyword value. Renaming them needs a 301 for each, in the existing `redirects` block.
- **Off-topic pages** (`/domains`, `/jobs`, `/kids`, `/videos`) compete for crawl budget and topical focus. Consider `noindex` on `/jobs` and `/domains`.
- **No structured data.** `Product` and `FAQPage` JSON-LD on `/store`, and `Article` on posts, would make rich results possible. The FAQ content already exists.
- **The share image says "Digital System" on every post.** Post-specific OG images would lift click-through from social shares.

---

## 5. Market research (estimates from general knowledge, not measured)

No keyword tool or live search was used. Treat the demand levels and prices as directional. Check them in Google Search Console, Ahrefs or Etsy search before betting money on them.

### Demand and competition per product

| Product | Search demand (est.) | Competition | What top results charge (est.) | Closest competitors (from memory, unverified) |
|---|---|---|---|---|
| Weekly Reset Checklist, $15 | Medium for "weekly reset checklist", but it's mostly lifestyle and Pinterest traffic, not business | Very high, mostly free | $0–$5 on Etsy. Free printables everywhere | Etsy "weekly reset planner" printables, Pinterest freebies |
| Follow-Up Email Templates, $19 | Medium–high for "follow up email after no response" (informational) | Very high, free | Free (HubSpot, Mailchimp and Indeed blogs). $7–$27 on Gumroad | HubSpot template library, Gumroad "freelance email scripts" packs |
| Client Onboarding Kit, $29 | Medium for "client onboarding checklist/template" | High | $9–$35 on Etsy (Canva and Google Docs kits). $29–$79 on Gumroad | Etsy "client welcome packet" Canva templates, Dubsado/HoneyBook templates (bundled with $20–$80/mo CRMs) |
| Buzzyfly Digital System, $49 | Low for the product itself. Medium for "freelance business system", "client management system for coaches" | Medium | $29–$149 for Notion "freelancer OS" templates | Notion freelancer and creator operating-system templates (e.g. Easlo, Thomas Frank's paid Notion systems), Etsy "coaching business bundle" |
| Complete Business Bundle, $97 | Low | Medium | $67–$197 for "business in a box" bundles | Etsy and Gumroad mega-bundles (often 100+ Canva files) |

**What competitors do better**

- **They show the product.** Mock-up images, a video walkthrough of the Notion page, or a preview PDF.
- **They ship in tools buyers already use:** Notion, Google Docs, Canva. Not `.md` files.
- **They show social proof:** Etsy review counts, Gumroad ratings.
- **They offer a free sample** that is clearly smaller than the paid product.

**What Buzzyfly does better**

- **Sharper, more specific copy.** "Day 3 bump, day 14 break-up" beats generic packs.
- **Real working free tools.**
- **A clean one-time price with a firm guarantee.**
- **A genuine teaching email sequence.**

### Niche map

| Audience | Served now? | By what |
|---|---|---|
| Solo freelancers, coaches, consultants, 20+ (stated target) | Yes. All five core products | Weak spot: the products overlap each other |
| Small-business owners with staff, 30+ | Partly | Apps Pro (hiring scorecard, compliance tracker, invoice maker) |
| Kids 9–14 | Indirectly. The buyer must be a parent or teacher, not the child | Free `/kids` game (entertainment, no sale). $29 K–8 Kids Course sold by email request only. Selling directly to children under 13 raises COPPA and payment issues, so market to parents |
| Young adults 18–25 (roommates, first jobs) | Barely | Free rent splitter, tip splitter, bill tracker. Nothing paid. `/jobs` is unrelated to any product |
| Older adults 55+ (retiring, encore careers, household admin) | Not at all | Nothing |
| E-commerce, Etsy and creator sellers | Not at all | Nothing |

### Proposed new products (zero capital: checklists, templates, Notion, email sequences, mini-tools)

**Kids 9–14, sold to parents and teachers**

1. **Homework Launch Pad, $9.** A printable weekly planner plus a 10-minute Sunday "school reset" routine. It's the weekly reset idea, rebuilt for a 12-year-old.
   - *Problem:* forgotten assignments and the Sunday-night panic.
   - *Buyer:* the parent of a 4th–8th grader.
   - *Why pay:* it saves a nightly argument. Parents already pay $5–$15 for printables.
2. **First Business Kit for Kids, $15.** Pet-sitting, lemonade or yard-work starter: price sheet, flyer template, simple money log, "how to talk to a customer" script.
   - *Problem:* parents want to teach money and initiative.
   - *Buyer:* the parent or homeschool teacher of a 9–14-year-old.
   - *Why pay:* it's on brand (business systems) and makes a strong summer and holiday gift.
3. **Allowance and Chore Money Tracker, $12.** A printable plus a small browser mini-tool, reusing the bill-tracker code.
   - *Buyer:* parents.
   - *Why pay:* it turns chores into a visible system.

**Adults 20+, the core freelancer and coach audience** (fill gaps the current line doesn't cover)

1. **Late Invoice Recovery Kit, $19.** An email sequence for invoices 1, 7, 14 and 30 days late, a late-fee clause and a "pause work" script.
   - *Problem:* unpaid invoices, the most painful cash problem for freelancers.
   - *Why pay:* one recovered invoice covers the price. Say that without promising amounts.
2. **Notion Client Hub, $39.** The Digital System rebuilt as a duplicable Notion workspace: client database, onboarding checklist template, follow-up date view.
   - *Why pay:* it removes the `.md` objection and matches what this audience already buys.
3. **Discovery Call Kit, $25.** A call script, a qualification scorecard and a "send proposal within 24h" template.
   - *Problem:* calls that don't convert.
   - *Why pay:* it comes before onboarding in the client lifecycle, which the current line skips.

**Older adults 55+**

1. **Encore Consultant Launch Kit, $29.** For people turning a career into part-time consulting: a one-page offer, a first-client outreach script, simple pricing math and an invoice template.
   - *Buyer:* new retirees and the semi-retired.
   - *Why pay:* it's the existing system re-angled for a large, under-served, high-trust audience.
2. **Household Paperwork and Bills Organizer, $15.** A printable binder plus the existing bill-tracker app: due dates, account list, a monthly 20-minute "money reset".
   - *Why pay:* it reuses the weekly-reset idea for household admin.
3. **"Where Everything Is" Family Info Organizer, $19.** Accounts, contacts, documents and passwords-location log for a spouse or adult children.
   - *Why pay:* peace of mind.
   - *Copy guardrail:* it must say plainly that it is an organizer, not legal or estate advice.

### Strongest objection and proof, per current product

| Product | Strongest objection | Strongest proof that overcomes it | Trust gap? |
|---|---|---|---|
| Weekly Reset Checklist, $15 | "This is the same thing you give away free." | None. The free lead magnet and free tool are the product | **Yes. Critical.** Retire it as a paid item, or make the paid version clearly more (printable PDF and Notion versions, plus the Wednesday and Friday sheets) |
| Follow-Up Email Templates, $19 | "Free templates are everywhere, including on your own blog." | The free follow-up writer shows quality, plus the 30-day guarantee | **Partial.** Proof of quality exists. Proof of extra value over the free version does not |
| Client Onboarding Kit, $29 | "Will this fit my kind of clients?" | The free onboarding tool lets them try it with their own client's name. That's good proof | **Partial.** Same cannibalisation problem as above |
| Buzzyfly Digital System, $49 | "Is this just a few text files I could write myself?" | Email 4 ("I'll just build my own") and the sample scope script in email 5 show the quality. The guarantee removes risk | **Yes.** No preview images. Contradictory file listings. The `.md` format isn't disclosed. No testimonials |
| Complete Business Bundle, $97 | "What do I get that isn't already in the $49 system?" | None today | **Yes. Critical.** Either add distinct contents (e.g. the Notion version, the Late Invoice Kit) or drop the tier |

---

## 6. Prioritized next actions (by expected revenue impact)

1. **Confirm checkout works in production (owner, 10 minutes).**
   - Open Admin. The new red box shows whether PayPal is configured.
   - Either add `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` as Worker secrets, or create Stripe Payment Links for the other four products. Each needs `metadata.item_id` set to the product id. Then point their buy routes at them, the same way the Digital System now falls back.
   - Then buy one product end to end and confirm the email and download arrive. This is the only action that can unblock every sale.
2. **Set the mailing address in Admin > Settings (owner, 2 minutes),** if the dashboard says the sequence is paused. That restarts the two pitch emails for every subscriber.
3. **Make the product visible.**
   - Verify which file tree is actually in the R2 zip. Make `/blog/product-contents/`, the store table and `PRODUCT_ZIP_README.md` agree with it.
   - Add 3–4 screenshots or a sample-page preview to `/store`.
   - State the file format.
   - Ideally ship a PDF and Google Docs or Notion version alongside the `.md` files.
4. **Fix the ladder.**
   - Make the three single kits distinct from, and smaller than, the free versions. Or retire the $15 checklist and keep the free one as the lead magnet.
   - Give the $97 bundle contents the $49 system doesn't have, or drop it.
   - Offer kit buyers a credit toward the system (e.g. a PayPal or Stripe coupon for the kit price). That turns the circular upsell into an honest upgrade.
5. **Collect real proof.**
   - The 2-day follow-up email (`sendFollowUpEmail`) already asks "did it do what you needed?". Ask buyers there for permission to quote their reply.
   - Put the first real quotes on `/store` and in email 4. Never write invented ones.
6. **Narrow the site to one buyer.**
   - Move "Apps", Kids, Domains, Jobs and Videos out of the main header.
   - `noindex` `/jobs` and `/domains`.
   - Give the Kids Course a real checkout and an owner alert for requests, or pause it.
7. **Build the next product for the core buyer.** The Late Invoice Recovery Kit ($19) or the Notion Client Hub ($39), both above. Each addresses a real gap and reuses existing infrastructure.
8. **SEO follow-ups.**
   - `Product` and `FAQPage` JSON-LD on `/store`.
   - Rename the four starter-template slugs with 301s.
   - Write posts for "late invoice email", "discovery call questions" and "Notion client portal". These are the queries the new products would answer.

### Data that would sharpen this report

- Order counts by product (D1 `fulfillments`).
- Subscriber count and how far subscribers got in the sequence (`subscribers.sequence_step`).
- Traffic by page and source (Cloudflare Web Analytics or the existing `?src=` tracking).
- Refund requests.

With these, every ranking above could be checked against real numbers. Today they are evidence-based judgements from the code.
