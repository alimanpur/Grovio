import { forbidden } from '../lib/http-error.js'

/**
 * Resolves the acting user's store and rejects the request when there is none.
 * This is the ownership boundary: every controller below it queries with
 * `req.storeId`, so a user can never reach another store's records even by
 * guessing an id.
 */
export const requireStore = (req, _res, next) => {
  const storeId = req.user?.store
  if (!storeId) return next(forbidden('No store is linked to this account.'))
  req.storeId = String(storeId)
  next()
}

/**
 * Confirms a referenced document belongs to the caller's store. Returns null
 * when it does not, so callers can answer with a 404 instead of leaking the
 * existence of another store's record.
 */
export const inStore = (doc, storeId) => Boolean(doc) && String(doc.store) === String(storeId)

export default requireStore
