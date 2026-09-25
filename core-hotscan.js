// Live-Überwachung: scannt die Top-Coins in zwei Stufen und wählt die heißesten Signale.
// Stufe 1: Tageschart aller Coins (ein Abruf je Coin). Stufe 2: Tiefenprüfung der besten Kandidaten.
// Läuft nur, solange die App geöffnet und sichtbar ist.
import { CONFIG } from './config.js';
import { getCandles, getMarketCtx, analyzeMarket, heat } from './core-scanner.js';
import { analyzeTimeframe, scoreTimeframe } from './core-signals.js';
import { getUniverse } from './core-universe.js';

const H = () => CONFIG.signals.hot;
const listeners = new Set();
export const hot = {
  running: false, phase: 'bereit', done: 0, total: 0, source: '', picks: [], results: new Map(),
  lastRound: 0, nextRound: 0, error: null, skipped: 0,
};
const emit = () => listeners.forEach((fn) => { try { fn(hot); } catch (e) { console.error(e); } });
export const onHot = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let getMarkets = () => [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = () => document.visibilityState === 'visible';
async function whileHidden() { while (hot.running && !visible()) await sleep(2000); }

// Top-Auswahl: nur echte Signale, sortiert nach Hitze, höchstens maxPicks
export function pickHot(results, max) {
  return [...results.values()].filter((r) => r.dir !== 'neutral').map((r) => ({ r, heat: heat(r) }))
    .sort((a, b) => b.heat - a.heat).slice(0, max);
}

async function round() {
  const ctx = await getMarketCtx();
  const mainNames = getMarkets();
  const uni = await getUniverse(mainNames, ctx.ctx);
  hot.source = uni.source;
  const coins = uni.coins.filter((c) => !(ctx.map[c] < CONFIG.signals.minDayVolumeUsd));
  hot.skipped = uni.coins.length - coins.length;

  // Stufe 1: Tageschart
  hot.phase = 'Tagescharts'; hot.done = 0; hot.total = coins.length; emit();
  const prelim = [];
  for (const c of coins) {
    if (!hot.running) return;
    await whileHidden();
    try {
      const candles = await getCandles(c, '1d', true);
      if (candles.length >= 60) {
        const a = analyzeTimeframe(candles, '1d');
        const s = scoreTimeframe(a);
        prelim.push({ c, strength: Math.max(s.long, s.short) + a.events.filter((e) => e.strong).length * 10 });
      }
    } catch { /* einzelner Coin fehlgeschlagen, weiter */ }
    hot.done++; emit();
  }

  // Stufe 2: Tiefenprüfung der stärksten Kandidaten auf allen Timeframes
  const cands = prelim.sort((a, b) => b.strength - a.strength).slice(0, H().deepScan).map((p) => p.c);
  hot.phase = 'Tiefenprüfung'; hot.done = 0; hot.total = cands.length; emit();
  const results = new Map();
  for (const c of cands) {
    if (!hot.running) return;
    await whileHidden();
    try { results.set(c, await analyzeMarket(c, H().mode, true)); } catch { /* weiter */ }
    hot.done++;
    hot.picks = pickHot(results, H().maxPicks);
    emit();
  }
  hot.results = results;
  hot.picks = pickHot(results, H().maxPicks);
  hot.lastRound = Date.now();
}

async function loop() {
  while (hot.running) {
    try {
      hot.error = null;
      await round();
    } catch (e) {
      hot.error = e.message;
    }
    if (!hot.running) break;
    hot.phase = 'Pause'; hot.nextRound = Date.now() + H().roundPauseMs; emit();
    while (hot.running && Date.now() < hot.nextRound) await sleep(1000);
  }
  hot.phase = 'gestoppt'; emit();
}

export function startHot(marketsGetter) {
  if (hot.running) return;
  getMarkets = marketsGetter;
  hot.running = true;
  emit();
  loop();
}

export function stopHot() {
  hot.running = false;
  emit();
}
