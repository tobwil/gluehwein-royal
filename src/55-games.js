/* ================= Spiele (jede*r für sich) =================
   Jedes Spiel: init · viewHost (Beamer) · viewFor(pid) (Handy) · answer(pid, v) · timeout · act/key (Moderation). */
const LET = 'ABCD';
const speedPts = (left, total) => round10(500 + 500 * clamp(left / total, 0, 1));
const allIn = (ids) => { const on = ids.filter((id) => isOnline(P(id))); return on.length > 0 && on.every((id) => R.ans[id]); };
const timeView = () => ({ left: T.left(), total: R.t?.total || 1 });
const nextBtn = (last, label) => `<div class="row"><button class="btn big wide" data-act="next" data-primary>${last ? 'Zum Zwischenstand' : label} <kbd>Enter</kbd></button></div>`;
const revealBtn = () => '<div class="row"><button class="btn ghost" data-act="reveal">Jetzt auflösen</button></div>';

/* ---------- Multiple Choice: Quiz, Insider, Emoji, Melodie, Finalfrage ---------- */
const MC = {
  setup(q, time, extra = {}) {
    const order = shuffle([0, 1, 2, 3]);
    R.qid = uid(6); R.q = { text: q.q, opts: order.map((i) => q.a[i]), correct: order.indexOf(0), ...extra };
    R.ans = {}; R.res = {}; R.phase = 'ask'; R.elig = onlineIds(); R.qtotal = time * 1000; R.fastest = null; T.start(time);
    if (!extra.silent) say(q.q);
  },
  answer(pid, v) { v = +v; if (R.phase !== 'ask' || R.ans[pid] || !(v >= 0 && v < 4)) return false; R.ans[pid] = { v, left: T.left() }; Sound.play('tick'); return true; },
  reveal(then) {
    if (R.phase !== 'ask') return; T.stop(); R.phase = 'drum'; render(); Sound.play('drumroll'); Sound.duck(true);
    const r = R, qid = R.qid; setTimeout(() => { if (R !== r || R.qid !== qid || R.phase !== 'drum') return; Sound.duck(false); R.phase = 'reveal'; then(); render(); }, 1650);
  },
  score() {
    const c = R.q.correct; let n = 0;
    for (const pid of S.order) {
      const a = R.ans[pid], p = P(pid);
      if (a && a.v === c) {
        n++; p.streak = (p.streak || 0) + 1; let pts = speedPts(a.left, R.qtotal); if (p.streak >= 3) pts += 100;
        R.res[pid] = { ok: true, pts: award(pid, pts), text: p.streak >= 3 ? `Serie ×${p.streak}!` : '' };
        if (!R.fastest || a.left > R.ans[R.fastest].left) R.fastest = pid;
      } else { if (R.elig.includes(pid) || a) p.streak = 0; R.res[pid] = { ok: false, pts: 0, text: a ? '' : 'Keine Antwort' }; }
    }
    return n;
  },
  celebrate(n) {
    if (n) { Sound.play('right'); FX.confetti(70); FX.rings('#141a3d'); FX.stamp(n === 1 ? 'Nur eine*r!' : `${n} richtig!`); }
    else { Sound.play('wrong'); FX.stamp('Keiner!', 'var(--berry)'); }
    say(`Richtig ist: ${R.q.opts[R.q.correct]}.`);
  },
  viewHost(label, { top = '', sub = '' } = {}) {
    const q = R.q, rev = R.phase === 'reveal', drum = R.phase === 'drum';
    const counts = [0, 0, 0, 0]; Object.values(R.ans).forEach((a) => counts[a.v]++); const tot = Math.max(1, Object.keys(R.ans).length);
    const opts = q.opts.map((o, i) => `<div class="opt ${rev ? (i === q.correct ? 'right' : 'dim') : ''}"><span class="lt">${LET[i]}</span><span>${esc(o)}</span>${rev ? `<span class="who">${counts[i]}</span><i class="dist" style="width:${(counts[i] / tot) * 100}%"></i>` : ''}</div>`).join('');
    const f = rev && R.fastest && P(R.fastest);
    return `${top}<div class="q-card anim-up"><span class="eyebrow">${label}</span><h2 class="q-text">${esc(q.text)}</h2>${rev ? '' : drum ? '<div class="ring"><b style="animation:pulse .3s infinite alternate">?</b></div>' : ring()}</div>
      ${sub}<div class="opts">${opts}</div>
      ${f ? `<p class="center fastest">Am schnellsten richtig: ${E(f.emoji)} <b>${esc(f.name)}</b> · ${((R.qtotal - R.ans[R.fastest].left) / 1000).toFixed(1).replace('.', ',')} Sek.</p>` : ''}`;
  },
  viewFor(pid, extra = {}) {
    return { kind: 'mc', qid: R.qid, q: R.q.text, opts: R.q.opts, phase: R.phase, picked: R.ans[pid]?.v ?? null, ...timeView(),
      result: R.phase === 'reveal' ? { ...(R.res[pid] || { ok: false, pts: 0 }), correct: R.q.correct } : null, ...extra };
  },
};

