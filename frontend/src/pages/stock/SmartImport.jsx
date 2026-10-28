import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, FileText, FileSpreadsheet, Plus, Trash2, UploadCloud } from 'lucide-react'
import { AppShell } from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, Pill } from '@/components/grovio/kit.jsx'
import { DataState, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num } from '@/lib/format.js'

/** Columns the importer understands, in the order the template uses. */
const TEMPLATE_HEADER = ['Product', 'SKU', 'Quantity', 'Cost', 'Category', 'Unit', 'Minimum', 'GST']
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 2000

/** Parses a CSV file into rows of strings, honouring quoted fields. */
const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') {
      quoted = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((v) => v.trim() !== '')) rows.push(row)
      row = []
      continue
    }
    field += ch
  }
  row.push(field)
  if (row.some((v) => v.trim() !== '')) rows.push(row)
  return rows
}

/** One CSV row → a validated draft line plus its row-level errors. */
const validateRow = (cells, index, existingSkus) => {
  const errors = []
  const get = (i) => (cells[i] ?? '').trim()
  const name = get(0)
  const sku = (get(1) || '').toUpperCase()
  const qty = Number.parseInt(get(2), 10)
  const cost = Number.parseFloat(get(3))
  const min = Number.parseInt(get(5), 10)
  const gst = Number.parseFloat(get(6))

  if (!name) errors.push('Product name is required')
  if (!sku) errors.push('SKU is required')
  if (existingSkus.has(sku)) errors.push('That SKU already exists — it would be updated, not duplicated')
  if (!Number.isInteger(qty) || qty < 0) errors.push('Quantity must be a whole number')
  if (!Number.isFinite(cost) || cost < 0) errors.push('Cost must be a number')
  if (get(5) !== '' && (!Number.isInteger(min) || min < 0)) errors.push('Minimum must be a whole number')
  if (get(6) !== '' && ![0, 5, 12, 18, 28].includes(gst)) errors.push('GST must be 0, 5, 12, 18 or 28')

  return {
    index,
    cells,
    name,
    sku,
    qty: Number.isInteger(qty) ? qty : 0,
    cost: Number.isFinite(cost) ? cost : 0,
    category: get(4),
    unit: get(5) === '' ? 'piece' : get(5),
    min: Number.isInteger(min) ? min : 0,
    gst: Number.isFinite(gst) ? gst : 0,
    errors,
  }
}

