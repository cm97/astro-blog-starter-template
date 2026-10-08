# Buzzyfly Funnel Report

Date: 2026-10-08. Builds on `AUDIT-REPORT.md`, which covers checkout, product overlap, proof and the market. Read that first. This report covers how strangers find the site, how they move through it, and what can be measured.

**What this report can and cannot see.** It is built from the code and a local run of the Worker (`wrangler dev`, Chromium at 375×667, 390×844 and 1280×800). Emails were rendered by running the real sequence and upsell code through a fake mail binding. It had no access to production secrets, D1 data, Search Console or traffic. No visitor, signup or order numbers appear here because none were available.

---

## 1. Funnel map: every path from stranger to buyer

### Paid paths

```
Search / social / direct
      │
      ├─► Homepage ─────────┐
      ├─► Blog post ────────┤  (product callout at the end of every post)
      ├─► Free tool ────────┤  (pitch for its matching product at the end)
      └─► /store ───────────┤
                            ▼
                     /buy/<product>   ← logs a buy click (new)
                            │
     ┌──────────────────────┼──────────────────────────┐
     ▼                      ▼                          ▼
 PayPal configured     PayPal missing,             PayPal missing,
 → PayPal checkout     Digital System              any other product
 → /buy/paypal-return  → Stripe Payment Link        → mailto: order email
   (capture, D1,         → /api/webhook               (manual)
   download page,          (D1, email)
   email)
     │                      │
     └──────────┬───────────┘
                ▼
     Delivery email with download link + upsell for the next product
                ▼
     Day 2: follow-up email (hourly cron) + the same upsell
                ▼
     Next product → /buy/<next> … up the ladder
```

| Step | Where visitors drop off | Why |
|---|---|---|
| Landing | Most visitors leave after one page | No proof yet: no testimonials and no product previews (AUDIT-REPORT §2.3). Most posts end on the $49 system even when the reader came for one small problem |
| Homepage → buy | Cold visitors rarely buy at $49 on the first visit | Expected. The opt-in now catches them (see Fixes) |
| `/buy/<product>` → checkout | **Possibly every buyer of the 4 non-flagship products** | Without PayPal secrets, the route opens the visitor's mail app (`src/pages/buy/[product].ts`). Production state is unknown. The admin dashboard now shows it |
| Checkout → paid | Unknown | Buy clicks are now recorded, so this drop-off becomes measurable (see Measurement) |
| Paid → file | Low risk | PayPal shows a download button on the return page. The Stripe path depends on the delivery email arriving (Cloudflare `EMAIL` binding) |
| Paid → second purchase | Unknown | Upsell emails are wired and verified (below). There's no discount or credit for a buyer moving up the ladder (AUDIT-REPORT §2) |

### Free paths

| Entry | What it does | Where it leads | Drop-off |
|---|---|---|---|
| Email opt-in (homepage hero and bottom, `/store`, every post, `/checklist`) | Free weekly reset checklist plus a 7-email sequence | Email 2 → $15 kit. Emails 4–7 → $49 system | **The sequence pauses silently until a postal address is set** (CAN-SPAM). The dashboard warns since the last pass. No double opt-in |
| Free tools (`/tools/`) | Weekly reset, follow-up writer, onboarding pack. They work and are genuinely useful | Each now ends on its matching paid product, the $49 system, the related guide and the opt-in | Tool pages don't use the site header, so the only way onward is the ending block |
| `/apps/` (3 free + 7 Apps Pro) | Household and small-business apps | `/apps-pro` ($ unlock code) | Different buyer from the core funnel |
| Kids (`/kids`, `/kids-course`) | Free game. $29 pack sold by email request | Purchase request in admin | No checkout. No owner alert for requests |
| Blog (29 posts) | Content for search | Free tool line + product callout + store link (all posts) | See the Visibility plan: several posts target the wrong reader |

### Opt-in, as checked

- **Visible above the fold?** Before this pass, no. It sat below the hero, about 200px below the first screen on a phone. **Now** the email field and button sit inside the hero, above the fold on 375×667, 390×844 and 1280×800.
- **Does it work?** Yes. JavaScript submits to `/api/subscribe`, which saves to D1, sends email 1 and shows a status message. The no-JavaScript fallback used to show raw JSON. It now shows a confirmation page.
- **Does the sequence send?** Email 1 sends at signup. Emails 2–7 send weekly from the hourly cron. **They only send once a mailing address is set in Admin > Settings.** Whether that's set in production can't be seen from here.
- **Double opt-in?** None. It isn't legally required in the US. Single opt-in converts better, and the welcome email plus a one-click unsubscribe are already there. Add a confirmation step if a deliverability provider demands it or you target EU subscribers at scale.
- **Does email 1 deliver the checklist?** It linked to `/blog/weekly-reset/`, which does contain the fill-in Monday sheet. **Now** email 1 also contains the four-block checklist inline, so the promise is kept even if the link is never clicked.

