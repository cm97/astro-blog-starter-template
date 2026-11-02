# Product test record

Proof the product works as the listing says. Rerun this before any ad or big
push, and after any change to `/app`. Add the newest run at the top.

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
