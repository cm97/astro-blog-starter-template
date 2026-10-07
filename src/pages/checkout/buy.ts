import type { APIRoute } from "astro";
import { PRODUCT_CURRENCY, isProduct, productInfo, productPrice } from "../../lib/productAccess";
import { createOrder, paypalConfigured } from "../../lib/paypal";

export const prerender = false;

/** Starts a PayPal checkout for one digital product (?product=<id>) and sends the buyer to PayPal. */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const itemId = url.searchParams.get("product");
	const amount = isProduct(itemId) ? productPrice(itemId) : null;
	if (!isProduct(itemId) || !amount) return new Response("Unknown product", { status: 404 });
	if (!paypalConfigured(env)) {
		return new Response("PayPal checkout is not set up yet. Please try again soon.", { status: 503 });
	}
	try {
		const order = await createOrder(env, {
			itemId,
			amount,
			currency: PRODUCT_CURRENCY,
			description: `Buzzyfly ${productInfo(itemId)?.title ?? itemId}`,
			returnUrl: `${url.origin}/checkout/paypal-return`,
			cancelUrl: `${url.origin}/products`,
		});
		return new Response(null, { status: 302, headers: { location: order.approveUrl, "cache-control": "no-store" } });
	} catch (error) {
		console.error("Buzzyfly checkout: PayPal create order failed", itemId, error);
		return new Response("Could not start PayPal checkout. Please try again.", { status: 502 });
	}
};
