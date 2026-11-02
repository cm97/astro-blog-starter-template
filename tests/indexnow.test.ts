// Guards the weekly IndexNow submission. Run: npm run test:indexnow
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INDEXNOW_KEY, indexNowPayload, isIndexNowRun, sitemapUrls, submitSitemapToIndexNow } from "../src/lib/indexNow";

const xml = `<?xml version="1.0"?><urlset>
<url><loc>https://buzzyfly.com/</loc></url>
<url><loc>https://buzzyfly.com/store/</loc></url>
<url><loc>https://buzzyfly.com/store/</loc></url>
<url><loc>https://example.com/elsewhere/</loc></url>
</urlset>`;

test("only our own URLs are taken from the sitemap, once each", () => {
	assert.deepEqual(sitemapUrls(xml), ["https://buzzyfly.com/", "https://buzzyfly.com/store/"]);
});

test("submits once a week: Monday 06:00 UTC only", () => {
	assert.equal(isIndexNowRun(Date.UTC(2026, 10, 2, 6, 0)), true); // Monday
	assert.equal(isIndexNowRun(Date.UTC(2026, 10, 2, 7, 0)), false);
	assert.equal(isIndexNowRun(Date.UTC(2026, 10, 3, 6, 0)), false); // Tuesday
});

test("the key file shipped in public/ matches the key we send", () => {
	assert.equal(readFileSync(`public/${INDEXNOW_KEY}.txt`, "utf8").trim(), INDEXNOW_KEY);
	assert.equal(indexNowPayload([]).keyLocation, `https://buzzyfly.com/${INDEXNOW_KEY}.txt`);
});

test("posts the sitemap URLs to IndexNow and reports the status", async () => {
	const assets = { fetch: async () => new Response(xml) } as unknown as Fetcher;
	let body: { urlList: string[]; host: string } | undefined;
	const fakeFetch = (async (_url: string, init: RequestInit) => {
		body = JSON.parse(String(init.body));
		return new Response(null, { status: 202 });
	}) as unknown as typeof fetch;
	assert.equal(await submitSitemapToIndexNow(assets, fakeFetch), 202);
	assert.equal(body?.host, "buzzyfly.com");
	assert.equal(body?.urlList.length, 2);
});

test("a refused submission throws so the cron logs it", async () => {
	const assets = { fetch: async () => new Response(xml) } as unknown as Fetcher;
	const refuse = (async () => new Response(null, { status: 403 })) as unknown as typeof fetch;
	await assert.rejects(submitSitemapToIndexNow(assets, refuse), /403/);
});
