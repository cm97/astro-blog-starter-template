// Where a visitor came from, taken from the utm_* parameters on the link that
// brought them (e.g. ?utm_source=reddit&utm_medium=social&utm_campaign=scope-creep).
//
// The browser remembers it for 30 days (localStorage), sends it with email
// signups, and adds it to Stripe buy links as `client_reference_id`, which the
// webhook stores on the order. Stored as "source__medium__campaign".

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

/** "reddit__social__scope-creep" -> "reddit / social / scope-creep" for display. */
export function describeSource(source: string | null): string {
	return source ? source.split("__").filter(Boolean).join(" / ") : "Direct / unknown";
}
