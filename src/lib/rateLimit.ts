/**
 * Fixed-window rate limiting backed by D1, so the limit holds across every
 * Worker instance (an in-memory Map does not). Falls back to an in-memory
 * counter when D1 is missing or errors, so a database problem can never take
 * checkout or downloads offline: it degrades to the old per-instance limit.
 */
type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

function memoryHit(key: string, limit: number, windowMs: number, consume: boolean): boolean {
	const now = Date.now();
	let bucket = memory.get(key);
	if (!bucket || now > bucket.resetAt) {
		bucket = { count: 0, resetAt: now + windowMs };
		memory.set(key, bucket);
		if (memory.size > 5000) {
			for (const [k, b] of memory) if (now > b.resetAt) memory.delete(k);
		}
	}
	if (consume) bucket.count += 1;
	return bucket.count <= limit;
}

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`;

async function d1Count(db: D1Database, key: string, windowMs: number, consume: boolean): Promise<number> {
	const now = Date.now();
	if (!consume) {
		const row = await db
			.prepare(`SELECT count, reset_at FROM rate_limits WHERE key = ?`)
			.bind(key)
			.first<{ count: number; reset_at: number }>();
		return row && row.reset_at >= now ? row.count : 0;
	}
	const row = await db
		.prepare(
			`INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2 + ?3)
			 ON CONFLICT(key) DO UPDATE SET
			   count    = CASE WHEN reset_at < ?2 THEN 1 ELSE count + 1 END,
			   reset_at = CASE WHEN reset_at < ?2 THEN ?2 + ?3 ELSE reset_at END
			 RETURNING count`,
		)
		.bind(key, now, windowMs)
		.first<{ count: number }>();
	if (Math.random() < 0.01) {
		// Opportunistic cleanup of long-expired rows; never blocks the request.
		await db.prepare(`DELETE FROM rate_limits WHERE reset_at < ?`).bind(now - 86_400_000).run().catch(() => {});
	}
	return row?.count ?? 1;
}

async function count(env: { DB?: D1Database }, key: string, windowMs: number, consume: boolean): Promise<number | null> {
	if (!env?.DB) return null;
	try {
		return await d1Count(env.DB, key, windowMs, consume);
	} catch {
		try {
			await env.DB.prepare(CREATE_TABLE).run(); // first use before the migration ran
			return await d1Count(env.DB, key, windowMs, consume);
		} catch (error) {
			console.error("Buzzyfly rateLimit: D1 unavailable, using in-memory counter", error);
			return null;
		}
	}
}

/** Counts one hit for `key`. Returns true while the caller is still within `limit` per `windowMs`. */
export async function hitRateLimit(
	env: { DB?: D1Database },
	key: string,
	limit: number,
	windowMs: number,
): Promise<boolean> {
	const n = await count(env, key, windowMs, true);
	return n === null ? memoryHit(key, limit, windowMs, true) : n <= limit;
}

/** True when `key` has already used up `limit` hits in the current window. Does not count a hit. */
export async function isRateLimited(
	env: { DB?: D1Database },
	key: string,
	limit: number,
	windowMs: number,
): Promise<boolean> {
	const n = await count(env, key, windowMs, false);
	return n === null ? !memoryHit(key, limit - 1, windowMs, false) : n >= limit;
}
