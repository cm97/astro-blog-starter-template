import type { APIRoute } from "astro";
import { verifyDownloadToken } from "../../lib/fulfillment";
import { createOrder, paypalConfigured } from "../../lib/paypal";
import { PRODUCT_CURRENCY, findUpgrade, upgradeCustomId } from "../../lib/productCheckout";

export const prerender = false;

/**
 * Starts a PayPal checkout that upgrades a recent purchase to the next product for the
 * price difference. The buyer's signed download token is the proof they own the product
 * they're upgrading from, so the discount can't be had without buying first.
 */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const token = url.searchParams.get("token") ?? "";
	const owned = token && env.DOWNLOAD_TOKEN_SECRET ? await verifyDownloadToken(token, env.DOWNLOAD_TOKEN_SECRET) : null;
	const upgrade = owned ? findUpgrade(owned.itemId) : null;
	if (!upgrade) {
		// Expired or invalid link: the full-price product page still works.
		return new Response(null, { status: 302, headers: { location: "/products", "cache-control": "no-store" } });
	}
	if (!paypalConfigured(env)) {
		return new Response("PayPal checkout is not set up yet. Please try again soon.", { status: 503 });
	}

	try {
		const order = await createOrder(env, {
			itemId: upgradeCustomId(upgrade.from.id, upgrade.to.id),
			amount: upgrade.amount,
			currency: PRODUCT_CURRENCY,
			description: `Buzzyfly upgrade: ${upgrade.from.title} to ${upgrade.to.title}`,
			returnUrl: `${url.origin}/buy/paypal-return`,
			cancelUrl: `${url.origin}/products`,
		});
		return new Response(null, { status: 302, headers: { location: order.approveUrl, "cache-control": "no-store" } });
	} catch (error) {
		console.error("Buzzyfly upgrade: PayPal create order failed", upgrade.from.id, error);
		return new Response("Could not start PayPal checkout. Please try again.", { status: 502 });
	}
};
