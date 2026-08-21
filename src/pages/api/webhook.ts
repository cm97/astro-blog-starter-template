import type { APIRoute } from "astro";
import { verifyLemonSqueezySignature, verifyStripeSignature } from "../../lib/webhookSecurity";
import {
	createDownloadToken,
	parseLemonSqueezyOrder,
	parseStripeOrder,
	resolveProductFile,
	type FulfillmentOrder,
} from "../../lib/fulfillment";
import { BUZZYFLY_CONFIG } from "../../data/monetization";
import { sendDeliveryEmail } from "../../lib/email";

// This endpoint must run on-demand (a Cloudflare Pages Function / Worker),
// never be statically prerendered, since it verifies a live request signature.
export const prerender = false;

/**
 * Buzzyfly payment webhook receiver. Accepts Lemon Squeezy and Stripe events,
 * verifies the request's HMAC signature with the Web Crypto API, and — on a
 * verified purchase — mints a short-lived signed download token pointing at
 * `/api/download` so the customer can retrieve their Buzzyfly digital asset
 * from the private R2 bucket without ever exposing the bucket itself, then
 * emails them that link.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const rawBody = await request.text();

	const stripeSignature = request.headers.get("stripe-signature");
	const lemonSqueezySignature = request.headers.get("x-signature");

	let order: FulfillmentOrder | null = null;

	if (stripeSignature) {
		if (!env.STRIPE_WEBHOOK_SECRET) {
			console.error("Buzzyfly webhook: STRIPE_WEBHOOK_SECRET is not configured");
			return new Response("Webhook not configured", { status: 500 });
		}
		const valid = await verifyStripeSignature(
			rawBody,
			stripeSignature,
			env.STRIPE_WEBHOOK_SECRET,
		);
		if (!valid) return new Response("Invalid signature", { status: 401 });

		order = parseStripeOrder(JSON.parse(rawBody));
	} else if (lemonSqueezySignature) {
		if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) {
			console.error("Buzzyfly webhook: LEMONSQUEEZY_WEBHOOK_SECRET is not configured");
			return new Response("Webhook not configured", { status: 500 });
		}
		const valid = await verifyLemonSqueezySignature(
			rawBody,
			lemonSqueezySignature,
			env.LEMONSQUEEZY_WEBHOOK_SECRET,
		);
		if (!valid) return new Response("Invalid signature", { status: 401 });

		order = parseLemonSqueezyOrder(JSON.parse(rawBody));
	} else {
		return new Response("Unrecognized webhook source", { status: 400 });
	}

	// Event type we don't act on (e.g. a Stripe event other than checkout
	// completion, or a Lemon Squeezy event other than order_created).
	// Acknowledge with 200 so the provider doesn't retry indefinitely.
	if (!order) {
		return new Response(JSON.stringify({ received: true, fulfilled: false }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}

	const productFile = resolveProductFile(order.itemId);
	if (!productFile) {
		console.error(`Buzzyfly webhook: no product file mapped for item ${order.itemId}`);
		return new Response(JSON.stringify({ received: true, fulfilled: false }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}

	if (!env.DOWNLOAD_TOKEN_SECRET) {
		console.error("Buzzyfly webhook: DOWNLOAD_TOKEN_SECRET is not configured");
		return new Response("Fulfillment not configured", { status: 500 });
	}

	const downloadToken = await createDownloadToken(order, env.DOWNLOAD_TOKEN_SECRET);
	const downloadUrl = `${BUZZYFLY_CONFIG.siteUrl}/api/download?token=${downloadToken}`;

	// Deliver the link to the customer. Until this existed, the URL was only
	// written to the console and returned in the HTTP response body — and that
	// response goes to Stripe, not to the buyer. Payment succeeded, the customer
	// received nothing, and no error appeared anywhere to signal it.
	const delivery = await sendDeliveryEmail(
		{
			to: order.customerEmail ?? "",
			downloadUrl,
			productName: productFile.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
			orderId: order.orderId,
		},
		env,
	);

	if (!delivery.sent) {
		// Deliberately loud: someone has paid and is waiting, so this must not
		// read like a normal fulfillment in the logs. We still return 200 so the
		// provider doesn't retry and mint a second token — recover by re-sending
		// from the fulfillments record rather than by replaying the webhook.
		console.error(
			`Buzzyfly webhook: DELIVERY FAILED for order ${order.orderId} (${order.customerEmail ?? "no email"}): ${delivery.reason}. Download URL: ${downloadUrl}`,
		);
	}

	// Best-effort fulfillment record. D1 is optional — the webhook still
	// succeeds if the `DB` binding isn't configured for this environment.
	if (env.DB) {
		try {
			await env.DB.prepare(
				`INSERT INTO fulfillments (provider, order_id, item_id, customer_email, created_at)
				 VALUES (?, ?, ?, ?, ?)`,
			)
				.bind(order.provider, order.orderId, order.itemId, order.customerEmail, Date.now())
				.run();
		} catch (error) {
			console.error("Buzzyfly webhook: failed to record fulfillment in D1", error);
		}
	}

	console.log(
		`Buzzyfly webhook: fulfilled order ${order.orderId} (${order.itemId}) for ${order.customerEmail ?? "unknown email"} -> delivered=${delivery.sent}`,
	);

	return new Response(
		JSON.stringify({ received: true, fulfilled: true, delivered: delivery.sent }),
		{ status: 200, headers: { "content-type": "application/json" } },
	);
};
