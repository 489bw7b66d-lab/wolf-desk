// Backtest: „Testplan 2 · Marktphase“ (8s). Erst die Proben an Zufallskursen, dann die Entwicklung, dann je Schalter einmal die Prüfung.
// Die Prüfung öffnet sich nur für Schalter, die A in der Entwicklung bestehen. Der Tresor ist gesperrt. Logik und Tests: core-tp2.js.
import { TP2, SWITCHES, SW_KEYS, ranges2, genEntries, allSwitches, switchBmsb, evalSwitch, verdict2, agreement, probeSet, probeNoEdge, probeEdge, probeVerdict, loadTp2, saveTp2, resultText2 } from './core-tp2.js';
import { prepare, loadMarkets, fmtR } from './core-longtest.js';
import { loadMeta, phaseOf, getSeries } from './core-binance.js';
import { esc, tipInline } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
const VER = () => document.querySelector('meta[name="app-version"]')?.content || '';
const tick = () => new Promise((r) => setTimeout(r, 0));
const R = fmtR, P0 = (v) => (v == null ? '–' : `${Math.round(v)} %`);
const yn = (b) => (b == null ? '<span class="muted">offen</span>' : b ? '<b class="long">✓</b>' : '<b class="short">✗</b>');
let open = false, busy = false, stop = false, note = '', manual = ''; // manual: Text zum Selbst-Kopieren, wenn die Zwischenablage nicht will

const say = (t) => { note = t; const s = $('tp2-area')?.querySelector('[role=status]'); if (s) s.textContent = note; };

function perBlock(name, r) {
  if (!r) return '';
  return `<div class="lt-per"><h4>${esc(name)}</h4><div class="lt-grid">
    <div><span class="k">Schalter an</span><b>${R(r.avgOn)}</b> <span class="muted">rund ${r.nOn} Trades</span></div>
    <div><span class="k">Schalter aus</span><b>${R(r.avgOff)}</b> <span class="muted">rund ${r.nOff} Trades</span></div>
    <div><span class="k">Differenz an minus aus</span><b>${R(r.real)}</b></div>
    <div><span class="k">Über 0 in</span><b>${P0(r.pctRuns)}</b> <span class="muted">der ${r.draws} Durchgänge</span></div>
    <div><span class="k">Verschiebe-Test</span><b>${P0(r.pctShift)}</b> <span class="muted">besser als die ${r.shifts} Verschiebungen</span></div>
    <div><span class="k">Monats-Ziehen 2. / 5. Perzentil</span><b>${R(r.month2)} / ${R(r.month5)}</b> <span class="muted">nur berichtet</span></div>
    <div><span class="k">Wechsel (Phasen ab 10 Tagen)</span><b>${r.flips}</b> <span class="muted">ohne Zählregel ${r.rawFlips}</span></div>
    <div><span class="k">Schalter an</span><b>${P0(r.share)}</b> <span class="muted">der ${r.days} Tage</span></div>
  </div></div>`;
}

