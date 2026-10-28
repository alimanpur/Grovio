import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { inr, type Product } from "@/lib/grovio-data";
import { adjustStock, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Grovio" },
      { name: "description", content: "Shelf levels, low stock, expiry and every stock movement — with quick counts and corrections." },
      { property: "og:title", content: "Inventory — Grovio" },
      { property: "og:description", content: "What do I have, and what runs out next?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventory,
});

type Status = "Out" | "Low" | "Expired" | "Expiring" | "OK";
const DAY = 86_400_000;
function statusOf(p: Product, now: number): Status {
  if (p.stock === 0) return "Out";
  if (p.expiry) {
    const d = (new Date(p.expiry).getTime() - now) / DAY;
    if (d < 0) return "Expired";
    if (d <= 30) return "Expiring";
  }
  if (p.stock < p.minStock) return "Low";
  return "OK";
}
const LABEL: Record<Status, string> = { Out: "Out of stock", Low: "Low stock", Expired: "Expired", Expiring: "Expiring soon", OK: "Healthy" };
const FILTERS = ["All", "Needs action", "Expiry"] as const;
const REASONS = ["Shelf count", "Damaged", "Expired — removed", "Returned to supplier", "Found extra"];

function Inventory() {
  const { products, pulse } = useGrovio();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();

  const rows = useMemo(() => products.map((p) => ({ p, s: statusOf(p, now) })), [products, now]);
  const needs = rows.filter((r) => r.s !== "OK");
  const expiry = rows.filter((r) => r.s === "Expired" || r.s === "Expiring");
  const list = rows
    .filter((r) => (filter === "All" ? true : filter === "Expiry" ? r.s === "Expired" || r.s === "Expiring" : r.s !== "OK"))
    .filter((r) => `${r.p.name} ${r.p.sku} ${r.p.brand}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.s === "OK" ? 1 : 0) - (b.s === "OK" ? 1 : 0));
  const value = products.reduce((a, p) => a + p.purchasePrice * p.stock, 0);
  const moves = pulse.filter((e) => e.kind === "stock" || e.kind === "alert" || e.title.startsWith("Invoice")).slice(0, 8);
  const counts = { All: rows.length, "Needs action": needs.length, Expiry: expiry.length };

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Inventory</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What runs out next?</h1>
        </div>
        <Link to="/purchases" className="ring-focus inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Reorder stock
        </Link>
      </header>

      <dl className="mt-8 grid grid-cols-2 border-y border-border sm:grid-cols-4">
        <Fig label="Stock value at cost" value={inr(value)} />
        <Fig label="Products" value={String(products.length)} />
        <Fig label="Low or out" value={String(rows.filter((r) => r.s === "Low" || r.s === "Out").length)} warn />
        <Fig label="Expired or expiring" value={String(expiry.length)} warn />
      </dl>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Stock levels" className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search stock"
                placeholder="Name, brand or SKU"
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
                  {f} <span className="num opacity-70">{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={filter === "All" ? "No product matches that" : "Nothing needs attention"}
                body={filter === "All" ? "Check the spelling or add the product from Products." : "Every shelf is above its minimum and nothing is close to expiry."}
                action={
                  <button onClick={() => { setFilter("All"); setQuery(""); }} className="ring-focus rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    Show all stock
                  </button>
                }
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-t border-foreground/80 text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 font-semibold">Product</th>
                    <th className="py-3 font-semibold">Status</th>
                    <th className="py-3 text-right font-semibold">On hand</th>
                    <th className="py-3 pl-6 font-semibold">Shelf</th>
                    <th className="py-3 text-right font-semibold">Expiry</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border border-b border-border">
                  {list.map(({ p, s }) => (
                    <StockRow key={p.id} p={p} s={s} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside aria-label="Stock movements">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Movements</h2>
            <Link to="/pulse" className="text-xs font-semibold text-primary hover:underline">
              All in Pulse
            </Link>
          </div>
          <ol className="mt-3 divide-y divide-border border-y border-border">
            {moves.map((m) => (
              <li key={m.id} className="py-3">
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.detail}</p>
                <p className="num mt-0.5 text-[11px] text-muted-foreground">{m.day === "Today" ? m.time : m.day}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </AppShell>
  );
}

function StockRow({ p, s, open, onToggle }: { p: Product; s: Status; open: boolean; onToggle: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState(REASONS[0]!);
  const pct = Math.min(100, (p.stock / Math.max(1, p.maxStock)) * 100);
  const minPct = Math.min(100, (p.minStock / Math.max(1, p.maxStock)) * 100);
  const bad = s !== "OK";
  return (
    <>
      <tr className={open ? "bg-accent/60" : ""}>
        <td className="py-3 pr-3">
          <span className="block font-semibold">{p.name}</span>
          <span className="num block text-xs text-muted-foreground">
            {p.sku} · {p.category}
          </span>
        </td>
        <td className={`py-3 text-[11px] font-semibold uppercase tracking-wider ${bad ? "text-destructive" : "text-muted-foreground"}`}>{LABEL[s]}</td>
        <td className="num py-3 text-right font-semibold">
          {p.stock} <span className="font-normal text-muted-foreground">{p.unit}</span>
        </td>
        <td className="py-3 pl-6">
          <span className="relative block h-1.5 w-28 rounded-full bg-muted" aria-label={`${p.stock} of ${p.maxStock}, minimum ${p.minStock}`}>
            <span className={`absolute inset-y-0 left-0 rounded-full ${p.stock < p.minStock ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            <span className="absolute -top-1 h-3.5 w-px bg-foreground/60" style={{ left: `${minPct}%` }} />
          </span>
        </td>
        <td className="num py-3 text-right text-xs text-muted-foreground">
          {p.expiry ? new Date(p.expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
        </td>
        <td className="py-3 text-right">
          <button onClick={onToggle} aria-expanded={open} className="ring-focus rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface">
            {open ? "Close" : "Adjust"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-accent/60">
          <td colSpan={6} className="pb-4">
            <form
              className="flex flex-wrap items-end gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!delta) return;
                adjustStock(p.id, delta, reason);
                toast.success(`${p.name}: ${p.stock} → ${Math.max(0, p.stock + delta)}`, { description: reason });
                setDelta(0);
                onToggle();
              }}
            >
              <div className="text-xs text-muted-foreground">
                Change
                <span className="mt-1 flex items-center rounded-md border border-border bg-surface">
                  <button type="button" onClick={() => setDelta((d) => Math.max(-p.stock, d - 1))} className="ring-focus grid h-10 w-10 place-items-center" aria-label="Remove one">
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    value={delta}
                    inputMode="numeric"
                    aria-label="Quantity change"
                    onChange={(e) => setDelta(Math.max(-p.stock, parseInt(e.target.value, 10) || 0))}
                    className="num h-10 w-14 bg-transparent text-center text-sm font-semibold text-foreground outline-none"
                  />
                  <button type="button" onClick={() => setDelta((d) => d + 1)} className="ring-focus grid h-10 w-10 place-items-center" aria-label="Add one">
                    <Plus className="h-4 w-4" />
                  </button>
                </span>
              </div>
              <label className="text-xs text-muted-foreground">
                Reason
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="ring-focus mt-1 h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground">
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <p className="num pb-2.5 text-sm">
                {p.stock} → <span className="font-semibold">{Math.max(0, p.stock + delta)}</span> {p.unit}
              </p>
              <button disabled={!delta} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                Save adjustment
              </button>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Fig({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${warn && value !== "0" ? "text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}
