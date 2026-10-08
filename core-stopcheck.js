// 8p: Stop-Check gegen die TAGES-ATR (Jensen, 08.10.2026). Anlass: Die Auswertung seiner Trades zeigte Stops von im Schnitt
// 0,9 Tages-ATR. Der alte Check maß gegen die ATR der Setup-Zeitebene (z. B. 4H) und meldete solche Stops als „genug Luft“.
// Jetzt: rot unter 1,0, gelb unter 1,5 Tages-ATR (dieselben Einstellungen wie bisher, guard.stopNoiseAtr / stopTightAtr),
// der Vorschlag ist der Rahmen-Stop aus dem Testplan: 2 × Tages-ATR (benchmark.atrMult).
// Eigene Datei, damit der Wächter (lädt core-guard.js) unberührt bleibt. Reine Funktionen, Tests in test-stopcheck.js.
import { CONFIG } from './config.js';
import { stopNoise } from './core-guard.js';

export const frameCfg = (cfg = CONFIG) => ({ ...cfg.guard, suggestAtr: cfg.benchmark?.atrMult ?? 2 });
// Wie stopNoise, aber gegen die Tages-ATR und mit dem Rahmen-Stop als Vorschlag; die Texte nennen „Tages-ATR“.
export function stopNoiseDaily(entry, stop, dailyAtr, liq = null, cfg = frameCfg()) {
  const n = stopNoise(entry, stop, dailyAtr, cfg, liq);
  if (!n) return null;
  return { ...n, daily: true, text: n.text.replace(/× ATR\)/, '× Tages-ATR)') };
}
