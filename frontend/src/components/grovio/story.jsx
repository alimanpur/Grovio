import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils.js'

/** Scroll-triggered reveal wrapper used across the Grovio story page. */
export function Reveal({ children, delay = 0, className }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-8 opacity-0 blur-[2px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Thin reading-progress bar pinned to the top of the story page. */
export function ScrollProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setPct(max > 0 ? (window.scrollY / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary via-sprout to-saffron transition-[width] duration-150"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function StorySection({ id, eyebrow, title, lede, children, align = 'left', className }) {
  return (
    <section id={id} className={cn('mx-auto w-full max-w-6xl px-6 py-24 sm:py-32 lg:px-10', className)}>
      {(eyebrow || title || lede) && (
        <Reveal>
          <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? (
              <h2 className="display mt-3 text-[2rem] leading-[1.1] tracking-tight sm:text-[2.9rem]">{title}</h2>
            ) : null}
            {lede ? (
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{lede}</p>
            ) : null}
          </div>
        </Reveal>
      )}
      {children ? <div className="mt-14">{children}</div> : null}
    </section>
  )
}

export function Divider() {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-10">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}
