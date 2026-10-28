import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { isTourDone, setTourDone } from "@/lib/grovio-state";
import { Sprig } from "./kit";

type Step = {
  target: string;
  to: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    target: "ws-today",
    to: "/today",
    title: "Today",
    body: "Open Grovio and see only what needs you this morning. Nothing more.",
  },
  {
    target: "ws-counter",
    to: "/billing",
    title: "Counter",
    body: "Billing, history, returns and payments live here. This is where you serve customers.",
  },
  {
    target: "ws-stock",
    to: "/products",
    title: "Stock",
    body: "Products, inventory, purchases and suppliers — everything on your shelves.",
  },
  {
    target: "ws-insights",
    to: "/sales",
    title: "Insights",
    body: "All the numbers and charts moved here, so your daily screen stays calm.",
  },
  {
    target: "ws-store",
    to: "/users",
    title: "Store",
    body: "Staff, invoice design, taxes, security and backups. Set it once, forget it.",
  },
  {
    target: "pulse",
    to: "/pulse",
    title: "Pulse",
    body: "A live feed of your shop: bills, payments, imports, alerts and reminders.",
  },
  {
    target: "command",
    to: "/today",
    title: "Command bar",
    body: "Press Ctrl + K anywhere to jump to a product, invoice, customer or page instantly.",
  },
  {
    target: "quick-actions",
    to: "/today",
    title: "Quick actions",
    body: "Your five most common jobs are always one tap away, right on Today.",
  },
  {
    target: "focus-hint",
    to: "/today",
    title: "Focus mode",
    body: "Start a bill or import stock and Grovio hides everything else until you're done.",
  },
];

export const startTour = () => {
  window.dispatchEvent(new CustomEvent("grovio:tour"));
};

export function ProductTour() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handler = () => {
      setIndex(0);
      setActive(true);
    };
    window.addEventListener("grovio:tour", handler);
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1" || !isTourDone()) handler();
    return () => window.removeEventListener("grovio:tour", handler);
  }, []);

  const measure = useCallback(() => {
    const step = STEPS[index];
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [index]);

  useEffect(() => {
    if (!active) return;
    const step = STEPS[index];
    if (step) navigate({ to: step.to });
    const raf = requestAnimationFrame(measure);
    const timer = window.setTimeout(measure, 260);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, index, measure, navigate]);

  const finish = () => {
    setTourDone(true);
    setActive(false);
  };

  const step = STEPS[index];
  if (!active || !step) return null;
  const wide = typeof window !== "undefined" && window.innerWidth >= 1024;

  const cardTop = rect ? Math.min(Math.max(rect.top - 40, 16), window.innerHeight - 300) : 120;
  const cardLeft = rect && wide ? Math.min(rect.right + 20, window.innerWidth - 384) : undefined;

  return (
    <div className="fixed inset-0 z-50 animate-fade">
      <div className="absolute inset-0 bg-primary/70 backdrop-blur-[2px]" onClick={finish} />

      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-sprout transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.001), 0 0 32px 4px oklch(0.74 0.169 133 / 0.55)",
            background: "oklch(0.74 0.169 133 / 0.14)",
          }}
        />
      ) : null}

      <div
        className="animate-pop absolute w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-6 shadow-float"
        style={{
          top: cardTop,
          left: cardLeft,
          right: cardLeft ? undefined : 16,
          margin: cardLeft ? undefined : "0 auto",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <Sprig className="h-7 w-7" />
          </div>
          <div>
            <p className="eyebrow">
              Guided tour · {index + 1} of {STEPS.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
          </div>
          <button
            onClick={finish}
            aria-label="Skip tour"
            className="ring-focus ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{step.body}</p>

        <div className="mt-5 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s.target}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? "bg-sprout" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="ring-focus grid h-9 w-9 place-items-center rounded-full border border-border disabled:opacity-40"
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => (index === STEPS.length - 1 ? finish() : setIndex((i) => i + 1))}
              className="ring-focus flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {index === STEPS.length - 1 ? "Start using Grovio" : "Next"}
              {index === STEPS.length - 1 ? null : <ArrowRight className="h-4 w-4 text-sprout" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
