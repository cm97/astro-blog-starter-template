import { PRODUCT_FILE_MAP } from "../data/monetization";
import { signPayload, verifyPayload } from "./signedToken";

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
	return signPayload({ orderId: order.orderId, itemId: order.itemId }, secret, ttlSeconds);
}

/** Verifies a download token minted by `createDownloadToken` and returns its payload if valid. */
export async function verifyDownloadToken(
	token: string,
	secret: string,
): Promise<{ orderId: string; itemId: string } | null> {
	const payload = await verifyPayload(token, secret);
	if (!payload || typeof payload.orderId !== "string" || typeof payload.itemId !== "string") {
		return null;
	}
	return { orderId: payload.orderId, itemId: payload.itemId };
}
