// Where a visitor came from, taken from the utm_* parameters on the link that
// brought them (e.g. ?utm_source=reddit&utm_medium=social&utm_campaign=scope-creep).
//
// The browser remembers it for 30 days (localStorage), sends it with email
// signups, adds it to Stripe buy links as `client_reference_id` (the webhook
// stores it on the order), and adds it to /buy/ links as `?src=` (carried
// through PayPal as the order's reference_id and stored on the order by
// /buy/paypal-return). Stored as "source__medium__campaign".

export const SOURCE_STORAGE_KEY = "bf_src";
export const SOURCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Normalises a source string to what Stripe accepts for client_reference_id
 * (letters, digits, "-" and "_", max 200) so the same value works everywhere.
 */
export function cleanSource(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const cleaned = value
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 120);
	return cleaned || null;
}

/**
 * Cleans each part of a "source__medium__campaign" value so the separator
 * survives, capped at 200 chars (Stripe's client_reference_id limit, and under
 * PayPal's 256 for reference_id).
 */
export function cleanSourceTriple(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const parts = value.split("__").slice(0, 3).map((p) => cleanSource(p) ?? "");
	return parts.join("__").slice(0, 200).replace(/_+$/, "") || null;
}

/** "reddit__social__scope-creep" -> "reddit / social / scope-creep" for display. */
export function describeSource(source: string | null): string {
	return source ? source.split("__").filter(Boolean).join(" / ") : "Direct / unknown";
}
