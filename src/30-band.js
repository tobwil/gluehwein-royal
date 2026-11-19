/* ================= Hausband „Die Glühwürmchen“ – alles WebAudio-Synthese ================= */
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
const parseMel = (s) => s.split(' ').map((x) => { const [m, b] = x.split(':'); return [+m, +b]; });

const Sound = {
  ctx: null, master: null, musicGain: null, musicOn: false, nextStep: 0, step: 0, timer: null, mel: null, forced: 0,
  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.ctx.destination);
        this.master = this.ctx.createGain(); this.master.gain.value = .85; this.master.connect(comp);
        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.master);
        const len = this.ctx.sampleRate * 2; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  },
  tone(f, t, dur, { type = 'sine', vol = .2, attack = .01, out, detune = 0, glide, lp } = {}) {
    if (!this.ctx) return; const c = this.ctx; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node = o; if (lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; o.connect(f2); node = f2; }
    node.connect(g); g.connect(out || this.master); o.start(t); o.stop(t + dur + .05);
  },
  noise(t, dur, { vol = .2, type = 'highpass', freq = 6000, q = 1, out, sweep } = {}) {
    if (!this.ctx) return; const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this.master); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  // Schlagzeug
  kick(t, out, v = .55) { this.tone(150, t, .32, { vol: v, attack: .002, glide: 42, out }); Band.hit('drums', t); },
  snare(t, out, v = .26) { this.noise(t, .16, { vol: v, type: 'bandpass', freq: 2200, q: .6, out }); this.tone(190, t, .1, { vol: v * .6, type: 'triangle', out }); Band.hit('drums', t); },
  hat(t, out, v = .07, open = false) { this.noise(t, open ? .28 : .045, { vol: v, freq: 8500, out }); },
  crash(t, out, v = .2) { this.noise(t, 1.6, { vol: v, freq: 5200, out }); Band.hit('drums', t); },
  tom(t, f, out, v = .4) { this.tone(f, t, .25, { vol: v, attack: .002, glide: f * .6, out }); Band.hit('drums', t); },
  // Bläsersatz: zwei verstimmte Sägezähne durch einen Tiefpass
  horn(ms, t, dur, vol = .08, out) { ms.forEach((m) => { this.tone(N(m), t, dur, { type: 'sawtooth', vol, attack: .025, lp: 2600, out }); this.tone(N(m), t, dur, { type: 'sawtooth', vol: vol * .7, attack: .03, detune: 12, lp: 2600, out }); }); Band.hit('horn', t); },
  keys(ms, t, dur, vol = .05, out) { ms.forEach((m) => { this.tone(N(m), t, dur, { type: 'triangle', vol, attack: .004, out }); this.tone(N(m + 12), t, dur * .6, { vol: vol * .35, attack: .004, out }); }); Band.hit('keys', t); },
  bass(m, t, dur, out, vol = .3) { this.tone(N(m), t, dur, { type: 'sawtooth', vol, attack: .006, lp: 520, out }); this.tone(N(m), t, dur, { type: 'sine', vol: vol * .8, attack: .006, out }); Band.hit('bass', t); },
  play(name) {
    if (!this.ctx) return; const t = this.ctx.currentTime + .02;
    switch (name) {
      case 'jingle': { // Titelmelodie der Show
        const b = 60 / 128;
        [0, 1, 2, 3].forEach((i) => { this.kick(t + i * b); this.hat(t + i * b + b / 2); }); this.snare(t + b); this.snare(t + 3 * b);
        this.horn([67, 72], t, b * .45); this.horn([67, 72], t + b * .5, b * .45); this.horn([67, 72], t + b, b * .45); this.horn([71, 76], t + b * 1.5, b * 1.2);
        this.horn([69, 74], t + b * 2.5, b * .45); this.horn([72, 77], t + b * 3, b * .9);
        [0, 1, 2, 3].forEach((i) => this.bass([36, 36, 41, 43][i], t + i * b, b * .8));
        [[0, 45], [.25, 45], [.5, 43], [.75, 43]].forEach(([d, f]) => this.tom(t + b * 3.5 + d * b * .5, N(f)));
        const e = t + b * 4; this.kick(e); this.crash(e, null, .25); this.horn([60, 64, 67, 72, 76], e, 1.8, .06); this.bass(36, e, 1.6); this.keys([64, 67, 71, 74], e, 1.6);
        break;
      }
      case 'sting': { const b = .14; this.horn([67, 71], t, b); this.horn([69, 72], t + b, b); this.horn([72, 76, 79], t + 2 * b, .7); this.kick(t + 2 * b); this.crash(t + 2 * b, null, .12); break; }
      case 'tusch': { // klassischer Tusch: Wirbel + Bläser-Akkord
        for (let i = 0; i < 14; i++) this.noise(t + i * .035, .05, { vol: .06 + i * .008, type: 'bandpass', freq: 2000, q: .7 });
        const e = t + .5; this.crash(e, null, .25); this.kick(e);
        [0, .09, .18, .27, .36, .45, .54, .63].forEach((d, i) => this.horn(i % 2 ? [72, 76, 79] : [71, 74, 77], e + d, .1, .055));
        this.horn([60, 64, 67, 72, 76], e + .72, 1.4, .07); this.bass(36, e + .72, 1.2);
        break;
      }
      case 'rimshot': this.tom(t, N(52)); this.tom(t + .14, N(45)); this.crash(t + .32, null, .18); this.kick(t + .32); break;
      case 'fanfare': {
        [[67, 0, .16], [67, .18, .16], [67, .36, .16], [72, .54, .9]].forEach(([m, d, l]) => this.horn([m, m - 5], t + d, l, .08));
        this.horn([60, 64, 67, 72], t + 1.1, 1.6, .06); this.crash(t + 1.1); this.kick(t + 1.1); this.bass(36, t + 1.1, 1.4);
        break;
      }
      case 'tick': this.tone(1400, t, .04, { type: 'square', vol: .05 }); break;
      case 'tock': this.tone(900, t, .06, { type: 'square', vol: .08 }); break;
      case 'click': this.tone(2200, t, .03, { type: 'triangle', vol: .08 }); break;
      case 'lock': this.tone(520, t, .08, { type: 'square', vol: .08 }); this.tone(780, t + .07, .12, { type: 'square', vol: .07 }); break;
      case 'buzz': this.tone(196, t, .5, { type: 'square', vol: .14 }); this.tone(247, t, .5, { type: 'sawtooth', vol: .08 }); break;
      case 'right': [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, t + i * .07, .7, { vol: .12 })); this.tone(2637, t + .28, 1.2, { vol: .05 }); break;
      case 'wrong': this.tone(140, t, .6, { type: 'sawtooth', vol: .16 }); this.tone(133, t, .6, { type: 'sawtooth', vol: .14 }); break;
      case 'whoosh': this.noise(t, .5, { vol: .25, type: 'bandpass', freq: 400, sweep: 5000, q: 2 }); break;
      case 'bell': [880, 1320, 2200].forEach((f, i) => this.tone(f, t, 1.4 - i * .3, { vol: .1 / (i + 1) })); break;
      case 'coin': this.tone(988, t, .08, { type: 'square', vol: .07 }); this.tone(1319, t + .08, .3, { type: 'square', vol: .07 }); break;
      case 'drumroll':
        for (let i = 0; i < 34; i++) this.noise(t + i * .045, .06, { vol: .05 + i * .006, type: 'bandpass', freq: 1800, q: .8 });
        this.crash(t + 1.55, null, .22); this.kick(t + 1.55, null, .5); break;
      case 'applause': for (let i = 0; i < 110; i++) this.noise(t + Math.random() * 2.8, .05, { vol: .05 + Math.random() * .07, type: 'bandpass', freq: 1200 + Math.random() * 1800, q: 1.5 }); break;
      case 'sad': [[63, 0], [62, .35], [61, .7], [60, 1.05]].forEach(([m, d], i) => this.horn([m - 12], t + d, i === 3 ? 1 : .32, .07)); break;
    }
  },
  // Groove der Hausband: Funk mit 112 BPM, Sechzehntel-Raster
  setMusic(on) {
    this.musicOn = on; if (!this.ctx) return;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(on || this.forced > now() ? .5 : 0, this.ctx.currentTime + .6);
    if ((on || this.forced > now()) && !this.timer) { this.nextStep = this.ctx.currentTime + .1; this.timer = setInterval(() => this.schedule(), 50); }
  },
  groove(sec) { this.forced = now() + sec * 1000; this.setMusic(this.musicOn); this.musicGain.gain.linearRampToValueAtTime(.8, this.ctx.currentTime + .4); setTimeout(() => this.setMusic(this.musicOn), sec * 1000); },
  hold(on) { this.held = on; if (this.ctx) { this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime); this.musicGain.gain.setTargetAtTime(on ? 0 : (this.musicOn ? .5 : 0), this.ctx.currentTime, .15); } },
  duck(on) { if (this.held) return; if (this.ctx && (this.musicOn || this.forced > now())) { this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime); this.musicGain.gain.linearRampToValueAtTime(on ? .1 : .5, this.ctx.currentTime + .3); } },
  schedule() {
    if (!this.ctx) return; const s16 = 60 / 112 / 4, out = this.musicGain;
    const prog = [[38, [65, 69, 72, 76]], [43, [65, 71, 74, 77]], [36, [64, 67, 71, 74]], [45, [64, 67, 73, 76]]];
    while (this.nextStep < this.ctx.currentTime + .2) {
      if (!this.musicOn && this.forced < now()) { clearInterval(this.timer); this.timer = null; return; }
      const st = this.step % 16, bar = Math.floor(this.step / 16) % 4, [root, chord] = prog[bar], t = this.nextStep;
      if ([0, 7, 10].includes(st)) this.kick(t, out, .45);
      if (st === 4 || st === 12) this.snare(t, out, .2);
      if (st % 2 === 0) this.hat(t, out, st === 14 ? .06 : .045, st === 14);
      const bl = { 0: 0, 3: 0, 6: 12, 8: 7, 10: 10, 13: 12, 14: 7 }; if (st in bl) this.bass(root + bl[st] - 12 + (root < 40 ? 12 : 0), t, s16 * 1.6, out, .22);
      if (st === 2 || st === 9) this.keys(chord, t, s16 * 1.4, .03, out);
      if (bar === 3 && (st === 12 || st === 14)) this.horn(chord.slice(1), t, s16 * 1.2, .035, out);
      this.nextStep += s16; this.step++;
    }
  },
  // Melodie für „Die Band spielt …“
  playMelody(m, { drums = false } = {}) {
    this.unlock(); if (!this.ctx) return { dur: 3 }; this.stopMelody();
    const c = this.ctx, out = c.createGain(); out.gain.value = 1; out.connect(this.master); this.mel = out;
    const beat = 60 / m.bpm, notes = parseMel(m.n); let t = c.currentTime + .15; const t0 = t;
    notes.forEach(([midi, b]) => {
      const d = b * beat;
      this.tone(N(midi), t, Math.min(d * 1.8, 1.4), { type: 'triangle', vol: .2, attack: .004, out });
      this.tone(N(midi) * 2, t, Math.min(d, .5), { vol: .05, attack: .004, out });
      Roll.add(midi, t, d); Band.hit('keys', t); t += d;
    });
    if (drums) { const beats = Math.ceil((t - t0) / beat); for (let i = 0; i < beats; i++) { const bt = t0 + i * beat; if (i % 2 === 0) this.kick(bt, out, .35); else this.snare(bt, out, .14); this.hat(bt + beat / 2, out, .05); } }
    return { dur: t - t0 + .2 };
  },
  stopMelody() { if (this.mel) { try { this.mel.gain.setValueAtTime(0, this.ctx.currentTime); setTimeout(((g) => () => g.disconnect())(this.mel), 200); } catch { /* egal */ } this.mel = null; Roll.clear(); } },
};

