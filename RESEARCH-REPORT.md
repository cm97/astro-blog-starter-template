# What will make Buzzyfly sell — research report

Date: 2026-10-14

**Sources:** I read every repository on the account (6 active, 11 older or forked), the full buzzyfly.com codebase and its past reports, plus published market and conversion research. Links are at the bottom.

**What I couldn't check:** This session can't open buzzyfly.com directly, because the network proxy blocks it. It also has no Cloudflare, Stripe or Google Search Console access. Anything marked **(owner must check)** is an unknown, not a confirmed problem.

---

## The short answer

The site isn't losing sales because of its design. The evidence points to four bigger problems, in this order:

1. **Nobody can find it.** A web search for the brand returns no pages from buzzyfly.com. The only hit is the site's own GitHub pull request.
2. **Nobody has proven that a buyer actually receives the files.** Three things that delivery depends on have never been confirmed live (see §1).
3. **The site sells too many unrelated things.** Coach templates, a kids game subscription, a kids course, a domain store, a jobs board and AI tools all compete for the same visitor.
4. **Nothing measures what works.** The site records sign-ups and sales, but not visits or buy clicks. So no change, design or otherwise, can be judged.

Design changes, light or dark, rank last. Published tests on light versus dark pages disagree with each other. Only about 12–26% of A/B tests run by professionals produce a winner at all.

### The math that makes this clear
- Pages selling digital products to people who've never heard of the seller typically convert **1–3%** of visitors into buyers.
- At that rate, **10 sales a month needs roughly 330–1,000 visitors to the sales page every month.**
- A site that can't be found gets close to zero visitors. Close to zero times 3% is still close to zero, however good the page looks.

---

## Ranked plan (by expected impact on sales)

### 1. Make sure every sale actually delivers (owner must check, about 1 hour)
The site's own `EMAIL-REPORT.md` lists three things the code can't confirm:
- that Cloudflare Email Service is switched on for buzzyfly.com
- that all five product zip files exist in the R2 storage bucket
- that the Stripe webhook secret and download-token secret are set

If any of these is missing, a buyer pays and gets nothing, which means a refund, a complaint and lost trust. **Do one real test purchase to your own inbox before sending a single visitor.** This is the only item on the list that can turn sales you already have into refunds.

### 2. Get found by Google (I can do the code part now; you do one step)
These are the findings from the code:
- **There's no `robots.txt`.** Search engines aren't pointed to the sitemap.
- **The sitemap tells Google to index pages it shouldn't.** That's 12 admin pages, plus `/thank-you`, `/success` and `/unsubscribe`.
- **Four blog posts still use the starter template's web addresses.** These are `/blog/first-post`, `/blog/second-post`, `/blog/markdown-style-guide` and `/blog/using-mdx`, even though their content was rewritten. A page's address is one of the signals search engines use, and these addresses say nothing about the topic.
- **Only Bing is verified.** The site has no Google Search Console verification, so Google may never have been asked to crawl it. **(Owner: add the site to Google Search Console and submit the sitemap.)**

Be realistic about timing. Ahrefs found that only about 1.7% of new pages reach Google's top 10 within a year. The ones that do usually take 2–6 months. SEO is worth fixing because it's cheap and it compounds, but **it won't produce sales this month.**

### 3. Sell where buyers already shop: Etsy (fastest path to first sales)
- Etsy has about 86.5–96 million active buyers who already search for digital downloads.
- Its coaching-template category is busy. One coaching template bundle shows **about 2,500 sales**, and onboarding packs and intake forms are among the most common listings.
- Guides report that new digital-product shops usually make their first sale **within a few weeks to a few months**. Your own site has to bring in every visitor itself.
- Etsy prices in this niche run **$2–$32**. Notion "coach client portal" templates on Gumroad run **$8–$99**.

**What to do:** list the three single products on Etsy first. Test them at Etsy-level prices, for example $12, $17 and $24. Keep the $49 Digital System and the $97 Bundle on your own site, where you keep the customer's email for the upsell sequence.

**The trade-off:** Etsy charges fees and owns the buyer relationship. Its job is to find buyers and prove which product sells. Your site's job is to keep them.

