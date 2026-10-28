import type { ReactNode } from "react";

export const inputCls =
  "ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary";

export function StoreHeader({ section, question, action }: { section: string; question: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-foreground/80 pb-6">
      <div>
        <p className="eyebrow">Store · {section}</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">{question}</h1>
      </div>
      {action}
    </header>
  );
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block text-xs text-muted-foreground ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {hint ? <span className="mt-1 block text-[11px]">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--primary)]" />
    </label>
  );
}

export function SaveBar({ dirty, label = "Save changes" }: { dirty: boolean; label?: string }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
      {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : null}
      <button disabled={!dirty} className="ring-focus h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
        {label}
      </button>
    </div>
  );
}
