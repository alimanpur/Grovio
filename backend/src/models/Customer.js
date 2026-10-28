import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

const CUSTOMER_TAGS = ['New', 'Frequent', 'Bulk', 'Credit', 'Dormant']

/**
 * A customer the store sells to on credit or tracks for loyalty. Names are
 * unique per store so "Walk-in" style duplicates cannot be created silently.
 */
const CustomerSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 32, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    address: { type: String, trim: true, maxlength: 400, default: '' },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    // Opening balance the customer owed before Grovio, in paise.
    openingDue: { type: Number, min: 0, default: 0 },
    creditLimit: { type: Number, min: 0, default: 0 },
    tag: { type: String, enum: CUSTOMER_TAGS, default: 'New' },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
)

CustomerSchema.index({ store: 1, name: 1 }, { unique: true })
CustomerSchema.index({ store: 1, phone: 1 })

CustomerSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    phone: this.phone,
    email: this.email,
    address: this.address,
    gstin: this.gstin,
    openingDue: toRupees(this.openingDue),
    creditLimit: toRupees(this.creditLimit),
    tag: this.tag,
    note: this.note,
    archived: this.archived,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export default mongoose.model('Customer', CustomerSchema)
