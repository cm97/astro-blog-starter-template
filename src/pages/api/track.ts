import type { APIRoute } from "astro";
import { ensureFunnelSchema } from "../../lib/schema";
import { cleanSourceTriple } from "../../lib/trafficSource";

export const prerender = false;

/**
 * First-party funnel counter. TrafficSource.astro sends one beacon per page
 * view and per buy-button click; each one adds 1 to a daily count in D1
 * (funnel_daily). No cookies, IP addresses or visitor ids are stored.
 * Always answers 204 so tracking can never break a page.
 */
const EVENTS = new Set(["view", "buy_click"]);
const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|scrapy/i;

// The table is created once per Worker isolate, not on every beacon.
let schemaReady = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const done = new Response(null, { status: 204 });
	const env = locals.runtime.env;
	if (!env.DB) return done;
	if (BOT_UA.test(request.headers.get("user-agent") ?? "")) return done;

	let body: { event?: unknown; path?: unknown; source?: unknown };
	try {
		const text = await request.text();
		if (text.length > 1024) return done;
		body = JSON.parse(text);
	} catch {
		return done;
	}

	const event = typeof body.event === "string" && EVENTS.has(body.event) ? body.event : null;
	const path = cleanPath(body.path);
	if (!event || !path) return done;
	const source = cleanSourceTriple(body.source) ?? "direct";
	const day = new Date().toISOString().slice(0, 10);

	try {
		if (!schemaReady) {
			await ensureFunnelSchema(env.DB);
			schemaReady = true;
		}
		await env.DB.prepare(
			`INSERT INTO funnel_daily (day, event, path, source, count) VALUES (?, ?, ?, ?, 1)
			 ON CONFLICT (day, event, path, source) DO UPDATE SET count = count + 1`,
		)
			.bind(day, event, path, source)
			.run();
	} catch (error) {
		console.error("Buzzyfly track: could not record event", error);
	}
	return done;
};

/** "/blog/scope-creep-script/" -> "/blog/scope-creep-script". Only plain site paths are kept. */
function cleanPath(value: unknown): string | null {
	if (typeof value !== "string" || !value.startsWith("/")) return null;
	const path = value.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
	if (path.length > 120 || !/^[a-z0-9/_.-]+$/i.test(path)) return null;
	if (path.startsWith("/admin") || path.startsWith("/api")) return null;
	return path.toLowerCase();
}
