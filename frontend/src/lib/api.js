// Single place for API configuration and the fetch wrapper.
// No server secrets are ever exposed to the client via environment variables.

const RAW_BASE = import.meta.env.VITE_API_URL || '/api'
export const API_BASE = RAW_BASE.replace(/\/$/, '')

/**
 * The short-lived access token is held in memory only (never in localStorage).
 * The AuthContext owns it; this module-level holder lets the request helper
 * attach the Authorization header without prop-drilling.
 */
let accessToken = null
export const getAccessToken = () => accessToken
export const setAccessToken = (token) => {
  accessToken = token
}

/** Reads a non-HttpOnly cookie (used for the double-submit CSRF token). */
const readCookie = (name) => {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : ''
}

export class ApiError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

let pendingRefresh = null

/**
 * Attempts a single silent token refresh, coalescing concurrent callers.
 * Updates the module-level access token. Returns the refresh response data
 * (including the new access token and user) on success, or rejects on failure.
 */
export const refreshAccessToken = () => {
  if (pendingRefresh) return pendingRefresh
  pendingRefresh = authApi
    .refresh()
    .then((r) => {
      setAccessToken(r.data.accessToken)
      return r.data
    })
    .catch((err) => {
      setAccessToken(null)
      throw err
    })
    .finally(() => {
      pendingRefresh = null
    })
  return pendingRefresh
}

/**
 * Performs a request against the API. `credentials: 'include'` sends the
 * HttpOnly refresh cookie + CSRF cookie automatically. State-changing requests
 * include the X-CSRF-Token header (double-submit).
 *
 * On a 401 for an authenticated, non-auth endpoint, transparently refreshes
 * the access token and retries once — the short-lived token can expire while
 * the user is mid-flow (e.g. during onboarding).
 */
export const request = async (path, { method = 'GET', body, auth = true, csrf = false, signal, _retry = true } = {}) => {
  const buildHeaders = () => {
    const h = {}
    if (body !== undefined) h['Content-Type'] = 'application/json'
    if (auth && accessToken) h.Authorization = `Bearer ${accessToken}`
    if (csrf) {
      const token = readCookie('grovio_csrf')
      if (token) h['X-CSRF-Token'] = token
    }
    return h
  }

  const doFetch = (headers) =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let res
  try {
    res = await doFetch(buildHeaders())
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError(0, 'Network error. Check your connection and try again.')
  }

  if (res.status === 401 && auth && _retry && !path.startsWith('/auth/')) {
    try {
      await refreshAccessToken()
      res = await doFetch(buildHeaders())
    } catch {
      // Refresh failed — fall through to normal error handling with the
      // original 401 response so callers can react (e.g. redirect to login).
    }
  }

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    throw new ApiError(res.status, json?.message || 'Something went wrong.', {
      code: json?.code,
      errors: json?.errors,
    })
  }
  return json
}

// --- Auth endpoints --------------------------------------------------------
export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST', auth: false, csrf: true }),
  refresh: () => request('/auth/refresh', { method: 'POST', auth: false, csrf: true }),
  me: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload, csrf: true }),
  completeOnboarding: (store) => request('/auth/onboarding/complete', { method: 'POST', body: { store }, csrf: true }),
}

// --- Business endpoints ----------------------------------------------------
// Every route below is store-scoped on the server: the caller only ever sees
// records belonging to its own store.
const crud = (base) => ({
  list: (query) => request(query ? `${base}?${new URLSearchParams(query).toString()}` : base),
  create: (payload) => request(base, { method: 'POST', body: payload, csrf: true }),
  update: (id, payload) => request(`${base}/${id}`, { method: 'PATCH', body: payload, csrf: true }),
  remove: (id) => request(`${base}/${id}`, { method: 'DELETE', csrf: true }),
})

export const catalogApi = crud('/products')
export const categoryApi = crud('/categories')
export const supplierApi = crud('/suppliers')
export const customerApi = crud('/customers')

