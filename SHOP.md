# Buzzyfly shop & admin console

How the storefront works, how to set it up, and how to add something for sale.

## What changed

Before this, the payment plumbing existed (Stripe / Lemon Squeezy webhooks, R2
storage, signed download links, delivery email) but there was **no catalog**.
The only product was a hardcoded entry in `src/data/monetization.ts`, nothing
rendered it, and the homepage was four lines of text.

Now:

- Products live in the **D1 database** and are managed from a web admin console.
- The **landing page** renders whatever is published, with prices and buy buttons.
- Landing page **copy is editable** without a deploy.
- Adding a product is a form, not a code change.

## One-time setup

### 1. Apply the migration

```bash
npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0002_products_and_admin.sql
```

This creates `products`, `product_item_ids`, `site_content`, and
`admin_login_attempts`, and seeds the existing `buzzyfly-digital-system` entry as
a **draft** so it doesn't appear on the live site until you've reviewed it.

### 2. Set the admin secrets

```bash
npx wrangler secret put ADMIN_PASSWORD        # what you type to sign in
npx wrangler secret put ADMIN_SESSION_SECRET  # long random string; signs your session cookie
```

Both are required — the console refuses every login until they exist. Generate
the session secret with something like `openssl rand -base64 32`. You never type
it; rotating it just signs everyone out.

### 3. Deploy

```bash
npm run deploy
```

Then open `https://buzzyfly.com/admin`.

## Adding a product

1. **Admin → Products → Add a product.** Title, price, short description,
   bullet points. Save. It starts as a draft.
2. **Upload the file** customers receive. It goes into the private
   `buzzyfly-products` R2 bucket — never public, only ever served through a
   signed link that expires after 3 days.
3. **Create the product in Stripe or Lemon Squeezy** and paste its hosted
   checkout link into the **Checkout link** field.
4. **In Stripe**, set `metadata.item_id` on the Checkout Session to the
   product's slug. This is how a payment gets matched to a file. If you'd rather
   match on a Stripe `price_id` or a Lemon Squeezy variant ID, add it under
   **Extra payment IDs** instead.
5. **Set status to Live.** It appears on the landing page immediately.

A product can't be published without a checkout link — otherwise the card would
render a dead "Coming soon" button. The dashboard also warns loudly if a live
product has no file attached, since that means a buyer would be charged and
receive nothing.

## Editing the landing page

**Admin → Landing page.** Brand name, headline, sub-headline, button text,
section headings, and the empty-shop message. Changes appear within a minute
(the homepage is cached with `s-maxage=60`). Clearing a field restores its
built-in default rather than leaving a blank section.

To add a new editable field, add one entry to `SITE_CONTENT_FIELDS` in
`src/data/siteDefaults.ts` — the admin form and the landing page both read from
that array, so there's no second place to update.

## Security notes

- `/admin/*` and `/api/admin/*` are guarded in `src/middleware.ts`, so a new
  admin page is protected by default rather than by remembering to add a check.
- The session cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, and HMAC-signed;
  it expires after 12 hours.
- Astro's origin check (on by default for on-demand routes) covers the admin
  form posts against CSRF.
- The password comparison is constant-time, and failed logins are throttled per
  IP — 5 failures locks that IP out for 15 minutes.
- The R2 bucket is never public. Every download goes through
  `/api/download` with a signed, expiring token.
- Secret *values* are never rendered anywhere in the console — the dashboard
  checklist only reports whether each one is present.

## How fulfillment resolves a purchase

```
webhook → verify signature → item_id
        → product_item_ids lookup  (Stripe price_id / LS variant id)
        → products table by slug   (fallback)
        → PRODUCT_FILE_MAP         (legacy, pre-catalog checkout links)
        → sign download token → email link → /api/download → R2
```

`src/data/monetization.ts` is kept only as that last fallback so any checkout
link created before the catalog existed still delivers. New products should be
created in the admin console.
