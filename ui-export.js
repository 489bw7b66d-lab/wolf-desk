// Export „Daten für Claude“ (5c): eine lesbare Textdatei (Markdown) mit allem, was wir für Auswertungen brauchen,
// statt vieler Screenshots. Enthält Beträge (nur für dich und Claude gedacht), keine Wallet-Adresse, keine Zugangsdaten.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { enrichPositions } from './core-positions.js';
import { honestSplit, lifePnlOf, dayPnlOf } from './core-performance.js';
import { tradeHistory, tradeStats } from './core-trades.js';
import { measureStats } from './core-journalmeasure.js';
import { currentValues, diffFromRecommended } from './core-settings.js';
import { getTradeable } from './core-tradeable.js';
import { getWatchlist } from './core-watchlist.js';
import { summarize, compareTrail, splitPeriods, byRegime } from './core-backtest.js';
import { compareRegime } from './core-regime.js';
import { compareExits } from './core-exitcompare.js';
import { paretoShare, avgHoldDays } from './core-btmetrics.js';
import { randomSummary } from './core-randombase.js';
import { compareGate } from './core-trendgate.js';
import { getFeedSignals, getArchive } from './ui-feed.js';

const BT_KEY = 'wolfdesk.btlast';
const n2 = (v, d = 2) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(d));
const r2 = (v) => (v == null || !Number.isFinite(v) ? '–' : (v > 0 ? '+' : '') + v.toFixed(2) + 'R');
const pc = (v) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(0) + ' %');

// ---- Backtest: kompakte Zusammenfassung merken (je Stil), damit der Export auch nach einem Neustart geht ----
export function btDigest(last, style) {
  const t = last?.trades || [];
  const sm = summarize(t);
  const byCoin = {};
  t.forEach((x) => { (byCoin[x.coin] ||= []).push(x); });
  const perMarket = Object.entries(byCoin).map(([coin, l]) => ({ coin, n: l.length, win: (l.filter((x) => x.r > 0).length / l.length) * 100, avgR: l.reduce((s, x) => s + x.r, 0) / l.length }))
    .sort((a, b) => b.avgR - a.avgR);
  const { curve, ...rest } = sm; // Verlauf weglassen (zu lang)
  // 8b1: beide Zeiträume (Entwicklung = erste zwei Drittel, Bestätigung = letztes Drittel) gehören in den Export
  const sp = last?.from != null && last?.to != null ? splitPeriods(t, last.from, last.to) : null;
  const periods = sp ? { dev: { n: sp.dev.n, avgR: sp.dev.avgR, sum: sp.dev.sum }, conf: { n: sp.conf.n, avgR: sp.conf.avgR, sum: sp.conf.sum } } : null;
  // 8c: Marktphasen-Schalter, Ausstiegs-Vergleich und die ADX-Tabelle gehören auch in den Export
  const slim = (x) => (x ? { n: x.n, avgR: x.avgR, sum: x.sum, winRate: x.winRate } : null);
  const rows = (g) => (g ? g.rows.map((x) => ({ key: x.key, ...slim(x), dev: slim(x.dev), conf: slim(x.conf) })) : null);
  const rg = sp ? compareRegime(t, last.from, last.to) : null, exg = sp ? compareExits(t, last.from, last.to) : null;
  const adxT = t.length ? byRegime(t) : null;
  const par = paretoShare(t);
  const rs = last?.rnd ? randomSummary(last.rnd) : null; // 8f: Zufalls-Maßstab
  return { style, label: last?.label, at: last?.at || Date.now(), periods, random: rs, pareto: par ? { pct: par.pct, k: par.k } : null, holdDays: avgHoldDays(t), fundingPctDay: last?.fundingPctDay ?? null,
    regime: rg ? { rows: rows(rg), unknown: rg.unknown } : null, exits: exg ? { rows: rows(exg), n: exg.n, skipped: exg.skipped } : null,
    adx: adxT && (adxT.side.n || adxT.mid.n || adxT.trend.n) ? { side: slim(adxT.side), mid: slim(adxT.mid), trend: slim(adxT.trend) } : null, summary: rest, gate: t.length ? compareGate(t) : [], trail: compareTrail(t), perMarket, missed: last?.missed ?? 0,
    complete: last?.complete !== false, done: last?.done ?? null, total: last?.total ?? null };
}
export function saveBacktest(last, style, store = globalThis.localStorage) {
  try {
    const all = JSON.parse(store?.getItem(BT_KEY) || '{}');
    all[style] = btDigest(last, style);
    store?.setItem(BT_KEY, JSON.stringify(all));
  } catch { /* egal */ }
}
const loadBacktests = (store = globalThis.localStorage) => { try { return JSON.parse(store?.getItem(BT_KEY) || '{}'); } catch { return {}; } };

