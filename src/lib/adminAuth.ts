// Admin console authentication.
//
// The console controls pricing, product files, and customer order data, so it
// is gated behind a single shared password held as a Worker secret. There is no
// user table on purpose — this is a one-operator site, and a full account
// system would be more surface area than the threat model needs.
//
// Two secrets are required (set both before the console will accept a login):
//   npx wrangler secret put ADMIN_PASSWORD         # what you type to log in
//   npx wrangler secret put ADMIN_SESSION_SECRET   # signs the session cookie
//
// They are deliberately separate: rotating the session secret logs every
// session out without changing the password, and a leaked session secret does
// not reveal the password.

import { signPayload, timingSafeEqual, verifyPayload } from "./signing";

export const ADMIN_COOKIE_NAME = "bf_admin";

/** How long a login lasts before the operator has to sign in again. */
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

/** Failed logins from one IP before that IP is locked out. */
const MAX_FAILED_ATTEMPTS = 5;
/** How long the lockout lasts once tripped. */
const LOCKOUT_SECONDS = 15 * 60;

interface AdminSession {
	/** Issued-at, seconds since epoch. */
	iat: number;
	/** Expiry, seconds since epoch. */
	exp: number;
}

function now(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * Reports whether admin auth is configured at all. Used to show a setup message
 * instead of a login form that could never succeed.
 */
export function isAdminConfigured(env: Env): boolean {
	return Boolean(env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET);
}

/** Checks a submitted password against the configured secret in constant time. */
export function checkPassword(env: Env, submitted: string): boolean {
	if (!env.ADMIN_PASSWORD) return false;
	return timingSafeEqual(submitted, env.ADMIN_PASSWORD);
}

export async function createSessionToken(env: Env): Promise<string> {
	const issued = now();
	const session: AdminSession = { iat: issued, exp: issued + SESSION_TTL_SECONDS };
	return signPayload(session, env.ADMIN_SESSION_SECRET!);
}

/** Returns true when the request carries a valid, unexpired admin session. */
export async function hasValidSession(request: Request, env: Env): Promise<boolean> {
	if (!env.ADMIN_SESSION_SECRET) return false;

	const token = readCookie(request, ADMIN_COOKIE_NAME);
	if (!token) return false;

	const session = await verifyPayload<AdminSession>(token, env.ADMIN_SESSION_SECRET);
	if (!session || typeof session.exp !== "number") return false;

	return session.exp > now();
}

export function readCookie(request: Request, name: string): string | null {
	const header = request.headers.get("Cookie");
	if (!header) return null;

	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (separator === -1) continue;
		if (part.slice(0, separator).trim() === name) {
			return decodeURIComponent(part.slice(separator + 1).trim());
		}
	}
	return null;
}

/**
 * Builds the Set-Cookie header for a logged-in session.
 *
 * SameSite=Strict is what stops a third-party page from driving the admin API
 * with the operator's cookie, which matters because the mutating endpoints are
 * plain form posts. HttpOnly keeps the token away from any script on the page.
 */
export function sessionCookie(token: string): string {
	return [
		`${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
		"Path=/",
		"HttpOnly",
		"Secure",
		"SameSite=Strict",
		`Max-Age=${SESSION_TTL_SECONDS}`,
	].join("; ");
}

export function clearedSessionCookie(): string {
	return [
		`${ADMIN_COOKIE_NAME}=`,
		"Path=/",
		"HttpOnly",
		"Secure",
		"SameSite=Strict",
		"Max-Age=0",
	].join("; ");
}

/** Best-effort client IP for throttling. Cloudflare always sets CF-Connecting-IP. */
export function clientIp(request: Request): string {
	return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

export interface LockoutState {
	locked: boolean;
	retryAfterSeconds: number;
}

/** Checks whether an IP is currently locked out of the login form. */
export async function checkLockout(db: D1Database, ip: string): Promise<LockoutState> {
	const row = await db
		.prepare("SELECT locked_until FROM admin_login_attempts WHERE ip = ?")
		.bind(ip)
		.first<{ locked_until: number | null }>();

	const lockedUntil = row?.locked_until ?? 0;
	if (lockedUntil && lockedUntil > now()) {
		return { locked: true, retryAfterSeconds: lockedUntil - now() };
	}
	return { locked: false, retryAfterSeconds: 0 };
}

/** Records a failed login and trips the lockout once the threshold is crossed. */
export async function recordFailedLogin(db: D1Database, ip: string): Promise<void> {
	const timestamp = now();
	await db
		.prepare(
			`INSERT INTO admin_login_attempts (ip, failed_count, last_failed, locked_until)
			 VALUES (?, 1, ?, NULL)
			 ON CONFLICT (ip) DO UPDATE SET
			   failed_count = admin_login_attempts.failed_count + 1,
			   last_failed  = excluded.last_failed,
			   locked_until = CASE
			     WHEN admin_login_attempts.failed_count + 1 >= ?
			     THEN ? ELSE admin_login_attempts.locked_until
			   END`,
		)
		.bind(ip, timestamp, MAX_FAILED_ATTEMPTS, timestamp + LOCKOUT_SECONDS)
		.run();
}

/** Clears the failure counter for an IP after a successful login. */
export async function clearFailedLogins(db: D1Database, ip: string): Promise<void> {
	await db.prepare("DELETE FROM admin_login_attempts WHERE ip = ?").bind(ip).run();
}
