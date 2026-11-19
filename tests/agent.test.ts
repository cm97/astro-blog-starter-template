// The buzzyfly-agent worker (agent.buzzyfly.com) hardcodes its offers. Keep them
// in step with the store so no bot or tool reading /offers pushes a retired offer.
import test from "node:test";
import assert from "node:assert/strict";
import { OFFERS } from "../workers/buzzyfly-agent/index.js";
import { ALL_PRODUCTS } from "../src/data/monetization";

test("agent offers match the buyable products in monetization.ts", () => {
	const buyable = ALL_PRODUCTS.filter((p) => p.buyUrl);
	assert.deepEqual(
		OFFERS.map((o) => [o.id, o.name, o.price, o.url]).sort(),
		buyable.map((p) => [p.id, p.title, p.price, p.buyUrl]).sort(),
	);
});

test("agent offers never include the retired $97 bundle", () => {
	assert.ok(!OFFERS.some((o) => o.price === "$97" || /bundle/i.test(o.id) || o.url.includes("bJeeVf")));
});
