// Renders the 18-second cartoon video "a chaotic week, then the 20-minute Monday reset" (1080x1920, 30fps, silent H.264).
// Run: node scripts/make-cartoon-reset.cjs  -> public/social/video/cartoon-chaotic-week.mp4 + .jpg
// Everything Buzzyfly does in the video is real: the six steps and minutes of the guided Monday reset
// (RESET_STEPS in src/data/appContent.ts, 20 minutes in total).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const slug = 'cartoon-chaotic-week';
const outDir = path.join(root, 'public/social/video');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cartoon-'));
const T = 18; // seconds
const FPS = 30;
const logo = fs.readFileSync(path.join(root, 'public/buzzyfly-logo.svg'), 'utf8');

// Keyframes on one shared 18 s timeline: frames = [[sec, css], ...]
let css = '';
let n = 0;
const kf = (frames) => {
	const name = 'k' + n++;
	css += `@keyframes ${name}{` + frames.map(([s, p]) => `${((s / T) * 100).toFixed(3)}%{${p}}`).join('') + '}';
	return `animation:${name} ${T}s linear both;`;
};
// fade window: visible from a to b (with 0.35 s fades), optional slide-up
const win = (a, b, slide = 40) => kf([
	[0, `opacity:0;transform:translateY(${slide}px)`],
	[Math.max(a, 0.001), `opacity:0;transform:translateY(${slide}px)`],
	[a + 0.35, 'opacity:1;transform:translateY(0)'],
	[b - 0.35, 'opacity:1;transform:translateY(0)'],
	[b, `opacity:0;transform:translateY(${-slide / 2}px)`],
	[T, `opacity:0;transform:translateY(${-slide / 2}px)`],
]);
// repeating bob within [a,b]
const loop = (a, b, period, on, off) => {
	const f = [[0, off], [a, off]];
	for (let t = a; t + period <= b; t += period) f.push([t + period / 2, on], [t + period, off]);
	f.push([T, off]);
	return kf(f);
};

const S2 = 4.5, S3 = 9, S4 = 14.6;

