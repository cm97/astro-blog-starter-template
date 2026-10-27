import { issueStoredDownloadToken } from "./fulfillment";
import { checkSubscriptionAccess, type DropAccess } from "./dropAccess";

/**
 * The Buzzyfly Jobs membership: a monthly Stripe subscription that opens the
 * full /jobs board (every listing, filters, new-since-last-visit markers).
 * Visitors without it see the first few listings.
 *
 * It runs on the same plumbing as the Monthly Drop: the webhook records the
 * subscription in `drop_subscriptions` and stores a random token in
 * `download_tokens` (item_id = JOBS_ITEM_ID). The thank-you page and the
 * welcome email both hand that token over; /jobs/unlock stores it in an
 * HttpOnly cookie. Every request re-checks the token AND the subscription,
 * so access ends when Stripe reports it canceled or unpaid.
 *
 * The paywall only switches on when JOBS_MEMBERSHIP_URL (a Stripe Payment Link
 * whose metadata sets item_id to JOBS_ITEM_ID) and JOBS_MEMBERSHIP_PRICE are
 * set in wrangler.json. Until then /jobs stays fully open, so there is never a
 * paywall without a working buy button.
 */
export const JOBS_ITEM_ID = "buzzyfly-jobs-membership";
export const JOBS_COOKIE = "bf_jobs";
/** The token outlives any billing period; the subscription status decides access. */
export const JOBS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 400;
/** Listings everyone can see before the paywall. */
export const FREE_JOBS_PREVIEW = 5;

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isJobsItem(itemId: string | null | undefined): boolean {
	return itemId === JOBS_ITEM_ID;
}

export interface JobsOffer {
	url: string;
	/** As shown to buyers, e.g. "$9/month". */
	price: string;
}

/** The membership's checkout link and price, or null while the paywall is switched off. */
export function getJobsOffer(env: Partial<Env> | undefined): JobsOffer | null {
	const url = env?.JOBS_MEMBERSHIP_URL?.trim();
	const price = env?.JOBS_MEMBERSHIP_PRICE?.trim();
	if (!url || !price) return null;
	try {
		if (new URL(url).protocol !== "https:") return null;
	} catch {
		return null;
	}
	return { url, price };
}

export function checkJobsAccess(env: Env, token: string | null | undefined): Promise<DropAccess> {
	return checkSubscriptionAccess(env, token, JOBS_ITEM_ID);
}

/**
 * The member's token for a checkout, reusing a live one so reloading the
 * thank-you page or replaying the webhook doesn't pile up rows.
 */
export async function jobsTokenForOrder(
	env: Env,
	order: { orderId: string; customerEmail?: string | null },
): Promise<string | null> {
	if (!env.DB) return null;
	const existing = await env.DB.prepare(
		`SELECT token FROM download_tokens
		 WHERE order_id = ? AND item_id = ? AND expires_at > ?
		 ORDER BY created_at DESC LIMIT 1`,
	)
		.bind(order.orderId, JOBS_ITEM_ID, Date.now())
		.first<{ token: string }>();
	if (existing?.token && TOKEN_PATTERN.test(existing.token)) return existing.token;

	return issueStoredDownloadToken(
		env,
		{ orderId: order.orderId, itemId: JOBS_ITEM_ID, customerEmail: order.customerEmail },
		JOBS_TOKEN_TTL_SECONDS,
	);
}

export function jobsCookieOptions(url: URL) {
	return {
		path: "/",
		httpOnly: true,
		secure: url.protocol === "https:",
		sameSite: "lax" as const,
		maxAge: JOBS_TOKEN_TTL_SECONDS,
	};
}
