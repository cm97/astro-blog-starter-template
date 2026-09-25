import type { APIRoute } from "astro";
import { checkNames, inventNames } from "../../lib/domains";

export const prerender = false;

const hits: number[] = [];

function allow(): boolean {
	const now = Date.now();
	while (hits.length > 0 && now - hits[0] > 60_000) hits.shift();
	if (hits.length >= 12) return false;
	hits.push(now);
	return true;
}

export const POST: APIRoute = async ({ request, locals }) => {
	if (!allow()) {
		return Response.json({ ok: false, error: "Too many checks. Wait a minute." }, { status: 429 });
	}
	const body = (await request.json().catch(() => null)) as { mode?: string; query?: string } | null;
	const query = (body?.query ?? "").trim().replace(/\s+/g, " ").slice(0, 280);
	if (query.length < 1) {
		return Response.json({ ok: false, error: "Type something to search." }, { status: 400 });
	}
	const runtimeEnv = (locals as { runtime?: { env?: { XAI_API_KEY?: string } } }).runtime?.env;
	const apiKey = runtimeEnv?.XAI_API_KEY || process.env.XAI_API_KEY;
	if (body?.mode === "invent") {
		if (query.length < 3) {
			return Response.json({ ok: false, error: "Say a little more about what the name is for." }, { status: 400 });
		}
		const result = await inventNames(query, apiKey);
		return Response.json(result);
	}
	const result = await checkNames(query);
	return Response.json(result, { status: result.ok ? 200 : 400 });
};
