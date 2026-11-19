/* ================= Verbindung Beamer ⇄ Handys =================
   Stern-Topologie: Der Beamer-Rechner ist der Server und hält die Wahrheit.
   Handys schicken nur Eingaben und bekommen ihre persönliche Ansicht zurück.
   Transporte (austauschbar, gleiche Schnittstelle):
   - "peer":  WebRTC über PeerJS. Der öffentliche PeerJS-Vermittler hilft nur beim Handshake.
   - "local": BroadcastChannel, für Tests mit mehreren Tabs im selben Browser (?local=1). */
const NET_PREFIX = 'gluehwein-royale-';
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, ...(window.GR_TURN || [])] };
const useLocal = new URLSearchParams(location.search).has('local') || typeof Peer === 'undefined';

const HostNet = {
  handlers: {}, conns: new Map(), status: 'offline',
  on(ev, fn) { this.handlers[ev] = fn; },
  emit(ev, ...a) { this.handlers[ev]?.(...a); },
  setStatus(s) { this.status = s; this.emit('status', s); },
  start(code) {
    this.code = code;
    if (useLocal) {
      this.bc = new BroadcastChannel(NET_PREFIX + code);
      this.bc.onmessage = ({ data }) => { if (data.to !== 'host') return; if (!this.conns.has(data.from)) { this.conns.set(data.from, 'local'); } this.emit('msg', data.from, data.m); };
      this.setStatus('online'); return;
    }
    let tries = 0;
    const open = () => {
      this.peer?.destroy?.();
      const peer = this.peer = new Peer(NET_PREFIX + code, { config: ICE, debug: 0 });
      this.setStatus('connecting');
      peer.on('open', () => { tries = 0; this.setStatus('online'); });
      peer.on('connection', (conn) => {
        const pid = conn.metadata?.pid; if (!pid) { conn.close(); return; }
        conn.on('open', () => { const old = this.conns.get(pid); if (old && old !== conn) try { old.close(); } catch { /* egal */ } this.conns.set(pid, conn); });
        conn.on('data', (m) => { if (this.conns.get(pid) !== conn) this.conns.set(pid, conn); this.emit('msg', pid, m); });
        conn.on('close', () => { if (this.conns.get(pid) === conn) { this.conns.delete(pid); this.emit('leave', pid); } });
        conn.on('error', () => {});
      });
      peer.on('disconnected', () => { this.setStatus('connecting'); setTimeout(() => { try { peer.reconnect(); } catch { /* egal */ } }, 1000); });
      peer.on('error', (err) => {
        // Nach einem Reload ist die Raum-ID beim Vermittler kurz noch belegt: kurz warten, neu versuchen
        if (err.type === 'unavailable-id' && tries++ < 30) { this.setStatus('connecting'); setTimeout(open, 2000); return; }
        if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) { this.setStatus('connecting'); setTimeout(open, 3000); return; }
        if (err.type !== 'peer-unavailable') this.setStatus('error');
      });
    };
    open();
  },
  send(pid, m) {
    if (useLocal) { this.bc?.postMessage({ to: pid, m }); return; }
    const c = this.conns.get(pid); if (c?.open) try { c.send(m); } catch { /* egal */ }
  },
  online(pid) { return this.conns.has(pid); },
};

const PlayerNet = {
  handlers: {}, status: 'offline',
  on(ev, fn) { this.handlers[ev] = fn; },
  emit(ev, ...a) { this.handlers[ev]?.(...a); },
  setStatus(s) { if (this.status !== s) { this.status = s; this.emit('status', s); } },
  start(code, pid) {
    this.code = code; this.pid = pid;
    if (useLocal) {
      this.bc = new BroadcastChannel(NET_PREFIX + code);
      this.bc.onmessage = ({ data }) => { if (data.to === pid) { this.lastSeen = now(); this.setStatus('online'); this.emit('msg', data.m); } };
      this.setStatus('online'); this.emit('open'); return;
    }
    const connect = () => {
      if (!this.peer || this.peer.destroyed) {
        this.peer = new Peer({ config: ICE, debug: 0 });
        this.peer.on('open', connect);
        this.peer.on('disconnected', () => setTimeout(() => { try { this.peer.reconnect(); } catch { /* egal */ } }, 1000));
        this.peer.on('error', (err) => { if (err.type === 'peer-unavailable') { this.setStatus('waiting'); setTimeout(connect, 2500); } else { this.setStatus('connecting'); } });
        return;
      }
      if (!this.peer.open) return;
      this.setStatus('connecting');
      const conn = this.conn = this.peer.connect(NET_PREFIX + code, { metadata: { pid }, reliable: true });
      conn.on('open', () => { this.setStatus('online'); this.emit('open'); });
      conn.on('data', (m) => { this.lastSeen = now(); this.emit('msg', m); });
      conn.on('close', () => { if (this.conn === conn) { this.setStatus('connecting'); setTimeout(connect, 1500); } });
      conn.on('error', () => {});
    };
    connect();
    // Hängt die Verbindung, ohne zu schließen (Handy war im Standby): neu verbinden
    setInterval(() => { if (this.status === 'online' && this.lastSeen && now() - this.lastSeen > 20000) { try { this.conn?.close(); } catch { /* egal */ } } }, 5000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.status !== 'online') connect(); });
  },
  send(m) {
    if (useLocal) { this.bc?.postMessage({ to: 'host', from: this.pid, m }); return; }
    if (this.conn?.open) try { this.conn.send(m); } catch { /* egal */ }
  },
};
