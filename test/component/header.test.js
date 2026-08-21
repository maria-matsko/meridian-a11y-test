import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

describe('meridian-header web component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    document.documentElement.dataset.theme = 'dark';
    loadMeridianStack('prototype');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders a header with .layout-header', () => {
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const header = el.querySelector('.layout-header');
    expect(header).not.toBeNull();
  });

  it('renders the theme toggle button', () => {
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const toggle = el.querySelector('#headerThemeToggle');
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-label')).toBe('Toggle dark mode');
  });

  it('renders the avatar menu button', () => {
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const avatarBtn = el.querySelector('#avatarMenuBtn');
    expect(avatarBtn).not.toBeNull();
    expect(avatarBtn.getAttribute('aria-haspopup')).toBe('true');
    expect(avatarBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses provided initials and user-name attributes', () => {
    const el = document.createElement('meridian-header');
    el.setAttribute('initials', 'AB');
    el.setAttribute('user-name', 'Alice Bob');
    document.body.appendChild(el);

    const avatarBtn = el.querySelector('#avatarMenuBtn');
    expect(avatarBtn.textContent).toBe('AB');
    expect(avatarBtn.getAttribute('aria-label')).toContain('Alice Bob');
  });

  it('toggles theme on click', () => {
    document.documentElement.dataset.theme = 'dark';
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const toggle = el.querySelector('#headerThemeToggle');
    toggle.click();
    expect(document.documentElement.dataset.theme).toBe('light');

    toggle.click();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('opens avatar dropdown on click', () => {
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const avatarBtn = el.querySelector('#avatarMenuBtn');
    const dropdown = el.querySelector('#avatarDropdown');

    expect(dropdown.classList.contains('is-open')).toBe(false);
    avatarBtn.click();
    expect(dropdown.classList.contains('is-open')).toBe(true);
    expect(avatarBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes avatar dropdown on second click', () => {
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const avatarBtn = el.querySelector('#avatarMenuBtn');
    const dropdown = el.querySelector('#avatarDropdown');

    avatarBtn.click();
    expect(dropdown.classList.contains('is-open')).toBe(true);

    avatarBtn.click();
    expect(dropdown.classList.contains('is-open')).toBe(false);
    expect(avatarBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders the brand text', () => {
    const el = document.createElement('meridian-header');
    document.body.appendChild(el);

    const brand = el.querySelector('.header-brand');
    expect(brand).not.toBeNull();
    expect(brand.textContent).toContain('cPanel');
  });
});
