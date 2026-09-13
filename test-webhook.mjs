#!/usr/bin/env node
/**
 * Fires a signed Stripe checkout.session.completed event at the live webhook.
 * Uses the real STRIPE_WEBHOOK_SECRET so the signature check passes exactly
 * as it would with a genuine Stripe delivery.
 */

import { createHmac } from "node:crypto";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  console.error("Set STRIPE_WEBHOOK_SECRET env var before running.");
  console.error("  STRIPE_WEBHOOK_SECRET=whsec_... node test-webhook.mjs");
  process.exit(1);
}
const ENDPOINT = "https://buzzyfly.com/api/webhook";
const CUSTOMER_EMAIL = "coachmanager@gmail.com"; // real address — email will actually arrive
const ITEM_ID = "buzzyfly-digital-system";
const FAKE_SESSION_ID = "cs_test_webhook_smoke_" + Date.now();

const payload = JSON.stringify({
  id: "evt_test_smoke_" + Date.now(),
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: FAKE_SESSION_ID,
      object: "checkout.session",
      payment_status: "paid",
      status: "complete",
      amount_total: 4900,
      currency: "usd",
      customer_details: {
        email: CUSTOMER_EMAIL,
        name: "Test Buyer",
      },
      metadata: {
        item_id: ITEM_ID,
      },
    },
  },
});

// Stripe signature: "t=<unix_seconds>,v1=<hmac_sha256(t.payload, secret)>"
const secret = WEBHOOK_SECRET.replace(/^whsec_/, "");
const timestamp = Math.floor(Date.now() / 1000);
const signed = createHmac("sha256", Buffer.from(secret, "base64"))
  .update(`${timestamp}.${payload}`)
  .digest("hex");
const stripeSignature = `t=${timestamp},v1=${signed}`;

console.log("Sending test webhook to:", ENDPOINT);
console.log("  item_id:  ", ITEM_ID);
console.log("  email:    ", CUSTOMER_EMAIL);
console.log("  order_id: ", FAKE_SESSION_ID);
console.log();

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Stripe-Signature": stripeSignature,
  },
  body: payload,
});

const body = await res.text();
console.log("HTTP status:", res.status);
console.log("Response:  ", body);

if (res.status === 200) {
  const json = JSON.parse(body);
  if (json.fulfilled && json.delivered) {
    console.log("\n✓ PASS — order fulfilled and delivery email sent.");
    console.log("Check coachmanager@gmail.com for the download link.");
  } else if (json.fulfilled && !json.delivered) {
    console.log("\n⚠ PARTIAL — order recorded in D1 but delivery email failed.");
    console.log("  EMAIL binding may not be active yet, or domain DNS is still propagating.");
  } else {
    console.log("\n✗ FAIL — webhook received but order was not fulfilled.");
    console.log("  Check Worker logs in the Cloudflare dashboard for details.");
  }
} else {
  console.log("\n✗ FAIL — webhook returned non-200. Check the status above.");
}
