// Setup-Finder, Vorschau (8l, überarbeitet in 8l1): durchsucht deine handelbaren Märkte nach den fünf abgenommenen Bausteinen
// und zeigt die aktuellen, noch gültigen Funde mit Bild. Reine Anzeige: kein Telegram, kein Tagebuch, kein Wächter.
// Jede Zeile ist eine „Beobachtung“ und behauptet keinen Vorteil. Logik und Tests: core-finder.js, core-sellblock.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { getCandles, getMarketCtx } from './core-scanner.js';
import { closedCandles } from './core-signals.js';
import { scanUniverse } from './core-universe.js';
import { getTradeable } from './core-tradeable.js';
import { NEW_RULES } from './core-ltrules.js';
import { FINDER, BLOCK_NAME, FLAG_NAME, trendNow, liveMarket, coinEntry, sortEntries, countByBlock, agoText, vizWithRoom, tradeResult, withBias, searchEntries, atLeast, crowdNotes, sinceText, fibText, rsiText } from './core-finder.js';
import { roomsText } from './core-sellblock.js';
import { IDX, buildIndex, extendIndex, loadIndex, saveIndex, needsRebuild, marketBias, biasLines, coinBiasText, capExBtcText } from './core-index.js';
import { market } from './core-market.js';
import { blindHtml } from './ui-blindchart.js';
import { esc, dn, tipInline } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
const DAY = 864e5, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let onTrade = null;
let bias = null, idxNote = '', query = '', skipped = []; // 8m: Markt-Bias, Hinweis zum Index, Suchtext, Märkte außerhalb des Aufwärtstrends
let getState = () => ({}), busy = false, stop = false, note = '', list = null, scannedAt = 0, minB = FINDER.minBlocks, filter = '', openCoin = '', info = null, scanned = 0;

const markets = () => Object.values(getState().markets || {}).flat();

