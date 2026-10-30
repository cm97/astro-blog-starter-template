import type { APIRoute } from "astro";
import { paypalConfigured } from "../../lib/paypal";
import { getJobsOffer } from "../../lib/jobsAccess";

export const prerender = false;

/**
 * Which live settings are in place, as yes/no only. Secret values never leave
 * the Worker. The deploy workflow reads this after every deploy so a missing
 * secret (e.g. PayPal keys without DOWNLOAD_TOKEN_SECRET, which would take a
 * buyer's money without unlocking anything) shows up as a failed run.
 */
export const GET: APIRoute = ({ locals }) => {
	const env = (locals.runtime?.env ?? {}) as Env & Record<string, unknown>;
	const status = {
		db: Boolean(env.DB),
		email: Boolean(env.EMAIL),
		stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
		paypal: paypalConfigured(env),
		downloadTokenSecret: Boolean(env.DOWNLOAD_TOKEN_SECRET),
		jobsMembership: Boolean(getJobsOffer(env)),
	};
	return Response.json(status, { headers: { "cache-control": "no-store" } });
};