const quizGame = (title, icon, tagline, source, time = 20) => ({
  title, icon, tagline,
  rules: ['Frage auf der Leinwand, Antwort auf dem Handy.', 'Richtig gibt bis zu 1000 Punkte – je schneller, desto mehr.', 'Ab drei richtigen Antworten am Stück: 100 Bonus pro Frage.'],
  init() { R.qs = source(); R.qi = 0; MC.setup(R.qs[0], time); },
  viewHost() { return `<section class="screen">${hud()}<div class="stage">${MC.viewHost(`Frage ${R.qi + 1} von ${R.qs.length}`)}${R.phase === 'reveal' ? nextBtn(R.qi === R.qs.length - 1, 'Nächste Frage') : R.phase === 'ask' ? revealBtn() : ''}</div>${hints([['Enter', 'auflösen / weiter']])}</section>`; },
  viewFor(pid) { return MC.viewFor(pid); },
  answer(pid, v) { if (MC.answer(pid, v) && allIn(R.elig)) this.reveal(); },
  reveal() { MC.reveal(() => MC.celebrate(MC.score())); },
  timeout() { if (R.phase === 'ask') { Sound.play('buzz'); this.reveal(); } },
  next() { R.qi++; if (R.qi >= R.qs.length) return endRound(); MC.setup(R.qs[R.qi], time); render(); Sound.play('whoosh'); },
  act(a) { if (a === 'reveal' && R.phase === 'ask') this.reveal(); if (a === 'next' && R.phase === 'reveal') this.next(); },
  key(k) { if (k === 'Enter') { if (R.phase === 'ask') return this.reveal(); if (R.phase === 'reveal') return this.next(); } return false; },
});

// Drei plausible falsche Antworten aus demselben Topf
function distract(pool, item, key = 's') {
  const same = shuffle(pool.filter((x) => x !== item && x.c === item.c)), rest = shuffle(pool.filter((x) => x !== item && x.c !== item.c));
  return [...same, ...rest].slice(0, 3).map((x) => x[key]);
}

/* ---------- Emoji-Express ---------- */
const emojiGame = {
  ...quizGame('Emoji-Express', '🚂', 'Filme, Songs, Sprüche – in Bildchen.', () => [], 25),
  rules: ['Die Emojis erscheinen nach und nach auf der Leinwand und dem Handy.', 'Tippt die richtige Lösung, sobald ihr sie erkennt.', 'Je früher, desto mehr Punkte.'],
  init() { R.items = draw(EMOJI, 'emoji', 5); R.qi = 0; this.setup(); },
  setup() { const it = R.items[R.qi]; R.shown = 1; MC.setup({ q: `Was ist gemeint? (${it.c})`, a: [it.s, ...distract(EMOJI, it)] }, 25, { silent: true }); },
  line(all) { const it = R.items[R.qi]; return it.e.map((e, i) => (i < R.shown || all ? `<span>${e}</span>` : '<span class="ph">❔</span>')).join(' '); },
  viewHost() {
    return `<section class="screen">${hud()}<div class="stage">${MC.viewHost(`Rätsel ${R.qi + 1} von ${R.items.length}`, { sub: `<div class="emoji-line" id="emo">${this.line(R.phase === 'reveal')}</div>` })}
      ${R.phase === 'reveal' ? nextBtn(R.qi === R.items.length - 1, 'Nächstes Rätsel') : R.phase === 'ask' ? revealBtn() : ''}</div>${hints([['Enter', 'auflösen / weiter']])}</section>`;
  },
  viewFor(pid) { return MC.viewFor(pid, { emoji: R.items[R.qi].e.slice(0, R.phase === 'reveal' ? 99 : R.shown) }); },
  frame() {
    if (R.phase !== 'ask' || !R.t) return; const want = Math.min(R.items[R.qi].e.length, 1 + Math.floor((R.t.total - T.left()) / 2400));
    if (want > R.shown) { R.shown = want; Sound.play('click'); const el = $('#emo'); if (el) el.innerHTML = this.line(); scheduleSync(); }
  },
  next() { R.qi++; if (R.qi >= R.items.length) return endRound(); this.setup(); render(); Sound.play('whoosh'); },
};

/* ---------- Die Band spielt … ---------- */
const melodyGame = {
  ...quizGame('Die Band spielt …', '🎹', 'Erkennt ihr den Song?', () => [], 30),
  rules: ['Die Hausband spielt eine bekannte Melodie an.', 'Tippt den richtigen Titel auf dem Handy – je früher, desto mehr Punkte.', 'Erkennt keiner was, spielt die Band nochmal. Mit Schlagzeug.'],
  init() { R.items = draw(MELODIES, 'mel', 4); R.qi = 0; this.setup(); },
  setup() { const m = R.items[R.qi]; MC.setup({ q: 'Welcher Song ist das?', a: [m.s, ...distract(MELODIES, m)] }, 30, { silent: true }); R.plays = 0; R.melEnd = 0; Sound.hold(true); this.play(); },
  play() { const { dur } = Sound.playMelody(R.items[R.qi], { drums: R.plays > 0 }); R.plays++; R.melEnd = now() + dur * 1000 + 1400; },
  viewHost() {
    return `<section class="screen">${hud()}<div class="stage"><div class="center"><span class="tag">Song ${R.qi + 1} von ${R.items.length} · ${esc(R.items[R.qi].c)}</span></div><canvas class="roll" id="roll" aria-label="Die gespielten Noten"></canvas>
      ${MC.viewHost('Welcher Song ist das?')}${R.phase === 'reveal' ? nextBtn(R.qi === R.items.length - 1, 'Nächster Song') : R.phase === 'ask' ? '<div class="row"><button class="btn ghost" data-act="replay">Nochmal von vorn</button><button class="btn ghost" data-act="reveal">Jetzt auflösen</button></div>' : ''}</div>${hints([['R', 'nochmal'], ['Enter', 'auflösen / weiter']])}</section>`;
  },
  frame() { if (R.phase === 'ask' && now() > R.melEnd) this.play(); },
  reveal() { Sound.stopMelody(); MC.reveal(() => { MC.celebrate(MC.score()); const r = R, m = R.items[R.qi]; setTimeout(() => { if (R === r && R.phase === 'reveal' && R.items[R.qi] === m) Sound.playMelody(m, { drums: true }); }, 900); }); },
  next() { Sound.stopMelody(); R.qi++; if (R.qi >= R.items.length) { Sound.hold(false); return endRound(); } this.setup(); render(); },
  act(a) { if (a === 'replay' && R.phase === 'ask') this.play(); if (a === 'reveal' && R.phase === 'ask') this.reveal(); if (a === 'next' && R.phase === 'reveal') this.next(); },
  key(k) { if (k === 'r' && R.phase === 'ask') return this.play(); if (k === 'Enter') { if (R.phase === 'ask') return this.reveal(); if (R.phase === 'reveal') return this.next(); } return false; },
};

