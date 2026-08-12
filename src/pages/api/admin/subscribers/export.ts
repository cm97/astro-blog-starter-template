import type { APIRoute } from "astro";

export const prerender = false;

function csvEscape(value: string): string {
	if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
	return value;
}

export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const q = url.searchParams.get("q")?.trim() ?? "";

	if (!env.DB) {
		return new Response("No database configured", { status: 500 });
	}

	const rows = await env.DB.prepare(
		`SELECT email, created_at FROM subscribers WHERE email LIKE ? ORDER BY created_at DESC`,
	)
		.bind(`%${q}%`)
		.all<{ email: string; created_at: number }>();

	const lines = ["email,subscribed_at"];
	for (const row of rows.results ?? []) {
		lines.push(`${csvEscape(row.email)},${new Date(row.created_at).toISOString()}`);
	}

	return new Response(lines.join("\n") + "\n", {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="buzzyfly-subscribers.csv"`,
		},
	});
};