// --- character (flat freelancer at a desk) ---
const person = `
<svg viewBox="0 0 600 560" width="780" height="728">
  <g style="transform-origin:300px 300px;${kf([[0, 'transform:rotate(0)'], [S2 + 1.6, 'transform:rotate(0)'], [S2 + 2.2, 'transform:rotate(-4deg) translateY(14px)'], [T, 'transform:rotate(-4deg) translateY(14px)']])}">
    <!-- body -->
    <path d="M190 470 Q190 330 300 320 Q410 330 410 470 Z" fill="#ff7a18"/>
    <path d="M270 322 L300 360 L330 322 Z" fill="#fff"/>
    <!-- head -->
    <g style="transform-origin:300px 300px;${loop(0.2, S2, 0.9, 'transform:translateY(-6px) rotate(2deg)', 'transform:translateY(0) rotate(0)')}">
      <rect x="285" y="280" width="30" height="40" fill="#f2b48a"/>
      <circle cx="300" cy="230" r="78" fill="#f7c59f"/>
      <path d="M222 222 Q228 140 305 145 Q382 148 380 225 Q360 180 300 185 Q250 186 222 222 Z" fill="#2b2140"/>
      <!-- eyes: blink -->
      <g style="transform-origin:300px 232px;${kf([[0, 'transform:scaleY(1)'], [2.0, 'transform:scaleY(1)'], [2.08, 'transform:scaleY(.1)'], [2.16, 'transform:scaleY(1)'], [11.0, 'transform:scaleY(1)'], [11.08, 'transform:scaleY(.1)'], [11.16, 'transform:scaleY(1)'], [T, 'transform:scaleY(1)']])}">
        <circle cx="272" cy="232" r="9" fill="#1b1530"/><circle cx="328" cy="232" r="9" fill="#1b1530"/>
      </g>
      <!-- happy mouth (scene 1, 3) / worried mouth (scene 2) -->
      <path d="M275 262 Q300 284 325 262" stroke="#1b1530" stroke-width="7" fill="none" stroke-linecap="round" style="${kf([[0, 'opacity:1'], [S2 + 1.4, 'opacity:1'], [S2 + 1.5, 'opacity:0'], [S3 + 3.2, 'opacity:0'], [S3 + 3.3, 'opacity:1'], [T, 'opacity:1']])}"/>
      <path d="M278 276 Q300 258 322 276" stroke="#1b1530" stroke-width="7" fill="none" stroke-linecap="round" style="${kf([[0, 'opacity:0'], [S2 + 1.4, 'opacity:0'], [S2 + 1.5, 'opacity:1'], [S3 + 3.2, 'opacity:1'], [S3 + 3.3, 'opacity:0'], [T, 'opacity:0']])}"/>
      <!-- sweat drop -->
      <path d="M380 190 Q392 214 380 222 Q368 214 380 190 Z" fill="#7fd3ff" style="${kf([[0, 'opacity:0;transform:translateY(0)'], [S2 + 2.0, 'opacity:0;transform:translateY(0)'], [S2 + 2.3, 'opacity:1;transform:translateY(0)'], [S3 - 0.2, 'opacity:1;transform:translateY(26px)'], [S3, 'opacity:0;transform:translateY(30px)'], [T, 'opacity:0']])}"/>
    </g>
    <!-- arms typing -->
    <g style="${loop(0.3, S2 + 1.4, 0.3, 'transform:translateY(-8px)', 'transform:translateY(0)')}">
      <path d="M205 400 Q200 470 250 480" stroke="#ff7a18" stroke-width="34" fill="none" stroke-linecap="round"/>
      <circle cx="256" cy="480" r="18" fill="#f7c59f"/>
    </g>
    <g style="${loop(0.45, S2 + 1.4, 0.3, 'transform:translateY(-8px)', 'transform:translateY(0)')}">
      <path d="M395 400 Q400 470 350 480" stroke="#ff7a18" stroke-width="34" fill="none" stroke-linecap="round"/>
      <circle cx="344" cy="480" r="18" fill="#f7c59f"/>
    </g>
  </g>
  <!-- laptop + desk -->
  <path d="M215 425 L385 425 L405 495 L195 495 Z" fill="#d7dcff"/>
  <circle cx="300" cy="460" r="10" fill="#2a3bff"/>
  <rect x="40" y="495" width="520" height="26" rx="10" fill="#fff"/>
  <rect x="80" y="521" width="22" height="40" fill="#fff" opacity=".7"/><rect x="498" y="521" width="22" height="40" fill="#fff" opacity=".7"/>
</svg>`;

const sticky = (x, y, rot, text, at) => `<div class="sticky" style="left:${x}px;top:${y}px;${kf([
	[0, `opacity:0;transform:rotate(${rot}deg) scale(.3)`], [at, `opacity:0;transform:rotate(${rot}deg) scale(.3)`],
	[at + 0.25, `opacity:1;transform:rotate(${rot}deg) scale(1.08)`], [at + 0.4, `opacity:1;transform:rotate(${rot}deg) scale(1)`],
	[S3 - 0.3, `opacity:1;transform:rotate(${rot}deg) scale(1)`], [S3, `opacity:0;transform:rotate(${rot}deg) scale(.8)`], [T, 'opacity:0'],
])}">${text}</div>`;

