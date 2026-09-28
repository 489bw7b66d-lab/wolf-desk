// Trade-Karte aus einem gemeldeten Telegram-Signal (signals.json).
// Der Plan kommt aus dem Signal selbst (Zone, Stop, Ziele), die frische Analyse liefert nur Chart, ATR und Stil-Auswahl.
// Reine Funktionen, Tests in test-feedplan.js.
import { CONFIG } from './config.js';

// Plan im Format der Trade-Karte aus einem veröffentlichten Signal. null, wenn das Signal unvollständig ist.
export function planFromSignal(x) {
  if (!x || (x.dir !== 'long' && x.dir !== 'short')) return null;
  const long = x.dir === 'long';
  const zone = Array.isArray(x.zone) && x.zone[0] > 0 && x.zone[1] > 0
    ? [Math.min(x.zone[0], x.zone[1]), Math.max(x.zone[0], x.zone[1])]
    : x.px > 0 ? [x.px, x.px] : null;
  if (!zone || !(x.stop > 0)) return null;
  const entry = (zone[0] + zone[1]) / 2;
  // Stop muss auf der Verlustseite liegen, Ziele auf der Gewinnseite
  if (long ? x.stop >= zone[0] : x.stop <= zone[1]) return null;
  const tps = (x.tps || []).filter((t) => t > 0 && (long ? t > entry : t < entry)).slice(0, 4);
  if (!tps.length) return null;
  const R = Math.abs(entry - x.stop);
  return {
    method: 'signal', dir: x.dir, zone, entry, stop: x.stop, tps, R,
    stopLabel: 'aus dem Signal', tpLabels: tps.map(() => ''),
    entryMode: 'Plan aus dem Signal', stopDistPct: (R / entry) * 100, warnings: [],
  };
}

// Vergleich mit der Analyse von jetzt: bestätigt, gedreht oder kein Setup mehr
export function freshCheck(x, fresh) {
  if (!fresh) return { state: 'unbekannt', text: 'Aktuelle Analyse nicht verfügbar, Plan wie gemeldet' };
  if (!fresh.plan || fresh.dir === 'neutral') return { state: 'weg', text: 'Aktuell kein frisches Setup mehr, Plan wie gemeldet' };
  if (fresh.dir !== x.dir) return { state: 'gedreht', text: `Aktuelle Analyse zeigt inzwischen ${fresh.dir === 'long' ? 'LONG' : 'SHORT'}` };
  return { state: 'bestaetigt', text: 'Aktuelle Analyse zeigt weiter in dieselbe Richtung' };
}

// Ergebnis für die Trade-Karte: Plan und Richtung aus dem Signal, Kerzen/ATR/Stile aus der frischen Analyse im Stil des Signals.
// switchStyle wird übergeben (kommt aus core-scanner), damit diese Datei ohne Netzwerk testbar bleibt.
export function signalResult(x, fresh, switchStyle) {
  const plan = planFromSignal(x);
  if (!plan) return null;
  const mode = CONFIG.signals.modes[x.style] ? x.style : 'swing';
  // Frische Analyse im Stil des Signals; fehlt sie (z. B. zu wenig Kerzen), nur die Stil-Auswahl übernehmen
  const base = !fresh ? null : fresh.mode === mode ? fresh
    : switchStyle?.(fresh, mode) || { styles: fresh.styles, all: fresh.all, best: fresh.best };
  const score = Number.isFinite(x.score) ? x.score : 0;
  return {
    events: [], waves: [], confirms: [], analyses: [], styles: null, all: null, best: null,
    ...(base || {}),
    coin: x.coin, mode, dir: x.dir, plan,
    total: { long: 0, short: 0, ...(base?.total || {}), [x.dir]: score },
    tfs: base?.tfs || CONFIG.signals.modes[mode].tfs,
    fromSignal: { at: x.at, score, check: freshCheck(x, fresh) },
  };
}
