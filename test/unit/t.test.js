import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript } from '../helpers/load-script.js';

beforeAll(() => {
  loadScript('meridian/_assets/i18n.js');
});

describe('t() i18n function', () => {
  it('passes through English strings unchanged', () => {
    expect(window.t('Hello')).toBe('Hello');
  });

  it('interpolates positional arguments', () => {
    expect(window.t('{0} of {1}', 5, 10)).toBe('5 of 10');
  });

  it('interpolates named arguments', () => {
    expect(window.t('Hello {name}', { name: 'Jesse' })).toBe('Hello Jesse');
  });

  it('handles plural form (singular, n=1)', () => {
    expect(window.t('{n} item | {n} items', { n: 1 })).toBe('1 item');
  });

  it('handles plural form (plural, n=5)', () => {
    expect(window.t('{n} item | {n} items', { n: 5 })).toBe('5 items');
  });

  it('handles plural form with count alias (selects plural form)', () => {
    // count alias drives plural selection but {n} is not in vars,
    // so use {count} in the string for interpolation
    expect(window.t('{count} item | {count} items', { count: 3 })).toBe('3 items');
  });
});
