import type { APIRoute } from "astro";
import { ADMIN_SESSION_COOKIE } from "../../../lib/adminAuth";
import { logAdminAction } from "../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals }) => {
	const env = locals.runtime.env;
	const actor = locals.adminUser;
	cookies.delete(ADMIN_SESSION_COOKIE, { path: "/" });
	if (actor) await logAdminAction(env, actor, "logout");
	return new Response(null, { status: 303, headers: { Location: "/admin/login" } });
};
