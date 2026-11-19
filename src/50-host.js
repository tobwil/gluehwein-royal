/* ================= Beamer / Moderation: hält den Spielstand ================= */
const HOST_KEY = 'gluehwein-royale-host-v2';
const DEFAULT = () => ({
  screen: 'title', room: null, players: {}, order: [],
  settings: { length: 'standard', music: true, voice: false },
  plan: [], ri: 0, history: [], used: {}, round: null, nextMult: 1, event: null, choose: null,
  insider: null, aiContext: '', prevRanks: null,
});
let S = DEFAULT();
let R = null;
const PLANS = {
  kurz: ['quiz', 'melody', 'timeline', 'spotlight', 'finale'],
  standard: ['quiz', 'estimate', 'melody', 'who', 'emoji', 'timeline', 'spotlight', 'finale'],
  lang: ['quiz', 'estimate', 'melody', 'who', 'emoji', 'timeline', 'spotlight', 'quiz', 'melody', 'emoji', 'finale'],
};
const PLAN_INFO = { kurz: ['Kurz', '5 Runden · ca. 25 Min.'], standard: ['Standard', '8 Runden · ca. 45 Min.'], lang: ['Lang', '11 Runden · ca. 60 Min.'] };
const save = () => store.set(HOST_KEY, S);
function draw(pool, key, n) {
  const used = (S.used[key] ||= []); let free = pool.map((_, i) => i).filter((i) => !used.includes(i));
  if (free.length < n) { S.used[key] = []; free = pool.map((_, i) => i); }
  const out = shuffle(free).slice(0, n); S.used[key].push(...out); return out.map((i) => pool[i]);
}

/* ---------- Personen ---------- */
const P = (pid) => S.players[pid];
const isOnline = (p) => p && now() - (p.seen || 0) < 15000;
const plist = () => S.order.map(P).filter(Boolean);
const onlineIds = () => S.order.filter((id) => isOnline(P(id)));
function ranked() {
  const arr = plist().slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'de'));
  let r = 0, last = null; arr.forEach((p, i) => { if (p.score !== last) { r = i + 1; last = p.score; } p.rank = r; });
  return arr;
}
const leaderPid = () => { const r = ranked(); return r.length && (r.length === 1 || r[0].score > r[1].score) && r[0].score > 0 ? r[0].pid : null; };
function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
function uniqueName(name, pid) { let n = name || 'Gast', i = 2; while (plist().some((p) => p.pid !== pid && p.name.toLowerCase() === n.toLowerCase())) n = `${name} ${i++}`; return n; }

/* Punkte: Multiplikator der Runde, niemand fällt unter 0 */
function award(pid, pts, { raw = false } = {}) {
  const p = P(pid); if (!p) return 0; const mult = raw ? 1 : (R?.mult || 1);
  const before = p.score; p.score = Math.max(0, before + Math.round(pts * mult)); const d = p.score - before;
  if (R?.gains) R.gains[pid] = (R.gains[pid] || 0) + d;
  return d;
}

/* ---------- Timer (Runde) ---------- */
const T = {
  start(sec) { R.t = { end: now() + sec * 1000, total: sec * 1000, paused: null, fired: false, lastSec: null }; },
  pause() { if (R?.t && R.t.paused == null) R.t.paused = Math.max(0, R.t.end - now()); },
  resume() { if (R?.t && R.t.paused != null) { R.t.end = now() + R.t.paused; R.t.paused = null; } },
  left() { if (!R?.t) return 0; return R.t.paused != null ? R.t.paused : Math.max(0, R.t.end - now()); },
  stop() { if (R) R.t = null; },
};
function ring() { return `<div class="ring" data-ring><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="44"/><circle class="fgc" cx="50" cy="50" r="44" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg><b data-timer>–</b></div>`; }

/* ---------- Sync zu den Handys ---------- */
let syncQueued = false;
function scheduleSync() { if (syncQueued) return; syncQueued = true; setTimeout(() => { syncQueued = false; syncAll(); }, 60); }
function syncAll() { S.order.forEach((pid) => HostNet.send(pid, { t: 'view', v: viewFor(pid) })); }
setInterval(() => { if (S.room) syncAll(); }, 4000);

function viewFor(pid) {
  const p = P(pid); ranked();
  const base = { room: S.room, you: { name: p.name, emoji: p.emoji, score: p.score, rank: p.rank, of: S.order.length, streak: p.streak || 0 } };
  const wait = (title, text) => ({ ...base, kind: 'wait', title, text });
  switch (S.screen) {
    case 'lobby': return wait('Du bist dabei!', 'Gleich geht’s los. Schau auf die Leinwand.');
    case 'intro': { const g = GAMES[S.plan[S.ri]]; return wait(g.title, g.tagline); }
    case 'choose': {
      const c = S.choose; if (c.pid === pid) return { ...base, kind: 'choose', opts: c.opts.map((k) => ({ k, title: GAMES[k].title, tagline: GAMES[k].tagline })), left: Math.max(0, c.until - now()), total: 15000 };
      return wait(`${P(c.pid)?.name || 'Platz 1'} wählt …`, 'Wer vorne liegt, hat das goldene Mikro und sucht die nächste Runde aus.');
    }
    case 'play': return { ...base, ...(GAMES[R.key].viewFor(pid) || { kind: 'wait', title: GAMES[R.key].title, text: 'Schau auf die Leinwand.' }) };
    case 'roundEnd': { const g = S.history.at(-1)?.gains?.[pid] || 0; return wait(`Platz ${p.rank}`, g ? `+${fmt(g)} Punkte in dieser Runde` : 'Diese Runde ohne Punkte. Nächste Runde, neues Glück!'); }
    case 'event': return wait('Glücksmoment!', 'Schau auf die Leinwand.');
    case 'ceremony': return { ...base, kind: 'final', podium: ranked().slice(0, 3).map((x) => ({ name: x.name, emoji: x.emoji, score: x.score })) };
    default: return wait('Glühwein Royale', 'Gleich geht’s los.');
  }
}

