// Tests für core-binance.js (8h: lange Historie von Binance, nur Messung)
import { BN, bnSymbol, dayStart, periods, periodOf, loadEnd, klinesUrl, parseKlines, loadSeries, aliveAt, pingBinance, gaps, volumeBefore, rejectReason, crossCheck, selectMarkets, pack, unpack, packedBytes, putSeries, getSeries, candlesOf, newMeta, metaBytes, scanMarket, loadH4, scanLeft, h4Left, phaseOf, protocolText } from './core-binance.js';

const DAY = 864e5, H = 36e5;
const near = (a, b, eps = 1e-9) => a != null && Math.abs(a - b) < eps;
const STICH = Date.UTC(2026, 9, 6), VAULT = STICH - 365 * DAY;
const META = () => newMeta(STICH + 5 * H, ['BTC', 'kPEPE', 'NEU', 'FEHLT', 'TOT', 'FALSCH', 'xyz:GOLD']);

// Nachgebildetes Binance: stetiger Kurs je Markt, Listing-Datum, optional Handelsende. Zählt mit, was angefragt wird.
const LIST = { BTCUSDT: { from: Date.UTC(2019, 0, 1), px: 30000 }, PEPEUSDT: { from: Date.UTC(2023, 4, 5), px: 0.00001 }, NEUUSDT: { from: Date.UTC(2025, 2, 1), px: 2 },
  TOTUSDT: { from: Date.UTC(2020, 0, 1), px: 5, to: Date.UTC(2026, 5, 1) }, FALSCHUSDT: { from: Date.UTC(2021, 0, 1), px: 7 } };
const price = (m, t) => m.px * (1 + 0.3 * Math.sin(t / (40 * DAY))) * (1 + 0.02 * Math.sin(t / (9 * H)));
const calls = [];
const fake = async (url) => {
  const u = new URL(url), q = Object.fromEntries(u.searchParams), m = LIST[q.symbol];
  calls.push(q);
  if (!m) return { status: 400, ok: false, json: async () => ({ code: -1121 }) };
  const step = BN.step[q.interval], rows = [];
  let t = Math.max(Math.ceil(Number(q.startTime) / step) * step, m.from);
  for (; t <= Number(q.endTime) && rows.length < Number(q.limit); t += step) {
    if (m.to && t >= m.to) break;
    if (q.symbol === 'BTCUSDT' && t >= Date.UTC(2021, 3, 25) && t < Date.UTC(2021, 3, 26)) continue; // eine Wartungspause
    const o = price(m, t), c = price(m, t + step);
    rows.push([t, String(o), String(Math.max(o, c) * 1.01), String(Math.min(o, c) * 0.99), String(c), '1000', t + step - 1, String(1e6 + (m.px > 100 ? 5e6 : 0)), 10]);
  }
  return { status: 200, ok: true, json: async () => rows };
};
// Hyperliquid-Gegenprobe: gleicher Kurs, bei kPEPE mal 1000; FALSCH ist dort ein anderer Coin; NEU gab es noch nicht
const hlClose = async (coin, day) => (coin === 'BTC' ? price(LIST.BTCUSDT, day + DAY) * 1.004 : coin === 'kPEPE' ? price(LIST.PEPEUSDT, day + DAY) * 1000 : coin === 'FALSCH' ? 99 : null);

