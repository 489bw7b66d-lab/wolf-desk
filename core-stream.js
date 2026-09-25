// Live-Kurse per WebSocket, mit automatischem Neuverbinden.
// Fällt der WebSocket aus, holen wir Kurse ersatzweise per REST.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { setPrices, update, logError } from './core-store.js';

let ws = null, pingTimer = null, fallbackTimer = null, retry = 0, stopped = false;

function subscribeAll() {
  CONFIG.dexes.forEach((dex) => {
    const subscription = dex ? { type: 'allMids', dex } : { type: 'allMids' };
    ws.send(JSON.stringify({ method: 'subscribe', subscription }));
  });
}

async function pollOnce() {
  const res = await Promise.allSettled(CONFIG.dexes.map((d) => hl.mids(d)));
  res.forEach((r) => { if (r.status === 'fulfilled') setPrices(r.value); });
}

function startFallback() {
  if (fallbackTimer) return;
  update({ stream: 'fallback' });
  pollOnce().catch((e) => logError('Kurse', e));
  fallbackTimer = setInterval(() => pollOnce().catch((e) => logError('Kurse', e)), CONFIG.refresh.pricesFallbackMs);
}

function stopFallback() {
  clearInterval(fallbackTimer);
  fallbackTimer = null;
}

function connect() {
  if (stopped) return;
  update({ stream: 'verbinde' });
  try {
    ws = new WebSocket(CONFIG.api.ws);
  } catch (e) {
    logError('WebSocket', e);
    startFallback();
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    retry = 0;
    stopFallback();
    update({ stream: 'verbunden' });
    subscribeAll();
    clearInterval(pingTimer);
    pingTimer = setInterval(() => ws?.readyState === 1 && ws.send(JSON.stringify({ method: 'ping' })), 30000);
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.channel === 'allMids' && msg.data?.mids) setPrices(msg.data.mids);
  };

  ws.onerror = () => logError('WebSocket', new Error('Verbindungsfehler'));

  ws.onclose = () => {
    clearInterval(pingTimer);
    if (stopped) return;
    update({ stream: 'getrennt' });
    startFallback();
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  const delay = Math.min(30000, 1000 * 2 ** retry++);
  setTimeout(connect, delay);
}

export function startStream() {
  stopped = false;
  connect();
  // iPhone pausiert Verbindungen im Hintergrund: beim Zurückkehren sofort neu verbinden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!ws || ws.readyState > 1)) {
      retry = 0;
      connect();
    }
  });
}
