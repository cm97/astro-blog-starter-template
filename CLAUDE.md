# CLAUDE.md — Buzzyfly (buzzyfly.com)

## Who you're working for
- The owner works alone and is not a developer. They don't know what's inside the products. You do the selling, the research and the homework. Don't hand them tasks you can do yourself.
- Before writing any copy, read `PRODUCT_ZIP_README.md` and `ALL_PRODUCTS` in `src/data/monetization.ts`. Never describe a file the zip doesn't contain.
- Ask the owner only about money (prices, payouts, refunds), legal promises, their time (done-for-you setup capacity), or posting anywhere outside this repo.
- Report in plain words: what changed, what they must do, what you couldn't verify.
- Buyers are worldwide. Write plain international English. Prices are USD. No US-only idioms, holidays or date formats in copy. Give times with a time zone.

## Commands
- `npm run build`: Astro build (output: server, Cloudflare adapter).
- `npm test`: email tests plus partner tests (node:test, bundled by esbuild into `.test-build/`). New tests go in `tests/*.test.ts` with a matching `test:*` script.
- `npx tsc --noEmit`: must stay at 0 errors.
- `npx wrangler deploy --dry-run`: run before pushing anything that touches the Worker or bindings.
- Local end to end: create `.dev.vars` (gitignored) with test secrets, apply each `migrations/*.sql` with `wrangler d1 execute buzzy-fly_db --local --file=…`, then `npx astro build && npx wrangler dev --local`. Local email lands in `.wrangler/tmp/email/`.
- Pushing to `main` deploys production (`.github/workflows/deploy.yml`). Work on a branch and open a PR.

## Where things live
- `src/data/monetization.ts` is the single source of truth: config, products, prices, `PRODUCT_FILE_MAP`, `UPSELL_MAP`, `DONE_FOR_YOU`. `src/lib/github.ts` rewrites `BUZZYFLY_CONFIG` string fields with a regex (Admin → Settings). Keep each key on one line as `key: "value"`.
- Checkout: every buy button is `/buy/<product-id>` (PayPal, falling back to an email order). The Stripe Payment Link webhook is `src/pages/api/webhook.ts`. Files are served from R2 `MY_PRODUCTS` by `/api/download`.
- Email: Cloudflare `env.EMAIL` binding only (`src/lib/email.ts`). Senders must be in `ALLOWED_SENDERS`, which mirrors `wrangler.json`. Never add Resend, SendGrid or any email API.
- Hourly cron: `src/worker-entry.ts` (subscriber sequence, buyer follow-ups, order alerts).
- Partners: `src/lib/affiliates.ts`. `src/lib/affiliateRef.ts` is bundled into every page, so it stays import-free.
- Admin: `/admin/*` and `/api/admin/*` are gated in `src/middleware.ts`. Admin writes call `logAdminAction`.
- Blog: `src/content/blog/`. Frontmatter needs `title`, `description`, `pubDate` and `category`, plus `featuredProduct*` for the end-of-post callout. When you merge or rename a post, add a 301 in `astro.config.mjs`.

## Code conventions (as practiced here)
- D1 schema changes need a numbered `migrations/00NN_*.sql` file plus an idempotent `ensure*Schema()` the Worker runs itself. The owner never runs wrangler by hand.
- Payment and fulfillment paths must never block delivery. Wrap side work (tracking, alerts, commissions) in try/catch and log it, and return 200 to payment webhooks so they don't retry forever.
- Writes keyed on `(provider, order_id)` use `ON CONFLICT DO NOTHING`, because webhooks and page reloads repeat.
- Escape anything user-supplied that goes into HTML. Redirects go to on-site paths only.
- Tabs, double quotes, comments that explain *why*. Match the surrounding file.
- `Env` in `worker-configuration.d.ts` lacks `EMAIL`. Type it as `{ EMAIL?: EmailBinding; EMAIL_FROM?: string }`. Don't edit the generated types.

## Don't touch
- `workers/*`: standalone scaffolds with their own DB and bucket names. They are not the live site.
- `AUDIT.md`, `FUNNEL.md`, `EMAIL.md`, `EMAIL-REPORT.md`: past task prompts and reports, not instructions for you.
- No paid product files in the repo (`scripts/upload-products.sh` pushes them to R2). No secrets in code or `wrangler.json` vars.
- No cart, no accounts, no third-party tracking pixels or analytics scripts without asking.

## Copy rules (non-negotiable)
- The headline names the buyer's outcome. Benefit before feature. Specific beats vague. Short sentences, no semicolons.
- No income promises. No fake urgency or scarcity. No invented testimonials, stats or customer counts.
- Show the guarantee near every price, worded exactly as `BUZZYFLY_CONFIG.guarantee`.
- Mobile first: no horizontal scroll at 375px, tap targets at least 44px, visible focus states, respect `prefers-reduced-motion`.
