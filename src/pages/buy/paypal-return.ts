import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG } from "../../data/monetization";
import { appKeyForOrder, appKeyUrl, appPath } from "../../lib/appAccess";
import { sendDeliveryEmail } from "../../lib/email";
import { captureOrder, paypalConfigured } from "../../lib/paypal";
import { PRODUCT_CURRENCY, findSellableProduct } from "../../lib/productCheckout";

export const prerender = false;

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function page(status: number, title: string, body: string): Response {
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly order</title><style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}a{color:#23201a}</style></head><body><main><h1>${escape(title)}</h1>${body}</main></body></html>`;
	return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

const message = (status: number, text: string) =>
	page(status, "Your order", `<p>${escape(text)}</p><p><a href="/store">Back to the store</a></p>`);

/**
 * PayPal sends the buyer back here (?token=<order id>). We capture the order server-side,
 * check it paid the full price of the app it names, then issue an app key (the same kind
 * a Stripe purchase gets), email the key link as a backup and open the app.
 */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const orderId = url.searchParams.get("token") ?? "";
	if (!ORDER_ID.test(orderId)) return message(400, "That payment link is not valid.");
	if (!paypalConfigured(env)) return message(503, "PayPal checkout is not set up yet.");
	if (!env.DB) {
		// App keys live in D1. Checked BEFORE capturing so we never take money we cannot fulfil.
		console.error("Buzzyfly buy: DB binding missing; refusing to capture PayPal order", orderId);
		return message(500, "Checkout is temporarily unavailable. You have not been charged.");
	}

	let captured;
	try {
		captured = await captureOrder(env, orderId);
	} catch (error) {
		console.error("Buzzyfly buy: PayPal capture failed", orderId, error);
		return message(402, `We could not confirm your PayPal payment. If you were charged, email ${BUZZYFLY_CONFIG.supportEmail} with order ${orderId}.`);
	}

	const product = captured.customId ? findSellableProduct(captured.customId) : null;
	const valid =
		product !== null &&
		captured.completed &&
		captured.currency === PRODUCT_CURRENCY &&
		Number(captured.amount) >= Number(product.amount);
	if (!valid || !product) {
		console.error("Buzzyfly buy: PayPal order failed verification", JSON.stringify(captured));
		return message(402, "Your payment was not completed, so the app was not unlocked.");
	}

	// Record the order first. Only the visit that first records it sends the email,
	// so reloading this page does not resend it. A failed write must never block a paid buyer.
	let firstVisit = true;
	try {
		const result = await env.DB.prepare(
			`INSERT INTO fulfillments (provider, order_id, item_id, customer_email, created_at)
			 VALUES (?, ?, ?, ?, ?) ON CONFLICT (provider, order_id) DO NOTHING`,
		)
			.bind("paypal", captured.orderId, product.id, captured.payerEmail, Date.now())
			.run();
		firstVisit = (result.meta?.changes ?? 1) > 0;
		// Separate, best-effort: a missing source column must never lose the order record.
		if (firstVisit && captured.source) {
			await env.DB.prepare(`UPDATE fulfillments SET source = ? WHERE provider = ? AND order_id = ?`)
				.bind(captured.source, "paypal", captured.orderId)
				.run()
				.catch((error) => console.error("Buzzyfly buy: failed to record source", error));
		}
	} catch (error) {
		console.error("Buzzyfly buy: could not record PayPal order", error);
	}

	let key: string | null = null;
	try {
		key = await appKeyForOrder(env, { orderId: captured.orderId, itemId: product.id, customerEmail: captured.payerEmail });
	} catch (error) {
		console.error("Buzzyfly buy: could not issue app key", captured.orderId, error);
	}
	if (!key) {
		return message(
			500,
			`Your payment went through, but we couldn't open the app just now. Email ${BUZZYFLY_CONFIG.supportEmail} with order ${captured.orderId} and we'll send your access link.`,
		);
	}

	if (firstVisit && captured.payerEmail) {
		try {
			const sent = await sendDeliveryEmail(
				{
					to: captured.payerEmail,
					downloadUrl: appKeyUrl(key, product.id),
					productName: product.title,
					orderId: captured.orderId,
					itemId: product.id,
				},
				env,
			);
			if (!sent.sent)
				console.error(`Buzzyfly buy: access email not sent for order ${captured.orderId} to ${captured.payerEmail}: ${sent.reason}`);
		} catch (error) {
			console.error("Buzzyfly buy: access email failed", error);
		}
	}

	// The app stores the key in its cookie and redirects to the clean URL.
	return new Response(null, {
		status: 302,
		headers: { location: `${appPath(product.id)}?key=${key}`, "cache-control": "no-store" },
	});
};
