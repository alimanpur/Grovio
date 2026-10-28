import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'
import Bill from '../models/Bill.js'
import Product from '../models/Product.js'
import Purchase from '../models/Purchase.js'
import Payment from '../models/Payment.js'
import Return from '../models/Return.js'
import Category from '../models/Category.js'
import Supplier from '../models/Supplier.js'
import Customer from '../models/Customer.js'
import InventoryAdjustment from '../models/InventoryAdjustment.js'
import Store from '../models/Store.js'

const oid = (value) => new mongoose.Types.ObjectId(String(value))

const IST_OFFSET_MIN = 330
/**
 * Business-day boundaries in the store's timezone (IST by default). Sales,
 * reports and GST must all cut the day at the same point the shopkeeper
 * closes the till, otherwise "today" misses the last few hours of trade.
 */
const dayStart = (date = new Date()) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60000)
  const start = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
  start.setMinutes(start.getMinutes() - IST_OFFSET_MIN)
  return start
}

const dayWindow = (date = new Date()) => {
  const start = dayStart(date)
  return { start, end: new Date(start.getTime() + 86400000 - 1) }
}

/** ISO day key in the store's timezone, used to bucket sales trends. */
const dayKey = (date) => {
  const shifted = new Date(new Date(date).getTime() + IST_OFFSET_MIN * 60000)
  return shifted.toISOString().slice(0, 10)
}

/** Paise → rupees for the API boundary. */
const inr = (paise) => toRupees(Math.round(paise || 0))

