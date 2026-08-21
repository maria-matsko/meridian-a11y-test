import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadMeridianStack, loadWizardScripts } from '../helpers/load-script.js';
import { createFetchMock } from '../helpers/mock-fetch.js';

describe('Wizard flow — integration', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    window.CPANEL = {
      token: 'cpsessABCDEF1234',
      user: 'testuser',
      homedir: '/home/testuser',
    };

    // Load full stack + wizard scripts
    loadMeridianStack('prototype');
    loadWizardScripts();

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
    // Clean up any wizard overlay
    document.querySelectorAll('.wizard-modal-overlay').forEach(el => el.remove());
    document.body.style.overflow = '';
  });

  // ── Global availability ──

  it('exposes modalWizard globally', () => {
    expect(window.modalWizard).toBeDefined();
    expect(typeof window.modalWizard.open).toBe('function');
    expect(typeof window.modalWizard.close).toBe('function');
  });

  it('exposes wizardState globally', () => {
    expect(window.wizardState).toBeDefined();
    expect(window.wizardState).toHaveProperty('journey');
    expect(window.wizardState).toHaveProperty('currentStepIdx');
    expect(window.wizardState).toHaveProperty('domainType');
  });

  it('exposes JOURNEYS with expected journey types', () => {
    expect(window.JOURNEYS).toBeDefined();
    expect(window.JOURNEYS).toHaveProperty('onboarding');
    expect(window.JOURNEYS).toHaveProperty('add-website');
    expect(window.JOURNEYS).toHaveProperty('create-email');
  });

  // ── Wizard state management ──

  it('resetWizardState() clears all state', () => {
    window.wizardState.journey = 'onboarding';
    window.wizardState.domain = 'example.com';
    window.wizardState.builder = 'wordpress';
    window.resetWizardState();
    expect(window.wizardState.journey).toBeNull();
    expect(window.wizardState.domain).toBe('');
    expect(window.wizardState.builder).toBeNull();
  });

  it('isTempDomain() identifies temp domains', () => {
    expect(window.isTempDomain('example.cpanel.site')).toBe(true);
    expect(window.isTempDomain('example.cprapid.com')).toBe(true);
    expect(window.isTempDomain('example.com')).toBe(false);
  });

  // ── Opening the wizard ──

  it('open() creates modal overlay in DOM', () => {
    window.modalWizard.open('onboarding');
    const overlay = document.querySelector('.wizard-modal-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.classList.contains('show')).toBe(true);
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
  });

  it('open() sets journey in wizardState', () => {
    window.modalWizard.open('add-website');
    expect(window.wizardState.journey).toBe('add-website');
  });

  it('open() accepts preFillDomain option', () => {
    window.modalWizard.open('add-website', { preFillDomain: 'test.com' });
    expect(window.wizardState.preFillDomain).toBe('test.com');
    expect(window.wizardState.domain).toBe('test.com');
  });

  it('close() removes show class and dispatches wizard-complete', () => {
    const handler = vi.fn();
    window.addEventListener('wizard-complete', handler);
    window.modalWizard.open('onboarding');
    window.modalWizard.close();
    const overlay = document.querySelector('.wizard-modal-overlay');
    expect(overlay.classList.contains('show')).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('wizard-complete', handler);
  });

  // ── Step rendering ──

  it('renders welcome step content for onboarding', () => {
    window.modalWizard.open('onboarding');
    const body = document.querySelector('.wizard-modal-body');
    expect(body).not.toBeNull();
    // Welcome step should contain the heading and get started button
    expect(body.innerHTML).toContain('Your website starts here');
    expect(body.querySelector('[data-action="advance"]')).not.toBeNull();
  });

  it('renders domain-type step for add-website journey', () => {
    window.modalWizard.open('add-website');
    const body = document.querySelector('.wizard-modal-body');
    expect(body).not.toBeNull();
    // add-website starts with domain-type step
    expect(body.innerHTML).toContain('Which domain will you use?');
  });

  // ── Journey definitions ──

  it('buildOnboardingJourney() includes domain steps for temp domains', () => {
    window.wizardState.availableDomains = ['test.cpanel.site'];
    const steps = window.buildOnboardingJourney();
    expect(steps).toContain('domain-type');
    expect(steps).toContain('domain-config');
  });

  it('buildOnboardingJourney() skips domain steps for real domains', () => {
    window.wizardState.availableDomains = ['example.com'];
    const steps = window.buildOnboardingJourney();
    expect(steps).not.toContain('domain-type');
    expect(steps).toContain('builder');
    expect(steps).toContain('review');
  });

  // ── Stepper config ──

  it('getStepperConfig returns correct config for journey with domain steps', () => {
    // add-website has domain steps
    const config = window.getStepperConfig('add-website');
    expect(config.labels).toContain('Domain');
    expect(config.labels).toContain('Builder');
  });
});
