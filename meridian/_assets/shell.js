/* ═══════════════════════════════════════════════════════════════
   MERIDIAN SHELL — Shared Layout Web Components (Light DOM)
   Theme version: uses subdirectory-based navigation and reads
   session data from window.CPANEL (injected by master.html.tt).
   ═══════════════════════════════════════════════════════════════ */

/* ── Theme persistence (runs immediately to avoid FOUC) ── */
(function() {
  const saved = localStorage.getItem('meridian-theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  }
})();


/* ── i18n guard (shell.js may load before i18n.js) ── */
var _t = typeof t === 'function' ? t : function(s) { return s; };

/* ── HTML Escape Utility ── */

function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
window.esc = esc;
window.escapeHtml = esc; // alias used by domains, email, security pages


/* ── Navigation URL Helper ── */

/**
 * Build a URL to a Meridian page using relative paths.
 * From any page at /meridian/PAGE/index.html.tt, "../other/" resolves
 * to the sibling page directory.
 */
function meridianHref(pageDir) {
  const token = window.CPANEL?.token;
  if (token) {
    return `/${token}/frontend/meridian/${pageDir}/`;
  }
  return `../${pageDir}/`;
}


/* ── Header ── */

class MeridianHeader extends HTMLElement {
  connectedCallback() {
    const cpUser = window.CPANEL?.user;
    const defaultInitials = cpUser ? cpUser.substring(0, 2).toUpperCase() : '';
    const defaultName = cpUser || '';

    const initials = esc(this.getAttribute('initials') || defaultInitials);
    const userName = esc(this.getAttribute('user-name') || defaultName);
    const showBadge = this.hasAttribute('notification-badge');

    this.innerHTML = `
      <header class="layout-header">
        <div class="header-left">
          <button type="button" class="header-hamburger" id="headerHamburger" aria-label="${_t('Open navigation menu')}">
            <i class="ri-menu-line" aria-hidden="true"></i>
          </button>
          <div class="header-brand">
            <i class="ri-server-line" aria-hidden="true"></i>
            cPanel
          </div>
        </div>
        <div class="header-search">
          <i class="ri-search-line" aria-hidden="true"></i>
          <input type="search" placeholder="${_t('What do you want to do?')}" aria-label="${_t('Search actions and features')}">
        </div>
        <div class="header-right">
          <button type="button" class="header-search-btn" id="headerSearchBtn" aria-label="${_t('Search')}">
            <i class="ri-search-line" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="${_t('Notifications')}" style="position: relative;">
            <i class="ri-notification-3-line" aria-hidden="true"></i>
            ${showBadge ? `<span class="header-notification-dot" aria-label="${_t('Unread notifications')}"></span>` : ''}
          </button>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="${_t('Help')}">
            <i class="ri-question-line" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-ghost btn-icon" id="headerThemeToggle" aria-label="${_t('Toggle dark mode')}">
            <i class="${document.documentElement.dataset.theme === 'light' ? 'ri-moon-line' : 'ri-sun-line'}" aria-hidden="true"></i>
          </button>
          <div class="header-avatar-wrap">
            <button type="button" class="header-avatar" id="avatarMenuBtn" aria-label="${_t('Account menu for {0}', userName)}" aria-haspopup="true" aria-expanded="false">${initials}</button>
            <div class="avatar-dropdown" id="avatarDropdown">
              <a href="${meridianHref('profile')}" class="avatar-dropdown-item">
                <i class="ri-user-settings-line" aria-hidden="true"></i> ${_t('Profile')}
              </a>
              <div class="avatar-dropdown-divider"></div>
              <button type="button" class="avatar-dropdown-item avatar-dropdown-logout" id="avatarLogoutBtn">
                <i class="ri-logout-box-r-line" aria-hidden="true"></i> ${_t('Log Out')}
              </button>
            </div>
          </div>
        </div>
      </header>
    `;

    // Theme toggle handler
    const themeBtn = this.querySelector('#headerThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem('meridian-theme', next);
        // Persist to server so it applies across devices
        if (typeof CpanelAPI !== 'undefined' && CpanelAPI.isInsideCpanel()) {
          CpanelAPI.setPersonalization({ meridian_theme: next }).catch(function() {});
        }
        themeBtn.querySelector('i').className = next === 'light' ? 'ri-moon-line' : 'ri-sun-line';
        themeBtn.setAttribute('aria-label', next === 'dark' ? _t('Switch to light mode') : _t('Switch to dark mode'));
      });
    }

    // Avatar dropdown menu
    const avatarBtn = this.querySelector('#avatarMenuBtn');
    const avatarDropdown = this.querySelector('#avatarDropdown');
    if (avatarBtn && avatarDropdown) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = avatarDropdown.classList.toggle('is-open');
        avatarBtn.setAttribute('aria-expanded', isOpen);
      });
      document.addEventListener('click', (e) => {
        if (!avatarDropdown.contains(e.target) && e.target !== avatarBtn) {
          avatarDropdown.classList.remove('is-open');
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Logout handler
    const logoutBtn = this.querySelector('#avatarLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/logout/?locale=' + (document.documentElement.lang || 'en');
      });
    }

    // Mobile hamburger → opens mobile nav drawer
    const hamburger = this.querySelector('#headerHamburger');
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        const drawer = document.querySelector('.mobile-nav-backdrop');
        if (drawer) {
          drawer.classList.add('is-open');
          const firstLink = drawer.querySelector('.nav-item');
          if (firstLink) firstLink.focus();
        }
      });
    }

    // Mobile search button → opens command palette
    const searchBtn = this.querySelector('#headerSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const palette = document.querySelector('meridian-search');
        if (palette && palette.openPalette) palette.openPalette();
      });
    }
  }
}

customElements.define('meridian-header', MeridianHeader);


/* ── Sidebar ── */

