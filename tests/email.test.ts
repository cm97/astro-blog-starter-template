// Local email tests: mock the Cloudflare EMAIL binding and a tiny in-memory D1,
// then exercise the real send functions. Run with `npm run test:email`.
// Proves the code paths build correct messages and handle failures; it cannot
// prove Cloudflare accepts or delivers them (that needs a live send).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
	ALLOWED_SENDERS,
	resolveFrom,
	sendDeliveryEmail,
	sendFollowUpEmail,
	type EmailBinding,
} from "../src/lib/email";
import { renderSequenceEmail, sendDueSequenceEmails, sendSequenceEmail } from "../src/lib/emailSequence";
import { sendBrandEmail } from "../src/lib/outbox";
import { EMAIL_SEQUENCE } from "../src/data/emailSequence";
import { absoluteBuyUrl, getProduct } from "../src/data/monetization";

type Sent = Parameters<EmailBinding["send"]>[0];

function mockEmail(fail = false): EmailBinding & { sent: Sent[] } {
	const sent: Sent[] = [];
	return {
		sent,
		async send(msg) {
			if (fail) throw new Error("mock: domain not onboarded");
			sent.push(msg);
			return { messageId: `mock-${sent.length}` };
		},
	};
}

function captureErrors() {
	const lines: string[] = [];
	const original = console.error;
	console.error = (...args: unknown[]) => lines.push(args.map(String).join(" "));
	return { lines, restore: () => (console.error = original) };
}

