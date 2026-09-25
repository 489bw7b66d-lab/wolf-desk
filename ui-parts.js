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
