import { planFor, signalFor, targetsFor, targetHits, cleanTargets } from './core-plans.js';
import { tradePath } from './core-path.js';
import { targetText } from './core-alerts.js';

const H = 36e5;
const PLAN3 = [{ label: 'TP1', pct: 30 }, { label: 'TP2', pct: 30 }, { label: 'TP3', pct: 25 }, { label: 'TP4', pct: 0 }, { label: 'Runner', pct: 15 }];
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

export const tests = [
  ['Ziele: Plan gehört zum laufenden Trade', () => planFor({ SOL: { side: 'long', openedAt: 1000, tps: [1] } }, 'SOL', 'long', 1000 + H)?.tps.length === 1],
  ['Ziele: Plan eines früheren Trades wird ignoriert', () => planFor({ SOL: { side: 'long', openedAt: 0, tps: [1] } }, 'SOL', 'long', 10 * H) === null],
  ['Ziele: Plan mit falscher Richtung wird ignoriert', () => planFor({ SOL: { side: 'short', tps: [1] } }, 'SOL', 'long', 5) === null],
  ['Ziele: passendes Signal (Position 3 Std. danach eröffnet)', () => signalFor([{ coin: 'SOL', dir: 'long', at: 0, tps: [110] }], 'SOL', 'long', 3 * H)?.tps[0] === 110],
  ['Ziele: Signal 30 Std. vorher passt nicht mehr', () => signalFor([{ coin: 'SOL', dir: 'long', at: 0, tps: [110] }], 'SOL', 'long', 30 * H) === null],
  ['Ziele: eigener Plan hat Vorrang vor dem Signal', () => targetsFor({ plan: { tps: [1], source: 'manuell' }, signal: { tps: [2], at: 0 } }).source === 'plan'],
  ['Ziele: deutsche Eingabe, falsche Seite fliegt raus', () => cleanTargets(['130,5', '1.250', '90', ''], 'long', 100).join() === '130.5,1250'],
  ['Ziele: Short sortiert fallend', () => cleanTargets(['80', '90', '70'], 'short', 100).join() === '90,80,70'],
  ['Ziele: erreichte Ziele werden gemeldet, nur einmal', () => {
    const h = targetHits('SOL', 'long', [110, 120, 130], 121, 'k', {});
    return h.map((x) => x.n).join() === '1,2' && targetHits('SOL', 'long', [110, 120, 130], 122, 'k', { [h[0].key]: 1, [h[1].key]: 1 }).length === 0;
  }],
  ['Ziele: Short erreicht Ziel beim Fallen', () => targetHits('ETH', 'short', [90, 80], 89, 'k', {}).length === 1],
  ['Trade-Weg: Ziele aus Plan statt Orders', () => {
    const p = tradePath({ coin: 'SOL', side: 'long', entry: 100, stop: 90, mark: 105 }, [], [], PLAN3, { tps: [110, 120, 130, 140], source: 'plan', label: 'x' });
    return p.tps.length === 3 && p.tps.at(-1).price === 130 && p.source.source === 'plan';
  }],
  ['Trade-Weg: Verkauf am Ziel = ✓ erreicht', () => tradePath({ coin: 'SOL', side: 'long', entry: 100, stop: 90, mark: 115 }, [], [{ px: 109.8 }], PLAN3, { tps: [110, 120, 130], label: 'x' }).tps[0].reached],
  ['Trade-Weg: Stop im Gewinn, Einstieg ganz links', () => {
    const p = tradePath({ coin: 'SOL', side: 'long', entry: 100, stop: 101, mark: 105 }, [], [], PLAN3, { tps: [110, 120, 130], label: 'x' });
    return p.entry.at === 0 && p.stop.inProfit && near(p.stop.at, 1 / 30);
  }],
  ['Meldung: TP2 mit Anteil laut Plan und Nachzieh-Vorschlag', () => { const t = targetText('SOL', [{ n: 2, price: 120 }], 3, PLAN3, 'SL auf 100,1 nachziehen (Einstieg plus Gebühren, TP2 erreicht)'); return t.includes('TP2') && t.includes('30 %') && t.includes('↗') && t.includes('Einstieg plus Gebühren'); }],
  ['Meldung: ohne Vorschlag kein Nachzieh-Satz (Stop schon nachgezogen)', () => !targetText('SOL', [{ n: 2, price: 120 }], 3, PLAN3).includes('↗')],
  ['Meldung: letztes Ziel mit 🏁 und Runner', () => { const t = targetText('SOL', [{ n: 3, price: 130 }], 3, PLAN3); return t.includes('🏁') && t.includes('Runner'); }],
];
