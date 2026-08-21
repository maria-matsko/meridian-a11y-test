/* ═══════════════════════════════════════════════════════════════
   WIZARD STEP ENGINE — Shared steps, state, and journeys
   Used by both full-screen onboarding and modal wizard.
   ═══════════════════════════════════════════════════════════════ */

// ── HTML escape (needed when shell.js is not loaded, e.g. onboarding.html) ──
if (typeof window.esc !== 'function') {
  window.esc = function(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  };
}

// ── Shared State (reset per journey) ──
// Using `var` (not `const`) so variables are accessible across <script> tags.
var wizardState = {
  journey: null,        // 'onboarding' | 'add-website' | 'create-email'
  currentStepIdx: 0,
  domainType: null,     // 'primary' | 'existing' | 'subdomain'
  domain: '',
  emailChoice: null,    // 'yes' | 'no'
  emailSkipped: false,
  emailUser: '',
  emailPassword: '',
  builder: null,        // 'sitejet' | 'wordpress' | 'custom'
  dnsStatus: 'connected', // 'connected' | 'not-resolving' | 'wrong-ip'
  // Contextual data passed when opening a journey
  preFillDomain: null,  // If set, skip domain-type and use this domain
  availableDomains: ['example.com'], // Mock; populated from API in meridian theme
};

// Mock DNS data for prototype demo toggles
var MOCK_NAMESERVERS = ['ns1.webhost.com', 'ns2.webhost.com'];
var MOCK_WRONG_IP = '192.168.1.50';

var resetWizardState = function() {
  Object.assign(wizardState, {
    journey: null, currentStepIdx: 0, domainType: null, domain: '',
    emailChoice: null, emailSkipped: false, emailUser: '', emailPassword: '',
    builder: null, preFillDomain: null,
  });
};

// ── Temp domain detection ──
// Matches known cPanel temp/proxy domain suffixes (same pattern as meridian theme)
var TEMP_DOMAIN_PATTERN = /\.(cpanel\.site|cprapid\.com|wp2\.host|wpsquared\.site)$/i;

var isTempDomain = function(domain) {
  if (!domain) return true;
  return TEMP_DOMAIN_PATTERN.test(domain);
};

// ── Journey Definitions ──
// Note: email steps come AFTER builder — user picks their tool first, then optionally sets up email.
var JOURNEYS = {
  // Placeholder for onboarding — replaced by buildOnboardingJourney() at runtime
  onboarding:    ['welcome', 'builder', 'email-choice', 'email-form', 'review', 'success'],
  'add-website': ['domain-type', 'domain-config', 'builder', 'email-choice', 'email-form', 'review', 'success'],
  'create-email': ['email-form', 'success'],
};

// ── Email feature check ──
// In meridian theme, CpanelAPI.hasFeature('popaccts') gates this.
// In prototype, default to true. Set wizardState.emailFeatureEnabled = false to test.
var hasEmailFeature = function() {
  if (typeof CpanelAPI !== 'undefined' && typeof CpanelAPI.hasFeature === 'function') {
    return CpanelAPI.hasFeature('popaccts');
  }
  return wizardState.emailFeatureEnabled !== false;
};

// Build the onboarding journey based on account state
var buildOnboardingJourney = function() {
  var primaryDomain = wizardState.availableDomains[0] || '';
  var includeEmail = hasEmailFeature();

  if (isTempDomain(primaryDomain)) {
    // Temp domain: show domain selection
    var steps = ['welcome', 'domain-type', 'domain-config', 'builder'];
    if (includeEmail) steps.push('email-choice', 'email-form');
    steps.push('review', 'success');
    return steps;
  }
  // Real domain exists: skip domain steps, auto-use primary
  wizardState.domainType = 'primary';
  wizardState.domain = primaryDomain;
  if (!includeEmail) wizardState.emailSkipped = true;
  var steps = ['welcome', 'builder'];
  if (includeEmail) steps.push('email-choice', 'email-form');
  steps.push('review', 'success');
  return steps;
};

// ── Stepper Labels (shown in dot stepper) ──
// Order: Domain (if shown) → Builder → Email → Launch
var STEPPER_MAP = {
  'domain-type': 0, 'domain-config': 0,
  'builder': 1,
  'email-choice': 2, 'email-form': 2,
  'review': 3,
};
var STEPPER_LABELS = ['Domain', 'Builder', 'Email', 'Launch'];

// When domain steps are skipped, remap stepper indices
var STEPPER_MAP_NO_DOMAIN = {
  'builder': 0,
  'email-choice': 1, 'email-form': 1,
  'review': 2,
};
var STEPPER_LABELS_NO_DOMAIN = ['Builder', 'Email', 'Launch'];

// Helper: get the right stepper config for the current journey
var getStepperConfig = function(journey) {
  var steps = JOURNEYS[journey];
  if (!steps || steps.indexOf('domain-type') === -1) {
    return { map: STEPPER_MAP_NO_DOMAIN, labels: STEPPER_LABELS_NO_DOMAIN };
  }
  return { map: STEPPER_MAP, labels: STEPPER_LABELS };
};

// ── Step Registry ──
// Each step: { id, title, subtitle, render(state), onMount(container, callbacks) }
// callbacks: { advance(), back(), updateFooter(html) }

var WIZARD_STEPS = {};

