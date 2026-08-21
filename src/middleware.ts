import { defineMiddleware } from "astro:middleware";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./lib/adminAuth";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/login/"]);
const PUBLIC_ADMIN_API_PATHS = new Set(["/api/admin/login", "/api/admin/login/"]);

/**
 * Gatekeeper for the Buzzyfly admin console. Every `/admin/*` page and
 * `/api/admin/*` route is server-rendered (`prerender = false`), so this runs
 * on every request to those paths and enforces a valid signed session cookie
 * before anything admin-related executes.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	const isAdminPage = pathname.startsWith("/admin");
	const isAdminApi = pathname.startsWith("/api/admin");
	if (!isAdminPage && !isAdminApi) return next();

	if (isAdminPage && PUBLIC_ADMIN_PATHS.has(pathname)) return next();
	if (isAdminApi && PUBLIC_ADMIN_API_PATHS.has(pathname)) return next();

	const env = context.locals.runtime.env;
	const token = context.cookies.get(ADMIN_SESSION_COOKIE)?.value;
	const session = await verifySessionToken(env, token);

	if (!session) {
		if (isAdminApi) {
			return new Response(JSON.stringify({ error: "Not authenticated" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			});
		}
		const redirectTo = encodeURIComponent(pathname + context.url.search);
		return context.redirect(`/admin/login?next=${redirectTo}`);
	}

	context.locals.adminUser = session.username;
	return next();
});
