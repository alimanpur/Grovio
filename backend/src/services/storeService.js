import Store from '../models/Store.js'
import { badRequest } from '../lib/http-error.js'
import { GST_RATES } from '../models/Product.js'

const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PREFIX_RE = /^[A-Z]{2,5}$/
const PROFILE_FIELDS = ['name', 'ownerName', 'phone', 'email', 'address', 'gstNumber', 'fssai', 'hours', 'businessType', 'logoUrl', 'currency', 'timezone']
const INVOICE_FIELDS = ['prefix', 'terms', 'footerNote', 'showQr', 'showBarcode', 'upiId', 'logoUrl']
const PREFERENCE_FIELDS = ['lowStockAlerts', 'expiryAlerts', 'dailySummary', 'soundOnScan', 'roundTotals']

const load = async (storeId) => {
  const store = await Store.findById(storeId)
  if (!store) throw badRequest('No store is linked to this account.')
  return store
}

export const storeService = {
  async profile(storeId) {
    return load(storeId)
  },

  async updateProfile(storeId, payload) {
    const store = await load(storeId)
    const name = String(payload.name ?? store.name).trim()
    if (name.length < 2) throw badRequest('The store needs a name.')
    const gstin = String(payload.gstNumber ?? store.gstNumber ?? '').trim().toUpperCase()
    if (gstin && !GSTIN_RE.test(gstin)) throw badRequest('GSTIN should be 15 characters, like 07AABCS1429P1ZV.')
    for (const key of PROFILE_FIELDS) if (payload[key] !== undefined) store[key] = String(payload[key]).trim()
    store.gstNumber = gstin
    if (payload.currency !== undefined && String(payload.currency).length !== 3)
      throw badRequest('Currency must be a 3-letter code, e.g. INR.')
    await store.save()
    return store
  },

  async invoiceSettings(storeId) {
    const store = await load(storeId)
    return store.invoiceSettings
  },

  async updateInvoiceSettings(storeId, payload) {
    const store = await load(storeId)
    const prefix = String(payload.prefix ?? store.invoiceSettings.prefix ?? 'GRV').trim().toUpperCase()
    if (!PREFIX_RE.test(prefix)) throw badRequest('Bill prefix must be 2–5 letters.')
    for (const key of INVOICE_FIELDS) {
      if (payload[key] === undefined) continue
      store.invoiceSettings[key] = typeof payload[key] === 'boolean' ? payload[key] : String(payload[key]).trim()
    }
    store.invoiceSettings.prefix = prefix
    if (String(store.invoiceSettings.upiId || '').length > 60) throw badRequest('UPI id is too long.')
    store.markModified('invoiceSettings')
    await store.save()
    return store.invoiceSettings
  },

  async taxes(storeId) {
    const store = await load(storeId)
    return store.taxes
  },

  /**
   * Tax configuration is forward-only: slabs gate what new products may use,
   * but historical bills keep the snapshotted rate they were billed at.
   */
  async updateTaxes(storeId, payload) {
    const store = await load(storeId)
    if (!Array.isArray(payload.taxes) || !payload.taxes.length) throw badRequest('Provide at least one GST slab.')
    const seen = new Set()
    const slabs = payload.taxes.map((t) => {
      const rate = Number(t.rate)
      if (!GST_RATES.includes(rate)) throw badRequest('GST rate must be one of 0, 5, 12, 18 or 28%.')
      if (seen.has(rate)) throw badRequest('Each GST rate can only appear once.')
      seen.add(rate)
      return { rate, label: String(t.label ?? '').slice(0, 60), enabled: t.enabled !== false }
    })
    store.taxes = slabs
    store.markModified('taxes')
    await store.save()
    return store.taxes
  },

  async preferences(storeId) {
    const store = await load(storeId)
    return store.preferences
  },

  async updatePreferences(storeId, payload) {
    const store = await load(storeId)
    for (const key of PREFERENCE_FIELDS) {
      if (payload[key] !== undefined) store.preferences[key] = Boolean(payload[key])
    }
    store.markModified('preferences')
    await store.save()
    return store.preferences
  },
}

export const gstRateOptions = GST_RATES
export default storeService
