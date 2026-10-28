import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { gstSlabs, inr } from "@/lib/grovio-data";
import { gstSummary } from "@/lib/grovio-reports";
import { useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/gst")({
  head: () => ({
    meta: [
      { title: "GST — Grovio" },
      { name: "description", content: "Output tax by slab from your counter bills, input credit from received purchases, and the net GST payable." },
      { property: "og:title", content: "GST — Grovio" },
      { property: "og:description", content: "What do I owe the tax department this month?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gst,
});

function Gst() {
  const st = useGrovio();
  const g = gstSummary(st);
  const outTax = g.output.reduce((a, r) => a + r.tax, 0);
  const sampleTax = gstSlabs.reduce((a, s) => a + s.tax, 0);
  const now = new Date();
  const month = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const due = new Date(now.getFullYear(), now.getMonth() + 1, 20).toLocaleDateString("en-IN", { day: "numeric", month: "long" });

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Insights · GST · {month}</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">How much GST do we owe?</h1>
        </div>
        <button onClick={() => window.print()} className="ring-focus inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 text-sm font-semibold hover:bg-accent">
          <Printer className="h-4 w-4" /> Print summary
        </button>
      </header>

      <section aria-label="Net payable" className="mt-8 grid gap-6 border-y border-foreground/80 py-6 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net GST payable · from Grovio activity</p>
          <p className="num mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">{inr(Math.round(g.net))}</p>
          <p className="mt-2 text-sm text-muted-foreground">GSTR-3B for {month} is usually due by {due}. Confirm with your accountant.</p>
        </div>
        <Fig label="Output tax" value={inr(Math.round(outTax))} />
        <Fig label="Input credit" value={`− ${inr(Math.round(g.input))}`} />
      </section>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <section aria-label="Output tax by slab">
          <h2 className="text-sm font-semibold">Output tax by slab <span className="font-normal text-muted-foreground">· counter bills</span></h2>
          {g.output.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No counter bills yet. <Link to="/billing" className="font-semibold text-primary hover:underline">Save a bill</Link> and its tax appears here by slab.
            </p>
          ) : (
            <SlabTable rows={g.output.map((r) => ({ ...r, split: true }))} />
          )}
          <p className="mt-3 text-xs text-muted-foreground">Intra-state sales: each slab's tax splits equally into CGST and SGST.</p>
        </section>

        <section aria-label="Sample month">
          <h2 className="text-sm font-semibold">A typical month <span className="font-normal text-muted-foreground">· illustrative</span></h2>
          <SlabTable rows={gstSlabs.map((s) => ({ rate: s.rate, taxable: s.taxable, tax: s.tax, note: s.items, split: true }))} />
          <p className="num mt-3 text-xs text-muted-foreground">Sample output tax {inr(sampleTax)} — shown so you can see what a full month looks like.</p>
        </section>
      </div>
    </AppShell>
  );
}

function SlabTable({ rows }: { rows: { rate: number; taxable: number; tax: number; note?: string; split: boolean }[] }) {
  return (
    <table className="mt-3 w-full border-t border-border text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <th className="py-2.5 font-semibold">Slab</th>
          <th className="py-2.5 text-right font-semibold">Taxable</th>
          <th className="py-2.5 text-right font-semibold">CGST</th>
          <th className="py-2.5 text-right font-semibold">SGST</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border border-b border-border">
        {rows.map((r) => (
          <tr key={r.rate}>
            <td className="py-2.5">
              <span className="num font-semibold">{r.rate}%</span>
              {r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}
            </td>
            <td className="num py-2.5 text-right">{inr(Math.round(r.taxable))}</td>
            <td className="num py-2.5 text-right">{inr(Math.round(r.tax / 2))}</td>
            <td className="num py-2.5 text-right">{inr(Math.round(r.tax / 2))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Fig({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:border-l sm:border-border sm:pl-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
