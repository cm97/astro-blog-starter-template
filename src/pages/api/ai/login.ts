import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG } from "../../../data/monetization";
import { isActiveSubscriber, issueLoginToken, normalizeEmail } from "../../../lib/aiAccess";
import { sendAiLoginEmail } from "../../../lib/email";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Already subscribed?" — emails a one-time sign-in link to an active
 * subscriber. Always returns the same message so the form can't be used to
 * find out who is subscribed.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const body = (await request.json().catch(() => null)) as { email?: string } | null;
	const email = normalizeEmail(body?.email ?? "");

	if (!EMAIL_RE.test(email)) {
		return new Response(JSON.stringify({ error: "Enter a valid email address." }), {
			status: 400,
			headers: { "content-type": "application/json" },
		});
	}

	if (await isActiveSubscriber(env, email)) {
		const token = await issueLoginToken(env, email);
		if (token) {
			const result = await sendAiLoginEmail(
				{ to: email, loginUrl: `${BUZZYFLY_CONFIG.siteUrl}/api/ai/verify?token=${token}`, welcome: false },
				env,
			);
			if (!result.sent) console.error(`Buzzyfly AI: sign-in email to ${email} failed: ${result.reason}`);
		}
	}

	return new Response(
		JSON.stringify({ message: "If that email has an active subscription, a sign-in link is on its way." }),
		{ status: 200, headers: { "content-type": "application/json" } },
	);
};
