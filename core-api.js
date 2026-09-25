// REST-Zugriff auf die Hyperliquid-Info-Schnittstelle (nur lesend).
import { CONFIG } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function info(body) {
  const { rest, timeoutMs, retries } = CONFIG.api;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(rest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (res.status === 429) throw new Error('Zu viele Anfragen (Rate-Limit)');
      if (!res.ok) throw new Error(`Server antwortet mit Status ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e.name === 'AbortError' ? new Error('Zeitüberschreitung bei der Anfrage') : e;
      if (attempt < retries) await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${body.type}: ${lastErr.message}`);
}

const withDex = (body, dex) => (dex ? { ...body, dex } : body);

export const hl = {
  mids: (dex = '') => info(withDex({ type: 'allMids' }, dex)),
  meta: (dex = '') => info(withDex({ type: 'meta' }, dex)),
  account: (user, dex = '') => info(withDex({ type: 'clearinghouseState', user }, dex)),
  spot: (user) => info({ type: 'spotClearinghouseState', user }),
  openOrders: (user, dex = '') => info(withDex({ type: 'frontendOpenOrders', user }, dex)),
  fillsSince: (user, startTime) => info({ type: 'userFillsByTime', user, startTime, aggregateByTime: true }),
  portfolio: (user) => info({ type: 'portfolio', user }),
  candles: (coin, interval, startTime, endTime = Date.now()) =>
    info({ type: 'candleSnapshot', req: { coin, interval, startTime, endTime } }),
};
