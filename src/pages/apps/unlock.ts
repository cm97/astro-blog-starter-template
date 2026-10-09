import type { APIRoute } from "astro";
import { paypalConfigured } from "../../lib/paypal";
import { APPS_COOKIE, APPS_TOKEN_TTL_SECONDS, cookieValueFor, hasAppsAccess, lockedPage } from "../../lib/appsAccess";
import { env } from "cloudflare:workers";

export const prerender = false;

/**
 * Redeems an unlock link (?token=) from a purchase email or an access code (?code=):
 * verifies it server-side, then sets the HttpOnly access cookie.
 */
export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
	const raw = url.searchParams.get("token") ?? url.searchParams.get("code");
	if (!raw || !(await hasAppsAccess(env, raw))) return lockedPage(undefined, { payEnabled: paypalConfigured(env) });

	cookies.set(APPS_COOKIE, cookieValueFor(raw), {
		path: "/",
		httpOnly: true,
		secure: url.protocol === "https:",
		sameSite: "lax",
		maxAge: APPS_TOKEN_TTL_SECONDS,
	});
	return redirect("/apps-pro", 302);
};