### 4. Focus the brand on one buyer
Right now buzzyfly.com and its sister repos offer:
- coach business templates
- a kids games subscription for ages 3–9 (its payments aren't switched on yet, per its README)
- a $29 kids course
- a domain store
- a jobs board
- video pages
- an AI design app

A solo coach landing on the site sees links to kids games and domains in the footer. That weakens the "this is for me" feeling, and it spreads Google's understanding of what the site is about across unrelated topics.

**What to do:** on buzzyfly.com, keep the nav, footer and sitemap about coaches only. Move kids, domains and jobs to their own sites or subdomains. Also remove the public "Admin" link from the footer.

This one is reasoned judgment, not a measured result. It follows from how search engines group sites by topic and from your own "who is it for" answer.

### 5. Measure, then test one change at a time
- Add first-party counting of page visits, buy clicks and sales by page and by traffic source to the admin console. It uses your own database, with no third-party trackers.
- Only then test changes, starting with the ones that have the strongest evidence:
  - **A visible money-back guarantee next to the price.** Published tests reported +21–33%. The site already does this.
  - **Headline and offer tests.**
  - **Design.** Last.

### 6. Get real proof, ethically
The site has no reviews or testimonials, and the rules rightly forbid inventing them. Once item 1 is confirmed, ask your first real buyers for one sentence of feedback by email. Etsy reviews count too. Real proof next to the price is the strongest trust signal you can add.

### 7. Light or dark design: hold
The evidence is mixed. In one business-software test a dark page won with **42% more conversions**. Another test found no difference. Reading research favors dark text on a light background, but that measures reading, not buying. PR #82, the dark redesign, is built and passes CI. Don't spend more time on a light version until measurement exists to judge it.

---

## Who does what

| # | Task | Who | Time |
|---|---|---|---|
| 1 | Test purchase, confirm Email Service, R2 files and secrets | **You** (needs Cloudflare and Stripe logins) | about 1 hour |
| 2 | robots.txt, clean sitemap, noindex private pages, rename the 4 blog addresses with permanent redirects | **Me** | same day |
| 2 | Add the site to Google Search Console and submit the sitemap | **You** (needs your Google login) | 15 minutes |
| 3 | Write Etsy listings: titles, tags and descriptions from Etsy search terms | **Me** writes them, **you** create the shop | 1–2 days |
| 4 | Make nav, footer and sitemap coach-only | **Me** | same day |
| 5 | Visit, click and sale counting in the admin console | **Me** | 1–2 days |
| 6 | Ask first buyers for feedback | **You**, with an email I draft | ongoing |

---

## Other repositories reviewed
- **cm97/react-router-starter-template:** "Buzzyfly Kids", a games and lessons subscription. Payments wait on Stripe secrets, so it isn't earning yet.
- **cm97/butterfly:** intentionally empty. It points to this repo.
- **cm97/BF-Dezign:** a Google AI Studio "Gamma AI" design app, not connected to the store.
- **cm97/youtube-mcp:** a tool that connects Claude to a YouTube channel. It could later help with video marketing for the products.
- **cm97/my-portfolio.github.io:** a personal portfolio page.
- **cm97/cm97-converter, claude-skills, cm97-skills:** AI agent skills.
- **Older and forked repos (2024):** not related to the store.

---

## Sources
- Ahrefs, how long it takes to rank: https://ahrefs.com/blog/de/how-long-does-it-take-to-rank/
- Visionary Marketing, A/B testing statistics (Optimizely's 127k-experiment data): https://visionary-marketing.co.uk/blog/ab-testing-statistics-2026
- Blend Commerce, A/B test benchmarks: https://blendcommerce.com/blogs/shopify/a-b-testing-benchmarks-ecommerce
- Search Engine Land, dark landing page test: https://searchengineland.com/landing-page-best-practices-wrong-465988
- Matt Mazur, light vs dark test: https://mattmazur.com/2012/02/06/ab-testing-a-light-vs-dark-design-on-lean-domain-search/
- Piepenbrock et al., positive polarity and reading: https://documentacion.fundacionmapfre.org/documentacion/publico/pt/bib/143702.do?format=xml
- VWO, guarantee badge test: https://vwo.com/blog/adding-trust-badge-increases-sales/
- Blend Commerce, guarantee test: https://blendcommerce.com/blogs/ab-tests-shopify/30-33-increase-in-conversion-rate
- Quick Sprout, guarantee vs trial (refund rate): https://www.quicksprout.com/what-converts-better-free-trial-versus-money-back-guarantee/
- Systeme.io, conversion rate guide: https://systeme.io/learn/what-is-a-good-conversion-rate/
- ClickMinded, CRO statistics: https://www.clickminded.com/conversion-rate-optimization-statistics/
- LitCommerce, Etsy vs own website: https://litcommerce.com/blog/etsy-vs-own-website/
- Printful, selling digital products on Etsy: https://www.printful.com/blog/how-to-sell-digital-products-on-etsy
- Etsy coaching templates market: https://www.etsy.com/market/coaching_templates
- Etsy business coaching bundle (about 2.5k sales): https://www.etsy.com/listing/1644729524/business-coaching-templates-bundle-canva
- Gumroad coaching client portals: https://shobana.gumroad.com/l/coaching-client-portal, https://prachisharma2.gumroad.com/l/ClientPortal
- HubSpot, Pinterest traffic: https://blog.hubspot.com/marketing/get-traffic-pinterest
