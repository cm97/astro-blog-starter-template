import type { APIRoute } from "astro";
import {
	REF_COOKIE,
	REF_COOKIE_MAX_AGE_SECONDS,
	cleanCode,
	ensureAffiliateSchema,
	findActiveAffiliate,
	recordClick,
	safeLandingPath,
} from "../../lib/affiliates";

export const prerender = false;

/**
 * A partner's share link: buzzyfly.com/r/<code>, optionally ?to=/store or any
 * other page on this site. Counts the click, remembers the partner for 30 days
 * and sends the visitor on. An unknown or paused code still lands the visitor
 * on the page, it just credits nobody.
 */
export const GET: APIRoute = async ({ params, url, locals, cookies }) => {
	const to = safeLandingPath(url.searchParams.get("to"));
	const code = cleanCode(params.code);
	const db = locals.runtime?.env?.DB;

	if (code && db) {
		try {
			await ensureAffiliateSchema(db);
			if (await findActiveAffiliate(db, code)) {
				await recordClick(db, code);
				// Readable by the page script on purpose: it tags Stripe buy links with the code.
				cookies.set(REF_COOKIE, code, {
					path: "/",
					maxAge: REF_COOKIE_MAX_AGE_SECONDS,
					sameSite: "lax",
					secure: url.protocol === "https:",
				});
			}
		} catch (error) {
			console.error("Buzzyfly partners: click tracking failed", code, error);
		}
	}

	return new Response(null, { status: 302, headers: { location: to, "cache-control": "no-store" } });
};
