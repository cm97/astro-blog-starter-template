/**
 * Minimal, dependency-free auth for the reader blog platform: PBKDF2 password
 * hashing and opaque bearer-token sessions (Web Crypto only, so it runs on
 * the Workers runtime without extra packages).
 */

export interface AuthUser {
	id: string;
	email: string;
	username: string;
	displayName: string;
}

export const SESSION_COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100_000;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/** Constant-time comparison of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	return crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
		keyMaterial,
		256,
	);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const derived = await pbkdf2(password, salt);
	return { hash: toHex(derived), salt: toHex(salt) };
}

export async function verifyPassword(
	password: string,
	hash: string,
	salt: string,
): Promise<boolean> {
	const derived = await pbkdf2(password, fromHex(salt));
	return timingSafeEqualHex(toHex(derived), hash);
}

async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
	return toHex(digest);
}

/** Creates a session row and returns the raw bearer token to store in a cookie. */
export async function createSession(env: Env, userId: string): Promise<string> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
	const token = base64UrlEncode(tokenBytes);
	const tokenHash = await sha256Hex(token);
	const now = Date.now();

	await env.DB!.prepare(
		`INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
	)
		.bind(tokenHash, userId, now, now + SESSION_TTL_SECONDS * 1000)
		.run();

	return token;
}

export async function destroySession(env: Env, token: string): Promise<void> {
	const tokenHash = await sha256Hex(token);
	await env.DB!.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
}

export function readSessionCookie(request: Request): string | null {
	const header = request.headers.get("cookie");
	if (!header) return null;
	for (const part of header.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === SESSION_COOKIE_NAME) return decodeURIComponent(rest.join("="));
	}
	return null;
}

export function serializeSessionCookie(token: string, isHttps: boolean): string {
	const attrs = [
		`${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${SESSION_TTL_SECONDS}`,
	];
	if (isHttps) attrs.push("Secure");
	return attrs.join("; ");
}

export function clearSessionCookie(isHttps: boolean): string {
	const attrs = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
	if (isHttps) attrs.push("Secure");
	return attrs.join("; ");
}

/** Resolves the logged-in user (if any) from the session cookie on a request. */
export async function getSessionUser(request: Request, env: Env): Promise<AuthUser | null> {
	if (!env.DB) return null;
	const token = readSessionCookie(request);
	if (!token) return null;

	const tokenHash = await sha256Hex(token);
	try {
		const row = await env.DB.prepare(
			`SELECT users.id, users.email, users.username, users.display_name as displayName
			 FROM sessions JOIN users ON users.id = sessions.user_id
			 WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
		)
			.bind(tokenHash, Date.now())
			.first<AuthUser>();

		return row ?? null;
	} catch (error) {
		// Missing schema (migration not yet applied) shouldn't break every page.
		console.error("Buzzyfly auth: failed to resolve session (migration applied?)", error);
		return null;
	}
}
