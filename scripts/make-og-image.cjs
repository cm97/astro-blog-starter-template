// Renders public/og-default.jpg (1200x630), the default social share image.
// Run: node scripts/make-og-image.cjs
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
body{width:1200px;height:630px;font-family:A,sans-serif;color:#fff;
 background:linear-gradient(160deg,#2337ff 0%,#1a2fd6 55%,#000d8a 100%);padding:64px 72px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:18px;font-weight:700;font-size:34px}
.brand svg{width:68px;height:68px}
h1{font-size:76px;line-height:1.04;font-weight:700;margin-top:40px;letter-spacing:-1px}
p{font-size:30px;line-height:1.35;margin-top:22px;color:#dfe4ff;max-width:980px}
.bar{margin-top:auto;display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:22px;padding:22px 28px}
.bar b{color:#0f1219;font-size:32px}.bar span{display:block;color:#60739f;font-size:24px;margin-top:4px}
.cta{background:#2337ff;color:#fff;font-weight:700;font-size:28px;padding:16px 28px;border-radius:14px}
</style></head><body>
<div class="brand">${logo}Buzzyfly</div>
<h1>Stop rebuilding your client<br>process every week.</h1>
<p>See who to follow up with today, and the email to send. Onboard every new client the same way.</p>
<div class="bar"><div><b>Digital System · $49</b><span>Browser app · One payment · No subscription</span></div><div class="cta">buzzyfly.com</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'public/og-default.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();
})();
