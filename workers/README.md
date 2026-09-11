# Buzzyfly Workers

Four Cloudflare Workers that run the revenue machine:

1. **buzzyfly-fulfillment** — serves the $49 zip, rate-limits downloads, logs to D1.
2. **buzzyfly-checkout** — creates Stripe Checkout sessions, handles webhooks, records paid orders.
3. **buzzyfly-analytics** — tracks pageviews and events, exposes a simple dashboard endpoint.
4. **buzzyfly-email** — captures opt-in emails, sends the free checklist via Resend.

All share one D1 database (`buzzyfly-db`) and the R2 bucket (`buzzyfly-assets`).

Deploy each with:
```
npx wrangler deploy
```
from its own folder after filling in the D1 database id and secrets.