// ── Step illustrations (inline SVG, themed via accent opacity) ──
var WIZARD_ILLUSTRATIONS = {
  globe: '<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="70" cy="70" r="50" stroke="var(--accent)" stroke-opacity="0.2" stroke-width="1.5" fill="var(--accent)" fill-opacity="0.03"/><circle cx="70" cy="70" r="30" stroke="var(--accent)" stroke-opacity="0.12" stroke-width="1"/><path d="M70 20V120" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="1"/><path d="M20 70H120" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="1"/><ellipse cx="70" cy="70" rx="50" ry="20" stroke="var(--accent)" stroke-opacity="0.12" stroke-width="1"/><ellipse cx="70" cy="70" rx="30" ry="50" stroke="var(--accent)" stroke-opacity="0.1" stroke-width="1"/><circle cx="70" cy="70" r="4" fill="var(--accent)" fill-opacity="0.35"/></svg>',
  browser: '<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="28" width="100" height="84" rx="8" fill="var(--accent)" fill-opacity="0.04" stroke="var(--accent)" stroke-opacity="0.2" stroke-width="1.5"/><rect x="20" y="28" width="100" height="18" rx="8" fill="var(--accent)" fill-opacity="0.08"/><circle cx="33" cy="37" r="3" fill="var(--accent)" fill-opacity="0.25"/><circle cx="43" cy="37" r="3" fill="var(--accent)" fill-opacity="0.25"/><circle cx="53" cy="37" r="3" fill="var(--accent)" fill-opacity="0.25"/><rect x="30" y="54" width="36" height="4" rx="2" fill="var(--accent)" fill-opacity="0.2"/><rect x="30" y="63" width="24" height="3" rx="1.5" fill="var(--accent)" fill-opacity="0.12"/><rect x="30" y="74" width="80" height="28" rx="4" fill="var(--accent)" fill-opacity="0.04" stroke="var(--accent)" stroke-opacity="0.1" stroke-width="1"/></svg>',
  envelope: '<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="38" width="100" height="64" rx="8" fill="var(--accent)" fill-opacity="0.04" stroke="var(--accent)" stroke-opacity="0.2" stroke-width="1.5"/><path d="M22 40L70 75L118 40" stroke="var(--accent)" stroke-opacity="0.25" stroke-width="1.5"/><path d="M22 100L55 72" stroke="var(--accent)" stroke-opacity="0.12" stroke-width="1"/><path d="M118 100L85 72" stroke="var(--accent)" stroke-opacity="0.12" stroke-width="1"/><circle cx="70" cy="65" r="5" fill="var(--accent)" fill-opacity="0.25"/></svg>',
  rocket: '<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="70" cy="70" r="50" fill="var(--accent)" fill-opacity="0.03" stroke="var(--accent)" stroke-opacity="0.12" stroke-width="1"/><path d="M70 30C70 30 85 50 85 75C85 100 70 110 70 110C70 110 55 100 55 75C55 50 70 30 70 30Z" fill="var(--accent)" fill-opacity="0.08" stroke="var(--accent)" stroke-opacity="0.25" stroke-width="1.5"/><circle cx="70" cy="68" r="6" fill="var(--accent)" fill-opacity="0.2" stroke="var(--accent)" stroke-opacity="0.3" stroke-width="1"/><path d="M62 95L55 105" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="1.5"/><path d="M78 95L85 105" stroke="var(--accent)" stroke-opacity="0.15" stroke-width="1.5"/><path d="M66 108C66 108 70 118 70 118C70 118 74 108 74 108" stroke="var(--accent)" stroke-opacity="0.2" stroke-width="1.5"/></svg>',
};

var STEP_ILLUSTRATION = {
  'domain-type': 'globe', 'domain-config': 'globe',
  'builder': 'browser',
  'email-choice': 'envelope', 'email-form': 'envelope',
  'review': 'rocket',
};

// Wrap step HTML in two-column layout with illustration
var wrapWithIllustration = function(stepId, innerHtml) {
  var illustId = STEP_ILLUSTRATION[stepId];
  if (!illustId) return innerHtml;
  var svg = WIZARD_ILLUSTRATIONS[illustId] || '';
  return '<div class="onboarding-illust" data-illust="' + illustId + '">' + svg + '</div>' +
         '<div class="onboarding-content">' +
         '<div class="onboarding-progress" id="progressBar"></div>' +
         innerHtml +
         '<div class="onboarding-skip-wrap"><a href="index.html" class="onboarding-skip-link"><i class="ri-skip-forward-line" aria-hidden="true"></i> Skip to dashboard</a></div>' +
         '</div>';
};

// ── Chunked progress bar ──
var CHUNK_LABELS = ['Account', 'Setup', 'Build', 'Launch'];

var CHUNK_STEPS = {
  full: { 1: ['welcome', 'domain-type', 'domain-config'], 2: ['builder', 'email-choice', 'email-form'], 3: ['review', 'success'] },
  noDomain: { 1: ['welcome'], 2: ['builder', 'email-choice', 'email-form'], 3: ['review', 'success'] },
  noDomainNoEmail: { 1: ['welcome'], 2: ['builder'], 3: ['review', 'success'] },
  noEmail: { 1: ['welcome', 'domain-type', 'domain-config'], 2: ['builder'], 3: ['review', 'success'] },
};

var getChunkConfig = function(journey) {
  var steps = JOURNEYS[journey];
  var hasDomain = steps.indexOf('domain-type') >= 0;
  var hasEmail = steps.indexOf('email-choice') >= 0;
  if (hasDomain && hasEmail) return CHUNK_STEPS.full;
  if (!hasDomain && hasEmail) return CHUNK_STEPS.noDomain;
  if (hasDomain && !hasEmail) return CHUNK_STEPS.noEmail;
  return CHUNK_STEPS.noDomainNoEmail;
};