export const analyticsService = {
  /** Everything the Today overview needs, derived from real records. */
  async today(storeId) {
    const { start, end } = dayWindow()
    const billsToday = Bill.find({ store: storeId, billedAt: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' } })
      .sort({ billedAt: -1 })
      .lean()
    const products = Product.find({ store: oid(storeId), archived: false })
      .select('name stock minStock expiry unit supplierName purchasePrice sellingPrice')
      .lean()

    const [bills, catalogue] = await Promise.all([billsToday, products])
    const openBills = bills.filter((b) => b.status === 'Due' || b.status === 'Partial')
    const billsWithLines = bills.filter((b) => b.lines?.length)

    // COGS from the frozen line snapshots is unavailable by design (prices are
    // snapshotted), so profit uses the catalogue cost price at bill time via the
    // product reference — same value the sale decremented stock against.
    const productIds = [...new Set(bills.flatMap((b) => b.lines.map((l) => String(l.product))))]
    const costById = new Map(
      (await Product.find({ _id: { $in: productIds }, store: storeId }).select('purchasePrice').lean()).map((p) => [
        String(p._id),
        p.purchasePrice,
      ]),
    )

    let gross = 0
    let collected = 0
    let cogs = 0
    for (const b of bills) {
      gross += b.total
      collected += b.amountPaid
      for (const l of b.lines) {
        if (b.status !== 'Cancelled') cogs += (costById.get(String(l.product)) || 0) * (l.qty - l.returnedQty)
      }
    }
    const netSales = gross - bills.reduce((sum, b) => sum + (b.status === 'Refunded' ? b.total : 0), 0)

    const attention = []
    for (const p of catalogue) {
      if (p.stock === 0) {
        attention.push({
          key: `out-${String(p._id)}`,
          rank: 0,
          tone: 'danger',
          kind: 'stock',
          title: `${p.name} is out of stock`,
          detail: `Reorder from ${p.supplierName || 'your supplier'}`,
          label: 'Out of stock',
          to: '/app/purchases',
          action: 'Reorder',
        })
      } else if (p.stock <= p.minStock) {
        attention.push({
          key: `low-${String(p._id)}`,
          rank: 0.2,
          tone: 'warn',
          kind: 'stock',
          title: `${p.name} is running low`,
          detail: `${p.stock} ${p.unit} left · minimum ${p.minStock} · ${p.supplierName || 'no supplier set'}`,
          label: 'Low stock',
          to: '/app/purchases',
          action: 'Reorder',
        })
      }
      if (p.expiry && p.stock > 0) {
        const days = Math.ceil((new Date(p.expiry).getTime() - Date.now()) / 86400000)
        if (days <= 30) {
          attention.push({
            key: `exp-${String(p._id)}`,
            rank: days < 0 ? 0.05 : 0.5,
            tone: days < 0 ? 'danger' : 'warn',
            kind: 'expiry',
            title: days < 0 ? `${p.name} is past its expiry date` : `${p.name} expires in ${days} days`,
            detail: `${p.stock} ${p.unit} on the shelf`,
            label: days < 0 ? 'Expired' : 'Expiring',
            to: '/app/inventory',
            action: 'Review',
          })
        }
      }
    }
    for (const b of openBills) {
      attention.push({
        key: `due-${String(b._id)}`,
        rank: 0.8,
        tone: 'warn',
        kind: 'payment',
        title: `₹${inr(b.total - b.amountPaid).toLocaleString('en-IN')} to collect from ${b.customerName}`,
        detail: `${b.invoiceNo} · ${b.status === 'Due' ? 'on credit' : 'partly paid'} · ${b.method}`,
        label: b.status === 'Due' ? 'Unpaid' : 'Partly paid',
        to: '/app/payments',
        action: 'Follow up',
      })
    }
    attention.sort((a, b) => a.rank - b.rank)

    return {
      date: { start, end },
      sales: {
        gross: inr(gross),
        netSales: inr(netSales),
        collected: inr(collected),
        due: inr(gross - collected),
        bills: bills.length,
        items: bills.reduce((s, b) => s + b.lines.reduce((n, l) => n + l.qty, 0), 0),
        cogs: inr(cogs),
        profit: inr(netSales - cogs),
      },
      averageBill: bills.length ? inr(Math.round(gross / bills.length)) : 0,
      attention,
      recentBills: billsWithLines.slice(0, 8).map((b) => new Bill(b).toSafeJSON()),
    }
  },

  /** Pulse feed: real bills, payments, purchases, returns and stock movements. */
  async pulse(storeId, { limit = 40 } = {}) {
    const [bills, paymentsIn, paymentsOut, purchases, returns, adjustments] = await Promise.all([
      Bill.find({ store: storeId }).sort({ billedAt: -1 }).limit(limit).select('invoiceNo total method customerName billedAt status').lean(),
      Payment.find({ store: storeId, direction: 'in' }).sort({ paidAt: -1 }).limit(limit).select('amount method customerName billInvoiceNo paidAt').lean(),
      Payment.find({ store: storeId, direction: 'out' }).sort({ paidAt: -1 }).limit(limit).select('amount supplierName paidAt').lean(),
      Purchase.find({ store: storeId }).sort({ orderedAt: -1 }).limit(limit).select('orderNo supplierName total status orderedAt receivedAt').lean(),
      Return.find({ store: storeId }).sort({ returnedAt: -1 }).limit(limit).select('returnNo billInvoiceNo refundTotal reason returnedAt').lean(),
      InventoryAdjustment.find({ store: storeId, source: 'manual' }).sort({ createdAt: -1 }).limit(limit).select('productName delta reason createdAt').lean(),
    ])

    const events = []
    for (const b of bills)
      events.push({
        id: `bill-${b._id}`,
        kind: 'invoice',
        tone: 'info',
        title: `Invoice ${b.invoiceNo} generated`,
        detail: `₹${inr(b.total).toLocaleString('en-IN')} · ${b.method} · ${b.customerName}`,
        status: b.status,
        needsAction: false,
        at: b.billedAt,
        to: `/app/bills?q=${encodeURIComponent(b.invoiceNo)}`,
        action: 'View bill',
      })
    for (const p of paymentsIn)
      events.push({
        id: `pay-in-${p._id}`,
        kind: 'payment',
        tone: 'ok',
        title: 'Payment collected',
        detail: `₹${inr(p.amount).toLocaleString('en-IN')} from ${p.customerName || 'walk-in'} · ${p.method}`,
        needsAction: false,
        at: p.paidAt,
        to: '/app/payments',
        action: 'Payments',
      })
    for (const p of paymentsOut)
      events.push({
        id: `pay-out-${p._id}`,
        kind: 'payment',
        tone: 'info',
        title: 'Supplier paid',
        detail: `₹${inr(p.amount).toLocaleString('en-IN')} to ${p.supplierName}`,
        needsAction: false,
        at: p.paidAt,
        to: '/app/payments',
        action: 'Payments',
      })
    for (const p of purchases)
      events.push({
        id: `po-${p._id}`,
        kind: 'purchase',
        tone: 'info',
        title: p.status === 'Goods received' ? `Purchase ${p.orderNo} received` : `Purchase order ${p.orderNo} raised`,
        detail: `₹${inr(p.total).toLocaleString('en-IN')} · ${p.supplierName}`,
        status: p.status,
        needsAction: p.status === 'Ordered' || p.status === 'In transit',
        at: p.receivedAt || p.orderedAt,
        to: '/app/purchases',
        action: 'Open order',
      })
    for (const r of returns)
      events.push({
        id: `ret-${r._id}`,
        kind: 'return',
        tone: 'warn',
        title: `Return ${r.returnNo} on ${r.billInvoiceNo}`,
        detail: `₹${inr(r.refundTotal).toLocaleString('en-IN')} refunded · ${r.reason}`,
        needsAction: false,
        at: r.returnedAt,
        to: '/app/returns',
        action: 'Open returns',
      })
    for (const a of adjustments)
      events.push({
        id: `adj-${a._id}`,
        kind: 'stock',
        tone: a.delta < 0 ? 'warn' : 'ok',
        title: 'Stock adjusted',
        detail: `${a.productName}: ${a.delta > 0 ? '+' : ''}${a.delta} · ${a.reason}`,
        needsAction: false,
        at: a.createdAt,
        to: '/app/inventory',
        action: 'Open stock',
      })

    // Derived alerts: low stock and open supplier dues are actionable.
    const low = await Product.countDocuments({
      store: oid(storeId),
      archived: false,
      $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] },
    })
    const out = await Product.countDocuments({ store: oid(storeId), archived: false, stock: 0 })
    if (out || low)
      events.push({
        id: 'alert-stock',
        kind: 'alert',
        tone: out ? 'danger' : 'warn',
        title: out ? `${out} product${out === 1 ? '' : 's'} out of stock` : `${low} product${low === 1 ? '' : 's'} below minimum`,
        detail: out ? 'These cannot be billed until stock arrives.' : 'Reorder before they run out.',
        needsAction: true,
        at: new Date(),
        to: '/app/inventory?stock=low',
        action: 'Review stock',
      })

    events.sort((a, b) => new Date(b.at) - new Date(a.at))
    return events.slice(0, limit)
  },

  /** Sales analytics for the Insights › Sales page. */
  async sales(storeId, { from, to, days = 7 }) {
    const span = Math.min(90, Math.max(1, days))
    // Default window is the last `days` business days, ending today.
    const end = to ?? new Date()
    const start = from ?? new Date(dayStart(end).getTime() - (span - 1) * 86400000)
    const bills = await Bill.find({ store: storeId, billedAt: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' } })
      .sort({ billedAt: 1 })
      .lean()

    // Buckets are whole business days, so the width is measured between day
    // boundaries — not from a mid-day `end`, which would add a stray bucket.
    const spanDays = Math.min(
      90,
      Math.max(1, Math.round((dayStart(end).getTime() - start.getTime()) / 86400000) + 1),
    )
    const buckets = new Map()
    for (let i = 0; i < spanDays; i++) {
      const key = dayKey(new Date(start.getTime() + i * 86400000))
      buckets.set(key, { day: key, revenue: 0, bills: 0 })
    }
    let gross = 0
    let discount = 0
    let tax = 0
    const sold = new Map()
    const productIds = new Set()
    const quantities = new Map()

    for (const b of bills) {
      const bucket = buckets.get(dayKey(b.billedAt))
      if (bucket) {
        bucket.revenue += b.total
        bucket.bills += 1
      }
      gross += b.total
      discount += b.discountTotal
      tax += b.taxTotal
      for (const l of b.lines) {
        productIds.add(String(l.product))
        quantities.set(String(l.product), (quantities.get(String(l.product)) || 0) + l.qty)
        const entry = sold.get(String(l.product)) || { name: l.name, units: 0, revenue: 0 }
        entry.units += l.qty
        entry.revenue += l.amount
        sold.set(String(l.product), entry)
      }
    }
    const costById = new Map(
      (await Product.find({ _id: { $in: [...productIds] }, store: storeId }).select('purchasePrice').lean()).map((p) => [
        String(p._id),
        p.purchasePrice,
      ]),
    )
    let cogs = 0
    for (const [id, qty] of quantities) cogs += (costById.get(id) || 0) * qty

    const topProducts = [...sold.entries()]
      .map(([id, entry]) => {
        const cost = (costById.get(id) || 0) * entry.units
        return {
          name: entry.name,
          units: entry.units,
          revenue: entry.revenue,
          cost,
          margin: entry.revenue ? Math.round(((entry.revenue - cost) / entry.revenue) * 100) : 0,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    const returns = await Return.aggregate([
      { $match: { store: oid(storeId), returnedAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, refunded: { $sum: '$refundTotal' }, count: { $sum: 1 } } },
    ])

    const trend = [...buckets.values()].map((b) => ({
      day: new Date(b.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: inr(b.revenue),
      bills: b.bills,
    }))

    return {
      range: { start, end, days: spanDays },
      totals: {
        gross: inr(gross),
        discount: inr(discount),
        tax: inr(tax),
        returns: inr(returns[0]?.refunded || 0),
        returnCount: returns[0]?.count || 0,
        netSales: inr(gross - (returns[0]?.refunded || 0)),
        cogs: inr(cogs),
        profit: inr(gross - (returns[0]?.refunded || 0) - cogs),
        bills: bills.length,
        averageBill: bills.length ? inr(Math.round(gross / bills.length)) : 0,
      },
      trend,
      topProducts: topProducts.slice(0, 10).map((p) => ({ ...p, revenue: inr(p.revenue) })),
    }
  },

  /** Period-by-period report used by the Reports page. */
  async report(storeId, { from, to }) {
    const bills = await Bill.find({ store: storeId, billedAt: { $gte: from, $lte: to } }).sort({ billedAt: 1 }).lean()
    const returns = await Return.find({ store: storeId, returnedAt: { $gte: from, $lte: to } }).lean()
    const payments = await Payment.find({ store: storeId, paidAt: { $gte: from, $lte: to } }).lean()
    const purchases = await Purchase.find({ store: storeId, orderedAt: { $gte: from, $lte: to } }).lean()

    const byMethod = new Map()
    for (const b of bills) {
      if (b.status === 'Cancelled') continue
      byMethod.set(b.method, (byMethod.get(b.method) || 0) + b.total)
    }
    const byCategory = new Map()
    for (const b of bills) {
      if (b.status === 'Cancelled') continue
      for (const l of b.lines) {
        byCategory.set(l.name, (byCategory.get(l.name) || 0) + l.amount)
      }
    }
    const collected = payments.filter((p) => p.direction === 'in').reduce((s, p) => s + p.amount, 0)
    const paidOut = payments.filter((p) => p.direction === 'out').reduce((s, p) => s + p.amount, 0)

    return {
      range: { from, to },
      bills: bills.map((b) => new Bill(b).toSafeJSON()),
      returns: returns.map((r) => new Return(r).toSafeJSON()),
      payments: payments.map((p) => new Payment(p).toSafeJSON()),
      purchases: purchases.map((p) => new Purchase(p).toSafeJSON()),
      summary: {
        gross: inr(bills.reduce((s, b) => s + (b.status === 'Cancelled' ? 0 : b.total), 0)),
        collected: inr(collected),
        paidOut: inr(paidOut),
        refunded: inr(returns.reduce((s, r) => s + r.refundTotal, 0)),
        purchased: inr(purchases.reduce((s, p) => s + p.total, 0)),
        byMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount: inr(amount) })),
        byProduct: [...byCategory.entries()]
          .map(([name, amount]) => ({ name, amount: inr(amount) }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 20),
      },
    }
  },

  /** GST summary: tax collected per slab from finalised bills only. */
  async gst(storeId, { from, to }) {
    const bills = await Bill.find({ store: storeId, billedAt: { $gte: from, $lte: to }, status: { $ne: 'Cancelled' } }).lean()
    const slabs = new Map()
    for (const b of bills) {
      for (const l of b.lines) {
        const key = l.gstRate
        const entry = slabs.get(key) || { rate: key, taxable: 0, tax: 0, items: 0 }
        const lineTaxable = l.amount - l.taxAmount
        entry.taxable += lineTaxable
        entry.tax += l.taxAmount
        entry.items += l.qty
        slabs.set(key, entry)
      }
    }
    const purchases = await Purchase.aggregate([
      { $match: { store: oid(storeId), orderedAt: { $gte: from, $lte: to }, status: { $ne: 'Cancelled' } } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.gstRate', taxable: { $sum: { $subtract: ['$lines.amount', '$lines.taxAmount'] } }, tax: { $sum: '$lines.taxAmount' } } },
    ])
    // Input tax credit is summed in paise and converted once, exactly like the
    // output tax above — mixing the two scales would double-convert.
    const credit = purchases.map((p) => ({ rate: p._id, taxable: p.taxable, tax: p.tax }))
    const outputTax = [...slabs.values()].reduce((s, v) => s + v.tax, 0)
    const inputTax = credit.reduce((s, v) => s + v.tax, 0)

    const store = await Store.findById(storeId).lean()
    return {
      range: { from, to },
      gstin: store?.gstNumber || '',
      slabs: [...slabs.values()]
        .map((v) => ({ rate: v.rate, taxable: inr(v.taxable), tax: inr(v.tax), items: v.items }))
        .sort((a, b) => a.rate - b.rate),
      inputCredit: credit.map((c) => ({ rate: c.rate, taxable: inr(c.taxable), tax: inr(c.tax) })),
      summary: { outputTax: inr(outputTax), inputTax: inr(inputTax), netPayable: inr(outputTax - inputTax) },
    }
  },
}

export default analyticsService
