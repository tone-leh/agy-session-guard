import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../packages/core/index.js');

function createLocaleSyncMockDom() {
  const matches = (el, selList) =>
    selList.split(',').some((raw) => {
      const s = raw.trim();
      if (!s) return false;
      if (s.startsWith('#')) return el.id === s.slice(1);
      let rest = s;
      const tm = rest.match(/^[a-zA-Z0-9-]+/);
      if (tm) {
        if (el.tagName !== tm[0].toUpperCase()) return false;
        rest = rest.slice(tm[0].length);
      }
      for (const m of rest.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
        if (!el.classList.contains(m[1])) return false;
      }
      for (const m of rest.matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/g)) {
        if (!el.hasAttribute(m[1])) return false;
        if (m[2] !== undefined && el.getAttribute(m[1]) !== m[2]) return false;
      }
      return true;
    });

  const makeEl = (tag) => {
    const attrs = new Map();
    const cls = new Set();
    const ls = new Map();
    const el = {
      tagName: String(tag).toUpperCase(),
      nodeType: 1,
      id: '',
      value: '',
      hidden: false,
      disabled: false,
      selected: false,
      style: {},
      shadowRoot: null,
      _text: '',
      children: [],
      parentElement: null,
      parentNode: null,
      get childNodes() {
        return el.children;
      },
      get isConnected() {
        let p = el;
        while (p) {
          if (p === doc.documentElement) return true;
          p = p.parentElement;
        }
        return false;
      },
      get firstChild() {
        return el.children[0] || null;
      },
      get className() {
        return [...cls].join(' ');
      },
      set className(v) {
        cls.clear();
        String(v || '')
          .split(/\s+/)
          .filter(Boolean)
          .forEach((c) => cls.add(c));
      },
      classList: {
        add: (...a) => a.forEach((c) => c && cls.add(c)),
        remove: (...a) => a.forEach((c) => cls.delete(c)),
        contains: (c) => cls.has(c),
      },
      get textContent() {
        return el.children.length ? el._text + el.children.map((c) => c.textContent).join('') : el._text;
      },
      set textContent(v) {
        el._text = String(v ?? '');
        el.children.length = 0;
      },
      setAttribute(k, v) {
        attrs.set(k, String(v));
        if (k === 'id') el.id = String(v);
      },
      getAttribute(k) {
        return attrs.has(k) ? attrs.get(k) : null;
      },
      hasAttribute(k) {
        return attrs.has(k);
      },
      removeAttribute(k) {
        attrs.delete(k);
      },
      appendChild(c) {
        if (c.parentElement) c.remove();
        c.parentElement = el;
        c.parentNode = el;
        el.children.push(c);
        if (el.tagName === 'SELECT' && c.tagName === 'OPTION' && c.selected) {
          el.value = c.value;
        }
        return c;
      },
      insertBefore(c, ref) {
        if (c.parentElement) c.remove();
        c.parentElement = el;
        c.parentNode = el;
        const i = el.children.indexOf(ref);
        if (i >= 0) el.children.splice(i, 0, c);
        else el.children.push(c);
        return c;
      },
      removeChild(c) {
        el.children = el.children.filter((x) => x !== c);
        c.parentElement = null;
        c.parentNode = null;
        return c;
      },
      remove() {
        if (el.parentElement) el.parentElement.removeChild(el);
      },
      closest(sel) {
        let cur = el;
        while (cur) {
          if (matches(cur, sel)) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = (n) => {
          for (const c of n.children) {
            if (matches(c, sel)) out.push(c);
            walk(c);
          }
        };
        walk(el);
        return out;
      },
      querySelector(sel) {
        return el.querySelectorAll(sel)[0] || null;
      },
      addEventListener(ev, fn) {
        if (!ls.has(ev)) ls.set(ev, new Set());
        ls.get(ev).add(fn);
      },
      removeEventListener(ev, fn) {
        ls.get(ev)?.delete(fn);
      },
      focus() {
        doc.activeElement = el;
      },
    };
    return el;
  };

  const doc = {
    hidden: false,
    activeElement: null,
    documentElement: null,
    head: null,
    body: null,
    createElement: makeEl,
    createTextNode(txt) {
      return { nodeType: 3, textContent: String(txt ?? ''), parentElement: null, parentNode: null };
    },
    getElementById: (id) => doc.documentElement.querySelector('#' + id),
    querySelectorAll: (s) => doc.documentElement.querySelectorAll(s),
    querySelector: (s) => doc.documentElement.querySelector(s),
    addEventListener() {},
    removeEventListener() {},
  };

  doc.documentElement = makeEl('html');
  doc.documentElement.setAttribute('data-ag-cs-lang', 'zh-CN');
  doc.head = makeEl('head');
  doc.body = makeEl('body');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  // Native Settings -> Appearance dialog structure
  const dialog = makeEl('section');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Antigravity Settings');
  const p6 = makeEl('div');
  p6.className = 'p-6';
  const space = makeEl('div');
  space.className = 'space-y-2';
  const h2 = makeEl('h2');
  h2.textContent = 'Appearance';
  space.appendChild(h2);
  p6.appendChild(space);
  dialog.appendChild(p6);
  doc.body.appendChild(dialog);

  const store = new Map();
  const storage = {
    get length() {
      return store.size;
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  const win = {
    document: doc,
    localStorage: storage,
    navigator: { language: 'zh-CN' },
    addEventListener() {},
    removeEventListener() {},
  };

  return { win, doc, storage, h2 };
}

test('settings-locale-sync: switching host locale to ru (with translated heading) keeps settings badge and select synchronized', () => {
  const { win, doc, storage, h2 } = createLocaleSyncMockDom();
  const guard = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });

  try {
    // Simulate hostI18n translating <h2>Appearance</h2> into Russian, while UI strings fall back to 'en'
    h2.textContent = 'Внешний вид';
    doc.documentElement.setAttribute('data-ag-cs-lang', 'en');
    guard.setHostLocale('ru');
    guard.prismBridge.setActiveSubTab('ui');
    guard.prismBridge.sync();

    const sel = doc.querySelector('[data-testid="ag-sag-host-locale-select"]');
    assert.equal(doc.querySelector('[data-testid="ag-sag-lang-badge"]'), null, 'Top bar must not show redundant language badge');
    assert.ok(sel, 'Settings host locale select must remain mounted');
    assert.equal(doc.documentElement.getAttribute('data-ag-sag-lang'), 'ru');
    assert.equal(sel.value, 'ru');

    // Even if a custom pack translates <h2> into an arbitrary unknown heading, already-mounted section continues syncing
    h2.textContent = 'Custom Heading Text';
    guard.setHostLocale('pt-BR');
    guard.prismBridge.sync();
    assert.equal(doc.documentElement.getAttribute('data-ag-sag-lang'), 'pt-BR');
    assert.equal(doc.querySelector('[data-testid="ag-sag-host-locale-select"]')?.value, 'pt-BR');
  } finally {
    guard.destroy();
  }

  // Re-mounting after <h2>Appearance</h2> was already custom-translated still finds the Settings dialog anchor
  const env2 = createLocaleSyncMockDom();
  env2.h2.textContent = '视觉外观 (自定义)';
  const guard2 = core.mountSag({
    win: env2.win,
    doc: env2.doc,
    storage: env2.storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });
  try {
    assert.ok(
      env2.doc.querySelector('[data-testid="ag-sg-native-settings-section"]'),
      'Settings panel must mount even when <h2>Appearance</h2> is custom-translated before mount'
    );
  } finally {
    guard2.destroy();
  }
});
