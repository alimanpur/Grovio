import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { inr } from "@/lib/grovio-data";
import { processReturn, returnable, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns — Grovio" },
      { name: "description", content: "Take items back against the original bill: refund the right amount and put good stock back on the shelf." },
      { property: "og:title", content: "Returns — Grovio" },
      { property: "og:description", content: "How do I take this item back correctly?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Returns,
});

const REASONS = ["Wrong item", "Damaged pack", "Expired", "Customer changed mind", "Billing mistake"];

function Returns() {
  const st = useGrovio();
  const [query, setQuery] = useState("");
  const [billId, setBillId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState(REASONS[0]!);
  const [restock, setRestock] = useState(true);

  const withLines = st.invoices.filter((i) => i.lines);
  const matches = query ? withLines.filter((i) => `${i.id} ${i.customer}`.toLowerCase().includes(query.toLowerCase())) : withLines.slice(0, 6);
  const bill = st.invoices.find((i) => i.id === billId);
  const refund = bill?.lines?.reduce((a, l) => a + (qty[l.id] ?? 0) * l.price, 0) ?? 0;
  const returns = st.returns ?? [];

  const pick = (id: string) => {
    setBillId(id);
    setQty({});
  };

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Counter · Returns</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Which bill is this coming back from?</h1>
      </header>

      <div className="mt-8 grid gap-10 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-label="Find the bill" className="min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find bill" placeholder="Bill number or customer" className="ring-focus h-11 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          {matches.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {withLines.length === 0 ? "Returns work on bills saved at the counter. " : "No saved bill matches that. "}
              <Link to="/billing" className="font-semibold text-primary hover:underline">Go to the counter</Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {matches.map((i) => (
                <li key={i.id}>
                  <button onClick={() => pick(i.id)} aria-current={billId === i.id} className={`ring-focus flex w-full justify-between gap-3 px-3 py-3 text-left ${billId === i.id ? "bg-accent" : "hover:bg-surface-2/60"}`}>
                    <span>
                      <span className="num block text-sm font-semibold">{i.id}</span>
                      <span className="text-xs text-muted-foreground">{i.customer} · {i.time}</span>
                    </span>
                    <span className="num text-sm font-semibold">{inr(i.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Older sample bills have no item details, so only bills saved at the counter appear here.</p>
        </section>

        <section aria-label="Return items" className="min-w-0">
          {!bill?.lines ? (
            <EmptyState title="Choose a bill to start" body="Pick the bill on the left. You'll choose what's coming back, and Grovio works out the refund." />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const r = processReturn({ invoiceId: bill.id, lines: Object.entries(qty).map(([id, q]) => ({ id, qty: q })), reason, restock });
                if (!r.ok) return void toast.error("Return not saved", { description: r.error });
                toast.success(`${r.record.id} saved`, { description: `Refund ${inr(r.record.refund)}${restock ? " · stock back on shelf" : ""}` });
                setQty({});
              }}
            >
              <h2 className="num text-xl font-semibold">{bill.id} <span className="font-sans text-sm font-normal text-muted-foreground">· {bill.customer} · paid by {bill.method}</span></h2>
              <table className="mt-4 w-full border-t border-foreground/80 text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 font-semibold">Item</th>
                    <th className="py-3 text-right font-semibold">Rate</th>
                    <th className="py-3 text-right font-semibold">Can return</th>
                    <th className="py-3 text-right font-semibold">Returning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border border-b border-border">
                  {bill.lines.map((l) => {
                    const max = returnable(st, bill.id, l.id);
                    return (
                      <tr key={l.id}>
                        <td className="py-3 font-semibold">{l.name}</td>
                        <td className="num py-3 text-right">{inr(l.price)}</td>
                        <td className="num py-3 text-right text-muted-foreground">{max} of {l.qty}</td>
                        <td className="py-3 text-right">
                          <input
                            aria-label={`Return quantity for ${l.name}`}
                            inputMode="numeric"
                            disabled={max === 0}
                            value={qty[l.id] ?? 0}
                            onChange={(e) => setQty((q) => ({ ...q, [l.id]: Math.min(max, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                            className="num ring-focus h-9 w-16 rounded-md border border-input bg-surface px-2 text-right disabled:opacity-40"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-5 flex flex-wrap items-end gap-5">
                <label className="text-xs text-muted-foreground">
                  Reason
                  <select value={reason} onChange={(e) => { setReason(e.target.value); setRestock(!["Damaged pack", "Expired"].includes(e.target.value)); }} className="ring-focus mt-1 block h-10 rounded-md border border-input bg-surface px-3 text-sm text-foreground">
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                  Put back on the shelf
                </label>
                <div className="ml-auto flex items-center gap-4">
                  <p className="num text-sm">Refund <span className="text-2xl font-semibold">{inr(refund)}</span></p>
                  <button disabled={!refund} className="ring-focus h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Save return</button>
                </div>
              </div>
            </form>
          )}

          <h3 className="mt-12 text-sm font-semibold">Recent returns</h3>
          {returns.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No returns yet.</p> : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {returns.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span><span className="num font-semibold">{r.id}</span> <span className="text-xs text-muted-foreground">· {r.invoiceId} · {r.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")} · {r.reason} · {r.time}</span></span>
                  <span className="num font-semibold">−{inr(r.refund)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
