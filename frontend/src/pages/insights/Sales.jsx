import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppShell from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState } from '@/components/grovio/page-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num } from '@/lib/format.js'

const VIEWS = ['Revenue', 'Profit']
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }, formatter: (v) => inr(v) }

export default function Sales() {
  const [view, setView] = useState('Revenue')
  const [range, setRange] = useState({ days: 7 })

  const sales = useApi((q) => api.analytics.sales(q), { sync: true })

  useEffect(() => {
    sales.setFilter({ days: range.days })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const data = sales.data
  const trend = data?.trend || []
  const totals = data?.totals || {}

  const best = trend.reduce((a, d) => (d.revenue > a.revenue ? d : a), { day: '', revenue: 0 })

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Insights · Sales</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Is the business growing?</h1>
      </header>

      <section aria-label="Trend" className="mt-8 border-t border-foreground/80 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last {range.days} days</p>
            <p className="num mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">{inr(view === 'Revenue' ? totals.gross : totals.profit)}</p>
            <p className="num mt-2 text-sm text-muted-foreground">
              {view === 'Revenue'
                ? `${inr(totals.profit)} profit · ${totals.gross ? Math.round((totals.profit / totals.gross) * 100) : 0}% margin`
                : `on ${inr(totals.gross)} revenue`}
              · best day {best.day} ({inr(best.revenue)})
            </p>
          </div>
          <div role="tablist" className="flex overflow-hidden rounded-md border border-border">
            {VIEWS.map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`ring-focus h-9 px-4 text-xs font-semibold ${view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} formatter={(v) => inr(v)} />
              <Area type="monotone" dataKey={view === 'Revenue' ? 'revenue' : 'profit'} name={view} stroke="var(--primary)" strokeWidth={2} fill="var(--accent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-label="Top products">
          <h2 className="text-sm font-semibold">Top products <span className="font-normal text-muted-foreground">· by revenue</span></h2>
          <ol className="mt-3 divide-y divide-border border-y border-border">
            {(data?.topProducts || []).slice(0, 10).map((p, i) => (
              <li key={p.name} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-2 py-2.5 text-sm">
                <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="num block text-xs text-muted-foreground">{num(p.units)} sold · {p.margin}% margin</span>
                </span>
                <span className="num font-semibold">{inr(p.revenue)}</span>
              </li>
            ))}
          </ol>
          {(data?.topProducts || []).length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No sales in this window. <a href="/app/billing" className="font-semibold text-primary hover:underline">Create a bill</a> to see your top products.
            </p>
          ) : null}
        </section>

        <section aria-label="Trend">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              Revenue by day <span className="font-normal text-muted-foreground">· last {range.days} days</span>
            </h2>
            <select value={range.days} onChange={(e) => setRange({ days: Number(e.target.value) })} className="ring-focus ml-auto h-9 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-primary">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} formatter={(v) => inr(v)} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--primary)" strokeWidth={2} fill="var(--accent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShell>
  )
}