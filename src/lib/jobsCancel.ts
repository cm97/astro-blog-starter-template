import { BUZZYFLY_CONFIG } from "../data/monetization";

/**
 * Where a Jobs member goes to cancel or manage their membership.
 *
 * Once the owner turns on Stripe's customer portal and sets its login link in
 * the JOBS_PORTAL_URL var, members cancel themselves there. Until then (or if
 * the value isn't a billing.stripe.com https link) it falls back to a
 * prefilled email to support, so the cancel route always works.
 */
export interface JobsCancelLink {
	url: string;
	/** True when the link is Stripe's self-serve portal. */
	selfServe: boolean;
}

export function getJobsCancelLink(env: { JOBS_PORTAL_URL?: string } | undefined): JobsCancelLink {
	const raw = env?.JOBS_PORTAL_URL?.trim();
	if (raw) {
		try {
			const url = new URL(raw);
			if (url.protocol === "https:" && url.hostname === "billing.stripe.com") {
				return { url: url.toString(), selfServe: true };
			}
		} catch {
			// fall through to the email route
		}
	}
	const subject = encodeURIComponent("Cancel my Buzzyfly Jobs membership");
	return { url: `mailto:${BUZZYFLY_CONFIG.supportEmail}?subject=${subject}`, selfServe: false };
}
