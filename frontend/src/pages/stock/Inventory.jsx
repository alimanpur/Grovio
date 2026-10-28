import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Search } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { EmptyState, Meter, Panel } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtDate, relTime } from '@/lib/format.js'

const DAY = 86400000

/** Status is derived from stock vs minimum and the expiry date, exactly as the
 * service computes it, so the badge in the list can never disagree with the
 * server-side low-stock filter. */
function statusOf(p) {
  if (p.stock === 0) return 'Out'
  if (p.expiry) {
    const d = (new Date(p.expiry).getTime() - Date.now()) / DAY
    if (d < 0) return 'Expired'
    if (d <= 30) return 'Expiring'
  }
  if (p.stock <= p.minStock) return 'Low'
  return 'OK'
}

const LABEL = { Out: 'Out of stock', Low: 'Low stock', Expired: 'Expired', Expiring: 'Expiring soon', OK: 'Healthy' }
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Needs action' },
  { id: 'expiring', label: 'Expiry' },
]

export default function Inventory() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 350)
  const [open, setOpen] = useState(null)
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState(null)
  const [reasons, setReasons] = useState([])
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  const inventory = useApi((q) => api.inventory.list(q), { sync: true })

  // The stock tab maps onto server-side filters so paging stays consistent.
  useEffect(() => {
    inventory.setFilter({
      search: debounced,
      lowStock: filter === 'low' ? 'true' : undefined,
      expiring: filter === 'expiring' ? 'true' : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debounced])

  useEffect(() => {
    api.inventory.reasons().then((r) => setReasons(r?.data?.reasons || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (reasons.length && !reason) setReason(reasons[0])
  }, [reasons, reason])

  const items = inventory.data?.items || []
  const summary = inventory.data?.summary || {}
  const history = useApi((q) => api.inventory.history(q), { immediate: true })
  const moves = history.data?.items || []

  const rows = useMemo(() => items.map((p) => ({ p, s: statusOf(p) })), [items])
  const counts = {
    all: summary.products || rows.length,
    low: summary.low || rows.filter((r) => r.s === 'Low' || r.s === 'Out').length,
    expiring: summary.expiring || rows.filter((r) => r.s === 'Expired' || r.s === 'Expiring').length,
  }

  const saveAdjustment = async (product) => {
    if (!delta) return
    setBusy(true)
    try {
      const res = await api.inventory.adjust(product.id, { delta, reason })
      show(`${res.data.item.name}: ${product.stock} → ${res.data.item.stock}`)
      setDelta(0)
      setOpen(null)
      inventory.refresh()
      history.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Inventory</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What runs out next?</h1>
        </div>
        <Link
          to="/app/purchases"
          className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Reorder stock
        </Link>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'inventory-levels', label: 'Stock levels', count: rows.length }, { id: 'inventory-movements', label: 'Movements' }]} />

        <Section id="inventory-levels" title="Stock levels" hint="Adjustments are recorded with a reason and the person who made them.">
          <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
            <Fig label="Stock value at cost" value={inr(summary.stockValue || 0)} />
            <Fig label="Products tracked" value={num(summary.products || 0)} />
            <Fig label="Low or out" value={num(counts.low)} warn />
            <Fig label="Expired or expiring" value={num(counts.expiring)} warn />
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search stock"
                placeholder="Name, brand or SKU"
                className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div role="tablist" className="flex overflow-hidden rounded-md border border-border">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`ring-focus px-3 text-xs font-semibold ${filter === f.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {f.label} <span className="num opacity-70">{num(counts[f.id])}</span>
                </button>
              ))}
            </div>
          </div>

          <DataState
            loading={inventory.loading}
            error={inventory.error}
            onRetry={inventory.refresh}
            skeleton={
              <div className="mt-6">
                <DataState.Skeleton rows={6} />
              </div>
            }
            empty={
              <div className="mt-6">
                <EmptyState
                  title={filter === 'all' ? 'No products yet' : 'Nothing needs attention'}
                  body={
                    filter === 'all'
                      ? 'Add products first, then this page tracks what runs out next.'
                      : 'Every shelf is above its minimum and nothing is close to expiry.'
                  }
                />
              </div>
            }
          >
            {rows.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="Nothing matches" body="No product matches this search." />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[46rem] border-t border-foreground/80 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 font-semibold">Product</th>
                      <th className="py-3 font-semibold">Status</th>
                      <th className="py-3 text-right font-semibold">On hand</th>
                      <th className="py-3 pl-6 font-semibold">Shelf</th>
                      <th className="py-3 text-right font-semibold">Expiry</th>
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border border-b border-border">
                    {rows.map(({ p, s }) => (
                      <StockRow
                        key={p.id}
                        p={p}
                        s={s}
                        open={open === p.id}
                        delta={delta}
                        setDelta={setDelta}
                        reason={reason}
                        setReason={setReason}
                        reasons={reasons}
                        busy={busy}
                        onToggle={() => {
                          setOpen(open === p.id ? null : p.id)
                          setDelta(0)
                        }}
                        onSave={() => saveAdjustment(p)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        </Section>

        <Section
          id="inventory-movements"
          title="Movements"
          hint="Every change to stock — sales, purchases and manual adjustments."
          action={
            <Link to="/app/pulse" className="text-xs font-semibold text-primary hover:underline">
              All in Pulse
            </Link>
          }
        >
          <Panel>
            <ol className="divide-y divide-border">
              {moves.length === 0 ? (
                <li className="py-6 text-sm text-muted-foreground">No stock movements recorded yet.</li>
              ) : (
                moves.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{m.product}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.delta > 0 ? '+' : ''}
                        {num(m.delta)} · {m.reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-sm font-semibold">
                        {num(m.stockBefore)} → {num(m.stockAfter)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.actor || 'System'} · {relTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </Panel>
        </Section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}

function StockRow({ p, s, open, delta, setDelta, reason, setReason, reasons, busy, onToggle, onSave }) {
  const pct = Math.min(100, (p.stock / Math.max(1, p.maxStock)) * 100)
  const minPct = Math.min(100, (p.minStock / Math.max(1, p.maxStock)) * 100)
  const bad = s !== 'OK'
  return (
    <>
      <tr className={open ? 'bg-accent/60' : ''}>
        <td className="py-3 pr-3">
          <span className="block font-semibold">{p.name}</span>
          <span className="num block text-xs text-muted-foreground">
            {p.sku} · {p.category || 'Uncategorised'}
          </span>
        </td>
        <td className="py-3">
          <StatusBadge tone={s === 'OK' ? 'ok' : s === 'Low' || s === 'Expiring' ? 'warn' : 'danger'}>{LABEL[s]}</StatusBadge>
        </td>
        <td className="num py-3 text-right font-semibold">
          {num(p.stock)} <span className="font-normal text-muted-foreground">{p.unit}</span>
        </td>
        <td className="py-3 pl-6">
          <span className="relative block h-1.5 w-28 rounded-full bg-muted" aria-label={`${p.stock} of ${p.maxStock}, minimum ${p.minStock}`}>
            <span className={`absolute inset-y-0 left-0 rounded-full ${p.stock <= p.minStock ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
            <span className="absolute -top-1 h-3.5 w-px bg-foreground/60" style={{ left: `${minPct}%` }} />
          </span>
        </td>
        <td className="num py-3 text-right text-xs text-muted-foreground">{p.expiry ? fmtDate(p.expiry, { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
        <td className="py-3 text-right">
          <button
            onClick={onToggle}
            aria-expanded={open}
            className="ring-focus rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface"
          >
            {open ? 'Close' : 'Adjust'}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-accent/60">
          <td colSpan={6} className="pb-4">
            <form
              className="flex flex-wrap items-end gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                onSave()
              }}
            >
              <div className="text-xs text-muted-foreground">
                Change
                <span className="mt-1 flex items-center rounded-md border border-border bg-surface">
                  <button type="button" onClick={() => setDelta((d) => Math.max(-p.stock, d - 1))} className="ring-focus grid h-10 w-10 place-items-center" aria-label="Remove one">
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <input
                    value={delta}
                    inputMode="numeric"
                    aria-label="Quantity change"
                    onChange={(e) => setDelta(Math.max(-p.stock, parseInt(e.target.value, 10) || 0))}
                    className="num h-10 w-14 bg-transparent text-center text-sm font-semibold text-foreground outline-none"
                  />
                  <button type="button" onClick={() => setDelta((d) => d + 1)} className="ring-focus grid h-10 w-10 place-items-center" aria-label="Add one">
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </span>
              </div>
              <label className="text-xs text-muted-foreground">
                Reason
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="ring-focus mt-1 h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground"
                >
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <p className="num pb-2.5 text-sm">
                {p.stock} → <span className="font-semibold">{Math.max(0, p.stock + delta)}</span> {p.unit}
              </p>
              <button
                disabled={!delta || busy}
                className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                {busy ? 'Saving…' : 'Save adjustment'}
              </button>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function Fig({ label, value, warn }) {
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${warn && value !== '0' ? 'text-destructive' : ''}`}>{value}</dd>
    </div>
  )
}
