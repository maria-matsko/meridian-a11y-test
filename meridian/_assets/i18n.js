/* ═══════════════════════════════════════════════════════════════
   Meridian — Internationalization Runtime
   ═══════════════════════════════════════════════════════════════
   Lightweight i18n system (~40 lines of core logic).

   Design principles:
   - English strings in code ARE the keys (no separate en.json)
   - Only non-English locales have translation files
   - Zero overhead for English users (passthrough)
   - Automatic string extraction via grep

   Usage:
     t('Email Accounts')                     → simple lookup
     t('{0} of {1}', used, max)              → positional interpolation
     t('{n} domain | {n} domains', {n: 5})   → plurals (singular | plural)
     t('Hello {name}', {name: 'Jesse'})      → named interpolation

   Translation files: meridian/_assets/locale/<tag>.json
     { "Email Accounts": "Cuentas de correo", ... }
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var _locale = {};     // loaded translations (empty = English / not loaded)
  var _tag = 'en';      // current locale tag
  var _dir = 'ltr';     // text direction
  var _loaded = false;

  // Locales that have translation files deployed.
  // Add a tag here when its JSON file is available in _assets/locale/.
  var SUPPORTED_LOCALES = ['es'];

  /**
   * Translate a string.
   * @param {string} str - English source string (also the lookup key)
   * @param {...*} args - interpolation values (positional or object)
   * @returns {string} translated string
   */
  function t(str) {
    // Look up translation; fall back to English source string
    var translated = _locale[str] || str;

    // Handle plurals: "1 item | {n} items" separated by " | "
    if (translated.indexOf(' | ') !== -1) {
      var parts = translated.split(' | ');
      var vars = arguments.length > 1 && typeof arguments[1] === 'object' ? arguments[1] : {};
      var n = vars.n !== undefined ? vars.n : (vars.count !== undefined ? vars.count : 1);
      translated = (n === 1) ? parts[0] : parts[1];
    }

    // Interpolate variables
    if (arguments.length > 1) {
      var args = arguments;
      if (typeof args[1] === 'object' && args[1] !== null) {
        // Named: t('Hello {name}', {name: 'Jesse'})
        var vars = args[1];
        translated = translated.replace(/\{(\w+)\}/g, function(m, key) {
          return vars[key] !== undefined ? String(vars[key]) : m;
        });
      } else {
        // Positional: t('{0} of {1}', used, max)
        for (var i = 1; i < args.length; i++) {
          translated = translated.split('{' + (i - 1) + '}').join(String(args[i]));
        }
      }
    }

    return translated;
  }

  /**
   * Load a locale file. Called once on page init.
   * @param {string} tag - locale tag (e.g. 'es', 'de', 'fr', 'zh_tw')
   * @param {string} [basePath] - path to locale directory
   * @returns {Promise}
   */
  function loadLocale(tag, basePath) {
    _tag = tag || 'en';
    if (_tag === 'en' || SUPPORTED_LOCALES.indexOf(_tag) === -1) {
      _loaded = true;
      return Promise.resolve();
    }

    var path = (basePath || '../_assets/locale') + '/' + _tag + '.json';
    return fetch(path, { credentials: 'same-origin' })
      .then(function(resp) {
        if (!resp.ok) throw new Error('Locale file not found: ' + path);
        return resp.json();
      })
      .then(function(data) {
        _locale = data || {};
        _loaded = true;
      })
      .catch(function() {
        // Locale file not available — fall back to English silently
        _locale = {};
        _loaded = true;
      });
  }

  /**
   * Set text direction (called after locale attributes are loaded).
   * @param {string} dir - 'ltr' or 'rtl'
   */
  function setDirection(dir) {
    _dir = dir || 'ltr';
    document.documentElement.setAttribute('dir', _dir);
  }

  /**
   * Get current locale info.
   */
  function getLocaleInfo() {
    return { tag: _tag, dir: _dir, loaded: _loaded };
  }

  /**
   * Remove the i18n-loading cloak after translations are applied.
   * Adds i18n-ready first to trigger the opacity transition.
   */
  function _revealPage() {
    var root = document.documentElement;
    root.classList.add('i18n-ready');
    // Remove both classes after transition completes
    setTimeout(function() { root.classList.remove('i18n-loading', 'i18n-ready'); }, 200);
  }

  /**
   * Auto-detect and load the user's locale from cPanel.
   * Call this once from master.html.tt or page init.
   */
  function initLocale() {
    if (!window.CpanelAPI || !window.CpanelAPI.isInsideCpanel()) {
      _loaded = true;
      _revealPage();
      return Promise.resolve();
    }

    return window.CpanelAPI.call('Locale', 'get_attributes')
      .then(function(r) {
        var data = r.data || {};
        var tag = data.locale || 'en';
        var dir = data.direction || 'ltr';
        // Cache locale so next page load can hide body before paint
        try { localStorage.setItem('meridian-locale', tag); } catch(e) {}
        setDirection(dir);
        return loadLocale(tag);
      })
      .then(function() {
        // Translate static HTML elements with data-t after locale is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() { translateDOM(); _revealPage(); });
        } else {
          translateDOM();
          _revealPage();
        }
      })
      .catch(function() {
        _loaded = true; // fail-open: English
        _revealPage();
      });
  }

  /**
   * Translate all elements with [data-t] attribute.
   * Replaces textContent with t(textContent). Call after DOM is ready
   * and locale is loaded. Safe to call multiple times.
   */
  function translateDOM() {
    document.querySelectorAll('[data-t]').forEach(function(el) {
      var original = el.getAttribute('data-t-src') || el.textContent.trim();
      if (!original) return;
      // Store original English text for re-translation on locale switch
      if (!el.getAttribute('data-t-src')) el.setAttribute('data-t-src', original);
      el.textContent = t(original);
    });
    // Notify components that translations are ready (for shell nav, search, etc.)
    document.dispatchEvent(new CustomEvent('meridian-locale-ready'));
  }

  // Expose globally
  window.t = t;
  window.loadLocale = loadLocale;
  window.setDirection = setDirection;
  window.getLocaleInfo = getLocaleInfo;
  window.initLocale = initLocale;
  window.translateDOM = translateDOM;
  window.MERIDIAN_LOCALES = SUPPORTED_LOCALES;
})();
