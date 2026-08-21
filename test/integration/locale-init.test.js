import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';
import { createFetchMock } from '../helpers/mock-fetch.js';

describe('Locale initialization — integration', () => {
  let fetchMock;

  beforeEach(() => {
    window.CPANEL = {
      token: 'cpsessABCDEF1234',
      user: 'testuser',
      homedir: '/home/testuser',
    };

    // Load cpanel-api first (i18n depends on CpanelAPI)
    loadScript('meridian/_assets/cpanel-api.js');
    CpanelAPI._token = null;
    localStorage.clear();
  });

  afterEach(() => {
    CpanelAPI._token = null;
    CpanelAPI._features = null;
    CpanelAPI._featuresLoaded = false;
    localStorage.clear();
    vi.restoreAllMocks();
    // Clean up data-t elements
    document.querySelectorAll('[data-t]').forEach(el => el.remove());
    document.documentElement.removeAttribute('dir');
    document.documentElement.classList.remove('i18n-loading', 'i18n-ready');
  });

  it('initLocale() with English locale leaves text unchanged', async () => {
    // Default fixture returns locale: 'en'
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    // Create elements with data-t
    const el = document.createElement('span');
    el.setAttribute('data-t', '');
    el.textContent = 'Email Accounts';
    document.body.appendChild(el);

    await window.initLocale();

    // English: text should remain as-is
    expect(el.textContent).toBe('Email Accounts');
  });

  it('initLocale() with Spanish locale translates data-t elements', async () => {
    // Override locale endpoint to return Spanish
    fetchMock = createFetchMock({
      'Locale--get_attributes': {
        result: {
          status: 1,
          data: { locale: 'es', direction: 'ltr', encoding: 'utf-8' },
        },
      },
    });
    // Also handle locale file fetch
    const originalFetch = fetchMock;
    const wrappedFetch = vi.fn(async (url, opts) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/locale/es.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            'Email Accounts': 'Cuentas de correo',
            'Dashboard': 'Panel de control',
          }),
          text: async () => JSON.stringify({
            'Email Accounts': 'Cuentas de correo',
            'Dashboard': 'Panel de control',
          }),
        };
      }
      return originalFetch(url, opts);
    });
    vi.stubGlobal('fetch', wrappedFetch);

    loadScript('meridian/_assets/i18n.js');

    // Create elements with data-t
    const el1 = document.createElement('span');
    el1.setAttribute('data-t', '');
    el1.textContent = 'Email Accounts';
    document.body.appendChild(el1);

    const el2 = document.createElement('span');
    el2.setAttribute('data-t', '');
    el2.textContent = 'Dashboard';
    document.body.appendChild(el2);

    await window.initLocale();

    expect(el1.textContent).toBe('Cuentas de correo');
    expect(el2.textContent).toBe('Panel de control');
  });

  it('translateDOM() fires meridian-locale-ready event', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    const handler = vi.fn();
    document.addEventListener('meridian-locale-ready', handler);

    window.translateDOM();

    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener('meridian-locale-ready', handler);
  });

  it('t() function does passthrough for English', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    expect(window.t('Hello World')).toBe('Hello World');
  });

  it('t() supports positional interpolation', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    expect(window.t('{0} of {1}', '5 MB', '10 GB')).toBe('5 MB of 10 GB');
  });

  it('t() supports named interpolation', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    expect(window.t('Hello {name}', { name: 'Jesse' })).toBe('Hello Jesse');
  });

  it('setDirection() sets dir attribute on html element', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    window.setDirection('rtl');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('getLocaleInfo() returns locale state', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    await window.initLocale();
    const info = window.getLocaleInfo();
    expect(info).toHaveProperty('tag');
    expect(info).toHaveProperty('dir');
    expect(info).toHaveProperty('loaded');
    expect(info.loaded).toBe(true);
  });

  it('initLocale() stores locale in localStorage', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    await window.initLocale();
    const stored = localStorage.getItem('meridian-locale');
    expect(stored).toBe('en');
  });

  it('translateDOM() stores original text in data-t-src', async () => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    const el = document.createElement('span');
    el.setAttribute('data-t', '');
    el.textContent = 'Email Accounts';
    document.body.appendChild(el);

    window.translateDOM();

    expect(el.getAttribute('data-t-src')).toBe('Email Accounts');
  });

  it('gracefully handles missing CpanelAPI (no cPanel session)', async () => {
    // Simulate outside cPanel — no token
    window.CPANEL = {};
    CpanelAPI._token = null;

    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    loadScript('meridian/_assets/i18n.js');

    // Should resolve without error
    await window.initLocale();
    const info = window.getLocaleInfo();
    expect(info.loaded).toBe(true);
  });
});