/* ---------- Schätzduell (Punktewolke) ---------- */
const estimateGame = {
  title: 'Schätzduell', icon: '📏', tagline: 'Keiner weiß es. Alle tun so.',
  rules: ['Alle tippen eine Zahl ins Handy.', 'Die drei Nächsten bekommen 600, 400 und 200 Punkte.', 'Volltreffer (höchstens 2 % daneben, bei Jahreszahlen exakt): 300 Bonus.'],
  init() { R.qs = draw(ESTIMATE, 'est', 3); R.qi = 0; this.setup(); },
  setup() { R.qid = uid(6); R.ans = {}; R.res = {}; R.phase = 'ask'; R.elig = onlineIds(); T.start(30); say(R.qs[R.qi].q); },
  answer(pid, v) { const n = +v; if (R.phase !== 'ask' || R.ans[pid] || !isFinite(n) || n < 0 || n > 1e12) return; R.ans[pid] = { v: n }; Sound.play('tick'); if (allIn(R.elig)) this.reveal(); },
  reveal() {
    if (R.phase !== 'ask') return; const q = R.qs[R.qi]; T.stop(); R.phase = 'drum'; render(); Sound.play('drumroll'); Sound.duck(true);
    const r = R, qid = R.qid; setTimeout(() => {
      if (R !== r || R.qid !== qid) return; Sound.duck(false);
      const rows = Object.entries(R.ans).map(([pid, a]) => ({ pid, v: a.v, d: Math.abs(a.v - q.v) })).sort((a, b) => a.d - b.d);
      const diffs = [...new Set(rows.map((x) => x.d))]; const PTS = [600, 400, 200];
      rows.forEach((x) => {
        const place = diffs.indexOf(x.d); const hit = q.year ? x.d === 0 : x.d / q.v <= .02;
        const pts = (place < 3 ? PTS[place] : 0) + (hit ? 300 : 0); const got = pts ? award(x.pid, pts) : 0;
        R.res[x.pid] = { ok: place < 3 || hit, pts: got, text: q.year ? `${fmt(x.d)} Jahre daneben` : `${fmt(Math.round((x.d / q.v) * 1000) / 10)} % daneben`, place: place + 1, hit };
      });
      R.rows = rows.map((x) => ({ ...x, place: diffs.indexOf(x.d) + 1 })); R.phase = 'reveal'; render();
      if (rows.length) { Sound.play('right'); FX.rings(); FX.confetti(rows.some((x) => R.res[x.pid].hit) ? 200 : 70); if (rows.some((x) => R.res[x.pid].hit)) FX.stamp('Volltreffer!', 'var(--berry)'); } else Sound.play('wrong');
      say(`Die richtige Antwort: ${fmt(q.v)} ${q.year ? '' : q.unit}.`);
    }, 1650);
  },
  viewHost() {
    const q = R.qs[R.qi]; let body = '';
    if (R.phase === 'ask') body = `<p class="center big-count"><b class="d">${Object.keys(R.ans).length}</b> Schätzungen</p>${revealBtn()}`;
    else {
      const vals = [...Object.values(R.ans).map((a) => a.v), ...(R.phase === 'reveal' ? [q.v] : [])]; if (!vals.length) vals.push(q.v);
      let lo = Math.min(...vals), hi = Math.max(...vals); const useLog = lo > 0 && hi / lo > 25; const tr = (v) => (useLog ? Math.log10(Math.max(v, lo)) : v);
      let a = tr(lo), b = tr(hi); if (a === b) { a -= 1; b += 1; } const pad = (b - a) * .08; a -= pad; b += pad; const x = (v) => clamp(((tr(v) - a) / (b - a)) * 100, 0, 100);
      const dots = Object.entries(R.ans).map(([pid, an], i) => { const place = R.res[pid]?.place; const top = R.phase === 'reveal' && place <= 3;
        return `<span class="dot ${top ? 'top' : ''}" style="--x:${x(an.v)}%;--y:${(i * 37) % 60}px">${top ? `<span class="lab">${place}. ${esc(P(pid)?.name || '')} · ${fmt(an.v)}</span>` : ''}</span>`; }).join('');
      body = `<div class="cloud"><div class="axis"></div>${dots}${R.phase === 'reveal' ? `<div class="marker truth" style="--x:${x(q.v)}%"><span class="lab">${fmt(q.v)} ${esc(q.year ? '' : q.unit)}</span><span class="pin"></span></div>` : ''}</div>
        ${R.phase === 'reveal' ? nextBtn(R.qi === R.qs.length - 1, 'Nächste Frage') : '<p class="center muted">Trommelwirbel …</p>'}`;
    }
    return `<section class="screen">${hud()}<div class="stage"><div class="q-card anim-up"><span class="eyebrow">Frage ${R.qi + 1} von ${R.qs.length} · Antwort in ${esc(q.unit)}</span><h2 class="q-text">${esc(q.q)}</h2>${R.phase === 'ask' ? ring() : ''}</div>${body}</div>${hints([['Enter', 'auflösen / weiter']])}</section>`;
  },
  viewFor(pid) { const q = R.qs[R.qi]; return { kind: 'number', qid: R.qid, q: q.q, unit: q.unit, phase: R.phase, picked: R.ans[pid]?.v ?? null, ...timeView(), result: R.phase === 'reveal' ? { ...(R.res[pid] || { ok: false, pts: 0, text: 'Keine Schätzung' }), truth: `${fmt(q.v)} ${q.year ? '' : q.unit}` } : null }; },
  timeout() { if (R.phase === 'ask') { Sound.play('buzz'); this.reveal(); } },
  next() { R.qi++; if (R.qi >= R.qs.length) return endRound(); this.setup(); render(); Sound.play('whoosh'); },
  act(a) { if (a === 'reveal' && R.phase === 'ask') this.reveal(); if (a === 'next' && R.phase === 'reveal') this.next(); },
  key(k) { if (k === 'Enter') { if (R.phase === 'ask') return this.reveal(); if (R.phase === 'reveal') return this.next(); } return false; },
};

