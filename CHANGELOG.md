# Changelog

## 2026-03-26

### Strategy Change
- **Prototype-first development** — All active development now targets `prototype/` for customer feedback. The `meridian/` TT2 theme is no longer being updated. Production will be rebuilt in React.
- Stripped all real UAPI/API2 code from prototype pages (profile, index, security, databases, files). Prototype uses mock data only.
- Removed `isLive` branching, `loadLiveData()` functions, and full `CpanelAPI` objects from all 5 pages. Kept minimal `CpanelAPI` stub for `userKey()` localStorage scoping.

### New Features

#### Shared create email modal (`create-email-modal.js`)
- Extracted reusable email account creation into shared component
- Used by both dashboard quick action and email page
- Password/invite mode toggle, strength meter, domain selector, quota settings

#### Onboarding — DNS resolution status
- Success screen now shows DNS-aware two-state hero ("You're live!" vs "Almost there!")
- Nameserver display with copy-to-clipboard buttons
- Expandable help section with propagation timeline
- Demo toggle bar to simulate Connected / Not Resolving / Wrong IP states

#### Profile page redesign
- Centered single-column layout (max-width 860px) replacing two-column grid
- Two prioritized sections: "Account & Security" and "Preferences"
- 20 notification toggles in 5 collapsible `<details>` categories (Account Security, Resource Alerts, SSL & Certificates, Email Delivery, System)
- Merged Appearance & Language into single card
- "Restart Setup Wizard" moved to footer action
- Removed connection detection banner and loading screen

### Accessibility (Harden Pass)
- Added `aria-label` to all 20 notification toggle switches in profile
- Added `aria-label` to theme/layout option card buttons
- Made password visibility toggles context-specific ("confirm password", "current password", "new password", "Pushbullet token")
- Added `aria-controls` to tab buttons on security, databases, files, domains pages
- Added `role="tabpanel"` to tab content containers across all tabbed pages
- Updated `switchDetailTab()` in domains to maintain `aria-selected` state
- Added keyboard handlers (Enter/Space) to email sortable column headers
- Added keyboard navigation to file rows (Enter=open, Space=select, F2=rename)
- Fixed `sshKeyPassphrase` → `sshPassphrase` ID typo in security page

### Normalization Pass
- Added 45 CSS utility classes to `meridian.css`: layout (`u-flex`, `u-flex-center`, `u-flex-between`), spacing (`u-gap-*`, `u-mb-*`, `u-mt-*`, `u-p-*`), component patterns (`site-info-*`, `empty-state`)
- Replaced 107 inline styles with utility classes across 6 pages
- Added `site-info-section`, `site-info-title`, `site-info-card`, `site-info-row` component classes for JS-rendered detail views
- Added `empty-state` pattern class for consistent empty state visuals

### Performance (Optimize Pass)
- Fixed focus trap memory leak in `wizard-modal.js` — `_trapFocus()` now removes previous handler before adding new one
- Added `defer` to component scripts that load after inline code (wizard-steps, wizard-modal, create-email-modal)
- Added CSS `contain: layout style` to `.data-list`, `.card`, `.layout-sidebar` for isolated reflows
- Added 200ms debounce to email search input
- QRCode.js lazy-loaded on demand (from previous session)

### Dead Code Removal (Distill Pass)
- Removed `parseDiskUsageResult()` (57 lines) and `formatTimestamp()` (6 lines) from files.html
- Removed unused `pgPrefix` variable from databases.html, simplified 3 ternary expressions
- Fixed orphaned `showConfirm` reference in wizard-modal.js → replaced with actual `confirmAction()`

### Responsive (Adapt Pass)
- Increased `.btn-icon` touch target from 40px to 44px (WCAG 2.5.8)
- Increased database action buttons from 36px to 44px at 480px breakpoint
- Removed 32px inline size overrides from 7 file action buttons
- Added dashboard responsive breakpoints (768px tablet, 480px phone)
- Added mobile padding reduction for `.data-list-row` and `.data-list-head`

