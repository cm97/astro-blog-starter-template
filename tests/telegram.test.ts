// Guards the Telegram bot (sale alerts + channel posts). Run: npm run test:telegram
// Mocks Telegram's API and D1; it can't prove Telegram accepts a real token.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	channelPostText,
	maskEmail,
	notifySale,
	postNewArticleToChannel,
	rssItems,
	saleAlertText,
	sendTelegram,
} from "../src/lib/telegram";

type Call = { url: string; body: { chat_id: string; text: string; parse_mode: string } };

function mockFetch(status = 200) {
	const calls: Call[] = [];
	const fn = (async (url: string, init: RequestInit) => {
		calls.push({ url, body: JSON.parse(String(init.body)) });
		return new Response(status === 200 ? '{"ok":true}' : '{"ok":false,"description":"chat not found"}', { status });
	}) as unknown as typeof fetch;
	return { fn, calls };
}

const env = { TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_OWNER_CHAT_ID: "42", TELEGRAM_CHANNEL_ID: "@buzzyfly" };

test("no token means no request and no error", async () => {
	const { fn, calls } = mockFetch();
	const r = await sendTelegram({}, "42", "hi", fn);
	assert.equal(r.sent, false);
	assert.equal(calls.length, 0);
});

test("sale alert goes to the owner chat with escaped HTML and a masked email", async () => {
	const { fn, calls } = mockFetch();
	const r = await notifySale(
		env,
		{
			productTitle: "Follow-Ups <App>",
			price: "$19",
			provider: "stripe",
			orderId: "cs_1",
			customerEmail: "jane.doe@gmail.com",
			source: "blog",
			delivered: true,
		},
		fn,
	);
	assert.equal(r.sent, true);
	assert.equal(calls[0].url, "https://api.telegram.org/bot123:abc/sendMessage");
	assert.equal(calls[0].body.chat_id, "42");
	assert.equal(calls[0].body.parse_mode, "HTML");
	assert.match(calls[0].body.text, /Follow-Ups &lt;App&gt; \(\$19\)/);
	assert.match(calls[0].body.text, /ja\*\*\*@gmail\.com/);
	assert.doesNotMatch(calls[0].body.text, /jane\.doe/);
});

test("failed delivery is flagged in the alert", () => {
	const text = saleAlertText({ productTitle: "X", provider: "stripe", orderId: "1", customerEmail: null, delivered: false });
	assert.match(text, /FAILED/);
	assert.match(text, /no email/);
});

test("a Telegram error is reported, not thrown, and never leaks the token", async () => {
	const { fn } = mockFetch(400);
	const r = await sendTelegram(env, "42", "hi", fn);
	assert.equal(r.sent, false);
	assert.match(r.reason ?? "", /400/);
	assert.doesNotMatch(r.reason ?? "", /abc/);
});

test("maskEmail", () => {
	assert.equal(maskEmail("ab@x.com"), "ab***@x.com");
	assert.equal(maskEmail(null), "no email");
});

const rss = (links: [string, string][]) => `<?xml version="1.0"?><rss><channel>${links
	.map(
		([link, date]) =>
			`<item><title>Stop &amp; follow up ${link}</title><link>https://buzzyfly.com/blog/${link}/</link><description>Desc ${link}</description><pubDate>${date}</pubDate></item>`,
	)
	.join("")}</channel></rss>`;

test("rssItems parses title, link, description and date", () => {
	const items = rssItems(rss([["a", "Mon, 02 Nov 2026 00:00:00 GMT"]]));
	assert.equal(items.length, 1);
	assert.equal(items[0].title, "Stop & follow up a");
	assert.equal(items[0].link, "https://buzzyfly.com/blog/a/");
	assert.ok(items[0].published > 0);
	assert.match(channelPostText(items[0]), /<b>Stop &amp; follow up a<\/b>\nDesc a\n\nhttps:\/\/buzzyfly\.com\/blog\/a\//);
});

function mockDb() {
	const rows = new Map<string, number>();
	const stmt = (sql: string, args: unknown[] = []) => ({
		bind: (...a: unknown[]) => stmt(sql, a),
		async run() {
			if (sql.startsWith("INSERT")) rows.has(String(args[0])) || rows.set(String(args[0]), Number(args[1]));
			return { meta: { changes: 1 } };
		},
		async all() {
			return { results: [...rows.keys()].map((link) => ({ link })) };
		},
	});
	return {
		rows,
		prepare: (sql: string) => stmt(sql),
		async batch(stmts: { run(): Promise<unknown> }[]) {
			for (const s of stmts) await s.run();
			return [];
		},
	} as unknown as D1Database & { rows: Map<string, number> };
}

test("channel: first run skips the back catalogue, then posts new articles oldest first, once each", async () => {
	const db = mockDb();
	let feed = rss([["old", "Sun, 01 Nov 2026 00:00:00 GMT"]]);
	const assets = { fetch: async () => new Response(feed) } as unknown as Fetcher;
	const { fn, calls } = mockFetch();

	assert.equal(await postNewArticleToChannel({ ...env, DB: db }, assets, fn), null);
	assert.equal(calls.length, 0);

	feed = rss([
		["newer", "Thu, 05 Nov 2026 00:00:00 GMT"],
		["old", "Sun, 01 Nov 2026 00:00:00 GMT"],
		["new", "Tue, 03 Nov 2026 00:00:00 GMT"],
	]);
	assert.equal(await postNewArticleToChannel({ ...env, DB: db }, assets, fn), "https://buzzyfly.com/blog/new/");
	assert.equal(await postNewArticleToChannel({ ...env, DB: db }, assets, fn), "https://buzzyfly.com/blog/newer/");
	assert.equal(await postNewArticleToChannel({ ...env, DB: db }, assets, fn), null);
	assert.equal(calls.length, 2);
	assert.equal(calls[0].body.chat_id, "@buzzyfly");
});

test("channel: a failed post is not recorded, so it retries next hour", async () => {
	const db = mockDb();
	db.rows.set("https://buzzyfly.com/blog/old/", 1);
	const assets = { fetch: async () => new Response(rss([["fresh", "Tue, 03 Nov 2026 00:00:00 GMT"]])) } as unknown as Fetcher;
	await assert.rejects(postNewArticleToChannel({ ...env, DB: db }, assets, mockFetch(400).fn));
	assert.equal(db.rows.has("https://buzzyfly.com/blog/fresh/"), false);
});

test("channel: off when no channel is set", async () => {
	const assets = { fetch: async () => { throw new Error("should not fetch"); } } as unknown as Fetcher;
	assert.equal(await postNewArticleToChannel({ TELEGRAM_BOT_TOKEN: "x", DB: mockDb() }, assets), null);
});
