// Wolf Desk Wächter: läuft bei GitHub Actions alle 15 Minuten (siehe wolf-watch.yml).
// 1. Scannt Top 150 (oder deine handelbaren Märkte) + Watchlist mit derselben Signal-Logik wie die App und meldet starke Signale.
// 2. Prüft deine Positionen mit denselben Risiko-Regeln und meldet neue Regelverstöße (und Entwarnungen).
// Merkt sich zwischen den Läufen, was schon gemeldet wurde (Datei .watch-state.json, von GitHub zwischengespeichert).
// Geheim bleiben: TELEGRAM_TOKEN, TELEGRAM_CHAT, WALLET (als GitHub Secrets hinterlegt).
import { applyPrivate } from './core-settings.js';
import { readFile, writeFile } from 'node:fs/promises';
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { getCandles, getMarketCtx, analyzeAllModes, heat } from './core-scanner.js';
import { analyzeTimeframe, scoreTimeframe, closedCandles } from './core-signals.js';
import { scanUniverse } from './core-universe.js';
import { loadAccount } from './core-account.js';
import { accountRisk } from './core-positions.js';
import { signalAlert, badChecks, riskDiff, signalText, riskText, telegramView, journalEntry, judgeSignal, reportText, journalStats, linkTrades, executionStats, executionText, publicSignals, viewEventText, targetText, patienceText, cooldownText, blockReason, archiveEntries, mergeArchive } from './core-alerts.js';
import { cooldown } from './core-guard.js';
import { evaluatePatience, patienceStats } from './core-patience.js';
import { viewFor, alignment, viewEvents } from './core-views.js';
import { planFor, signalFor, targetsFor, targetHits } from './core-plans.js';
import { computeAutoPlan } from './core-autoplan.js';
import { tradeHistory, openTradeFor } from './core-trades.js';
import { trailStop, trailText, atrOf } from './core-trail.js';
import { setupTf } from './core-guard.js';
import * as fmt from './core-format.js';

const { TELEGRAM_TOKEN: TOKEN, TELEGRAM_CHAT: CHAT, TELEGRAM_CHANNEL: CHANNEL, WALLET, TEST_RUN } = process.env;
// Signale gehen in den Kanal (falls hinterlegt), Regelverstöße immer nur privat an dich
const STATE_FILE = '.watch-state.json';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function send(text, chat = CHAT) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram: ${j.description || res.status}`);
}

// 5d: Einschätzungen und Ziele kommen aus dem GitHub-Secret PRIVATE_SETTINGS (nicht aus dem öffentlichen my-settings.js)
const PRIVATE = applyPrivate(CONFIG, process.env.PRIVATE_SETTINGS);

async function loadState() {
  let st = {};
  try { st = JSON.parse(await readFile(STATE_FILE, 'utf8')); } catch { /* erster Lauf */ }
  return { sent: {}, bad: null, journal: [], lastDir: {}, lastReport: null, viewHits: {}, tpHits: {}, autoPlans: {}, trails: {}, cooldown: null, patience: {}, ...st };
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
  const uni = await scanUniverse(names, ctx.ctx, CONFIG.tradeable);
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
  return { results, prices: Object.fromEntries(Object.entries(ctx.ctx || {}).map(([k, v]) => [k, v.price])), volumes: ctx.map || {}, maxLevs: Object.fromEntries(Object.entries(ctx.ctx || {}).map(([k, v]) => [k, v.maxLev])) };
}

// Ohne hinterlegte Chat-ID: beim Bot nachsehen, wer ihm zuletzt geschrieben hat, und die ID dorthin schicken
async function findChat() {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram: ${j.description || res.status} (Token prüfen)`);
  const msg = [...(j.result || [])].reverse().find((u) => u.message?.chat?.id);
  if (!msg) throw new Error('Keine Nachricht an den Bot gefunden. Schreib deinem Bot in Telegram „hallo“ und starte den Test erneut.');
  return msg.message.chat.id;
}