/* ---------- Nachrichten von den Handys ---------- */
HostNet.on('msg', (pid, m) => {
  if (!m || typeof m !== 'object') return;
  const p = P(pid);
  if (m.t === 'hello') {
    const name = cleanName(m.name); if (!name) return;
    const emoji = AVATARS.includes(m.emoji) ? m.emoji : pick(AVATARS);
    if (S.kicked?.includes(pid)) { HostNet.send(pid, { t: 'kicked' }); return; }
    if (!p) {
      S.players[pid] = { pid, name: uniqueName(name, pid), emoji, score: 0, streak: 0, seen: now() }; S.order.push(pid);
      Sound.play('coin'); if (S.screen === 'lobby') render(); else toast(`${S.players[pid].name} ist dabei`);
    } else { p.seen = now(); if (S.screen === 'lobby' && (p.name !== name || p.emoji !== emoji)) { p.name = uniqueName(name, pid); p.emoji = emoji; render(); } }
    save(); HostNet.send(pid, { t: 'view', v: viewFor(pid) }); return;
  }
  if (!p) { HostNet.send(pid, { t: 'who' }); return; }
  p.seen = now();
  if (m.t === 'ans' && S.screen === 'play' && R && m.qid === R.qid) { GAMES[R.key].answer?.(pid, m.v); save(); scheduleSync(); updateCount(); }
  if (m.t === 'choose' && S.screen === 'choose' && S.choose?.pid === pid) chooseRound(+m.i);
});
HostNet.on('status', () => { const el = $('#net'); if (el) el.outerHTML = netPill(); });
const netPill = () => `<span id="net" class="net ${HostNet.status}">${{ online: 'Raum offen', connecting: 'Verbinde …', error: 'Verbindungsfehler', offline: 'Offline' }[HostNet.status] || HostNet.status}${useLocal ? ' · Testmodus' : ''}</span>`;

/* ---------- Render ---------- */
const app = $('#app');
function joinUrl() { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('r', S.room); if (useLocal) u.searchParams.set('local', '1'); return u.toString(); }
function render() {
  R = S.round;
  const keep = render.last === S.screen ? app.scrollTop : 0; render.last = S.screen;
  app.innerHTML = S.screen === 'play' ? GAMES[R.key].viewHost() : SCREENS[S.screen]();
  app.scrollTop = keep; document.body.classList.toggle('playing', S.screen === 'play');
  renderTicker(); renderCorner(); updateCount(); if (S.screen !== 'title') save(); scheduleSync();
  if (S.screen === 'lobby') drawQr();
  requestAnimationFrame(() => $$('.board [data-w]').forEach((el) => (el.style.width = el.dataset.w + '%')));
}
function drawQr() {
  const box = $('#qr'); if (!box) return;
  if (typeof qrcode === 'undefined') { box.hidden = true; return; }
  try { const q = qrcode(0, 'M'); q.addData(joinUrl()); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }).replace(/fill="black"|fill="#000000"/g, 'fill="#141a3d"'); } catch { box.hidden = true; }
}
function renderTicker() {
  const el = $('#ticker'); let items;
  if (!S.plan.length || S.screen === 'title' || S.screen === 'lobby') items = ['<b>Glühwein Royale</b>', S.room ? `Mitspielen: Code <b>${esc(S.room)}</b>` : 'Heute live auf eurer Weihnachtsfeier', 'Hausband: <b>Die Glühwürmchen</b>', `${S.order.length} Leute im Raum`];
  else {
    const top = ranked().slice(0, 3); const g = GAMES[S.plan[Math.min(S.ri, S.plan.length - 1)]];
    items = [S.screen === 'ceremony' ? '<b>Siegerehrung</b>' : `Runde ${Math.min(S.ri + 1, S.plan.length)} von ${S.plan.length}: <b>${esc(g.title)}</b>`, ...top.map((p, i) => `${i + 1}. ${E(p.emoji)} ${esc(p.name)} <b>${fmt(p.score)}</b>`), `Code <b>${esc(S.room)}</b>`, 'Hausband: <b>Die Glühwürmchen</b>'];
  }
  const html = `<span class="live">LIVE</span><div class="run">${[0, 1].map(() => items.map((i) => `<span>${i}</span><span class="deco">■</span>`).join('')).join('')}</div>`;
  if (el._h !== html) { el._h = html; el.innerHTML = html; }
}
function hud() {
  const g = GAMES[R.key]; const lead = leaderPid() && P(leaderPid());
  return `<header class="hud2"><div class="hl"><span class="eyebrow">Runde ${S.ri + 1} / ${S.plan.length}${R.mult > 1 ? ' <span class="mult">×2</span>' : ''}</span><b class="d">${esc(g.title)}</b></div>
    <div class="hm"><span class="dots">${S.plan.map((_, i) => `<i class="${i < S.ri ? 'done' : i === S.ri ? 'now' : ''}"></i>`).join('')}</span><span class="cnt" data-cnt></span></div>
    <div class="hr">${lead ? `<span class="mic">Mikro</span>${E(lead.emoji)} <span class="nm">${esc(lead.name)}</span> <b>${fmt(lead.score)}</b>` : '<span class="muted">Noch keine Führung</span>'}</div></header>`;
}
function updateCount() {
  const el = $('[data-cnt]'); if (!el) return;
  const txt = S.screen === 'play' && R?.ans && ['ask', 'bet'].includes(R.phase) ? `${Object.keys(R.ans).length} von ${GAMES[R.key].eligible ? GAMES[R.key].eligible().length : onlineIds().length} haben geantwortet` : `${onlineIds().length} online`;
  if (el.textContent !== txt) el.textContent = txt;
}
function hints(list) { return `<footer class="hints">${list.map(([k, t]) => `<span><kbd>${esc(k)}</kbd> ${esc(t)}</span>`).join('')}</footer>`; }

