import { describe, it, expect, beforeEach } from 'vitest';
import { loadScript } from '../helpers/load-script.js';

describe('CpanelAPI usage rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Load cpanel-api.js and i18n.js (for window.t and window.esc)
    loadScript('meridian/_assets/cpanel-api.js');
    loadScript('meridian/_assets/i18n.js');
  });

  const mockItems = [
    { id: 'disk_usage', description: 'Disk Space Usage', usage: 524288000, maximum: 1073741824, formatter: 'format_bytes' },
    { id: 'bandwidth', description: 'Monthly Bandwidth', usage: 209715200, maximum: null, formatter: 'format_bytes' },
    { id: 'email_accounts', description: 'Email Accounts', usage: 3, maximum: 100, formatter: null },
    { id: 'mysql_databases', description: 'MySQL Databases', usage: 2, maximum: 10, formatter: null },
    { id: 'subdomains', description: 'Subdomains', usage: 1, maximum: 50, formatter: null },
  ];

  describe('renderPrimaryUsage', () => {
    it('renders primary items (disk + bandwidth)', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      window.CpanelAPI.renderPrimaryUsage(container, mockItems);

      expect(container.innerHTML).toContain('Disk Space');
      expect(container.innerHTML).toContain('Bandwidth');
      // Should render usage gauges
      expect(container.querySelectorAll('.usage-gauge').length).toBe(2);
    });

    it('shows percentage for limited resources', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      window.CpanelAPI.renderPrimaryUsage(container, mockItems);

      // Disk is 524288000 / 1073741824 = ~49%
      expect(container.innerHTML).toContain('49%');
    });

    it('does not show percentage for unlimited resources', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // bandwidth has maximum: null (unlimited)
      window.CpanelAPI.renderPrimaryUsage(container, mockItems);

      const gauges = container.querySelectorAll('.usage-gauge');
      // The bandwidth gauge (second) should not have a percentage element
      const bwGauge = gauges[1];
      expect(bwGauge.querySelector('.usage-gauge-pct')).toBeNull();
    });

    it('hides container when no primary items exist', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const nonPrimary = mockItems.filter(i => i.id !== 'disk_usage' && i.id !== 'bandwidth');
      window.CpanelAPI.renderPrimaryUsage(container, nonPrimary);
      expect(container.style.display).toBe('none');
    });

    it('does nothing with null container or items', () => {
      // Should not throw
      window.CpanelAPI.renderPrimaryUsage(null, mockItems);
      window.CpanelAPI.renderPrimaryUsage(document.createElement('div'), null);
    });
  });

  describe('renderUsageTable', () => {
    it('renders non-primary items as a table', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      window.CpanelAPI.renderUsageTable(container, mockItems);

      expect(container.querySelector('.usage-table')).not.toBeNull();
      // Should NOT contain primary items
      expect(container.innerHTML).not.toContain('Disk Space');
      expect(container.innerHTML).not.toContain('Bandwidth');
      // Should contain secondary items
      expect(container.innerHTML).toContain('Email Accounts');
      expect(container.innerHTML).toContain('MySQL Databases');
    });

    it('shows usage values for count-based items', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      window.CpanelAPI.renderUsageTable(container, mockItems);

      // email_accounts: 3 / 100
      expect(container.innerHTML).toContain('3');
      expect(container.innerHTML).toContain('100');
    });

    it('hides container when no secondary items exist', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const primaryOnly = mockItems.filter(i => i.id === 'disk_usage' || i.id === 'bandwidth');
      window.CpanelAPI.renderUsageTable(container, primaryOnly);
      expect(container.style.display).toBe('none');
    });
  });

  describe('renderUsageCards', () => {
    it('renders stat cards for all items', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      window.CpanelAPI.renderUsageCards(container, mockItems);

      expect(container.querySelectorAll('.stat-card').length).toBeGreaterThan(0);
      expect(container.innerHTML).toContain('Disk Space');
      expect(container.innerHTML).toContain('Email Accounts');
    });

    it('marks unlimited items with the unlimited class', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      window.CpanelAPI.renderUsageCards(container, mockItems);

      // bandwidth has maximum: null
      const cards = container.querySelectorAll('.stat-card');
      const unlimitedCards = container.querySelectorAll('.stat-card.unlimited');
      expect(unlimitedCards.length).toBeGreaterThan(0);
    });

    it('applies danger class when usage exceeds 90%', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const highUsageItems = [
        { id: 'disk_usage', description: 'Disk Space', usage: 950, maximum: 1000, formatter: null },
      ];
      window.CpanelAPI.renderUsageCards(container, highUsageItems);

      expect(container.innerHTML).toContain('danger');
    });

    it('formats byte values using formatBytes', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const byteItems = [
        { id: 'disk_usage', description: 'Disk Space', usage: 1073741824, maximum: 2147483648, formatter: 'format_bytes' },
      ];
      window.CpanelAPI.renderUsageCards(container, byteItems);

      // 1073741824 bytes = 1 GB
      expect(container.innerHTML).toContain('GB');
    });
  });
});
