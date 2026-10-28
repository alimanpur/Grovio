import mongoose from 'mongoose'

const { Schema } = mongoose

const TaxSlabSchema = new Schema(
  {
    rate: { type: Number, required: true, min: 0, max: 100 },
    label: { type: String, trim: true, maxlength: 60, default: '' },
    // Whether new products may be created against this slab.
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
)

const InvoiceSettingsSchema = new Schema(
  {
    prefix: { type: String, trim: true, uppercase: true, maxlength: 5, default: 'GRV' },
    terms: { type: String, trim: true, maxlength: 1000, default: '' },
    showQr: { type: Boolean, default: true },
    showBarcode: { type: Boolean, default: false },
    upiId: { type: String, trim: true, maxlength: 60, default: '' },
    footerNote: { type: String, trim: true, maxlength: 400, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false },
)

const PreferencesSchema = new Schema(
  {
    lowStockAlerts: { type: Boolean, default: true },
    expiryAlerts: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: true },
    soundOnScan: { type: Boolean, default: false },
    roundTotals: { type: Boolean, default: true },
  },
  { _id: false },
)

/**
 * A store belongs to exactly one Owner. Public registration creates an
 * incomplete store profile that the onboarding flow completes afterwards,
 * which keeps ownership unambiguous from the first save.
 */
const StoreSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    ownerName: { type: String, trim: true, maxlength: 120 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, trim: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    address: { type: String, trim: true, maxlength: 400 },
    gstNumber: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    fssai: { type: String, trim: true, maxlength: 20, default: '' },
    hours: { type: String, trim: true, maxlength: 120, default: '' },
    currency: { type: String, trim: true, default: 'INR', maxlength: 3 },
    timezone: { type: String, trim: true, default: 'IST', maxlength: 48 },
    businessType: { type: String, trim: true, maxlength: 60 },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    onboardingCompleted: { type: Boolean, default: false },
    // Monotonic per-store counters used to build unique invoice/PO/return
    // numbers. Reserved inside a transaction to prevent duplicates.
    sequences: {
      bill: { type: Number, default: 1000, min: 0 },
      purchase: { type: Number, default: 1000, min: 0 },
      return: { type: Number, default: 1000, min: 0 },
    },
    invoiceSettings: { type: InvoiceSettingsSchema, default: () => ({}) },
    taxes: { type: [TaxSlabSchema], default: () => [{ rate: 0 }, { rate: 5 }, { rate: 12 }, { rate: 18 }, { rate: 28 }] },
    preferences: { type: PreferencesSchema, default: () => ({}) },
    // Future Lab interest picks (preference only, never affects live behaviour).
    futureLabVotes: { type: [String], default: () => [] },
  },
  { timestamps: true },
)

StoreSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    ownerName: this.ownerName,
    phone: this.phone,
    email: this.email,
    address: this.address,
    gstNumber: this.gstNumber,
    fssai: this.fssai,
    hours: this.hours,
    currency: this.currency,
    timezone: this.timezone,
    businessType: this.businessType,
    logoUrl: this.logoUrl,
    onboardingCompleted: this.onboardingCompleted,
    invoiceSettings: this.invoiceSettings?.toJSON?.() ?? this.invoiceSettings,
    taxes: (this.taxes || []).map((t) => (t.toJSON ? t.toJSON() : t)),
    preferences: this.preferences?.toJSON?.() ?? this.preferences,
    futureLabVotes: this.futureLabVotes || [],
  }
}

export default mongoose.model('Store', StoreSchema)
