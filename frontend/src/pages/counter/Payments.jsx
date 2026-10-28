import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HandCoins, Search } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, EmptyState } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtDate, relTime } from '@/lib/format.js'

const METHODS = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Credit adjustment']

export default function Payments() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const [paySearch, setPaySearch] = useState('')
  const debouncedPay = useDebounced(paySearch, 300)
  const [selected, setSelected] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  const payments = useApi((q) => api.payments.list(q), { sync: true })
  const customersApi = useApi((q) => api.customers.list(q), { sync: true })

  useEffect(() => {
    payments.setFilter({ search: debouncedPay })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPay])

  const list = payments.data?.items || []
  const summary = payments.data?.summary || {}
  const cust = customersApi.data?.items || []

  // Dues come from the customer records the server already reconciled
  // (opening balance + credit bills − payments − returns), so they match Bills.
  const ledger = useMemo(() => {
    const map = new Map()
    for (const c of cust) {
      const due = Number(c.stats?.due || 0)
      if (due > 0) map.set(c.id, { ...c, due })
    }
    return map
  }, [cust])

  const duesQuery = debounced.trim().toLowerCase()
  const owing = [...ledger.values()]
    .filter((c) => !duesQuery || `${c.name} ${c.phone}`.toLowerCase().includes(duesQuery))
    .sort((a, b) => b.due - a.due)
  const totalOwed = owing.reduce((a, c) => a + c.due, 0)

  const paidOut = list.filter((p) => p.direction === 'out').reduce((a, p) => a + p.amount, 0)
  const collectedCount = list.filter((p) => p.direction === 'in').length
  const collected = summary.collected || 0
  const byMethod = summary.byMethod || []

  const selectedCustomer = owing.find((c) => c.id === selected) ?? owing[0]

  const submitPayment = async () => {
    if (!selectedCustomer || !payAmount) return
    setBusy(true)
    try {
      await api.payments.create({
        direction: 'in',
        amount: Number(payAmount),
        method: payMethod,
        customerId: selectedCustomer.id,
      })
      show(`Payment recorded against ${selectedCustomer.name}`)
      setPayOpen(false)
      setPayAmount('')
      payments.refresh()
      customersApi.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <PageHead
        eyebrow="Counter · Payments"
        title="Payments"
        question="Every rupee in, every rupee out — track what you've collected and what's still due."
      />

      <div className="mt-6 space-y-6">
        <SectionNav
          sections={[
            { id: 'payments-summary', label: 'Summary' },
            { id: 'payments-ledger', label: 'Customer dues', count: owing.length },
            { id: 'payments-history', label: 'All payments', count: list.length },
          ]}
        />

        <Section id="payments-summary" title="Summary" hint="Across the filtered date range.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel>
              <p className="eyebrow">Collected</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none text-sprout-foreground">{inr(summary.collected || 0)}</p>
              <p className="mt-2 text-xs text-muted-foreground">across {num(collectedCount)} payments</p>
            </Panel>
            <Panel>
              <p className="eyebrow">Paid out</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{inr(paidOut)}</p>
              <p className="mt-2 text-xs text-muted-foreground">to suppliers</p>
            </Panel>
            <Panel>
              <p className="eyebrow">Customer dues</p>
              <p className="num mt-3 text-[1.9rem] font-semibold leading-none text-destructive">{inr(totalOwed)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{owing.length} customers owe</p>
            </Panel>
          </div>
        </Section>

        <Section id="payments-ledger" title="Customer dues" hint="Derived from the payment ledger: opening balance + billed − paid − returned." action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Customer name or phone"
              aria-label="Search dues"
              className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        }>
          <DataState
            loading={customersApi.loading}
            error={customersApi.error}
            onRetry={customersApi.refresh}
            skeleton={<div className="mt-4"><DataState.Skeleton rows={6} /></div>}
            empty={
              <EmptyState
                title="Everyone is settled"
                body="Bills saved on credit at the counter will appear here until they're paid."
              />
            }
          >
            {owing.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Everyone is settled" body="Bills saved on credit at the counter will appear here until they're paid." />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {owing.map((c) => (
                   <DueRow
                     key={c.id}
                     id={c.id}
                     name={c.name}
                     phone={c.phone}
                     due={c.due}
                     onOpen={(id) => setSelected(id)}
                     onPay={(id, amount) => {
                       setSelected(id)
                       setPayAmount(String(amount))
                       setPayOpen(true)
                     }}
                   />
                ))}
              </ul>
            )}
          </DataState>
        </Section>

        <Section id="payments-history" title="All payments" action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setPaySearch(e.target.value)}
              placeholder="Search payments"
              aria-label="Search payments"
              className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        }>
          <DataState
            loading={payments.loading}
            error={payments.error}
            onRetry={payments.refresh}
            skeleton={<div className="mt-4"><DataState.Skeleton rows={6} /></div>}
            empty={<EmptyState title="No payments yet" body="Record a payment from the Bills page or here and it will appear in the list." />}
          >
            {list.length === 0 ? (
              <EmptyState title="No payments yet" body="Record a payment from the Bills page or here and it will appear in the list." />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {list.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-3 px-3 py-3">
                    <span className="min-w-0">
                      <span className="num block text-sm font-semibold">{p.bill || p.customer || p.supplier || '—'}</span>
                      <span className="num block text-xs text-muted-foreground">
                        {p.method} · {fmtDate(p.paidAt)} · {p.direction === 'in' ? 'in' : 'out'}
                      </span>
                    </span>
                    <span className={`num text-sm font-semibold ${p.direction === 'out' ? 'text-destructive' : 'text-sprout-foreground'}`}>
                      {p.direction === 'in' ? '+' : '−'}{inr(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </Section>
      </div>

      {payOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-label="Collect payment">
          <div className="animate-pop w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel">
            <h2 className="text-lg font-semibold">Collect payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From {selectedCustomer?.name || 'customer'} · {inr(selectedCustomer?.due || 0)} due
            </p>
            <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitPayment() }}>
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
                  {METHODS.map((m) => (<option key={m}>{m}</option>))}
                </select>
              </label>
              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={busy}>{busy ? 'Recording…' : 'Record payment'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastHost toast={toast} />
    </AppShell>
  )
}

function DueRow({ id, name, phone, due, onOpen, onPay }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">{name}</span>
          {phone && <a href={`tel:${phone.replace(/\s/g, '')}`} className="num text-xs text-muted-foreground hover:text-primary">{phone}</a>}
        </span>
        <span className="flex items-center gap-4">
          <span className="num text-lg font-semibold text-destructive">{inr(due)}</span>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="ring-focus rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            {open ? 'Close' : 'Collect'}
          </button>
        </span>
      </div>
      {open ? (
          <form className="animate-fade mt-3 flex flex-wrap items-end gap-3 bg-accent/60 p-3" onSubmit={(e) => { e.preventDefault(); onPay(id, Number(amount)) }}>
          <label className="text-xs text-muted-foreground">
            Amount (₹)
            <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Full amount" className="num ring-focus mt-1 block h-10 w-32 rounded-md border border-input bg-surface px-3 text-sm text-foreground" />
          </label>
          <button type="button" onClick={() => setAmount(String(due))} className="ring-focus h-10 rounded-md border border-border bg-surface px-3 text-xs font-semibold">Full amount</button>
          <label className="text-xs text-muted-foreground">
            Paid by
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="ring-focus mt-1 block h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground">
              {['UPI', 'Cash', 'Card', 'Bank transfer'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <button disabled={!amount} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">Record payment</button>
        </form>
      ) : null}
    </li>
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