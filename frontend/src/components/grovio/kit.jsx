import { cn } from '@/lib/utils.js'

export function PageHead({ eyebrow, title, question, actions }) {
  return (
    <header className="animate-rise flex flex-wrap items-end justify-between gap-6 border-b border-border pb-7">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.6rem]">{title}</h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sprout" />
          {question}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Metric({ label, value, delta, sub, tone = 'default', children }) {
  return (
    <div
      className={cn(
        'panel group relative overflow-hidden p-5 transition-colors duration-300',
        tone === 'ink' && 'bg-primary text-primary-foreground',
        tone === 'sprout' && 'bg-accent',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('eyebrow', tone === 'ink' && 'text-primary-foreground/60')}>{label}</p>
        {delta ? (
          <span
            className={cn(
              'num rounded-full px-2 py-0.5 text-[11px] font-semibold',
              tone === 'ink' ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-sprout/20 text-sprout-foreground',
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      <p className="num mt-3 text-[1.9rem] font-semibold leading-none">{value}</p>
      {sub ? (
        <p className={cn('mt-2 text-xs', tone === 'ink' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{sub}</p>
      ) : null}
      {children}
    </div>
  )
}

export function Panel({ title, hint, action, className, children }) {
  return (
    <section className={cn('panel animate-rise flex flex-col p-6', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Sprig({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10', className)} aria-hidden>
      <path
        d="M32 60V22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M32 30c-7 0-13-5-13-13 8 0 13 5 13 13Zm0-6c0-8 5-14 13-14 0 9-5 14-13 14Z"
        fill="currentColor"
      />
      <circle cx="32" cy="17" r="3.4" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="animate-pop flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/60 px-8 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent text-primary">
        <Sprig />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Pill({ children, tone = 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'ok' && 'bg-sprout/20 text-sprout-foreground',
        tone === 'warn' && 'bg-saffron/25 text-saffron-foreground',
        tone === 'danger' && 'bg-destructive/12 text-destructive',
        tone === 'ink' && 'bg-primary text-primary-foreground',
      )}
    >
      {children}
    </span>
  )
}

export function Meter({ value, tone = 'sprout' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700',
          tone === 'sprout' && 'bg-sprout',
          tone === 'saffron' && 'bg-saffron',
          tone === 'danger' && 'bg-destructive',
        )}
        style={{ width: `${Math.min(100, Math.max(3, value))}%` }}
      />
    </div>
  )
}
