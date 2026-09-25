import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,24})+$/;

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS domain_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
)`;

export const POST: APIRoute = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as { domain?: string; email?: string; note?: string } | null;
	const domain = (body?.domain ?? "").trim().toLowerCase();
	const email = (body?.email ?? "").trim().toLowerCase();
	const note = (body?.note ?? "").trim().slice(0, 280);
	if (!DOMAIN_RE.test(domain) || !EMAIL_RE.test(email)) {
		return Response.json({ ok: false, error: "Enter a real domain and email." }, { status: 400 });
	}

	const env = locals.runtime?.env;
	if (!env?.DB) {
		return Response.json(
			{
				ok: false,
				error: "The desk cannot store that right now. Email coachmanager@gmail.com with the name you want.",
			},
			{ status: 503 },
		);
	}

	try {
		await env.DB.prepare(CREATE_SQL).run();
		await env.DB.prepare(
			`INSERT INTO domain_leads (domain, email, note, created_at) VALUES (?, ?, ?, ?)`,
		)
			.bind(domain, email, note, Date.now())
			.run();
	} catch (error) {
		console.error("domain lead insert failed", error);
		return Response.json(
			{ ok: false, error: "Could not save the request. Email coachmanager@gmail.com instead." },
			{ status: 500 },
		);
	}

	return Response.json({ ok: true });
};
