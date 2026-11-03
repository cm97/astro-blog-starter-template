// Renders the Product Hunt launch images into public/social/launch/:
//   ph-thumb.png (240x240) and ph-gallery-1..3.jpg (1270x760, Product Hunt's recommended gallery size).
// Every claim matches a check that passed in team/PRODUCT-TEST.md (2026-11-03).
// Run: node scripts/make-launch-images.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public/social/launch');
fs.mkdirSync(out, { recursive: true });
const logo = fs.readFileSync(path.join(root, 'public/buzzyfly-logo.svg'), 'utf8');
const font = (f) => fs.readFileSync(path.join(root, 'public/fonts', f)).toString('base64');

const base = `
@font-face{font-family:A;src:url(data:font/woff;base64,${font('atkinson-regular.woff')})}
@font-face{font-family:A;font-weight:700;src:url(data:font/woff;base64,${font('atkinson-bold.woff')})}
*{margin:0;box-sizing:border-box}
body{font-family:A,sans-serif;color:#fff;background:linear-gradient(160deg,#2337ff 0%,#1a2fd6 55%,#000d8a 100%)}
.brand{display:flex;align-items:center;gap:16px;font-weight:700;font-size:30px}
.brand svg{width:58px;height:58px}
h1{font-size:58px;line-height:1.08;font-weight:700;letter-spacing:-.5px}
p.sub{font-size:26px;line-height:1.4;color:#dfe4ff;margin-top:18px}
.foot{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;font-size:22px;color:#dfe4ff}
.card{background:#fff;color:#0f1219;border-radius:20px;padding:22px 26px;box-shadow:0 20px 50px rgba(0,0,30,.35)}
.row{display:flex;align-items:center;gap:16px;padding:14px 0;border-top:1px solid #e5e8f2}
.row:first-of-type{border-top:0}
.dot{width:16px;height:16px;border-radius:50%;flex:none}
.row b{font-size:22px;display:block}.row span{font-size:18px;color:#60739f}
.tag{margin-left:auto;font-size:16px;font-weight:700;padding:6px 12px;border-radius:999px;background:#eef0ff;color:#2337ff;white-space:nowrap}
.label{font-size:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#60739f;margin-bottom:6px}
`;

const page = (inner) => `<!doctype html><html><head><style>${base}
body{width:1270px;height:760px;padding:56px 64px;position:relative}</style></head><body>${inner}</body></html>`;

const images = [
	{
		file: 'ph-gallery-1.jpg',
		html: page(`
<div class="brand">${logo}Buzzyfly</div>
<div style="display:flex;gap:56px;margin-top:40px;align-items:flex-start">
 <div style="flex:1">
  <h1>Know which client to follow up with today.</h1>
  <p class="sub">Open the app. See who needs you and what to send. The email is already written. Copy it, send it, mark it done.</p>
 </div>
 <div class="card" style="width:520px">
  <div class="label">Today</div>
  <div class="row"><div class="dot" style="background:#ffb020"></div><div><b>Jane: proposal sent 5 days ago</b><span>First proposal follow-up</span></div><div class="tag">Write the email</div></div>
  <div class="row"><div class="dot" style="background:#e5484d"></div><div><b>Acme: invoice $800</b><span>A week overdue</span></div><div class="tag">Write the email</div></div>
  <div class="row"><div class="dot" style="background:#30a46c"></div><div><b>Sam: new client today</b><span>Welcome and intake</span></div><div class="tag">Write the email</div></div>
 </div>
</div>
<div class="foot"><span>Sample clients shown</span><span>Browser app · $49 once · No subscription</span></div>`),
	},
	{
		file: 'ph-gallery-2.jpg',
		html: page(`
<div class="brand">${logo}Buzzyfly</div>
<div style="display:flex;gap:56px;margin-top:40px;align-items:flex-start">
 <div style="flex:1">
  <h1>The email is written for you.</h1>
  <p class="sub">21 built-in emails for proposals, late invoices, onboarding, scope creep, discounts and revisions. Name, project and date filled in.</p>
 </div>
 <div class="card" style="width:560px;font-size:20px;line-height:1.5">
  <div class="label">Subject: Re: proposal for Website refresh</div>
  <p style="margin-top:10px">Hi Jane,</p>
  <p style="margin-top:10px">The proposal for Website refresh is still the one I sent on Oct 29. One question: is [start date] still the date you had in mind, or did it move?</p>
  <p style="margin-top:10px">Sam</p>
  <div style="display:flex;gap:12px;margin-top:18px"><div class="tag">Copy</div><div class="tag">Open in email app</div><div class="tag">Mark sent</div></div>
 </div>
</div>
<div class="foot"><span>The real day-3 proposal follow-up, sample client</span><span>You copy and send it yourself</span></div>`),
	},
	{
		file: 'ph-gallery-3.jpg',
		html: page(`
<div class="brand">${logo}Buzzyfly</div>
<h1 style="margin-top:40px">One payment. Works in your browser.</h1>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:36px">
 <div class="card"><b style="font-size:24px">Follow-ups</b><p style="font-size:19px;color:#60739f;margin-top:6px">Proposals and late invoices, each on a set schedule of reminders.</p></div>
 <div class="card"><b style="font-size:24px">Onboarding</b><p style="font-size:19px;color:#60739f;margin-top:6px">Welcome, intake and day-1 steps for each new client.</p></div>
 <div class="card"><b style="font-size:24px">Scope and proposal replies</b><p style="font-size:19px;color:#60739f;margin-top:6px">Change orders, revision limits, discount and retainer replies.</p></div>
 <div class="card"><b style="font-size:24px">Monday reset</b><p style="font-size:19px;color:#60739f;margin-top:6px">Open invoices, follow-ups due and onboarding steps in one view.</p></div>
</div>
<div class="foot"><span>$49 once · No subscription · Works on phone</span><span>30-day refund if you can't access the app or it isn't as described</span></div>`),
	},
];

(async () => {
	const browser = await chromium.launch();
	for (const img of images) {
		const p = await browser.newPage({ viewport: { width: 1270, height: 760 } });
		await p.setContent(img.html, { waitUntil: 'load' });
		await p.evaluate(() => document.fonts.ready);
		await p.screenshot({ path: path.join(out, img.file), type: 'jpeg', quality: 88 });
		await p.close();
	}
	const t = await browser.newPage({ viewport: { width: 240, height: 240 } });
	await t.setContent(`<!doctype html><html><head><style>*{margin:0}body{width:240px;height:240px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#2337ff,#000d8a)}svg{width:150px;height:150px}</style></head><body>${logo}</body></html>`, { waitUntil: 'load' });
	await t.screenshot({ path: path.join(out, 'ph-thumb.png'), type: 'png' });
	await browser.close();
})();
