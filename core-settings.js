// Einstellungen: welche Werte du ändern kannst, ihre Grenzen und Prüfungen.
// Reine Funktionen, Tests in test-settings.js. Anzeige in ui-settings.js.
import { CONFIG, RECOMMENDED, getPath, MY_SETTINGS } from './config.js';

// type: 'num' (Zahl), 'bool' (an/aus), 'styles' (Auswahl der Stile). scale: Anzeige geteilt durch diesen Wert.
export const GROUPS = [
  { key: 'konto', title: 'Konto' },
  { key: 'risiko', title: 'Risiko-Regeln' },
  { key: 'exit', title: 'Ausstiegsplan', hint: 'Anteil der Position je Ziel. Zusammen müssen es 100 % sein.' },
  { key: 'signal', title: 'Signalgeber' },
  { key: 'markt', title: 'Markt-Bias', hint: 'Zusammensetzung des Tachos auf der Startseite. Gewichte in Prozent, zusammen 100.' },
  { key: 'telegram', title: 'Telegram-Wächter', hint: 'Wirkt erst im Wächter, wenn du „Für den Wächter übernehmen“ nutzt und die Datei hochlädst.' },
  { key: 'ind', title: 'Indikatoren (Experte)', expert: true, hint: 'Ändert die ganze Strategie. Danach am besten einen Backtest laufen lassen und vergleichen.' },
  { key: 'points', title: 'Punkte je Ereignis (Experte)', expert: true, hint: 'Wie stark ein Ereignis den Score hebt. Zusammen zählen Ereignisse höchstens 30 Punkte je Timeframe.' },
];

