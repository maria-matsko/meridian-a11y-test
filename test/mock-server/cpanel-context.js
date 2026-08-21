/**
 * Mock cPanel session context for TT2 template rendering.
 * Provides the same variables that cPanel injects into every page request.
 */

export const cpanelContext = {
  CPANEL: {
    authuser: 'testuser',
    homedir: '/home/testuser',
    is_debug_mode_enabled: 0,
  },
  cp_security_token: '/mock-token',
  page_title: '',
  page_id: '',
  chromeless: 0,
  asset_path: '../_assets',
  EasyApache: { get_ea_conf: () => ({ oldest_supported_version: '8.1' }) },
  FORM: { item: () => '' },
};
