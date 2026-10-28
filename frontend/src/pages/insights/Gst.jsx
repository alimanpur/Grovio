import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { EmptyState } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState } from '@/components/grovio/page-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num } from '@/lib/format.js'

export default function Gst() {
  const [params] = useSearchParams()
  const [range, setRange] = useState({ days: 30 })

  const gst = useApi((q) => api.analytics.gst(q), { sync: true })

  useEffect(() => {
    gst.setFilter({ days: range.days })
  }, [range])

  const data = gst.data
  const slabs = data?.slabs || []
  const inputCredit = data?.inputCredit || []
  const summary = data?.summary || {}
  const gstin = data?.gstin || ''

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Insights \u00b7 GST</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What tax have we collected and what can we claim back?</h1>
        </div>
        <Link
          to="/app/billing"
          className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          New bill
        </Link>
      </header>

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="panel p-4">
            <p className="eyebrow">GSTIN</p>
            <p className="num mt-2 text-xl font-mono font-semibold">{gstin || 'Not set'}</p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Output tax</p>
            <p className="num mt-2 text-xl font-semibold">{inr(summary.outputTax || 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">collected on sales</p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Input credit</p>
            <p className="num mt-2 text-xl font-semibold">{inr(summary.inputTax || 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">from purchases</p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Net payable</p>
            <p className="num mt-2 text-xl font-semibold text-destructive">{inr(summary.netPayable || 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">output minus input</p>
          </div>
        </div>

        <div className="panel mt-6 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="text-sm font-semibold">GST slabs</h2>
            <div className="flex gap-2">
              <select
                value={range.days}
                onChange={(e) => setRange({ days: Number(e.target.value) })}
                className="ring-focus h-9 rounded-md border border-input bg-surface px-2 text-xs outline-none focus:border-primary"
              >
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>

          <DataState
            loading={gst.loading}
            error={gst.error}
            onRetry={gst.refresh}
            skeleton={<div className="p-6"><DataState.Skeleton rows={6} /></div>}
            empty={<EmptyState title="No GST data" body="Create some bills and purchases to see the tax breakdown." />}
          >
            {slabs.length === 0 ? (
              <EmptyState title="No tax slabs active" body="Configure GST slabs in Settings to track tax by rate." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-3 font-semibold">Slab</th>
                      <th className="py-3 text-right font-semibold">Taxable</th>
                      <th className="py-3 text-right font-semibold">GST collected</th>
                      <th className="py-3 text-right font-semibold">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {slabs.map((s) => (
                      <tr key={s.rate} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                        <td className="py-3 font-semibold">{s.rate}%</td>
                        <td className="num py-3 text-right">{inr(s.taxable || 0)}</td>
                        <td className="num py-3 text-right font-semibold">{inr(s.tax || 0)}</td>
                        <td className="num py-3 text-right">{num(s.items || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        </div>

        <div className="panel mt-6 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="text-sm font-semibold">Input credit (purchases)</h2>
          </div>

          <DataState
            loading={gst.loading}
            error={gst.error}
            onRetry={gst.refresh}
            skeleton={<div className="p-6"><DataState.Skeleton rows={4} /></div>}
            empty={<EmptyState title="No purchase GST data" body="Record supplier purchases to see input credit." />}
          >
            {inputCredit.length === 0 ? (
              <EmptyState title="No input credit" body="Record supplier purchases with GST to see what you can claim back." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-3 font-semibold">Slab</th>
                      <th className="py-3 text-right font-semibold">Taxable</th>
                      <th className="py-3 text-right font-semibold">GST paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inputCredit.map((c) => (
                      <tr key={c.rate} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                        <td className="py-3 font-semibold">{c.rate}%</td>
                        <td className="num py-3 text-right">{inr(c.taxable || 0)}</td>
                        <td className="num py-3 text-right font-semibold">{inr(c.tax || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold mb-3">GSTIN</h2>
          <p className="text-sm text-muted-foreground">
            Set your GSTIN in Settings \u2192 Profile so it appears on every invoice and in the GST summary.
          </p>
          <Link
            to="/app/settings"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Go to Settings
          </Link>
        </section>
      </div>
    </AppShell>
  )
}