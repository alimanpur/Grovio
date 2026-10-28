import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const { Schema } = mongoose

export const ROLES = ['Owner', 'Manager', 'Cashier']
export const BCRYPT_ROUNDS = 12

// Pragmatic email check; deliberately not RFC-exhaustive.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: {
      type: String,
      required: true,
      // Uniqueness is enforced by the case-insensitive index declared below,
      // giving clean duplicate-key handling regardless of letter casing.
      lowercase: true,
      trim: true,
      maxlength: 254,
      validate: {
        validator: (v) => EMAIL_RE.test(v),
        message: 'Enter a valid email address.',
      },
    },
    phone: { type: String, trim: true, maxlength: 32 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'Owner' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
    emailVerified: { type: Boolean, default: false },
    // Shown on the team page; refreshed on every successful sign-in.
    lastLoginAt: { type: Date, default: null },
    // Used to invalidate pre-existing sessions after a password change.
    passwordChangedAt: { type: Date, default: null },
    // Only a hash of the reset token is ever stored.
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpires: { type: Date, select: false, default: null },
  },
  { timestamps: true },
)

UserSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

// Never leak secrets: strip them from any JSON representation as a safeguard.
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash
    delete ret.passwordResetTokenHash
    delete ret.passwordResetExpires
    delete ret.__v
    return ret
  },
})

UserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS)
  this.passwordChangedAt = new Date()
}

UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false)
  return bcrypt.compare(plain, this.passwordHash)
}

UserSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    emailVerified: this.emailVerified,
    store: this.store ? String(this.store) : null,
    lastLoginAt: this.lastLoginAt,
  }
}

export default mongoose.model('User', UserSchema)
