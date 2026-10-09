// Partner program tests. Runs the real SQL in src/lib/affiliates.ts against an
// in-memory SQLite database (node:sqlite) wrapped to look like Cloudflare D1.
// Run with `npm run test:partners`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
	HOLD_DAYS,
	cleanCode,
	codeFromCookieHeader,
	codeFromStripeReference,
	commissionRateFor,
	ensureAffiliateSchema,
	listPriceCents,
	partnerSummary,
	recordClick,
	recordCommission,
	rememberOrderRef,
	lookupOrderRef,
	safeLandingPath,
} from "../src/lib/affiliates";

/** Just enough of the D1 API for the code under test. */
function fakeD1(): D1Database {
	const sqlite = new DatabaseSync(":memory:");
	const statement = (sql: string, args: unknown[] = []) => ({
		bind: (...next: unknown[]) => statement(sql, next),
		async run() {
			const info = sqlite.prepare(sql).run(...(args as never[]));
			return { success: true, meta: { changes: Number(info.changes) } };
		},
		async first<T>() {
			return (sqlite.prepare(sql).get(...(args as never[])) ?? null) as T | null;
		},
		async all<T>() {
			return { success: true, results: sqlite.prepare(sql).all(...(args as never[])) as T[] };
		},
	});
	return {
		prepare: (sql: string) => statement(sql),
		async batch(statements: { run(): Promise<unknown> }[]) {
			const out = [];
			for (const s of statements) out.push(await s.run());
			return out;
		},
	} as unknown as D1Database;
}

async function withPartner(status = "active", rate = 40) {
	const db = fakeD1();
	await ensureAffiliateSchema(db);
	await db
		.prepare(
			`INSERT INTO affiliates (code, name, email, payout_email, status, rate_pct, stats_token, created_at)
			 VALUES ('jane', 'Jane', 'jane@example.com', 'jane-pay@example.com', ?, ?, 'tok', 0)`,
		)
		.bind(status, rate)
		.run();
	return db;
}

const sale = (overrides: Partial<Parameters<typeof recordCommission>[1]> = {}) => ({
	provider: "paypal",
	orderId: "ORDER1",
	itemId: "buzzyfly-digital-system",
	code: "jane",
	buyerEmail: "buyer@example.com",
	saleCents: 4900,
	...overrides,
});

test("partner codes are normalised and junk is rejected", () => {
	assert.equal(cleanCode("Jane Doe!"), "jane-doe");
	assert.equal(cleanCode("--Ab--"), "ab");
	assert.equal(cleanCode("x"), null);
	assert.equal(cleanCode("<script>"), "script");
	assert.equal(cleanCode(undefined), null);
	assert.equal(cleanCode("a".repeat(50))?.length, 32);
});

test("/r/<code> only redirects to paths on this site", () => {
	assert.equal(safeLandingPath("/store"), "/store");
	assert.equal(safeLandingPath("/store#digital-system"), "/store#digital-system");
	for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "/a b", null, ""]) {
		assert.equal(safeLandingPath(bad as string), "/", String(bad));
	}
});

test("partner code survives the cookie and the Stripe client_reference_id", () => {
	assert.equal(codeFromCookieHeader("a=1; bf_ref=jane; b=2"), "jane");
	assert.equal(codeFromCookieHeader("bf_ref=%E0%A4%A"), null); // malformed encoding must not throw
	assert.equal(codeFromCookieHeader(null), null);
	assert.equal(codeFromStripeReference("aff-jane"), "jane");
	assert.equal(codeFromStripeReference("reddit__social__x"), null);
});

test("the setup pays partners at most 20%; products pay their rate", () => {
	assert.equal(commissionRateFor("done-for-you-setup", 40), 20);
	assert.equal(commissionRateFor("done-for-you-setup", 10), 10);
	assert.equal(commissionRateFor("buzzyfly-digital-system", 40), 40);
	assert.equal(listPriceCents("complete-business-bundle"), 9700);
	assert.equal(listPriceCents("nope"), 0);
});

test("a referred sale records one commission, retries don't double it", async () => {
	const db = await withPartner();
	assert.deepEqual(await recordCommission(db, sale()), { recorded: true, commissionCents: 1960 });
	assert.deepEqual(await recordCommission(db, sale()), { recorded: false, reason: "already recorded" });
	const summary = await partnerSummary(db, "jane");
	assert.equal(summary.sales, 1);
	assert.equal(summary.pendingCents, 1960);
	assert.equal(summary.payableCents, 0);
});

test("commission falls back to list price when the provider sends no amount", async () => {
	const db = await withPartner();
	const out = await recordCommission(db, sale({ itemId: "complete-business-bundle", saleCents: null }));
	assert.deepEqual(out, { recorded: true, commissionCents: 3880 });
});

test("self-referrals, unknown and paused partners earn nothing", async () => {
	const db = await withPartner();
	assert.equal((await recordCommission(db, sale({ buyerEmail: "JANE@example.com" }))).recorded, false);
	assert.equal((await recordCommission(db, sale({ buyerEmail: "jane-pay@example.com", orderId: "2" }))).recorded, false);
	assert.equal((await recordCommission(db, sale({ code: "bob", orderId: "3" }))).recorded, false);
	assert.equal((await recordCommission(db, sale({ code: null, orderId: "4" }))).recorded, false);
	assert.equal((await recordCommission(undefined, sale())).recorded, false);

	const paused = await withPartner("paused");
	assert.equal((await recordCommission(paused, sale())).recorded, false);
});

test("commissions become payable after the refund window; voids drop out", async () => {
	const db = await withPartner();
	await recordCommission(db, sale({ orderId: "old" }));
	await recordCommission(db, sale({ orderId: "refunded" }));
	await recordCommission(db, sale({ orderId: "new" }));
	const longAgo = Date.now() - (HOLD_DAYS + 1) * 86_400_000;
	await db.prepare(`UPDATE affiliate_commissions SET created_at = ? WHERE order_id IN ('old', 'refunded')`).bind(longAgo).run();
	await db.prepare(`UPDATE affiliate_commissions SET status = 'void' WHERE order_id = 'refunded'`).run();

	const summary = await partnerSummary(db, "jane");
	assert.equal(summary.sales, 2);
	assert.equal(summary.payableCents, 1960);
	assert.equal(summary.pendingCents, 1960);
	assert.equal(summary.paidCents, 0);
});

test("PayPal order refs round-trip and clicks count per day", async () => {
	const db = await withPartner();
	await rememberOrderRef(db, "paypal", "PP1", "jane");
	await rememberOrderRef(db, "paypal", "PP1", "someone-else"); // first ref wins
	assert.equal(await lookupOrderRef(db, "paypal", "PP1"), "jane");
	assert.equal(await lookupOrderRef(db, "paypal", "nope"), null);

	await recordClick(db, "jane");
	await recordClick(db, "jane");
	assert.equal((await partnerSummary(db, "jane")).clicks30d, 2);
});
