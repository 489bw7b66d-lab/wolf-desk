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
import { measureSignal, measureDue, withMeasure } from './core-journalmeasure.js';
import { BM, bmState, bmResult, bmAlert, bmStrength, splitByEngine, journalWindow } from './core-benchmark.js';
import { bmSignalText } from './core-bmtext.js';
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
// 8r „Umstellen“: Beobachtungen aus dem Setup-Finder, Zeit-Ausstieg, Bias-Wechsel
import { trendNow, liveMarket, coinEntry, FINDER } from './core-finder.js';
import { buildIndex, marketBias, tachoFrom } from './core-index.js';
import { OBS, obsFresh, obsKey, obsResult, obsText, timeExitDue, timeExitText, biasSide, biasTurn, biasTurnText } from './core-observe.js';

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
  const prelim = [], bm = [], dailyAll = {}, up = [];
  const observe = !!CONFIG.alerts.observe; // 8r: Beobachtungen aus dem Setup-Finder statt Maßstab-Signale
  const useBm = !observe && !!CONFIG.alerts.benchmark; // 8b: Signale nach dem Maßstab („neu im Trend“) statt nach der alten Engine
  for (const c of coins) {
    try {
      const candles = await getCandles(c, '1d', true);
      dailyAll[c] = candles;
      if (observe) { if (trendNow(candles)) up.push(c); continue; }
      if (useBm) {
        // Nur Märkte, die jetzt die Bedingung erfüllen (Aufwärtstrend und Kurs über der Tages-EMA 20), brauchen die
        // 4H-Kerzen für den Wechsel. Das hält die Zahl der Abrufe je Lauf klein.
        const st = bmState(candles, ctx.ctx?.[c]?.price || candles.at(-1)?.c);
        if (st?.ok) { const r = bmResult(c, candles, await getCandles(c, BM().setupTf, true)); if (r.flip) bm.push(r); }
        continue;
      }
      if (candles.length >= 60) {
        const a = analyzeTimeframe(candles, '1d'), s = scoreTimeframe(a);
        prelim.push({ c, strength: Math.max(s.long, s.short) + a.events.filter((e) => e.strong).length * 10 });
      }
    } catch { /* einzelner Markt fehlgeschlagen */ }
  }
  const deep = [...new Set([
    ...prelim.sort((a, b) => b.strength - a.strength).slice(0, CONFIG.signals.hot.deepScan).map((p) => p.c),
    ...CONFIG.watchlist.filter((c) => names.includes(c)),
  ])].filter(() => !useBm && !observe);
  if (observe) log(`Beobachtung: ${up.length} Märkte im Tagestrend aufwärts`);
  else if (useBm) log(`Maßstab: ${bm.length} Märkte neu im Trend`);
  else log(`Stufe 2: ${deep.length} Märkte in allen Stilen`);
  const results = [];
  for (const c of deep) {
    try { results.push(await analyzeAllModes(c, true)); } catch { /* weiter */ }
  }
  return { results, bm, dailyAll, up, prices: Object.fromEntries(Object.entries(ctx.ctx || {}).map(([k, v]) => [k, v.price])), volumes: ctx.map || {}, maxLevs: Object.fromEntries(Object.entries(ctx.ctx || {}).map(([k, v]) => [k, v.maxLev])) };
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
    // 8a: Abgeschlossene Signale werden nicht neu bewertet, aber weiter vermessen (Zone erreicht, Lauf ins Plus/Minus),
    // bis ihr Fenster zu ist. Das ändert kein Signal und kein Ergebnis, es kommen nur Messwerte dazu.
    const open = e.status === 'offen';
    if (!open && !measureDue(e, now)) continue;
    try {
      const tf = e.style === 'swing' ? '1h' : '15m';
      const days = journalWindow(e); // 8c: Maßstab-Signale 10 Tage (Zeit-Ausstieg des Backtests), alte Engine wie bisher
      const raw = await hl.candles(e.coin, tf, e.at - 36e5, open ? now : Math.min(now, e.at + days * 864e5 + 36e5));
      const candles = closedCandles(raw, Infinity);
      const judged = open ? judgeSignal(e, candles, now, days) : e;
      state.journal[i] = { ...judged, m: measureSignal(judged, candles, now, days) };
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
  state.archive = mergeArchive(state.archive, withMeasure(archiveEntries(state.journal), state.journal));
  const engOf = new Map(state.journal.filter((e) => e.eng).map((e) => [`${e.coin}|${e.dir}|${e.at}`, e.eng]));
  const signals = publicSignals(state.journal).map((x) => (engOf.has(`${x.coin}|${x.dir}|${x.at}`) ? { ...x, eng: engOf.get(`${x.coin}|${x.dir}|${x.at}`) } : x));
  await writeFile('signals.json', JSON.stringify({ signals, archive: state.archive }, null, 1));
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
      CONFIG.alerts.observe ? 'Beobachtungen aus dem Setup-Finder: ab 2 Bausteinen, frisch auf der letzten 4H-Kerze, nur im Tagestrend aufwärts. Dazu privat: Zeit-Ausstieg nach 10 Tagen und Wechsel des Markt-Bias bei offener Position.'
        : CONFIG.alerts.benchmark ? 'Signale nach dem Maßstab (Trendfolge, „neu im Trend“ auf 4H), nur Long, alle 15 Minuten.'
        : `Signale ab Score ${CONFIG.alerts.minScore} (${CONFIG.alerts.styles.map((k) => CONFIG.signals.modes[k].label).join(' und ')}), alle 15 Minuten.`].join('\n'));
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

  const { results, bm = [], dailyAll = {}, up = [], prices, volumes, maxLevs } = await scan();
  const observe = !!CONFIG.alerts.observe;
  const useBm = !observe && !!CONFIG.alerts.benchmark;

  // 8r: Markt-Bias aus dem eigenen Index (dieselben Tageskerzen, kein Abruf mehr)
  let bias = null, tacho = null;
  try {
    let btc = dailyAll.BTC || null;
    if (!btc) btc = await getCandles('BTC', '1d', true).catch(() => null);
    const idx = buildIndex(dailyAll);
    if (idx.alt.length) { bias = marketBias(btc, idx); tacho = tachoFrom(bias); }
    log('Markt-Bias:', tacho ? `${tacho.label} (${tacho.value})` : 'unbekannt');
  } catch (err) { log('Markt-Bias:', err.message); }
  const openCoins = (risk?.positions || []).map((p) => p.coin);
  const alerts = useBm ? bm
    .map((r) => ({ r, a: bmAlert(r, prices[r.coin], state.sent, now, CONFIG.alerts, { volume: volumes[r.coin] }) }))
    .filter((x) => x.a)
    .filter((x) => { const why = blockReason(x.r.coin, openCoins, state.journal); if (why) log('Kein Signal für', x.r.coin + ':', why); return !why; })
    .sort((x, y) => bmStrength(y.r) - bmStrength(x.r))
    .slice(0, CONFIG.alerts.maxPerRun)
  : results
    .map((r0) => telegramView(r0))
    .filter(Boolean)
    .map((r) => ({ r, a: signalAlert(r, prices[r.coin], state.sent, now, CONFIG.alerts, { volume: volumes[r.coin], lastDir: state.lastDir }) }))
    .filter((x) => x.a)
    .filter((x) => { const why = blockReason(x.r.coin, openCoins, state.journal); if (why) log('Kein Signal für', x.r.coin + ':', why); return !why; })
    .sort((x, y) => heat(y.r) - heat(x.r))
    .slice(0, CONFIG.alerts.maxPerRun);
  // 8r: Beobachtungen. Nur einmal je neuer 4H-Kerze (die Bausteine ändern sich nur dann), nur Märkte im Tagestrend aufwärts.
  const obs = [];
  if (observe) {
    const H4 = 4 * 36e5, slot = Math.floor(now / H4) * H4;
    if (state.obsAt !== slot) {
      let checked = 0;
      for (const c of up) {
        try {
          await new Promise((res) => setTimeout(res, CONFIG.signals.hot.requestGapMs));
          const t = Date.now(), h4 = closedCandles(await hl.candles(c, '4h', t - FINDER.h4Days * 864e5, t), t);
          if (h4.length < 200) continue;
          checked++;
          const e = coinEntry(c, liveMarket(c, dailyAll[c], h4), null, prices[c]);
          if (!obsFresh(e)) continue;
          const key = obsKey(c, h4.at(-1).t);
          if (state.sent[key]) continue;
          if (volumes[c] != null && CONFIG.alerts.minVolumeUsd && volumes[c] < CONFIG.alerts.minVolumeUsd) continue;
          const why = blockReason(c, openCoins, state.journal);
          if (why) { log('Keine Beobachtung für', c + ':', why); continue; }
          const r = obsResult(e, prices[c]);
          if (r) obs.push({ e, r, key });
        } catch (err) { log('Beobachtung', c, err.message); }
      }
      state.obsAt = slot;
      log(`Beobachtung: ${checked} Märkte geprüft, ${obs.length} mit frischem Baustein und mindestens ${OBS.minBlocks} Bausteinen`);
    }
    obs.sort((x, y) => y.e.n - x.e.n || (x.e.coin < y.e.coin ? -1 : 1));
    for (const { e, r, key } of obs.slice(0, CONFIG.alerts.maxPerRun)) {
      state.sigNo = (state.sigNo || 0) + 1;
      await send(obsText(e, r, { bias, id: state.sigNo }), CHANNEL || CHAT);
      state.sent[key] = now;
      // Tagebuch schreibt still mit, welche Bausteine beteiligt waren (eng = 'obs'), und vermisst wie bisher
      state.journal.push({ ...journalEntry(r, { score: null, pos: { state: 'zone' }, price: r.plan.entry }, now, alignment(viewFor(CONFIG.views, r.coin, now), 'long')), id: state.sigNo, eng: 'obs', blocks: e.finds.map((x) => x.rule) });
      log('Beobachtung gemeldet:', e.coin, e.n, 'Bausteine');
    }
  }

  for (const { r, a } of alerts) {
    const al = alignment(viewFor(CONFIG.views, r.coin, now), r.dir);
    state.sigNo = (state.sigNo || 0) + 1; // fortlaufende Signal-Nummer (#WD-0001 …)
    await send((useBm ? bmSignalText : signalText)(r, a, { noCapital, star: al === 'mit', id: state.sigNo, exchangeMax: maxLevs?.[r.coin] }), CHANNEL || CHAT);
    state.sent[a.key] = now;
    state.lastDir[r.coin] = { dir: r.dir, at: now };
    // Versionsschnitt im Tagebuch: eng = 'bm' kennzeichnet Maßstab-Signale, alles ohne Kennzeichen ist die alte Engine
    state.journal.push({ ...journalEntry(r, a, now, al), id: state.sigNo, ...(useBm ? { eng: 'bm' } : {}) });
    log('Signal gemeldet:', a.key, useBm ? 'Maßstab' : a.score);
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

  // 8r: Zeit-Ausstieg → privat an dich (einmal je Trade, nach holdDays Tagen)
  if (risk?.positions?.length) {
    state.timeHits = state.timeHits || {};
    for (const x of timeExitDue(risk.positions, myTrades, state.timeHits, now, BM().holdDays || OBS.holdDays)) {
      try { await send(timeExitText(x, BM().holdDays || OBS.holdDays)); state.timeHits[x.key] = now; } catch (err) { log('Zeit-Ausstieg:', err.message); }
    }
  }
  Object.keys(state.timeHits || {}).forEach((k) => { if (now - state.timeHits[k] > 60 * 864e5) delete state.timeHits[k]; });

  // 8r: Markt-Bias dreht, während eine Position offen ist → privat an dich
  if (tacho) {
    const turn = biasTurn(state.biasSide, tacho);
    if (turn && risk?.positions?.length) { try { await send(biasTurnText(turn, tacho, bias, risk.positions)); } catch (err) { log('Bias-Wechsel:', err.message); } }
    state.biasSide = biasSide(tacho);
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
    // 8b: Maßstab-Signale und Signale der alten Engine getrennt auswerten (Versionsschnitt)
    const days = `letzte ${CONFIG.alerts.reportDays || 7} Tage`, parts = splitByEngine(period);
    const groups = [[parts.obs, 'Beobachtungen'], [parts.bm, 'Maßstab'], [parts.alt, 'alte Engine']].filter(([l]) => l.length);
    const head = groups.length > 1 ? groups.map(([l, n]) => reportText(l, `${days} · ${n}`)).join('\n\n') : reportText(period, groups.length ? `${days} · ${groups[0][1]}` : days);
    await send(head + executionText(executionStats(period, ownPeriod)) + patienceText(patienceStats(pat)));
    state.lastReport = now;
  }
  Object.keys(state.lastDir).forEach((k) => { if (now - state.lastDir[k].at > 3 * 864e5) delete state.lastDir[k]; });

  // Alte Einträge aufräumen (älter als 3 Tage)
  Object.keys(state.sent).forEach((k) => { if (now - state.sent[k] > 3 * 864e5) delete state.sent[k]; });
  await writeFile(STATE_FILE, JSON.stringify(state));
  await publish(state);
  log(`Fertig: ${observe ? obs.length + ' Beobachtungen' : useBm ? bm.length + ' neu im Trend' : results.length + ' geprüft'}, ${alerts.length} Signale gemeldet, Tagebuch: ${journalStats(state.journal).open} offen`);
}

main().catch(async (e) => {
  console.error('Fehler:', e.message);
  process.exitCode = 1;
});