// Die Abläufe brauchen await, die Testseite ruft Tests ohne await auf: einmal vorab rechnen, unten nur prüfen.
const M = META();
for (const c of M.candidates) M.scanned[c] = await scanMarket(c, M, { fetchFn: fake, hlClose });
const maxAsked = Math.max(...calls.filter((q) => Number(q.limit) > 1).map((q) => Number(q.endTime)));
const aliveCalls = calls.filter((q) => Number(q.limit) === 1);
const SEL = selectMarkets(M.scanned, STICH);
const PREVIEW = protocolText(M);
const M2 = { ...M, markets: SEL, frozenAt: STICH + 6 * H, h4: {} };
calls.length = 0;
for (const c of SEL) M2.h4[c] = await loadH4(c, M2, fake);
const h4Calls = [...calls];
const BTC4 = await candlesOf('4h', 'BTC'), BTCD = await candlesOf('1d', 'BTC'), PEPE4 = await candlesOf('4h', 'kPEPE');
const SER = await loadSeries('BTCUSDT', 1, '1d', BN.from, VAULT - 1, fake);
const NONE = await loadSeries('GIBTSNICHT', 1, '1d', BN.from, VAULT - 1, fake);
const PING = await pingBinance(fake);
const BLOCK = await pingBinance(async () => { throw new TypeError('Load failed'); }).then(() => 'ok', (e) => e.message);
const LIMIT = await loadSeries('BTCUSDT', 1, '1d', BN.from, VAULT - 1, async () => ({ status: 429, ok: false })).then(() => 'ok', (e) => e.message);
const NOSAVE = await getSeries('1d', 'FALSCH');
const mkC = (ts) => ts.map((t) => ({ t, T: t + DAY - 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 10, q: 15 }));

