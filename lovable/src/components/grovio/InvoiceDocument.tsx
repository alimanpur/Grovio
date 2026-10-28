import { GrovioMark } from "./AppShell";
import { inr } from "@/lib/grovio-data";
import { invoiceSettingsOf, profileOf, useGrovio } from "@/lib/grovio-store";

export type InvoiceLine = {
  name: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  gst: number;
};

/** Deterministic pseudo-QR so the document looks like a real e-invoice. */
function QrBlock({ seed }: { seed: string }) {
  const cells: boolean[] = [];
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100003;
  for (let i = 0; i < 441; i++) {
    h = (h * 1103515245 + 12345) % 2147483648;
    cells.push((h >> 7) % 3 !== 0);
  }
  return (
    <svg viewBox="0 0 21 21" className="h-[5.5rem] w-[5.5rem]" aria-label="Invoice QR code" role="img">
      <rect width="21" height="21" fill="white" />
      {cells.map((on, i) =>
        on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill="#12271d" /> : null,
      )}
      {[
        { x: 0, y: 0 },
        { x: 14, y: 0 },
        { x: 0, y: 14 },
      ].map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#12271d" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#12271d" />
        </g>
      ))}

    </svg>
  );
}

function Barcode({ value }: { value: string }) {
  const bars = value
    .split("")
    .flatMap((c) => [c.charCodeAt(0) % 4 + 1, (c.charCodeAt(0) >> 2) % 3 + 1]);
  let x = 0;
  return (
    <svg viewBox={`0 0 ${bars.reduce((a, b) => a + b + 2, 0)} 26`} className="h-8 w-44" aria-label={`Barcode ${value}`} role="img">
      {bars.map((w, i) => {
        const rect = <rect key={i} x={x} y="0" width={i % 2 ? 1 : w} height="26" fill="#12271d" />;
        x += (i % 2 ? 1 : w) + 2;
        return rect;
      })}

    </svg>
  );
}

/**
 * A commercial-grade GST tax invoice. Printable, A4-proportioned and
 * intentionally typographic rather than "dashboard-like".
 */
export function InvoiceDocument({
  number,
  date,
  customer,
  phone,
  lines,
  paid,
  method,
}: {
  number: string;
  date: string;
  customer: string;
  phone: string;
  lines: InvoiceLine[];
  paid: boolean;
  method: string;
}) {
  const st = useGrovio();
  const store = profileOf(st);
  const settings = invoiceSettingsOf(st);
  const rows = lines.map((l) => {
    const taxable = l.qty * l.rate;
    return { ...l, taxable, tax: (taxable * l.gst) / 100 };
  });
  const taxable = rows.reduce((a, r) => a + r.taxable, 0);
  const tax = rows.reduce((a, r) => a + r.tax, 0);
  const total = Math.round(taxable + tax);
  const slabs = Array.from(new Set(rows.map((r) => r.gst))).sort((a, b) => a - b);

  return (
    <article className="invoice-doc mx-auto w-full max-w-[46rem] bg-surface text-foreground shadow-float ring-1 ring-border">
      <header className="flex items-start justify-between gap-6 border-b-2 border-primary px-8 pb-6 pt-8">
        <div>
          <GrovioMark />
          <p className="mt-3 text-sm font-semibold leading-tight">{store.name}</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
            {store.address}
            <br />
            {[store.gstin && `GSTIN ${store.gstin}`, store.fssai && `FSSAI ${store.fssai}`].filter(Boolean).join(" · ")}
            <br />
            {[store.phone, store.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="display text-2xl leading-none">Tax Invoice</p>
          <p className="num mt-2 text-sm font-semibold">{number}</p>
          <p className="num text-xs text-muted-foreground">{date}</p>
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
              paid ? "bg-sprout/20 text-sprout-foreground" : "bg-saffron/25 text-saffron-foreground"
            }`}
          >
            {paid ? "Paid" : "Payment due"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 border-b border-border px-8 py-6 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="eyebrow">Billed to</p>
          <p className="mt-2 text-sm font-semibold">{customer}</p>
          <p className="num text-xs text-muted-foreground">{phone}</p>
        </div>
        <div>
          <p className="eyebrow">Payment</p>
          <p className="mt-2 text-sm font-semibold">{method}</p>
          <p className="text-xs text-muted-foreground">Place of supply: Delhi (07)</p>
        </div>
        <div className="flex items-end gap-4">
          {settings.showQr ? <QrBlock seed={number} /> : null}
          <div className="text-right">
            <p className="eyebrow">Amount</p>
            <p className="num text-2xl font-semibold leading-none">{inr(total)}</p>
          </div>
        </div>
      </div>

      <table className="w-full px-8 text-sm">
        <thead>
          <tr className="eyebrow border-b border-border text-left">
            <th className="py-3 pl-8 font-bold">Item</th>
            <th className="py-3 font-bold">HSN</th>
            <th className="py-3 text-right font-bold">Qty</th>
            <th className="py-3 text-right font-bold">Rate</th>
            <th className="py-3 text-right font-bold">GST</th>
            <th className="py-3 pr-8 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/60">
              <td className="py-3 pl-8 font-medium">{r.name}</td>
              <td className="num py-3 text-xs text-muted-foreground">{r.hsn}</td>
              <td className="num py-3 text-right">
                {r.qty} {r.unit}
              </td>
              <td className="num py-3 text-right">{inr(r.rate)}</td>
              <td className="num py-3 text-right text-xs text-muted-foreground">{r.gst}%</td>
              <td className="num py-3 pr-8 text-right font-semibold">{inr(Math.round(r.taxable + r.tax))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid gap-8 px-8 py-6 sm:grid-cols-[1fr_16rem]">
        <div>
          <p className="eyebrow">GST summary</p>
          <table className="mt-2 w-full text-xs">
            <tbody>
              {slabs.map((s) => {
                const group = rows.filter((r) => r.gst === s);
                const t = group.reduce((a, r) => a + r.taxable, 0);
                const g = group.reduce((a, r) => a + r.tax, 0);
                return (
                  <tr key={s} className="border-b border-border/60">
                    <td className="num py-1.5">{s}% slab</td>
                    <td className="num py-1.5 text-right text-muted-foreground">Taxable {inr(t)}</td>
                    <td className="num py-1.5 text-right">
                      CGST {inr(g / 2)} · SGST {inr(g / 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {settings.terms}
          </p>
        </div>
        <div>
          <div className="flex justify-between border-b border-border py-1.5 text-xs">
            <span className="text-muted-foreground">Taxable value</span>
            <span className="num">{inr(taxable)}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-xs">
            <span className="text-muted-foreground">Total GST</span>
            <span className="num">{inr(tax)}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-xs">
            <span className="text-muted-foreground">Rounding</span>
            <span className="num">{inr(total - (taxable + tax))}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Grand total</span>
            <span className="num text-lg font-semibold">{inr(total)}</span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Amount in words: Rupees {total.toLocaleString("en-IN")} only.
          </p>
        </div>
      </div>

      <footer className="flex items-end justify-between gap-6 border-t border-border px-8 py-6">
        <div>
          {settings.showBarcode ? (
            <>
              <Barcode value={number} />
              <p className="num mt-1 text-[10px] tracking-[0.2em] text-muted-foreground">{number}</p>
            </>
          ) : null}
        </div>
        <div className="text-right">
          <p className="display text-base">{store.name}</p>
          <p className="mt-6 border-t border-border pt-1.5 text-[11px] text-muted-foreground">
            Authorised signatory
          </p>
        </div>
      </footer>
    </article>
  );
}
