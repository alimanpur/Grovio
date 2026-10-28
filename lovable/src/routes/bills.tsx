import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, Search } from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { InvoiceDocument } from "@/components/grovio/InvoiceDocument";
import { customers, inr } from "@/lib/grovio-data";
import { useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: [
      { title: "Bill History — Grovio" },
      { name: "description", content: "Every invoice your counter has issued, with dues flagged and the GST document one click away." },
      { property: "og:title", content: "Bill History — Grovio" },
      { property: "og:description", content: "Which bills did we issue, and which are still unpaid?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Bills,
});

// Illustrative lines for seeded bills that predate line-level storage.
const SAMPLE_LINES = [
  { name: "Aashirvaad Atta 10 kg", hsn: "1101", qty: 2, unit: "bag", rate: 465, gst: 5 },
  { name: "Amul Gold Milk 500 ml", hsn: "0401", qty: 6, unit: "pouch", rate: 34, gst: 0 },
  { name: "Tata Tea Gold 500 g", hsn: "0902", qty: 1, unit: "pack", rate: 290, gst: 5 },
  { name: "Parle-G Biscuit 250 g", hsn: "1905", qty: 4, unit: "pack", rate: 30, gst: 18 },
];

const FILTERS = ["All", "Paid", "Unpaid"] as const;

function Bills() {
  const { invoices, products } = useGrovio();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selected, setSelected] = useState(invoices[0]?.id ?? "");

  const unpaid = (s: string) => s !== "Paid";
  const list = invoices.filter(
    (i) =>
      (filter === "All" || (filter === "Paid" ? !unpaid(i.status) : unpaid(i.status))) &&
      `${i.id} ${i.customer} ${i.method}`.toLowerCase().includes(query.toLowerCase()),
  );
  const invoice = invoices.find((i) => i.id === selected) ?? list[0];
  const billed = invoices.reduce((a, i) => a + i.total, 0);
  const dueCount = invoices.filter((i) => unpaid(i.status)).length;
  const dueTotal = invoices.filter((i) => unpaid(i.status)).reduce((a, i) => a + i.total, 0);

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Counter · Bills</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Which bills are still open?</h1>
        </div>
        <Link to="/billing" className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
          New bill
        </Link>
      </header>

      <dl className="mt-8 grid grid-cols-3 border-y border-border">
        <Stat label="Bills" value={String(invoices.length)} />
        <Stat label="Billed" value={inr(billed)} />
        <Stat label={`Unpaid · ${dueCount}`} value={inr(dueTotal)} alert={dueCount > 0} />
      </dl>

      <div className="mt-8 grid gap-10 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <section aria-label="Invoices" className="min-w-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={query}
                aria-label="Search bills"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bill no., customer, method"
                className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div role="tablist" className="flex overflow-hidden rounded-md border border-border">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`ring-focus px-3 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No bills match"
                body="Try a bill number like GRV-1042 or a customer name."
                action={
                  <button
                    onClick={() => {
                      setQuery("");
                      setFilter("All");
                    }}
                    className="ring-focus rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Show all bills
                  </button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {list.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => setSelected(i.id)}
                    aria-current={invoice?.id === i.id}
                    className={`ring-focus grid w-full grid-cols-[1fr_auto] gap-x-4 px-3 py-3 text-left transition-colors ${
                      invoice?.id === i.id ? "bg-accent" : "hover:bg-surface-2/60"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="num text-sm font-semibold">{i.id}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {i.customer} · {i.items} items · {i.method} · {i.time}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-sm font-semibold">{inr(i.total)}</span>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${unpaid(i.status) ? "text-destructive" : "text-muted-foreground"}`}>
                        {i.status === "Partial" ? "Part paid" : i.status === "Due" ? "Unpaid" : "Paid"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {invoice ? (
          <section aria-label={`Invoice ${invoice.id}`} className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                GST invoice · <span className="num text-foreground">{invoice.id}</span>
                {invoice.lines ? "" : " · illustrative items"}
              </p>
              <button onClick={() => window.print()} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent">
                <Printer className="h-4 w-4" /> Print or save PDF
              </button>
            </div>
            <InvoiceDocument
              number={invoice.id}
              date={invoice.time}
              customer={invoice.customer}
              phone={customers.find((c) => c.name === invoice.customer)?.phone ?? "Walk-in customer"}
              lines={
                invoice.lines
                  ? invoice.lines.map((l) => {
                      const p = products.find((x) => x.id === l.id);
                      return { name: l.name, hsn: p?.sku.replace(/\D/g, "").padEnd(4, "0").slice(0, 4) ?? "0000", qty: l.qty, unit: p?.unit ?? "pc", rate: l.price, gst: p?.gst ?? 0 };
                    })
                  : SAMPLE_LINES
              }
              paid={invoice.status === "Paid"}
              method={invoice.method}
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="border-r border-border px-4 py-4 last:border-r-0 first:pl-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${alert ? "text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}
