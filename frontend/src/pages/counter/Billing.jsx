import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Check, CreditCard, HandCoins, Minus, Plus, Printer, QrCode, Search, Trash2, X } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { InvoiceDocument } from '@/components/grovio/InvoiceDocument.jsx'
import { printReceipt } from '@/lib/print.js'
import { useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num } from '@/lib/format.js'

const UNITS = ['piece', 'pack', 'pouch', 'bottle', 'bag', 'carton', 'box', 'kg', 'gram', 'litre', 'ml', 'dozen']
const GST_RATES = [0, 5, 12, 18, 28]

const BLANK_PRODUCT = {
  name: '',
  sku: '',
  barcode: '',
  categoryName: '',
  unit: 'piece',
  sellingPrice: '',
  purchasePrice: '',
  gstRate: 0,
  stock: 0,
  minStock: 5,
}

/** Compact add-product dialog usable mid-bill without abandoning the cart. */
function ProductModal({ open, onClose, onSubmit, saving, error }) {
  const [form, setForm] = useState(BLANK_PRODUCT)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const reset = () => {
    setForm(BLANK_PRODUCT)
  }

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="animate-pop max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-surface p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Add a product</h2>
        <p className="mt-1 text-xs text-muted-foreground">Saved to your catalogue and immediately selectable in this bill.</p>

        {error ? (
          <p role="alert" className="mt-3 text-xs font-semibold text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold sm:col-span-2">
            Product name *
            <input autoFocus required minLength={2} value={form.name} onChange={(e) => set({ name: e.target.value })} className="ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm" />
          </label>
          <label className="text-xs font-semibold">
            Selling price *
            <input type="number" inputMode="decimal" required min="0.01" step="0.01" value={form.sellingPrice} onChange={(e) => set({ sellingPrice: e.target.value })} className="num ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm" />
          </label>
          <label className="text-xs font-semibold">
            Cost price
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set({ purchasePrice: e.target.value })} className="num ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm" />
          </label>
          <label className="text-xs font-semibold">
            SKU / barcode
            <input value={form.sku} onChange={(e) => set({ sku: e.target.value })} className="num ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm" placeholder="Auto if blank" />
          </label>
          <label className="text-xs font-semibold">
            Category
            <input value={form.categoryName} onChange={(e) => set({ categoryName: e.target.value })} className="ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm" placeholder="Optional" />
          </label>
          <label className="text-xs font-semibold">
            GST %
            <select value={form.gstRate} onChange={(e) => set({ gstRate: Number(e.target.value) })} className="num ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm">
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Opening stock
            <input type="number" min="0" value={form.stock} onChange={(e) => set({ stock: Math.max(0, Number(e.target.value) || 0) })} className="num ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm" />
          </label>
          <label className="text-xs font-semibold">
            Unit
            <select value={form.unit} onChange={(e) => set({ unit: e.target.value })} className="ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm">
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save product'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const METHODS = [
  { name: 'Cash', icon: Banknote, key: '1' },
  { name: 'UPI', icon: QrCode, key: '2' },
  { name: 'Card', icon: CreditCard, key: '3' },
  { name: 'Credit', icon: HandCoins, key: '4' },
]

export default function Billing() {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [lines, setLines] = useState([])
  const [method, setMethod] = useState('UPI')
  const [customerId, setCustomerId] = useState('')
  const [tendered, setTendered] = useState('')
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [store, setStore] = useState(null)
  const [invoiceSettings, setInvoiceSettings] = useState(null)
  const searchRef = useRef(null)
  const [toast, show] = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [productFormError, setProductFormError] = useState(null)

  const products = useApi((q) => api.products.list(q), { sync: true })
  const customers = useApi((q) => api.customers.list(q), { sync: true })
  const settings = useApi(() => api.settings.profile(), { immediate: true })

  // Store profile + invoice branding for the receipt.
  useEffect(() => {
    if (settings.data) setStore(settings.data.store)
  }, [settings.data])
  useEffect(() => {
    api.settings.invoice().then((r) => setInvoiceSettings(r?.data?.settings)).catch(() => {})
  }, [])

  const all = products.data?.items || []
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return all.filter((p) => `${p.name} ${p.sku} ${p.brand} ${p.category}`.toLowerCase().includes(q)).slice(0, 8)
  }, [query, all])

  const rows = lines.flatMap((l) => {
    const p = all.find((x) => x.id === l.id)
    return p ? [{ ...l, product: p }] : []
  })

  // Totals are estimated locally only as a preview — the server recomputes the
  // authoritative figures when the bill is saved.
  const subtotal = rows.reduce((a, r) => a + r.product.sellingPrice * r.qty, 0)
  const discount = rows.reduce((a, r) => a + (r.product.sellingPrice * r.qty * r.discount) / 100, 0)
  const net = subtotal - discount
  const tax = rows.reduce((a, r) => a + (r.product.sellingPrice * r.qty * (1 - r.discount / 100) * r.product.gstRate) / 100, 0)
  const total = Math.round(net + tax)
  const units = rows.reduce((a, r) => a + r.qty, 0)
  const overs = rows.filter((r) => r.qty > r.product.stock)
  const cash = Number(tendered) || 0
  const change = method === 'Cash' && cash >= total ? cash - total : 0
  const canSave =
    rows.length > 0 &&
    overs.length === 0 &&
    (method !== 'Cash' || !tendered || cash >= total) &&
    !(method === 'Credit' && !customerId)

  const add = (id) => {
    setSaved(null)
    setSaveError(null)
    setLines((prev) =>
      prev.some((l) => l.id === id) ? prev.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { id, qty: 1, discount: 0 }],
    )
    setQuery('')
    setCursor(0)
    searchRef.current?.focus()
  }

  const bump = (id, d) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0))

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await api.bills.create({
        lines: rows.map((r) => ({ productId: r.id, qty: r.qty, discountPercent: r.discount })),
        method,
        customerId: customerId || null,
      })
      show(`${res.data.item.invoiceNo} saved · ${inr(res.data.item.total)} · stock updated`)
      setSaved(res.data.item)
      setLines([])
      setTendered('')
      products.refresh()
    } catch (err) {
      setSaveError(err.message)
      if (err.errors) {
        const first = Object.entries(err.errors)[0]
        if (first) setSaveError(`${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const nextCustomer = () => {
    setSaved(null)
    setCustomerId('')
    setMethod('UPI')
    searchRef.current?.focus()
  }

  // Add a new product straight from the counter. Opening stock is set on the
  // product row itself; later moves go through audited inventory adjustments.
  const createProduct = async (form) => {
    if (creatingProduct) return
    const name = String(form.name || '').trim()
    const sellingPrice = Number(form.sellingPrice)
    if (!name) {
      setProductFormError('Give the product a name.')
      return
    }
    if (!(sellingPrice > 0)) {
      setProductFormError('Selling price must be more than ₹0.')
      return
    }
    const purchasePrice = Number(form.purchasePrice || 0)
    if (purchasePrice > sellingPrice) {
      setProductFormError('Cost price is above the selling price.')
      return
    }
    setCreatingProduct(true)
    setProductFormError(null)
    try {
      const payload = {
        name,
        sku: String(form.sku || '').trim(),
        barcode: String(form.barcode || '').trim(),
        categoryName: String(form.categoryName || '').trim(),
        unit: form.unit || 'piece',
        sellingPrice,
        purchasePrice,
        gstRate: Number(form.gstRate || 0),
        stock: Math.max(0, Number(form.stock || 0)),
        minStock: Number(form.minStock || 0),
        maxStock: Math.max(Number(form.minStock || 0) + 10, Number(form.stock || 0) + 10),
      }
      const created = await api.products.create(payload)
      const newId = created?.data?.item?.id
      show(`${created?.data?.item?.name || name} added`)
      setAddOpen(false)
      await products.refresh()
      if (newId) {
        setSaved(null)
        setSaveError(null)
        setLines((prev) => (prev.some((l) => l.id === newId) ? prev : [...prev, { id: newId, qty: 1, discount: 0 }]))
        setQuery('')
      }
    } catch (err) {
      if (err.status === 409) setProductFormError('That SKU/barcode already exists. Use a different one.')
      else setProductFormError(err.message || 'Could not save the product.')
    } finally {
      setCreatingProduct(false)
    }
  }

  // Keyboard-first counter: "/" search, F9 / Ctrl+Enter save, Alt+1-4 payment.
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'F9' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        save()
      } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        setMethod(METHODS[Number(e.key) - 1].name)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  return (
    <AppShell
      focus={{
        title: 'Counter · point of sale',
        subtitle: 'Focus mode — everything else is hidden until this bill is done',
        exitTo: '/app/today',
        exitLabel: 'Leave counter',
      }}
    >
      <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* LEFT — what are they buying */}
        <section aria-labelledby="cart-h" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">Counter · new bill</p>
              <h1 id="cart-h" className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">
                What are they buying?
              </h1>
            </div>
            <p className="num text-xs text-muted-foreground">
              <Kbd>/</Kbd> search · <Kbd>↵</Kbd> add · <Kbd>F9</Kbd> save
            </p>
          </div>

          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              aria-label="Search products"
              onChange={(e) => {
                setQuery(e.target.value)
                setCursor(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setCursor((c) => Math.min(c + 1, results.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setCursor((c) => Math.max(c - 1, 0))
                } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && results[cursor]) {
                  e.preventDefault()
                  add(results[cursor].id)
                } else if (e.key === 'Escape') setQuery('')
              }}
              placeholder="Product, brand or SKU — or scan a barcode"
              className="ring-focus h-14 w-full rounded-md border border-input bg-surface pl-12 pr-4 text-base outline-none focus:border-primary"
            />
            {query ? (
              <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
                {results.length === 0 ? (
                  <li className="px-4 py-5 text-sm text-muted-foreground">
                    Nothing matches “{query}”.{' '}
                    <Link to="/app/products" className="font-semibold text-primary underline-offset-2 hover:underline">
                      Add it as a product
                    </Link>
                  </li>
                ) : (
                  results.map((p, i) => (
                    <li key={p.id} role="option" aria-selected={i === cursor}>
                      <button
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => add(p.id)}
                        disabled={p.stock === 0}
                        className={`ring-focus flex w-full items-center gap-4 px-4 py-2.5 text-left disabled:opacity-50 ${i === cursor ? 'bg-accent' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{p.name}</span>
                          <span className="num block text-xs text-muted-foreground">
                            {p.sku} · GST {p.gstRate}%
                          </span>
                        </span>
                        <span className={`num text-xs ${p.stock <= p.minStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {p.stock === 0 ? 'Out of stock' : `${num(p.stock)} ${p.unit}`}
                        </span>
                        <span className="num w-20 text-right text-sm font-semibold">{inr(p.sellingPrice)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => { setProductFormError(null); setAddOpen(true) }}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add product
            </Button>
          </div>

          {/* Saved bill receipt */}
          {saved ? (
            <div id="receipt" className="animate-rise mt-8 scroll-mt-28">
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/80 pt-6">
                <p className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="num block text-lg font-semibold">{saved.invoiceNo} saved</span>
                    <span className="text-sm text-muted-foreground">
                      {inr(saved.total)} · {saved.method} · {saved.status === 'Due' ? 'added to dues' : 'paid'}
                    </span>
                  </span>
                </p>
                <div className="flex gap-2">
                  <button onClick={printReceipt} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent">
                    <Printer className="h-4 w-4" aria-hidden /> Print
                  </button>
                  <button autoFocus onClick={nextCustomer} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
                    Next customer
                  </button>
                </div>
              </div>
              <div className="mt-6" id="receipt-print">
                <InvoiceDocument
                  bill={saved}
                  store={store}
                  settings={invoiceSettings}
                  customer={(customers.data?.items || []).find((c) => c.id === saved.customerId)}
                />
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-8 border-t border-border pt-8">
              <p className="text-sm text-muted-foreground">
                {all.length === 0 ? (
                  <>
                    Your catalogue is empty.{' '}
                    <Link to="/app/products" className="font-semibold text-primary underline">
                      Add the first product
                    </Link>{' '}
                    before billing.
                  </>
                ) : (
                  'Start the bill with a frequent item, or search above.'
                )}
              </p>
              {all.length ? (
                <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                  {all
                    .filter((p) => p.stock > 0)
                    .slice(0, 8)
                    .map((p) => (
                      <button key={p.id} onClick={() => add(p.id)} className="ring-focus bg-surface p-4 text-left transition-colors hover:bg-accent">
                        <span className="line-clamp-2 block text-sm font-semibold leading-snug">{p.name}</span>
                        <span className="num mt-2 block text-sm">{inr(p.sellingPrice)}</span>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <table className="mt-8 w-full border-t border-foreground/80 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 font-semibold">Item</th>
                  <th className="py-3 text-center font-semibold">Qty</th>
                  <th className="hidden py-3 text-right font-semibold sm:table-cell">Rate</th>
                  <th className="py-3 text-right font-semibold">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-b border-border">
                {rows.map((r, i) => {
                  const over = r.qty > r.product.stock
                  return (
                    <tr key={r.id} className="animate-fade">
                      <td className="py-3 pr-3">
                        <span className="num mr-3 text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                        <span className="font-semibold">{r.product.name}</span>
                        <span className={`num block pl-8 text-xs ${over ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                          {over ? `Only ${r.product.stock} on the shelf` : `${r.product.stock - r.qty} left after this bill`} · GST {r.product.gstRate}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="mx-auto flex w-fit items-center rounded-md border border-border">
                          <button onClick={() => bump(r.id, -1)} className="ring-focus grid h-8 w-8 place-items-center hover:bg-muted" aria-label={`Fewer ${r.product.name}`}>
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <span className="num w-8 text-center font-semibold">{r.qty}</span>
                          <button
                            onClick={() => bump(r.id, 1)}
                            disabled={r.qty >= r.product.stock}
                            className="ring-focus grid h-8 w-8 place-items-center hover:bg-muted disabled:opacity-40"
                            aria-label={`More ${r.product.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </span>
                      </td>
                      <td className="num hidden py-3 text-right text-muted-foreground sm:table-cell">{inr(r.product.sellingPrice)}</td>
                      <td className="num py-3 text-right font-semibold">{inr(r.product.sellingPrice * r.qty)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setLines((p) => p.filter((l) => l.id !== r.id))}
                          className="ring-focus rounded p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${r.product.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* RIGHT — what do they owe */}
        <aside aria-label="Payment" className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-md border border-border bg-surface">
            <div className="border-b border-border p-5">
              <label htmlFor="cust" className="eyebrow">
                Customer
              </label>
              <select
                id="cust"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="ring-focus mt-2 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
              >
                <option value="">Walk-in</option>
                {(customers.data?.items || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.stats?.due ? ` · ${inr(c.stats.due)} due` : ''}
                  </option>
                ))}
              </select>
            </div>

            <dl className="space-y-2 p-5 text-sm">
              <Sum label={`Items · ${units} units`} value={inr(subtotal)} />
              {discount > 0 ? <Sum label="Discounts" value={`− ${inr(discount)}`} /> : null}
              <Sum label="GST" value={inr(tax)} />
              <div className="flex items-baseline justify-between border-t border-dashed border-border pt-4">
                <dt className="text-sm font-semibold">To collect</dt>
                <dd className="num text-4xl font-semibold tracking-tight">{inr(total)}</dd>
              </div>
            </dl>

            <div className="border-t border-border p-5">
              <p className="eyebrow">Payment</p>
              <div role="radiogroup" aria-label="Payment method" className="mt-2 grid grid-cols-4 overflow-hidden rounded-md border border-border">
                {METHODS.map((m) => (
                  <button
                    key={m.name}
                    role="radio"
                    aria-checked={method === m.name}
                    onClick={() => setMethod(m.name)}
                    title={`Alt+${m.key}`}
                    className={`ring-focus flex flex-col items-center gap-1 border-r border-border py-2.5 text-[11px] font-semibold last:border-r-0 ${
                      method === m.name ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <m.icon className="h-4 w-4" aria-hidden />
                    {m.name}
                  </button>
                ))}
              </div>

              {method === 'Cash' ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Received
                    <input
                      inputMode="numeric"
                      value={tendered}
                      onChange={(e) => setTendered(e.target.value.replace(/\D/g, ''))}
                      placeholder={String(total)}
                      className="num ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground"
                    />
                  </label>
                  <div className="text-xs text-muted-foreground">
                    Return
                    <p className={`num mt-1 flex h-10 items-center text-lg font-semibold ${tendered && cash < total ? 'text-destructive' : 'text-foreground'}`}>
                      {tendered && cash < total ? `short ${inr(total - cash)}` : inr(change)}
                    </p>
                  </div>
                </div>
              ) : null}
              {method === 'Credit' ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {!customerId ? 'Choose a customer to bill on credit.' : 'Added to their balance as due. You can collect it from Payments.'}
                </p>
              ) : null}

              <button
                onClick={save}
                disabled={!canSave || saving}
                className="ring-focus mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving…' : `Save bill · ${inr(total)}`} <Kbd tone="dark">F9</Kbd>
              </button>
              {saveError ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                  {saveError}
                </p>
              ) : null}
              {overs.length ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                  Reduce {overs[0].product.name} — not enough on the shelf.
                </p>
              ) : null}
              {rows.length && !saved ? (
                <button onClick={() => setLines([])} className="ring-focus mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" aria-hidden /> Discard this bill
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
      <ProductModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={createProduct} saving={creatingProduct} error={productFormError} />
      <ToastHost toast={toast} />
    </AppShell>
  )
}

function Sum({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  )
}

function Kbd({ children, tone }) {
  return <kbd className={`num rounded border px-1.5 py-0.5 text-[10px] ${tone ? 'border-primary-foreground/30' : 'border-border bg-surface'}`}>{children}</kbd>
}




