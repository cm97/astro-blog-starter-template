// Fulfillment watchdog (BACKLOG 0f): paid Stripe Checkout Sessions with no
// fulfillments row are flagged to the owner once, from the hourly cron.
import test from "node:test";
import assert from "node:assert/strict";
import { runFulfillmentWatchdog, WATCHDOG_ALERT_PROVIDER } from "../src/lib/fulfillmentWatchdog";

const NOW = Date.UTC(2026, 10, 26, 20, 0, 0);
const MIN = 60 * 1000;

interface Sent { from: string; to: string; subject: string; html?: string; text?: string }

function mockEmail(fail = false) {
	const sent: Sent[] = [];
	return {
		sent,
		async send(msg: Sent) {
			if (fail) throw new Error("boom");
			sent.push(msg);
			return { messageId: "m" };
		},
	};
}

function fakeDb(fulfilled: string[], alerted: string[] = []) {
	const alerts = new Set(alerted);
	const db = {
		alerts,
		prepare(sql: string) {
			let args: unknown[] = [];
			const stmt = {
				bind(...a: unknown[]) {
					args = a;
					return stmt;
				},
				async all() {
					if (/FROM fulfillments/.test(sql)) {
						return { results: (args as string[]).filter((id) => fulfilled.includes(id)).map((order_id) => ({ order_id })) };
					}
					if (/FROM fulfillment_alerts/.test(sql)) {
						assert.equal(args[0], WATCHDOG_ALERT_PROVIDER);
						return { results: (args.slice(1) as string[]).filter((id) => alerts.has(id)).map((order_id) => ({ order_id })) };
					}
					throw new Error(`fakeDb: unexpected all(): ${sql}`);
				},
				async run() {
					if (/INSERT OR IGNORE INTO fulfillment_alerts/.test(sql)) {
						assert.equal(args[0], WATCHDOG_ALERT_PROVIDER);
						alerts.add(args[1] as string);
						return { meta: { changes: 1 } };
					}
					throw new Error(`fakeDb: unexpected run(): ${sql}`);
				},
			};
			return stmt;
		},
		async batch(stmts: { run(): Promise<unknown> }[]) {
			for (const s of stmts) await s.run();
			return [];
		},
	};
	return db;
}

function session(id: string, minutesAgo: number, payment_status = "paid") {
	return {
		id,
		payment_status,
		created: Math.floor((NOW - minutesAgo * MIN) / 1000),
		amount_total: 4900,
		currency: "usd",
		customer_details: { email: `${id}@example.com` },
		metadata: { item_id: "buzzyfly-digital-system" },
	};
}

function stripeFetch(sessions: unknown[], calls: string[] = [], status = 200) {
	return (async (url: string, init?: RequestInit) => {
		calls.push(`${url} ${(init?.headers as Record<string, string>)?.Authorization ?? ""}`);
		return new Response(JSON.stringify({ data: sessions, has_more: false }), { status });
	}) as unknown as typeof fetch;
}

test("does nothing without a Stripe key (no request, no email)", async () => {
	const calls: string[] = [];
	const EMAIL = mockEmail();
	const r = await runFulfillmentWatchdog({ DB: fakeDb([]) as never, EMAIL }, { now: NOW, fetchImpl: stripeFetch([], calls) });
	assert.equal(r.status, "skipped");
	assert.equal(calls.length, 0);
	assert.equal(EMAIL.sent.length, 0);
});

test("flags only paid sessions older than the grace period with no fulfillment row, once", async () => {
	const calls: string[] = [];
	const db = fakeDb(["cs_ok"]);
	const EMAIL = mockEmail();
	const env = { DB: db as never, EMAIL, STRIPE_WATCHDOG_KEY: "rk_test_x" };
	const sessions = [
		session("cs_ok", 120), // fulfilled
		session("cs_missing", 120), // paid, no row: flag
		session("cs_fresh", 5), // webhook may still be on its way
		session("cs_unpaid", 120, "unpaid"), // not paid yet
	];
	const r = await runFulfillmentWatchdog(env, { now: NOW, fetchImpl: stripeFetch(sessions, calls) });
	assert.deepEqual(r, { status: "alerted", missing: ["cs_missing"] });
	assert.match(calls[0], /^https:\/\/api\.stripe\.com\/v1\/checkout\/sessions\?status=complete&limit=100&created%5Bgte%5D=\d+ Bearer rk_test_x$/);
	assert.equal(EMAIL.sent.length, 1);
	assert.match(EMAIL.sent[0].subject, /cs_missing/);
	assert.match(EMAIL.sent[0].text!, /cs_missing@example\.com/);
	assert.doesNotMatch(EMAIL.sent[0].text!, /cs_fresh|cs_unpaid|cs_ok/);

	// Next run: already alerted, so no second email.
	const again = await runFulfillmentWatchdog(env, { now: NOW, fetchImpl: stripeFetch(sessions) });
	assert.equal(again.status, "ok");
	assert.equal(EMAIL.sent.length, 1);
});

test("a failed alert email is retried next run", async () => {
	const db = fakeDb([]);
	const env = { DB: db as never, EMAIL: mockEmail(true), STRIPE_WATCHDOG_KEY: "rk_test_x" };
	const r = await runFulfillmentWatchdog(env, { now: NOW, fetchImpl: stripeFetch([session("cs_a", 60)]) });
	assert.equal(r.status, "alert-failed");
	assert.equal(db.alerts.size, 0);
});

test("a Stripe error is reported, not thrown", async () => {
	const env = { DB: fakeDb([]) as never, EMAIL: mockEmail(), STRIPE_WATCHDOG_KEY: "rk_test_x" };
	const r = await runFulfillmentWatchdog(env, { now: NOW, fetchImpl: stripeFetch([], [], 401) });
	assert.equal(r.status, "stripe-error");
});
