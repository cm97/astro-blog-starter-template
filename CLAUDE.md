# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Astro blog ("Buzzyfly") deployed as a Cloudflare Worker, extended beyond the stock Astro blog starter with a small digital-product monetization stack: Stripe/Lemon Squeezy webhook handling, gated file delivery via R2, and a newsletter opt-in backed by D1.

## Commands

```bash
npm run dev              # Astro dev server at localhost:4321
npm run build             # astro build -> ./dist/
npm run preview           # build, then run under `wrangler dev` (real Workers runtime, bindings included)
npm run check              # astro build && tsc && wrangler deploy --dry-run (full pre-deploy check)
npm run deploy             # wrangler deploy (publishes the Worker)
npm run cf-typegen         # regenerate worker-configuration.d.ts (Env type) from wrangler.json
npm run astro -- <cmd>     # run any Astro CLI command, e.g. `npm run astro -- check`
npx wrangler tail          # tail real-time Worker logs
```

There is no test suite and no lint script configured in this repo.

Because `src/pages/api/*` routes read `locals.runtime.env` (Cloudflare bindings), they only work under `wrangler dev`/`preview`, not plain `astro dev` — use `npm run preview` when testing webhook/download/subscribe behavior end-to-end.

## Local secrets

Copy `.dev.vars.example` to `.dev.vars` (gitignored) for local `wrangler dev`/`preview` testing:

- `STRIPE_WEBHOOK_SECRET`, `LEMONSQUEEZY_WEBHOOK_SECRET` — webhook signature verification
- `DOWNLOAD_TOKEN_SECRET` — HMAC key for signed download tokens
- `NEWSLETTER_API_URL`, `NEWSLETTER_API_KEY` — optional external ESP forwarding (subscribe still works without these; it just skips the forward)

In production these are set as Worker secrets (not in `wrangler.json`).

## Architecture

**Rendering model**: Astro pages default to static prerendering. The three files under `src/pages/api/` each set `export const prerender = false` because they need to run per-request on the Worker (reading live bindings, verifying request signatures). Any new server route must do the same.

**Cloudflare bindings** (declared in `wrangler.json`, typed via `Env` in `worker-configuration.d.ts`, accessed as `locals.runtime.env` per `src/env.d.ts`):
- `DB` (D1) — `fulfillments` and `subscribers` tables, written to by `/api/webhook` and `/api/subscribe`. **No migration files exist in this repo** — these tables must be created out-of-band against the `buzzy-fly_db` database before those code paths will succeed. Both writes are wrapped in try/catch and treated as best-effort: a missing `DB` binding or failed insert never fails the request.
- `MY_PRODUCTS` (R2, bucket `buzzyfly-products`) — private digital-product files, only ever read by `/api/download`, never exposed directly.

**Monetization/fulfillment flow** (`src/lib/webhookSecurity.ts`, `src/lib/fulfillment.ts`, `src/data/monetization.ts`, `src/pages/api/{webhook,download}.ts`):
1. `POST /api/webhook` receives a Stripe or Lemon Squeezy event, distinguished by which signature header is present (`stripe-signature` vs `x-signature`).
2. The raw body is verified with the matching HMAC scheme in `webhookSecurity.ts` (both implemented with Web Crypto `crypto.subtle`, no SDK dependency — required for the Workers runtime).
3. `fulfillment.ts` parses the provider-specific payload into a normalized `FulfillmentOrder`, then looks up the purchased `itemId` in `PRODUCT_FILE_MAP` (`src/data/monetization.ts`) to find its R2 key.
4. On a match, `createDownloadToken` mints a signed, expiring (default 3-day) token — an HMAC-signed base64url JSON payload, not a database session — and returns a `/api/download?token=...` URL.
5. `GET /api/download` verifies that token (`verifyDownloadToken`) and streams the object straight from the private `MY_PRODUCTS` bucket; the bucket is never public.
6. To sell a new digital product: add its Stripe price/product ID or Lemon Squeezy variant ID as a key in `PRODUCT_FILE_MAP`, pointing at the R2 object key and download filename.

All Buzzyfly-specific branding/copy (site name, default product info, newsletter copy) is centralized in `BUZZYFLY_CONFIG` (`src/data/monetization.ts`) — pull from there rather than hardcoding strings in components.

**Newsletter opt-in**: `EmailOptin.astro` renders a form that progressively enhances into a JS `fetch` (falls back to a plain HTML form POST if JS is unavailable). `POST /api/subscribe` accepts either JSON or form-encoded input, writes to the D1 `subscribers` table if `DB` is bound, and forwards the lead to an external provider only if both `NEWSLETTER_API_URL` and `NEWSLETTER_API_KEY` are set.

**Content collections**: Blog posts live in `src/content/blog/*.{md,mdx}`, loaded and schema-validated in `src/content.config.ts`. The frontmatter schema includes optional `featuredProduct*` fields; when a post sets `featuredProductTitle` or `featuredProductUrl`, `src/layouts/BlogPost.astro` renders a `ProductCallout` promoting that product beneath the post body, followed by the `EmailOptin` form on every post.

**Routing**: File-based via `src/pages/`. `src/pages/blog/[...slug].astro` renders individual posts through `BlogPost.astro`; `src/pages/blog/index.astro` lists them; `src/pages/rss.xml.js` generates the RSS feed from the same collection.

**Adapter config**: `astro.config.mjs` wires up `@astrojs/cloudflare` with `platformProxy.enabled: true`, which is what makes Cloudflare bindings available locally under `wrangler dev`/`astro dev` via `Astro.locals.runtime`.
