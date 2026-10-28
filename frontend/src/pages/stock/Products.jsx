import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Archive, Package, Pencil, Plus, Printer, Search } from 'lucide-react'
import { AppShell } from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, Pill, EmptyState, Meter } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, Confirm, Drawer, StatusBadge, FormErrors, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtDate } from '@/lib/format.js'

const TABS = [
  { id: 'all', label: 'All products' },
  { id: 'low', label: 'Low stock' },
  { id: 'out', label: 'Out of stock' },
  { id: 'archived', label: 'Archived' },
]

const UNITS = ['piece', 'pack', 'pouch', 'bottle', 'bag', 'carton', 'box', 'kg', 'gram', 'litre', 'ml', 'dozen']
const GST_RATES = [0, 5, 12, 18, 28]

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

const BLANK = {
  name: '',
  brand: '',
  sku: '',
  barcode: '',
  hsn: '',
  categoryId: '',
  unit: 'piece',
  sellingPrice: '',
  purchasePrice: '',
  gstRate: 0,
  stock: 0,
  minStock: 0,
  maxStock: 0,
  batch: '',
  expiry: '',
  supplierId: '',
}

export default function Products() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 350)
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [units, setUnits] = useState(UNITS)
  const [gstRates, setGstRates] = useState(GST_RATES)

  // Row detail drawer
  const [drawerProduct, setDrawerProduct] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formErrors, setFormErrors] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [toast, show] = useToast()

  const products = useApi((q) => api.products.list(q), { sync: true })
  const loadProducts = products.refresh

  // Translate the active tab into the query the API understands.
  useEffect(() => {
    const patch = { search: debouncedSearch, tab }
    if (tab === 'low') patch.lowStock = 'true'
    if (tab === 'out') patch.outOfStock = 'true'
    if (tab === 'archived') patch.archived = 'true'
    products.setFilter({ ...patch, tab: undefined, lowStock: tab === 'low' ? 'true' : undefined, outOfStock: tab === 'out' ? 'true' : undefined, archived: tab === 'archived' ? 'true' : undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedSearch])

  // Reference data for the form's category / supplier pickers.
  useEffect(() => {
    let alive = true
    Promise.all([
      api.categories.list().catch(() => ({ data: { items: [] } })),
      api.suppliers.list().catch(() => ({ data: { items: [] } })),
      api.meta().catch(() => ({
        data: { units: UNITS, gstRates: GST_RATES },
      })),
    ]).then(([cats, sups, meta]) => {
      if (!alive) return
      setCategories(cats?.data?.items || [])
      setSuppliers(sups?.data?.items || [])
      setUnits(meta?.data?.units || UNITS)
      setGstRates(meta?.data?.gstRates || GST_RATES)
    })
    return () => {
      alive = false
    }
  }, [])

  const items = products.data?.items || []
  const summary = useMemo(() => {
    let low = 0
    let out = 0
    let value = 0
    for (const p of items) {
      if (p.stock === 0) out += 1
      else if (p.stock <= p.minStock) low += 1
      value += p.stock * (p.purchasePrice || 0)
    }
    return { low, out, value, total: products.meta?.total || 0 }
  }, [items, products.meta])

  const openCreate = () => {
    setEditing(null)
    setForm(BLANK)
    setFormErrors(null)
    setFormError(null)
    setDrawerProduct(null)
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      barcode: product.barcode,
      hsn: product.hsn,
      categoryId: product.categoryId || '',
      unit: product.unit,
      sellingPrice: String(product.sellingPrice),
      purchasePrice: String(product.purchasePrice ?? 0),
      gstRate: product.gstRate,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      batch: product.batch,
      expiry: product.expiry ? String(product.expiry).slice(0, 10) : '',
      supplierId: product.supplierId || '',
    })
    setFormErrors(null)
    setFormError(null)
    setDrawerProduct(null)
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    setFormErrors(null)
    const payload = {
      ...form,
      sellingPrice: Number(form.sellingPrice),
      purchasePrice: Number(form.purchasePrice || 0),
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      maxStock: Number(form.maxStock || 0),
      expiry: form.expiry || null,
    }
    try {
      if (editing) await api.products.update(editing.id, payload)
      else await api.products.create(payload)
      show(`${payload.name || 'Product'} ${editing ? 'updated' : 'added'}`)
      setEditing(null)
      setForm(BLANK)
      loadProducts()
    } catch (err) {
      setFormError(err.message)
      setFormErrors(err.errors || null)
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      await api.products.archive(archiveTarget.id)
      show(`${archiveTarget.name} archived. Bills keep their snapshot.`)
      setArchiveTarget(null)
      setDrawerProduct(null)
      loadProducts()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <AppShell>
      <PageHead
        eyebrow="Stock · Catalogue"
        title="Products"
        question="Every SKU on your shelves, its price after GST and how much is left."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" aria-hidden />
              Print
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              New product
            </Button>
          </>
        }
      />

      <div className="mt-6 space-y-6">
        <SectionNav
          sections={[
            { id: 'products-overview', label: 'Overview' },
            { id: 'products-catalogue', label: 'Catalogue', count: items.length },
            { id: 'product-form', label: editing ? 'Edit product' : 'Add product' },
          ]}
        />

        <Section
          id="products-overview"
          title="Overview"
          hint="Totals from the products currently shown."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="panel p-5">
              <p className="eyebrow">Products</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{num(summary.total)}</p>
              <p className="mt-2 text-xs text-muted-foreground">in {categories.length} categories</p>
            </div>
            <div className="panel p-5">
              <p className="eyebrow">Stock value</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{inr(summary.value)}</p>
              <p className="mt-2 text-xs text-muted-foreground">at cost price</p>
            </div>
            <div className="panel p-5">
              <p className="eyebrow">Low stock</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{num(summary.low)}</p>
              <p className="mt-2 text-xs text-muted-foreground">at or below minimum</p>
            </div>
            <div className="panel p-5">
              <p className="eyebrow">Out of stock</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none text-destructive">{num(summary.out)}</p>
              <p className="mt-2 text-xs text-muted-foreground">cannot be billed</p>
            </div>
          </div>
        </Section>

        <Section
          id="products-catalogue"
          title="Catalogue"
          action={
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, brand…"
                aria-label="Search products"
                className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          }
        >
          <div className="panel p-0">
            {/* Tabs + filters */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={
                    tab === t.id
                      ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                      : 'rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted'
                  }
                >
                  {t.label}
                </button>
              ))}
              <label className="ml-auto text-xs text-muted-foreground">
                Category
                <select
                  value={products.query.categoryId || ''}
                  onChange={(e) => products.setFilter({ categoryId: e.target.value || undefined })}
                  className="ring-focus ml-2 h-9 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Sort
                <select
                  value={products.query.sort || 'name'}
                  onChange={(e) => products.setFilter({ sort: e.target.value })}
                  className="ring-focus ml-2 h-9 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-primary"
                >
                  <option value="name">Name</option>
                  <option value="-stock">Stock (high→low)</option>
                  <option value="stock">Stock (low→high)</option>
                  <option value="-sellingPrice">Price (high→low)</option>
                  <option value="sellingPrice">Price (low→high)</option>
                </select>
              </label>
            </div>

            <DataState
              loading={products.loading}
              error={products.error}
              onRetry={loadProducts}
              skeleton={
                <div className="p-6">
                  <DataState.Skeleton rows={6} />
                </div>
              }
              empty={
                tab === 'all' && !search ? (
                  <div className="p-6">
                    <EmptyState
                      title="No products yet"
                      body="Add the first item you sell — you can always add more or import them later."
                      action={
                        <Button size="sm" onClick={openCreate}>
                          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                          New product
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="p-6">
                    <EmptyState title="Nothing matches" body="No product matches this filter. Try a different tab or search." />
                  </div>
                )
              }
            >
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 text-right font-medium">Price</th>
                      <th className="px-4 py-3 text-right font-medium">Cost</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const ratio = p.maxStock ? (p.stock / p.maxStock) * 100 : 0
                      const tone = p.stock === 0 ? 'danger' : p.stock <= p.minStock ? 'saffron' : 'sprout'
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border/60 last:border-0 hover:bg-surface-2/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setDrawerProduct(p)}
                              className="ring-focus text-left font-semibold hover:text-primary"
                            >
                              {p.name}
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {p.brand ? `${p.brand} · ` : ''}
                              {p.sku}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{p.category || '—'}</td>
                          <td className="num px-4 py-3 text-right">{inr(p.sellingPrice)}</td>
                          <td className="num px-4 py-3 text-right text-muted-foreground">{inr(p.purchasePrice)}</td>
                          <td className="px-4 py-3">
                            <span className="num text-xs">{num(p.stock)} / {num(p.maxStock)}</span>
                            <div className="mt-1 w-24">
                              <Meter value={ratio} tone={tone} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {p.archived ? (
                              <StatusBadge tone="muted">Archived</StatusBadge>
                            ) : p.stock === 0 ? (
                              <StatusBadge tone="danger">Out of stock</StatusBadge>
                            ) : p.stock <= p.minStock ? (
                              <StatusBadge tone="warn">Low stock</StatusBadge>
                            ) : (
                              <StatusBadge tone="ok">In stock</StatusBadge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                aria-label={`Edit ${p.name}`}
                                className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={() => setArchiveTarget(p)}
                                aria-label={`Archive ${p.name}`}
                                className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
                              >
                                <Archive className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border lg:hidden">
                {items.map((p) => (
                  <li key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setDrawerProduct(p)}
                          className="ring-focus block truncate text-left font-semibold"
                        >
                          {p.name}
                        </button>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.category || 'Uncategorised'} · {p.sku}
                        </p>
                      </div>
                      <div className="num text-right text-sm font-semibold">{inr(p.sellingPrice)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {num(p.stock)} {p.unit} · min {num(p.minStock)}
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="ring-focus h-8 rounded-md border border-border px-2.5 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(p)}
                          className="ring-focus h-8 rounded-md border border-border px-2.5 text-xs font-semibold"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {products.meta && products.meta.pages > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    Page {products.meta.page} of {products.meta.pages} · {num(products.meta.total)} products
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={products.meta.page <= 1}
                      onClick={() => products.setFilter({ page: products.meta.page - 1 })}
                      className="ring-focus h-8 rounded-md border border-border px-3 font-semibold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={products.meta.page >= products.meta.pages}
                      onClick={() => products.setFilter({ page: products.meta.page + 1 })}
                      className="ring-focus h-8 rounded-md border border-border px-3 font-semibold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </DataState>
          </div>
        </Section>

        <Section
          id="product-form"
          title={editing ? `Edit ${editing.name}` : 'Add product'}
          hint="Price must be more than ₹0. Cost above price is allowed for clearance items."
        >
          <Panel title={editing ? 'Edit product' : 'New product'} className="max-w-3xl">
            {formError ? (
              <div className="mb-4">
                <FormErrors errors={formErrors} />
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {formError}
                </p>
              </div>
            ) : null}
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Aashirvaad Atta 10 kg"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Brand
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                SKU
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                  className={inputCls}
                  placeholder="leave blank to generate"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Barcode
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Category
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Supplier
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">None</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Unit
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className={inputCls}
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                GST rate
                <select
                  value={form.gstRate}
                  onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })}
                  className={inputCls}
                >
                  {gstRates.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Selling price (₹)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Cost price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Stock on hand
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Minimum stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Maximum stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.maxStock}
                  onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Batch
                <input
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Expiry
                <input
                  type="date"
                  value={form.expiry}
                  onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                  className={inputCls}
                />
              </label>
              <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t border-border pt-4">
                {editing ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
                    Cancel edit
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
                </Button>
              </div>
            </form>
          </Panel>
        </Section>
      </div>

      {/* Product detail drawer */}
      <Drawer
        open={Boolean(drawerProduct)}
        title={drawerProduct?.name}
        subtitle={drawerProduct ? `${drawerProduct.sku} · ${drawerProduct.category || 'Uncategorised'}` : ''}
        onClose={() => setDrawerProduct(null)}
        footer={
          <div className="flex justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => openEdit(drawerProduct)}>
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setArchiveTarget(drawerProduct)}>
              <Archive className="mr-1.5 h-4 w-4" aria-hidden />
              Archive
            </Button>
          </div>
        }
      >
        {drawerProduct ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Selling price', inr(drawerProduct.sellingPrice)],
              ['Cost price', inr(drawerProduct.purchasePrice)],
              ['GST rate', `${drawerProduct.gstRate}%`],
              ['Stock', `${num(drawerProduct.stock)} ${drawerProduct.unit}`],
              ['Minimum', num(drawerProduct.minStock)],
              ['Maximum', num(drawerProduct.maxStock)],
              ['Supplier', drawerProduct.supplier || '—'],
              ['Batch', drawerProduct.batch || '—'],
              ['Expiry', fmtDate(drawerProduct.expiry)],
              ['Added', fmtDate(drawerProduct.createdAt)],
              ['Barcode', drawerProduct.barcode || '—'],
              ['HSN', drawerProduct.hsn || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Drawer>

      <Confirm
        open={Boolean(archiveTarget)}
        title={`Archive ${archiveTarget?.name}?`}
        body="Archived products cannot be billed again, but every past bill and purchase keeps its record. You can restore it later."
        confirmLabel="Archive"
        tone="danger"
        busy={archiving}
        onConfirm={archive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ToastHost toast={toast} />
    </AppShell>
  )
}
