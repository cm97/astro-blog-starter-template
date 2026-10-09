// Partner-code helpers shared by the server and the TrafficSource page script.
// Kept free of imports so the browser bundle stays tiny.

export const REF_COOKIE = "bf_ref";
export const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
/** Prefix on Stripe client_reference_id that marks a partner sale. */
export const STRIPE_REF_PREFIX = "aff-";

const CODE_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** Normalises a partner code: lowercase letters, digits and inner dashes, 2–32 chars. */
export function cleanCode(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const code = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32)
		.replace(/-+$/, "");
	return code.length >= 2 && CODE_RE.test(code) ? code : null;
}

/** Reads the partner code out of a Stripe client_reference_id ("aff-<code>"). */
export function codeFromStripeReference(reference: string | null | undefined): string | null {
	if (!reference || !reference.startsWith(STRIPE_REF_PREFIX)) return null;
	return cleanCode(reference.slice(STRIPE_REF_PREFIX.length));
}

/** Reads the bf_ref cookie from a raw Cookie header (or document.cookie). */
export function codeFromCookieHeader(header: string | null | undefined): string | null {
	if (!header) return null;
	for (const part of header.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name !== REF_COOKIE) continue;
		try {
			return cleanCode(decodeURIComponent(rest.join("=")));
		} catch {
			return null;
		}
	}
	return null;
}
