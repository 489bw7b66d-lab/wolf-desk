// Tagebuch-Messwerte (8a): reines Messen, ändert kein Signal und keine Auswertung.
// Je Signal: wann der Kurs die Einstiegszone erreichte, wie weit er höchstens ins Plus lief (MFE) und wie weit ins Minus (MAE).
// Alles in R (1R = Abstand Kurs bei Meldung bis Stop), damit es zum Tagebuch passt.
const r2 = (v) => Math.round(v * 100) / 100;

// e: Tagebuch-Eintrag { dir, px, stop, zone, at, doneAt }, candles: abgeschlossene Kerzen { T, h, l }
// windowDays: so lange wird gemessen (wie die Verfolgung im Tagebuch)
export function measureSignal(e, candles, now = Date.now(), windowDays = 7) {
  const R = Math.abs(e.px - e.stop);
  if (!(R > 0)) return e.m || null;
  const long = e.dir === 'long', sg = long ? 1 : -1;
  const zone = Array.isArray(e.zone) && e.zone.length === 2 ? [Math.min(...e.zone), Math.max(...e.zone)] : null;
  const end = e.at + windowDays * 864e5;
  let zoneAt = zone && e.px >= zone[0] && e.px <= zone[1] ? e.at : null;
  let mfe = 0, mae = 0, stopped = false;
  for (const c of candles || []) {
    if (c.T <= e.at) continue;
    if (c.T > end) break;
    if (zoneAt == null && zone && c.h >= zone[0] && c.l <= zone[1]) zoneAt = c.T;
    const alive = e.doneAt == null || c.T <= e.doneAt;
    // Berührt eine Kerze den Stop, zählt zuerst der Stop (wie im Tagebuch); der Lauf ins Plus endet dort
    if (long ? c.l <= e.stop : c.h >= e.stop) { if (alive) mae = 1; stopped = true; break; }
    if (alive) mae = Math.max(mae, Math.min(1, ((e.px - (long ? c.l : c.h)) * sg) / R));
    mfe = Math.max(mfe, (((long ? c.h : c.l) - e.px) * sg) / R);
  }
  return {
    zoneH: zoneAt == null ? null : Math.round(((zoneAt - e.at) / 36e5) * 10) / 10, // Stunden bis zur Zone (0 = schon drin)
    mfe: r2(Math.max(0, mfe)), mae: r2(Math.max(0, mae)),
    final: stopped || now > end, t: now,
  };
}

// Muss dieser Eintrag (wieder) gemessen werden? Offene bei jedem Lauf, abgeschlossene alle 6 Std. bis das Fenster zu ist.
export function measureDue(e, now = Date.now(), everyMs = 6 * 36e5) {
  if (e.status === 'offen') return true;
  if (e.status === 'ungültig') return false;
  if (!e.m) return true;
  return !e.m.final && now - (e.m.t || 0) >= everyMs;
}

// Messwerte an die Archiv-Einträge hängen (öffentlich unbedenklich: nur aus Marktdaten)
export function withMeasure(archive = [], journal = []) {
  const byKey = new Map((journal || []).filter((e) => e.m).map((e) => [`${e.coin}|${e.dir}|${e.at}`, e.m]));
  return (archive || []).map((a) => {
    const m = byKey.get(a.key || `${a.coin}|${a.dir}|${a.at}`);
    return m ? { ...a, zoneH: m.zoneH, mfe: m.mfe, mae: m.mae } : a;
  });
}

// Kurzauswertung für Export und Bericht
export function measureStats(list = []) {
  const l = (list || []).filter((e) => e.mfe != null);
  if (!l.length) return null;
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const share = (fn) => (l.filter(fn).length / l.length) * 100;
  const zh = l.filter((e) => e.zoneH != null).map((e) => e.zoneH);
  return {
    n: l.length, avgMfe: avg(l.map((e) => e.mfe)), avgMae: avg(l.map((e) => e.mae)),
    reach1: share((e) => e.mfe >= 1), reach2: share((e) => e.mfe >= 2), reach3: share((e) => e.mfe >= 3),
    zoneShare: (zh.length / l.length) * 100, avgZoneH: avg(zh),
    // Gewinner, die vorher mehr als die Hälfte des Stop-Abstands im Minus waren (Hinweis auf zu frühen Einstieg)
    deepWinners: l.filter((e) => /^tp/.test(e.status || '')).length ? (l.filter((e) => /^tp/.test(e.status || '') && e.mae >= 0.5).length / l.filter((e) => /^tp/.test(e.status || '')).length) * 100 : null,
  };
}
