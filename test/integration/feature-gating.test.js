import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';
import { createFetchMock } from '../helpers/mock-fetch.js';

describe('Feature gating — integration', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    window.CPANEL = {
      token: 'cpsessABCDEF1234',
      user: 'testuser',
      homedir: '/home/testuser',
    };

    loadScript('meridian/_assets/cpanel-api.js');
    CpanelAPI._token = null;
    CpanelAPI._features = null;
    CpanelAPI._featuresLoaded = false;
    localStorage.clear();
  });

  afterEach(() => {
    CpanelAPI._token = null;
    CpanelAPI._features = null;
    CpanelAPI._featuresLoaded = false;
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loadFeatures() fetches and caches features', async () => {
    const features = await CpanelAPI.loadFeatures();
    expect(features).toBeDefined();
    expect(CpanelAPI._featuresLoaded).toBe(true);
    // Verify it called the Features API
    const urls = fetchMock.mock.calls.map(c => c[0].toString());
    expect(urls.some(u => u.includes('Features/list_features'))).toBe(true);
    // Verify localStorage was populated
    const cached = localStorage.getItem('meridian-features:testuser');
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached);
    expect(parsed.popaccts).toBe(1);
  });

  it('hasFeature() returns true for enabled features', async () => {
    await CpanelAPI.loadFeatures();
    expect(CpanelAPI.hasFeature('popaccts')).toBe(true);
    expect(CpanelAPI.hasFeature('mysql')).toBe(true);
  });

  it('hasFeature() returns false for disabled features (value 0)', async () => {
    await CpanelAPI.loadFeatures();
    expect(CpanelAPI.hasFeature('postgres')).toBe(false);
  });

  it('hasFeature() returns true for unknown features (fail-open)', async () => {
    await CpanelAPI.loadFeatures();
    expect(CpanelAPI.hasFeature('nonexistent_feature')).toBe(true);
  });

  it('uses localStorage cache on second call (no new fetch)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));

    await CpanelAPI.loadFeatures();
    const fetchCountAfterFirst = fetchMock.mock.calls.length;

    // Reset in-memory cache but keep localStorage
    CpanelAPI._features = null;
    CpanelAPI._featuresLoaded = false;

    // Advance time by 2 minutes (within 5-min cache window)
    vi.setSystemTime(new Date('2026-03-19T12:02:00Z'));

    await CpanelAPI.loadFeatures();
    // Should not have made additional fetch calls
    expect(fetchMock.mock.calls.length).toBe(fetchCountAfterFirst);
    // Features should still be loaded from cache
    expect(CpanelAPI.hasFeature('popaccts')).toBe(true);
  });

  it('re-fetches after cache expiry (5 minutes)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));

    await CpanelAPI.loadFeatures();
    const fetchCountAfterFirst = fetchMock.mock.calls.length;

    // Reset in-memory cache but keep localStorage
    CpanelAPI._features = null;
    CpanelAPI._featuresLoaded = false;

    // Advance time past 5 minutes
    vi.setSystemTime(new Date('2026-03-19T12:06:00Z'));

    await CpanelAPI.loadFeatures();
    // Should have made a new fetch call
    expect(fetchMock.mock.calls.length).toBeGreaterThan(fetchCountAfterFirst);
  });

  it('fail-open: hasFeature returns true when API fails', async () => {
    // Mock fetch to throw for everything
    const failFetch = vi.fn(async () => {
      throw new Error('Network error');
    });
    vi.stubGlobal('fetch', failFetch);

    await CpanelAPI.loadFeatures();
    // After failed load, all features should return true (fail-open)
    expect(CpanelAPI.hasFeature('popaccts')).toBe(true);
    expect(CpanelAPI.hasFeature('postgres')).toBe(true);
    expect(CpanelAPI.hasFeature('anything')).toBe(true);
  });

  it('hasAnyFeature() checks multiple features', async () => {
    await CpanelAPI.loadFeatures();
    // postgres=0, popaccts=1 → at least one enabled
    expect(CpanelAPI.hasAnyFeature(['postgres', 'popaccts'])).toBe(true);
    // Only disabled feature
    expect(CpanelAPI.hasAnyFeature(['postgres'])).toBe(false);
  });

  it('hasAllFeatures() requires all features enabled', async () => {
    await CpanelAPI.loadFeatures();
    expect(CpanelAPI.hasAllFeatures(['popaccts', 'mysql'])).toBe(true);
    expect(CpanelAPI.hasAllFeatures(['popaccts', 'postgres'])).toBe(false);
  });

  it('dispatches meridian-features-loaded event', async () => {
    const handler = vi.fn();
    window.addEventListener('meridian-features-loaded', handler);
    await CpanelAPI.loadFeatures();
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('meridian-features-loaded', handler);
  });
});
