# EMAIL-REPORT — Why Buzzyfly email is paused, and what was fixed

Date: 2026-10-08 · Branch: `ccr-fa2d33c5-7wojii`

**Short version.** The code is wired correctly end to end. Every email path calls `env.EMAIL.send`, and the cron runs every job. The weekly subscriber sequence is paused by design: no CAN-SPAM mailing address is set in the repo. Whether one is saved in D1 can't be seen from here. The other possible blocker is Cloudflare Email Service onboarding, which only the dashboard can confirm. The code had two quiet failure modes that would have burned through the sequence and the buyer follow-ups during an outage. Both are fixed. All send failures are now logged with the recipient, the order id or step, and the error.

> This session had no Cloudflare credentials, so D1, R2 and the dashboard were **not** inspected live. Anything below marked "owner must verify" is a gap in what I could check, not a confirmed problem.

---

## 1. Current state

| Path | Trigger | File | Sender |
|---|---|---|---|
| Delivery email (download link, 3-day expiry, upsell block) | Stripe / Lemon Squeezy webhook `POST /api/webhook` | `src/pages/api/webhook.ts` → `sendDeliveryEmail` in `src/lib/email.ts` | `EMAIL_FROM` = orders@ |
| Delivery email (PayPal) | PayPal return page | `src/pages/buy/paypal-return.ts`, `src/pages/apps/paypal-return.ts` | orders@ |
| Buyer follow-up (2–7 days after purchase, upsell) | Hourly cron | `followUpRecentBuyers` in `src/worker-entry.ts` → `sendFollowUpEmail` | orders@ |
| Owner new-order alert | Hourly cron | `sendOwnerAlert` in `src/worker-entry.ts` | orders@ → `BUZZYFLY_CONFIG.orderEmail` |
| Welcome email (sequence step 0, free checklist) | Signup `POST /api/subscribe` | `src/pages/api/subscribe.ts` → `sendSequenceEmail(0)` | orders@ |
| Weekly sequence (steps 1–7, one per 7 days) | Hourly cron | `sendDueSequenceEmails` in `src/lib/emailSequence.ts`. Content is in `src/data/emailSequence.ts` | orders@ |
| One-off brand email | Admin > Send email | `src/lib/outbox.ts` (logged to D1 `outbox_emails`) | hello@ |

Config:
- `wrangler.json` has the `send_email` binding `EMAIL` with allowed senders `orders@buzzyfly.com` and `hello@buzzyfly.com`. It also sets the var `EMAIL_FROM = "Buzzyfly <orders@buzzyfly.com>"` and the cron `0 * * * *`.
- The cron handler is `scheduled` in `src/worker-entry.ts`. `astro.config.mjs` registers it as `workerEntryPoint`.
- `AUTOMATIC_DELIVERY_ENABLED = true` in `src/data/monetization.ts`.
- `UPSELL_MAP` in `src/data/monetization.ts` matches the ladder in CLAUDE.md. The delivery and follow-up emails both use it.

Not part of the live system: `workers/buzzyfly-email/` is a standalone scaffold. It still has `database_id = "REPLACE_WITH_D1_ID"` and calls Resend. Nothing deploys it and the site does not use it. I left it alone. Consider deleting it so nobody mistakes it for the email system.

## 2. Pause diagnosis

