// Guard against double-registration of custom elements across test files.
// shell.js calls customElements.define() on import — if two tests load it,
// the second define() would throw without this guard.
const _origDefine = customElements.define.bind(customElements);
customElements.define = function (name, constructor, options) {
  if (customElements.get(name)) return; // already registered, skip
  _origDefine(name, constructor, options);
};

// Provide a minimal window.CPANEL for tests that need it
window.CPANEL = {
  token: 'cpsessABCDEF1234',
  user: 'testuser',
  theme: 'meridian',
  homedir: '/home/testuser',
  pageId: 'dashboard',
};

// Stub localStorage if not available in happy-dom
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage?.getItem !== 'function') {
  const _store = {};
  globalThis.localStorage = {
    getItem(key) { return _store[key] ?? null; },
    setItem(key, val) { _store[key] = String(val); },
    removeItem(key) { delete _store[key]; },
    clear() { Object.keys(_store).forEach(k => delete _store[k]); },
  };
}

// Stub crypto.getRandomValues if not available in happy-dom
if (!globalThis.crypto?.getRandomValues) {
  globalThis.crypto = {
    getRandomValues(arr) {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
  };
}
