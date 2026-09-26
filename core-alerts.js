// Telegram-Wächter: Entscheidung, was gemeldet wird, und die Texte dazu.
// Reine Funktionen ohne Netzwerk, Tests in test-alerts.js. Das Server-Skript ist watcher.mjs.
import { CONFIG } from './config.js';
import { priceVsPlan } from './core-risk.js';
import { topReasons } from './ui-parts.js';
import * as f from './core-format.js';

const dn = (c) => String(c ?? '').replace(/^[a-z]+:/, '');
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const A = () => CONFIG.alerts;

// Soll ein Signal gemeldet werden? sent = { "COIN|dir": Zeitpunkt der letzten Meldung }
export function signalAlert(r, price, sent, now = Date.now(), cfg = A()) {
  if (!r || r.dir === 'neutral' || !r.plan || !r.best) return null;
  const score = r.total[r.dir];
  if (score < cfg.minScore) return null;
  const pos = priceVsPlan(r.plan, price);
  if (!pos || !cfg.states.includes(pos.state)) return null;
  const key = r.coin + '|' + r.dir;
  if (sent[key] != null && now - sent[key] < cfg.repeatHours * 3600e3) return null;
  return { key, score, pos, price };
}

// Regelverstöße vergleichen: neu aufgetreten und wieder behoben.
// bad = { "NEAR|Abstand Liquidation": "Text" }, prev = gleiche Form vom letzten Lauf
export function riskDiff(prev, bad) {
  const added = Object.keys(bad).filter((k) => !(k in (prev || {})));
  const solved = Object.keys(prev || {}).filter((k) => !(k in bad));
  return { added, solved };
}

// Alle roten Punkte aus der Risiko-Auswertung (Positionen und Konto)
export function badChecks(risk) {
  const out = {};
  if (!risk) return out;
  risk.positions.forEach((p) => p.evaluation.checks.filter((c) => c.status === 'bad')
    .forEach((c) => { out[p.coin + '|' + c.rule] = c.text; }));
  risk.checks.filter((c) => c.status === 'bad').forEach((c) => { out['Konto|' + c.rule] = c.text; });
  return out;
}

const STATE_TXT = { zone: 'in der Einstiegszone', early: 'vor der Zone, Limit-Order möglich' };

export function signalText(r, alert, { noCapital = false, appUrl = A().appUrl } = {}) {
  const p = r.plan, long = p.dir === 'long';
  const stopPct = ((p.stop - p.entry) / p.entry) * 100;
  const shield = (r.confirms || []).some((c) => c.dir === p.dir) ? ' 🛡' : '';
  const lines = [
    `${long ? '🟢' : '🔴'} <b>${long ? 'LONG' : 'SHORT'} · ${esc(dn(r.coin))}</b> · ${esc(CONFIG.signals.modes[r.best].label)} · Score ${alert.score}${shield}`,
    `Kurs ${f.price(alert.price ?? p.entry)} · ${STATE_TXT[alert.pos.state] || alert.pos.state}`,
    `Einstieg ${f.price(p.zone[0])} – ${f.price(p.zone[1])}`,
    `TP1 ${f.price(p.tps[0])} · TP2 ${f.price(p.tps[1])}`,
    `Stop ${f.price(p.stop)} (${stopPct >= 0 ? '+' : '−'}${f.pct(Math.abs(stopPct), 1)})`,
  ];
  const why = topReasons(r, 2);
  if (why.length) lines.push(esc(why.join(' · ')));
  if (noCapital) lines.push('⚠️ Kein Kapital frei, nur zur Beobachtung');
  lines.push(`<a href="${appUrl}">In Wolf Desk öffnen</a>`);
  return lines.join('\n');
}

export function riskText(added, solved, bad, prev) {
  const name = (k) => { const [c, rule] = k.split('|'); return `<b>${esc(dn(c))}</b> ${esc(rule)}`; };
  const lines = [];
  if (added.length) {
    lines.push('🚨 <b>Regelverstoß</b>');
    added.forEach((k) => lines.push(`• ${name(k)}: ${esc(bad[k])}`));
  }
  if (solved.length) {
    if (lines.length) lines.push('');
    lines.push('✅ <b>Entwarnung</b>');
    solved.forEach((k) => lines.push(`• ${name(k)} ist wieder im Rahmen`));
  }
  return lines.join('\n');
}
