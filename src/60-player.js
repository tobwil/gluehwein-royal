/* ================= Handy der Gäste: nur Eingabe und persönliche Ansicht ================= */
const PID_KEY = 'gluehwein-royale-pid', ME_KEY = 'gluehwein-royale-me', ROOM_KEY = 'gluehwein-royale-room';
// Im Testmodus (mehrere Tabs = mehrere Handys) bekommt jeder Tab seinen eigenen Speicher
const pstore = useLocal ? {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* egal */ } },
} : store;
const Pl = { pid: null, code: null, me: null, v: null, vKey: '', recvAt: 0, joined: false, resultQid: null, numDraft: '', betDraft: null, kicked: false };
function parseNum(s) {
  s = String(s).trim().replace(/\s|'/g, ''); if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s);
}
const plLeft = () => (Pl.v?.left != null ? Math.max(0, Pl.v.left - (now() - Pl.recvAt)) : 0);
const hello = () => PlayerNet.send({ t: 'hello', name: Pl.me.name, emoji: Pl.me.emoji });
const sendAns = (v) => { if (!Pl.v?.qid) return; PlayerNet.send({ t: 'ans', qid: Pl.v.qid, v }); Pl.v.picked = v; if (navigator.vibrate) navigator.vibrate(25); plRender(); };

function startPlayer(code) {
  document.body.classList.add('player');
  Pl.code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  Pl.pid = pstore.get(PID_KEY) || uid(12); pstore.set(PID_KEY, Pl.pid);
  Pl.me = pstore.get(ME_KEY) || { name: '', emoji: pick(AVATARS) };
  Pl.joined = pstore.get(ROOM_KEY) === Pl.code && !!Pl.me.name;
  PlayerNet.on('msg', onHostMsg);
  PlayerNet.on('status', () => { const el = $('#pl-net'); if (el) el.outerHTML = plNet(); if (!Pl.v) plRender(); });
  PlayerNet.on('open', () => { if (Pl.joined) hello(); });
  PlayerNet.start(Pl.code, Pl.pid);
  setInterval(() => { if (Pl.joined) PlayerNet.send({ t: 'ping' }); }, 5000);
  document.addEventListener('click', plClick); document.addEventListener('input', plInput); document.addEventListener('submit', (e) => { e.preventDefault(); plSubmit(e.target); });
  plRender(); requestAnimationFrame(plTick);
}
function onHostMsg(m) {
  if (!m) return;
  if (m.t === 'kicked') { Pl.kicked = true; Pl.joined = false; pstore.del(ROOM_KEY); plRender(); return; }
  if (m.t === 'who') { if (Pl.joined) hello(); return; }
  if (m.t !== 'view') return;
  const key = JSON.stringify({ ...m.v, left: 0 }); const changed = key !== Pl.vKey;
  if (Pl.v?.qid !== m.v.qid) { Pl.numDraft = ''; Pl.betDraft = null; }
  Pl.v = m.v; Pl.recvAt = now(); Pl.vKey = key;
  if (m.v.result && m.v.qid && Pl.resultQid !== m.v.qid) { Pl.resultQid = m.v.qid; feedback(m.v.result); }
  if (changed) plRender();
}
function feedback(r) {
  if (navigator.vibrate) navigator.vibrate(r.ok ? [50, 40, 50] : 180);
  if (r.ok) { FX.confetti(60); FX.stamp(r.pts > 0 ? `+${fmt(r.pts)}` : 'Richtig!'); } else FX.stamp(r.pts < 0 ? fmt(r.pts) : 'Daneben', 'var(--berry)');
}
const plNet = () => `<span id="pl-net" class="net ${PlayerNet.status}">${{ online: 'Verbunden', connecting: 'Verbinde …', waiting: 'Suche Raum …', offline: 'Offline' }[PlayerNet.status] || ''}</span>`;

function plRender() {
  const app = $('#app'); const v = Pl.v; const active = document.activeElement?.id;
  let main;
  if (Pl.kicked) main = `<div class="pl-wait"><b class="d">Du wurdest aus der Show entfernt.</b><p class="muted">Sprich mit der Moderation, wenn das ein Versehen war.</p></div>`;
  else if (!Pl.joined) main = joinForm();
  else if (!v) main = `<div class="pl-wait"><span class="spinner"></span><b class="d">${PlayerNet.status === 'waiting' ? 'Raum nicht gefunden' : 'Verbinde mit der Show …'}</b><p class="muted">${PlayerNet.status === 'waiting' ? `Ist die Show schon eröffnet? Code: ${esc(Pl.code)}` : 'Einen Moment.'}</p></div>`;
  else main = (PLV[v.kind] || PLV.wait)(v) + resultBlock(v);
  const you = v?.you;
  app.innerHTML = `<section class="pl">
    <header class="pl-head">${Pl.joined ? `${E(Pl.me.emoji)}<b class="nm">${esc(you?.name || Pl.me.name)}</b>${you ? `<span class="pl-score d">${fmt(you.score)}</span><span class="pl-rank">#${you.rank}<small>/${you.of}</small></span>` : ''}` : `<b class="d">Glühwein Royale</b>`}${plNet()}</header>
    ${v && ['mc', 'number', 'duo', 'vote', 'bet', 'choose', 'spot'].includes(v.kind) && v.phase !== 'reveal' ? '<div class="pl-timer"><i data-pt></i></div>' : ''}
    <main class="pl-main">${main}</main></section>`;
  if (active) { const el = document.getElementById(active); if (el && el.tagName === 'INPUT') { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* range-Input */ } } }
}
function joinForm() {
  return `<form class="pl-join" id="joinf"><span class="kicker">Raum ${esc(Pl.code)}</span><h1 class="h">${kin('Mitspielen')}</h1>
    <label class="f">Dein Name<input class="t" id="pl-name" name="name" maxlength="16" autocomplete="nickname" enterkeyhint="go" required value="${esc(Pl.me.name)}" placeholder="z. B. Anna"></label>
    <div class="f"><b>Dein Zeichen</b><div class="emoji-pick" role="group" aria-label="Zeichen">${AVATARS.map((e) => `<button type="button" data-p="emo" data-e="${e}" aria-pressed="${Pl.me.emoji === e}">${e}</button>`).join('')}</div></div>
    <button class="btn big wide" type="submit">Los geht’s</button>
    <p class="muted small">Kein Konto, keine App. Dein Name ist nur für diese Show sichtbar.</p></form>`;
}
const PLV = {
  wait: (v) => `<div class="pl-wait ${v.hot ? 'hot' : ''}"><b class="d">${kin(v.title || '')}</b><p>${esc(v.text || '')}</p></div>`,
  mc(v) {
    const rev = v.phase === 'reveal', locked = v.picked != null || v.phase !== 'ask';
    return `${v.bet != null ? `<p class="pl-note">Dein Einsatz: <b>${fmt(v.bet)}</b></p>` : ''}${v.emoji ? `<div class="emoji-line pl-emoji">${v.emoji.map((e) => `<span>${e}</span>`).join(' ')}</div>` : ''}<p class="pl-q">${esc(v.q)}</p>
      <div class="pl-grid">${v.opts.map((o, i) => `<button class="pl-opt ${v.picked === i ? 'picked' : ''} ${rev ? (i === v.result?.correct ? 'right' : 'dim') : ''}" data-p="ans" data-v="${i}" ${locked ? 'disabled' : ''}><span class="lt">${LET[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      ${v.picked != null && !rev ? '<p class="pl-note">Eingeloggt. Warte auf die Auflösung …</p>' : ''}`;
  },
  number(v) {
    if (v.picked != null || v.phase !== 'ask') return `<p class="pl-q">${esc(v.q)}</p><div class="pl-big"><span class="muted">Deine Schätzung</span><b class="d">${v.picked != null ? `${fmt(v.picked)} ${esc(v.unit)}` : '–'}</b></div>`;
    return `<p class="pl-q">${esc(v.q)}</p><form class="pl-num" id="numf"><input class="t" id="num" inputmode="decimal" autocomplete="off" enterkeyhint="send" placeholder="Zahl in ${esc(v.unit)}" value="${esc(Pl.numDraft)}" aria-label="Deine Schätzung in ${esc(v.unit)}"><button class="btn big wide" type="submit">Schätzung abgeben</button></form>`;
  },
  duo(v) {
    if (v.out) return `<div class="pl-wait"><b class="d">${kin('Du bist raus')}</b><p>Fieber mit! Die nächste Runde kommt bestimmt.</p></div>`;
    const locked = v.picked != null || v.phase !== 'ask';
    return `<p class="pl-note">Bekannt: ${esc(v.ref)}</p><p class="pl-q">${esc(v.q)}</p><div class="pl-duo">${[['early', '◀ Früher'], ['late', 'Später ▶']].map(([k, t]) => `<button class="pl-opt big ${v.picked === k ? 'picked' : ''}" data-p="ans" data-v="${k}" ${locked ? 'disabled' : ''}><span>${t}</span></button>`).join('')}</div>`;
  },
  vote(v) {
    const locked = v.picked != null || v.phase !== 'ask';
    return `<p class="pl-q">${esc(v.q)}</p><div class="pl-list">${v.people.map((p) => `<button class="pl-person ${v.picked === p.pid ? 'picked' : ''}" data-p="ans" data-v="${esc(p.pid)}" ${locked ? 'disabled' : ''}>${E(p.emoji)} ${esc(p.name)}</button>`).join('')}</div>`;
  },
  bet(v) {
    if (v.picked != null) return `<div class="pl-big"><span class="muted">Dein Einsatz (${esc(v.mult)})</span><b class="d">${fmt(v.picked)}</b><p class="muted">Gleich kommt die letzte Frage.</p></div>`;
    const val = Pl.betDraft ?? Math.round(v.max / 2 / 10) * 10;
    return `<p class="pl-q">Wie viel setzt du? <span class="mult">${esc(v.mult)}</span></p><form class="pl-bet" id="betf"><b class="d" id="betv">${fmt(val)}</b>
      <input type="range" id="bet" min="0" max="${v.max}" step="10" value="${val}" aria-label="Einsatz">
      <div class="chips-row"><button type="button" data-p="bet" data-f="0">Nichts</button><button type="button" data-p="bet" data-f=".5">Hälfte</button><button type="button" data-p="bet" data-f="1">Alles</button></div>
      <button class="btn big wide" type="submit">Einsatz festlegen</button></form>`;
  },
  choose: (v) => `<div class="pl-wait hot"><b class="d">${kin('Du hast das goldene Mikro!')}</b><p>Such die nächste Runde aus:</p></div><div class="pl-duo col">${v.opts.map((o, i) => `<button class="pl-opt big" data-p="choose" data-i="${i}"><span><b>${esc(o.title)}</b><br><small>${esc(o.tagline)}</small></span></button>`).join('')}</div>`,
  spot: (v) => `<p class="pl-note">${esc(v.who)} rät. Erklär’s, ohne das Wort zu sagen!</p><div class="pl-word d">${kin(v.word)}</div>`,
  final: (v) => `<div class="pl-final"><span class="kicker">Endstand</span><b class="d">Platz ${v.you.rank}</b><span>von ${v.you.of} · ${fmt(v.you.score)} Punkte</span>
    <ol>${v.podium.map((p, i) => `<li><span class="rk">${i + 1}</span>${E(p.emoji)} ${esc(p.name)} <b>${fmt(p.score)}</b></li>`).join('')}</ol><p class="muted">Danke fürs Mitspielen!</p></div>`,
};
function resultBlock(v) {
  const r = v.result; if (!r) return '';
  return `<div class="pl-res ${r.ok ? 'ok' : 'no'}"><b class="d">${r.ok ? 'Richtig!' : r.text === 'Ausgeschieden' ? 'Raus!' : 'Daneben'}</b><span class="d">${r.pts ? `${r.pts > 0 ? '+' : ''}${fmt(r.pts)}` : '±0'}</span>
    <small>${esc([r.text, r.truth ? `Lösung: ${r.truth}` : ''].filter(Boolean).join(' · '))}</small></div>`;
}
function plClick(e) {
  const el = e.target.closest('[data-p]'); if (!el || el.disabled) return; const d = el.dataset;
  if (d.p === 'emo') { Pl.me.emoji = d.e; Pl.me.name = $('#pl-name')?.value || Pl.me.name; $$('.emoji-pick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.e === d.e))); return; }
  if (d.p === 'ans') return sendAns(Pl.v.kind === 'mc' ? +d.v : d.v);
  if (d.p === 'choose') { PlayerNet.send({ t: 'choose', i: +d.i }); Pl.v = { ...Pl.v, kind: 'wait', title: 'Gewählt!', text: 'Schau auf die Leinwand.' }; plRender(); return; }
  if (d.p === 'bet') { Pl.betDraft = Math.round((Pl.v.max * +d.f) / 10) * 10; const r = $('#bet'); if (r) r.value = Pl.betDraft; $('#betv').textContent = fmt(Pl.betDraft); }
}
function plInput(e) {
  if (e.target.id === 'num') Pl.numDraft = e.target.value;
  if (e.target.id === 'bet') { Pl.betDraft = +e.target.value; $('#betv').textContent = fmt(Pl.betDraft); }
  if (e.target.id === 'pl-name') Pl.me.name = e.target.value;
}
function plSubmit(f) {
  if (f.id === 'joinf') {
    const name = cleanName($('#pl-name').value); if (!name) { toast('Bitte gib einen Namen ein.'); return; }
    Pl.me.name = name; pstore.set(ME_KEY, Pl.me); pstore.set(ROOM_KEY, Pl.code); Pl.joined = true; hello(); plRender(); return;
  }
  if (f.id === 'numf') { const n = parseNum($('#num').value); if (!isFinite(n) || n < 0) { toast('Bitte eine Zahl eintragen, z. B. 1.250 oder 3,5.'); return; } sendAns(n); return; }
  if (f.id === 'betf') { sendAns(+($('#bet')?.value ?? 0)); }
}
function plTick() {
  const bar = $('[data-pt]'); if (bar && Pl.v?.total) { const k = plLeft() / Pl.v.total; bar.style.width = `${k * 100}%`; bar.classList.toggle('hot', plLeft() < 5000); }
  requestAnimationFrame(plTick);
}
