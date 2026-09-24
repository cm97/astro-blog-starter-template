import type { APIRoute } from "astro";
import { AI_SESSION_COOKIE, redeemLoginToken } from "../../../lib/aiAccess";

export const prerender = false;

/** Target of the emailed sign-in link: swaps the one-time token for a session cookie. */
export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
	const env = locals.runtime.env;
	const session = await redeemLoginToken(env, url.searchParams.get("token") ?? "");
	if (!session) return redirect("/ai?signin=expired");

	cookies.set(AI_SESSION_COOKIE, session.sessionToken, {
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		maxAge: session.maxAgeSeconds,
	});
	return redirect("/ai?signin=ok");
};