function addressOf(from: string): string {
	return (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
}

function assertValidHtml(html: string) {
	assert.match(html, /^<!doctype html>/i);
	for (const tag of ["html", "body"]) {
		assert.equal((html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length, 1, `one <${tag}>`);
		assert.equal((html.match(new RegExp(`</${tag}>`, "g")) ?? []).length, 1, `one </${tag}>`);
	}
	for (const tag of ["p", "a", "ul", "ol", "li", "blockquote"]) {
		const open = (html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length;
		const close = (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
		assert.equal(open, close, `balanced <${tag}>`);
	}
	assert.doesNotMatch(html, /undefined|null|\{(checklist|store|orderEmail)\}/);
}

const ENV_FROM = "Buzzyfly <orders@buzzyfly.com>"; // wrangler.json vars.EMAIL_FROM

// --- Delivery ---------------------------------------------------------------

test("delivery email sends from an allowed address with link, expiry and upsell", async () => {
	const EMAIL = mockEmail();
	const url = "https://buzzyfly.com/api/download?token=abc.def";
	const result = await sendDeliveryEmail(
		{ to: "buyer@example.com", downloadUrl: url, productName: "Buzzyfly Digital System", orderId: "cs_test_1", itemId: "buzzyfly-digital-system" },
		{ EMAIL, EMAIL_FROM: ENV_FROM },
	);
	assert.deepEqual(result, { sent: true });
	assert.equal(EMAIL.sent.length, 1);
	const msg = EMAIL.sent[0];
	assert.ok(ALLOWED_SENDERS.includes(addressOf(msg.from)), msg.from);
	assert.equal(msg.to, "buyer@example.com");
	assert.equal(msg.subject, "Your Buzzyfly Digital System download");
	assertValidHtml(msg.html!);
	assert.ok(msg.html!.includes(`href="${url}"`));
	assert.match(msg.html!, /expires in 3 days/);
	assert.match(msg.html!, /Complete Business Bundle/); // UPSELL_MAP: digital-system -> bundle
	const bundleUrl = absoluteBuyUrl(getProduct("complete-business-bundle")!);
	assert.ok(msg.html!.includes(`href="${bundleUrl}"`), "upsell links to the bundle checkout");
	assert.doesNotMatch(msg.html!, /buzzyfly\.comhttps?:/); // site URL glued onto a full Stripe URL
	assert.ok(msg.text!.includes(url));
	assert.ok(msg.text!.includes(bundleUrl));
	assert.match(msg.text!, /Complete Business Bundle/);
	assert.doesNotMatch(msg.text!, /</);
});

test("every product's delivery email carries the upsell from UPSELL_MAP", async () => {
	const ladder: Record<string, string | null> = {
		"weekly-reset-checklist": "Client Onboarding Kit",
		"follow-up-email-templates": "Buzzyfly Digital System",
		"client-onboarding-kit": "Buzzyfly Digital System",
		"buzzyfly-digital-system": "Complete Business Bundle",
		"complete-business-bundle": null,
	};
	for (const [itemId, upsell] of Object.entries(ladder)) {
		const EMAIL = mockEmail();
		await sendDeliveryEmail({ to: "b@example.com", downloadUrl: "https://x/y", productName: itemId, orderId: "o", itemId }, { EMAIL });
		const html = EMAIL.sent[0].html!;
		if (upsell) assert.ok(html.includes(`Get ${upsell}`), `${itemId} -> ${upsell}`);
		else assert.doesNotMatch(html, /One more thing/, `${itemId} has no upsell`);
	}
});

test("delivery email escapes product names", async () => {
	const EMAIL = mockEmail();
	await sendDeliveryEmail({ to: "b@example.com", downloadUrl: "https://x/y", productName: "<script>x</script>", orderId: "o" }, { EMAIL });
	assert.doesNotMatch(EMAIL.sent[0].html!, /<script>/);
});

test("delivery failure returns sent:false and logs order id, recipient and error", async () => {
	const errors = captureErrors();
	try {
		const result = await sendDeliveryEmail(
			{ to: "buyer@example.com", downloadUrl: "https://x/y", productName: "P", orderId: "cs_test_fail" },
			{ EMAIL: mockEmail(true) },
		);
		assert.equal(result.sent, false);
		assert.match(result.reason!, /domain not onboarded/);
		assert.ok(errors.lines.some((l) => l.includes("cs_test_fail") && l.includes("buyer@example.com") && l.includes("domain not onboarded")));
	} finally {
		errors.restore();
	}
});

test("delivery without a binding or recipient returns a reason, never throws", async () => {
	assert.equal((await sendDeliveryEmail({ to: "a@b.co", downloadUrl: "u", productName: "p", orderId: "o" }, {})).sent, false);
	assert.equal((await sendDeliveryEmail({ to: "", downloadUrl: "u", productName: "p", orderId: "o" }, { EMAIL: mockEmail() })).sent, false);
});

// --- From address -----------------------------------------------------------

test("resolveFrom keeps allowed senders and rejects anything else", () => {
	const errors = captureErrors();
	try {
		assert.equal(resolveFrom({}), "Buzzyfly <orders@buzzyfly.com>");
		assert.equal(resolveFrom({ EMAIL_FROM: ENV_FROM }), ENV_FROM);
		assert.equal(resolveFrom({ EMAIL_FROM: "hello@buzzyfly.com" }), "hello@buzzyfly.com");
		assert.equal(resolveFrom({ EMAIL_FROM: "Me <me@gmail.com>" }), "Buzzyfly <orders@buzzyfly.com>");
		assert.ok(errors.lines.some((l) => l.includes("me@gmail.com")));
	} finally {
		errors.restore();
	}
});

// --- Follow-up --------------------------------------------------------------

test("follow-up email sends with the next upsell", async () => {
	const EMAIL = mockEmail();
	const result = await sendFollowUpEmail({ to: "b@example.com", itemId: "weekly-reset-checklist", orderId: "o1" }, { EMAIL, EMAIL_FROM: ENV_FROM });
	assert.deepEqual(result, { sent: true });
	const msg = EMAIL.sent[0];
	assert.ok(ALLOWED_SENDERS.includes(addressOf(msg.from)));
	assertValidHtml(msg.html!);
	assert.match(msg.html!, /Client Onboarding Kit/);
	assert.match(msg.text!, /Client Onboarding Kit/);
});

// --- Sequence ---------------------------------------------------------------

test("every sequence email (0-6) renders and sends with unsubscribe link and address", async () => {
	assert.equal(EMAIL_SEQUENCE.length, 7); // welcome (0) + six weekly emails (1-6)
	for (let step = 0; step < EMAIL_SEQUENCE.length; step++) {
		const EMAIL = mockEmail();
		const result = await sendSequenceEmail(step, "sub@example.com", "tok-123", { EMAIL, EMAIL_FROM: ENV_FROM }, "PO Box 1, Testville");
		assert.deepEqual(result, { sent: true }, `step ${step}`);
		const msg = EMAIL.sent[0];
		assert.ok(ALLOWED_SENDERS.includes(addressOf(msg.from)));
		assert.equal(msg.subject, EMAIL_SEQUENCE[step].subject);
		assertValidHtml(msg.html!);
		for (const body of [msg.html!, msg.text!]) {
			assert.ok(body.includes("https://buzzyfly.com/unsubscribe?token=tok-123"), `step ${step} unsubscribe`);
			assert.ok(body.includes("PO Box 1, Testville"), `step ${step} address`);
			assert.doesNotMatch(body, /\{(checklist|store|orderEmail)\}/);
		}
	}
});

test("sequence send failure logs step, recipient and error", async () => {
	const errors = captureErrors();
	try {
		const result = await sendSequenceEmail(3, "sub@example.com", "t", { EMAIL: mockEmail(true) }, "addr");
		assert.equal(result.sent, false);
		assert.ok(errors.lines.some((l) => l.includes("step 3") && l.includes("sub@example.com")));
	} finally {
		errors.restore();
	}
});

test("renderSequenceEmail leaves the address out when none is given", () => {
	const { html, text } = renderSequenceEmail(EMAIL_SEQUENCE[0], "t", "");
	assertValidHtml(html);
	assert.match(text, /Unsubscribe: https:\/\/buzzyfly\.com\/unsubscribe\?token=t/);
});

// --- Hourly cron job: sendDueSequenceEmails with an in-memory D1 -------------

interface Sub {
	email: string;
	unsubscribe_token: string | null;
	sequence_step: number;
	sequence_sent_at: number | null;
	created_at: number;
	unsubscribed_at: number | null;
}

function fakeDb(subs: Sub[], settings: Record<string, string> = {}) {
	const prepare = (sql: string) => {
		let args: unknown[] = [];
		const stmt = {
			bind(...a: unknown[]) {
				args = a;
				return stmt;
			},
			async all() {
				if (/FROM site_content/.test(sql)) return { results: Object.entries(settings).map(([key, value]) => ({ key, value })) };
				if (/FROM subscribers/.test(sql)) {
					const [lastStep, cutoff, limit] = args as number[];
					const due = subs
						.filter((s) => s.unsubscribed_at === null && s.sequence_step < lastStep && (s.sequence_sent_at ?? s.created_at ?? 0) <= cutoff)
						.slice(0, limit)
						.map((s) => ({ ...s }));
					return { results: due };
				}
				throw new Error(`fakeDb: unexpected all(): ${sql}`);
			},
			async run() {
				if (/SET sequence_step = \?, sequence_sent_at = \?/.test(sql)) {
					const [step, sentAt, email, expected] = args as [number, number | null, string, number];
					const s = subs.find((x) => x.email === email && x.sequence_step === expected);
					if (s) Object.assign(s, { sequence_step: step, sequence_sent_at: sentAt });
					return { meta: { changes: s ? 1 : 0 } };
				}
				if (/SET unsubscribe_token = \?/.test(sql)) {
					const [token, email] = args as [string, string];
					const s = subs.find((x) => x.email === email && x.unsubscribe_token === null);
					if (s) s.unsubscribe_token = token;
					return { meta: { changes: s ? 1 : 0 } };
				}
				throw new Error(`fakeDb: unexpected run(): ${sql}`);
			},
		};
		return stmt;
	};
	return { prepare } as unknown as D1Database;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
const dueSub = (email: string, step = 0): Sub => ({
	email,
	unsubscribe_token: null,
	sequence_step: step,
	sequence_sent_at: Date.now() - WEEK - 60_000,
	created_at: Date.now() - WEEK - 60_000,
	unsubscribed_at: null,
});

test("cron sequence job is paused with zero sends while no mailing address is set", async () => {
	const subs = [dueSub("a@example.com")];
	const EMAIL = mockEmail();
	const result = await sendDueSequenceEmails({ DB: fakeDb(subs), EMAIL });
	assert.deepEqual(result, { sent: 0, failed: 0 });
	assert.equal(EMAIL.sent.length, 0);
	assert.equal(subs[0].sequence_step, 0);
});

test("cron sequence job sends the next step once an address is saved in D1", async () => {
	const subs = [dueSub("a@example.com"), dueSub("b@example.com", 3), { ...dueSub("c@example.com"), sequence_sent_at: Date.now() }];
	const EMAIL = mockEmail();
	const result = await sendDueSequenceEmails({ DB: fakeDb(subs, { mailingAddress: "PO Box 1" }), EMAIL, EMAIL_FROM: ENV_FROM });
	assert.deepEqual(result, { sent: 2, failed: 0 });
	assert.deepEqual(EMAIL.sent.map((m) => [m.to, m.subject]), [
		["a@example.com", EMAIL_SEQUENCE[1].subject],
		["b@example.com", EMAIL_SEQUENCE[4].subject],
	]);
	assert.equal(subs[0].sequence_step, 1);
	assert.equal(subs[1].sequence_step, 4);
	assert.equal(subs[2].sequence_step, 0, "not due yet");
	assert.ok(subs[0].unsubscribe_token, "token minted for older rows");
});

test("cron sequence job rolls back claims when every send fails (broken binding)", async () => {
	const subs = [dueSub("a@example.com"), dueSub("b@example.com", 2)];
	const before = subs.map((s) => ({ step: s.sequence_step, at: s.sequence_sent_at }));
	const errors = captureErrors();
	try {
		const result = await sendDueSequenceEmails({ DB: fakeDb(subs, { mailingAddress: "PO Box 1" }), EMAIL: mockEmail(true) });
		assert.deepEqual(result, { sent: 0, failed: 2 });
		assert.deepEqual(subs.map((s) => ({ step: s.sequence_step, at: s.sequence_sent_at })), before);
		assert.ok(errors.lines.some((l) => l.includes("Rolling back")));
	} finally {
		errors.restore();
	}
});

test("cron sequence job skips (does not roll back) a single bad address when others send", async () => {
	const subs = [dueSub("bad@example.com"), dueSub("good@example.com")];
	const EMAIL: EmailBinding = {
		async send(msg) {
			if (msg.to.startsWith("bad")) throw new Error("rejected");
			return { messageId: "ok" };
		},
	};
	const errors = captureErrors();
	try {
		const result = await sendDueSequenceEmails({ DB: fakeDb(subs, { mailingAddress: "PO Box 1" }), EMAIL });
		assert.deepEqual(result, { sent: 1, failed: 1 });
		assert.equal(subs[0].sequence_step, 1, "bad address advanced, not retried forever");
	} finally {
		errors.restore();
	}
});

// --- Admin outbox -----------------------------------------------------------

test("admin outbox sends from hello@buzzyfly.com", async () => {
	const EMAIL = mockEmail();
	const result = await sendBrandEmail({ EMAIL }, { to: "x@example.com", subject: "Hi", body: "Line one\n\nLine two", fromName: "Buzzyfly <evil>" });
	assert.deepEqual(result, { sent: true });
	const msg = EMAIL.sent[0];
	assert.equal(addressOf(msg.from), "hello@buzzyfly.com");
	assert.ok(ALLOWED_SENDERS.includes(addressOf(msg.from)));
	assertValidHtml(msg.html!);
	assert.equal(msg.text, "Line one\n\nLine two");
});
