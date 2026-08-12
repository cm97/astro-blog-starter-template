import type { APIRoute } from "astro";
import { ADMIN_SESSION_COOKIE, createSession, verifyPassword } from "../../../lib/adminAuth";

export const prerender = false;

function timingSafeStringEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return mismatch === 0;
}

/**
 * Admin console login. Verifies the submitted password against the PBKDF2
 * hash stored in the ADMIN_PASSWORD_HASH secret (see
 * scripts/generate-admin-credentials.mjs) and, on success, mints a D1-backed
 * session cookie. Plain HTML form POST — no client-side JS required.
 */
export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const username = (form?.get("username") as string) ?? "";
	const password = (form?.get("password") as string) ?? "";

	if (!env.DB || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_SALT || !env.ADMIN_PASSWORD_HASH) {
		return new Response(
			"Admin console is not configured yet. Set ADMIN_USERNAME, ADMIN_PASSWORD_SALT, and " +
				"ADMIN_PASSWORD_HASH (see scripts/generate-admin-credentials.mjs), and make sure the DB " +
				"binding is present.",
			{ status: 500 },
		);
	}

	const usernameOk = timingSafeStringEqual(username, env.ADMIN_USERNAME);
	const passwordOk = await verifyPassword(password, env.ADMIN_PASSWORD_SALT, env.ADMIN_PASSWORD_HASH);

	if (!usernameOk || !passwordOk) {
		return redirect("/admin/login?error=1");
	}

	const token = await createSession(env.DB);
	cookies.set(ADMIN_SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return redirect("/admin");
};