| # | Pause point | Finding | Evidence |
|---|---|---|---|
| 1 | **CAN-SPAM mailing address** | **Most likely blocker for the weekly sequence.** The shipped default is an empty string. `sendDueSequenceEmails` returns `{sent:0, failed:0}` before it queries a single subscriber. It logs `Buzzyfly sequence: paused until a mailing address is set in Admin > Settings`. The D1 override in `site_content.mailingAddress` could not be checked from here (owner must verify). The welcome email, delivery, follow-up and owner alert do **not** depend on it. | `src/data/monetization.ts:29` (`mailingAddress: ""`), `src/lib/emailSequence.ts` (early return), `src/lib/settings.ts` (D1 overrides the default) |
| 2 | **Email Service onboarding** | **Can't be verified from the repo.** The binding is declared correctly and `wrangler deploy --dry-run` lists `env.EMAIL (senders: orders@, hello@)`. If buzzyfly.com was never onboarded under Compute → Email Service → Email Sending, every send throws at runtime. Then *all* email fails, including delivery to paying buyers. Owner must verify. | `wrangler.json` `send_email`. The `src/lib/email.ts` header says onboarding is a manual prerequisite. |
| 3 | **Sender mismatch** | **OK.** Every From address resolves to orders@ (through `EMAIL_FROM` or the default) or to hello@ (outbox and `brandEmail`). Both are on the allowed list. *Risk fixed:* a dashboard override of `EMAIL_FROM` to any other address used to fail every send. Now it falls back to orders@ and logs an error. | `resolveFrom` in `src/lib/email.ts`, `src/lib/outbox.ts` |
| 4 | **Swallowed failures** | **Several gaps (fixed).** The Apps PayPal return ignored `sent:false` entirely. The owner alert and outbox errors had no recipient or order context. The follow-up logged failures at `console.log` level. Two failures were not logged at all and **silently burned emails:** (a) the sequence claims a step before sending, so with a broken binding every subscriber advanced one step a week with nothing delivered. (b) Follow-ups wrote `success=0` and were never retried, so a broken binding used up every buyer's follow-up for good. | See §3 |
| 5 | **Cron health** | **OK.** `scheduled` runs schema → download schema → owner alert → buyer follow-up → email sequence. Each job runs inside `runJob`, so one failure can't stop the others. The webhook calls `sendDeliveryEmail` after it records the order, and it logs `DELIVERY FAILED … Download URL:` on failure, so the link can be recovered. `sendFollowUpEmail` is **not** dead code: the cron job `followUpRecentBuyers` calls it. | `src/worker-entry.ts`, `src/pages/api/webhook.ts` |
| 6 | **R2 files** | **Can't verify (no credentials).** None of the five keys in `PRODUCT_FILE_MAP` can be confirmed: `products/buzzyfly-digital-system.zip`, `products/weekly-reset-checklist.zip`, `products/follow-up-email-templates.zip`, `products/client-onboarding-kit.zip` and `products/complete-business-bundle.zip`. The zips are deliberately kept out of the repo. `scripts/upload-products.sh` uploads them, and it *skips* missing files without failing. A missing object means a buyer gets an email with a link that 404s. Owner must verify. | `src/data/monetization.ts` `PRODUCT_FILE_MAP`, `scripts/upload-products.sh` |

## 3. What I fixed

- **`src/lib/email.ts`**
  - Added `ALLOWED_SENDERS`, which mirrors wrangler.json. `resolveFrom` now validates `EMAIL_FROM`. If the address isn't allowed, it logs an error and falls back to `Buzzyfly <orders@buzzyfly.com>`.
  - `sendDeliveryEmail` now uses `resolveFrom` instead of its own copy of the From logic.
  - `sendDeliveryEmail` and `sendFollowUpEmail` log `order id + recipient + error` when a send throws.
  - Removed the unused `EMAIL_API_KEY` parameter.
- **`src/lib/emailSequence.ts`**
  - `sendSequenceEmail` logs `step + recipient + error` when a send throws.
  - `sendDueSequenceEmails`: if **every** send in a run fails, it reads that as a broken binding. It rolls back those claims (`sequence_step` and `sequence_sent_at` go back to their previous values) and logs one clear error, so everyone retries next hour and nobody loses a week. If some sends succeed, single failures keep the old behaviour: logged and skipped, never retried forever.
- **`src/worker-entry.ts`**
  - The follow-up job follows the same rule: if every send fails, nothing is recorded and it retries next hour, inside the 7-day window. Otherwise every attempt is recorded. Failures now log at error level with the recipient.
  - The owner alert logs the recipient and order ids on failure, and logs when the binding is missing. It uses `resolveFrom`.
  - **Removed the dead Resend fallback** (`EMAIL_API_KEY`). Production never set that key, and Cloudflare Email Service is the only provider.
- **`src/pages/apps/paypal-return.ts`**: now checks the `sendDeliveryEmail` result. A failed unlock email used to vanish without a trace.
- **`src/pages/buy/paypal-return.ts`**: the failure log now includes the recipient.
- **`src/pages/api/subscribe.ts`**: the welcome-email failure log now includes the recipient and step 0. It also logs when the binding is missing.
- **`src/lib/outbox.ts`**: send failures go to the console as well as the D1 `outbox_emails` row.
- **`src/data/monetization.ts`, `src/env-extra.d.ts`**: removed stale comments that told the owner to set a Resend `EMAIL_API_KEY`.

Not changed: no mailing address was invented or hardcoded. Stripe, D1 schema and migrations, R2 delivery and the admin console are untouched. The Admin > Settings page already warns when the address is empty.