const days = ['MON', 'TUE', 'WED'];
const dayStart = [0, S2 + 0.7, S2 + 1.8];
const last = days.length - 1;
const calendar = `<div class="cal" style="${kf([[0, 'opacity:0'], [0.3, 'opacity:0'], [0.6, 'opacity:1'], [S3 - 0.3, 'opacity:1'], [S3, 'opacity:0'], [T, 'opacity:0']])}">
  <div class="calTop"></div>
  ${days.map((d, i) => `<div class="day ${i === last ? 'fri' : ''}" style="${kf([
		[0, 'opacity:0;transform:rotateX(90deg)'], [Math.max(dayStart[i] - 0.001, 0.0005), i === 0 ? 'opacity:1;transform:rotateX(0)' : 'opacity:0;transform:rotateX(90deg)'],
		[dayStart[i] + 0.2, 'opacity:1;transform:rotateX(0)'],
		[i < last ? dayStart[i + 1] : T, 'opacity:1;transform:rotateX(0)'],
		[i < last ? dayStart[i + 1] + 0.001 : T, i < last ? 'opacity:0;transform:rotateX(-90deg)' : 'opacity:1'],
		[T, i < last ? 'opacity:0' : 'opacity:1'],
	])}"><small>THIS WEEK</small>${d}</div>`).join('')}
