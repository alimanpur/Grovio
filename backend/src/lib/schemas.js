import { z } from 'zod'
import { toPaise } from './money.js'

/**
 * Shared request schemas.
 *
 * Money always crosses the API boundary as rupees. `rupees()` validates the
 * number and converts it to the integer paise used internally, so no
 * controller has to remember a scale factor.
 */
export const rupees = (message = 'Enter a valid amount.') =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return Number.NaN
      return typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''))
    }, z.number({ invalid_type_error: message }))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 10000000, { message })
    .transform((n) => toPaise(n))

export const rupeesPositive = (message = 'Enter an amount above zero.') =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return Number.NaN
      return typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''))
    }, z.number({ invalid_type_error: message }))
    .refine((n) => Number.isFinite(n) && n > 0 && n <= 10000000, { message })
    .transform((n) => toPaise(n))

export const objectId = (message = 'Choose a valid option.') =>
  z.string({ invalid_type_error: message, required_error: message }).regex(/^[a-f\d]{24}$/i, message)

export const optionalObjectId = objectId().nullish().transform((v) => (v ? v : null))

export default { rupees, rupeesPositive, objectId, optionalObjectId }
