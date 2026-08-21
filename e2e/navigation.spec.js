// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('meridian-onboarding-complete', '1');
    localStorage.setItem('meridian-onboarding-complete:testuser', '1');
  });
  await page.goto('/prototype/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('meridian-sidebar')).toBeVisible({ timeout: 5000 });
});

test('sidebar nav: clicking Websites navigates to domains.html', async ({ page }) => {
  // The sidebar links contain hrefs like "domains.html"
  const websitesLink = page.locator('meridian-sidebar a[href="domains.html"]');
  await expect(websitesLink).toBeVisible({ timeout: 5000 });
  await websitesLink.click();

  await page.waitForURL('**/prototype/domains.html', { timeout: 5000 });
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });
});

test('sidebar nav: clicking Email navigates to email.html', async ({ page }) => {
  const emailLink = page.locator('meridian-sidebar a[href="email.html"]');
  await expect(emailLink).toBeVisible({ timeout: 5000 });
  await emailLink.click();

  await page.waitForURL('**/prototype/email.html', { timeout: 5000 });
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });
});

test('sidebar nav: clicking Security navigates to security.html', async ({ page }) => {
  const securityLink = page.locator('meridian-sidebar a[href="security.html"]');
  await expect(securityLink).toBeVisible({ timeout: 5000 });
  await securityLink.click();

  await page.waitForURL('**/prototype/security.html', { timeout: 5000 });
  await expect(page.locator('meridian-header')).toBeVisible({ timeout: 5000 });
});
