// playwright.config.js
/**
 * @type {import('playwright').PlaywrightConfig}
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  testMatch: ['**/*.spec.+(js|jsx|ts|tsx)'],
  fullyParallel: true,
  forbidMissingAssertions: true,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'vite',
    url: 'http://localhost:5173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
