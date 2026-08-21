# Meridian — cPanel Design System & Prototype

> **Note:** The `meridian/` theme (TT2 + UAPI) is no longer being updated. All development effort is focused on the `prototype/` directory as we prepare to rebuild the production interface in React. The prototype serves as the design reference and customer feedback vehicle.

Meridian is a next-generation design system and prototype that reimagines the cPanel user experience. It shifts from a feature-organized "toolbox" to a task-oriented interface where users accomplish goals — not hunt for tools.

## What's in This Repo

```
cpanel-design-system/
├── prototype/                   # Active development — standalone HTML prototype
│   ├── meridian.css             # Design system stylesheet (hand-edited + SCSS compiled)
│   ├── components/              # Shared web components
│   │   ├── shell.js             # Header, sidebar, search, toast, confirm dialog
│   │   ├── wizard-modal.js      # Shared modal wizard (journey + content modes)
│   │   ├── wizard-steps.js      # Step definitions for onboarding + add-website wizards
│   │   └── create-email-modal.js # Shared create email account modal
│   ├── index.html               # Dashboard (Modern + Classic views)
│   ├── domains.html             # Websites (domains, DNS, SSL, PHP, Sitejet, WordPress)
│   ├── email.html               # Email (accounts, forwarders, filters)
│   ├── files.html               # Files (file manager, FTP, disk usage, backups)
│   ├── databases.html           # Databases (MySQL, PostgreSQL, remote access)
│   ├── security.html            # Security (SSL, WAF, 2FA, SSH, API tokens, IP blocking)
│   ├── performance.html         # Performance (resource monitoring, PHP)
│   ├── onboarding.html          # Get Started (guided wizard with DNS status)
│   └── profile.html             # Profile (contact, password, 2FA, appearance, notifications)
│
├── scss/                        # Design system source (SCSS)
│   ├── meridian.scss            # Main entry point
│   ├── tokens/                  # Design tokens (typography, spacing, colors, motion)
│   ├── base/                    # Reset, typography classes, a11y utilities
│   ├── components/              # 50+ UI components
│   ├── layout/                  # Shell layout (sidebar + header + content grid)
│   └── _animations.scss         # Keyframes and entrance animations
│
├── design-system.html           # Visual component reference / style guide
├── meridian/                    # Legacy cPanel theme (TT2 — not actively maintained)
└── CHANGELOG.md                 # Release changelog
```

## Running the Prototype

Open any HTML file directly in a browser — no server required. All pages use mock data.

For a local server (enables proper cross-page navigation):
```bash
cd prototype && python3 -m http.server 8080
# Open http://localhost:8080/
```

## Key Design Principles

- **Goal-oriented navigation** — Pages organized by what users want to do (Websites, Email, Files) rather than technical feature names
- **Progressive disclosure** — Show what matters first, reveal complexity on demand
- **Consistent component language** — Shared tokens, components, and patterns across every page
- **Light-first, theme-aware** — Defaults to light mode; full dark mode support via toggle
- **Accessibility-first** — WCAG 2.1 AA with proper ARIA, keyboard navigation, focus indicators, `prefers-reduced-motion`
- **RTL-ready** — Logical properties (`inline-start`/`inline-end`) throughout

## Technology

| Layer | Technology |
|-------|-----------|
| **Design tokens** | SCSS variables + CSS custom properties |
| **Theming** | `[data-theme="dark\|light"]` on `<html>` |
| **Typography** | Plus Jakarta Sans, Instrument Serif, JetBrains Mono |
| **Icons** | [Remix Icons](https://remixicon.com/) v4.6 |
| **Components** | Pure CSS + Light DOM web components |
| **Shell** | Custom Elements (`<meridian-header>`, `<meridian-sidebar>`) |
| **Search** | Command palette (Cmd/Ctrl+K) + inline header search |

## Shared Components

### `shell.js` — Layout & Utilities
- `<meridian-header>` — Header with search, theme toggle, notifications, avatar dropdown
- `<meridian-sidebar>` — Left navigation with collapse, mobile drawer
- `showToast(message, type)` — Toast notifications (success, error, info, warning)
- `confirmAction(opts)` — Confirm dialog with danger/info variants
- `esc(str)` — HTML escape utility
- Mobile responsive: hamburger menu, mobile search, touch-friendly nav drawer

### `wizard-modal.js` — Modal Wizard
- `modalWizard.open(journeyId)` — Journey mode with stepper
- `modalWizard.openContent(options)` — Content mode for custom dialogs
- Focus trap, Escape key, backdrop click to close

### `wizard-steps.js` — Step Engine
- Shared step definitions for onboarding and add-website wizards
- DNS status check simulation on success screen
- Confetti celebration animation

### `create-email-modal.js` — Email Account Creation
- Shared modal for creating email accounts from dashboard or email page
- Password/invite mode, strength meter, quota settings

## SCSS Compilation

```bash
npx sass scss/meridian.scss prototype/meridian.css --no-source-map
```

**Important:** `prototype/meridian.css` contains 87+ hand-edited classes not in SCSS. Never overwrite it with a fresh compile — append new SCSS output or edit the CSS directly.

## Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Usage gauges, health overview, quick actions, recent activity. Modern/Classic view toggle. First-login redirects to onboarding. |
| **Websites** | Domain list with hierarchy, detail panel per domain, DNS editor, SSL status, PHP versions, redirects, Sitejet/WordPress integration |
| **Email** | Email accounts with storage bars, forwarders, filters, autoresponders, webmail links |
| **Files** | File manager with breadcrumb nav, toolbar, context menus, FTP accounts, disk usage, backups |
| **Databases** | MySQL/PostgreSQL databases and users, remote access, phpMyAdmin link, create wizards |
| **Security** | SSL certificates with score ring, ModSecurity WAF, 2FA with QR codes, SSH keys, API tokens, IP blocking |
| **Performance** | Resource monitoring, PHP version management |
| **Get Started** | Guided onboarding wizard: domain setup, email creation, builder choice, DNS status check |
| **Profile** | Contact info, password change, 2FA management, appearance, language, notification preferences (20 toggles in 5 collapsible categories) |

## License

Copyright 2026 WebPros International, LLC. All rights reserved.
