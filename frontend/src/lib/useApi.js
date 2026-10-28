import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from './api.js'

/**
 * One data-fetching hook used by every page, so loading, empty and error
 * states behave identically across the app.
 *
 * `query` is serialised into the URL when `sync` is true (default for list
 * pages), which keeps filters, tabs and pagination shareable and restorable
 * after a reload.
 */
export const useApi = (fetcher, { deps = [], immediate = true, sync = false, pageSize = 25 } = {}) => {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const [reloading, setReloading] = useState(false)
  const alive = useRef(true)

  const urlQuery = useMemo(() => {
    if (!sync) return undefined
    const q = Object.fromEntries(params.entries())
    if (!q.limit) q.limit = String(pageSize)
    return q
  }, [params, sync, pageSize])

  const read = useCallback(
    async (overrides = {}, { quiet = false } = {}) => {
      if (!alive.current) return
      if (quiet) setReloading(true)
      else setLoading(true)
      try {
        const json = await fetcher(overrides)
        if (!alive.current) return
        setData(json?.data ?? null)
        setMeta(json?.data?.meta ?? null)
        setError(null)
      } catch (err) {
        if (!alive.current) return
        if (err?.name === 'AbortError') return
        setError(err instanceof ApiError ? err : new ApiError(0, 'Network error. Check your connection and try again.'))
      } finally {
        if (alive.current) {
          setLoading(false)
          setReloading(false)
        }
      }
    },
    [fetcher],
  )

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (immediate) read(urlQuery ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, immediate])

  /** Applies one or more filter values to the URL (list pages only). */
  const setFilter = useCallback(
    (patch) => {
      if (!sync) return
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '' || value === 'all') next.delete(key)
            else next.set(key, String(value))
          }
          if (!(patch.page === undefined)) next.set('page', String(patch.page))
          else if (Object.keys(patch).some((k) => k !== 'page')) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [sync, setParams],
  )

  const refresh = useCallback(() => read(urlQuery ?? {}, { quiet: true }), [read, urlQuery])

  return { data, meta, loading, reloading, error, refresh, read, setFilter, query: urlQuery ?? {} }
}

/** Debounce for search inputs so typing does not fire a request per keystroke. */
export const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** `?section=overview`-style anchors for the in-page section navigator. */
export const useSectionNav = (ids) => {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (!ids?.length) return
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (!targets.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: [0, 1] },
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [ids?.join(',')])
  return active
}

export default useApi
