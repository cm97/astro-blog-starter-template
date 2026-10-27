// Buzzy Lands: a small side-scrolling platformer. Run, jump the gaps, grab
// nectar, stomp wasps from above, reach the hive. Keyboard and on-screen
// buttons; the overlay opens and closes the game (start, pause, resume,
// restart, quit).
(() => {
	const canvas = document.getElementById('buzzy-kids');
	if (!(canvas instanceof HTMLCanvasElement)) return;
	const gfx = canvas.getContext('2d');
	if (!gfx) return;
	const stage = canvas.parentElement;
	const overlay = document.getElementById('kids-overlay');
	const startBtn = document.getElementById('kids-start');
	const W = 960, H = 540, GROUND = 470;
	const GRAVITY = 2200, RUN = 300, JUMP = 820;

	const gardenImg = new Image(); gardenImg.src = '/buzzy-lands/garden.jpg';
	const faceImg = new Image(); faceImg.src = '/buzzy-lands/buzzy-face.jpg';

	let best = 0;
	try { best = Number(localStorage.getItem('buzzy-lands-best') || 0) || 0; } catch {}

	// state: 'ready' (start screen), 'playing', 'paused', 'over' (lost or won)
	let state = 'ready';
	let score, lives, cameraX, player, nectar, wasps, invuln, won;

	// Level: ground segments with gaps, floating ledges, nectar, wasps, hive.
	const ground = [[0, 900], [1020, 1700], [1820, 2500], [2640, 3400], [3520, 4400]];
	const ledges = [[420, 360, 140], [700, 300, 120], [1180, 340, 160], [1500, 280, 120], [1960, 330, 140], [2250, 260, 140], [2780, 340, 160], [3080, 280, 140], [3640, 330, 160], [3950, 270, 140]];
	const LEVEL_END = 4400, HIVE_X = 4250;
	const solids = [
		...ground.map(([a, b]) => ({ x: a, y: GROUND, w: b - a, h: H - GROUND })),
		...ledges.map(([x, y, w]) => ({ x, y, w, h: 18 })),
	];

	function reset() {
		score = 0; lives = 3; cameraX = 0; invuln = 0; won = false;
		player = { x: 80, y: GROUND - 44, w: 40, h: 44, vx: 0, vy: 0, onGround: false, face: 1 };
		nectar = [];
		for (const [x, y, w] of ledges) nectar.push({ x: x + w / 2, y: y - 34, got: false });
		for (let x = 250; x < LEVEL_END - 300; x += 230) nectar.push({ x, y: GROUND - 40, got: false });
		wasps = [[600, 260], [1350, 200], [2100, 220], [2950, 240], [3800, 220]].map(([x, range]) => ({ x, home: x, range, w: 36, h: 26, dir: 1, alive: true }));
	}

	// Input: keyboard plus on-screen buttons.
	const keys = { left: false, right: false, jump: false };
	let jumpQueued = false;
	const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump' };
	window.addEventListener('keydown', (e) => {
		if (state === 'playing' && (e.code === 'Escape' || e.code === 'KeyP')) { e.preventDefault(); pause(); return; }
		if (state === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) { e.preventDefault(); resume(); return; }
		const k = KEYMAP[e.code];
		if (!k || state !== 'playing') return;
		e.preventDefault(); // stop arrows and space scrolling the page mid-game
		if (k === 'jump' && !keys.jump) jumpQueued = true;
		keys[k] = true;
	});
	window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
	// A lost window or a hidden tab must not leave Buzzy running.
	window.addEventListener('blur', () => { keys.left = keys.right = keys.jump = false; if (state === 'playing') pause(); });
	document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });

	// On-screen controls and a close button, built here so the page markup stays simple.
	const style = document.createElement('style');
	style.textContent = `
		.bl-pad{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:space-between;padding:0 12px;pointer-events:none}
		.bl-pad[hidden],.bl-close[hidden]{display:none}
		.bl-pad div{display:flex;gap:10px}
		.bl-btn{pointer-events:auto;min-width:64px;min-height:56px;border:0;border-radius:16px;background:rgba(26,22,18,.55);color:#fff;font:700 18px system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none}
		.bl-btn:active,.bl-btn.on{background:rgba(26,22,18,.8)}
		.bl-close{position:absolute;top:10px;right:10px;min-width:44px;min-height:44px;border:0;border-radius:50%;background:rgba(26,22,18,.6);color:#fff;font:700 20px system-ui,sans-serif;cursor:pointer}
		.bl-btn:focus-visible,.bl-close:focus-visible,.bl-ov-btn:focus-visible{outline:3px solid #1a1612;outline-offset:2px}
		.bl-row{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center}
		.bl-ov-btn{padding:.8em 1.5em;border:0;border-radius:999px;font-weight:700;font-size:1.05em;min-height:48px;cursor:pointer;background:#e8a317}
		.bl-ov-btn.alt{background:#fff8e7;border:2px solid #2c5e4a;color:#2c5e4a}
		@media (hover:hover) and (pointer:fine){.bl-pad{display:none}}
		@media (max-width:760px){
			#kids-overlay{padding:.4em .6em;justify-content:center}
			#kids-overlay .face{display:none}
			#kids-overlay h2{font-size:1.25rem;line-height:1.15;margin:.1em 0}
			#kids-overlay p{font-size:.85rem;margin:.1em 0 .4em}
			#kids-overlay .bl-ov-btn{min-height:44px;padding:.45em 1.1em;font-size:.95rem}
			.bl-btn{min-width:52px;min-height:44px;font-size:15px}
			.bl-close{top:6px;right:6px}
		}`;
	document.head.appendChild(style);

	const pad = document.createElement('div');
	pad.className = 'bl-pad'; pad.hidden = true;
	pad.innerHTML = '<div><button type="button" class="bl-btn" data-k="left" aria-label="Run left">◀</button><button type="button" class="bl-btn" data-k="right" aria-label="Run right">▶</button></div><div><button type="button" class="bl-btn" data-k="jump" aria-label="Jump">Jump</button></div>';
	stage?.appendChild(pad);
	for (const btn of pad.querySelectorAll('button')) {
		const k = btn.dataset.k;
		const down = (e) => { e.preventDefault(); if (k === 'jump' && !keys.jump) jumpQueued = true; keys[k] = true; btn.classList.add('on'); btn.setPointerCapture?.(e.pointerId); };
		const up = (e) => { e.preventDefault(); keys[k] = false; btn.classList.remove('on'); };
		btn.addEventListener('pointerdown', down);
		btn.addEventListener('pointerup', up);
		btn.addEventListener('pointercancel', up);
		btn.addEventListener('contextmenu', (e) => e.preventDefault());
	}

	const closeBtn = document.createElement('button');
	closeBtn.type = 'button'; closeBtn.className = 'bl-close'; closeBtn.hidden = true;
	closeBtn.setAttribute('aria-label', 'Pause game'); closeBtn.textContent = '❚❚';
	closeBtn.addEventListener('click', () => pause());
	stage?.appendChild(closeBtn);

	// Overlay screens: start, paused, game over, win.
	const ov = overlay ? {
		h2: overlay.querySelector('h2'),
		kicker: overlay.querySelector('.overlay-kicker'),
		text: overlay.querySelectorAll('p')[1],
	} : null;
	const row = document.createElement('div');
	row.className = 'bl-row';
	if (startBtn) { startBtn.classList.add('bl-ov-btn'); startBtn.replaceWith(row); row.appendChild(startBtn); }
	const quitBtn = document.createElement('button');
	quitBtn.type = 'button'; quitBtn.className = 'bl-ov-btn alt'; quitBtn.textContent = 'Quit'; quitBtn.hidden = true;
	row.appendChild(quitBtn);

	function showOverlay(kicker, title, text, primary, showQuit) {
		if (!overlay || !ov) return;
		if (ov.kicker) ov.kicker.textContent = kicker;
		if (ov.h2) ov.h2.textContent = title;
		if (ov.text) ov.text.textContent = text;
		if (startBtn) startBtn.textContent = primary;
		quitBtn.hidden = !showQuit;
		overlay.hidden = false;
		pad.hidden = true; closeBtn.hidden = true;
		startBtn?.focus({ preventScroll: true });
	}
	function hideOverlay() {
		if (overlay) overlay.hidden = true;
		pad.hidden = false; closeBtn.hidden = false;
		canvas.focus?.({ preventScroll: true });
	}

	startBtn?.addEventListener('click', (e) => {
		e.stopPropagation();
		if (state === 'paused') resume(); else start();
	});
	quitBtn.addEventListener('click', () => quit());

	function start() { reset(); state = 'playing'; hideOverlay(); beep(420, 0.1, 'square'); last = performance.now(); }
	function pause() {
		if (state !== 'playing') return;
		state = 'paused'; keys.left = keys.right = keys.jump = false;
		showOverlay('Paused', 'Buzzy is resting', 'Score ' + score + '  ·  lives ' + lives, 'Resume', true);
	}
	function resume() { if (state !== 'paused') return; state = 'playing'; hideOverlay(); last = performance.now(); }
	function quit() {
		state = 'ready'; reset();
		showOverlay('Retro platform', 'Buzzy Lands', 'Left / Right to run. Jump. Get the nectar. Hit the hive.', 'Start', false);
	}
	function end(didWin) {
		state = 'over'; won = didWin;
		if (didWin) score += lives * 10;
		if (score > best) { best = score; try { localStorage.setItem('buzzy-lands-best', String(best)); } catch {} }
		showOverlay(didWin ? 'You made it' : 'Game over', didWin ? 'Home to the hive!' : 'Try again', 'Score ' + score + '  ·  best ' + best, 'Play again', true);
		beep(didWin ? 880 : 140, 0.3, didWin ? 'triangle' : 'sawtooth');
	}

	let audioCtx = null;
	function beep(f, d, type) {
		try {
			if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			if (audioCtx.state === 'suspended') audioCtx.resume();
			const o = audioCtx.createOscillator(), g = audioCtx.createGain();
			o.type = type || 'sine'; o.frequency.value = f; g.gain.value = 0.06;
			g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
			o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
		} catch {}
	}

	const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

	function hurt(always) {
		if (invuln > 0 && !always) return;
		lives -= 1; invuln = 1.5; beep(110, 0.2, 'sawtooth');
		if (lives <= 0) end(false);
	}
	function respawn() {
		// Back to the start of the ground segment before the gap.
		const seg = [...ground].reverse().find(([a]) => a <= player.x) || ground[0];
		player.x = seg[0] + 40; player.y = GROUND - player.h - 60; player.vx = 0; player.vy = 0;
	}

	function update(dt) {
		const p = player;
		p.vx = (keys.right ? RUN : 0) - (keys.left ? RUN : 0);
		if (p.vx) p.face = Math.sign(p.vx);
		if (jumpQueued && p.onGround) { p.vy = -JUMP; p.onGround = false; beep(620, 0.08, 'square'); }
		jumpQueued = false;
		if (!keys.jump && p.vy < -300) p.vy = -300; // short hop when jump is released early
		p.vy = Math.min(p.vy + GRAVITY * dt, 1400);

		p.x = Math.max(0, Math.min(LEVEL_END - p.w, p.x + p.vx * dt));
		// Ground edges are walls only once Buzzy has dropped below the surface into a gap.
		for (const s of solids) if (s.h > 18 && overlaps(p, s) && p.y + p.h > s.y + 6) { p.x = p.vx > 0 ? s.x - p.w : s.x + s.w; }

		const prevBottom = p.y + p.h;
		p.y += p.vy * dt; p.onGround = false;
		for (const s of solids) {
			if (!overlaps(p, s)) continue;
			if (p.vy >= 0 && prevBottom <= s.y + 2) { p.y = s.y - p.h; p.vy = 0; p.onGround = true; }
			else if (s.h > 18 && p.vy < 0) { p.y = s.y + s.h; p.vy = 0; }
		}
		if (p.y > H + 60) { hurt(true); if (state === 'playing') respawn(); }

		for (const n of nectar) {
			if (!n.got && Math.abs(p.x + p.w / 2 - n.x) < 30 && Math.abs(p.y + p.h / 2 - n.y) < 34) { n.got = true; score += 1; beep(760, 0.06, 'triangle'); }
		}
		for (const w of wasps) {
			if (!w.alive) continue;
			w.x += w.dir * 90 * dt;
			if (Math.abs(w.x - w.home) > w.range) w.dir *= -1;
			const box = { x: w.x - w.w / 2, y: GROUND - 150, w: w.w, h: w.h };
			if (!overlaps(p, box)) continue;
			if (p.vy > 0 && prevBottom <= box.y + 12) { w.alive = false; p.vy = -JUMP * 0.6; score += 5; beep(300, 0.12, 'square'); }
			else hurt();
		}
		if (invuln > 0) invuln -= dt;
		if (p.x + p.w > HIVE_X) end(true);
		cameraX = Math.max(0, Math.min(LEVEL_END - W, p.x - W * 0.35));
	}

	function drawBee(x, y, face) {
		if (invuln > 0 && Math.floor(invuln * 10) % 2) return;
		gfx.save(); gfx.translate(x + 20, y + 24); gfx.scale(face, 1);
		gfx.fillStyle = 'rgba(255,255,255,0.75)';
		gfx.beginPath(); gfx.ellipse(-4, -20, 12, 8, -0.5, 0, Math.PI * 2); gfx.fill();
		gfx.fillStyle = '#ffcc1a'; gfx.beginPath(); gfx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2); gfx.fill();
		gfx.fillStyle = '#1a1612'; gfx.fillRect(-10, -16, 6, 32); gfx.fillRect(2, -17, 6, 34);
		gfx.fillStyle = '#fff'; gfx.beginPath(); gfx.arc(14, -4, 5, 0, Math.PI * 2); gfx.fill();
		gfx.fillStyle = '#1a1612'; gfx.beginPath(); gfx.arc(15, -4, 2.5, 0, Math.PI * 2); gfx.fill();
		gfx.restore();
	}

	function draw() {
		if (gardenImg.complete && gardenImg.naturalWidth) {
			const off = -(cameraX * 0.3) % W;
			gfx.drawImage(gardenImg, off, 0, W, H); gfx.drawImage(gardenImg, off + W, 0, W, H);
		} else { gfx.fillStyle = '#8fd17a'; gfx.fillRect(0, 0, W, H); }
		gfx.fillStyle = 'rgba(255,255,255,0.15)'; gfx.fillRect(0, 0, W, H);

		gfx.save(); gfx.translate(-cameraX, 0);
		for (const s of solids) {
			if (s.x > cameraX + W || s.x + s.w < cameraX) continue;
			gfx.fillStyle = s.h > 18 ? '#6b4423' : '#8a5a2b'; gfx.fillRect(s.x, s.y, s.w, s.h);
			gfx.fillStyle = '#4caf50'; gfx.fillRect(s.x, s.y, s.w, 10);
		}
		for (const n of nectar) {
			if (n.got) continue;
			gfx.fillStyle = '#ff9f1a'; gfx.beginPath(); gfx.arc(n.x, n.y, 11, 0, Math.PI * 2); gfx.fill();
			gfx.fillStyle = '#fff3c4'; gfx.beginPath(); gfx.arc(n.x - 3, n.y - 3, 4, 0, Math.PI * 2); gfx.fill();
		}
		for (const w of wasps) {
			if (!w.alive) continue;
			const y = GROUND - 137;
			gfx.fillStyle = '#111'; gfx.beginPath(); gfx.ellipse(w.x, y, 20, 13, 0, 0, Math.PI * 2); gfx.fill();
			gfx.fillStyle = '#f5d000'; gfx.fillRect(w.x - 12, y - 8, 7, 16); gfx.fillRect(w.x, y - 8, 7, 16);
			gfx.fillStyle = 'rgba(255,255,255,0.7)'; gfx.beginPath(); gfx.ellipse(w.x - 6, y - 16, 10, 6, -0.4, 0, Math.PI * 2); gfx.fill();
		}
		// The hive
		gfx.fillStyle = '#e8a317';
		for (let i = 0; i < 4; i++) { gfx.beginPath(); gfx.ellipse(HIVE_X + 50, GROUND - 30 - i * 26, 46 - i * 8, 16, 0, 0, Math.PI * 2); gfx.fill(); }
		gfx.fillStyle = '#3b2a12'; gfx.beginPath(); gfx.arc(HIVE_X + 50, GROUND - 26, 10, 0, Math.PI * 2); gfx.fill();
		drawBee(player.x, player.y, player.face);
		gfx.restore();

		// HUD
		gfx.fillStyle = 'rgba(255,248,231,0.85)'; gfx.fillRect(10, 10, 200, 62);
		gfx.fillStyle = '#1a1612'; gfx.font = '800 26px system-ui, sans-serif'; gfx.fillText('Nectar ' + score, 20, 40);
		gfx.fillStyle = '#c45c00'; gfx.font = '700 15px system-ui, sans-serif'; gfx.fillText('Best ' + best, 20, 62);
		for (let i = 0; i < 3; i++) {
			gfx.fillStyle = i < lives ? '#ff4d6d' : '#d7cbb6';
			const hx = W - 100 - i * 30, hy = 28;
			gfx.beginPath(); gfx.moveTo(hx, hy + 4);
			gfx.bezierCurveTo(hx, hy - 8, hx - 16, hy - 4, hx, hy + 16);
			gfx.bezierCurveTo(hx + 16, hy - 4, hx, hy - 8, hx, hy + 4); gfx.fill();
		}
		if (faceImg.complete && faceImg.naturalWidth && state !== 'playing') {
			gfx.save(); gfx.beginPath(); gfx.arc(W - 60, H - 60, 36, 0, Math.PI * 2); gfx.clip();
			gfx.drawImage(faceImg, W - 96, H - 96, 72, 72); gfx.restore();
		}
	}

	let last = performance.now();
	function frame(now) {
		// rAF can report a time just before the Start click, so never step backwards.
		const dt = Math.max(0, Math.min(0.033, (now - last) / 1000)); last = now;
		if (state === 'playing') update(dt);
		draw();
		requestAnimationFrame(frame);
	}

	// Test hook: lets an automated check drive the game.
	window.__buzzyLands = { get state() { return state; }, get player() { return player; }, get score() { return score; }, get lives() { return lives; } };

	reset();
	requestAnimationFrame(frame);
})();
