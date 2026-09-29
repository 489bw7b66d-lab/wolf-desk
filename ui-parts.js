// Gemeinsame Anzeige-Bausteine für mehrere Bereiche.
import * as f from './core-format.js';
import { levStatus } from './core-risk.js';
import { levPreview } from './core-levpreview.js';

// Anzeigename: Börsen-Präfix (z. B. „xyz:“) ausblenden, intern bleibt der volle Name
// Markierung, ob ein Signal zu deiner Einschätzung passt (⭐) oder dagegen läuft (⚠︎)
export function viewMark(al, long = false) {
  if (al === 'mit') return `<span class="view-mark mit" title="passt zu deiner Einschätzung">⭐${long ? ' passt zu deiner Einschätzung' : ''}</span>`;
  if (al === 'gegen') return `<span class="view-mark gegen" title="gegen deine Einschätzung">⚠︎${long ? ' gegen deine Einschätzung' : ''}</span>`;
  return '';
}
export const dn = (c) => String(c ?? '').replace(/^[a-z]+:/, '');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const TFL = { '5m': '5M', '15m': '15M', '1h': '1H', '4h': '4H', '1d': '1D' };
export const CHART_TFS = ['5m', '15m', '1h', '4h', '1d']; // alle Zeitebenen zum Umschalten im Chart
const DIR = { long: ['LONG', 'long'], short: ['SHORT', 'short'], neutral: ['KEIN SIGNAL', 'muted'] };

export function badge(dir) {
  const [t, c] = DIR[dir];
  return `<span class="sig-badge ${c}">${t}${dir === 'long' ? ' ▲' : dir === 'short' ? ' ▼' : ''}</span>`;
}

const pctFrom = (from, to) => ((to - from) / from) * 100;
const signedPct = (v) => (v >= 0 ? '+' : '−') + f.pct(Math.abs(v), 2);

// Preisleiter in Handelsreihenfolge: Einstieg, dann TP1 bis TP4, zum Schluss der Stop-Loss (Long und Short gleich)
export function ladder(p, extra = '') {
  const row = (label, price, cls, info) => `<div class="lvl"><span class="dot" style="background:var(--${cls})"></span><span class="lbl">${label}</span><span class="px">${price}</span><span class="pc ${cls === 'gold' ? 'muted' : cls === 'ok' ? 'long' : 'short'}">${info}</span></div>`;
  const levels = [
    row('Einstieg', `${f.price(p.zone[0])} – ${f.price(p.zone[1])}`, 'gold', p.method === 'fib' ? 'Fib 0,5–0,618' : 'Zone'),
    ...p.tps.map((tp, i) => row(`TP${i + 1}`, f.price(tp), 'ok', `${signedPct(pctFrom(p.entry, tp))}${p.method === 'fib' ? ' · ' + esc(p.tpLabels[i]) : ''} · ${(Math.abs(tp - p.entry) / p.R).toFixed(1).replace('.', ',')}R`)),
    row('Stop-Loss', f.price(p.stop), 'bad', `${signedPct(pctFrom(p.entry, p.stop))} · ${esc(p.stopLabel)}`),
  ];
  return `<div class="ladder">${levels.join('')}${extra}</div>`;
}

// Gründe für ein Signal kompakt: gleiche Ereignisse über Timeframes zusammenfassen
export function topReasons(r, max = 3) {
  const groups = new Map();
  [...r.events.filter((e) => e.dir === r.dir)].sort((a, b) => (b.strong - a.strong) || (a.barsAgo - b.barsAgo)).forEach((e) => {
    const name = e.name.replace(/ \(.*\)$/, '').replace(/ ×.*$/, '');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(TFL[e.tf] || e.tf);
  });
  const list = [...groups.entries()].slice(0, max).map(([n, tfs]) => `${n} (${tfs.join(', ')})`);
  const w = r.waves.find((x) => x.bias === r.dir);
  if (w) list.push(`Elliott ${TFL[w.tf]}: ${w.label}`);
  return list;
}

// Stil-Auswahl: Scalp / Daytrade / Swing mit Bewertung, aktiver Stil hervorgehoben, bester mit ★
export function styleRow(r, modes, quiet = false) { // quiet: ohne Warnzeile (z. B. Trade-Karte aus einem Signal)
  if (!r.styles) return '';
  return `<div class="styles" role="group" aria-label="Trade-Stil">${['scalp', 'intraday', 'swing'].map((k) => {
    const s = r.styles[k];
    const txt = s.ok ? `✓ ${s.score}` : '✗';
    return `<button type="button" data-style="${k}" aria-pressed="${r.mode === k}" class="${s.ok ? 'ok' : 'no'}" title="${esc(s.ok ? 'Geeignet' : s.reason)}">
      <span>${r.best === k ? '★ ' : ''}${esc(modes[k].label)}</span><small>${txt}</small></button>`;
  }).join('')}</div>
  ${!quiet && r.styles[r.mode] && !r.styles[r.mode].ok ? `<p class="warnline" style="color:var(--warn);margin-top:6px">${esc(modes[r.mode].label)}: ${esc(r.styles[r.mode].reason)}</p>` : ''}`;
}

