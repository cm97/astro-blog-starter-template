import type { APIRoute } from "astro";
import { ADMIN_SESSION_COOKIE } from "../../../lib/adminAuth";
import { logAdminAction } from "../../../lib/audit";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals }) => {
	const actor = locals.adminUser;
	cookies.delete(ADMIN_SESSION_COOKIE, { path: "/" });
	if (actor) await logAdminAction(env, actor, "logout");
	return new Response(null, { status: 303, headers: { Location: "/admin/login" } });
};
