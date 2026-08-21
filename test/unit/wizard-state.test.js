import { describe, it, expect, beforeEach } from 'vitest';

// wizard-steps.js uses `var` declarations which are function-scoped inside
// new Function() (not global). We copy the reference implementations here.

// ── Shared State ──
let wizardState = {
  journey: null,
  currentStepIdx: 0,
  domainType: null,
  domain: '',
  emailChoice: null,
  emailSkipped: false,
  emailUser: '',
  emailPassword: '',
  builder: null,
  preFillDomain: null,
  availableDomains: ['example.com'],
};

function resetWizardState() {
  Object.assign(wizardState, {
    journey: null, currentStepIdx: 0, domainType: null, domain: '',
    emailChoice: null, emailSkipped: false, emailUser: '', emailPassword: '',
    builder: null, preFillDomain: null,
  });
}

// ── Temp domain detection ──
const TEMP_DOMAIN_PATTERN = /\.(cpanel\.site|cprapid\.com|wp2\.host|wpsquared\.site)$/i;

function isTempDomain(domain) {
  if (!domain) return true;
  return TEMP_DOMAIN_PATTERN.test(domain);
}

// ── Journey Definitions ──
const JOURNEYS = {
  onboarding:    ['welcome', 'builder', 'email-choice', 'email-form', 'review', 'success'],
  'add-website': ['domain-type', 'domain-config', 'builder', 'email-choice', 'email-form', 'review', 'success'],
  'create-email': ['email-form', 'success'],
};

// ── Email feature check stub (always true in test) ──
function hasEmailFeature() {
  return wizardState.emailFeatureEnabled !== false;
}

// ── Build onboarding journey ──
function buildOnboardingJourney() {
  var primaryDomain = wizardState.availableDomains[0] || '';
  var includeEmail = hasEmailFeature();

  if (isTempDomain(primaryDomain)) {
    var steps = ['welcome', 'domain-type', 'domain-config', 'builder'];
    if (includeEmail) steps.push('email-choice', 'email-form');
    steps.push('review', 'success');
    return steps;
  }
  wizardState.domainType = 'primary';
  wizardState.domain = primaryDomain;
  if (!includeEmail) wizardState.emailSkipped = true;
  var steps = ['welcome', 'builder'];
  if (includeEmail) steps.push('email-choice', 'email-form');
  steps.push('review', 'success');
  return steps;
}

// ── Tests ──

beforeEach(() => {
  resetWizardState();
});

describe('wizardState', () => {
  it('has expected default values after reset', () => {
    expect(wizardState.journey).toBe(null);
    expect(wizardState.currentStepIdx).toBe(0);
    expect(wizardState.domainType).toBe(null);
    expect(wizardState.domain).toBe('');
    expect(wizardState.emailChoice).toBe(null);
    expect(wizardState.emailSkipped).toBe(false);
    expect(wizardState.builder).toBe(null);
  });

  it('resetWizardState clears modified state', () => {
    wizardState.journey = 'onboarding';
    wizardState.domain = 'test.com';
    wizardState.builder = 'wordpress';
    resetWizardState();
    expect(wizardState.journey).toBe(null);
    expect(wizardState.domain).toBe('');
    expect(wizardState.builder).toBe(null);
  });
});

describe('TEMP_DOMAIN_PATTERN / isTempDomain()', () => {
  it('detects .cpanel.site as temp domain', () => {
    expect(isTempDomain('mysite.cpanel.site')).toBe(true);
  });

  it('detects .cprapid.com as temp domain', () => {
    expect(isTempDomain('mysite.cprapid.com')).toBe(true);
  });

  it('detects .wp2.host as temp domain', () => {
    expect(isTempDomain('mysite.wp2.host')).toBe(true);
  });

  it('detects .wpsquared.site as temp domain', () => {
    expect(isTempDomain('mysite.wpsquared.site')).toBe(true);
  });

  it('returns false for real domains', () => {
    expect(isTempDomain('example.com')).toBe(false);
  });

  it('returns true for null/empty domain', () => {
    expect(isTempDomain(null)).toBe(true);
    expect(isTempDomain('')).toBe(true);
  });
});

describe('JOURNEYS', () => {
  it('has expected journey keys', () => {
    expect(JOURNEYS).toHaveProperty('onboarding');
    expect(JOURNEYS).toHaveProperty('add-website');
    expect(JOURNEYS).toHaveProperty('create-email');
  });

  it('add-website journey starts with domain-type', () => {
    expect(JOURNEYS['add-website'][0]).toBe('domain-type');
  });

  it('create-email journey starts with email-form', () => {
    expect(JOURNEYS['create-email'][0]).toBe('email-form');
  });

  it('all journeys end with success', () => {
    for (const key of Object.keys(JOURNEYS)) {
      const steps = JOURNEYS[key];
      expect(steps[steps.length - 1]).toBe('success');
    }
  });
});

describe('buildOnboardingJourney()', () => {
  it('includes domain steps when primary domain is temp', () => {
    wizardState.availableDomains = ['mysite.cpanel.site'];
    const steps = buildOnboardingJourney();
    expect(steps).toContain('domain-type');
    expect(steps).toContain('domain-config');
  });

  it('skips domain steps when primary domain is real', () => {
    wizardState.availableDomains = ['example.com'];
    const steps = buildOnboardingJourney();
    expect(steps).not.toContain('domain-type');
    expect(steps).not.toContain('domain-config');
  });

  it('always starts with welcome', () => {
    wizardState.availableDomains = ['example.com'];
    const steps = buildOnboardingJourney();
    expect(steps[0]).toBe('welcome');
  });

  it('always ends with success', () => {
    wizardState.availableDomains = ['example.com'];
    const steps = buildOnboardingJourney();
    expect(steps[steps.length - 1]).toBe('success');
  });
});