// Kanäle, in denen der Bot Admin ist (aus den letzten 24 Std. an Telegram-Ereignissen)
async function findChannels() {
  const j = await (await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`)).json().catch(() => ({}));
  const found = new Map();
  (j.result || []).forEach((u) => {
    const c = u.channel_post?.chat || u.my_chat_member?.chat;
    if (c?.type === 'channel') found.set(c.id, c.title || String(c.id));
  });
  return [...found.entries()];
}

// Offene Tagebuch-Einträge mit den Kerzen seit der Meldung auswerten
async function updateJournal(state, now) {
  for (const [i, e] of state.journal.entries()) {
    if (e.status !== 'offen') continue;
    try {
      const tf = e.style === 'swing' ? '1h' : '15m';
      const raw = await hl.candles(e.coin, tf, e.at - 36e5, now);
      state.journal[i] = judgeSignal(e, closedCandles(raw, Infinity), now, CONFIG.alerts.journalDays?.[e.style] || 7);
    } catch (err) { log('Tagebuch', e.coin, err.message); }
  }
  // Aufräumen: ausgewertete Einträge nach 60 Tagen entfernen, höchstens 400 behalten
  state.journal = state.journal.filter((e) => e.status === 'offen' || now - e.at < 60 * 864e5).slice(-400);
  // Mit deinen echten Trades verbinden (nur mit hinterlegter Wallet)
  if (WALLET && state.journal.length) {
    try {
      const since = Math.min(...state.journal.map((e) => e.at)) - 7 * 864e5;
      const fills = await hl.fillsSince(WALLET, since);
      const linked = linkTrades(state.journal, fills);
      state.journal = linked.journal;
      state.own = linked.own.map((t) => ({ coin: t.coin, openedAt: t.openedAt, closedAt: t.closedAt, realized: t.realized }));
    } catch (err) { log('Trades verknüpfen:', err.message); }
  }
}

// Öffentliche Signal-Liste für die App (wird vom Zeitplan in den Zweig "signals" gelegt)
// Archiv (6a): bisheriges Archiv aus dem veröffentlichten Zweig holen (überlebt so auch einen verlorenen Zwischenspeicher),
// neue abgeschlossene Signale dazu, zusammen mit den letzten Signalen veröffentlichen
async function loadArchive() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return [];
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/signals/signals.json?t=${Date.now()}`);
    if (!res.ok) return [];
    return (await res.json()).archive || [];
  } catch { return []; }
}
async function publish(state) {
  if (!state.archiveLoaded) { state.archive = mergeArchive(await loadArchive(), state.archive || []); state.archiveLoaded = true; }
  state.archive = mergeArchive(state.archive, archiveEntries(state.journal));
  await writeFile('signals.json', JSON.stringify({ signals: publicSignals(state.journal), archive: state.archive }, null, 1));
}

// Ziele eines abgeschlossenen Trades für die Geduld-Auswertung: eigener Plan oder zugehöriges Signal
const patTargets = (state) => (t) => targetsFor({ plan: planFor(CONFIG.plans, t.coin, t.side, t.openedAt), signal: signalFor(state.journal, t.coin, t.side, t.openedAt) });

