# EMAIL.md — Resume and Harden the Live Buzzyfly Email System

You are a senior backend engineer working on the cm97/astro-blog-starter-template repo — the Astro site deployed at buzzyfly.com on Cloudflare Workers. The email system is ALREADY BUILT and LIVE in this repo. Do NOT rebuild it, do NOT add Resend, do NOT add any external email API. The site uses Cloudflare's native Email Service Workers binding (`env.EMAIL`), which costs nothing and needs no API key. Your job is to find out why it is paused, fix whatever is blocking it, and make sure every email path actually fires.

## What already exists (read these first)

- `wrangler.json` — has a `send_email` binding named `EMAIL` with allowed sender addresses `orders@buzzyfly.com` and `hello@buzzyfly.com`, plus a `vars.EMAIL_FROM` of `Buzzyfly <orders@buzzyfly.com>`. An hourly cron trigger (`0 * * * *`) is configured.
- `src/lib/email.ts` — transactional email module. Exports `sendDeliveryEmail` (order fulfillment with download link + upsell block), `sendFollowUpEmail` (post-purchase check-in with upsell), `resolveFrom`, `escapeHtml`, and the `EmailBinding` / `EmailResult` interfaces. All sends go through `env.EMAIL.send`.
- `src/lib/emailSequence.ts` — subscriber sequence logic. `sendSequenceEmail` sends one step; `sendDueSequenceEmails` runs on the hourly cron, claims each subscriber's step before sending (no double-sends), batches of 50.
- `src/data/emailSequence.ts` — the 7-email sequence content (steps 1-7). Email 0 (welcome + free checklist) is sent at signup via `/api/subscribe`.
- `src/lib/outbox.ts` — Admin > Send email one-off sends, logged to the `outbox_emails` D1 table.
- `src/lib/fulfillment.ts` — order parsing (Stripe + Lemon Squeezy), R2 file resolution via `PRODUCT_FILE_MAP`, signed download tokens (`createDownloadToken`), stored revocable tokens (`issueStoredDownloadToken`), download rate limiting, download event logging.
- `src/lib/settings.ts` — site settings stored in D1 `site_content`, including `mailingAddress`.
- `src/data/monetization.ts` — `AUTOMATIC_DELIVERY_ENABLED` is currently `true`. `UPSELL_MAP` maps each product to its next upsell. `BUZZYFLY_CONFIG.mailingAddress` is an empty string.
- Migrations `0001` through `0008` cover orders, subscribers, download tokens, download events, outbox, purchase requests, and traffic sources.

## Phase 1 — Diagnose why email is paused

Work through these in order. Each one is a known pause point in this codebase:

1. **CAN-SPAM mailing address.** `sendDueSequenceEmails` in `emailSequence.ts` returns early with zero sends when `mailingAddress` is empty — it logs "Buzzyfly sequence: paused until a mailing address is set in Admin > Settings." The shipped default in `monetization.ts` is `""`. Check whether a real address has been saved to D1 via the admin console. If not, this is the #1 blocker for the weekly subscriber sequence. The welcome email at signup still sends regardless.
2. **Cloudflare Email Service onboarding.** The `send_email` binding in wrangler.json only works if the domain was onboarded in the Cloudflare dashboard (Compute → Email Service → Email Sending → Onboard Domain → buzzyfly.com). Cloudflare adds the DNS records automatically. If onboarding was never completed or was undone, every `env.EMAIL.send` call fails at runtime. Check for any evidence in the repo (README, docs, comments) and flag it for the owner to verify in the dashboard.
3. **Sender address mismatch.** The binding allows `orders@buzzyfly.com` and `hello@buzzyfly.com`. `resolveFrom` defaults to `orders@buzzyfly.com`; the outbox module sends from `hello@buzzyfly.com`. Both are allowed — fine — but confirm no code path constructs a from-address outside that list.
4. **Failed sends swallowed.** `sendDeliveryEmail`, `sendSequenceEmail`, and `sendBrandEmail` all catch errors and return `{ sent: false, reason }` instead of throwing. Check the webhook/fulfillment handler and the cron entry (`src/worker-entry.ts`) to confirm failed sends are logged to console (visible via `wrangler tail`) and, where applicable, recorded in D1. If a failure path exists with zero logging, add it.
5. **Hourly cron health.** Confirm `src/worker-entry.ts` (or equivalent) actually invokes `sendDueSequenceEmails` on the cron trigger and that the wrangler.json cron expression matches. Confirm the fulfillment webhook path calls `sendDeliveryEmail` after a successful order and that `AUTOMATIC_DELIVERY_ENABLED` being true means it does.
6. **R2 file presence.** `PRODUCT_FILE_MAP` references five zip files under `products/` in the `buzzyfly-products` bucket. If any zip is missing, buyers get an email with a dead download link. Flag any map entry whose file cannot be verified.

## Phase 2 — Fix what you find

1. If the mailing address is the blocker, do NOT invent one. Document that the owner must set it in Admin > Settings (a PO box is fine). You may add a clearer log line or admin-facing warning, but no hardcoded address.
2. Fix any silent failure paths: every email send failure must be logged with enough context (recipient, step or order id, error) to debug from `wrangler tail`.
3. If the fulfillment webhook does not call `sendDeliveryEmail` on success, wire it. The delivery email must include the signed download link, the 3-day expiry note, and the upsell block (already built into `renderHtml`).
4. Ensure the post-purchase follow-up email (`sendFollowUpEmail`) is scheduled or triggered after delivery — check whether anything invokes it and wire it if it is dead code.
5. Run `npm run build` and make sure it passes clean. Do not break Stripe checkout, D1, R2, the admin console, or the existing email modules.

## Phase 3 — Deliverables

Write a report to `EMAIL-REPORT.md` in the repo root containing:

1. **Current state.** What the email system does today, with file paths for each path (fulfillment delivery, follow-up, subscriber sequence, outbox, cron).
2. **Pause diagnosis.** Which of the known blockers is actually pausing things, with evidence from the code.
3. **What you fixed.** Every change made, with file paths.
4. **Owner checklist.** Exact steps only the owner can do: set the mailing address in Admin > Settings, verify Email Service onboarding in the Cloudflare dashboard, confirm DNS records exist for buzzyfly.com, run a test purchase in Stripe test mode and confirm the delivery email arrives with a working download link.
5. **Test plan.** How to verify end to end: test signup → welcome email; test purchase → delivery email with download link + upsell; hourly cron → next sequence email; Admin > Send email → outbox entry.
6. **Next actions.** Prioritized by impact on actually getting money into the owner's account.

## Rules

- Do NOT add Resend, Postmark, SES, Mailgun, or any external email provider. Cloudflare Email Service is the provider. No API keys, no external accounts.
- Do NOT rebuild the site. The Astro + Cloudflare stack stays.
- Do NOT remove or break Stripe checkout, D1, R2 delivery, or the admin console.
- Do NOT hardcode a mailing address or any secret.
- Do NOT invent testimonials, revenue numbers, or fake stats.
- Do NOT promise specific income results in any email copy.
- Do NOT add third-party tracking pixels.
- Keep email HTML simple and compatible with Gmail and Outlook. Inline critical CSS. Provide plain-text alternatives (already done in the existing modules — preserve that pattern).
- Prefer smaller changes when in doubt. Extend existing modules rather than creating duplicates.
- If a previous AUDIT-REPORT.md or FUNNEL-REPORT.md exists, read it and treat its findings as additional context.

Work through all three phases. End with EMAIL-REPORT.md committed to the repo.
