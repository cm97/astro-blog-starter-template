import { cleanSource } from "./trafficSource";

/**
 * First-party funnel measurement. /buy/<id> records one row per buy click so
 * the admin dashboard can compare "clicked buy" with "paid" per product.
 * No cookies, no third-party scripts, no personal data (no IP, no email).
 *
 * Keep in step with migrations/0009_checkout_starts.sql.
 */
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS checkout_starts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    TEXT NOT NULL,
  source     TEXT,
  method     TEXT NOT NULL,
  is_bot     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
)`;

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i;

/** "reddit__social__scope-creep" from a ?src= value, or null. Same format the opt-in stores. */
export function cleanSourceParam(value: string | null): string | null {
	if (!value) return null;
	const cleaned = value
		.split("__")
		.slice(0, 3)
		.map((part) => cleanSource(part) ?? "")
		.join("__")
		.replace(/(__)+$/, "");
	return cleaned || null;
}

/** Best effort: a failed write must never block a buyer from reaching checkout. */
export async function recordCheckoutStart(
	env: { DB?: D1Database },
	click: { itemId: string; source: string | null; method: string; userAgent: string | null },
): Promise<void> {
	if (!env.DB) return;
	try {
		await env.DB.prepare(CREATE_SQL).run();
		await env.DB.prepare(
			`INSERT INTO checkout_starts (item_id, source, method, is_bot, created_at) VALUES (?, ?, ?, ?, ?)`,
		)
			.bind(click.itemId, click.source, click.method, BOT_RE.test(click.userAgent ?? "") ? 1 : 0, Date.now())
			.run();
	} catch (error) {
		console.error("Buzzyfly buy: could not record checkout start", error);
	}
}