// Rangliste mit FLIP-Animation: Zeilen gleiten von ihrem alten Platz an den neuen
function board(n = 8, { gains } = {}) {
  const r = ranked(); const prev = S.prevRanks || {}; const max = Math.max(1, r[0]?.score || 1);
  const rows = r.slice(0, n).map((p, i) => {
    const from = prev[p.pid] != null ? Math.min(prev[p.pid], n) - i : 0; const g = gains?.[p.pid] || 0;
    return `<li style="--from:${from}" class="${i === 0 ? 'first' : ''}"><span class="rk">${p.rank}</span>${E(p.emoji)}<span class="nm">${esc(p.name)}</span>${g ? `<span class="gain">+${fmt(g)}</span>` : ''}<span class="sc">${fmt(p.score)}</span><i class="bar" style="width:0" data-w="${(p.score / max) * 100}"></i></li>`;
  }).join('');
  return `<ol class="board">${rows || '<li class="muted">Noch niemand dabei.</li>'}</ol>${r.length > n ? `<p class="muted small center">… und ${r.length - n} weitere</p>` : ''}`;
}
const snapshotRanks = () => { const m = {}; ranked().forEach((p, i) => (m[p.pid] = i)); S.prevRanks = m; };

function renderCorner() {
  const c = $('#corner'); if (S.screen === 'title') { c.innerHTML = ''; return; }
  c.innerHTML = `<button data-act="sfx" data-s="tusch" title="Tusch (T)" aria-label="Tusch"><span class="deco">🎺</span></button><button data-act="sfx" data-s="applause" title="Applaus (A)" aria-label="Applaus"><span class="deco">👏</span></button><button data-act="menu-open" title="Menü" aria-label="Menü">${ICONS.menu}</button>`;
}
function openMenu() {
  $('.sheet')?.remove(); const el = document.createElement('div'); el.className = 'sheet';
  const st = (on) => `<span class="st">${on ? 'An' : 'Aus'}</span>`;
  el.innerHTML = `<div class="menu" role="menu">
    <button data-m="music">Hausband ${st(S.settings.music)}</button>
    ${Voice.available ? `<button data-m="voice">${Voice.label} ${st(S.settings.voice)}</button>` : ''}
    <button data-m="rimshot">Ba-dum-tss <kbd>B</kbd></button><button data-m="drumroll">Trommelwirbel <kbd>W</kbd></button><button data-m="tusch">Tusch <kbd>T</kbd></button>
    ${document.fullscreenEnabled ? '<button data-m="full">Vollbild <kbd>F</kbd></button>' : ''}
    ${S.screen !== 'lobby' ? '<button data-m="lobby">Zurück in die Lobby</button>' : ''}
    <button data-m="quit" class="danger">Show beenden und Raum schließen</button>
  </div>`;
  document.body.appendChild(el); el.querySelector('button')?.focus();
  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) { if (e.target === el) el.remove(); return; }
    Sound.unlock();
    if (m === 'music') { S.settings.music = !S.settings.music; Sound.setMusic(S.settings.music); save(); return openMenu(); }
    if (m === 'voice') { S.settings.voice = !S.settings.voice; if (!S.settings.voice) Voice.hush(); save(); return openMenu(); }
    if (['rimshot', 'drumroll', 'tusch'].includes(m)) { Sound.play(m); return; }
    el.remove();
    if (m === 'full') toggleFull();
    if (m === 'lobby') confirmBox('Laufende Runde abbrechen und zurück in die Lobby? Die Punkte bleiben.', 'Zur Lobby', () => { stopRound(); S.screen = 'lobby'; render(); });
    if (m === 'quit') confirmBox('Show beenden? Alle Punkte und der Raum werden gelöscht.', 'Beenden', () => { stopRound(); store.del(HOST_KEY); location.href = location.pathname + (useLocal ? '?local=1' : ''); });
  });
}
function toggleFull() { try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => toast('Vollbild ist hier nicht möglich.')); } catch { toast('Vollbild ist hier nicht möglich.'); } }
const say = (t) => Voice.say(t, S.settings.voice);
function stopRound() { Voice.hush(); T.stop(); Sound.stopMelody(); Sound.hold(false); S.round = null; R = null; }

