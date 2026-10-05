// Donchian-Ausbruch 20/10 (8d, nur Backtest): Trendfolge auf Tageskerzen, Regel VOR dem Test festgelegt (05.10.2026).
//   Einstieg: Tagesschluss über dem höchsten Hoch der 20 abgeschlossenen Tage davor, Einstieg zum Schlusskurs
//             (Krypto handelt durchgehend: Schluss = nächste Eröffnung).
//   Stop:     2 × ATR 14 (Tag) unter dem Einstieg.
//   Ausstieg: Tagesschluss unter dem tiefsten Tief der 10 Tage davor, oder der Stop. Keine Ziele, keine Zeitgrenze.
//   Nur Long.
// Eigene Simulation, weil simulateTrade auf Ziele und Zeitlimit gebaut ist. Reine Funktionen, Tests in test-donchian.js.
import { atr } from './core-indicators.js';

export const DC = { entry: 20, exit: 10, atr: 14, atrMult: 2 };
export const DC_EVENT = 'Donchian-Ausbruch 20 Tage';

// D: abgeschlossene Tageskerzen bis zum Zeitpunkt t (aufsteigend). setupMs: Länge der Setup-Kerze des Laufs.
// Signal nur an der ersten Setup-Kerze nach dem Tagesschluss (sonst würde derselbe Ausbruch mehrfach zählen).
export function donchianSignal(D, t, setupMs, cfg = DC) {
  if (!D || D.length < Math.max(cfg.entry + 1, cfg.atr + 2)) return null;
  const last = D.at(-1);
  if (!(t - last.T < setupMs) || t < last.T) return null;
  let hi = -Infinity;
  for (let k = D.length - 1 - cfg.entry; k < D.length - 1; k++) hi = Math.max(hi, D[k].h);
  if (!(last.c > hi)) return null;
  const a = atr(D, cfg.atr).at(-1);
  if (!(a > 0)) return null;
  const px = last.c, R = cfg.atrMult * a;
  if (!(px - R > 0)) return null;
  return { dir: 'long', entry: px, stop: px - R, zone: [px, px], tps: [], R, stopDistPct: (R / px) * 100, method: 'donchian', warnings: [], channelHigh: hi };
}

// Für runBacktest: dieselbe Rückgabeform wie die anderen Engines
export function donchianFromSlices(tfs, slices, t, setupMs) {
  const plan = donchianSignal(slices[tfs.indexOf('1d')], t, setupMs);
  if (!plan) return { plan: null };
  return { plan, dir: 'long', total: { long: 50, short: 0 }, events: [{ name: DC_EVENT, dir: 'long' }], confirms: [], gate: null, analyses: [null, { close: plan.entry }] };
}

// Trade nachspielen. path: feine Kerzen NACH dem Signal, daily: ALLE Tageskerzen des Laufs (auch die späteren),
// t: Signalzeit, feePct: Taker-Gebühr je Seite in Prozent. Konservativ: der Stop wird in jeder Kerze zuerst geprüft.
export function simulateDonchian(plan, path, daily, { t, feePct = 0, cfg = DC } = {}) {
  const entryPx = plan.entry, R = entryPx - plan.stop;
  if (!(R > 0) || !path?.length) return { filled: false, reason: 'ungültig', end: t };
  const fillTime = path[0].t;
  let k = -1;
  while (k + 1 < daily.length && daily[k + 1].T <= t) k++; // letzte Tageskerze, die beim Signal schon abgeschlossen war
  const done = (px, outcome, exitTime) => {
    const grossR = (px - entryPx) / R, feeR = (2 * feePct / 100) * entryPx / R;
    return { filled: true, entryPx, fillTime, exitTime, R, hits: 0, outcome, grossR, r: grossR - feeR };
  };
  for (const c of path) {
    if (c.l <= plan.stop) return done(plan.stop, 'stop', c.T);
    while (k + 1 < daily.length && daily[k + 1].T <= c.T) {
      k++;
      if (k - cfg.exit < 0) continue;
      let lo = Infinity;
      for (let j = k - cfg.exit; j < k; j++) lo = Math.min(lo, daily[j].l);
      if (daily[k].c < lo) return done(daily[k].c, 'kanal', daily[k].T);
    }
  }
  return done(path.at(-1).c, 'offen', path.at(-1).T);
}
