import { PRODUCT_FILE_MAP } from "../data/monetization";

export interface FulfillmentOrder {
	provider: "stripe" | "lemonsqueezy";
	orderId: string;
	itemId: string;
	customerEmail: string | null;
}

/** Extracts the fields fulfillment needs from a verified Lemon Squeezy webhook payload. */
export function parseLemonSqueezyOrder(payload: any): FulfillmentOrder | null {
	const eventName = payload?.meta?.event_name;
	if (eventName !== "order_created") return null;

	const attributes = payload?.data?.attributes;
	const orderId = payload?.data?.id;
	const itemId = payload?.meta?.custom_data?.item_id ?? attributes?.first_order_item?.variant_id;

	if (!orderId || !itemId) return null;

	return {
		provider: "lemonsqueezy",
		orderId: String(orderId),
		itemId: String(itemId),
		customerEmail: attributes?.user_email ?? null,
	};
}

/** Extracts the fields fulfillment needs from a verified Stripe webhook payload. */
export function parseStripeOrder(payload: any): FulfillmentOrder | null {
	if (payload?.type !== "checkout.session.completed") return null;

	const session = payload?.data?.object;
	const orderId = session?.id;
	const itemId = session?.metadata?.item_id ?? session?.line_items?.data?.[0]?.price?.id;

	if (!orderId || !itemId) return null;

	return {
		provider: "stripe",
		orderId: String(orderId),
		itemId: String(itemId),
		customerEmail: session?.customer_details?.email ?? session?.customer_email ?? null,
	};
}

/** Looks up the private R2 object for a purchased item, if it exists. */
export function resolveProductFile(itemId: string) {
	return PRODUCT_FILE_MAP[itemId] ?? null;
}

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

/**
 * Issues a signed, time-limited download token for a fulfilled order so the
 * customer can retrieve their file from `/api/download` without exposing the
 * private R2 bucket or requiring an account system.
 */
export async function createDownloadToken(
	order: { orderId: string; itemId: string },
	secret: string,
	ttlSeconds = 60 * 60 * 24 * 3, // 3 days
): Promise<string> {
	const payload = {
		orderId: order.orderId,
		itemId: order.itemId,
		exp: Math.floor(Date.now() / 1000) + ttlSeconds,
	};
	const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
	const key = await hmacKey(secret);
	const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));

	return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`;
}

/** Verifies a download token minted by `createDownloadToken` and returns its payload if valid. */
export async function verifyDownloadToken(
	token: string,
	secret: string,
): Promise<{ orderId: string; itemId: string } | null> {
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
		return { orderId: payload.orderId, itemId: payload.itemId };
	} catch {
		// Malformed base64, corrupt signature bytes, or invalid JSON — all
		// treated as an invalid token rather than a server error.
		return null;
	}
}
