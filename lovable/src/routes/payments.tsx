import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { customers, inr } from "@/lib/grovio-data";
import { collectPayment, customerDue, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Grovio" },
      { name: "description", content: "How money came in — cash, UPI, card and credit — and who still owes the store." },
      { property: "og:title", content: "Payments — Grovio" },
      { property: "og:description", content: "Where did the money come from, and who still owes us?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Payments,
});

const METHODS = ["Cash", "UPI", "Card", "Split", "Credit"];

function Payments() {
  const st = useGrovio();
  const total = st.invoices.reduce((a, i) => a + i.total, 0);
  const refunds = (st.returns ?? []).reduce((a, r) => a + r.refund, 0);
  const mix = METHODS.map((m) => {
    const v = st.invoices.filter((i) => i.method === m).reduce((a, i) => a + i.total, 0);
    return { m, v, pct: total ? (v / total) * 100 : 0 };
  }).filter((x) => x.v > 0);
  const owing = customers.map((c) => ({ ...c, owed: customerDue(st, c.name, c.due) })).filter((c) => c.owed > 0).sort((a, b) => b.owed - a.owed);
  const owed = owing.reduce((a, c) => a + c.owed, 0);

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Counter · Payments</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Who still owes us?</h1>
      </header>

      <dl className="mt-8 grid grid-cols-3 border-y border-border">
        <Fig label={`Billed · ${st.invoices.length} bills`} value={inr(total)} />
        <Fig label="Refunded" value={inr(refunds)} />
        <Fig label={`Owed by ${owing.length} customers`} value={inr(owed)} warn={owed > 0} />
      </dl>

      <div className="mt-10 grid gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Customer dues" className="min-w-0">
          <h2 className="text-sm font-semibold">To collect</h2>
          {owing.length === 0 ? (
            <div className="mt-4"><EmptyState title="Everyone is settled" body="Bills saved on credit at the counter will appear here until they're paid." /></div>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {owing.map((c) => <DueRow key={c.id} name={c.name} phone={c.phone} owed={c.owed} />)}
            </ul>
          )}
        </section>

        <aside aria-label="How money came in">
          <h2 className="text-sm font-semibold">How money came in</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            {mix.map((x, i) => <span key={x.m} style={{ width: `${x.pct}%`, opacity: 1 - i * 0.17 }} className={x.m === "Credit" ? "bg-saffron" : "bg-primary"} />)}
          </div>
          <dl className="mt-4 divide-y divide-border border-y border-border">
            {mix.map((x) => (
              <div key={x.m} className="flex items-baseline justify-between py-2.5 text-sm">
                <dt>{x.m}</dt>
                <dd className="num"><span className="font-semibold">{inr(x.v)}</span> <span className="text-xs text-muted-foreground">· {Math.round(x.pct)}%</span></dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">From all bills in <Link to="/bills" className="font-semibold text-primary hover:underline">Bill history</Link>, including sample bills.</p>
        </aside>
      </div>
    </AppShell>
  );
}

function DueRow({ name, phone, owed }: { name: string; phone: string; owed: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">{name}</span>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="num text-xs text-muted-foreground hover:text-primary">{phone}</a>
        </span>
        <span className="flex items-center gap-4">
          <span className="num text-lg font-semibold text-destructive">{inr(owed)}</span>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="ring-focus rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">{open ? "Close" : "Collect"}</button>
        </span>
      </div>
      {open ? (
        <form
          className="animate-fade mt-3 flex flex-wrap items-end gap-3 bg-accent/60 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const r = collectPayment(name, Number(amount), owed, method);
            if (!r.ok) return void toast.error("Payment not recorded", { description: r.error });
            toast.success(`${inr(Number(amount))} collected from ${name}`);
            setAmount("");
            setOpen(false);
          }}
        >
          <label className="text-xs text-muted-foreground">
            Amount (₹)
            <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={String(owed)} className="num ring-focus mt-1 block h-10 w-32 rounded-md border border-input bg-surface px-3 text-sm text-foreground" />
          </label>
          <button type="button" onClick={() => setAmount(String(owed))} className="ring-focus h-10 rounded-md border border-border bg-surface px-3 text-xs font-semibold">Full amount</button>
          <label className="text-xs text-muted-foreground">
            Paid by
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="ring-focus mt-1 block h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground">
              {["UPI", "Cash", "Card"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <button disabled={!amount} className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">Record payment</button>
        </form>
      ) : null}
    </li>
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
