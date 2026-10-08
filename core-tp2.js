// Messmaschine für Testplan 2 „Marktphase“ (8s). Grundlage: TESTPLAN-2.md (Fassung 3, fest seit 08.10.2026, 11:45).
// Frage: Erkennt ein fester Schalter, WANN Long-Trades im gemeinsamen Rahmen Geld verdienen?
// Messung wie bei Regel 5: Zufalls-Einstiege über Zeit und Märkte (im Schnitt einer je 280 freien 4H-Kerzen, ein offener Trade je
// Markt, 200 Durchgänge mit festem Würfel), im gemeinsamen Rahmen aus Testplan 1 (simAt in core-longtest.js, unverändert).
// Neu laut Testplan 2: Die Einstiege hängen NICHT vom Schalter ab; jeder Einstieg wird nach dem Schalterstand am letzten
// abgeschlossenen Tag VOR der Einstiegskerze eingeteilt. Sperrfrist 10 Tage vor der Grenze zur Prüfung und zum Tresor.
// Bedingungen: A1 Differenz „an minus aus“ in mindestens 98 % der Durchgänge über null · A2 Verschiebe-Test: der echte Schalter
// schlägt mindestens 98 % aller zulässigen Verschiebungen (60 bis Länge minus 60 Tage) · B Ø R „an“ im Plus, mindestens 300 Trades
// „an“ insgesamt und 100 „aus“ je Zeitraum · C mindestens 10 / 5 Wechsel, gezählt nur Phasen ab 10 Tagen.
// Monats-Ziehen wird nur berichtet. Reine Funktionen, Tests in test-tp2.js. Rechnet nichts im Tresor (die Kerzen sind nicht geladen).
import { ema } from './core-indicators.js';
import { mulberry32, hashStr } from './core-randombase.js';
import { periods } from './core-binance.js';
import { toWeekly } from './core-engine2.js';
import { LT, simAt, canEnter, entryTime } from './core-longtest.js';
import { trendUp } from './core-ltrules.js';

const DAY = 864e5, H4 = 4 * 36e5;
export const TP2 = {
  pass: 98,            // Hürde für A2 (Verschiebe-Test) in Prozent
  a1: null,            // A1 (Durchgänge) wird nur berichtet: Anpassung nach der Probe an Zufallskursen, vor dem ersten echten Lauf
                       // (Jensen, 08.10.2026, 13:01; Probe: mit A1 98 % wurde ein eingebauter Vorteil nur in 22 von 50 Sätzen erkannt)
  shiftMin: 60,        // Verschiebung mindestens so viele Tage (und höchstens Länge minus so viele)
  phaseMin: 10,        // Phasen unter so vielen Tagen zählen nicht als eigene Phase (nur fürs Zählen)
  minFlips: { dev: 10, check: 5 },
  minOn: 300, minOff: 100,
  embargo: 10,         // Sperrfrist in Tagen vor jeder Zeitraum-Grenze
  boot: 1000,          // Monats-Ziehen (nur berichtet)
  sma: 20, emaW: 21,   // Bull Market Support Band (Wochen)
  emaBtc: 100,         // Schalter 3
  probe: { sets: 50, markets: 50, edge: 0.1, maxPassNoEdge: 3, minPassEdge: 40, seed: 20261008 },
  ver: 1,              // Fassung der Messung
};
export const SWITCHES = {
  s1: { label: 'Schalter 1 · BTC über dem Bull Market Support Band', short: 'BMSB' },
  s2: { label: 'Schalter 2 · Marktbreite (mehr als die Hälfte im Tagestrend aufwärts)', short: 'Breite' },
  s3: { label: 'Schalter 3 · BTC über der Tages-EMA 100', short: 'BTC über EMA 100' },
};
export const SW_KEYS = Object.keys(SWITCHES);

// ---- Zeiträume mit Sperrfrist vor JEDER Grenze ----
export function period2(t, stichtag) {
  const P = periods(stichtag), E = TP2.embargo * DAY;
  if (t < P.dev[0] || t >= P.vault[0]) return null;            // Tresor: gar nicht
  if (t < P.dev[1]) return t >= P.dev[1] - E ? 'sperre' : 'dev';
  return t >= P.lastEntry ? 'sperre' : 'check';                // P.lastEntry = Tresor-Grenze minus 10 Tage
}
export const ranges2 = (stichtag) => { const P = periods(stichtag); return { dev: [P.dev[0], P.dev[1]], check: [P.check[0], P.vault[0]] }; };

