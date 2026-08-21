import { readFileSync } from 'fs';
import { resolve } from 'path';

const FIXTURES_DIR = resolve(import.meta.dirname, '../fixtures');

/**
 * Create a fetch mock that returns JSON fixtures based on URL patterns.
 * @param {Object} [overrides] - map of "Module--function" to custom response data
 * @returns {Function} mock fetch function
 */
export function createFetchMock(overrides = {}) {
  return vi.fn(async (url, opts) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    // UAPI: /:token/execute/:module/:function
    const uapiMatch = urlStr.match(/\/execute\/([^/?]+)\/([^/?]+)/);
    if (uapiMatch) {
      const key = `${uapiMatch[1]}--${uapiMatch[2]}`;
      if (overrides[key]) {
        return mockResponse(overrides[key]);
      }
      return loadFixtureResponse(`uapi/${key}.json`);
    }

    // API2: /:token/json-api/cpanel?cpanel_jsonapi_module=X&cpanel_jsonapi_func=Y
    if (urlStr.includes('/json-api/cpanel')) {
      const params = new URL(urlStr, 'http://localhost').searchParams;
      const mod = params.get('cpanel_jsonapi_module');
      const func = params.get('cpanel_jsonapi_func');
      const key = `${mod}--${func}`;
      if (overrides[key]) {
        return mockResponse(overrides[key]);
      }
      return loadFixtureResponse(`api2/${key}.json`);
    }

    // WP Toolkit: /3rdparty/wpt/index.php/v1/*
    if (urlStr.includes('/3rdparty/wpt/')) {
      const path = urlStr.replace(/.*\/v1/, '').replace(/\?.*/, '');
      const method = opts?.method || 'GET';
      if (path === '/installations' && method === 'POST') return loadFixtureResponse('wpt/wpt--install.json');
      if (path === '/installations') return loadFixtureResponse('wpt/wpt--installations.json');
      if (path.includes('/plugins')) return loadFixtureResponse('wpt/wpt--install-plugin.json');
      return loadFixtureResponse('wpt/wpt--task-status.json');
    }

    // Locale files
    if (urlStr.includes('/locale/')) {
      return mockResponse({});
    }

    // Default: empty success
    return mockResponse({ status: 1, data: null });
  });
}

function loadFixtureResponse(relativePath) {
  try {
    const content = readFileSync(resolve(FIXTURES_DIR, relativePath), 'utf-8');
    return mockResponse(JSON.parse(content));
  } catch {
    return mockResponse({ result: { status: 1, data: null, errors: [], warnings: [], messages: [], metadata: {} } });
  }
}

function mockResponse(data) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

/**
 * Create a fetch mock that returns a UAPI error for a specific endpoint.
 */
export function createErrorFetchMock(module, func, errorMessage) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      apiversion: 3,
      module,
      func,
      result: { status: 0, data: null, errors: [errorMessage], warnings: [], messages: [], metadata: {} },
    }),
  }));
}
