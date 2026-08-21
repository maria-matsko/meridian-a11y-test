import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

describe('confirmAction', () => {
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
    expect(typeof window.confirmAction).toBe('function');
  });

  it('creates an overlay with title and message', async () => {
    const promise = window.confirmAction({
      title: 'Delete?',
      message: 'Are you sure?',
      confirmLabel: 'Delete',
      danger: true,
    });
    // Let requestAnimationFrame run
    vi.advanceTimersByTime(16);

    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.querySelector('.confirm-title').textContent).toBe('Delete?');
    expect(overlay.querySelector('.confirm-message').textContent).toBe('Are you sure?');
    expect(overlay.querySelector('.confirm-ok').textContent).toBe('Delete');
    expect(overlay.querySelector('.confirm-icon-danger')).not.toBeNull();

    // Clean up: click cancel to resolve promise
    overlay.querySelector('.confirm-cancel').click();
    vi.advanceTimersByTime(200);
    await promise;
  });

  it('resolves true when confirm button is clicked', async () => {
    const promise = window.confirmAction({
      title: 'Confirm?',
      message: 'Proceed?',
      confirmLabel: 'Yes',
    });
    vi.advanceTimersByTime(16);

    const overlay = document.querySelector('.confirm-overlay');
    overlay.querySelector('.confirm-ok').click();
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves false when cancel button is clicked', async () => {
    const promise = window.confirmAction({
      title: 'Confirm?',
      message: 'Proceed?',
    });
    vi.advanceTimersByTime(16);

    const overlay = document.querySelector('.confirm-overlay');
    overlay.querySelector('.confirm-cancel').click();
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves false when Escape key is pressed', async () => {
    const promise = window.confirmAction({
      title: 'Escape test',
      message: 'Press escape',
    });
    vi.advanceTimersByTime(16);

    const overlay = document.querySelector('.confirm-overlay');
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('removes the overlay from the DOM after closing', async () => {
    const promise = window.confirmAction({ title: 'Remove test' });
    vi.advanceTimersByTime(16);

    const overlay = document.querySelector('.confirm-overlay');
    overlay.querySelector('.confirm-cancel').click();
    vi.advanceTimersByTime(300);
    await promise;

    expect(document.querySelector('.confirm-overlay')).toBeNull();
  });

  it('uses non-danger styling when danger is false', async () => {
    const promise = window.confirmAction({
      title: 'Safe action',
      message: 'Nothing dangerous',
      danger: false,
    });
    vi.advanceTimersByTime(16);

    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay.querySelector('.confirm-icon-info')).not.toBeNull();
    expect(overlay.querySelector('.confirm-ok').classList.contains('btn-primary')).toBe(true);

    overlay.querySelector('.confirm-cancel').click();
    vi.advanceTimersByTime(200);
    await promise;
  });
});
