import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';

beforeAll(() => {
  loadScript('meridian/_assets/cpanel-api.js');
});

describe('CpanelAPI.userKey()', () => {
  afterEach(() => {
    // Reset to default test user
    window.CPANEL.user = 'testuser';
  });

  it('appends :username when user is available', () => {
    window.CPANEL.user = 'testuser';
    expect(CpanelAPI.userKey('meridian-theme')).toBe('meridian-theme:testuser');
  });

  it('returns bare key when user is empty string (falsy)', () => {
    window.CPANEL.user = '';
    // getUserName returns null when CPANEL.user is falsy
    expect(CpanelAPI.userKey('meridian-theme')).toBe('meridian-theme');
  });
});
