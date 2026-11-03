import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/pages/api/ai";

type Handler = (ctx: { request: Request; locals: { runtime: { env: Record<string, unknown> } } }) => Promise<Response>;
const post = POST as unknown as Handler;

function call(body: unknown, env: Record<string, unknown>, headers: Record<string, string> = {}, ip = "1.1.1.1") {
	return post({
		request: new Request("https://buzzyfly.com/api/ai", {
			method: "POST",
			headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
			body: JSON.stringify(body),
		}),
		locals: { runtime: { env } },
	});
}

const realFetch = globalThis.fetch;
function mockFetch(handler: (url: string, init: RequestInit) => Response) {
	globalThis.fetch = (async (url: string, init: RequestInit) => handler(String(url), init)) as typeof fetch;
}
const ok = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });

test("503 with no key configured", async () => {
	assert.equal((await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, {}, {}, "2.0.0.1")).status, 503);
});

test("foreign origin is rejected", async () => {
	const r = await call({ kind: "followup", situation: "proposal" }, { GROQ_API_KEY: "x" }, { origin: "https://evil.example" }, "2.0.0.2");
	assert.equal(r.status, 403);
});

test("followup parses subject and body, and prompt carries inputs", async () => {
	let sent = "";
	mockFetch((_u, init) => { sent = String(init.body); return ok("Subject: Quick one on the site\n\nHi Sam,\n\nHello.\n\nBest,"); });
	const r = await call({ kind: "followup", situation: "proposal", name: "Sam", thing: "the site" }, { GROQ_API_KEY: "x" }, {}, "2.0.0.3");
	const d = (await r.json()) as { subject: string; body: string };
	assert.equal(r.status, 200);
	assert.equal(d.subject, "Quick one on the site");
	assert.ok(d.body.endsWith("Best,"));
	assert.ok(sent.includes("Sam") && sent.includes("the site"));
});

test("falls back to Gemini when Groq fails", async () => {
	const urls: string[] = [];
	mockFetch((u) => { urls.push(u); return u.includes("groq") ? new Response("no", { status: 429 }) : ok("fallback answer"); });
	const r = await call({ kind: "support", messages: [{ role: "user", content: "refunds?" }] }, { GROQ_API_KEY: "x", GEMINI_API_KEY: "y" }, {}, "2.0.0.4");
	assert.equal(((await r.json()) as { reply: string }).reply, "fallback answer");
	assert.equal(urls.length, 2);
});

test("502 when every provider fails", async () => {
	mockFetch(() => new Response("no", { status: 500 }));
	const r = await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, { GROQ_API_KEY: "x" }, {}, "2.0.0.5");
	assert.equal(r.status, 502);
});

test("rejects bad input", async () => {
	const env = { GROQ_API_KEY: "x" };
	assert.equal((await call({ kind: "followup", situation: "nope" }, env, {}, "2.0.0.6")).status, 400);
	assert.equal((await call({ kind: "support", messages: [] }, env, {}, "2.0.0.6")).status, 400);
	assert.equal((await call({ kind: "support", messages: [{ role: "assistant", content: "x" }] }, env, {}, "2.0.0.6")).status, 400);
	assert.equal((await call({ kind: "wat" }, env, {}, "2.0.0.6")).status, 400);
});

test("support input is truncated to 500 chars and 6 turns", async () => {
	let payload: { messages: { content: string }[] } = { messages: [] };
	mockFetch((_u, init) => { payload = JSON.parse(String(init.body)); return ok("ok"); });
	const msgs = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "a".repeat(900) }));
	msgs.push({ role: "user", content: "last" });
	await call({ kind: "support", messages: msgs }, { GROQ_API_KEY: "x" }, {}, "2.0.0.7");
	assert.ok(payload.messages.length <= 7);
	assert.ok(payload.messages.every((m) => m.content.length <= 4000));
	assert.ok(payload.messages.slice(1).every((m) => m.content.length <= 500));
});

test("works with no key at all through the Workers AI binding", async () => {
	const seen: string[] = [];
	const AI = { run: async (model: string) => { seen.push(model); return { response: "Workers AI answer" }; } };
	const r = await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, { AI }, {}, "2.0.0.8");
	assert.equal(r.status, 200);
	assert.equal(((await r.json()) as { reply: string }).reply, "Workers AI answer");
	assert.equal(seen[0], "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
});

test("falls back to Workers AI when Groq fails, and to the smaller model when the big one fails", async () => {
	mockFetch(() => new Response("no", { status: 429 }));
	const seen: string[] = [];
	const AI = {
		run: async (model: string) => {
			seen.push(model);
			if (model.includes("70b")) throw new Error("capacity");
			return { response: "small model answer" };
		},
	};
	const r = await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, { GROQ_API_KEY: "x", AI }, {}, "2.0.0.9");
	assert.equal(((await r.json()) as { reply: string }).reply, "small model answer");
	assert.equal(seen.length, 2);
});

test("Grok is used only after every free option fails", async () => {
	const urls: string[] = [];
	mockFetch((u) => { urls.push(u); return u.includes("x.ai") ? ok("grok answer") : new Response("no", { status: 500 }); });
	const AI = { run: async () => { throw new Error("quota"); } };
	const r = await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, { GROQ_API_KEY: "x", XAI_API_KEY: "z", AI }, {}, "2.0.1.0");
	assert.equal(((await r.json()) as { reply: string }).reply, "grok answer");
	assert.ok(urls[0].includes("groq") && urls[urls.length - 1].includes("x.ai"));
});

test("Grok is not called when Workers AI answers", async () => {
	const urls: string[] = [];
	mockFetch((u) => { urls.push(u); return ok("grok answer"); });
	const AI = { run: async () => ({ response: "free answer" }) };
	const r = await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, { XAI_API_KEY: "z", AI }, {}, "2.0.1.1");
	assert.equal(((await r.json()) as { reply: string }).reply, "free answer");
	assert.equal(urls.length, 0);
});

test("rate limit kicks in per IP", async () => {
	mockFetch(() => ok("ok"));
	const env = { GROQ_API_KEY: "x" };
	let last = 200;
	for (let i = 0; i < 14; i++) last = (await call({ kind: "support", messages: [{ role: "user", content: "hi" }] }, env, {}, "9.9.9.9")).status;
	assert.equal(last, 429);
	globalThis.fetch = realFetch;
});
