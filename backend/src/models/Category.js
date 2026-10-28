import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * A product category belongs to one store. Names are unique per store so a
 * shop can use its own shelf language ("Staples", "Dairy", …) without
 * colliding with another store's categories on the same cluster.
 */
const CategorySchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
)

CategorySchema.index({ store: 1, name: 1 }, { unique: true })

CategorySchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    description: this.description,
    archived: this.archived,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('Category', CategorySchema)
