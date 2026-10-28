import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

/** A business the store buys from. Purchases reference it. */
const SupplierSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    contactName: { type: String, trim: true, maxlength: 120, default: '' },
    phone: { type: String, trim: true, maxlength: 32, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    address: { type: String, trim: true, maxlength: 400, default: '' },
    city: { type: String, trim: true, maxlength: 120, default: '' },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    // Opening balance owed to this supplier, in paise, before any Grovio records.
    openingDue: { type: Number, min: 0, default: 0 },
    paymentTerms: { type: String, trim: true, maxlength: 60, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
)

SupplierSchema.index({ store: 1, name: 1 }, { unique: true })

SupplierSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    contactName: this.contactName,
    phone: this.phone,
    email: this.email,
    address: this.address,
    city: this.city,
    gstin: this.gstin,
    openingDue: toRupees(this.openingDue),
    paymentTerms: this.paymentTerms,
    notes: this.notes,
    archived: this.archived,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('Supplier', SupplierSchema)
