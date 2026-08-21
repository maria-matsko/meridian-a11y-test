import { describe, it, expect, beforeAll } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

beforeAll(() => {
  loadMeridianStack('prototype');
});

const VALID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';

describe('generatePassword()', () => {
  it('returns 16 characters by default', () => {
    const pw = window.generatePassword();
    expect(pw).toHaveLength(16);
  });

  it('all characters are from valid charset', () => {
    const pw = window.generatePassword();
    for (const ch of pw) {
      expect(VALID_CHARS).toContain(ch);
    }
  });

  it('two calls produce different results', () => {
    const pw1 = window.generatePassword();
    const pw2 = window.generatePassword();
    expect(pw1).not.toBe(pw2);
  });

  it('respects custom length', () => {
    const pw = window.generatePassword(8);
    expect(pw).toHaveLength(8);
  });
});
