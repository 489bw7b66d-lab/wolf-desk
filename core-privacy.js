// Datenschutz für die öffentliche Datei my-settings.js (8a): Beträge gehören nicht ins öffentliche Repository.
// Das Startkapital braucht nur die App auf dem iPhone (dort bleibt es gespeichert), der Wächter rechnet nicht damit.
export const PRIVATE_KEYS = ['startCapital'];

// Abweichungen ohne private Werte: das, was in my-settings.js stehen darf
export function publicDiff(diff = {}) {
  return Object.fromEntries(Object.entries(diff || {}).filter(([k]) => !PRIVATE_KEYS.includes(k)));
}

// Steht in der veröffentlichten Datei noch ein Betrag? Dann sollte eine neue Datei hoch.
export const amountLeak = (mySettings) => !!mySettings && PRIVATE_KEYS.some((k) => k in mySettings);
