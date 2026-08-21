/* ═══════════════════════════════════════════════════════════════
   CREATE EMAIL MODAL — Shared component for creating email accounts.

   Depends on: wizard-modal.js (modalWizard must exist globally)

   Usage:
     createEmailModal.open({
       domains: ['example.com', 'shop.example.net'],
       onCreated: function(account) { ... }  // optional callback
     });
   ═══════════════════════════════════════════════════════════════ */

var createEmailModal = (function() {
  var _createMode = 'password';
  var _onCreated = null;

  function _getFormHtml(domains) {
    var domainOptions = '';
    for (var i = 0; i < domains.length; i++) {
      domainOptions += '<option value="' + esc(domains[i]) + '">' + esc(domains[i]) + '</option>';
    }
    return '<form id="createEmailForm" onsubmit="createEmailModal._handleSubmit(event); return false;">' +
      '<div class="form-group">' +
        '<label class="form-label" for="newEmailPrefix">Email Address</label>' +
        '<div class="form-row">' +
          '<input type="text" id="newEmailPrefix" class="form-input" placeholder="username" required autocomplete="off">' +
          '<span class="form-at">@</span>' +
          '<select id="newEmailDomain" class="form-select" aria-label="Email domain">' + domainOptions + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Authentication</label>' +
        '<div class="tab-switcher" role="tablist">' +
          '<button type="button" class="tab-switcher-btn active" onclick="createEmailModal._setMode(\'password\', this)" role="tab" aria-selected="true">Set Password</button>' +
          '<button type="button" class="tab-switcher-btn" onclick="createEmailModal._setMode(\'invite\', this)" role="tab" aria-selected="false">Send Login Link</button>' +
        '</div>' +
        '<div id="createModePassword">' +
          '<div class="form-row">' +
            '<input type="password" id="newPassword" class="form-input" placeholder="Enter password" required autocomplete="new-password" aria-describedby="passwordStrengthLabel">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="createEmailModal._generatePassword()" style="flex-shrink:0;">Generate</button>' +
          '</div>' +
          '<div class="password-strength" id="passwordStrength" data-strength="">' +
            '<div class="password-strength-segment"></div>' +
            '<div class="password-strength-segment"></div>' +
            '<div class="password-strength-segment"></div>' +
            '<div class="password-strength-segment"></div>' +
          '</div>' +
          '<div class="password-strength-label" id="passwordStrengthLabel" aria-live="polite"></div>' +
        '</div>' +
        '<div id="createModeInvite" style="display:none;">' +
          '<div class="form-hint" style="padding: var(--space-3) 0; color: var(--text-secondary);">' +
            '<i class="ri-mail-send-line" aria-hidden="true" style="margin-inline-end: var(--space-1);"></i> ' +
            'A password reset link will be sent so the user can set their own password.' +
          '</div>' +
          '<label for="inviteAlternateEmail" class="form-label">Recovery Email</label>' +
          '<input type="email" id="inviteAlternateEmail" class="form-input" placeholder="user@example.com" style="margin-top: var(--space-1);" aria-describedby="inviteEmailHint">' +
          '<div class="form-hint" id="inviteEmailHint" style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-1);">' +
            'The invite link will be sent to this address.' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="newQuota" class="form-label">Storage Quota (MB)</label>' +
        '<div style="display:flex; align-items:center; gap: var(--space-3);">' +
          '<input type="number" id="newQuota" class="form-input" value="500" min="1" style="flex:1;">' +
          '<label class="form-check">' +
            '<input type="checkbox" id="unlimitedQuota" onchange="document.getElementById(\'newQuota\').disabled = this.checked;"> Unlimited' +
          '</label>' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-4);">' +
        '<label class="form-label" style="margin-bottom: var(--space-3);">Options</label>' +
        '<label class="form-check" style="margin-bottom: var(--space-2);">' +
          '<input type="checkbox" id="createPlusAddressing"> Enable Plus Addressing (auto-create folders for user+tag@domain)' +
        '</label>' +
        '<label class="form-check">' +
          '<input type="checkbox" id="createWelcomeEmail" checked> Send welcome email with login details' +
        '</label>' +
      '</div>' +
    '</form>';
  }

  // ── Password helpers ──

  function _getPasswordStrength(pw) {
    if (!pw) return { score: 0, label: '', strength: '' };
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (pw.length >= 16) score++;
    if (score <= 2) return { score: 1, label: 'Weak', strength: 'weak' };
    if (score <= 3) return { score: 2, label: 'Fair', strength: 'fair' };
    if (score <= 4) return { score: 3, label: 'Good', strength: 'good' };
    return { score: 4, label: 'Strong', strength: 'strong' };
  }

  function _updatePasswordStrength() {
    var pw = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';
    var meter = document.getElementById('passwordStrength');
    var label = document.getElementById('passwordStrengthLabel');
    if (!meter || !label) return;
    var result = _getPasswordStrength(pw);
    meter.setAttribute('data-strength', result.strength);
    var segments = meter.querySelectorAll('.password-strength-segment');
    segments.forEach(function(seg, i) { seg.classList.toggle('filled', i < result.score); });
    label.textContent = pw ? result.label : '';
  }

  // ── Public API ──

  return {
    open: function(opts) {
      opts = opts || {};
      var domains = opts.domains || ['example.com'];
      _onCreated = opts.onCreated || null;
      _createMode = 'password';

      modalWizard.openContent({
        title: 'Create Email Account',
        size: 'md',
        body: _getFormHtml(domains),
        footer: '<button type="button" class="btn btn-secondary" onclick="modalWizard.close()">Cancel</button>' +
                '<button type="submit" form="createEmailForm" class="btn btn-primary" id="createSubmitBtn">' +
                '<i class="ri-add-line" aria-hidden="true"></i> Create Account</button>',
        onMount: function() {
          _updatePasswordStrength();
          setTimeout(function() {
            var el = document.getElementById('newEmailPrefix');
            if (el) el.focus();
          }, 100);
        }
      });
    },

    _setMode: function(mode, btn) {
      _createMode = mode;
      document.querySelectorAll('.tab-switcher-btn').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      var pwSection = document.getElementById('createModePassword');
      var inviteSection = document.getElementById('createModeInvite');
      var pwInput = document.getElementById('newPassword');
      if (mode === 'password') {
        pwSection.style.display = '';
        inviteSection.style.display = 'none';
        pwInput.required = true;
      } else {
        pwSection.style.display = 'none';
        inviteSection.style.display = '';
        pwInput.required = false;
      }
    },

    _generatePassword: function() {
      var chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
      var pw = '';
      for (var i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
      var inp = document.getElementById('newPassword');
      inp.type = 'text';
      inp.value = pw;
      _updatePasswordStrength();
    },

    _updateStrength: _updatePasswordStrength,

    _handleSubmit: function(event) {
      event.preventDefault();
      var prefix = document.getElementById('newEmailPrefix').value.trim().toLowerCase();
      var domain = document.getElementById('newEmailDomain').value;
      var password = document.getElementById('newPassword').value;
      var unlimited = document.getElementById('unlimitedQuota').checked;
      var quota = unlimited ? 0 : parseInt(document.getElementById('newQuota').value, 10);
      var fullEmail = prefix + '@' + domain;

      if (!prefix) { showToast('Please enter a username', 'error'); return false; }
      if (_createMode === 'password' && !password) { showToast('Please enter a password', 'error'); return false; }

      var account = {
        address: fullEmail,
        domain: domain,
        used: '0 MB', usedMB: 0,
        quota: unlimited ? 'Unlimited' : (quota >= 1024 ? (quota / 1024).toFixed(1) + ' GB' : quota + ' MB'),
        quotaMB: unlimited ? 0 : quota,
        status: 'Active',
        lastAccess: 'Never'
      };

      modalWizard.close();
      showToast('Account ' + fullEmail + ' created');

      if (_onCreated) _onCreated(account);
      return false;
    }
  };
})();

// Wire password strength via event delegation
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'newPassword' && document.getElementById('passwordStrength')) {
    createEmailModal._updateStrength();
  }
});
