import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, Check, CreditCard, HandCoins, Minus, Plus, Printer, QrCode, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { InvoiceDocument } from "@/components/grovio/InvoiceDocument";
import { customers, inr } from "@/lib/grovio-data";
import { completeSale, useGrovio, type Invoice } from "@/lib/grovio-store";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing counter — Grovio" },
      {
        name: "description",
        content: "A keyboard-first grocery counter: search or scan, adjust quantities, collect payment and print the GST invoice.",
      },
      { property: "og:title", content: "Billing counter — Grovio" },
      { property: "og:description", content: "Bill in seconds; stock updates itself." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Billing,
});

type Line = { id: string; qty: number; discount: number };

const METHODS = [
  { name: "Cash", icon: Banknote, key: "1" },
  { name: "UPI", icon: QrCode, key: "2" },
  { name: "Card", icon: CreditCard, key: "3" },
  { name: "Credit", icon: HandCoins, key: "4" },
] as const;

const lineTotal = (price: number, l: Line) => price * l.qty * (1 - l.discount / 100);

function Billing() {
  const { products, nextBill } = useGrovio();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<string>("UPI");
  const [customer, setCustomer] = useState("Walk-in");
  const [tendered, setTendered] = useState("");
  const [saved, setSaved] = useState<Invoice | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => `${p.name} ${p.sku} ${p.brand} ${p.category}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, products]);

  const rows = lines.flatMap((l) => {
    const p = products.find((x) => x.id === l.id);
    return p ? [{ ...l, product: p }] : [];
  });
  const subtotal = rows.reduce((a, r) => a + lineTotal(r.product.sellingPrice, r), 0);
  const discount = rows.reduce((a, r) => a + (r.product.sellingPrice * r.qty * r.discount) / 100, 0);
  const tax = rows.reduce((a, r) => a + (lineTotal(r.product.sellingPrice, r) * r.product.gst) / 100, 0);
  const total = Math.round(subtotal + tax);
  const units = rows.reduce((a, r) => a + r.qty, 0);
  const overs = rows.filter((r) => r.qty > r.product.stock);
  const cash = Number(tendered) || 0;
  const change = method === "Cash" && cash >= total ? cash - total : 0;
  const canSave = rows.length > 0 && overs.length === 0 && (method !== "Cash" || !tendered || cash >= total) && !(method === "Credit" && customer === "Walk-in");

  const add = (id: string) => {
    setSaved(null);
    setLines((prev) =>
      prev.some((l) => l.id === id) ? prev.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { id, qty: 1, discount: 0 }],
    );
    setQuery("");
    setCursor(0);
    searchRef.current?.focus();
  };
  const bump = (id: string, d: number) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const save = () => {
    if (!canSave) return;
    const res = completeSale({
      lines: rows.map((r) => ({ id: r.id, qty: r.qty, price: Math.round(r.product.sellingPrice * (1 - r.discount / 100)) })),
      total,
      method,
      customer,
    });
    if (!res.ok) {
      toast.error("Bill not saved", { description: res.error });
      return;
    }
    toast.success(`${res.invoice.id} saved`, { description: `${inr(res.invoice.total)} · ${method} · stock updated` });
    setSaved(res.invoice);
    setLines([]);
    setTendered("");
  };

  const nextCustomer = () => {
    setSaved(null);
    setCustomer("Walk-in");
    setMethod("UPI");
    searchRef.current?.focus();
  };

  // Keyboard-first counter: "/" search, F9 / Ctrl+Enter save, Alt+1-4 payment, Esc clear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "F9" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        save();
      } else if (e.altKey && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setMethod(METHODS[Number(e.key) - 1]!.name);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <AppShell
      focus={{
        title: `Bill GRV-${nextBill} · ${customer}`,
        subtitle: "Focus mode — everything else is hidden until this bill is done",
        exitTo: "/today",
        exitLabel: "Leave counter",
      }}
    >
      <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* LEFT — what are they buying */}
        <section aria-labelledby="cart-h" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">Counter · bill GRV-{nextBill}</p>
              <h1 id="cart-h" className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">
                What are they buying?
              </h1>
            </div>
            <p className="num text-xs text-muted-foreground">
              <Kbd>/</Kbd> search · <Kbd>↵</Kbd> add · <Kbd>F9</Kbd> save
            </p>
          </div>

          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              aria-label="Search products"
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && results[cursor]) {
                  e.preventDefault();
                  add(results[cursor]!.id);
                } else if (e.key === "Escape") setQuery("");
              }}
              placeholder="Product, brand or SKU — or scan a barcode"
              className="ring-focus h-14 w-full rounded-md border border-input bg-surface pl-12 pr-4 text-base outline-none focus:border-primary"
            />
            {query ? (
              <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
                {results.length === 0 ? (
                  <li className="px-4 py-5 text-sm text-muted-foreground">
                    Nothing matches “{query}”.{" "}
                    <Link to="/products" className="font-semibold text-primary underline-offset-2 hover:underline">
                      Add it as a product
                    </Link>
                  </li>
                ) : (
                  results.map((p, i) => (
                    <li key={p.id} role="option" aria-selected={i === cursor}>
                      <button
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => add(p.id)}
                        disabled={p.stock === 0}
                        className={`flex w-full items-center gap-4 px-4 py-2.5 text-left disabled:opacity-50 ${i === cursor ? "bg-accent" : ""}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{p.name}</span>
                          <span className="num block text-xs text-muted-foreground">
                            {p.sku} · GST {p.gst}%
                          </span>
                        </span>
                        <span className={`num text-xs ${p.stock <= p.minStock ? "text-destructive" : "text-muted-foreground"}`}>
                          {p.stock === 0 ? "Out of stock" : `${p.stock} ${p.unit}`}
                        </span>
                        <span className="num w-20 text-right text-sm font-semibold">{inr(p.sellingPrice)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          {/* Ledger */}
          {saved ? (
            <SavedBill invoice={saved} onNext={nextCustomer} />
          ) : rows.length === 0 ? (
            <div className="mt-8 border-t border-border pt-8">
              <p className="text-sm text-muted-foreground">Start the bill with a frequent item, or search above.</p>
              <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                {products
                  .filter((p) => p.stock > 0)
                  .slice(0, 8)
                  .map((p) => (
                    <button key={p.id} onClick={() => add(p.id)} className="ring-focus bg-surface p-4 text-left transition-colors hover:bg-accent">
                      <span className="line-clamp-2 block text-sm font-semibold leading-snug">{p.name}</span>
                      <span className="num mt-2 block text-sm">{inr(p.sellingPrice)}</span>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <table className="mt-8 w-full border-t border-foreground/80 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 font-semibold">Item</th>
                  <th className="py-3 text-center font-semibold">Qty</th>
                  <th className="hidden py-3 text-right font-semibold sm:table-cell">Rate</th>
                  <th className="py-3 text-right font-semibold">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-b border-border">
                {rows.map((r, i) => {
                  const over = r.qty > r.product.stock;
                  return (
                    <tr key={r.id} className="animate-fade">
                      <td className="py-3 pr-3">
                        <span className="num mr-3 text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-semibold">{r.product.name}</span>
                        <span className={`num block pl-8 text-xs ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                          {over ? `Only ${r.product.stock} on the shelf` : `${r.product.stock - r.qty} left after this bill`} · GST {r.product.gst}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="mx-auto flex w-fit items-center rounded-md border border-border">
                          <button onClick={() => bump(r.id, -1)} className="ring-focus grid h-8 w-8 place-items-center hover:bg-muted" aria-label={`Fewer ${r.product.name}`}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="num w-8 text-center font-semibold">{r.qty}</span>
                          <button
                            onClick={() => bump(r.id, 1)}
                            disabled={r.qty >= r.product.stock}
                            className="ring-focus grid h-8 w-8 place-items-center hover:bg-muted disabled:opacity-40"
                            aria-label={`More ${r.product.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </td>
                      <td className="num hidden py-3 text-right text-muted-foreground sm:table-cell">{inr(r.product.sellingPrice)}</td>
                      <td className="num py-3 text-right font-semibold">{inr(lineTotal(r.product.sellingPrice, r))}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setLines((p) => p.filter((l) => l.id !== r.id))}
                          className="ring-focus rounded p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${r.product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* RIGHT — what do they owe */}
        <aside aria-label="Payment" className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-md border border-border bg-surface">
            <div className="border-b border-border p-5">
              <label htmlFor="cust" className="eyebrow">
                Customer
              </label>
              <select
                id="cust"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="ring-focus mt-2 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
              >
                <option>Walk-in</option>
                {customers.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <dl className="space-y-2 p-5 text-sm">
              <Sum label={`Items · ${units} units`} value={inr(subtotal + discount)} />
              {discount > 0 ? <Sum label="Discounts" value={`− ${inr(discount)}`} /> : null}
              <Sum label="GST" value={inr(tax)} />
              <div className="flex items-baseline justify-between border-t border-dashed border-border pt-4">
                <dt className="text-sm font-semibold">To collect</dt>
                <dd className="num text-4xl font-semibold tracking-tight">{inr(total)}</dd>
              </div>
            </dl>

            <div className="border-t border-border p-5">
              <p className="eyebrow">Payment</p>
              <div role="radiogroup" aria-label="Payment method" className="mt-2 grid grid-cols-4 overflow-hidden rounded-md border border-border">
                {METHODS.map((m) => (
                  <button
                    key={m.name}
                    role="radio"
                    aria-checked={method === m.name}
                    onClick={() => setMethod(m.name)}
                    title={`Alt+${m.key}`}
                    className={`ring-focus flex flex-col items-center gap-1 border-r border-border py-2.5 text-[11px] font-semibold last:border-r-0 ${
                      method === m.name ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.name}
                  </button>
                ))}
              </div>

              {method === "Cash" ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Received
                    <input
                      inputMode="numeric"
                      value={tendered}
                      onChange={(e) => setTendered(e.target.value.replace(/\D/g, ""))}
                      placeholder={String(total)}
                      className="num ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground"
                    />
                  </label>
                  <div className="text-xs text-muted-foreground">
                    Return
                    <p className={`num mt-1 flex h-10 items-center text-lg font-semibold ${tendered && cash < total ? "text-destructive" : "text-foreground"}`}>
                      {tendered && cash < total ? `short ${inr(total - cash)}` : inr(change)}
                    </p>
                  </div>
                </div>
              ) : null}
              {method === "Credit" ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {customer === "Walk-in" ? "Choose a customer to bill on credit." : `Added to ${customer}'s balance as due.`}
                </p>
              ) : null}

              <button
                onClick={save}
                disabled={!canSave}
                className="ring-focus mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save bill · {inr(total)} <Kbd tone="dark">F9</Kbd>
              </button>
              {overs.length ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                  Reduce {overs[0]!.product.name} — not enough on the shelf.
                </p>
              ) : null}
              {rows.length ? (
                <button onClick={() => setLines([])} className="ring-focus mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" /> Discard this bill
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function SavedBill({ invoice, onNext }: { invoice: Invoice; onNext: () => void }) {
  const { products } = useGrovio();
  return (
    <div className="animate-rise mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/80 pt-6">
        <p className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </span>
          <span>
            <span className="num block text-lg font-semibold">{invoice.id} saved</span>
            <span className="text-sm text-muted-foreground">
              {inr(invoice.total)} · {invoice.method} · {invoice.status === "Due" ? "added to dues" : "paid"}
            </span>
          </span>
        </p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button autoFocus onClick={onNext} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Next customer
          </button>
        </div>
      </div>
      <div className="mt-6">
        <InvoiceDocument
          number={invoice.id}
          date={new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
          customer={invoice.customer}
          phone={customers.find((c) => c.name === invoice.customer)?.phone ?? "Walk-in customer"}
          lines={(invoice.lines ?? []).map((l) => {
            const p = products.find((x) => x.id === l.id);
            return { name: l.name, hsn: p?.sku.replace(/\D/g, "").padEnd(4, "0").slice(0, 4) ?? "0000", qty: l.qty, unit: p?.unit ?? "pc", rate: l.price, gst: p?.gst ?? 0 };
          })}
          paid={invoice.status === "Paid"}
          method={invoice.method}
        />
      </div>
    </div>
  );
}

function Sum({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function Kbd({ children, tone }: { children: React.ReactNode; tone?: "dark" }) {
  return (
    <kbd className={`num rounded border px-1.5 py-0.5 text-[10px] ${tone ? "border-primary-foreground/30" : "border-border bg-surface"}`}>{children}</kbd>
  );
}
