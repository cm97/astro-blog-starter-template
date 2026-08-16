import type { APIRoute } from "astro";
import { clearedSessionCookie } from "../../../lib/adminAuth";

export const prerender = false;

/**
 * Ends the admin session by expiring the cookie.
 *
 * POST-only: a GET logout could be triggered by any image or link pointing at
 * this URL, which is a nuisance rather than a vulnerability but is trivial to
 * avoid.
 */
export const POST: APIRoute = async () => {
	return new Response(null, {
		status: 303,
		headers: {
			Location: "/admin/login?notice=Signed+out",
			"Set-Cookie": clearedSessionCookie(),
		},
	});
};
