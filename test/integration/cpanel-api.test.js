import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';
import { createFetchMock } from '../helpers/mock-fetch.js';

describe('CpanelAPI — integration', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    // Ensure CPANEL global is set
    window.CPANEL = {
      token: 'cpsessABCDEF1234',
      user: 'testuser',
      homedir: '/home/testuser',
    };

    // Load the script fresh each time
    loadScript('meridian/_assets/cpanel-api.js');

    // Reset internal state
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
  });

  // ── Token Detection ──

  describe('getToken()', () => {
    it('reads token from window.CPANEL.token', () => {
      window.CPANEL.token = 'cpsessABCDEF1234';
      CpanelAPI._token = null;
      expect(CpanelAPI.getToken()).toBe('cpsessABCDEF1234');
    });

    it('falls back to window.PAGE_TOKEN', () => {
      window.CPANEL = {};
      window.PAGE_TOKEN = 'cpsessPAGETOKEN99';
      CpanelAPI._token = null;
      const token = CpanelAPI.getToken();
      expect(token).toBe('cpsessPAGETOKEN99');
      delete window.PAGE_TOKEN;
    });

    it('caches token after first lookup', () => {
      CpanelAPI._token = null;
      CpanelAPI.getToken();
      const cached = CpanelAPI._token;
      expect(cached).toBe('cpsessABCDEF1234');
      // Second call uses cache
      window.CPANEL.token = 'different';
      expect(CpanelAPI.getToken()).toBe('cpsessABCDEF1234');
    });
  });

  // ── UAPI call() ──

  describe('call()', () => {
    it('builds correct UAPI URL and returns result', async () => {
      const result = await CpanelAPI.call('Email', 'list_pops_with_disk');
      expect(fetchMock).toHaveBeenCalled();
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('/cpsessABCDEF1234/execute/Email/list_pops_with_disk');
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBe(2);
      expect(result.data[0].email).toBe('info@example.com');
    });

    it('appends query params', async () => {
      await CpanelAPI.call('Features', 'has_feature', { name: 'popaccts' });
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('name=popaccts');
    });

    it('throws on status:0 response', async () => {
      const errorFetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          result: { status: 0, data: null, errors: ['Something went wrong'] },
        }),
      }));
      vi.stubGlobal('fetch', errorFetch);
      await expect(CpanelAPI.call('Email', 'list_pops_with_disk')).rejects.toThrow('Something went wrong');
    });

    it('throws on HTTP error', async () => {
      const errorFetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }));
      vi.stubGlobal('fetch', errorFetch);
      await expect(CpanelAPI.call('Email', 'list_pops_with_disk')).rejects.toThrow('returned 500');
    });
  });

  // ── callJson() ──

  describe('callJson()', () => {
    it('sends POST with Content-Type application/json', async () => {
      await CpanelAPI.callJson('Personalization', 'set', { personalization: { theme: 'dark' } });
      const [url, opts] = fetchMock.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(url).toContain('/cpsessABCDEF1234/execute/Personalization/set');
    });
  });

  // ── callPost() ──

  describe('callPost()', () => {
    it('sends POST with Content-Type application/x-www-form-urlencoded', async () => {
      await CpanelAPI.callPost('Email', 'add_pop', { email: 'test', domain: 'example.com' });
      const [url, opts] = fetchMock.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(opts.body).toContain('email=test');
      expect(opts.body).toContain('domain=example.com');
    });
  });

  // ── call2() ──

  describe('call2()', () => {
    it('builds correct API2 URL with query params', async () => {
      const result = await CpanelAPI.call2('AddonDomain', 'addaddondomain', {
        newdomain: 'test.com',
      });
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('/cpsessABCDEF1234/json-api/cpanel');
      expect(calledUrl).toContain('cpanel_jsonapi_apiversion=2');
      expect(calledUrl).toContain('cpanel_jsonapi_module=AddonDomain');
      expect(calledUrl).toContain('cpanel_jsonapi_func=addaddondomain');
      expect(calledUrl).toContain('newdomain=test.com');
      expect(result).toHaveProperty('data');
    });
  });

  // ── Data fetcher helpers ──

  describe('data fetcher helpers', () => {
    it('getDomainList() returns domain data', async () => {
      const data = await CpanelAPI.getDomainList();
      expect(data.main_domain).toBe('example.com');
      expect(data.addon_domains).toContain('shop.example.net');
    });

    it('listEmailAccounts() returns email array', async () => {
      const data = await CpanelAPI.listEmailAccounts();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBe(2);
      expect(data[0].email).toBe('info@example.com');
    });

    it('getSSLHosts() returns SSL host array', async () => {
      const data = await CpanelAPI.getSSLHosts();
      expect(data).toBeInstanceOf(Array);
      expect(data[0].host).toBe('example.com');
    });

    it('listBackups() returns backup dates', async () => {
      const data = await CpanelAPI.listBackups();
      expect(data).toContain('2026-03-15');
    });

    it('get2FAStatus() returns 2FA config', async () => {
      const data = await CpanelAPI.get2FAStatus();
      expect(data.is_enabled).toBe(0);
    });

    it('getNotificationCount() returns a number', async () => {
      const count = await CpanelAPI.getNotificationCount();
      expect(count).toBe(3);
    });

    it('getLastLoginIP() returns IP string', async () => {
      const ip = await CpanelAPI.getLastLoginIP();
      expect(ip).toBe('192.168.1.42');
    });
  });

  // ── getDiskUsage() ──

  describe('getDiskUsage()', () => {
    it('returns disk usage from ResourceUsage fixture', async () => {
      const usage = await CpanelAPI.getDiskUsage();
      expect(usage).not.toBeNull();
      expect(usage.used).toBe(4500000000);
      expect(usage.max).toBe(10737418240);
    });

    it('accepts pre-fetched resource usage items', async () => {
      const items = [
        { id: 'disk_usage', usage: 1000, maximum: 5000, error: null },
      ];
      const usage = await CpanelAPI.getDiskUsage(items);
      expect(usage.used).toBe(1000);
      expect(usage.max).toBe(5000);
      // Should not have called fetch for ResourceUsage since we passed items
      const resourceCalls = fetchMock.mock.calls.filter(c =>
        c[0].toString().includes('ResourceUsage')
      );
      expect(resourceCalls.length).toBe(0);
    });
  });

  // ── URL helpers ──

  describe('URL helpers', () => {
    it('uapiUrl() includes token', () => {
      CpanelAPI._token = null;
      const url = CpanelAPI.uapiUrl('Email', 'list_pops_with_disk');
      expect(url).toBe('/cpsessABCDEF1234/execute/Email/list_pops_with_disk');
    });

    it('jupiterUrl() includes token and jupiter path', () => {
      CpanelAPI._token = null;
      const url = CpanelAPI.jupiterUrl('filemanager/index.html');
      expect(url).toBe('/cpsessABCDEF1234/frontend/jupiter/filemanager/index.html');
    });

    it('meridianUrl() includes token and meridian path', () => {
      CpanelAPI._token = null;
      const url = CpanelAPI.meridianUrl('email/index.html');
      expect(url).toBe('/cpsessABCDEF1234/frontend/meridian/email/index.html');
    });
  });

  // ── userKey() ──

  describe('userKey()', () => {
    it('scopes key by user name', () => {
      expect(CpanelAPI.userKey('meridian-features')).toBe('meridian-features:testuser');
    });

    it('returns bare key when no user', () => {
      window.CPANEL = {};
      CpanelAPI._userName = null;
      expect(CpanelAPI.userKey('meridian-features')).toBe('meridian-features');
    });
  });
});
