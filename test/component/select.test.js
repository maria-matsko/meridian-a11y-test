import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadMeridianStack } from '../helpers/load-script.js';

describe('MeridianSelect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    document.documentElement.dataset.theme = 'dark';
    // Reset the outside click listener flag so each test gets a clean state
    delete window._meridianSelectOutsideListener;
    loadMeridianStack('prototype');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('is available on window', () => {
    expect(window.MeridianSelect).toBeDefined();
    expect(typeof window.MeridianSelect.enhance).toBe('function');
  });

  it('enhances a native select into a custom dropdown', () => {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
      <option value="c">Gamma</option>
    `;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    const dropdown = window.MeridianSelect.enhance(select);
    expect(dropdown).not.toBeNull();
    expect(dropdown.classList.contains('custom-dropdown')).toBe(true);

    // Native select should be hidden
    expect(select.style.display).toBe('none');
    expect(select.dataset.meridianEnhanced).toBe('1');

    // Custom dropdown should have 3 items
    const items = dropdown.querySelectorAll('.custom-dropdown-item');
    expect(items.length).toBe(3);
  });

  it('shows the first option as selected by default', () => {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
    `;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    const dropdown = window.MeridianSelect.enhance(select);
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    expect(trigger.querySelector('.dropdown-label').textContent).toBe('Alpha');
  });

  it('calls onChange callback when an item is selected', () => {
    const onChange = vi.fn();
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
      <option value="c">Gamma</option>
    `;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    const dropdown = window.MeridianSelect.enhance(select, { onChange });

    // Open the dropdown
    dropdown.querySelector('.custom-dropdown-trigger').click();
    expect(dropdown.classList.contains('is-open')).toBe(true);

    // Click the second item
    const items = dropdown.querySelectorAll('.custom-dropdown-item');
    items[1].click();

    expect(onChange).toHaveBeenCalledWith('b', 'Beta');
    expect(select.value).toBe('b');
    // Dropdown should be closed after selection
    expect(dropdown.classList.contains('is-open')).toBe(false);
  });

  it('does not enhance the same select twice', () => {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `<option value="a">Alpha</option>`;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    window.MeridianSelect.enhance(select);
    const result = window.MeridianSelect.enhance(select);
    // Second call returns undefined (skipped)
    expect(result).toBeUndefined();
  });

  it('opens and closes via trigger button', () => {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
    `;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    const dropdown = window.MeridianSelect.enhance(select);
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');

    trigger.click();
    expect(dropdown.classList.contains('is-open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    trigger.click();
    expect(dropdown.classList.contains('is-open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens via keyboard Enter on trigger', () => {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `<option value="a">Alpha</option><option value="b">Beta</option>`;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    const dropdown = window.MeridianSelect.enhance(select);
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(dropdown.classList.contains('is-open')).toBe(true);
  });

  it('applies small size class when size option is sm', () => {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');
    select.innerHTML = `<option value="a">Alpha</option>`;
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    const dropdown = window.MeridianSelect.enhance(select, { size: 'sm' });
    expect(dropdown.classList.contains('custom-dropdown--sm')).toBe(true);
  });
});
