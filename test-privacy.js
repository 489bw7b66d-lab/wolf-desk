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
];
