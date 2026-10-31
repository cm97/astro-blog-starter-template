import { BUZZYFLY_CONFIG } from "../data/monetization";
import { issueStoredDownloadToken } from "./fulfillment";

/**
 * Access control for the Buzzyfly web apps: the $49 Digital System at /app
 * and the smaller apps cut from it (the $15 Weekly Reset at /app/reset, the
 * $19 Follow-Ups at /app/follow-ups and the $29 Onboarding at /app/onboarding).
 *
 *  - after a verified payment, a buyer gets a random access key stored in D1
 *    `download_tokens` (the same table the download links use), bound to
 *    the product they bought;
 *  - opening an app with ?key=... checks the key on the server, stores it in
 *    that app's HttpOnly cookie, and redirects to the clean app URL;
 *  - every app request re-checks the cookie against D1, so deleting the row
 *    revokes access.
 *
 * The Digital System includes every smaller app, so its key opens them too.
 * Keys don't depend on DOWNLOAD_TOKEN_SECRET, which production doesn't set.
 */
export const APP_ITEM_ID = "buzzyfly-digital-system";
export const RESET_APP_ITEM_ID = "weekly-reset-checklist";
export const FOLLOWUPS_APP_ITEM_ID = "follow-up-email-templates";
export const ONBOARDING_APP_ITEM_ID = "client-onboarding-kit";
/** Buzzyfly Budget: a separate product, not part of the Digital System. */
export const BUDGET_APP_ITEM_ID = "budget-planner";

/** Every web-app product: where it lives and which cookie holds its key. */
export const APP_PRODUCTS: Record<string, { path: string; cookie: string }> = {
	[APP_ITEM_ID]: { path: "/app", cookie: "bf_app" },
	[RESET_APP_ITEM_ID]: { path: "/app/reset", cookie: "bf_app_reset" },
	[FOLLOWUPS_APP_ITEM_ID]: { path: "/app/follow-ups", cookie: "bf_app_followups" },
	[ONBOARDING_APP_ITEM_ID]: { path: "/app/onboarding", cookie: "bf_app_onboarding" },
	[BUDGET_APP_ITEM_ID]: { path: "/app/budget", cookie: "bf_app_budget" },
};

export const APP_COOKIE = APP_PRODUCTS[APP_ITEM_ID].cookie;
/** The buyer keeps the app, so the key is effectively permanent. */
export const APP_ACCESS_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
/** Browsers cap cookie lifetimes at about 400 days. Re-opening the key link renews it. */
export const APP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const KEY_PATTERN = /^[a-f0-9]{64}$/;

export function isAppItem(itemId: string | null | undefined): itemId is string {
	return !!itemId && Object.prototype.hasOwnProperty.call(APP_PRODUCTS, itemId);
}

function appFor(itemId: string | null | undefined) {
	return APP_PRODUCTS[isAppItem(itemId) ? itemId : APP_ITEM_ID];
}

export function appPath(itemId: string = APP_ITEM_ID): string {
	return appFor(itemId).path;
}

export function appCookieName(itemId: string = APP_ITEM_ID): string {
	return appFor(itemId).cookie;
}

export function appKeyUrl(key: string, itemId: string = APP_ITEM_ID): string {
	return `${BUZZYFLY_CONFIG.siteUrl}${appPath(itemId)}?key=${key}`;
}

/**
 * Returns the order behind an app key, or null if the key is unknown,
 * expired, or for a product that doesn't include this app.
 */
export async function verifyAppKey(
	env: Env,
	key: string | null | undefined,
	itemId: string = APP_ITEM_ID,
): Promise<{ orderId: string } | null> {
	if (!key || !KEY_PATTERN.test(key) || !env.DB) return null;
	try {
		const row = await env.DB.prepare(
			`SELECT order_id, item_id, expires_at FROM download_tokens WHERE token = ?`,
		)
			.bind(key)
			.first<{ order_id: string; item_id: string; expires_at: number }>();
		if (!row || Number(row.expires_at) < Date.now()) return null;
		if (row.item_id !== itemId && (row.item_id !== APP_ITEM_ID || itemId === BUDGET_APP_ITEM_ID)) return null;
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
	order: { orderId: string; itemId?: string | null; customerEmail?: string | null },
): Promise<string | null> {
	if (!env.DB) return null;
	const itemId = isAppItem(order.itemId) ? order.itemId : APP_ITEM_ID;
	const existing = await env.DB.prepare(
		`SELECT token FROM download_tokens
		 WHERE order_id = ? AND item_id = ? AND expires_at > ?
		 ORDER BY created_at DESC LIMIT 1`,
	)
		.bind(order.orderId, itemId, Date.now())
		.first<{ token: string }>();
	if (existing?.token && KEY_PATTERN.test(existing.token)) return existing.token;

	return issueStoredDownloadToken(
		env,
		{ orderId: order.orderId, itemId, customerEmail: order.customerEmail },
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

/**
 * Checks access for one app page: a ?key= link (stored, then redirected to the
 * clean URL) or the app's cookie. The Digital System's cookie opens the
 * smaller apps too.
 */
export async function resolveAppAccess(
	env: Env,
	url: URL,
	cookies: { get(name: string): { value: string } | undefined; set(name: string, value: string, options: object): void },
	itemId: string,
): Promise<{ redirect: string | null; unlocked: boolean; badLink: boolean }> {
	const keyParam = url.searchParams.get("key");
	if (keyParam) {
		if (await verifyAppKey(env, keyParam, itemId)) {
			cookies.set(appCookieName(itemId), keyParam, appCookieOptions(url));
			return { redirect: appPath(itemId), unlocked: true, badLink: false };
		}
		return { redirect: null, unlocked: false, badLink: true };
	}
	const names = itemId === APP_ITEM_ID ? [APP_COOKIE] : [appCookieName(itemId), APP_COOKIE];
	for (const name of names) {
		if (await verifyAppKey(env, cookies.get(name)?.value, itemId)) return { redirect: null, unlocked: true, badLink: false };
	}
	return { redirect: null, unlocked: false, badLink: false };
}
