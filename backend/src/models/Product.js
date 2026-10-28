import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'

const { Schema } = mongoose

export const UNITS = [
  'piece',
  'pack',
  'pouch',
  'bottle',
  'bag',
  'carton',
  'box',
  'kg',
  'gram',
  'litre',
  'ml',
  'dozen',
]

export const GST_RATES = [0, 5, 12, 18, 28]

/**
 * A sellable item in a store's catalogue.
 *
 * Money is stored in paise (integer) so subtotal, discount and tax maths never
 * depends on binary floating point. `sellingPrice` and `purchasePrice` are
 * always server-authoritative: a bill line never trusts a client price.
 */
const ProductSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    brand: { type: String, trim: true, maxlength: 80, default: '' },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    barcode: { type: String, trim: true, maxlength: 40, default: '' },
    hsn: { type: String, trim: true, maxlength: 8, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    categoryName: { type: String, trim: true, maxlength: 80, default: '' },
    unit: { type: String, enum: UNITS, default: 'piece' },
    // Paise.
    sellingPrice: { type: Number, required: true, min: 1, max: 1000000000 },
    purchasePrice: { type: Number, min: 0, max: 1000000000, default: 0 },
    gstRate: { type: Number, enum: GST_RATES, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    minStock: { type: Number, min: 0, default: 0 },
    maxStock: { type: Number, min: 0, default: 0 },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    supplierName: { type: String, trim: true, maxlength: 120, default: '' },
    batch: { type: String, trim: true, maxlength: 40, default: '' },
    expiry: { type: Date, default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
)

ProductSchema.index({ store: 1, sku: 1 }, { unique: true })
ProductSchema.index({ store: 1, name: 1 })
ProductSchema.index({ store: 1, archived: 1, stock: 1 })

ProductSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    brand: this.brand,
    sku: this.sku,
    barcode: this.barcode,
    hsn: this.hsn,
    categoryId: this.category ? String(this.category) : null,
    category: this.categoryName,
    unit: this.unit,
    sellingPrice: toRupees(this.sellingPrice),
    purchasePrice: toRupees(this.purchasePrice),
    gstRate: this.gstRate,
    stock: this.stock,
    minStock: this.minStock,
    maxStock: this.maxStock,
    supplierId: this.supplier ? String(this.supplier) : null,
    supplier: this.supplierName,
    batch: this.batch,
    expiry: this.expiry,
    archived: this.archived,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export default mongoose.model('Product', ProductSchema)
export { UNITS as unitOptions, GST_RATES as gstOptions, GST_RATES as gstRateOptions }
