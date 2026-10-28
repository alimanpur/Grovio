import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

const PurchaseLineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, trim: true, maxlength: 40 },
    qty: { type: Number, required: true, min: 1 },
    // Paise.
    cost: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    // Units already moved into stock from this line.
    receivedQty: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
)

export const PURCHASE_STATUSES = ['Ordered', 'In transit', 'Goods received', 'Cancelled']

/**
 * A supplier order. Stock only increases when the order is explicitly
 * received, and each line can be received at most up to its ordered quantity.
 */
const PurchaseSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    orderNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true, trim: true, maxlength: 160 },
    supplierInvoiceNo: { type: String, trim: true, maxlength: 60, default: '' },
    lines: { type: [PurchaseLineSchema], default: [] },
    // Paise.
    subtotal: { type: Number, min: 0, default: 0 },
    taxTotal: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: PURCHASE_STATUSES, default: 'Ordered' },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    expectedAt: { type: Date, default: null },
    orderedAt: { type: Date, default: Date.now, index: true },
    receivedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, maxlength: 200, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

PurchaseSchema.index({ store: 1, orderNo: 1 }, { unique: true })
PurchaseSchema.index({ store: 1, orderedAt: -1 })

PurchaseSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    orderNo: this.orderNo,
    supplierId: String(this.supplier),
    supplier: this.supplierName,
    supplierInvoiceNo: this.supplierInvoiceNo,
    lines: (this.lines || []).map((l) => ({
      ...(l.toObject ? l.toObject() : l),
      cost: toRupees(l.cost),
      taxAmount: toRupees(l.taxAmount),
      amount: toRupees(l.amount),
    })),
    subtotal: toRupees(this.subtotal),
    taxTotal: toRupees(this.taxTotal),
    total: toRupees(this.total),
    amountPaid: toRupees(this.amountPaid),
    status: this.status,
    note: this.note,
    expectedAt: this.expectedAt,
    orderedAt: this.orderedAt,
    receivedAt: this.receivedAt,
    cancelledAt: this.cancelledAt,
    cancelReason: this.cancelReason,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('Purchase', PurchaseSchema)
export { PurchaseLineSchema }
