import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

export const PAYMENT_DIRECTIONS = ['in', 'out']

/**
 * A single money movement. Incoming payments settle a bill (or a customer's
 * dues); outgoing payments settle a supplier purchase. There is deliberately
 * no "gateway" status here — an unconfirmed gateway transaction is never
 * recorded as a completed payment.
 */
const PaymentSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    direction: { type: String, enum: PAYMENT_DIRECTIONS, default: 'in' },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Bank transfer', 'Credit adjustment'], default: 'Cash' },
    // Exactly one of bill / purchase / customer / supplier is set.
    bill: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
    billInvoiceNo: { type: String, trim: true, maxlength: 40, default: '' },
    purchase: { type: Schema.Types.ObjectId, ref: 'Purchase', default: null },
    purchaseOrderNo: { type: String, trim: true, maxlength: 40, default: '' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, trim: true, maxlength: 160, default: '' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    supplierName: { type: String, trim: true, maxlength: 160, default: '' },
    reference: { type: String, trim: true, maxlength: 120, default: '' },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    paidAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

PaymentSchema.index({ store: 1, paidAt: -1 })
PaymentSchema.index({ store: 1, customer: 1 })
PaymentSchema.index({ store: 1, supplier: 1 })

PaymentSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    direction: this.direction,
    amount: toRupees(this.amount),
    method: this.method,
    billId: this.bill ? String(this.bill) : null,
    bill: this.billInvoiceNo,
    purchaseId: this.purchase ? String(this.purchase) : null,
    purchase: this.purchaseOrderNo,
    customerId: this.customer ? String(this.customer) : null,
    customer: this.customerName,
    supplierId: this.supplier ? String(this.supplier) : null,
    supplier: this.supplierName,
    reference: this.reference,
    note: this.note,
    paidAt: this.paidAt,
  }
}

export default mongoose.model('Payment', PaymentSchema)