/* ---------- Screens ---------- */
const SCREENS = {
  title() {
    const saved = store.get(HOST_KEY); const canResume = saved?.room && saved.order?.length;
    return `<section class="screen center">
      <span class="kicker">Die Weihnachtsfeier-Gameshow · live mit Band</span>
      <div class="slam" aria-label="Glühwein Royale"><span class="w w1">${kin('Glüh')}</span><span class="w w2">${kin('wein', 200)}</span><span class="w w3">${kin('Royale', 420)}</span>
        <svg class="seal" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="sealc" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs><circle cx="60" cy="60" r="58" fill="#ffffff" stroke="#141a3d" stroke-width="3"/><text class="spin"><textPath href="#sealc">JEDE*R FÜR SICH · LIVE MIT BAND · </textPath></text><circle class="core" cx="60" cy="60" r="26"/><text class="star" x="60" y="71" text-anchor="middle">★</text></svg></div>
      <hr class="rule">
      <div class="row" style="width:100%;max-width:640px"><button class="btn big wide" data-act="open" data-primary>Show eröffnen</button>
        ${canResume ? `<button class="btn wide" data-act="resume">Show mit ${saved.order.length} Leuten fortsetzen</button>` : ''}</div>
      <p class="muted small">Dieses Gerät kommt an den Beamer. Alle anderen spielen mit dem eigenen Handy – per QR-Code, ohne App, ohne Anmeldung.</p>
    </section>`;
  },
  lobby() {
    const n = S.order.length; const url = joinUrl(); const tog = (k, t, s) => `<div class="toggle"><div><b>${t}</b><div class="muted small">${s}</div></div><button class="switch" role="switch" aria-checked="${!!S.settings[k]}" data-act="setting" data-k="${k}" aria-label="${t}"></button></div>`;
    let ai = '';
    if (Voice.sample) {
      if (S.insider === 'loading') ai = '<p><span class="spinner"></span> Claude schreibt eure Insider-Fragen …</p>';
      else if (Array.isArray(S.insider)) ai = `<p><b>${S.insider.length} Insider-Fragen sind bereit.</b> Sie kommen vor dem Finale.</p><div class="row"><button class="btn ghost" data-act="ai-gen">Neu schreiben lassen</button><button class="btn ghost" data-act="ai-clear">Entfernen</button></div>`;
      else ai = `<label class="f">Erzählt Claude etwas über euch<textarea class="t" id="ai-ctx" data-input="ai-ctx" placeholder="Zum Beispiel: Wir sind das Marketing-Team in Köln. Die Kaffeemaschine heißt Gisela und ist ständig kaputt.">${esc(S.aiContext)}</textarea></label><div class="row"><button class="btn" data-act="ai-gen">Insider-Runde schreiben lassen</button></div>`;
      ai = `<div class="panel"><h2 class="h">Insider-Runde mit Claude</h2>${ai}</div>`;
    }
    return `<section class="screen lobby">
      <div class="join">
        <div class="qr" id="qr" aria-label="QR-Code zum Mitspielen"></div>
        <div class="join-txt"><span class="kicker">Mitspielen: Handy-Kamera auf den Code</span><b class="code d">${esc(S.room)}</b><span class="url">${esc(url.replace(/^https?:\/\//, ''))}</span>${netPill()}
          <button class="btn ghost small-btn" data-act="copy">Link kopieren</button></div>
      </div>
      <div class="people"><h2 class="h">${n ? `${n} ${n === 1 ? 'Person' : 'Leute'} dabei` : 'Warte auf die ersten Gäste …'}</h2>
        <div class="chips">${plist().map((p) => `<button class="pchip ${isOnline(p) ? '' : 'off'}" data-act="kick" data-pid="${esc(p.pid)}" title="${esc(p.name)} entfernen">${E(p.emoji)} ${esc(p.name)}</button>`).join('')}</div>
        ${n ? '<p class="muted small">Tippe auf einen Namen, um ihn zu entfernen.</p>' : ''}</div>
      <div class="setup-grid">
        <div class="panel"><h2 class="h">Showlänge</h2><div class="seg" role="group" aria-label="Showlänge">${Object.entries(PLAN_INFO).map(([k, [t, s]]) => `<button type="button" data-act="len" data-k="${k}" aria-pressed="${S.settings.length === k}"><b>${t}</b><span class="muted small">${s}</span></button>`).join('')}</div>
          <div>${tog('music', 'Hausband spielt', 'Die Glühwürmchen grooven im Hintergrund')}${Voice.available ? tog('voice', Voice.label, 'Liest Ansagen und Fragen vor') : ''}</div></div>
        ${ai}
      </div>
      <div class="row"><button class="btn big wide" data-act="begin" data-primary ${n ? '' : 'disabled'}>Show starten${n ? ` mit ${n} ${n === 1 ? 'Person' : 'Leuten'}` : ''}</button></div>
    </section>`;
  },
  intro() {
    const g = GAMES[S.plan[S.ri]];
    return `<section class="screen center">
      ${S.nextMult > 1 ? '<span class="sticker">Doppelte Punkte</span>' : ''}
      <div class="intro-card"><span class="round-no">Runde ${S.ri + 1} / ${S.plan.length}</span><div class="icon">${g.icon}</div><div class="title">${kin(g.title, 150)}</div><div class="tagline">${esc(g.tagline)}</div>
        <ul class="rules">${g.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
      <button class="btn big wide" style="max-width:980px" data-act="start-round" data-primary>Los geht’s <kbd>Enter</kbd></button>
    </section>`;
  },
  choose() {
    const c = S.choose; const p = P(c.pid);
    return `<section class="screen center"><div class="intro-card"><span class="round-no">Goldenes Mikro</span><div class="icon">🎤</div><div class="title">${kin(p?.name || 'Platz 1')}</div>
      <p class="tagline">liegt vorne und wählt am Handy die nächste Runde. <span data-choose-left></span></p>
      <div class="opts" style="width:100%">${c.opts.map((k, i) => `<button class="opt" data-act="choose" data-i="${i}"><span class="lt">${i ? 'B' : 'A'}</span><span><b>${esc(GAMES[k].title)}</b><br><span class="muted small">${esc(GAMES[k].tagline)}</span></span></button>`).join('')}</div></div></section>`;
  },
  roundEnd() {
    const h = S.history.at(-1);
    return `<section class="screen center">
      <span class="eyebrow">Zwischenstand nach Runde ${S.ri + 1}</span><h1 class="h">${kin(h.headline)}</h1>
      <div class="board-wrap">${board(8, { gains: h.gains })}</div>
      <p class="quip" id="quip">${esc(S.quip || '')}</p>
      <button class="btn big wide" style="max-width:760px" data-act="after-round" data-primary>Weiter <kbd>Enter</kbd></button>
    </section>`;
  },
  event() {
    const ev = S.event; const items = []; for (let i = 0; i < 4; i++) items.push(...shuffle(EVENTS)); items.push(EVENTS.find((e) => e.k === ev.k));
    return `<section class="screen center"><span class="eyebrow">Zwischen den Runden</span><h1 class="h">${kin('Glücksmoment!')}</h1>
      <div class="slot"><div class="reel" id="reel">${items.map((e) => `<div class="it"><span class="e">${e.e}</span>${esc(e.t)}</div>`).join('')}</div></div>
      <p class="quip" id="ev-desc" style="visibility:${ev.landed ? 'visible' : 'hidden'}">${esc(ev.text || ev.d)}</p>
      <button class="btn big wide" style="max-width:760px" data-act="after-event" id="ev-next" data-primary ${ev.landed ? '' : 'disabled'}>Weiter <kbd>Enter</kbd></button></section>`;
  },
  ceremony() {
    const r = ranked(); const step = S.podiumStep ?? 3; const pod = [r[1], r[0], r[2]];
    const col = (p, place) => p ? `<div class="pod p${place} ${step <= place ? 'shown' : ''}"><div class="who">${step <= place ? `${E(p.emoji)}<b>${kin(p.name)}</b><span>${fmt(p.score)}</span>` : '<b>?</b>'}</div><div class="block d">${place}</div></div>` : `<div class="pod p${place}"></div>`;
    return `<section class="screen center">
      <span class="eyebrow">Siegerehrung</span><h1 class="h">${step <= 1 && r[0] ? kin(`${r[0].name} gewinnt!`) : 'Und die Plätze gehen an …'}</h1>
      <div class="podium">${col(pod[0], 2)}${col(pod[1], 1)}${col(pod[2], 3)}</div>
      ${step <= 1 ? `<div class="board-wrap">${board(12)}</div><div class="row"><button class="btn big" data-act="rematch">Neue Runde, gleiche Leute</button><button class="btn" data-act="to-lobby">Zur Lobby</button></div>` : `<button class="btn big wide" style="max-width:760px" data-act="podium-next" data-primary>${step === 3 ? 'Platz 3 aufdecken' : step === 2 ? 'Platz 2 aufdecken' : 'Und der Sieg geht an …'} <kbd>Enter</kbd></button>`}
    </section>`;
  },
};