// ---- Die drei Schalter: Map Tagesbeginn → true / false (Stand am Schluss dieses Tages, nur abgeschlossene Kerzen) ----
// Schalter 1: Tagesschluss über dem 20-Wochen-SMA UND der 21-Wochen-EMA, beide aus abgeschlossenen Wochen (Montag UTC).
export function switchBmsb(btc, cfg = TP2) {
  const out = new Map(), D = btc || [];
  const weeks = toWeekly(D);  // Woche i ist abgeschlossen, sobald ihr Sonntag abgeschlossen ist
  const wEnd = weeks.map((w) => w.t + 7 * DAY), wc = weeks.map((w) => w.c), wema = ema(wc, cfg.emaW);
  let k = -1; // Index der letzten abgeschlossenen Woche
  for (const d of D) {
    while (k + 1 < weeks.length && wEnd[k + 1] <= d.t + DAY) k++;
    if (k + 1 < cfg.sma || k + 1 < cfg.emaW || !(wema[k] > 0)) continue;
    let s = 0; for (let j = k - cfg.sma + 1; j <= k; j++) s += wc[j];
    out.set(d.t, d.c > s / cfg.sma && d.c > wema[k]);
  }
  return out;
}
// Schalter 3: Tagesschluss über der Tages-EMA 100
export function switchEma(btc, cfg = TP2) {
  const out = new Map(), D = btc || [], e = ema(D.map((x) => x.c), cfg.emaBtc);
  D.forEach((d, i) => { if (i + 1 >= cfg.emaBtc && e[i] > 0) out.set(d.t, d.c > e[i]); });
  return out;
}
// Schalter 2: mehr als die Hälfte der Märkte im Tagestrend aufwärts (EMA 20 über EMA 100), nur Märkte mit mindestens 110 Tagen
export function switchBreadth(dailies) {
  const up = new Map(), n = new Map();
  for (const D of Object.values(dailies || {})) {
    const c = D.map((x) => x.c), f = ema(c, LT.emaFast), s = ema(c, LT.emaSlow);
    for (let i = LT.minDays - 1; i < D.length; i++) {
      if (!(f[i] > 0) || !(s[i] > 0)) continue;
      const t = D[i].t; n.set(t, (n.get(t) || 0) + 1); if (f[i] > s[i]) up.set(t, (up.get(t) || 0) + 1);
    }
  }
  const out = new Map();
  for (const [t, k] of n) out.set(t, (up.get(t) || 0) / k > 0.5);
  return out;
}
export function allSwitches(dailies, btcKey = 'BTC') {
  const btc = dailies?.[btcKey] || [];
  return { s1: switchBmsb(btc), s2: switchBreadth(dailies), s3: switchEma(btc) };
}

// ---- Einstiege (unabhängig vom Schalter) ----
// Tag der Einteilung: letzter Tag, der VOR der Einstiegskerze abgeschlossen war (Tagesschluss ≤ Öffnung der Kerze)
export function dayBefore(M, i) {
  let d = M.dOf[i];
  while (d >= 0 && M.daily[d].t + DAY > M.g.t[i]) d--;
  return d >= 0 ? M.daily[d].t : null;
}
// Ergebnis je Zeitraum: Spalten r (Ergebnis in R), run (Durchgang), day (Tag der Einteilung), up (Coin im Tagestrend), t (Einstieg)
export function genEntries(Ms, stichtag, allowed = ['dev'], draws = LT.draws, edge = null) {
  const tmp = {}; for (const p of allowed) tmp[p] = { r: [], run: [], day: [], up: [], t: [] };
  const logq = Math.log(1 - 1 / LT.every);
  for (const M of Ms) {
    for (let d = 0; d < draws; d++) {
      const rng = mulberry32((LT.seed ^ hashStr(M.coin + '|tp2') ^ Math.imul(d + 1, 2654435761)) >>> 0);
      let i = 0;
      while (i < M.n) {
        i += Math.floor(Math.log(1 - rng()) / logq);
        if (i >= M.n) break;
        const t = entryTime(M, i), per = period2(t, stichtag);
        const s = allowed.includes(per) && canEnter(M, i) ? simAt(M, i) : null;
        if (!s) { i++; continue; }
        const day = dayBefore(M, i), a = tmp[per];
        a.r.push(s.r + (edge ? edge(day) : 0)); a.run.push(d); a.day.push(day ?? NaN); a.up.push(trendUp(M, i) ? 1 : 0); a.t.push(t);
        while (i < M.n && entryTime(M, i) < s.x) i++; // ein offener Trade je Markt
      }
    }
  }
  const out = {};
  for (const p of allowed) { const a = tmp[p]; out[p] = { r: Float64Array.from(a.r), run: Int32Array.from(a.run), day: Float64Array.from(a.day), up: Uint8Array.from(a.up), t: Float64Array.from(a.t), draws }; }
  return out;
}

