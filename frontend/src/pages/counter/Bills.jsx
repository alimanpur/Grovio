import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ban, HandCoins, Printer, Search } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, EmptyState } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, Confirm, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { InvoiceDocument } from '@/components/grovio/InvoiceDocument.jsx'
import { printReceipt } from '@/lib/print.js'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtDate, fmtTime } from '@/lib/format.js'

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
]

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Credit', 'Split']
const STATUSES = ['Paid', 'Partial', 'Due', 'Refunded', 'Cancelled']

/** Today's window in the store's business day (IST). */
const istToday = () => {
  const now = new Date()
  const shifted = new Date(now.getTime() + 330 * 60000)
  const start = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
  start.setMinutes(start.getMinutes() - 330)
  return start
}

const rangeFor = (id) => {
  const end = new Date()
  if (id === 'today') return { from: istToday().toISOString(), to: end.toISOString() }
  if (id === '7d') return { from: new Date(end.getTime() - 6 * 86400000).toISOString(), to: end.toISOString() }
  if (id === '30d') return { from: new Date(end.getTime() - 29 * 86400000).toISOString(), to: end.toISOString() }
  return {}
}

export default function Bills() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const debounced = useDebounced(search, 350)
  const [selected, setSelected] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [store, setStore] = useState(null)
  const [toast, show] = useToast()

  const range = params.get('range') || '7d'
  const status = params.get('status') || ''
  const method = params.get('method') || ''

  const bills = useApi((q) => api.bills.list(q), { sync: true })

  useEffect(() => {
    const patch = { search: debounced, range: undefined, ...rangeFor(range), status: status || undefined, method: method || undefined }
    bills.setFilter(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, range, status, method])

  useEffect(() => {
    api.settings.invoice().then((r) => setSettings(r?.data?.settings)).catch(() => {})
    api.settings.preferences().then((r) => setPreferences(r?.data?.preferences)).catch(() => {})
    // Store profile so the printed invoice shows the real store details.
    api.settings.profile().then((r) => setStore(r?.data?.store)).catch(() => {})
  }, [])

  // Support deep links such as /app/bills?q=GRV-1002 from Pulse.
  useEffect(() => {
    const q = params.get('q')
    if (q) setSearch(q)
  }, [params])

  const items = bills.data?.items || []
  const summary = bills.data?.summary || {}

  const selectedBill = items.find((b) => b.id === selected) ?? items[0]

  const cancel = async () => {
    if (!cancelTarget) return
    setBusy(true)
    try {
      await api.bills.cancel(cancelTarget.id, cancelReason)
      show(`${cancelTarget.invoiceNo} cancelled · stock restored`)
      setCancelTarget(null)
      setCancelReason('')
      bills.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    if (!selectedBill || !payAmount) return
    setBusy(true)
    try {
      await api.bills.pay(selectedBill.id, { amount: Number(payAmount), method: payMethod })
      show(`Payment recorded against ${selectedBill.invoiceNo}`)
      setPayOpen(false)
      setPayAmount('')
      bills.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const rows = useMemo(() => {
    if (!selectedBill) return []
    return selectedBill.lines.map((l) => ({
      name: l.name,
      hsn: l.hsn,
      qty: l.qty,
      unit: l.unit,
      rate: l.rate,
      gstRate: l.gstRate,
      amount: l.amount,
      taxAmount: l.taxAmount,
    }))
  }, [selectedBill])

  return (
    <AppShell>
      <PageHead
        eyebrow="Counter · Bills"
        title="Bills"
        question="Every counter sale this store has made, with what was collected and what is still due."
        actions={
          <>
            <Link to="/app/billing">
              <Button size="sm">
                New bill
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={printReceipt}>
              <Printer className="mr-1.5 h-4 w-4" aria-hidden />
              Print
            </Button>
          </>
        }
      />

      <div className="mt-6 space-y-6">
        <SectionNav
          sections={[
            { id: 'bills-summary', label: 'Summary' },
            { id: 'bills-list', label: 'All bills', count: items.length },
            { id: 'bills-detail', label: selectedBill ? selectedBill.invoiceNo : 'Bill detail' },
          ]}
        />

        <Section id="bills-summary" title="Summary" hint="Across every bill you can see, before filters.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Panel>
              <p className="eyebrow">Billed</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{inr(summary.billed || 0)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{num(summary.bills || 0)} bills</p>
            </Panel>
            <Panel>
              <p className="eyebrow">Collected</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none text-sprout-foreground">{inr(summary.collected || 0)}</p>
              <p className="mt-2 text-xs text-muted-foreground">cash, UPI and card</p>
            </Panel>
            <Panel>
              <p className="eyebrow">Still to collect</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none text-destructive">{inr(summary.unpaid || 0)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{num(summary.unpaidCount || 0)} unpaid or partly paid</p>
            </Panel>
            <Panel>
              <p className="eyebrow">Refunded</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{inr(summary.refunded || 0)}</p>
              <p className="mt-2 text-xs text-muted-foreground">cancelled and returned bills</p>
            </Panel>
          </div>
        </Section>

        <Section id="bills-list" title="All bills" action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice number or customer"
              aria-label="Search bills"
              className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        }>
          <div className="panel p-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    const next = new URLSearchParams(params)
                    next.set('range', r.id)
                    setParams(next, { replace: true })
                  }}
                  aria-pressed={range === r.id}
                  className={
                    range === r.id
                      ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                      : 'rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted'
                  }
                >
                  {r.label}
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              <label className="text-xs text-muted-foreground">
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    const next = new URLSearchParams(params)
                    if (e.target.value) next.set('status', e.target.value)
                    else next.delete('status')
                    setParams(next, { replace: true })
                  }}
                  className="ring-focus ml-2 h-9 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Method
                <select
                  value={method}
                  onChange={(e) => {
                    const next = new URLSearchParams(params)
                    if (e.target.value) next.set('method', e.target.value)
                    else next.delete('method')
                    setParams(next, { replace: true })
                  }}
                  className="ring-focus ml-2 h-9 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <DataState
              loading={bills.loading}
              error={bills.error}
              onRetry={bills.refresh}
              skeleton={<div className="p-6"><DataState.Skeleton rows={6} /></div>}
              empty={
                <div className="p-6">
                  <EmptyState
                    title="No bills yet"
                    body="Once you save a bill at the counter it appears here with its GST breakup."
                    action={
                      <Link to="/app/billing">
                        <Button size="sm">Create the first bill</Button>
                      </Link>
                    }
                  />
                </div>
              }
            >
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 text-right font-medium">Paid</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b) => (
                      <tr key={b.id} className={`border-b border-border/60 last:border-0 hover:bg-surface-2/50 ${selectedBill?.id === b.id ? 'bg-accent/40' : ''}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected(b.id)} className="num ring-focus font-semibold text-primary hover:underline">
                            {b.invoiceNo}
                          </button>
                          <p className="text-xs text-muted-foreground">{b.method}</p>
                        </td>
                        <td className="px-4 py-3">{b.customer}</td>
                        <td className="num px-4 py-3 text-right font-semibold">{inr(b.total)}</td>
                        <td className="num px-4 py-3 text-right text-muted-foreground">{inr(b.amountPaid)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={b.status === 'Paid' ? 'ok' : b.status === 'Cancelled' ? 'danger' : b.status === 'Refunded' ? 'warn' : 'warn'}>
                            {b.status}
                          </StatusBadge>
                        </td>
                        <td className="num px-4 py-3 text-xs text-muted-foreground">
                          {fmtDate(b.billedAt)} · {fmtTime(b.billedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {b.status === 'Due' || b.status === 'Partial' ? (
                              <button
                                onClick={() => {
                                  setSelected(b.id)
                                  setPayAmount(String(b.total - b.amountPaid))
                                  setPayOpen(true)
                                }}
                                className="ring-focus inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold hover:bg-muted"
                              >
                                <HandCoins className="h-3.5 w-3.5" aria-hidden />
                                Collect
                              </button>
                            ) : null}
                            {b.status !== 'Cancelled' ? (
                              <button
                                onClick={() => setCancelTarget(b)}
                                aria-label={`Cancel ${b.invoiceNo}`}
                                className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
                              >
                                <Ban className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border lg:hidden">
                {items.map((b) => (
                  <li key={b.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button onClick={() => setSelected(b.id)} className="ring-focus min-w-0 text-left">
                        <span className="num block font-semibold text-primary">{b.invoiceNo}</span>
                        <span className="block text-xs text-muted-foreground">
                          {b.customer} · {fmtDate(b.billedAt)}
                        </span>
                      </button>
                      <div className="text-right">
                        <p className="num text-sm font-semibold">{inr(b.total)}</p>
                        <StatusBadge tone={b.status === 'Paid' ? 'ok' : b.status === 'Cancelled' ? 'danger' : 'warn'}>{b.status}</StatusBadge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {bills.meta && bills.meta.pages > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    Page {bills.meta.page} of {bills.meta.pages} · {num(bills.meta.total)} bills
                  </span>
                  <div className="flex gap-2">
                    <button disabled={bills.meta.page <= 1} onClick={() => bills.setFilter({ page: bills.meta.page - 1 })} className="ring-focus h-8 rounded-md border border-border px-3 font-semibold disabled:opacity-40">
                      Previous
                    </button>
                    <button disabled={bills.meta.page >= bills.meta.pages} onClick={() => bills.setFilter({ page: bills.meta.page + 1 })} className="ring-focus h-8 rounded-md border border-border px-3 font-semibold disabled:opacity-40">
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </DataState>
          </div>
        </Section>

        <Section
          id="bills-detail"
          title={selectedBill ? selectedBill.invoiceNo : 'Bill detail'}
          hint="The amounts below are the frozen ones the customer was charged."
          action={
            selectedBill ? (
              <div className="flex flex-wrap gap-2">
                {selectedBill.status === 'Due' || selectedBill.status === 'Partial' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPayAmount(String(selectedBill.total - selectedBill.amountPaid))
                      setPayOpen(true)
                    }}
                  >
                    <HandCoins className="mr-1.5 h-4 w-4" aria-hidden />
                    Collect {inr(selectedBill.total - selectedBill.amountPaid)}
                  </Button>
                ) : null}
                <Link to={`/app/returns?billId=${selectedBill.id}`}>
                  <Button size="sm" variant="outline">
                    Raise a return
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={printReceipt}>
                  <Printer className="mr-1.5 h-4 w-4" aria-hidden />
                  Print
                </Button>
              </div>
            ) : null
          }
        >
          {selectedBill ? (
            <div id="receipt-print">
              <InvoiceDocument bill={selectedBill} store={store} settings={settings} preferences={preferences} rows={rows} />
            </div>
          ) : (
            <EmptyState title="No bill selected" body="Pick a bill from the list to see its GST breakup and print it." />
          )}
        </Section>
      </div>

      <Confirm
        open={Boolean(cancelTarget)}
        title={`Cancel ${cancelTarget?.invoiceNo}?`}
        body="Cancelling reverses the sale: every unit goes back into stock and the bill is marked cancelled. It cannot be undone."
        confirmLabel="Cancel bill"
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
              placeholder="Customer walked away"
            />
          </label>
        }
      />

      {payOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-label="Collect payment">
          <div className="animate-pop w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel">
            <h2 className="text-lg font-semibold">Collect payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Against {selectedBill?.invoiceNo} · {inr((selectedBill?.total || 0) - (selectedBill?.amountPaid || 0))} outstanding
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                pay()
              }}
            >
              <label className="block text-xs text-muted-foreground">
                Amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Method
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm">
                  {['Cash', 'UPI', 'Card', 'Bank transfer'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setPayOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? 'Recording…' : 'Record payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ToastHost toast={toast} />
    </AppShell>
  )
}



