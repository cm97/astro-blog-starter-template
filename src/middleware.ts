import { defineMiddleware } from "astro:middleware";
import { ADMIN_SESSION_COOKIE, isValidSession } from "./lib/adminAuth";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

/**
 * Gates every /admin page and /api/admin/* endpoint behind a valid session,
 * except the login page/endpoint themselves. Unauthenticated page requests
 * are redirected to the login form; unauthenticated API calls get a 401.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

	if (!isAdminArea || PUBLIC_ADMIN_PATHS.has(pathname)) {
		return next();
	}

	const env = context.locals.runtime.env;
	const token = context.cookies.get(ADMIN_SESSION_COOKIE)?.value;
	const authed = env.DB ? await isValidSession(env.DB, token) : false;

	if (!authed) {
		if (pathname.startsWith("/api/admin")) {
			return new Response(JSON.stringify({ error: "Not authenticated" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			});
		}
		return context.redirect("/admin/login");
	}

	return next();
});