class MeridianSidebar extends HTMLElement {
  connectedCallback() {
    const activePage = this.getAttribute('active') || this._detectActivePage();

    const navItems = [
      { id: 'dashboard',   href: meridianHref('index'),           icon: 'ri-dashboard-line',   label: 'Dashboard' },
      { id: 'websites',    href: meridianHref('websites'),        icon: 'ri-global-line',      label: 'Websites',    features: ['addondomains', 'subdomains', 'parkeddomains'] },
      { id: 'email',       href: meridianHref('email'),           icon: 'ri-mail-line',        label: 'Email',       features: ['popaccts'] },
      { id: 'databases',  href: meridianHref('databases'),   icon: 'ri-database-2-line', label: 'Databases',  features: ['mysql', 'postgres'] },
      { id: 'files',       href: meridianHref('files'),           icon: 'ri-folder-line',      label: 'Files' },
      { id: 'security',    href: meridianHref('security'),        icon: 'ri-shield-line',      label: 'Security' },
      { id: 'performance', href: meridianHref('performance'),     icon: 'ri-speed-line',       label: 'Performance' },
    ];

    const navHTML = navItems.map(item => {
      const isActive = item.id === activePage;
      const featAttr = item.features ? ` data-features="${item.features.join(',')}"` : '';
      return `
        <a class="nav-item${isActive ? ' nav-item-active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}${featAttr} title="${_t(item.label)}">
          <i class="${item.icon}" aria-hidden="true"></i>
          <span class="nav-item-label" data-t-key="${item.label}">${_t(item.label)}</span>
        </a>`;
    }).join('');

    this.innerHTML = `
      <nav class="layout-sidebar" aria-label="${_t('Main navigation')}">
        <div class="sidebar-inner">
          <div class="stack stack-xs">
            ${navHTML}
          </div>
          <button class="sidebar-collapse-btn" type="button" id="collapseBtn" aria-label="${_t('Collapse sidebar')}">
            <i class="ri-menu-fold-line" aria-hidden="true"></i>
            <span>${_t('Collapse')}</span>
          </button>
        </div>
      </nav>
    `;

    // Mobile nav drawer (rendered once, used on mobile only via CSS)
    if (!document.querySelector('.mobile-nav-backdrop')) {
      const mobileNavHTML = navItems.map(item => {
        const isActive = item.id === activePage;
        return `
          <a class="nav-item${isActive ? ' nav-item-active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}>
            <i class="${item.icon}" aria-hidden="true"></i>
            <span class="nav-item-label">${_t(item.label)}</span>
          </a>`;
      }).join('');

      const backdrop = document.createElement('div');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-label', _t('Navigation menu'));
      backdrop.innerHTML = `
        <nav class="mobile-nav-drawer" aria-label="${_t('Main navigation')}">
          <div class="mobile-nav-header">
            <div class="mobile-nav-brand">
              <i class="ri-server-line" aria-hidden="true"></i> cPanel
            </div>
            <button type="button" class="mobile-nav-close" aria-label="${_t('Close navigation')}">
              <i class="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
          ${mobileNavHTML}
        </nav>
      `;
      document.body.appendChild(backdrop);

      const closeDrawer = () => { backdrop.classList.remove('is-open'); };
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeDrawer(); });
      backdrop.querySelector('.mobile-nav-close').addEventListener('click', closeDrawer);

      backdrop.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
        if (e.key === 'Tab') {
          const focusable = backdrop.querySelectorAll('a[href], button');
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }

    this._initCollapse();

    // Re-translate nav labels once locale is fully loaded
    document.addEventListener('meridian-locale-ready', function() {
      document.querySelectorAll('.nav-item-label[data-t-key]').forEach(function(el) {
        el.textContent = t(el.getAttribute('data-t-key'));
      });
    });

    // Apply feature gating to nav items once features are loaded.
    // loadFeatures() was kicked off in <head> — may or may not be done yet.
    if (window.CpanelAPI && window.CpanelAPI._featuresLoaded && typeof window.applyFeatureGating === 'function') {
      window.applyFeatureGating();
    } else {
      window.addEventListener('meridian-features-loaded', function() {
        if (typeof window.applyFeatureGating === 'function') window.applyFeatureGating();
      }, { once: true });
    }
  }

  _detectActivePage() {
    // Check window.CPANEL.pageId first (set by master.html.tt)
    if (window.CPANEL?.pageId) return window.CPANEL.pageId;

    // Fall back to URL path detection
    const path = window.location.pathname;

    // Theme mode: /cpsessXXX/frontend/meridian/PAGE_DIR/index.html.tt
    // Match the directory name before the last segment
    const segments = path.replace(/\/+$/, '').split('/');
    const dirName = segments[segments.length - 1] || segments[segments.length - 2];

    const map = {
      'index':      'dashboard',
      'websites':   'websites',
      'email':      'email',
      'files':      'files',
      'security':   'security',
      'performance': 'performance',
      'profile':    'profile',
      // Prototype compat (flat file names)
      'index.html':      'dashboard',
      'domains.html':    'websites',
      'email.html':      'email',
      'security.html':   'security',
      'performance.html': 'performance',
    };
    return map[dirName] || 'dashboard';
  }

  _initCollapse() {
    const btn = this.querySelector('#collapseBtn');
    const shell = document.getElementById('layoutShell');
    if (!btn || !shell) return;

    btn.addEventListener('click', () => {
      const isCollapsed = shell.classList.toggle('sidebar-collapsed');
      const icon = btn.querySelector('i');
      icon.className = isCollapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line';
      btn.setAttribute('aria-label', isCollapsed ? _t('Expand sidebar') : _t('Collapse sidebar'));
    });
  }
}

customElements.define('meridian-sidebar', MeridianSidebar);


/* ── Feature Gating ── */

/**
 * Hide sidebar nav items and search results whose features are all disabled.
 * Call after CpanelAPI.loadFeatures() resolves.
 */