const n = (group, path, label, min, max, step, unit = '', extra = {}) => ({ group, path, label, min, max, step, unit, type: 'num', ...extra });
export const FIELDS = [
  n('konto', 'startCapital', 'Startkapital', 1, 100000000, 1, '$', { hint: 'Grundlage für die Performance' }),

  n('risiko', 'rules.riskSteps.0', 'Risiko-Stufe 1 (Knopf)', 0.25, 20, 0.25, '%'),
  n('risiko', 'rules.riskSteps.1', 'Risiko-Stufe 2 (Knopf)', 0.25, 20, 0.25, '%'),
  n('risiko', 'rules.riskSteps.2', 'Risiko-Stufe 3 (Knopf)', 0.25, 20, 0.25, '%'),
  n('risiko', 'rules.riskPerTradeWarnPct', 'Risiko pro Trade: gelb ab', 0.5, 50, 0.5, '%'),
  n('risiko', 'rules.riskPerTradeMaxPct', 'Risiko pro Trade: rot ab', 0.5, 50, 0.5, '%'),
  n('risiko', 'rules.dailyLossLimitPct', 'Tagesverlust: Schluss ab', 1, 50, 0.5, '%'),
  n('risiko', 'rules.maxLeverage', 'Maximaler Hebel', 1, 50, 1, '×'),
  n('risiko', 'guard.stopNoiseAtr', 'Stop im Rauschen: rot unter', 0.25, 5, 0.25, '× ATR', { hint: 'Stop-Abstand im Vergleich zur normalen Schwankung' }),
  n('risiko', 'guard.stopTightAtr', 'Stop knapp: gelb unter', 0.25, 5, 0.25, '× ATR'),
  n('risiko', 'guard.suggestAtr', 'Vorschlag Stop-Abstand', 0.5, 5, 0.25, '× ATR'),
  n('risiko', 'guard.lossStreak', 'Abkühlphase nach Verlusten in Folge', 1, 10, 1),
  n('risiko', 'guard.cooldownHours', 'Dauer der Abkühlphase', 1, 72, 1, 'Std.'),
  n('risiko', 'rules.liqBufferPct', 'Liquidation mind. hinter Stop', 0, 10, 0.5, '%'),
  n('risiko', 'rules.liqNoStopMinShare', 'Ohne Stop: rot, wenn vom Liq-Abstand weniger übrig als', 10, 90, 5, '%', { scale: 0.01, hint: 'Anteil des Anfangsabstands zur Liquidation' }),
  n('risiko', 'rules.marginBudgetPct', 'Margin je Trade höchstens', 5, 100, 5, '% vom Freien'),
  n('risiko', 'rules.freeCapitalWarnPct', 'Freies Kapital: gelb unter', 0, 50, 1, '%'),
  n('risiko', 'rules.freeCapitalMinPct', 'Freies Kapital: rot unter', 0, 50, 1, '%'),

  ...['TP1', 'TP2', 'TP3', 'TP4', 'Runner'].map((l, i) => n('exit', `exitPlan.${i}.pct`, l, 0, 100, 5, '%')),

  n('signal', 'signals.minScore', 'Mindest-Score für ein Signal', 40, 95, 1),
  n('signal', 'signals.minGap', 'Mindestabstand Long zu Short', 0, 60, 1, 'Punkte'),
  n('signal', 'signals.modes.swing.maxLeverage', 'Hebel-Grenze Swing', 1, 50, 1, '×'),
  n('signal', 'signals.modes.intraday.maxLeverage', 'Hebel-Grenze Daytrade', 1, 50, 1, '×'),
  n('signal', 'signals.modes.scalp.maxLeverage', 'Hebel-Grenze Scalp', 1, 50, 1, '×'),
  n('signal', 'signals.modes.swing.minTp1Pct', 'TP1 mindestens entfernt (Swing)', 0.1, 20, 0.1, '%'),
  n('signal', 'signals.modes.intraday.minTp1Pct', 'TP1 mindestens entfernt (Daytrade)', 0.1, 20, 0.1, '%'),
  n('signal', 'signals.modes.scalp.minTp1Pct', 'TP1 mindestens entfernt (Scalp)', 0.1, 20, 0.1, '%'),
  n('signal', 'signals.hot.topN', 'Heiße Coins: Top … nach Market Cap', 20, 250, 10),
  n('signal', 'signals.hot.maxPicks', 'Heiße Coins: so viele anzeigen', 1, 15, 1),

  n('markt', 'market.biasWeights.btc', 'Gewicht BTC-Trend', 0, 100, 5, '%'),
  n('markt', 'market.biasWeights.eth', 'Gewicht ETH-Trend', 0, 100, 5, '%'),
  n('markt', 'market.biasWeights.breadth', 'Gewicht Marktbreite', 0, 100, 5, '%'),
  n('markt', 'market.biasWeights.ratio', 'Gewicht ETH/BTC', 0, 100, 5, '%'),
  n('markt', 'market.breadthTop', 'Marktbreite: Top … Coins', 10, 150, 10),
  n('markt', 'market.breadthEma', 'Marktbreite: über EMA', 10, 200, 5),

  { group: 'signal', path: 'positions.autoStyle', label: 'Automatischer Plan für eigene Trades', type: 'choice', options: [['swing', 'Swing'], ['intraday', 'Daytrade']], hint: 'SL und Ziele für Positionen ohne Signal' },

  n('telegram', 'alerts.minScore', 'Signal melden ab Score', 50, 100, 1),
  { group: 'telegram', path: 'alerts.styles', label: 'Welche Stile melden', type: 'styles' },
  n('telegram', 'alerts.minVolumeUsd', 'Mindestumsatz (24 Std.)', 0, 1000, 1, 'Mio. $', { scale: 1e6 }),
  n('telegram', 'alerts.repeatHours', 'Gleiches Signal frühestens erneut nach', 1, 168, 1, 'Std.'),
  n('telegram', 'alerts.flipHours', 'Richtungswechsel gesperrt für', 0, 168, 1, 'Std.'),
  n('telegram', 'alerts.maxPerRun', 'Höchstens Meldungen pro Lauf', 1, 10, 1),
  n('telegram', 'alerts.reportDays', 'Tagebuch-Auswertung alle', 1, 60, 1, 'Tage'),
  { group: 'telegram', path: 'alerts.risk', label: 'Regelverstöße melden', type: 'bool' },

  n('ind', 'indicators.emaFast', 'EMA schnell', 2, 50, 1),
  n('ind', 'indicators.emaMid', 'EMA mittel', 5, 100, 1),
  n('ind', 'indicators.emaSlow', 'EMA langsam', 10, 150, 1),
  n('ind', 'indicators.emaTrend', 'EMA Trend', 50, 220, 1, '', { hint: 'höchstens 220, damit genug Kerzen vorhanden sind' }),
  n('ind', 'indicators.rsiPeriod', 'RSI Länge', 3, 50, 1),
  n('ind', 'indicators.rsiHigh', 'RSI überkauft ab', 55, 95, 1),
  n('ind', 'indicators.rsiLow', 'RSI überverkauft unter', 5, 45, 1),
  n('ind', 'indicators.atrPeriod', 'ATR Länge', 3, 50, 1),
  n('ind', 'indicators.macdFast', 'MACD schnell', 2, 50, 1),
  n('ind', 'indicators.macdSlow', 'MACD langsam', 5, 100, 1),
  n('ind', 'indicators.macdSignal', 'MACD Signal', 2, 30, 1),
  n('ind', 'indicators.momentumAtr', 'Starkes Momentum ab', 1, 10, 0.5, 'ATR'),
  n('ind', 'indicators.volumeSpike', 'Volumen-Spike ab', 1.2, 10, 0.1, '× Ø'),

  ...[
    ['goldenCross', 'Golden/Death Cross (Tag)'], ['patternDaily', 'Chartmuster-Bruch 1D'], ['pattern4h', 'Chartmuster-Bruch 4H'],
    ['ema55x200', 'Kreuzung EMA langsam/Trend'], ['ema21x55', 'Kreuzung EMA mittel/langsam'], ['ema8x21', 'Kreuzung EMA schnell/mittel'],
    ['macdCross', 'MACD-Kreuzung'], ['rsiExit', 'RSI verlässt Extremzone'], ['momentum', 'Momentum'], ['momentumStrong', 'Starkes Momentum'],
    ['volume', 'Volumen-Spike'], ['volumeStrong', 'Starker Volumen-Spike'], ['candle', 'Kerzenmuster'], ['candleStrong', 'Starkes Kerzenmuster'],
    ['elliott', 'Elliott-Welle'],
  ].map(([k, l]) => n('points', `eventPoints.${k}`, l, 0, 30, 1, 'Pkt.')),
];

