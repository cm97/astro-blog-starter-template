// Generic HMAC-signed, base64url-encoded JSON payload tokens. Shared by the
// purchase download-token flow and the customer-login magic-link/session
// flow so both get the same signing, encoding, and expiry handling.

function base64UrlEncode(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
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

/** Signs a JSON-serializable payload, stamping it with an absolute expiry. */
export async function signPayload(
	payload: Record<string, unknown>,
	secret: string,
	ttlSeconds: number,
): Promise<string> {
	const withExpiry = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
	const payloadBytes = new TextEncoder().encode(JSON.stringify(withExpiry));
	const key = await hmacKey(secret);
	const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));

	return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`;
}

/** Verifies a token minted by `signPayload`, returning its payload if the signature and expiry both check out. */
export async function verifyPayload(
	token: string,
	secret: string,
): Promise<Record<string, unknown> | null> {
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

		const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
		if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
			return null;
		}
		return payload;
	} catch {
		// Malformed base64, corrupt signature bytes, or invalid JSON — all
		// treated as an invalid token rather than a server error.
		return null;
	}
}