### Polish Pass
- Added `type="button"` to 64 buttons across domains, databases, email pages
- Removed TODO comment and dead code from wizard-steps.js
- Converted `href="#"` File Manager link to proper `<button>` in domains
- Added `:hover` state to `.form-input` and `.form-textarea`
- Added `:disabled` state to `.form-input`, `.form-textarea`, `.form-select`
- Added `:active` state to `.data-list-row` for click feedback
- Added `:focus-visible` styles for `.toggle-switch`, `.sortable[role="columnheader"]`, `.file-row`

### Theming Fixes
- Fixed hard-coded `#fff` on toggle switch knob → `var(--bg-surface)`
- Fixed hard-coded `white` on onboarding icon → `var(--text-inverse)`
- Fixed hard-coded `#fff`/`#000` in QR code → theme-aware colors
- Fixed hard-coded `#fff` in `.tfa-qr-code` CSS → `var(--bg-surface)`
- Replaced hard-coded confetti hex colors with `getComputedStyle()` reads from CSS variables

### Confetti Improvements
- Reduced from 45 to 28 particles (less DOM overhead)
- Burst pattern from center instead of rain from top
- Two quick waves (0s + 0.15s) instead of random 0–2s delays
- GPU-composited with `will-change: transform, opacity` and `translate3d`
- Natural deceleration easing instead of `ease-in`
- Mixed rectangular aspect ratios for realistic confetti shapes
- Fixed scrollbar flash by changing `.onboarding` from `overflow-x: hidden` to `overflow: hidden`

---

## 2026-03-19

### New Features

#### Onboarding — Smart contextual wizard
- Full-screen onboarding for first-time users with dynamic step detection
- Skips domain step if account already has a real domain (temp domain detection via `TEMP_DOMAIN_PATTERN`)
- Skips email step if `popaccts` feature is disabled
- Dynamic stepper dots adapt based on active steps
- Builder step is neutral — WordPress, Sitejet, and Custom Code presented equally
- Email choice auto-advances on selection
- Shared step engine (`wizard-steps.js`) powers both onboarding and modal wizard

#### Modal wizard for in-app actions
- Reusable `ModalWizard` class with blur backdrop, focus trap, Escape key support
- "Add Website" quick action on dashboard and websites page opens modal wizard
- Close confirmation after first step to prevent accidental data loss
- New SCSS component `_modal-wizard.scss` added to design system

#### Files page
- New Files nav item between Email and Security
- File Manager and Backups as tabbed sub-navigation
- Account-level backup management

#### Navigation updates
- "Add Domain" renamed to "Add Website" throughout (nav, search, buttons)
- Search bar moved to center of header (between brand and right actions)
- 6-item nav: Dashboard, Websites, Email, Files, Security, Performance

### Bug Fixes

#### Websites — Status hover tooltips completely broken
- **Root cause 1:** `esc()` uses `textContent`→`innerHTML` which does NOT escape `"` for attribute context. JSON containing `"` chars broke the `data-alerts="..."` HTML attribute silently. `JSON.parse` threw, `catch` returned silently, tooltip never appeared.
- **Root cause 2:** SSL objects missing `daysLeft` and `active` properties — `modernGetAlerts()` checks failed silently (`undefined !== null` is `true` but `undefined <= 0` is `false`), so most domains showed "Healthy" with no tooltip to hover.
- **Root cause 3:** Single-alert statuses rendered as plain `<span>` with no hover target.
- **Fix:** Rewrote tooltip system to store alert data in a JS `Map` (`_alertsByDomain`) keyed by domain name — no JSON serialization into HTML attributes. Event delegation via `modernBindListEvents` instead of inline `onmouseenter`/`onmouseleave`. Clean `StatusTooltip` IIFE encapsulates all tooltip state.
- Added `active: true/false` and `daysLeft` to all SSL objects (API mapping + defaults).