// ---- Phasen (nur fürs Zählen): Phasen unter phaseMin Tagen werden der umgebenden Phase zugeschlagen ----
// states: Schalterstände der Tage in zeitlicher Folge. Ein Wechsel zählt, wenn die neue Phase mindestens phaseMin Tage hält.
export function countPhases(states, min = TP2.phaseMin) {
  const runs = [];
  for (const s of states) { const last = runs[runs.length - 1]; if (last && last.s === s) last.n++; else runs.push({ s, n: 1 }); }
  const phases = [];
  for (const r of runs) {
    const cur = phases[phases.length - 1];
    if (!cur) phases.push({ s: r.s, n: r.n });
    else if (r.n < min || r.s === cur.s) cur.n += r.n;       // zu kurz oder gleiche Richtung: zählt zur laufenden Phase
    else phases.push({ s: r.s, n: r.n });                      // neue Phase von mindestens min Tagen: ein Wechsel
  }
  const long = phases.filter((p) => p.n >= min);
  return { flips: Math.max(0, phases.length - 1), phases: phases.length, long: long.length, avgLen: long.length ? long.reduce((a, p) => a + p.n, 0) / long.length : null,
    rawFlips: Math.max(0, runs.length - 1) };
}

const quant = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))] : null);
const monthOf = (t) => { const d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };

