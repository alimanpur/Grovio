import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Search } from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { customers, inr } from "@/lib/grovio-data";
import { customerDue, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Grovio" },
      { name: "description", content: "Your regulars: what they buy, how often they visit, and what they owe — linked to every bill." },
      { property: "og:title", content: "Customers — Grovio" },
      { property: "og:description", content: "Who are our regulars, and who owes us?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Customers,
});

const FILTERS = ["All", "Owes money", "Frequent", "Bulk"] as const;

function Customers() {
  const st = useGrovio();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selected, setSelected] = useState<string | null>(null);

  const all = customers.map((c) => {
    const bills = st.invoices.filter((i) => i.customer === c.name);
    const live = bills.filter((i) => i.lines);
    return { ...c, owed: customerDue(st, c.name, c.due), bills, visits: c.visits + live.length, spend: c.spend + live.reduce((a, i) => a + i.total, 0) };
  });
  const list = all
    .filter((c) => (filter === "All" ? true : filter === "Owes money" ? c.owed > 0 : c.tag === filter))
    .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()));
  const c = list.find((x) => x.id === selected) ?? list[0];
  const owed = all.reduce((a, x) => a + x.owed, 0);

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Insights · Customers</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Who are our regulars?</h1>
        </div>
        <Link to="/payments" className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Collect dues
        </Link>
      </header>

      <dl className="mt-8 grid grid-cols-3 border-y border-border">
        <Fig label="Customers" value={String(all.length)} />
        <Fig label="Visits on record" value={String(all.reduce((a, x) => a + x.visits, 0))} />
        <Fig label="Owed to the store" value={inr(owed)} warn={owed > 0} />
      </dl>

      <div className="mt-8 grid gap-10 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <section aria-label="Customer list" className="min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" placeholder="Name or phone" className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          <div role="tablist" className="mt-2 flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`ring-focus h-8 rounded-md px-3 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>{f}</button>
            ))}
          </div>
          {list.length === 0 ? (
            <div className="mt-4"><EmptyState title="No customer matches" body="Try another name or filter." action={<button onClick={() => { setQuery(""); setFilter("All"); }} className="ring-focus rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Show everyone</button>} /></div>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {list.map((x) => (
                <li key={x.id}>
                  <button onClick={() => setSelected(x.id)} aria-current={c?.id === x.id} className={`ring-focus grid w-full grid-cols-[1fr_auto] gap-x-3 px-3 py-3 text-left ${c?.id === x.id ? "bg-accent" : "hover:bg-surface-2/60"}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{x.name}</span>
                      <span className="text-xs text-muted-foreground">{x.tag} · last visit {x.lastVisit.toLowerCase()}</span>
                    </span>
                    <span className={`num text-right text-sm font-semibold ${x.owed ? "text-destructive" : "text-muted-foreground"}`}>{x.owed ? inr(x.owed) : "Settled"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {c ? (
          <section aria-label={c.name} className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{c.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {c.tag} customer
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Phone className="h-3.5 w-3.5" /> {c.phone}</a>
            </p>
            <dl className="mt-6 grid grid-cols-3 border-y border-border">
              <Fig label="Visits" value={String(c.visits)} />
              <Fig label="Lifetime spend" value={inr(c.spend)} />
              <Fig label="Owes" value={inr(c.owed)} warn={c.owed > 0} />
            </dl>
            <p className="mt-6 border-l-2 border-primary pl-4 text-sm">{c.note}</p>

            <div className="mt-8 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">Bills</h3>
              <Link to="/billing" className="text-xs font-semibold text-primary hover:underline">New bill</Link>
            </div>
            {c.bills.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No bills in Bill history for {c.name} yet. Choose them as the customer at the counter.</p> : (
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {c.bills.map((b) => (
                  <li key={b.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                    <span><span className="num font-semibold">{b.id}</span> <span className="text-xs text-muted-foreground">· {b.items} items · {b.method} · {b.time}</span></span>
                    <span className="text-right">
                      <span className="num font-semibold">{inr(b.total)}</span>
                      {b.status !== "Paid" ? <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-destructive">{b.status === "Partial" ? "Part paid" : "Unpaid"}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Visit counts and spend include sample history.</p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Fig({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${warn ? "text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}