/* ---------- Ablauf ---------- */
function openShow() {
  Sound.unlock(); Sound.play('jingle'); setTimeout(() => Sound.setMusic(S.settings.music), 2900);
  FX.flash('rgba(200,21,95,A)', 1200); setTimeout(() => FX.confetti(140), 1900);
}
function newRoom() { S = { ...DEFAULT(), settings: S.settings, room: roomCode(), screen: 'lobby' }; HostNet.start(S.room); }
function begin() {
  if (!S.order.length) return;
  S.order.forEach((id) => { const p = P(id); p.score = 0; p.streak = 0; });
  const plan = PLANS[S.settings.length].slice(); if (Array.isArray(S.insider)) plan.splice(plan.length - 1, 0, 'insider');
  Object.assign(S, { plan, ri: 0, history: [], nextMult: 1, event: null, choose: null, prevRanks: null, podiumStep: 3 });
  say(`Meine Damen und Herren, willkommen bei Glühwein Royale! ${S.order.length} Leute spielen heute mit. Viel Glück!`);
  goIntro();
}
function goIntro() {
  S.round = null; S.screen = 'intro'; S.choose = null;
  wipe(() => { render(); Sound.play('sting'); });
  const g = GAMES[S.plan[S.ri]]; say(`Runde ${S.ri + 1}: ${g.title}. ${g.tagline}`);
}
function startRound() {
  const key = S.plan[S.ri]; Voice.hush(); snapshotRanks();
  S.round = R = { key, gains: {}, mult: S.nextMult || 1, phase: null }; S.nextMult = 1;
  GAMES[key].init(); S.screen = 'play'; render();
}
function endRound(headline) {
  const gains = { ...R.gains }; const best = Object.entries(gains).sort((a, b) => b[1] - a[1])[0];
  const hl = headline || (best && best[1] > 0 ? `${P(best[0])?.name} holt die meisten Punkte!` : 'Diese Runde ging an niemanden.');
  S.history.push({ key: R.key, gains, headline: hl });
  T.stop(); Sound.stopMelody(); Sound.hold(false);
  const r = ranked(); S.quip = r.length < 2 ? '' : r[0].score === r[1].score ? pick(QUIPS_TIE) : pick(QUIPS_LEAD).replaceAll('{lead}', r[0].name).replaceAll('{second}', r[1].name);
  S.screen = 'roundEnd'; render();
  FX.rings('#141a3d', 3); FX.confetti(140); Sound.play('tusch'); setTimeout(() => Sound.play('applause'), 1300);
  say(`${hl} ${S.quip}`);
  const ri = S.ri; aiQuip(hl).then((q) => { if (q && S.screen === 'roundEnd' && S.ri === ri) { S.quip = q; const el = $('#quip'); if (el) el.textContent = q; save(); say(q); } });
}
function afterRound() {
  Voice.hush(); S.ri++; snapshotRanks();
  if (S.ri >= S.plan.length) return ceremony();
  if (S.plan[S.ri] !== 'finale' && S.ri >= 2 && Math.random() < .35) { S.event = { k: pick(EVENTS).k, landed: false }; S.screen = 'event'; render(); spinEvent(); return; }
  maybeChoose();
}
function maybeChoose() {
  const lead = leaderPid(); const rest = S.plan.slice(S.ri).filter((k) => k !== 'finale');
  const second = rest.find((k, i) => i > 0 && k !== rest[0]);
  if (lead && isOnline(P(lead)) && S.plan[S.ri] !== 'finale' && second) {
    S.choose = { pid: lead, opts: [rest[0], second], until: now() + 15000 }; S.screen = 'choose';
    wipe(() => render()); Sound.play('sting'); say(`${P(lead).name} liegt vorne und wählt die nächste Runde.`); return;
  }
  goIntro();
}
function chooseRound(i) {
  if (S.screen !== 'choose') return; const k = S.choose.opts[i] ?? S.choose.opts[0];
  if (k !== S.plan[S.ri]) { const j = S.plan.indexOf(k, S.ri + 1); [S.plan[S.ri], S.plan[j]] = [S.plan[j], S.plan[S.ri]]; }
  Sound.play('lock'); FX.stamp(GAMES[k].title, 'var(--berry)'); setTimeout(goIntro, 900); S.screen = 'chosen';
}
function spinEvent() {
  const reel = $('#reel'); if (!reel) return; const n = reel.children.length; const h = reel.children[0].offsetHeight;
  let ticks = 0; const iv = setInterval(() => { Sound.play('click'); if (++ticks > 26) clearInterval(iv); }, 110);
  requestAnimationFrame(() => { reel.style.transform = `translateY(-${(n - 1) * h}px)`; });
  setTimeout(() => {
    clearInterval(iv); const ev = EVENTS.find((e) => e.k === S.event.k); S.event.landed = true; S.event.text = applyEvent(ev);
    Sound.play('fanfare'); FX.confetti(90); FX.rings('#c8155f'); const d = $('#ev-desc'); if (d) { d.textContent = S.event.text; d.style.visibility = 'visible'; } const b = $('#ev-next'); if (b) b.disabled = false;
    save(); scheduleSync(); say(`${ev.t} ${S.event.text}`);
  }, 3300);
}
function applyEvent(ev) {
  R = null; const r = ranked();
  switch (ev.k) {
    case 'double': S.nextMult = 2; return ev.d;
    case 'gift': r.forEach((p) => award(p.pid, 50, { raw: true })); return ev.d;
    case 'dance': r.forEach((p) => award(p.pid, 25, { raw: true })); Sound.groove(18); return ev.d;
    case 'underdog': { const low = r.slice(Math.ceil(r.length / 2)); if (!low.length) { award(r[0]?.pid, 150, { raw: true }); return ev.d; } low.forEach((p) => award(p.pid, 150, { raw: true })); return `${low.length} Leute aus der unteren Hälfte bekommen 150 Punkte.`; }
    case 'luck': { const w = shuffle(r).slice(0, 3); w.forEach((p) => award(p.pid, 200, { raw: true })); return `200 Punkte für ${w.map((p) => p.name).join(', ')}!`; }
    default: return ev.d;
  }
}
function ceremony() {
  S.screen = 'ceremony'; S.podiumStep = 3; S.round = null; render();
  Sound.play('drumroll'); say('Die Siegerehrung! Wer hat heute das goldene Mikro verdient?');
}
function podiumNext() {
  S.podiumStep = Math.max(1, (S.podiumStep ?? 3) - 1 + (S.podiumStep === 3 && !ranked()[2] ? -1 : 0));
  const r = ranked();
  if (S.podiumStep > 1) { Sound.play('tusch'); FX.rings('#141a3d'); const p = r[S.podiumStep - 1]; if (p) say(`Platz ${S.podiumStep}: ${p.name} mit ${p.score} Punkten!`); }
  else { Sound.play('fanfare'); setTimeout(() => Sound.play('applause'), 900); FX.fireworks(9, ['#141a3d', '#c8155f']); FX.confetti(220); FX.rings('#c8155f', 4); Sound.groove(14); if (r[0]) say(`Und der Sieg geht an: ${r[0].name}! Mit ${r[0].score} Punkten. Applaus!`); }
  render();
}

