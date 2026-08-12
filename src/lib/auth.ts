// Passwordless customer login: a short-lived emailed magic-link token
// exchanges for a longer-lived signed session cookie. No passwords are ever
// stored, matching the rest of Buzzyfly's token-based fulfillment flow.
import { signPayload, verifyPayload } from "./signedToken";

export const SESSION_COOKIE_NAME = "buzzyfly_session";
export const LOGIN_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes to click the emailed link
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days signed-in

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(email);
}

/** Signs a short-lived magic-link token proving control of `email`. Sent via email, never returned to the requester's HTTP response. */
export function createLoginToken(email: string, secret: string): Promise<string> {
	return signPayload({ email }, secret, LOGIN_TOKEN_TTL_SECONDS);
}

/** Verifies a magic-link token from `createLoginToken` and returns the email it proves, if valid. */
export async function verifyLoginToken(token: string, secret: string): Promise<string | null> {
	const payload = await verifyPayload(token, secret);
	if (!payload || typeof payload.email !== "string") return null;
	return payload.email;
}

/** Signs a longer-lived session token for an already-verified email. */
export function createSessionToken(email: string, secret: string): Promise<string> {
	return signPayload({ email }, secret, SESSION_TTL_SECONDS);
}

/** Verifies a session token from `createSessionToken` and returns the signed-in email, if valid. */
export async function verifySessionToken(token: string, secret: string): Promise<string | null> {
	const payload = await verifyPayload(token, secret);
	if (!payload || typeof payload.email !== "string") return null;
	return payload.email;
}

/** Builds the `Set-Cookie` header value that signs a browser in. */
export function buildSessionCookie(token: string): string {
	return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

/** Builds the `Set-Cookie` header value that signs a browser out. */
export function buildLogoutCookie(): string {
	return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Extracts the session token from a request's `Cookie` header, if present. */
export function readSessionCookie(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;

	for (const part of cookieHeader.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === SESSION_COOKIE_NAME) return rest.join("=");
	}
	return null;
}
