// Bewertet, wie frisch und vollständig die Daten sind.
import { CONFIG } from './config.js';

export function priceHealth(state, coin, now = Date.now()) {
  const ts = state.priceTs[coin];
  if (!ts) return { status: 'fehlt', age: null };
  const age = now - ts;
  return { status: age > CONFIG.health.priceStaleMs ? 'veraltet' : 'ok', age };
}

export function accountHealth(state, now = Date.now()) {
  if (state.accountError && !state.account) return { status: 'fehler', age: null };
  if (!state.accountTs) return { status: 'fehlt', age: null };
  const age = now - state.accountTs;
  return { status: age > CONFIG.health.accountStaleMs ? 'veraltet' : 'ok', age };
}

export function streamHealth(state) {
  return { verbunden: 'ok', fallback: 'veraltet', verbinde: 'fehlt', getrennt: 'fehler' }[state.stream] || 'fehlt';
}