async function scan() {
  if (busy) return;
  busy = true; stop = false; list = null; openCoin = ''; info = null; scanned = 0; bias = null; idxNote = ''; skipped = []; note = 'Lade Marktliste …'; paint();
  try {
    const ctx = await getMarketCtx(), names = markets();
    if (!names.length) throw new Error('Die Marktliste ist noch nicht geladen. Bitte gleich noch einmal versuchen.');
    const uni = await scanUniverse(names, ctx.ctx, getTradeable());
    const coins = uni.coins.filter((c) => !(ctx.map[c] < CONFIG.signals.minDayVolumeUsd));
    // Stufe 1: Tageskerzen aller Märkte (kommen aus dem Zwischenspeicher, wenn „Heiße Coins“ sie gerade geholt hat)
    const up = [], dailyAll = {};
    for (let k = 0; k < coins.length && !stop; k++) {
      note = `Tagestrend prüfen: ${k + 1} von ${coins.length} Märkten …`; status();
      try { const d = await getCandles(coins[k], '1d', true); dailyAll[coins[k]] = d; if (trendNow(d)) up.push({ c: coins[k], d }); else skipped.push(coins[k]); } catch { /* einzelner Markt fehlgeschlagen, weiter */ }
    }
    // 8m: Markt-Bias aus dem Hyperliquid-Ledger-Perp-Index. Zuerst aus den kurzen Reihen (sofort da), die lange Historie folgt am Ende.
    let btc = dailyAll.BTC || null;
    if (!btc) { try { btc = await getCandles('BTC', '1d', true); } catch { btc = null; } }
    const fresh = buildIndex(dailyAll), stored = loadIndex();
    const rebuild = needsRebuild(stored) || !extendIndex(stored, fresh);
    let idx = rebuild ? fresh : extendIndex(stored, fresh);
    // 8n1: sofort speichern (beim Neuaufbau als „kurz“ markiert), damit Startseite und Trade-Auswertung ihn gleich haben
    if (idx.alt.length) { saveIndex(idx, undefined, rebuild ? { full: false, tried: Date.now() } : { full: stored?.full !== false, tried: stored?.tried ?? null, got: stored?.got ?? null, of: stored?.of ?? null }); indexChanged(); }
    bias = marketBias(btc, idx); paint();
    // Stufe 2: nur Märkte im Tagestrend aufwärts brauchen die langen 4H-Kerzen
    const found = [];
    for (let k = 0; k < up.length && !stop; k++) {
      note = `Bausteine suchen: ${k + 1} von ${up.length} Märkten im Aufwärtstrend …`; status();
      try {
        const now = Date.now();
        await sleep(CONFIG.signals.hot.requestGapMs);
        const h4 = closedCandles(await hl.candles(up[k].c, '4h', now - FINDER.h4Days * DAY, now), now);
        if (h4.length < 200) continue;
        const M = liveMarket(up[k].c, up[k].d, h4);
        let e = coinEntry(up[k].c, M, null, ctx.ctx?.[up[k].c]?.price);
        scanned++;
        if (!e) continue;
        // Nur für Märkte mit Fund: lange Tagesreihe für die Sell-Blöcke auf Tag und Woche
        if (e.n) { try { await sleep(CONFIG.signals.hot.requestGapMs); const long = closedCandles(await hl.candles(up[k].c, '1d', now - FINDER.dailyDays * DAY, now), now); if (long.length > up[k].d.length) e = coinEntry(up[k].c, M, long, e.price); } catch { /* dann eben mit der kurzen Reihe */ } }
        found.push(withBias(e, btc));
        list = sortEntries(found); paintList();
      } catch (err) { if (/Rate-Limit/.test(err.message)) { note = 'Hyperliquid bremst, kurze Pause …'; status(); await sleep(60e3); k--; } }
    }
    list = sortEntries(found); scannedAt = Date.now();
    // 8m: lange Historie für den Index, einmalig (danach wird er aus den kurzen Reihen fortgeschrieben)
    if (rebuild && !stop) {
      const names = Object.keys(dailyAll).filter((c) => c !== 'BTC'), long = { ...dailyAll };
      let ok = 0;
      for (let k = 0; k < names.length && !stop; k++) {
        note = `Index-Historie laden (einmalig): ${k + 1} von ${names.length} Märkten …`; status();
        try { const now = Date.now(); await sleep(CONFIG.signals.hot.requestGapMs); const d = closedCandles(await hl.candles(names[k], '1d', IDX.from, now), now); if (d.length >= dailyAll[names[k]].length) { long[names[k]] = d; ok++; } }
        catch (err) { if (/Rate-Limit/.test(err.message)) { note = 'Hyperliquid bremst, kurze Pause …'; status(); await sleep(60e3); k--; } }
      }
      if (!stop) { const full = buildIndex(long); if (full.alt.length < idx.alt.length) saveIndex(idx, undefined, { full: false, tried: Date.now(), got: ok, of: names.length }); if (full.alt.length >= idx.alt.length) { idx = full; saveIndex(idx, undefined, { full: ok >= names.length * 0.7, tried: Date.now(), got: ok, of: names.length }); indexChanged(); bias = marketBias(btc, idx); } }
      else idxNote = 'Die lange Index-Historie wurde nicht fertig geladen; sie wird beim nächsten Durchlauf nachgeholt.';
    }
    info = { coins: coins.length, up: up.length, source: uni.source };
    note = stop ? 'Angehalten.' : '';
  } catch (e) { note = `Abgebrochen: ${e.message}`; }
  busy = false; paint();
}

const tradeBtn = (e) => (onTrade ? `<button type="button" class="small-btn fd-take" data-take="${esc(e.coin)}">In Trade-Karte übernehmen</button>` : '');
const indexChanged = () => { try { window.dispatchEvent(new Event('wolfdesk-index')); } catch { /* egal */ } };
const status = () => { const s = $('finder-status'); if (s) s.textContent = note; };

