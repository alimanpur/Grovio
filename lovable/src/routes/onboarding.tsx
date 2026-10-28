import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ImagePlus,
  PartyPopper,
  Sparkles,
  Store,
  Truck,
  Boxes,
  Tags,
} from "lucide-react";
import { GrovioMark } from "@/components/grovio/AppShell";
import { Field, inputClass } from "@/components/grovio/AuthLayout";
import { Sprig } from "@/components/grovio/kit";
import { setOnboarded, setTourDone } from "@/lib/grovio-state";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your store — Grovio onboarding" },
      {
        name: "description",
        content:
          "Five guided steps to get your grocery store running on Grovio: store details, business type, products, categories and suppliers.",
      },
      { property: "og:title", content: "Set up your store on Grovio" },
      {
        property: "og:description",
        content: "Five guided steps from empty account to a shop that's ready to bill.",
      },
    ],
  }),
  component: Onboarding,
});

const STEP_TITLES = ["Welcome", "Store details", "Business type", "Initial setup", "Ready"];

const businessTypes = [
  { name: "General Store", detail: "Daily staples, packaged food, home care", icon: Store },
  { name: "Supermarket", detail: "Aisles, multiple counters, high SKU count", icon: Building2 },
  { name: "Medical", detail: "Batch and expiry tracking is mandatory", icon: Sparkles },
  { name: "Wholesale", detail: "Bulk rates, credit customers, ledger heavy", icon: Truck },
  { name: "Other", detail: "Tell us later in settings", icon: Boxes },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState("General Store");
  const [tasks, setTasks] = useState<Record<string, boolean>>({
    products: false,
    categories: false,
    suppliers: false,
  });

  const finish = () => {
    setOnboarded(true);
    setTourDone(false);
    navigate({ to: "/today" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[20rem_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary px-8 py-10 text-primary-foreground lg:flex">
        <div className="grid-paper absolute inset-0 opacity-30" />
        <div className="relative">
          <GrovioMark />
          <ol className="mt-12 space-y-1">
            {STEP_TITLES.map((title, i) => (
              <li key={title} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <span
                  className={`num grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                    i < step
                      ? "bg-sprout text-sprout-foreground"
                      : i === step
                        ? "bg-primary-foreground text-primary"
                        : "border border-primary-foreground/25 text-primary-foreground/50"
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`text-sm ${i === step ? "font-semibold" : "text-primary-foreground/60"}`}>
                  {title}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-xs leading-relaxed text-primary-foreground/60">
          You can change every one of these later in Settings. Nothing here is permanent.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-12">
        <div key={step} className="animate-rise w-full max-w-2xl">
          <p className="eyebrow">
            Step {step + 1} of 5 · {STEP_TITLES[step]}
          </p>

          {step === 0 ? (
            <div className="mt-4">
              <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-accent text-primary">
                <Sprig className="h-10 w-10" />
              </div>
              <h1 className="text-[2.4rem] leading-tight">Welcome to Grovio</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
                Grovio is the retail operating system for your grocery store — billing, stock,
                suppliers, customers and profit all running from one place, so the shop stays in
                your head less and in the system more.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { t: "Bill fast", d: "Search or scan, take any payment, print or share." },
                  { t: "Stock stays true", d: "Sales and purchases move inventory for you." },
                  { t: "Know your profit", d: "Margins per product, per category, per day." },
                ].map((f) => (
                  <div key={f.t} className="panel p-4">
                    <p className="text-sm font-semibold">{f.t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mt-4">
              <h1 className="text-[2rem] leading-tight">Tell us about the shop</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This appears on every invoice you print or share.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Field label="Store name">
                  <input className={inputClass} defaultValue="Sharma Provision Store" />
                </Field>
                <Field label="Owner name">
                  <input className={inputClass} defaultValue="Ramesh Sharma" />
                </Field>
                <Field label="GST number">
                  <input className={inputClass} placeholder="07AABCS1429B1ZX" />
                </Field>
                <Field label="Phone">
                  <input className={inputClass} defaultValue="+91 98110 22114" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <input className={inputClass} defaultValue="12/4 Ajmal Khan Road, Karol Bagh, New Delhi 110005" />
                  </Field>
                </div>
                <Field label="Currency">
                  <select className={inputClass} defaultValue="INR">
                    <option value="INR">₹ Indian Rupee (INR)</option>
                    <option value="AED">د.إ UAE Dirham (AED)</option>
                    <option value="NPR">रू Nepalese Rupee (NPR)</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select className={inputClass} defaultValue="IST">
                    <option value="IST">Asia/Kolkata (IST)</option>
                    <option value="GST">Asia/Dubai (GST)</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Store logo">
                    <button className="ring-focus flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-surface-2/60 p-4 text-left transition-colors hover:border-sprout">
                      <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
                        <ImagePlus className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">Upload a logo</span>
                        <span className="block text-xs text-muted-foreground">
                          PNG or JPG, square works best. Optional.
                        </span>
                      </span>
                    </button>
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-4">
              <h1 className="text-[2rem] leading-tight">What kind of shop is it?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Grovio tunes defaults — tax rates, expiry tracking, credit ledgers — around your answer.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {businessTypes.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setType(b.name)}
                    className={`ring-focus flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      type === b.name
                        ? "border-sprout bg-accent shadow-lift"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-sprout/60"
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary">
                      <b.icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{b.name}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {b.detail}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-4">
              <h1 className="text-[2rem] leading-tight">Put something on the shelves</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Do one now and the rest later — Grovio works from the first product onward.
              </p>
              <div className="mt-7 space-y-3">
                {[
                  {
                    key: "products",
                    icon: Boxes,
                    title: "Add products",
                    body: "Type them in, or import a supplier invoice PDF and let Grovio read the lines.",
                    cta: "Import 12 starter products",
                  },
                  {
                    key: "categories",
                    icon: Tags,
                    title: "Add categories",
                    body: "Staples, Dairy, Packaged Food, Home Care, Personal Care, Beverages.",
                    cta: "Use suggested categories",
                  },
                  {
                    key: "suppliers",
                    icon: Truck,
                    title: "Add suppliers",
                    body: "Who you buy from, their terms and what you currently owe them.",
                    cta: "Add my first supplier",
                  },
                ].map((t) => {
                  const done = tasks[t.key];
                  return (
                    <div
                      key={t.key}
                      className={`panel flex flex-wrap items-center gap-4 p-4 transition-colors ${done ? "bg-accent" : ""}`}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-lg bg-surface-2 text-primary">
                        {done ? <Check className="h-5 w-5 text-sprout-foreground" /> : <t.icon className="h-5 w-5" />}
                      </span>
                      <span className="min-w-[12rem] flex-1">
                        <span className="block text-sm font-semibold">{t.title}</span>
                        <span className="block text-xs leading-snug text-muted-foreground">{t.body}</span>
                      </span>
                      <button
                        onClick={() => setTasks((s) => ({ ...s, [t.key]: true }))}
                        disabled={done}
                        className="ring-focus rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-sprout disabled:opacity-60"
                      >
                        {done ? "Done" : t.cta}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Skipping is fine. Grovio will nudge you from the overview page instead.
              </p>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-4 text-center">
              <div className="animate-pop mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-accent text-primary">
                <PartyPopper className="h-9 w-9" />
              </div>
              <h1 className="mt-6 text-[2.4rem] leading-tight">Your store is ready</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                {type} configured, counter open. We'll walk you through the workspace once — it takes
                about 40 seconds and you can skip it anytime.
              </p>
              <div className="mx-auto mt-8 grid max-w-md gap-2 text-left">
                {[
                  "Store profile and invoice header set",
                  "Categories and suppliers seeded",
                  "Low stock and expiry alerts switched on",
                ].map((c) => (
                  <p key={c} className="flex items-center gap-2 rounded-lg bg-surface-2/70 px-3 py-2 text-sm">
                    <Check className="h-4 w-4 text-sprout" /> {c}
                  </p>
                ))}
              </div>
              <button
                onClick={finish}
                className="ring-focus mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Start the guided tour <ArrowRight className="h-4 w-4 text-sprout" />
              </button>
            </div>
          ) : null}

          {step < 4 ? (
            <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="ring-focus inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={finish}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Skip setup
                </button>
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="ring-focus inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  Continue <ArrowRight className="h-4 w-4 text-sprout" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
