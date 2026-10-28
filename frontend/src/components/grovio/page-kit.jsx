import { cn } from '@/lib/utils.js'
import { AlertTriangle, Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSectionNav } from '@/lib/useApi.js'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((message, tone = 'ok') => {
    setToast({ message, tone })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 4500)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [toast, show]
}

export function ToastHost({ toast }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      {toast ? (
        <div className="animate-pop flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-panel">
          {toast.tone === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
          ) : (
            <Check className="h-4 w-4 text-sprout" aria-hidden />
          )}
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Compact section navigator for substantial pages. It scrolls to the matching
 * section, tracks the active one while scrolling, and collapses into a
 * horizontally scrollable strip on narrow screens.
 */
export function SectionNav({ sections, className }) {
  const ids = sections.map((s) => s.id)
  const active = useSectionNav(ids)
  if (!sections.length) return null
  return (
    <nav
      aria-label="Page sections"
      className={cn(
        'ring-focus -mx-1 flex items-center gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? 'true' : undefined}
          className={cn(
            'ring-focus shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            active === section.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {section.label}
          {section.count ? <span className="ml-1.5 opacity-70">{section.count}</span> : null}
        </a>
      ))}
    </nav>
  )
}

/** A labelled page section that the navigator above can jump to. */
export function Section({ id, title, hint, action, children, className }) {
  return (
    <section id={id} className={cn('scroll-mt-28', className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Loading, error and empty treatment shared by every data region. */
export function DataState({ loading, error, empty, onRetry, skeleton, children }) {
  if (loading) return skeleton ?? <Skeleton />
  if (error) {
    return (
      <div
        role="alert"
        className="animate-rise flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
        <h3 className="font-semibold">Couldn’t load this</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{error.message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted"
          >
            Try again
          </button>
        ) : null}
      </div>
    )
  }
  if (empty) return <>{empty}</>
  return <>{children}</>
}

/** Allow `<DataState.Skeleton />` for backward compatibility. */
DataState.Skeleton = Skeleton

export function Skeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-10 rounded-lg bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-muted/70" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}

/** Field-level validation errors for forms. */
export function FormErrors({ errors }) {
  const entries = errors && typeof errors === 'object' ? Object.entries(errors) : []
  if (!entries.length) return null
  return (
    <div role="alert" className="animate-rise rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      {entries.map(([field, messages]) => (
        <p key={field}>
          <span className="font-semibold capitalize">{field}:</span> {Array.isArray(messages) ? messages[0] : messages}
        </p>
      ))}
    </div>
  )
}

/** Small badge used for statuses across the app. */
export function StatusBadge({ children, tone = 'muted', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        tone === 'ok' && 'bg-sprout/20 text-sprout-foreground',
        tone === 'warn' && 'bg-saffron/25 text-saffron-foreground',
        tone === 'danger' && 'bg-destructive/12 text-destructive',
        tone === 'ink' && 'bg-primary text-primary-foreground',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Confirm dialog used for destructive actions. */
export function Confirm({ open, title, body, confirmLabel = 'Confirm', tone = 'primary', onConfirm, onCancel, busy, custom }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-pop w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {custom}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="ring-focus h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'ring-focus h-10 rounded-md px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50',
              tone === 'danger' ? 'bg-destructive' : 'bg-primary',
            )}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Adaptive right-hand drawer used across stock and counter pages. */
export function Drawer({ open, title, subtitle, onClose, children, footer, width = 'max-w-2xl' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const onKey = (e) => e.key === 'Escape' && onClose()
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
    setMounted(false)
  }, [open, onClose])
  if (!open || !mounted) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-foreground/30" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn('animate-rise flex h-full w-full flex-col border-l border-border bg-surface', width)}>
        <header className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ring-focus grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-muted"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? <footer className="border-t border-border p-6">{footer}</footer> : null}
      </div>
    </div>
  )
}

export default { SectionNav, Section, DataState, Skeleton, FormErrors, StatusBadge, Confirm, Drawer, ToastHost }
