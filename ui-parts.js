// Gemeinsame Anzeige-Bausteine für mehrere Bereiche.
import * as f from './core-format.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const TFL = { '5m': '5M', '15m': '15M', '1h': '1H', '4h': '4H', '1d': '1D' };
const DIR = { long: ['LONG', 'long'], short: ['SHORT', 'short'], neutral: ['KEIN SIGNAL', 'muted'] };

export function badge(dir) {
  const [t, c] = DIR[dir];
  return `<span class="sig-badge ${c}">${t}${dir === 'long' ? ' ▲' : dir === 'short' ? ' ▼' : ''}</span>`;
}

const pctFrom = (from, to) => ((to - from) / from) * 100;
const signedPct = (v) => (v >= 0 ? '+' : '−') + f.pct(Math.abs(v), 2);

// Preisleiter: Ziele oben, Stop unten (bei Short umgekehrt)
export function ladder(p) {
  const row = (label, price, cls, extra) => `<div class="lvl"><span class="dot" style="background:var(--${cls})"></span><span class="lbl">${label}</span><span class="px">${price}</span><span class="pc ${cls === 'gold' ? 'muted' : cls === 'ok' ? 'long' : 'short'}">${extra}</span></div>`;
  const levels = [
    row('Stop-Loss', f.price(p.stop), 'bad', `${signedPct(pctFrom(p.entry, p.stop))} · ${esc(p.stopLabel)}`),
    row('Einstieg', `${f.price(p.zone[0])} – ${f.price(p.zone[1])}`, 'gold', p.method === 'fib' ? 'Fib 0,5–0,618' : 'Zone'),
    ...p.tps.map((tp, i) => row(`TP${i + 1}`, f.price(tp), 'ok', `${signedPct(pctFrom(p.entry, tp))}${p.method === 'fib' ? ' · ' + esc(p.tpLabels[i]) : ''} · ${(Math.abs(tp - p.entry) / p.R).toFixed(1).replace('.', ',')}R`)),
  ];
  if (p.dir === 'long') levels.reverse();
  return `<div class="ladder">${levels.join('')}</div>`;
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