/* ---------- Früher oder später? (Ausscheidung) ---------- */
const timelineGame = {
  title: 'Früher oder später?', icon: '⏳', tagline: 'Wer falsch liegt, fliegt.',
  rules: ['Ein Ereignis mit Jahreszahl ist bekannt. Passierte das nächste früher oder später?', 'Alle tippen am Handy. Wer falsch liegt, scheidet aus, jede richtige Karte bringt 100 Punkte.', 'Wer am Ende noch steht, bekommt 300 Bonus. Die letzte Person allein: 500.'],
  init() {
    const deck = draw(TIMELINE, 'tl', 10);
    for (let i = 1; i < deck.length - 1; i++) if (deck[i][1] === deck[i - 1][1]) [deck[i], deck[i + 1]] = [deck[i + 1], deck[i]];
    Object.assign(R, { deck, ci: 1, alive: onlineIds(), outNow: [] }); this.setup();
  },
  eligible() { return R.alive; },
  setup() { R.qid = uid(6); R.ans = {}; R.res = {}; R.phase = 'ask'; R.outNow = []; T.start(12); say(`${R.deck[R.ci][0]}. Früher oder später?`); },
  answer(pid, v) { if (R.phase !== 'ask' || !R.alive.includes(pid) || R.ans[pid] || !['early', 'late'].includes(v)) return; R.ans[pid] = { v }; Sound.play('tick'); if (allIn(R.alive)) this.reveal(); },
  reveal() {
    if (R.phase !== 'ask') return; T.stop();
    const a = R.deck[R.ci - 1][1], c = R.deck[R.ci][1];
    const ok = (v) => (v === 'early' ? c <= a : c >= a);
    const right = R.alive.filter((id) => R.ans[id] && ok(R.ans[id].v)), wrong = R.alive.filter((id) => !right.includes(id));
    R.allWrong = right.length === 0;
    if (!R.allWrong) { R.outNow = wrong; R.alive = right; right.forEach((id) => (R.res[id] = { ok: true, pts: award(id, 100) })); wrong.forEach((id) => (R.res[id] = { ok: false, pts: 0, text: 'Ausgeschieden' })); }
    else R.alive.forEach((id) => (R.res[id] = { ok: false, pts: 0, text: 'Alle daneben – alle bleiben drin!' }));
    R.phase = 'reveal'; render();
    if (R.allWrong) { Sound.play('wrong'); FX.stamp('Alle daneben!', 'var(--berry)'); } else { Sound.play(wrong.length ? 'wrong' : 'right'); FX.stamp(wrong.length ? `${wrong.length} raus!` : 'Alle richtig!', wrong.length ? 'var(--berry)' : null); }
  },
  finish() {
    const solo = R.alive.length === 1; R.alive.forEach((id) => award(id, solo ? 500 : 300)); FX.confetti(160); FX.rings('#c8155f', 4);
    endRound(R.alive.length ? (solo ? `${P(R.alive[0])?.name} bleibt als Letzte*r stehen!` : `${R.alive.length} Leute überleben den Zeitstrahl!`) : 'Niemand hat überlebt.');
  },
  next() { if (R.alive.length <= 1 || R.ci + 1 >= R.deck.length) return this.finish(); R.ci++; this.setup(); render(); Sound.play('whoosh'); },
  viewHost() {
    const k = R.deck[R.ci - 1], c = R.deck[R.ci], rev = R.phase === 'reveal';
    const chips = (ids, cls) => ids.slice(0, 14).map((id) => `<span class="pchip ${cls}">${E(P(id)?.emoji)} ${esc(P(id)?.name)}</span>`).join('') + (ids.length > 14 ? `<span class="pchip">+${ids.length - 14}</span>` : '');
    return `<section class="screen">${hud()}<div class="stage">
      <div class="tl-cards"><div class="tl-card"><span class="eyebrow">Bekannt</span><div class="ev">${esc(k[0])}</div><div class="yr">${k[1]}</div></div><div class="vs">vs</div>
        <div class="tl-card new"><span class="eyebrow">Früher oder später?</span><div class="ev">${esc(c[0])}</div><div class="yr ${rev ? '' : 'q'}">${rev ? c[1] : '????'}</div></div></div>
      <div class="potbar"><span>Noch im Spiel</span><span class="pot">${R.alive.length}</span>${R.phase === 'ask' ? ring() : ''}</div>
      ${rev && R.outNow.length ? `<div class="chips out">${chips(R.outNow, 'off')}</div>` : ''}${rev && R.alive.length <= 14 ? `<div class="chips">${chips(R.alive, '')}</div>` : ''}
      ${rev ? `<div class="row"><button class="btn big wide" data-act="next" data-primary>${R.alive.length <= 1 || R.ci + 1 >= R.deck.length ? 'Zum Zwischenstand' : 'Nächste Karte'} <kbd>Enter</kbd></button></div>` : revealBtn()}
    </div>${hints([['Enter', 'auflösen / weiter']])}</section>`;
  },
  viewFor(pid) {
    const k = R.deck[R.ci - 1], c = R.deck[R.ci];
    return { kind: 'duo', qid: R.qid, ref: `${k[0]}: ${k[1]}`, q: c[0], phase: R.phase, picked: R.ans[pid]?.v ?? null, out: !R.alive.includes(pid) && !R.outNow.includes(pid), ...timeView(),
      result: R.phase === 'reveal' && R.res[pid] ? { ...R.res[pid], truth: String(c[1]) } : null };
  },
  timeout() { if (R.phase === 'ask') { Sound.play('buzz'); this.reveal(); } },
  act(a) { if (a === 'reveal' && R.phase === 'ask') this.reveal(); if (a === 'next' && R.phase === 'reveal') this.next(); },
  key(k) { if (k === 'Enter') { if (R.phase === 'ask') return this.reveal(); if (R.phase === 'reveal') return this.next(); } return false; },
};