export const STYLE_KEYS = ['swing', 'intraday', 'scalp'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Anzeigewert ↔ gespeicherter Wert
export const toShown = (f, v) => (f.scale ? Math.round((v / f.scale) * 1e6) / 1e6 : v);
export const fromShown = (f, v) => (f.scale ? v * f.scale : v);

// Aktuelle Werte aller Felder (Pfad → Wert)
export function currentValues(cfg = CONFIG) {
  return Object.fromEntries(FIELDS.map((f) => [f.path, JSON.parse(JSON.stringify(getPath(cfg, f.path)))]));
}
export const recommendedValue = (path) => getPath(RECOMMENDED, path);
export const isChanged = (path, value) => !same(value, recommendedValue(path));

// Was im iPhone gespeichert wird: alle Abweichungen, plus bewusste Rücksetzungen von Werten aus my-settings.js
export function localSnapshot(values, fileSettings = MY_SETTINGS) {
  const out = {};
  Object.entries(values).forEach(([p, v]) => { if (isChanged(p, v) || p in (fileSettings || {})) out[p] = v; });
  return out;
}
// Was in my-settings.js für den Wächter landet: nur echte Abweichungen von der Empfehlung
export function diffFromRecommended(values) {
  return Object.fromEntries(Object.entries(values).filter(([p, v]) => isChanged(p, v)));
}

// Prüfungen: Liste von { path, text }
export function validate(v) {
  const err = [];
  const e = (path, text) => err.push({ path, text });
  FIELDS.filter((f) => f.type === 'num').forEach((f) => {
    const x = toShown(f, v[f.path]);
    if (!Number.isFinite(x)) e(f.path, `${f.label}: bitte eine Zahl eingeben`);
    else if (x < f.min || x > f.max) e(f.path, `${f.label}: erlaubt ist ${f.min} bis ${f.max}`);
  });
  const sum = [0, 1, 2, 3, 4].reduce((s, i) => s + (Number(v[`exitPlan.${i}.pct`]) || 0), 0);
  if (Math.round(sum) !== 100) e('exitPlan.0.pct', `Ausstiegsplan ergibt ${sum} %, es müssen genau 100 % sein`);
  if (v['rules.riskPerTradeWarnPct'] > v['rules.riskPerTradeMaxPct']) e('rules.riskPerTradeWarnPct', 'Risiko: „gelb ab“ muss kleiner oder gleich „rot ab“ sein');
  const st = [0, 1, 2].map((i) => v[`rules.riskSteps.${i}`]);
  if (!(st[0] < st[1] && st[1] < st[2])) e('rules.riskSteps.0', 'Risiko-Stufen müssen aufsteigen: Stufe 1 < Stufe 2 < Stufe 3');
  if (v['guard.stopNoiseAtr'] > v['guard.stopTightAtr']) e('guard.stopNoiseAtr', 'Stop-Check: „rot unter“ muss kleiner oder gleich „gelb unter“ sein');
  if (v['rules.freeCapitalMinPct'] > v['rules.freeCapitalWarnPct']) e('rules.freeCapitalMinPct', 'Freies Kapital: „rot unter“ muss kleiner oder gleich „gelb unter“ sein');
  const I = (k) => v[`indicators.${k}`];
  if (!(I('emaFast') < I('emaMid') && I('emaMid') < I('emaSlow') && I('emaSlow') < I('emaTrend'))) e('indicators.emaFast', 'EMA-Längen müssen aufsteigen: schnell < mittel < langsam < Trend');
  if (!(I('macdFast') < I('macdSlow'))) e('indicators.macdFast', 'MACD: schnell muss kleiner als langsam sein');
  if (!(I('rsiLow') < 50 && I('rsiHigh') > 50)) e('indicators.rsiLow', 'RSI: überverkauft unter 50, überkauft über 50');
  const wsum = ['btc', 'eth', 'breadth', 'ratio'].reduce((s, k) => s + (Number(v[`market.biasWeights.${k}`]) || 0), 0);
  if (Math.round(wsum) !== 100) e('market.biasWeights.btc', `Markt-Bias: Gewichte ergeben ${wsum} %, es müssen genau 100 % sein`);
  if (!(v['alerts.styles'] || []).length) e('alerts.styles', 'Telegram: mindestens einen Stil auswählen');
  return err;
}

// Inhalt der Datei my-settings.js
export function settingsFile(diff, date = new Date()) {
  const body = JSON.stringify(diff, null, 2);
  return `// Deine Abweichungen von den empfohlenen Werten, erzeugt von der App am ${date.toLocaleString('de-DE')}.\n`
    + `// Hochladen zu GitHub, dann nutzt auch der Telegram-Wächter diese Werte.\n`
    + `export const MY_SETTINGS = ${body};\n`;
}

// Listen für den Wächter: Watchlist nur, wenn du sie in der App geändert hast; handelbare Märkte, wenn eingetragen.
// (Ohne Eintrag gilt im Wächter die Empfehlung: Standard-Watchlist bzw. Top-Coins.)
export function listsForExport(watchlist, tradeable, rec = RECOMMENDED) {
  const out = {};
  if (Array.isArray(watchlist) && watchlist.length && !same(watchlist, rec.watchlist)) out.watchlist = [...watchlist];
  if (Array.isArray(tradeable) && tradeable.length) out.tradeable = [...tradeable];
  return out;
}