// ---- Auswertung eines Schalters in einem Zeitraum ----
// E: Einstiege des Zeitraums (genEntries), sw: Map Tag → Stand, range: [von, bis). Einstiege ohne Schalterstand fallen weg.
export function evalSwitch(E, sw, range, cfg = TP2) {
  // Tage des Zeitraums mit Schalterstand, zeitlich sortiert
  const days = [...sw.keys()].filter((t) => t >= range[0] && t < range[1]).sort((a, b) => a - b);
  const idx = new Map(days.map((t, j) => [t, j])), L = days.length, S = days.map((t) => sw.get(t));
  const draws = E.draws;
  const sOn = new Float64Array(draws), nOn = new Int32Array(draws), sOff = new Float64Array(draws), nOff = new Int32Array(draws);
  const dayS = new Float64Array(L), dayN = new Float64Array(L);           // je Tag: Summe und Zahl aller Einstiege (alle Durchgänge)
  const mon = new Map();                                                   // je Monat: an/aus Summen (für das Monats-Ziehen)
  let upOn = 0, upNOn = 0, upOff = 0, upNOff = 0; const year = new Map();
  for (let k = 0; k < E.r.length; k++) {
    const j = idx.get(E.day[k]);
    if (j === undefined) continue;
    const on = S[j], r = E.r[k], d = E.run[k];
    if (on) { sOn[d] += r; nOn[d]++; } else { sOff[d] += r; nOff[d]++; }
    dayS[j] += r; dayN[j]++;
    const m = monthOf(E.t[k]); let x = mon.get(m); if (!x) mon.set(m, (x = [0, 0, 0, 0])); if (on) { x[0] += r; x[1]++; } else { x[2] += r; x[3]++; }
    if (E.up[k]) { if (on) { upOn += r; upNOn++; } else { upOff += r; upNOff++; } }
    const y = new Date(E.t[k]).getUTCFullYear(); let z = year.get(y); if (!z) year.set(y, (z = [0, 0, 0, 0])); if (on) { z[0] += r; z[1]++; } else { z[2] += r; z[3]++; }
  }
  // A1: je Durchgang Ø an minus Ø aus
  const diffs = []; let SO = 0, NO = 0, SF = 0, NF = 0;
  for (let d = 0; d < draws; d++) { SO += sOn[d]; NO += nOn[d]; SF += sOff[d]; NF += nOff[d]; if (nOn[d] && nOff[d]) diffs.push(sOn[d] / nOn[d] - sOff[d] / nOff[d]); }
  diffs.sort((a, b) => a - b);
  const pctRuns = diffs.length ? (diffs.filter((x) => x > 0).length / diffs.length) * 100 : null;
  const real = NO && NF ? SO / NO - SF / NF : null;
  // A2: Verschiebe-Test über alle zulässigen k (im Kreis)
  const totS = dayS.reduce((a, b) => a + b, 0), totN = dayN.reduce((a, b) => a + b, 0), shifts = [];
  for (let k = cfg.shiftMin; k <= L - cfg.shiftMin; k++) {
    let so = 0, no = 0;
    for (let j = 0; j < L; j++) if (S[(j - k + L) % L]) { so += dayS[j]; no += dayN[j]; }
    const nf = totN - no; if (no && nf) shifts.push(so / no - (totS - so) / nf);
  }
  const pctShift = real != null && shifts.length ? (shifts.filter((x) => x < real).length / shifts.length) * 100 : null;
  // Monats-Ziehen (nur berichtet)
  const months = [...mon.values()], rng = mulberry32(cfg.probe.seed ^ 0x2b), boots = [];
  if (months.length) for (let b = 0; b < cfg.boot; b++) { let a = 0, an = 0, f = 0, fn = 0; for (let q = 0; q < months.length; q++) { const x = months[Math.floor(rng() * months.length)]; a += x[0]; an += x[1]; f += x[2]; fn += x[3]; } if (an && fn) boots.push(a / an - f / fn); }
  boots.sort((a, b) => a - b);
  const ph = countPhases(S, cfg.phaseMin);
  return {
    real, pctRuns, pctShift, shifts: shifts.length, draws: diffs.length, diffLo: quant(diffs, 0.02), diffHi: quant(diffs, 0.98),
    avgOn: NO ? SO / NO : null, avgOff: NF ? SF / NF : null, nOn: Math.round(NO / draws), nOff: Math.round(NF / draws),
    share: L ? (S.filter(Boolean).length / L) * 100 : null, days: L, ...ph,
    month2: quant(boots, 0.02), month5: quant(boots, 0.05),
    upDiff: upNOn && upNOff ? upOn / upNOn - upOff / upNOff : null,
    years: Object.fromEntries([...year].sort((a, b) => a[0] - b[0]).map(([y, z]) => [y, { on: z[1] ? z[0] / z[1] : null, off: z[3] ? z[2] / z[3] : null }])),
  };
}
export const passA2 = (r, cfg = TP2) => !!r && (cfg.a1 == null || (r.pctRuns != null && r.pctRuns >= cfg.a1)) && r.pctShift != null && r.pctShift >= cfg.pass;
export const passC = (r, per, cfg = TP2) => !!r && r.flips >= cfg.minFlips[per];
// Urteil je Schalter nach Abschnitt 4. dev / check: Ergebnisse (check = null, solange nicht angesehen)
export function verdict2(dev, check, cfg = TP2) {
  const A = { dev: passA2(dev, cfg), check: check ? passA2(check, cfg) : null };
  const B = { dev: !!dev && dev.avgOn > 0 && dev.nOff >= cfg.minOff, check: check ? check.avgOn > 0 && check.nOff >= cfg.minOff : null };
  const C = { dev: passC(dev, 'dev', cfg), check: check ? passC(check, 'check', cfg) : null };
  const nOn = (dev?.nOn || 0) + (check?.nOn || 0);
  const dropped = !!dev && !A.dev;   // Abbruch: A in der Entwicklung nicht bestanden → Prüfung wird nicht geöffnet
  return { A, B, C, nOn, enough: nOn >= cfg.minOn, dropped, canCheck: !!dev && !check && !dropped,
    vault: !!check && A.dev && A.check && B.dev && B.check && C.dev && C.check && nOn >= cfg.minOn, done: !!check };
}
// Wie oft sind sich zwei Schalter einig? (Anteil der gemeinsamen Tage im Zeitraum)
export function agreement(a, b, range) {
  let same = 0, n = 0;
  for (const [t, v] of a) if (t >= range[0] && t < range[1] && b.has(t)) { n++; if (b.get(t) === v) same++; }
  return n ? (same / n) * 100 : null;
}