/* ---------- Rücken zur Leinwand (Spotlight) ---------- */
const spotlightGame = {
  title: 'Rücken zur Leinwand', icon: '🪑', tagline: 'Eine Person rät. Der ganze Saal erklärt.',
  rules: ['Die Slotmaschine lost eine Person aus. Sie setzt sich mit dem Rücken zur Leinwand.', 'Alle anderen erklären die Begriffe – das Wort steht auch auf ihren Handys.', '45 Sekunden. Jeder erratene Begriff bringt der Person auf dem Stuhl 100 Punkte.'],
  init() { R.turn = 0; R.done = []; R.phase = 'pick'; R.turns = Math.min(2, Math.max(1, S.order.length)); },
  pick() {
    if (R.phase !== 'pick') return; let cand = onlineIds().filter((id) => !R.done.includes(id)); if (!cand.length) cand = onlineIds(); if (!cand.length) cand = S.order.slice();
    R.who = pick(cand); R.done.push(R.who); R.phase = 'spin'; render();
    const reel = $('#reel'); if (reel) { const n = reel.children.length, h = reel.children[0].offsetHeight; requestAnimationFrame(() => (reel.style.transform = `translateY(-${(n - 1) * h}px)`)); }
    let t = 0; const iv = setInterval(() => { Sound.play('click'); if (++t > 26) clearInterval(iv); }, 110);
    const r = R; setTimeout(() => { clearInterval(iv); if (R !== r) return; R.phase = 'ready'; render(); Sound.play('fanfare'); FX.rings('#c8155f'); say(`${P(R.who)?.name}, setz dich mit dem Rücken zur Leinwand!`); }, 3300);
  },
  start() { R.words = draw(WORDS, 'words', 30); R.wi = 0; R.log = []; R.phase = 'run'; T.start(45); Sound.play('whoosh'); render(); },
  hit(ok) { if (R.phase !== 'run') return; R.log.push({ w: R.words[R.wi], ok }); if (ok) { award(R.who, 100); Sound.play('coin'); } else Sound.play('click'); R.wi = (R.wi + 1) % R.words.length; render(); },
  timeout() { if (R.phase === 'run') { R.phase = 'done'; T.stop(); Sound.play('buzz'); render(); if (R.log.some((l) => l.ok)) FX.confetti(80); } },
  next() { if (R.turn + 1 < R.turns) { R.turn++; R.phase = 'pick'; render(); } else endRound(); },
  viewHost() {
    const p = P(R.who); let body;
    if (R.phase === 'pick') body = `<div class="intro-card"><div class="icon">🎰</div><div class="title">${kin(R.turn ? 'Wer ist als Nächstes dran?' : 'Wer muss auf den Stuhl?')}</div><button class="btn big wide" data-act="pick" data-primary>Auslosen <kbd>Enter</kbd></button></div>`;
    else if (R.phase === 'spin') { const names = []; for (let i = 0; i < 5; i++) names.push(...shuffle(S.order)); names.push(R.who); body = `<div class="slot"><div class="reel" id="reel">${names.map((id) => `<div class="it">${E(P(id)?.emoji)} ${esc(P(id)?.name)}</div>`).join('')}</div></div>`; }
    else if (R.phase === 'ready') body = `<div class="intro-card"><div class="icon">🪑</div><div class="title">${kin(p?.name || '')}</div><p class="tagline">Setz dich mit dem Rücken zur Leinwand. Alle anderen: erklären, ohne das Wort zu sagen!</p><button class="btn big wide" data-act="start" data-primary>45 Sekunden starten <kbd>Enter</kbd></button></div>`;
    else if (R.phase === 'run') body = `<p class="center"><span class="tag">${E(p?.emoji)} ${esc(p?.name)} rät</span></p><div class="bigtimer" data-timer data-fmt="mmss">0:45</div><div class="word" aria-live="assertive">${kin(R.words[R.wi])}</div>
      <div class="row"><button class="btn big" style="background:var(--ink);border-color:var(--ink)" data-act="hit">Erraten <kbd>→</kbd></button><button class="btn" data-act="skip">Überspringen <kbd>←</kbd></button></div>
      <div class="tally">${R.log.map((l) => `<span class="${l.ok ? 'y' : 'n'}">${esc(l.w)}</span>`).join('')}</div>`;
    else { const n = R.log.filter((l) => l.ok).length; body = `<div class="intro-card"><div class="icon">⏰</div><div class="title">${kin(`${n} ${n === 1 ? 'Begriff' : 'Begriffe'}!`)}</div><p class="tagline">${esc(p?.name)} holt ${fmt(n * 100 * (R.mult || 1))} Punkte.</p><div class="tally">${R.log.map((l) => `<span class="${l.ok ? 'y' : 'n'}">${esc(l.w)}</span>`).join('')}</div>
      <button class="btn big wide" data-act="next" data-primary>${R.turn + 1 < R.turns ? 'Nächste Person' : 'Zum Zwischenstand'} <kbd>Enter</kbd></button></div>`; }
    return `<section class="screen">${hud()}<div class="stage" style="align-items:center">${body}</div>${hints([['→', 'erraten'], ['←', 'überspringen'], ['Enter', 'weiter']])}</section>`;
  },
  viewFor(pid) {
    const me = pid === R.who, name = P(R.who)?.name || '';
    if (R.phase === 'pick' || R.phase === 'spin') return { kind: 'wait', title: 'Die Slotmaschine dreht …', text: 'Wer muss auf den Stuhl?' };
    if (R.phase === 'ready') return me ? { kind: 'wait', title: 'Du bist dran!', text: 'Setz dich mit dem Rücken zur Leinwand – und nicht aufs Handy schauen.', hot: true } : { kind: 'wait', title: `${name} ist dran`, text: 'Gleich steht das Wort hier. Erklären, ohne es zu sagen!' };
    if (R.phase === 'run') return me ? { kind: 'wait', title: 'Hör gut zu!', text: 'Ruf laut, was du errätst.', hot: true } : { kind: 'spot', word: R.words[R.wi], who: name, ...timeView() };
    return { kind: 'wait', title: `${R.log.filter((l) => l.ok).length} Begriffe`, text: `${name} hat geraten.` };
  },
  act(a) { if (a === 'pick') this.pick(); if (a === 'start' && R.phase === 'ready') this.start(); if (a === 'hit') this.hit(true); if (a === 'skip') this.hit(false); if (a === 'next' && R.phase === 'done') this.next(); },
  key(k) {
    if (R.phase === 'run') { if (k === 'ArrowRight' || k === 'Enter') return this.hit(true); if (k === 'ArrowLeft' || k === ' ') return this.hit(false); }
    if (k === 'Enter') { if (R.phase === 'pick') return this.pick(); if (R.phase === 'ready') return this.start(); if (R.phase === 'done') return this.next(); }
    return false;
  },
};

