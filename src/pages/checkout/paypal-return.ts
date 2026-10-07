import type { APIRoute } from "astro";
import {
	PRODUCT_CURRENCY,
	PRODUCT_TOKEN_TTL_SECONDS,
	isProduct,
	productInfo,
	productPrice,
} from "../../lib/productAccess";
import { captureOrder, paypalConfigured } from "../../lib/paypal";
import { createDownloadToken } from "../../lib/fulfillment";
import { sendDeliveryEmail } from "../../lib/email";
import { BUZZYFLY_CONFIG } from "../../data/monetization";

export const prerender = false;

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function page(status: number, body: string): Response {
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly order</title><style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}a{color:#23201a}a.btn{display:inline-block;background:#e0a012;color:#1d1606;font-weight:600;padding:12px 18px;border-radius:6px;text-decoration:none;margin-top:12px}</style></head><body><main>${body}</main></body></html>`;
	return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/**
 * PayPal sends the buyer back here (?token=<order id>). We capture the order server-side,
 * verify it paid the catalog price for the product named in custom_id, then mint a
 * signed download token bound to that product and show (and email) the download link.
 */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const orderId = url.searchParams.get("token") ?? "";
	if (!ORDER_ID.test(orderId)) return page(400, "<h1>Order</h1><p>That payment link is not valid.</p>");
	if (!paypalConfigured(env)) return page(503, "<h1>Order</h1><p>PayPal checkout is not set up yet.</p>");
	if (!env.DOWNLOAD_TOKEN_SECRET) {
		// Checked BEFORE capturing so we never take money we cannot fulfil.
		console.error("Buzzyfly checkout: DOWNLOAD_TOKEN_SECRET missing; refusing to capture PayPal order", orderId);
		return page(500, "<h1>Order</h1><p>Checkout is temporarily unavailable. You have not been charged.</p>");
	}

	let captured;
	try {
		captured = await captureOrder(env, orderId);
	} catch (error) {
		console.error("Buzzyfly checkout: PayPal capture failed", orderId, error);
		return page(402, `<h1>Order</h1><p>We could not confirm your PayPal payment. If you were charged, email ${BUZZYFLY_CONFIG.orderEmail} with order ${escapeHtml(orderId)}.</p>`);
	}

	const itemId = captured.customId;
	const price = isProduct(itemId) ? productPrice(itemId) : null;
	const valid =
		captured.completed &&
		isProduct(itemId) &&
		price !== null &&
		captured.currency === PRODUCT_CURRENCY &&
		Number(captured.amount) >= Number(price);
	if (!valid || !itemId) {
		console.error("Buzzyfly checkout: PayPal order failed verification", JSON.stringify(captured));
		return page(402, "<h1>Order</h1><p>Your payment was not completed, so no download was issued.</p>");
	}

	const token = await createDownloadToken({ orderId: captured.orderId, itemId }, env.DOWNLOAD_TOKEN_SECRET, PRODUCT_TOKEN_TTL_SECONDS);
	const downloadUrl = `${BUZZYFLY_CONFIG.siteUrl}/api/download?token=${token}`;
	const title = productInfo(itemId)?.title ?? itemId;

	// Best effort: a failed record or email must never block a paid buyer from their file.
	// Only the first visit for an order sends the email, so a page reload does not resend it.
	let firstVisit = true;
	if (env.DB) {
		try {
			const result = await env.DB.prepare(
				`INSERT INTO fulfillments (provider, order_id, item_id, customer_email, created_at)
				 VALUES (?, ?, ?, ?, ?) ON CONFLICT (provider, order_id) DO NOTHING`,
			)
				.bind("paypal", captured.orderId, itemId, captured.payerEmail, Date.now())
				.run();
			firstVisit = (result.meta?.changes ?? 1) > 0;
		} catch (error) {
			console.error("Buzzyfly checkout: could not record PayPal order", error);
		}
	}
	if (firstVisit && captured.payerEmail) {
		try {
			await sendDeliveryEmail(
				{ to: captured.payerEmail, downloadUrl, productName: `Buzzyfly ${title}`, orderId: captured.orderId, itemId },
				env,
			);
		} catch (error) {
			console.error("Buzzyfly checkout: delivery email failed", error);
		}
	}

	return page(
		200,
		`<h1>Thank you — payment received</h1><p>Your ${escapeHtml(title)} is ready. The same link was emailed to you and works for 30 days.</p><a class="btn" href="/api/download?token=${token}">Download ${escapeHtml(title)}</a>`,
	);
};