export const tests = [
  ['Binance: Namen (BTC → BTCUSDT, kPEPE → PEPEUSDT mal 1000)', () => bnSymbol('BTC').symbol === 'BTCUSDT' && bnSymbol('BTC').mult === 1 && bnSymbol('kPEPE').symbol === 'PEPEUSDT' && bnSymbol('kPEPE').mult === 1000],
  ['Binance: fremde Börsen, Stablecoins und leere Namen fallen raus', () => bnSymbol('xyz:GOLD') === null && bnSymbol('USDC') === null && bnSymbol('') === null && bnSymbol(null) === null],
  ['Binance: Coins mit Ziffern im Namen gehen (0G, 2Z)', () => bnSymbol('0G').symbol === '0GUSDT' && bnSymbol('2Z').symbol === '2ZUSDT'],
  ['Binance: Stichtag ist der Tagesbeginn in UTC', () => newMeta(STICH + 23 * H, []).stichtag === STICH && dayStart(STICH - 1) === STICH - DAY],
  ['Binance: Zeiträume (Entwicklung bis Ende 2023, Prüfung bis Tresor-Grenze, Tresor 365 Tage)', () => { const p = periods(STICH); return p.dev[0] === Date.UTC(2020, 0, 1) && p.dev[1] === Date.UTC(2024, 0, 1) && p.check[1] === VAULT && p.vault[0] === VAULT && p.vault[1] === STICH; }],
  ['Binance: Einstiege werden dem richtigen Zeitraum zugeordnet', () => periodOf(Date.UTC(2023, 11, 31, 20), STICH) === 'dev' && periodOf(Date.UTC(2024, 0, 1), STICH) === 'check' && periodOf(VAULT, STICH) === 'vault' && periodOf(STICH, STICH) === null && periodOf(Date.UTC(2019, 5, 1), STICH) === null],
  ['Binance: Sperrfrist von 10 Tagen vor der Tresor-Grenze', () => periodOf(VAULT - 10 * DAY, STICH) === 'sperre' && periodOf(VAULT - 1, STICH) === 'sperre' && periodOf(VAULT - 10 * DAY - 1, STICH) === 'check'],
  ['Binance: geladen wird nur bis zur Tresor-Grenze', () => loadEnd(M) === VAULT - 1 && loadEnd({ ...M, vaultOpened: true }) === STICH - 1],
  ['Binance: Tresor-Schutz, keine Kerzen-Anfrage reicht über die Grenze', () => maxAsked === VAULT - 1 && h4Calls.every((q) => Number(q.endTime) === VAULT - 1)],
  ['Binance: Lebenszeichen fragt genau eine Kerze der letzten drei Tage ab', () => aliveCalls.length > 0 && aliveCalls.every((q) => Number(q.startTime) === STICH - 3 * DAY && Number(q.endTime) === STICH - 1)],
  ['Binance: Adresse des Abrufs', () => klinesUrl('BTCUSDT', '4h', 1, 2) === 'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=4h&startTime=1&endTime=2&limit=1000'],
  ['Binance: Kerzenform wie Hyperliquid, Zahlen statt Text', () => { const c = parseKlines([[0, '1', '2', '0.5', '1.5', '10', 99, '15', 3]])[0]; return c.t === 0 && c.T === 99 && c.o === 1 && c.h === 2 && c.l === 0.5 && c.c === 1.5 && c.v === 10 && c.q === 15; }],
  ['Binance: k-Coins: Kurs mal 1000, Volumen durch 1000, Umsatz bleibt', () => { const c = parseKlines([[0, '0.001', '0.002', '0.0005', '0.0015', '5000', 99, '7', 3]], 1000)[0]; return near(c.o, 1) && near(c.h, 2) && near(c.c, 1.5) && near(c.v, 5) && c.q === 7; }],
  ['Binance: offene oder zu späte Kerzen fallen weg, kaputte auch', () => parseKlines([[0, '1', '2', '1', '1', '1', 99, '1'], [100, '1', '2', '1', '1', '1', 199, '1'], [200, 'x', '2', '1', '1', '1', 150, '1']], 1, 150).length === 1 && parseKlines(null).length === 0],
  ['Binance: lange Reihe wird in Häppchen geladen, ohne Doppelte, aufsteigend', () => SER.length > 2000 && SER.every((c, i) => i === 0 || c.t > SER[i - 1].t) && SER[0].t === Date.UTC(2020, 0, 1) && SER[SER.length - 1].T === VAULT - 1],
  ['Binance: unbekannter Markt liefert null statt Fehler', () => NONE === null],
  ['Binance: Verbindungstest liest alte Kerzen (Januar 2020)', () => PING.first === Date.UTC(2020, 0, 1) && PING.n === 2],
  ['Binance: gesperrter Abruf wird verständlich gemeldet', () => /nicht erreichbar/.test(BLOCK)],
  ['Binance: Bremse von Binance hält an statt weiterzufeuern', () => /bremst/.test(LIMIT)],
  ['Binance: Lücken werden gezählt', () => { const g = gaps(mkC([0, DAY, 4 * DAY, 5 * DAY]), DAY); return g.missing === 2 && g.ranges.length === 1 && g.ranges[0][2] === 2 && gaps(mkC([0, DAY]), DAY).missing === 0; }],
  ['Binance: Wartungspause steht im Protokoll des Marktes', () => M.scanned.BTC.gap === 1 && M2.h4.BTC.gap === 6],
  ['Binance: Umsatz zählt nur die 30 Tage vor der Tresor-Grenze', () => near(volumeBefore(mkC([VAULT - 31 * DAY, VAULT - 30 * DAY, VAULT - DAY, VAULT, VAULT + DAY]), VAULT), 30)],
  ['Binance: Gegenprobe mit Hyperliquid (5 % Spielraum)', () => crossCheck(100, 104) === 'ok' && crossCheck(100, 94) === 'bad' && crossCheck(null, 100) === 'none' && crossCheck(100, undefined) === 'none'],
  ['Binance: Gründe fürs Ausscheiden', () => rejectReason(M.scanned.FEHLT, STICH) === 'nicht bei Binance' && rejectReason(M.scanned['xyz:GOLD'], STICH) === 'nicht bei Binance' && /zwei Jahre/.test(rejectReason(M.scanned.NEU, STICH)) && /nicht mehr im Handel/.test(rejectReason(M.scanned.TOT, STICH)) && /anderer Coin/.test(rejectReason(M.scanned.FALSCH, STICH))],
  ['Binance: BTC und kPEPE bestehen, Gegenprobe ok', () => rejectReason(M.scanned.BTC, STICH) === null && rejectReason(M.scanned.kPEPE, STICH) === null && M.scanned.BTC.cross === 'ok' && M.scanned.kPEPE.cross === 'ok'],
  ['Binance: zwei Jahre werden am Stichtag gemessen (Grenzfall)', () => rejectReason({ first: STICH - 730 * DAY, last: VAULT - DAY, vol: 1, alive: true }, STICH) === null && rejectReason({ first: STICH - 729 * DAY, last: VAULT - DAY, vol: 1, alive: true }, STICH) !== null],
  ['Binance: Auswahl nach Umsatz, höchstens so viele wie erlaubt, wiederholbar', () => { const s = {}; for (let i = 0; i < 60; i++) s['C' + String(i).padStart(2, '0')] = { first: 0, last: VAULT - DAY, vol: 1000 - (i % 30), alive: true }; const a = selectMarkets(s, STICH), b = selectMarkets(s, STICH); return a.length === 50 && a[0] === 'C00' && a[1] === 'C30' && a.join() === b.join() && selectMarkets(s, STICH, 3).length === 3; }],
  ['Binance: nur bestandene Märkte kommen in die Liste', () => SEL.length === 2 && SEL.includes('BTC') && SEL.includes('kPEPE')],
  ['Binance: durchgefallene Märkte werden nicht gespeichert', () => NOSAVE === null],
  ['Binance: kompakt speichern und wieder auspacken', () => { const c = mkC([0, DAY]); const u = unpack(pack(c, true), DAY); return u.length === 2 && u[1].t === DAY && u[1].T === 2 * DAY - 1 && u[0].c === 1.5 && u[0].q === 15 && unpack(pack(c), DAY)[0].q === undefined && unpack(null, DAY).length === 0; }],
  ['Binance: Kurse bleiben beim Speichern genau (auch sehr kleine)', () => { const c = [{ t: 0, T: 1, o: 0.00001234567, h: 123456.789012, l: 1, c: 1, v: 1 }]; const u = unpack(pack(c), DAY)[0]; return u.o === 0.00001234567 && u.h === 123456.789012; }],
  ['Binance: gespeicherte 4H-Kerzen kommen vollständig zurück', () => BTC4.length === M2.h4.BTC.n && BTC4[0].t === Date.UTC(2020, 0, 1) && BTC4[BTC4.length - 1].T === VAULT - 1 && BTC4[1].t - BTC4[0].t === 4 * H],
  ['Binance: Tageskerzen der gewählten Märkte sind gespeichert (mit Umsatz)', () => BTCD.length === M.scanned.BTC.n && BTCD[0].q > 0],
  ['Binance: kPEPE liegt in Tausender-Einheiten im Speicher', () => PEPE4.length > 0 && PEPE4[0].o > 0.005 && PEPE4[0].o < 0.02 && PEPE4[0].t === Date.UTC(2023, 4, 5)],
  ['Binance: Ablauf (neu → prüfen → Vorschau → laden → fertig)', () => phaseOf(null) === 'neu' && phaseOf(META()) === 'pruefen' && phaseOf(M) === 'vorschau' && phaseOf({ ...M2, h4: {} }) === 'laden' && phaseOf(M2) === 'fertig' && scanLeft(M).length === 0 && h4Left(M2).length === 0],
  ['Binance: Platzbedarf wird aus dem Protokoll gerechnet', () => packedBytes(1000) === 44000 && packedBytes(1000, true) === 48000 && metaBytes(M2) === packedBytes(M.scanned.BTC.n + M.scanned.kPEPE.n, true) + packedBytes(M2.h4.BTC.n + M2.h4.kPEPE.n) && metaBytes(null) === 0],
  ['Binance: Protokoll nennt Stichtag, Zeiträume, Liste und Ausgeschiedene', () => { const t = protocolText(M2); return t.includes('Stichtag: 06.10.2026') && t.includes('Tresor: 06.10.2025 bis 05.10.2026 (nicht geladen)') && t.includes('Einstiege bis 25.09.2025') && t.includes('kPEPE = PEPEUSDT × 1000') && t.includes('eingefroren am 06.10.2026') && /1 × Kurs passt nicht/.test(t) && PREVIEW.includes('VORSCHAU'); }],
  ['Binance: Protokoll enthält keine Beträge, Adressen oder Schlüssel', () => { const t = protocolText(M2); return !/0x[0-9a-fA-F]{8}/.test(t) && !/\$|USD\b|key|token/i.test(t.replace(/USDT/g, '')); }],
];