/* ---------- Wer würde am ehesten …? (anonym) ---------- */
const whoGame = {
  title: 'Wer würde am ehesten …?', icon: '🕵️', tagline: 'Anonym. Ehrlich. Harmlos.',
  rules: ['Alle stimmen am Handy für eine Person aus der Runde.', 'Wer für die Person mit den meisten Stimmen gestimmt hat, bekommt 300 Punkte.', 'Niemand sieht, wer wen gewählt hat – nur das Ergebnis.'],
  init() { R.qs = draw(WHO, 'who', 3); R.qi = 0; this.setup(); },
  setup() { R.qid = uid(6); R.ans = {}; R.res = {}; R.phase = 'ask'; R.elig = onlineIds(); T.start(25); say(`Wer würde am ehesten ${R.qs[R.qi]}`); },
  answer(pid, v) { if (R.phase !== 'ask' || R.ans[pid] || !P(v)) return; R.ans[pid] = { v }; Sound.play('tick'); if (allIn(R.elig)) this.reveal(); },
  reveal() {
    if (R.phase !== 'ask') return; T.stop(); R.phase = 'drum'; render(); Sound.play('drumroll');
    const r = R, qid = R.qid; setTimeout(() => {
      if (R !== r || R.qid !== qid) return; const cnt = {}; Object.values(R.ans).forEach((a) => (cnt[a.v] = (cnt[a.v] || 0) + 1));
      const max = Math.max(0, ...Object.values(cnt)); R.tops = Object.keys(cnt).filter((k) => cnt[k] === max); R.max = max; R.n = Object.keys(R.ans).length;
      let right = 0; Object.entries(R.ans).forEach(([pid, a]) => { const ok = R.tops.includes(a.v); if (ok) right++; R.res[pid] = { ok, pts: ok ? award(pid, 300) : 0, text: ok ? 'Mit der Mehrheit!' : 'Andere Meinung' }; });
      R.right = right; R.phase = 'reveal'; render(); if (max) { Sound.play('tusch'); FX.rings('#c8155f'); FX.confetti(90); }
      if (R.tops.length) say(`Die meisten Stimmen: ${R.tops.map((id) => P(id)?.name).join(' und ')}!`);
    }, 1650);
  },
  viewHost() {
    const q = R.qs[R.qi]; let body;
    if (R.phase === 'reveal') body = R.max ? `<div class="who-top">${R.tops.map((id) => `<div>${E(P(id)?.emoji)}<b class="d">${kin(P(id)?.name || '')}</b></div>`).join('')}<p class="tagline">${R.max} von ${R.n} Stimmen · ${R.right} lagen mit der Mehrheit</p></div>${nextBtn(R.qi === R.qs.length - 1, 'Nächste Frage')}` : `<p class="center tagline">Keine Stimmen abgegeben.</p>${nextBtn(R.qi === R.qs.length - 1, 'Nächste Frage')}`;
    else body = `<p class="center big-count"><b class="d">${Object.keys(R.ans).length}</b> Stimmen</p>${R.phase === 'ask' ? revealBtn() : '<p class="center muted">Trommelwirbel …</p>'}`;
    return `<section class="screen">${hud()}<div class="stage"><div class="q-card anim-up"><span class="eyebrow">Frage ${R.qi + 1} von ${R.qs.length}</span><h2 class="q-text">Wer würde am ehesten ${esc(q)}</h2>${R.phase === 'ask' ? ring() : ''}</div>${body}</div>${hints([['Enter', 'auflösen / weiter']])}</section>`;
  },
  viewFor(pid) {
    return { kind: 'vote', qid: R.qid, q: `Wer würde am ehesten ${R.qs[R.qi]}`, phase: R.phase, picked: R.ans[pid]?.v ?? null, ...timeView(),
      people: plist().map((p) => ({ pid: p.pid, name: p.name, emoji: p.emoji })).sort((a, b) => a.name.localeCompare(b.name, 'de')),
      result: R.phase === 'reveal' ? { ...(R.res[pid] || { ok: false, pts: 0, text: 'Keine Stimme' }), truth: R.tops.map((id) => P(id)?.name).join(', ') } : null };
  },
  timeout() { if (R.phase === 'ask') { Sound.play('buzz'); this.reveal(); } },
  next() { R.qi++; if (R.qi >= R.qs.length) return endRound(); this.setup(); render(); Sound.play('whoosh'); },
  act(a) { if (a === 'reveal' && R.phase === 'ask') this.reveal(); if (a === 'next' && R.phase === 'reveal') this.next(); },
  key(k) { if (k === 'Enter') { if (R.phase === 'ask') return this.reveal(); if (R.phase === 'reveal') return this.next(); } return false; },
};

