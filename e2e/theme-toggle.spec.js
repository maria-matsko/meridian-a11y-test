// @ts-check
import { test, expect } from '@playwright/test';

test('theme toggle changes data-theme, persists in localStorage, and survives reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('meridian-onboarding-complete', '1');
    localStorage.setItem('meridian-onboarding-complete:testuser', '1');
  });

  await page.goto('/prototype/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });

  // Get initial theme
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);

  // Click theme toggle
  await page.click('#headerThemeToggle');

  // Theme should have changed
  const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(newTheme).not.toBe(initialTheme);
  expect(['light', 'dark']).toContain(newTheme);

  // localStorage should have the new theme
  const storedTheme = await page.evaluate(() => localStorage.getItem('meridian-theme'));
  expect(storedTheme).toBe(newTheme);

  // Reload and verify persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });

  const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(themeAfterReload).toBe(newTheme);
});