function btText(d) {
  const s = d.summary || {};
  const L = [];
  L.push(`### ${d.label || d.style} (gerechnet ${new Date(d.at).toLocaleString('de-DE')}${d.total ? ` · ${d.complete ? 'vollständig' : 'abgebrochen bei'} ${d.done}/${d.total}` : ''})`);
  L.push(`Trades ${s.n ?? 0} · Gewinn-Trades ${pc(s.winRate)}${String(d.style).endsWith(':dc') ? '' : ` · TP1 erreicht ${pc(s.tp1Rate)}`} · Ø ${r2(s.avgR)} · Summe ${r2(s.totalR)} · Profit-Faktor ${n2(s.profitFactor)} · größter Rückgang ${n2(s.maxDdR, 1)}R · ohne Einstieg ${d.missed}`);
  if (d.random?.all) { const sp = (x) => (x ? `Ø ${r2(x.mean)} (Spanne ${r2(x.min)} bis ${r2(x.max)}, ${Math.round(x.n)} Trades je Durchgang)` : '–'); L.push(`Zufalls-Maßstab, ${d.random.draws} Durchgänge: gesamt ${sp(d.random.all)} · Entwicklung ${sp(d.random.dev)} · Bestätigung ${sp(d.random.conf)}. Die übrigen Zeilen dieses Laufs zeigen nur den ersten Durchgang.`); }
  L.push(`Gewinn aus den besten 15 % der Trades: ${d.pareto ? pc(d.pareto.pct) + ` (${d.pareto.k} Trades)` : '–'} · Ø Haltedauer ${d.holdDays == null ? '–' : n2(d.holdDays, 1) + ' Tage'} · Funding ${d.fundingPctDay > 0 ? `eingerechnet (Schätzung ${String(d.fundingPctDay).replace('.', ',')} % je Tag für Longs)` : 'nicht eingerechnet (Lauf von vor 8d)'}`);
  if (d.periods) L.push(`Zeiträume: Entwicklung ${d.periods.dev.n} Trades, Ø ${r2(d.periods.dev.avgR)}, Summe ${r2(d.periods.dev.sum)} · Bestätigung ${d.periods.conf.n} Trades, Ø ${r2(d.periods.conf.avgR)}, Summe ${r2(d.periods.conf.sum)}`);
  const RN = { all: 'alle', trend: 'nur BTC im Trend', above: 'nur BTC über EMA 100' }, EN = { plan: 'heutiger Plan', be: 'nach TP1 Stop auf Einstieg', r1: 'TP1 bei 1R, dann Einstieg' };
  if (d.regime?.rows) L.push('Marktphasen-Schalter (Trades, Ø R, Entwicklung, Bestätigung): ' + d.regime.rows.map((x) => `${RN[x.key]} ${x.n}, ${r2(x.avgR)}, ${r2(x.dev?.avgR)} (${x.dev?.n ?? 0}), ${r2(x.conf?.avgR)} (${x.conf?.n ?? 0})`).join(' · ') + (d.regime.unknown ? ` · ohne BTC-Daten ${d.regime.unknown}` : ''));
  if (d.exits?.rows) L.push(`Ausstiegs-Vergleich über ${d.exits.n} Trades (Treffer, Ø R, Entwicklung, Bestätigung): ` + d.exits.rows.map((x) => `${EN[x.key]} ${pc(x.winRate)}, ${r2(x.avgR)}, ${r2(x.dev?.avgR)}, ${r2(x.conf?.avgR)}`).join(' · ') + (d.exits.skipped ? ` · nicht vergleichbar ${d.exits.skipped}` : ''));
  if (d.adx) L.push(`Tages-ADX beim Einstieg: seitwärts <20 ${d.adx.side.n} (Ø ${r2(d.adx.side.avgR)}) · Übergang ${d.adx.mid.n} (Ø ${r2(d.adx.mid.avgR)}) · Trend >25 ${d.adx.trend.n} (Ø ${r2(d.adx.trend.avgR)})`);
  if (s.long) L.push(`Long ${s.long.n} (${pc(s.long.winRate)}, Ø ${r2(s.long.avgR)}) · Short ${s.short.n} (${pc(s.short.winRate)}, Ø ${r2(s.short.avgR)})`);
  if (s.seal) L.push(`Mit Siegel ${s.seal.with.n} (Ø ${r2(s.seal.with.avgR)}) · ohne Siegel ${s.seal.without.n} (Ø ${r2(s.seal.without.avgR)})`);
  if (s.byScore?.length) L.push('Score: ' + s.byScore.map((b) => `${b.label} ${b.n} (${pc(b.winRate)}, Ø ${r2(b.avgR)})`).join(' · '));
  if (d.gate?.length) L.push('Short-Filter: ' + d.gate.map((g) => `${g.key} ${g.shorts} Shorts, Ø Short ${r2(g.shortAvg)}, Summe ${r2(g.total)}`).join(' · '));
  if (d.trail) L.push(`Nachziehen: Plan ${r2(d.trail.plan)} · Struktur ${r2(d.trail.struct)} (besser ${d.trail.better}, schlechter ${d.trail.worse})`);
  if (s.byEvent?.length) {
    L.push('Ereignisse (Trades, Ø R, Vorteil):');
    s.byEvent.forEach((e) => L.push(`- ${e.name}: ${e.n}, ${r2(e.avgR)}, ${r2(e.edge)}`));
  }
  if (d.perMarket?.length) L.push('Nach Markt (Trades/Gewinn/Ø R): ' + d.perMarket.map((m) => `${m.coin} ${m.n}/${pc(m.win)}/${r2(m.avgR)}`).join(' · '));
  return L.join('\n');
}