/* ---------- Finale: Glücksrad + Einsatz + letzte Frage ---------- */
const SEGS = [{ l: '×2', m: 2 }, { l: '×1', m: 1 }, { l: 'Netz', m: 1, safe: true }, { l: '×3', m: 3 }, { l: '×1', m: 1 }, { l: '×2', m: 2 }, { l: 'Netz', m: 1, safe: true }, { l: '×1', m: 1 }];
const SEG_COL = ['#141a3d', '#ffffff', '#c8155f', '#ffffff', '#141a3d', '#ffffff', '#c8155f', '#ffffff'];
const segText = (s) => (s.safe ? 'Sicherheitsnetz: Verlieren unmöglich!' : s.m === 1 ? 'Einfacher Einsatz – alles oder nichts!' : `${s.l}: Gewinne zählen ${s.m === 2 ? 'doppelt' : 'dreifach'}!`);
const finaleGame = {
  title: 'Das große Finale', icon: '🎡', tagline: 'Einsatz. Glücksrad. Eine Frage.',
  rules: ['Das Glücksrad bestimmt den Multiplikator. „Netz“ heißt: Niemand kann verlieren.', 'Alle setzen am Handy Punkte. Wer wenig hat, bekommt bis zu 100 Punkte Kredit.', 'Letzte Frage: Richtig gibt Einsatz × Multiplikator dazu. Falsch: Der Einsatz ist weg.'],
  init() { R.phase = 'wheel'; R.rot = 0; R.seg = null; R.bets = {}; R.ans = {}; },
  maxBet(pid) { return Math.max(100, P(pid)?.score || 0); },
  drawWheel() {
    const c = $('#wheel'); if (!c) return; const g = c.getContext('2d'); const W = c.width, r = W / 2 - 14, n = SEGS.length, seg = (Math.PI * 2) / n;
    g.clearRect(0, 0, W, W); g.save(); g.translate(W / 2, W / 2);
    g.beginPath(); g.arc(0, 0, r + 10, 0, 7); g.fillStyle = '#141a3d'; g.fill();
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + R.rot + i * seg; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a0, a0 + seg); g.closePath(); g.fillStyle = SEG_COL[i]; g.fill(); g.strokeStyle = '#141a3d'; g.lineWidth = 6; g.stroke();
      g.save(); g.rotate(a0 + seg / 2); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = SEG_COL[i] === '#ffffff' ? '#141a3d' : '#ffffff';
      g.font = `extra-condensed 900 ${SEGS[i].safe ? 64 : 92}px Archivo, 'Arial Narrow', sans-serif`; g.fillText(SEGS[i].safe ? 'NETZ' : SEGS[i].l, r - 30, 6); g.restore();
    }
    for (let i = 0; i < n * 2; i++) { const a = R.rot + (i / (n * 2)) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * (r + 1), Math.sin(a) * (r + 1), 7, 0, 7); g.fillStyle = (i + Math.floor(now() / 250)) % 2 ? '#ffffff' : '#c8155f'; g.fill(); }
    g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#141a3d'; g.stroke();
    g.font = 'extra-condensed 900 54px Archivo, sans-serif'; g.fillStyle = '#141a3d'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GR', 0, 4); g.restore();
  },
  frame() { if (['wheel', 'spinning', 'landed'].includes(R.phase)) this.drawWheel(); },
  spin() {
    if (R.phase !== 'wheel') return; R.phase = 'spinning'; render(); Sound.play('whoosh');
    const n = SEGS.length, seg = (Math.PI * 2) / n, target = Math.floor(Math.random() * n), start = R.rot; let end = -(target + .5) * seg + (Math.random() - .5) * seg * .6; while (end < start + Math.PI * 12) end += Math.PI * 2;
    const t0 = performance.now(), dur = 5200, r = R; let last = null;
    const step = (ts) => {
      if (R !== r) return; const k = Math.min(1, (ts - t0) / dur); R.rot = start + (end - start) * (1 - Math.pow(1 - k, 4));
      const idx = Math.floor(R.rot / seg); if (idx !== last) { last = idx; Sound.play('click'); }
      if (k < 1) requestAnimationFrame(step); else { R.seg = target; R.phase = 'landed'; render(); Sound.play('fanfare'); FX.confetti(100); FX.rings('#c8155f'); say(segText(SEGS[target])); }
    };
    requestAnimationFrame(step);
  },
  toBets() { R.phase = 'bet'; R.qid = uid(6); R.ans = {}; R.elig = onlineIds(); T.start(25); render(); say('Wie viel setzt ihr? Tippt euren Einsatz ins Handy.'); },
  startQ() { if (R.phase !== 'bet') return; T.stop(); R.bets = Object.fromEntries(Object.entries(R.ans).map(([k, a]) => [k, a.v])); MC.setup(draw(QUIZ, 'quiz', 1)[0], 25); render(); Sound.play('whoosh'); },
  answer(pid, v) {
    if (R.phase === 'bet') { if (R.ans[pid]) return; R.ans[pid] = { v: clamp(round10(+v || 0), 0, this.maxBet(pid)) }; Sound.play('coin'); if (allIn(R.elig)) this.startQ(); return; }
    if (MC.answer(pid, v) && allIn(R.elig)) this.reveal();
  },
  reveal() {
    MC.reveal(() => {
      const s = SEGS[R.seg], c = R.q.correct; let n = 0;
      S.order.forEach((pid) => { const bet = R.bets[pid] || 0, ok = R.ans[pid]?.v === c, amt = bet * s.m; if (ok) n++;
        const d = ok ? award(pid, amt, { raw: true }) : !s.safe && bet ? award(pid, -bet, { raw: true }) : 0; R.res[pid] = { ok, pts: d, text: bet ? `Einsatz ${fmt(bet)} ${s.safe ? '(Netz)' : s.l}` : 'Kein Einsatz' }; });
      MC.celebrate(n);
    });
  },
  timeout() { if (R.phase === 'bet') this.startQ(); else if (R.phase === 'ask') { Sound.play('buzz'); this.reveal(); } },
  finish() { S.history.push({ key: 'finale', gains: { ...R.gains }, headline: 'Finale' }); S.ri = S.plan.length; T.stop(); ceremony(); },
  viewHost() {
    let body; const s = R.seg != null ? SEGS[R.seg] : null;
    if (['wheel', 'spinning', 'landed'].includes(R.phase)) body = `<div class="wheel-wrap"><div class="pointer"></div><canvas id="wheel" width="800" height="800" aria-label="Glücksrad"></canvas></div>
      ${R.phase === 'landed' ? `<p class="solution">${kin(segText(s))}</p><div class="row"><button class="btn big wide" data-act="to-bets" data-primary>Einsätze machen <kbd>Enter</kbd></button></div>` : `<div class="row"><button class="btn big wide" data-act="spin" data-primary ${R.phase === 'spinning' ? 'disabled' : ''}>Rad drehen <kbd>Enter</kbd></button></div>`}`;
    else if (R.phase === 'bet') body = `<div class="q-card"><span class="eyebrow">${esc(s.safe ? 'Netz' : s.l)}</span><h2 class="q-text">Wie viel setzt ihr? Einsatz jetzt ins Handy tippen.</h2>${ring()}</div><p class="center big-count"><b class="d">${Object.keys(R.ans).length}</b> Einsätze</p><div class="row"><button class="btn ghost" data-act="go-q">Einsätze schließen</button></div>`;
    else body = MC.viewHost(`Finalfrage · ${s.safe ? 'Netz' : s.l}`) + (R.phase === 'reveal' ? '<div class="row"><button class="btn big wide" data-act="finish" data-primary>Zur Siegerehrung <kbd>Enter</kbd></button></div>' : R.phase === 'ask' ? revealBtn() : '');
    return `<section class="screen">${hud()}<div class="stage">${body}</div>${hints([['Enter', 'drehen / weiter']])}</section>`;
  },
  viewFor(pid) {
    const s = R.seg != null ? SEGS[R.seg] : null;
    if (['wheel', 'spinning'].includes(R.phase)) return { kind: 'wait', title: 'Das Glücksrad dreht …', text: 'Gleich wird gesetzt.' };
    if (R.phase === 'landed') return { kind: 'wait', title: s.safe ? 'Netz!' : s.l, text: segText(s) };
    if (R.phase === 'bet') return { kind: 'bet', qid: R.qid, max: this.maxBet(pid), picked: R.ans[pid]?.v ?? null, mult: s.safe ? 'Netz' : s.l, ...timeView() };
    return MC.viewFor(pid, { bet: R.bets[pid] || 0 });
  },
  act(a) { if (a === 'spin') this.spin(); if (a === 'to-bets' && R.phase === 'landed') this.toBets(); if (a === 'go-q') this.startQ(); if (a === 'reveal' && R.phase === 'ask') this.reveal(); if (a === 'finish' && R.phase === 'reveal') this.finish(); },
  key(k) { if (k === 'Enter') { if (R.phase === 'wheel') return this.spin(); if (R.phase === 'landed') return this.toBets(); if (R.phase === 'bet') return this.startQ(); if (R.phase === 'ask') return this.reveal(); if (R.phase === 'reveal') return this.finish(); } return false; },
};

const GAMES = {
  quiz: quizGame('Fangfragen', '🪤', 'Klingt leicht. Ist es nicht.', () => draw(QUIZ, 'quiz', 4)),
  insider: quizGame('Insider-Runde', '🕵️', 'Von Claude geschrieben. Über euch.', () => (Array.isArray(S.insider) ? shuffle(S.insider) : draw(QUIZ, 'quiz', 4)), 25),
  estimate: estimateGame, emoji: emojiGame, melody: melodyGame, timeline: timelineGame, spotlight: spotlightGame, who: whoGame, finale: finaleGame,
};