async function main() {
  if (!TOKEN) throw new Error('TELEGRAM_TOKEN fehlt (GitHub Secrets prüfen)');
  if (!CHAT) {
    const id = await findChat();
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: id, parse_mode: 'HTML', text: `👋 <b>Fast geschafft!</b>\nDeine Chat-ID ist:\n<code>${id}</code>\n\nTippe auf die Zahl, um sie zu kopieren, und trage sie bei GitHub als Secret <b>TELEGRAM_CHAT</b> ein. Danach den Test noch einmal starten.` }),
    });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) throw new Error(`Telegram: ${j.description || res.status}`);
    log('Chat-ID gefunden und an den Bot-Chat geschickt');
    return;
  }
  const state = await loadState();
  log(PRIVATE.ok ? (PRIVATE.empty ? 'Private Daten: keine (Secret PRIVATE_SETTINGS leer oder nicht gesetzt)' : `Private Daten: ${PRIVATE.views} Einschätzungen, ${PRIVATE.plans} Ziele`) : PRIVATE.error);
  const now = Date.now();

  // Risiko zuerst, das ist das Wichtigste
  let risk = null;
  try { risk = await checkAccount(); } catch (e) { log('Konto nicht geladen:', e.message); }
  const noCapital = !!risk?.checks.find((c) => c.rule === 'Freies Kapital' && c.status === 'bad');

  if (TEST_RUN === 'true') {
    const bad = badChecks(risk);
    if (CHANNEL) {
      await send('✅ <b>Wolf Desk Wächter</b> ist mit diesem Kanal verbunden. Hier erscheinen ab jetzt die Signale.', CHANNEL);
    } else {
      const ch = await findChannels().catch(() => []);
      if (ch.length) await send(['📣 <b>Kanal gefunden</b>', ...ch.map(([id, t]) => `${t}: <code>${id}</code>`),
        '', 'Tippe auf die Zahl, um sie zu kopieren, und trage sie bei GitHub als Secret <b>TELEGRAM_CHANNEL</b> ein.'].join('\n'));
    }
    await send(['✅ <b>Wolf Desk Wächter ist verbunden</b>',
      CHANNEL ? 'Signale gehen in deinen Kanal, Regelverstöße bleiben hier privat.' : 'Signale und Regelverstöße kommen hierher.',
      WALLET ? (risk ? `Konto gelesen: ${risk.positions.length} Positionen, ${Object.keys(bad).length} Regelverstöße.` : 'Konto konnte nicht gelesen werden.') : 'Keine Wallet hinterlegt, nur Signale.',
      `Signale ab Score ${CONFIG.alerts.minScore} (${CONFIG.alerts.styles.map((k) => CONFIG.signals.modes[k].label).join(' und ')}), alle 15 Minuten.`].join('\n'));
    if (state.journal.length) {
      await updateJournal(state, now);
      await send(reportText(state.journal, 'bisher') + executionText(executionStats(state.journal, state.own || [])));
      await writeFile(STATE_FILE, JSON.stringify(state));
    } else await send('📒 <b>Signal-Tagebuch</b> ist bereit. Ab jetzt wird jedes gemeldete Signal mitgeschrieben und ausgewertet.');
    await publish(state);
    log('Testnachricht gesendet');
    return;
  }

  if (risk && CONFIG.alerts.risk) {
    const bad = badChecks(risk), warn = badChecks(risk, 'warn');
    if (state.bad) {
      const { added, solved, active } = riskDiff(state.bad, bad, warn);
      if (added.length || solved.length) { await send(riskText(added, solved, bad, state.bad)); log(`Risiko: ${added.length} neu, ${solved.length} behoben`); }
      state.bad = active;
    } else {
      if (Object.keys(bad).length) await send(riskText(Object.keys(bad), [], bad, {})); // erster Lauf: aktuellen Stand einmal melden
      state.bad = bad;
    }
  }

  await updateJournal(state, now);

  const { results, prices, volumes, maxLevs } = await scan();
  const openCoins = (risk?.positions || []).map((p) => p.coin);
  const alerts = results
    .map((r0) => telegramView(r0))
    .filter(Boolean)
    .map((r) => ({ r, a: signalAlert(r, prices[r.coin], state.sent, now, CONFIG.alerts, { volume: volumes[r.coin], lastDir: state.lastDir }) }))
    .filter((x) => x.a)
    .filter((x) => { const why = blockReason(x.r.coin, openCoins, state.journal); if (why) log('Kein Signal für', x.r.coin + ':', why); return !why; })
    .sort((x, y) => heat(y.r) - heat(x.r))
    .slice(0, CONFIG.alerts.maxPerRun);
  for (const { r, a } of alerts) {
    const al = alignment(viewFor(CONFIG.views, r.coin, now), r.dir);
    state.sigNo = (state.sigNo || 0) + 1; // fortlaufende Signal-Nummer (#WD-0001 …)
    await send(signalText(r, a, { noCapital, star: al === 'mit', id: state.sigNo, exchangeMax: maxLevs?.[r.coin] }), CHANNEL || CHAT);
    state.sent[a.key] = now;
    state.lastDir[r.coin] = { dir: r.dir, at: now };
    state.journal.push({ ...journalEntry(r, a, now, al), id: state.sigNo });
    log('Signal gemeldet:', a.key, a.score);
  }
  // Deine Trades der letzten 60 Tage (für Abkühlphase, Ziele und Geduld)
  let myTrades = [];
  if (WALLET) { try { myTrades = tradeHistory(await hl.fillsSince(WALLET, now - 60 * 864e5)); } catch (err) { log('Trades laden:', err.message); } }

  // Abkühlphase nach Verlustserie → privat an dich (Beginn und Ende je einmal)
  const cd = cooldown(myTrades, now);
  if (cd.active && state.cooldown?.until !== cd.until) {
    await send(cooldownText(cd, CONFIG.guard.cooldownHours));
    state.cooldown = { until: cd.until, ended: false };
  } else if (!cd.active && state.cooldown && !state.cooldown.ended && now >= state.cooldown.until) {
    await send('✅ <b>Abkühlphase vorbei.</b> Wieder normales Risiko, weiterhin nur saubere Setups.');
    state.cooldown.ended = true;
  }

  // Ziele deiner offenen Positionen (eigener Plan oder zugehöriges Signal) → privat an dich
  if (risk?.positions?.length) {
    try {
      const trades = myTrades;
      const n = CONFIG.exitPlan.filter((x) => /^TP\d/.test(x.label) && x.pct > 0).length;
      for (const p of risk.positions) {
        const t = openTradeFor(trades, p.coin);
        const plan = planFor(CONFIG.plans, p.coin, p.side, t?.openedAt);
        const signal = signalFor(state.journal, p.coin, p.side, t?.openedAt);
        // Ohne eigenen Plan und ohne Signal: automatischer Plan (einmal berechnen, dann gemerkt)
        let auto = null;
        if (!plan && !signal && t?.openedAt && !t.partial) {
          const k = `${p.coin}|${t.openedAt}|${CONFIG.positions?.autoStyle || 'swing'}`;
          auto = state.autoPlans[k] || null;
          if (!auto) { auto = await computeAutoPlan(p.coin, p.side, p.entry, t.openedAt).catch(() => null); if (auto) state.autoPlans[k] = auto; }
        }
        const targets = targetsFor({ plan, signal, auto });
        if (!targets) continue;
        const tps = targets.tps.slice(0, n);
        const key = t?.openedAt || plan?.at || signal?.at;
        const mark = prices[p.coin] || p.mark;
        const hits = targetHits(p.coin, p.side, tps, mark, key, state.tpHits);
        // Nachzieh-Vorschlag (Struktur ab TP1, spätestens ab TP2 Einstieg + Gebühren)
        const reached = tps.filter((x, i) => state.tpHits[`${p.coin}|${key}|tp${i + 1}`] || (p.side === 'long' ? mark >= x : mark <= x)).length;
        let trail = null;
        if (reached) {
          const tf = setupTf(signal?.style || CONFIG.positions?.autoStyle || 'swing');
          const cs = await getCandles(p.coin, tf, true).catch(() => null);
          trail = trailStop({ side: p.side, entry: p.entry, stop: p.stop, mark, hits: reached, candles: cs, atrValue: atrOf(cs), openedAt: t?.openedAt || 0 });
          if (trail) trail.tf = tf;
        }
        const tKey = `${p.coin}|${key}`, last = state.trails[tKey];
        const newTrail = trail && (!last || (trail.stop - last.stop) * (p.side === 'long' ? 1 : -1) > p.entry * 0.005); // erst ab 0,5 % Verbesserung erneut melden
        if (hits.length) {
          await send(targetText(p.coin, hits, tps.length, CONFIG.exitPlan, trail ? trailText(trail, trail.tf, fmt.price) : ''));
          hits.forEach((h) => { state.tpHits[h.key] = now; });
          if (trail) state.trails[tKey] = { stop: trail.stop, at: now };
        } else if (newTrail) {
          await send(`↗ <b>${p.coin.replace(/^[a-z]+:/, '')}</b>: ${trailText(trail, trail.tf, fmt.price)}.`);
          state.trails[tKey] = { stop: trail.stop, at: now };
        }
      }
    } catch (err) { log('Ziele prüfen:', err.message); }
  }
  Object.keys(state.tpHits).forEach((k) => { if (now - state.tpHits[k] > 60 * 864e5) delete state.tpHits[k]; });
  Object.keys(state.trails).forEach((k) => { if (now - state.trails[k].at > 60 * 864e5) delete state.trails[k]; });
  Object.keys(state.autoPlans).forEach((k) => { if (now - state.autoPlans[k].at > 60 * 864e5) delete state.autoPlans[k]; });

  // Deine Marken: Bruch, Bestätigung oder Ziel erreicht → privat an dich
  for (const [coin, v] of Object.entries(CONFIG.views || {})) {
    if (!viewFor(CONFIG.views, coin, now)) continue;
    for (const ev of viewEvents(coin, v, prices[coin], state.viewHits)) {
      await send(viewEventText(coin, v, ev, prices[coin]));
      state.viewHits[ev.key] = now;
    }
  }
  Object.keys(state.viewHits).forEach((k) => { if (now - state.viewHits[k] > 120 * 864e5) delete state.viewHits[k]; });

  // Auswertung alle reportDays Tage privat an dich
  const every = (CONFIG.alerts.reportDays || 7) * 864e5;
  if (!state.lastReport) state.lastReport = now;
  else if (now - state.lastReport >= every) {
    const period = state.journal.filter((e) => e.status === 'offen' || (e.doneAt || e.at) >= state.lastReport);
    const ownPeriod = (state.own || []).filter((t) => t.closedAt >= state.lastReport);
    const pat = await evaluatePatience(myTrades, { cache: state.patience, getTargets: patTargets(state), now }).catch(() => []);
    await send(reportText(period, `letzte ${CONFIG.alerts.reportDays || 7} Tage`) + executionText(executionStats(period, ownPeriod)) + patienceText(patienceStats(pat)));
    state.lastReport = now;
  }
  Object.keys(state.lastDir).forEach((k) => { if (now - state.lastDir[k].at > 3 * 864e5) delete state.lastDir[k]; });

  // Alte Einträge aufräumen (älter als 3 Tage)
  Object.keys(state.sent).forEach((k) => { if (now - state.sent[k] > 3 * 864e5) delete state.sent[k]; });
  await writeFile(STATE_FILE, JSON.stringify(state));
  await publish(state);
  log(`Fertig: ${results.length} geprüft, ${alerts.length} Signale gemeldet, Tagebuch: ${journalStats(state.journal).open} offen`);
}

main().catch(async (e) => {
  console.error('Fehler:', e.message);
  process.exitCode = 1;
});
