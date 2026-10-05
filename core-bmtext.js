// Telegram-Text für Maßstab-Signale (8b): gleiche Gliederung wie die bisherigen Signale (5f), ohne Score.
import { CONFIG } from './config.js';
import { signalLeverage } from './core-alerts.js';
import { BM, BM_LABEL } from './core-benchmark.js';
import * as f from './core-format.js';

const dn = (c) => String(c ?? '').replace(/^[a-z]+:/, '');

export function bmSignalText(r, alert, { noCapital = false, appUrl = CONFIG.alerts.appUrl, star = false, id = null, exchangeMax = null } = {}) {
  const p = r.plan, cfg = BM();
  const stopPct = ((p.stop - p.entry) / p.entry) * 100;
  const line = '━━━━━━━━━━━━';
  const lines = [
    `📌 <b>WOLF DESK${id ? ` #WD-${String(id).padStart(4, '0')}` : ''}</b>`,
    `🟢 <b>LONG · ${f.esc(dn(r.coin))}</b> · ${BM_LABEL}`,
    `Hebel: ${signalLeverage(p, r.best || r.mode, exchangeMax)}`,
    line,
    `<b>Einstieg:</b> ${f.price(p.entry)} (zum Kurs)`,
    `<b>Ziele:</b> ${p.tps.slice(0, 4).map((t, i) => `TP${i + 1} ${f.price(t)}`).join(' · ')}`,
    `<b>Stop:</b> ${f.price(p.stop)} (−${f.pct(Math.abs(stopPct), 1)})`,
    line,
    `Neu im Aufwärtstrend: Tages-EMA ${cfg.emaFast} über EMA ${cfg.emaSlow}, Kurs zurück über der EMA ${cfg.emaFast} (${cfg.setupTf.toUpperCase()}-Schluss).`,
    `Stop ${String(cfg.atrMult).replace('.', ',')}× ATR (Tag), Ziele bei ${cfg.tps.map((k) => String(k).replace('.', ',')).join(' / ')}R.`,
    `Ungültig bei Schluss unter ${f.price(p.stop)}.`,
    `Maßstab${star ? ' ⭐' : ''} · Kurs ${f.price(alert.price ?? p.entry)}`,
  ];
  if (noCapital) lines.push('⚠️ Kein Kapital frei, nur zur Beobachtung');
  lines.push(`<a href="${appUrl}">In Wolf Desk öffnen</a>`);
  return lines.join('\n');
}
