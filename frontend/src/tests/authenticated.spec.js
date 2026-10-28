// tests/authenticated.spec.js
/**
 * @type {import('playwright').PlaywrightTest}
 */
import { test, expect, request } from '@playwright/test'

const API_BASE = '/api'
const TEST_EMAIL = 'test1@grovio.com'
const TEST_PASSWORD = 'E2E-Auth-2026!'

/**
 * Resets the test-account password via the dev forgot-password flow, then
 * returns the password. The test owns a transient credential and never
 * hard-codes the live in-memory one.
 */
async function resetPassword(apiRequest) {
  const forgot = await apiRequest.post(`${API_BASE}/auth/forgot-password`, { data: { email: TEST_EMAIL } })
  const forgotJson = await forgot.json()
  const token = forgotJson?.data?.devResetToken
  if (!token) throw new Error('devResetToken not returned — EXPOSE_DEV_RESET_TOKEN may be false on the backend')
  const reset = await apiRequest.post(`${API_BASE}/auth/reset-password`, {
    data: { token, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD },
  })
  expect(reset.ok()).toBeTruthy()
  return TEST_PASSWORD
}

/** Signs in via the UI and returns once the app shell is mounted. */
async function signInViaUI(page, password) {
  await page.goto('/sign-in')
  await page.fill('input[autocomplete="username"]', TEST_EMAIL)
  await page.fill('input[autocomplete="current-password"]', password)\n  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/app/**', { timeout: 15000 })
}

let password

test.beforeAll(async ({ request }) => {
  password = await resetPassword(request)
})

test.beforeEach(async ({ page }) => {
  await signInViaUI(page, password)
})

test.describe.configure({ mode: 'serial' })

test.describe('Authenticated E2E — full workflow', () => {
  test('all authenticated routes are reachable', async ({ page }) => {
    const routes = [
      '/app/today',
      '/app/pulse',
      '/app/future-lab',
      '/app/billing',
      '/app/bills',
      '/app/returns',
      '/app/payments',
      '/app/products',
      '/app/inventory',
      '/app/purchases',
      '/app/smart-import',
      '/app/suppliers',
      '/app/categories',
      '/app/sales',
      '/app/reports',
      '/app/customers',
      '/app/gst',
      '/app/users',
      '/app/invoice-settings',
      '/app/taxes',
      '/app/settings',
      '/app/change-password',
      '/app/backup',
      '/app/help',
    ]
    for (const route of routes) {
      test.step(`navigates to ${route}`, async () => {
        await page.goto(route)
        await expect(page).not.toHaveURL('/sign-in')
        await expect(page.locator('main')).toBeVisible()
      })
    }
  })
})