### Upsells, as checked

The upsells are live code, not dead code. Rendered with the real code for every product:

| Purchase | Delivery email upsell | Day-2 follow-up upsell |
|---|---|---|
| Weekly Reset Checklist, $15 | Client Onboarding Kit | Client Onboarding Kit |
| Follow-Up Email Templates, $19 | Digital System | Digital System |
| Client Onboarding Kit, $29 | Digital System | Digital System |
| Digital System, $49 | Complete Bundle | Complete Bundle |
| Complete Bundle, $97 | none (top of ladder) | none |

The delivery email is sent from `src/pages/buy/paypal-return.ts` and `src/pages/api/webhook.ts`. The follow-up is sent by `followUpRecentBuyers` in `src/worker-entry.ts` (hourly cron, 2–7 days after the order). Both read `UPSELL_MAP`.

---

## 2. What was broken

| Problem | Where |
|---|---|
| Opt-in below the fold on phones. The header alone took about 200px across three rows at 375px | `src/pages/index.astro`, `src/components/Header.astro` |
| No-JS opt-in submit showed raw JSON (`{"received":true}`) | `src/pages/api/subscribe.ts` |
| Two opt-in forms on one page shared the same input `id` | `src/components/EmailOptin.astro` |
| **Order attribution was dead.** The source script only tagged links starting `https://buy.stripe.com/`. Every buy button has pointed to `/buy/<id>` since #62, so no order recorded where its buyer came from. PayPal orders never stored a source at all | `src/components/TrafficSource.astro`, `src/pages/buy/[product].ts`, `src/pages/buy/paypal-return.ts` |
| No measurement between "viewed a page" and "paid" | none existed |
| Sequence pitched the $49 system to people who already bought it | `src/lib/emailSequence.ts` |
| No email offered the $15 product. The sequence jumped straight to $49 | `src/data/emailSequence.ts` |
| Free tools ended on a generic `/products` redirect with no product, price or next read | `public/tools/*.html` |
| Free tools had no way to capture a warm visitor's email | `public/tools/*.html` |
| Blog posts didn't link to the free tools | `src/layouts/BlogPost.astro` |
| Target searches not in titles. "Client onboarding checklist **freelancer**", "follow-up email templates for **coaches**" and "weekly planning template **solo** business" didn't appear in any title. The follow-up post sold the $49 system to someone searching for templates | three posts in `src/content/blog/` |
| No structured data for products, FAQ or articles | `src/pages/store.astro`, `src/layouts/BlogPost.astro` |
| Header pill below 44px tall | `src/components/Header.astro` |

From the previous pass, already fixed in this branch: `robots.txt`, the sitemap, the broken share image, page overflow, the dead `/app`, and the flagship's Stripe fallback (AUDIT-REPORT §3).

---

## 3. What was fixed

**Opt-in**
- **Homepage hero** leads with the opt-in: one email field, one button ("Send me the free checklist"), a one-line benefit and the terms. The $49 button sits directly below as the alternative. A second opt-in closes the page (`src/pages/index.astro`).
- **Compact variant** of `EmailOptin` added, with a unique input `id` per instance (`src/components/EmailOptin.astro`).
- **Header** fits one row on phones: "How it works" moves to the footer and the pill shortens to "$49 System" below 480px. "Home" was removed (the logo links home) and "Apps" became "Free tools". Apps Pro and How it works are in the footer (`src/components/Header.astro`, `src/components/Footer.astro`).
- **No-JS submit** now shows a confirmation page that links straight to the checklist (`src/pages/api/subscribe.ts`).

**Emails**
- **Email 1** includes the checklist inline (`src/data/emailSequence.ts`).
- **Email 2** teaches the mid-week check, then offers the $15 Weekly Reset Checklist with a one-click buy link. The copy uses only features listed in `ALL_PRODUCTS`, has no urgency and states the guarantee. A new `{weeklyResetBuy}` variable fills the link (`src/lib/emailSequence.ts`).
- **Buyers of the Digital System or bundle** are skipped by the sales sequence. If the `fulfillments` lookup ever fails, the sequence sends without the check rather than stopping (`src/lib/emailSequence.ts`).

