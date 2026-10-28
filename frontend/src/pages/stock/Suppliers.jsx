import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/grovio/AppShell.jsx'
import { EmptyState, Panel } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, Confirm, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtDate } from '@/lib/format.js'

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

const BLANK = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  gstin: '',
  paymentTerms: '',
  openingDue: '',
  notes: '',
}

export default function Suppliers() {
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  const suppliers = useApi((q) => api.suppliers.list(q), { sync: true })
  const outstanding = useApi(() => api.supplierOutstanding(), { immediate: true })
  const purchases = useApi((q) => api.purchases.list(q), { immediate: true })

  useEffect(() => {
    suppliers.setFilter({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const rows = suppliers.data?.items || []
  const dues = useMemo(() => {
    const map = new Map()
    for (const s of outstanding.data?.items || []) map.set(s.id, s)
    return map
  }, [outstanding.data])

  const list = rows
    .map((s) => ({ ...s, due: dues.get(s.id)?.outstanding ?? s.openingDue ?? 0 }))
    .sort((a, b) => b.due - a.due)

  const totalDue = list.reduce((sum, s) => sum + s.due, 0)
  const sup = list.find((s) => s.id === selected) ?? list[0]

  const orders = (purchases.data?.items || []).filter((p) => p.supplierId === sup?.id)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    const payload = { ...form, openingDue: form.openingDue === '' ? 0 : Number(form.openingDue) }
    try {
      if (editing) {
        await api.suppliers.update(editing.id, payload)
        show(`${payload.name} updated`)
      } else {
        await api.suppliers.create(payload)
        show(`${payload.name} added`)
        setForm(BLANK)
      }
      setEditing(null)
      suppliers.refresh()
      outstanding.refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api.suppliers.remove(removeTarget.id)
      show(removeTarget.archived ? `${removeTarget.name} archived — its purchase history is kept.` : `${removeTarget.name} removed.`)
      setRemoveTarget(null)
      setSelected(null)
      suppliers.refresh()
      outstanding.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    if (!sup || !amount) return
    setPaying(true)
    try {
      await api.payments.create({ direction: 'out', amount: Number(amount), supplierId: sup.id, method: 'Bank transfer' })
      show(`${inr(Number(amount))} paid to ${sup.name}`)
      setAmount('')
      suppliers.refresh()
      outstanding.refresh()
      purchases.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setPaying(false)
    }
  }

  const startEdit = (s) => {
    setEditing(s)
    setForm({
      name: s.name,
      contactName: s.contactName || '',
      phone: s.phone || '',
      email: s.email || '',
      city: s.city || '',
      address: s.address || '',
      gstin: s.gstin || '',
      paymentTerms: s.paymentTerms || '',
      openingDue: String(s.openingDue ?? ''),
      notes: s.note || '',
    })
    document.getElementById('supplier-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Suppliers</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Who do we owe, and how much?</h1>
        </div>
        <Link
          to="/app/purchases"
          className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          New purchase order
        </Link>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav
          sections={[
            { id: 'suppliers-list', label: 'Suppliers', count: list.length },
            { id: 'suppliers-detail', label: sup ? sup.name : 'Details' },
            { id: 'supplier-form', label: editing ? 'Edit supplier' : 'Add supplier' },
          ]}
        />

        <Section id="suppliers-list" title="Suppliers" hint="Balances are the sum of received purchases less payments already made.">
          <dl className="grid grid-cols-2 border-y border-border">
            <Fig label="Suppliers" value={num(list.length)} />
            <Fig label="Total owed" value={inr(totalDue)} warn={totalDue > 0} />
          </dl>

          <div className="relative mt-6 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search suppliers"
              placeholder="Name, contact, phone or city"
              className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <DataState
            loading={suppliers.loading}
            error={suppliers.error}
            onRetry={suppliers.refresh}
            skeleton={<div className="mt-6"><DataState.Skeleton rows={5} /></div>}
            empty={
              <div className="mt-6">
                <EmptyState
                  title="No suppliers yet"
                  body="Add the distributors you buy from so purchase orders and dues are tracked in one place."
                  action={
                    <Button size="sm" onClick={() => document.getElementById('supplier-form')?.scrollIntoView({ behavior: 'smooth' })}>
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                      Add supplier
                    </Button>
                  }
                />
              </div>
            }
          >
            {list.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No supplier matches" body="Check the spelling or clear the search." />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {list.map((s) => (
                  <li key={s.id}>
                    <div className={`grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-3 ${sup?.id === s.id ? 'bg-accent' : 'hover:bg-surface-2/60'}`}>
                      <button type="button" onClick={() => setSelected(s.id)} className="ring-focus min-w-0 text-left">
                        <span className="block truncate text-sm font-semibold">{s.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {s.city || '—'} · {s.paymentTerms || 'no terms set'}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`num text-right text-sm font-semibold ${s.due ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {s.due ? inr(s.due) : 'Settled'}
                        </span>
                        <button type="button" onClick={() => startEdit(s)} aria-label={`Edit ${s.name}`} className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button type="button" onClick={() => setRemoveTarget(s)} aria-label={`Delete ${s.name}`} className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </Section>

        <Section id="suppliers-detail" title={sup ? sup.name : 'Supplier detail'} hint="Order history and everything you owe them.">
          {sup ? (
            <section aria-label={sup.name} className="space-y-6">
              <h3 className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                {sup.contactName ? `${sup.contactName} · ` : ''}
                {sup.city || '—'}
                {sup.phone ? (
                  <a href={`tel:${sup.phone.replace(/\s/g, '')}`} className="num inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {sup.phone}
                  </a>
                ) : null}
                {sup.archived ? <StatusBadge tone="muted">Archived</StatusBadge> : null}
              </h3>

              <form
                className="flex flex-wrap items-end gap-4 border-y border-border py-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  pay()
                }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Owed · {sup.paymentTerms || 'no terms'}
                  </p>
                  <p className={`num mt-1 text-3xl font-semibold ${sup.due ? 'text-destructive' : ''}`}>{inr(sup.due)}</p>
                </div>
                {sup.due > 0 ? (
                  <>
                    <label className="ml-auto text-xs text-muted-foreground">
                      Record payment (₹)
                      <input
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={String(sup.due)}
                        className="num ring-focus mt-1 block h-10 w-36 rounded-md border border-input bg-surface px-3 text-sm text-foreground"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmount(String(sup.due))}
                      className="ring-focus h-10 rounded-md border border-border px-3 text-xs font-semibold"
                    >
                      Full amount
                    </button>
                    <button disabled={!amount || paying} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                      {paying ? 'Recording…' : 'Record payment'}
                    </button>
                  </>
                ) : (
                  <p className="ml-auto text-sm text-muted-foreground">Nothing owed.</p>
                )}
              </form>

              <div className="grid gap-8 lg:grid-cols-2">
                <Panel title="Orders" hint="Every purchase order raised against this supplier.">
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders with this supplier yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {orders.map((o) => (
                        <li key={o.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                          <span>
                            <Link to="/app/purchases" className="num font-semibold text-primary hover:underline">
                              {o.orderNo}
                            </Link>{' '}
                            <span className="text-xs text-muted-foreground">
                              · {fmtDate(o.orderedAt)} · {o.status}
                            </span>
                          </span>
                          <span className="num font-semibold">{inr(o.total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Terms & notes" hint="How and when they expect to be paid.">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['Payment terms', sup.paymentTerms || '—'],
                      ['GSTIN', sup.gstin || '—'],
                      ['Opening balance', inr(sup.openingDue || 0)],
                      ['Email', sup.email || '—'],
                      ['Added', fmtDate(sup.createdAt)],
                      ['Notes', sup.note || '—'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
              </div>
            </section>
          ) : (
            <EmptyState title="No supplier selected" body="Pick a supplier from the list to see their orders and balance." />
          )}
        </Section>

        <Section id="supplier-form" title={editing ? `Edit ${editing.name}` : 'Add supplier'} hint="Names must be unique in your store.">
          <Panel title={editing ? 'Edit supplier' : 'New supplier'} className="max-w-3xl">
            {formError ? (
              <p role="alert" className="mb-4 text-xs text-destructive">
                {formError}
              </p>
            ) : null}
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Name
                <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Supplier or distributor name" />
              </label>
              <label className="text-xs text-muted-foreground">
                Contact person
                <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground">
                Phone
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+91 99999 99999" />
              </label>
              <label className="text-xs text-muted-foreground">
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground">
                City
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground">
                GSTIN
                <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className={inputCls} maxLength={20} />
              </label>
              <label className="text-xs text-muted-foreground">
                Payment terms
                <input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className={inputCls} placeholder="Net 30" />
              </label>
              <label className="text-xs text-muted-foreground">
                Opening balance (₹)
                <input type="number" min="0" step="0.01" value={form.openingDue} onChange={(e) => setForm({ ...form, openingDue: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Address
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Notes
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="ring-focus mt-1 block w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
              </label>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4 sm:col-span-2">
                {editing ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(null); setForm(BLANK) }}>
                    Cancel edit
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}
                </Button>
              </div>
            </form>
          </Panel>
        </Section>
      </div>

      <Confirm
        open={Boolean(removeTarget)}
        title={`Delete ${removeTarget?.name}?`}
        body={
          removeTarget?.due
            ? 'This supplier has an outstanding balance or purchase history, so they will be archived instead of deleted. Their records stay intact.'
            : 'This supplier has no purchase history, so they will be removed.'
        }
        confirmLabel="Delete"
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
      <dd className={`num mt-1 text-2xl font-semibold ${warn ? 'text-destructive' : ''}`}>{value}</dd>
    </div>
  )
}