</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:Inter,sans-serif;color:#fff;background:linear-gradient(165deg,#2a3bff 0%,#0b148f 100%);position:relative}
.abs{position:absolute;left:0;right:0}
.cap{top:270px;padding:0 70px;text-align:center}
.cap h1{font-size:78px;line-height:1.08;font-weight:800;letter-spacing:-1.5px}
.cap p{margin-top:22px;font-size:46px;line-height:1.2;font-weight:600;color:#dfe4ff}
.stage{top:590px;height:930px}
.person{position:absolute;left:150px;top:150px}
.inbox{position:absolute;left:440px;top:20px;width:570px;background:#fff;color:#0b148f;border-radius:34px;padding:26px 32px;box-shadow:0 12px 0 rgba(0,0,0,.15)}
.inbox .top{display:flex;align-items:center;justify-content:space-between;font-size:40px;font-weight:900}
.inbox .top svg{width:56px;height:56px}
.inbox .none{margin-top:14px;font-size:38px;font-weight:700;color:#5b64a8}
.inbox .meta{margin-top:12px;font-size:30px;font-weight:600;color:#8a90c4}
.sticky{position:absolute;width:250px;padding:22px 20px;background:#ffd166;color:#3a2a00;font-weight:800;font-size:34px;line-height:1.15;border-radius:6px;box-shadow:0 10px 0 rgba(0,0,0,.12)}
.cal{position:absolute;left:70px;top:20px;width:250px;height:210px;background:#fff;border-radius:22px;overflow:hidden;perspective:600px;box-shadow:0 12px 0 rgba(0,0,0,.15)}
.calTop{height:56px;background:#ff5a5f}
.day small{font-size:30px;font-weight:800;color:#5b64a8;letter-spacing:2px;margin-bottom:-6px}
.day{position:absolute;left:0;right:0;top:56px;height:154px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0b148f;font-size:80px;font-weight:900;transform-origin:50% 0;backface-visibility:hidden}
.day.fri{color:#ff3b45}
.app{position:absolute;left:70px;right:70px;top:0;background:#fff;border-radius:40px;color:#0b148f;padding:40px 44px;box-shadow:0 30px 60px rgba(0,0,0,.25)}
.appHead{display:flex;align-items:center;gap:18px;font-size:34px;font-weight:800;color:#5b64a8}
.appHead svg{width:64px;height:64px;border-radius:16px}
.today{margin-top:26px;font-size:62px;font-weight:900;letter-spacing:-1px}
.row{margin-top:24px;border:4px solid #2a3bff;background:#eef0ff;border-radius:26px;padding:26px 30px}
.steps{margin-top:14px}
.step{display:flex;align-items:center;gap:20px;padding:14px 16px;border-radius:20px;font-size:34px;font-weight:700;color:#1b1f45}
.step .box{flex:none;position:relative;width:52px;height:52px;border:4px solid #2a3bff;border-radius:14px}
.step .tick{position:absolute;inset:-4px;border-radius:14px;background:#11a36a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900}
.step .lbl{flex:1}
.step .d{flex:none;font-size:28px;color:#5b64a8;font-weight:700}
.step.now{background:#eef0ff;border:4px solid #2a3bff}
.step.now .d{background:#ff7a18;color:#fff;padding:4px 14px;border-radius:999px}
.row b{display:block;font-size:44px}
.row span{display:block;margin-top:8px;font-size:34px;color:#4a5296;font-weight:600}
.due{display:inline-block;margin-top:14px;background:#ff7a18;color:#fff;font-size:30px;font-weight:800;padding:6px 18px;border-radius:999px}
.mail{position:absolute;left:70px;right:70px;top:560px;background:#fff;border-radius:40px;color:#1b1f45;padding:36px 44px;box-shadow:0 30px 60px rgba(0,0,0,.3)}
.mail .subj{font-size:32px;font-weight:800;color:#5b64a8}
.mail .body{margin-top:16px;font-size:35px;line-height:1.35;font-weight:500}
.mail .body i{font-style:normal;background:#fff2c2;border-radius:8px;padding:0 6px;font-weight:700}
.btns{display:flex;gap:20px;margin-top:26px}
.btn{position:relative;flex:1;height:96px;border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800}
.copy{background:#2a3bff;color:#fff}
.sent{background:#e9ecff;color:#2a3bff}
.btn .alt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:24px}
.cursor{position:absolute;width:70px;height:70px}
.final{top:300px;bottom:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px}
.final svg{width:190px;height:190px;border-radius:44px;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.final h2{margin-top:40px;font-size:84px;font-weight:900;letter-spacing:-1.5px}
.final .price{margin-top:10px;font-size:150px;font-weight:900;line-height:1}
.final ul{list-style:none;margin-top:30px;font-size:46px;font-weight:700;line-height:1.5;color:#dfe4ff}
.final .url{margin-top:44px;background:#fff;color:#0b148f;font-size:58px;font-weight:900;padding:26px 46px;border-radius:999px}
@CSS@
</style></head><body>

<div class="abs cap" style="${win(0.15, S2)}"><h1>Monday. Everything<br>at once.</h1><p>Inbox. Invoices. Three clients.<br>Where do you start?</p></div>
<div class="abs cap" style="${win(S2, S3)}"><h1>Wednesday. The one<br>big thing? Not started.</h1><p>Busy all week.<br>Still behind.</p></div>
<div class="abs cap" style="${win(S3, S3 + 3.0)}"><h1>Buzzyfly walks you<br>through a Monday reset.</h1></div>
<div class="abs cap" style="${win(S3 + 3.0, S4)}"><h1>Six steps. 20 minutes.<br>Your #1 goes in the<br>calendar first.</h1></div>

<div class="abs stage">
  <div class="person" style="${kf([[0, 'opacity:0;transform:translateY(60px)'], [0.05, 'opacity:0;transform:translateY(60px)'], [0.5, 'opacity:1;transform:translateY(0)'], [S3 - 0.35, 'opacity:1;transform:translateY(0)'], [S3, 'opacity:0;transform:translateY(80px)'], [T, 'opacity:0']])}">${person}</div>
  <div class="inbox" style="${kf([[0, 'opacity:0;transform:scale(.5)'], [0.6, 'opacity:0;transform:scale(.5)'], [0.95, 'opacity:1;transform:scale(1.05)'], [1.1, 'opacity:1;transform:scale(1)'], [S3 - 0.35, 'opacity:1;transform:scale(1)'], [S3, 'opacity:0;transform:scale(.7)'], [T, 'opacity:0']])};transform-origin:50% 0">
    <div class="top"><span>To do</span><svg viewBox="0 0 24 24" style="transform-origin:50% 50%;${loop(1.0, S3 - 0.4, 0.6, 'transform:scale(1.2) rotate(-10deg)', 'transform:scale(1) rotate(0)')}"><circle cx="12" cy="12" r="10" fill="#ff3b45"/><path d="M12 6.5v7M12 16.6v.4" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg></div>
    <div class="none">Everything, all at once</div>
    <div class="meta">No order. No plan.</div>
  </div>
  ${calendar}
  ${sticky(40, 560, 5, 'Invoice due?', S2 + 0.5)}
  ${sticky(760, 270, -7, 'Reply to Sam', S2 + 1.1)}
  ${sticky(40, 330, -5, 'Proposal!!', S2 + 1.7)}
  ${sticky(700, 520, 4, 'Big task??', S2 + 2.4)}

  <div class="app" style="${kf([[0, 'opacity:0;transform:translateY(120px) scale(.9)'], [S3, 'opacity:0;transform:translateY(120px) scale(.9)'], [S3 + 0.45, 'opacity:1;transform:translateY(0) scale(1)'], [S4 - 0.35, 'opacity:1;transform:translateY(0) scale(1)'], [S4, 'opacity:0;transform:translateY(-60px) scale(.96)'], [T, 'opacity:0']])}">
    <div class="appHead">${logo}<span>Buzzyfly · Monday reset</span></div>
    <div class="today">20 minutes</div>
    <div class="steps">
      <div class="step" style="${kf([[0, 'opacity:0;transform:translateX(-50px)'], [S3 + 0.55, 'opacity:0;transform:translateX(-50px)'], [S3 + 0.55 + 0.3, 'opacity:1;transform:translateX(0)'], [T, 'opacity:1;transform:translateX(0)']])}"><div class="box"><div class="tick" style="${kf([[0, 'opacity:0;transform:scale(.3)'], [S3 + 1.90, 'opacity:0;transform:scale(.3)'], [S3 + 1.90 + 0.15, 'opacity:1;transform:scale(1.15)'], [S3 + 1.90 + 0.25, 'opacity:1;transform:scale(1)'], [T, 'opacity:1;transform:scale(1)']])}">✓</div></div><span class="lbl">Check the money</span><span class="d">3 min</span></div>
      <div class="step" style="${kf([[0, 'opacity:0;transform:translateX(-50px)'], [S3 + 0.77, 'opacity:0;transform:translateX(-50px)'], [S3 + 0.77 + 0.3, 'opacity:1;transform:translateX(0)'], [T, 'opacity:1;transform:translateX(0)']])}"><div class="box"><div class="tick" style="${kf([[0, 'opacity:0;transform:scale(.3)'], [S3 + 2.40, 'opacity:0;transform:scale(.3)'], [S3 + 2.40 + 0.15, 'opacity:1;transform:scale(1.15)'], [S3 + 2.40 + 0.25, 'opacity:1;transform:scale(1)'], [T, 'opacity:1;transform:scale(1)']])}">✓</div></div><span class="lbl">Send this week’s follow-ups</span><span class="d">5 min</span></div>
      <div class="step" style="${kf([[0, 'opacity:0;transform:translateX(-50px)'], [S3 + 0.99, 'opacity:0;transform:translateX(-50px)'], [S3 + 0.99 + 0.3, 'opacity:1;transform:translateX(0)'], [T, 'opacity:1;transform:translateX(0)']])}"><div class="box"><div class="tick" style="${kf([[0, 'opacity:0;transform:scale(.3)'], [S3 + 2.90, 'opacity:0;transform:scale(.3)'], [S3 + 2.90 + 0.15, 'opacity:1;transform:scale(1.15)'], [S3 + 2.90 + 0.25, 'opacity:1;transform:scale(1)'], [T, 'opacity:1;transform:scale(1)']])}">✓</div></div><span class="lbl">Move each new client forward</span><span class="d">2 min</span></div>
      <div class="step" style="${kf([[0, 'opacity:0;transform:translateX(-50px)'], [S3 + 1.21, 'opacity:0;transform:translateX(-50px)'], [S3 + 1.21 + 0.3, 'opacity:1;transform:translateX(0)'], [T, 'opacity:1;transform:translateX(0)']])}"><div class="box"><div class="tick" style="${kf([[0, 'opacity:0;transform:scale(.3)'], [S3 + 3.40, 'opacity:0;transform:scale(.3)'], [S3 + 3.40 + 0.15, 'opacity:1;transform:scale(1.15)'], [S3 + 3.40 + 0.25, 'opacity:1;transform:scale(1)'], [T, 'opacity:1;transform:scale(1)']])}">✓</div></div><span class="lbl">List the week’s tasks and score them</span><span class="d">5 min</span></div>
      <div class="step now" style="${kf([[0, 'opacity:0;transform:translateX(-50px)'], [S3 + 1.43, 'opacity:0;transform:translateX(-50px)'], [S3 + 1.43 + 0.3, 'opacity:1;transform:translateX(0)'], [T, 'opacity:1;transform:translateX(0)']])}"><div class="box"><div class="tick" style="${kf([[0, 'opacity:0;transform:scale(.3)'], [S3 + 3.90, 'opacity:0;transform:scale(.3)'], [S3 + 3.90 + 0.15, 'opacity:1;transform:scale(1.15)'], [S3 + 3.90 + 0.25, 'opacity:1;transform:scale(1)'], [T, 'opacity:1;transform:scale(1)']])}">✓</div></div><span class="lbl">Block time for your #1</span><span class="d">3 min</span></div>
      <div class="step" style="${kf([[0, 'opacity:0;transform:translateX(-50px)'], [S3 + 1.65, 'opacity:0;transform:translateX(-50px)'], [S3 + 1.65 + 0.3, 'opacity:1;transform:translateX(0)'], [T, 'opacity:1;transform:translateX(0)']])}"><div class="box"><div class="tick" style="${kf([[0, 'opacity:0;transform:scale(.3)'], [S3 + 4.40, 'opacity:0;transform:scale(.3)'], [S3 + 4.40 + 0.15, 'opacity:1;transform:scale(1.15)'], [S3 + 4.40 + 0.25, 'opacity:1;transform:scale(1)'], [T, 'opacity:1;transform:scale(1)']])}">✓</div></div><span class="lbl">Drop or delay one thing</span><span class="d">2 min</span></div>
    </div>
  </div>

</div>

<div class="abs final" style="${kf([[0, 'opacity:0;transform:translateY(60px)'], [S4, 'opacity:0;transform:translateY(60px)'], [S4 + 0.4, 'opacity:1;transform:translateY(0)'], [T, 'opacity:1;transform:translateY(0)']])}">
  ${logo}
  <h2>Digital System</h2>
  <div class="price">$49</div>
  <ul><li>Browser app</li><li>One payment · No subscription</li></ul>
  <div class="url">buzzyfly.com/store</div>
</div>
</body></html>`;

(async () => {
	const page_html = html.replace('@CSS@', css);
	fs.writeFileSync(path.join(tmp, 'v.html'), page_html);
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
	await page.goto('file://' + path.join(tmp, 'v.html'));
	await page.evaluate(() => document.fonts.ready);
	await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
	const total = T * FPS;
	for (let f = 0; f < total; f++) {
		const ms = (f / FPS) * 1000;
		await page.evaluate((t) => new Promise((r) => {
			document.getAnimations().forEach((a) => { a.currentTime = t; });
			requestAnimationFrame(() => requestAnimationFrame(r));
		}), ms);
		await page.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.png`) });
	}
	await browser.close();
	fs.mkdirSync(outDir, { recursive: true });
	const mp4 = path.join(outDir, `${slug}.mp4`);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
		'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', mp4]);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '7.8', '-i', mp4, '-frames:v', '1', '-q:v', '4', path.join(outDir, `${slug}.jpg`)]);
	fs.rmSync(tmp, { recursive: true, force: true });
	console.log('wrote', mp4, (fs.statSync(mp4).size / 1e6).toFixed(2), 'MB');
})();