/* ---------- KI: Insider-Runde & Sprüche (nur auf claude.ai) ---------- */
async function genInsider() {
  const ctx = (S.aiContext || '').trim();
  if (ctx.length < 20) { toast('Schreibt ein paar Sätze über euch, damit Claude etwas zum Arbeiten hat.'); return; }
  S.insider = 'loading'; render();
  try {
    const res = await Voice.sample.json(`Du schreibst Fragen für die Weihnachtsfeier-Gameshow „Glühwein Royale“. Kolleginnen und Kollegen spielen jeweils für sich gegeneinander.
Erstelle genau 6 Multiple-Choice-Fragen auf Deutsch für eine „Insider-Runde“ über diese Gruppe. Nutze die Infos unten. Erfinde keine Fakten über echte Personen: Fragt eine Frage eine Tatsache über die Gruppe ab, muss die richtige Antwort direkt aus den Infos stammen. Reichen die Infos nicht, fülle mit witzigen allgemeinen Fragen zu Büroalltag, Branche oder Weihnachten auf, deren Antwort eindeutig stimmt.
Ton: frech und herzlich, nie verletzend. Keine Fragen zu Gesundheit, Gewicht, Aussehen, Alter, Religion, Politik, Sexualität oder Gehalt einzelner Personen.
Antworte nur mit einem JSON-Array: [{"q":"Frage?","a":["richtige Antwort","falsch","falsch","falsch"]}]. Die richtige Antwort steht immer zuerst. Jede Antwort höchstens 60 Zeichen.

Infos über die Gruppe:
"""${ctx.slice(0, 3000)}"""`, { modelTier: 'default' });
    const arr = (Array.isArray(res) ? res : []).filter((x) => x && typeof x.q === 'string' && Array.isArray(x.a) && x.a.length === 4 && x.a.every((s) => typeof s === 'string' && s.trim()));
    if (arr.length < 3) throw { message: 'Claude hat zu wenige brauchbare Fragen geliefert.' };
    S.insider = arr.slice(0, 6).map((x) => ({ q: x.q.trim(), a: x.a.map((s) => s.trim()) })); Sound.play('bell'); toast('Die Insider-Runde ist fertig.');
  } catch (err) { S.insider = null; toast({ not_granted: 'Ihr habt Claude den Zugriff nicht erlaubt.', rate_limited: 'Claude braucht kurz eine Pause. Gleich nochmal versuchen.' }[err?.code] || err?.message || 'Das hat nicht geklappt.'); }
  if (S.screen === 'lobby') render();
}
async function aiQuip(headline) {
  if (!Voice.sample) return null; const r = ranked(); if (r.length < 2) return null;
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 9000);
  try {
    const { text } = await Voice.sample(`Du bist der charmante, schlagfertige Showmaster der Weihnachtsfeier-Gameshow „Glühwein Royale“. Schreibe genau EINEN kurzen Moderationsspruch auf Deutsch (höchstens 22 Wörter) nach dieser Runde. Rangliste: ${r.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} (${p.score})`).join(', ')}. Diese Runde: ${headline}. Frech, warm, weihnachtlich, nie gemein, niemanden bloßstellen. Nur der Spruch.`, { modelTier: 'quick', cache: false, signal: ac.signal });
    return text.trim().replace(/^["„“]+|["„“]+$/g, '').slice(0, 220);
  } catch { return null; } finally { clearTimeout(to); }
}

/* ---------- Eingaben am Beamer ---------- */
let busyUntilH = 0;
function hostClick(e) {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const a = el.dataset.act, d = el.dataset; Sound.unlock();
  if (now() < busyUntil && !['sfx', 'menu-open'].includes(a)) return;
  switch (a) {
    case 'open': openShow(); newRoom(); Wake.on(); wipe(() => render()); return;
    case 'resume': { const saved = store.get(HOST_KEY); if (!saved) return; S = Object.assign(DEFAULT(), saved); HostNet.start(S.room); openShow(); Wake.on(); if (S.round?.t && !S.round.t.fired) { S.round.t.end = now() + Math.max(8000, S.round.t.paused ?? 0); S.round.t.paused = null; } if (S.screen === 'chosen') S.screen = 'intro'; if (S.screen === 'choose') S.choose.until = now() + 15000; render(); return; }
    case 'copy': navigator.clipboard?.writeText(joinUrl()).then(() => toast('Link kopiert.'), () => toast(joinUrl())); return;
    case 'kick': { const p = P(d.pid); if (!p) return; confirmBox(`${p.name} entfernen?`, 'Entfernen', () => { HostNet.send(p.pid, { t: 'kicked' }); (S.kicked ||= []).push(p.pid); delete S.players[p.pid]; S.order = S.order.filter((x) => x !== p.pid); render(); }); return; }
    case 'len': S.settings.length = d.k; render(); return;
    case 'setting': S.settings[d.k] = !S.settings[d.k]; if (d.k === 'music') Sound.setMusic(S.settings.music); render(); return;
    case 'ai-gen': return void genInsider();
    case 'ai-clear': S.insider = null; render(); return;
    case 'begin': if (S.screen === 'lobby') begin(); return;
    case 'start-round': if (S.screen === 'intro') startRound(); return;
    case 'choose': chooseRound(+d.i); return;
    case 'after-round': if (S.screen === 'roundEnd') afterRound(); return;
    case 'after-event': if (S.screen === 'event' && S.event?.landed) maybeChoose(); return;
    case 'podium-next': podiumNext(); return;
    case 'rematch': S.screen = 'lobby'; begin(); return;
    case 'to-lobby': S.screen = 'lobby'; render(); return;
    case 'sfx': Sound.play(d.s); return;
    case 'menu-open': openMenu(); return;
  }
  if (S.screen === 'play') GAMES[R.key].act?.(a, d, el);
}
function hostKey(e) {
  if ($('.confirm')) return;
  if ($('.sheet')) { if (e.key === 'Escape') { e.preventDefault(); $('.sheet').remove(); } return; }
  const typing = /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range';
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (now() < busyUntil) { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); return; }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const sfx = { t: 'tusch', b: 'rimshot', a: 'applause', w: 'drumroll' }[k];
  if (sfx && S.screen !== 'title') { Sound.unlock(); Sound.play(sfx); return; }
  if (k === 'f') return toggleFull();
  if (S.screen === 'play' && GAMES[R.key].key?.(k, e) !== false) { if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault(); return; }
  if (k === 'Enter' && !e.target.closest('button,[role=switch]')) { const b = $('[data-primary]'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
}
function hostInput(e) { if (e.target.dataset.input === 'ai-ctx') { S.aiContext = e.target.value; save(); } }

function hostTick() {
  if (S.screen === 'play' && R) {
    const g = GAMES[R.key];
    if (R.t) {
      const left = T.left(), sec = Math.ceil(left / 1000);
      $$('[data-timer]').forEach((el) => { el.textContent = el.dataset.fmt === 'mmss' ? `0:${String(sec).padStart(2, '0')}` : sec; });
      $$('[data-ring]').forEach((el) => { el.querySelector('.fgc').setAttribute('stroke-dashoffset', String(276.5 * (1 - left / R.t.total))); el.classList.toggle('hot', sec <= 5); });
      $$('.bigtimer').forEach((el) => el.classList.toggle('hot', sec <= 5));
      if (R.t.paused == null && sec !== R.t.lastSec) { R.t.lastSec = sec; if (sec <= 5 && sec > 0) Sound.play(sec <= 3 ? 'tock' : 'tick'); }
      if (left <= 0 && !R.t.fired && R.t.paused == null) { R.t.fired = true; g.timeout?.(); }
    }
    g.frame?.();
  }
  if (S.screen === 'choose' && S.choose) { const l = Math.max(0, Math.ceil((S.choose.until - now()) / 1000)); const el = $('[data-choose-left]'); if (el) el.textContent = `Noch ${l} Sek.`; if (l <= 0) chooseRound(0); }
  requestAnimationFrame(hostTick);
}
setInterval(() => { if (S.screen === 'lobby') { const offs = plist().map((p) => isOnline(p)).join(); if (offs !== hostTick.offs) { hostTick.offs = offs; render(); } } else updateCount(); }, 3000);

// Bildschirm wach halten: Ein schlafendes Moderations-Handy würde alle Verbindungen kappen
const Wake = {
  lock: null,
  async on() { try { if ('wakeLock' in navigator && !this.lock && document.visibilityState === 'visible') { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => (this.lock = null)); } } catch { /* nicht verfügbar */ } },
};
document.addEventListener('visibilitychange', () => { if (S.room && document.visibilityState === 'visible') Wake.on(); });
function startHost(data) {
  document.body.classList.add('host');
  if (data?.S) { S = Object.assign(DEFAULT(), data.S); if (S.room) HostNet.start(S.room); }
  Band.mount(); render(); requestAnimationFrame(hostTick);
  document.addEventListener('click', hostClick); document.addEventListener('keydown', hostKey); document.addEventListener('input', hostInput);
  Voice.init(() => { if (S.screen === 'lobby') render(); });
}
