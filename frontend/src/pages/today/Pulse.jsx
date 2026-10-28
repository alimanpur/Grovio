import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  FileScan,
  IndianRupee,
  PackageCheck,
  ReceiptText,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, EmptyState } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi, useDebounced } from '@/lib/useApi.js'
import { inr, num, fmtTime, relTime } from '@/lib/format.js'

const ICONS = {
  invoice: ReceiptText,
  stock: PackageCheck,
  alert: AlertTriangle,
  import: FileScan,
  payment: IndianRupee,
  purchase: Truck,
  gst: IndianRupee,
  summary: Sparkles,
}
const ACTIONS = {
  alert: { to: '/app/purchases', text: 'Reorder' },
  invoice: { to: '/app/bills', text: 'View bill' },
  stock: { to: '/app/inventory', text: 'Open stock' },
  purchase: { to: '/app/purchases', text: 'Open order' },
  payment: { to: '/app/payments', text: 'Payments' },
  gst: { to: '/app/gst', text: 'GST' },
  import: { to: '/app/smart-import', text: 'Review import' },
}
const NEEDS_ACTION = ['alert']

const FILTERS = ['Everything', 'Needs action', 'Sales', 'Stock', 'Money']
const GROUPS = {
  Everything: null,
  'Needs action': NEEDS_ACTION,
  Sales: ['invoice', 'summary'],
  Stock: ['stock', 'purchase', 'alert'],
  Money: ['payment', 'gst'],
}

export default function Pulse() {
  const [filter, setFilter] = useState('Everything')
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const [handled, setHandled] = useState(new Set())
  const [toast, show] = useToast()

  const pulse = useApi((q) => api.analytics.pulse(q), { sync: true })

  useEffect(() => {
    pulse.setFilter({ limit: debounced ? 80 : 40 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const toggle = (id) =>
    setHandled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const items = pulse.data?.items || []
  const open = items.filter((e) => NEEDS_ACTION.includes(e.kind) && !handled.has(e.id)).length

  const matches = (kinds) =>
    items.filter(
      (e) =>
        (!kinds || kinds.includes(e.kind)) &&
        (filter !== 'Needs action' || !handled.has(e.id)) &&
        `${e.title} ${e.detail}`.toLowerCase().includes(query.toLowerCase()),
    )

  const events = useMemo(() => matches(GROUPS[filter]), [filter, items, query, handled])

  const days = [...new Set(events.map((e) => e.day))].sort()

  const toggleHandled = (id) =>
    setHandled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <AppShell>
      <PageHead
        eyebrow="Today · Pulse"
        title="Pulse"
        question={open === 0 ? 'Nothing waiting on you. Everything else is a record of what happened.' : `${open} ${open === 1 ? 'event needs' : 'events need'} action. Everything else is a record of what happened.`}
      />

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-1 py-4 backdrop-blur-sm">
        <div role="tablist" aria-label="Filter events" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const kinds = GROUPS[f]
            const n = items.filter((e) => (!kinds || kinds.includes(e.kind)) && `${e.title} ${e.detail}`.toLowerCase().includes(query.toLowerCase())).length
            return (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`ring-focus rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                {f} <span className="num ml-1 opacity-70">{n}</span>
              </button>
            )
          })}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Search Pulse</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            className="ring-focus h-9 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <DataState
        loading={pulse.loading}
        error={pulse.error}
        onRetry={pulse.refresh}
        skeleton={<div className="mt-8"><DataState.Skeleton rows={8} /></div>}
        empty={
          <div className="py-24 text-center">
            <p className="display text-3xl">{filter === 'Needs action' ? 'Nothing waiting on you.' : 'No events here.'}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {query ? 'Try a different search, or clear it.' : 'New bills, deliveries and alerts will appear here as they happen.'}
            </p>
            {(query || filter !== 'Everything') && (
              <button onClick={() => { setQuery(''); setFilter('Everything'); }} className="ring-focus mt-6 rounded-md border border-border px-4 py-2 text-xs font-semibold hover:bg-accent">
                Show everything
              </button>
            )}
          </div>
        }
      >
        {events.length === 0 ? null : (
          <div className="mt-8 space-y-12">
            {days.map((day) => (
              <section key={day} aria-label={day}>
                <h2 className="display text-2xl">{day}</h2>
                <ol className="mt-3 border-t border-foreground">
                  {events.filter((e) => e.day === day).map((e) => {
                    const Icon = ICONS[e.kind]
                    const act = ACTIONS[e.kind]
                    const needs = NEEDS_ACTION.includes(e.kind)
                    const done = handled.has(e.id)
                    return (
                      <li
                        key={e.id}
                        className={`grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 border-b border-border py-5 animate-fade sm:grid-cols-[6rem_1fr_auto] ${done ? 'opacity-60' : ''}`}
                      >
                        <time className="num text-sm text-muted-foreground">{fmtTime(e.at)}</time>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <Icon className={`h-4 w-4 ${needs && !done ? 'text-saffron-foreground' : 'text-primary'}`} aria-hidden />
                            <span className="text-sm font-semibold">{e.title}</span>
                            {needs && (
                              <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${done ? 'bg-accent text-primary' : 'bg-saffron/20 text-saffron-foreground'}`}>
                                {done ? 'Handled' : 'Needs action'}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{e.detail}</p>
                        </div>
                        <div className="col-start-2 flex items-center gap-4 sm:col-start-3 sm:justify-end">
                          {act && (
                            <Link to={act.to} className="ring-focus inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                              {act.text} <span className="h-3 w-3" aria-hidden>→</span>
                            </Link>
                          )}
                          {needs && (
                            <button
                              onClick={() => toggleHandled(e.id)}
                              aria-pressed={done}
                              className="ring-focus inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent"
                            >
                              <Check className="h-3 w-3" aria-hidden /> {done ? 'Undo' : 'Mark handled'}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </DataState>

      <p className="mt-6 text-xs text-muted-foreground">
        Opening events are illustrative. New bills, stock adjustments and received purchases are added live from this browser.
      </p>

      <ToastHost toast={toast} />
    </AppShell>
  )
}