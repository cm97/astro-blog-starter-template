# EMAIL-REPORT — Why Buzzyfly email is paused, and what was fixed

Date: 2026-10-08 · Branch: `ccr-fa2d33c5-7wojii` · Local verification results: §7

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
| Weekly sequence (steps 1–6, one per 7 days; 7 emails total with the welcome) | Hourly cron | `sendDueSequenceEmails` in `src/lib/emailSequence.ts`. Content is in `src/data/emailSequence.ts` | orders@ |
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

## 7. Verification (second pass, local only)

No connectors, paid APIs or owner credentials were used. Nothing in this pass sent a real email.

### 7.1 Static trace

| Path | Chain | From address | Failure log |
|---|---|---|---|
| Signup → welcome | `POST /api/subscribe` → `sendSequenceEmail(0)` → `env.EMAIL.send` | `resolveFrom(env)` → orders@ | `subscribe: welcome email (step 0) to <email> failed: <reason>` plus the throw log in `sendSequenceEmail` |
| Stripe / Lemon Squeezy purchase → delivery | `POST /api/webhook`: verify signature → `parseStripeOrder` → record in `fulfillments` → `createDownloadToken` → `sendDeliveryEmail` → `env.EMAIL.send` | `resolveFrom(env)` → orders@ | `webhook: DELIVERY FAILED for order <id> (<email>): <reason>. Download URL: …` plus `email: delivery send failed for order <id> to <email>` |
| PayPal purchase → delivery | `buy/paypal-return.ts` and `apps/paypal-return.ts` → `sendDeliveryEmail` | orders@ | `buy:` / `apps: … not sent for order <id> to <email>: <reason>` |
| Cron → follow-up | `scheduled` → `followUpRecentBuyers` → `sendFollowUpEmail` | orders@ | `follow-up: order <id> to <email> failed: <reason>` |
| Cron → owner alert | `scheduled` → `alertNewOrders` → `sendOwnerAlert` | orders@ | `cron: owner alert to <addr> failed for orders <ids>` |
| Cron → sequence | `scheduled` → `sendDueSequenceEmails` → `sendSequenceEmail(step)` | orders@ | `sequence: step <n> to <email> failed: <reason>`, plus the rollback line when every send fails |
| Admin outbox | `POST /api/admin/send-email` (admin session) → `sendBrandEmail` | `BUZZYFLY_CONFIG.brandEmail` → hello@ | `outbox: send to <email> ("<subject>") failed` plus a D1 `outbox_emails` row with `error` |

- **Senders.** No code builds a From address outside `orders@` and `hello@`. A grep for `from:` across `src/` finds only these call sites. The standalone `workers/buzzyfly-email/` is not deployed.
- **Cron.** `wrangler.json` sets `"crons": ["0 * * * *"]`. `astro.config.mjs` registers `src/worker-entry.ts`, which exports `scheduled`. That handler doesn't filter on `event.cron`, so this one trigger runs all five jobs, including `sendDueSequenceEmails`.

### 7.2 Unit tests (`npm run test:email`, 15/15 pass)

`tests/email.test.ts` runs the real send functions against a mock `EMAIL` binding and an in-memory D1. It needs no new dependencies: esbuild is already installed, and the runner is Node's built-in `node:test`. It proves:

- **Delivery email.** It returns `sent: true`. The From address is on the allowed list. The HTML has a doctype and balanced tags, and contains the download link, the 3-day expiry note and the correct upsell. The plain-text part carries the same link and upsell. For all five products, the upsell in the email matches `UPSELL_MAP`. Product names are HTML-escaped.
- **Delivery failure.** It returns `sent: false` and logs the order id, recipient and error. A missing binding or a missing recipient returns a reason and never throws.
- **Sender check.** `resolveFrom` rejects a non-allowed `EMAIL_FROM` and falls back to orders@.
- **Follow-up email.** It sends with the next upsell.
- **Sequence emails.** All 7 render and send, the welcome at step 0 plus weekly steps 1–6. Each has an unsubscribe link and the mailing address in both HTML and text, and no `{store}`-style placeholders are left unfilled. A failed send logs the step and recipient.
- **Cron sequence job.** With no mailing address it sends nothing and moves no one forward. With an address saved in D1, it sends exactly the due subscribers their next step and skips anyone not due yet. If every send fails, it rolls back the claims. One bad address among good ones is skipped, not retried forever.
- **Admin outbox.** It sends from hello@ and strips characters like `<` and `>` from the display name.

Correction: §1 originally said the weekly sequence was "steps 1–7". The sequence has 7 emails in total: the welcome plus 6 weekly emails.

### 7.3 Local worker run (`wrangler dev --local --test-scheduled`)

This ran the real built worker, using a local D1 with all eight migrations applied and a local R2. Wrangler's `send_email` binding was in local mode, which records each message to disk instead of sending it. The test secrets lived in a temporary `.dev.vars`, which was deleted afterwards.

| Step | Result |
|---|---|
| `POST /api/subscribe` | 200. Welcome email recorded: From `Buzzyfly <orders@buzzyfly.com>`, subject "Your 20-minute weekly reset". |
| `POST /api/webhook` with a locally signed `checkout.session.completed` | `{"fulfilled":true,"delivered":true}`. Delivery email recorded with a signed `/api/download` link and the Complete Business Bundle upsell. |
| Download link from that email (dummy zip in local R2) | 200, `Content-Disposition: attachment; filename="buzzyfly-digital-system.zip"` |
| `/__scheduled` with no mailing address | Follow-up sent to the buyer and owner alert sent. Sequence logged `paused until a mailing address is set`. |
| `/__scheduled` after saving `mailingAddress` in the local D1 | `Buzzyfly sequence: sent=1 failed=0`. Step 1 ("Did Thursday happen?") recorded, with the address and unsubscribe link in the footer. |
| Admin login → `POST /api/admin/send-email` | 303 `status=sent`. Message recorded from `hello@buzzyfly.com`, and an `outbox_emails` row with `sent=1`. |

### 7.4 What code can prove vs. what only a live send can prove

**Proven locally:**
- Every path reaches `env.EMAIL.send` with an allowed sender and well-formed HTML and text.
- Signature check → fulfillment record → token → email → download works end to end.
- The cron runs every job.
- The mailing-address pause behaves as designed.
- Failures are logged with context, and a broken binding no longer burns sequence steps or follow-ups.

**Not provable without the live account:**
- That Cloudflare accepts mail from buzzyfly.com. This needs Email Service onboarding, and local mode doesn't check it.
- That the mail lands in an inbox rather than spam (SPF, DKIM, DMARC).
- That the five real zips exist in the production `buzzyfly-products` bucket.
- That production has `STRIPE_WEBHOOK_SECRET` and `DOWNLOAD_TOKEN_SECRET`, and that Stripe's webhook endpoint points at `/api/webhook`.
- That a real `mailingAddress` is saved in production D1.
- PayPal delivery past the capture call. That needs the PayPal API, so it was traced statically only.

**Owner, after deploying:** work through §4 steps 1–5. Then make one Stripe test-mode purchase to your own inbox, or use `test-webhook.mjs`. **It targets the live site and sends a real email.** Confirm three things:
1. The delivery email arrives and isn't in spam.
2. The link downloads the real zip.
3. On the next hour, the owner alert arrives. Two days later, the follow-up arrives.

In `wrangler tail buzzyfly`, any `DELIVERY FAILED` or `all N sends failed` line means onboarding or DNS is the problem.
