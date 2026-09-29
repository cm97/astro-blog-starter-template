(() => {
	const canvas = document.getElementById('buzzy-kids');
	if (!(canvas instanceof HTMLCanvasElement)) return;
	const gfx = canvas.getContext('2d');
	if (!gfx) return;
	const overlay = document.getElementById('kids-overlay');
	const startBtn = document.getElementById('kids-start');
	const W = 960, H = 540;
	let playing = false, score = 0, combo = 0, lives = 3, best = 0, t = 0, spawnAcc = 0;
	try { best = Number(localStorage.getItem('buzzy-pop-best') || 0) || 0; } catch {}
	const gardenImg = new Image(); gardenImg.src = '/kids/garden.jpg';
	const faceImg = new Image(); faceImg.src = '/kids/buzzy-face.jpg';
	const items = [];
	const bits = [];
	let audioCtx = null;
	function beep(f, d, type) {
		try {
			if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			const o = audioCtx.createOscillator(), g = audioCtx.createGain();
			o.type = type || 'sine'; o.frequency.value = f; g.gain.value = 0.07;
			g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
			o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
		} catch {}
	}
	function burst(x, y, c) {
		for (let i = 0; i < 10; i++) bits.push({ x, y, vx: (Math.random()-0.5)*220, vy: (Math.random()-0.5)*220, life: 0.4, c });
	}
	function spawn() {
		const roll = Math.random();
		const kind = roll < 0.18 ? 'wasp' : roll < 0.28 ? 'gold' : 'flower';
		items.push({
			kind,
			x: 70 + Math.random() * (W - 140),
			y: 90 + Math.random() * (H - 170),
			r: kind === 'gold' ? 38 : 34,
			age: 0,
			max: kind === 'wasp' ? 2.4 : 1.7 - Math.min(0.7, score * 0.008),
		});
	}
	function reset() {
		score = 0; combo = 0; lives = 3; t = 0; spawnAcc = 0; items.length = 0; bits.length = 0;
		for (let i = 0; i < 4; i++) spawn();
	}
	function end() {
		playing = false;
		if (score > best) { best = score; try { localStorage.setItem('buzzy-pop-best', String(best)); } catch {} }
		if (!overlay) return;
		overlay.hidden = false;
		const h2 = overlay.querySelector('h2');
		const p = overlay.querySelectorAll('p')[1];
		const btn = overlay.querySelector('button');
		if (h2) h2.textContent = score >= 30 ? 'FLOWER BOSS!' : score >= 12 ? 'Nice pops!' : 'Try again';
		if (p) p.textContent = 'Score ' + score + '  ·  best ' + best;
		if (btn) btn.textContent = 'Pop again';
	}
	function start() {
		try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch {}
		reset(); playing = true; if (overlay) overlay.hidden = true; beep(420, 0.1, 'square');
	}
	startBtn?.addEventListener('click', e => { e.stopPropagation(); start(); });
	function hitAt(cx, cy) {
		if (!playing) { start(); return; }
		const rect = canvas.getBoundingClientRect();
		const x = (cx - rect.left) * (W / rect.width);
		const y = (cy - rect.top) * (H / rect.height);
		let hit = null, hi = -1;
		for (let i = items.length - 1; i >= 0; i--) {
			const it = items[i];
			const dx = x - it.x, dy = y - it.y;
			if (dx*dx + dy*dy <= (it.r + 8) * (it.r + 8)) { hit = it; hi = i; break; }
		}
		if (!hit) { combo = 0; beep(160, 0.06, 'sawtooth'); return; }
		items.splice(hi, 1);
		if (hit.kind === 'wasp') {
			lives -= 1; combo = 0; burst(hit.x, hit.y, '#222');
			beep(110, 0.18, 'sawtooth');
			if (lives <= 0) end();
			return;
		}
		combo += 1;
		const add = (hit.kind === 'gold' ? 5 : 1) * Math.min(6, combo);
		score += add;
		burst(hit.x, hit.y, hit.kind === 'gold' ? '#ffe566' : '#ff6b9a');
		beep(hit.kind === 'gold' ? 880 : 520 + combo * 30, 0.08, 'triangle');
	}
	canvas.addEventListener('pointerdown', e => { e.preventDefault(); hitAt(e.clientX, e.clientY); });
	let last = performance.now();
	function frame(now) {
		const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
		if (playing) {
			spawnAcc += dt;
			const rate = Math.max(0.28, 0.7 - score * 0.008);
			while (spawnAcc > rate) { spawnAcc -= rate; spawn(); }
			for (let i = items.length - 1; i >= 0; i--) {
				items[i].age += dt;
				if (items[i].age > items[i].max) {
					if (items[i].kind !== 'wasp') { lives -= 1; combo = 0; if (lives <= 0) end(); }
					items.splice(i, 1);
				}
			}
		}
		for (let i = bits.length - 1; i >= 0; i--) {
			const b = bits[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
			if (b.life <= 0) bits.splice(i, 1);
		}
		draw(); requestAnimationFrame(frame);
	}
	function drawBloom(it) {
		const grow = Math.min(1, it.age / 0.18);
		const left = 1 - it.age / it.max;
		gfx.save(); gfx.translate(it.x, it.y); gfx.scale(grow, grow);
		if (it.kind === 'wasp') {
			gfx.fillStyle = '#111'; gfx.beginPath(); gfx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); gfx.fill();
			gfx.fillStyle = '#f5d000';
			gfx.fillRect(-14, -8, 8, 16); gfx.fillRect(-2, -8, 8, 16);
			gfx.fillStyle = 'rgba(255,255,255,0.7)'; gfx.beginPath(); gfx.ellipse(-10, -16, 10, 6, -0.4, 0, Math.PI * 2); gfx.fill();
		} else {
			const col = it.kind === 'gold' ? '#ffd000' : (it.x % 2 < 1 ? '#ff4f8b' : '#ff8a3c');
			for (let i = 0; i < 7; i++) {
				gfx.rotate((Math.PI * 2) / 7);
				gfx.fillStyle = col; gfx.beginPath(); gfx.ellipse(0, -16, 9, 16, 0, 0, Math.PI * 2); gfx.fill();
			}
			gfx.fillStyle = '#fff6c2'; gfx.beginPath(); gfx.arc(0, 0, 10, 0, Math.PI * 2); gfx.fill();
			gfx.fillStyle = '#e08900'; gfx.beginPath(); gfx.arc(0, 0, 5, 0, Math.PI * 2); gfx.fill();
		}
		gfx.restore();
		gfx.strokeStyle = left < 0.35 ? '#ff3b3b' : 'rgba(0,0,0,0)';
		gfx.lineWidth = 3; gfx.beginPath(); gfx.arc(it.x, it.y, it.r + 6, 0, Math.PI * 2 * left); gfx.stroke();
	}
	function draw() {
		if (gardenImg.complete && gardenImg.naturalWidth) gfx.drawImage(gardenImg, 0, 0, W, H);
		else { gfx.fillStyle = '#8fd17a'; gfx.fillRect(0, 0, W, H); }
		gfx.fillStyle = 'rgba(255,255,255,0.12)'; gfx.fillRect(0, 0, W, H);
		for (const it of items) drawBloom(it);
		for (const b of bits) { gfx.globalAlpha = Math.max(0, b.life * 2); gfx.fillStyle = b.c; gfx.beginPath(); gfx.arc(b.x, b.y, 5, 0, Math.PI * 2); gfx.fill(); }
		gfx.globalAlpha = 1;
		if (faceImg.complete && faceImg.naturalWidth) {
			gfx.save(); gfx.beginPath(); gfx.arc(70, H - 70, 44, 0, Math.PI * 2); gfx.clip();
			gfx.drawImage(faceImg, 26, H - 114, 88, 88); gfx.restore();
		}
		gfx.fillStyle = '#1a1612'; gfx.font = '800 28px Atkinson, sans-serif'; gfx.fillText(String(score), 16, 40);
		gfx.fillStyle = '#c45c00'; gfx.font = '700 16px Atkinson, sans-serif';
		gfx.fillText(combo > 1 ? ('COMBO x' + combo) : ('Best ' + best), 16, 64);
		for (let i = 0; i < 3; i++) {
			gfx.fillStyle = i < lives ? '#ff4d6d' : '#d7cbb6';
			gfx.beginPath();
			const hx = W - 28 - i * 30, hy = 28;
			gfx.moveTo(hx, hy + 4);
			gfx.bezierCurveTo(hx, hy - 8, hx - 16, hy - 4, hx, hy + 16);
			gfx.bezierCurveTo(hx + 16, hy - 4, hx, hy - 8, hx, hy + 4);
			gfx.fill();
		}
	}
	window.__controlsTest = {
		getYaw: () => 0.5,
		getSpeed: () => playing ? 0.4 : 0,
		setKeys: () => {},
		setSteer: () => {},
	};
	reset(); requestAnimationFrame(frame);
})();
