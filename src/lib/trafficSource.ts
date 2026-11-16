// Where a visitor came from: the utm_* parameters on the link that
// brought them (e.g. ?utm_source=reddit&utm_medium=social&utm_campaign=scope-creep),
// or, without utm tags, the referring site (see referrerSource below).
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

// Visitors without utm tags still tell us where they came from through
// document.referrer (usually just the origin, e.g. "https://www.google.com/").
const SEARCH_ENGINES: Record<string, string> = {
	google: "google",
	bing: "bing",
	duckduckgo: "duckduckgo",
	yahoo: "yahoo",
	ecosia: "ecosia",
	yandex: "yandex",
	baidu: "baidu",
	brave: "brave",
};
const SOCIAL: Record<string, string> = {
	reddit: "reddit",
	facebook: "facebook",
	fb: "facebook",
	instagram: "instagram",
	linkedin: "linkedin",
	lnkd: "linkedin",
	"t.co": "x",
	twitter: "x",
	x: "x",
	youtube: "youtube",
	tiktok: "tiktok",
	pinterest: "pinterest",
	threads: "threads",
};
// Hosts that send people back to us mid-purchase; never a traffic source.
const IGNORED = /(^|\.)(buzzyfly\.com|stripe\.com|paypal\.com|localhost)$/;

/**
 * "https://www.google.com/" -> "google__organic", "https://old.reddit.com/r/x" ->
 * "reddit__social", "https://example.org/post" -> "example-org__referral".
 * Returns null for no referrer, our own site, or the payment pages.
 */
export function referrerSource(referrer: unknown): string | null {
	if (typeof referrer !== "string" || !referrer) return null;
	let host: string;
	try {
		host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		return null;
	}
	if (!host || IGNORED.test(host)) return null;
	const labels = host.split(".");
	for (const [key, name] of Object.entries(SOCIAL)) {
		if (host === key || labels.includes(key) || host.endsWith(`.${key}`)) return `${name}__social`;
	}
	for (const [key, name] of Object.entries(SEARCH_ENGINES)) {
		if (labels.includes(key)) return `${name}__organic`;
	}
	return cleanSourceTriple(`${cleanSource(host) ?? ""}__referral`);
}

/**
 * Team and owner visits: open any page once with ?internal=1 (or
 * ?utm_source=internal) and the browser is tagged "internal" for 30 days. /api/track then leaves those views
 * and buy clicks out of the funnel counts. Our own site checks (Firecrawl,
 * Playwright) look like Chrome visitors from Google otherwise.
 */
export function isInternalSource(source: string | null | undefined): boolean {
	return typeof source === "string" && source.split("__")[0] === "internal";
}
