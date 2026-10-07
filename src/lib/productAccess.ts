import { ALL_PRODUCTS, PRODUCT_FILE_MAP } from "../data/monetization";
import { verifyDownloadToken } from "./fulfillment";

/**
 * Access control for the paid downloads (/api/download). Mirrors appsAccess.ts:
 *
 *  - a buyer gets a token bound to ONE product (signed by DOWNLOAD_TOKEN_SECRET,
 *    or a revocable random token in D1 `download_tokens` issued after payment);
 *  - opening /api/download?token=... verifies it on the server and stores it in
 *    an HttpOnly cookie for that product;
 *  - every request re-verifies the token, and the file is never sent without one.
 */
export const PRODUCT_CURRENCY = "USD";
/** How long a PayPal buyer's download link and cookie stay valid. */
export const PRODUCT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const COOKIE_PREFIX = "bf_dl_";

export function isProduct(itemId: string | null | undefined): itemId is string {
	return !!itemId && Object.prototype.hasOwnProperty.call(PRODUCT_FILE_MAP, itemId);
}

export function productCookieName(itemId: string): string {
	return COOKIE_PREFIX + itemId.replace(/[^a-z0-9-]/gi, "");
}

export function productInfo(itemId: string) {
	return ALL_PRODUCTS.find((p) => p.id === itemId) ?? null;
}

/** Price as a PayPal amount string ("49.00"), derived from the catalog so there is one source of truth. */
export function productPrice(itemId: string): string | null {
	const raw = productInfo(itemId)?.price;
	const n = raw ? Number(raw.replace(/[^0-9.]/g, "")) : NaN;
	return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
}

/**
 * Verifies a download token and returns its claims, or null. Only tokens for a
 * product in PRODUCT_FILE_MAP are accepted, so an Apps Pro token cannot be used
 * to pull a file. Does not count usage; the caller does that once per download.
 */
export async function verifyProductToken(
	env: Env,
	token: string | null | undefined,
): Promise<{ orderId: string; itemId: string; stored: boolean } | null> {
	if (!token || token.length > 2048) return null;

	// Revocable D1 token (issued by the order fulfiller or the admin console).
	if (env.DB) {
		try {
			const row = await env.DB.prepare(
				`SELECT order_id, item_id, expires_at FROM download_tokens WHERE token = ?`,
			)
				.bind(token)
				.first<{ order_id: string; item_id: string; expires_at: number }>();
			if (row && Number(row.expires_at) >= Date.now() && isProduct(String(row.item_id))) {
				return { orderId: String(row.order_id), itemId: String(row.item_id), stored: true };
			}
		} catch (error) {
			console.error("Buzzyfly download: D1 token lookup failed", error);
		}
	}

	// Signed token minted after a verified payment (Stripe webhook or PayPal capture).
	if (env.DOWNLOAD_TOKEN_SECRET) {
		const claims = await verifyDownloadToken(token, env.DOWNLOAD_TOKEN_SECRET);
		if (claims && isProduct(claims.itemId)) return { ...claims, stored: false };
	}

	return null;
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** 402 page shown instead of a file when there is no valid purchase. */
export function productLockedPage(itemId: string | null, opts: { payEnabled?: boolean } = {}): Response {
	const product = itemId ? productInfo(itemId) : null;
	const title = product ? `${product.title} is a paid download` : "This download needs a purchase";
	const action = product
		? opts.payEnabled
			? `<a class="btn" href="/checkout/buy?product=${encodeURIComponent(product.id)}">Pay with PayPal — ${escapeHtml(product.price)}</a>`
			: `<a class="btn" href="/products">See the products</a>`
		: `<a class="btn" href="/products">See the products</a>`;
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly download</title>
<style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}h1{font-size:1.6rem;margin:0 0 8px}p{color:#6b6455}a.btn{display:inline-block;background:#e0a012;color:#1d1606;font-weight:600;padding:12px 18px;border-radius:6px;text-decoration:none;margin-top:12px}a.btn:focus-visible{outline:3px solid #23201a;outline-offset:2px}small{display:block;margin-top:18px}</style></head>
<body><main><h1>${escapeHtml(title)}</h1>
<p>Files are delivered only after a completed payment. Your receipt email contains a personal download link.</p>
${action}
<small>Already bought? Open the download link from your order email, or reply to it and we will send a fresh one.</small></main></body></html>`;
	return new Response(html, {
		status: 402,
		headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
	});
}