export default function SmartImport() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [supplier, setSupplier] = useState('')
  const [ref, setRef] = useState('')
  const [lines, setLines] = useState([{ key: 1, productId: '', qty: 0, cost: 0 }])
  const [done, setDone] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const urlRef = useRef('')
  const [toast, show] = useToast()

  const products = useApi((q) => api.products.list(q), { sync: true })
  const suppliers = useApi((q) => api.suppliers.list(q), { sync: true })

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  const catalogue = useMemo(() => {
    const all = products.data?.items || []
    return [...all].sort((a, b) => Number(b.supplierId === supplier) - Number(a.supplierId === supplier))
  }, [products.data, supplier])

  const total = lines.reduce((a, l) => a + l.qty * l.cost, 0)
  const set = (key, patch) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const pick = (f) => {
    if (!f) return
    if (f.size > MAX_BYTES) {
      show('That file is over 5 MB.', 'error')
      return
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(f)
    urlRef.current = url
    setFile({ name: f.name, url, isPdf: f.type === 'application/pdf' })
    setPendingFile(f)
    setPreview(null)
    setDone(null)
  }

  /** Reads the CSV server-side? No — parsing happens in the browser, and each
   * row is validated before anything is sent. */
  const readCsv = useCallback(async () => {
    if (!pendingFile) return
    setImporting(true)
    try {
      const text = await pendingFile.text()
      const rows = parseCsv(text)
      if (rows.length < 2) {
        setPreview({ header: rows[0] || [], rows: [], error: 'That file has no data rows below the header.' })
        return
      }
      const header = rows[0].map((h) => h.trim())
      const existingSkus = new Set((products.data?.items || []).map((p) => p.sku))
      const parsed = rows.slice(1, MAX_ROWS + 1).map((cells, i) => validateRow(cells, i + 2, existingSkus))
      setPreview({ header, rows: parsed, truncated: rows.length - 1 > MAX_ROWS })
    } catch (err) {
      setPreview({ header: [], rows: [], error: 'That file could not be read as CSV.' })
      void err
    } finally {
      setImporting(false)
    }
  }, [pendingFile, products.data])

  const draftLines = useMemo(() => {
    if (!preview?.rows?.length) return []
    return preview.rows
      .filter((r) => r.qty > 0 && !r.errors.some((e) => e.startsWith('Product name') || e.startsWith('SKU is required')))
      .map((r) => ({ key: r.index, sku: r.sku, name: r.name, qty: r.qty, cost: r.cost, category: r.category, unit: r.unit, min: r.min, gst: r.gst, errors: r.errors }))
  }, [preview])

  const validCount = draftLines.filter((l) => l.errors.length === 0).length
  const invalidCount = draftLines.length - validCount

  /** Creates any products that don't exist yet, then raises one purchase
   * order for the whole invoice so stock lands in a single audit event. */
  const confirmImport = async () => {
    const ready = draftLines.filter((l) => l.errors.length === 0)
    if (!ready.length) {
      show('Nothing ready to import — fix the highlighted rows first.', 'error')
      return
    }
    if (!supplier) {
      show('Choose the supplier this invoice came from.', 'error')
      return
    }
    setImporting(true)
    try {
      const created = []
      for (const line of ready) {
        const existing = (products.data?.items || []).find((p) => p.sku === line.sku)
        if (existing) {
          created.push(existing.id)
        } else {
          const res = await api.products.create({
            name: line.name,
            sku: line.sku,
            categoryName: line.category || '',
            unit: line.unit === 'piece' ? 'piece' : line.unit,
            sellingPrice: Math.max(1, Math.round((line.cost + Number.EPSILON) * 100) / 100),
            purchasePrice: line.cost,
            gstRate: line.gst,
            minStock: line.min,
            maxStock: Math.max(line.min + 10, line.qty * 2),
            stock: 0,
          })
          created.push(res.data.item.id)
        }
      }

      const po = await api.purchases.create({
        supplierId: supplier,
        supplierInvoiceNo: ref,
        lines: ready.map((l, i) => ({ productId: created[i], qty: l.qty, cost: Math.round(l.cost * 100) })),
      })
      await api.purchases.receive(po.data.item.id, {})
      setDone({ orderNo: po.data.item.id, count: ready.length })
      show(`${po.data.item.orderNo} received into stock · ${ready.length} product(s)`)
      setPreview(null)
      setPendingFile(null)
      setRef('')
      products.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  const confirmManual = async () => {
    if (lines.some((l) => l.qty > 0 && !l.productId)) {
      show('Choose a product for every line with a quantity.', 'error')
      return
    }
    if (!lines.length || lines.every((l) => !l.productId)) {
      show('Add at least one product line.', 'error')
      return
    }
    if (!supplier) {
      show('Choose the supplier this invoice came from.', 'error')
      return
    }
    setImporting(true)
    try {
      const chosen = lines.filter((l) => l.productId)
      const po = await api.purchases.create({
        supplierId: supplier,
        supplierInvoiceNo: ref,
        lines: chosen.map((l) => ({ productId: l.productId, qty: l.qty, cost: Math.round(l.cost * 100) })),
      })
      await api.purchases.receive(po.data.item.id, {})
      setDone({ orderNo: po.data.item.id, count: chosen.length })
      show(`${po.data.item.orderNo} received into stock`)
      setLines([{ key: Date.now(), productId: '', qty: 0, cost: 0 }])
      setRef('')
      products.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppShell focus={{ title: 'Smart Import', subtitle: 'Invoice on one side, stock entry on the other', exitTo: '/app/purchases', exitLabel: 'Back to purchases' }}>
      <PageHead
        eyebrow="Stock"
        title="Smart Import"
        question="Can I add this supplier invoice to stock quickly?"
        actions={<Pill tone="muted">Automatic reading is planned — see Future Lab</Pill>}
      />

      <div className="mt-8 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="1. The supplier's invoice" hint="Open the PDF or photo here so you can read it while you enter lines. It stays on this screen only.">
          {file ? (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate font-semibold">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setPendingFile(null)
                    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
                    urlRef.current = ''
                  }}
                  className="ring-focus text-xs font-semibold text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
              {file.isPdf ? (
                <iframe title="Supplier invoice" src={file.url} className="h-[32rem] w-full rounded-lg border border-border" />
              ) : (
                <img src={file.url} alt="Supplier invoice" className="max-h-[32rem] w-full rounded-lg border border-border object-contain" />
              )}
            </div>
          ) : (
            <label className="ring-focus flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/50 px-6 py-16 text-center transition-colors hover:border-sprout">
              <UploadCloud className="h-7 w-7 text-primary" aria-hidden />
              <span className="mt-3 text-sm font-semibold">Choose the invoice, or a CSV of its lines</span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG or CSV · up to 5 MB</span>
              <span className="mt-3 text-[11px] text-muted-foreground">
                CSV columns: {TEMPLATE_HEADER.join(', ')}
              </span>
              <input
                type="file"
                accept="application/pdf,image/*,.csv,text/csv"
                className="sr-only"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </label>
          )}
        </Panel>

        <Panel title="2. Import and receive" hint="Nothing changes until you confirm. Duplicate SKUs are refused, never silently duplicated.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Supplier
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm"
              >
                <option value="">Choose supplier</option>
                {(suppliers.data?.items || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Their invoice number <span className="font-normal text-muted-foreground">(for your reference)</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className="ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm" />
            </label>
          </div>

          {/* CSV import flow */}
          {pendingFile ? (
            <div className="mt-5 rounded-xl border border-border bg-surface-2/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden />
                  {pendingFile.name}
                </p>
                <Button size="sm" variant="outline" onClick={readCsv} disabled={importing}>
                  {importing ? 'Reading…' : preview ? 'Re-check the file' : 'Check this file'}
                </Button>
              </div>

              {preview ? (
                preview.error ? (
                  <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                    {preview.error}
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone="ok">{num(validCount)} rows ready</StatusBadge>
                      {invalidCount ? <StatusBadge tone="danger">{num(invalidCount)} rows need fixing</StatusBadge> : null}
                      <StatusBadge tone="muted">{num(preview.rows.length)} rows found</StatusBadge>
                    </div>
                    {preview.truncated ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Only the first {num(MAX_ROWS)} rows were checked. Split larger files and import them one at a time.
                      </p>
                    ) : null}
                    <div className="mt-3 max-h-72 overflow-auto rounded-md border border-border">
                      <table className="w-full min-w-[36rem] text-xs">
                        <thead>
                          <tr className="sticky top-0 bg-surface text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-2 py-2">Row</th>
                            <th className="px-2 py-2">Product</th>
                            <th className="px-2 py-2">SKU</th>
                            <th className="px-2 py-2 text-right">Qty</th>
                            <th className="px-2 py-2 text-right">Cost</th>
                            <th className="px-2 py-2">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {draftLines.map((l) => (
                            <tr key={l.key} className={l.errors.length ? 'bg-destructive/5' : ''}>
                              <td className="num px-2 py-1.5 text-muted-foreground">{l.key}</td>
                              <td className="px-2 py-1.5 font-semibold">{l.name}</td>
                              <td className="num px-2 py-1.5">{l.sku}</td>
                              <td className="num px-2 py-1.5 text-right">{num(l.qty)}</td>
                              <td className="num px-2 py-1.5 text-right">{inr(l.cost)}</td>
                              <td className="px-2 py-1.5">
                                {l.errors.length ? (
                                  <span className="text-destructive">{l.errors[0]}</span>
                                ) : (
                                  <span className="text-sprout-foreground">Ready</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Check the file to see every row and any problems before anything is created.
                </p>
              )}
            </div>
          ) : null}

          {/* Manual entry flow */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Cost each</th>
                  <th className="pb-2 text-right">Line</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l) => (
                  <tr key={l.key}>
                    <td className="py-2 pr-2">
                      <select
                        aria-label="Product"
                        value={l.productId}
                        onChange={(e) => set(l.key, { productId: e.target.value, cost: catalogue.find((p) => p.id === e.target.value)?.purchasePrice ?? 0 })}
                        className="ring-focus h-9 w-full rounded-md border border-input bg-surface px-2"
                      >
                        <option value="">Choose product</option>
                        {catalogue.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label="Quantity"
                        type="number"
                        min={0}
                        value={l.qty || ''}
                        onChange={(e) => set(l.key, { qty: Math.max(0, Number(e.target.value) || 0) })}
                        className="num h-9 w-20 rounded-md border border-input bg-surface px-2"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label="Cost each"
                        type="number"
                        min={0}
                        value={l.cost || ''}
                        onChange={(e) => set(l.key, { cost: Math.max(0, Number(e.target.value) || 0) })}
                        className="num h-9 w-24 rounded-md border border-input bg-surface px-2"
                      />
                    </td>
                    <td className="num py-2 text-right">{inr(l.qty * l.cost)}</td>
                    <td className="py-2 pl-2">
                      <button
                        aria-label="Remove line"
                        disabled={lines.length === 1}
                        onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                        className="ring-focus text-muted-foreground hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setLines((p) => [...p, { key: Date.now(), productId: '', qty: 0, cost: 0 }])}
            className="ring-focus mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add line
          </button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 p-4">
            <div>
              <p className="eyebrow">Invoice total</p>
              <p className="num text-2xl font-semibold">{inr(total)}</p>
            </div>
            <div className="flex gap-2">
              {preview?.rows?.length ? (
                <Button onClick={confirmImport} disabled={importing || !validCount}>
                  {importing ? 'Importing…' : `Import ${validCount} row(s)`}
                </Button>
              ) : null}
              <Button onClick={confirmManual} disabled={importing} variant={preview?.rows?.length ? 'outline' : undefined}>
                Receive into stock
              </Button>
            </div>
          </div>

          <DataState loading={products.loading} error={products.error} onRetry={products.refresh}>
            <></>
          </DataState>

          {done ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-sprout" aria-hidden /> {done.orderNo} received · {num(done.count)} product(s).
              <Link to="/app/inventory" className="text-primary underline">
                See stock
              </Link>
            </p>
          ) : null}
        </Panel>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}
