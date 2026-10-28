import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  FileScan,
  IndianRupee,
  PackageCheck,
  ReceiptText,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { type PulseKind } from "@/lib/grovio-data";
import { useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "Pulse — Grovio" },
      {
        name: "description",
        content:
          "Pulse is the store's activity and attention stream: bills, stock changes, purchases, payments and alerts in order.",
      },
      { property: "og:title", content: "Pulse — Grovio" },
      { property: "og:description", content: "What has been happening in my store?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pulse,
});

const ICONS: Record<PulseKind, typeof Activity> = {
  invoice: ReceiptText,
  stock: PackageCheck,
  alert: AlertTriangle,
  import: FileScan,
  payment: IndianRupee,
  purchase: Truck,
  gst: IndianRupee,
  summary: Sparkles,
};
const ACTIONS: Partial<Record<PulseKind, { to: "/purchases" | "/bills" | "/inventory" | "/payments" | "/gst" | "/smart-import"; text: string }>> = {
  alert: { to: "/purchases", text: "Reorder" },
  invoice: { to: "/bills", text: "View bill" },
  stock: { to: "/inventory", text: "Open stock" },
  purchase: { to: "/inventory", text: "Check stock" },
  payment: { to: "/payments", text: "Payments" },
  gst: { to: "/gst", text: "GST" },
  import: { to: "/smart-import", text: "Review import" },
};
const NEEDS_ACTION: PulseKind[] = ["alert", "gst"];

const FILTERS = ["Everything", "Needs action", "Sales", "Stock", "Money"] as const;
type Filter = (typeof FILTERS)[number];
const GROUPS: Record<Filter, PulseKind[] | null> = {
  Everything: null,
  "Needs action": NEEDS_ACTION,
  Sales: ["invoice", "summary"],
  Stock: ["stock", "purchase", "import", "alert"],
  Money: ["payment", "gst"],
};

function Pulse() {
  const { pulse } = useGrovio();
  const [filter, setFilter] = useState<Filter>("Everything");
  const [query, setQuery] = useState("");
  const [handled, setHandled] = useState<Set<string>>(new Set());

  const matches = (kinds: PulseKind[] | null) =>
    pulse.filter(
      (e) =>
        (!kinds || kinds.includes(e.kind)) &&
        (filter !== "Needs action" || !handled.has(e.id)) &&
        `${e.title} ${e.detail}`.toLowerCase().includes(query.toLowerCase()),
    );
  const events = useMemo(() => matches(GROUPS[filter]), [filter, pulse, query, handled]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = pulse.filter((e) => NEEDS_ACTION.includes(e.kind) && !handled.has(e.id)).length;
  const days = Array.from(new Set(events.map((e) => e.day)));

  const toggle = (id: string) =>
    setHandled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AppShell>
      <header className="grid gap-8 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="num text-xs uppercase tracking-[0.14em] text-muted-foreground">Today · Pulse</p>
          <h1 className="display mt-3 text-4xl leading-[0.95] sm:text-6xl">
            The store speaks.
            <br />
            <span className="text-primary">Grovio listens.</span>
          </h1>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          <span className="num text-2xl font-medium text-foreground">{open}</span>{" "}
          {open === 1 ? "event needs" : "events need"} action. Everything else is a record of what happened.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-1 py-4 backdrop-blur-sm">
        <div role="tablist" aria-label="Filter events" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const n = matches(GROUPS[f]).length;
            return (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`ring-focus rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {f} <span className="num ml-1 opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Search Pulse</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            className="ring-focus h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm"
          />
        </label>
      </div>

      {events.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-3xl">{filter === "Needs action" ? "Nothing waiting on you." : "No events here."}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {query ? "Try a different search, or clear it." : "New bills, deliveries and alerts will appear here as they happen."}
          </p>
          {(query || filter !== "Everything") && (
            <button
              onClick={() => {
                setQuery("");
                setFilter("Everything");
              }}
              className="ring-focus mt-6 rounded-md border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
            >
              Show everything
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {days.map((day) => (
            <section key={day} aria-label={day}>
              <h2 className="display text-2xl">{day}</h2>
              <ol className="mt-3 border-t border-foreground">
                {events
                  .filter((e) => e.day === day)
                  .map((e) => {
                    const Icon = ICONS[e.kind];
                    const act = ACTIONS[e.kind];
                    const needs = NEEDS_ACTION.includes(e.kind);
                    const done = handled.has(e.id);
                    return (
                      <li
                        key={e.id}
                        className={`grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 border-b border-border py-5 animate-fade sm:grid-cols-[6rem_1fr_auto] ${done ? "opacity-60" : ""}`}
                      >
                        <time className="num text-sm text-muted-foreground">{e.time}</time>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <Icon
                              className={`h-4 w-4 ${needs && !done ? "text-saffron-foreground" : "text-primary"}`}
                              aria-hidden="true"
                            />
                            <span className="text-sm font-semibold">{e.title}</span>
                            {needs && (
                              <span
                                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  done ? "bg-accent text-primary" : "bg-saffron/20 text-saffron-foreground"
                                }`}
                              >
                                {done ? "Handled" : "Needs action"}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{e.detail}</p>
                        </div>
                        <div className="col-start-2 flex items-center gap-4 sm:col-start-3 sm:justify-end">
                          {act && (
                            <Link to={act.to} className="ring-focus inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                              {act.text} <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          {needs && (
                            <button
                              onClick={() => toggle(e.id)}
                              aria-pressed={done}
                              className="ring-focus inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent"
                            >
                              <Check className="h-3 w-3" /> {done ? "Undo" : "Mark handled"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
          <p className="text-xs text-muted-foreground">
            Opening events are illustrative. New bills, stock adjustments and received purchases are added live from this browser.
          </p>
        </div>
      )}
    </AppShell>
  );
}