window.applyFeatureGating = function applyFeatureGating() {
  var api = window.CpanelAPI;
  if (!api || !api._featuresLoaded) return;

  // Gate sidebar nav items
  document.querySelectorAll('.nav-item[data-features]').forEach(function(el) {
    var features = el.getAttribute('data-features').split(',');
    // Show if ANY feature is enabled; hide only if ALL are disabled
    var show = features.some(function(f) { return api.hasFeature(f.trim()); });
    el.style.display = show ? '' : 'none';
  });
};



/* ── Command Palette Search ── */

const SEARCH_INDEX = [
  // ── Pages (Navigation) ──
  { name: 'Dashboard',          desc: 'Overview, usage stats, and server health',           icon: 'ri-dashboard-line',       href: meridianHref('index'),      category: 'Pages',     keywords: 'home overview main stats' },
  { name: 'Websites',           desc: 'Manage domains, subdomains, DNS, and redirects',     icon: 'ri-global-line',          href: meridianHref('websites'),   category: 'Pages',     keywords: 'domains sites dns' },
  { name: 'Email',              desc: 'Email accounts, forwarders, and autoresponders',      icon: 'ri-mail-line',            href: meridianHref('email'),      category: 'Pages',     keywords: 'mail inbox accounts', features: ['popaccts'] },
  { name: 'Files',              desc: 'Find in Dashboard classic view',                      icon: 'ri-folder-3-line',        href: meridianHref('index'),      category: 'Pages',     keywords: 'file manager ftp documents upload' },
  { name: 'Databases',          desc: 'Find in Dashboard classic view',                      icon: 'ri-database-2-line',      href: meridianHref('index'),      category: 'Pages',     keywords: 'mysql postgresql phpmyadmin db sql', features: ['mysql', 'postgres'] },
  { name: 'Security',           desc: 'SSL/TLS, firewall, access control, and API tokens',  icon: 'ri-shield-line',          href: meridianHref('security'),   category: 'Pages',     keywords: 'ssl tls certificates firewall protection' },
  { name: 'Performance',        desc: 'Resource usage, visitors, and error logs',            icon: 'ri-speed-line',           href: meridianHref('performance'), category: 'Pages',    keywords: 'performance speed resource usage visitors stats' },
  { name: 'Profile',            desc: 'Account settings, notifications, language, password', icon: 'ri-user-settings-line',   href: meridianHref('profile'),    category: 'Pages',     keywords: 'profile account settings preferences contact password language locale notifications' },

  // ── Quick Actions ──
  { name: 'Create Email Account',  desc: 'Set up a new email address on any domain',        icon: 'ri-mail-add-line',        href: meridianHref('email'),      category: 'Actions',   keywords: 'add new email address mailbox', features: ['popaccts'] },
  { name: 'Create Database',       desc: 'Create a new MySQL or PostgreSQL database',        icon: 'ri-database-2-line',      href: meridianHref('index'),      category: 'Actions',   keywords: 'add new database mysql postgresql', features: ['mysql', 'postgres'] },
  { name: 'Add Website',           desc: 'Add a domain and set up a website',                 icon: 'ri-global-line',          href: meridianHref('websites'),   category: 'Actions',   keywords: 'new website domain addon subdomain' },
  { name: 'Upload Files',          desc: 'Upload files via File Manager',                    icon: 'ri-upload-cloud-2-line',  href: meridianHref('index'),      category: 'Actions',   keywords: 'upload file manager transfer' },
  { name: 'Create Backup',         desc: 'Generate a full account backup',                   icon: 'ri-archive-line',         href: meridianHref('index'),      category: 'Actions',   keywords: 'backup full archive download restore' },
  { name: 'Deploy from Git',       desc: 'Pull and deploy your site from a Git repository',  icon: 'ri-git-branch-line',      href: '#',                        category: 'Actions',   keywords: 'git deploy repository version control pull clone' },
  { name: 'Create FTP Account',    desc: 'Set up an FTP account for file transfers',         icon: 'ri-upload-2-line',        href: meridianHref('index'),      category: 'Actions',   keywords: 'ftp new account transfer sftp', features: ['ftpaccts'] },
  { name: 'Block IP Address',      desc: 'Block an IP from accessing your server',           icon: 'ri-forbid-line',          href: meridianHref('security'),   category: 'Actions',   keywords: 'block ip deny ban firewall blacklist' },
  { name: 'Create API Token',      desc: 'Generate an API token for external access',        icon: 'ri-key-line',             href: meridianHref('security'),   category: 'Actions',   keywords: 'api token key generate authentication' },
  { name: 'Switch to Classic View', desc: 'Switch dashboard to classic icon grid layout',     icon: 'ri-grid-fill',            href: meridianHref('index'),      category: 'Actions',   keywords: 'classic view grid icons traditional layout' },
  { name: 'Switch to Modern View',  desc: 'Switch dashboard to modern card layout',           icon: 'ri-layout-grid-line',     href: meridianHref('index'),      category: 'Actions',   keywords: 'modern view cards layout dashboard' },

  // ── Email Tools ──
  { name: 'Check Webmail',         desc: 'Open webmail to read and send email',              icon: 'ri-mail-open-line',       href: meridianHref('email'),      category: 'Email',     keywords: 'webmail read inbox roundcube horde', features: ['popaccts'] },
  { name: 'Email Forwarders',      desc: 'Forward email to another address',                 icon: 'ri-share-forward-line',   href: meridianHref('email'),      category: 'Email',     keywords: 'forwarder forward redirect', features: ['popaccts'] },
  { name: 'Autoresponders',        desc: 'Set up automatic email replies',                   icon: 'ri-reply-all-line',       href: meridianHref('email'),      category: 'Email',     keywords: 'autoresponder auto reply vacation out of office', features: ['popaccts'] },
  { name: 'Email Filters',         desc: 'Create rules to filter incoming messages',         icon: 'ri-filter-3-line',        href: meridianHref('email'),      category: 'Email',     keywords: 'filter rules sort spam', features: ['popaccts'] },
  { name: 'Connect Email to Device', desc: 'Set up email on your phone or desktop client',   icon: 'ri-smartphone-line',      href: meridianHref('email'),      category: 'Email',     keywords: 'connect device phone mobile outlook thunderbird imap pop3 smtp', features: ['popaccts'] },

  // ── Files & Backup Tools ──
  { name: 'File Manager',          desc: 'Browse, edit, and manage your website files',      icon: 'ri-folder-open-line',     href: meridianHref('index'),      category: 'Files',     keywords: 'file manager browse edit documents code' },
  { name: 'Disk Usage',            desc: 'View disk space usage by directory',               icon: 'ri-pie-chart-2-line',     href: meridianHref('index'),      category: 'Files',     keywords: 'disk usage space storage breakdown' },
  { name: 'FTP Accounts',          desc: 'Manage FTP accounts for file transfers',           icon: 'ri-upload-cloud-2-line',  href: meridianHref('index'),      category: 'Files',     keywords: 'ftp accounts sftp transfer', features: ['ftpaccts'] },
  { name: 'Backups',               desc: 'Create, download, and restore backups',            icon: 'ri-shield-check-line',    href: meridianHref('index'),      category: 'Files',     keywords: 'backup restore download home directory' },

  // ── Database Tools ──
  { name: 'phpMyAdmin',            desc: 'Open phpMyAdmin to manage MySQL databases',        icon: 'ri-external-link-line',   href: meridianHref('index'),      category: 'Databases', keywords: 'phpmyadmin mysql browse query sql tables', features: ['mysql'] },
  { name: 'MySQL Databases',       desc: 'Create and manage MySQL databases',                icon: 'ri-database-2-line',      href: meridianHref('index'),      category: 'Databases', keywords: 'mysql database create mariadb', features: ['mysql'] },
  { name: 'MySQL Users',           desc: 'Manage database users and privileges',             icon: 'ri-user-line',            href: meridianHref('index'),      category: 'Databases', keywords: 'mysql users privileges permissions grants', features: ['mysql'] },
  { name: 'Remote MySQL',          desc: 'Allow external hosts to connect to your databases', icon: 'ri-link-line',           href: meridianHref('index'),      category: 'Databases', keywords: 'remote mysql access host external ip', features: ['mysql'] },
  { name: 'PostgreSQL',            desc: 'Create and manage PostgreSQL databases',           icon: 'ri-database-line',        href: meridianHref('index'),      category: 'Databases', keywords: 'postgresql postgres database', features: ['postgres'] },

  // ── Security Tools ──
  { name: 'SSL/TLS Certificates',  desc: 'View and manage SSL certificates for your domains', icon: 'ri-lock-line',           href: meridianHref('security'),   category: 'Security',  keywords: 'ssl tls certificate https autossl lets encrypt renew' },
  { name: 'Run AutoSSL',           desc: 'Request free SSL certificates for all domains',    icon: 'ri-refresh-line',         href: meridianHref('security'),   category: 'Security',  keywords: 'autossl renew ssl certificate free lets encrypt' },
  { name: 'ModSecurity (WAF)',     desc: 'Web Application Firewall rules and settings',      icon: 'ri-shield-flash-line',    href: meridianHref('security'),   category: 'Security',  keywords: 'modsecurity waf firewall web application rules' },
  { name: 'IP Blocker',            desc: 'Block IP addresses from accessing your site',      icon: 'ri-forbid-line',          href: meridianHref('security'),   category: 'Security',  keywords: 'ip blocker block deny blacklist ban' },
  { name: 'SSH Access',            desc: 'Manage SSH keys for secure remote access',         icon: 'ri-terminal-box-line',    href: meridianHref('security'),   category: 'Security',  keywords: 'ssh keys terminal remote access shell' },
  { name: 'Two-Factor Auth (2FA)', desc: 'Enable two-factor authentication for your account', icon: 'ri-smartphone-line',     href: meridianHref('security'),   category: 'Security',  keywords: '2fa two factor authentication mfa security totp' },
  { name: 'Change Password',       desc: 'Update your cPanel account password',              icon: 'ri-lock-password-line',   href: meridianHref('profile'),    category: 'Security',  keywords: 'change password update reset' },
  { name: 'API Tokens',            desc: 'Create and manage API authentication tokens',      icon: 'ri-key-line',             href: meridianHref('security'),   category: 'Security',  keywords: 'api tokens keys authentication access' },

  // ── Domain Management ──
  { name: 'DNS Zone Editor',       desc: 'Add and manage DNS records for your domains',      icon: 'ri-dns-line',             href: meridianHref('websites'),   category: 'Domains',   keywords: 'dns zone editor records a cname mx txt ns aaaa' },
  { name: 'Redirects',             desc: 'Set up URL redirects for your domains',            icon: 'ri-links-line',           href: meridianHref('websites'),   category: 'Domains',   keywords: 'redirect url forward 301 302 permanent temporary' },
  { name: 'Install WordPress',     desc: 'One-click install WordPress on any domain',        icon: 'ri-wordpress-line',       href: meridianHref('websites'),   category: 'Domains',   keywords: 'wordpress install wp cms blog site' },

  // ── Monitoring ──
  { name: 'Resource Usage',        desc: 'View disk, bandwidth, and account resource limits', icon: 'ri-bar-chart-line',      href: meridianHref('index'),      category: 'Monitor',   keywords: 'resource usage disk bandwidth limits quota stats' },
  { name: 'Visitors / AWStats',    desc: 'View website visitor statistics and analytics',    icon: 'ri-line-chart-line',      href: '#',                        category: 'Monitor',   keywords: 'visitors awstats analytics traffic logs statistics' },
  { name: 'Error Logs',            desc: 'View Apache and PHP error logs',                   icon: 'ri-bug-line',             href: '#',                        category: 'Monitor',   keywords: 'error logs apache php debug 500 404' },
];

