/**
 * Money helpers. Every persisted amount is an integer number of paise, so
 * totals never depend on IEEE-754 rounding. Conversion happens only at the API
 * boundary: clients send rupees, the server stores and returns paise.
 */

/** Rupees (client) → paise (server). Accepts numbers or numeric strings. */
export const toPaise = (rupees) => {
  const n = typeof rupees === 'number' ? rupees : Number.parseFloat(String(rupees ?? ''))
  if (!Number.isFinite(n)) return Number.NaN
  return Math.round(n * 100)
}

/** Paise (server) → rupees (client), rounded to 2 decimals. */
export const toRupees = (paise) => Math.round((paise || 0)) / 100
/** Half-up rounding to the nearest paise. */
export const paiseRound = (value) => Math.round(value)

/**
 * Line amount: rate × qty less the percentage discount. Computed on the server
 * from the *catalogue* rate, never from a client-supplied line total.
 */
export const lineAmount = (ratePaise, qty, discountPercent = 0) => {
  const gross = ratePaise * qty
  const discount = Math.round((gross * discountPercent) / 100)
  return { gross, discount, amount: gross - discount }
}

/** Tax on a discounted amount. */
export const taxOn = (amountPaise, gstRate) => Math.round((amountPaise * gstRate) / 100)

/** Indian GST-style rounding: totals to the nearest rupee when enabled. */
export const applyRoundOff = (totalPaise, enabled) => {
  if (!enabled) return { roundOff: 0, total: totalPaise }
  const rupees = Math.round(totalPaise / 100)
  return { roundOff: rupees * 100 - totalPaise, total: rupees * 100 }
}

export const sumPaise = (list, pick) => list.reduce((total, item) => total + (pick ? pick(item) : item), 0)

export default { toPaise, toRupees, paiseRound, lineAmount, taxOn, applyRoundOff, sumPaise }