Verified:
- `npm run build` passes, with only the existing sharp/SESSION adapter notices.
- `tsc --noEmit` is clean.
- `wrangler deploy --dry-run` lists all bindings.

## 4. Owner checklist (only you can do these)

1. **Set the mailing address.** Go to `/admin` → Settings → "Mailing address (for email footers)" and save. A PO box is fine. The hint under the field should change to "Weekly emails are sending." This unpauses the sequence on the next hourly run.
2. **Confirm Email Service onboarding.** In the Cloudflare dashboard, open Compute → Email Service → Email Sending. buzzyfly.com should show as onboarded or verified. If it isn't, click Onboard Domain → buzzyfly.com.
3. **Confirm DNS.** In DNS for buzzyfly.com, check that the records Email Service added are present: the SPF/TXT, DKIM and any MX/return-path records it lists. Don't delete them.
4. **Confirm the R2 files exist.** Run `npx wrangler r2 object get buzzyfly-products/products/<id>.zip --remote --pipe | wc -c` for each of the five ids, or check the bucket in the dashboard. Upload any missing ones with `scripts/upload-products.sh <folder>`.
5. **Confirm the secrets exist.** Run `npx wrangler secret list` and check for `STRIPE_WEBHOOK_SECRET` and `DOWNLOAD_TOKEN_SECRET`. Without them the webhook returns 500 and nothing is delivered.
6. **Optional:** set up Email Routing so replies to orders@ and hello@ reach your inbox. The emails tell buyers to "reply to this email."
7. **Deploy this branch:** `npm run build && npm run deploy`.

## 5. Test plan

Watch logs throughout with `npx wrangler tail buzzyfly`.

1. **Welcome email.** Sign up at `/checklist` with an address you control. Expect the welcome email within a minute. A failure logs `Buzzyfly subscribe: welcome email (step 0) to … failed: …`.
2. **Delivery.** In Stripe test mode, make a test purchase, or send a test `checkout.session.completed` webhook with `metadata.item_id = buzzyfly-digital-system`. Expect the delivery email with a working download link, the 3-day note, and the Complete Bundle upsell block. Click the link and confirm the zip downloads, which also proves the R2 object exists. Repeat for each of the five products.
3. **Owner alert.** On the next hour after a purchase, you should get "New Buzzyfly order: …" at the `orderEmail` address.
4. **Follow-up.** For a quick test, backdate a test order with `UPDATE fulfillments SET created_at = created_at - 3*86400000 WHERE order_id = '<test id>'`. The next cron run should send "Quick check-in on your …".
5. **Sequence.** Set the mailing address first. Then backdate a test subscriber with `UPDATE subscribers SET sequence_sent_at = sequence_sent_at - 8*86400000 WHERE email = '<you>'`. The next run sends step 1 with your address in the footer and logs `Buzzyfly sequence: sent=1 failed=0`. You can trigger the cron locally with `npx wrangler dev --test-scheduled` and `curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"`.
6. **Outbox.** Use Admin > Send email to yourself. It should arrive from hello@ and show in the sent history.
7. **Broken-binding rollback.** Optional, staging only. With sends failing, confirm the logs show `all N sends failed … Rolling back` and that `sequence_step` is unchanged afterwards.

## 6. Next actions (by impact on revenue)

1. **Verify Email Service onboarding (owner checklist step 2).** If this is broken, paying buyers get nothing. It is the highest-stakes unknown.
2. **Verify all five R2 zips exist (step 4).** A missing file means a paid order with a dead link and a likely refund.
3. **Run one real end-to-end test purchase (test plan step 2)** and click the link.
4. **Set the mailing address (step 1).** This unpauses the 7-email sequence that moves free subscribers toward the $49 Digital System.
5. **Recover past buyers if onboarding was broken.** Search `wrangler tail` or Workers Logs for `DELIVERY FAILED`, then use Admin > Orders → Resend link. Follow-ups already marked failed before this fix can be released for retry with `DELETE FROM followup_emails WHERE success = 0`. This only works for orders under 7 days old, because of the follow-up window.
6. **Small follow-up:** the Admin > Orders "Resend link" button only shows a fresh link and doesn't email it. Wiring it to `sendDeliveryEmail` would save a manual copy-paste per support request.
7. **Clean-up:** delete the unused `workers/buzzyfly-email/` Resend scaffold.
