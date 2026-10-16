import type { APIRoute } from "astro";
import { DROP_COOKIE, DROP_TOKEN_TTL_SECONDS, checkDropAccess } from "../../lib/dropAccess";
import { dropLockedPage } from "../../lib/dropPages";

export const prerender = false;

/** Redeems the unlock link from the welcome email: verifies it, stores it in an HttpOnly cookie, opens the app. */
export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
	const token = (url.searchParams.get("token") ?? "").trim().toLowerCase();
	const access = await checkDropAccess(locals.runtime.env, token);
	if (!access.ok) return dropLockedPage(access.reason);

	cookies.set(DROP_COOKIE, token, {
		path: "/",
		httpOnly: true,
		secure: url.protocol === "https:",
		sameSite: "lax",
		maxAge: DROP_TOKEN_TTL_SECONDS,
	});
	return redirect("/drop", 302);
};
