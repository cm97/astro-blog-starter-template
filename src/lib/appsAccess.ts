import { verifyDownloadToken } from "./fulfillment";

/**
 * Access control for the paid Buzzyfly web apps (/apps/open/*).
 *
 * A buyer of one of APPS_ITEM_IDS gets a signed, long-lived token (minted by
 * /api/webhook, or a revocable D1 token from the order-watch fulfiller). They
 * redeem it once at /apps/unlock, which stores it in an HttpOnly cookie. Every
 * request to a paid app re-verifies that cookie on the server, so the app HTML
 * is never sent to anyone without a valid purchase.
 */
export const APPS_ITEM_IDS = new Set<string>(["apps-pro"]);
export const APPS_COOKIE = "bf_apps";
export const APPS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year
/** Where the locked page sends people to buy. Swap for the Stripe Payment Link once it exists. */
export const APPS_BUY_URL = "/products";

export function isAppsItem(itemId: string): boolean {
	return APPS_ITEM_IDS.has(itemId);
}

export async function hasAppsAccess(env: Env, token: string | null | undefined): Promise<boolean> {
	if (!token) return false;

	// Revocable D1 token (delete the row and access ends).
	if (env.DB) {
		try {
			const row = await env.DB.prepare(
				`SELECT item_id, expires_at FROM download_tokens WHERE token = ?`,
			)
				.bind(token)
				.first<{ item_id: string; expires_at: number }>();
			if (row && Number(row.expires_at) >= Date.now() && isAppsItem(String(row.item_id))) {
				return true;
			}
		} catch (error) {
			console.error("Buzzyfly apps: D1 token lookup failed", error);
		}
	}

	// Signed token minted by /api/webhook.
	if (env.DOWNLOAD_TOKEN_SECRET) {
		const claims = await verifyDownloadToken(token, env.DOWNLOAD_TOKEN_SECRET);
		if (claims && isAppsItem(claims.itemId)) return true;
	}

	return false;
}

export function lockedPage(appName?: string): Response {
	const label = appName ? appName.replace(/-/g, " ") : "this app";
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly Apps Pro</title>
<style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}h1{font-size:1.6rem;margin:0 0 8px}p{color:#6b6455}a.btn{display:inline-block;background:#e0a012;color:#1d1606;font-weight:600;padding:12px 18px;border-radius:6px;text-decoration:none;margin-top:12px}a.btn:focus-visible{outline:3px solid #23201a;outline-offset:2px}small{display:block;margin-top:18px}</style></head>
<body><main><h1>${label.charAt(0).toUpperCase() + label.slice(1)} is part of Apps Pro</h1>
<p>Buy Apps Pro to unlock the Invoice Maker and Content Calendar. Your purchase email contains a personal unlock link that works on any device you open it on.</p>
<a class="btn" href="${APPS_BUY_URL}">See Apps Pro</a>
<small>Already bought? Open the unlock link from your order email.</small></main></body></html>`;
	return new Response(html, {
		status: 402,
		headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
	});
}
