import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS purchase_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`;

export const POST: APIRoute = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as { email?: string; title?: string; price?: string } | null;
	const email = (body?.email ?? "").trim().toLowerCase();
	const title = (body?.title ?? "").trim().slice(0, 120);
	const price = (body?.price ?? "").trim().slice(0, 20);
	if (!EMAIL_RE.test(email) || title.length < 2 || !price.startsWith("$")) {
		return Response.json({ ok: false, error: "Enter your email and pick a product." }, { status: 400 });
	}
	const env = locals.runtime?.env;
	if (!env?.DB) {
		return Response.json(
			{ ok: false, error: "Could not save that. Email coachmanager@gmail.com instead." },
			{ status: 503 },
		);
	}
	try {
		await env.DB.prepare(CREATE_SQL).run();
		await env.DB.prepare(
			`INSERT INTO purchase_requests (title, price, email, created_at) VALUES (?, ?, ?, ?)`,
		)
			.bind(title, price, email, Date.now())
			.run();
	} catch (error) {
		console.error("purchase request", error);
		return Response.json({ ok: false, error: "Could not save that. Email coachmanager@gmail.com." }, { status: 500 });
	}
	return Response.json({ ok: true });
};