function body() {
  const m = loadMeta();
  if (phaseOf(m) !== 'fertig') return '<p class="set-hint">Erst die lange Historie vollständig laden (oben im Backtest).</p>';
  const rec = loadTp2(), pr = rec.probe;
  let h = `<p class="set-hint">Testplan 2 ist seit 08.10.2026, 11:45 fest. Reihenfolge: Proben an Zufallskursen → Entwicklung → je Schalter einmal die Prüfung. A1 ${TP2.a1 == null ? 'wird nur berichtet' : `zählt ab ${TP2.a1} %`}, der Verschiebe-Test ab ${TP2.pass} %.</p>
    <div class="mk-actions">
      <button type="button" class="small-btn${pr?.ok ? ' ghost' : ''}" id="tp2-probe"${busy ? ' disabled' : ''}>Proben rechnen</button>
      <button type="button" class="small-btn" id="tp2-dev"${busy || !pr?.ok ? ' disabled' : ''}>Entwicklung rechnen</button>
      ${busy ? '<button type="button" class="small-btn ghost" id="tp2-stop">Anhalten</button>' : ''}
      ${pr || SW_KEYS.some((k) => rec[k]?.dev) ? '<button type="button" class="small-btn ghost" id="tp2-copy">Ergebnis kopieren</button>' : ''}
    </div>
    <p class="set-hint" role="status">${esc(note)}</p>${manual ? `<textarea id="tp2-manual" readonly rows="8" style="width:100%;font-size:12px;background:transparent;color:inherit;border:1px solid currentColor;border-radius:8px;padding:8px;box-sizing:border-box">${esc(manual)}</textarea>` : ''}`;
  if (pr) h += `<p class="set-hint">Proben (${new Date(pr.at).toLocaleString('de-DE')}): ohne Vorteil bestanden ${SW_KEYS.map((k) => `${SWITCHES[k].short} ${pr.per[k]} von ${pr.sets}`).join(' · ')} (erlaubt höchstens ${TP2.probe.maxPassNoEdge}) · mit Vorteil +${String(TP2.probe.edge).replace('.', ',')}R erkannt in ${pr.edgePass} von ${pr.edgeSets} (nötig ${TP2.probe.minPassEdge}) · <b class="${pr.ok ? 'long' : 'short'}">${pr.ok ? 'Proben bestanden' : 'Proben nicht bestanden: Die Messung muss vor dem ersten echten Lauf angepasst werden (Claude fragen).'}</b></p>`;
  else h += '<p class="set-hint">Vor dem ersten Lauf: Proben rechnen (50 Sätze Zufallskurse ohne Vorteil, 50 mit Vorteil, je 50 Märkte; dauert einige Minuten). Erst wenn sie bestehen, wird „Entwicklung rechnen“ frei.</p>';
  for (const k of SW_KEYS) {
    const x = rec[k]; if (!x?.dev) continue;
    const v = verdict2(x.dev, x.check || null);
    h += `<h3 class="sub-h">${esc(SWITCHES[k].label)}</h3>` + perBlock('Entwicklung · 2020 bis 2023', x.dev) + (x.check ? perBlock('Prüfung · 2024 bis zur Sperrfrist', x.check) : '');
    h += `<p class="lt-verdict">A: Entwicklung ${yn(v.A.dev)} · Prüfung ${yn(v.A.check)}<br>B (an im Plus, mind. ${TP2.minOff} aus): ${yn(v.B.dev)} · ${yn(v.B.check)} · Trades an zusammen ${v.nOn} (nötig ${TP2.minOn})<br>C (Wechsel ${TP2.minFlips.dev} / ${TP2.minFlips.check}): ${yn(v.C.dev)} · ${yn(v.C.check)}</p>`;
    h += v.dropped ? '<p class="set-hint"><b class="short">Abgelegt:</b> A in der Entwicklung nicht bestanden. Die Prüfung bleibt zu, der Schalter wird nicht nachgebessert.</p>'
      : v.canCheck ? `<div class="mk-actions"><button type="button" class="small-btn ghost" data-check="${k}"${busy ? ' disabled' : ''}>Prüfung ansehen (einmalig)</button></div>`
        : v.vault ? '<p class="set-hint"><b class="long">A, B und C bestanden.</b> Der Schalter darf einmal in den Tresor (eigener Schritt, mit Jensen).</p>' : '<p class="set-hint"><b class="short">Nicht bestanden.</b></p>';
  }
  if (rec.agree) h += `<p class="set-hint">Einigkeit der Schalter in der Entwicklung: ${Object.entries(rec.agree).map(([k, v]) => `${esc(k)} ${P0(v)}`).join(' · ')}</p>`;
  return h + '<p class="set-hint">Tresor: gesperrt.</p>';
}

function paint() {
  const el = $('tp2-area');
  if (!el) return;
  el.innerHTML = `<details class="bt-saved-box" id="tp2-box"${open ? ' open' : ''}><summary>Testplan 2 · Marktphase</summary>
    <div>${tipInline('Drei feste Schalter: BTC über dem Bull Market Support Band, Marktbreite, BTC über der Tages-EMA 100. Gemessen wird, ob Long-Trades im gemeinsamen Rahmen bei „Schalter an“ mehr bringen als bei „aus“: 200 Durchgänge mit Zufalls-Einstiegen, dazu der Verschiebe-Test (der Schalterverlauf wird um 60 bis Länge minus 60 Tage verschoben; der echte muss 98 % seiner Kopien schlagen). Wechsel zählen nur ab Phasen von 10 Tagen. Alles laut TESTPLAN-2.md.', 'tp2')}</div>
    ${open ? body() : ''}</details>`;
}

