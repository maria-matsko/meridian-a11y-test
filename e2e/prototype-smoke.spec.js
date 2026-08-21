// @ts-check
import { test, expect } from '@playwright/test';

const PAGES = [
  'index.html',
  'domains.html',
  'email.html',
  'files.html',
  'databases.html',
  'security.html',
  'performance.html',
  'profile.html',
];

for (const page of PAGES) {
  test(`prototype/${page} loads without JS errors`, async ({ page: p }) => {
    const errors = [];
    p.on('pageerror', (err) => errors.push(err.message));

    // Seed localStorage to skip onboarding redirect
    await p.addInitScript(() => {
      localStorage.setItem('meridian-onboarding-complete', '1');
      localStorage.setItem('meridian-onboarding-complete:testuser', '1');
    });

    await p.goto(`/prototype/${page}`, { waitUntil: 'domcontentloaded' });

    // Assert custom elements are visible
    await expect(p.locator('meridian-header')).toBeVisible({ timeout: 5000 });
    await expect(p.locator('meridian-sidebar')).toBeVisible({ timeout: 5000 });

    // No JS errors
    expect(errors).toEqual([]);
  });
}

test('prototype/onboarding.html loads (chromeless)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/prototype/onboarding.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('body')).toBeVisible({ timeout: 5000 });

  expect(errors).toEqual([]);
});
