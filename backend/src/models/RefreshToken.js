import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * A refresh session. We persist only a hash of the opaque refresh token plus
 * expiry and revocation state, enabling rotation and reuse detection.
 * A TTL index automatically removes expired documents.
 */
const RefreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    // The token that replaced this one during rotation (audit trail).
    replacedBy: { type: String, default: null },
    userAgent: { type: String, default: '', maxlength: 300 },
    ip: { type: String, default: '', maxlength: 64 },
  },
  { timestamps: true },
)

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('RefreshToken', RefreshTokenSchema)