// Ausstiegsplan als Tabelle
export function exitTable(plan, runnerNote) {
  if (!plan) return '';
  return `<div class="exit" role="table" aria-label="Ausstiegsplan">
    <div class="exit-row head" role="row"><span>Ziel</span><span>Preis</span><span>Anteil</span><span>Wert</span><span>Gewinn</span></div>
    ${plan.rows.map((x) => `<div class="exit-row" role="row"><span><b>${esc(x.label)}</b></span>
      <span>${x.price != null ? f.price(x.price) : 'offen'}</span><span>${x.pct} %</span><span>${f.usdShort(x.value).replace('+', '')}</span>
      <span class="${x.profit == null ? 'muted' : x.profit >= 0 ? 'long' : 'short'}">${x.profit != null ? f.usdShort(x.profit) : 'Trailing'}</span></div>`).join('')}
    <div class="exit-row total" role="row"><span><b>Summe</b></span><span></span><span>${plan.pctFixed} %</span><span></span><span class="long"><b>${f.usdShort(plan.totalFixed)}</b></span></div>
  </div>
  <div class="exit-note">${tipInline(`Summe, wenn TP1 bis TP4 erreicht werden, Runner zusätzlich. Runner: ${runnerNote}.`)}</div>`;
}

// Vorschlag, wenn das Kapital für das Wunschrisiko nicht reicht
export function fitHint(fit, equity, budgetPct) {
  if (!fit) return '';
  const pct = equity > 0 ? (fit.riskAmt / equity) * 100 : null;
  return `<div class="fit-box">
    <b>Machbar bei ${f.lev(fit.lev)} mit ${budgetPct} % deines verfügbaren Kapitals</b>
    <span>Position ${f.usd(fit.notional)} · Margin ${f.usd(fit.margin)} · Risiko ${f.usd(fit.riskAmt)} (${f.pct(pct)})</span>
    ${pct ? `<button type="button" class="small-btn" data-risk="${Math.floor(pct * 10) / 10}">Übernehmen</button>` : ''}
  </div>`;
}

// Bestätigungs-Siegel (Retest), nur in Signalrichtung
export const confirmsFor = (r) => (r?.confirms || []).filter((c) => c.dir === r.dir);
export function seal(r, compact = false) {
  const c = confirmsFor(r);
  if (!c.length || r.dir === 'neutral') return '';
  if (compact) return '<span class="seal small" title="Retest bestätigt" aria-label="Retest bestätigt">🛡</span>';
  return `<div class="seal-box"><span class="seal">🛡 Bestätigt</span>
    <span>${c.map((x) => `${esc(x.type)} (${TFL[x.tf] || x.tf}) bei ${f.price(x.level)}${x.barsAgo ? `, vor ${x.barsAgo} K.` : ', frisch'}`).join(' · ')}</span></div>`;
}

