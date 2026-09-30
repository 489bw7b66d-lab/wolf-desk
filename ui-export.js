// Export „Daten für Claude“ (5c): eine lesbare Textdatei (Markdown) mit allem, was wir für Auswertungen brauchen,
// statt vieler Screenshots. Enthält Beträge (nur für dich und Claude gedacht), keine Wallet-Adresse, keine Zugangsdaten.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { enrichPositions } from './core-positions.js';
import { honestSplit, lifePnlOf, dayPnlOf } from './core-performance.js';
import { tradeHistory, tradeStats } from './core-trades.js';
import { currentValues, diffFromRecommended } from './core-settings.js';
import { getTradeable } from './core-tradeable.js';
import { getWatchlist } from './core-watchlist.js';
import { summarize, compareTrail } from './core-backtest.js';
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
  return { style, label: last?.label, at: Date.now(), summary: rest, gate: t.length ? compareGate(t) : [], trail: compareTrail(t), perMarket, missed: last?.missed ?? 0,
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
  L.push(`Trades ${s.n ?? 0} · Gewinn-Trades ${pc(s.winRate)} · TP1 erreicht ${pc(s.tp1Rate)} · Ø ${r2(s.avgR)} · Summe ${r2(s.totalR)} · Profit-Faktor ${n2(s.profitFactor)} · größter Rückgang ${n2(s.maxDdR, 1)}R · ohne Einstieg ${d.missed}`);
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
    L.push('```', 'Datum;Nr;Coin;Richtung;Stil;Score;Filter;Status;R', ...arc.map((e) => [new Date(e.at).toISOString().slice(0, 16), e.id ?? '', e.coin, e.dir, e.style, e.score, e.sf, e.status, e.r ?? ''].join(';')), '```', '');
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
