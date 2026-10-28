import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi, getAccessToken, setAccessToken, refreshAccessToken } from '@/lib/api.js'

const AuthContext = createContext(null)

const STATUS = { LOADING: 'loading', AUTHENTICATED: 'authenticated', ANONYMOUS: 'anonymous' }

const decodeExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(STATUS.LOADING)
  const [user, setUser] = useState(null)
  const refreshTimer = useRef(null)
  const inFlightRefresh = useRef(null)

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }
  }, [])

  /** Refresh the access token a little before it expires, keeping the session smooth. */
  const scheduleRefresh = useCallback(
    (token) => {
      clearTimer()
      const exp = decodeExpiry(token)
      if (!exp) return
      const delay = exp - Date.now() - 60_000
      if (delay <= 0) return
      refreshTimer.current = setTimeout(() => {
        inFlightRefresh.current = null
        silentRefresh()
      }, delay)
    },
    [clearTimer],
  )

  const silentRefresh = useCallback(() => {
    // Coalesce concurrent refresh attempts into one request.
    if (inFlightRefresh.current) return inFlightRefresh.current
    inFlightRefresh.current = (async () => {
      try {
        const data = await refreshAccessToken()
        setUser(data.user)
        scheduleRefresh(data.accessToken)
        return true
      } catch {
        setUser(null)
        return false
      } finally {
        inFlightRefresh.current = null
      }
    })()
    return inFlightRefresh.current
  }, [scheduleRefresh])

  // Initial hydration: verify an in-memory token with /me, else restore from
  // the refresh cookie. This is authoritative — a stale boolean cannot fake it.
  const hydrate = useCallback(async () => {
    if (getAccessToken()) {
      try {
        const me = await authApi.me()
        setUser(me.data.user)
        setStatus(STATUS.AUTHENTICATED)
        scheduleRefresh(getAccessToken())
        return
      } catch (err) {
        if (err && err.status !== 401) {
          setStatus(STATUS.ANONYMOUS)
          return
        }
        setAccessToken(null)
      }
    }
    setStatus(STATUS.LOADING)
    const restored = await silentRefresh()
    if (restored) {
      try {
        const me = await authApi.me()
        setUser(me.data.user)
      } catch {
        /* keep the user returned by refresh */
      }
      setStatus(STATUS.AUTHENTICATED)
    } else {
      setStatus(STATUS.ANONYMOUS)
    }
  }, [silentRefresh, scheduleRefresh])

  useEffect(() => {
    hydrate()
    return clearTimer
  }, [hydrate, clearTimer])

  const login = useCallback(
    async (identifier, password, remember = false) => {
      const r = await authApi.login({ identifier, password, remember })
      setAccessToken(r.data.accessToken)
      setUser(r.data.user)
      setStatus(STATUS.AUTHENTICATED)
      scheduleRefresh(r.data.accessToken)
      return r.data.user
    },
    [scheduleRefresh],
  )

  const register = useCallback(
    async (payload) => {
      const r = await authApi.register(payload)
      setAccessToken(r.data.accessToken)
      setUser(r.data.user)
      setStatus(STATUS.AUTHENTICATED)
      scheduleRefresh(r.data.accessToken)
      return r.data.user
    },
    [scheduleRefresh],
  )

  const logout = useCallback(async () => {
    clearTimer()
    try {
      await authApi.logout()
    } catch {
      /* best-effort: clear client state regardless */
    }
    setAccessToken(null)
    setUser(null)
    setStatus(STATUS.ANONYMOUS)
  }, [clearTimer])

  const changePassword = useCallback((payload) => authApi.changePassword(payload), [])

  const completeOnboarding = useCallback(
    async (store) => {
      const r = await authApi.completeOnboarding(store)
      setUser(r.data.user)
      return r.data.user
    },
    [],
  )

  const value = useMemo(
    () => ({
      status,
      user,
      isAuthenticated: status === STATUS.AUTHENTICATED,
      isLoading: status === STATUS.LOADING,
      login,
      register,
      logout,
      refresh: silentRefresh,
      changePassword,
      completeOnboarding,
      onboardingCompleted: Boolean(user?.store?.onboardingCompleted),
    }),
    [status, user, login, register, logout, silentRefresh, changePassword, completeOnboarding],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { STATUS as AUTH_STATUS }
