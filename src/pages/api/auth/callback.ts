import type { APIRoute } from "astro";
import { buildSessionCookie, createSessionToken, verifyLoginToken } from "../../../lib/auth";

export const prerender = false;

/**
 * Customer login, step 2: the link emailed by `/api/auth/request-login`
 * lands here. A valid, unexpired login token proves control of the inbox,
 * so it's exchanged for a longer-lived signed session cookie.
 */
export const GET: APIRoute = async ({ request, locals, redirect }) => {
	const env = locals.runtime.env;
	const token = new URL(request.url).searchParams.get("token");

	if (!token || !env.LOGIN_TOKEN_SECRET || !env.SESSION_TOKEN_SECRET) {
		return redirect("/login?error=invalid", 302);
	}

	const email = await verifyLoginToken(token, env.LOGIN_TOKEN_SECRET);
	if (!email) {
		return redirect("/login?error=expired", 302);
	}

	const sessionToken = await createSessionToken(email, env.SESSION_TOKEN_SECRET);

	return new Response(null, {
		status: 302,
		headers: {
			Location: "/account",
			"Set-Cookie": buildSessionCookie(sessionToken),
		},
	});
};