var renderProgressBar = function(journey, currentStepId) {
  var chunks = getChunkConfig(journey);
  var steps = JOURNEYS[journey];
  var currentIdx = steps.indexOf(currentStepId);
  if (currentIdx < 0) currentIdx = 0;

  var totalSteps = 1;
  for (var c = 1; c <= 3; c++) totalSteps += (chunks[c] || []).length;

  var completed = 1;
  for (var c = 1; c <= 3; c++) {
    var chunkSteps = chunks[c] || [];
    for (var s = 0; s < chunkSteps.length; s++) {
      if (steps.indexOf(chunkSteps[s]) < currentIdx) completed++;
    }
  }

  var percent = Math.round((completed / totalSteps) * 100);

  var html = '<div class="onboarding-progress-header">' +
    '<span class="onboarding-progress-percent">' + percent + '%</span>' +
    '</div><div class="onboarding-progress-bar">';

  html += '<div class="onboarding-progress-chunk"><div class="onboarding-progress-fill" style="transform:scaleX(1)"></div></div>';

  for (var c = 1; c <= 3; c++) {
    var chunkSteps = chunks[c] || [];
    var chunkFill = 0;
    for (var s = 0; s < chunkSteps.length; s++) {
      if (steps.indexOf(chunkSteps[s]) < currentIdx) chunkFill++;
      else if (steps.indexOf(chunkSteps[s]) === currentIdx) chunkFill += 0.5;
    }
    var fill = chunkSteps.length > 0 ? chunkFill / chunkSteps.length : 0;
    html += '<div class="onboarding-progress-chunk"><div class="onboarding-progress-fill" style="transform:scaleX(' + fill.toFixed(2) + ')"></div></div>';
  }

  html += '</div><div class="onboarding-progress-labels">';
  for (var i = 0; i < CHUNK_LABELS.length; i++) {
    var cls = 'onboarding-progress-label';
    if (i === 0) {
      html += '<span class="' + cls + ' done"><i class="ri-check-line" aria-hidden="true"></i> ' + CHUNK_LABELS[i] + '</span>';
    } else {
      var cs = chunks[i] || [];
      var allDone = cs.length > 0 && cs.every(function(s) { return steps.indexOf(s) < currentIdx; });
      var isActive = cs.some(function(s) { return steps.indexOf(s) === currentIdx; });
      if (allDone) cls += ' done';
      else if (isActive) cls += ' active';
      html += '<span class="' + cls + '">' + (allDone ? '<i class="ri-check-line" aria-hidden="true"></i> ' : '') + CHUNK_LABELS[i] + '</span>';
    }
  }
  html += '</div>';
  return html;
};

var updateProgressBar = function(journey, currentStepId) {
  var bar = document.getElementById('progressBar');
  if (bar) bar.innerHTML = renderProgressBar(journey, currentStepId);
};

// ── Welcome (onboarding only) ──
WIZARD_STEPS['welcome'] = {
  id: 'welcome',
  title: null, // No stepper on welcome
  render: function(state) {
    return `
      <div class="onboarding-welcome" style="display: flex;">
        <div class="onboarding-glow" aria-hidden="true"></div>
        <div class="onboarding-brand" aria-hidden="true">
          <i class="ri-rocket-2-fill"></i>
        </div>
        <h1>Your website starts here</h1>
        <p class="onboarding-subtitle">We'll walk you through setting up your domain, email, and website in just a few minutes.</p>
        <button type="button" class="btn btn-primary btn-lg" style="border-radius: var(--radius-full);" data-action="advance">
          Get Started <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <div class="onboarding-skip-wrap"><a href="index.html" class="onboarding-skip-link"><i class="ri-skip-forward-line" aria-hidden="true"></i> Skip to dashboard</a></div>
      </div>`;
  },
  onMount: function(container, cb) {
    container.querySelector('[data-action="advance"]')?.addEventListener('click', cb.advance);
  },
  showStepper: false,
  showFooter: false,
};

