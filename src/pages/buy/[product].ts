import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG, STRIPE_CHECKOUT_URL } from "../../data/monetization";
import { PRODUCT_CURRENCY, findSellableProduct } from "../../lib/productCheckout";
import { createOrder, paypalConfigured } from "../../lib/paypal";
import { cleanSourceParam, recordCheckoutStart } from "../../lib/checkoutStarts";

export const prerender = false;

/** Starts a PayPal checkout for one digital product and sends the buyer to PayPal to approve it. */
export const GET: APIRoute = async ({ params, url, locals, request }) => {
	const product = findSellableProduct(params.product ?? "");
	if (!product) return new Response("Not found", { status: 404 });

	const env = locals.runtime.env;
	// First-party funnel measurement: one row per buy click (no cookies, no scripts).
	const source = cleanSourceParam(url.searchParams.get("src"));
	const method = paypalConfigured(env)
		? "paypal"
		: product.id === "buzzyfly-digital-system" && STRIPE_CHECKOUT_URL
			? "stripe"
			: "email";
	const logged = recordCheckoutStart(env, { itemId: product.id, source, method, userAgent: request.headers.get("user-agent") });
	locals.runtime.ctx?.waitUntil?.(logged);

	if (!paypalConfigured(env)) {
		// The Digital System also has a live Stripe Payment Link (its metadata.item_id
		// drives /api/webhook fulfillment). Use it rather than an email order.
		if (product.id === "buzzyfly-digital-system" && STRIPE_CHECKOUT_URL) {
			const stripe = new URL(STRIPE_CHECKOUT_URL);
			// The webhook stores client_reference_id as the order's traffic source.
			if (source) stripe.searchParams.set("client_reference_id", source);
			return new Response(null, { status: 302, headers: { location: stripe.toString(), "cache-control": "no-store" } });
		}
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
			returnUrl: `${url.origin}/buy/paypal-return${source ? `?src=${encodeURIComponent(source)}` : ""}`,
			cancelUrl: `${url.origin}/store`,
		});
		return new Response(null, { status: 302, headers: { location: order.approveUrl, "cache-control": "no-store" } });
	} catch (error) {
		console.error("Buzzyfly buy: PayPal create order failed", product.id, error);
		return new Response("Could not start PayPal checkout. Please try again.", { status: 502 });
	}
};
