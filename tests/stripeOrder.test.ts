import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStripeOrder } from "../src/lib/fulfillment";

const event = (session: Record<string, unknown>) => ({
	type: "checkout.session.completed",
	data: { object: { id: "cs_live_abc", mode: "payment", payment_status: "paid", currency: "usd", ...session } },
});

test("metadata.item_id wins when present", () => {
	assert.equal(parseStripeOrder(event({ metadata: { item_id: "client-onboarding-kit" }, amount_total: 4900 }))?.itemId, "client-onboarding-kit");
});

test("untagged Payment Links resolve by price", () => {
	assert.equal(parseStripeOrder(event({ amount_subtotal: 1500 }))?.itemId, "weekly-reset-checklist");
	assert.equal(parseStripeOrder(event({ amount_subtotal: 1900 }))?.itemId, "follow-up-email-templates");
	assert.equal(parseStripeOrder(event({ amount_subtotal: 2900 }))?.itemId, "client-onboarding-kit");
	assert.equal(parseStripeOrder(event({ amount_total: 4900 }))?.itemId, "buzzyfly-digital-system");
});

test("no guess for unpaid, subscriptions, other currencies or unknown prices", () => {
	assert.equal(parseStripeOrder(event({ amount_subtotal: 4900, payment_status: "unpaid" })), null);
	assert.equal(parseStripeOrder(event({ amount_subtotal: 500, mode: "subscription" })), null);
	assert.equal(parseStripeOrder(event({ amount_subtotal: 4900, currency: "eur" })), null);
	assert.equal(parseStripeOrder(event({ amount_subtotal: 1234 })), null);
});
