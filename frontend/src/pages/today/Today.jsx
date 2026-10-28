import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarX2,
  ChartLine,
  IndianRupee,
  PackagePlus,
  ReceiptText,
  Truck,
} from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState } from '@/components/grovio/page-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num, fmtDate } from '@/lib/format.js'

const quick = [
  { to: '/app/billing', label: 'New bill', Icon: ReceiptText, key: 'F2' },
  { to: '/app/products', label: 'Add product', Icon: PackagePlus },
  { to: '/app/purchases', label: 'Record purchase', Icon: Truck },
  { to: '/app/reports', label: 'View reports', Icon: ChartLine },
]

export default function Today() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date), 60000)
    return () => clearInterval(id)
  }, [])
  const [showAll, setShowAll] = useState(false)

  const today = useApi(() => api.analytics.today(), { immediate: true })
  const products = useApi((q) => api.products.list(q), { sync: true })

  const data = today.data
  const items = data?.sales?.recentBills || []
  const attention = data?.attention || []
  const shown = showAll ? attention : attention.slice(0, 6)

  const hour = now?.getHours() ?? 9
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const date = now?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <AppShell>
      <PageHead
        eyebrow="Today"
        title="Dashboard"
        question={shown.length === 0 ? 'Nothing needs you right now. A calm day.' : `${attention.length} ${attention.length === 1 ? 'thing needs' : 'things need'} your attention.`}
        actions={
          <Link to="/app/billing" className="ring-focus inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <span className="h-4 w-4" aria-hidden>🧾</span> New bill
          </Link>
        }
      />

      <div className="mt-10 grid gap-x-14 gap-y-12 xl:grid-cols-[1.25fr_1fr]">
        <section aria-labelledby="attn">
          <div className="flex items-baseline justify-between border-b border-foreground pb-3">
            <h2 id="attn" className="text-sm font-bold uppercase tracking-[0.12em]">
              Needs your attention
            </h2>
            <span className="num text-xs text-muted-foreground">
              {String(attention.length).padStart(2, '0')}
            </span>
          </div>
          {shown.length === 0 ? (
            <div className="py-12 text-center">
              <p className="display text-2xl">All clear.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Stock is above minimum and every bill is paid.
              </p>
            </div>
          ) : (
            <ol>
              {shown.map((a, i) => (
                <li key={a.key} className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-border py-4 animate-fade">
                  <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`h-4 w-4 shrink-0 ${a.tone === 'danger' ? 'text-destructive' : 'text-saffron-foreground'}`}>
                        {a.tone === 'danger' ? '⚠' : '⚠'}
                      </span>
                      <span className="text-sm font-semibold">{a.title}</span>
                      <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${a.tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-saffron/20 text-saffron-foreground'}`}>
                        {a.label}
                      </span>
                    </span>
                    <span className="num mt-1 block truncate text-xs text-muted-foreground">{a.detail}</span>
                  </span>
                  <Link to={a.to} className="ring-focus inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    {a.action} <span className="h-3 w-3" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {attention.length > shown.length && (
            <button onClick={() => setShowAll(true)} className="ring-focus mt-4 text-xs font-semibold text-primary hover:underline">
              Show {attention.length - shown.length} more
            </button>
          )}
        </section>

        <section aria-labelledby="sum" className="xl:border-l xl:border-border xl:pl-14">
          <h2 id="sum" className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Today's sales
          </h2>
          <p className="num mt-3 text-6xl font-medium tracking-tight sm:text-7xl">{inr(data?.sales?.gross || 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {data?.sales?.bills || 0} bills recorded in this store today.
          </p>
          <dl className="mt-8 grid grid-cols-3 border-t border-border">
            {[
              ['Bills', String(data?.sales?.bills || 0)],
              ['Average bill', inr(data?.sales?.averageBill || 0)],
              ['Est. margin', inr(data?.sales?.profit || 0)],
            ].map(([k, v]) => (
              <div key={k} className="border-r border-border py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="num mt-1 text-xl font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <nav aria-label="Quick actions" className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
            {quick.map(({ to, label, Icon }) => (
              <Link key={to} to={to} className="ring-focus group flex items-center gap-3 bg-card px-4 py-4 text-sm font-semibold transition-colors hover:bg-accent">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                {label}
                <span className="ml-auto h-3.5 w-3.5 text-muted-foreground">→</span>
              </Link>
            ))}
          </nav>
        </section>
      </div>

      <section aria-labelledby="act" className="mt-16">
        <div className="flex items-baseline justify-between border-b border-foreground pb-3">
          <h2 id="act" className="text-sm font-bold uppercase tracking-[0.12em]">
            Recent activity
          </h2>
          <Link to="/app/pulse" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Open Pulse <span className="h-3 w-3" aria-hidden>→</span>
          </Link>
        </div>
        <ol className="grid sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((e) => (
            <li key={e.id} className="border-b border-border py-4 pr-6 animate-fade">
              <p className="num text-xs text-muted-foreground">{fmtDate(e.billedAt, { hour: 'numeric', minute: '2-digit' })}</p>
              <p className="mt-1 text-sm font-semibold">{e.invoiceNo} · {e.customer}</p>
              <p className="text-xs text-muted-foreground">{inr(e.total)} · {e.method} · {e.status}</p>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  )
}