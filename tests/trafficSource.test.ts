// Guards where-did-they-come-from tracking. Run: npm run test:traffic
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSourceTriple, referrerSource } from "../src/lib/trafficSource";

test("search engines count as organic", () => {
	assert.equal(referrerSource("https://www.google.com/"), "google__organic");
	assert.equal(referrerSource("https://www.google.co.uk/"), "google__organic");
	assert.equal(referrerSource("https://www.bing.com/search?q=x"), "bing__organic");
	assert.equal(referrerSource("https://duckduckgo.com/"), "duckduckgo__organic");
	assert.equal(referrerSource("https://search.yahoo.com/"), "yahoo__organic");
});

test("social sites count as social", () => {
	assert.equal(referrerSource("https://old.reddit.com/r/freelance/comments/1"), "reddit__social");
	assert.equal(referrerSource("https://l.facebook.com/"), "facebook__social");
	assert.equal(referrerSource("https://lm.facebook.com/"), "facebook__social");
	assert.equal(referrerSource("https://t.co/abc"), "x__social");
	assert.equal(referrerSource("https://www.linkedin.com/"), "linkedin__social");
});

test("other sites count as referral, named by host", () => {
	assert.equal(referrerSource("https://www.indiehackers.com/post/1"), "indiehackers-com__referral");
});

test("no referrer, our own site and the payment pages are never a source", () => {
	for (const r of ["", undefined, "not a url", "https://buzzyfly.com/blog/", "https://www.buzzyfly.com/", "https://checkout.stripe.com/c/pay/cs_live_x", "https://www.paypal.com/checkoutnow"]) {
		assert.equal(referrerSource(r), null, String(r));
	}
});

test("referrer sources survive the server-side clean-up unchanged", () => {
	for (const r of ["https://www.google.com/", "https://old.reddit.com/", "https://www.indiehackers.com/"]) {
		const s = referrerSource(r)!;
		assert.equal(cleanSourceTriple(s), s);
	}
});
