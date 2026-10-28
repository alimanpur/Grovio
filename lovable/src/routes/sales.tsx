import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/grovio/AppShell";
import { inr, revenueTrend, salesByHour, topProducts } from "@/lib/grovio-data";
import { useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Grovio" },
      { name: "description", content: "Revenue and profit across the week, the busiest hours, and what actually sold at your counter." },
      { property: "og:title", content: "Sales — Grovio" },
      { property: "og:description", content: "Is the business actually growing?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sales,
});

const VIEWS = ["Revenue", "Profit"] as const;
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }, formatter: (v: number) => inr(v) };

function Sales() {
  const { invoices, products } = useGrovio();
  const [view, setView] = useState<(typeof VIEWS)[number]>("Revenue");

  // Counter bills saved in Grovio (they carry line items); everything else is sample history.
  const live = invoices.filter((i) => i.lines);
  const liveTotal = live.reduce((a, i) => a + i.total, 0);
  const week = revenueTrend.reduce((a, d) => a + d.revenue, 0);
  const profit = revenueTrend.reduce((a, d) => a + d.profit, 0);
  const best = revenueTrend.reduce((a, d) => (d.revenue > a.revenue ? d : a));
  const peak = salesByHour.reduce((a, h) => (h.revenue > a.revenue ? h : a));

  const sold = new Map<string, { name: string; units: number; revenue: number; cost: number; category: string }>();
  for (const i of live)
    for (const l of i.lines!) {
      const p = products.find((x) => x.id === l.id);
      const cur = sold.get(l.id) ?? { name: l.name, units: 0, revenue: 0, cost: 0, category: p?.category ?? "Other" };
      cur.units += l.qty;
      cur.revenue += l.qty * l.price;
      cur.cost += l.qty * (p?.purchasePrice ?? 0);
      sold.set(l.id, cur);
    }
  const liveTop = [...sold.values()].sort((a, b) => b.revenue - a.revenue);
  const byCat = Object.entries(liveTop.reduce<Record<string, number>>((a, s) => ({ ...a, [s.category]: (a[s.category] ?? 0) + s.revenue }), {})).sort((a, b) => b[1] - a[1]);
  const catTotal = byCat.reduce((a, [, v]) => a + v, 0);

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Insights · Sales</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Is the business growing?</h1>
      </header>

      <section aria-label="This week" className="mt-8 border-t border-foreground/80 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last 7 days · illustrative</p>
            <p className="num mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">{inr(view === "Revenue" ? week : profit)}</p>
            <p className="num mt-2 text-sm text-muted-foreground">
              {view === "Revenue" ? `${inr(profit)} profit · ${Math.round((profit / week) * 100)}% margin` : `on ${inr(week)} revenue`} · best day {best.day} ({inr(best.revenue)})
            </p>
          </div>
          <div role="tablist" className="flex overflow-hidden rounded-md border border-border">
            {VIEWS.map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`ring-focus h-9 px-4 text-xs font-semibold ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey={view === "Revenue" ? "revenue" : "profit"} name={view} stroke="var(--primary)" strokeWidth={2} fill="var(--accent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-label="Busiest hours">
          <h2 className="text-sm font-semibold">When customers come <span className="font-normal text-muted-foreground">· illustrative</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">Busiest around {peak.hour.replace("p", " pm").replace("a", " am")} — keep a second counter ready.</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByHour}>
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip {...tip} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="revenue" name="Sales" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section aria-label="Best sellers">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              Best sellers <span className="font-normal text-muted-foreground">· {liveTop.length ? `from ${live.length} counter bill${live.length === 1 ? "" : "s"} · before GST` : "illustrative"}</span>
            </h2>
            {liveTop.length ? <span className="num text-sm font-semibold">{inr(liveTotal)}</span> : null}
          </div>
          <ol className="mt-3 divide-y divide-border border-y border-border">
            {(liveTop.length ? liveTop.map((s) => ({ name: s.name, units: s.units, revenue: s.revenue, margin: s.revenue ? Math.round(((s.revenue - s.cost) / s.revenue) * 100) : 0 })) : topProducts)
              .slice(0, 6)
              .map((p, i) => (
                <li key={p.name} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-2 py-2.5 text-sm">
                  <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="num block text-xs text-muted-foreground">{p.units} sold · {p.margin}% margin</span>
                  </span>
                  <span className="num font-semibold">{inr(p.revenue)}</span>
                </li>
              ))}
          </ol>
          {!liveTop.length ? <p className="mt-2 text-xs text-muted-foreground"><Link to="/billing" className="font-semibold text-primary hover:underline">Save a bill</Link> and this list switches to your real sales.</p> : null}
        </section>
      </div>

      {byCat.length ? (
        <section aria-label="By category" className="mt-12">
          <h2 className="text-sm font-semibold">By category <span className="font-normal text-muted-foreground">· counter bills</span></h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            {byCat.map(([c, v], i) => <span key={c} className="bg-primary" style={{ width: `${(v / catTotal) * 100}%`, opacity: 1 - i * 0.15 }} />)}
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {byCat.map(([c, v]) => (
              <div key={c} className="flex gap-2"><dt className="text-muted-foreground">{c}</dt><dd className="num font-semibold">{inr(v)} · {Math.round((v / catTotal) * 100)}%</dd></div>
            ))}
          </dl>
        </section>
      ) : null}
    </AppShell>
  );
}
