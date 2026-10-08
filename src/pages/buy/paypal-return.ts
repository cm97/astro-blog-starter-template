import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG } from "../../data/monetization";
import { sendDeliveryEmail } from "../../lib/email";
import { createDownloadToken } from "../../lib/fulfillment";
import { captureOrder, paypalConfigured } from "../../lib/paypal";
import { PRODUCT_CURRENCY, findSellableProduct } from "../../lib/productCheckout";
import { cleanSourceParam } from "../../lib/checkoutStarts";

export const prerender = false;

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function page(status: number, title: string, body: string): Response {
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly order</title><style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}a{color:#23201a}a.btn{display:inline-block;background:#e0a012;color:#1d1606;font-weight:600;padding:12px 18px;border-radius:6px;text-decoration:none}</style></head><body><main><h1>${escape(title)}</h1>${body}</main></body></html>`;
	return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

const message = (status: number, text: string) =>
	page(status, "Your order", `<p>${escape(text)}</p><p><a href="/store">Back to the store</a></p>`);

/**
 * PayPal sends the buyer back here (?token=<order id>). We capture the order server-side,
 * check it paid the full price of the product it names, then hand the buyer a signed
 * download link on the page and by email. Nothing is downloadable without that token.
 */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const orderId = url.searchParams.get("token") ?? "";
	if (!ORDER_ID.test(orderId)) return message(400, "That payment link is not valid.");
	if (!paypalConfigured(env)) return message(503, "PayPal checkout is not set up yet.");
	if (!env.DOWNLOAD_TOKEN_SECRET) {
		// Checked BEFORE capturing so we never take money we cannot fulfil.
		console.error("Buzzyfly buy: DOWNLOAD_TOKEN_SECRET missing; refusing to capture PayPal order", orderId);
		return message(500, "Checkout is temporarily unavailable. You have not been charged.");
	}

	let captured;
	try {
		captured = await captureOrder(env, orderId);
	} catch (error) {
		console.error("Buzzyfly buy: PayPal capture failed", orderId, error);
		return message(402, `We could not confirm your PayPal payment. If you were charged, email ${BUZZYFLY_CONFIG.orderEmail} with order ${orderId}.`);
	}

	const product = captured.customId ? findSellableProduct(captured.customId) : null;
	const valid =
		product !== null &&
		captured.completed &&
		captured.currency === PRODUCT_CURRENCY &&
		Number(captured.amount) >= Number(product.amount);
	if (!valid || !product) {
		console.error("Buzzyfly buy: PayPal order failed verification", JSON.stringify(captured));
		return message(402, "Your payment was not completed, so no download was issued.");
	}

	const token = await createDownloadToken({ orderId: captured.orderId, itemId: product.id }, env.DOWNLOAD_TOKEN_SECRET);
	const downloadPath = `/api/download?token=${token}`;

	// Best effort: a failed record or email must never block a paid buyer from their file.
	// Only the visit that first records the order sends the email, so reloading this page does not resend it.
	let firstVisit = true;
	if (env.DB) {
		try {
			const result = await env.DB.prepare(
				`INSERT INTO fulfillments (provider, order_id, item_id, customer_email, created_at)
				 VALUES (?, ?, ?, ?, ?) ON CONFLICT (provider, order_id) DO NOTHING`,
			)
				.bind("paypal", captured.orderId, product.id, captured.payerEmail, Date.now())
				.run();
			firstVisit = (result.meta?.changes ?? 1) > 0;
			const source = cleanSourceParam(url.searchParams.get("src"));
			if (firstVisit && source) {
				await env.DB.prepare(`UPDATE fulfillments SET source = ? WHERE provider = ? AND order_id = ?`)
					.bind(source, "paypal", captured.orderId)
					.run()
					.catch((error) => console.error("Buzzyfly buy: could not record source", error));
			}
		} catch (error) {
			console.error("Buzzyfly buy: could not record PayPal order", error);
		}
	}
	if (firstVisit && captured.payerEmail) {
		try {
			const sent = await sendDeliveryEmail(
				{
					to: captured.payerEmail,
					downloadUrl: `${BUZZYFLY_CONFIG.siteUrl}${downloadPath}`,
					productName: product.title,
					orderId: captured.orderId,
					itemId: product.id,
				},
				env,
			);
			if (!sent.sent)
				console.error(`Buzzyfly buy: download email not sent for order ${captured.orderId} to ${captured.payerEmail}: ${sent.reason}`);
		} catch (error) {
			console.error("Buzzyfly buy: download email failed", error);
		}
	}

	return page(
		200,
		"Thanks, your order is complete",
		`<p>Your ${escape(product.title)} is ready.</p>
<p><a class="btn" href="${escape(downloadPath)}">Download now</a></p>
<p>We've also emailed this link${captured.payerEmail ? ` to ${escape(captured.payerEmail)}` : ""}. It works for 3 days. ${escape(BUZZYFLY_CONFIG.guarantee)}</p>`,
	);
};
