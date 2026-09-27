// Telegram-Wächter: Entscheidung, was gemeldet wird, und die Texte dazu.
// Reine Funktionen ohne Netzwerk, Tests in test-alerts.js. Das Server-Skript ist watcher.mjs.
import { CONFIG } from './config.js';
import { priceVsPlan } from './core-risk.js';
import { topReasons } from './ui-parts.js';
import * as f from './core-format.js';

const dn = (c) => String(c ?? '').replace(/^[a-z]+:/, '');
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const A = () => CONFIG.alerts;

// Für Telegram nur erlaubte Stile (kein Scalp): bester erlaubter Stil oder null
export function telegramView(r, styles = A().styles) {
  if (!r?.styles || !r.all) return r?.best && styles.includes(r.best) ? r : null;
  const k = styles.filter((s) => r.styles[s]?.ok).sort((a, b) => r.styles[b].score - r.styles[a].score)[0];
  const t = k && r.all[k];
  return t && !t.error ? { ...t, styles: r.styles, all: r.all, best: k } : null;
}

// Soll ein Signal gemeldet werden? sent = { "COIN|dir": Zeitpunkt der letzten Meldung }
// extra: volume (24h-Umsatz in $), lastDir = { COIN: { dir, at } } für den Schutz vor Richtungswechseln
export function signalAlert(r, price, sent, now = Date.now(), cfg = A(), extra = {}) {
  if (!r || r.dir === 'neutral' || !r.plan || !r.best) return null;
  if (cfg.styles && !cfg.styles.includes(r.best)) return null;
  if (extra.volume != null && cfg.minVolumeUsd && extra.volume < cfg.minVolumeUsd) return null;
  const ld = extra.lastDir?.[r.coin];
  if (ld && ld.dir !== r.dir && now - ld.at < (cfg.flipHours ?? 24) * 3600e3) return null;
  const score = r.total[r.dir];
  if (score < cfg.minScore) return null;
  const pos = priceVsPlan(r.plan, price);
  if (!pos || !cfg.states.includes(pos.state)) return null;
  const key = r.coin + '|' + r.dir;
  if (sent[key] != null && now - sent[key] < cfg.repeatHours * 3600e3) return null;
  return { key, score, pos, price };
}

// Regelverstöße vergleichen: neu aufgetreten und wieder behoben.
// bad = { "NEAR|Abstand Liquidation": "Text" }, prev = aktive Alarme vom letzten Lauf.
// hold = Punkte, die nur noch gelb sind: ein laufender Alarm bleibt dann bestehen (keine Entwarnung),
// damit ein Wert, der um die Grenze pendelt, nicht ständig Alarm und Entwarnung auslöst.
export function riskDiff(prev, bad, hold = {}) {
  const p = prev || {};
  const added = Object.keys(bad).filter((k) => !(k in p));
  const solved = Object.keys(p).filter((k) => !(k in bad) && !(k in hold));
  const active = { ...Object.fromEntries(Object.keys(p).filter((k) => k in hold).map((k) => [k, p[k]])), ...bad };
  return { added, solved, active };
}

// Alle roten (oder mit status = 'warn' gelben) Punkte aus der Risiko-Auswertung (Positionen und Konto)
export function badChecks(risk, status = 'bad') {
  const out = {};
  if (!risk) return out;
  risk.positions.forEach((p) => p.evaluation.checks.filter((c) => c.status === status)
    .forEach((c) => { out[p.coin + '|' + c.rule] = c.text; }));
  risk.checks.filter((c) => c.status === status).forEach((c) => { out['Konto|' + c.rule] = c.text; });
  return out;
}

const stateTxt = (state, dir) => (state === 'zone' ? 'in der Einstiegszone'
  : state === 'early' ? (dir === 'long' ? 'knapp unter der Zone, noch über dem Stop' : 'knapp über der Zone, noch unter dem Stop') : state);

