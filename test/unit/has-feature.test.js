import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';

beforeAll(() => {
  loadScript('meridian/_assets/cpanel-api.js');
});

describe('CpanelAPI feature checks', () => {
  afterEach(() => {
    CpanelAPI._features = null;
    CpanelAPI._featuresLoaded = false;
  });

  describe('hasFeature()', () => {
    it('returns true for feature explicitly set to 1', () => {
      CpanelAPI._features = { popaccts: 1, postgres: 0, sitejet: '0' };
      CpanelAPI._featuresLoaded = true;
      expect(CpanelAPI.hasFeature('popaccts')).toBe(true);
    });

    it('returns false for feature explicitly set to 0', () => {
      CpanelAPI._features = { popaccts: 1, postgres: 0, sitejet: '0' };
      CpanelAPI._featuresLoaded = true;
      expect(CpanelAPI.hasFeature('postgres')).toBe(false);
    });

    it('returns false for feature set to string "0"', () => {
      CpanelAPI._features = { popaccts: 1, postgres: 0, sitejet: '0' };
      CpanelAPI._featuresLoaded = true;
      expect(CpanelAPI.hasFeature('sitejet')).toBe(false);
    });

    it('returns true for unknown feature (fail-open)', () => {
      CpanelAPI._features = { popaccts: 1, postgres: 0, sitejet: '0' };
      CpanelAPI._featuresLoaded = true;
      expect(CpanelAPI.hasFeature('unknown')).toBe(true);
    });

    it('returns true when _features is null (fail-open)', () => {
      CpanelAPI._features = null;
      expect(CpanelAPI.hasFeature('anything')).toBe(true);
    });
  });

  describe('hasAnyFeature()', () => {
    it('returns true if at least one feature is enabled', () => {
      CpanelAPI._features = { popaccts: 1, postgres: 0, sitejet: '0' };
      CpanelAPI._featuresLoaded = true;
      expect(CpanelAPI.hasAnyFeature(['postgres', 'popaccts'])).toBe(true);
    });
  });

  describe('hasAllFeatures()', () => {
    it('returns false if any feature is disabled', () => {
      CpanelAPI._features = { popaccts: 1, postgres: 0, sitejet: '0' };
      CpanelAPI._featuresLoaded = true;
      expect(CpanelAPI.hasAllFeatures(['postgres', 'popaccts'])).toBe(false);
    });
  });
});