#### Onboarding — 404 on redirect
- `../onboarding/` resolved incorrectly from root-level pages. Fixed with absolute path extraction: `window.location.pathname.replace(/\/frontend\/meridian\/.*$/, '/frontend/meridian/') + 'onboarding/'`

#### Onboarding — Font flash (FOUT)
- Added `opacity: 0` with `document.fonts.ready` fade-in and 1s timeout fallback

#### Onboarding — Dashboard flash before redirect
- Moved onboarding redirect from body script to synchronous `<head>` script in master.html.tt

### Improvements

#### Cache busting — Shared version variable
- Single TT variable `[% av %]` in master.html.tt controls all asset cache busters — change one number to bust all caches

#### Websites — Competing CTAs cleaned up
- Sitejet CTAs gated with `!features.includes('wordpress')` to avoid competing with WordPress actions
- Settings tab: "Try Sitejet AI" → "Use Sitejet" with `ri-palette-line` icon

#### Copy & terminology updates
- "Start from scratch" → "Custom Code" with "Your code, your way" description
- "Use a new domain" → "Add another domain"
- Email skip: "No, skip for now" → "Skip — I'll add email later"
- Removed "Recommended" badge from Sitejet in onboarding

---

## 2026-03-18 (patch 2)

### Bug Fixes

#### Onboarding — First-login redirect not triggering
- `markOnboardingComplete()` wrote to an unscoped localStorage key (`meridian-onboarding-complete`) while the dashboard checked a user-scoped key (`meridian-onboarding-complete:username`) — they never matched
- Fixed all onboarding localStorage keys across 4 files to use `CpanelAPI.userKey()` consistently
- Dashboard now also checks the server-side `Personalization` API as a fallback, so onboarding status survives browser/device changes
- Syncs server result back to localStorage to avoid API calls on every page load

#### Onboarding — Dashboard flash before redirect
- The async Personalization API check allowed the dashboard to render briefly before redirecting to onboarding
- Dashboard body is now hidden (`visibility: hidden`) during the async check; revealed immediately on the sync localStorage fast path or after the API resolves

#### Websites — Status hover tooltips not working
- Single-alert status items were rendered as plain `<span>` elements with no hover target — only multi-alert items had the tooltip
- All status items now render inside a `.status-cell` with `onmouseenter`/`onmouseleave` handlers
- Added `cursor: help` and subtle hover background to `.status-cell` for visual affordance

#### Websites — confirmAction infinite recursion (from previous patch)
- Renamed page-level wrapper to `confirmDangerAction()` to avoid overwriting `window.confirmAction` from shell.js

### Changes

#### Light-first theme default
- Meridian now defaults to light mode for new users — better for partner systems embedding cPanel
- Dark mode remains fully supported and preserved for existing users who chose it
- Changed `data-theme="dark"` → `data-theme="light"` in master.html.tt, all prototype pages, and design-system.html
- Updated JS fallback in master.html.tt, profile page appearance settings

#### Theme preference persisted to server
- Dark/light mode preference is now saved via `Personalization::set` (`meridian_theme` key) in addition to localStorage
- On page load, if no localStorage preference exists, fetches from server and caches locally — prevents FOUC while ensuring cross-device persistence
- Toggle in header, profile page appearance settings, all save to both localStorage and server

---

## 2026-03-18 (patch 1)

## Bug Fixes

### Onboarding — Domain limit not detected (Critical)
- The onboarding wizard allowed users to proceed all the way to "Launch" even when their account had reached its addon domain or subdomain limit
- Now checks limits via `StatsBar::get_stats` when the domain step loads and disables the "Use a new domain" and "Create a subdomain" cards with a message like "Addon domain limit reached (10/10)"
- If StatsBar is unavailable, the launch step still catches the error from the server and displays it to the user instead of silently continuing

