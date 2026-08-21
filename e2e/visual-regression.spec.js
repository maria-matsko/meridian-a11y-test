// @ts-check
import { test, expect } from '@playwright/test';

const PROTOTYPE_PAGES = [
  { url: '/prototype/index.html', name: 'proto-dashboard' },
  { url: '/prototype/domains.html', name: 'proto-websites' },
  { url: '/prototype/email.html', name: 'proto-email' },
  { url: '/prototype/files.html', name: 'proto-files' },
  { url: '/prototype/databases.html', name: 'proto-databases' },
  { url: '/prototype/security.html', name: 'proto-security' },
  { url: '/prototype/performance.html', name: 'proto-performance' },
  { url: '/prototype/profile.html', name: 'proto-profile' },
];

const MERIDIAN_PAGES = [
  { url: '/meridian/index/', name: 'meridian-dashboard' },
  { url: '/meridian/websites/', name: 'meridian-websites' },
  { url: '/meridian/email/', name: 'meridian-email' },
  { url: '/meridian/files/', name: 'meridian-files' },
  { url: '/meridian/databases/', name: 'meridian-databases' },
  { url: '/meridian/security/', name: 'meridian-security' },
  { url: '/meridian/performance/', name: 'meridian-performance' },
  { url: '/meridian/profile/', name: 'meridian-profile' },
];

const ALL_PAGES = [...PROTOTYPE_PAGES, ...MERIDIAN_PAGES];

for (const { url, name } of ALL_PAGES) {
  for (const theme of ['light', 'dark']) {
    test(`${name} (${theme}) visual regression`, async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem('meridian-theme', t);
        localStorage.setItem('meridian-onboarding-complete', '1');
        localStorage.setItem('meridian-onboarding-complete:testuser', '1');
      }, theme);

      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
}
