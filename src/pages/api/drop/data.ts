import type { APIRoute } from "astro";
import { DROP_COOKIE, DROP_DATA_MAX_BYTES, checkDropAccess, loadDropData, saveDropData } from "../../../lib/dropAccess";

export const prerender = false;

const ISSUE_PATTERN = /^\d{4}-\d{2}$/;

function reply(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", "cache-control": "private, no-store" },
	});
}

/** Loads a subscriber's saved work for one monthly issue: GET /api/drop/data?issue=2026-10 */
export const GET: APIRoute = async ({ url, locals, cookies }) => {
	const env = locals.runtime.env;
	const access = await checkDropAccess(env, cookies.get(DROP_COOKIE)?.value);
	if (!access.ok) return reply(401, { error: access.reason });

	const issue = url.searchParams.get("issue") ?? "";
	if (!ISSUE_PATTERN.test(issue)) return reply(400, { error: "bad issue" });
	if (!env.DB) return reply(503, { error: "storage unavailable" });

	const data = await loadDropData(env.DB, access.account.accountId, issue);
	return reply(200, { issue, data: data ? JSON.parse(data) : null, email: access.account.email });
};

/** Saves a subscriber's work for one monthly issue: PUT /api/drop/data?issue=2026-10 with a JSON object body. */
export const PUT: APIRoute = async ({ request, url, locals, cookies }) => {
	const env = locals.runtime.env;
	// The cookie is SameSite=Lax, so other sites can't send it. Refuse cross-site writes outright as well.
	const origin = request.headers.get("origin");
	if (origin && origin !== url.origin) return reply(403, { error: "cross-site" });
	const access = await checkDropAccess(env, cookies.get(DROP_COOKIE)?.value);
	if (!access.ok) return reply(401, { error: access.reason });

	const issue = url.searchParams.get("issue") ?? "";
	if (!ISSUE_PATTERN.test(issue)) return reply(400, { error: "bad issue" });
	if (!env.DB) return reply(503, { error: "storage unavailable" });

	const raw = await request.text();
	if (raw.length > DROP_DATA_MAX_BYTES) return reply(413, { error: "too large" });
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return reply(400, { error: "invalid json" });
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400, { error: "expected an object" });

	await saveDropData(env.DB, access.account.accountId, issue, JSON.stringify(parsed));
	return reply(200, { saved: true });
};
