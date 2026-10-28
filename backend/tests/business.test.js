import { describe, test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'

// --- Configure an isolated test environment BEFORE importing app code ------
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-value-abcdef-1234567890'
process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.EXPOSE_DEV_RESET_TOKEN = 'true'

const { default: mongoose } = await import('mongoose')
await import('dotenv/config')

const testUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI
assert.ok(testUri, 'MONGODB_TEST_URI or MONGODB_URI must be set to run tests')

const { default: app } = await import('../src/app.js')
const { default: User } = await import('../src/models/User.js')
const { default: Store } = await import('../src/models/Store.js')
const { default: RefreshToken } = await import('../src/models/RefreshToken.js')
const { default: Product } = await import('../src/models/Product.js')
const { default: Bill } = await import('../src/models/Bill.js')
const { __resetBuckets } = await import('../src/middleware/rateLimit.js')

// A dedicated database so this suite never races the authentication suite.
const DB_NAME = 'grovio_test_business'

let server
let base

const parseCookies = (res) => {
  const jar = {}
  const raw = res.headers.getSetCookie?.() || []
  for (const c of raw) {
    const [pair] = c.split(';')
    const idx = pair.indexOf('=')
    if (idx > -1) jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return jar
}

const call = async (path, { method = 'GET', body, token, jar, csrf } = {}) => {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (csrf) headers['X-CSRF-Token'] = csrf
  if (jar) headers.Cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: res.status, json, text, cookies: parseCookies(res) }
}

const register = async (over = {}) => {
  const res = await call('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Ramesh Sharma',
      storeName: 'Sharma Provision Store',
      phone: '+91 98110 00000',
      email: `owner-${Math.random().toString(36).slice(2, 9)}@example.com`,
      password: 'grovio1234',
      ...over,
    },
  })
  assert.equal(res.status, 201, `register failed: ${res.text}`)
  return {
    token: res.json.data.accessToken,
    jar: { grovio_rt: res.cookies.grovio_rt, grovio_csrf: res.cookies.grovio_csrf },
    csrf: res.cookies.grovio_csrf,
    userId: res.json.data.user.id,
    storeId: res.json.data.user.store.id,
    user: res.json.data.user,
  }
}

/** Creates a product and returns its id. */
const makeProduct = async (ctx, over = {}) => {
  const res = await call('/api/products', {
    method: 'POST',
    token: ctx.token,
    body: {
      name: 'Aashirvaad Atta 10 kg',
      brand: 'Aashirvaad',
      categoryName: 'Staples',
      unit: 'bag',
      sellingPrice: 465,
      purchasePrice: 412,
      gstRate: 5,
      stock: 24,
      minStock: 10,
      maxStock: 60,
      ...over,
    },
  })
  assert.equal(res.status, 201, `create product failed: ${res.text}`)
  return res.json.data.item
}

