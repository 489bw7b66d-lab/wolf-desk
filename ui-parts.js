// Gemeinsame Anzeige-Bausteine für mehrere Bereiche.
import * as f from './core-format.js';
import { levStatus } from './core-risk.js';

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
export function styleRow(r, modes) {
  if (!r.styles) return '';
  return `<div class="styles" role="group" aria-label="Trade-Stil">${['scalp', 'intraday', 'swing'].map((k) => {
    const s = r.styles[k];
    const txt = s.ok ? `✓ ${s.score}` : '✗';
    return `<button type="button" data-style="${k}" aria-pressed="${r.mode === k}" class="${s.ok ? 'ok' : 'no'}" title="${esc(s.ok ? 'Geeignet' : s.reason)}">
      <span>${r.best === k ? '★ ' : ''}${esc(modes[k].label)}</span><small>${txt}</small></button>`;
  }).join('')}</div>
  ${r.styles[r.mode] && !r.styles[r.mode].ok ? `<p class="warnline" style="color:var(--warn);margin-top:6px">${esc(modes[r.mode].label)}: ${esc(r.styles[r.mode].reason)}</p>` : ''}`;
}

// Ausstiegsplan als Tabelle
export function exitTable(plan, runnerNote) {
  if (!plan) return '';
  return `<div class="exit" role="table" aria-label="Ausstiegsplan">
    <div class="exit-row head" role="row"><span>Ziel</span><span>Preis</span><span>Anteil</span><span>Stück</span><span>Gewinn</span></div>
    ${plan.rows.map((x) => `<div class="exit-row" role="row"><span><b>${esc(x.label)}</b></span>
      <span>${x.price != null ? f.price(x.price) : 'offen'}</span><span>${x.pct} %</span><span>${f.size(x.qty)}</span>
      <span class="${x.profit == null ? 'muted' : x.profit >= 0 ? 'long' : 'short'}">${x.profit != null ? f.usdShort(x.profit) : 'Trailing'}</span></div>`).join('')}
    <div class="exit-row total" role="row"><span><b>Summe</b></span><span></span><span>${plan.pctFixed} %</span><span></span><span class="long"><b>${f.usdShort(plan.totalFixed)}</b></span></div>
  </div>
  <p class="empty" style="font-size:12px;margin-top:6px">Summe, wenn TP1 bis TP4 erreicht werden, Runner zusätzlich. Runner: ${esc(runnerNote)}.</p>`;
}

// Vorschlag, wenn das Kapital für das Wunschrisiko nicht reicht
export function fitHint(fit, equity, budgetPct) {
  if (!fit) return '';
  const pct = equity > 0 ? (fit.riskAmt / equity) * 100 : null;
  return `<div class="fit-box">
    <b>Machbar bei ${f.lev(fit.lev)} mit ${budgetPct} % deines verfügbaren Kapitals</b>
    <span>${f.size(fit.size)} Stück · Margin ${f.usd(fit.margin)} · Risiko ${f.usd(fit.riskAmt)} (${f.pct(pct)})</span>
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
  return `<div class="lev-box">
    <div class="lev-head">
      <span class="k">Hebel</span>
      <b class="lev-now" data-lev-out="val">${lev}×</b>
      <span class="lev-tag ${info.status}" data-lev-out="tag">${LEV_TXT[info.status]}</span>
    </div>
    <div class="lev-track-wrap">
      ${recPos != null ? `<span class="lev-rec" style="left:calc(${recPos.toFixed(2)}% )" aria-hidden="true">▼ ${rec}×</span>` : ''}
      <input type="range" class="lev-range" min="1" max="${max}" step="1" value="${lev}" aria-label="Hebel" aria-valuetext="${lev}-fach, ${LEV_TXT[info.status]}"
        style="--track: linear-gradient(90deg, ${stops.join(', ')})">
    </div>
    <div class="lev-scale"><span>1×</span><span>${max}×</span></div>
    <p class="lev-why ${info.status}" data-lev-out="why">${esc(info.why)}</p>
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
  onMargin?.(info.margin, info.status);
  return info;
}
