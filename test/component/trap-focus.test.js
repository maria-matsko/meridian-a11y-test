import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

describe('trapFocus', () => {
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

  it('is available on window', () => {
    expect(typeof window.trapFocus).toBe('function');
  });

  it('wraps Tab from last element to first', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button'); btn1.textContent = 'First';
    const btn2 = document.createElement('button'); btn2.textContent = 'Second';
    const btn3 = document.createElement('button'); btn3.textContent = 'Third';
    container.append(btn1, btn2, btn3);
    document.body.appendChild(container);

    const cleanup = window.trapFocus(container);

    // Focus the last button
    btn3.focus();
    expect(document.activeElement).toBe(btn3);

    // Simulate Tab on last button — should wrap to first
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(btn1);

    cleanup();
  });

  it('wraps Shift+Tab from first element to last', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button'); btn1.textContent = 'First';
    const btn2 = document.createElement('button'); btn2.textContent = 'Second';
    const btn3 = document.createElement('button'); btn3.textContent = 'Third';
    container.append(btn1, btn2, btn3);
    document.body.appendChild(container);

    const cleanup = window.trapFocus(container);

    // Focus the first button
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // Simulate Shift+Tab on first button — should wrap to last
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(btn3);

    cleanup();
  });

  it('returns a cleanup function that removes the trap', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button'); btn1.textContent = 'First';
    const btn2 = document.createElement('button'); btn2.textContent = 'Second';
    container.append(btn1, btn2);
    document.body.appendChild(container);

    const cleanup = window.trapFocus(container);
    cleanup();

    // After cleanup, Tab on last should NOT wrap (no preventDefault)
    btn2.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(tabEvent);
    // Focus should still be on btn2 (no trap to move it)
    // The browser would normally move it, but in happy-dom without a trap it stays
    expect(tabEvent.defaultPrevented).toBe(false);
  });

  it('does nothing for non-Tab keys', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button'); btn1.textContent = 'First';
    container.appendChild(btn1);
    document.body.appendChild(container);

    const cleanup = window.trapFocus(container);

    btn1.focus();
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(false);

    cleanup();
  });
});