function row(e) {
  const blocks = e.finds.map((f) => `<span class="chip strong">${esc(BLOCK_NAME[f.rule])} <small>${esc(agoText(f.t))}</small></span>`).join('');
  const open = openCoin === e.coin, inBlock = e.rooms.some((x) => x.state === 'im');
  const fib = fibText(e.fib), rs = rsiText(e.rsiDay, e.rsiH4);
  let h = `<button type="button" class="fd-row" data-coin="${esc(e.coin)}" aria-expanded="${open}">
    <span class="fd-coin"><b>${esc(dn(e.coin))}</b> <span class="muted">Beobachtung · ${e.n} ${e.n === 1 ? 'Baustein' : 'Bausteine'}</span></span>
    ${coinBiasText(e.up, e.vsBtc) ? `<span class="fd-room muted">${esc(coinBiasText(e.up, e.vsBtc))}</span>` : ''}
    ${blocks ? `<span class="chips">${blocks}</span>` : ''}
    <span class="fd-room ${inBlock ? 'short' : 'muted'}">${esc(roomsText(e.rooms))}</span>
    ${fib ? `<span class="fd-room ${e.fib.gp ? 'gold' : 'muted'}">${esc(fib)}</span>` : ''}
    ${rs ? `<span class="fd-room muted">${esc(rs)}</span>` : ''}
    ${e.overlap ? '<span class="fd-room muted">Order Block in der Fib-Zone</span>' : ''}</button>`;
  if (open && e.finds.length) h += `<div class="fd-detail">${e.finds.map((f) => `<div class="lt-bcard"><b>${esc(BLOCK_NAME[f.rule])}</b> <span class="muted">${esc([...Object.values(f.mk || {}), sinceText(f.since)].filter(Boolean).join(' · '))}</span>${blindHtml({ M: e.M, i: f.i, viz: vizWithRoom(f, e) })}</div>`).join('')}
    <p class="set-hint">Gold = Level oder Zone des Bausteins · Rot = nächste 4H-Sell-Blöcke über dem Kurs, ab der Kerze, aus der sie stammen (nur wenn sie nah liegen) · ▲ = Signalkerze · „jetzt“ = Kurs von eben. Das Bild endet an der Signalkerze.</p>${tradeBtn(e)}</div>`;
  else if (open) h += '<div class="fd-detail"><p class="set-hint">Kein Baustein hat hier ausgelöst. Der Coin steht nur wegen Fib-Lage oder RSI in der Liste.</p>' + tradeBtn(e) + '</div>';
  return h;
}

function paintList() {
  const el = $('finder-list');
  if (!el) return;
  if (!list) { el.innerHTML = ''; return; }
  const withFind = list.filter((e) => e.n > 0), base = atLeast(list, minB), cnt = countByBlock(base), stale = list.reduce((a, e) => a + e.stale, 0);
  const isFlag = !!FLAG_NAME[filter];
  // Filter nach Baustein gilt innerhalb der gewählten Mindestzahl; Filter nach Fib-Lage oder RSI zeigt alle geprüften Märkte
  const hits = query.trim() ? searchEntries(list, query, (e) => dn(e.coin)) : null;
  const shown = hits || (isFlag ? list.filter((e) => e.flags[filter]) : filter ? base.filter((e) => e.finds.some((f) => f.rule === filter)) : base);
  const miss = hits && !hits.length ? searchEntries(skipped.map((c) => ({ coin: c })), query, (e) => dn(e.coin)).map((e) => dn(e.coin)) : [];
  const b = (on, attrs, text) => `<button type="button" class="chip-btn${on ? ' ghost-chip' : ''}" ${attrs}>${text}</button>`;
  const mins = `<div class="chips fd-filter">${[[1, 'Alle'], [2, 'ab 2 Bausteinen'], [3, 'ab 3'], [0, 'Alle geprüften']].map(([k, t]) => b(minB === k && !isFlag && !hits, `data-min="${k}"`, `${t} ${k ? atLeast(withFind, k).length : list.length}`)).join('')}</div>`;
  const rules = `<div class="chips fd-filter">${NEW_RULES.map((r) => b(filter === r, `data-f="${r}"`, `${esc(BLOCK_NAME[r])} ${cnt[r]}`)).join('')}</div>`;
  const flags = `<div class="chips fd-filter">${Object.keys(FLAG_NAME).map((k) => b(filter === k, `data-f="${k}"`, `${esc(FLAG_NAME[k])} ${list.filter((e) => e.flags[k]).length}`)).join('')}</div>`;
  const crowd = crowdNotes(list, scanned).map((t) => `<p class="set-hint fd-crowd">${esc(t)}</p>`).join('');
  const empty = hits ? (miss.length ? `${miss.slice(0, 5).join(', ')}: nicht im Tagestrend aufwärts, deshalb nicht geprüft.` : 'Kein geprüfter Markt mit diesem Namen.') : !withFind.length ? 'Kein Baustein hat in den letzten 24 Stunden ausgelöst oder gilt noch.' : isFlag ? 'Kein Markt erfüllt das gerade.' : filter ? 'Kein Fund für diesen Baustein in dieser Ansicht.' : minB === 0 ? 'Kein Markt geprüft.' : `Kein Coin hat gerade ${minB} oder mehr Bausteine. Tippe auf „Alle“.`;
  el.innerHTML = mins + rules + flags + crowd + (stale ? `<p class="set-hint">${stale} überholte ${stale === 1 ? 'Fund' : 'Funde'} ausgeblendet (der Kurs hat das Level seither durchschlagen).</p>` : '')
    + (shown.length ? shown.map(row).join('') : `<p class="set-hint">${empty}</p>`);
}