/* Band-Visualisierung: Musiker hüpfen im Takt */
const Band = {
  el: null,
  mount() {
    this.el = $('#band');
    this.el.innerHTML = `<span class="bn">Die Glüh&shy;würmchen</span>${BAND.map((m) => `<span class="mus" data-i="${m.i}" style="--c:${m.c}"><span class="av">${m.e}</span><span class="eq"><i></i><i></i><i></i></span></span>`).join('')}`;
  },
  hit(i, t) {
    if (!this.el || !Sound.ctx) return; const ms = Math.max(0, (t - Sound.ctx.currentTime) * 1000);
    setTimeout(() => { const m = this.el.querySelector(`[data-i="${i}"]`); if (!m) return; m.classList.add('hit'); clearTimeout(m._t); m._t = setTimeout(() => m.classList.remove('hit'), 110); }, ms);
  },
};

/* Piano-Roll für die Musikrunde */
const Roll = {
  notes: [], add(m, t, d) { this.notes.push({ m, t, d }); if (this.notes.length > 200) this.notes.shift(); }, clear() { this.notes = []; },
  draw() {
    const c = $('#roll'); if (!c || !Sound.ctx) return; const g = c.getContext('2d');
    const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(2, devicePixelRatio || 1); if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const now0 = Sound.ctx.currentTime, span = 4, px = w * .7 / span, lo = 55, hi = 82;
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; for (let m = lo; m <= hi; m += 2) { const y = h - ((m - lo) / (hi - lo)) * (h - 20) - 10; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const xNow = w * .7; g.fillStyle = '#c8155f'; g.fillRect(xNow - 1.5, 0, 3, h);
    const cols = ['#ffffff'];
    for (const n of this.notes) {
      const x = xNow + (n.t - now0) * px, y = h - ((n.m - lo) / (hi - lo)) * (h - 20) - 10, len = Math.max(6, n.d * px - 4);
      if (n.t > now0 || x + len < 0) continue; // nur gespielte Noten zeigen – die Zukunft bleibt geheim
      const active = now0 < n.t + n.d; g.fillStyle = cols[n.m % cols.length]; g.globalAlpha = active ? 1 : .55;
      g.fillRect(x, y - 6, len, 12);
      if (active) { g.globalAlpha = 1; g.fillStyle = '#c8155f'; g.fillRect(xNow - 9, y - 9, 18, 18); }
      g.globalAlpha = 1;
    }
  },
};

/* ================= Hintergrund & Effekte ================= */
const FX = (() => {
  const bg = $('#bg'), fx = $('#fx'), b = bg.getContext('2d'), f = fx.getContext('2d');
  let W = 0, H = 0; const parts = []; let flashC = null, flashT = 0, flashDur = 1, rockets = 0;
  function size() { const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; [bg, fx].forEach((c) => { c.width = W * dpr; c.height = H * dpr; }); b.setTransform(dpr, 0, 0, dpr, 0, 0); f.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', size); size();
  const flakes = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), s: 6 + Math.random() * 14, v: .00012 + Math.random() * .00025, r: Math.random() * 6, vr: (Math.random() - .5) * .01 }));
  function drawBg() {
    b.clearRect(0, 0, W, H);
    b.strokeStyle = 'rgba(20,26,61,.08)'; b.lineWidth = 2.5;
    for (const p of flakes) {
      if (!REDUCED) { p.y -= p.v * 16; p.r += p.vr; if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); } }
      b.save(); b.translate(p.x * W, p.y * H); b.rotate(p.r); b.beginPath(); b.moveTo(-p.s / 2, 0); b.lineTo(p.s / 2, 0); b.moveTo(0, -p.s / 2); b.lineTo(0, p.s / 2); b.stroke(); b.restore();
    }
    if (flashC) { const k = 1 - (now() - flashT) / flashDur; if (k <= 0) flashC = null; else { b.fillStyle = flashC.replace('A', String(.16 * k)); b.fillRect(0, 0, W, H); } }
  }
  const COLORS = ['#141a3d', '#c8155f', '#141a3d', '#c8155f', '#b9bccd'];
  function confetti(n = 160, colors = COLORS) {
    for (let i = 0; i < n; i++) parts.push({ k: 'c', x: W * (.15 + Math.random() * .7), y: H * .3, vx: (Math.random() - .5) * 17, vy: -Math.random() * 15 - 4, g: .32, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 7 + Math.random() * 7, h: 11 + Math.random() * 9, c: colors[i % colors.length], life: 1, decay: .004 + Math.random() * .004 });
  }
  function burst(x, y, color) { const n = 60; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28, sp = 2 + Math.random() * 5; parts.push({ k: 's', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: .06, c: color, life: 1, decay: .014 + Math.random() * .01, w: 4 }); } }
  function fireworks(seconds = 6, colors = COLORS) {
    if (REDUCED) { confetti(80); return; }
    const end = now() + seconds * 1000; rockets++;
    const id = setInterval(() => {
      if (now() > end) { clearInterval(id); rockets--; return; }
      parts.push({ k: 'r', x: W * (.15 + Math.random() * .7), y: H, vx: (Math.random() - .5) * 2, vy: -(H / 70) - Math.random() * 4, g: .18, c: pick(colors), life: 1, decay: 0, w: 3 });
      Sound.ctx && Sound.noise(Sound.ctx.currentTime, .4, { vol: .05, type: 'bandpass', freq: 3000, sweep: 800 });
    }, 380);
  }
  function drawFx() {
    f.clearRect(0, 0, W, H); f.lineCap = 'round';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.k === 'c') { p.vx *= .99; p.r += p.vr; f.save(); f.globalAlpha = Math.max(0, p.life); f.translate(p.x, p.y); f.rotate(p.r); const sh = Math.abs(Math.cos(p.r * 2)); f.fillStyle = p.c; f.fillRect(-p.w / 2, -p.h / 2 * sh, p.w, p.h * sh); f.restore(); }
      else if (p.k === 'ring') { if (p.delay > 0) { p.delay--; p.life += p.decay; continue; } p.r += (p.max - p.r) * .07; f.globalAlpha = Math.max(0, p.life); f.strokeStyle = p.c; f.lineWidth = 10 * p.life + 1; f.beginPath(); f.arc(p.x, p.y, p.r, 0, 7); f.stroke(); f.globalAlpha = 1; }
      else if (p.k === 'r') { f.strokeStyle = p.c; f.lineWidth = 4; f.beginPath(); f.moveTo(p.x - p.vx * 5, p.y - p.vy * 5); f.lineTo(p.x, p.y); f.stroke(); if (p.vy >= -1) { burst(p.x, p.y, p.c); Sound.ctx && Sound.noise(Sound.ctx.currentTime, .6, { vol: .18, type: 'lowpass', freq: 900 }); p.life = 0; } }
      else { p.vx *= .97; p.vy *= .97; f.globalAlpha = Math.max(0, p.life); f.strokeStyle = p.c; f.lineWidth = p.w; f.beginPath(); f.moveTo(p.x - p.vx * 4, p.y - p.vy * 4); f.lineTo(p.x, p.y); f.stroke(); f.globalAlpha = 1; }
      if (p.life <= 0 || p.y > H + 40) parts.splice(i, 1);
    }
  }
  function loop() { drawBg(); if (parts.length || rockets) drawFx(); else f.clearRect(0, 0, W, H); Roll.draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  function rings(color = '#141a3d', n = 3) { if (REDUCED) return; for (let i = 0; i < n; i++) parts.push({ k: 'ring', x: W / 2, y: H * .45, vx: 0, vy: 0, g: 0, r: 10, max: Math.hypot(W, H) * .6, c: color, life: 1, decay: .018, delay: i * 7 }); }
  function overlay(cls, html, c, ms) { const el = document.createElement('div'); el.className = cls; if (c) el.style.setProperty('--c', c); el.innerHTML = html; document.body.appendChild(el); setTimeout(() => el.remove(), ms); }
  return {
    confetti, fireworks, rings,
    flash(color, ms = 1600) { flashC = color; flashT = now(); flashDur = ms; },
    stamp(text, c) { $$('.stamp').forEach((e) => e.remove()); overlay('stamp', esc(text), c, 1300); },
    banner(text, c) { overlay('banner', `<span>${esc(text)}</span>`, c, 1200); },
  };
})();

/* Wischübergang in den Showfarben */
let busyUntil = 0;
function wipe(cb) {
  if (REDUCED) { busyUntil = now() + 300; cb?.(); return; }
  const el = document.createElement('div'); el.className = 'wipe'; el.innerHTML = '<i></i><i></i><i></i><b>GR</b>'; document.body.appendChild(el);
  Sound.play('whoosh'); busyUntil = now() + 750; setTimeout(() => cb?.(), 380); setTimeout(() => el.remove(), 1000);
}
