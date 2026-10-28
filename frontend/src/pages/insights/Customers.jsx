import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Search, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { EmptyState, Panel } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, Confirm, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtDate, relTime } from '@/lib/format.js'

const FILTERS = ['All', 'Owes money', 'Frequent', 'Bulk', 'Dormant']
const TAGS = ['New', 'Frequent', 'Bulk', 'Credit', 'Dormant']

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

const BLANK = { name: '', phone: '', email: '', address: '', gstin: '', tag: 'New', openingDue: '', creditLimit: '', note: '' }

export default function Customers() {
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  const customers = useApi((q) => api.customers.list(q), { sync: true })
  const payments = useApi((q) => api.payments.list(q), { sync: true })

  useEffect(() => {
    customers.setFilter({ search: debounced, withDues: filter === 'Owes money', archived: filter === 'Dormant' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, filter])

  const items = customers.data?.items || []
  const totalOwed = items.reduce((a, c) => a + (c.stats?.due || 0), 0)

  const selectedCustomer = items.find((c) => c.id === selected) ?? items[0]
  const custPayments = (payments.data?.items || []).filter((p) => p.customerId === selectedCustomer?.id)

  const allBills = (payments.data?.items || [])
    .filter((p) => p.direction === 'in' && p.customerId === selectedCustomer?.id)
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))

  const startEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      gstin: c.gstin || '',
      tag: c.tag || 'New',
      openingDue: c.openingDue != null ? String(c.openingDue) : '',
      creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
      note: c.note || '',
    })
    setError(null)
    document.getElementById('customer-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      tag: form.tag,
      note: form.note.trim(),
      // openingDue / creditLimit are rupees; the server converts to paise.
      ...(form.openingDue !== '' && form.openingDue != null ? { openingDue: Number(form.openingDue) || 0 } : {}),
      ...(form.creditLimit !== '' && form.creditLimit != null ? { creditLimit: Number(form.creditLimit) || 0 } : {}),
    }
    try {
      if (editing) await api.customers.update(editing.id, payload)
      else await api.customers.create(payload)
      show(`${payload.name} ${editing ? 'updated' : 'added'}`)
      setEditing(null)
      setForm(BLANK)
      customers.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api.customers.remove(removeTarget.id)
      show(`${removeTarget.name} removed or archived (kept if they have bills).`)
      setRemoveTarget(null)
      if (selectedCustomer?.id === removeTarget.id) setSelected(null)
      customers.refresh()
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
          <p className="eyebrow">Insights \u00b7 Customers</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Who are our regulars?</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setError(null); document.getElementById('customer-form')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add customer
          </Button>
          <Link
            to="/app/payments"
            className="ring-focus inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Collect dues
          </Link>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav
          sections={[
            { id: 'customers-list', label: 'All customers', count: items.length },
            { id: 'customers-detail', label: selectedCustomer ? selectedCustomer.name : 'Customer detail' },
            { id: 'customer-form', label: editing ? 'Edit customer' : 'Add customer' },
          ]}
        />

        <Section id="customers-list" title="All customers" hint="Balances are derived from the payment ledger: opening due + billed - paid - returned.">
          <dl className="grid grid-cols-3 border-y border-border">
            <Fig label="Customers" value={num(items.length)} />
            <Fig label="Visits on record" value={num(items.reduce((a, c) => a + (c.stats?.visits || 0), 0))} />
            <Fig label="Owed to the store" value={inr(totalOwed)} warn={totalOwed > 0} />
          </dl>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search customers"
              placeholder="Name or phone"
              className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div role="tablist" className="mt-2 flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`ring-focus h-8 rounded-md px-3 text-xs font-semibold ${filter === f ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <DataState
            loading={customers.loading}
            error={customers.error}
            onRetry={customers.refresh}
            skeleton={<div className="mt-4"><DataState.Skeleton rows={6} /></div>}
            empty={
              <div className="mt-4">
                <EmptyState
                  title="No customer matches"
                  body="Try another name or filter."
                  action={
                    <Button size="sm" onClick={() => { setQuery(''); setFilter('All') }}>
                      Show everyone
                    </Button>
                  }
                />
              </div>
            }
          >
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    aria-current={selectedCustomer?.id === c.id}
                    className={`ring-focus grid w-full grid-cols-[1fr_auto] gap-x-3 px-3 py-3 text-left ${selectedCustomer?.id === c.id ? 'bg-accent' : 'hover:bg-surface-2/60'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.tag} \u00b7 last visit {relTime(c.stats?.lastVisit)}
                      </span>
                    </span>
                    <span className={`num text-right text-sm font-semibold ${(c.stats?.due || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {(c.stats?.due || 0) > 0 ? inr(c.stats.due) : 'Settled'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </DataState>
        </Section>

        <Section
          id="customers-detail"
          title={selectedCustomer ? selectedCustomer.name : 'Customer detail'}
          hint="Payments and bills from the payment ledger."
        >
          {selectedCustomer ? (
              <section aria-label={selectedCustomer.name} className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">{selectedCustomer.name}</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(selectedCustomer)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRemoveTarget(selectedCustomer)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Archive
                  </Button>
                </div>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <StatusBadge tone={selectedCustomer.tag === 'Frequent' ? 'ok' : 'muted'}>
                  {selectedCustomer.tag}
                </StatusBadge> customer
                <a
                  href={`tel:${selectedCustomer.phone.replace(/\s/g, '')}`}
                  className="num inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden /> {selectedCustomer.phone}
                </a>
              </p>
              <dl className="mt-6 grid grid-cols-3 border-y border-border">
                <Fig label="Visits" value={num(selectedCustomer.stats?.visits || 0)} />
                <Fig label="Lifetime spend" value={inr(selectedCustomer.stats?.spend || 0)} />
                <Fig label="Owes" value={inr(selectedCustomer.stats?.due || 0)} warn={(selectedCustomer.stats?.due || 0) > 0} />
              </dl>
              <p className="mt-6 border-l-2 border-primary pl-4 text-sm">{selectedCustomer.note || 'No notes.'}</p>

              <div className="mt-8 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Payments</h3>
                <Link to="/app/payments" className="text-xs font-semibold text-primary hover:underline">
                  Record payment
                </Link>
              </div>
              {custPayments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No payments recorded for this customer yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {custPayments.slice(0, 10).map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                      <span>
                        <span className="num font-semibold">{inr(p.amount)}</span> \u00b7
                        <span className="text-xs text-muted-foreground">{p.method} \u00b7 {relTime(p.paidAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-8 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Bills</h3>
                <Link to="/app/billing" className="text-xs font-semibold text-primary hover:underline">
                  New bill
                </Link>
              </div>
              {allBills.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No bills in Bill history for this customer yet. Choose them as the customer at the counter.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {allBills.slice(0, 10).map((b) => (
                    <li key={b.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                      <span>
                        <span className="num font-semibold">{b.billInvoiceNo || b.id}</span> \u00b7
                        <span className="text-xs text-muted-foreground">{b.bill?.items || 0} items \u00b7 {b.method} \u00b7 {relTime(b.paidAt)}</span>
                      </span>
                      <span className="text-right">
                        <span className="num font-semibold">{inr(b.amount)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <EmptyState title="No customer selected" body="Pick a customer from the list to see their payment history and balance." />
          )}
        </Section>

        <Section id="customer-form" title={editing ? `Edit ${editing.name}` : 'Add customer'} hint="Names must be unique in your store.">
          <Panel title={editing ? 'Edit customer' : 'New customer'} className="max-w-2xl">
            {error ? (
              <p role="alert" className="mb-4 flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden /> {error}
              </p>
            ) : null}
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Name
                <input required minLength={2} maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Customer name" />
              </label>
              <label className="text-xs text-muted-foreground">
                Phone
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground">
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground">
                GSTIN
                <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className={inputCls} maxLength={20} />
              </label>
              <label className="text-xs text-muted-foreground">
                Tag
                <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className={inputCls}>
                  {TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Opening due (₹)
                <input type="number" min="0" step="0.01" value={form.openingDue} onChange={(e) => setForm({ ...form, openingDue: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground">
                Credit limit (₹)
                <input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Address
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Note
                <textarea rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="ring-focus mt-1 block w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" />
              </label>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4 sm:col-span-2">
                {editing ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(null); setForm(BLANK); setError(null) }}>
                    Cancel edit
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add customer'}
                </Button>
              </div>
            </form>
          </Panel>
        </Section>
      </div>

      <Confirm
        open={Boolean(removeTarget)}
        title={`Remove ${removeTarget?.name}?`}
        body="If they have bills, they are archived instead of deleted so their history stays intact."
        confirmLabel="Remove"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoveTarget(null)}
      />

      <ToastHost toast={toast} />
    </AppShell>
  )
}

function Fig({ label, value, warn }) {
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={"num mt-1 text-2xl font-semibold " + (warn ? 'text-destructive' : '')}>{value}</dd>
    </div>
  )
}