// ---- Einzel-Trades (8a): eine Zeile je Trade, neueste zuerst, höchstens 150 ----
export function tradeList(trades, max = 150) {
  const l = [...(trades || [])].sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0)).slice(0, max);
  if (!l.length) return '';
  const iso = (t) => (t ? new Date(t).toISOString().slice(0, 16) : '');
  const px = (v) => (v == null || !Number.isFinite(v) ? '' : String(Number(v.toPrecision(6))));
  const rows = l.map((t) => {
    const ex = t.exits || [];
    const sz = ex.reduce((s, x) => s + (x.sz || 0), 0);
    const exitAvg = sz > 0 ? ex.reduce((s, x) => s + x.px * x.sz, 0) / sz : null;
    return [iso(t.openedAt), t.closedAt ? iso(t.closedAt) : 'offen', t.closedAt && t.openedAt ? ((t.closedAt - t.openedAt) / 36e5).toFixed(1) : '',
      t.coin, t.side, px(t.entryAvg), px(exitAvg), ex.length, t.soldPct == null ? '' : Math.round(t.soldPct), n2(t.realized), n2(t.fees), t.partial ? 'ja' : ''].join(';');
  });
  return ['## Einzel-Trades', '```', 'Auf;Zu;Std;Coin;Richtung;Einstieg;AusstiegSchnitt;Teilverkäufe;VerkauftPct;Ergebnis$;Gebühren$;AnfangFehlt', ...rows, '```'].join('\n');
}

