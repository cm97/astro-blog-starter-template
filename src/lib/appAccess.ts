import { BUZZYFLY_CONFIG } from "../data/monetization";
import { issueStoredDownloadToken } from "./fulfillment";

/**
 * Access control for the $49 Digital System web app at /app.
 *
 *  - after a verified payment, a buyer gets a random access key stored in D1
 *    `download_tokens` (the same table the download links use), bound to
 *    this one product;
 *  - opening /app?key=... checks the key on the server, stores it in an
 *    HttpOnly cookie, and redirects to a clean /app;
 *  - every /app request re-checks the cookie against D1, so deleting the row
 *    revokes access.
 *
 * Keys don't depend on DOWNLOAD_TOKEN_SECRET, which production doesn't set.
 */
export const APP_ITEM_ID = "buzzyfly-digital-system";
export const APP_COOKIE = "bf_app";
/** The buyer keeps the app, so the key is effectively permanent. */
export const APP_ACCESS_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
/** Browsers cap cookie lifetimes at about 400 days. Re-opening the key link renews it. */
export const APP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const KEY_PATTERN = /^[a-f0-9]{64}$/;

export function isAppItem(itemId: string | null | undefined): boolean {
	return itemId === APP_ITEM_ID;
}

export function appKeyUrl(key: string): string {
	return `${BUZZYFLY_CONFIG.siteUrl}/app?key=${key}`;
}

/** Returns the order behind an app key, or null if the key is unknown, expired or for another product. */
export async function verifyAppKey(env: Env, key: string | null | undefined): Promise<{ orderId: string } | null> {
	if (!key || !KEY_PATTERN.test(key) || !env.DB) return null;
	try {
		const row = await env.DB.prepare(
			`SELECT order_id, item_id, expires_at FROM download_tokens WHERE token = ?`,
		)
			.bind(key)
			.first<{ order_id: string; item_id: string; expires_at: number }>();
		if (!row || row.item_id !== APP_ITEM_ID || Number(row.expires_at) < Date.now()) return null;
		return { orderId: String(row.order_id) };
	} catch (error) {
		console.error("Buzzyfly app: key lookup failed", error);
		return null;
	}
}

/**
 * Returns the app key for an order, reusing a live one so reloading the
 * thank-you page or re-sending the email doesn't pile up rows. Returns null
 * when there is no D1 binding.
 */
export async function appKeyForOrder(
	env: Env,
	order: { orderId: string; customerEmail?: string | null },
): Promise<string | null> {
	if (!env.DB) return null;
	const existing = await env.DB.prepare(
		`SELECT token FROM download_tokens
		 WHERE order_id = ? AND item_id = ? AND expires_at > ?
		 ORDER BY created_at DESC LIMIT 1`,
	)
		.bind(order.orderId, APP_ITEM_ID, Date.now())
		.first<{ token: string }>();
	if (existing?.token && KEY_PATTERN.test(existing.token)) return existing.token;

	return issueStoredDownloadToken(
		env,
		{ orderId: order.orderId, itemId: APP_ITEM_ID, customerEmail: order.customerEmail },
		APP_ACCESS_TTL_SECONDS,
	);
}

export function appCookieOptions(url: URL) {
	return {
		path: "/",
		httpOnly: true,
		secure: url.protocol === "https:",
		sameSite: "lax" as const,
		maxAge: APP_COOKIE_MAX_AGE_SECONDS,
	};
}
