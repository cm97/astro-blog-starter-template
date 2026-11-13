// Renders public/social/buzzyfly-new-client-onboarding.jpg (1080x1080) for Instagram/Facebook.
// Run: node scripts/make-social-new-client-onboarding.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const logo = fs.readFileSync(path.join(root, 'public/buzzyfly-logo.svg'), 'utf8');
const font = (f) => fs.readFileSync(path.join(root, 'public/fonts', f)).toString('base64');

const html = `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(data:font/woff;base64,${font('atkinson-regular.woff')})}
@font-face{font-family:A;font-weight:700;src:url(data:font/woff;base64,${font('atkinson-bold.woff')})}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1080px;font-family:A,sans-serif;color:#fff;
 background:linear-gradient(160deg,#2337ff 0%,#1a2fd6 55%,#000d8a 100%);padding:80px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:22px;font-weight:700;font-size:40px}
.brand svg{width:84px;height:84px}
h1{font-size:74px;line-height:1.05;font-weight:700;margin-top:40px;letter-spacing:-1px}
p{font-size:32px;line-height:1.4;margin-top:22px;color:#dfe4ff}
.bar{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:24px;background:#fff;border-radius:24px;padding:28px 36px}
.bar b{color:#0f1219;font-size:38px}.bar>div>span{display:block;color:#60739f;font-size:28px;margin-top:6px}
.list{margin-top:32px;margin-bottom:32px;display:flex;flex-direction:column;gap:12px}
.row{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);border-radius:20px;padding:16px 26px;display:flex;align-items:center;gap:24px}
.min{min-width:96px;text-align:center;background:#ffb020;color:#0f1219;font-weight:700;font-size:26px;border-radius:12px;padding:8px 14px;white-space:nowrap}
.row b{font-size:32px}.row span{display:block;font-size:25px;color:#dfe4ff;margin-top:2px}
.card{margin-top:48px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);border-radius:22px;padding:28px 34px;display:flex;align-items:center;gap:24px}
.dot{width:22px;height:22px;border-radius:50%;background:#ffb020;flex:none}
.card b{font-size:34px}.card span{display:block;font-size:28px;color:#dfe4ff;margin-top:4px}
.nw{white-space:nowrap}
.cta{background:#2337ff;color:#fff;font-weight:700;font-size:32px;padding:20px 34px;border-radius:14px;white-space:nowrap}
</style></head><body>
<div class="brand">${logo}Buzzyfly</div>
<h1>New client said yes.<br>Now what?</h1>
<p>A 10-step onboarding plan from day 0 to day 10, with the emails already written. Same start for every client.</p>
<div class="list"><div class="row"><div class="min">Day 0</div><div><b>Welcome email and intake questions</b><span>Sent the day they say yes</span></div></div><div class="row"><div class="min">Day 1</div><div><b>Deposit confirmed, kickoff booked</b><span>Before any work starts</span></div></div><div class="row"><div class="min">Day 3</div><div><b>Kickoff call, then summary and timeline</b><span>So everyone agrees what happens next</span></div></div></div>
<div class="bar"><div><b>Digital System · $49</b><span><span class="nw">Browser app · One payment</span> · <span class="nw">No subscription</span></span></div><div class="cta">buzzyfly.com/store</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'public/social/buzzyfly-new-client-onboarding.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();
})();
