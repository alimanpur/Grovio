import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { EmptyState } from '@/components/grovio/kit.jsx'
import { useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num } from '@/lib/format.js'

const REPORTS = [
  { id: 'sales', name: 'Sales summary', question: 'Total billed, collected, due and what each method brought in.' },
  { id: 'stock', name: 'Stock value', question: 'What every product is worth at cost and at selling price.' },
  { id: 'customers', name: 'Customer ledger', question: 'Who owes what, when they last bought, and their lifetime value.' },
  { id: 'purchases', name: 'Purchase orders', question: 'Open orders, received stock and supplier balances.' },
  { id: 'gst', name: 'GST summary', question: 'Tax collected per slab, input credit from purchases, net payable.' },
]

export default function Reports() {
  const [toast, show] = useToast()
  const [id, setId] = useState('sales')
  const [range, setRange] = useState({ days: 30 })

  const reports = useApi((q) => api.analytics.reports(q), { sync: true })

  useEffect(() => {
    reports.setFilter({ days: range.days })
  }, [range])

  const report = reports.data
  const def = REPORTS.find((r) => r.id === id)

  const totals = report?.summary || {}
  const byMethod = totals.byMethod || []

  const fmtCsvCell = (value) => {
    const s = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const download = () => {
    const rows = report?.bills || []
    if (!rows.length) {
      show(`No bills in the last ${range.days} days to export.`, 'error')
      return
    }
    const header = ['Bill no', 'Date', 'Customer', 'Cashier', 'Method', 'Status', 'Total', 'Paid']
    const body = rows.map((b) => [
      b.invoiceNo,
      new Date(b.billedAt).toLocaleDateString('en-IN'),
      b.customer || '',
      b.cashierName || '',
      b.method || '',
      b.status || '',
      b.total,
      b.amountPaid,
    ])
    const csv = [header, ...body].map((r) => r.map(fmtCsvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'grovio-sales-' + range.days + 'd-' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
    show('Sales register exported.')
  }

  return (
    <AppShell>
      <header className="px-6 py-8">
        <p className="eyebrow">Insights \u00b7 Reports</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Which report do you need?</h1>
      </header>

      <div className="px-6 pb-8 grid gap-10 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <nav aria-label="Reports">
          <ul className="divide-y divide-border border-y border-border">
            {REPORTS.map((r, i) => (
              <li key={r.id}>
                <button
                  onClick={() => setId(r.id)}
                  aria-current={id === r.id}
                  className={"ring-focus grid w-full grid-cols-[2rem_1fr_auto] items-baseline px-3 py-3 text-left " + (id === r.id ? 'bg-accent' : 'hover:bg-surface-2/60')}
                >
                  <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block text-sm font-semibold">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.question}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-label="Report output" className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{def?.name || 'Report'}</h2>
              <p className="num mt-1 text-sm text-muted-foreground">
                Last {range.days} days \u00b7 as of {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent">
                <Printer className="h-4 w-4" aria-hidden /> Print
              </button>
              <button onClick={download} disabled={!report} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                <Download className="h-4 w-4" aria-hidden /> Download CSV
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              <Fig label="Gross" value={inr(totals.gross || 0)} />
              <Fig label="Collected" value={inr(totals.collected || 0)} />
              <Fig label="Refunded" value={inr(totals.refunded || 0)} />
              <Fig label="Paid to suppliers" value={inr(totals.paidOut || 0)} />
              <Fig label="Purchased" value={inr(totals.purchased || 0)} />
            </dl>

            {byMethod.length > 0 && (
              <section aria-label="By payment method">
                <h2 className="text-sm font-semibold">By payment method</h2>
                <dl className="mt-3 divide-y divide-border">
                  {byMethod.map((m) => (
                    <div key={m.method} className="flex items-baseline justify-between py-2.5 text-sm">
                      <dt>{m.method}</dt>
                      <dd className="num font-semibold">{inr(m.amount)} \u00b7 {String(Math.round((m.amount / (totals.gross || 1)) * 100)) + '%'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">Built from what is saved in this store's database.</p>
        </section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}

function Fig({ label, value, warn }) {
  const base = 'num mt-1 text-2xl font-semibold '
  const extra = warn ? 'text-destructive' : ''
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={base + extra}>{value}</dd>
    </div>
  )
}