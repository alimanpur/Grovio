import mongoose from 'mongoose'

const { Schema } = mongoose

const ADJUSTMENT_REASONS = [
  'Stock count correction',
  'Damage / breakage',
  'Theft / shrinkage',
  'Expired write-off',
  'Found stock',
  'Return to supplier',
  'Opening balance',
  'Other',
]

/**
 * Immutable record of a manual stock change. Bills, purchases and returns
 * create their own adjustments so every unit movement has a traceable actor,
 * reason and timestamp.
 */
const InventoryAdjustmentSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true, maxlength: 160 },
    // Signed: negative for a reduction.
    delta: { type: Number, required: true },
    stockBefore: { type: Number, required: true, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: ADJUSTMENT_REASONS, default: 'Other' },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    source: {
      type: String,
      enum: ['manual', 'bill', 'bill-cancel', 'purchase', 'return', 'import'],
      default: 'manual',
    },
    sourceId: { type: String, trim: true, maxlength: 60, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true, maxlength: 120, default: '' },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
)

InventoryAdjustmentSchema.index({ store: 1, createdAt: -1 })
InventoryAdjustmentSchema.index({ store: 1, product: 1, createdAt: -1 })

InventoryAdjustmentSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    productId: String(this.product),
    product: this.productName,
    delta: this.delta,
    stockBefore: this.stockBefore,
    stockAfter: this.stockAfter,
    reason: this.reason,
    note: this.note,
    source: this.source,
    sourceId: this.sourceId,
    actor: this.actorName,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('InventoryAdjustment', InventoryAdjustmentSchema)
export { ADJUSTMENT_REASONS as adjustmentReasons }