// Hebel-Schieberegler mit Farbzonen. ctx: { notional, available, liqMax, exchangeMax, styleMax, budgetPct }
const LEV_COL = { ok: '#4ADE9B', warn: '#F2B544', bad: '#FF7070' };
const LEV_TXT = { ok: 'Sicher', warn: 'Grenzwertig', bad: 'Nicht machbar' };
export function levRange(ctx) { return Math.max(2, Math.min(50, ctx.exchangeMax || 50)); }
export function levInfo(lev, ctx) {
  const st = levStatus(lev, ctx);
  const why = st.issues.length ? st.issues.map((i) => i.text).join(' · ')
    : st.status === 'warn' ? `Margin über ${ctx.budgetPct} % deines verfügbaren Kapitals` : 'Liquidation hinter dem Stop, Kapital reicht, innerhalb deiner Grenzen';
  return { ...st, why };
}
export function levSlider(lev, rec, ctx) {
  const max = levRange(ctx);
  const stops = [];
  for (let i = 1; i <= max; i++) {
    const c = LEV_COL[levStatus(i, ctx).status];
    const a = ((i - 1.5) / (max - 1)) * 100, b = ((i - 0.5) / (max - 1)) * 100;
    stops.push(`${c} ${Math.max(0, a).toFixed(2)}%`, `${c} ${Math.min(100, b).toFixed(2)}%`);
  }
  const info = levInfo(lev, ctx);
  const recPos = rec ? ((rec - 1) / (max - 1)) * 100 : null;
  const head = `<div class="lev-head">
      <span class="k">Hebel${ctx.note ? ' <span class="tip-mark" aria-hidden="true">ⓘ</span>' : ''}</span>
      <b class="lev-now" data-lev-out="val">${lev}×</b>
      <span class="lev-tag ${info.status}" data-lev-out="tag">${LEV_TXT[info.status]}</span>
    </div>`;
  return `<div class="lev-box">
    ${ctx.note ? `<details class="tip-h"${tipAttr('lev')}><summary>${head}</summary><p class="tip-text" style="margin-top:6px">${esc(ctx.note)}</p></details>` : head}
    <div class="lev-track-wrap">
      ${recPos != null ? `<span class="lev-rec" style="left:calc(${recPos.toFixed(2)}% )" aria-hidden="true">▼ ${rec}×</span>` : ''}
      <input type="range" class="lev-range" min="1" max="${max}" step="1" value="${lev}" aria-label="Hebel" aria-valuetext="${lev}-fach, ${LEV_TXT[info.status]}"
        style="--track: linear-gradient(90deg, ${stops.join(', ')})">
    </div>
    <div class="lev-scale"><span>1×</span><span>${max}×</span></div>
    <p class="lev-why ${info.status}" data-lev-out="why">${esc(info.why)}</p>
    ${ctx.plan ? `<div data-lev-out="prev">${levPreviewHtml(lev, info.margin, ctx)}</div>` : ''}
    ${rec && rec !== lev ? `<button type="button" class="small-btn ghost" data-lev-rec="${rec}">Auf Empfehlung ${rec}× setzen</button>` : ''}
  </div>`;
}
// Beim Ziehen nur Texte aktualisieren (kein Neuaufbau, damit der Regler nicht springt)
export function updateLevOut(root, lev, ctx, onMargin) {
  const info = levInfo(lev, ctx);
  const q = (k) => root.querySelector(`[data-lev-out="${k}"]`);
  if (q('val')) q('val').textContent = lev + '×';
  if (q('tag')) { q('tag').textContent = LEV_TXT[info.status]; q('tag').className = 'lev-tag ' + info.status; }
  if (q('why')) { q('why').textContent = info.why; q('why').className = 'lev-why ' + info.status; }
  if (q('prev') && ctx.plan) q('prev').innerHTML = levPreviewHtml(lev, info.margin, ctx);
  onMargin?.(info.margin, info.status);
  return info;
}

// Vorschau unter dem Hebel-Regler: Preis-Balken Liq · SL · Einstieg · Ziele und Margin-Anteil am freien Kapital.
// Schiebst du den Hebel hoch, wandert der Liq-Strich Richtung Stop, der Puffer dazwischen färbt sich grün → gelb → rot.
export function levPreviewHtml(lev, margin, ctx) {
  const pv = levPreview(ctx.plan, lev, { bufferPct: ctx.bufferPct, margin, available: ctx.available, budgetPct: ctx.budgetPct });
  if (!pv) return '';
  const pct = (x) => (x * 100).toFixed(1);
  const edge = (x) => (x.at < 0.06 ? ' first' : x.at > 0.94 ? ' last' : '');
  // Liegen Liq und SL dicht beieinander, rutscht die Liq-Beschriftung in eine zweite Zeile
  const close = Math.abs(pv.ticks[0].at - pv.ticks[1].at) < 0.1;
  const gapCls = { ok: 'ok', warn: 'warn', bad: 'bad' }[pv.status];
  const bufTxt = pv.buffer < 0 ? 'vor dem Stop' : `Puffer ${f.pct(pv.buffer, 1)}`;
  const share = pv.share != null ? Math.min(100, pv.share) : null;
  return `<div class="lp" role="img" aria-label="Vorschau bei ${lev}-fach: Liquidation bei ${f.price(pv.liqPrice)}, ${bufTxt}">
    <div class="path-track lp-track">
      <span class="lp-gap ${gapCls}" style="left:${pct(pv.gap.from)}%;width:${pct(Math.max(0.006, pv.gap.to - pv.gap.from))}%"></span>
      ${pv.ticks.map((x) => `<i class="path-tick ${x.key}${x.pinned ? ' pinned' : ''}" style="left:${pct(x.at)}%"></i>`).join('')}
    </div>
    <div class="path-labels${close ? ' two' : ''}">${pv.ticks.map((x) => `<span class="${x.key}${edge(x)}${close && x.key === 'liq' ? ' r1' : ''}" style="left:${pct(x.at)}%">${x.label}</span>`).join('')}</div>
    ${share != null ? `<div class="bar lp-margin" title="Margin-Anteil am freien Kapital"><span class="lp-m ${pv.marginStatus}" style="width:${share.toFixed(1)}%"></span><i style="left:${Math.min(100, pv.budgetPct)}%"></i></div>` : ''}
    <p class="lp-info"><span class="${gapCls}">Liq ${f.price(pv.liqPrice)} · ${bufTxt}</span>${pv.share != null ? ` · <span class="${pv.marginStatus}">Margin ${f.pct(pv.share, 0)} vom Freien</span>` : ''}</p>
  </div>`;
}

