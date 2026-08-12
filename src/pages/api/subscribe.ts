import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readEmail(request: Request): Promise<string | null> {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		const body = (await request.json().catch(() => null)) as { email?: string } | null;
		return body?.email ?? null;
	}

	// Native <form> fallback when JavaScript is unavailable.
	const form = await request.formData().catch(() => null);
	return (form?.get("email") as string) ?? null;
}

/**
 * Buzzyfly Dispatch newsletter signup. Accepts the `EmailOptin` component's
 * async fetch (JSON) as well as a plain form POST fallback, stores the
 * subscriber in Cloudflare D1 when the `DB` binding is available, and
 * forwards the lead to an external email provider when one is configured via
 * environment variables.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const email = await readEmail(request);

	if (!email || !EMAIL_RE.test(email)) {
		return new Response(JSON.stringify({ error: "A valid email address is required." }), {
			status: 400,
			headers: { "content-type": "application/json" },
		});
	}

	if (env.DB) {
		try {
			await env.DB.prepare(
				`INSERT INTO subscribers (email, created_at) VALUES (?, ?)
				 ON CONFLICT(email) DO NOTHING`,
			)
				.bind(email, Date.now())
				.run();
		} catch (error) {
			console.error("Buzzyfly subscribe: failed to store subscriber in D1", error);
		}
	}

	if (env.NEWSLETTER_API_URL && env.NEWSLETTER_API_KEY) {
		try {
			await fetch(env.NEWSLETTER_API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.NEWSLETTER_API_KEY}`,
				},
				body: JSON.stringify({ email, source: "buzzyfly-blog" }),
			});
		} catch (error) {
			console.error("Buzzyfly subscribe: failed to forward lead to email provider", error);
		}
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
