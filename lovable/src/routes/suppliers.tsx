import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { inr, suppliers } from "@/lib/grovio-data";
import { paySupplier, supplierDue, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Grovio" },
      { name: "description", content: "Who you buy from, what you owe them, and every order — with payments recorded in one place." },
      { property: "og:title", content: "Suppliers — Grovio" },
      { property: "og:description", content: "Who do we buy from, and what do we owe?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Suppliers,
});

function Suppliers() {
  const st = useGrovio();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = suppliers
    .map((s) => ({ ...s, due: supplierDue(st, s.name, s.outstanding) }))
    .filter((s) => `${s.name} ${s.contact} ${s.city}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.due - a.due);
  const sup = rows.find((s) => s.id === selected) ?? rows[0];
  const totalDue = suppliers.reduce((a, s) => a + supplierDue(st, s.name, s.outstanding), 0);

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Suppliers</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Who do we owe, and how much?</h1>
        </div>
        <Link to="/purchases" className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
          New purchase order
        </Link>
      </header>

      <dl className="mt-8 grid grid-cols-2 border-y border-border">
        <Fig label="Suppliers" value={String(suppliers.length)} />
        <Fig label="Total owed" value={inr(totalDue)} warn={totalDue > 0} />
      </dl>

      <div className="mt-8 grid gap-10 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <section aria-label="Supplier list" className="min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search suppliers" placeholder="Name, contact or city" className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          {rows.length === 0 ? (
            <div className="mt-4"><EmptyState title="No supplier matches" body="Check the spelling, or clear the search." action={<button onClick={() => setQuery("")} className="ring-focus rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Clear search</button>} /></div>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {rows.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelected(s.id)} aria-current={sup?.id === s.id} className={`ring-focus grid w-full grid-cols-[1fr_auto] gap-x-3 px-3 py-3 text-left ${sup?.id === s.id ? "bg-accent" : "hover:bg-surface-2/60"}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.city} · {s.terms}</span>
                    </span>
                    <span className={`num text-right text-sm font-semibold ${s.due ? "text-destructive" : "text-muted-foreground"}`}>{s.due ? inr(s.due) : "Settled"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sup ? <Detail key={sup.id} sup={sup} /> : null}
      </div>
    </AppShell>
  );
}

function Detail({ sup }: { sup: (typeof suppliers)[number] & { due: number } }) {
  const { purchaseOrders, products } = useGrovio();
  const [amount, setAmount] = useState("");
  const orders = purchaseOrders.filter((p) => p.supplier === sup.name);
  const items = products.filter((p) => p.supplier === sup.name);
  return (
    <section aria-label={sup.name} className="min-w-0">
      <h2 className="text-2xl font-semibold tracking-tight">{sup.name}</h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        {sup.contact} · {sup.city}
        <a href={`tel:${sup.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Phone className="h-3.5 w-3.5" /> {sup.phone}</a>
      </p>

      <form
        className="mt-6 flex flex-wrap items-end gap-4 border-y border-border py-5"
        onSubmit={(e) => {
          e.preventDefault();
          const r = paySupplier(sup.name, Number(amount), sup.due);
          if (!r.ok) return void toast.error("Payment not recorded", { description: r.error });
          toast.success(`${inr(Number(amount))} paid to ${sup.name}`);
          setAmount("");
        }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Owed · {sup.terms}</p>
          <p className={`num mt-1 text-3xl font-semibold ${sup.due ? "text-destructive" : ""}`}>{inr(sup.due)}</p>
        </div>
        {sup.due > 0 ? (
          <>
            <label className="ml-auto text-xs text-muted-foreground">
              Record payment (₹)
              <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={String(sup.due)} className="num ring-focus mt-1 block h-10 w-36 rounded-md border border-input bg-surface px-3 text-sm text-foreground" />
            </label>
            <button type="button" onClick={() => setAmount(String(sup.due))} className="ring-focus h-10 rounded-md border border-border px-3 text-xs font-semibold">Full amount</button>
            <button disabled={!amount} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">Record payment</button>
          </>
        ) : <p className="ml-auto text-sm text-muted-foreground">Nothing owed.</p>}
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Orders</h3>
          {orders.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No orders with this supplier yet.</p> : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span><span className="num font-semibold">{o.id}</span> <span className="text-xs text-muted-foreground">· {o.date} · {o.status}</span></span>
                  <span className="num font-semibold">{inr(o.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Products supplied</h3>
          {items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No products in your catalogue list this supplier.</p> : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {items.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span>{p.name}</span>
                  <span className={`num text-xs ${p.stock < p.minStock ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{p.stock} {p.unit} · cost {inr(p.purchasePrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
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
