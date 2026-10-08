# EMAIL.md — Wire Resend into Buzzyfly Fulfillment

You are a senior backend engineer working on the cm97/astro-blog-starter-template repo — the Astro site deployed at buzzyfly.com on Cloudflare Workers. The site already has Stripe checkout, D1 database, R2 product delivery, an admin console, and an email sequence. Your job: make every email actually send. Right now the fulfillment path logs orders but does not reliably deliver product downloads to buyers. That is the leak killing sales.

## Phase 1 — Diagnose the current email state

1. Read `src/lib/fulfillment.ts`, `src/lib/emailSequence.ts`, `src/data/emailSequence.ts`, and any webhook handler (likely in `functions/` or `src/pages/api/`). Trace exactly what happens after a successful Stripe payment: order logged in D1? File path resolved from R2? Email sent? What email provider is referenced, if any?
2. Check `wrangler.json` for any email bindings, secrets, or environment variables related to email. Check `.dev.vars.example` or `.env.example` if they exist.
3. Identify every place an email SHOULD be sent but is not: purchase fulfillment, download delivery, email opt-in confirmation, upsell sequence, admin notifications.
4. Check whether the site currently uses any email service (Resend, Postmark, SES, Mailgun, or a raw SMTP approach). If it uses none, that is the gap.

## Phase 2 — Wire Resend

1. Add Resend as the transactional email provider. Install the Resend SDK if the project uses npm packages, or use the Resend REST API via `fetch` if it does not (Cloudflare Workers work fine with either).
2. Create a new module `src/lib/resend.ts` (or equivalent) that exports a single `sendEmail({ to, subject, html, text })` function. It must read the API key from an environment variable `RESEND_API_KEY` — never hardcode it. Use the `from` address `Buzzyfly <hello@buzzyfly.com>` (or the owner's preferred address).
3. Update the fulfillment path so that after a successful payment and D1 order log, it calls `sendEmail` with: a branded HTML email containing the buyer's name, the product name, a signed download link to the R2 file (use an R2 presigned URL with a reasonable expiry, e.g. 7 days), a plain-text fallback, a receipt summary, and a soft upsell line pointing to the next product in the `UPSELL_MAP` from `monetization.ts`.
4. Wire the email opt-in confirmation: when someone subscribes via `EmailOptin.astro`, send the free checklist immediately (the first email in the sequence) and schedule or trigger the subsequent sequence emails per `emailSequence.ts`.
5. Wire the upsell sequence: after each purchase fulfillment email, ensure the next logical product pitch fires (checklist → onboarding kit → digital system → bundle) per the `UPSELL_MAP`.
6. Add error handling: if Resend fails, log the error to D1 (or console), do not crash the webhook, and do not tell the buyer the email failed — the order is still valid. Log enough detail that the owner can see failed sends in the admin console or via wrangler tail.
7. Add a `RESEND_API_KEY` entry to `.dev.vars.example` (or `.env.example`) with a placeholder, and document in the README how the owner sets the secret: `wrangler secret put RESEND_API_KEY`.

## Phase 3 — DNS and domain setup (document only, do not execute)

1. Document the DNS records the owner must add at their domain registrar for buzzyfly.com: an MX record pointing to Resend's mail servers (Resend provides these in their dashboard), a TXT record for SPF, a CNAME or TXT for DKIM, and a TXT for DMARC. Without these, emails will land in spam.
2. Document the Resend domain verification step: add buzzyfly.com in the Resend dashboard, copy the DNS records, add them, wait for verification.
3. Note that the free Resend tier allows 3,000 emails per month and 100 emails per day — sufficient for this store's current scale.

## Phase 4 — Deliverables

Write a report to `EMAIL-REPORT.md` in the repo root containing:

1. **Current state.** What the fulfillment and email paths did before this change, with file paths.
2. **What changed.** Every file created or modified, with a summary of each change.
3. **DNS checklist.** The exact records the owner must add, in order.
4. **Secrets checklist.** The exact wrangler commands to set `RESEND_API_KEY`.
5. **Test plan.** How to verify: trigger a test purchase in Stripe test mode, confirm the email arrives, confirm the download link works, confirm the upsell line is present.
6. **Next actions.** Anything left for the owner (DNS, secrets, Resend dashboard verification).

## Rules

- Do not rebuild the site. The Astro + Cloudflare stack stays.
- Do not remove or break Stripe checkout, D1, R2 delivery, or the admin console.
- Do not hardcode any API key. Environment variables only.
- Do not add third-party tracking pixels.
- Do not promise specific income results in any email copy.
- Do not invent testimonials or fake stats in email templates.
- Keep email HTML simple and compatible with major clients (Gmail, Outlook). Inline critical CSS. Provide a plain-text alternative.
- Prefer smaller changes when in doubt. If a module already exists for sending email, extend it rather than creating a duplicate.

Work through all four phases. End with EMAIL-REPORT.md committed to the repo.
