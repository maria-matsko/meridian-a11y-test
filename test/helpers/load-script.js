import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../../');

/**
 * Evaluate a JS file in the current happy-dom window context.
 * This mimics a browser <script> tag — all globals land on `window`.
 * @param {string} relativePath - path relative to project root
 */
export function loadScript(relativePath) {
  const code = readFileSync(resolve(ROOT, relativePath), 'utf-8');
  const fn = new Function(code);
  fn.call(window);
}

/**
 * Evaluate a JS file in true global scope so that `var` declarations
 * become window properties (matching browser <script> behavior).
 * Use this for scripts that define globals with `var` instead of
 * explicit `window.X = ...` assignment (e.g. wizard-steps.js).
 * @param {string} relativePath - path relative to project root
 */
export function loadScriptGlobal(relativePath) {
  const code = readFileSync(resolve(ROOT, relativePath), 'utf-8');
  // Indirect eval runs in global scope, so `var` declarations become global
  (0, eval)(code);
}

/**
 * Load the standard Meridian script stack in correct dependency order.
 * cpanel-api.js → i18n.js → shell.js
 * @param {'prototype'|'meridian'} variant - which shell.js to load
 */
export function loadMeridianStack(variant = 'prototype') {
  loadScript('meridian/_assets/cpanel-api.js');
  loadScript('meridian/_assets/i18n.js');
  if (variant === 'prototype') {
    loadScript('prototype/components/shell.js');
  } else {
    loadScript('meridian/_assets/shell.js');
  }
}

/**
 * Load wizard scripts (must be called after loadMeridianStack).
 * Uses loadScriptGlobal because wizard scripts declare globals with `var`.
 * wizard-modal.js uses `class` and `const` which are block-scoped even
 * in indirect eval, so we patch them to attach to `window` explicitly.
 */
export function loadWizardScripts() {
  loadScriptGlobal('prototype/components/wizard-steps.js');

  // wizard-modal.js uses `class ModalWizard` and `const modalWizard`
  // which don't become global even with indirect eval. Wrap them.
  let code = readFileSync(resolve(ROOT, 'prototype/components/wizard-modal.js'), 'utf-8');
  code = code.replace(
    /^class ModalWizard/m,
    'window.ModalWizard = class ModalWizard'
  );
  code = code.replace(
    /^const modalWizard\b/m,
    'window.modalWizard'
  );
  (0, eval)(code);
}