// ---- Der ganze Bericht ----
export function buildReport(s = {}, now = Date.now(), store = globalThis.localStorage) {
  const L = [];
  const ver = globalThis.document?.querySelector('meta[name="app-version"]')?.content || '?';
  L.push(`# Wolf Desk – Daten für Claude`, `Stand ${new Date(now).toLocaleString('de-DE')} · App-Version ${ver}`, '');

  // Einstellungen (nur Abweichungen von der Empfehlung)
  let diff = {};
  try { diff = diffFromRecommended(currentValues()); } catch { /* egal */ }
  L.push('## Einstellungen (Abweichungen)', Object.keys(diff).length ? Object.entries(diff).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n') : '- keine', `- Short-Filter: ${CONFIG.signals.shortFilter}`, `- Handelbare Märkte: ${getTradeable().length} · Watchlist: ${getWatchlist().join(', ')}`, '');

  // Konto
  const sum = s.account ? accountSummary(s.account, CONFIG.accountMode) : null;
  if (sum) {
    const upnl = (s.account.positions || []).reduce((n, p) => n + (p.upnl || 0), 0);
    const hs = honestSplit(sum.equity, lifePnlOf(s.portfolio), upnl, CONFIG.startCapital);
    L.push('## Konto', `Kontowert ${n2(sum.equity)} $ · verfügbar ${n2(sum.available)} $ · in Positionen ${n2(sum.inPositions)} $ · offen ${n2(upnl)} $ · heute ${n2(dayPnlOf(s.portfolio))} $`);
    if (hs) L.push(`Gewinn gesamt ${n2(hs.total)} $ (${n2(hs.pct, 1)} %, Quelle ${hs.source === 'hl' ? 'Hyperliquid-Verlauf' : 'Startkapital'}) · realisiert ${n2(hs.realized)} $`);
    L.push('');
    // Positionen mit Regel-Prüfung
    let ps = [];
    try { ps = enrichPositions(s, now) || []; } catch { ps = s.account.positions || []; }
    L.push('## Offene Positionen');
    if (!ps.length) L.push('- keine');
    ps.forEach((p) => {
      L.push(`- ${p.coin} ${p.side} ${p.leverage}× ${p.leverageType || ''}: Einstieg ${p.entry}, Kurs ${p.mark ?? '–'}, Stop ${p.stop ?? 'keiner'}, Liq ${p.liq ?? '–'}, PnL ${n2(p.upnl)} $, Margin ${n2(p.marginUsed)} $`);
      (p.evaluation?.checks || []).filter((c) => c.status !== 'ok').forEach((c) => L.push(`  - ${c.status === 'bad' ? 'Verstoß' : 'Warnung'} ${c.rule}: ${c.text}`));
    });
    L.push('');
  }

  // Eigene Trades (Statistik)
  try {
    const st = tradeStats(tradeHistory(s.fills));
    if (st) L.push('## Eigene Trades', '```', JSON.stringify(st, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)), '```', '');
  } catch { /* egal */ }
  // 8a: jeder Trade einzeln, damit sich Signale und echte Trades Stück für Stück abgleichen lassen
  try { const tl = tradeList(tradeHistory(s.fills)); if (tl) L.push(tl, ''); } catch { /* egal */ }

  // Letzte Telegram-Signale
  const feed = getFeedSignals();
  L.push('## Letzte Signale');
  if (!feed.length) L.push('- keine geladen');
  feed.forEach((x) => L.push(`- ${new Date(x.at).toLocaleString('de-DE')} ${x.coin} ${x.dir} ${x.style} Score ${x.score}: Zone ${x.zone?.join('–') ?? '–'}, Stop ${x.stop}, TPs ${(x.tps || []).join('/')}, Status ${x.status}${x.sf ? `, Filter ${x.sf}` : ''}`));
  L.push('');

  // Tagebuch-Archiv (abgeschlossene Signale, dauerhaft)
  const arc = getArchive();
  if (arc.length) {
    const byStyle = {};
    arc.forEach((e) => { (byStyle[e.style] ||= []).push(e); });
    L.push('## Tagebuch-Archiv', `${arc.length} abgeschlossene Signale seit ${new Date(arc[0].at).toLocaleDateString('de-DE')}`);
    Object.entries(byStyle).forEach(([st, l]) => {
      const rs = l.filter((e) => e.r != null).map((e) => e.r);
      L.push(`- ${st}: ${l.length} Signale, Ø ${r2(rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null)}, TP1 oder besser ${pc(l.filter((e) => /^tp/.test(e.status)).length / l.length * 100)}`);
    });
    // 8a: Messwerte je Signal (ZoneStd = Stunden bis zur Einstiegszone, MaxPlusR/MaxMinusR = größter Lauf in R)
    const ms = measureStats(arc);
    if (ms) L.push(`- Messwerte (${ms.n} Signale): Ø größter Lauf ins Plus ${n2(ms.avgMfe)}R · ins Minus ${n2(ms.avgMae)}R · lief mind. 1R ${pc(ms.reach1)} · 2R ${pc(ms.reach2)} · 3R ${pc(ms.reach3)} · Zone erreicht ${pc(ms.zoneShare)}${ms.avgZoneH == null ? '' : ` (Ø nach ${n2(ms.avgZoneH, 1)} Std.)`}${ms.deepWinners == null ? '' : ` · Gewinner mit mind. 0,5R Gegenlauf ${pc(ms.deepWinners)}`}`);
    const hours = (e) => (e.doneAt ? ((e.doneAt - e.at) / 36e5).toFixed(1) : '');
    L.push('```', 'Datum;Nr;Coin;Richtung;Stil;Score;Filter;Status;R;DauerStd;ZoneStd;MaxPlusR;MaxMinusR', ...arc.map((e) => [new Date(e.at).toISOString().slice(0, 16), e.id ?? '', e.coin, e.dir, e.style, e.score, e.sf, e.status, e.r ?? '', hours(e), e.zoneH ?? '', e.mfe ?? '', e.mae ?? ''].join(';')), '```', '');
  }

  // Backtests
  const bts = Object.values(loadBacktests(store));
  L.push('## Backtests');
  L.push(bts.length ? bts.sort((a, b) => b.at - a.at).map(btText).join('\n\n') : '- noch keiner gerechnet');
  return L.join('\n');
}

// Teilen (iPhone-Teilen-Menü) oder herunterladen
export async function shareReport(getState) {
  const text = buildReport(getState?.() || {});
  // 6a: Dateiname mit Uhrzeit und Inhalt, damit die Dateien-App nicht „Ersetzen?“ fragt
  const d = new Date(), two = (n) => String(n).padStart(2, '0');
  const styles = Object.values(loadBacktests()).sort((a, b) => b.at - a.at).map((x) => ({ swing: 'swing', intraday: 'daytrade', scalp: 'scalp' }[x.style] || x.style));
  const name = `wolf-desk-daten-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${styles.length ? '-' + styles.join('-') : ''}.md`;
  const file = new File([text], name, { type: 'text/markdown' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