// Aufgeklappte Erklärungen merken: Viele Karten werden jede Sekunde neu gezeichnet (Live-Kurse),
// ohne Gedächtnis klappte ein ⓘ sofort wieder zu. Schlüssel = Text ohne Zahlen (die ändern sich laufend) oder eigener Schlüssel.
const openTips = new Set();
export const tipKey = (t) => String(t ?? '').replace(/[0-9.,+−\-%$×]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
export const isTipOpen = (key) => openTips.has(key);
export function rememberTip(key, open) { if (open) openTips.add(key); else openTips.delete(key); }
if (typeof document !== 'undefined') {
  // „toggle“ steigt nicht auf, daher in der Einfangphase lauschen
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d?.matches?.('details[data-tip]')) rememberTip(d.dataset.tip, d.open);
  }, true);
}
const tipAttr = (key) => ` data-tip="${esc(key)}"${openTips.has(key) ? ' open' : ''}`;

// Erklärung zum Antippen statt dauerhafter Fußnote: ⓘ klappt den Text auf
export function tipInline(text, key = tipKey(text)) {
  return `<details class="tip-i"${tipAttr(key)}><summary aria-label="Erklärung">ⓘ</summary><span class="tip-text">${esc(text)}</span></details>`;
}
// Überschrift, die beim Antippen ihre Erklärung zeigt
export function tipHead(title, text, extra = '', key = 'h|' + tipKey(title)) {
  return `<details class="tip-h"${tipAttr(key)}><summary><h3 class="sub-h">${title} <span class="tip-mark" aria-hidden="true">ⓘ</span>${extra}</h3></summary><p class="tip-text">${esc(text)}</p></details>`;
}

// Coin-Logo von Hyperliquid (app.hyperliquid.xyz/coins/NAME.svg). Fehlt eins, bleibt ein Kreis mit Anfangsbuchstaben.
// Gegen Blinken (viele Karten werden jede Sekunde neu gezeichnet): Jedes Logo wird genau einmal im Hintergrund geladen.
// Erst wenn es da ist, zeigt der Kreis es als CSS-Hintergrund – ein neu gezeichnetes Element holt es dann ohne Nachladen
// aus dem Speicher, statt wie ein neues <img> kurz leer aufzublitzen.
let logoBase = 'https://app.hyperliquid.xyz/coins/';
export const setLogoBase = (b) => { logoBase = b; }; // nur für Tests
export const logoUrl = (coin) => `${logoBase}${encodeURIComponent(coin)}.svg`;
export const logoLetter = (coin) => (String(coin).replace(/^[a-z]+:/, '').replace(/^k(?=[A-Z])/, '')[0] || '?').toUpperCase();
const logoState = new Map(); // coin -> 'loading' | 'ok' | 'fail'
const logoKey = (coin) => String(coin).replace(/[^A-Za-z0-9]/g, '_');
export const logoStatus = (coin) => logoState.get(coin) || null;

function loadLogo(coin) {
  if (logoState.has(coin) || typeof Image === 'undefined' || typeof document === 'undefined') return;
  logoState.set(coin, 'loading');
  const img = new Image();
  img.onload = () => {
    logoState.set(coin, 'ok');
    let st = document.getElementById('ci-styles');
    if (!st) { st = document.createElement('style'); st.id = 'ci-styles'; document.head.appendChild(st); }
    st.sheet?.insertRule(`.ci.has-logo[data-ci="${logoKey(coin)}"]{background-image:url("${logoUrl(coin)}")}`, st.sheet.cssRules.length);
    // Schon sichtbare Kreise dieses Coins sofort umstellen (ohne auf das nächste Neuzeichnen zu warten)
    document.querySelectorAll(`.ci[data-ci="${logoKey(coin)}"]`).forEach((el) => { el.classList.add('has-logo'); el.textContent = ''; });
  };
  img.onerror = () => logoState.set(coin, 'fail');
  img.src = logoUrl(coin);
}

export function coinIcon(coin, size = 22) {
  loadLogo(coin);
  const ok = logoState.get(coin) === 'ok';
  return `<span class="ci${ok ? ' has-logo' : ''}" data-ci="${logoKey(coin)}" style="--ci:${size}px" aria-hidden="true">${ok ? '' : `<b>${esc(logoLetter(coin))}</b>`}</span>`;
}
