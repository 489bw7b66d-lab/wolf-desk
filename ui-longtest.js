// Backtest: „Testplan-Läufe“ (8i). Rechnet eine Regel auf der langen Historie und zeigt das Urteil nach dem Testplan.
// Entwicklung darf beliebig oft gerechnet werden. Die Prüfung wird je Regel einmal geöffnet, gespeichert und danach nur noch gezeigt.
// Der Tresor ist gesperrt (die Kerzen sind nicht einmal geladen). Logik und Tests: core-longtest.js.
import { RULES, LT, runLongTest, verdict, loadResults, saveResults, resultText, fmtR } from './core-longtest.js';
import { loadMeta, phaseOf, getSeries } from './core-binance.js';
import { esc, tipInline } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
const VER = () => document.querySelector('meta[name="app-version"]')?.content || '';
const R = fmtR;
const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : 'muted');
const yn = (b) => (b == null ? '<span class="muted">offen</span>' : b ? '<b class="long">✓</b>' : '<b class="short">✗</b>');
let rule = 'flip', busy = false, note = '', open = false;

function block(name, r) {
  if (!r) return '';
  const pc = (v) => (v == null ? '–' : Math.round(v) + ' %');
  // Regel 5 (gepaart): Schalter an gegen aus
  if (r.pair) return `<div class="lt-per"><h4>${name}</h4>
    <div class="lt-grid">
      <div><span class="k">Schalter an</span><b class="${cls(r.avg)}">${R(r.avg)}</b> <span class="muted">rund ${r.n} Trades</span></div>
      <div><span class="k">Schalter aus</span><b class="${cls(r.avgOff)}">${R(r.avgOff)}</b> <span class="muted">rund ${r.nOff} Trades</span></div>
      <div><span class="k">Differenz an minus aus</span><b class="${cls(r.diff)}">${R(r.diff)}</b></div>
      <div><span class="k">Spanne der Differenz</span><b>${R(r.diffLo)} bis ${R(r.diffHi)}</b></div>
      <div><span class="k">Über 0 in</span><b>${pc(r.pct)}</b> <span class="muted">der ${r.draws} Durchgänge</span></div>
      <div><span class="k">Schalter an</span><b>${pc(r.share)}</b> <span class="muted">der Tage, ${r.flips} Wechsel</span></div>
    </div></div>`;
  return `<div class="lt-per"><h4>${name}</h4>
    <div class="lt-grid">
      <div><span class="k">Trades</span><b>${r.n}</b></div>
      <div><span class="k">Ø pro Trade</span><b class="${cls(r.avg)}">${R(r.avg)}</b></div>
      <div><span class="k">Spanne (Monate)</span><b>${R(r.lo)} bis ${R(r.hi)}</b></div>
      <div><span class="k">Zufall, selbe Kerze</span><b>${R(r.rndAvg)}</b></div>
      <div><span class="k">Zufall 5 bis 95 %</span><b>${R(r.rndLo)} bis ${R(r.rndHi)}</b></div>
      <div><span class="k">Besser als</span><b>${pc(r.pct)}</b> <span class="muted">der ${r.draws} Durchgänge</span></div>
      <div><span class="k">Rahmen allein</span><b>${R(r.plain)}</b> <span class="muted">nur zur Einordnung</span></div>
      ${r.skipped >= 0.5 ? `<div><span class="k">Ausgelassen</span><b>${Math.round(r.skipped)}</b> <span class="muted">ohne zulässigen Markt</span></div>` : ''}
    </div></div>`;
}

