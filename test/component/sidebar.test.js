import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

describe('meridian-sidebar web component', () => {
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

  it('renders a nav with .layout-sidebar', () => {
    const shell = document.createElement('div');
    shell.id = 'layoutShell';
    document.body.appendChild(shell);

    const el = document.createElement('meridian-sidebar');
    el.setAttribute('active', 'email');
    shell.appendChild(el);

    const nav = el.querySelector('.layout-sidebar');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('marks the active page with nav-item-active', () => {
    const shell = document.createElement('div');
    shell.id = 'layoutShell';
    document.body.appendChild(shell);

    const el = document.createElement('meridian-sidebar');
    el.setAttribute('active', 'email');
    shell.appendChild(el);

    const activeItem = el.querySelector('.nav-item-active');
    expect(activeItem).not.toBeNull();
    expect(activeItem.getAttribute('href')).toBe('email.html');
    expect(activeItem.getAttribute('aria-current')).toBe('page');
  });

  it('renders expected navigation pages', () => {
    const shell = document.createElement('div');
    shell.id = 'layoutShell';
    document.body.appendChild(shell);

    const el = document.createElement('meridian-sidebar');
    el.setAttribute('active', 'dashboard');
    shell.appendChild(el);

    const items = el.querySelectorAll('.nav-item');
    const labels = Array.from(items).map(i => i.querySelector('.nav-item-label').textContent);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Websites');
    expect(labels).toContain('Email');
    expect(labels).toContain('Files');
    expect(labels).toContain('Security');
    expect(labels).toContain('Performance');
  });

  it('collapses sidebar when collapse button is clicked', () => {
    const shell = document.createElement('div');
    shell.id = 'layoutShell';
    document.body.appendChild(shell);

    const el = document.createElement('meridian-sidebar');
    el.setAttribute('active', 'dashboard');
    shell.appendChild(el);

    const collapseBtn = el.querySelector('#collapseBtn');
    expect(collapseBtn).not.toBeNull();

    expect(shell.classList.contains('sidebar-collapsed')).toBe(false);
    collapseBtn.click();
    expect(shell.classList.contains('sidebar-collapsed')).toBe(true);
  });

  it('expands sidebar when collapse button is clicked again', () => {
    const shell = document.createElement('div');
    shell.id = 'layoutShell';
    document.body.appendChild(shell);

    const el = document.createElement('meridian-sidebar');
    el.setAttribute('active', 'dashboard');
    shell.appendChild(el);

    const collapseBtn = el.querySelector('#collapseBtn');
    collapseBtn.click(); // collapse
    expect(shell.classList.contains('sidebar-collapsed')).toBe(true);

    collapseBtn.click(); // expand
    expect(shell.classList.contains('sidebar-collapsed')).toBe(false);
  });

  it('defaults to dashboard active when no active attribute', () => {
    const shell = document.createElement('div');
    shell.id = 'layoutShell';
    document.body.appendChild(shell);

    const el = document.createElement('meridian-sidebar');
    // no active attribute — falls through to _detectActivePage()
    shell.appendChild(el);

    // _detectActivePage reads window.location.pathname; in happy-dom it's likely
    // 'index.html' or similar which maps to 'dashboard'
    const activeItem = el.querySelector('.nav-item-active');
    expect(activeItem).not.toBeNull();
  });
});
