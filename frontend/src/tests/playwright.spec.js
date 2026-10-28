// tests/playwright.spec.js
/**
 * @type {import('playwright').PlaywrightTest}
 */
import { test, expect } from '@playwright/test';

test.describe('Application landing', () => {
  test('Landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1#hero-title')).toContainText('RUN THE STORE');
  });

  test('Sign-in page loads', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('h1')).toContainText('Open your counter');
  });

  test('Sign-up page loads', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.locator('h1')).toContainText('Set up your store');
  });
});

test.describe('Basic authentication tests', () => {
  test('Sign in page should load', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveTitle(/Grovio/);
  });

  test('Sign up page should load', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page).toHaveTitle(/Grovio/);
  });

  test('Protected routes should redirect when not authenticated', async ({ page }) => {
    await page.goto('/app/pulse');
    await expect(page).toHaveURL('/sign-in');
  });
});

test.describe('Route navigation', () => {
  test('Should navigate between routes without errors', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/sign-in');
  });
});
