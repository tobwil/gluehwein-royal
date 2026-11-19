/* ================= Helfer ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const E = (s) => `<span class="em">${esc(s)}</span>`;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const now = () => Date.now();
const fmt = (n) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 2 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round10 = (n) => Math.round(n / 10) * 10;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const uid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* egal */ } },
};

// Buchstaben, die gestaffelt hereinfliegen
function kin(text, delay = 0) {
  let i = 0;
  return `<span class="kin" role="text" aria-label="${esc(text)}">${String(text).split(' ').map((w) => `<span class="wd" aria-hidden="true">${[...w].map((c) => `<span class="ch" style="--i:${i++};--d:${delay}ms">${esc(c)}</span>`).join('')}</span>`).join(' ')}</span>`;
}

let toastTimer;
function toast(msg) { $('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 3200); }

function confirmBox(text, yes, onYes) {
  const el = document.createElement('div'); el.className = 'confirm';
  el.innerHTML = `<div class="panel"><b style="font-size:1.2em">${esc(text)}</b><div class="row"><button class="btn no" data-c="y">${esc(yes)}</button><button class="btn" data-c="n">Abbrechen</button></div></div>`;
  document.body.appendChild(el); el.querySelector('[data-c="n"]').focus();
  el.addEventListener('click', (e) => { const c = e.target.closest('[data-c]')?.dataset.c; if (c || e.target === el) { el.remove(); if (c === 'y') onYes(); } });
}

const ICONS = { menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' };

/* ================= Moderator-Stimme =================
   Eine Schnittstelle, mehrere Stimmen: Claude (nur auf claude.ai), die Sprachausgabe
   des Browsers – und später z. B. Gemini Live. Ohne Stimme läuft die Show genauso. */
const Voice = {
  claudeTts: null, sample: null, ready: false, browser: 'speechSynthesis' in window,
  async init(onReady) {
    if (window.claude?.use) {
      try { const [t, s] = await Promise.all([claude.use('tts').catch(() => null), claude.use('sample').catch(() => null)]); this.claudeTts = t; this.sample = s; } catch { /* ohne KI weiter */ }
      this.claudeTts?.onState?.(({ state }) => Sound.duck(state !== 'idle'));
    }
    this.ready = true; onReady?.();
  },
  get available() { return !!this.claudeTts || this.browser; },
  get label() { return this.claudeTts ? 'Claude moderiert' : 'Browser-Stimme moderiert'; },
  say(text, on) {
    if (!on || !text) return;
    if (this.claudeTts) { try { this.claudeTts.speak(text, { language: 'de', voice: 'buttery', rate: 1.06 }).catch(() => {}); } catch { /* still */ } return; }
    if (this.browser) {
      try {
        speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = 1.05;
        const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith('de')); if (v) u.voice = v;
        u.onstart = () => Sound.duck(true); u.onend = () => Sound.duck(false); speechSynthesis.speak(u);
      } catch { /* still */ }
    }
  },
  hush() { try { this.claudeTts?.stop?.(); } catch { /* still */ } try { if (this.browser) speechSynthesis.cancel(); } catch { /* still */ } },
};
