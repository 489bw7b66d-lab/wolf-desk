// Positions-Übersicht (8a): alles, was vorher als große Karte im Konto stand, als Baustein für das Positions-Blatt,
// dazu Mini-Balken und Gesamt-Risiko für die Startseite, Ausstiegsrechner und der manuelle Stop.
// Rechnet nichts selbst: Trade-Weg, Plan-Ampel und Regel-Prüfung kommen unverändert aus dem Kern.
import { CONFIG } from './config.js';
import { pathBar, planLine } from './ui-testpage.js';
import { trailText } from './core-trail.js';
import { totalRisk, totalRiskStatus } from './core-totalrisk.js';
import { exitCalc, qtyText, planHint } from './core-exitcalc.js';
import { getManualStop, setManualStop } from './core-stops.js';
import { tipInline, tipHead, esc, dn } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const pct1 = (x) => (x * 100).toFixed(1);
const signedPct = (v, d = 1) => (v == null ? '–' : (v >= 0 ? '+' : '−') + f.pct(Math.abs(v), d));

// Eingabe mit Komma oder Punkt (wie im Rechner)
export function parseNum(v) {
  let s = String(v ?? '').trim().replace(/\s|%/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : null;
}

// ===== Startseite =====
// Dünner Trade-Weg ohne Beschriftung: rot bis zum Einstieg, grün ab Einstieg, Striche für SL, Einstieg und Ziele
export function miniPath(path) {
  if (!path || path.empty) return '';
  const e = path.entry.at, at = path.mark ? path.mark.at : 0;
  const red = Math.min(at, e), green = Math.max(0, at - e);
  const ticks = [
    path.stop ? { at: path.stop.at, cls: path.stop.inProfit ? 'sl-gain' : 'sl' } : null,
    { at: e, cls: 'e' },
    ...path.tps.map((t) => ({ at: t.at, cls: t.passed ? 'tp done' : 'tp' })),
  ].filter(Boolean);
  return `<span class="mini-path" aria-hidden="true"><span class="path-fill loss" style="left:0;width:${pct1(red)}%"></span><span class="path-fill gain" style="left:${pct1(e)}%;width:${pct1(green)}%"></span>${ticks.map((x) => `<i class="path-tick ${x.cls}" style="left:${pct1(x.at)}%"></i>`).join('')}</span>`;
}

// Eine Zeile über der Positionsliste: Was passiert, wenn alle Stops greifen?
export function riskSum(positions, equity) {
  const t = totalRisk(positions, equity);
  if (!t) return '';
  const st = totalRiskStatus(t, CONFIG.rules.dailyLossLimitPct);
  const dirs = [t.long ? `${t.long} long` : '', t.short ? `${t.short} short` : ''].filter(Boolean).join(' / ');
  const tip = `Summe über alle Positionen, gerechnet vom aktuellen Kurs bis zum Stop (ohne Stop bis zur Liquidation). Offene Buchgewinne wären dann mit weg. Gegenüber den Einstiegen: ${f.signedUsd(t.fromEntry)}${t.pctEntry == null ? '' : ` (${signedPct(t.pctEntry)})`}. Alle Positionen zusammen sind ${f.usd(t.notional)} groß${t.leverage == null ? '' : `, das ${f.lev(t.leverage)}-fache des Kontos`}. Gleich gerichtete Positionen fallen in einem schwachen Markt oft gemeinsam. Gelb ab der Hälfte deines Tagesverlust-Limits, rot ab dem Limit.`;
  return `<div class="risk-sum ${st}"><span class="risk-main">Greifen alle Stops: <b>${f.signedUsd(t.fromNow)}</b>${t.pctNow == null ? '' : ` (${signedPct(t.pctNow)})`}</span>
    <span class="risk-side">${dirs}${t.noStop ? ` · <b class="short">${t.noStop} ohne Stop</b>` : ''} ${tipInline(tip, 'risk-sum')}</span></div>`;
}

// ===== Positions-Blatt =====
// p: angereicherte Position, t: laufender Trade (Teilverkäufe), pp: positionPlan(), rules: fertige Regel-Box
export function posOverview(p, t, pp, equity, rules = '', moreOpen = false) {
  const ev = p.evaluation || {};
  const long = p.side === 'long';
  const roe = p.marginUsed > 0 ? (p.upnl / p.marginUsed) * 100 : null;
  // Stop auf der Gewinnseite des Einstiegs: kein Risiko mehr, sondern gesicherter Mindestgewinn
  const inProfit = p.stop != null && (long ? p.stop >= p.entry : p.stop <= p.entry);
  const locked = inProfit ? Math.abs(p.size) * Math.abs(p.stop - p.entry) : null;
  const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : '');
  return `${pathBar(pp.path)}
    ${planLine(p, pp, equity)}
    ${pp.trail ? `<p class="trail-hint">↗ ${esc(trailText(pp.trail, pp.trail.tf, f.price))}</p>` : ''}
    ${rules}
    <div class="kv">
      <div><span class="k">Offener PnL</span><span class="v ${cls(p.upnl)}">${f.signedUsd(p.upnl)}</span></div>
      <div><span class="k">Auf Margin</span><span class="v ${cls(roe)}">${signedPct(roe)}</span></div>
      <div><span class="k">Einstieg</span><span class="v">${f.price(p.entry)}</span></div>
      <div><span class="k">Stop-Loss${p.stopSource === 'manuell' ? ' (manuell)' : ''}</span><span class="v short">${p.stop == null ? 'fehlt' : f.price(p.stop)}</span></div>
      ${inProfit
        ? `<div><span class="k">Stop im Gewinn</span><span class="v long">✓ gesichert</span></div><div><span class="k">Mind. Gewinn</span><span class="v long">${f.signedUsd(locked)}</span></div>`
        : `<div><span class="k">Risiko ab Einstieg</span><span class="v">${ev.fromEntry == null ? '–' : f.usd(ev.fromEntry)}</span></div><div><span class="k">vom Konto</span><span class="v">${f.pct(ev.riskPct)}</span></div>`}
      <div><span class="k">Margin</span><span class="v">${f.usd(p.marginUsed)}</span></div>
      <div><span class="k">Liquidation</span><span class="v">${f.price(p.liq)} <small class="muted">${f.pct(p.liqDist)}</small></span></div>
    </div>
    <details class="pos-more" data-more="${esc(p.coin)}"${moreOpen ? ' open' : ''}>
      <summary>Mehr Details</summary>
      <div class="pos-grid">
        <div><span class="k">Größe</span>${f.size(p.size)}</div>
        <div><span class="k">Hebel</span>${f.lev(p.leverage)} ${esc(p.leverageType || '')}</div>
        <div><span class="k">Stop-Quelle</span>${esc(p.stopSource || '–')}</div>
        <div><span class="k">${ev.liqFirst ? 'Verlust bis Liq.' : inProfit ? 'Rückgabe bis Stop' : 'Verlust bis Stop'}</span>${ev.fromNow == null ? '–' : f.usd(ev.fromNow)}</div>
        <div><span class="k">davon Buchgewinn</span>${ev.giveBack == null ? '–' : f.usd(ev.giveBack)}</div>
        <div><span class="k">Realisiert</span>${t && t.exits?.length ? `${f.signedUsd(t.realized)} · ${t.exits.length}×` : '–'}</div>
      </div>
    </details>`;
}

