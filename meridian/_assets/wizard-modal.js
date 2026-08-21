/* ═══════════════════════════════════════════════════════════════
   MODAL WIZARD — Reusable modal shell for step-based journeys
   and custom content dialogs.

   Depends on: wizard-steps.js (must be loaded first for journey mode)

   Usage:
     Journey mode:  modalWizard.open('add-website', { size: 'lg' })
     Content mode:  modalWizard.openContent({ title, body, footer, size, onMount, onClose })

   Sizes: 'sm' (480px), 'md' (640px), default (720px), 'lg' (860px)
   ═══════════════════════════════════════════════════════════════ */

// Size class lookup — maps size keys to CSS modifier classes
var WIZARD_MODAL_SIZES = {
  sm:  'wizard-modal--sm',   // 480px — confirmations, simple prompts
  md:  'wizard-modal--md',   // 640px — forms (email, database, etc.)
  lg:  'wizard-modal--lg',   // 860px — wide content, tables
  // default (no modifier) = 720px — choice grids, multi-step wizards
};

class ModalWizard {
  constructor() {
    this._overlay = null;
    this._built = false;
    this._mode = null;          // 'journey' | 'content'
    this._onCloseCallback = null;
    this._currentSize = null;
  }

  // Build DOM once, reuse across openings
  _build() {
    if (this._built) return;
    const overlay = document.createElement('div');
    overlay.className = 'wizard-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Setup wizard');
    overlay.innerHTML = `
      <div class="wizard-modal">
        <div class="wizard-modal-header">
          <ol class="wizard-modal-stepper" aria-label="Progress"></ol>
          <h2 class="wizard-modal-title" style="display:none;"></h2>
          <button type="button" class="wizard-modal-close" aria-label="Close">
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>
        <div class="wizard-modal-body"></div>
        <div class="wizard-modal-footer"></div>
      </div>`;
    document.body.appendChild(overlay);
    this._overlay = overlay;
    this._built = true;

    // Close button
    overlay.querySelector('.wizard-modal-close').addEventListener('click', () => this._handleClose());

    // Backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._handleClose();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._overlay.classList.contains('show')) {
        e.preventDefault();
        this._handleClose();
      }
    });
  }

  // ── Apply/remove size modifier ──
  _applySize(size) {
    const modal = this._overlay.querySelector('.wizard-modal');
    // Remove any existing size class
    Object.values(WIZARD_MODAL_SIZES).forEach(cls => modal.classList.remove(cls));
    this._currentSize = size || null;
    if (size && WIZARD_MODAL_SIZES[size]) {
      modal.classList.add(WIZARD_MODAL_SIZES[size]);
    }
  }

  // ── Journey mode (step-based wizard) ──
  open(journeyId, options = {}) {
    this._build();
    this._mode = 'journey';
    this._onCloseCallback = options.onClose || null;
    resetWizardState();
    wizardState.journey = journeyId;
    if (options.preFillDomain) {
      wizardState.preFillDomain = options.preFillDomain;
      wizardState.domain = options.preFillDomain;
    }
    if (options.availableDomains) {
      wizardState.availableDomains = options.availableDomains;
    }
    const steps = JOURNEYS[journeyId];
    if (!steps || steps.length === 0) return;

    // Apply size (use option, or default based on journey)
    this._applySize(options.size || null);

    // Hide title (journey uses stepper), show stepper
    this._overlay.querySelector('.wizard-modal-title').style.display = 'none';

    wizardState.currentStepIdx = 0;
    this._overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    this._renderStep(steps[0]);
    this._trapFocus();
  }

  // ── Content mode (custom HTML dialog) ──
  // options: { title, body, footer, size, onMount, onClose, ariaLabel }
  openContent(options = {}) {
    this._build();
    this._mode = 'content';
    this._onCloseCallback = options.onClose || null;

    const modal = this._overlay.querySelector('.wizard-modal');
    const titleEl = this._overlay.querySelector('.wizard-modal-title');
    const stepper = this._overlay.querySelector('.wizard-modal-stepper');
    const body = this._overlay.querySelector('.wizard-modal-body');
    const footer = this._overlay.querySelector('.wizard-modal-footer');

    // Size
    this._applySize(options.size || 'md');

    // Header — show title, hide stepper
    stepper.style.display = 'none';
    if (options.title) {
      titleEl.textContent = options.title;
      titleEl.style.display = '';
      this._overlay.setAttribute('aria-label', options.title);
    } else {
      titleEl.style.display = 'none';
      this._overlay.setAttribute('aria-label', options.ariaLabel || 'Dialog');
    }

    // Body
    body.style.animationName = 'wizardFadeUp';
    void body.offsetWidth;
    body.innerHTML = typeof options.body === 'string' ? options.body : '';

    // Footer
    if (options.footer) {
      footer.innerHTML = typeof options.footer === 'string' ? options.footer : '';
      footer.style.display = 'flex';
    } else {
      footer.style.display = 'none';
    }

    // Show
    this._overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Mount callback
    if (typeof options.onMount === 'function') {
      options.onMount(body, footer, {
        close: () => this.close(),
      });
    }

    // Focus first heading or first focusable
    const heading = body.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }

    this._trapFocus();
  }

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('show');
    document.body.style.overflow = '';

    if (this._mode === 'journey') {
      window.dispatchEvent(new CustomEvent('wizard-complete', { detail: { journey: wizardState.journey, state: { ...wizardState } } }));
    }

    if (typeof this._onCloseCallback === 'function') {
      this._onCloseCallback();
      this._onCloseCallback = null;
    }
  }

  _handleClose() {
    if (this._mode === 'content') {
      this.close();
      return;
    }

    // Journey mode — confirm if not on first step
    const steps = JOURNEYS[wizardState.journey];
    const isFirstStep = wizardState.currentStepIdx === 0;

    if (isFirstStep) {
      this.close();
    } else if (typeof showConfirm === 'function') {
      showConfirm('Are you sure?', 'Your progress will be lost.', () => this.close());
    } else if (confirm('Are you sure? Your progress will be lost.')) {
      this.close();
    }
  }

  _renderStep(stepId) {
    const step = WIZARD_STEPS[stepId];
    if (!step) return;

    const titleEl = this._overlay.querySelector('.wizard-modal-title');
    const body = this._overlay.querySelector('.wizard-modal-body');
    const footer = this._overlay.querySelector('.wizard-modal-footer');
    const stepper = this._overlay.querySelector('.wizard-modal-stepper');

    // Hide content-mode title
    titleEl.style.display = 'none';

    // Stepper — use dynamic config based on whether journey includes domain steps
    const sc = getStepperConfig(wizardState.journey);
    if (step.showStepper && sc.map[stepId] !== undefined) {
      stepper.style.display = 'flex';
      stepper.innerHTML = sc.labels.map((label, i) => {
        const stepperIdx = sc.map[stepId];
        const cls = i < stepperIdx ? 'completed' : i === stepperIdx ? 'active' : '';
        return `<li><div class="wizard-modal-step-dot ${cls}"></div><span class="sr-only">${label}</span></li>`;
      }).join('');
    } else {
      stepper.style.display = 'none';
    }

    // Body
    body.style.animationName = 'wizardFadeUp';
    void body.offsetWidth; // Force reflow
    body.innerHTML = step.render(wizardState);

    // Footer
    let continueEnabled = false;
    if (step.showFooter) {
      const prevStep = getPrevStep(wizardState.journey, stepId);
      const backHtml = prevStep
        ? `<button type="button" class="btn btn-ghost" id="wizardBack"><i class="ri-arrow-left-line" aria-hidden="true"></i> Back</button>`
        : '<div></div>';
      const icon = step.continueIcon ? `<i class="${step.continueIcon}" aria-hidden="true"></i> ` : '';
      const arrow = step.continueIcon ? '' : ' <i class="ri-arrow-right-line" aria-hidden="true"></i>';
      footer.innerHTML = `${backHtml}<button type="button" class="btn btn-primary btn-lg" id="wizardContinue" disabled>${icon}${step.continueLabel || 'Continue'}${arrow}</button>`;
      footer.style.display = 'flex';

      footer.querySelector('#wizardBack')?.addEventListener('click', () => {
        if (prevStep) {
          wizardState.currentStepIdx = JOURNEYS[wizardState.journey].indexOf(prevStep);
          this._renderStep(prevStep);
        }
      });
      footer.querySelector('#wizardContinue')?.addEventListener('click', () => {
        const next = getNextStep(wizardState.journey, stepId, wizardState);
        if (next) {
          wizardState.currentStepIdx = JOURNEYS[wizardState.journey].indexOf(next);
          this._renderStep(next);
        }
      });
    } else {
      footer.style.display = 'none';
    }

    // Mount step interactivity
    const callbacks = {
      advance: () => {
        const next = getNextStep(wizardState.journey, stepId, wizardState);
        if (next) {
          wizardState.currentStepIdx = JOURNEYS[wizardState.journey].indexOf(next);
          this._renderStep(next);
        }
      },
      back: () => {
        const prev = getPrevStep(wizardState.journey, stepId);
        if (prev) {
          wizardState.currentStepIdx = JOURNEYS[wizardState.journey].indexOf(prev);
          this._renderStep(prev);
        }
      },
      enableContinue: (enabled) => {
        const btn = footer.querySelector('#wizardContinue');
        if (btn) btn.disabled = !enabled;
      },
      goToStep: (targetStepId) => {
        const idx = JOURNEYS[wizardState.journey].indexOf(targetStepId);
        if (idx >= 0) {
          wizardState.currentStepIdx = idx;
          this._renderStep(targetStepId);
        }
      },
      closeModal: () => this.close(),
    };

    if (step.onMount) step.onMount(body, callbacks);

    // Focus heading
    const heading = body.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  }

  _trapFocus() {
    // Simple focus trap — keep focus within modal
    this._overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = this._overlay.querySelectorAll('button:not([disabled]), input, select, a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
}

// Global instance
const modalWizard = new ModalWizard();
