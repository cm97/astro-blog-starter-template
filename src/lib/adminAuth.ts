import { timingSafeEqual } from "./webhookSecurity";

export const ADMIN_SESSION_COOKIE = "buzzyfly_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	bytes.forEach((b) => (binary += String.fromCharCode(b)));
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
	const padded = value
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	return new Uint8Array(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
}

async function hmacKey(secret: string) {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

/** Constant-time check of the configured admin username + password. */
export function verifyAdminCredentials(
	env: Env,
	username: string,
	password: string,
): boolean {
	if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) return false;
	const usernameOk = timingSafeEqual(username, env.ADMIN_USERNAME);
	const passwordOk = timingSafeEqual(password, env.ADMIN_PASSWORD);
	return usernameOk && passwordOk;
}

/** Issues a signed, time-limited admin session token for the login cookie. */
export async function createSessionToken(env: Env, username: string): Promise<string | null> {
	if (!env.ADMIN_SESSION_SECRET) return null;

	const payload = {
		u: username,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
	};
	const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
	const key = await hmacKey(env.ADMIN_SESSION_SECRET);
	const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));

	return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`;
}

/** Verifies a session cookie value minted by `createSessionToken`. */
export async function verifySessionToken(
	env: Env,
	token: string | undefined,
): Promise<{ username: string } | null> {
	if (!token || !env.ADMIN_SESSION_SECRET) return null;

	const [payloadPart, signaturePart] = token.split(".");
	if (!payloadPart || !signaturePart) return null;

	try {
		const payloadBytes = base64UrlDecode(payloadPart);
		const key = await hmacKey(env.ADMIN_SESSION_SECRET);
		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			base64UrlDecode(signaturePart),
			payloadBytes,
		);
		if (!valid) return null;

		const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
		if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
			return null;
		}
		if (typeof payload.u !== "string") return null;

		return { username: payload.u };
	} catch {
		// Malformed base64, corrupt signature bytes, or invalid JSON — all
		// treated as an invalid session rather than a server error.
		return null;
	}
}

export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_SECONDS;