// ===== Ausstiegsrechner =====
// Das Gerüst wird einmal gezeichnet (die Eingabe darf beim Live-Takt nicht neu entstehen), danach werden nur die Zahlen aktualisiert.
export function exitBoxHtml() {
  return `<div class="exit-calc" data-noswipe>
    ${tipHead('Ausstiegsrechner', 'Rechnet aus, wie viel Stück ein Anteil der noch offenen Position ist. Geschlossen wird von Hand bei Ledger. Die Menge ist auf die Nachkommastellen des Marktes abgerundet, kopiert wird sie mit Punkt (z. B. 415.4). Der Gewinn ist eine Schätzung zum aktuellen Kurs, ohne Gebühren.')}
    <div class="ex-row"><label for="ex-pct">Verkaufen</label><span class="ex-in"><input id="ex-pct" type="text" inputmode="decimal" autocomplete="off" placeholder="z. B. 30" aria-describedby="ex-of"><b>%</b></span><span id="ex-of" class="meta">der offenen Position</span></div>
    <button type="button" id="ex-plan" class="ex-plan" hidden></button>
    <div id="ex-res" class="ex-res" hidden>
      <div class="ex-qty"><span><span class="k">Menge</span><b id="ex-qty"></b></span><button type="button" id="ex-copy" class="small-btn ghost">Kopieren</button></div>
      <div class="pos-grid">
        <div><span class="k">Gegenwert</span><span id="ex-val"></span></div>
        <div><span class="k">Gewinn ca.</span><b id="ex-pnl"></b></div>
        <div><span class="k">Rest</span><span id="ex-rest"></span></div>
      </div>
      <p id="ex-note" class="meta"></p>
    </div>
    <p id="ex-msg" class="meta" role="status"></p>
  </div>`;
}

