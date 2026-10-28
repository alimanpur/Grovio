import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

const ReturnLineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    qty: { type: Number, required: true, min: 1 },
    // Paise, taken from the original bill line.
    rate: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

export const RETURN_REASONS = [
  'Damaged in transit',
  'Expired / spoiled',
  'Wrong item billed',
  'Customer changed mind',
  'Quality complaint',
  'Other',
]

export const RETURN_RESOLUTIONS = ['Refund', 'Exchange', 'Credit note']

/**
 * A return against a specific bill line. The original bill is never mutated
 * except for its `returnedQty` bookkeeping, which preserves the audit trail.
 */
const ReturnSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    returnNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    bill: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
    billInvoiceNo: { type: String, required: true, trim: true, maxlength: 40 },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, trim: true, maxlength: 160, default: 'Walk-in' },
    lines: { type: [ReturnLineSchema], default: [] },
    // Paise.
    refundTotal: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: RETURN_REASONS, default: 'Other' },
    resolution: { type: String, enum: RETURN_RESOLUTIONS, default: 'Refund' },
    restocked: { type: Boolean, default: true },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    returnedAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cashierName: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { timestamps: true },
)

ReturnSchema.index({ store: 1, returnNo: 1 }, { unique: true })
ReturnSchema.index({ store: 1, bill: 1 })
ReturnSchema.index({ store: 1, returnedAt: -1 })

ReturnSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    returnNo: this.returnNo,
    billId: String(this.bill),
    bill: this.billInvoiceNo,
    customerId: this.customer ? String(this.customer) : null,
    customer: this.customerName,
    lines: (this.lines || []).map((l) => ({
      ...(l.toObject ? l.toObject() : l),
      rate: toRupees(l.rate),
      taxAmount: toRupees(l.taxAmount),
      amount: toRupees(l.amount),
    })),
    refundTotal: toRupees(this.refundTotal),
    reason: this.reason,
    resolution: this.resolution,
    restocked: this.restocked,
    note: this.note,
    returnedAt: this.returnedAt,
    cashierName: this.cashierName,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('Return', ReturnSchema)
export { ReturnLineSchema }
