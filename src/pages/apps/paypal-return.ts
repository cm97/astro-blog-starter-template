import type { APIRoute } from "astro";
import { APPS_CURRENCY, APPS_PRICE, APPS_TOKEN_TTL_SECONDS } from "../../lib/appsAccess";
import { captureOrder, paypalConfigured } from "../../lib/paypal";
import { createDownloadToken } from "../../lib/fulfillment";
import { sendDeliveryEmail } from "../../lib/email";
import { BUZZYFLY_CONFIG } from "../../data/monetization";

export const prerender = false;

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;

function page(status: number, message: string): Response {
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly Apps Pro</title><style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}a{color:#23201a}</style></head><body><main><h1>Apps Pro</h1><p>${message}</p><p><a href="/apps/open/invoice-maker">Back to the apps</a></p></main></body></html>`;
	return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/**
 * PayPal sends the buyer back here (?token=<order id>). We capture the order server-side,
 * verify it really paid the right amount for Apps Pro, then hand the buyer a signed
 * access token via the existing /apps/unlock flow (and email them the same link).
 */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const orderId = url.searchParams.get("token") ?? "";
	if (!ORDER_ID.test(orderId)) return page(400, "That payment link is not valid.");
	if (!paypalConfigured(env)) return page(503, "PayPal checkout is not set up yet.");
	if (!env.DOWNLOAD_TOKEN_SECRET) {
		// Checked BEFORE capturing so we never take money we cannot fulfil.
		console.error("Buzzyfly apps: DOWNLOAD_TOKEN_SECRET missing; refusing to capture PayPal order", orderId);
		return page(500, "Checkout is temporarily unavailable. You have not been charged.");
	}

	let captured;
	try {
		captured = await captureOrder(env, orderId);
	} catch (error) {
		console.error("Buzzyfly apps: PayPal capture failed", orderId, error);
		return page(402, "We could not confirm your PayPal payment. If you were charged, contact us with this order: " + orderId);
	}

	const valid =
		captured.completed &&
		captured.customId === "apps-pro" &&
		captured.currency === APPS_CURRENCY &&
		Number(captured.amount) >= Number(APPS_PRICE);
	if (!valid) {
		console.error("Buzzyfly apps: PayPal order failed verification", JSON.stringify(captured));
		return page(402, "Your payment was not completed, so Apps Pro was not unlocked.");
	}

	const token = await createDownloadToken(
		{ orderId: captured.orderId, itemId: "apps-pro" },
		env.DOWNLOAD_TOKEN_SECRET,
		APPS_TOKEN_TTL_SECONDS,
	);
	const unlockUrl = `${BUZZYFLY_CONFIG.siteUrl}/apps/unlock?token=${token}`;

	// Best effort: a failed record or email must never block a paid buyer from getting in.
	if (env.DB) {
		try {
			await env.DB.prepare(
				`INSERT INTO fulfillments (provider, order_id, item_id, customer_email, created_at)
				 VALUES (?, ?, ?, ?, ?) ON CONFLICT (provider, order_id) DO NOTHING`,
			)
				.bind("paypal", captured.orderId, "apps-pro", captured.payerEmail, Date.now())
				.run();
		} catch (error) {
			console.error("Buzzyfly apps: could not record PayPal order", error);
		}
	}
	if (captured.payerEmail) {
		try {
			await sendDeliveryEmail(
				{ to: captured.payerEmail, downloadUrl: unlockUrl, productName: "Buzzyfly Apps Pro", orderId: captured.orderId, itemId: "apps-pro" },
				env,
			);
		} catch (error) {
			console.error("Buzzyfly apps: unlock email failed", error);
		}
	}

	return new Response(null, { status: 302, headers: { location: `/apps/unlock?token=${token}`, "cache-control": "no-store" } });
};
