// Records the 9:16 demo video (1080x1920, silent, H.264) from the real /demo page.
// Needs the built site served locally: `npm run build`, then serve dist/ on DEMO_URL
// (default http://localhost:8765/demo/), then: node scripts/make-demo-video.cjs
// Writes public/social/video/buzzyfly-demo.mp4. Every screen is the real app with sample clients.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const URL = process.env.DEMO_URL || 'http://localhost:8765/demo/';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-video-'));
const outDir = path.join(root, 'public/social/video');
fs.mkdirSync(outDir, { recursive: true });
const font = (f) => fs.readFileSync(path.join(root, 'public/fonts', f)).toString('base64');
const logo = fs.readFileSync(path.join(root, 'public/buzzyfly-logo.svg'), 'utf8');

const card = (title, sub) => `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(data:font/woff;base64,${font('atkinson-regular.woff')})}
@font-face{font-family:A;font-weight:700;src:url(data:font/woff;base64,${font('atkinson-bold.woff')})}
*{margin:0;box-sizing:border-box}body{width:405px;height:720px;font-family:A,sans-serif;color:#fff;
background:linear-gradient(160deg,#2337ff,#000d8a);padding:44px 32px;display:flex;flex-direction:column;justify-content:center;gap:22px}
svg{width:64px;height:64px}h1{font-size:38px;line-height:1.1}p{font-size:21px;line-height:1.4;color:#dfe4ff}
</style></head><body>${logo}<h1>${title}</h1><p>${sub}</p></body></html>`;

const caption = async (page, text) => page.evaluate((t) => {
	let el = document.getElementById('vid-cap');
	if (!el) {
		el = document.createElement('div'); el.id = 'vid-cap';
		el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;background:#2337ff;color:#fff;font:700 22px/1.25 system-ui,sans-serif;padding:16px 20px;min-height:84px;display:flex;align-items:center';
		document.body.appendChild(el);
	}
	el.textContent = t;
}, text);

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3, colorScheme: 'light' });
	const frames = [];
	const shot = async (secs) => { const f = path.join(tmp, `f${frames.length}.png`); await page.screenshot({ path: f }); frames.push([f, secs]); };

	await page.setContent(card('Proposal sent. No reply. Now what?', 'Here is how Buzzyfly handles it. Real app, sample clients.'));
	await page.evaluate(() => document.fonts.ready); await shot(3);

	await page.goto(URL); await page.waitForTimeout(600);
	await page.addStyleTag({ content: '.demo-bar{display:none!important}.wrap{padding-top:36px!important}' });
	await caption(page, 'Open the app. It shows who needs a follow-up today.'); await shot(4);

	await page.getByText('Write the email').first().click(); await page.waitForTimeout(400);
	await caption(page, 'The email is already written, with their name and project.');
	await page.evaluate(() => window.scrollTo(0, 120)); await shot(4.5);

	await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Copy email'); b && b.scrollIntoView({ block: 'center' }); });
	await caption(page, 'Copy it. Send it from your own inbox. Mark it sent.'); await shot(4);

	await page.goto(URL + '#today'); await page.waitForTimeout(500);
	await page.addStyleTag({ content: '.demo-bar{display:none!important}.wrap{padding-top:36px!important}' });
	await page.evaluate(() => { const c = [...document.querySelectorAll('.card')].find((x) => x.textContent.includes('Acme Studio')); if (c) window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - 100); });
	await page.waitForTimeout(200);
	await caption(page, 'Invoice a week late? The reminder is ready too.'); await shot(4);

	await page.setContent(card('Buzzyfly Digital System', 'Follow-ups, late invoices, onboarding and scope replies. $49 once. No subscription.<br><br><b>Try the free demo: buzzyfly.com/demo</b>'));
	await page.evaluate(() => document.fonts.ready); await shot(4);
	await browser.close();

	const list = frames.map(([f, s]) => `file '${f}'\nduration ${s}`).join('\n') + `\nfile '${frames[frames.length - 1][0]}'\n`;
	fs.writeFileSync(path.join(tmp, 'list.txt'), list);
	const out = path.join(outDir, 'buzzyfly-demo.mp4');
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'),
		'-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
		'-vf', 'scale=1080:1920,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out]);
	console.log(out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
})();
