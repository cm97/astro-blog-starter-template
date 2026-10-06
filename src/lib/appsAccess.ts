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
export const APPS_BUY_URL = "/apps-pro";
/** One-time price of Apps Pro (PayPal checkout at /apps/buy). Change here to reprice. */
export const APPS_PRICE = "29.00";
export const APPS_CURRENCY = "USD";
/**
 * Master switch. While false, the paid apps are open to everyone (no purchase check).
 * Set to true once Apps Pro can actually be bought (live Stripe + Payment Link for item_id apps-pro).
 */
export const APPS_PAYWALL_ENABLED = true;

/**
 * Access codes (no payment provider needed). Only SHA-256 hashes live here, so the
 * repo never exposes a usable code. To sell: take payment any way you like (PayPal,
 * invoice, cash), then give the buyer one code. To revoke a code, delete its hash
 * and redeploy.
 */
const APPS_CODE_HASHES = new Set<string>([
	"8850caa8ca16f707341b8a8f0273407f9e66594d2bd86cb2240f3b18981ed478",
	"51190b419007ca32de046d35d44f3f32ef0bb68cd64102e691c59a746b91726e",
	"844089f34cf88fd686153e8b66b7c4c04fd4700ecfffc3203dea2801fbd7e06a",
	"a71253fc4be069badc4dee25cca07352d7d4b9cef20d345636052c7d951c3ce8",
	"679342625046a29dad391ec9d0ffc67d190dc6086f550aac39f44c3696812e4c",
	"7a56002642c638d79be78af1d03fb8c97b067a46066e457cf073d98ac244030e",
	"e2366d932549889c8e1ee2de78e3025ae42689548bd28b9e33dbee9542080853",
	"12cd212239037e38e6e35584111479078f308ac0da06188b8a8e4962601b6134",
	"39d6a0a08052fa9d9c17fe5aadb526ce9dc79bedbdab292e1d2fa43430732555",
	"d51d06bd3386f7948130730f7630e189c2a543de84972a315838b34f17062668",
	"b18461939ada527bcef4aa1a4a4914b64300d155024849b08b01a81a21aa9a4a",
	"4e46945d29af07b050c2f625fc11de49a9fdfb6425785f23ad82ce103220ad3d",
	"5923699ecdf1a2b04e2914668cbfffc2fa9aea43539825e13573e1bedcb052c7",
	"1a5de044cb1d051b23801ad22d1a9719a35ceb34c08fdfc6a71b53ae4e5320ea",
	"a59a93640e99a69383d51c86cb16ac25b9a5421817bb844fe9ffe36f7ad6ea64",
	"ef4a0046eadab64d79d768bf296c1d25810600e407e66d500289b79515dffd1e",
	"07d1c71bc31884b8c785c2a4d39c6b98a8a24e78f9e92fb6963954d6b3294eac",
	"d481d62e44e6b8dcfb8080fffe001fcc798cf3bed18309ccc9841c6a4dd6198e",
	"06edfbceedb96803e0a6cb9a6237f1b0ce43a9cc8c38bff493bd5ba51dfb3608",
	"dc0dee5e76b4c18bdcbb0eae8bf57f80dcbe954c5b59c390c473995d0b311648",
	"ded83a0df2832cb60ae1024cb91b52e7ea23b2783cef006a3ddd5dfb6c4c4ae8",
	"7083c9b02acb7add75c09c5997d7baacfcabab3719e92763e3bd239db5e5a47e",
	"dee7530560a67523174aeda82a362dd34d216e91ff05bbd8feb27f18fc249073",
	"98ba015b88b1f94b100928e6bcc421dfba0eb7f808f04c28d656609c5b3f33e8",
	"a7d2a2e83743c265cb50488871869eb34348f9cae15cec1dd06dc74fbf4a6bce",
]);

function normalizeCode(value: string): string {
	return value.trim().toUpperCase();
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function cookieValueFor(input: string): string {
	return /^BF-/i.test(input.trim()) ? normalizeCode(input) : input;
}

export function isAppsItem(itemId: string): boolean {
	return APPS_ITEM_IDS.has(itemId);
}

export async function hasAppsAccess(env: Env, token: string | null | undefined): Promise<boolean> {
	if (!APPS_PAYWALL_ENABLED) return true;
	if (!token) return false;

	// Access code (hash match).
	if (/^BF-/i.test(token.trim()) && APPS_CODE_HASHES.has(await sha256Hex(normalizeCode(token)))) {
		return true;
	}

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

export function lockedPage(appName?: string, opts: { payEnabled?: boolean } = {}): Response {
	const label = appName ? appName.replace(/-/g, " ") : "this app";
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly Apps Pro</title>
<style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 18px}h1{font-size:1.6rem;margin:0 0 8px}p{color:#6b6455}a.btn{display:inline-block;background:#e0a012;color:#1d1606;font-weight:600;padding:12px 18px;border-radius:6px;text-decoration:none;margin-top:12px}a.btn:focus-visible{outline:3px solid #23201a;outline-offset:2px}small{display:block;margin-top:18px}</style></head>
<body><main><h1>${label.charAt(0).toUpperCase() + label.slice(1)} is part of Apps Pro</h1>
<p>Buy Apps Pro once to unlock all seven Buzzyfly business apps. Your purchase email contains a personal unlock link that works on any device you open it on.</p>
${opts.payEnabled ? `<a class="btn" href="/apps/buy">Pay with PayPal \u2014 $${APPS_PRICE}</a>` : `<a class="btn" href="${APPS_BUY_URL}">See Apps Pro</a>`}
<form method="get" action="/apps/unlock" style="margin-top:22px"><label for="code" style="display:block;font-size:.9rem;color:#6b6455;margin-bottom:6px">Have an access code?</label><input id="code" name="code" autocomplete="off" autocapitalize="characters" placeholder="BF-XXXX-XXXX-XXXX" style="font:inherit;padding:10px;border:1px solid #e2dccb;border-radius:6px;width:min(280px,100%)"> <button type="submit" style="font:inherit;padding:10px 16px;border:0;border-radius:6px;background:#23201a;color:#fff;cursor:pointer">Unlock</button></form><small>Already bought? Open the unlock link from your order email.</small></main></body></html>`;
	return new Response(html, {
		status: 402,
		headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
	});
}
