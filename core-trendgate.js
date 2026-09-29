// Short-Filter nach Tagestrend (Signale schärfen, Schritt 1). Backtest: Shorts gegen den Tagestrend verlieren deutlich.
// Drei Stufen, jede baut auf der vorigen auf:
//   mild   = Tageskurs unter der EMA 200
//   mittel = mild und Tageschart bärisch (tiefere Hochs/Tiefs ODER EMA-Stapel 8 < 21 < 55)
//   streng = mittel und die EMA 200 wurde in den letzten 10 Tagen von unten angelaufen (Retest, bis 1 % darunter)
// Ohne genug Tagesdaten für die EMA 200 kann der Filter nicht urteilen: dann blockt er nicht (Hinweis „unbekannt“).
// Longs bleiben unberührt. Reine Funktionen, Tests in test-trendgate.js.

export const GATE_LEVELS = ['mild', 'mittel', 'streng'];
export const GATE_LABEL = { aus: 'Aus', mild: 'Mild (unter EMA 200)', mittel: 'Mittel (+ Abwärtsstruktur)', streng: 'Streng (+ Retest der 200er)' };

// daily: abgeschlossene Tageskerzen, a: analyzeTimeframe(daily) (liefert ema200, stack, structure, close)
export function trendGate(daily, a, retestBars = 10) {
  const close = a?.close ?? daily?.at(-1)?.c;
  const e200 = a?.ema200;
  if (!(close > 0) || !(e200 > 0)) return { known: false, mild: true, mittel: true, streng: true };
  const mild = close < e200;
  const mittel = mild && (a.structure === 'down' || a.stack === 'bear');
  const recentHigh = Math.max(...(daily || []).slice(-retestBars).map((c) => c.h));
  const streng = mittel && recentHigh >= e200 * 0.99;
  return { known: true, mild, mittel, streng, close, e200 };
}

// Darf ein Short bei dieser Filterstufe gemeldet werden?
export const gatePasses = (gate, level) => !level || level === 'aus' || !gate || !!gate[level];

// Text, wenn ein Short gesperrt wurde
export function gateText(gate, level) {
  if (!gate?.known) return '';
  if (!gate.mild) return 'Short gesperrt: Tageskurs über der EMA 200';
  if (level !== 'mild' && !gate.mittel) return 'Short gesperrt: Tageschart noch nicht bärisch';
  if (level === 'streng' && !gate.streng) return 'Short gesperrt: kein Retest der EMA 200';
  return '';
}

// Backtest: dieselben Trades, nur Shorts je Stufe gefiltert
export function compareGate(trades) {
  const sum = (a) => a.reduce((n, t) => n + t.r, 0);
  const longs = trades.filter((t) => t.dir !== 'short'), shorts = trades.filter((t) => t.dir === 'short');
  const row = (key, list) => ({ key, shorts: list.length, shortAvg: list.length ? sum(list) / list.length : null, total: sum(longs) + sum(list), n: longs.length + list.length });
  return [row('aus', shorts), ...GATE_LEVELS.map((k) => row(k, shorts.filter((t) => gatePasses(t.gate, k))))];
}
