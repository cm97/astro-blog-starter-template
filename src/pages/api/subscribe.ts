import type { APIRoute } from "astro";
import { sendSequenceEmail } from "../../lib/emailSequence";
import { ensureEmailSequenceSchema } from "../../lib/schema";
import { cleanSource } from "../../lib/trafficSource";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readSignup(request: Request): Promise<{ email: string | null; source: string | null }> {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		const body = (await request.json().catch(() => null)) as { email?: string; source?: string } | null;
		// Source is "source__medium__campaign"; clean each part so the separator survives.
		const source = typeof body?.source === "string"
			? body.source.split("__").map((p) => cleanSource(p) ?? "").join("__").replace(/(__)+$/, "") || null
			: null;
		return { email: body?.email ?? null, source };
	}

	// Native <form> fallback when JavaScript is unavailable.
	const form = await request.formData().catch(() => null);
	return { email: (form?.get("email") as string) ?? null, source: null };
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
	const { email, source } = await readSignup(request);

	if (!email || !EMAIL_RE.test(email)) {
		return new Response(JSON.stringify({ error: "A valid email address is required." }), {
			status: 400,
			headers: { "content-type": "application/json" },
		});
	}

	let unsubscribeToken: string | undefined;
	if (env.DB) {
		const token = crypto.randomUUID();
		// Add any columns the hourly cron hasn't added yet, so this insert can't miss them.
		await ensureEmailSequenceSchema(env.DB).catch((error) =>
			console.error("Buzzyfly subscribe: schema check failed", error),
		);
		try {
			// Signing up again after unsubscribing counts as opting back in.
			const row = await env.DB.prepare(
				`INSERT INTO subscribers (email, created_at, unsubscribe_token, sequence_step, sequence_sent_at, source)
				 VALUES (?, ?, ?, 0, ?, ?)
				 ON CONFLICT(email) DO UPDATE SET
				   unsubscribed_at = NULL,
				   unsubscribe_token = COALESCE(subscribers.unsubscribe_token, excluded.unsubscribe_token),
				   source = COALESCE(subscribers.source, excluded.source)
				 RETURNING unsubscribe_token`,
			)
				.bind(email, Date.now(), token, Date.now(), source)
				.first<{ unsubscribe_token: string | null }>();
			unsubscribeToken = row?.unsubscribe_token ?? undefined;
		} catch (error) {
			// Sequence columns missing (migration 0006 not applied yet): still keep the lead.
			console.error("Buzzyfly subscribe: sequence insert failed, falling back", error);
			try {
				await env.DB.prepare(
					`INSERT INTO subscribers (email, created_at) VALUES (?, ?)
					 ON CONFLICT(email) DO NOTHING`,
				)
					.bind(email, Date.now())
					.run();
			} catch (fallbackError) {
				console.error("Buzzyfly subscribe: failed to store subscriber in D1", fallbackError);
			}
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

	// Welcome email (sequence email 0) — best-effort, never fail the signup over it.
	if (env.EMAIL) {
		const result = await sendSequenceEmail(0, email, unsubscribeToken, env);
		if (!result.sent) console.error("Buzzyfly subscribe: welcome email failed", result.reason);
	}

	// A plain form POST (no JavaScript) gets a page, not raw JSON.
	if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
		return new Response(
			`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>You're in — Buzzyfly</title><style>body{margin:0;font:18px/1.6 system-ui,sans-serif;color:#222939;background:#fff}main{max-width:560px;margin:0 auto;padding:48px 18px}a.btn{display:inline-block;margin-top:8px;padding:12px 20px;border-radius:999px;background:#2337ff;color:#fff;font-weight:700;text-decoration:none}</style></head><body><main><h1>You're in.</h1><p>Your free 20-minute weekly reset checklist is on its way. Check your inbox in a minute or two.</p><p>Want to start right now? The checklist is also here:</p><a class="btn" href="/blog/weekly-reset/">Open the weekly reset</a></main></body></html>`,
			{ status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
		);
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
