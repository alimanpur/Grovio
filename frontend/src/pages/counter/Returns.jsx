import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, EmptyState } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, fmtDate, relTime } from '@/lib/format.js'

const REASONS = [
  'Damaged in transit',
  'Expired / spoiled',
  'Wrong item billed',
  'Customer changed mind',
  'Quality complaint',
  'Other',
]

export default function Returns() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 350)
  const [billId, setBillId] = useState(params.get('billId') || null)
  const [qty, setQty] = useState({})
  const [reason, setReason] = useState(REASONS[0])
  const [resolution, setResolution] = useState('Refund')
  const [restock, setRestock] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  const eligible = useApi((q) => api.returns.eligible(q), { sync: true })
  const returns = useApi((q) => api.returns.list(q), { sync: true })

  const billFromUrl = params.get('billId')
  useEffect(() => {
    if (billFromUrl) setBillId(billFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billFromUrl, eligible.data])

  useEffect(() => {
    eligible.setFilter({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const entries = eligible.data?.items || []
  const bill = entries.find((e) => e.bill.id === billId) ?? entries[0]
  // Refund preview: the line rate plus its proportionate share of GST. The
  // server recomputes the authoritative figure when the return is saved.
  const amounts = useMemo(() => {
    if (!bill) return new Map()
    const map = new Map()
    for (const line of bill.lines) {
      const q = qty[line.productId] ?? 0
      if (!q) continue
      const tax = (line.taxAmount * q) / line.soldQty
      map.set(line.productId, { amount: line.rate * q + tax, qty: q, tax })
    }
    return map
  }, [bill, qty])

  const refund = [...amounts.values()].reduce((a, v) => a + v.amount, 0)
  const itemsWithQty = Object.entries(qty).filter(([, q]) => q > 0)

  const submit = async (event) => {
    event.preventDefault()
    if (!bill || !itemsWithQty.length) return
    setBusy(true)
    try {
      const res = await api.returns.create({
        billId: bill.bill.id,
        lines: itemsWithQty.map(([productId, quantity]) => ({ productId, qty: quantity })),
        reason,
        resolution,
        restocked: restock,
      })
      show(`${res.data.item.returnNo} saved · refund ${inr(res.data.item.refundTotal)}`)
      setQty({})
      eligible.refresh()
      returns.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <PageHead
        eyebrow="Counter · Returns"
        title="Returns"
        question="Only items sold on a real bill can be returned, and never more than were sold."
      />

      <div className="mt-6 space-y-6">
        <SectionNav
          sections={[
            { id: 'returns-eligible', label: 'Eligible bills', count: entries.length },
            { id: 'returns-form', label: 'Raise a return' },
            { id: 'returns-recent', label: 'Recent returns' },
          ]}
        />

        <Section id="returns-eligible" title="Eligible bills" hint="Bills that still have items that haven't been returned.">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find bill"
              placeholder="Bill number or customer"
              className="ring-focus h-11 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <DataState
            loading={eligible.loading}
            error={eligible.error}
            onRetry={eligible.refresh}
            skeleton={<div className="mt-4"><DataState.Skeleton rows={5} /></div>}
            empty={
              <div className="mt-4">
                <EmptyState
                  title="Nothing to return yet"
                  body="Returns are always against a saved bill. Create one at the counter and it will appear here."
                  action={
                    <Link to="/app/billing">
                      <Button size="sm">Go to the counter</Button>
                    </Link>
                  }
                />
              </div>
            }
          >
            {entries.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No saved bill matches that.{' '}
                <Link to="/app/billing" className="font-semibold text-primary hover:underline">
                  Go to the counter
                </Link>
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {entries.map((e) => (
                  <li key={e.bill.id}>
                    <button
                      onClick={() => {
                        setBillId(e.bill.id)
                        setQty({})
                      }}
                      aria-current={bill?.bill.id === e.bill.id}
                      className={`ring-focus flex w-full justify-between gap-3 px-3 py-3 text-left ${bill?.bill.id === e.bill.id ? 'bg-accent' : 'hover:bg-surface-2/60'}`}
                    >
                      <span>
                        <span className="num block text-sm font-semibold">{e.bill.invoiceNo}</span>
                        <span className="text-xs text-muted-foreground">
                          {e.bill.customer} · {fmtDate(e.bill.billedAt, { day: 'numeric', month: 'short' })}
                        </span>
                      </span>
                      <span className="num text-sm font-semibold">{inr(e.bill.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </Section>

        <Section id="returns-form" title="Raise a return" hint="Grovio works out the refund from the price and GST the bill was charged at.">
          {!bill ? (
            <EmptyState title="Choose a bill to start" body="Pick a bill above, then choose what's coming back." />
          ) : (
            <Panel
              title={`${bill.bill.invoiceNo} · ${bill.bill.customer}`}
              hint={`Paid by ${bill.bill.method} on ${fmtDate(bill.bill.billedAt)}`}
            >
              <form onSubmit={submit}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 font-semibold">Item</th>
                        <th className="py-3 text-right font-semibold">Rate</th>
                        <th className="py-3 text-right font-semibold">Can return</th>
                        <th className="py-3 text-right font-semibold">Returning</th>
                        <th className="py-3 text-right font-semibold">Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border border-b border-border">
                      {bill.lines.map((l) => {
                        const value = amounts.get(l.productId)
                        return (
                          <tr key={l.productId}>
                            <td className="py-3 font-semibold">{l.name}</td>
                            <td className="num py-3 text-right">{inr(l.rate)}</td>
                            <td className="num py-3 text-right text-muted-foreground">
                              {l.returnableQty} of {l.soldQty}
                            </td>
                            <td className="py-3 text-right">
                              <input
                                aria-label={`Return quantity for ${l.name}`}
                                inputMode="numeric"
                                disabled={l.returnableQty === 0}
                                value={qty[l.productId] ?? 0}
                                onChange={(e) =>
                                  setQty((q) => ({
                                    ...q,
                                    [l.productId]: Math.min(l.returnableQty, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                  }))
                                }
                                className="num ring-focus h-9 w-16 rounded-md border border-input bg-surface px-2 text-right disabled:opacity-40"
                              />
                            </td>
                            <td className="num py-3 text-right font-semibold">{value ? inr(value.amount) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-5">
                  <label className="text-xs text-muted-foreground">
                    Reason
                    <select
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value)
                        setRestock(!['Damaged in transit', 'Expired / spoiled', 'Quality complaint'].includes(e.target.value))
                      }}
                      className="ring-focus mt-1 block h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground"
                    >
                      {REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Resolution
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="ring-focus mt-1 block h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground"
                    >
                      {['Refund', 'Exchange', 'Credit note'].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                    Put back on the shelf
                  </label>
                  <div className="ml-auto flex items-center gap-4">
                    <p className="num text-sm">
                      Refund <span className="text-2xl font-semibold">{inr(refund)}</span>
                    </p>
                    <button
                      disabled={!refund || busy}
                      className="ring-focus h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                    >
                      {busy ? 'Saving…' : 'Save return'}
                    </button>
                  </div>
                </div>
              </form>
            </Panel>
          )}
        </Section>

        <Section id="returns-recent" title="Recent returns" hint="Refunds already recorded against bills.">
          <Panel>
            <DataState
              loading={returns.loading}
              error={returns.error}
              onRetry={returns.refresh}
              skeleton={<DataState.Skeleton rows={4} />}
              empty={<p className="text-sm text-muted-foreground">No returns yet.</p>}
            >
              {(returns.data?.items || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No returns yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(returns.data?.items || []).slice(0, 10).map((r) => (
                    <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-3 py-2.5 text-sm">
                      <span>
                        <span className="num font-semibold">{r.returnNo}</span>{' '}
                        <span className="text-xs text-muted-foreground">
                          · {r.bill} · {r.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')} · {r.reason} · {r.resolution} ·{' '}
                          {relTime(r.returnedAt)}
                        </span>
                      </span>
                      <span className="num font-semibold text-destructive">−{inr(r.refundTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </Panel>
        </Section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}



