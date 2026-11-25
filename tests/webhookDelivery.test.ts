// Local end-to-end test of the Stripe $49 webhook -> D1 order -> app key ->
// delivery email -> refund/dispute revoke path. Runs the real POST handler in
// src/pages/api/webhook.ts against a real SQLite database (node:sqlite) shaped
// like D1, with locally generated signing secrets and a mocked EMAIL binding.
// Run with `npm run test:webhook`. Proves the code paths; it cannot prove
// Stripe or Cloudflare Email Service behave the same in production.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import { POST } from "../src/pages/api/webhook";
import { stripeWebhookSecrets } from "../src/lib/webhookSecurity";
import { verifyAppKey } from "../src/lib/appAccess";

// Generated per run; never a real Stripe secret.
const SECRET_APEX = `whsec_local_${randomBytes(12).toString("hex")}`;
const SECRET_WWW = `whsec_local_${randomBytes(12).toString("hex")}`;

function d1(db: DatabaseSync) {
	const stmt = (sql: string, params: unknown[] = []) => ({
		bind: (...p: unknown[]) => stmt(sql, p),
		async run() {
			const r = db.prepare(sql).run(...(params as any[]));
			return { success: true, meta: { changes: Number(r.changes) } };
		},
		async first<T>() {
			return (db.prepare(sql).get(...(params as any[])) ?? null) as T | null;
		},
		async all<T>() {
			return { results: db.prepare(sql).all(...(params as any[])) as T[] };
		},
	});
	return { prepare: (sql: string) => stmt(sql) } as unknown as D1Database;
}

function freshDb() {
	const db = new DatabaseSync(":memory:");
	// Same schema as production: every migration in order.
	for (const f of readdirSync("migrations").filter((n) => n.endsWith(".sql")).sort()) {
		db.exec(readFileSync(`migrations/${f}`, "utf8"));
	}
	return db;
}

let sql: DatabaseSync;
let sent: any[];
let env: any;

beforeEach(() => {
	sql = freshDb();
	sent = [];
	env = {
		DB: d1(sql),
		STRIPE_WEBHOOK_SECRET: `${SECRET_APEX},${SECRET_WWW}`,
		EMAIL_FROM: "Buzzyfly <orders@buzzyfly.com>",
		EMAIL: {
			async send(msg: any) {
				sent.push(msg);
				return { messageId: `mock-${sent.length}` };
			},
		},
	};
});

function sign(body: string, secret: string, t = Math.floor(Date.now() / 1000)) {
	const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
	return `t=${t},v1=${v1}`;
}

async function deliver(event: object, secret = SECRET_APEX, header?: string) {
	const body = JSON.stringify(event);
	const request = new Request("https://buzzyfly.com/api/webhook", {
		method: "POST",
		headers: { "content-type": "application/json; charset=utf-8", "stripe-signature": header ?? sign(body, secret) },
		body,
	});
	const res = await (POST as any)({ request, locals: { runtime: { env } } });
	const text = await res.text();
	let json: any = null;
	try {
		json = JSON.parse(text);
	} catch {}
	return { status: res.status, text, json };
}

const SESSION = "cs_live_localTEST000000000000000001";
const PI = "pi_localTEST0001";

// Shape of a real checkout.session.completed from plink_1U4ZscRxSLoSSvA0ZSVk4SMm
// (metadata copied from the Payment Link, card-only, paid).
function completed(overrides: Record<string, unknown> = {}) {
	return {
		id: "evt_localCompleted1",
		object: "event",
		type: "checkout.session.completed",
		livemode: true,
		data: {
			object: {
				id: SESSION,
				object: "checkout.session",
				mode: "payment",
				amount_total: 4900,
				currency: "usd",
				payment_link: "plink_1U4ZscRxSLoSSvA0ZSVk4SMm",
				metadata: { item_id: "buzzyfly-digital-system" },
				payment_status: "paid",
				status: "complete",
				payment_intent: PI,
				client_reference_id: "internal",
				customer_details: { email: "buyer@example.test" },
				...overrides,
			},
		},
	};
}

const refund = (amount_refunded = 4900) => ({
	id: "evt_localRefund1",
	type: "charge.refunded",
	data: { object: { id: "ch_local1", object: "charge", amount: 4900, amount_refunded, refunded: amount_refunded >= 4900, payment_intent: PI } },
});
const dispute = {
	id: "evt_localDispute1",
	type: "charge.dispute.created",
	data: { object: { id: "dp_local1", object: "dispute", charge: "ch_local1", payment_intent: PI } },
};

test("secrets: comma list and _WWW are both accepted, deduped, never empty strings", () => {
	assert.deepEqual(stripeWebhookSecrets({ STRIPE_WEBHOOK_SECRET: " a , b ", STRIPE_WEBHOOK_SECRET_WWW: "b" }), ["a", "b"]);
	assert.deepEqual(stripeWebhookSecrets({}), []);
});

