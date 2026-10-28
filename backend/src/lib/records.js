import { ApiError, conflict } from './http-error.js'

/** True when Mongoose reports a unique-index violation. */
export const isDuplicateKey = (err) => err?.code === 11000

/** Duplicate field → conflict, with a human message. */
export const rethrowDuplicate = (err, message = 'That record already exists.') => {
  if (isDuplicateKey(err)) throw conflict(message)
  throw err
}

/** ObjectId shape check that never throws on garbage input. */
export const isObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)

export const notFound = (message = 'Not found.') => new ApiError(404, message)

export default { isDuplicateKey, rethrowDuplicate, isObjectId, notFound }