// ---- Proben an Zufallskursen (Abschnitt 7, Schritt 4) ----
// Zufallskurse OHNE Vorteil: unabhängige Schritte ohne Drift (kein Trend, an dem ein Schalter etwas erkennen könnte).
// 4H-Kerzen ab Beginn der Entwicklung bis zu ihrem Ende; Tageskerzen daraus. Markt 0 heißt BTC.
export function synthMarket(seed, from, to, start = 100) {
  const r = mulberry32(seed >>> 0), nrm = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const t = [], o = [], h = [], l = [], c = [], v = [];
  let p = start;
  for (let x = from; x + H4 <= to; x += H4) { const oo = p, cc = oo * Math.exp(0.012 * nrm()); t.push(x); o.push(oo); c.push(cc); h.push(Math.max(oo, cc) * (1 + 0.006 * Math.abs(nrm()))); l.push(Math.min(oo, cc) * (1 - 0.006 * Math.abs(nrm()))); v.push(100); p = cc; }
  const g = { n: t.length, t: Float64Array.from(t), o: Float64Array.from(o), h: Float64Array.from(h), l: Float64Array.from(l), c: Float64Array.from(c), v: Float32Array.from(v) };
  const D = [];
  for (let k = 0; k + 6 <= g.n; k += 6) { let hh = -Infinity, ll = Infinity; for (let j = k; j < k + 6; j++) { hh = Math.max(hh, g.h[j]); ll = Math.min(ll, g.l[j]); } D.push({ t: g.t[k], T: g.t[k] + DAY - 1, o: g.o[k], h: hh, l: ll, c: g.c[k + 5], v: 600 }); }
  return { g, daily: D };
}
// Ein Probensatz: n Zufallsmärkte über die Entwicklung. prep: prepare aus core-longtest (wird übergeben, damit die Tests leicht bleiben).
export function probeSet(s, prep, stichtag, cfg = TP2) {
  const R = ranges2(stichtag), dailies = {}, Ms = [];
  for (let m = 0; m < cfg.probe.markets; m++) {
    const name = m === 0 ? 'BTC' : `Z${m}`, x = synthMarket((cfg.probe.seed ^ Math.imul(s + 1, 2246822519) ^ Math.imul(m + 1, 3266489917)) >>> 0, R.dev[0], R.dev[1], 50 + 10 * m);
    dailies[name] = x.daily; Ms.push(prep(name, x.daily, x.g));
  }
  return { dailies, Ms };
}
// Probe ohne Vorteil: besteht einer der drei Schalter (A in der Entwicklung)? Ergebnis je Schalter true / false
export function probeNoEdge(set, stichtag, cfg = TP2) {
  const R = ranges2(stichtag), E = genEntries(set.Ms, stichtag, ['dev']).dev, sws = allSwitches(set.dailies), out = {};
  for (const k of SW_KEYS) out[k] = passA2(evalSwitch(E, sws[k], R.dev, cfg), cfg);
  return out;
}
// Probe mit Vorteil: Trades bei „an“ bekommen +edge R; „an“ folgt dem vorgegebenen Verlauf (echter BMSB der Entwicklung).
export function probeEdge(set, pattern, stichtag, cfg = TP2) {
  const R = ranges2(stichtag), E = genEntries(set.Ms, stichtag, ['dev'], LT.draws, (day) => (pattern.get(day) ? cfg.probe.edge : 0)).dev;
  return passA2(evalSwitch(E, pattern, R.dev, cfg), cfg);
}
// Gesamturteil der Proben: ohne Vorteil höchstens maxPassNoEdge Sätze je Schalter, mit Vorteil mindestens minPassEdge Sätze
export function probeVerdict(noEdge, edge, cfg = TP2) {
  const per = Object.fromEntries(SW_KEYS.map((k) => [k, noEdge.filter((x) => x[k]).length]));
  const okNo = SW_KEYS.every((k) => per[k] <= cfg.probe.maxPassNoEdge), okEdge = edge.filter(Boolean).length >= cfg.probe.minPassEdge;
  return { per, edgePass: edge.filter(Boolean).length, sets: noEdge.length, edgeSets: edge.length, okNo, okEdge, ok: okNo && okEdge && noEdge.length === cfg.probe.sets && edge.length === cfg.probe.sets };
}

