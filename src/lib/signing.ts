// Shared HMAC-SHA256 signing helpers used by both the customer download tokens
// and the admin session cookie. Both need the same primitive — a compact,
// tamper-evident, self-contained token — so the implementation lives in one
// place rather than being duplicated per feature.
//
// Workers expose WebCrypto but not Node's `Buffer`, so base64url is done by
// hand against `btoa`/`atob`.

export function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
	const padded = value
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	return new Uint8Array(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
}

export async function hmacKey(secret: string) {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

/**
 * Signs an arbitrary JSON payload, returning `<payload>.<signature>` in
 * base64url. The payload is readable by the holder — never put anything secret
 * in it, only things that must not be *altered*.
 */
export async function signPayload(payload: unknown, secret: string): Promise<string> {
	const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
	const key = await hmacKey(secret);
	const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
	return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies a token produced by `signPayload` and returns its decoded payload,
 * or null if the signature is invalid or the token is malformed. Callers are
 * responsible for checking any expiry field inside the payload.
 */
export async function verifyPayload<T>(token: string, secret: string): Promise<T | null> {
	const [payloadPart, signaturePart] = token.split(".");
	if (!payloadPart || !signaturePart) return null;

	try {
		const payloadBytes = base64UrlDecode(payloadPart);
		const key = await hmacKey(secret);
		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			base64UrlDecode(signaturePart),
			payloadBytes,
		);
		if (!valid) return null;
		return JSON.parse(new TextDecoder().decode(payloadBytes)) as T;
	} catch {
		// Malformed base64, corrupt signature bytes, or invalid JSON — all are
		// an invalid token, not a server error.
		return null;
	}
}

/**
 * Compares two strings without leaking their contents through timing. Used for
 * the admin password check, where an early-exit `===` would let an attacker
 * recover the password one character at a time.
 */
export function timingSafeEqual(a: string, b: string): boolean {
	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);
	// Comparing lengths up front would itself leak the length, so fold the
	// length difference into the accumulator instead of returning early.
	let mismatch = aBytes.length ^ bBytes.length;
	const max = Math.max(aBytes.length, bBytes.length);
	for (let i = 0; i < max; i++) {
		mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
	}
	return mismatch === 0;
}