// 8m: Kopfzeile Markt-Bias (drei Ebenen) über den Beobachtungen
function biasBox() {
  if (!bias) return '';
  const L = biasLines(bias), cap = capExBtcText(market.global);
  const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const meta = bias.from ? `Hyperliquid-Ledger-Perp-Index: ${bias.members} Märkte ohne BTC (Top 10 nach Umsatz und ${bias.smallMembers} weitere), Historie ab ${day(bias.from)}.` : 'Hyperliquid-Ledger-Perp-Index: noch zu wenig Märkte mit 110 Tagen Historie.';
  return `<div class="fd-bias"><b>${esc(L[0] || 'Markt')}</b>${L.slice(1).map((t) => `<span>${esc(t)}</span>`).join('')}${cap ? `<span class="muted">${esc(cap)}</span>` : ''}<span class="muted">${esc(meta)}${idxNote ? ' ' + esc(idxNote) : ''}</span></div>`;
}

function paint() {
  const el = $('finder');
  if (!el) return;
  el.innerHTML = `<div class="mk-actions"><button type="button" class="small-btn" id="finder-go"${busy ? ' disabled' : ''}>Märkte durchsuchen</button>
    ${busy ? '<button type="button" class="small-btn ghost" id="finder-stop">Anhalten</button>' : ''}</div>
    <p class="set-hint" id="finder-status" role="status">${esc(note)}</p>
    ${info && !busy ? `<p class="set-hint">${esc(info.source)}: ${info.coins} Märkte geprüft, ${info.up} im Tagestrend aufwärts, ${list.filter((e) => e.n > 0).length} mit gültigem Fund. Stand ${new Date(scannedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.</p>` : ''}
    ${biasBox()}
    ${list || busy ? `<input type="search" id="finder-q" class="fd-search" placeholder="Coin suchen (alle geprüften Märkte)" aria-label="Coin suchen" value="${esc(query)}" autocomplete="off" autocapitalize="characters">` : ''}
    <div id="finder-list"></div>`;
  paintList();
}

export function initFinder(stateGetter, openTrade = null) {
  onTrade = openTrade;
  const el = $('finder');
  if (!el) return;
  getState = stateGetter;
  const tip = $('finder-tip');
  if (tip) tip.innerHTML = tipInline('Sucht auf deinen handelbaren Märkten nach den fünf Bausteinen, die du in den Blindproben abgenommen hast: Key-Level mit Retest, Fib-Rücklauf, VWAP, Sweep und Order Block, jeweils nur im Tagestrend aufwärts. Gezeigt wird, was in den letzten 24 Stunden ausgelöst hat und noch gilt. Das ist ein Hinweisgeber für deine eigene Analyse und kein geprüftes Signal: In der Messung war kein Baustein besser als der Zufall. Sortiert wird nach der Zahl der Bausteine je Coin, nicht nach Güte. „Platz nach oben“ nennt je Zeitebene den Abstand bis zum nächsten Sell-Block über dem Kurs in R; ein R ist 2 × Tages-ATR. Fib-Lage (Tageschart, Kerzenkörper) und RSI mit Divergenz (Tag und 4H) sind zusätzliche Angaben; sie zählen nicht als Baustein und ändern die Reihenfolge nicht. Die Kopfzeile „Markt“ kommt aus einem eigenen Index deiner handelbaren Hyperliquid-Märkte: Alts = alle ohne BTC, jeder zählt gleich viel; „Breite“ vergleicht die zehn umsatzstärksten (Top 10) mit dem Rest; ein Markt zählt erst nach 110 Tagen mit. „Aufwärts“ heißt Tages-EMA 20 über EMA 100. Das ist Information und kein Filter.', 'finder-intro');
  el.addEventListener('input', (e) => { if (e.target.id === 'finder-q') { query = e.target.value; openCoin = ''; paintList(); } });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'finder-go') scan();
    else if (b.id === 'finder-stop') { stop = true; note = 'Halte an …'; status(); }
    else if (b.dataset.take) { const en = list?.find((x) => x.coin === b.dataset.take), r = en && tradeResult(en, getState().prices?.[en.coin]); if (r) onTrade(r); }
    else if (b.dataset.min) { minB = Number(b.dataset.min); if (FLAG_NAME[filter]) filter = ''; openCoin = ''; paintList(); }
    else if (b.dataset.f != null) { filter = filter === b.dataset.f ? '' : b.dataset.f; openCoin = ''; paintList(); }
    else if (b.dataset.coin) { openCoin = openCoin === b.dataset.coin ? '' : b.dataset.coin; paintList(); }
  });
  paint();
}
