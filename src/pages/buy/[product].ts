import type { APIRoute } from "astro";
import { PRODUCT_CURRENCY, findSellableProduct } from "../../lib/productCheckout";
import { createOrder, paypalConfigured } from "../../lib/paypal";
import { cleanSourceTriple } from "../../lib/trafficSource";

export const prerender = false;

/** Starts a PayPal checkout for one web-app product and sends the buyer to PayPal to approve it. */
export const GET: APIRoute = async ({ params, url, locals }) => {
	const product = findSellableProduct(params.product ?? "");
	if (!product) return new Response("Not found", { status: 404 });

	const env = locals.runtime.env;
	// PayPal not set up (or down): send the buyer to the Stripe checkout instead of a dead end.
	const toStripe = () => new Response(null, { status: 302, headers: { location: product.buyUrl, "cache-control": "no-store" } });
	if (!paypalConfigured(env)) return toStripe();

	try {
		const order = await createOrder(env, {
			itemId: product.id,
			amount: product.amount,
			currency: PRODUCT_CURRENCY,
			description: `Buzzyfly ${product.title}`,
			returnUrl: `${url.origin}/buy/paypal-return`,
			cancelUrl: `${url.origin}/store`,
			// Set by TrafficSource.astro from the visitor's utm_* params.
			source: cleanSourceTriple(url.searchParams.get("src")),
		});
		return new Response(null, { status: 302, headers: { location: order.approveUrl, "cache-control": "no-store" } });
	} catch (error) {
		console.error("Buzzyfly buy: PayPal create order failed", product.id, error);
		return toStripe();
	}
};
