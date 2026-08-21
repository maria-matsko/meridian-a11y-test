// @ts-check
import { test, expect } from '@playwright/test';

const PAGES = [
  'index',
  'websites',
  'email',
  'files',
  'databases',
  'security',
  'performance',
  'profile',
];

for (const page of PAGES) {
  test(`meridian/${page}/ renders via mock server`, async ({ page: p }) => {
    const errors = [];
    p.on('pageerror', (err) => errors.push(err.message));

    // Seed localStorage to skip onboarding redirect
    await p.addInitScript(() => {
      localStorage.setItem('meridian-onboarding-complete', '1');
      localStorage.setItem('meridian-onboarding-complete:testuser', '1');
    });

    await p.goto(`/meridian/${page}/`, { waitUntil: 'domcontentloaded' });

    // Page should have a title
    const title = await p.title();
    expect(title.length).toBeGreaterThan(0);

    // window.CPANEL should exist with a token
    const cpanel = await p.evaluate(() => window.CPANEL);
    expect(cpanel).toBeTruthy();
    expect(cpanel.security_token || cpanel.securityToken || cpanel.token).toBeTruthy();

    // Header should be visible
    await expect(p.locator('meridian-header')).toBeVisible({ timeout: 5000 });

    // No JS errors
    expect(errors).toEqual([]);
  });
}

test('meridian/onboarding/ renders (chromeless)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/meridian/onboarding/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('body')).toBeVisible({ timeout: 5000 });

  expect(errors).toEqual([]);
});
