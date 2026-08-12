import type { APIRoute } from "astro";
import { ADMIN_SESSION_COOKIE, destroySession } from "../../../lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect, locals }) => {
	const env = locals.runtime.env;
	const token = cookies.get(ADMIN_SESSION_COOKIE)?.value;

	if (env.DB) {
		await destroySession(env.DB, token);
	}
	cookies.delete(ADMIN_SESSION_COOKIE, { path: "/" });

	return redirect("/admin/login");
};
