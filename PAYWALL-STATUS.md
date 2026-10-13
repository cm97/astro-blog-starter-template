# Paywall Status — Buzzyfly

**Last verified:** 2026-10-13

## The paywall is the site, not the repo

Buzzyfly sells through Stripe Payment Links and the Cloudflare Worker at buzzyfly.com. Nobody can buy anything from the GitHub repo — there are no product files in it, and the paid zips live in the private R2 bucket `buzzyfly-products`, served only through signed download tokens at `/api/download`.

## Repo visibility

- Current: **public** (confirmed via GitHub API, 2026-10-13)
- Owner: cm97 (admin)
- No forks, 0 stars, 0 watchers
- The only collaborator is cm97

### Why it was created public

The repo was created 2026-07-22 from the public Cloudflare `astro-blog-starter-template`. It was never switched to private in this session or any prior session — no tool in the connected GitHub connector can change repository visibility (no update-repo-settings tool exists; the only visibility control is the `private` flag on *create_repository*, which applies to new repos only).

### How to make it private (30 seconds, owner action)

1. Go to https://github.com/cm97/astro-blog-starter-template/settings
2. Danger Zone → **Change repository visibility** → **Make private**
3. Confirm. Stars/watchers are erased (there are none), forks are detached (there are none), GitHub Pages is unpublished (none configured).

### What making it private does NOT do

- It does not change what buyers see. Buyers never touch GitHub.
- It does not hide the live site at buzzyfly.com.
- It does not affect Stripe, R2, email, or the worker.

## What actually protects the money

| Layer | Status | Notes |
| --- | --- | --- |
| Stripe Payment Links | Live | $49 Digital System, $29 Onboarding Kit, $15 Reset, $19 Templates, $97 Bundle |
| R2 bucket `buzzyfly-products` | Private | No public access, no custom domains. Only `products/` prefix is served via signed tokens |
| Download tokens | Wired | `/api/download` requires a valid token; bare GET returns "Missing download token" |
| Webhook | Wired in code | `/api/webhook` verifies Stripe signature, records order in D1, mails delivery link |
| Email Service | Configured | `orders@` and `hello@` allowed senders; Cloudflare DKIM/MX/SPF present for buzzyfly.com |
| Admin console | `/admin` | Username/password protected, separate from the public site |

## Open cash items

1. **Three product zips missing from R2:** `products/weekly-reset-checklist.zip`, `products/follow-up-email-templates.zip`, `products/complete-business-bundle.zip`. Buyers of those three get a dead download link. Upload with `scripts/upload-products.sh <folder>`.
2. **Repo visibility:** flip to private via the Danger Zone link above if you want the code hidden. Not a revenue blocker.
3. **Stripe webhook endpoint:** confirm in the Stripe dashboard it points at `https://buzzyfly.com/api/webhook` with the signing secret matching the worker binding.

## Bottom line

The money is protected by Stripe + signed R2 tokens + the worker. The public repo exposes source code only — no products, no keys, no customer data. Making it private is hygiene, not a cash fix.
