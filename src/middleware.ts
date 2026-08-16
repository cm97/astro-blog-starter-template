// Guards the admin console.
//
// Centralizing the check here means a new admin page or API route is protected
// by default — the failure mode of forgetting a per-page check is that the page
// is public, which is exactly the mistake worth designing out.

import { defineMiddleware } from "astro:middleware";
import { hasValidSession } from "./lib/adminAuth";

/** Routes under /admin that must stay reachable while logged out. */
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export const onRequest = defineMiddleware(async (context, next) => {
	const path = new URL(context.request.url).pathname;

	const isAdminPage = path === "/admin" || path.startsWith("/admin/");
	const isAdminApi = path.startsWith("/api/admin/");
	if (!isAdminPage && !isAdminApi) return next();

	// Trailing slashes would otherwise route /admin/login/ around the allowlist.
	const normalized = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
	if (PUBLIC_ADMIN_PATHS.has(normalized)) return next();

	const env = context.locals.runtime?.env;
	if (!env) {
		// No Workers runtime means no way to verify a session. Fail closed
		// rather than serving the console unauthenticated.
		return new Response("Admin console unavailable", { status: 503 });
	}

	if (await hasValidSession(context.request, env)) return next();

	if (isAdminApi) {
		return new Response(JSON.stringify({ error: "Not signed in" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	return context.redirect(`/admin/login?next=${encodeURIComponent(path)}`);
});
