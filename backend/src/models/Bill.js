import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

const BillLineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot of the product at billing time: later price edits must never
    // rewrite what a customer was actually charged.
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, trim: true, maxlength: 40 },
    hsn: { type: String, trim: true, maxlength: 8, default: '' },
    unit: { type: String, default: 'piece' },
    qty: { type: Number, required: true, min: 1 },
    // Server-computed, in paise.
    rate: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    gstRate: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    // How many units of this line have been returned so far.
    returnedQty: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
)

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Credit', 'Split']
export const BILL_STATUSES = ['Paid', 'Partial', 'Due', 'Refunded', 'Cancelled']

/**
 * A finalised counter sale. Every amount on it is computed server-side and
 * frozen, so history never changes when a price or tax rate is edited later.
 */
const BillSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    invoiceNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, trim: true, maxlength: 160, default: 'Walk-in' },
    lines: { type: [BillLineSchema], default: [] },
    // Paise.
    subtotal: { type: Number, min: 0, default: 0 },
    discountTotal: { type: Number, min: 0, default: 0 },
    taxTotal: { type: Number, min: 0, default: 0 },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, min: 0, default: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    status: { type: String, enum: BILL_STATUSES, default: 'Paid' },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cashierName: { type: String, trim: true, maxlength: 120, default: '' },
    billedAt: { type: Date, default: Date.now, index: true },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true },
)

BillSchema.index({ store: 1, invoiceNo: 1 }, { unique: true })
BillSchema.index({ store: 1, billedAt: -1 })
BillSchema.index({ store: 1, status: 1 })

BillSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    invoiceNo: this.invoiceNo,
    customerId: this.customer ? String(this.customer) : null,
    customer: this.customerName,
    lines: (this.lines || []).map((l) => ({
      ...(l.toObject ? l.toObject() : l),
      rate: toRupees(l.rate),
      discountAmount: toRupees(l.discountAmount),
      taxAmount: toRupees(l.taxAmount),
      amount: toRupees(l.amount),
    })),
    subtotal: toRupees(this.subtotal),
    discountTotal: toRupees(this.discountTotal),
    taxTotal: toRupees(this.taxTotal),
    roundOff: toRupees(this.roundOff),
    total: toRupees(this.total),
    amountPaid: toRupees(this.amountPaid),
    method: this.method,
    status: this.status,
    note: this.note,
    billedAt: this.billedAt,
    createdAt: this.createdAt,
    cashierName: this.cashierName,
    cancelledAt: this.cancelledAt,
    cancelReason: this.cancelReason,
  }
}

export default mongoose.model('Bill', BillSchema)
export { BillLineSchema }
