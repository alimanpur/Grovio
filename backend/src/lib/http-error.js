/**
 * Minimal API surface helpers: a typed error, an async handler wrapper that
 * forwards errors to Express, and consistent JSON response builders.
 */

export class ApiError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export const badRequest = (message, errors) =>
  new ApiError(400, message, { errors })
export const unauthorized = (message = 'Unauthorized.') =>
  new ApiError(401, message)
export const forbidden = (message = 'Forbidden.') => new ApiError(403, message)
export const conflict = (message) => new ApiError(409, message)
export const tooMany = (message = 'Too many requests. Please try again later.') =>
  new ApiError(429, message)
export const notFound = (message = 'Not found.') => new ApiError(404, message)

export const ok = (res, { message, data, status = 200 } = {}) =>
  res.status(status).json({ success: true, ...(message ? { message } : {}), ...(data ? { data } : {}) })

export const fail = (res, err) => {
  const status = err?.status || 500
  const body = {
    success: false,
    message: status === 500 ? 'Something went wrong. Please try again.' : err?.message || 'Request failed.',
  }
  if (err?.code) body.code = err.code
  if (err?.errors) body.errors = err.errors
  return res.status(status).json(body)
}

// Wraps async route handlers so rejected promises reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
