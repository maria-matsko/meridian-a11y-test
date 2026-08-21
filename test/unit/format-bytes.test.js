import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript } from '../helpers/load-script.js';

beforeAll(() => {
  loadScript('meridian/_assets/cpanel-api.js');
});

describe('CpanelAPI.formatBytes()', () => {
  it('formats 0 as "0 MB"', () => {
    expect(CpanelAPI.formatBytes(0)).toBe('0 MB');
  });

  it('formats null as "0 MB"', () => {
    expect(CpanelAPI.formatBytes(null)).toBe('0 MB');
  });

  it('formats undefined as "0 MB"', () => {
    expect(CpanelAPI.formatBytes(undefined)).toBe('0 MB');
  });

  it('formats 500000 bytes as "0.48 MB"', () => {
    // 500000 / 1048576 = 0.4768... → toFixed(2) = "0.48"
    expect(CpanelAPI.formatBytes(500000)).toBe('0.48 MB');
  });

  it('formats 1048576 bytes (1 MB) as "1 MB"', () => {
    // 1048576 / 1048576 = 1.0 → toFixed(1) = "1.0" → replace .0 → "1"
    expect(CpanelAPI.formatBytes(1048576)).toBe('1 MB');
  });

  it('formats 1073741824 bytes (1 GB) as "1 GB"', () => {
    // 1073741824 / 1048576 = 1024 → /1024 = 1.0 → toFixed(2) = "1.00" → "1"
    expect(CpanelAPI.formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats 1099511627776 bytes (1 TB) as "1 TB"', () => {
    expect(CpanelAPI.formatBytes(1099511627776)).toBe('1 TB');
  });
});