// Category color map
const CMD_CATEGORY_COLORS = {
  Pages:     { bg: 'var(--accent-subtle)',      color: 'var(--text-brand)',      icon: 'ri-dashboard-line' },
  Actions:   { bg: 'var(--status-success-bg)',  color: 'var(--status-success)',  icon: 'ri-flashlight-line' },
  Email:     { bg: 'var(--status-info-bg)',     color: 'var(--status-info)',     icon: 'ri-mail-line' },
  Files:     { bg: 'var(--feature-bg)',         color: 'var(--feature-color)',   icon: 'ri-folder-3-line' },
  Databases: { bg: 'var(--status-warning-bg)',  color: 'var(--status-warning)', icon: 'ri-database-2-line' },
  Security:  { bg: 'var(--status-success-bg)',  color: 'var(--status-success)', icon: 'ri-shield-line' },
  Domains:   { bg: 'var(--accent-muted)',       color: 'var(--text-brand)',     icon: 'ri-global-line' },
  Monitor:   { bg: 'var(--feature-bg)',         color: 'var(--feature-color)',  icon: 'ri-bar-chart-line' },
};

// Simple fuzzy match — returns score (0 = no match, higher = better)
function fuzzyMatch(query, text) {
  query = query.toLowerCase();
  text = text.toLowerCase();
  if (text.includes(query)) return 100 + (query.length / text.length * 50); // substring boost
  let qi = 0, score = 0, lastIdx = -1;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      score += (ti === lastIdx + 1) ? 15 : 5; // consecutive chars score higher
      if (ti === 0 || text[ti - 1] === ' ') score += 10; // word boundary bonus
      lastIdx = ti;
      qi++;
    }
  }
  return qi === query.length ? score : 0;
}