// ── Domain Type ──
WIZARD_STEPS['domain-type'] = {
  id: 'domain-type',
  render: function(state) {
    const primaryDomain = state.availableDomains[0] || 'example.com';
    return wrapWithIllustration('domain-type', `
      <h2>Which domain will you use?</h2>
      <p class="onboarding-subtitle">Choose the domain visitors will use to reach your website.</p>

      <div class="onboarding-choices cols-3" role="radiogroup" aria-label="Domain type">
        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="primary">
          <div class="onboarding-choice-icon" style="background: var(--status-success-bg); color: var(--status-success);">
            <i class="ri-check-double-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Use ${esc(primaryDomain)}</div>
          <div class="onboarding-choice-desc">Your account's primary domain — already configured</div>
        </div>

        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="existing">
          <div class="onboarding-choice-icon" style="background: var(--accent-muted); color: var(--text-brand);">
            <i class="ri-global-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Add another domain</div>
          <div class="onboarding-choice-desc">Host an existing or new domain on this account</div>
        </div>

        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="subdomain">
          <div class="onboarding-choice-icon" style="background: var(--status-info-bg); color: var(--status-info);">
            <i class="ri-link" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Create a subdomain</div>
          <div class="onboarding-choice-desc">Use a subdomain of your primary domain</div>
        </div>
      </div>

      <div id="tempDomainNotice" class="onboarding-ssl-warning" style="display: none; max-width: 700px; margin-bottom: var(--space-4);">
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <div><strong>You're using a temporary domain.</strong> Your account is set up with a temporary address. Choose a real domain below to make your website accessible to visitors.</div>
      </div>

      <div id="domainError" class="onboarding-error" style="display: none;">
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span id="domainErrorText"></span>
      </div>`);
  },
  onMount: function(container, cb) {
    container.querySelectorAll('.onboarding-choice').forEach(function(card) {
      card.addEventListener('click', function() {
        container.querySelectorAll('.onboarding-choice').forEach(function(c) {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        card.closest('.onboarding-choices').classList.add('has-selection');
        wizardState.domainType = card.dataset.value;
        if (card.dataset.value === 'primary') {
          wizardState.domain = wizardState.availableDomains[0] || 'example.com';
        }
        cb.enableContinue(true);
      });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });
  },
  showStepper: true,
  showFooter: true,
  continueLabel: 'Continue',
  onContinue: function(state) {
    if (state.domainType === 'primary') return 'email-choice'; // Skip domain-config
    return null; // Use default next step
  },
};

// ── Domain Config ──
WIZARD_STEPS['domain-config'] = {
  id: 'domain-config',
  render: function(state) {
    const isSubdomain = state.domainType === 'subdomain';
    const domains = state.availableDomains;
    const parentDropdown = domains.length > 1
      ? `<select class="form-select" id="parentDomainSelect">${domains.map(function(d) { return `<option value="${esc(d)}">${esc(d)}</option>`; }).join('')}</select>`
      : `<input type="text" class="form-input" value="${esc(domains[0] || 'example.com')}" readonly style="background: var(--bg-muted); color: var(--text-secondary);">`;

    if (isSubdomain) {
      return wrapWithIllustration('domain-config', `
        <h2>Create your subdomain</h2>
        <p class="onboarding-subtitle">Choose a prefix for your subdomain.</p>
        <div style="width: 100%; max-width: 520px;">
          <div style="display: flex; align-items: flex-end; gap: var(--space-2);">
            <div style="flex: 1;">
              <label class="form-label" for="subdomainPrefix">Subdomain prefix</label>
              <input type="text" id="subdomainPrefix" class="form-input" placeholder="mysite">
            </div>
            <div style="padding-bottom: var(--space-3); color: var(--text-tertiary); font-size: var(--text-lg); font-weight: var(--weight-light);">.</div>
            <div style="flex: 1;">
              <label class="form-label">Parent domain</label>
              ${parentDropdown}
            </div>
          </div>
          <div id="subdomainPreview" class="subdomain-preview">mysite.${esc(domains[0] || 'example.com')}</div>
        </div>
        <div id="domainConfigError" class="onboarding-error" style="display: none;">
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          <span id="domainConfigErrorText"></span>
        </div>`);
    }
    return wrapWithIllustration('domain-config', `
      <h2>Enter your domain</h2>
      <p class="onboarding-subtitle">We'll configure hosting for this domain.</p>
      <div style="width: 100%; max-width: 520px;">
        <div class="form-group">
          <label class="form-label" for="domainInput">Domain name</label>
          <input type="text" id="domainInput" class="form-input" placeholder="yourdomain.com">
        </div>
        <button type="button" class="btn btn-secondary" id="checkDnsBtn">
          <i class="ri-radar-line" aria-hidden="true"></i> Check DNS
        </button>
        <div id="dnsStatus"></div>
      </div>
      <div id="domainConfigError" class="onboarding-error" style="display: none;">
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span id="domainConfigErrorText"></span>
      </div>`);
  },
  onMount: function(container, cb) {
    const isSubdomain = wizardState.domainType === 'subdomain';
    if (isSubdomain) {
      const prefix = container.querySelector('#subdomainPrefix');
      const preview = container.querySelector('#subdomainPreview');
      const parentSelect = container.querySelector('#parentDomainSelect');
      const getParent = function() { return parentSelect ? parentSelect.value : (wizardState.availableDomains[0] || 'example.com'); };
      const validate = function() {
        const val = (prefix?.value || '').trim();
        const valid = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(val);
        wizardState.domain = val ? val + '.' + getParent() : '';
        if (preview) preview.textContent = (val || 'mysite') + '.' + getParent();
        cb.enableContinue(valid);
      };
      prefix?.addEventListener('input', validate);
      parentSelect?.addEventListener('change', validate);
      validate();
    } else {
      const input = container.querySelector('#domainInput');
      const dnsBtn = container.querySelector('#checkDnsBtn');
      const validate = function() {
        const val = (input?.value || '').trim();
        const valid = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(val);
        wizardState.domain = val;
        cb.enableContinue(valid);
      };
      input?.addEventListener('input', validate);
      dnsBtn?.addEventListener('click', function() { mockCheckDns(container, input?.value); });
      validate();
    }
  },
  showStepper: true,
  showFooter: true,
  continueLabel: 'Continue',
};

// ── Email Choice (auto-advance on selection) ──
WIZARD_STEPS['email-choice'] = {
  id: 'email-choice',
  render: function(state) {
    return wrapWithIllustration('email-choice', `
      <h2>Want to create an email address?</h2>
      <p class="onboarding-subtitle">Set up a professional email like you@${esc(state.domain || 'yourdomain.com')}</p>
      <div class="onboarding-choices cols-2" role="radiogroup" aria-label="Email choice" style="max-width: 500px;">
        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="yes">
          <div class="onboarding-choice-icon" style="background: var(--status-success-bg); color: var(--status-success);">
            <i class="ri-mail-check-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Yes, create an email</div>
        </div>
        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="no">
          <div class="onboarding-choice-icon" style="background: var(--bg-muted); color: var(--text-tertiary);">
            <i class="ri-skip-forward-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Skip — I'll add email later</div>
        </div>
      </div>`);
  },
  onMount: function(container, cb) {
    // Auto-advance: clicking a card immediately proceeds
    container.querySelectorAll('.onboarding-choice').forEach(function(card) {
      card.addEventListener('click', function() {
        container.querySelectorAll('.onboarding-choice').forEach(function(c) {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        card.closest('.onboarding-choices').classList.add('has-selection');
        const choice = card.dataset.value;
        wizardState.emailChoice = choice;

        if (choice === 'no') {
          wizardState.emailSkipped = true;
          setTimeout(function() { cb.advance(); }, 300);
        } else {
          wizardState.emailSkipped = false;
          cb.advance();
        }
      });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });
  },
  showStepper: true,
  showFooter: false, // No continue button — auto-advances
  onContinue: function(state) {
    if (state.emailChoice === 'no') return 'review'; // Skip email-form, go to review
    return null;
  },
};

// ── Email Form ──
WIZARD_STEPS['email-form'] = {
  id: 'email-form',
  render: function(state) {
    const domains = state.availableDomains;
    const domainField = domains.length > 1
      ? `<select class="form-select" id="emailDomain">${domains.map(function(d) { return `<option value="${esc(d)}" ${d === state.domain ? 'selected' : ''}>${esc(d)}</option>`; }).join('')}</select>`
      : `<input type="text" id="emailDomain" class="form-input" value="${esc(state.domain || domains[0] || 'example.com')}" readonly style="background: var(--bg-muted); color: var(--text-secondary);">`;

    return wrapWithIllustration('email-form', `
      <h2>Create your first email address</h2>
      <p class="onboarding-subtitle">Set up a professional email for your domain.</p>
      <div class="onboarding-email-form">
        <div class="onboarding-email-row">
          <div class="input-wrap">
            <label class="form-label" for="emailUser">Email address</label>
            <input type="text" id="emailUser" class="form-input" placeholder="hello">
          </div>
          <div class="onboarding-email-at">@</div>
          <div class="input-wrap">
            <label class="form-label">Domain</label>
            ${domainField}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="emailPassword">Password</label>
          <div style="display: flex; gap: var(--space-2); align-items: flex-start;">
            <div style="flex: 1;">
              <input type="password" id="emailPassword" class="form-input" placeholder="Choose a strong password">
              <div class="password-strength" style="margin-top: var(--space-2);">
                <div class="password-strength-bar"><div class="password-strength-fill" id="emailStrengthFill"></div></div>
                <span class="password-strength-label" id="emailStrengthLabel"></span>
              </div>
            </div>
            <button type="button" class="btn btn-secondary" id="generatePasswordBtn" style="margin-top: 0; white-space: nowrap;">
              <i class="ri-key-line" aria-hidden="true"></i> Generate
            </button>
          </div>
        </div>
        <div id="emailError" class="onboarding-error" style="display: none;">
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          <span id="emailErrorText"></span>
        </div>
      </div>`);
  },
  onMount: function(container, cb) {
    const userInput = container.querySelector('#emailUser');
    const passInput = container.querySelector('#emailPassword');
    const genBtn = container.querySelector('#generatePasswordBtn');
    const strengthFill = container.querySelector('#emailStrengthFill');
    const strengthLabel = container.querySelector('#emailStrengthLabel');

    const validate = function() {
      const user = (userInput?.value || '').trim();
      const pass = passInput?.value || '';
      const valid = /^[a-zA-Z0-9._%+-]+$/.test(user) && pass.length >= 8;
      wizardState.emailUser = user;
      wizardState.emailPassword = pass;
      cb.enableContinue(valid);
    };

    const updateStrength = function() {
      const val = passInput?.value || '';
      let score = 0;
      if (val.length >= 8) score++;
      if (val.length >= 12) score++;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;
      const levels = [
        { width: '0%', color: 'var(--border-default)', text: '' },
        { width: '20%', color: 'var(--status-error)', text: 'Weak' },
        { width: '40%', color: 'var(--status-warning)', text: 'Fair' },
        { width: '60%', color: 'var(--status-warning)', text: 'Good' },
        { width: '80%', color: 'var(--status-success)', text: 'Strong' },
        { width: '100%', color: 'var(--status-success)', text: 'Excellent' }
      ];
      const level = levels[Math.min(score, 5)];
      if (strengthFill) { strengthFill.style.width = level.width; strengthFill.style.background = level.color; }
      if (strengthLabel) { strengthLabel.textContent = level.text; strengthLabel.style.color = level.color; }
    };

    userInput?.addEventListener('input', validate);
    passInput?.addEventListener('input', function() { validate(); updateStrength(); });

    // Generate password — reuse generatePassword from shell.js if available
    genBtn?.addEventListener('click', function() {
      const pw = typeof generatePassword === 'function' ? generatePassword() : generateSimplePassword();
      if (passInput) { passInput.type = 'text'; passInput.value = pw; }
      validate();
      updateStrength();
    });

    validate();
  },
  showStepper: true,
  showFooter: true,
  continueLabel: 'Create & Continue',
};

// ── Builder ──
WIZARD_STEPS['builder'] = {
  id: 'builder',
  render: function(state) {
    return wrapWithIllustration('builder', `
      <h2>How do you want to build?</h2>
      <p class="onboarding-subtitle">Pick a tool to create your website.</p>
      <div class="onboarding-choices cols-3" role="radiogroup" aria-label="Website builder">
        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="sitejet">
          <div class="onboarding-choice-icon" style="background: var(--accent-muted); color: var(--text-brand);">
            <i class="ri-layout-masonry-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Sitejet Builder</div>
          <div class="onboarding-choice-desc">Drag-and-drop visual builder</div>
          <div class="onboarding-choice-features">
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--text-brand);" aria-hidden="true"></i> 150+ professional templates</div>
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--text-brand);" aria-hidden="true"></i> Drag-and-drop editor</div>
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--text-brand);" aria-hidden="true"></i> No coding required</div>
          </div>
        </div>

        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="wordpress">
          <div class="onboarding-choice-icon" style="background: var(--status-info-bg); color: var(--status-info);">
            <i class="ri-wordpress-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">WordPress</div>
          <div class="onboarding-choice-desc">The world's most popular CMS</div>
          <div class="onboarding-choice-features">
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--status-info);" aria-hidden="true"></i> Thousands of plugins</div>
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--status-info);" aria-hidden="true"></i> Massive theme library</div>
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--status-info);" aria-hidden="true"></i> Huge community</div>
          </div>
        </div>

        <div class="onboarding-choice" role="radio" aria-checked="false" tabindex="0" data-value="custom">
          <div class="onboarding-choice-icon" style="background: var(--bg-muted); color: var(--text-tertiary);">
            <i class="ri-code-s-slash-line" aria-hidden="true"></i>
          </div>
          <div class="onboarding-choice-title">Custom Code</div>
          <div class="onboarding-choice-desc">Build with your own code</div>
          <div class="onboarding-choice-features">
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--text-tertiary);" aria-hidden="true"></i> Upload your own files</div>
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--text-tertiary);" aria-hidden="true"></i> Your code, your way</div>
            <div class="onboarding-choice-feature"><i class="ri-checkbox-circle-fill" style="color: var(--text-tertiary);" aria-hidden="true"></i> Use any framework</div>
          </div>
        </div>
      </div>`);
  },
  onMount: function(container, cb) {
    container.querySelectorAll('.onboarding-choice').forEach(function(card) {
      card.addEventListener('click', function() {
        container.querySelectorAll('.onboarding-choice').forEach(function(c) {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        card.closest('.onboarding-choices').classList.add('has-selection');
        wizardState.builder = card.dataset.value;
        cb.enableContinue(true);
      });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });
  },
  showStepper: true,
  showFooter: true,
  continueLabel: 'Continue',
};

// ── Review ──
WIZARD_STEPS['review'] = {
  id: 'review',
  render: function(state) {
    const builderLabels = { sitejet: 'Sitejet Builder', wordpress: 'WordPress', custom: 'Custom Code' };
    const builderIcons = { sitejet: 'ri-layout-masonry-line', wordpress: 'ri-wordpress-line', custom: 'ri-code-s-slash-line' };
    return wrapWithIllustration('review', `
      <h2>Ready to launch</h2>
      <p class="onboarding-subtitle">Here's what we'll set up for you.</p>
      <div class="onboarding-summary">
        <div class="onboarding-summary-card">
          <div class="onboarding-summary-icon" style="background: var(--accent-muted); color: var(--text-brand);"><i class="ri-global-line" aria-hidden="true"></i></div>
          <div class="onboarding-summary-content">
            <div class="onboarding-summary-label">Domain</div>
            <div class="onboarding-summary-value">${esc(state.domain)}</div>
          </div>
          ${JOURNEYS[state.journey]?.indexOf('domain-type') >= 0 ? '<button type="button" class="onboarding-summary-edit" data-goto="domain-type">Edit</button>' : ''}
        </div>
        <div class="onboarding-summary-card">
          <div class="onboarding-summary-icon" style="background: var(--bg-muted); color: var(--text-secondary);"><i class="${builderIcons[state.builder] || 'ri-code-line'}" aria-hidden="true"></i></div>
          <div class="onboarding-summary-content">
            <div class="onboarding-summary-label">Builder</div>
            <div class="onboarding-summary-value">${esc(builderLabels[state.builder] || 'Not selected')}</div>
          </div>
          <button type="button" class="onboarding-summary-edit" data-goto="builder">Edit</button>
        </div>
        <div class="onboarding-summary-card">
          <div class="onboarding-summary-icon" style="background: var(--status-info-bg); color: var(--status-info);"><i class="ri-mail-line" aria-hidden="true"></i></div>
          <div class="onboarding-summary-content">
            <div class="onboarding-summary-label">Email</div>
            <div class="onboarding-summary-value${state.emailSkipped ? ' skipped' : ''}">${state.emailSkipped ? 'Skipped' : esc(state.emailUser + '@' + state.domain)}</div>
          </div>
          <button type="button" class="onboarding-summary-edit" data-goto="email-choice">Edit</button>
        </div>
      </div>`);
  },
  onMount: function(container, cb) {
    cb.enableContinue(true); // Review is always ready to launch
    container.querySelectorAll('[data-goto]').forEach(function(btn) {
      btn.addEventListener('click', function() { cb.goToStep(btn.dataset.goto); });
    });
  },
  showStepper: true,
  showFooter: true,
  continueLabel: 'Launch My Website',
  continueIcon: 'ri-rocket-2-line',
};

// ── Success ──
WIZARD_STEPS['success'] = {
  id: 'success',
  render: function(state) {
    const isModal = state.journey === 'add-website' || state.journey === 'create-email';
    const builderCtas = {
      sitejet: { label: 'Open Sitejet Builder', icon: 'ri-layout-masonry-line' },
      wordpress: { label: 'Go to WordPress Admin', icon: 'ri-wordpress-line' },
      custom: { label: 'Open File Manager', icon: 'ri-folder-open-line' }
    };
    const cta = builderCtas[state.builder] || builderCtas.custom;

    if (isModal) {
      return `
        <div style="text-align: center; padding: var(--space-6) 0;">
          <div class="onboarding-success-icon" aria-hidden="true"><i class="ri-check-double-line"></i></div>
          <h2>All set!</h2>
          <p class="onboarding-subtitle">${esc(state.domain)} is ready to go.</p>
          <button type="button" class="btn btn-primary btn-lg" data-action="close-modal">
            <i class="${cta.icon}" aria-hidden="true"></i> ${cta.label}
          </button>
        </div>`;
    }

    // Full-screen onboarding success — DNS-aware hero
    const isConnected = state.dnsStatus === 'connected';
    const heroIcon = isConnected ? 'ri-check-double-line' : 'ri-links-line';
    const heroIconClass = isConnected ? 'dns-connected' : 'dns-not-connected';
    const heroTitle = isConnected ? "You're live!" : 'Almost there!';
    const heroSubtitle = isConnected
      ? `${esc(state.domain)} is set up and ready for visitors.`
      : 'Your site is ready — just connect your domain to go live.';

    // DNS status card
    let dnsCard = '';
    if (isConnected) {
      dnsCard = `
        <div class="dns-status-card connected">
          <div class="dns-status-header">
            <div class="dns-dot green"></div>
            <div>
              <div class="dns-status-title connected">Domain Connected</div>
              <div class="dns-status-subtitle">${esc(state.domain)} is pointing to this server</div>
            </div>
          </div>
        </div>`;
    } else {
      const reason = state.dnsStatus === 'wrong-ip'
        ? `${esc(state.domain)} points to ${MOCK_WRONG_IP} instead of this server`
        : `${esc(state.domain)} doesn't have any DNS records pointing here`;
      dnsCard = `
        <div class="dns-status-card not-connected">
          <div class="dns-status-header">
            <div class="dns-dot yellow"></div>
            <div>
              <div class="dns-status-title not-connected">Domain Not Connected Yet</div>
              <div class="dns-status-subtitle">${esc(reason)}</div>
            </div>
          </div>
          <div class="ns-box">
            <div class="ns-label">Update your nameservers to:</div>
            ${MOCK_NAMESERVERS.map(function(ns) {
              return '<div class="ns-value"><span>' + esc(ns) + '</span><button type="button" class="ns-copy" data-ns="' + esc(ns) + '">Copy</button></div>';
            }).join('')}
            <details class="ns-help">
              <summary><i class="ri-arrow-right-s-line"></i> Where do I change nameservers?</summary>
              <div class="ns-help-content">
                Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.)
                and look for <strong>Nameservers</strong> or <strong>DNS settings</strong>.
                Replace the existing nameservers with the values above.
                <div class="propagation-note">
                  <i class="ri-time-line" aria-hidden="true"></i>
                  Changes can take up to 48 hours to propagate, but usually happen within a few hours.
                </div>
              </div>
            </details>
          </div>
        </div>`;
    }

    return `
      <div class="onboarding-success" style="display: flex;">
      <div class="onboarding-success-icon ${heroIconClass}" aria-hidden="true"><i class="${heroIcon}"></i></div>
      <h2>${heroTitle}</h2>
      <p class="onboarding-subtitle">${heroSubtitle}</p>
      ${dnsCard}
      <div>
        <button type="button" class="btn btn-primary btn-lg" data-action="primary-cta">
          <i class="${cta.icon}" aria-hidden="true"></i> ${cta.label}
        </button>
      </div>
      <div class="onboarding-next-options">
        <a href="index.html" class="onboarding-next-option" data-action="complete">
          <i class="ri-dashboard-line" aria-hidden="true"></i> Go to Dashboard
        </a>
        ${state.emailSkipped ? `<a href="email.html" class="onboarding-next-option" data-action="complete">
          <i class="ri-mail-add-line" aria-hidden="true"></i> Add an email
        </a>` : ''}
        <a href="domains.html" class="onboarding-next-option" data-action="complete">
          <i class="ri-global-line" aria-hidden="true"></i> Manage your domain
        </a>
      </div>
      </div>`;
  },
  onMount: function(container, cb) {
    // Confetti for full-screen onboarding (wizardState is global, not passed to onMount)
    if (wizardState.journey === 'onboarding') {
      var successEl = container.querySelector('.onboarding-success');
      if (successEl) spawnConfetti(successEl);
    }
    container.querySelector('[data-action="close-modal"]')?.addEventListener('click', function() { cb.closeModal(); });
    container.querySelector('[data-action="primary-cta"]')?.addEventListener('click', function() {
      markOnboardingComplete();
      // In prototype, just go to dashboard
      window.location.href = 'index.html';
    });
    container.querySelectorAll('[data-action="complete"]').forEach(function(link) {
      link.addEventListener('click', function() { markOnboardingComplete(); });
    });
    // DNS nameserver copy buttons
    container.querySelectorAll('.ns-copy').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var ns = btn.dataset.ns;
        navigator.clipboard.writeText(ns).then(function() {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function() { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
        });
      });
    });
  },
  showStepper: false,
  showFooter: false,
};

// ── Confetti celebration ──
var spawnConfetti = function(container) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var s = getComputedStyle(document.documentElement);
  var colors = [
    s.getPropertyValue('--accent').trim() || '#f97316',
    s.getPropertyValue('--teal-400').trim() || '#2dd4bf',
    s.getPropertyValue('--violet-400').trim() || '#8b5cf6',
    s.getPropertyValue('--rose-400').trim() || '#f43f5e',
    s.getPropertyValue('--amber-300').trim() || '#fbbf24',
    s.getPropertyValue('--sky-400').trim() || '#38bdf8'
  ];
  // Burst from center in 2 waves — fewer particles, GPU-accelerated
  var count = 28;
  for (var i = 0; i < count; i++) {
    var particle = document.createElement('div');
    particle.className = 'confetti-particle';
    var size = 5 + Math.random() * 7;
    particle.style.width = size + 'px';
    particle.style.height = size * (0.4 + Math.random() * 0.6) + 'px';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.borderRadius = Math.random() > 0.4 ? '50%' : '2px';
    // Spread outward from center with slight randomness
    var angle = (i / count) * 360 + (Math.random() * 30 - 15);
    var rad = angle * Math.PI / 180;
    var spread = 120 + Math.random() * 180;
    var xDrift = Math.cos(rad) * spread;
    var yDist = 200 + Math.random() * 300;
    particle.style.setProperty('--confetti-x', '0px');
    particle.style.setProperty('--confetti-drift', xDrift.toFixed(0) + 'px');
    particle.style.setProperty('--confetti-dist', yDist.toFixed(0) + 'px');
    particle.style.setProperty('--confetti-spin', (360 + Math.random() * 540).toFixed(0) + 'deg');
    // Stagger in 2 quick waves
    var wave = i < count / 2 ? 0 : 0.15;
    particle.style.setProperty('--confetti-duration', (1.2 + Math.random() * 0.8) + 's');
    particle.style.setProperty('--confetti-delay', (wave + Math.random() * 0.3) + 's');
    particle.addEventListener('animationend', function() { this.remove(); });
    container.appendChild(particle);
  }
};

// ── Helper: mark onboarding complete ──
var markOnboardingComplete = function() {
  localStorage.setItem('meridian-onboarding-complete', 'true');
  var milestones = { website: !!wizardState.builder, ssl: true };
  if (wizardState.emailUser && !wizardState.emailSkipped) milestones.email = true;
  localStorage.setItem('meridian-onboarding-milestones', JSON.stringify(milestones));
};

// ── Helper: mock DNS check ──
var mockCheckDns = async function(container, domain) {
  const statusEl = container.querySelector('#dnsStatus');
  if (!statusEl || !domain) return;
  statusEl.innerHTML = '<div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-lg); margin-top: var(--space-4); background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-secondary);"><i class="ri-loader-4-line" style="animation: spin 1s linear infinite;" aria-hidden="true"></i><div>Checking DNS for <strong>' + esc(domain) + '</strong>...</div></div>';
  await new Promise(function(r) { setTimeout(r, 1000); });
  const isResolved = Math.random() > 0.4;
  if (isResolved) {
    statusEl.innerHTML = '<div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-lg); margin-top: var(--space-4); background: var(--status-success-bg); border: 1px solid var(--status-success-border); color: var(--status-success);"><i class="ri-checkbox-circle-fill" aria-hidden="true"></i><div><strong>DNS looks good!</strong> This domain is pointing to this server.</div></div>';
  } else {
    statusEl.innerHTML = `<div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-lg); margin-top: var(--space-4); background: var(--status-warning-bg); border: 1px solid var(--status-warning-border); color: var(--text-primary);">
      <i class="ri-error-warning-line" style="color: var(--status-warning);" aria-hidden="true"></i>
      <div>
        <strong>DNS not pointing here yet.</strong>
        <p style="margin: var(--space-2) 0 0; font-size: var(--text-sm);">Update your DNS records at your domain registrar:</p>
        <ul style="margin: var(--space-2) 0 0; padding-inline-start: var(--space-5); font-size: var(--text-sm);">
          <li>Set an <strong>A record</strong> pointing to <code style="font-size: var(--text-xs); color: var(--text-brand);">203.0.113.10</code></li>
          <li>Or change nameservers to <code style="font-size: var(--text-xs); color: var(--text-brand);">ns1.webhost.com</code> and <code style="font-size: var(--text-xs); color: var(--text-brand);">ns2.webhost.com</code></li>
        </ul>
        <p style="margin: var(--space-2) 0 0; font-size: var(--text-xs); color: var(--text-tertiary);">DNS changes can take up to 48 hours to propagate.</p>
      </div>
    </div>`;
  }
};

// ── Helper: simple password generator fallback ──
var generateSimplePassword = function() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
};

// ── Navigation Engine ──
var getStepIndex = function(journey, stepId) {
  return JOURNEYS[journey]?.indexOf(stepId) ?? -1;
};

var getNextStep = function(journey, currentStepId, state) {
  const step = WIZARD_STEPS[currentStepId];
  // Check if step has a custom next-step override
  if (step?.onContinue) {
    const override = step.onContinue(state);
    if (override) return override;
  }
  const steps = JOURNEYS[journey];
  const idx = steps.indexOf(currentStepId);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
};

var getPrevStep = function(journey, currentStepId) {
  const steps = JOURNEYS[journey];
  const idx = steps.indexOf(currentStepId);
  return idx > 0 ? steps[idx - 1] : null;
};
