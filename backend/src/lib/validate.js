import { z } from 'zod'
import { badRequest } from './http-error.js'

/**
 * Express middleware factory: validate `req.body` (or query/params) with a zod
 * schema and replace it with the parsed + coerced value, or fail with a 400 and
 * a field→message map the frontend can render.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.safeParse(req[source])
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten()
    const errors = { ...fieldErrors }
    if (formErrors?.length) errors._ = formErrors
    return next(badRequest('Please correct the highlighted fields.', errors))
  }
  req[source] = parsed.data
  next()
}

export { z }
