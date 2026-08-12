import type { APIRoute } from "astro";
import { createLoginToken, isValidEmail } from "../../../lib/auth";
import { BUZZYFLY_CONFIG } from "../../../data/monetization";

export const prerender = false;

async function readEmail(request: Request): Promise<string | null> {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		const body = (await request.json().catch(() => null)) as { email?: string } | null;
		return body?.email ?? null;
	}

	const form = await request.formData().catch(() => null);
	return (form?.get("email") as string) ?? null;
}

// Always the same shape/status, whether or not the email actually has an
// order on file — telling the requester either way would let anyone probe
// which email addresses have purchased something from Buzzyfly. A fresh
// Response is built per call since a Response's body stream can only be
// read (i.e. sent over the wire) once.
function genericResponse(): Response {
	return new Response(
		JSON.stringify({
			requested: true,
			message: "If that email has an order with us, we've sent a login link to it.",
		}),
		{ status: 200, headers: { "content-type": "application/json" } },
	);
}

/**
 * Customer login, step 1: mint and email a short-lived magic-link token for
 * any email address that has a fulfilled Buzzyfly order on file. No
 * passwords are stored — this is the same signed-token approach `/api/webhook`
 * already uses for download links, just scoped to proving control of an
 * inbox instead of a purchase.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const email = (await readEmail(request))?.trim().toLowerCase() ?? "";

	if (!email || !isValidEmail(email)) {
		return new Response(JSON.stringify({ error: "A valid email address is required." }), {
			status: 400,
			headers: { "content-type": "application/json" },
		});
	}

	if (!env.LOGIN_TOKEN_SECRET) {
		console.error("Buzzyfly login: LOGIN_TOKEN_SECRET is not configured");
		return genericResponse();
	}

	if (!env.DB) {
		console.error("Buzzyfly login: DB binding is not configured, cannot verify orders");
		return genericResponse();
	}

	try {
		const order = await env.DB.prepare(
			`SELECT 1 FROM fulfillments WHERE LOWER(customer_email) = ? LIMIT 1`,
		)
			.bind(email)
			.first();

		if (order) {
			const loginToken = await createLoginToken(email, env.LOGIN_TOKEN_SECRET);
			const loginUrl = `${BUZZYFLY_CONFIG.siteUrl}/api/auth/callback?token=${loginToken}`;

			if (env.AUTH_EMAIL_API_URL && env.AUTH_EMAIL_API_KEY) {
				await fetch(env.AUTH_EMAIL_API_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${env.AUTH_EMAIL_API_KEY}`,
					},
					body: JSON.stringify({
						to: email,
						subject: `Log in to ${BUZZYFLY_CONFIG.brandName}`,
						text: `Click to log in: ${loginUrl}\n\nThis link expires in 15 minutes. If you didn't request it, you can ignore this email.`,
					}),
				});
			} else {
				// No transactional email provider configured — log the link so
				// this flow is still usable while developing locally.
				console.log(`Buzzyfly login: magic link for ${email} -> ${loginUrl}`);
			}
		}
	} catch (error) {
		console.error("Buzzyfly login: failed to process login request", error);
	}

	return genericResponse();
};
