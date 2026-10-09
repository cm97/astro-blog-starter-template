import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG } from "../../data/monetization";
import { cleanCode, ensureAffiliateSchema, randomToken } from "../../lib/affiliates";
import { resolveFrom, type EmailBinding } from "../../lib/email";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THANKS = "Thanks. Your application is in. You'll get an email once it's reviewed, usually within 2 working days.";

type Fields = Record<string, unknown>;

async function readFields(request: Request): Promise<Fields | null> {
	if ((request.headers.get("content-type") ?? "").includes("application/json")) {
		return (await request.json().catch(() => null)) as Fields | null;
	}
	const form = await request.formData().catch(() => null);
	return form ? Object.fromEntries(form) : null;
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Answers JSON for the page script, or a plain page for a no-JavaScript form post. */
function reply(request: Request, status: number, body: { ok: boolean; message?: string; error?: string }): Response {
	if ((request.headers.get("content-type") ?? "").includes("application/json")) {
		return Response.json(body, { status });
	}
	const msg = (body.message ?? body.error ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
	return new Response(
		`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly partners</title><main style="max-width:560px;margin:48px auto;padding:0 16px;font:16px/1.55 system-ui,sans-serif"><p>${msg}</p><p><a href="/partners">Back to the partner page</a></p></main>`,
		{ status, headers: { "content-type": "text/html; charset=utf-8" } },
	);
}

/**
 * Partner application. Stores the applicant as `pending`; nothing is credited
 * until the owner approves them in /admin/affiliates.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const fields = await readFields(request);
	if (!fields) return reply(request, 400, { ok: false, error: "Please fill in the form." });

	// Honeypot: bots fill every field. Pretend it worked.
	if (text(fields.company, 100)) return reply(request, 200, { ok: true, message: THANKS });

	const name = text(fields.name, 80);
	const email = text(fields.email, 160).toLowerCase();
	const website = text(fields.website, 200);
	const audience = text(fields.audience, 600);
	const payoutRaw = text(fields.payout_email, 160).toLowerCase();
	const agreed = fields.agree === "yes" || fields.agree === "on" || fields.agree === true;

	if (name.length < 2 || !EMAIL_RE.test(email) || website.length < 3 || audience.length < 10) {
		return reply(request, 400, { ok: false, error: "Please fill in your name, email, where you'd share, and your audience." });
	}
	if (payoutRaw && !EMAIL_RE.test(payoutRaw)) {
		return reply(request, 400, { ok: false, error: "The PayPal email doesn't look right." });
	}
	if (!agreed) return reply(request, 400, { ok: false, error: "Please confirm you'll follow the partner rules." });

	const env = locals.runtime?.env;
	if (!env?.DB) {
		return reply(request, 503, { ok: false, error: `Applications are offline. Email ${BUZZYFLY_CONFIG.orderEmail} instead.` });
	}

	try {
		await ensureAffiliateSchema(env.DB);

		const existing = await env.DB.prepare(`SELECT code FROM affiliates WHERE email = ?`).bind(email).first();
		// Same answer either way, so the form can't be used to discover who is a partner.
		if (existing) return reply(request, 200, { ok: true, message: THANKS });

		const base = cleanCode(text(fields.code, 32)) ?? cleanCode(name) ?? "partner";
		let code = base;
		for (let attempt = 0; attempt < 5; attempt++) {
			const taken = await env.DB.prepare(`SELECT 1 FROM affiliates WHERE code = ?`).bind(code).first();
			if (!taken) break;
			code = `${base.slice(0, 27)}-${randomToken(2)}`;
		}

		await env.DB.prepare(
			`INSERT INTO affiliates (code, name, email, website, audience, payout_email, status, stats_token, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
		)
			.bind(code, name, email, website, audience, payoutRaw || null, randomToken(), Date.now())
			.run();

		const mail = env as unknown as { EMAIL?: EmailBinding; EMAIL_FROM?: string };
		if (mail.EMAIL) {
			await mail.EMAIL.send({
				from: resolveFrom(mail),
				to: BUZZYFLY_CONFIG.orderEmail,
				subject: `New partner application — ${name}`,
				text: [
					`${name} <${email}> applied to the partner program.`,
					"",
					`Where: ${website}`,
					`Audience: ${audience}`,
					`Requested link: /r/${code}`,
					"",
					`Approve or decline: ${BUZZYFLY_CONFIG.siteUrl}/admin/affiliates`,
				].join("\n"),
			}).catch((error: unknown) => console.error("Buzzyfly partners: application alert failed", error));
		}
	} catch (error) {
		console.error("Buzzyfly partners: application failed", error);
		return reply(request, 500, { ok: false, error: `That didn't save. Email ${BUZZYFLY_CONFIG.orderEmail} instead.` });
	}

	return reply(request, 200, { ok: true, message: THANKS });
};
