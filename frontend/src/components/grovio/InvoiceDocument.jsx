import { GrovioMark } from './AppShell.jsx'
import { inr, num, fmtDate, fmtTime } from '@/lib/format.js'

const money = (value) => {
  const n = Number(value) || 0
  return `₹${n.toFixed(2)}`
}

const STATUS_TONES = {
  Paid: 'border-sprout/40 bg-sprout/15 text-sprout-foreground',
  Partial: 'border-amber-500/40 bg-amber-500/15 text-amber-700',
  Due: 'border-amber-500/40 bg-amber-500/15 text-amber-700',
  Refunded: 'border-amber-500/40 bg-amber-500/15 text-amber-700',
  Cancelled: 'border-destructive/40 bg-destructive/10 text-destructive',
}

export function InvoiceDocument({ bill, store, settings, customer, rows }) {
  if (!bill) return null

  const lines = (Array.isArray(rows) && rows.length ? rows : bill.lines) || []

  const subtotal = bill.subtotal ?? lines.reduce((a, l) => a + (Number(l.amount) || 0), 0)
  const discount = bill.discountTotal ?? lines.reduce((a, l) => a + (Number(l.discountAmount) || 0), 0)
  const taxTotal = bill.taxTotal ?? lines.reduce((a, l) => a + (Number(l.taxAmount) || 0), 0)
  const total = Number(bill.total) || 0
  const amountPaid = Number(bill.amountPaid) || 0
  const balance = Math.max(0, total - amountPaid)
  const roundOff = Number(bill.roundOff) || 0

  const byRate = []
  for (const line of lines) {
    const rate = Number(line.gstRate) || 0
    const bucket = byRate.find((b) => b.rate === rate)
    if (bucket) {
      bucket.taxable += Number(line.amount) || 0
      bucket.tax += Number(line.taxAmount) || 0
    } else {
      byRate.push({ rate, taxable: Number(line.amount) || 0, tax: Number(line.taxAmount) || 0 })
    }
  }

  const customerName = customer?.name || bill.customer || 'Walk-in'
  const cancelled = bill.status === 'Cancelled'

  return (
    <article className="invoice-doc mx-auto w-full max-w-[46rem] bg-surface text-foreground shadow-float ring-1 ring-border">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-primary px-8 pb-6 pt-8">
        <div>
          <GrovioMark />
          <p className="mt-3 text-lg font-semibold leading-tight">{store?.name || 'Your store'}</p>
          {store?.address ? (
            <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-muted-foreground">{store.address}</p>
          ) : null}
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {store?.phone ? <p>{store.phone}</p> : null}
            {store?.email ? <p>{store.email}</p> : null}
            {store?.gstNumber ? <p className="num">GSTIN: {store.gstNumber}</p> : null}
            {store?.fssai ? <p className="num">FSSAI: {store.fssai}</p> : null}
          </div>
        </div>
        <div className="text-right">
          <p className="eyebrow">Tax invoice</p>
          <p className="num mt-1 text-xl font-semibold">{bill.invoiceNo}</p>
          <p className="num mt-1 text-xs text-muted-foreground">
            {fmtDate(bill.billedAt)} · {fmtTime(bill.billedAt)}
          </p>
          <span
            className={`mt-3 inline-block rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_TONES[bill.status] || 'border-border text-muted-foreground'}`}
          >
            {bill.status}
          </span>
        </div>
      </header>

      <div className="grid gap-6 border-b border-border px-8 py-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow">Billed to</p>
          <p className="mt-2 text-sm font-semibold">{customerName}</p>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {customer?.phone ? <p className="num">{customer.phone}</p> : null}
            {customer?.email ? <p>{customer.email}</p> : null}
            {customer?.gstin ? <p className="num">GSTIN: {customer.gstin}</p> : null}
            {customer?.address ? <p>{customer.address}</p> : null}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="eyebrow">Payment</p>
          <p className="num mt-2 text-sm font-semibold">{bill.method || 'Cash'}</p>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <p>
              Paid <span className="num font-semibold text-foreground">{inr(amountPaid)}</span>
            </p>
            {balance > 0 ? (
              <p>
                Balance due <span className="num font-semibold text-destructive">{inr(balance)}</span>
              </p>
            ) : null}
            {bill.cashierName ? <p>Billed by {bill.cashierName}</p> : null}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">HSN</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Rate</th>
              <th className="pb-2 text-right font-medium">GST</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id || line.productId || `${line.name}-${i}`} className="invoice-row border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="block font-medium">{line.name}</span>
                  {line.sku ? <span className="num block text-xs text-muted-foreground">{line.sku}</span> : null}
                </td>
                <td className="num py-2.5 pr-3 text-xs text-muted-foreground">{line.hsn || '—'}</td>
                <td className="num py-2.5 pr-3 text-right">
                  {num(line.qty)}
                  {line.unit ? <span className="ml-1 text-xs text-muted-foreground">{line.unit}</span> : null}
                </td>
                <td className="num py-2.5 pr-3 text-right">{inr(line.rate)}</td>
                <td className="num py-2.5 pr-3 text-right">{Number(line.gstRate) || 0}%</td>
                <td className="num py-2.5 text-right font-semibold">{inr(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 border-t border-border px-8 pb-6 pt-6 sm:grid-cols-2">
        <div className="space-y-4">
          {byRate.length ? (
            <div>
              <p className="eyebrow">GST summary</p>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1 font-medium">Rate</th>
                    <th className="pb-1 text-right font-medium">Taxable</th>
                    <th className="pb-1 text-right font-medium">CGST</th>
                    <th className="pb-1 text-right font-medium">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {byRate.map((row) => (
                    <tr key={row.rate}>
                      <td className="num py-1">{row.rate}%</td>
                      <td className="num py-1 text-right">{inr(row.taxable)}</td>
                      <td className="num py-1 text-right">{money(row.tax / 2)}</td>
                      <td className="num py-1 text-right">{money(row.tax / 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {settings?.showQr && settings?.upiId ? (
            <div>
              <p className="eyebrow">UPI</p>
              <p className="num mt-1 text-sm font-semibold">{settings.upiId}</p>
            </div>
          ) : null}

          {settings?.showBarcode ? (
            <div>
              <p className="eyebrow">Bill barcode</p>
              <p className="num mt-1 text-sm font-semibold tracking-[0.3em]">{bill.invoiceNo}</p>
            </div>
          ) : null}
        </div>

        <div className="sm:pl-6">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="num">{inr(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="num">−{inr(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">GST</dt>
              <dd className="num">{inr(taxTotal)}</dd>
            </div>
            {roundOff ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Round off</dt>
                <dd className="num">{money(roundOff)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="num">{inr(total)}</dd>
            </div>
            {balance > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Balance due</dt>
                <dd className="num text-destructive">{inr(balance)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {cancelled && bill.cancelReason ? (
        <p className="border-t border-border px-8 py-4 text-xs text-destructive">
          Cancelled: {bill.cancelReason}
        </p>
      ) : null}

      {bill.note ? (
        <p className="border-t border-border px-8 py-4 text-xs text-muted-foreground">Note: {bill.note}</p>
      ) : null}

      {settings?.terms ? (
        <div className="border-t border-border px-8 py-5">
          <p className="eyebrow">Terms</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{settings.terms}</p>
        </div>
      ) : null}

      {settings?.footerNote ? (
        <p className="border-t-2 border-primary px-8 py-5 text-center text-xs text-muted-foreground">
          {settings.footerNote}
        </p>
      ) : (
        <p className="border-t-2 border-primary px-8 py-5 text-center text-xs text-muted-foreground">
          Thank you for shopping with {store?.name || 'us'}.
        </p>
      )}
    </article>
  )
}

export default InvoiceDocument