export function updateExit(p, t, pp, szDecimals) {
  const inp = $('ex-pct');
  if (!inp || !p) return;
  const x = exitCalc({ size: p.size, entry: p.entry, mark: p.mark, side: p.side, pct: parseNum(inp.value), szDecimals });
  const ok = !!x && !x.tooSmall;
  $('ex-res').hidden = !ok;
  $('ex-msg').textContent = x?.tooSmall ? 'Der Anteil ist kleiner als die kleinste handelbare Menge.' : x?.capped ? 'Mehr als 100 % geht nicht, gerechnet ist die ganze Position.' : '';
  if (ok) {
    const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: Math.max(x.dec, 0) });
    $('ex-qty').textContent = f.isPrivate() ? f.size(x.qty) : `${nf.format(x.qty)} ${dn(p.coin)}`;
    $('ex-copy').dataset.q = qtyText(x.qty, x.dec);
    $('ex-val').textContent = f.usd(x.value);
    const pnl = $('ex-pnl');
    pnl.textContent = f.signedUsd(x.pnl);
    pnl.className = x.pnl > 0 ? 'long' : x.pnl < 0 ? 'short' : '';
    $('ex-rest').textContent = x.rest > 0 ? `${f.isPrivate() ? f.size(x.rest) : nf.format(x.rest)} (${f.pct(x.restPct, 0)})` : 'nichts, Position ist dann zu';
    $('ex-note').textContent = x.rest <= 0 ? '' : x.pnl > 0 ? 'Danach den Stop prüfen: nachziehen, wenn der Plan es vorsieht.' : 'Verkauf im Minus: Dieser Teil des Verlusts steht damit fest.';
  }
  // Orientierung am Ausstiegsplan, umgerechnet auf den Rest; Antippen übernimmt den Wert
  const h = planHint(CONFIG.exitPlan, pp?.path?.tps?.filter((x) => x.reached).length || 0, t?.soldPct);
  const b = $('ex-plan');
  b.hidden = !h;
  if (h) { b.dataset.v = String(h.ofOpen); b.textContent = `Laut Plan bis ${h.label}: ${h.ofOpen} % vom Rest · übernehmen`; }
}

// ===== Stop-Loss von Hand (nur für Positionen ohne Stop-Order bei Hyperliquid) =====
export function stopBoxHtml(p) {
  if (!p || p.stopSource === 'Order') return '';
  const v = getManualStop(p.coin);
  return `<div class="stop-manual" data-noswipe>
    ${tipHead('Stop-Loss eintragen', 'Für diese Position liegt keine Stop-Order bei Hyperliquid. Trag hier deinen Stop ein, damit Risiko, Trade-Weg und Plan-Ampel stimmen. Der Eintrag bleibt auf diesem Gerät und setzt keine Order. Leer speichern löscht ihn.')}
    <div class="row"><input id="ms-price" type="text" inputmode="decimal" autocomplete="off" placeholder="Preis" aria-label="Stop-Loss Preis" value="${v ? String(v).replace('.', ',') : ''}"><button type="button" id="ms-save">Speichern</button></div>
    <p id="ms-msg" class="msg" role="status"></p>
  </div>`;
}

// Klicks und Eingaben im Positions-Blatt: getCtx() liefert { p, t, pp, szDecimals } der gerade gezeigten Position
export function bindPosition(root, getCtx, onChange = () => {}) {
  const refresh = () => { const c = getCtx(); if (c?.p) updateExit(c.p, c.t, c.pp, c.szDecimals); };
  root.addEventListener('input', (e) => { if (e.target.id === 'ex-pct') refresh(); });
  root.addEventListener('click', async (e) => {
    const id = e.target.id;
    if (id === 'ex-plan') { $('ex-pct').value = e.target.dataset.v; refresh(); return; }
    if (id === 'ex-copy') {
      const b = e.target;
      try { await navigator.clipboard.writeText(b.dataset.q || ''); b.textContent = 'Kopiert ✓'; }
      catch { b.textContent = 'Kopieren nicht möglich'; }
      setTimeout(() => { if ($('ex-copy')) $('ex-copy').textContent = 'Kopieren'; }, 2000);
      return;
    }
    if (id === 'ms-save') {
      const c = getCtx();
      if (!c?.p) return;
      const raw = $('ms-price').value, v = parseNum(raw);
      if (String(raw).trim() !== '' && !(v > 0)) { $('ms-msg').textContent = 'Bitte einen Preis eintragen, z. B. 0,512.'; return; }
      setManualStop(c.p.coin, v > 0 ? v : null);
      $('ms-msg').textContent = v > 0 ? `Stop-Loss für ${dn(c.p.coin)} gespeichert.` : `Manueller Stop für ${dn(c.p.coin)} gelöscht.`;
      onChange();
    }
  });
}
