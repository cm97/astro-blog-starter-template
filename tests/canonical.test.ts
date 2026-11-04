// One canonical URL per page. Run: npm run test:seo
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalPath } from "../src/lib/canonical";

test("pages get one form, with a trailing slash", () => {
	assert.equal(canonicalPath("/store"), "/store/");
	assert.equal(canonicalPath("/store/"), "/store/");
	assert.equal(canonicalPath("/es/store"), "/es/store/");
	assert.equal(canonicalPath("/jobs/12345"), "/jobs/12345/");
	assert.equal(canonicalPath("/blog/weekly-reset/"), "/blog/weekly-reset/");
});

test("home and files are left alone", () => {
	assert.equal(canonicalPath("/"), "/");
	assert.equal(canonicalPath(""), "/");
	assert.equal(canonicalPath("/rss.xml"), "/rss.xml");
	assert.equal(canonicalPath("/search.json"), "/search.json");
});
