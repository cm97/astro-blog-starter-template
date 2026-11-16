// Renders public/social/buzzyfly-late-invoice.jpg (1080x1080) for Instagram/Facebook.
// Run: node scripts/make-social-late-invoice.cjs
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
h1{font-size:84px;line-height:1.05;font-weight:700;margin-top:56px;letter-spacing:-1px}
p{font-size:36px;line-height:1.4;margin-top:30px;color:#dfe4ff}
.bar{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:24px;background:#fff;border-radius:24px;padding:34px 40px}
.bar b{color:#0f1219;font-size:38px}.bar>div>span{display:block;color:#60739f;font-size:28px;margin-top:6px}
.card{margin-top:48px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);border-radius:22px;padding:28px 34px;display:flex;align-items:center;gap:24px}
.dot{width:22px;height:22px;border-radius:50%;background:#ffb020;flex:none}
.card b{font-size:34px}.card span{display:block;font-size:28px;color:#dfe4ff;margin-top:4px}
.nw{white-space:nowrap}
.cta{background:#2337ff;color:#fff;font-weight:700;font-size:32px;padding:20px 34px;border-radius:14px;white-space:nowrap}
</style></head><body>
<div class="brand">${logo}Buzzyfly</div>
<h1>Stop chasing late invoices from memory.</h1>
<p>Open the app. See which invoice is overdue, and the polite reminder to send. Copy it, send it, mark it done.</p>
<div class="card"><div class="dot"></div><div><b>Due now: invoice is a week overdue</b><span>Reminder ready with their name, project and amount.</span></div></div>
<div class="bar"><div><b>Digital System · $49</b><span><span class="nw">Browser app · One payment</span> · <span class="nw">No subscription</span></span></div><div class="cta">buzzyfly.com/store</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'public/social/buzzyfly-late-invoice.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();
})();
