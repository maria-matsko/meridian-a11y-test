// @ts-check
import { test, expect } from '@playwright/test';

test('onboarding page renders with welcome content', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/prototype/onboarding.html', { waitUntil: 'domcontentloaded' });

  // The onboarding container should be present
  const onboarding = page.locator('#onboarding');
  await expect(onboarding).toBeVisible({ timeout: 5000 });

  // Step container should exist (wizard renders steps here)
  const stepContainer = page.locator('#stepContainer');
  await expect(stepContainer).toBeAttached({ timeout: 5000 });

  // The skip link should be present and point to dashboard
  const skipLink = page.locator('.onboarding-skip a');
  await expect(skipLink).toBeVisible({ timeout: 5000 });
  await expect(skipLink).toHaveAttribute('href', 'index.html');

  expect(errors).toEqual([]);
});

test('onboarding theme toggle works', async ({ page }) => {
  await page.goto('/prototype/onboarding.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#onboarding')).toBeVisible({ timeout: 5000 });

  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);

  // Click the onboarding-specific theme toggle
  await page.click('#themeToggle');

  const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(newTheme).not.toBe(initialTheme);
  expect(['light', 'dark']).toContain(newTheme);
});

test('onboarding skip link navigates to dashboard', async ({ page }) => {
  // Seed localStorage so dashboard doesn't redirect back to onboarding
  await page.addInitScript(() => {
    localStorage.setItem('meridian-onboarding-complete', '1');
    localStorage.setItem('meridian-onboarding-complete:testuser', '1');
  });

  await page.goto('/prototype/onboarding.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#onboarding')).toBeVisible({ timeout: 5000 });

  // Click "Skip to dashboard"
  await page.click('.onboarding-skip a');

  // Should navigate to index.html (dashboard)
  await page.waitForURL('**/prototype/index.html', { timeout: 5000 });
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });
});
