// Rate limiter tests: an in-memory D1 that implements the upsert, plus the
// fallbacks. Run with `npm run test:ratelimit`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitRateLimit, isRateLimited } from "../src/lib/rateLimit";

function fakeDb(opts: { failFirst?: boolean; alwaysFail?: boolean } = {}) {
	const rows = new Map<string, { count: number; reset_at: number }>();
	let failed = false;
	let tableMade = !opts.failFirst;
	const prepare = (sql: string) => {
		let args: any[] = [];
		const stmt = {
			bind(...a: any[]) {
				args = a;
				return stmt;
			},
			async first() {
				if (opts.alwaysFail || !tableMade) throw new Error("no such table: rate_limits");
				if (/INSERT INTO rate_limits/.test(sql)) {
					const [key, now, win] = args as [string, number, number];
					const r = rows.get(key);
					if (!r || r.reset_at < now) rows.set(key, { count: 1, reset_at: now + win });
					else r.count += 1;
					return { count: rows.get(key)!.count };
				}
				const r = rows.get(args[0]);
				return r ?? null;
			},
			async run() {
				if (/CREATE TABLE/.test(sql)) {
					if (opts.alwaysFail) throw new Error("d1 down");
					tableMade = true;
				}
				return { meta: { changes: 0 } };
			},
		};
		return stmt;
	};
	void failed;
	return { prepare } as unknown as D1Database;
}

test("allows up to the limit then blocks, per key", async () => {
	const env = { DB: fakeDb() };
	for (let i = 0; i < 3; i++) assert.equal(await hitRateLimit(env, "k1", 3, 60_000), true);
	assert.equal(await hitRateLimit(env, "k1", 3, 60_000), false);
	assert.equal(await hitRateLimit(env, "k2", 3, 60_000), true, "other keys unaffected");
});

test("isRateLimited does not consume and flips once the limit is hit", async () => {
	const env = { DB: fakeDb() };
	assert.equal(await isRateLimited(env, "lock", 2, 60_000), false);
	await hitRateLimit(env, "lock", 2, 60_000);
	assert.equal(await isRateLimited(env, "lock", 2, 60_000), false);
	await hitRateLimit(env, "lock", 2, 60_000);
	assert.equal(await isRateLimited(env, "lock", 2, 60_000), true);
});

test("creates the table on first use when the migration has not run", async () => {
	const env = { DB: fakeDb({ failFirst: true }) };
	assert.equal(await hitRateLimit(env, "fresh", 1, 60_000), true);
	assert.equal(await hitRateLimit(env, "fresh", 1, 60_000), false);
});

test("falls back to in-memory limiting when D1 is missing or down", async () => {
	const quiet = console.error;
	console.error = () => {};
	try {
		for (const env of [{}, { DB: fakeDb({ alwaysFail: true }) }]) {
			const key = `mem-${Math.random()}`;
			assert.equal(await hitRateLimit(env, key, 2, 60_000), true);
			assert.equal(await hitRateLimit(env, key, 2, 60_000), true);
			assert.equal(await hitRateLimit(env, key, 2, 60_000), false);
		}
	} finally {
		console.error = quiet;
	}
});