export const api = {
  meta: () => request('/meta'),
  // Archive/restore are explicit sub-resource routes (never a DELETE), so a
  // product's history on past bills is preserved.
  products: {
    ...catalogApi,
    archive: (id) => request(`/products/${id}/archive`, { method: 'POST', csrf: true }),
    restore: (id) => request(`/products/${id}/restore`, { method: 'POST', csrf: true }),
  },
  categories: categoryApi,

  inventory: {
    list: (query) => request(query ? `/inventory?${new URLSearchParams(query).toString()}` : '/inventory'),
    history: (query) => request(`/inventory/history?${new URLSearchParams(query).toString()}`),
    reasons: () => request('/inventory/reasons'),
    adjust: (productId, payload) =>
      request(`/inventory/${productId}/adjust`, { method: 'POST', body: payload, csrf: true }),
  },

  suppliers: supplierApi,
  supplierOutstanding: () => request('/suppliers/outstanding'),

  purchases: {
    ...crud('/purchases'),
    receive: (id, payload) => request(`/purchases/${id}/receive`, { method: 'POST', body: payload ?? {}, csrf: true }),
    pay: (id, payload) => request(`/purchases/${id}/pay`, { method: 'POST', body: payload, csrf: true }),
    cancel: (id, reason) => request(`/purchases/${id}/cancel`, { method: 'POST', body: { reason }, csrf: true }),
  },

  bills: {
    list: (query) => request(query ? `/bills?${new URLSearchParams(query).toString()}` : '/bills'),
    get: (id) => request(`/bills/${id}`),
    create: (payload) => request('/bills', { method: 'POST', body: payload, csrf: true }),
    pay: (id, payload) => request(`/bills/${id}/pay`, { method: 'POST', body: payload, csrf: true }),
    cancel: (id, reason) => request(`/bills/${id}/cancel`, { method: 'POST', body: { reason }, csrf: true }),
  },

  returns: {
    eligible: (query) => request(query ? `/returns/eligible?${new URLSearchParams(query).toString()}` : '/returns/eligible'),
    list: (query) => request(query ? `/returns?${new URLSearchParams(query).toString()}` : '/returns'),
    create: (payload) => request('/returns', { method: 'POST', body: payload, csrf: true }),
  },

  payments: {
    list: (query) => request(query ? `/payments?${new URLSearchParams(query).toString()}` : '/payments'),
    create: (payload) => request('/payments', { method: 'POST', body: payload, csrf: true }),
    ledger: (customerId) => request(`/payments/customers/${customerId}/ledger`),
  },

  customers: {
    ...crud('/customers'),
    history: (id) => request(`/customers/${id}/history`),
  },

  settings: {
    profile: () => request('/store-settings/profile'),
    saveProfile: (payload) => request('/store-settings/profile', { method: 'PUT', body: payload, csrf: true }),
    invoice: () => request('/store-settings/invoice'),
    saveInvoice: (payload) => request('/store-settings/invoice', { method: 'PUT', body: payload, csrf: true }),
    taxes: () => request('/store-settings/taxes'),
    saveTaxes: (payload) => request('/store-settings/taxes', { method: 'PUT', body: payload, csrf: true }),
    preferences: () => request('/store-settings/preferences'),
    savePreferences: (payload) => request('/store-settings/preferences', { method: 'PUT', body: payload, csrf: true }),
  },

  team: {
    list: (query) => request(query ? `/team?${new URLSearchParams(query).toString()}` : '/team'),
    create: (payload) => request('/team', { method: 'POST', body: payload, csrf: true }),
    update: (id, payload) => request(`/team/${id}`, { method: 'PATCH', body: payload, csrf: true }),
    setStatus: (id, status) => request(`/team/${id}/status`, { method: 'POST', body: { status }, csrf: true }),
  },

  analytics: {
    today: () => request('/analytics/today'),
    pulse: () => request('/analytics/pulse'),
    sales: (query) => request(query ? `/analytics/sales?${new URLSearchParams(query).toString()}` : '/analytics/sales'),
    reports: (query) => request(query ? `/analytics/reports?${new URLSearchParams(query).toString()}` : '/analytics/reports'),
    gst: (query) => request(query ? `/analytics/gst?${new URLSearchParams(query).toString()}` : '/analytics/gst'),
  },

  backup: {
    preview: () => request('/backup/preview'),
    // A file download is not JSON, so it needs its own fetch.
    download: async () => {
      const res = await fetch(`${API_BASE}/backup/export`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        credentials: 'include',
      })
      if (!res.ok) throw new ApiError(res.status, 'Could not export a backup.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grovio-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    restore: (backup) => request('/backup/restore', { method: 'POST', body: { backup }, csrf: true }),
  },

  futureLab: {
    votes: () => request('/future-lab/votes'),
    vote: (item, picked) => request('/future-lab/votes', { method: 'POST', body: { item, picked }, csrf: true }),
  },
}
