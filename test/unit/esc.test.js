import { describe, it, expect, beforeAll } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

beforeAll(() => {
  loadMeridianStack('prototype');
});

describe('esc()', () => {
  it('escapes < and > in script tags', () => {
    expect(window.esc('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersands', () => {
    expect(window.esc('a & b')).toBe('a &amp; b');
  });

  it('returns empty string for null', () => {
    expect(window.esc(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(window.esc(undefined)).toBe('');
  });

  it('does NOT escape quotes (uses DOM textContent/innerHTML)', () => {
    // DOM textContent → innerHTML does not escape quotes
    expect(window.esc('"hello"')).toBe('"hello"');
  });

  it('passes safe strings through unchanged', () => {
    expect(window.esc('Hello World')).toBe('Hello World');
    expect(window.esc('abc123')).toBe('abc123');
  });
});

describe('escapeHtml alias', () => {
  it('is the same function as esc', () => {
    expect(window.escapeHtml).toBe(window.esc);
  });
});
