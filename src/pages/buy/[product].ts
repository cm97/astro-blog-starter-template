import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG } from "../../data/monetization";
import { PRODUCT_CURRENCY, findSellableProduct } from "../../lib/productCheckout";
import { createOrder, paypalConfigured } from "../../lib/paypal";

export const prerender = false;

/** Starts a PayPal checkout for one digital product and sends the buyer to PayPal to approve it. */
export const GET: APIRoute = async ({ params, url, locals }) => {
	const product = findSellableProduct(params.product ?? "");
	if (!product) return new Response("Not found", { status: 404 });

	const env = locals.runtime.env;
	if (!paypalConfigured(env)) {
		// No working card checkout yet: send the buyer to a real email order instead of a dead button.
		const subject = encodeURIComponent(`Order: ${product.title}`);
		const body = encodeURIComponent(`Hi,\n\nI'd like to order the ${product.title} ($${product.amount}).\n\nPlease send payment details.\n\nThanks,\n`);
		return new Response(null, {
			status: 302,
			headers: { location: `mailto:${BUZZYFLY_CONFIG.orderEmail}?subject=${subject}&body=${body}`, "cache-control": "no-store" },
		});
	}

	try {
		const order = await createOrder(env, {
			itemId: product.id,
			amount: product.amount,
			currency: PRODUCT_CURRENCY,
			description: `Buzzyfly ${product.title}`,
			returnUrl: `${url.origin}/buy/paypal-return`,
			cancelUrl: `${url.origin}/products`,
		});
		return new Response(null, { status: 302, headers: { location: order.approveUrl, "cache-control": "no-store" } });
	} catch (error) {
		console.error("Buzzyfly buy: PayPal create order failed", product.id, error);
		return new Response("Could not start PayPal checkout. Please try again.", { status: 502 });
	}
};