function body() {
  const m = loadMeta();
  if (phaseOf(m) !== 'fertig') return '<p class="set-hint">Erst die lange Historie vollständig laden (Zeile darüber).</p>';
  const rec = loadResults()[rule] || {}, v = rec.dev ? verdict(rule, rec.dev, rec.check || null) : null;
  const opts = Object.entries(RULES).map(([k, x]) => `<option value="${k}"${k === rule ? ' selected' : ''}>${esc(x.label)} · ${esc(x.sub)}</option>`).join('');
  let h = `<select id="lt-rule" class="bt-select"${busy ? ' disabled' : ''}>${opts}</select>
    <div class="mk-actions"><button type="button" class="small-btn" id="lt-dev"${busy ? ' disabled' : ''}>Entwicklung rechnen</button>
    ${v?.canCheck ? `<button type="button" class="small-btn ghost" id="lt-check"${busy ? ' disabled' : ''}>Prüfung ansehen (einmalig)</button>` : ''}
    ${rec.dev ? '<button type="button" class="small-btn ghost" id="lt-copy">Ergebnis kopieren</button>' : ''}</div>`;
  if (note) h += `<p class="set-hint" role="status">${esc(note)}</p>`;
  if (rec.dev) {
    h += block('Entwicklung · 2020 bis 2023', rec.dev) + (rec.check ? block('Prüfung · 2024 bis zur Sperrfrist', rec.check) : '');
    h += `<p class="lt-verdict">${rec.dev.pair ? `A an besser als aus in ${LT.passPct} % der Durchgänge` : `A besser als ${LT.passPct} % des Zufalls`}: Entwicklung ${yn(v.A.dev)} · Prüfung ${yn(v.A.check)}<br>
      B im Plus nach Kosten: Entwicklung ${yn(v.B.dev)} · Prüfung ${yn(v.B.check)} · Trades ${v.nAll}${v.done && !v.enough ? ` <span class="short">(nötig ${LT.minTrades})</span>` : ''}</p>`;
    const state = RULES[rule].kind === 'vergleich' ? `Vergleichsregel: zählt nicht als Kandidat.${v.done ? '' : ' Prüfung noch nicht angesehen.'}`
      : v.dropped ? '<b class="short">Abgelegt:</b> in der Entwicklung bei A und B durchgefallen. Die Regel wird nicht nachgebessert.'
        : !v.done ? 'Prüfung noch nicht angesehen.'
          : v.passed ? '<b class="long">A und B bestanden.</b> Die Regel darf einmal in den Tresor.' : '<b class="short">Nicht bestanden.</b>';
    h += `<p class="set-hint">${state} Tresor: gesperrt.</p>`;
  }
  return h;
}

function paint() {
  const el = $('lt-area');
  if (!el) return;
  el.innerHTML = `<details class="bt-saved-box" id="lt-box"${open ? ' open' : ''}><summary>Testplan-Läufe</summary>
    <div>${tipInline(`Rechnet eine Regel auf den Binance-Kerzen im festen Rahmen des Testplans und vergleicht sie mit ${LT.draws} Zufalls-Durchgängen: Zu jedem Einstieg der Regel steigt der Zufall zur selben Kerze in einem zufälligen zulässigen Markt ein. Regel 5 vergleicht Zufalls-Einstiege bei Schalter an mit denen bei Schalter aus. Entwicklung beliebig oft, Prüfung einmal je Regel, Tresor gesperrt.`, 'lt-intro')}</div>
    ${open ? body() : ''}</details>`;
}

async function run(withCheck) {
  if (busy) return;
  const m = loadMeta();
  if (withCheck && !confirm(`Prüfung für „${RULES[rule].label}“ ansehen?\n\nDas geht je Regel nur einmal. Das Ergebnis wird gespeichert und danach nur noch gezeigt.`)) return;
  busy = true; note = 'Rechne …'; paint();
  try {
    const res = await runLongTest(rule, m, { withCheck, load: getSeries, pause: () => new Promise((r) => setTimeout(r, 0)),
      onProgress: (k, n) => { note = `Rechne: ${k} von ${n} Märkten …`; const s = $('lt-area')?.querySelector('[role=status]'); if (s) s.textContent = note; } });
    const all = loadResults(), rec = all[rule] || {};
    rec.dev = res.dev; rec.devAt = Date.now(); rec.ver = VER(); rec.cmp = LT.cmp;
    if (withCheck && !rec.check) { rec.check = res.check; rec.checkAt = Date.now(); }
    all[rule] = rec;
    note = saveResults(all) ? '' : 'Das Ergebnis ließ sich nicht speichern.';
  } catch (e) { note = `Abgebrochen: ${e.message}`; }
  busy = false; paint();
}

export function initLongTest() {
  const el = $('lt-area');
  if (!el) return;
  el.addEventListener('toggle', (e) => { if (e.target.id === 'lt-box' && open !== e.target.open) { open = e.target.open; paint(); } }, true);
  el.addEventListener('change', (e) => { if (e.target.id === 'lt-rule') { rule = e.target.value; note = ''; paint(); } });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (b?.id === 'lt-dev') run(false);
    if (b?.id === 'lt-check') run(true);
    if (b?.id === 'lt-copy') { try { await navigator.clipboard.writeText(resultText(rule, loadResults()[rule], VER())); b.textContent = 'Kopiert ✓'; } catch { note = 'Kopieren hat nicht geklappt.'; paint(); } }
  });
  paint();
}