describe('Grovio business operations', () => {
  let ctx
  let other

  before(async () => {
    await mongoose.connect(testUri, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 })
const models = await Promise.all([
      import('../src/models/Category.js'),
      import('../src/models/Supplier.js'),
      import('../src/models/Purchase.js'),
      import('../src/models/Return.js'),
      import('../src/models/Payment.js'),
      import('../src/models/Customer.js'),
      import('../src/models/InventoryAdjustment.js'),
    ])
    await Promise.all([
      User.init(),
      Store.init(),
      RefreshToken.init(),
      Product.init(),
      Bill.init(),
      ...models.map((m) => m.default.init()),
    ])
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        base = `http://127.0.0.1:${server.address().port}`
        resolve()
      })
    })
  })

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Store.deleteMany({}),
      RefreshToken.deleteMany({}),
      Product.deleteMany({}),
      Bill.deleteMany({}),
      (await import('../src/models/Category.js')).default.deleteMany({}),
      (await import('../src/models/Supplier.js')).default.deleteMany({}),
      (await import('../src/models/Purchase.js')).default.deleteMany({}),
      (await import('../src/models/Return.js')).default.deleteMany({}),
      (await import('../src/models/Payment.js')).default.deleteMany({}),
      (await import('../src/models/Customer.js')).default.deleteMany({}),
      (await import('../src/models/InventoryAdjustment.js')).default.deleteMany({}),
    ])
    __resetBuckets()
    ctx = await register()
    other = await register({ storeName: 'Second Store', email: 'other@example.com' })
  })

  after(async () => {
    __resetBuckets()
    await new Promise((resolve) => server.close(resolve))
    await mongoose.connection.dropDatabase().catch(() => {})
    await mongoose.disconnect()
  })

  /* ------------------------------------------------------------ authorisation */

  test('rejects unauthenticated access to business endpoints', async () => {
    for (const path of ['/api/products', '/api/bills', '/api/customers', '/api/analytics/today', '/api/team', '/api/backup/preview']) {
      const res = await call(path)
      assert.equal(res.status, 401, `${path} should require authentication`)
    }
  })

  test('prevents cross-store access to another store\'s records', async () => {
    const product = await makeProduct(ctx)
    const steal = await call(`/api/products/${product.id}`, { token: other.token })
    assert.equal(steal.status, 404, 'another store must not see this product')

    const edit = await call(`/api/products/${product.id}`, {
      method: 'PATCH',
      token: other.token,
      body: { sellingPrice: 1 },
    })
    assert.equal(edit.status, 404)

    const bill = await call('/api/bills', {
      method: 'POST',
      token: other.token,
      body: { lines: [{ productId: product.id, qty: 1 }], method: 'Cash' },
    })
    assert.equal(bill.status, 400, 'a bill cannot reference another store\'s product')
  })

  test('restricts store-wide settings and backups to the owner', async () => {
    const teammate = await call('/api/team', {
      method: 'POST',
      token: ctx.token,
      body: { name: 'Imran Qureshi', email: 'imran@example.com', password: 'grovio1234', role: 'Cashier' },
    })
    assert.equal(teammate.status, 201)

    const login = await call('/api/auth/login', { method: 'POST', body: { identifier: 'imran@example.com', password: 'grovio1234' } })
    const cashierToken = login.json.data.accessToken

    const prefs = await call('/api/store-settings/preferences', {
      method: 'PUT',
      token: cashierToken,
      body: { roundTotals: false },
    })
    assert.equal(prefs.status, 403, 'a cashier must not change store-wide preferences')

    const backup = await call('/api/backup/preview', { token: cashierToken })
    assert.equal(backup.status, 403, 'a cashier must not download a backup')

    const products = await call('/api/products', { token: cashierToken })
    assert.equal(products.status, 200, 'a cashier can still read the catalogue')
  })

  /* ---------------------------------------------------------------- products */

  test('creates, lists, filters and updates products', async () => {
    const created = await makeProduct(ctx)
    assert.equal(created.sellingPrice, 465)
    assert.equal(created.gstRate, 5)

    const list = await call('/api/products?search=atta', { token: ctx.token })
    assert.equal(list.status, 200)
    assert.equal(list.json.data.items.length, 1)

    const low = await call('/api/products?lowStock=true', { token: ctx.token })
    assert.equal(low.json.data.items.length, 0, 'stock above minimum is not low stock')

    const updated = await call(`/api/products/${created.id}`, {
      method: 'PATCH',
      token: ctx.token,
      body: { sellingPrice: 480, minStock: 20 },
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.json.data.item.sellingPrice, 480)

    // Invalid: cost above price, minimum above maximum.
    const badPrice = await call(`/api/products/${created.id}`, { method: 'PATCH', token: ctx.token, body: { purchasePrice: 999 } })
    assert.equal(badPrice.status, 400)
    const badStock = await call(`/api/products/${created.id}`, { method: 'PATCH', token: ctx.token, body: { minStock: 500, maxStock: 10 } })
    assert.equal(badStock.status, 400)
  })

  test('enforces per-store SKU uniqueness', async () => {
    await makeProduct(ctx, { sku: 'GRV-ATT-10' })
    const dupe = await call('/api/products', {
      method: 'POST',
      token: ctx.token,
      body: {
        name: 'Another atta',
        sku: 'GRV-ATT-10',
        unit: 'bag',
        sellingPrice: 100,
      },
    })
    assert.equal(dupe.status, 409, 'duplicate SKU must be rejected')
    assert.match(dupe.json.message, /SKU/)

    // The same SKU is fine in a different store.
    const otherStore = await makeProduct(other, { sku: 'GRV-ATT-10' })
    assert.ok(otherStore.id, 'the same SKU is allowed in another store')
    assert.equal(otherStore.sku, 'GRV-ATT-10')
  })

  test('rejects invalid product payloads', async () => {
    const missing = await call('/api/products', { method: 'POST', token: ctx.token, body: { unit: 'bag', sellingPrice: 10 } })
    assert.equal(missing.status, 400)
    assert.ok(missing.json.errors.name, 'name is required')

    const zero = await call('/api/products', {
      method: 'POST',
      token: ctx.token,
      body: { name: 'Free item', sellingPrice: 0 },
    })
    assert.equal(zero.status, 400)
  })

  /* --------------------------------------------------------------- inventory */

  test('records a manual stock adjustment with reason and actor', async () => {
    const product = await makeProduct(ctx, { stock: 24 })
    const adjusted = await call(`/api/inventory/${product.id}/adjust`, {
      method: 'POST',
      token: ctx.token,
      body: { delta: -4, reason: 'Damage / breakage', note: 'Two bags torn' },
    })
    assert.equal(adjusted.status, 200, adjusted.text)
    assert.equal(adjusted.json.data.item.stock, 20)

    const history = await call(`/api/inventory/history?productId=${product.id}`, { token: ctx.token })
    assert.equal(history.json.data.items.length, 1)
    const entry = history.json.data.items[0]
    assert.equal(entry.stockBefore, 24)
    assert.equal(entry.stockAfter, 20)
    assert.equal(entry.reason, 'Damage / breakage')
    assert.equal(entry.actor, 'Ramesh Sharma')
    assert.equal(entry.source, 'manual')

    // Overshooting below zero is refused.
    const tooMuch = await call(`/api/inventory/${product.id}/adjust`, {
      method: 'POST',
      token: ctx.token,
      body: { delta: -100, reason: 'Theft / shrinkage' },
    })
    assert.equal(tooMuch.status, 400)
  })

  test('inventory summary values agree with product records', async () => {
    await makeProduct(ctx, { name: 'Tata Salt 1 kg', sku: 'SALT-1', stock: 96, purchasePrice: 21, sellingPrice: 28, minStock: 40 })
    await makeProduct(ctx, { name: 'Amul Gold Milk 500 ml', sku: 'MILK-5', stock: 8, purchasePrice: 30, sellingPrice: 34, minStock: 24 })
    const res = await call('/api/inventory', { token: ctx.token })
    assert.equal(res.status, 200)
    const { summary } = res.json.data
    assert.equal(summary.products, 2)
    // 96 × ₹21 + 8 × ₹30 = 2016 + 240 = 2256
    assert.equal(summary.stockValue, 2256)
    assert.equal(summary.low, 1, 'Amul at 8 of 24 minimum is low')
    assert.equal(summary.out, 0)
  })

  /* ---------------------------------------------------------------- billing */

  test('computes bill totals server-side and refuses client totals', async () => {
    const product = await makeProduct(ctx, { stock: 10, sellingPrice: 100, purchasePrice: 60, gstRate: 18 })
    // The client sends only ids and quantities — never amounts.
    const res = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: {
        lines: [{ productId: product.id, qty: 3 }],
        method: 'Cash',
        total: 1,
        subtotal: 1,
        taxTotal: 1,
      },
    })
    assert.equal(res.status, 201, res.text)
    const bill = res.json.data.item
    assert.equal(bill.subtotal, 300)
    assert.equal(bill.taxTotal, 54)
    assert.equal(bill.total, 354)
    assert.equal(bill.status, 'Paid')
    assert.equal(bill.amountPaid, bill.total)

    const fresh = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(fresh.json.data.item.stock, 7, 'stock is decremented by the sale')
  })

  test('applies a line discount before tax', async () => {
    const product = await makeProduct(ctx, { stock: 10, sellingPrice: 100, purchasePrice: 60, gstRate: 18 })
    const res = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 2, discountPercent: 10 }], method: 'Cash' },
    })
    const line = res.json.data.item.lines[0]
    assert.equal(line.rate, 100)
    assert.equal(line.discountAmount, 20)
    assert.equal(line.amount, 180)
    assert.equal(line.taxAmount, 32.4)
    assert.equal(res.json.data.item.total, 212)
  })

  test('prevents overselling', async () => {
    const product = await makeProduct(ctx, { stock: 2 })
    const res = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 5 }], method: 'Cash' },
    })
    assert.equal(res.status, 400)
    assert.match(res.json.message, /Only 2/)

    const unchanged = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(unchanged.json.data.item.stock, 2, 'no stock moves on a failed bill')
  })

  test('issues unique invoice numbers under repeated creation', async () => {
    const product = await makeProduct(ctx, { stock: 100 })
    const numbers = new Set()
    for (let i = 0; i < 5; i++) {
      const res = await call('/api/bills', {
        method: 'POST',
        token: ctx.token,
        body: { lines: [{ productId: product.id, qty: 1 }], method: 'Cash' },
      })
      assert.equal(res.status, 201, res.text)
      const no = res.json.data.item.invoiceNo
      assert.ok(!numbers.has(no), `duplicate invoice number ${no}`)
      numbers.add(no)
    }
    assert.equal(numbers.size, 5)
    const store = await Store.findById(ctx.storeId).lean()
    assert.equal(store.sequences.bill, 1005)
  })

  test('credit bills stay due and need a customer', async () => {
    const product = await makeProduct(ctx, { stock: 10 })
    const anonymous = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 1 }], method: 'Credit' },
    })
    assert.equal(anonymous.status, 400)

    const customer = await call('/api/customers', {
      method: 'POST',
      token: ctx.token,
      body: { name: 'Meena Iyer', phone: '+91 98333 21140' },
    })
    const credit = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 2 }], method: 'Credit', customerId: customer.json.data.item.id },
    })
    assert.equal(credit.status, 201)
    assert.equal(credit.json.data.item.status, 'Due')
    assert.equal(credit.json.data.item.amountPaid, 0)

    // Collecting the balance settles it.
    const pay = await call(`/api/bills/${credit.json.data.item.id}/pay`, {
      method: 'POST',
      token: ctx.token,
      body: { amount: credit.json.data.item.total, method: 'UPI' },
    })
    assert.equal(pay.status, 201)
    const settled = await call(`/api/bills/${credit.json.data.item.id}`, { token: ctx.token })
    assert.equal(settled.json.data.item.status, 'Paid')
    assert.equal(settled.json.data.item.amountPaid, settled.json.data.item.total)

    // Over-paying is refused.
    const again = await call(`/api/bills/${credit.json.data.item.id}/pay`, {
      method: 'POST',
      token: ctx.token,
      body: { amount: 100, method: 'Cash' },
    })
    assert.equal(again.status, 400)
  })

  test('cancelling a bill restores stock and keeps the audit trail', async () => {
    const product = await makeProduct(ctx, { stock: 10, sellingPrice: 100, purchasePrice: 60 })
    const bill = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 4 }], method: 'Cash' },
    })
    assert.equal((await call(`/api/products/${product.id}`, { token: ctx.token })).json.data.item.stock, 6)

    const noReason = await call(`/api/bills/${bill.json.data.item.id}/cancel`, { method: 'POST', token: ctx.token, body: {} })
    assert.equal(noReason.status, 400, 'a reason is required')

    const cancelled = await call(`/api/bills/${bill.json.data.item.id}/cancel`, {
      method: 'POST',
      token: ctx.token,
      body: { reason: 'Customer walked away' },
    })
    assert.equal(cancelled.status, 200)
    const after = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(after.json.data.item.stock, 10, 'stock is restored')

    const history = await call(`/api/inventory/history?productId=${product.id}`, { token: ctx.token })
    const sources = history.json.data.items.map((a) => a.source)
    assert.ok(sources.includes('bill'), 'the sale is recorded')
    assert.ok(sources.includes('bill-cancel'), 'the cancellation is recorded')
  })

  /* ---------------------------------------------------------------- returns */

  test('validates return quantities and restocks the shelf', async () => {
    const product = await makeProduct(ctx, { stock: 10, sellingPrice: 100, purchasePrice: 60, gstRate: 18 })
    const bill = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 3 }], method: 'Cash' },
    })
    const billId = bill.json.data.item.id

    // Too many units.
    const over = await call('/api/returns', {
      method: 'POST',
      token: ctx.token,
      body: { billId, lines: [{ productId: product.id, qty: 4 }], reason: 'Damaged in transit' },
    })
    assert.equal(over.status, 400)

    const first = await call('/api/returns', {
      method: 'POST',
      token: ctx.token,
      body: { billId, lines: [{ productId: product.id, qty: 1 }], reason: 'Damaged in transit' },
    })
    assert.equal(first.status, 201, first.text)
    assert.equal(first.json.data.item.refundTotal, 118, 'refund includes GST')

    // Only two units remain eligible.
    const eligible = await call('/api/returns/eligible?search=' + bill.json.data.item.invoiceNo, { token: ctx.token })
    const remaining = eligible.json.data.items[0].lines[0].returnableQty
    assert.equal(remaining, 2)

    const after = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(after.json.data.item.stock, 8, 'returned unit is back on the shelf')

    const second = await call('/api/returns', {
      method: 'POST',
      token: ctx.token,
      body: { billId, lines: [{ productId: product.id, qty: 2 }], reason: 'Quality complaint' },
    })
    assert.equal(second.status, 201)

    const exhausted = await call('/api/returns', {
      method: 'POST',
      token: ctx.token,
      body: { billId, lines: [{ productId: product.id, qty: 1 }], reason: 'Quality complaint' },
    })
    assert.equal(exhausted.status, 400, 'nothing left to return')
  })

  test('a non-restocked return does not change stock', async () => {
    const product = await makeProduct(ctx, { stock: 10, sellingPrice: 100, purchasePrice: 60 })
    const bill = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 2 }], method: 'Cash' },
    })
    const res = await call('/api/returns', {
      method: 'POST',
      token: ctx.token,
      body: { billId: bill.json.data.item.id, lines: [{ productId: product.id, qty: 1 }], reason: 'Expired / spoiled', restocked: false },
    })
    assert.equal(res.status, 201)
    const after = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(after.json.data.item.stock, 8, 'no restock when the goods were spoiled')
  })

  /* --------------------------------------------------------------- purchases */

  test('receives a purchase exactly once and updates cost', async () => {
    const product = await makeProduct(ctx, { stock: 5, purchasePrice: 400 })
    const supplier = await call('/api/suppliers', {
      method: 'POST',
      token: ctx.token,
      body: { name: 'Nagpal Distributors', phone: '+91 98110 44521' },
    })
    const order = await call('/api/purchases', {
      method: 'POST',
      token: ctx.token,
      body: { supplierId: supplier.json.data.item.id, lines: [{ productId: product.id, qty: 20, cost: 412 }] },
    })
    assert.equal(order.status, 201, order.text)
    assert.equal(order.json.data.item.status, 'Ordered')

    const receive = await call(`/api/purchases/${order.json.data.item.id}/receive`, { method: 'POST', token: ctx.token, body: {} })
    assert.equal(receive.status, 200)
    assert.equal(receive.json.data.item.status, 'Goods received')

    const after = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(after.json.data.item.stock, 25, 'stock increases on receipt')
    assert.equal(after.json.data.item.purchasePrice, 412, 'cost price follows the purchase')

    const again = await call(`/api/purchases/${order.json.data.item.id}/receive`, { method: 'POST', token: ctx.token, body: {} })
    assert.equal(again.status, 400, 'receiving twice is refused')

    // The supplier outstanding reflects the received order.
    const outstanding = await call('/api/suppliers/outstanding', { token: ctx.token })
    // 20 × ₹412 = ₹8,240 plus 5% GST on the default slab = ₹8,652.
    assert.equal(outstanding.status, 200, outstanding.text)
    assert.equal(outstanding.json.data.items[0].outstanding, 8652)

    const pay = await call(`/api/purchases/${order.json.data.item.id}/pay`, {
      method: 'POST',
      token: ctx.token,
      body: { amount: order.json.data.item.total, method: 'Bank transfer' },
    })
    assert.equal(pay.status, 201)
    const settled = await call('/api/suppliers/outstanding', { token: ctx.token })
    assert.equal(settled.json.data.items[0].outstanding, 0)

    const over = await call(`/api/purchases/${order.json.data.item.id}/pay`, {
      method: 'POST',
      token: ctx.token,
      body: { amount: 10 },
    })
    assert.equal(over.status, 400, 'cannot pay more than is owed')
  })

  test('cancels an ordered purchase but not a received one', async () => {
    const product = await makeProduct(ctx, { stock: 5 })
    const supplier = await call('/api/suppliers', { method: 'POST', token: ctx.token, body: { name: 'Parle Depot' } })
    const order = await call('/api/purchases', {
      method: 'POST',
      token: ctx.token,
      body: { supplierId: supplier.json.data.item.id, lines: [{ productId: product.id, qty: 5, cost: 20 }] },
    })
    const cancelled = await call(`/api/purchases/${order.json.data.item.id}/cancel`, {
      method: 'POST',
      token: ctx.token,
      body: { reason: 'Supplier could not deliver' },
    })
    assert.equal(cancelled.status, 200)
    const unchanged = await call(`/api/products/${product.id}`, { token: ctx.token })
    assert.equal(unchanged.json.data.item.stock, 5, 'cancelling an order never moves stock')
  })

  test('lists open orders with the virtual Open status filter', async () => {
    const product = await makeProduct(ctx, { stock: 50 })
    const supplier = await call('/api/suppliers', { method: 'POST', token: ctx.token, body: { name: 'Haldiram Depot' } })

    const ordered = await call('/api/purchases', {
      method: 'POST',
      token: ctx.token,
      body: { supplierId: supplier.json.data.item.id, lines: [{ productId: product.id, qty: 5, cost: 20 }] },
    })

    const partial = await call('/api/purchases', {
      method: 'POST',
      token: ctx.token,
      body: { supplierId: supplier.json.data.item.id, lines: [{ productId: product.id, qty: 4, cost: 20 }] },
    })
    const receivedPart = await call(`/api/purchases/${partial.json.data.item.id}/receive`, {
      method: 'POST',
      token: ctx.token, body: { lines: [{ productId: product.id, qty: 2 }] },
    })
    assert.equal(receivedPart.json.data.item.status, 'In transit', 'a part-received order stays in transit')

    const received = await call('/api/purchases', {
      method: 'POST',
      token: ctx.token,
      body: { supplierId: supplier.json.data.item.id, lines: [{ productId: product.id, qty: 3, cost: 20 }] },
    })
    await call(`/api/purchases/${received.json.data.item.id}/receive`, { method: 'POST', token: ctx.token, body: {} })

    const open = await call('/api/purchases?status=Open&limit=25', { token: ctx.token })
    assert.equal(open.status, 200, open.text)
    assert.equal(open.json.data.meta.total, 2, 'Open spans Ordered and In transit')
    assert.deepEqual(
      open.json.data.items.map((p) => p.orderNo).sort(),
      [ordered.json.data.item.orderNo, partial.json.data.item.orderNo].sort(),
    )

    const goods = await call('/api/purchases?status=Goods received', { token: ctx.token })
    assert.equal(goods.json.data.meta.total, 1, 'a stored status still filters directly')
    assert.equal(goods.json.data.items[0].orderNo, received.json.data.item.orderNo)

    const all = await call('/api/purchases?limit=25', { token: ctx.token })
    assert.equal(all.json.data.meta.total, 3)
    assert.equal(all.json.data.summary.openCount, 2, 'summary agrees with the Open filter')

    const bogus = await call('/api/purchases?status=Fake', { token: ctx.token })
    assert.equal(bogus.status, 400, 'an unknown status is still refused')
  })

  /* --------------------------------------------------------------- analytics */

  test('analytics figures agree with the records behind them', async () => {
    const product = await makeProduct(ctx, { stock: 20, sellingPrice: 100, purchasePrice: 60, gstRate: 18 })
    const customer = await call('/api/customers', { method: 'POST', token: ctx.token, body: { name: 'Meena Iyer' } })
    const bill = await call('/api/bills', {
      method: 'POST',
      token: ctx.token,
      body: { lines: [{ productId: product.id, qty: 2 }], method: 'UPI', customerId: customer.json.data.item.id },
    })
    assert.equal(bill.json.data.item.total, 236)

    const today = await call('/api/analytics/today', { token: ctx.token })
    assert.equal(today.status, 200)
    assert.equal(today.json.data.sales.bills, 1)
    assert.equal(today.json.data.sales.gross, 236)
    assert.equal(today.json.data.sales.collected, 236)
    assert.equal(today.json.data.sales.due, 0)
    // Profit = net sales (236) − COGS (2 × ₹60 = 120) = ₹116.
    assert.equal(today.json.data.sales.profit, 116)
    assert.equal(today.json.data.sales.cogs, 120)

    const sales = await call('/api/analytics/sales?days=7', { token: ctx.token })
    assert.equal(sales.json.data.totals.gross, 236)
    assert.equal(sales.json.data.totals.netSales, 236)
    assert.equal(sales.json.data.totals.profit, 116)
    assert.equal(sales.json.data.trend.at(-1).revenue, 236, "today's bucket holds the bill")
    assert.equal(sales.json.data.topProducts[0].units, 2)

    const gst = await call('/api/analytics/gst', { token: ctx.token })
    const slab = gst.json.data.slabs.find((s) => s.rate === 18)
    assert.equal(slab.tax, 36, 'GST on 2 × ₹100 at 18%')
    assert.equal(gst.json.data.summary.netPayable, 36)

    const pulse = await call('/api/analytics/pulse', { token: ctx.token })
    assert.ok(pulse.json.data.items.some((e) => e.title.includes(bill.json.data.item.invoiceNo)), 'pulse lists the bill')

    // A second store must see none of this.
    const otherToday = await call('/api/analytics/today', { token: other.token })
    assert.equal(otherToday.json.data.sales.bills, 0)
  })

  /* ---------------------------------------------------------------- settings */

  test('validates store profile and invoice settings', async () => {
    const badGstin = await call('/api/store-settings/profile', {
      method: 'PUT',
      token: ctx.token,
      body: { name: 'Sharma Provision Store', gstNumber: 'NOT-A-GSTIN' },
    })
    assert.equal(badGstin.status, 400)

    const good = await call('/api/store-settings/profile', {
      method: 'PUT',
      token: ctx.token,
      body: { name: 'Sharma Provision Store', gstNumber: '07AABCS1429P1ZV', fssai: '10819004000257' },
    })
    assert.equal(good.status, 200)
    assert.equal(good.json.data.store.gstNumber, '07AABCS1429P1ZV')

    const badPrefix = await call('/api/store-settings/invoice', { method: 'PUT', token: ctx.token, body: { prefix: 'TOOLONG' } })
    assert.equal(badPrefix.status, 400)

    const invoice = await call('/api/store-settings/invoice', { method: 'PUT', token: ctx.token, body: { prefix: 'GRV', upiId: 'sharma@upi' } })
    assert.equal(invoice.status, 200)
    assert.equal(invoice.json.data.settings.prefix, 'GRV')

    const badTax = await call('/api/store-settings/taxes', { method: 'PUT', token: ctx.token, body: { taxes: [{ rate: 7 }] } })
    assert.equal(badTax.status, 400, 'only statutory GST slabs are allowed')

    const taxes = await call('/api/store-settings/taxes', { method: 'PUT', token: ctx.token, body: { taxes: [{ rate: 0, enabled: true }, { rate: 5 }, { rate: 18 }] } })
    assert.equal(taxes.status, 200)
    assert.equal(taxes.json.data.taxes.length, 3)
  })

  /* -------------------------------------------------------------------- team */

  test('enforces role rules and protects the owner', async () => {
    const manager = await call('/api/team', {
      method: 'POST',
      token: ctx.token,
      body: { name: 'Priya Sharma', email: 'priya@example.com', password: 'grovio1234', role: 'Manager' },
    })
    assert.equal(manager.status, 201)

    const cashier = await call('/api/team', {
      method: 'POST',
      token: ctx.token,
      body: { name: 'Imran Qureshi', email: 'imran2@example.com', password: 'grovio1234', role: 'Cashier' },
    })
    assert.equal(cashier.status, 201)

    // Answer as the manager BEFORE any promotion, so the role is still Manager.
    const managerLogin = await call('/api/auth/login', { method: 'POST', body: { identifier: 'priya@example.com', password: 'grovio1234' } })
    const managerToken = managerLogin.json.data.accessToken
    assert.equal(managerLogin.json.data.user.role, 'Manager')

    const managerChangesRole = await call(`/api/team/${cashier.json.data.item.id}`, {
      method: 'PATCH',
      token: managerToken,
      body: { role: 'Manager' },
    })
    assert.equal(managerChangesRole.status, 403, 'only the owner changes roles')

    const managerDisables = await call(`/api/team/${cashier.json.data.item.id}/status`, {
      method: 'POST',
      token: managerToken,
      body: { status: 'disabled' },
    })
    assert.equal(managerDisables.status, 403, 'only the owner disables a user')

    const promote = await call(`/api/team/${manager.json.data.item.id}`, {
      method: 'PATCH',
      token: ctx.token,
      body: { role: 'Owner' },
    })
    assert.equal(promote.status, 200, 'the owner may promote')

    const selfDemote = await call(`/api/team/${ctx.userId}`, {
      method: 'PATCH',
      token: ctx.token,
      body: { role: 'Cashier' },
    })
    assert.equal(selfDemote.status, 400, 'an owner cannot demote themselves')

    const disableOwner = await call(`/api/team/${ctx.userId}/status`, { method: 'POST', token: ctx.token, body: { status: 'disabled' } })
    assert.equal(disableOwner.status, 400, 'the last owner cannot be disabled')

    const disableManager = await call(`/api/team/${cashier.json.data.item.id}/status`, { method: 'POST', token: ctx.token, body: { status: 'disabled' } })
    assert.equal(disableManager.status, 200)
    const sessions = await RefreshToken.countDocuments({ user: cashier.json.data.item.id, revokedAt: null })
    assert.equal(sessions, 0, 'disabling a user revokes every session')

    const disabledLogin = await call('/api/auth/login', { method: 'POST', body: { identifier: 'imran2@example.com', password: 'grovio1234' } })
    assert.equal(disabledLogin.status, 403, 'a disabled user cannot sign in')
  })

  /* ------------------------------------------------------------------ backup */

  test('exports and restores a store backup', async () => {
    await makeProduct(ctx, { stock: 10 })
    const res = await fetch(`${base}/api/backup/export`, { headers: { Authorization: `Bearer ${ctx.token}` } })
    assert.equal(res.status, 200)
    const backup = await res.json()
    assert.equal(backup.version, 2)
    assert.ok(backup.collections.products.length >= 1)
    assert.equal(backup.collections.products[0].passwordHash, undefined)
    assert.ok(!JSON.stringify(backup).includes('passwordHash'), 'no secrets in a backup')

    // Wipe the catalogue by hand, then restore.
    await Product.deleteMany({ store: ctx.storeId })
    const empty = await call('/api/products', { token: ctx.token })
    assert.equal(empty.json.data.meta.total, 0)

    const restore = await call('/api/backup/restore', { method: 'POST', token: ctx.token, body: { backup } })
    assert.equal(restore.status, 200, restore.text)
    const restored = await call('/api/products', { token: ctx.token })
    assert.equal(restored.json.data.meta.total, backup.collections.products.length)

    const invalid = await call('/api/backup/restore', { method: 'POST', token: ctx.token, body: { backup: { hello: 'world' } } })
    assert.equal(invalid.status, 400, 'an unrelated file is refused')
  })
})
