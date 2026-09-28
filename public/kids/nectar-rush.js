(() => {
	const canvas = document.getElementById('buzzy-kids');
	if (!(canvas instanceof HTMLCanvasElement)) return;
	const gfx = canvas.getContext('2d');
	if (!gfx) return;
	const overlay = document.getElementById('kids-overlay');
	const startBtn = document.getElementById('kids-start');
	const W = 960, H = 540;
	const keys = new Set();
	let playing = false, score = 0, combo = 0, hearts = 3, invuln = 0, best = 0;
	try { best = Number(localStorage.getItem('buzzy-kids-best') || 0) || 0; } catch {}
	const flyImg = new Image(); flyImg.src = '/kids/buzzy-face.jpg';
	const gardenImg = new Image(); gardenImg.src = '/kids/garden.jpg';
	const particles = [];
	const clouds = [{x:0.1,y:0.12,s:0.8,v:0.04},{x:0.55,y:0.2,s:1.1,v:0.025},{x:0.85,y:0.08,s:0.7,v:0.035}];
	const bugs = [];
	const sim = { x:0.32,y:0.5,vy:0,vx:0,flap:0,t:0,flowers:[],stems:[],bursts:[] };
	let audioCtx = null;
	function beep(freq, dur, type) {
		try {
			if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
			o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = 0.06;
			g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
			o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
		} catch {}
	}
	function pop(x,y,color,n){ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*0.9,vy:(Math.random()-0.5)*0.9-0.2,life:0.45+Math.random()*0.3,c:color}); }
	function spawnStem(x){
		const gap = 0.22 + Math.random()*0.22;
		sim.stems.push({x,gap});
		sim.flowers.push({x:x+0.05,y:Math.min(0.82,Math.max(0.16,gap+0.12+(Math.random()*0.16-0.05))),got:false,hue:Math.random()<0.5?'#ff5d8f':'#ffd166'});
		if (Math.random()<0.28) sim.bursts.push({x:x+0.18,y:0.2+Math.random()*0.55,got:false});
	}
	function reset(){
		sim.x=0.28;sim.y=0.5;sim.vy=0;sim.vx=0;sim.flap=0;sim.t=0;score=0;combo=0;hearts=3;invuln=0;
		sim.flowers=[];sim.stems=[];sim.bursts=[];particles.length=0;bugs.length=0;
		for(let i=0;i<4;i++) spawnStem(1.05+i*0.46);
		for(let i=0;i<3;i++) bugs.push({x:0.6+i*0.4,y:0.2+Math.random()*0.5,s:0.6+Math.random()*0.5});
	}
	function flap(){ if(!playing) return; sim.vy=-0.7; sim.flap=1; beep(520,0.07,'triangle'); }
	window.addEventListener('keydown', e => { keys.add(e.code); if(e.code==='Space'){ e.preventDefault(); playing?flap():start(); } });
	window.addEventListener('keyup', e => keys.delete(e.code));
	window.addEventListener('blur', () => keys.clear());
	canvas.addEventListener('pointerdown', e => {
		const r = canvas.getBoundingClientRect(); const nx = (e.clientX-r.left)/r.width;
		if(!playing){ start(); return; }
		if(nx<0.28) sim.vx=-0.62; else if(nx>0.72) sim.vx=0.62; else flap();
	});
	startBtn?.addEventListener('click', e => { e.stopPropagation(); start(); });
	function start(){ try{ if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume(); }catch{} reset(); playing=true; if(overlay) overlay.hidden=true; beep(380,0.1,'square'); }
	function bump(n){ score += n*Math.max(1,Math.min(5,combo)); if(score>best){ best=score; try{ localStorage.setItem('buzzy-kids-best', String(best)); }catch{} } }
	function hit(){ if(invuln>0) return; hearts-=1; invuln=1.1; combo=0; beep(140,0.18,'sawtooth'); pop(sim.x,sim.y,'#ff6b6b',14); if(hearts<=0) crash(); }
	function crash(){ playing=false; if(overlay){ overlay.hidden=false; const h2=overlay.querySelector('h2'); const p=overlay.querySelector('p:nth-of-type(2)'); const btn=overlay.querySelector('button');
		if(h2) h2.textContent = score>=20?'BUZZ CHAMP!':score>=8?'Sweet flight!':'Oof — fly again';
		if(p) p.textContent='Nectar '+score+' · best '+best; if(btn) btn.textContent='Again!'; } }
	let last=performance.now();
	function frame(now){
		const dt=Math.min(0.05,(now-last)/1000); last=now; sim.t+=dt; invuln=Math.max(0,invuln-dt);
		if(playing){
			let ax=0; if(keys.has('KeyA')||keys.has('ArrowLeft')) ax-=1; if(keys.has('KeyD')||keys.has('ArrowRight')) ax+=1;
			sim.vx+=ax*2.1*dt; sim.vx*=Math.pow(0.1,dt); sim.x+=sim.vx*dt;
			if(sim.x<0.08){sim.x=0.08;sim.vx=0;} if(sim.x>0.82){sim.x=0.82;sim.vx=0;}
			sim.vy+=1.65*dt; sim.y+=sim.vy*dt; sim.flap=Math.max(0,sim.flap-dt*3.2);
			if(sim.y<0.07||sim.y>0.93) hit();
			const scroll=(0.2+Math.min(0.16,score*0.004))*dt;
			for(const s of sim.stems) s.x-=scroll; for(const f of sim.flowers) f.x-=scroll; for(const b of sim.bursts) b.x-=scroll;
			for(const c of clouds){ c.x-=c.v*dt; if(c.x<-0.2) c.x=1.2; }
			for(const b of bugs){ b.x-=0.12*dt; b.y+=Math.sin(sim.t*3+b.x)*0.04*dt; if(b.x<-0.1) b.x=1.2; }
			while(sim.stems.length&&sim.stems[0].x<-0.25) sim.stems.shift();
			while(sim.flowers.length&&sim.flowers[0].x<-0.25) sim.flowers.shift();
			while(sim.bursts.length&&sim.bursts[0].x<-0.25) sim.bursts.shift();
			if(!sim.stems.length||sim.stems[sim.stems.length-1].x<1.02) spawnStem(1.22);
			const fx=sim.x, fy=sim.y;
			for(const s of sim.stems){ const inX=fx>s.x-0.025&&fx<s.x+0.08; const inGap=fy>s.gap&&fy<s.gap+0.36; if(inX&&!inGap) hit(); }
			for(const f of sim.flowers){ if(f.got) continue; const dx=fx-f.x, dy=fy-f.y; if(dx*dx+dy*dy<0.007){ f.got=true; combo+=1; bump(1); pop(f.x,f.y,f.hue,10); beep(660+combo*40,0.08,'sine'); } }
			for(const b of sim.bursts){ if(b.got) continue; const dx=fx-b.x, dy=fy-b.y; if(dx*dx+dy*dy<0.008){ b.got=true; combo+=2; bump(3); if(hearts<3) hearts+=1; pop(b.x,b.y,'#fff36a',18); beep(880,0.14,'square'); } }
		}
		for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=0.6*dt; if(p.life<=0) particles.splice(i,1); }
		draw(); requestAnimationFrame(frame);
	}
	function drawFlower(x,y,color,t){
		gfx.save(); gfx.translate(x,y); gfx.rotate(t*0.4);
		for(let i=0;i<6;i++){ gfx.rotate(Math.PI/3); gfx.beginPath(); gfx.fillStyle=color; gfx.ellipse(0,-11,7,12,0,0,Math.PI*2); gfx.fill(); }
		gfx.beginPath(); gfx.fillStyle='#fff8e7'; gfx.arc(0,0,6,0,Math.PI*2); gfx.fill();
		gfx.beginPath(); gfx.fillStyle='#e8a317'; gfx.arc(0,0,3.2,0,Math.PI*2); gfx.fill(); gfx.restore();
	}
	function draw(){
		gfx.clearRect(0,0,W,H);
		if(gardenImg.complete&&gardenImg.naturalWidth){ const ox=-((sim.t*18)%W); gfx.drawImage(gardenImg,ox,0,W,H); gfx.drawImage(gardenImg,ox+W,0,W,H); }
		else { const sky=gfx.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#6ec4ff'); sky.addColorStop(0.55,'#c8ecff'); sky.addColorStop(1,'#b7e38a'); gfx.fillStyle=sky; gfx.fillRect(0,0,W,H); }
		gfx.globalAlpha=0.55; gfx.fillStyle='#fff';
		for(const c of clouds){ gfx.beginPath(); gfx.ellipse(c.x*W,c.y*H,70*c.s,24*c.s,0,0,Math.PI*2); gfx.fill(); }
		gfx.globalAlpha=1;
		for(const b of bugs){ gfx.fillStyle='#7c4dff'; gfx.beginPath(); gfx.ellipse(b.x*W,b.y*H,6*b.s,3*b.s,0,0,Math.PI*2); gfx.fill(); }
		for(const s of sim.stems){ const x=s.x*W; const g=gfx.createLinearGradient(x,0,x+22,0); g.addColorStop(0,'#1f7a4a'); g.addColorStop(1,'#0d3d24'); gfx.fillStyle=g; gfx.fillRect(x,0,22,Math.max(0,s.gap*H-6)); gfx.fillRect(x,(s.gap+0.36)*H,22,H); gfx.fillStyle='#3cb371'; gfx.beginPath(); gfx.ellipse(x+11,s.gap*H-8,20,10,0,0,Math.PI*2); gfx.fill(); }
		for(const f of sim.flowers){ if(!f.got) drawFlower(f.x*W,f.y*H,f.hue,sim.t); }
		for(const b of sim.bursts){ if(b.got) continue; const pulse=10+Math.sin(sim.t*8)*3; gfx.beginPath(); gfx.fillStyle='#fff36a'; gfx.arc(b.x*W,b.y*H,pulse,0,Math.PI*2); gfx.fill(); gfx.fillStyle='#c45c00'; gfx.font='700 14px Atkinson, sans-serif'; gfx.fillText('+3',b.x*W-10,b.y*H+5); }
		for(const p of particles){ gfx.globalAlpha=Math.max(0,p.life); gfx.fillStyle=p.c; gfx.beginPath(); gfx.arc(p.x*W,p.y*H,4,0,Math.PI*2); gfx.fill(); }
		gfx.globalAlpha=1;
		const px=sim.x*W, py=sim.y*H, squash=1+sim.flap*0.22;
		gfx.save(); gfx.translate(px,py); gfx.rotate(Math.max(-0.4,Math.min(0.45,sim.vy*0.25))); gfx.scale(squash,2-squash);
		if(invuln>0 && Math.floor(sim.t*16)%2===0) gfx.globalAlpha=0.45;
		gfx.fillStyle='rgba(255,255,255,0.55)'; gfx.beginPath(); gfx.ellipse(-18,-6,16,8,-0.4,0,Math.PI*2); gfx.ellipse(16,-8,14,7,0.5,0,Math.PI*2); gfx.fill();
		if(flyImg.complete&&flyImg.naturalWidth){ gfx.beginPath(); gfx.arc(0,0,36,0,Math.PI*2); gfx.clip(); gfx.drawImage(flyImg,-36,-36,72,72); }
		else { gfx.fillStyle='#f3eee4'; gfx.beginPath(); gfx.arc(0,0,30,0,Math.PI*2); gfx.fill(); }
		gfx.restore();
		gfx.fillStyle='#1a1612'; gfx.font='800 24px Atkinson, sans-serif'; gfx.fillText('Nectar '+score,16,34);
		gfx.fillStyle='#c45c00'; gfx.font='700 16px Atkinson, sans-serif'; gfx.fillText(combo>1?('COMBO x'+Math.min(5,combo)):('Best '+best),16,56);
		for(let i=0;i<3;i++){ gfx.fillStyle=i<hearts?'#ff4d6d':'#d7cbb6'; gfx.beginPath(); const hx=W-28-i*28, hy=28; gfx.moveTo(hx,hy+4); gfx.bezierCurveTo(hx,hy-8,hx-16,hy-4,hx,hy+16); gfx.bezierCurveTo(hx+16,hy-4,hx,hy-8,hx,hy+4); gfx.fill(); }
	}
	window.__controlsTest={ getYaw:()=>sim.x, getSpeed:()=>Math.abs(sim.vx)+(playing?0.3:0), setKeys:(codes)=>{keys.clear(); for(const c of codes) keys.add(c);}, setSteer:(v)=>{sim.vx=v*0.4;} };
	reset(); requestAnimationFrame(frame);
})();
