/* ═══════════════════════════════════════════════════════════════
   Meridian — Shared cPanel UAPI Client
   ═══════════════════════════════════════════════════════════════
   Single source of truth for all UAPI and API2 calls.
   Reads session token from window.CPANEL (injected by master.html.tt)
   or falls back to URL/cookie detection for standalone prototype use.
   ═══════════════════════════════════════════════════════════════ */

const CpanelAPI = {
  _token: null,
  _homeDir: null,
  _userName: null,

  /**
   * Get the cPanel session token.
   * Priority: window.CPANEL.token → window.PAGE_TOKEN → URL path → cookie
   */
  getToken() {
    if (this._token) return this._token;

    // 1. Injected by master.html.tt
    if (window.CPANEL?.token) {
      this._token = window.CPANEL.token;
      return this._token;
    }

    // 2. Set by cPanel's template system (Jupiter compat)
    if (window.PAGE_TOKEN) {
      this._token = window.PAGE_TOKEN;
      return this._token;
    }

    // 3. Parse from URL path: /cpsessXXXXXXXXXX/...
    const match = window.location.pathname.match(/(cpsess[a-zA-Z0-9]+)/);
    if (match) {
      this._token = match[1];
      return this._token;
    }

    // 4. Check cookie
    const cookieMatch = document.cookie.match(/cpsession=([^;]+)/);
    if (cookieMatch) {
      this._token = cookieMatch[1];
      return this._token;
    }

    return null;
  },

  /** True if we're inside a cPanel session (have a valid token) */
  isInsideCpanel() {
    return !!this.getToken();
  },

  /** Get the cPanel user name */
  getUserName() {
    return window.CPANEL?.user || this._userName || null;
  },

  /** Get the user's home directory */
  getHomeDir() {
    return window.CPANEL?.homedir || this._homeDir || null;
  },

  /** Build a UAPI URL with the session token */
  uapiUrl(module, func) {
    const token = this.getToken();
    return token
      ? `/${token}/execute/${module}/${func}`
      : `/execute/${module}/${func}`;
  },

  /**
   * Build a URL to a Jupiter theme page (for cross-theme links).
   * Used when linking to features not yet in Meridian (File Manager,
   * phpMyAdmin, Sitejet, Webmail, etc.)
   */
  jupiterUrl(path) {
    const token = this.getToken();
    return token
      ? `/${token}/frontend/jupiter/${path}`
      : `/frontend/jupiter/${path}`;
  },

  /**
   * Build a URL to a Meridian theme page.
   */
  meridianUrl(path) {
    const token = this.getToken();
    return token
      ? `/${token}/frontend/meridian/${path}`
      : `../${path}`;
  },

  // ── UAPI GET call ──

  async call(module, func, params = {}) {
    const url = new URL(this.uapiUrl(module, func), window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const resp = await fetch(url.toString(), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) throw new Error(`UAPI ${module}::${func} returned ${resp.status}`);
    const json = await resp.json();
    // Handle both flat ({data, status}) and wrapped ({result: {data, status}}) UAPI responses
    const result = json.result || json;
    if (result.status === 0) throw new Error(result.errors?.[0] || `UAPI ${module}::${func} failed`);
    return result;
  },

  // ── UAPI JSON POST call ──

  async callJson(module, func, body = {}) {
    const token = this.getToken();
    const base = token
      ? `/${token}/execute/${module}/${func}`
      : `/execute/${module}/${func}`;

    const resp = await fetch(base, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) throw new Error(`UAPI ${module}::${func} returned ${resp.status}`);
    const json = await resp.json();
    const result = json.result || json;
    if (result.status === 0) throw new Error(result.errors?.[0] || `UAPI ${module}::${func} failed`);
    return result;
  },

  // ── UAPI form-encoded POST call ──
  // Use when a UAPI endpoint expects a parameter whose value is a JSON string
  // (e.g. ContactInformation::set_notification_preferences expects 'preferences'
  // as a form param containing a JSON-encoded hash).

  async callPost(module, func, params = {}) {
    const token = this.getToken();
    const base = token
      ? `/${token}/execute/${module}/${func}`
      : `/execute/${module}/${func}`;

    const formData = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.set(k, v);
    });

    const resp = await fetch(base, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: formData.toString()
    });

    if (!resp.ok) throw new Error(`UAPI ${module}::${func} returned ${resp.status}`);
    const json = await resp.json();
    const result = json.result || json;
    if (result.status === 0) throw new Error(result.errors?.[0] || `UAPI ${module}::${func} failed`);
    return result;
  },

  // ── API2 call (legacy modules: AddonDomain, SubDomain, Park) ──

  async call2(module, func, params = {}) {
    const token = this.getToken();
    const base = token ? `/${token}/json-api/cpanel` : '/json-api/cpanel';
    const url = new URL(base, window.location.origin);
    url.searchParams.set('cpanel_jsonapi_apiversion', '2');
    url.searchParams.set('cpanel_jsonapi_module', module);
    url.searchParams.set('cpanel_jsonapi_func', func);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const resp = await fetch(url.toString(), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) throw new Error(`API2 ${module}::${func} returned ${resp.status}`);
    const json = await resp.json();
    const result = json.cpanelresult || json;
    if (result.error) throw new Error(result.error);
    if (result.data && result.data[0] && result.data[0].result === 0) {
      throw new Error(result.data[0].reason || `API2 ${module}::${func} failed`);
    }
    return { data: result.data || [] };
  },

  // ── WP Toolkit REST API ──
  // WP Toolkit exposes a REST API at /3rdparty/wpt/index.php on port 2083.
  // From within cPanel, the session token provides authentication.

  wptUrl(path) {
    const token = this.getToken();
    return token
      ? `/${token}/3rdparty/wpt/index.php/v1${path}`
      : `/3rdparty/wpt/index.php/v1${path}`;
  },

  /**
   * Install WordPress via WP Toolkit REST API.
   * @param {Object} opts - { domain, path?, title?, admin: { login, password, email? }, plugins?: string[] }
   * @returns {Promise<Object>} - { id, url } of the new installation
   */
  async wpInstall(opts) {
    const body = {
      domain: opts.domain,
      protocol: 'https',
      title: opts.title || 'My Website',
      admin: {
        login: opts.admin?.login || 'admin',
        password: opts.admin?.password,
        email: opts.admin?.email || `admin@${opts.domain}`
      }
    };
    if (opts.path) body.installationPath = opts.path;

    const resp = await fetch(this.wptUrl('/installations'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `WP Toolkit install failed (${resp.status})`);
    }
    return resp.json();
  },

  /**
   * Install a plugin on a WordPress installation.
   * @param {number} installationId
   * @param {string} slug - e.g. 'woocommerce', 'yoast-seo'
   * @param {boolean} activate - whether to activate after install
   */
  async wpInstallPlugin(installationId, slug, activate = true) {
    const resp = await fetch(this.wptUrl(`/installations/${installationId}/plugins`), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ slug, status: activate })
    });
    if (!resp.ok) throw new Error(`Failed to install plugin ${slug}`);
    return resp.json();
  },

  /**
   * Get WordPress installations list.
   */
  async wpGetInstallations() {
    const resp = await fetch(this.wptUrl('/installations'), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error('Failed to list WordPress installations');
    return resp.json();
  },

  /**
   * Check WP Toolkit background task status.
   * @param {string} taskUrl - relative URL from install response
   */
  async wpGetTaskStatus(taskUrl) {
    const resp = await fetch(this.wptUrl(taskUrl.replace(/^\/v1/, '')), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error('Failed to check task status');
    return resp.json();
  },

  // ── Sitejet UAPI methods ──
  // Sitejet uses cPanel's UAPI module 'Sitejet'.

  /**
   * Create a Sitejet website for a domain.
   * Creates the Sitejet account first if needed.
   */
  async sitejetCreateWebsite(domain) {
    // Step 1: Ensure account exists (get_api_token creates if needed)
    try {
      await this.call('Sitejet', 'get_api_token');
    } catch (e) {
      // Account doesn't exist — create it
      await this.call('Sitejet', 'create_account');
    }

    // Step 2: Create website for this domain
    return this.call('Sitejet', 'create_website', {
      domain,
      company: 'My Website'
    });
  },

  /**
   * Get SSO link to open Sitejet Builder for a domain.
   * @param {string} domain
   * @returns {Promise<string>} - SSO URL to redirect to
   */
  async sitejetGetSsoLink(domain) {
    // After the user clicks "Publish" in Sitejet's CMS, Sitejet redirects to
    // the referrer URL with /publish?site_id=domain appended.
    //
    // We point the referrer to our Meridian Sitejet handler page. This page
    // calls Sitejet::start_publish to download the built site from Sitejet's
    // API into the user's document root, polls Sitejet::poll_publish for
    // progress, and redirects to the websites page on completion.
    //
    // The referrer must be a full absolute URL (Sitejet's CMS is on a
    // different origin — cms.sitehub.io).
    const token = this.getToken();
    const path = token
      ? `/${token}/frontend/meridian/sitejet`
      : '/frontend/meridian/sitejet';
    const referrer = window.location.origin + path;
    const result = await this.call('Sitejet', 'get_sso_link', {
      domain,
      referrer: referrer
    });
    return result.data;
  },

  // ── Domain API helpers ──

  async addAddonDomain(domain, docroot) {
    return this.call2('AddonDomain', 'addaddondomain', {
      dir: docroot || domain,
      newdomain: domain,
      subdomain: domain.split('.')[0]
    });
  },

  async addSubdomain(subdomain, rootdomain, docroot) {
    return this.call2('SubDomain', 'addsubdomain', {
      domain: subdomain,
      rootdomain: rootdomain,
      dir: docroot || `${subdomain}.${rootdomain}`
    });
  },

  // ── Email API helper ──

  async createEmailAccount(user, domain, password, quota) {
    return this.call('Email', 'add_pop', {
      email: user,
      domain: domain,
      password: password,
      quota: quota || 500,
      send_welcome_email: 0
    });
  },

  // ── Database API helpers ──

  // MySQL
  async listMysqlDatabases() {
    return this.call('Mysql', 'list_databases');
  },
  async listMysqlUsers() {
    return this.call('Mysql', 'list_users');
  },
  async createMysqlDatabase(name) {
    return this.call('Mysql', 'create_database', { name });
  },
  async setupMysqlDbAndUser(db, dbuser, password) {
    return this.call('Mysql', 'setup_db_and_user', { db, dbuser, password });
  },
  async deleteMysqlDatabase(name) {
    return this.call('Mysql', 'delete_database', { name });
  },
  async renameMysqlDatabase(oldname, newname) {
    return this.call('Mysql', 'rename_database', { oldname, newname });
  },
  async createMysqlUser(name, password) {
    return this.call('Mysql', 'create_user', { name, password });
  },
  async deleteMysqlUser(name) {
    return this.call('Mysql', 'delete_user', { name });
  },
  async setMysqlPassword(user, password) {
    return this.call('Mysql', 'set_password', { user, password });
  },
  async getMysqlPrivileges(user, database) {
    return this.call('Mysql', 'get_privileges_on_database', { user, database });
  },
  async setMysqlPrivileges(user, database, privileges) {
    return this.call('Mysql', 'set_privileges_on_database', { user, database, privileges });
  },
  async revokeMysqlAccess(user, database) {
    return this.call('Mysql', 'revoke_access_to_database', { user, database });
  },
  async addMysqlRemoteHost(host) {
    return this.call('Mysql', 'add_host', { host });
  },
  async deleteMysqlRemoteHost(host) {
    return this.call('Mysql', 'delete_host', { host });
  },
  async getMysqlRestrictions() {
    return this.call('Mysql', 'get_restrictions');
  },
  async getMysqlServerInfo() {
    return this.call('Mysql', 'get_server_information');
  },

  // PostgreSQL
  async listPgDatabases() {
    return this.call('Postgresql', 'list_databases');
  },
  async listPgUsers() {
    return this.call('Postgresql', 'list_users');
  },
  async createPgDatabase(name) {
    return this.call('Postgresql', 'create_database', { name });
  },
  async deletePgDatabase(name) {
    return this.call('Postgresql', 'delete_database', { name });
  },
  async createPgUser(name, password) {
    return this.call('Postgresql', 'create_user', { name, password });
  },
  async deletePgUser(name) {
    return this.call('Postgresql', 'delete_user', { name });
  },
  async setPgPassword(user, password) {
    return this.call('Postgresql', 'set_password', { user, password });
  },
  async grantPgPrivileges(user, database) {
    return this.call('Postgresql', 'grant_all_privileges', { user, database });
  },
  async revokePgPrivileges(user, database) {
    return this.call('Postgresql', 'revoke_all_privileges', { user, database });
  },
  async getPgRestrictions() {
    return this.call('Postgresql', 'get_restrictions');
  },

  // phpMyAdmin (URL builder, not a UAPI call)
  phpMyAdminUrl(dbName) {
    return '../3rdparty/phpMyAdmin/index.php?db=' + encodeURIComponent(dbName);
  },

  /**
   * Return a localStorage key scoped to the current cPanel user.
   * Prevents cross-user data leaks when multiple accounts share the
   * same origin (hostname:port).  Falls back to the bare key when
   * no user is known (standalone prototype mode).
   */
  userKey(name) {
    const user = this.getUserName();
    return user ? name + ':' + user : name;
  },

  // ── Personalization (persistent user preferences via NVData) ──

  async getPersonalization(names) {
    const params = {};
    names.forEach((n, i) => { params['names-' + i] = n; });
    const r = await this.call('Personalization', 'get', params);
    // UAPI returns {data: {personalization: {key: {value, success, reason}}}}
    const d = r.data || {};
    return d.personalization || d;
  },

  async setPersonalization(obj) {
    return this.callJson('Personalization', 'set', {
      personalization: obj
    });
  },

  // ── Feature Management ──
  // Loads all account features once, caches for instant sync access.
  // Call loadFeatures() on page init. Use hasFeature() for sync checks.

  _features: null,
  _featuresLoaded: false,

  async loadFeatures() {
    if (this._featuresLoaded) return this._features;
    // Try localStorage cache first (valid for 5 minutes)
    try {
      var cached = localStorage.getItem(this.userKey('meridian-features'));
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed._ts && (Date.now() - parsed._ts) < 300000) {
          this._features = parsed;
          this._featuresLoaded = true;
          return this._features;
        }
      }
    } catch(e) {}
    // Fetch from UAPI
    try {
      var r = await this.call('Features', 'list_features');
      this._features = r.data || {};
      this._features._ts = Date.now();
      this._featuresLoaded = true;
      try { localStorage.setItem(this.userKey('meridian-features'), JSON.stringify(this._features)); } catch(e) {}
    } catch(e) {
      // If API fails, assume all features enabled (fail-open for usability)
      this._features = {};
      this._featuresLoaded = true;
    }
    window.dispatchEvent(new Event('meridian-features-loaded'));
    return this._features;
  },

  hasFeature(name) {
    // Sync check — returns true if feature is enabled or unknown (fail-open)
    if (!this._features) return true;
    var val = this._features[name];
    // Feature is disabled only if explicitly 0
    return val !== 0 && val !== '0';
  },

  hasAnyFeature(names) {
    return names.some(n => this.hasFeature(n));
  },

  hasAllFeatures(names) {
    return names.every(n => this.hasFeature(n));
  },

  // ── Feature & info helpers ──

  async checkFeature(feature) {
    if (this._featuresLoaded) return this.hasFeature(feature);
    try {
      const r = await this.call('Features', 'has_feature', { name: feature });
      return r.data === 1;
    } catch (e) { return true; } // fail-open
  },

  async getUserInfo() {
    const r = await this.call('Variables', 'get_user_information');
    return r.data || {};
  },

  async getDomainList() {
    const r = await this.call('DomainInfo', 'list_domains');
    return r.data || {};
  },

  async getMailDomains() {
    const r = await this.call('DomainInfo', 'list_domains');
    const d = r.data || {};
    const domains = [];
    if (d.main_domain) domains.push(d.main_domain);
    if (Array.isArray(d.addon_domains)) domains.push(...d.addon_domains);
    if (Array.isArray(d.sub_domains)) domains.push(...d.sub_domains);
    return domains;
  },

  // ── DNS lookup helper ──
  // Uses cPanel's UAPI to check if a domain resolves to this server.

  async checkDnsForDomain(domain) {
    try {
      const r = await this.call('DomainInfo', 'single_domain_data', { domain });
      return { ok: true, data: r.data };
    } catch (e) {
      return { ok: false };
    }
  },

  // ── Shared disk/bandwidth usage helpers ──
  // Cascading fallback logic shared across all pages.
  // Returns { used: bytes, max: bytes|null } or null.
  //
  // @param {Array} [resourceUsageItems] — Optional pre-fetched ResourceUsage data
  //   array. If provided, skips the ResourceUsage API call (avoids duplicates
  //   when the page already fetched it). Pass null/undefined to let these
  //   methods fetch it themselves.

  async getDiskUsage(resourceUsageItems) {
    // Try 1: ResourceUsage (use pre-fetched data or fetch fresh)
    try {
      const items = resourceUsageItems || await this._fetchResourceUsageItems();
      const disk = items.find(i => i.id === 'disk_usage' && !i.error);
      if (disk) {
        return {
          used: Number(disk.usage) || 0,
          max: (disk.maximum === null || disk.maximum === undefined || disk.maximum === '') ? null : Number(disk.maximum),
        };
      }
    } catch {}

    // Try 2: Quota::get_quota_info (works even without filesystem quotas)
    try {
      const r = await this.call('Quota', 'get_quota_info');
      const q = r.data;
      if (q) {
        const used = (Number(q.megabytes_used) || 0) * 1024 * 1024;
        const limit = (Number(q.megabyte_limit) || 0) * 1024 * 1024;
        return { used: used, max: limit || null };
      }
    } catch {}

    return null;
  },

  async getBandwidthUsage(resourceUsageItems) {
    // Try 1: ResourceUsage (use pre-fetched data or fetch fresh)
    try {
      const items = resourceUsageItems || await this._fetchResourceUsageItems();
      const bw = items.find(i => i.id === 'bandwidth' && !i.error);
      if (bw) {
        return {
          used: Number(bw.usage) || 0,
          max: (bw.maximum === null || bw.maximum === undefined || bw.maximum === '') ? null : Number(bw.maximum),
        };
      }
    } catch {}

    // Try 2: Stats::getthismonthsbwusage (API2)
    try {
      const r = await this.call2('Stats', 'getthismonthsbwusage');
      const d = r.data && r.data[0];
      if (d) {
        const used = Number(d.totalbytes) || 0;
        const limit = Number(d.limit) || 0;
        return { used: used, max: limit || null };
      }
    } catch {}

    return null;
  },

  /** @private Fetch ResourceUsage items array (shared by getDiskUsage/getBandwidthUsage) */
  async _fetchResourceUsageItems() {
    const r = await this.call('ResourceUsage', 'get_usages');
    return Array.isArray(r.data) ? r.data : [];
  },

  // ── Shared read-only API helpers ──

  async getResourceUsage() {
    const r = await this.call('ResourceUsage', 'get_usages');
    const items = Array.isArray(r.data) ? r.data : [];
    return items.filter(function(item) {
      if (item.error) return false;
      return true;
    }).map(function(item) {
      return {
        id: item.id,
        description: item.description,
        usage: Number(item.usage) || 0,
        maximum: (item.maximum === null || item.maximum === undefined || item.maximum === '') ? null : Number(item.maximum),
        formatter: item.formatter || null,
      };
    });
  },

  async getResourceLimit(id) {
    const items = await this.getResourceUsage();
    const item = items.find(i => i.id === id);
    return item ? { usage: item.usage, maximum: item.maximum } : null;
  },

  async getSSLHosts() {
    const r = await this.call('SSL', 'installed_hosts');
    return r.data || [];
  },

  async listBackups() {
    const r = await this.call('Backup', 'list_backups');
    return r.data || [];
  },

  async get2FAStatus() {
    const r = await this.call('TwoFactorAuth', 'get_user_configuration');
    return r.data || {};
  },

  async getModSecDomains() {
    const r = await this.call('ModSecurity', 'list_domains');
    return r.data || [];
  },

  async listEmailAccounts() {
    const r = await this.call('Email', 'list_pops_with_disk');
    return r.data || [];
  },

  async getWordPressInstallations() {
    return this.wpGetInstallations();
  },

  async getNotificationCount() {
    const r = await this.call('Notifications', 'get_notifications_count');
    return Number(r.data) || 0;
  },

  async getLastLoginIP() {
    const r = await this.call('LastLogin', 'get_last_or_current_logged_in_ip');
    return r.data || '';
  },

  /**
   * Format bytes into a human-readable string.
   * Minimum display unit is MB (never shows B or KB).
   * Examples: 0 → "0 MB", 500000 → "0.48 MB", 1500000000 → "1.40 GB"
   */
  formatBytes(bytes) {
    if (bytes === null || bytes === undefined) return '0 MB';
    var abs = Math.abs(Number(bytes));
    if (abs < 1048576) return (abs / 1048576).toFixed(2).replace(/\.?0+$/, '') + ' MB'; // < 1 MB
    var units = ['MB', 'GB', 'TB'];
    var val = abs / 1048576; // convert to MB
    var i = 0;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return (i === 0 ? val.toFixed(1) : val.toFixed(2)).replace(/\.0+$/, '') + ' ' + units[i];
  },

  // ── Shared Usage Rendering ──
  // Unified stat card metadata and rendering used by dashboard and websites pages.

  USAGE_META: {
    disk_usage:               { label: 'Disk Space',           icon: 'ri-hard-drive-3-line', cls: 'disk',       primary: true },
    bandwidth:                { label: 'Bandwidth',            icon: 'ri-speed-line',        cls: 'bandwidth',  primary: true },
    filesusage:               { label: 'Files (Inodes)',       icon: 'ri-file-list-3-line',  cls: 'files' },
    cachedmysqldiskusage:     { label: 'Database Disk',        icon: 'ri-database-2-line',   cls: 'databases' },
    cachedpostgresdiskusage:  { label: 'PostgreSQL Disk',      icon: 'ri-database-line',     cls: 'databases',  feature: 'postgres' },
    email_accounts:           { label: 'Email Accounts',       icon: 'ri-mail-line',         cls: 'email',      feature: 'popaccts' },
    mailing_lists:            { label: 'Mailing Lists',        icon: 'ri-mail-send-line',    cls: 'email',      feature: 'lists' },
    autoresponders:           { label: 'Autoresponders',       icon: 'ri-reply-all-line',    cls: 'email',      feature: 'autoresponders' },
    forwarders:               { label: 'Forwarders',           icon: 'ri-share-forward-line', cls: 'email',     feature: 'forwarders' },
    email_filters:            { label: 'Email Filters',        icon: 'ri-filter-3-line',     cls: 'email',      feature: 'blockers' },
    addon_domains:            { label: 'Addon Domains',        icon: 'ri-global-line',       cls: 'domains',    feature: 'addondomains' },
    subdomains:               { label: 'Subdomains',           icon: 'ri-node-tree',         cls: 'subdomains', feature: 'subdomains' },
    aliases:                  { label: 'Aliases',              icon: 'ri-links-line',        cls: 'aliases',    feature: 'parkeddomains' },
    mysql_databases:          { label: 'MySQL Databases',      icon: 'ri-database-2-line',   cls: 'databases',  feature: 'mysql' },
    postgresql_databases:     { label: 'PostgreSQL Databases',  icon: 'ri-database-line',    cls: 'databases',  feature: 'postgres' },
    ftp_accounts:             { label: 'FTP Accounts',         icon: 'ri-upload-2-line',     cls: 'ftp',        feature: 'ftpaccts' },
  },

  /**
   * Render primary resource gauges (disk + bandwidth) into a container.
   * Shows large progress bars with detailed usage info.
   */
  renderPrimaryUsage(container, items) {
    if (!container || !items) return;
    var meta = this.USAGE_META;
    var self = this;
    var _e = typeof window.esc === 'function' ? window.esc : function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    var primary = items.filter(function(item) { var m = meta[item.id]; return m && m.primary; });
    if (!primary.length) { container.style.display = 'none'; return; }
    container.innerHTML = primary.map(function(item) {
      var m = meta[item.id];
      var isUnlimited = item.maximum === null;
      var pct = isUnlimited ? 0 : Math.min(Math.round((item.usage / item.maximum) * 100), 100);
      var fmtUsage = self.formatBytes(item.usage);
      var fmtMax = isUnlimited ? '∞' : self.formatBytes(item.maximum);
      var statusCls = pct >= 90 ? 'error' : pct >= 75 ? 'warning' : 'success';
      return '<div class="usage-gauge">'
        + '<div class="usage-gauge-header">'
        + '<div class="usage-gauge-icon"><i class="' + _e(m.icon) + '" aria-hidden="true"></i></div>'
        + '<div class="usage-gauge-info">'
        + '<div class="usage-gauge-label">' + _e(t(m.label)) + '</div>'
        + '<div class="usage-gauge-detail">' + _e(t('{0} of {1}', fmtUsage, fmtMax)) + '</div>'
        + '</div>'
        + (isUnlimited ? '' : '<div class="usage-gauge-pct" style="color:var(--status-' + statusCls + ');">' + pct + '%</div>')
        + '</div>'
        + '<div class="usage-gauge-bar">'
        + '<div class="usage-gauge-fill ' + statusCls + '" style="width:' + pct + '%;"></div>'
        + '</div>'
        + '</div>';
    }).join('');
  },

  /**
   * Render all resource limits as a compact table/grid.
   * Excludes primary items (disk/bandwidth) which are shown separately.
   */
  renderUsageTable(container, items) {
    if (!container || !items) return;
    var meta = this.USAGE_META;
    var self = this;
    var _e = typeof window.esc === 'function' ? window.esc : function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    var rows = items.filter(function(item) {
      var m = meta[item.id];
      if (!m || m.primary) return false;
      if (m.feature && !self.hasFeature(m.feature)) return false;
      return true;
    });
    if (!rows.length) { container.style.display = 'none'; return; }
    var html = '<div class="usage-table">';
    rows.forEach(function(item, i) {
      var m = meta[item.id];
      var isUnlimited = item.maximum === null;
      var pct = isUnlimited ? 0 : Math.min(Math.round((item.usage / item.maximum) * 100), 100);
      var fmtUsage = item.formatter === 'format_bytes' ? self.formatBytes(item.usage) : String(item.usage);
      var fmtMax = isUnlimited ? '∞' : (item.formatter === 'format_bytes' ? self.formatBytes(item.maximum) : String(item.maximum));
      var statusColor = pct >= 90 ? 'var(--status-error)' : pct >= 75 ? 'var(--status-warning)' : '';
      html += '<div class="usage-table-row">'
        + '<i class="' + _e(m.icon) + '" aria-hidden="true"></i>'
        + '<div class="usage-table-label">' + _e(t(m.label)) + '</div>'
        + '<div class="usage-table-value"' + (statusColor ? ' style="color:' + statusColor + ';"' : '') + '>'
        + _e(fmtUsage) + ' <span>/ ' + _e(fmtMax) + '</span>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * Legacy: render stat cards (used by websites page account resources).
   */
  renderUsageCards(container, items) {
    if (!container || !items) return;
    var meta = this.USAGE_META;
    var self = this;
    var _e = typeof window.esc === 'function' ? window.esc : function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    container.innerHTML = items.map(function(item) {
      var m = meta[item.id];
      if (!m) return '';
      if (m.feature && !self.hasFeature(m.feature)) return '';
      var isUnlimited = item.maximum === null;
      var pct = isUnlimited ? 0 : Math.round((item.usage / item.maximum) * 100);
      var fmtUsage = item.formatter === 'format_bytes' ? self.formatBytes(item.usage) : String(item.usage);
      var fmtMax = item.formatter === 'format_bytes' ? self.formatBytes(item.maximum) : String(item.maximum);
      var barCls = pct >= 90 ? ' danger' : pct >= 75 ? ' warning' : '';
      return '<div class="stat-card' + (isUnlimited ? ' unlimited' : '') + '">'
        + '<div class="stat-card-header">'
        + '<div class="stat-card-icon ' + _e(m.cls || '') + '"><i class="' + _e(m.icon) + '" aria-hidden="true"></i></div>'
        + '<div class="stat-card-title">' + _e(t(m.label)) + '</div>'
        + '</div>'
        + '<div class="stat-card-value">' + _e(fmtUsage) + '</div>'
        + '<div class="stat-card-limit">' + (isUnlimited ? '<i class="ri-infinity-line" aria-hidden="true"></i> ' + _e(t('Unlimited')) : _e(t('of {0}', fmtMax))) + '</div>'
        + '<div class="stat-card-bar"><div class="stat-card-bar-fill' + barCls + '" style="width:' + Math.min(pct, 100) + '%"></div></div>'
        + '</div>';
    }).join('');
  }
};

// Expose globally
window.CpanelAPI = CpanelAPI;