export function signalText(r, alert, { noCapital = false, appUrl = A().appUrl } = {}) {
  const p = r.plan, long = p.dir === 'long';
  const stopPct = ((p.stop - p.entry) / p.entry) * 100;
  const shield = (r.confirms || []).some((c) => c.dir === p.dir) ? ' 🛡' : '';
  const lines = [
    `${long ? '🟢' : '🔴'} <b>${long ? 'LONG' : 'SHORT'} · ${esc(dn(r.coin))}</b> · ${esc(CONFIG.signals.modes[r.best].label)} · Score ${alert.score}${shield}`,
    `Kurs ${f.price(alert.price ?? p.entry)} · ${stateTxt(alert.pos.state, p.dir)}`,
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

// ===== Signal-Tagebuch: jedes gemeldete Signal wird mitgeschrieben und später ausgewertet =====
const eventName = (n) => n.replace(/ \(.*\)$/, '').replace(/ ×.*$/, '');

export function journalEntry(r, alert, now = Date.now()) {
  const p = r.plan;
  return {
    id: `${r.coin}|${r.dir}|${now}`, coin: r.coin, dir: r.dir, style: r.best, score: alert.score, state: alert.pos.state,
    px: alert.price, stop: p.stop, tps: p.tps.slice(0, 2), at: now, status: 'offen',
    events: [...new Set((r.events || []).filter((e) => e.dir === r.dir).map((e) => eventName(e.name)))],
    seal: (r.confirms || []).some((c) => c.dir === r.dir),
  };
}

// Was passierte nach der Meldung? Einstieg = Kurs bei Meldung (in oder knapp vor der Zone sofort handelbar).
// Zuerst TP1 = Treffer, zuerst Stop = Fehlsignal. Berühren beide dieselbe Kerze, zählt der Stop.
export function judgeSignal(e, candles, now = Date.now(), maxDays = 7) {
  const long = e.dir === 'long', sg = long ? 1 : -1;
  const R = Math.abs(e.px - e.stop);
  if (!(R > 0)) return { ...e, status: 'ungültig', r: 0 };
  let tp1 = false;
  for (const c of candles || []) {
    if (c.T <= e.at) continue;
    const hitStop = long ? c.l <= e.stop : c.h >= e.stop;
    if (!tp1) {
      if (hitStop) return { ...e, status: 'stop', r: -1, doneAt: c.T };
      if (long ? c.h >= e.tps[0] : c.l <= e.tps[0]) tp1 = true;
    }
    if (tp1) {
      // Nach TP1: Weiterlaufen bis TP2 oder zurück zum Einstieg (Stop nachgezogen)
      const r1 = Math.abs(e.tps[0] - e.px) / R, r2 = Math.abs(e.tps[1] - e.px) / R;
      if (long ? c.h >= e.tps[1] : c.l <= e.tps[1]) return { ...e, status: 'tp2', r: r2, doneAt: c.T };
      if (long ? c.l <= e.px : c.h >= e.px) return { ...e, status: 'tp1', r: r1, doneAt: c.T };
    }
  }
  if (now - e.at > maxDays * 864e5) {
    const last = candles?.at(-1)?.c ?? e.px;
    const r = tp1 ? Math.abs(e.tps[0] - e.px) / R : ((last - e.px) * sg) / R;
    return { ...e, status: tp1 ? 'tp1' : 'abgelaufen', r, doneAt: now };
  }
  return { ...e, tp1Reached: tp1 };
}

export function journalStats(list) {
  const done = list.filter((e) => e.status !== 'offen' && e.status !== 'ungültig');
  const win = (e) => e.status === 'tp1' || e.status === 'tp2';
  const stat = (l) => {
    const decided = l.filter((e) => win(e) || e.status === 'stop');
    return { n: l.length, hit: decided.length ? (decided.filter(win).length / decided.length) * 100 : null,
      avgR: l.length ? l.reduce((s, e) => s + (e.r || 0), 0) / l.length : null };
  };
  const names = [...new Set(done.flatMap((e) => e.events || []))];
  const events = names.map((name) => {
    const w = done.filter((e) => e.events?.includes(name)), wo = done.filter((e) => !e.events?.includes(name));
    const a = stat(w), b = stat(wo);
    return { name, ...a, edge: b.n ? a.avgR - b.avgR : null };
  }).filter((x) => x.n >= 3).sort((a, b) => (b.edge ?? -9) - (a.edge ?? -9));
  return {
    ...stat(done), open: list.filter((e) => e.status === 'offen').length,
    tp2: done.filter((e) => e.status === 'tp2').length, tp1: done.filter((e) => e.status === 'tp1').length,
    stop: done.filter((e) => e.status === 'stop').length, expired: done.filter((e) => e.status === 'abgelaufen').length,
    byStyle: ['swing', 'intraday'].map((k) => ({ k, ...stat(done.filter((e) => e.style === k)) })).filter((x) => x.n),
    byScore: [['75–79', 0, 80], ['80–84', 80, 85], ['85+', 85, 101]].map(([label, lo, hi]) => ({ label, ...stat(done.filter((e) => e.score >= lo && e.score < hi)) })).filter((x) => x.n),
    long: stat(done.filter((e) => e.dir === 'long')), short: stat(done.filter((e) => e.dir === 'short')),
    seal: stat(done.filter((e) => e.seal)), noSeal: stat(done.filter((e) => !e.seal)), events,
  };
}

const pc = (v) => (v == null ? '–' : f.pct(v, 0));
const rr = (v) => (v == null ? '–' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + 'R');

export function reportText(list, title = 'letzte 7 Tage') {
  const s = journalStats(list);
  const lines = [`📒 <b>Signal-Tagebuch</b> · ${title}`];
  if (!s.n) {
    lines.push(`Noch keine ausgewerteten Signale. ${s.open} laufen noch.`);
    return lines.join('\n');
  }
  lines.push(`${s.n} ausgewertet · ${s.open} laufen noch`,
    `Trefferquote (TP1 vor Stop): <b>${pc(s.hit)}</b> · Ø ${rr(s.avgR)}`,
    `✅ TP2 ${s.tp2} · ☑️ TP1 ${s.tp1} · ❌ Stop ${s.stop} · ⏳ abgelaufen ${s.expired}`, '');
  const row = (name, x) => `${name}: ${x.n} · ${pc(x.hit)} · ${rr(x.avgR)}`;
  s.byStyle.forEach((x) => lines.push(row(CONFIG.signals.modes[x.k].label, x)));
  s.byScore.forEach((x) => lines.push(row('Score ' + x.label, x)));
  if (s.long.n) lines.push(row('Long', s.long));
  if (s.short.n) lines.push(row('Short', s.short));
  if (s.seal.n && s.noSeal.n) lines.push(row('🛡 mit Siegel', s.seal), row('ohne Siegel', s.noSeal));
  if (s.events.length) {
    lines.push('', '<b>Ereignisse</b> (Vorteil in R gegenüber ohne)');
    s.events.slice(0, 4).forEach((e) => lines.push(`${esc(e.name)}: ${e.n} · ${rr(e.edge)}`));
  }
  if (s.n < 30) lines.push('', `Bei ${s.n} Signalen noch ein vorläufiges Bild.`);
  return lines.join('\n');
}