test("bad signature -> 401, nothing written, no email", async () => {
	const r = await deliver(completed(), SECRET_APEX, "t=1,v1=00");
	assert.equal(r.status, 401);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM fulfillments").get()!.n, 0);
	assert.equal(sent.length, 0);
});

test("paid $49 session (apex secret) -> 200, order row, app key, one email with working key", async () => {
	const r = await deliver(completed());
	assert.equal(r.status, 200);
	assert.deepEqual(r.json, { received: true, fulfilled: true, delivered: true });
	const row: any = sql.prepare("SELECT * FROM fulfillments WHERE order_id = ?").get(SESSION);
	assert.equal(row.item_id, "buzzyfly-digital-system");
	assert.equal(row.customer_email, "buyer@example.test");
	assert.equal(row.source, "internal");
	const tokens: any[] = sql.prepare("SELECT token, item_id FROM download_tokens WHERE order_id = ?").all(SESSION);
	assert.equal(tokens.length, 1);
	assert.match(tokens[0].token, /^[a-f0-9]{64}$/);
	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, "buyer@example.test");
	assert.equal(sent[0].from, "Buzzyfly <orders@buzzyfly.com>");
	assert.ok(sent[0].text.includes(`https://buzzyfly.com/app?key=${tokens[0].token}`));
	assert.deepEqual(await verifyAppKey(env, tokens[0].token), { orderId: SESSION });
});

test("www endpoint's secret also verifies (previously one endpoint always got 401)", async () => {
	const r = await deliver(completed(), SECRET_WWW);
	assert.equal(r.status, 200);
	assert.equal(sent.length, 1);
});

test("same event via both endpoints / Stripe retry -> idempotent: one row, one key, one email", async () => {
	await deliver(completed(), SECRET_APEX);
	const again = await deliver(completed(), SECRET_WWW);
	const third = await deliver(completed(), SECRET_APEX);
	assert.equal(again.status, 200);
	assert.equal(again.json.duplicate, true);
	assert.equal(third.json.duplicate, true);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM fulfillments").get()!.n, 1);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM download_tokens").get()!.n, 1);
	assert.equal(sent.length, 1);
});

test("unpaid completed session (delayed method) -> 200 ack, no unlock, no email", async () => {
	const r = await deliver(completed({ payment_status: "unpaid" }));
	assert.equal(r.status, 200);
	assert.equal(r.json.fulfilled, false);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM download_tokens").get()!.n, 0);
	assert.equal(sent.length, 0);
});

test("email send failure still records order + key (buyer unlocks on /thank-you); 200 so no duplicate keys", async () => {
	env.EMAIL = { async send() { throw new Error("mock: domain not onboarded"); } };
	const errs: string[] = [];
	const orig = console.error;
	console.error = (...a: unknown[]) => errs.push(a.map(String).join(" "));
	try {
		const r = await deliver(completed());
		assert.equal(r.status, 200);
		assert.equal(r.json.delivered, false);
	} finally {
		console.error = orig;
	}
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM download_tokens").get()!.n, 1);
	assert.ok(errs.some((l) => l.includes("DELIVERY FAILED")));
});

test("partial refund -> access kept", async () => {
	await deliver(completed());
	const r = await deliver(refund(1000));
	assert.equal(r.status, 200);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM download_tokens").get()!.n, 1);
});

test("full refund -> key deleted, app locked, no new key from /thank-you path, replay safe", async () => {
	await deliver(completed());
	const key: any = sql.prepare("SELECT token FROM download_tokens").get();
	const r = await deliver(refund());
	assert.equal(r.status, 200);
	assert.deepEqual(r.json, { received: true, revoked: true, orderId: SESSION });
	assert.equal(await verifyAppKey(env, key.token), null);
	const { appKeyForOrder } = await import("../src/lib/appAccess");
	assert.equal(await appKeyForOrder(env, { orderId: SESSION, itemId: "buzzyfly-digital-system" }), null);
	const replay = await deliver(refund());
	assert.equal(replay.status, 200);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM order_revocations").get()!.n, 1);
	// A late checkout retry must not re-email or re-key.
	const late = await deliver(completed());
	assert.equal(late.json.duplicate, true);
	assert.equal(sent.length, 1);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM download_tokens").get()!.n, 0);
});

test("dispute -> key deleted, reason recorded", async () => {
	await deliver(completed());
	const r = await deliver(dispute);
	assert.equal(r.json.revoked, true);
	assert.equal(sql.prepare("SELECT COUNT(*) n FROM download_tokens").get()!.n, 0);
	assert.equal((sql.prepare("SELECT reason FROM order_revocations").get() as any).reason, "dispute");
});

test("refund for an unknown payment -> 200 ack, logged, nothing deleted", async () => {
	const orig = console.error;
	console.error = () => {};
	try {
		const r = await deliver(refund());
		assert.equal(r.status, 200);
		assert.equal(r.json.revoked, false);
	} finally {
		console.error = orig;
	}
});
