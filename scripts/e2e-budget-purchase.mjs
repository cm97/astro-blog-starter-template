// End-to-end test of the Buzzyfly Budget purchase path against a LOCAL worker.
// 1) npx wrangler d1 migrations apply buzzy-fly_db --local
// 2) put STRIPE_WEBHOOK_SECRET=whsec_<anything> in .dev.vars (gitignored)
// 3) npm run build && npx wrangler dev --port 8799 --local
// 4) node scripts/e2e-budget-purchase.mjs
// Never point BASE at production: it posts signed fake orders.
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8799";
const secret = readFileSync(new URL("../.dev.vars", import.meta.url),"utf8").match(/(whsec_\S+)/)[1];
let ok = true; const check = (name, cond, extra="") => { console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`); if (!cond) ok = false; };

async function webhook(session, item, amount) {
  const payload = JSON.stringify({ id: "evt_" + session, object: "event", type: "checkout.session.completed",
    data: { object: { id: session, object: "checkout.session", payment_status: "paid", status: "complete", amount_total: amount, currency: "usd",
      customer_details: { email: "buyer@example.com", name: "Test Buyer" }, metadata: { item_id: item } } } });
  const t = Math.floor(Date.now()/1000);
  const sig = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const r = await fetch(BASE + "/api/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` }, body: payload });
  return { status: r.status, body: await r.text() };
}

const s1 = "cs_test_b1" + Date.now();
const s2 = "cs_test_s2" + Date.now();

// 1. Locked without a key
let r = await fetch(BASE + "/app/budget");
let html = await r.text();
check("locked without key -> 402", r.status === 402, `(got ${r.status})`);
check("locked page shows Budget product", html.includes("Buzzyfly Budget"));

// 2. Bad signature rejected
const bad = await fetch(BASE + "/api/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" });
check("bad signature rejected", bad.status >= 400, `(got ${bad.status})`);

// 3. Webhook fulfills the Budget order
let w = await webhook(s1, "budget-planner", 1900);
check("webhook fulfills budget order", w.status === 200 && /"fulfilled":true/.test(w.body), w.body);
let dup = await webhook(s1, "budget-planner", 1900);
check("duplicate delivery ignored", /duplicate/.test(dup.body), dup.body);

// 4. Thank-you page in a real browser unlocks the app
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 800 } });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(`${BASE}/thank-you?s=${s1}`);
const ty = await p.content();
const keyUrl = (ty.match(/https?:\/\/[^"'<\s]*\/app\/budget\?key=[a-f0-9]{64}/) || [])[0];
check("thank-you shows Budget access link", !!keyUrl, keyUrl || "");
check("thank-you names Buzzyfly Budget", ty.includes("Buzzyfly Budget"));
const cookies = await ctx.cookies();
check("thank-you sets bf_app_budget cookie", cookies.some(c => c.name === "bf_app_budget"));
const resp = await p.goto(`${BASE}/app/budget`);
check("app opens after purchase (200)", resp.status() === 200, `(got ${resp.status()})`);
await p.waitForSelector(".hero h1");
check("app renders Month screen", (await p.textContent(".hero .eyebrow")).includes("Left to budget"));
await p.fill('form[data-form="income"] [name="name"]', "Paycheck"); await p.fill('form[data-form="income"] [name="amount"]', "2500"); await p.click('form[data-form="income"] button');
check("app works: income adds", (await p.textContent(".hero h1")).includes("2,500"));
check("no console errors in app", errs.length === 0, JSON.stringify(errs));

// 5. Access link works in a fresh browser (e.g. buyer's phone)
const ctx2 = await b.newContext(); const p2 = await ctx2.newPage();
const local = keyUrl.replace(/^https?:\/\/[^/]+/, BASE);
const r2 = await p2.goto(local);
check("key link opens app in new browser", r2.status() === 200 && p2.url().endsWith("/app/budget") && await p2.locator("#app-root").count() === 1, p2.url());

// 6. Wrong products stay locked
w = await webhook(s2, "buzzyfly-digital-system", 4900);
const ctx3 = await b.newContext(); const p3 = await ctx3.newPage();
await p3.goto(`${BASE}/thank-you?s=${s2}`);
const r3 = await p3.goto(`${BASE}/app/budget`);
check("Digital System buyer cannot open Budget (402)", r3.status() === 402, `(got ${r3.status()})`);
const r4 = await p2.goto(`${BASE}/app`);
check("Budget buyer cannot open Digital System (402)", r4.status() === 402, `(got ${r4.status()})`);
const r5 = await p2.goto(`${BASE}/app/budget?key=${"0".repeat(64)}`);
check("fake key rejected", r5.status() === 402 && (await p2.content()).includes("didn't work"), `(got ${r5.status()})`);

await b.close();
console.log(ok ? "\nALL PASS" : "\nSOME FAILED");
process.exit(ok ? 0 : 1);
