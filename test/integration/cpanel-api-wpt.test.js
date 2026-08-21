import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';
import { createFetchMock } from '../helpers/mock-fetch.js';

describe('CpanelAPI — WP Toolkit & Sitejet integration', () => {
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
  });

  // ── WP Toolkit URL construction ──

  describe('wptUrl()', () => {
    it('builds WPT URL with token', () => {
      CpanelAPI._token = null;
      const url = CpanelAPI.wptUrl('/installations');
      expect(url).toBe('/cpsessABCDEF1234/3rdparty/wpt/index.php/v1/installations');
    });
  });

  // ── wpInstall() ──

  describe('wpInstall()', () => {
    it('sends POST to /installations with correct body', async () => {
      const result = await CpanelAPI.wpInstall({
        domain: 'example.com',
        title: 'Test Site',
        admin: { login: 'admin', password: 'secret123' },
      });
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/3rdparty/wpt/index.php/v1/installations');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(opts.body);
      expect(body.domain).toBe('example.com');
      expect(body.title).toBe('Test Site');
      expect(body.admin.login).toBe('admin');
      expect(result).toHaveProperty('data');
    });
  });

  // ── wpGetInstallations() ──

  describe('wpGetInstallations()', () => {
    it('fetches installations list via GET', async () => {
      const result = await CpanelAPI.wpGetInstallations();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/3rdparty/wpt/index.php/v1/installations');
      expect(opts.method).toBeUndefined(); // GET is default
      expect(result).toBeInstanceOf(Array);
      expect(result[0].domain).toBe('example.com');
    });
  });

  // ── wpInstallPlugin() ──

  describe('wpInstallPlugin()', () => {
    it('sends POST to /installations/:id/plugins', async () => {
      const result = await CpanelAPI.wpInstallPlugin(42, 'woocommerce', true);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/installations/42/plugins');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.slug).toBe('woocommerce');
      expect(body.status).toBe(true);
      expect(result).toHaveProperty('data');
    });
  });

  // ── wpGetTaskStatus() ──

  describe('wpGetTaskStatus()', () => {
    it('fetches task status from relative URL', async () => {
      const result = await CpanelAPI.wpGetTaskStatus('/v1/tasks/task_001');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/3rdparty/wpt/index.php/v1/tasks/task_001');
      expect(result.status).toBe('complete');
    });
  });

  // ── Sitejet ──

  describe('sitejetCreateWebsite()', () => {
    it('calls get_api_token then create_website', async () => {
      const result = await CpanelAPI.sitejetCreateWebsite('example.com');
      // Should have called get_api_token first, then create_website
      const urls = fetchMock.mock.calls.map(c => c[0].toString());
      const tokenCall = urls.findIndex(u => u.includes('Sitejet/get_api_token'));
      const createCall = urls.findIndex(u => u.includes('Sitejet/create_website'));
      expect(tokenCall).toBeGreaterThanOrEqual(0);
      expect(createCall).toBeGreaterThan(tokenCall);
      expect(result.data).toHaveProperty('site_id');
    });

    it('falls back to create_account if get_api_token fails', async () => {
      // Override get_api_token to fail, which triggers create_account fallback
      const customFetch = createFetchMock({
        'Sitejet--get_api_token': {
          result: { status: 0, data: null, errors: ['No account'] },
        },
      });
      vi.stubGlobal('fetch', customFetch);

      const result = await CpanelAPI.sitejetCreateWebsite('example.com');
      const urls = customFetch.mock.calls.map(c => c[0].toString());
      // Should have tried get_api_token, then create_account, then create_website
      expect(urls.some(u => u.includes('Sitejet/get_api_token'))).toBe(true);
      expect(urls.some(u => u.includes('Sitejet/create_account'))).toBe(true);
      expect(urls.some(u => u.includes('Sitejet/create_website'))).toBe(true);
    });
  });

  describe('sitejetGetSsoLink()', () => {
    it('returns SSO URL data', async () => {
      const result = await CpanelAPI.sitejetGetSsoLink('example.com');
      const calledUrl = fetchMock.mock.calls[0][0].toString();
      expect(calledUrl).toContain('Sitejet/get_sso_link');
      // The method returns result.data which is the SSO link data
      expect(result).toBeDefined();
    });
  });
});
