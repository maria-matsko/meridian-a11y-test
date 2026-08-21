import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../../');

describe('Dual-sync: prototype ↔ meridian', () => {
  test('CSS files both exist and contain design tokens', () => {
    const protoCss = readFileSync(resolve(ROOT, 'prototype/meridian.css'), 'utf-8');
    const meridianCss = readFileSync(resolve(ROOT, 'meridian/_assets/meridian.css'), 'utf-8');

    // Both files must exist and contain the :root design token block
    expect(protoCss).toContain(':root');
    expect(meridianCss).toContain(':root');

    // Both must define core font tokens
    expect(protoCss).toContain('--font-');
    expect(meridianCss).toContain('--font-');

    // Both must define spacing tokens
    expect(protoCss).toContain('--space-');
    expect(meridianCss).toContain('--space-');

    // Both must define layout classes
    expect(protoCss).toContain('.layout-header');
    expect(meridianCss).toContain('.layout-header');
  });

  test('prototype shell functions are a subset of meridian shell', () => {
    const protoShell = readFileSync(resolve(ROOT, 'prototype/components/shell.js'), 'utf-8');
    const meridianShell = readFileSync(resolve(ROOT, 'meridian/_assets/shell.js'), 'utf-8');

    // Extract top-level function declarations and class names
    const extractNames = (code) => {
      const fns = [...code.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+(\w+)\s*\(/g)].map(m => m[1]);
      const classes = [...code.matchAll(/(?:^|\n)\s*class\s+(\w+)/g)].map(m => m[1]);
      return new Set([...fns, ...classes]);
    };

    const protoNames = extractNames(protoShell);
    const meridianNames = extractNames(meridianShell);

    for (const name of protoNames) {
      expect(meridianNames.has(name)).toBe(true);
    }
  });

  test('shared prototype pages have meridian equivalents', () => {
    const protoPages = readdirSync(resolve(ROOT, 'prototype'))
      .filter(f => f.endsWith('.html') && f !== 'design-system.html');

    const protoToMeridian = {
      'index.html': 'index',
      'domains.html': 'websites',
      'email.html': 'email',
      'files.html': 'files',
      'databases.html': 'databases',
      'security.html': 'security',
      'performance.html': 'performance',
      'onboarding.html': 'onboarding',
      'profile.html': 'profile',
    };

    const meridianDirs = readdirSync(resolve(ROOT, 'meridian'), { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== '_assets')
      .map(d => d.name);

    for (const protoPage of protoPages) {
      const meridianDir = protoToMeridian[protoPage];
      if (meridianDir) {
        expect(meridianDirs).toContain(meridianDir);
      }
    }
  });
});
