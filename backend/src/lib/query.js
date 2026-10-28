import { badRequest } from './http-error.js'

/**
 * Pagination + sorting for list endpoints.
 *
 * `sort` is validated against a caller-supplied allowlist — never against the
 * raw query string — so a request cannot sort on an unindexed field or leak
 * data through an unexpected ordering.
 */
export const parsePagination = (query, { defaultLimit = 25, maxLimit = 100 } = {}) => {
  const pageRaw = Number.parseInt(String(query.page ?? '1'), 10)
  const limitRaw = Number.parseInt(String(query.limit ?? String(defaultLimit)), 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

export const parseSort = (query, allowlist, fallback) => {
  const requested = String(query.sort || '')
  const desc = requested.startsWith('-')
  const field = desc ? requested.slice(1) : requested
  const safeField = allowlist.includes(field) ? field : allowlist[0] ?? fallback
  if (!safeField) return fallback ?? {}
  return { [safeField]: desc ? -1 : 1 }
}

/** Free-text search terms → a Mongo `$and` of `$regex` OR-clauses. */
export const buildSearch = (fields, search) => {
  const q = String(search || '').trim()
  if (!q) return null
  const terms = q.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!terms.length) return null
  return {
    $and: terms.map((term) => ({
      $or: fields.map((field) => ({ [field]: { $options: 'i', $regex: term } })),
    })),
  }
}

/** Inclusive/exclusive date window from `from`/`to` (ISO yyyy-mm-dd or full). */
export const parseDateRange = (query, { maxDays = 366 } = {}) => {
  const rawFrom = String(query.from || '').trim()
  const rawTo = String(query.to || '').trim()
  const parse = (value, endOfDay) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) throw badRequest('Use a valid date, e.g. 2026-04-01.')
    if (!/T\d\d:/.test(value)) {
      if (endOfDay) date.setUTCHours(23, 59, 59, 999)
      else date.setUTCHours(0, 0, 0, 0)
    }
    return date
  }
  const from = parse(rawFrom, false)
  const to = parse(rawTo, true)
  if (from && to && from > to) throw badRequest('The "from" date must be on or before the "to" date.')
  if (from && to) {
    const spanDays = (to.getTime() - from.getTime()) / 86400000
    if (spanDays > maxDays) throw badRequest(`Please request at most ${maxDays} days at a time.`)
  }
  const range = {}
  if (from) range.$gte = from
  if (to) range.$lte = to
  return { range, from, to }
}

export const pageMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
})

export default { parsePagination, parseSort, buildSearch, parseDateRange, pageMeta }
