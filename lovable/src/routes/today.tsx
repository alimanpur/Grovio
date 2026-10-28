import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarX2,
  ChartLine,
  IndianRupee,
  PackagePlus,
  ReceiptText,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { inr } from "@/lib/grovio-data";
import { useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today — Grovio" },
      {
        name: "description",
        content:
          "Grovio's Today workspace: what needs your attention, the day's sales and the latest activity in your store.",
      },
      { property: "og:title", content: "Today — Grovio" },
      { property: "og:description", content: "What needs my attention today?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
});

/* Illustrative baseline for the part of the day before this browser started recording. */
const BASE_SALES = 38900;
const BASE_BILLS = 164;
const BASE_MARGIN = 0.19;

type Attention = {
  key: string;
  rank: number;
  tone: "danger" | "warn";
  Icon: typeof AlertTriangle;
  title: string;
  detail: string;
  label: string;
  action: { to: "/purchases" | "/payments" | "/inventory"; text: string };
};

const quick = [
  { to: "/billing", label: "New bill", Icon: ReceiptText, key: "F2" },
  { to: "/products", label: "Add product", Icon: PackagePlus },
  { to: "/purchases", label: "Record purchase", Icon: Truck },
  { to: "/reports", label: "View reports", Icon: ChartLine },
] as const;

function Today() {
  const { products, invoices, pulse } = useGrovio();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const [showAll, setShowAll] = useState(false);

  const live = invoices.filter((i) => i.lines);
  const sales = BASE_SALES + live.reduce((a, i) => a + i.total, 0);
  const bills = BASE_BILLS + live.length;
  const due = invoices.filter((i) => i.status !== "Paid");

  const attention: Attention[] = [];
  for (const p of products) {
    if (p.stock === 0 || p.stock < p.minStock) {
      attention.push({
        key: `low-${p.id}`,
        rank: p.stock === 0 ? 0 : p.stock / p.minStock,
        tone: p.stock === 0 ? "danger" : "warn",
        Icon: AlertTriangle,
        title: p.stock === 0 ? `${p.name} is out of stock` : `${p.name} is running low`,
        detail: `${p.stock} ${p.unit} left · minimum ${p.minStock} · ${p.supplier}`,
        label: p.stock === 0 ? "Out of stock" : "Low stock",
        action: { to: "/purchases", text: "Reorder" },
      });
    }
    if (now && p.expiry && p.stock > 0) {
      const days = Math.ceil((new Date(p.expiry).getTime() - now.getTime()) / 86400000);
      if (days <= 30)
        attention.push({
          key: `exp-${p.id}`,
          rank: days < 0 ? 0.05 : 0.5,
          tone: days < 0 ? "danger" : "warn",
          Icon: CalendarX2,
          title: days < 0 ? `${p.name} is past its expiry date` : `${p.name} expires in ${days} days`,
          detail: `Batch ${p.batch ?? "—"} · ${p.stock} ${p.unit} on the shelf`,
          label: days < 0 ? "Expired" : "Expiring",
          action: { to: "/inventory", text: "Review batch" },
        });
    }
  }
  for (const i of due)
    attention.push({
      key: `due-${i.id}`,
      rank: 0.8,
      tone: "warn",
      Icon: IndianRupee,
      title: `${inr(i.total)} to collect from ${i.customer}`,
      detail: `${i.id} · ${i.status === "Due" ? "on credit" : "partly paid"} · ${i.method}`,
      label: i.status === "Due" ? "Unpaid" : "Partly paid",
      action: { to: "/payments", text: "Follow up" },
    });
  attention.sort((a, b) => a.rank - b.rank);
  const shown = showAll ? attention : attention.slice(0, 6);

  const hour = now?.getHours() ?? 9;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = now?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AppShell>
      {/* 1 — Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="num text-xs uppercase tracking-[0.14em] text-muted-foreground" suppressHydrationWarning>
            {date ?? "Today"} · Sharma Provision Store
          </p>
          <h1 className="display mt-3 text-4xl leading-[0.95] sm:text-6xl">
            {greeting}, Ramesh.
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {shown.length === 0
              ? "Nothing needs you right now. A calm day."
              : `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention.`}
          </p>
        </div>
        <Link
          to="/billing"
          className="ring-focus inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ReceiptText className="h-4 w-4" /> New bill
        </Link>
      </header>

      <div className="mt-10 grid gap-x-14 gap-y-12 xl:grid-cols-[1.25fr_1fr]">
        {/* 2 — Attention */}
        <section aria-labelledby="attn">
          <div className="flex items-baseline justify-between border-b border-foreground pb-3">
            <h2 id="attn" className="text-sm font-bold uppercase tracking-[0.12em]">
              Needs your attention
            </h2>
            <span className="num text-xs text-muted-foreground">
              {String(attention.length).padStart(2, "0")}
            </span>
          </div>
          {shown.length === 0 ? (
            <div className="py-12 text-center">
              <p className="display text-2xl">All clear.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Stock is above minimum and every bill is paid.
              </p>
            </div>
          ) : (
            <ol>
              {shown.map((a, i) => (
                <li
                  key={a.key}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-border py-4 animate-fade"
                >
                  <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <a.Icon
                        className={`h-4 w-4 shrink-0 ${a.tone === "danger" ? "text-destructive" : "text-saffron-foreground"}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold">{a.title}</span>
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          a.tone === "danger"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-saffron/20 text-saffron-foreground"
                        }`}
                      >
                        {a.label}
                      </span>
                    </span>
                    <span className="num mt-1 block truncate text-xs text-muted-foreground">{a.detail}</span>
                  </span>
                  <Link
                    to={a.action.to}
                    className="ring-focus inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {a.action.text} <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {attention.length > shown.length && (
            <button onClick={() => setShowAll(true)} className="ring-focus mt-4 text-xs font-semibold text-primary hover:underline">
              Show {attention.length - shown.length} more
            </button>
          )}
        </section>

        {/* 3 — Business summary */}
        <section aria-labelledby="sum" className="xl:border-l xl:border-border xl:pl-14">
          <h2 id="sum" className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Today’s sales
          </h2>
          <p className="num mt-3 text-6xl font-medium tracking-tight sm:text-7xl">{inr(sales)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Illustrative opening figures plus {live.length} {live.length === 1 ? "bill" : "bills"} recorded in this browser.
          </p>
          <dl className="mt-8 grid grid-cols-3 border-t border-border">
            {[
              ["Bills", String(bills)],
              ["Average bill", inr(Math.round(sales / bills))],
              ["Est. margin", inr(Math.round(sales * BASE_MARGIN))],
            ].map(([k, v]) => (
              <div key={k} className="border-r border-border py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="num mt-1 text-xl font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {/* 5 — Quick actions */}
          <nav aria-label="Quick actions" className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
            {quick.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="ring-focus group flex items-center gap-3 bg-card px-4 py-4 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </nav>
        </section>
      </div>

      {/* 4 — Activity */}
      <section aria-labelledby="act" className="mt-16">
        <div className="flex items-baseline justify-between border-b border-foreground pb-3">
          <h2 id="act" className="text-sm font-bold uppercase tracking-[0.12em]">
            Recent activity
          </h2>
          <Link to="/pulse" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Open Pulse <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <ol className="grid sm:grid-cols-2 xl:grid-cols-3">
          {pulse.slice(0, 6).map((e) => (
            <li key={e.id} className="border-b border-border py-4 pr-6 animate-fade">
              <time className="num text-xs text-muted-foreground">{e.time}</time>
              <p className="mt-1 text-sm font-semibold">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
