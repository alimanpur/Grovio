import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageCheck, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { inr, suppliers } from "@/lib/grovio-data";
import { createPurchase, receivePurchase, useGrovio, type PurchaseOrder } from "@/lib/grovio-store";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — Grovio" },
      { name: "description", content: "Raise purchase orders from low stock, track deliveries and receive goods straight into inventory." },
      { property: "og:title", content: "Purchases — Grovio" },
      { property: "og:description", content: "What have we ordered, and what's still on the way?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Purchases,
});

const OPEN = (s: string) => s !== "Goods received" && s !== "Received";
const FILTERS = ["Open", "Received", "All"] as const;
const field = "ring-focus h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary";

function Purchases() {
  const { purchaseOrders, products } = useGrovio();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Open");
  const [raising, setRaising] = useState(false);
  const list = purchaseOrders.filter((p) => (filter === "All" ? true : filter === "Open" ? OPEN(p.status) : !OPEN(p.status)));
  const open = purchaseOrders.filter((p) => OPEN(p.status));
  const low = products.filter((p) => p.stock < p.minStock);

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Purchases</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What's still on the way?</h1>
        </div>
        <button onClick={() => setRaising(true)} className="ring-focus inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New purchase order
        </button>
      </header>

      <dl className="mt-8 grid grid-cols-3 border-y border-border">
        <Fig label={`Open orders · ${open.length}`} value={inr(open.reduce((a, p) => a + p.value, 0))} />
        <Fig label="Unpaid orders" value={String(purchaseOrders.filter((p) => p.payment !== "Paid").length)} />
        <Fig label="Products below minimum" value={String(low.length)} warn={low.length > 0} />
      </dl>

      {raising ? <RaisePO onClose={() => setRaising(false)} onDone={() => { setRaising(false); setFilter("Open"); }} /> : null}

      {!raising && low.length > 0 ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-l-2 border-destructive bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">{low.length} products are below their minimum</span>
            <span className="text-muted-foreground"> — {low.slice(0, 3).map((p) => p.name).join(", ")}{low.length > 3 ? "…" : ""}</span>
          </p>
          <button onClick={() => setRaising(true)} className="ring-focus text-sm font-semibold text-primary hover:underline">
            Draft an order for them
          </button>
        </div>
      ) : null}

      <section aria-label="Purchase orders" className="mt-8">
        <div role="tablist" className="flex w-fit overflow-hidden rounded-md border border-border">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`ring-focus h-9 px-4 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {f}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={filter === "Open" ? "Nothing on the way" : "No orders here yet"}
              body="Raise a purchase order and it will appear here until the goods arrive."
              action={<button onClick={() => setRaising(true)} className="ring-focus rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">New purchase order</button>}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-t border-foreground/80 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 font-semibold">Order</th>
                  <th className="py-3 font-semibold">Supplier</th>
                  <th className="py-3 text-right font-semibold">Units</th>
                  <th className="py-3 text-right font-semibold">Value</th>
                  <th className="py-3 pl-6 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Payment</th>
                  <th className="w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-b border-border">
                {list.map((po) => (
                  <PORow key={po.id} po={po} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function PORow({ po }: { po: PurchaseOrder }) {
  const isOpen = OPEN(po.status);
  return (
    <tr>
      <td className="py-3">
        <span className="num font-semibold">{po.id}</span>
        <span className="num block text-xs text-muted-foreground">{po.date}</span>
      </td>
      <td className="py-3">
        {po.supplier}
        {po.lines ? <span className="block truncate text-xs text-muted-foreground">{po.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}</span> : null}
      </td>
      <td className="num py-3 text-right">{po.items}</td>
      <td className="num py-3 text-right font-semibold">{inr(po.value)}</td>
      <td className="py-3 pl-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{isOpen ? po.status : "Received"}</td>
      <td className={`py-3 text-[11px] font-semibold uppercase tracking-wider ${po.payment === "Paid" ? "text-muted-foreground" : "text-destructive"}`}>{po.payment}</td>
      <td className="py-3 text-right">
        {isOpen ? (
          <button
            onClick={() => {
              const n = receivePurchase(po.id);
              toast.success(`${po.id} received`, { description: `${n} products restocked · see Inventory` });
            }}
            className="ring-focus inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <PackageCheck className="h-3.5 w-3.5" /> Receive
          </button>
        ) : (
          <Link to="/inventory" className="text-xs font-semibold text-primary hover:underline">
            In stock
          </Link>
        )}
      </td>
    </tr>
  );
}

function RaisePO({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { products } = useGrovio();
  const lowFirst = products.filter((p) => p.stock < p.minStock);
  const [supplier, setSupplier] = useState(lowFirst[0]?.supplier ?? suppliers[0]!.name);
  const forSupplier = products.filter((p) => p.supplier === supplier);
  const suggest = (id: string) => {
    const p = products.find((x) => x.id === id)!;
    return { id, qty: Math.max(0, p.maxStock - p.stock), cost: p.purchasePrice };
  };
  const [lines, setLines] = useState(() => forSupplier.filter((p) => p.stock < p.minStock).map((p) => suggest(p.id)));
  const names = Array.from(new Set([...suppliers.map((s) => s.name), ...products.map((p) => p.supplier).filter(Boolean)]));
  const value = lines.reduce((a, l) => a + l.qty * l.cost, 0);
  const addable = forSupplier.filter((p) => !lines.some((l) => l.id === p.id));

  return (
    <form
      aria-label="New purchase order"
      className="animate-rise mt-8 rounded-md border border-foreground/80 bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const r = createPurchase({ supplier, lines });
        if (!r.ok) return void toast.error("Order not raised", { description: r.error });
        toast.success(`${r.po.id} raised`, { description: `${inr(r.po.value)} · ${supplier}` });
        onDone();
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">New purchase order</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="ring-focus rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="mt-4 block text-xs text-muted-foreground">
        Supplier
        <select
          value={supplier}
          onChange={(e) => {
            setSupplier(e.target.value);
            setLines(products.filter((p) => p.supplier === e.target.value && p.stock < p.minStock).map((p) => suggest(p.id)));
          }}
          className={`${field} mt-1 block w-full max-w-sm`}
        >
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-muted-foreground">Low-stock products from this supplier are added for you, topped up to their maximum.</p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 font-semibold">Product</th>
            <th className="py-2 font-semibold">On hand</th>
            <th className="py-2 font-semibold">Order qty</th>
            <th className="py-2 font-semibold">Cost (₹)</th>
            <th className="py-2 text-right font-semibold">Amount</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-y border-border">
          {lines.map((l) => {
            const p = products.find((x) => x.id === l.id)!;
            const set = (k: "qty" | "cost") => (e: React.ChangeEvent<HTMLInputElement>) =>
              setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, [k]: Math.max(0, Number(e.target.value) || 0) } : x)));
            return (
              <tr key={l.id}>
                <td className="py-2 font-semibold">{p.name}</td>
                <td className={`num py-2 ${p.stock < p.minStock ? "text-destructive" : ""}`}>
                  {p.stock} / min {p.minStock}
                </td>
                <td className="py-2"><input aria-label={`Quantity of ${p.name}`} inputMode="numeric" value={l.qty} onChange={set("qty")} className={`num ${field} w-20`} /></td>
                <td className="py-2"><input aria-label={`Cost of ${p.name}`} inputMode="decimal" value={l.cost} onChange={set("cost")} className={`num ${field} w-24`} /></td>
                <td className="num py-2 text-right font-semibold">{inr(l.qty * l.cost)}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} aria-label={`Remove ${p.name}`} className="ring-focus p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {lines.length === 0 ? (
            <tr><td colSpan={6} className="py-4 text-sm text-muted-foreground">Nothing from this supplier is low. Add products below.</td></tr>
          ) : null}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {addable.length ? (
          <select value="" onChange={(e) => e.target.value && setLines((ls) => [...ls, suggest(e.target.value)])} aria-label="Add a product" className={field}>
            <option value="">+ Add a product from {supplier}</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : <span />}
        <div className="flex items-center gap-4">
          <p className="num text-sm">Order value <span className="text-lg font-semibold">{inr(value)}</span></p>
          <button className="ring-focus h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">Raise order</button>
        </div>
      </div>
    </form>
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
