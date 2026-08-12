// Signature verification for inbound Buzzyfly payment webhooks, implemented
// with the native Web Crypto API (`crypto.subtle`) so it runs on the
// Cloudflare Workers runtime with no extra dependencies.

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
	return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

/**
 * Verifies a Lemon Squeezy webhook. Lemon Squeezy signs the raw request body
 * with HMAC SHA256 and sends the hex digest in the `X-Signature` header.
 */
export async function verifyLemonSqueezySignature(
	rawBody: string,
	signatureHeader: string | null,
	secret: string,
): Promise<boolean> {
	if (!signatureHeader) return false;
	const expected = await hmacSha256Hex(secret, rawBody);
	return timingSafeEqual(expected, signatureHeader);
}

/**
 * Verifies a Stripe webhook per Stripe's signing scheme: the
 * `Stripe-Signature` header carries `t=<timestamp>,v1=<signature>[,v1=...]`,
 * and the signed payload is `${timestamp}.${rawBody}` HMAC-SHA256'd with the
 * webhook signing secret.
 */
export async function verifyStripeSignature(
	rawBody: string,
	signatureHeader: string | null,
	secret: string,
	toleranceSeconds = 300,
): Promise<boolean> {
	if (!signatureHeader) return false;

	const parts = Object.fromEntries(
		signatureHeader.split(",").map((pair) => {
			const [key, value] = pair.split("=");
			return [key, value];
		}),
	);
	const timestamp = parts.t;
	const signatures = signatureHeader
		.split(",")
		.filter((pair) => pair.startsWith("v1="))
		.map((pair) => pair.slice(3));

	if (!timestamp || signatures.length === 0) return false;

	const timestampSeconds = Number(timestamp);
	if (!Number.isFinite(timestampSeconds)) return false;
	if (Math.abs(Date.now() / 1000 - timestampSeconds) > toleranceSeconds) return false;

	const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
	return signatures.some((signature) => timingSafeEqual(expected, signature));
}