// ---- Ablage ----
const KEY = 'wolfdesk.tp2';
export function loadTp2() { try { const x = JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null'); return x && x.ver === TP2.ver ? x : { ver: TP2.ver }; } catch { return { ver: TP2.ver }; } }
export function saveTp2(x) { try { globalThis.localStorage?.setItem(KEY, JSON.stringify({ ...x, ver: TP2.ver })); return true; } catch { return false; } }

// ---- Text fürs Protokoll ----
const R2 = (v) => { if (v == null || !Number.isFinite(v)) return '–'; const x = Math.round(v * 100) / 100; return (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(2).replace('.', ',') + 'R'; };
const P0 = (v) => (v == null ? '–' : `${Math.round(v)} %`);
const yn = (b) => (b == null ? 'offen' : b ? 'ja' : 'nein');
export function perText(name, r) {
  if (!r) return '';
  return `${name}: an ${R2(r.avgOn)} (rund ${r.nOn} Trades je Durchgang) · aus ${R2(r.avgOff)} (rund ${r.nOff}) · Differenz ${R2(r.real)}`
    + ` · über 0 in ${P0(r.pctRuns)} der ${r.draws} Durchgänge · Verschiebe-Test: besser als ${P0(r.pctShift)} der ${r.shifts} Verschiebungen`
    + ` · Monats-Ziehen 2./5. Perzentil ${R2(r.month2)} / ${R2(r.month5)} (nur berichtet) · an an ${P0(r.share)} der ${r.days} Tage`
    + ` · Wechsel (Phasen ab 10 Tagen) ${r.flips}, ohne Zählregel ${r.rawFlips}, Ø Phase ${r.avgLen == null ? '–' : Math.round(r.avgLen)} Tage`
    + ` · nur Coins im Tagestrend: Differenz ${R2(r.upDiff)}`
    + ` · je Jahr an/aus: ${Object.entries(r.years || {}).map(([y, z]) => `${y} ${R2(z.on)}/${R2(z.off)}`).join(', ')}`;
}
export function resultText2(rec, version = '') {
  const L = [`WOLF DESK – Testplan 2 „Marktphase“ · App ${version} · Messung Fassung ${TP2.ver}`];
  if (rec?.probe) L.push(`Proben: ohne Vorteil bestanden je Schalter ${SW_KEYS.map((k) => `${SWITCHES[k].short} ${rec.probe.per[k]}/${rec.probe.sets}`).join(', ')} (erlaubt höchstens ${TP2.probe.maxPassNoEdge}) · mit Vorteil +${String(TP2.probe.edge).replace('.', ',')}R bestanden in ${rec.probe.edgePass}/${rec.probe.edgeSets} (nötig ${TP2.probe.minPassEdge}) · ${rec.probe.ok ? 'Proben bestanden' : 'Proben NICHT bestanden'}`);
  for (const k of SW_KEYS) {
    const x = rec?.[k]; if (!x?.dev) continue;
    const v = verdict2(x.dev, x.check || null);
    L.push('', SWITCHES[k].label, perText('Entwicklung', x.dev));
    if (x.check) L.push(perText('Prüfung', x.check));
    L.push(`A (${TP2.a1 == null ? 'A1 nur berichtet' : `${TP2.a1} % Durchgänge`} und ${TP2.pass} % Verschiebungen): Entwicklung ${yn(v.A.dev)}, Prüfung ${yn(v.A.check)} · B (an im Plus, mind. ${TP2.minOff} aus): ${yn(v.B.dev)}, ${yn(v.B.check)} · C (Wechsel): ${yn(v.C.dev)}, ${yn(v.C.check)} · Trades an zusammen ${v.nOn} (nötig ${TP2.minOn})`
      + ` · ${v.dropped ? 'ABGELEGT (A in der Entwicklung nicht bestanden, Prüfung bleibt zu)' : v.vault ? 'darf einmal in den Tresor' : v.done ? 'nicht bestanden' : 'Prüfung noch nicht angesehen'}`);
  }
  if (rec?.agree) L.push('', `Einigkeit der Schalter (Entwicklung): ${Object.entries(rec.agree).map(([k, v]) => `${k} ${P0(v)}`).join(', ')}`);
  return L.join('\n');
}