function _isSearchItemEnabled(item) {
  // If no features defined, always show. If features defined, show if ANY is enabled.
  if (!item.features || !item.features.length) return true;
  var api = window.CpanelAPI;
  if (!api || !api._featuresLoaded) return true; // fail-open
  return api.hasAnyFeature(item.features);
}

function searchItems(query) {
  if (!query.trim()) return [];
  const q = query.trim();
  const scored = SEARCH_INDEX.filter(_isSearchItemEnabled).map(item => {
    const nameScore = fuzzyMatch(q, item.name) * 3;
    const keywordScore = fuzzyMatch(q, item.keywords) * 2;
    const descScore = fuzzyMatch(q, item.desc);
    const catScore = fuzzyMatch(q, item.category);
    const total = nameScore + keywordScore + descScore + catScore;
    return { item, score: total };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 12).map(r => r.item);
}

class MeridianSearch extends HTMLElement {
  connectedCallback() {
    this._paletteOpen = false;
    this._dropdownOpen = false;
    this._activeIdx = -1;
    this._results = [];
    this._mode = null; // 'palette' or 'dropdown'

    // ── Command Palette (Cmd+K) ──
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'cmd-backdrop';
    this._backdrop.addEventListener('click', () => this.closePalette());

    this._palette = document.createElement('div');
    this._palette.className = 'cmd-palette';
    this._palette.setAttribute('role', 'dialog');
    this._palette.setAttribute('aria-label', _t('Search commands and features'));
    this._palette.innerHTML = `
      <div class="cmd-input-wrap">
        <i class="ri-search-line" aria-hidden="true"></i>
        <input class="cmd-input" type="text" placeholder="${_t('Search features, tools, and actions...')}" aria-label="${_t('Search')}" autocomplete="off" spellcheck="false">
        <span class="cmd-kbd">esc</span>
      </div>
      <div class="cmd-results" role="listbox" aria-label="${_t('Search results')}"></div>
      <div class="cmd-footer">
        <span class="cmd-footer-hint"><kbd>&uarr;</kbd><kbd>&darr;</kbd> ${_t('navigate')}</span>
        <span class="cmd-footer-hint"><kbd>&crarr;</kbd> ${_t('open')}</span>
        <span class="cmd-footer-hint"><kbd>esc</kbd> ${_t('close')}</span>
      </div>
    `;
    document.body.appendChild(this._backdrop);
    document.body.appendChild(this._palette);

    this._paletteInput = this._palette.querySelector('.cmd-input');
    this._paletteResults = this._palette.querySelector('.cmd-results');

    this._debounceTimer = null;
    this._paletteInput.addEventListener('input', () => {
      this._mode = 'palette';
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._onInput(this._paletteInput.value, this._paletteResults);
      }, 50);
    });
    this._palette.addEventListener('keydown', (e) => this._onKeydown(e, 'palette'));

    // ── Inline Dropdown (header search bar) ──
    this._dropdown = document.createElement('div');
    this._dropdown.className = 'search-dropdown';
    this._dropdown.setAttribute('role', 'listbox');
    this._dropdown.setAttribute('aria-label', _t('Search results'));

    this._initHeaderSearch();

    // ── Global shortcuts ──
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.closeDropdown();
        this.togglePalette();
      }
      // / → focus header search (not palette)
      if (e.key === '/' && !this._paletteOpen && !this._dropdownOpen) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        if (this._headerInput) this._headerInput.focus();
      }
    });
  }

  // ── Wire up header search bar (waits for header to render) ──
  _initHeaderSearch() {
    const tryBind = () => {
      const searchWrap = document.querySelector('.header-search');
      const input = searchWrap?.querySelector('input');
      if (!searchWrap || !input) {
        setTimeout(tryBind, 50);
        return;
      }

      this._headerInput = input;
      searchWrap.style.position = 'relative';
      searchWrap.appendChild(this._dropdown);

      input.addEventListener('input', () => {
        this._mode = 'dropdown';
        const q = input.value;
        if (!q.trim()) {
          this.closeDropdown();
          return;
        }
        this._onInput(q, this._dropdown);
        this.openDropdown();
      });

      input.addEventListener('focus', () => {
        if (input.value.trim()) {
          this._mode = 'dropdown';
          this._onInput(input.value, this._dropdown);
          this.openDropdown();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (this._dropdownOpen) {
          this._onKeydown(e, 'dropdown');
        }
      });

      document.addEventListener('click', (e) => {
        if (this._dropdownOpen && !searchWrap.contains(e.target)) {
          this.closeDropdown();
        }
      });

      const isMac = navigator.platform.includes('Mac');
      input.placeholder = _t('What do you want to do?') + `  ${isMac ? '⌘K' : 'Ctrl+K'}`;
    };
    tryBind();
  }

  // ── Palette controls ──
  openPalette() {
    if (this._paletteOpen) return;
    this._previousFocus = document.activeElement;
    this._paletteOpen = true;
    this._mode = 'palette';
    this._backdrop.classList.add('is-open');
    this._palette.classList.add('is-open');
    this._paletteInput.value = '';
    this._activeIdx = -1;
    this._showDefault(this._paletteResults);
    requestAnimationFrame(() => this._paletteInput.focus());
    document.body.style.overflow = 'hidden';
  }

  closePalette() {
    if (!this._paletteOpen) return;
    this._paletteOpen = false;
    this._backdrop.classList.remove('is-open');
    this._palette.classList.remove('is-open');
    document.body.style.overflow = '';
    if (this._previousFocus && this._previousFocus.focus) {
      this._previousFocus.focus();
      this._previousFocus = null;
    }
  }

  togglePalette() {
    this._paletteOpen ? this.closePalette() : this.openPalette();
  }

  // ── Dropdown controls ──
  openDropdown() {
    if (this._dropdownOpen) return;
    this._dropdownOpen = true;
    this._dropdown.classList.add('is-open');
  }

  closeDropdown() {
    if (!this._dropdownOpen) return;
    this._dropdownOpen = false;
    this._activeIdx = -1;
    this._dropdown.classList.remove('is-open');
  }

  // ── Shared rendering ──
  _showDefault(container) {
    const popular = SEARCH_INDEX.filter(i => (i.category === 'Pages' || i.category === 'Actions') && _isSearchItemEnabled(i));
    this._results = popular;
    this._renderResults(popular, container, true);
  }

  _onInput(query, container) {
    if (!query.trim()) {
      this._activeIdx = -1;
      if (this._mode === 'palette') {
        this._showDefault(container);
      }
      return;
    }
    const results = searchItems(query);
    this._results = results;
    this._activeIdx = results.length > 0 ? 0 : -1;
    this._renderResults(results, container, false);
  }

  _renderResults(items, container, isDefault) {
    if (items.length === 0) {
      container.innerHTML = `
        <div class="cmd-empty">
          <i class="ri-search-line"></i>
          ${_t('No results found')}
        </div>`;
      return;
    }

    // Group by category
    const groups = {};
    items.forEach(item => {
      const cat = isDefault && item.category === 'Pages' ? 'Pages' :
                  isDefault && item.category === 'Actions' ? 'Quick Actions' :
                  item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    let idx = 0;
    let html = '';
    for (const [group, groupItems] of Object.entries(groups)) {
      html += `<div class="cmd-group-label">${esc(_t(group))}</div>`;
      for (const item of groupItems) {
        const colors = CMD_CATEGORY_COLORS[item.category] || CMD_CATEGORY_COLORS.Pages;
        const active = idx === this._activeIdx ? ' is-active' : '';
        html += `
          <a class="cmd-item${active}" href="${item.href}" data-idx="${idx}" role="option">
            <div class="cmd-item-icon" style="background: ${colors.bg}; color: ${colors.color};">
              <i class="${item.icon}" aria-hidden="true"></i>
            </div>
            <div class="cmd-item-text">
              <div class="cmd-item-name">${esc(_t(item.name))}</div>
              <div class="cmd-item-desc">${esc(_t(item.desc))}</div>
            </div>
            <span class="cmd-item-badge">${esc(_t(item.category))}</span>
          </a>`;
        idx++;
      }
    }
    container.innerHTML = html;

    // Close on click
    container.querySelectorAll('.cmd-item').forEach(el => {
      el.addEventListener('click', () => {
        this.closePalette();
        this.closeDropdown();
      });
    });
  }

  _onKeydown(e, mode) {
    const total = this._results.length;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (mode === 'palette') this.closePalette();
      else {
        this.closeDropdown();
        this._headerInput?.blur();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._activeIdx = total > 0 ? (this._activeIdx + 1) % total : -1;
      this._updateActive(mode);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._activeIdx = total > 0 ? (this._activeIdx - 1 + total) % total : -1;
      this._updateActive(mode);
    } else if (e.key === 'Enter') {
      if (this._activeIdx >= 0 && this._activeIdx < total) {
        e.preventDefault();
        const item = this._results[this._activeIdx];
        if (item.href && item.href !== '#') {
          window.location.href = item.href;
        }
        this.closePalette();
        this.closeDropdown();
      }
    }
  }

  _updateActive(mode) {
    const container = mode === 'palette' ? this._paletteResults : this._dropdown;
    container.querySelectorAll('.cmd-item').forEach(el => {
      const idx = parseInt(el.dataset.idx);
      el.classList.toggle('is-active', idx === this._activeIdx);
      if (idx === this._activeIdx) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }
}

customElements.define('meridian-search', MeridianSearch);


/* ── Toast Notifications ── */

// Auto-inject toast element once
function _initToastEl() {
  if (document.getElementById('toast')) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.id = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = '<i aria-hidden="true"></i><span id="toastText"></span>';
  document.body.appendChild(toast);
}
// Defer until body exists (shell.js now loads in <head>)
if (document.body) _initToastEl();
else document.addEventListener('DOMContentLoaded', _initToastEl);

/**
 * Show a toast notification using the design system's .toast component.
 * @param {string} message - The message to display
 * @param {string} [type='success'] - One of 'success', 'error', 'info', 'warning'
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const iconMap = {
    success: 'ri-check-line',
    error:   'ri-error-warning-line',
    info:    'ri-information-line',
    warning: 'ri-alert-line'
  };
  clearTimeout(showToast._timer);
  clearTimeout(showToast._removeTimer);
  toast.querySelector('i').className = iconMap[type] || iconMap.success;
  document.getElementById('toastText').textContent = message;
  toast.className = 'toast';
  // Apply position preference
  var pos = localStorage.getItem(CpanelAPI.userKey('meridian-toast-position')) || 'bottomCenter';
  if (pos !== 'bottomCenter') toast.classList.add('toast-pos-' + pos);
  toast.offsetHeight; // force reflow so animation restarts
  toast.classList.add('show', `toast-${type}`);
  showToast._timer = setTimeout(() => {
    toast.classList.add('toast-hiding');
    showToast._removeTimer = setTimeout(() => {
      toast.className = 'toast';
    }, 180);
  }, 3500);
}
window.showToast = showToast;


/* ── Focus Trap Utility ── */

function trapFocus(container) {
  function handler(e) {
    if (e.key !== 'Tab') return;
    var focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener('keydown', handler);
  return function() { container.removeEventListener('keydown', handler); };
}
window.trapFocus = trapFocus;

function openModalWithTrap(overlay, onClose) {
  var previousFocus = document.activeElement;
  overlay.classList.add('show');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  var removeTrap = trapFocus(overlay);

  var firstFocusable = overlay.querySelector('input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) requestAnimationFrame(function() { firstFocusable.focus(); });

  function close() {
    overlay.classList.remove('show');
    overlay.style.display = '';
    document.body.style.overflow = '';
    removeTrap();
    overlay.removeEventListener('keydown', escHandler);
    overlay.removeEventListener('click', backdropClick);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
    if (typeof onClose === 'function') onClose();
  }

  function escHandler(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function backdropClick(e) {
    if (e.target === overlay) close();
  }

  overlay.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', backdropClick);

  return close;
}
window.openModalWithTrap = openModalWithTrap;


/* ── Shared Utilities ── */

// Scroll-triggered entrance animations
function initAnimations() {
  const els = document.querySelectorAll('.animate-in');
  if (!els.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => observer.observe(el));
  } else {
    els.forEach(el => el.classList.add('is-visible'));
  }
}

window.initAnimations = initAnimations;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  requestAnimationFrame(initAnimations);
}

// Auto-inject <meridian-search> once (deferred until body exists)
function _initSearch() {
  if (!document.querySelector('meridian-search')) {
    document.body.appendChild(document.createElement('meridian-search'));
  }
}
if (document.body) _initSearch();
else document.addEventListener('DOMContentLoaded', _initSearch);

window.renderDomainEmail = function(domain, accounts, container) {
  var _e = typeof window.esc === 'function' ? window.esc : function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var _t = typeof t === 'function' ? t : function(s) { return s; };
  var html = '<div class="detail-list">';
  for (var i = 0; i < accounts.length; i++) {
    var a = accounts[i];
    html += '<div class="detail-row">'
      + '<div class="detail-row-name">' + _e(a.address || a.email) + '</div>'
      + '<div class="detail-row-meta">' + _e(a.used || a.diskused || '') + '</div>'
      + '<div class="detail-row-status status-ok">' + _e(a.status || _t('Active')) + '</div>'
      + '<i class="ri-arrow-right-s-line module-chevron" aria-hidden="true"></i>'
      + '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
};

// Notification dot style (injected once)
const dotStyle = document.createElement('style');
dotStyle.textContent = `
  .header-notification-dot {
    position: absolute; top: 6px; inset-inline-end: 6px;
    width: 8px; height: 8px;
    background: var(--status-error);
    border-radius: var(--radius-full);
    border: 2px solid var(--bg-surface);
  }
`;
document.head.appendChild(dotStyle);


/* ── Confirm Dialog ── */
function confirmAction(opts) {
  return new Promise(function(resolve) {
    var previousFocus = document.activeElement;
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');
    var iconClass = opts.danger ? 'confirm-icon-danger' : 'confirm-icon-info';
    var iconName = opts.danger ? 'ri-error-warning-fill' : 'ri-information-line';
    overlay.innerHTML =
      '<div class="confirm-dialog">' +
        '<div class="' + iconClass + '"><i class="' + iconName + '" aria-hidden="true"></i></div>' +
        '<div class="confirm-title" id="confirm-dialog-title">' + (opts.title || _t('Confirm')) + '</div>' +
        '<div class="confirm-message">' + (opts.message || _t('Are you sure?')) + '</div>' +
        '<div class="confirm-actions">' +
          '<button class="btn btn-ghost btn-sm confirm-cancel">' + _t('Cancel') + '</button>' +
          '<button class="btn btn-sm ' + (opts.danger ? 'btn-danger' : 'btn-primary') + ' confirm-ok">' + (opts.confirmLabel || _t('Confirm')) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function() {
      overlay.classList.add('show');
      overlay.querySelector('.confirm-ok').focus();
    });
    function close(result) {
      overlay.classList.remove('show');
      setTimeout(function() { overlay.remove(); }, 200);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve(result);
    }
    overlay.querySelector('.confirm-cancel').onclick = function() { close(false); };
    overlay.querySelector('.confirm-ok').onclick = function() { close(true); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(false); });
    // Focus trap + Escape key
    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(false); return; }
      if (e.key === 'Tab') {
        var btns = overlay.querySelectorAll('button');
        var first = btns[0], last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  });
}
window.confirmAction = confirmAction;

/* ── Password Generator ── */
function generatePassword(length) {
  length = length || 16;
  var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  var limit = 256 - (256 % chars.length); // rejection sampling threshold
  var pw = '';
  while (pw.length < length) {
    var arr = new Uint8Array(length * 2); // over-allocate to reduce iterations
    crypto.getRandomValues(arr);
    for (var i = 0; i < arr.length && pw.length < length; i++) {
      if (arr[i] < limit) pw += chars[arr[i] % chars.length];
    }
  }
  return pw;
}
window.generatePassword = generatePassword;


/* ═══════════════════════════════════════════════════════════════
   MERIDIAN SELECT — Shared custom dropdown replacement for <select>
   Usage: MeridianSelect.enhance(selectElement)
   or:    MeridianSelect.enhance(selectElement, { size: 'sm' })
   ═══════════════════════════════════════════════════════════════ */
window.MeridianSelect = {
  /**
   * Replace a native <select> with a custom dropdown.
   * Preserves the original <select> as a hidden element for form submission.
   * Options:
   *   size: 'sm' | 'md' (default 'md')
   *   onChange: function(value, label) — called on selection
   */
  enhance: function(select, opts) {
    if (!select || select.dataset.meridianEnhanced) return;
    opts = opts || {};
    var size = opts.size || (select.classList.contains('form-select-sm') ? 'sm' : 'md');

    // Read options from <select>
    var options = [];
    for (var i = 0; i < select.options.length; i++) {
      var opt = select.options[i];
      options.push({
        value: opt.value,
        label: opt.textContent,
        selected: opt.selected,
        meta: opt.dataset.meta || ''
      });
    }
    var selectedOpt = options.find(function(o) { return o.selected; }) || options[0] || { value: '', label: '' };

    // Build custom dropdown HTML
    var wrap = document.createElement('div');
    wrap.className = 'custom-dropdown' + (size === 'sm' ? ' custom-dropdown--sm' : '');
    if (opts.minWidth) wrap.style.minWidth = opts.minWidth;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.title = selectedOpt.label;
    trigger.innerHTML = '<span class="dropdown-label">' + _escHtml(selectedOpt.label) + '</span>'
      + '<i class="ri-arrow-down-s-line dropdown-icon" aria-hidden="true"></i>';

    var menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';
    menu.setAttribute('role', 'listbox');

    var list = document.createElement('div');
    list.className = 'custom-dropdown-list';
    for (var j = 0; j < options.length; j++) {
      var o = options[j];
      var item = document.createElement('div');
      item.className = 'custom-dropdown-item' + (o.selected ? ' is-selected' : '');
      item.setAttribute('role', 'option');
      item.dataset.value = o.value;
      var check = '<span class="dropdown-item-check"><i class="ri-check-line" aria-hidden="true"></i></span>';
      var label = '<span class="dropdown-item-label">' + _escHtml(o.label) + '</span>';
      var meta = o.meta ? '<span class="dropdown-item-meta">' + _escHtml(o.meta) + '</span>' : '';
      item.innerHTML = check + label + meta;
      list.appendChild(item);
    }
    menu.appendChild(list);
    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    // Hide the original select but keep it in DOM for value access
    select.style.display = 'none';
    select.dataset.meridianEnhanced = '1';
    select.parentNode.insertBefore(wrap, select);

    // State
    var focusedIdx = -1;

    function getItems() {
      return list.querySelectorAll('.custom-dropdown-item');
    }

    function setFocus(idx) {
      var items = getItems();
      items.forEach(function(el) { el.classList.remove('is-focused'); });
      focusedIdx = idx;
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('is-focused');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }

    function open() {
      // Close any other open dropdowns
      document.querySelectorAll('.custom-dropdown.is-open').forEach(function(d) {
        d.classList.remove('is-open');
        var t = d.querySelector('.custom-dropdown-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      focusedIdx = -1;
      // Scroll selected into view
      var sel = list.querySelector('.is-selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function close() {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      focusedIdx = -1;
      getItems().forEach(function(el) { el.classList.remove('is-focused'); });
    }

    function selectItem(item) {
      var val = item.dataset.value;
      getItems().forEach(function(el) { el.classList.remove('is-selected'); });
      item.classList.add('is-selected');
      var txt = item.querySelector('.dropdown-item-label')?.textContent || item.textContent;
      trigger.querySelector('.dropdown-label').textContent = txt;
      trigger.title = txt;
      select.value = val;
      // Fire change event on the original select
      select.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      trigger.focus();
      if (opts.onChange) opts.onChange(val, txt);
    }

    // Events
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      wrap.classList.contains('is-open') ? close() : open();
    });

    list.addEventListener('click', function(e) {
      var item = e.target.closest('.custom-dropdown-item');
      if (item) selectItem(item);
    });

    trigger.addEventListener('keydown', function(e) {
      var items = getItems();
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        wrap.classList.contains('is-open') ? close() : open();
      } else if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!wrap.classList.contains('is-open')) { open(); }
        else setFocus(Math.min(focusedIdx + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus(Math.max(focusedIdx - 1, 0));
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault();
        selectItem(items[focusedIdx]);
      }
    });

    // Close on outside click (single global listener)
    if (!window._meridianSelectOutsideListener) {
      window._meridianSelectOutsideListener = true;
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
          document.querySelectorAll('.custom-dropdown.is-open').forEach(function(d) {
            d.classList.remove('is-open');
            var t = d.querySelector('.custom-dropdown-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
          });
        }
      });
    }

    return wrap;
  },

  /**
   * Enhance all <select> elements matching a selector.
   */
  enhanceAll: function(selector, opts) {
    document.querySelectorAll(selector || 'select.form-select, select.form-select-sm').forEach(function(sel) {
      MeridianSelect.enhance(sel, opts);
    });
  }
};

function _escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
