import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    document.documentElement.dataset.theme = 'dark';
    loadMeridianStack('prototype');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is available on window', () => {
    expect(typeof window.showToast).toBe('function');
  });

  it('creates a #toast element on load', () => {
    const toast = document.getElementById('toast');
    expect(toast).not.toBeNull();
    expect(toast.getAttribute('role')).toBe('status');
  });

  it('displays a success toast with the correct message', () => {
    window.showToast('Test message', 'success');
    const toast = document.getElementById('toast');
    const text = document.getElementById('toastText');
    expect(text.textContent).toBe('Test message');
    expect(toast.classList.contains('show')).toBe(true);
    expect(toast.classList.contains('toast-success')).toBe(true);
  });

  it('displays an error toast with correct type class', () => {
    window.showToast('Something failed', 'error');
    const toast = document.getElementById('toast');
    expect(toast.classList.contains('toast-error')).toBe(true);
    expect(toast.querySelector('i').className).toBe('ri-error-warning-line');
  });

  it('displays an info toast', () => {
    window.showToast('Info here', 'info');
    const toast = document.getElementById('toast');
    expect(toast.classList.contains('toast-info')).toBe(true);
    expect(toast.querySelector('i').className).toBe('ri-information-line');
  });

  it('displays a warning toast', () => {
    window.showToast('Be careful', 'warning');
    const toast = document.getElementById('toast');
    expect(toast.classList.contains('toast-warning')).toBe(true);
    expect(toast.querySelector('i').className).toBe('ri-alert-line');
  });

  it('auto-hides after 3500ms + 180ms fade', () => {
    window.showToast('Disappearing', 'success');
    const toast = document.getElementById('toast');
    expect(toast.classList.contains('show')).toBe(true);

    // At 3500ms the hiding class is added
    vi.advanceTimersByTime(3500);
    expect(toast.classList.contains('toast-hiding')).toBe(true);

    // At 3500 + 180ms the toast classes are reset
    vi.advanceTimersByTime(180);
    expect(toast.classList.contains('show')).toBe(false);
    expect(toast.classList.contains('toast-hiding')).toBe(false);
    expect(toast.className).toBe('toast');
  });

  it('replaces a previous toast when called again', () => {
    window.showToast('First', 'success');
    window.showToast('Second', 'error');
    const text = document.getElementById('toastText');
    expect(text.textContent).toBe('Second');
    const toast = document.getElementById('toast');
    expect(toast.classList.contains('toast-error')).toBe(true);
  });
});
