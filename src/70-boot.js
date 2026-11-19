/* ================= Start: ?r=CODE → Handy, sonst Beamer ================= */
(function boot() {
  document.documentElement.lang = 'de';
  const code = new URLSearchParams(location.search).get('r');
  if (code) startPlayer(code); else startHost();
})();
