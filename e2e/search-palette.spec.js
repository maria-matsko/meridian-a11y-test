// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('meridian-onboarding-complete', '1');
    localStorage.setItem('meridian-onboarding-complete:testuser', '1');
  });
  await page.goto('/prototype/index.html', { waitUntil: 'domcontentloaded' });
  // Wait for custom elements to render
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });
});

test('Ctrl+K opens command palette, type search, navigate, and Escape closes', async ({ page }) => {
  // Open command palette with Ctrl+K (works cross-platform in Playwright)
  await page.keyboard.press('Control+k');

  // Palette should be visible
  const palette = page.locator('.cmd-palette.is-open');
  await expect(palette).toBeVisible({ timeout: 5000 });

  // Type 'email' into the palette input
  const input = palette.locator('.cmd-input');
  await input.fill('email');

  // Results should appear
  const results = palette.locator('.cmd-results [role="option"]');
  await expect(results.first()).toBeVisible({ timeout: 5000 });
  const count = await results.count();
  expect(count).toBeGreaterThan(0);

  // ArrowDown should highlight first result
  await input.press('ArrowDown');
  const highlighted = palette.locator('.cmd-results [role="option"].is-active');
  await expect(highlighted).toHaveCount(1, { timeout: 2000 });

  // Escape closes the palette
  await input.press('Escape');
  await expect(palette).not.toBeVisible({ timeout: 2000 });
});

test('"/" key focuses header search input', async ({ page }) => {
  // Press "/" to focus header search
  await page.keyboard.press('/');

  // The header search input should be focused
  const headerInput = page.locator('.header-search input');
  await expect(headerInput).toBeFocused({ timeout: 2000 });
});
