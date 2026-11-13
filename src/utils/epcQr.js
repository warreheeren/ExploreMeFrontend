// EPC-QR ("SEPA-overschrijving scannen") volgens EPC069-12 versie 002. Bank-apps lezen hieruit
// begunstigde, IBAN, bedrag en omschrijving. Foutcorrectie moet M zijn; de payload is max. 331 bytes.

export const EPC_ERROR_CORRECTION = 'M'
export const EPC_MAX_NAME = 70
export const EPC_MAX_REMITTANCE = 140
export const EPC_MIN_AMOUNT = 0.01
export const EPC_MAX_AMOUNT = 999999999.99

/** Omschrijving voor de overschrijving: "ExploreMe – {reistitel}", afgekapt op de EPC-limiet. */
export function epcRemittance(tripTitle) {
  return `ExploreMe – ${tripTitle || ''}`.trim().slice(0, EPC_MAX_REMITTANCE)
}

/** Kan dit bedrag in een EPC-QR? (0,01 – 999.999.999,99 EUR) */
export function isEpcAmount(amount) {
  const n = Number(amount)
  return Number.isFinite(n) && n >= EPC_MIN_AMOUNT && n <= EPC_MAX_AMOUNT
}

/**
 * Bouwt de tekst voor de QR. Regels: service tag, versie, encoding (1 = UTF-8), SCT, BIC (leeg mag in v002),
 * naam, IBAN, bedrag, purpose (leeg), gestructureerde referentie (leeg), omschrijving.
 */
export function buildEpcPayload({ name, iban, amount, remittance }) {
  const amt = Number(amount).toFixed(2)
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    '',
    String(name || '').trim().slice(0, EPC_MAX_NAME),
    String(iban || '').replace(/\s+/g, '').toUpperCase(),
    `EUR${amt}`,
    '',
    '',
    String(remittance || '').slice(0, EPC_MAX_REMITTANCE),
  ].join('\n')
}
