// Non-sensitive UI preferences only. Authentication state is authoritative on
// the server and lives in AuthContext — it is intentionally NOT stored here.
export const TOUR_KEY = 'grovio.tourDone'
// Per-tab marker so the auto-started guided tour cannot restart (and hijack
// navigation) every time AppShell remounts on a route change.
const TOUR_STARTED_KEY = 'grovio.tourStarted'

export function isTourDone() {
  return localStorage.getItem(TOUR_KEY) === 'true'
}

export function setTourDone(value) {
  localStorage.setItem(TOUR_KEY, JSON.stringify(value))
}

export function hasTourStarted() {
  try {
    return sessionStorage.getItem(TOUR_STARTED_KEY) === 'true'
  } catch {
    return false
  }
}

export function markTourStarted() {
  try {
    sessionStorage.setItem(TOUR_STARTED_KEY, 'true')
  } catch {
    /* private mode — the tour simply re-offers itself next load */
  }
}

export const SETTINGS_KEY = 'grovio.settings'

export function getSettings(namespace) {
  if (!namespace) {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    } catch {
      return {}
    }
  }
  try {
    const all = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return all[namespace] || {}
  } catch {
    return {}
  }
}

export function setSettings(namespace, value) {
  if (!namespace) return
  try {
    const all = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    all[namespace] = value
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}
