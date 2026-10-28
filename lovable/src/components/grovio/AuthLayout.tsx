import { type ReactNode } from "react";
import { GrovioMark } from "./AppShell";

const proof = [
  { label: "Bills in under 20 seconds", detail: "Search, scan, split payment, print." },
  { label: "Stock that corrects itself", detail: "Every sale and purchase moves inventory." },
  { label: "Invoices read for you", detail: "Upload a supplier PDF, confirm, done." },
];

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary px-12 py-12 text-primary-foreground lg:flex">
        <div className="grid-paper absolute inset-0 opacity-[0.35]" />
        <div
          className="absolute -right-24 top-1/4 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "oklch(0.74 0.169 133 / 0.35)" }}
        />
        <div className="relative">
          <GrovioMark />
          <p className="mt-14 max-w-md text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.035em]">
            The operating system that runs the whole shop.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            Grovio replaces the billing book, the stock register, the supplier diary and the
            calculator with one calm workspace built for kirana and grocery owners.
          </p>
        </div>

        <ul className="relative space-y-4">
          {proof.map((p) => (
            <li key={p.label} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sprout" />
              <span>
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block text-xs text-primary-foreground/65">{p.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="animate-rise w-full max-w-[25rem]">
          <div className="lg:hidden">
            <GrovioMark />
          </div>
          <p className="eyebrow mt-8 lg:mt-0">{eyebrow}</p>
          <h1 className="mt-2 text-[2rem] leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-semibold text-ink-soft">
        {label}
        {hint}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export const inputClass =
  "ring-focus h-11 w-full rounded-lg border border-input bg-surface px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-sprout";

export const submitClass =
  "ring-focus h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60";
