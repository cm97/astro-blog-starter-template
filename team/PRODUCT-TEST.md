# Product test record

Proof the product works as the listing says. Rerun this before any ad or big
push, and after any change to `/app`. Add the newest run at the top.

## 2026-11-04, Test team: 20 daily checks

How: same as 2026-11-03 (local D1 with every migration, test keys in the LOCAL
`download_tokens` only, Playwright at 375px and 1280px). New since yesterday:
`wrangler dev` won't start without a Cloudflare token, because the Workers AI
binding (#191) needs a remote session. I ran it from an uncommitted copy of
`wrangler.json` without the `ai` binding. The AI helpers weren't tested, and
they aren't among the 20 checks. The Stripe connector needs signing in again,
so check 16 read the links in `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key redirects to `/app` and the app opens. A $15 Weekly Reset key opens only `/app/reset`. `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 built-in emails fill in name, project, date and sign-off. No raw `{placeholders}`. Only the deliberate [bracket] blanks are left. |
| 4 | Copy / open in email app | PASS | Clipboard: "Subject: Re: proposal for Website refresh" plus the body. The `mailto:jane@example.com` link has the same subject and body. |
| 5 | Mark sent | PASS | Jane's item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps due. This matches the 3 test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill: proposal-cover, discount, retainer, scope, change-order, revision-limit. |
| 8 | Pricing maths | PASS | Defaults: $72/h, $1,300 project, $750 retainer. Income 80k: $94, $1,700, $950. Both match the formula. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore after clearing storage brings them back. |
| 10 | Smaller apps | PASS | The system key opens all 3 smaller apps (200), with the same clients. Follow-Ups offers 9 emails, Onboarding 6, and Reset shows Monday, This week and Log, which matches each listing. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 tap targets under 44px on `/`, `/store`, a post and `/app`. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors on the same 4 pages. |
| 13 | Accessibility | PASS | One H1 per page, no heading skips, no image without alt text, no low-contrast text found, and focus rings show. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and `/store` 37 KB over 10. Both are DOM-ready in about 1.4–1.6 s on a simulated slow line (400 kbps, 400 ms). |
| 15 | Links | PASS | 108 internal links from `/`, `/store`, `/blog/` and 63 posts: 0 broken. `/kids` gives 503 locally only, because it is the separate KIDS worker. Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has exactly the 4 Payment Links CLAUDE.md rule 5 allows (`bJebJ3…` ×64, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` redirects to its own link. Stripe settings weren't read because the connector needs signing in again. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." with the key, and `/app` then opens (200). Unknown session: "Checking your payment…", then "We can't confirm this payment yet." No `s`, or a garbage one: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: `/videos/weekly-reset`, `/videos/onboarding-kit` and `/videos/follow-up-templates` narrated and showed "A $15/$29/$19 version is coming soon", but those apps have been on sale since #181. They now say "Or $15 (or $29, $19) on its own." The listings match the apps. |
| 19 | Rules check | PASS | No "instant" claims and no `eVq4gB` link. The $19/mo Monthly Drop exists only in closed-subscriber code. No `coachmanager@` in rendered HTML. One refund wording everywhere. "Limits on our liability" is in `/terms`. No $97. |
| 20 | Search check | PASS | 66 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 65 (the `/blog/` index has none). |

## 2026-11-03, Test team: 20 daily checks

How: `npm ci`, `npm run build`, every migration applied to a LOCAL D1, one test
key for `buzzyfly-digital-system` in the LOCAL `download_tokens`, `wrangler dev`,
Playwright at 375px and 1280px. Stripe read-only. Nothing paid, nothing changed
in Stripe, PayPal or Cloudflare, production DB untouched.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key and with a bad key: 402. The valid key redirects to `/app` and the app opens. |
| 2 | Today list | PASS | Proposal sent 5 days ago shows "First proposal follow-up". Invoice due 9 days ago shows "a week overdue". New client today shows welcome and intake, with the day-1 steps not shown yet. |
| 3 | Email writer | PASS | All 21 built-in emails fill in name, project, date and the sign-off "Sam Tester". No raw `{placeholders}`. Only the deliberate [bracket] blanks are left (e.g. a future delivery date). |
| 4 | Copy / open in email app | PASS | Clipboard holds "Subject: Re: proposal for Website refresh" plus the body. `mailto:jane@example.com` carries the same subject and body. |
| 5 | Mark sent | PASS | Jane's item clears. "Second proposal follow-up" is scheduled next. |
| 6 | Weekly reset counts | PASS | Shows 1 open invoice ($800), 1 follow-up due and 2 onboarding steps due, which matches the 3 test clients. |
| 7 | Scope and proposal replies | PASS | proposal-cover, discount-reply, retainer-offer, scope-reply, change-order and revision-limit all open and fill. |
| 8 | Pricing maths | PASS | Defaults give $72/h, $1,300 project, $750 retainer. Income 80k gives $94, $1,700, $950. All match the formula worked by hand. |
| 9 | Data, backup, restore | PASS | 3 clients survive reload. The backup JSON has 3 clients and the sign-off. After clearing storage, restore brings them back. |
| 10 | Smaller apps | PASS | `/app/reset`, `/app/follow-ups` and `/app/onboarding` all return 200 with the system key, and the last two show the same clients. |
| 11 | Phone 375px | PASS (fixed) | No sideways scroll anywhere. FAIL before the fix: footer links were 19px tall on every page, and so were the stand-alone CTA and related links in posts. Now 0 targets under 44px. |
| 12 | Desktop 1280px | PASS | No sideways scroll, no JS errors on `/`, `/store`, a post or `/app`. Screenshots checked. |
| 13 | Accessibility | PASS (fixed) | Text contrast passes and focus rings show. No image is missing alt text. FAIL before the fix: home skipped from h1 to h3 (opt-in title), and the unlocked `/app` had no h1. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and loads in 135 ms locally. On a simulated slow line (400 kbps, 400 ms) the DOM is ready in about 1.4 s on both `/` and `/store`. Three small scripts. |
| 15 | Links | PASS | 101 internal links from `/`, `/store`, `/blog/` and 62 posts: 0 broken. `/kids` returns 503 locally only because it is served by the separate KIDS worker. Live sites can't be reached from the sandbox. |
| 16 | Buy path | PASS | Every buy link is `bJebJ3…` or `/buy/buzzyfly-digital-system` (which redirects to `bJebJ3…`), on all 65 pages. Stripe (read-only): active, `item_id=buzzyfly-digital-system`, redirects to `/thank-you?s={CHECKOUT_SESSION_ID}`, refund wording per rule 4. |
| 17 | Thank-you page | FAIL | Paid test session: "Your app is ready." with the key, and `/app` opens (200). A missing or garbage `s` shows "Already bought a Buzzyfly app?". An unpaid `cs_test_…` session wrongly shows "Payment received. Unlocking your app…", and "Payment received." after the retries. Fix is in a separate PR left for owner review. |
| 18 | Copy check | PASS (fixed) | The listing claims match the app: 21 emails, 9 follow-ups, 10 onboarding steps, the reset and the pricing tool. FAIL before the fix: `follow-up-email-after-no-response` called the Coming-soon $19 app a buyable "pack". |
| 19 | Rules check | PASS | No "instant" claims and no `eVq4gB`/$19/mo offer (Monthly Drop is closed to new subscribers). No `coachmanager@` in any rendered page (server-side `orderEmail` only). One refund wording on pages, footer, `/terms` and emails. "Limits on our liability" is present. No $97. |
| 20 | Search check | PASS | 65 pages: one title, one description and one H1 each, no duplicates, JSON-LD on 64 (the `/blog/` index has none). The build passes. |

Still open: live Stripe has 7 other active Payment Links that aren't on the
site, same as on 2026-11-02 (owner decides).

## 2026-11-02, SEO Master: $49 Digital System, full buyer walk-through

How: the site ran locally (`wrangler dev`) with every D1 migration applied. I
issued a buyer access key the same way a paid order does (a `download_tokens`
row for `buzzyfly-digital-system`), then drove the app with Playwright at phone
size (375px) and desktop size (1280px).

| Listing claim | Result |
|---|---|
| Locked to buyers | PASS. `/app` with no key returns 402. A valid key redirects to `/app` and unlocks. |
| "Today dashboard: who needs you and what to send" | PASS. A proposal sent 5 days ago shows "Due now: First proposal follow-up". An invoice 9 days old shows "a week overdue". A new client gets 4 onboarding steps with due dates. |
| "Writes the email" | PASS. A day-3 proposal follow-up came back with the client's name, the project, the sent date and the sign-off filled in. One `[start date]` blank is flagged to fill in. 21 built-in emails, plus custom ones. |
| Copy, or open in your email app | PASS. "Copy email" fills the clipboard, and "Open in my email app" builds a correct `mailto:` link with the subject and body. |
| Follow-ups move on | PASS. "Mark as sent" clears the item and schedules the next one (Nov 4). |
| Weekly reset | PASS. A 6-step, 20-minute Monday reset with live counts (open invoices, follow-ups due, onboarding due), plus a priority scorer. |
| Proposal and scope replies | PASS. Templates for discounts, retainers, out-of-scope requests, change confirmations and used-up revisions. |
| Pricing | PASS. The hourly floor and project and retainer prices calculate. |
| Data kept | PASS. Clients and the sign-off survive reload and reopen. Backup downloads as JSON with every client. |
| Smaller apps share data | PASS. The system key opens `/app/follow-ups` and `/app/onboarding` (same clients) and `/app/reset` (all three return 200). |
| Works on phone | PASS. No sideways scroll at 375px or 1280px. No JavaScript errors on any screen. |
| Store page discloses limits | PASS. The FAQ says the client list is saved on the buyer's own device and that there's no account. |

Payment hand-off (live Stripe, read-only check): the store's Payment Link
`bJebJ3…` is active, with `item_id=buzzyfly-digital-system`. After payment it
redirects to `https://buzzyfly.com/thank-you?s={CHECKOUT_SESSION_ID}`, and its
checkout text matches CLAUDE.md rule 4.

Not tested: a real card payment end to end (it would charge real money), the
delivery email, and PayPal.

Found: the live Stripe account has 7 other **active** Payment Links that are
not on the site: a second $49 Digital System link (`eVq8wR…`), the $5 Jobs
membership, "budget-planner", "Shelf Ops Kit" (promises file downloads), a
kids "family pass" subscription with a 7-day trial, and two "Lumen" frame
packs. Anyone who still has one of those URLs can pay. The owner decides which
to turn off.