### Onboarding — Password strength validation too weak (Critical)
- Client-side password validation only required 8 characters, but cPanel's server-side check requires a strength rating of 65+ (configurable per server)
- Now fetches the actual required strength from `PasswdStrength::get_required_strength` with `app=pop` when the email step loads
- Replaced the arbitrary 0–5 scoring with `estimatePasswordStrength()`, a JS approximation of cPanel's entropy-based algorithm (distinct character count × log₂ of symbol pool size, mapped against a 70-bit threshold)
- Strength meter labels now dynamically reflect the server's configured threshold
- If the server still rejects the password (estimate was off), the launch step catches the "strength" error and shows it to the user

### Onboarding — Personalization API format wrong (High)
- `setPersonalization()` used `callPost` (form-encoded with a JSON string), but `Personalization::set` expects a JSON body with `{personalization: {key: value}}`
- Changed to use `callJson` with the object passed directly — fixes "must contain a personalization property" errors

### Onboarding — Cascading failures after domain creation fails (High)
- Domain creation (addon or subdomain) is now a hard gate — if it fails, the launch stops immediately and shows the error
- Previously, domain failure was silently caught with `console.warn`, then email creation and Sitejet/WordPress setup would also fail because the domain didn't exist

### Websites — Remove domain infinite recursion crash (Critical)
- Clicking "Remove Domain" or "Remove Redirect" triggered `Maximum call stack size exceeded`
- The page defined its own `confirmAction()` which overwrote `window.confirmAction` from shell.js, then called `window.confirmAction` — which was now itself
- Renamed the page-level wrapper to `confirmDangerAction()` and updated both callers (`handleRemoveDomain`, `handleDeleteRedirect`)

### Shared — Cache buster bump
- Bumped `cpanel-api.js` from `?v=6` to `?v=7` in master.html.tt to ensure browsers pick up the new API client

## New Features & Enhancements

### Shell — Mobile responsive header
- Added hamburger menu button for mobile nav drawer
- Added mobile search button in header
- Avatar now opens a dropdown menu with Profile and Log Out options (replaces direct profile link)

### Shell — Confirm dialog component
- Shared `window.confirmAction()` for modal confirmations with danger/warning variants

### Shell — Avatar dropdown
- Profile link and logout button in a dropdown menu on the avatar, with click-outside-to-close

### Shared API Client (`cpanel-api.js`)
- Added `userKey()` — scopes localStorage keys per cPanel user to prevent cross-user data leaks on shared hostname:port
- Added `getPersonalization()` / `setPersonalization()` — Personalization UAPI wrappers for persistent user preferences
- Features cache now uses user-scoped localStorage key
- Dispatches `meridian-features-loaded` event after feature list loads
- Usage rendering (`renderPrimaryUsage`, `renderUsageTable`, `renderUsageCards`) now uses semantic CSS classes and escapes output with `esc()`

### Master template
- Added `chromeless` parameter — suppresses shell.js for pages like onboarding that render their own layout
- Moved shell.js from bottom of body to head (conditional on `chromeless`)

### Design System (SCSS + CSS)
- New components: alert-card, breadcrumb, data-list, domain-grid, metrics, module-card, onboarding-flow, quick-stats, setting-row, site-hero, ssl-detail, suggestion, tab-indicators, tool-card, view-toggle
- Updated resource-bar with usage-gauge and usage-table classes
- Added usage-grid component
- Theme token updates

### Pages
- **Dashboard** — Refactored with Modern/Classic view toggle, live API data, greeting
- **Email** — Major expansion with account management, forwarders, autoresponders
- **Websites** — Expanded settings panel, redirect management, DNS management, domain removal
- **Files** — File Manager integration, backup management
- **Databases** — MySQL database and user management
- **Security** — SSL details, ModSecurity, 2FA management
- **Performance** — New page with resource monitoring, PHP version management
- **Profile** — Contact info, notification preferences
- **Sitejet** — Publishing flow refinements
- **Onboarding** — Complete rewrite with step-based wizard flow

### Prototype
- All prototype pages updated to match Meridian theme changes
- Removed prototype deploy.sh (deploy only from meridian/)
- Shared shell components updated with mobile support and avatar dropdown
