/**
 * Display helpers shared by every page. Money is always rupees coming across
 * the API (the server converts its internal paise), so no page needs to know
 * about the storage scale.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const inr = (value) => inrFormatter.format(Number(value) || 0)

/** ₹1,25,000 — for chart axes and chips that have no room for the symbol. */
export const inrCompact = (value) => {
  const n = Number(value) || 0
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return inrFormatter.format(n)
}

export const num = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

export const fmtDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', options)
}

export const fmtTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export const fmtDateTime = (value) => `${fmtDate(value)} · ${fmtTime(value)}`

/** "3 days ago" — used by the activity feed. */
export const relTime = (value) => {
  if (!value) return '—'
  const d = new Date(value).getTime()
  if (Number.isNaN(d)) return '—'
  const seconds = Math.round((d - Date.now()) / 1000)
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [name, size] of units) {
    if (Math.abs(seconds) >= size) {
      const n = Math.round(seconds / size)
      return new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' }).format(n, name)
    }
  }
  return 'just now'
}

/** Indian financial-year month label, e.g. "Apr 2026". */
export const fmtMonth = (date) =>
  new Date(date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export default { inr, inrCompact, num, fmtDate, fmtTime, fmtDateTime, relTime, fmtMonth }
