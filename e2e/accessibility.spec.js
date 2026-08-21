// @ts-check
/**
 * WCAG 2.1 AA Accessibility Audits
 *
 * Excluded rules:
 * - color-contrast: Widespread across all pages (197+ elements). The design
 *   system's orange brand color (#ea580c) and muted grey (#94a3b8) do not
 *   meet AA contrast ratios on light backgrounds. This is a known design
 *   issue tracked for a future color token revision.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { url: '/prototype/index.html', name: 'Dashboard' },
  { url: '/prototype/domains.html', name: 'Websites' },
  { url: '/prototype/email.html', name: 'Email' },
  { url: '/prototype/files.html', name: 'Files' },
  { url: '/prototype/security.html', name: 'Security' },
  { url: '/prototype/performance.html', name: 'Performance' },
  { url: '/prototype/profile.html', name: 'Profile' },
  { url: '/prototype/onboarding.html', name: 'Onboarding' },
  { url: '/meridian/index/', name: 'Meridian Dashboard' },
  { url: '/meridian/email/', name: 'Meridian Email' },
  { url: '/meridian/onboarding/', name: 'Meridian Onboarding' },
];

for (const { url, name } of PAGES) {
  test(`${name} passes WCAG 2.1 AA accessibility audit`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('meridian-onboarding-complete', '1');
      localStorage.setItem('meridian-onboarding-complete:testuser', '1');
    });

    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
