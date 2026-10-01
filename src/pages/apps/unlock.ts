import type { APIRoute } from "astro";
import { APPS_COOKIE, APPS_TOKEN_TTL_SECONDS, hasAppsAccess, lockedPage } from "../../lib/appsAccess";

export const prerender = false;

/** Redeems the unlock link from the purchase email: verifies the token, sets the access cookie. */
export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
	const token = url.searchParams.get("token");
	if (!(await hasAppsAccess(locals.runtime.env, token))) return lockedPage();

	cookies.set(APPS_COOKIE, token as string, {
		path: "/",
		httpOnly: true,
		secure: url.protocol === "https:",
		sameSite: "lax",
		maxAge: APPS_TOKEN_TTL_SECONDS,
	});
	return redirect("/apps/open/invoice-maker", 302);
};