**Measurement**
- **Buy clicks** are recorded in D1 `checkout_starts`: product, traffic source, checkout method and a bot flag. No IP, no email, no cookies, no script. The table is created on demand, with `migrations/0009_checkout_starts.sql` for the record (`src/lib/checkoutStarts.ts`, `src/pages/buy/[product].ts`).
- **Attribution works again.** `/buy/` links carry `?src=`. It's passed to Stripe as `client_reference_id`, which the webhook already stores, and to PayPal through the return URL into `fulfillments.source` (`src/components/TrafficSource.astro`, `src/pages/buy/[product].ts`, `src/pages/buy/paypal-return.ts`).
- **Admin dashboard** has a new table, "Buy clicks vs orders (last 30 days)", per product (`src/pages/admin/index.astro`).

**Findability**
- **Three posts** were retitled and redescribed for the target searches. The follow-up post's callout now sells the $19 templates it's about (`src/content/blog/client-onboarding-checklist-template.md`, `follow-up-email-after-no-response.md`, `weekly-planning-template-small-business.md`).
- **Every post** now has a "Free tool" line matched to its product or category, plus `BlogPosting` JSON-LD (`src/layouts/BlogPost.astro`).
- **`/store`** has a "Try it free first" block linking the three tools, plus `FAQPage` and `Product` JSON-LD (`src/pages/store.astro`).
- **Each free tool** ends with:
  - a one-click buy for its matching product ($15, $19 or $29)
  - a link to the $49 system
  - the opt-in
  - the related guide
  - all free tools (`public/tools/weekly-reset.html`, `follow-up-writer.html`, `client-onboarding.html`)

**Internal link loop now in place:**
- blog post → free tool → product
- free tool → guide → product
- store → free tools → product
- everywhere → opt-in

**Verification**
- `npm run build`, `tsc --noEmit` and `wrangler deploy --dry-run` all pass.
- A crawl of 63 pages found 0 broken internal links and 0 horizontal overflow at 375px.
- A buy click wrote the expected D1 row, and the source reached the Stripe URL.
- The no-JS opt-in returned the confirmation page.
- Rendered emails and upsells are as shown in section 1.

---

## 4. Visibility plan

### Target searches → the page that should rank → the product it sells

| Search phrase (and close variants) | Page | Callout | Free tool |
|---|---|---|---|
| client onboarding checklist freelancer · client onboarding template · new client checklist | `/blog/client-onboarding-checklist-template/` | Client Onboarding Kit, $29 | Onboarding pack |
| client intake form template · intake questionnaire coach | `/blog/client-intake-form-template/` | Client Onboarding Kit, $29 | Onboarding pack |
| follow-up email templates for coaches · follow up email after no response · proposal follow up email | `/blog/follow-up-email-after-no-response/`, `/blog/proposal-follow-up-cadence-freelancers/` | Follow-Up Templates, $19 / Digital System | Follow-up writer |
| weekly planning template solo business · weekly reset checklist · weekly planning for freelancers | `/blog/weekly-planning-template-small-business/`, `/blog/weekly-reset/` | Weekly Reset Checklist, $15 / Digital System | Weekly reset |
| scope creep email · how to say no to extra work client | `/blog/scope-creep-script/` | Digital System | Follow-up writer |
| business systems for coaches · how to systematize a freelance business | `/blog/coaching-business-systems-for-coaches/`, `/blog/how-to-systematize-your-business/` | Digital System | Weekly reset |

### Content changes, in order

1. **Pick one page per phrase and stop competing with yourself.** Three posts target the weekly reset (`weekly-reset`, `weekly-planning-template-small-business`, `monday-reset-when-you-are-already-behind`). Two target proposal follow-ups (`follow-up-email-after-no-response`, `proposal-follow-up-cadence-freelancers`, plus `your-pipeline-dies-when-you-stop-following-up`). Make one the main page for each phrase. Link the others to it with the exact phrase as link text.
2. **Match each post's callout to its search intent.** The onboarding, intake, follow-up and weekly-planning posts now sell their matching kit. `proposal-follow-up-cadence-freelancers` and `your-pipeline-dies-when-you-stop-following-up` could sell the $19 templates the same way. Decide whether you'd rather lead with the cheaper kit (an easier first purchase) or the $49 system on those posts.
3. **Re-aim or noindex off-audience posts.**
   - `free-checklist-lead-magnet` and `lead-magnet-ideas` teach other creators to build lead magnets. Their readers are marketers, not your buyer.
   - `first-post`, `second-post`, `markdown-style-guide` and `using-mdx` have starter-template slugs with no search value. Rename them with 301s in `astro.config.mjs`.
