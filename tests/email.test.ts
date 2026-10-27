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
import { parseIncoming, replyFromAddress, replySubject, sendReply } from "../src/lib/inbox";
import { EMAIL_SEQUENCE } from "../src/data/emailSequence";

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

test("Apps Pro delivery email sends an access link from an allowed address, never a zip or workbook", async () => {
	const EMAIL = mockEmail();
	const url = "https://buzzyfly.com/apps/unlock?token=abc.def";
	const result = await sendDeliveryEmail(
		{ to: "buyer@example.com", downloadUrl: url, productName: "Buzzyfly Apps Pro", orderId: "cs_test_1", itemId: "apps-pro" },
		{ EMAIL, EMAIL_FROM: ENV_FROM },
	);
	assert.deepEqual(result, { sent: true });
	assert.equal(EMAIL.sent.length, 1);
	const msg = EMAIL.sent[0];
	assert.ok(ALLOWED_SENDERS.includes(addressOf(msg.from)), msg.from);
	assert.equal(msg.to, "buyer@example.com");
	assert.equal(msg.subject, "Your Buzzyfly Apps Pro access link");
	assertValidHtml(msg.html!);
	assert.ok(msg.html!.includes(`href="${url}"`));
	assert.match(msg.html!, /Open the app/);
	assert.doesNotMatch(msg.html! + msg.text!, /unzip|workbook|Excel|expires in 3 days/i);
	assert.doesNotMatch(msg.html!, /buzzyfly\.comhttps?:/);
	assert.ok(msg.text!.includes(url));
	assert.doesNotMatch(msg.text!, /</);
});

test("a smaller web app's delivery email sends an access link, not a download", async () => {
	const EMAIL = mockEmail();
	const url = "https://buzzyfly.com/app/follow-ups?key=abc";
	await sendDeliveryEmail(
		{ to: "buyer@example.com", downloadUrl: url, productName: "Follow-Ups App", orderId: "cs_test_2", itemId: "follow-up-email-templates" },
		{ EMAIL, EMAIL_FROM: ENV_FROM },
	);
	const msg = EMAIL.sent[0];
	assert.equal(msg.subject, "Your Follow-Ups App access link");
	assertValidHtml(msg.html!);
	assert.ok(msg.html!.includes(`href="${url}"`));
	assert.match(msg.html!, /Open the app/);
	assert.doesNotMatch(msg.html!, /expires in 3 days|unzip/);
	assert.match(msg.html!, /Buzzyfly Digital System/); // UPSELL_MAP: follow-ups -> digital system
	assert.ok(msg.html!.includes('href="https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00"')); // system checkout, not prefixed with the site URL
	assert.doesNotMatch(msg.html!, /buzzyfly\.comhttps?:/);
	assert.match(msg.text!, /Buzzyfly Digital System/);
});

