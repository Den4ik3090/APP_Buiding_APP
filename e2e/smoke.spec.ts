import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/');
  // Unauthenticated users see the login form
  await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible({ timeout: 10000 });
});

test('login page has password field', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
});
