// Wolf Desk Wächter: läuft bei GitHub Actions alle 15 Minuten (siehe wolf-watch.yml).
// 1. Scannt Top 150 + Watchlist mit derselben Signal-Logik wie die App und meldet starke Signale.
// 2. Prüft deine Positionen mit denselben Risiko-Regeln und meldet neue Regelverstöße (und Entwarnungen).
// Merkt sich zwischen den Läufen, was schon gemeldet wurde (Datei .watch-state.json, von GitHub zwischengespeichert).
// Geheim bleiben: TELEGRAM_TOKEN, TELEGRAM_CHAT, WALLET (als GitHub Secrets hinterlegt).
import { readFile, writeFile } from 'node:fs/promises';
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { getCandles, getMarketCtx, analyzeAllModes, heat } from './core-scanner.js';
import { analyzeTimeframe, scoreTimeframe } from './core-signals.js';
import { getUniverse } from './core-universe.js';
import { loadAccount } from './core-account.js';
import { accountRisk } from './core-positions.js';
import { signalAlert, badChecks, riskDiff, signalText, riskText } from './core-alerts.js';

const { TELEGRAM_TOKEN: TOKEN, TELEGRAM_CHAT: CHAT, WALLET, TEST_RUN } = process.env;
const STATE_FILE = '.watch-state.json';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function send(text) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram: ${j.description || res.status}`);
}

async function loadState() {
  try { return JSON.parse(await readFile(STATE_FILE, 'utf8')); } catch { return { sent: {}, bad: null }; }
}

async function marketNames() {
  const names = [];
  for (const dex of CONFIG.dexes) {
    const m = await hl.meta(dex).catch(() => null);
    (m?.universe || []).filter((u) => !u.isDelisted)
      .forEach((u) => names.push(dex && !u.name.startsWith(dex + ':') ? `${dex}:${u.name}` : u.name));
  }
  return names;
}

// Konto und Regeln (ohne Live-Stream: letzter Kurs von Hyperliquid)
async function checkAccount() {
  if (!WALLET) return null;
  const account = await loadAccount(WALLET, CONFIG.dexes);
  return accountRisk({ account, prices: {}, priceTs: {}, streamStatus: 'aus' });
}

// Märkte scannen wie „Heiße Coins“: Stufe 1 Tageschart, Stufe 2 alle Stile für die Besten + Watchlist
async function scan() {
  const names = await marketNames();
  const ctx = await getMarketCtx();
  const uni = await getUniverse(names.filter((n) => !n.includes(':')), ctx.ctx);
  const coins = uni.coins.filter((c) => !(ctx.map[c] < CONFIG.signals.minDayVolumeUsd));
  log(`Stufe 1: ${coins.length} Märkte (${uni.source})`);
  const prelim = [];
  for (const c of coins) {
    try {
      const candles = await getCandles(c, '1d', true);
      if (candles.length >= 60) {
        const a = analyzeTimeframe(candles, '1d'), s = scoreTimeframe(a);
        prelim.push({ c, strength: Math.max(s.long, s.short) + a.events.filter((e) => e.strong).length * 10 });
      }
    } catch { /* einzelner Markt fehlgeschlagen */ }
  }
  const deep = [...new Set([
    ...prelim.sort((a, b) => b.strength - a.strength).slice(0, CONFIG.signals.hot.deepScan).map((p) => p.c),
    ...CONFIG.watchlist.filter((c) => names.includes(c)),
  ])];
  log(`Stufe 2: ${deep.length} Märkte in allen Stilen`);
  const results = [];
  for (const c of deep) {
    try { results.push(await analyzeAllModes(c, true)); } catch { /* weiter */ }
  }
  return { results, prices: Object.fromEntries(Object.entries(ctx.ctx || {}).map(([k, v]) => [k, v.price])) };
}

async function main() {
  if (!TOKEN || !CHAT) throw new Error('TELEGRAM_TOKEN oder TELEGRAM_CHAT fehlt (GitHub Secrets prüfen)');
  const state = await loadState();
  const now = Date.now();

  // Risiko zuerst, das ist das Wichtigste
  let risk = null;
  try { risk = await checkAccount(); } catch (e) { log('Konto nicht geladen:', e.message); }
  const noCapital = !!risk?.checks.find((c) => c.rule === 'Freies Kapital' && c.status === 'bad');

  if (TEST_RUN === 'true') {
    const bad = badChecks(risk);
    await send(['✅ <b>Wolf Desk Wächter ist verbunden</b>',
      WALLET ? (risk ? `Konto gelesen: ${risk.positions.length} Positionen, ${Object.keys(bad).length} Regelverstöße.` : 'Konto konnte nicht gelesen werden.') : 'Keine Wallet hinterlegt, nur Signale.',
      `Signale ab Score ${CONFIG.alerts.minScore}, alle 15 Minuten.`].join('\n'));
    log('Testnachricht gesendet');
    return;
  }

  if (risk && CONFIG.alerts.risk) {
    const bad = badChecks(risk);
    if (state.bad) {
      const { added, solved } = riskDiff(state.bad, bad);
      if (added.length || solved.length) { await send(riskText(added, solved, bad, state.bad)); log(`Risiko: ${added.length} neu, ${solved.length} behoben`); }
    } else if (Object.keys(bad).length) {
      await send(riskText(Object.keys(bad), [], bad, {})); // erster Lauf: aktuellen Stand einmal melden
    }
    state.bad = bad;
  }

  const { results, prices } = await scan();
  const alerts = results
    .map((r) => ({ r, a: signalAlert(r, prices[r.coin], state.sent, now) }))
    .filter((x) => x.a)
    .sort((x, y) => heat(y.r) - heat(x.r))
    .slice(0, CONFIG.alerts.maxPerRun);
  for (const { r, a } of alerts) {
    await send(signalText(r, a, { noCapital }));
    state.sent[a.key] = now;
    log('Signal gemeldet:', a.key, a.score);
  }
  // Alte Einträge aufräumen (älter als 3 Tage)
  Object.keys(state.sent).forEach((k) => { if (now - state.sent[k] > 3 * 864e5) delete state.sent[k]; });
  await writeFile(STATE_FILE, JSON.stringify(state));
  log(`Fertig: ${results.length} geprüft, ${alerts.length} Signale gemeldet`);
}

main().catch(async (e) => {
  console.error('Fehler:', e.message);
  process.exitCode = 1;
});