test("every product's delivery email carries the upsell from UPSELL_MAP", async () => {
	const ladder: Record<string, string | null> = {
		"weekly-reset-checklist": "Buzzyfly Digital System",
		"follow-up-email-templates": "Buzzyfly Digital System",
		"client-onboarding-kit": "Buzzyfly Digital System",
		"buzzyfly-digital-system": null, // only the system is for sale, so nothing to upsell
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
	assert.match(msg.html!, /Buzzyfly Digital System/);
	assert.match(msg.text!, /Buzzyfly Digital System/);
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

// --- Admin inbox --------------------------------------------------------------

const RAW_INCOMING = [
	"From: Jane Customer <Jane@Example.com>",
	"Reply-To: jane.replies@example.com",
	"To: support@buzzyfly.com",
	"Subject: Question about my order",
	"Message-ID: <abc123@example.com>",
	"References: <earlier@example.com>",
	"MIME-Version: 1.0",
	'Content-Type: multipart/mixed; boundary="b1"',
	"",
	"--b1",
	"Content-Type: text/plain; charset=utf-8",
	"",
	"Hi, I can't find my download.",
	"Thanks!",
	"--b1",
	'Content-Type: text/html; charset=utf-8',
	"",
	"<p>Hi, I can't find my download.</p><p>Thanks!</p>",
	"--b1",
	'Content-Type: application/pdf; name="receipt.pdf"',
	'Content-Disposition: attachment; filename="../receipt.pdf"',
	"Content-Transfer-Encoding: base64",
	"",
	"JVBERi0xLjQK",
	"--b1--",
	"",
].join("\r\n");

test("inbox parses an incoming email with an attachment", async () => {
	const parsed = await parseIncoming(RAW_INCOMING, { from: "bounce@example.com", to: "Support@Buzzyfly.com" }, 1000);
	assert.equal(parsed.message.from_address, "jane@example.com");
	assert.equal(parsed.message.from_name, "Jane Customer");
	assert.equal(parsed.message.reply_to, "jane.replies@example.com");
	assert.equal(parsed.message.to_address, "support@buzzyfly.com");
	assert.equal(parsed.message.subject, "Question about my order");
	assert.equal(parsed.message.message_id, "<abc123@example.com>");
	assert.match(parsed.message.text_body, /can't find my download/);
	assert.match(parsed.message.html_body ?? "", /<p>Hi/);
	assert.equal(parsed.attachments.length, 1);
	assert.equal(parsed.attachments[0].filename, "..receipt.pdf", "path separators stripped");
	assert.equal(parsed.attachments[0].mimeType, "application/pdf");
	assert.equal(new TextDecoder().decode(parsed.attachments[0].bytes), "%PDF-1.4\n");
});

test("inbox replies come from an allowed sender", () => {
	assert.equal(replyFromAddress("support@buzzyfly.com"), "support@buzzyfly.com");
	assert.equal(replyFromAddress("Orders@Buzzyfly.com"), "orders@buzzyfly.com");
	assert.equal(replyFromAddress("random@buzzyfly.com"), "hello@buzzyfly.com");
	for (const to of ["support@buzzyfly.com", "x@buzzyfly.com"]) assert.ok(ALLOWED_SENDERS.includes(replyFromAddress(to)));
	assert.equal(replySubject("Question"), "Re: Question");
	assert.equal(replySubject("RE: Question"), "RE: Question");
	assert.equal(replySubject(""), "Re: your email");
});

test("inbox reply threads, quotes the original and goes to Reply-To", async () => {
	const parsed = await parseIncoming(RAW_INCOMING, { from: "bounce@example.com", to: "support@buzzyfly.com" }, 1000);
	const message = { ...parsed.message, id: 7, read_at: null, archived: 0, replied_at: null };
	const EMAIL = mockEmail();
	const result = await sendReply({ EMAIL }, message, { body: "Here is a fresh link.", fromName: "Buzzyfly" });
	assert.deepEqual(result, { sent: true });
	const msg = EMAIL.sent[0];
	assert.equal(msg.to, "jane.replies@example.com");
	assert.equal(addressOf(msg.from), "support@buzzyfly.com");
	assert.equal(msg.subject, "Re: Question about my order");
	assert.equal(msg.headers?.["In-Reply-To"], "<abc123@example.com>");
	assert.equal(msg.headers?.["References"], "<earlier@example.com> <abc123@example.com>");
	assert.match(msg.text!, /^Here is a fresh link\.\n\nOn .* wrote:\n> Hi, I can't find my download\./);
	assertValidHtml(msg.html!);
});

test("inbox reply refuses an empty message", async () => {
	const parsed = await parseIncoming(RAW_INCOMING, { from: "a@example.com", to: "support@buzzyfly.com" });
	const EMAIL = mockEmail();
	const result = await sendReply({ EMAIL }, { ...parsed.message, id: 1, read_at: null, archived: 0, replied_at: null }, { body: "  ", fromName: "" });
	assert.equal(result.sent, false);
	assert.equal(EMAIL.sent.length, 0);
});

test("inbox gives HTML-only mail a plain-text version", async () => {
	const raw = "From: a@example.com\r\nTo: hello@buzzyfly.com\r\nSubject: Hi\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<style>p{color:red}</style><p>Hello &amp; welcome</p><p>Line two<br>three</p>";
	const parsed = await parseIncoming(raw, { from: "a@example.com", to: "hello@buzzyfly.com" });
	assert.equal(parsed.message.text_body, "Hello & welcome\nLine two\nthree");
});
