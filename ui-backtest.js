// Backtest-Bereich: Markt und Stil wählen, Signalgeber auf der Vergangenheit testen, Ergebnis verständlich anzeigen.
import { CONFIG } from './config.js';
import { getWatchlist, onWatchlist } from './core-watchlist.js';
import { getTradeable, onTradeable, matchMarkets } from './core-tradeable.js';
import { BT, loadHistory, runBacktest, summarize, compareTrail, splitPeriods, byRegime } from './core-backtest.js';
import { compareGate, GATE_LABEL } from './core-trendgate.js';
import { regimeIndex, regimeAt, compareRegime, regimeHolds, REGIME_ROWS } from './core-regime.js';
import { compareExits, EXIT_ROWS } from './core-exitcompare.js';
import { paretoShare, avgHoldDays, FUNDING } from './core-btmetrics.js';
import { runRandomBase, sumDraws, randomSummary, benchmarks, MIN_TRADES } from './core-randombase.js';
import { hl } from './core-api.js';
import { closedCandles } from './core-signals.js';
import { saveBacktest, shareReport } from './ui-export.js';
import { loadRun, saveRun, clearRun, remaining, saveResult, loadResultWait, savedList, rebuildIndex } from './core-btstore.js';
import { esc, dn, tipHead, tipInline } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const ALL = '__alle__', TRADE = '__handelbar__', SAMPLE = '__stichprobe__';
// 7c: feste Stichprobe – jeder zweite handelbare Markt (alphabetisch), immer dieselben, damit Läufe vergleichbar bleiben
const sample = () => [...getTradeable()].sort().filter((_, i) => i % 2 === 0);
let extra = null; // über die Suche gewählter Markt außerhalb der Watchlist
let getNames = () => [];
const STYLES = ['swing', 'intraday', 'scalp'];
let style = 'swing', running = false, stopFlag = false, last = null;
let engine = 1; // 7a: 1 = bisherige Engine, 2 = Engine 2 (Bauplan des Nutzers)
const keyOf = (st, en) => st + (en === 2 ? ':e2' : en === 3 ? ':bm' : en === 4 ? ':bf' : en === 5 ? ':dc' : en === 6 ? ':rn' : en === 7 ? ':rd' : '');
const ENG = { 1: 'Alte Engine', 2: 'Engine 2', 3: 'Maßstab', 4: 'Neu im Trend', 5: 'Donchian', 6: 'Zufall zu Neu im Trend', 7: 'Zufall zu Donchian' };
const ENG_SUB = { 1: 'bis 8a Telegram', 2: 'dein Bauplan', 3: 'stumpfe Trendfolge', 4: 'jetzt Telegram', 5: 'Ausbruch 20/10, nur Swing', 6: 'Würfel-Vergleich', 7: 'Würfel-Vergleich, nur Swing' };
const ENG_TAG = { 2: ' · Engine 2', 3: ' · Maßstab', 4: ' · Maßstab neu im Trend', 5: ' · Donchian 20/10', 6: ' · Zufalls-Maßstab', 7: ' · Zufalls-Maßstab Donchian' };
const ENGINE_ORDER = [4, 6, 5, 7, 3, 1, 2];
const IS_RANDOM = (e) => e === 6 || e === 7;
const DAILY_ONLY = (e) => e === 5 || e === 7; // rechnen mit Tageskerzen, nur Swing
let savedOpen = false; // 8g: Liste der gespeicherten Läufe auf- oder zugeklappt
const ENG_SHORT = { 2: ' E2', 3: ' Maßstab', 4: ' Neu im Trend', 5: ' Donchian', 6: ' Zufall', 7: ' Zufall (Donchian)' };

const R = (v, d = 2) => (v == null || !Number.isFinite(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v)) + 'R');
const P = (v) => (v == null ? '–' : f.pct(v, 0));
const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : 'muted');
const date = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const OUT = { stop: 'Stop', einstieg: 'Stop auf Einstieg', nachgezogen: 'Nachzieh-Stop', tp4: 'Alle Ziele', zeit: 'Zeitlimit', offen: 'Noch offen', kanal: 'Kanal-Ausstieg' };

function renderControls(prefer = null) {
  const wl = getWatchlist(), tr = getTradeable();
  const sel = $('bt-coin'), cur = prefer || sel.value;
  const single = extra && !wl.includes(extra) ? [extra, ...wl] : wl;
  sel.innerHTML = `<option value="${ALL}">Ganze Watchlist (${wl.length})</option>`
    + (tr.length ? `<option value="${TRADE}">Alle handelbaren Märkte (${tr.length})</option><option value="${SAMPLE}">Stichprobe: ${sample().length} Märkte (halbe Zeit)</option>` : '')
    + single.map((c) => `<option value="${esc(c)}">${esc(dn(c))}${c === extra && !wl.includes(c) ? ' (Suche)' : ''}</option>`).join('');
  const ok = [ALL, ...(tr.length ? [TRADE, SAMPLE] : []), ...single];
  sel.value = ok.includes(cur) ? cur : (wl.includes('BTC') ? 'BTC' : ALL);
  // 8g: Regel als Auswahlfeld statt sechs Knöpfen
  const es = $('bt-engine');
  if (es) { es.innerHTML = ENGINE_ORDER.map((e) => `<option value="${e}">${ENG[e]} · ${ENG_SUB[e]}</option>`).join(''); es.value = String(engine); es.disabled = running; }
  const tip = $('bt-tip');
  if (tip && !tip.innerHTML) tip.innerHTML = tipInline('Spielt eine Regel auf vergangenen Kerzen nach, so als hättest du jedes Signal nach Plan gehandelt. „Zufall“ würfelt die Einstiege und zeigt, was allein Marktrichtung, Stop und Ausstieg bringen.', 'bt-intro');
  $('bt-styles').innerHTML = STYLES.map((k) => `<button type="button" data-bts="${k}" aria-pressed="${k === style}">${CONFIG.signals.modes[k].label}<small>${BT.days[k]} Tage</small></button>`).join('');
}

