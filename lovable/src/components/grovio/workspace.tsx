import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_ACTIONS } from "@/lib/grovio-nav";

/** Hero quick actions — the five jobs a shopkeeper does all day. */
export function QuickActions({ note }: { note?: string }) {
  return (
    <section data-tour="quick-actions" className="animate-rise">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Quick actions</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight">Start something in one tap</h2>
        </div>
        {note ? <p className="hidden max-w-xs text-xs text-muted-foreground sm:block">{note}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {QUICK_ACTIONS.map((a, i) => (
          <Link
            key={a.label}
            to={a.to}
            className={cn(
              "panel group relative flex flex-col justify-between gap-6 overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-float",
              i === 0 && "bg-primary text-primary-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                i === 0 ? "bg-primary-foreground/12 text-sprout" : "bg-accent text-primary",
              )}
            >
              <a.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">{a.label}</span>
              <span
                className={cn(
                  "num mt-1 block text-[11px]",
                  i === 0 ? "text-primary-foreground/60" : "text-muted-foreground",
                )}
              >
                {a.note}
              </span>
            </span>
            <ArrowUpRight
              className={cn(
                "absolute right-4 top-5 h-4 w-4 opacity-0 transition-all duration-300 group-hover:opacity-100",
                i === 0 ? "text-sprout" : "text-primary",
              )}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Small hint block that explains Focus Mode; also the tour anchor. */
export function FocusHint() {
  return (
    <div
      data-tour="focus-hint"
      className="panel flex items-center gap-4 bg-surface-2/60 p-5"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-foreground">Focus mode</span> — the moment you start a bill, add stock or
        import an invoice, Grovio hides every other menu until the job is finished.
      </p>
    </div>
  );
}

/** Lightweight tab strip used by product and settings panels. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface-2/60 p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "ring-focus rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
            value === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function useTabs<T extends string>(tabs: readonly T[]) {
  const [tab, setTab] = useState<T>(tabs[0]!);
  return { tab, setTab };
}

export function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("num text-sm", strong ? "font-semibold" : "")}>{value}</span>
    </div>
  );
}