4. **Write three new posts aimed at buyers ready to act:**
   - "client welcome email template"
   - "how to follow up on an unpaid invoice"
   - "client onboarding questionnaire for coaches"

   Each should end on its matching kit and free tool, the same way the layout now handles every post.
5. **Give each tool page its own share image** (1200×630) and submit `/tools/` to Search Console. Free tools attract links from roundup posts more readily than blog posts do.
6. **Promote outside search.**
   - Post one free tool per week where freelancers ask these questions: r/freelance, r/consulting, coaching Facebook groups, Indie Hackers.
   - Always use a tagged link (`?utm_source=reddit&utm_medium=social&utm_campaign=followup-writer`). The admin dashboard now carries that tag all the way to the order.
   - Share the tool itself, not the store.

---

## 5. Measurement

| Question | Measurable today? | Where |
|---|---|---|
| How many signups, from which source | Yes | Admin dashboard (`subscribers.source`, set from `utm_*` links) |
| How many orders, from which source | **Yes, from this deploy on.** It was broken for `/buy/` links before | Admin dashboard (`fulfillments.source`) |
| How many people clicked buy, per product | **Yes, new** | Admin dashboard → "Buy clicks vs orders" |
| Checkout abandonment (clicked buy, didn't pay) | **Yes, new** (clicks minus orders) | Same table |
| Where subscribers are in the email sequence | Yes, in D1 (`subscribers.sequence_step`) | Not on the dashboard yet |
| Downloads per order | Yes | D1 `download_events`, `download_tokens.used_count` |
| Page views, top pages, referrers | **No** | Nothing is installed |
| Which searches bring visitors, ranking position | **No** | Needs Google Search Console (no code) |
| Email open and click rates | **No** | The Cloudflare `EMAIL` binding doesn't report them |
| Free-tool usage | **No** | Static pages, no logging |

How to close the gaps without third-party pixels:

1. **Google Search Console and Bing Webmaster Tools** (a Bing verification tag is already in `BaseHead.astro`). These need no code, only a DNS or meta verification. Submit `https://buzzyfly.com/sitemap-index.xml`. This is the most important measurement for "can buyers find us".
2. **Cloudflare's built-in traffic numbers.** Cloudflare Web Analytics is **not** configured in `wrangler.json`. The Cloudflare dashboard already shows request counts and top paths for the domain and the Worker. That needs no change and adds nothing to the page.
3. **If page-level numbers are needed later, count them server-side on Cloudflare.** Workers Analytics Engine (a binding in `wrangler.json`, written to from the middleware) keeps the data first-party with no script in the page. It isn't added here because it needs the account to enable the dataset, which can't be verified from this environment.
4. **Add `sequence_step` counts to the dashboard.** One `GROUP BY` query. It shows how many subscribers reached each pitch email.

---

## 6. Next actions, by expected impact on finding buyers

1. **Make sure the funnel actually completes (owner, 15 minutes).** Open Admin. Clear the red box:
   - set the mailing address, so the sequence sends
   - configure PayPal, or a Stripe Payment Link per product, so `/buy/` doesn't open an email app
   - then buy one product yourself

   Visibility is wasted if the opt-in never emails and the buy button opens a mail app.
2. **Set up Google Search Console** and submit the sitemap. Check back in 2–4 weeks for which of the target phrases show impressions. Then strengthen the pages that are already close (positions 8–20) before writing new ones.
3. **Promote one free tool per week with tagged links** in freelancer and coach communities. That's the fastest source of visitors while search builds. The dashboard now attributes the signups and orders those links bring.
4. **Consolidate the overlapping posts** (Visibility plan, item 1). Re-aim or noindex the two lead-magnet posts.
5. **Add the first real proof.** Ask buyers' permission in the day-2 follow-up and put real quotes on `/store`. That raises the conversion of all the traffic above. Never invent them.
6. **Write the three buyer-intent posts** (Visibility plan, item 4).
7. **Kids Course:** give it a real checkout and an owner alert for requests, or take it out of the footer so it doesn't split attention.