async function markets() {
  const m = loadMeta(), { dailies, Ms } = await loadMarkets(m, { load: getSeries, pause: tick, onProgress: (k, n) => say(`Lade: ${k} von ${n} Märkten …`) });
  return { m, dailies, Ms };
}

async function runProbe() {
  if (busy) return;
  busy = true; stop = false; paint();
  try {
    const { m, dailies } = await markets();
    if (!dailies.BTC?.length) throw new Error('BTC fehlt in den Märkten der langen Historie.');
    const pattern = switchBmsb(dailies.BTC); // echter BMSB-Verlauf (für die Probe mit Vorteil; zählt nur in der Entwicklung)
    const no = [], ed = [];
    for (let s = 0; s < TP2.probe.sets && !stop; s++) {
      say(`Proben: Satz ${s + 1} von ${TP2.probe.sets} …`); await tick();
      const set = probeSet(s, prepare, m.stichtag);
      no.push(probeNoEdge(set, m.stichtag)); await tick();
      ed.push(probeEdge(set, pattern, m.stichtag)); await tick();
    }
    if (stop) { say('Angehalten, die Proben zählen nur vollständig.'); }
    else { const pv = probeVerdict(no, ed); saveTp2({ ...loadTp2(), probe: { ...pv, at: Date.now(), ver: VER() } }); say(pv.ok ? 'Proben bestanden. „Entwicklung rechnen“ ist frei.' : 'Proben nicht bestanden.'); }
  } catch (e) { say(`Abgebrochen: ${e.message}`); }
  busy = false; paint();
}

async function runPeriod(check = null) {
  if (busy) return;
  const rec0 = loadTp2();
  if (!rec0.probe?.ok) return;
  if (check && !confirm(`Prüfung für „${SWITCHES[check].label}“ ansehen?\n\nDas geht je Schalter nur einmal. Das Ergebnis wird gespeichert und danach nur noch gezeigt.`)) return;
  busy = true; stop = false; paint();
  try {
    const { m, dailies, Ms } = await markets();
    const per = check ? 'check' : 'dev', R = ranges2(m.stichtag)[per];
    say('Rechne die Einstiege (200 Durchgänge) …'); await tick();
    const E = genEntries(Ms, m.stichtag, [per])[per];
    const sws = allSwitches(dailies), rec = loadTp2();
    for (const k of check ? [check] : SW_KEYS) {
      say(`Werte aus: ${SWITCHES[k].short} …`); await tick();
      const r = evalSwitch(E, sws[k], R);
      rec[k] = { ...(rec[k] || {}), [per]: r, [`${per}At`]: Date.now(), ver: VER() };
    }
    if (!check) rec.agree = { 'BMSB/Breite': agreement(sws.s1, sws.s2, R), 'BMSB/EMA 100': agreement(sws.s1, sws.s3, R), 'Breite/EMA 100': agreement(sws.s2, sws.s3, R) };
    say(!saveTp2(rec) ? 'Das Ergebnis ließ sich nicht speichern.' : check ? 'Prüfung fertig, das Ergebnis steht unten.' : 'Entwicklung fertig, das Ergebnis steht unten.');
  } catch (e) { say(`Abgebrochen: ${e.message}`); }
  busy = false; paint();
}

export function initTp2() {
  const el = $('tp2-area');
  if (!el) return;
  el.addEventListener('toggle', (e) => { if (e.target.id === 'tp2-box' && open !== e.target.open) { open = e.target.open; paint(); } }, true);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'tp2-probe') runProbe();
    else if (b.id === 'tp2-dev') runPeriod(null);
    else if (b.id === 'tp2-stop') { stop = true; say('Halte an …'); }
    else if (b.dataset.check) runPeriod(b.dataset.check);
    else if (b.id === 'tp2-copy') {
      const txt = resultText2(loadTp2(), VER());
      try { await navigator.clipboard.writeText(txt); manual = ''; b.textContent = 'Kopiert ✓'; }
      catch { manual = txt; note = 'Kopieren hat nicht geklappt. Text im Feld unten antippen, „Alles auswählen“ und kopieren.'; paint(); const t = $('tp2-manual'); if (t) { t.focus(); t.select(); } }
    }
  });
  paint();
}
