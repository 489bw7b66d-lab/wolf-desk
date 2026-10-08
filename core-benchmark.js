// Maßstab als Signalgeber (8b): stumpfe Trendfolge, die im Backtest beide Engines geschlagen hat.
// Bedingung: Tages-EMA 20 über EMA 100 und Kurs über der Tages-EMA 20. Stop 2 ATR (Tag), Ziele 2R / 3R / 4R / 6R.
// Signal = die Bedingung ist an der letzten abgeschlossenen Setup-Kerze (4H) erfüllt und war es an der Kerze davor nicht
// („neu im Trend“: frischer Trend oder Rückkehr über die EMA 20 nach einem Rücksetzer). Nur Long.
// Reine Funktionen, Tests in test-benchmark.js. Der Backtest-Maßstab (core-backtest) bleibt unverändert die Vergleichslinie.
import { CONFIG } from './config.js';
import { ema, atr } from './core-indicators.js';

const DEF = { emaFast: 20, emaSlow: 100, atrPeriod: 14, atrMult: 2, tps: [2, 3, 4, 6], minDays: 110, style: 'swing', chaseR: 0.5, setupTf: '4h', holdDays: 10 };
export const BM = () => ({ ...DEF, ...(CONFIG.benchmark || {}) });
export const BM_LABEL = 'Trendfolge';
export const BM_EVENT = 'Neu im Aufwärtstrend';

// Zustand zu einem Kurs: daily = abgeschlossene Tageskerzen, px = Kurs (Schluss der Setup-Kerze)
export function bmState(daily, px, cfg = BM()) {
  if (!Array.isArray(daily) || daily.length < cfg.minDays || !(px > 0)) return null;
  const closes = daily.map((c) => c.c);
  const fast = ema(closes, cfg.emaFast).at(-1), slow = ema(closes, cfg.emaSlow).at(-1), a = atr(daily, cfg.atrPeriod).at(-1);
  if (!(fast > 0) || !(slow > 0) || !(a > 0)) return null;
  const trend = fast > slow, above = px > fast;
  return { ok: trend && above, trend, above, fast, slow, atr: a, px };
}

// Plan im Format der Engine: Einstieg zum Kurs, Stop 2 ATR, Ziele in R
export function bmPlan(st, cfg = BM()) {
  if (!st?.ok) return null;
  const R = cfg.atrMult * st.atr, px = st.px, stop = px - R;
  if (!(stop > 0)) return null;
  return { dir: 'long', entry: px, stop, zone: [px, px], tps: cfg.tps.map((k) => px + k * R), R, stopDistPct: (R / px) * 100,
    method: 'benchmark', entryMode: 'Trendfolge: Einstieg zum Kurs', stopLabel: `${cfg.atrMult}× ATR (Tag)`, tpLabels: cfg.tps.map((k) => `${k}R`), warnings: [] };
}

const upTo = (list, T) => { let n = list.length; while (n > 0 && list[n - 1].T > T) n--; return n === list.length ? list : list.slice(0, n); };

// „Neu im Trend“: Zustand an der letzten abgeschlossenen Setup-Kerze gegen die Kerze davor.
// Die Tageskerzen werden je Zeitpunkt abgeschnitten, damit nichts aus der Zukunft einfließt (wichtig im Backtest).
export function bmFlip(daily, setup, cfg = BM()) {
  if (!Array.isArray(setup) || setup.length < 2) return { flip: false, now: null, prev: null };
  const last = setup.at(-1), before = setup.at(-2);
  const now = bmState(upTo(daily || [], last.T), last.c, cfg);
  const prev = bmState(upTo(daily || [], before.T), before.c, cfg);
  return { flip: !!now?.ok && !!prev && !prev.ok, now, prev, at: last.T };
}

// Seit wie vielen Setup-Kerzen ist die Bedingung am Stück erfüllt? (für die Anzeige „im Trend seit …“)
export function bmSince(daily, setup, cfg = BM(), max = 120) {
  let n = 0;
  for (let i = setup.length - 1; i >= 0 && n < max; i--) {
    if (!bmState(upTo(daily, setup[i].T), setup[i].c, cfg)?.ok) break;
    n++;
  }
  return n;
}

// Ergebnis im Format der Engine (für Telegram-Text, Tagebuch, Trade-Karte)
export function bmResult(coin, daily, setup, cfg = BM()) {
  const fl = bmFlip(daily, setup, cfg);
  const plan = bmPlan(fl.now, cfg);
  const style = CONFIG.signals.modes[cfg.style] ? cfg.style : 'swing';
  return {
    coin, engine: 'bm', mode: style, best: plan ? style : null, dir: plan ? 'long' : 'neutral', plan, flip: fl.flip, state: fl.now, lastClose: fl.at ?? null,
    tfs: CONFIG.signals.modes[style].tfs, total: { long: plan ? 100 : 0, short: 0 },
    events: plan ? [{ name: BM_EVENT, dir: 'long', strong: true }] : [], confirms: [], warnings: [], analyses: [null, { close: fl.now?.px ?? null, atr: null }],
  };
}

// Soll das Signal gemeldet werden? Wie signalAlert, aber ohne Score: es zählt nur der frische Wechsel.
// Der Kurs darf seit dem Kerzenschluss nicht davongelaufen sein (höchstens chaseR über dem Einstieg, nicht unter dem Stop).
export function bmAlert(r, price, sent = {}, now = Date.now(), cfg = CONFIG.alerts, extra = {}, bm = BM()) {
  if (!r?.plan || !r.flip) return null;
  if (extra.volume != null && cfg.minVolumeUsd && extra.volume < cfg.minVolumeUsd) return null;
  const p = r.plan, px = price > 0 ? price : p.entry;
  if (px <= p.stop || px > p.entry + bm.chaseR * p.R) return null;
  const key = r.coin + '|long';
  if (sent[key] != null && now - sent[key] < (cfg.repeatHours ?? 12) * 3600e3) return null;
  return { key, score: null, pos: { state: 'zone' }, price: px };
}

// Stärke zum Sortieren, wenn mehrere Märkte gleichzeitig melden: Abstand der schnellen über der langsamen EMA in ATR
export const bmStrength = (r) => (r?.state?.atr > 0 ? (r.state.fast - r.state.slow) / r.state.atr : 0);

// Kennzeichen im Tagebuch (Versionsschnitt): 'bm' = Maßstab, sonst alte Engine
export const engineOf = (e) => (e?.eng === 'bm' ? 'bm' : e?.eng === 'obs' ? 'obs' : 'alt'); // 8r: 'obs' = Beobachtung aus dem Setup-Finder
export const splitByEngine = (list = []) => ({ bm: list.filter((e) => engineOf(e) === 'bm'), obs: list.filter((e) => engineOf(e) === 'obs'), alt: list.filter((e) => engineOf(e) === 'alt') });

// 8c: So lange läuft ein Maßstab-Signal höchstens (Telegram-Hinweis und Tagebuch-Fenster). Der Backtest-Gewinn kommt aus diesem Zeit-Ausstieg.
export const bmHoldDays = (cfg = BM()) => (cfg.holdDays > 0 ? cfg.holdDays : 10);
// Tagebuch-Fenster in Tagen: Maßstab-Signale nach holdDays, alle anderen wie bisher nach Stil
export const journalWindow = (e, alerts = CONFIG.alerts, cfg = BM()) => (engineOf(e) !== 'alt' ? bmHoldDays(cfg) : alerts.journalDays?.[e?.style] || 7);
