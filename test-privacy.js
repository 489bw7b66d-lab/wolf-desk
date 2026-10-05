import { publicDiff, amountLeak, PRIVATE_KEYS } from './core-privacy.js';
import { privatePart, applyPrivate, publicLeak, settingsFile, listsForExport } from './core-settings.js';

export const tests = [
  ['Datenschutz: private Daten als kompaktes JSON (leer = {})', () => privatePart({}, {}) === '{}' && JSON.parse(privatePart({ ZEC: { dir: 'short' } }, { SOL: { tps: [1] } })).views.ZEC.dir === 'short'],
  ['Datenschutz: Wächter übernimmt Secret, Secret hat Vorrang', () => {
    const cfg = { views: { ZEC: { dir: 'long' } }, plans: {} };
    const r = applyPrivate(cfg, '{"views":{"ZEC":{"dir":"short"},"SOL":{"dir":"long"}},"plans":{"LDO":{"tps":[0.5]}}}');
    return r.ok && r.views === 2 && r.plans === 1 && cfg.views.ZEC.dir === 'short' && cfg.plans.LDO.tps[0] === 0.5;
  }],
  ['Datenschutz: fehlendes oder kaputtes Secret bricht nichts', () => { const c = {}; return applyPrivate(c, undefined).empty && !applyPrivate(c, '{kaputt').ok && !c.views; }],
  ['Datenschutz: öffentliche Datei enthält keine Einschätzungen/Ziele mehr', () => {
    const text = settingsFile({ 'rules.maxLeverage': 10, ...listsForExport(['BTC', 'SOL'], ['SOL']) });
    return !/views|plans/.test(text) && text.includes('rules.maxLeverage');
  }],
  ['Datenschutz: Hinweis, wenn die alte Datei noch Einschätzungen enthält', () => publicLeak({ views: { ZEC: {} } }) && !publicLeak({ views: {}, plans: {} }) && !publicLeak(null)],
  // 8a: keine Beträge in der öffentlichen Datei
  ['Datenschutz: Startkapital kommt nicht in die öffentliche Datei', () => { const d = publicDiff({ startCapital: 2025.57, 'alerts.minScore': 80 }); return !('startCapital' in d) && d['alerts.minScore'] === 80; }],
  ['Datenschutz: erzeugte my-settings.js enthält keinen Betrag', () => !settingsFile(publicDiff({ startCapital: 2025.57, 'signals.shortFilter': 'mittel' })).includes('2025') && settingsFile(publicDiff({ startCapital: 1 })).includes('MY_SETTINGS = {}')],
  ['Datenschutz: übrige Einstellungen und Listen bleiben unverändert', () => { const d = publicDiff({ 'exitPlan.1.pct': 30, watchlist: ['BTC'], tradeable: ['ETH'] }); return d['exitPlan.1.pct'] === 30 && d.watchlist[0] === 'BTC' && d.tradeable[0] === 'ETH'; }],
  ['Datenschutz: Hinweis, wenn die alte Datei noch das Startkapital enthält', () => amountLeak({ startCapital: 2000 }) && !amountLeak({ 'alerts.minScore': 80 }) && !amountLeak(null) && PRIVATE_KEYS.includes('startCapital')],
  ['Datenschutz: leere Eingabe ergibt leere Datei, kein Absturz', () => JSON.stringify(publicDiff()) === '{}' && JSON.stringify(publicDiff(null)) === '{}'],
];
