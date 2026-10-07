import type { APIRoute } from "astro";
import { APPS_CURRENCY, APPS_PRICE } from "../../lib/appsAccess";
import { createOrder, paypalConfigured } from "../../lib/paypal";

export const prerender = false;

/** Starts a PayPal checkout for Apps Pro and sends the buyer to PayPal to approve it. */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	if (!paypalConfigured(env)) {
		return new Response("PayPal checkout is not set up yet. Please try again soon.", { status: 503 });
	}
	try {
		const order = await createOrder(env, {
			itemId: "apps-pro",
			amount: APPS_PRICE,
			currency: APPS_CURRENCY,
			description: "Buzzyfly Apps Pro: 7 business apps",
			returnUrl: `${url.origin}/apps/paypal-return`,
			cancelUrl: `${url.origin}/apps-pro`,
		});
		return new Response(null, { status: 302, headers: { location: order.approveUrl, "cache-control": "no-store" } });
	} catch (error) {
		console.error("Buzzyfly apps: PayPal create order failed", error);
		return new Response("Could not start PayPal checkout. Please try again.", { status: 502 });
	}
};
