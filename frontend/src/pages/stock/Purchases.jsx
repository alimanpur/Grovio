import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, Plus, Trash2, X, Ban } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { EmptyState, Panel } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, Confirm, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num, fmtDate } from '@/lib/format.js'

const OPEN = (s) => s !== 'Goods received' && s !== 'Cancelled'
const FILTERS = [
  { id: 'Open', label: 'Open' },
  { id: 'Goods received', label: 'Received' },
  { id: 'All', label: 'All' },
]
const field = 'ring-focus h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

export default function Purchases() {
  const [filter, setFilter] = useState('Open')
  const [raising, setRaising] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  const purchases = useApi((q) => api.purchases.list(q), { sync: true })
  const products = useApi((q) => api.products.list(q), { sync: true })
  const suppliers = useApi((q) => api.suppliers.list(q), { sync: true })

  useEffect(() => {
    purchases.setFilter({ status: filter === 'All' ? undefined : filter })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const summary = purchases.data?.summary || {}
  const list = purchases.data?.items || []
  const low = (products.data?.items || []).filter((p) => p.stock <= p.minStock)

  const receive = async (po) => {
    try {
      const res = await api.purchases.receive(po.id, {})
      show(`${po.orderNo} received · stock updated`)
      void res
      purchases.refresh()
      products.refresh()
    } catch (err) {
      show(err.message, 'error')
    }
  }

  const cancel = async () => {
    if (!cancelTarget) return
    setBusy(true)
    try {
      await api.purchases.cancel(cancelTarget.id, cancelReason)
      show(`${cancelTarget.orderNo} cancelled`)
      setCancelTarget(null)
      setCancelReason('')
      purchases.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const counts = useMemo(() => {
    const byStatus = summary.byStatus || {}
    return {
      Open: (byStatus.Ordered?.count || 0) + (byStatus['In transit']?.count || 0),
      'Goods received': byStatus['Goods received']?.count || 0,
      All: list.length,
    }
  }, [summary, list.length])

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Purchases</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What's still on the way?</h1>
        </div>
        <button
          onClick={() => setRaising(true)}
          className="ring-focus inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden /> New purchase order
        </button>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'purchases-open', label: 'Open orders' }, { id: 'purchases-all', label: 'All orders', count: counts.All }]} />

        <Section id="purchases-open" title="Open orders" hint="Only received goods add to inventory, and each order can be received once.">
          <dl className="grid grid-cols-3 border-y border-border">
            <Fig label="Open orders" value={num(counts.Open)} />
            <Fig label="Value on the way" value={inr(summary.openValue || 0)} />
            <Fig label="Products below minimum" value={num(low.length)} warn={low.length > 0} />
          </dl>
        </Section>

        <Section id="purchases-all" title="All purchase orders">
          {raising ? (
            <RaisePO
              onClose={() => setRaising(false)}
              onDone={() => {
                setRaising(false)
                setFilter('Open')
                purchases.refresh()
                products.refresh()
              }}
              products={products.data?.items || []}
              suppliers={suppliers.data?.items || []}
            />
          ) : null}

          {!raising && low.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-destructive bg-surface px-4 py-3">
              <p className="text-sm">
                <span className="font-semibold">{low.length} products are below their minimum</span>
                <span className="text-muted-foreground">
                  {' '}— {low.slice(0, 3).map((p) => p.name).join(', ')}
                  {low.length > 3 ? '…' : ''}
                </span>
              </p>
              <button onClick={() => setRaising(true)} className="ring-focus text-sm font-semibold text-primary hover:underline">
                Draft an order for them
              </button>
            </div>
          ) : null}

          <div className="panel mt-6 p-0">
            <div role="tablist" className="flex w-fit overflow-hidden rounded-md border border-border">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`ring-focus h-9 px-4 text-xs font-semibold ${filter === f.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mt-4 px-4 pb-4">
              <DataState
                loading={purchases.loading}
                error={purchases.error}
                onRetry={purchases.refresh}
                skeleton={<DataState.Skeleton rows={5} />}
                empty={
                  <EmptyState
                    title={filter === 'Open' ? 'Nothing on the way' : 'No orders here yet'}
                    body="Raise a purchase order and it will appear here until the goods arrive."
                    action={
                      <Button size="sm" onClick={() => setRaising(true)}>
                        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                        New purchase order
                      </Button>
                    }
                  />
                }
              >
                {list.length === 0 ? (
                  <EmptyState title="Nothing here" body="No purchase order matches this filter." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="py-3 font-semibold">Order</th>
                          <th className="py-3 font-semibold">Supplier</th>
                          <th className="py-3 text-right font-semibold">Units</th>
                          <th className="py-3 text-right font-semibold">Value</th>
                          <th className="py-3 pl-6 font-semibold">Status</th>
                          <th className="py-3 font-semibold">Payment</th>
                          <th className="w-40" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border border-b border-border">
                        {list.map((po) => (
                          <PORow
                            key={po.id}
                            po={po}
                            onReceive={() => receive(po)}
                            onCancel={() => setCancelTarget(po)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DataState>
            </div>
          </div>
        </Section>
      </div>

      <Confirm
        open={Boolean(cancelTarget)}
        title={`Cancel ${cancelTarget?.orderNo}?`}
        body="Cancelling an order that has not been received removes it from your outstanding dues. Received orders can only be corrected through a supplier return."
        confirmLabel="Cancel order"
        tone="danger"
        busy={busy}
        onConfirm={cancel}
        onCancel={() => {
          setCancelTarget(null)
          setCancelReason('')
        }}
        custom={
          <label className="mt-4 block text-xs text-muted-foreground">
            Reason
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
              placeholder="Supplier could not deliver"
            />
          </label>
        }
      />
      <ToastHost toast={toast} />
    </AppShell>
  )
}

function PORow({ po, onReceive, onCancel }) {
  const isOpen = OPEN(po.status)
  const outstanding = po.total - po.amountPaid
  return (
    <tr>
      <td className="py-3">
        <span className="num font-semibold">{po.orderNo}</span>
        <span className="num block text-xs text-muted-foreground">{fmtDate(po.orderedAt)}</span>
      </td>
      <td className="py-3">
        {po.supplier}
        <span className="block max-w-[18rem] truncate text-xs text-muted-foreground">
          {po.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}
        </span>
      </td>
      <td className="num py-3 text-right">{num(po.lines.reduce((a, l) => a + l.qty, 0))}</td>
      <td className="num py-3 text-right font-semibold">{inr(po.total)}</td>
      <td className="py-3 pl-6">
        <StatusBadge tone={po.status === 'Goods received' ? 'ok' : po.status === 'Cancelled' ? 'danger' : 'warn'}>{po.status}</StatusBadge>
      </td>
      <td className={`py-3 text-[11px] font-semibold uppercase tracking-wider ${outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
        {outstanding > 0 ? `${inr(outstanding)} due` : 'Paid'}
      </td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-1.5">
          {isOpen ? (
            <>
              <button
                onClick={onReceive}
                className="ring-focus inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <PackageCheck className="h-3.5 w-3.5" aria-hidden /> Receive
              </button>
              <button
                onClick={onCancel}
                aria-label={`Cancel ${po.orderNo}`}
                className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          ) : (
            <Link to="/app/inventory" className="text-xs font-semibold text-primary hover:underline">
              In stock
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}

function RaisePO({ onClose, onDone, products, suppliers }) {
  const lowFirst = products.filter((p) => p.stock <= p.minStock)
  const [supplier, setSupplier] = useState(lowFirst[0]?.supplierId ?? suppliers[0]?.id ?? '')
  const forSupplier = products.filter((p) => p.supplierId === supplier)
  const suggest = (id) => {
    const p = products.find((x) => x.id === id)
    return { productId: id, qty: Math.max(1, p.maxStock - p.stock), cost: p.purchasePrice || 0 }
  }
  const [lines, setLines] = useState(() => forSupplier.filter((p) => p.stock <= p.minStock).map((p) => suggest(p.id)))
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const value = lines.reduce((a, l) => a + l.qty * l.cost, 0)
  const addable = forSupplier.filter((p) => !lines.some((l) => l.productId === p.id))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.purchases.create({
        supplierId: supplier,
        supplierInvoiceNo,
        expectedAt: expectedAt || null,
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, cost: l.cost })),
      })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      aria-label="New purchase order"
      className="animate-rise mt-6 rounded-md border border-foreground/80 bg-surface p-5"
      onSubmit={submit}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">New purchase order</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="ring-focus rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">
          Supplier
          <select
            value={supplier}
            onChange={(e) => {
              setSupplier(e.target.value)
              setLines(products.filter((p) => p.supplierId === e.target.value && p.stock <= p.minStock).map((p) => suggest(p.id)))
            }}
            className={`${field} mt-1 block w-full`}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Supplier invoice no.
          <input
            value={supplierInvoiceNo}
            onChange={(e) => setSupplierInvoiceNo(e.target.value)}
            className={`${field} mt-1 block w-full`}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Expected by
          <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className={`${field} mt-1 block w-full`} />
        </label>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Low-stock products from this supplier are added for you, topped up towards their maximum.</p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 font-semibold">Product</th>
            <th className="py-2 font-semibold">On hand</th>
            <th className="py-2 font-semibold">Order qty</th>
            <th className="py-2 font-semibold">Cost (₹)</th>
            <th className="py-2 text-right font-semibold">Amount</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-y border-border">
          {lines.map((l) => {
            const p = products.find((x) => x.id === l.productId)
            const set = (k) => (e) =>
              setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, [k]: Math.max(0, Number(e.target.value) || 0) } : x)))
            return (
              <tr key={l.productId}>
                <td className="py-2 font-semibold">{p.name}</td>
                <td className={`num py-2 ${p.stock <= p.minStock ? 'text-destructive' : ''}`}>
                  {p.stock} / min {p.minStock}
                </td>
                <td className="py-2">
                  <input aria-label={`Quantity of ${p.name}`} inputMode="numeric" value={l.qty} onChange={set('qty')} className={`num ${field} w-20`} />
                </td>
                <td className="py-2">
                  <input aria-label={`Cost of ${p.name}`} inputMode="decimal" value={l.cost} onChange={set('cost')} className={`num ${field} w-24`} />
                </td>
                <td className="num py-2 text-right font-semibold">{inr(l.qty * l.cost)}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}
                    aria-label={`Remove ${p.name}`}
                    className="ring-focus p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </td>
              </tr>
            )
          })}
          {lines.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-sm text-muted-foreground">Nothing from this supplier is low. Add products below.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {addable.length ? (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setLines((ls) => [...ls, suggest(e.target.value)])
            }}
            aria-label="Add a product"
            className={field}
          >
            <option value="">+ Add a product from this supplier</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4">
          <p className="num text-sm">
            Order value <span className="text-lg font-semibold">{inr(value)}</span>
          </p>
          <button disabled={saving || !lines.length} className="ring-focus h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {saving ? 'Raising…' : 'Raise order'}
          </button>
        </div>
      </div>
    </form>
  )
}

function Fig({ label, value, warn }) {
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${warn ? 'text-destructive' : ''}`}>{value}</dd>
    </div>
  )
}


