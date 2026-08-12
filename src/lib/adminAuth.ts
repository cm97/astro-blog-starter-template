// Admin console authentication: PBKDF2 password verification and D1-backed
// sessions, implemented with the native Web Crypto API so it runs on the
// Cloudflare Workers runtime with no extra dependencies (same approach as
// ../lib/webhookSecurity.ts).

export const ADMIN_SESSION_COOKIE = "buzzyfly_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PBKDF2_ITERATIONS = 100_000;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

/** Derives a PBKDF2-SHA256 hash for a password, given a hex salt. Used both to
 * generate the stored credential (see scripts/generate-admin-credentials.mjs)
 * and to verify a login attempt against it. */
export async function derivePasswordHash(password: string, saltHex: string): Promise<string> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const derived = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: fromHex(saltHex),
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		256,
	);
	return toHex(derived);
}

export async function verifyPassword(
	password: string,
	saltHex: string,
	expectedHashHex: string,
): Promise<boolean> {
	const actual = await derivePasswordHash(password, saltHex);
	return timingSafeEqual(actual, expectedHashHex);
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return toHex(digest);
}

/** Mints a new session, storing only its hash in D1, and returns the raw
 * token to set as the cookie value. */
export async function createSession(db: D1Database): Promise<string> {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
	const token = toHex(tokenBytes);
	const tokenHash = await sha256Hex(token);
	const now = Date.now();

	await db
		.prepare(`INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)`)
		.bind(tokenHash, now, now + SESSION_TTL_MS)
		.run();

	return token;
}

export async function isValidSession(db: D1Database, token: string | undefined): Promise<boolean> {
	if (!token) return false;
	const tokenHash = await sha256Hex(token);
	const row = await db
		.prepare(`SELECT expires_at FROM admin_sessions WHERE token_hash = ?`)
		.bind(tokenHash)
		.first<{ expires_at: number }>();
	return Boolean(row && row.expires_at > Date.now());
}

export async function destroySession(db: D1Database, token: string | undefined): Promise<void> {
	if (!token) return;
	const tokenHash = await sha256Hex(token);
	await db.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(tokenHash).run();
}
