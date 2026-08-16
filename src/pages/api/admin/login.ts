import type { APIRoute } from "astro";
import {
	checkLockout,
	checkPassword,
	clearFailedLogins,
	createSessionToken,
	isAdminConfigured,
	clientIp,
	recordFailedLogin,
	sessionCookie,
} from "../../../lib/adminAuth";

export const prerender = false;

/** Same-site paths only, so ?next= can't be used as an open redirect. */
function safeNext(value: string | null): string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin";
	return value;
}

function backToLogin(message: string, next: string): Response {
	const params = new URLSearchParams({ error: message, next });
	return new Response(null, {
		status: 303,
		headers: { Location: `/admin/login?${params}` },
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData();
	const next = safeNext(String(form.get("next") ?? "/admin"));
	const password = String(form.get("password") ?? "");

	if (!isAdminConfigured(env)) {
		return backToLogin("Admin access is not configured on this deployment.", next);
	}

	const ip = clientIp(request);

	// Throttle before checking the password so a locked-out client can't keep
	// testing candidates.
	if (env.DB) {
		try {
			const lockout = await checkLockout(env.DB, ip);
			if (lockout.locked) {
				const minutes = Math.ceil(lockout.retryAfterSeconds / 60);
				return backToLogin(`Too many failed attempts. Try again in ${minutes} minute(s).`, next);
			}
		} catch (error) {
			// Throttling is a safety net, not the control itself — the password
			// check below still has to pass.
			console.error("Buzzyfly admin: lockout check failed —", error);
		}
	}

	if (!checkPassword(env, password)) {
		if (env.DB) {
			try {
				await recordFailedLogin(env.DB, ip);
			} catch (error) {
				console.error("Buzzyfly admin: could not record failed login —", error);
			}
		}
		console.warn(`Buzzyfly admin: failed login attempt from ${ip}`);
		return backToLogin("Incorrect password.", next);
	}

	if (env.DB) {
		try {
			await clearFailedLogins(env.DB, ip);
		} catch (error) {
			console.error("Buzzyfly admin: could not clear login attempts —", error);
		}
	}

	const token = await createSessionToken(env);

	return new Response(null, {
		status: 303,
		headers: {
			Location: next,
			"Set-Cookie": sessionCookie(token),
		},
	});
};