function curve(values) {
  if (values.length < 2) return '';
  const W = 340, H = 110, P2 = 4, all = [0, ...values];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const x = (i) => P2 + (i / (all.length - 1)) * (W - 2 * P2);
  const y = (v) => P2 + (1 - (v - min) / span) * (H - 2 * P2);
  const d = all.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const col = all.at(-1) >= 0 ? 'var(--ok)' : 'var(--bad)';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Verlauf in R: Ende ${R(all.at(-1))}">
    <line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>
    <div class="chart-scale"><span>${R(min, 1)}</span><span>${R(max, 1)}</span></div>`;
}

function verdict(sm) {
  if (sm.n < 10) return { cls: 'warn', text: `Nur ${sm.n} Trades. Das reicht nicht für eine Aussage, längerer Zeitraum oder mehr Märkte nötig.` };
  const risk = CONFIG.rules.riskPerTradeWarnPct;
  const base = sm.avgR > 0.15 ? { cls: 'ok', text: `Positiver Erwartungswert: im Schnitt ${R(sm.avgR)} pro Trade nach Gebühren.` }
    : sm.avgR > 0 ? { cls: 'warn', text: `Knapp positiv (${R(sm.avgR)} pro Trade). Nach Slippage kann davon wenig übrig bleiben.` }
    : { cls: 'bad', text: `Negativer Erwartungswert (${R(sm.avgR)} pro Trade). So gehandelt hätte der Signalgeber hier Geld verloren.` };
  base.text += ` Der größte Rückgang lag bei ${R(sm.maxDdR, 1).replace('+', '')}, bei deinen ${risk} % Risiko pro Trade wären das rund ${f.pct(Math.min(100, sm.maxDdR * risk), 0)} vom Konto gewesen.`;
  if (sm.n < 30) base.text += ' Unter 30 Trades ist das Ergebnis noch wackelig.';
  return base;
}

function table(head, rows) {
  return `<div class="bt-table" role="table"><div class="bt-row head" role="row">${head.map((h) => `<span>${h}</span>`).join('')}</div>${rows.join('')}</div>`;
}

// Marktphase (7c): Trend oder Seitwärts beim Einstieg (Tages-ADX) – erst messen, dann filtern
function regimeBlock(trades) {
  const g = byRegime(trades);
  if (!g.side.n && !g.mid.n && !g.trend.n) return '';
  const row = (name, x) => `<div class="bt-row" role="row"><span><b>${name}</b></span><span>${x.n}</span><span class="${cls(x.avgR)}">${x.avgR == null ? '–' : R(x.avgR)}</span><span class="${cls(x.sum)}">${R(x.sum, 1)}</span></div>`;
  return `${tipHead('Trend oder Seitwärts?', 'Jeder Trade wird beim Einstieg nach dem ADX (14) des Tagescharts eingeordnet: unter 20 seitwärts, 20 bis 25 Übergang, über 25 Trend. Darunter: was gewesen wäre, wenn nur bei ADX ab 20 bzw. ab 25 gehandelt worden wäre.')}
    ${table(['Phase', 'Trades', 'Ø R', 'Summe'], [row('Seitwärts (&lt; 20)', g.side), row('Übergang (20–25)', g.mid), row('Trend (&gt; 25)', g.trend), row('Nur ab ADX 20', g.min20), row('Nur ab ADX 25', g.min25)])}`;
}

// 8f/8g: Zufalls-Maßstab. Schnitt und Spanne der Durchgänge neben der Regel, dazu beide Messlatten getrennt.
// Erscheint beim Zufalls-Lauf UND bei der Regel selbst (Neu im Trend, Donchian), sobald das Gegenstück auf denselben Märkten gerechnet ist.
async function fillRandom() {
  const host = $('bt-random');
  if (!host || !last) return;
  const shown = last, st = style, isRnd = IS_RANDOM(shown.engine);
  const dcPair = shown.engine === 5 || shown.engine === 7;
  const ruleEngine = dcPair ? 5 : 4, rndEngine = dcPair ? 7 : 6, ruleName = dcPair ? 'Donchian' : 'Neu im Trend';
  const other = await loadResultWait(keyOf(st, isRnd ? ruleEngine : rndEngine), 8000);
  if (!$('bt-random') || last !== shown) return;
  const mk = (r) => `${r.label.split(' · ')[0]}|${r.total ?? r.runs?.length ?? ''}`;
  const match = other && mk(other) === mk(shown) ? other : null;
  const rnd = isRnd ? shown : match, ruleRun = isRnd ? match : shown;
  const sum = rnd?.rnd ? randomSummary(rnd.rnd) : null;
  if (!sum?.all) { host.innerHTML = ''; return; } // bei der Regel ohne Zufalls-Lauf bleibt der Platz leer
  const sp = ruleRun ? splitPeriods(ruleRun.trades, ruleRun.from, ruleRun.to) : null, sm = ruleRun ? summarize(ruleRun.trades) : null;
  const rule = sp ? { all: sm.avgR, dev: sp.dev.avgR, conf: sp.conf.avgR, n: sm.n } : null;
  const b = rule ? benchmarks(sum, rule) : null;
  const num = (x) => R(x).replace('R', '');
  const span = (x) => (x ? `${num(x.min)} bis ${R(x.max)}` : '–');
  const mark = { above: ' ✓', below: ' ✗', inside: ' ·' };
  const row = (name, key) => `<div class="bt-row" role="row"><span><b>${name}</b></span><span class="${cls(sum[key]?.mean)}">${R(sum[key]?.mean)}</span><span class="bt-span">${span(sum[key])}</span><span class="${cls(rule?.[key])}" style="white-space:nowrap">${rule ? R(rule[key]) + (key === 'all' || !b?.A ? '' : mark[b.A[key]]) : '–'}</span></div>`;
  const where = { above: 'über', below: 'unter', inside: 'innerhalb' };
  let verdict;
  if (!rule) verdict = `<p class="bt-verdict warn">„${ruleName}“ ist für ${CONFIG.signals.modes[st].label} auf diesen Märkten noch nicht gerechnet${other ? ' (der gespeicherte Lauf nutzt andere Märkte)' : ''}. Rechne es, dann erscheint hier der Vergleich.</p>`;
  else {
    const a = b.A, bb = b.B;
    const aText = a.pass ? 'in beiden Zeiträumen über der Zufalls-Spanne.' : `Entwicklung ${where[a.dev]}, Bestätigung ${where[a.conf]} der Zufalls-Spanne.`;
    const miss = [!bb.all && 'gesamt im Minus', !bb.dev && 'Entwicklung im Minus', !bb.conf && 'Bestätigung im Minus', !bb.enough && `weniger als ${MIN_TRADES} Trades`].filter(Boolean);
    const stale = !(ruleRun.fundingPctDay > 0) ? ` Achtung: Der Lauf von „${ruleName}“ ist noch ohne Funding gerechnet.` : '';
    verdict = `<p class="bt-verdict ${a.pass ? 'ok' : 'warn'}"><b>A · Besser als Zufall: ${a.pass ? 'bestanden' : 'nicht bestanden'}</b>, ${aText}</p>
      <p class="bt-verdict ${bb.pass ? 'ok' : 'warn'}"><b>B · Verdient Geld: ${bb.pass ? 'bestanden' : 'nicht bestanden'}</b>${bb.pass ? ', gesamt und in beiden Zeiträumen im Plus.' : ' (' + miss.join(', ') + ').'}</p>
      <p class="empty" style="font-size:12.5px;margin-top:6px">${b.pass ? `„${ruleName}“ besteht beide Messlatten.` : `Scharf wird nur, was A und B besteht. „${ruleName}“ gilt damit als Beobachtung.`}${stale}</p>`;
  }
  host.innerHTML = `${tipHead('Regel oder nur Marktrichtung?', `Zufällige Einstiege, nur Long, mit demselben Stop, demselben Ausstieg und denselben Kosten wie „${ruleName}“. ${sum.draws} Durchgänge mit festem Startwert: Dieselbe Kerze wird in jedem Lauf gleich gewürfelt, das Ergebnis ist also wiederholbar. Die Spanne reicht vom schwächsten bis zum stärksten Durchgang, je Durchgang im Schnitt ${Math.round(sum.all.n)} Trades. Messlatte A: Die Regel liegt in beiden Zeiträumen über der Spanne (✓ darüber, ✗ darunter, · innerhalb). Messlatte B: gesamt und in beiden Zeiträumen im Plus, mindestens ${MIN_TRADES} Trades.${isRnd ? ' Die Kennzahlen weiter unten zeigen nur den ersten Durchgang als Beispiel.' : ''}`)}
    <div class="bt-table" role="table"><div class="bt-row head" role="row"><span>Zeitraum</span><span>Zufall Ø</span><span>Spanne</span><span>${ruleName}</span></div>
      ${row('Gesamt', 'all')}${row('Entwicklung', 'dev')}${row('Bestätigung', 'conf')}</div>
    ${verdict}`;
}

// 8c: Marktphasen-Schalter (nur Messung): dieselben Trades, einmal alle, einmal nur wenn BTC beim Einstieg im Trend war
function regimeSwitchBlock(trades, from, to) {
  const g = compareRegime(trades, from, to);
  if (!g) return '';
  const line = (x) => `<span>${x.n}</span><span class="${cls(x.avgR)}">${R(x.avgR)}</span><span class="${cls(x.dev?.avgR)}">${R(x.dev?.avgR)}</span><span class="${cls(x.conf?.avgR)}">${R(x.conf?.avgR)}</span>`;
  const name = Object.fromEntries(REGIME_ROWS);
  const trend = g.rows[1], above = g.rows[2];
  const ok = [trend, above].filter((x) => regimeHolds(x));
  const text = ok.length
    ? `„${name[ok[0].key]}“ liegt im Schnitt und in beiden Zeiträumen im Plus (${ok[0].n} Trades).`
    : 'Kein Schalter liegt im Schnitt und in beiden Zeiträumen im Plus bei mindestens 300 Trades.';
  return `${tipHead('Mit Marktphasen-Schalter?', 'Dieselben Trades, nur gefiltert nach der Lage von Bitcoin beim Einstieg. „BTC im Trend“: Tages-EMA 20 über EMA 100 und BTC-Tagesschluss über der EMA 20. „BTC über EMA 100“: BTC-Tagesschluss über der Tages-EMA 100. Es zählt die letzte Tageskerze, die beim Einstieg schon abgeschlossen war. Nur eine Messung: Signale und Telegram ändern sich dadurch nicht. Vereinfacht: freiwerdende Zeit für andere Trades ist nicht eingerechnet.')}
    <div class="bt-cmp5">${table(['Schalter', 'Trades', 'Ø R', 'Entw.', 'Best.'], g.rows.map((x) => `<div class="bt-row" role="row"><span><b>${name[x.key]}</b></span>${line(x)}</div>`))}</div>
    <p class="bt-verdict ${ok.length ? 'ok' : 'warn'}">${text} Ausgesiebt bei „BTC im Trend“: ${g.out.trend.n} Trades mit Ø ${R(g.out.trend.avgR)}.${g.unknown ? ` ${g.unknown} Trades ohne BTC-Daten sind nicht dabei.` : ''}</p>`;
}

// 8c: Ausstiegs-Vergleich (nur Messung): dieselben Einstiege, drei Ausstiege
function exitBlock(trades, from, to) {
  const g = compareExits(trades, from, to);
  if (!g) return '';
  const name = Object.fromEntries(EXIT_ROWS);
  const best = [...g.rows].sort((a, b) => b.avgR - a.avgR)[0];
  const holds = best.avgR > 0 && best.dev?.avgR > 0 && best.conf?.avgR > 0;
  const thin = g.n < 300;
  return `${tipHead('Welcher Ausstieg?', 'Dieselben Einstiege, drei Ausstiege. Heutiger Plan: Teilverkäufe an den Zielen, ab TP2 Stop auf Einstieg. Zweite Zeile: schon nach TP1 Stop auf Einstieg. Dritte Zeile: TP1 liegt bei 1R (Abstand Einstieg bis Stop), danach Stop auf Einstieg. Treffer = Trades mit Gewinn nach Gebühren. Gerechnet mit den Anteilen aus deinem Ausstiegsplan. Der Stop wandert erst nach Kerzenschluss auf den Einstieg. Nur eine Messung.')}
    <div class="bt-cmp5">${table(['Ausstieg', 'Treffer', 'Ø R', 'Entw.', 'Best.'], g.rows.map((x) => `<div class="bt-row" role="row"><span><b>${name[x.key]}</b></span><span>${P(x.winRate)}</span><span class="${cls(x.avgR)}">${R(x.avgR)}</span><span class="${cls(x.dev?.avgR)}">${R(x.dev?.avgR)}</span><span class="${cls(x.conf?.avgR)}">${R(x.conf?.avgR)}</span></div>`))}</div>
    <p class="bt-verdict ${holds && !thin ? 'ok' : 'warn'}">Höchster Schnitt: „${name[best.key]}“ (${R(best.avgR)} über ${g.n} Trades)${holds ? ', in beiden Zeiträumen im Plus.' : ', aber nicht in beiden Zeiträumen im Plus.'}${thin ? ' Für ein Urteil zu wenig Trades (mindestens ca. 300).' : ''}${g.skipped ? ` ${g.skipped} Trades fehlen, weil sie nicht in allen drei Varianten zum Einstieg kamen oder vor 8c gerechnet wurden.` : ''}</p>`;
}

// Entwicklung / Bestätigung (7a): hält das Ergebnis auch im letzten Drittel, das man vorher nicht angeschaut hat?
function periodBlock(trades, from, to) {
  const sp = splitPeriods(trades, from, to);
  if (!sp || !sp.dev.n || !sp.conf.n) return '';
  const d1 = Math.round((sp.cut - from) / 864e5), d2 = Math.round((to - sp.cut) / 864e5);
  const holds = sp.dev.avgR > 0 && sp.conf.avgR > 0;
  return `${tipHead('Hält es in beiden Zeiträumen?', 'Die ersten zwei Drittel des Zeitraums gelten als „Entwicklung“, das letzte Drittel als „Bestätigung“. Eine Regel taugt nur, wenn sie in beiden Teilen im Plus liegt. Sonst passt sie sich wahrscheinlich nur an die Vergangenheit an.')}
    ${table(['Zeitraum', 'Trades', 'Ø R', 'Summe'], [['Entwicklung', `erste ${d1} Tage`, sp.dev], ['Bestätigung', `letzte ${d2} Tage`, sp.conf]].map(([a, b, x]) => `<div class="bt-row" role="row"><span><b>${a}</b><br><small class="muted">${b}</small></span><span>${x.n}</span><span class="${cls(x.avgR)}">${R(x.avgR)}</span><span class="${cls(x.sum)}">${R(x.sum, 1)}</span></div>`))}
    <p class="bt-verdict ${holds ? 'ok' : 'warn'}">${holds ? 'In beiden Zeiträumen im Plus.' : 'Nicht in beiden Zeiträumen im Plus, also noch kein belastbarer Vorteil.'}</p>`;
}

// Alte Engine gegen Engine 2 (7a): gleicher Stil, jeweils der letzte vollständige Lauf
async function fillCompare() {
  const box = $('bt-cmp');
  if (!box || !last) return;
  const st = style, get = (en) => loadResultWait(keyOf(st, en), 8000), a = await get(1), b = await get(2), c = await get(3), dc = await get(5); let d = await get(4); // 8b1: mit Geduld laden, sonst fehlen auf dem iPhone Zeilen
  // 8c: nur Läufe über dieselben Märkte nebeneinanderstellen (sonst steht ein BTC-Einzellauf neben 175 Märkten)
  const mk = (r) => `${r.label.split(' · ')[0]}|${r.total ?? r.runs?.length ?? ''}`;
  const found = [['Neu im Trend', d], ['Donchian', dc], ['Maßstab', c], ['Alt', a], ['Engine 2', b]].filter((x) => x[1]);
  const have = found.filter((x) => mk(x[1]) === mk(last));
  const other = found.filter((x) => mk(x[1]) !== mk(last));
  const otherNote = other.length ? `<p class="empty" style="font-size:12.5px;margin:6px 0 0">Nicht im Vergleich, weil mit anderen Märkten gerechnet: ${other.map(([n, r]) => `${n} (${esc(r.label.split(' · ')[0])})`).join(', ')}.</p>` : '';
  if (d && !have.some((x) => x[1] === d)) d = null;
  if (have.length < 2) { box.innerHTML = `<p class="empty" style="font-size:13px">Vergleich der Engines: rechne ${CONFIG.signals.modes[st].label} mit einer zweiten Engine auf denselben Märkten, dann erscheint er hier.</p>${otherNote}`; return; }
  // 8d: Läufe von vor 8d sind ohne Funding gerechnet und stehen deshalb etwas zu gut da
  const noFund = have.filter((x) => !(x[1].fundingPctDay > 0));
  const fundNote = noFund.length && noFund.length < have.length ? `<p class="empty" style="font-size:12.5px;margin:6px 0 0">Noch ohne Funding gerechnet (vor 8d): ${noFund.map((x) => x[0]).join(', ')}. Für einen fairen Vergleich neu rechnen.</p>` : '';
  const row = (name, r) => { const sm = summarize(r.trades), sp = splitPeriods(r.trades, r.from, r.to); return `<div class="bt-row" role="row"><span><b>${name}</b><br><small class="muted">${esc(r.label.split(' · ')[0])}${r.fundingPctDay > 0 ? '' : ' · ohne Funding'}</small></span><span>${sm.n}</span><span class="${cls(sm.avgR)}">${R(sm.avgR)}</span><span class="${cls(sp?.dev.avgR)}">${R(sp?.dev.avgR)}</span><span class="${cls(sp?.conf.avgR)}">${R(sp?.conf.avgR)}</span></div>`; };
  // 8b: Urteil über die Regel, nach der Telegram jetzt meldet („neu im Trend“): im Schnitt im Plus UND in beiden Zeiträumen
  let verdict = '';
  if (d) {
    const sd = summarize(d.trades), spd = splitPeriods(d.trades, d.from, d.to);
    const holds = sd.avgR > 0 && spd?.dev.avgR > 0 && spd?.conf.avgR > 0;
    const thin = sd.n < 300;
    verdict = `<p class="bt-verdict ${holds && !thin ? 'ok' : 'warn'}">${holds ? '„Neu im Trend“ liegt im Schnitt und in beiden Zeiträumen im Plus.' : sd.avgR > 0 ? '„Neu im Trend“ liegt im Schnitt im Plus, aber nicht in beiden Zeiträumen.' : '„Neu im Trend“ liegt hier im Minus.'}${thin ? ` Nur ${sd.n} Trades: für ein Urteil zu wenig (mindestens ca. 300, belastbar ab 500).` : ''}</p>`;
  } else verdict = '<p class="bt-verdict warn">„Neu im Trend“ (die Regel hinter den Telegram-Signalen seit 8b) ist für diesen Stil auf diesen Märkten noch nicht gerechnet.</p>';
  box.innerHTML = `${tipHead('Vergleich der Engines', 'Jeweils der letzte vollständige Lauf dieses Stils. „Entwicklung“ sind die ersten zwei Drittel des Zeitraums, „Bestätigung“ das letzte Drittel. Eine Regel gilt erst als belegt, wenn sie im Schnitt UND in beiden Zeiträumen im Plus liegt und genug Trades hat. „Neu im Trend“ ist der Maßstab mit Einstieg nur beim Wechsel in den Trend: danach meldet Telegram seit 8b.')}
    <div class="bt-cmp5">${table(['Engine', 'Trades', 'Ø R', 'Entw.', 'Best.'], have.map(([n, r]) => row(n, r)))}</div>
    ${verdict}${fundNote}${otherNote}`;
}

// Short-Filter: dieselben Signale, Shorts je Stufe nur mit bärischem Tagestrend
function gateBlock(rows) {
  const base = rows[0];
  if (!base.shorts) return '';
  const active = CONFIG.signals.shortFilter || 'aus';
  // Empfehlung: beste Summe, aber mindestens ein Drittel der Shorts muss übrig bleiben
  const fair = rows.filter((r) => r.key !== 'aus' && r.shorts >= base.shorts / 3 && r.total > base.total + 0.05);
  const best = fair.sort((a, b) => b.total - a.total)[0];
  return `${tipHead('Shorts nur mit bärischem Tagestrend?', 'Gleiche Signale, nur Shorts werden je Stufe weggelassen, wenn der Tagestrend nicht passt. Mild: Tageskurs unter EMA 200. Mittel: dazu Tageschart bärisch (tiefere Hochs/Tiefs oder EMA 8 < 21 < 55). Streng: dazu Retest der EMA 200 in den letzten 10 Tagen. Vereinfacht: freiwerdende Zeit für andere Trades ist nicht eingerechnet. Longs bleiben gleich.')}
    ${table(['Stufe', 'Shorts', 'Ø Short', 'Summe'], rows.map((r) => `<div class="bt-row" role="row"><span><b>${r.key === 'aus' ? 'Ohne Filter' : r.key[0].toUpperCase() + r.key.slice(1)}</b>${r.key === active ? ' ✓' : ''}</span><span>${r.shorts}</span><span class="${cls(r.shortAvg)}">${r.shortAvg == null ? '–' : R(r.shortAvg)}</span><span class="${cls(r.total)}">${R(r.total, 1)}</span></div>`))}
    <p class="bt-verdict ${best ? 'ok' : 'warn'}">${best
      ? `Hier am besten: <b>${GATE_LABEL[best.key]}</b> (${R(best.total - base.total, 1)} gegenüber ohne Filter, ${best.shorts} von ${base.shorts} Shorts bleiben).`
      : 'Keine Stufe verbessert das Ergebnis und lässt genug Shorts übrig.'} Einstellen unter ⚙️ → Signalgeber.</p>`;
}

// Dieselben Einstiege, zwei Ausstiegsregeln: Stufen laut Plan gegen Nachziehen nach Struktur
function trailBlock(c) {
  if (!c) return '';
  const diff = c.struct - c.plan, win = diff > 0.05 ? 'Struktur' : diff < -0.05 ? 'Plan' : null;
  return `${tipHead('Nachziehen: Plan oder Struktur?', 'Gleiche Einstiege, nur der Stop wird anders nachgezogen. Plan: ab TP2 auf Einstieg, danach hinter das letzte Ziel. Struktur: ab TP1 unter jedes neue höhere Tief (Short: über jedes tiefere Hoch) der Setup-Zeitebene mit ½ ATR Puffer, spätestens ab TP2 auf Einstieg plus Gebühren.')}
    <div class="kv">
      <div><span class="k">Plan · Summe</span><span class="v ${cls(c.plan)}">${R(c.plan, 1)}</span></div>
      <div><span class="k">Struktur · Summe</span><span class="v ${cls(c.struct)}">${R(c.struct, 1)}</span></div>
    </div>
    <p class="bt-verdict ${win === 'Struktur' ? 'ok' : 'warn'}">${win ? `${win} schneidet hier besser ab (${R(Math.abs(diff), 1)} über ${c.n} Trades; Struktur besser in ${c.better}, schlechter in ${c.worse}).` : `Kaum Unterschied über ${c.n} Trades.`}${c.n < 30 ? ' Noch wenige Trades, eher ein Hinweis als ein Beweis.' : ''}</p>`;
}

function renderResult() {
  const box = $('bt-out');
  if (!last) { box.innerHTML = ''; return; }
  const { label, runs, trades, missed } = last;
  const sm = summarize(trades);
  if (!sm.n) {
    box.innerHTML = `<p class="empty">Keine Trades im Testzeitraum (${missed} Signale ohne Einstieg). Der Signalgeber war hier sehr zurückhaltend.</p>`;
    return;
  }
  const v = verdict(sm);
  // 8b1: Der Maßstab hat weder Score noch Siegel noch mehrere Ereignisse; diese Blöcke wären dort leer gedroschen
  const plain = last.engine >= 3;
  const pareto = paretoShare(trades), hold = avgHoldDays(trades);
  const perCoin = runs.length > 1 ? runs.map((r) => ({ coin: r.coin, ...summarize(r.trades), err: r.error })) : [];
  box.innerHTML = `<h3 class="sub-h" style="margin-top:4px">${esc(label)}</h3>
    ${[4, 5, 6, 7].includes(last.engine) ? '<div id="bt-random"></div>' : ''}
    <p class="bt-verdict ${v.cls}">${esc(v.text)}</p>
    <div class="kv">
      <div><span class="k">Trades</span><span class="v">${sm.n}</span></div>
      <div><span class="k">Gewinn-Trades</span><span class="v">${P(sm.winRate)}</span></div>
      ${DAILY_ONLY(last.engine) ? '' : `<div><span class="k">TP1 erreicht</span><span class="v">${P(sm.tp1Rate)}</span></div>`}
      <div><span class="k">Ø pro Trade</span><span class="v ${cls(sm.avgR)}">${R(sm.avgR)}</span></div>
      <div><span class="k">Summe</span><span class="v ${cls(sm.totalR)}">${R(sm.totalR, 1)}</span></div>
      <div><span class="k">Profit-Faktor</span><span class="v">${sm.profitFactor == null ? '–' : sm.profitFactor.toFixed(2).replace('.', ',')}</span></div>
      <div><span class="k">Gewinn aus den besten 15 % ${tipInline('Anteil des gesamten Gewinns, der aus den besten 15 % der Trades kommt. Hohe Werte heißen: Das Ergebnis hängt an wenigen großen Läufern, und wer die früh verkauft, hat keinen Vorteil mehr. Über 100 % heißt: Alle übrigen Trades haben zusammen Geld gekostet. Ein Strich steht da, wenn der Lauf insgesamt im Minus liegt.')}</span><span class="v">${pareto ? P(pareto.pct) : '–'}</span></div>
      <div><span class="k">Ø Haltedauer</span><span class="v">${hold == null ? '–' : hold.toFixed(1).replace('.', ',') + ' Tage'}</span></div>
    </div>
    <h3 class="sub-h">Verlauf in R</h3>
    ${curve(sm.curve)}
    ${periodBlock(trades, last.from, last.to)}
    ${regimeSwitchBlock(trades, last.from, last.to)}
    ${exitBlock(trades, last.from, last.to)}
    ${regimeBlock(trades)}
    <div id="bt-cmp"></div>
    <button type="button" class="wide ghost" id="bt-export" style="margin:4px 0 14px">📤 Daten für Claude exportieren</button>
    ${gateBlock(compareGate(trades))}
    ${trailBlock(compareTrail(trades))}
    ${plain ? '' : `<h3 class="sub-h">Taugt ein höherer Score mehr?</h3>
    ${table(['Score', 'Trades', 'Gewinn', 'Ø R'], sm.byScore.map((b) => `<div class="bt-row" role="row"><span><b>${b.label}</b></span><span>${b.n}</span><span>${P(b.winRate)}</span><span class="${cls(b.avgR)}">${R(b.avgR)}</span></div>`))}`}
    ${plain ? '' : tipHead('Welche Ereignisse helfen?', 'Vorteil = Ø R mit diesem Ereignis minus Ø R ohne. Erst ab 3 Trades gelistet.')}
    ${plain ? '' : sm.byEvent.length ? table(['Ereignis', 'Trades', 'Ø R', 'Vorteil'], sm.byEvent.map((e) => `<div class="bt-row" role="row"><span>${esc(e.name)}</span><span>${e.n}</span><span class="${cls(e.avgR)}">${R(e.avgR)}</span><span class="${cls(e.edge)}">${R(e.edge)}</span></div>`))

      : '<p class="empty">Zu wenige Trades je Ereignis für eine Aussage.</p>'}
    ${plain ? '' : '<h3 class="sub-h">Retest-Siegel und Richtung</h3>'}
    ${plain ? '' : table(['Gruppe', 'Trades', 'Gewinn', 'Ø R'], [
      ['🛡 mit Siegel', sm.seal.with], ['ohne Siegel', sm.seal.without], ['Long', sm.long], ['Short', sm.short],
    ].filter(([, x]) => x.n).map(([n, x]) => `<div class="bt-row" role="row"><span>${n}</span><span>${x.n}</span><span>${P(x.winRate)}</span><span class="${cls(x.avgR)}">${R(x.avgR)}</span></div>`))}
    ${perCoin.length ? `<h3 class="sub-h">Nach Markt</h3>${table(['Markt', 'Trades', 'Gewinn', 'Ø R'], perCoin.map((c) => `<div class="bt-row" role="row"><span><b>${esc(dn(c.coin))}</b></span><span>${c.err ? '–' : c.n}</span><span>${c.err ? '' : P(c.winRate)}</span><span class="${cls(c.avgR)}">${c.err ? 'Fehler' : R(c.avgR)}</span></div>`))}` : ''}
    <h3 class="sub-h">Letzte Trades</h3>
    ${table(['Datum', 'Markt', 'Ausgang', 'R'], trades.slice(-8).reverse().map((t) => `<div class="bt-row" role="row"><span>${date(t.time)}</span><span>${esc(dn(t.coin))} <small class="${t.dir}">${t.dir === 'long' ? 'L' : 'S'}</small></span><span class="muted">${OUT[t.outcome] || t.outcome}${t.hits ? ` · TP${t.hits}` : ''}</span><span class="${cls(t.r)}">${R(t.r)}</span></div>`))}
    <div class="empty" style="font-size:12.5px;margin-top:12px">So wurde gerechnet ${tipInline(`1R = Abstand Einstieg bis Stop, also der Verlust bei vollem Stop. Regeln wie im Ausstiegsplan: Teilverkäufe an TP1–TP4, ab TP2 Stop auf Einstieg, Runner nachgezogen. Gebühren abgezogen (${f.pct(BT.feePct, 3)} je Seite)${last.fundingPctDay > 0 ? `, dazu Funding für Longs als Schätzung (${String(last.fundingPctDay).replace('.', ',')} % je Tag Haltedauer; der echte Satz schwankt je Coin)` : ', Funding nicht (Lauf von vor 8d)'}. Slippage ist nicht eingerechnet.${last.engine === 7 ? ' Zufalls-Vergleich zu Donchian: Einstieg an zufälligen Tagesschlüssen, Stop 2 × ATR, Ausstieg bei Tagesschluss unter dem 10-Tage-Tief, keine Ziele und kein Zeitlimit.' : ''}${last.engine === 5 ? ' Donchian: Einstieg zum Tagesschluss über dem 20-Tage-Hoch, Stop 2 × ATR, Ausstieg bei Tagesschluss unter dem 10-Tage-Tief, keine Ziele und kein Zeitlimit.' : ''} Berühren Stop und Ziel dieselbe Kerze, zählt der Stop. ${missed} Signale kamen nicht zum Einstieg. Vergangene Ergebnisse garantieren keine zukünftigen.`)}</div>`;
  fillCompare();
  fillRandom();
}

// resume: gespeicherter Zwischenstand (6a) – macht beim nächsten fehlenden Coin weiter
async function start(resume = null) {
  if (running) { stopFlag = true; return; }
  const sel = resume?.sel ?? $('bt-coin').value;
  if (resume) { style = resume.style; engine = resume.engine || 1; }
  const coins = resume?.coins ?? (sel === ALL ? getWatchlist() : sel === TRADE ? getTradeable() : sel === SAMPLE ? sample() : [sel]);
  running = true; stopFlag = false; globalThis.__wdBusy = true;
  $('bt-run').textContent = 'Abbrechen';
  $('bt-resume') && ($('bt-resume').innerHTML = '');
  const runs = resume?.runs ? [...resume.runs] : [];
  const todo = resume ? remaining(resume) : coins;
  const cp = { style, engine, sel, coins, runs, startedAt: resume?.startedAt ?? Date.now() };
  // 7a: Speichern läuft im Hintergrund (mit Zeitlimit) und blockiert den Start nie
  let saving = Promise.resolve();
  const persist = (data) => { saving = saving.then(() => saveRun(data)).catch(() => {}); };
  persist(cp);
  const status = (txt, frac) => {
    $('bt-status').innerHTML = `<p class="empty" style="font-size:13px;margin:10px 0 0">${esc(txt)}</p>${frac != null ? `<div class="bar" style="margin-top:6px"><span style="width:${(frac * 100).toFixed(0)}%;background:var(--gold)"></span></div>` : ''}`;
  };
  // 8c: BTC-Tageskerzen einmal je Lauf für den Marktphasen-Schalter (Fehlschlag = Tabelle bleibt weg, der Lauf geht weiter)
  let regime = null;
  try {
    status('lade BTC-Tageskerzen für die Marktphase …', 0);
    const nowMs = Date.now();
    const idx = regimeIndex(closedCandles(await hl.candles('BTC', '1d', nowMs - (BT.days[style] + 260) * 864e5, nowMs), nowMs));
    if (idx) regime = (t) => regimeAt(idx, t);
  } catch { regime = null; }
  for (const coin of todo) {
    if (stopFlag) break;
    const i = coins.indexOf(coin);
    const pre = coins.length > 1 ? `${i + 1}/${coins.length} ${coin}: ` : `${coin}: `;
    try {
      status(pre + 'lade Kursdaten …', (i) / coins.length);
      const series = await loadHistory(coin, style);
      const res = await (IS_RANDOM(engine) ? runRandomBase : runBacktest)(coin, style, series, { engine, regime,
        onProgress: (x) => status(pre + 'spiele Signale nach …', (i + x) / coins.length),
        shouldStop: () => stopFlag,
      });
      res.trades.forEach((t) => { t.coin = coin; });
      if (stopFlag) break; // halbfertigen Coin nicht speichern
      runs.push({ ...res, coin });
    } catch (e) {
      runs.push({ coin, trades: [], missed: [], error: e.message });
    }
    persist({ ...cp, runs }); // Zwischenstand nach jedem Coin (im Hintergrund)
  }
  const label = `${sel === ALL ? 'Watchlist' : sel === TRADE ? 'Handelbare Märkte' : sel === SAMPLE ? 'Stichprobe' : dn(sel)} · ${CONFIG.signals.modes[style].label} · ${BT.days[style]} Tage${ENG_TAG[engine] || ''}`;
  const complete = !stopFlag && runs.length === coins.length;
  last = { label, runs, trades: runs.flatMap((r) => r.trades).sort((a, b) => a.time - b.time), missed: runs.reduce((n, r) => n + (r.missedN ?? r.missed?.length ?? 0), 0), complete, done: runs.length, total: coins.length, engine, fundingPctDay: FUNDING.pctPerDay, ...(IS_RANDOM(engine) ? { rnd: sumDraws(runs.map((r) => r.rnd)) } : {}),
    from: Math.min(...runs.map((r) => r.from).filter(Boolean)), to: Math.max(...runs.map((r) => r.to).filter(Boolean)) };
  saveBacktest(last, keyOf(style, engine)); // für „Daten für Claude“
  await saving;
  if (complete) { await saveResult(keyOf(style, engine), last); await clearRun(); } // nur vollständige Läufe ersetzen das gespeicherte Ergebnis
  globalThis.__wdBusy = false;
  renderSaved();
  const errs = runs.filter((r) => r.error);
  status(stopFlag ? 'Abgebrochen, Teilergebnis:' : errs.length ? `Fertig. Nicht geladen: ${errs.map((r) => r.coin).join(', ')}` : 'Fertig.', null);
  running = false;
  $('bt-run').textContent = 'Backtest starten';
  renderResult();
}

// Eine Zeile unter dem Start-Knopf: unterbrochener Lauf (Weitermachen) und gespeicherte Ergebnisse je Stil
const BT_STYLES = ['swing', 'intraday', 'scalp', 'swing:e2', 'intraday:e2', 'scalp:e2', 'swing:bm', 'intraday:bm', 'scalp:bm', 'swing:bf', 'intraday:bf', 'scalp:bf', 'swing:dc', 'swing:rn', 'intraday:rn', 'scalp:rn', 'swing:rd'];
const keyLabel = (k) => CONFIG.signals.modes[k.split(':')[0]].label + (k.endsWith(':e2') ? ' E2' : k.endsWith(':bm') ? ' Maßstab' : k.endsWith(':bf') ? ' Neu im Trend' : k.endsWith(':dc') ? ' Donchian' : k.endsWith(':rn') ? ' Zufall' : k.endsWith(':rd') ? ' Zufall (Donchian)' : '');
let indexChecked = false;
// 8b1: Gespeichertes Ergebnis zu einer Auswahl zeigen (Knopf in der Liste oder Tipp auf Stil bzw. Engine)
const note = (txt) => { $('bt-status').innerHTML = `<p class="empty" style="font-size:13px;margin:10px 0 0">${esc(txt)}</p>`; };
async function showSaved(key, viaButton = false) {
  if (running) return;
  note('Lade gespeichertes Ergebnis …', null);
  const r = await loadResultWait(key);
  if (running) return;
  if (!r) {
    note(viaButton ? 'Das gespeicherte Ergebnis ließ sich nicht laden. App einmal schließen und neu öffnen, dann noch einmal versuchen.' : 'Für diese Auswahl ist noch nichts gespeichert. „Backtest starten“ rechnet sie.', null);
    return;
  }
  style = r.style.split(':')[0]; engine = r.engine || 1; last = r;
  saveBacktest(r, key); // Zusammenfassung für „Daten für Claude“ auffrischen (seit 8b1 mit beiden Zeiträumen)
  note(`Gespeichertes Ergebnis vom ${new Date(r.at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`, null);
  renderControls(); renderResult();
}
async function renderSaved() {
  const box = $('bt-resume');
  if (!box) return;
  // Ergebnisse von vor 8b1 einmal je Sitzung ins Verzeichnis nachtragen (im Hintergrund, mit Geduld)
  if (!indexChecked) { indexChecked = true; rebuildIndex(BT_STYLES).then((changed) => { if (changed) renderSaved(); }).catch(() => {}); }
  const run = running ? null : await loadRun();
  const saved = await savedList(BT_STYLES);
  const time = (t) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  box.innerHTML = (run && remaining(run).length
    ? `<div class="bt-pause">${esc(CONFIG.signals.modes[run.style].label)}${ENG_SHORT[run.engine] || ''} · ${esc(run.sel === ALL ? 'Watchlist' : run.sel === TRADE ? 'Handelbare Märkte' : run.sel === SAMPLE ? 'Stichprobe' : dn(run.sel))} unterbrochen bei ${run.runs.length} von ${run.coins.length}
        <span><button type="button" id="bt-go" class="small-btn">Weitermachen</button><button type="button" id="bt-drop" class="small-btn ghost">Verwerfen</button></span></div>` : '')
    + (saved.length ? `<details class="bt-saved-box" id="bt-saved-box"${savedOpen ? ' open' : ''}><summary>Gespeicherte Läufe (${saved.length})</summary><div class="bt-saved">${saved.sort((a, b) => b.at - a.at).map((x) => `<button type="button" data-bt-show="${x.style}">${esc(keyLabel(x.style))} ✓ ${day(x.at)} ${time(x.at)}</button>`).join('')}</div></details>` : '');
  $('bt-saved-box')?.addEventListener('toggle', (e) => { savedOpen = e.target.open; });
}

// Suche über alle Hyperliquid-Märkte (auch xyz: Rohstoffe, Aktien, Devisen)
function renderHits() {
  const q = $('bt-q').value, box = $('bt-hits');
  if (!q.trim()) { box.innerHTML = ''; return; }
  const hits = matchMarkets(q, getNames());
  box.innerHTML = hits.length
    ? hits.map((c) => `<button type="button" data-bt-pick="${esc(c)}">${esc(dn(c))}${c.includes(':') ? ` <small class="muted">${esc(c.split(':')[0])}</small>` : ''}</button>`).join('')
    : `<p class="empty" style="font-size:13px">${getNames().length ? 'Kein Markt gefunden.' : 'Marktliste lädt noch …'}</p>`;
}

export function initBacktest(getState = () => ({})) {
  getNames = () => Object.values(getState().markets || {}).flat();
  renderControls();
  onWatchlist(() => renderControls());
  onTradeable(() => renderControls());
  $('bt-q').addEventListener('input', renderHits);
  $('bt-hits').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-bt-pick]');
    if (!b || running) return;
    extra = b.dataset.btPick;
    renderControls(extra);
    $('bt-q').value = ''; renderHits();
  });
  $('bt-styles').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-bts]');
    if (!b || running) return;
    if (DAILY_ONLY(engine) && b.dataset.bts !== 'swing') { note('Donchian rechnet mit Tageskerzen und läuft nur als Swing (180 Tage).'); return; }
    style = b.dataset.bts;
    renderControls();
    showSaved(keyOf(style, engine)); // 8b1: gespeichertes Ergebnis dieser Auswahl gleich zeigen
  });
  $('bt-run').addEventListener('click', () => start());
  // 6a: Unterbrochenen Lauf anbieten, letztes Ergebnis des Stils wieder anzeigen
  $('bt-resume')?.addEventListener('click', async (e) => {
    if (e.target.id === 'bt-go') { const r = await loadRun(); if (r) start(r); }
    if (e.target.id === 'bt-drop') { await clearRun(); renderSaved(); }
    const b = e.target.closest('button[data-bt-show]');
    if (b) showSaved(b.dataset.btShow, true);
  });
  renderSaved().then(async () => { if (!last) { const r = await loadResultWait(keyOf(style, engine)); if (r && !last && !running) { last = r; renderResult(); } } });
  $('bt-engine')?.addEventListener('change', (e) => {
    if (running) { e.target.value = String(engine); return; }
    engine = Number(e.target.value);
    if (DAILY_ONLY(engine)) style = 'swing'; // 8d: Donchian gibt es nur auf Tageskerzen
    renderControls();
    showSaved(keyOf(style, engine));
  });
  $('bt-out').addEventListener('click', (e) => { if (e.target.closest('#bt-export')) shareReport(getState); });
}
