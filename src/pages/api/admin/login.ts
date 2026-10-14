import type { APIRoute } from "astro";
import {
	ADMIN_SESSION_COOKIE,
	SESSION_COOKIE_MAX_AGE,
	createSessionToken,
	verifyAdminCredentials,
} from "../../../lib/adminAuth";
import { logAdminAction } from "../../../lib/audit";
import { hitRateLimit, isRateLimited } from "../../../lib/rateLimit";

const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60_000;

export const prerender = false;

function loginRedirect(next: string, error?: string): Response {
	const params = new URLSearchParams({ next });
	if (error) params.set("error", error);
	return new Response(null, { status: 303, headers: { Location: `/admin/login?${params}` } });
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const username = String(form?.get("username") ?? "");
	const password = String(form?.get("password") ?? "");
	const next = String(form?.get("next") ?? "/admin");
	const safeNext = next.startsWith("/admin") ? next : "/admin";

	if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
		return loginRedirect(
			safeNext,
			"Admin console isn't configured yet — set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.",
		);
	}

	// Lock an IP out after repeated failures. Only failures count, so the owner
	// logging in normally is never throttled; correct credentials are not even
	// checked while locked, which stops a bot from guessing during the lockout.
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
	const lockKey = `admin-login:${ip}`;
	if (await isRateLimited(env, lockKey, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS)) {
		await logAdminAction(env, username || "unknown", "login_locked_out");
		return loginRedirect(safeNext, "Too many failed attempts. Try again in 15 minutes.");
	}

	if (!username || !password || !verifyAdminCredentials(env, username, password)) {
		await hitRateLimit(env, lockKey, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS);
		await logAdminAction(env, username || "unknown", "login_failed");
		return loginRedirect(safeNext, "Incorrect username or password.");
	}

	const token = await createSessionToken(env, username);
	if (!token) {
		return loginRedirect(safeNext, "Admin console isn't configured yet.");
	}

	cookies.set(ADMIN_SESSION_COOKIE, token, {
		httpOnly: true,
		secure: new URL(request.url).protocol === "https:",
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_COOKIE_MAX_AGE,
	});

	await logAdminAction(env, username, "login");

	return new Response(null, { status: 303, headers: { Location: safeNext } });
};
