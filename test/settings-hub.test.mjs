import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../packages/core/index.js');
const prismBridge = require('../packages/core/prism-bridge.js');
const novSynergyMod = require('../packages/core/nov-synergy.js');

function createHubDom({ savedTab = null, withNativeSettings = true } = {}) {
  const matches = (el, selList) =>
    selList.split(',').some((raw) => {
      const s = raw.trim();
      if (!s) return false;
      const parts = s.split(/\s+/);
      if (parts.length > 1) {
        if (!matches(el, parts[parts.length - 1])) return false;
        let p = el.parentElement;
        let idx = parts.length - 2;
        while (p && idx >= 0) {
          if (matches(p, parts[idx])) idx -= 1;
          p = p.parentElement;
        }
        return idx < 0;
      }
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
      type: '',
      checked: false,
      disabled: false,
      hidden: false,
      open: false,
      style: {},
      children: [],
      parentElement: null,
      parentNode: null,
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
        String(v || '').split(/\s+/).filter(Boolean).forEach((c) => cls.add(c));
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
      _text: '',
      setAttribute(k, v) {
        attrs.set(k, String(v));
        if (k === 'id') el.id = String(v);
        if (k === 'class') el.className = String(v);
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
        if (el.tagName === 'SELECT' && c.tagName === 'OPTION' && c.selected) el.value = c.value;
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
      dispatchEvent(ev) {
        for (const fn of ls.get(ev.type) || []) fn(ev);
      },
      focus() {
        doc.activeElement = el;
      },
      click() {
        if (el.disabled) return;
        for (const fn of ls.get('click') || []) fn({ target: el, preventDefault() {}, stopPropagation() {} });
      },
    };
    return el;
  };

  const docListeners = new Map();
  const doc = {
    hidden: false,
    activeElement: null,
    documentElement: null,
    head: null,
    body: null,
    createElement: makeEl,
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t ?? ''), parentElement: null, parentNode: null }),
    getElementById: (id) => doc.documentElement.querySelector('#' + id),
    querySelectorAll: (s) => doc.documentElement.querySelectorAll(s),
    querySelector: (s) => doc.documentElement.querySelector(s),
    addEventListener(ev, fn) {
      if (!docListeners.has(ev)) docListeners.set(ev, new Set());
      docListeners.get(ev).add(fn);
    },
    removeEventListener(ev, fn) {
      docListeners.get(ev)?.delete(fn);
    },
    dispatchEvent(ev) {
      for (const fn of docListeners.get(ev.type) || []) fn(ev);
    },
  };
  doc.documentElement = makeEl('html');
  doc.documentElement.setAttribute('data-ag-cs-lang', 'zh-CN');
  doc.head = makeEl('head');
  doc.body = makeEl('body');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  if (withNativeSettings) {
    const dlg = makeEl('section');
    dlg.setAttribute('role', 'dialog');
    const p6 = makeEl('div');
    p6.className = 'p-6';
    const space = makeEl('div');
    space.className = 'space-y-2';
    const h2 = makeEl('h2');
    h2.textContent = 'Appearance';
    space.appendChild(h2);
    p6.appendChild(space);
    dlg.appendChild(p6);
    doc.body.appendChild(dlg);
  }

  const store = new Map();
  if (savedTab !== null) store.set('agSag.ui.activeSubTab.v1', savedTab);
  const storage = {
    get length() {
      return store.size;
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  const copied = [];
  const win = {
    document: doc,
    localStorage: storage,
    navigator: {
      language: 'zh-CN',
      clipboard: { writeText: async (txt) => copied.push(txt) },
    },
    confirm: () => {
      throw new Error('window.confirm must never be called');
    },
    addEventListener() {},
    removeEventListener() {},
  };

  return { win, doc, storage, store, copied, docListeners };
}

test('Settings Hub enforces single-source-of-truth: all 14 module switches appear once in overview and zero in layer tabs', () => {
  const { win, doc, storage } = createHubDom();
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });

  try {
    const sec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);
    assert.ok(sec);
    assert.equal(doc.querySelector('[data-testid="ag-sg-native-card"]'), null, 'Legacy top basic card must be removed');
    assert.ok(sec.querySelector('[data-testid="ag-sag-hex-logo"]'), 'Hexagon S brand SVG must render');

    const tabs = sec.querySelectorAll('[data-ag-sag-subtab]').map((b) => b.getAttribute('data-ag-sag-subtab'));
    assert.deepEqual(tabs, ['overview', 'ui', 'conversation', 'guard', 'advanced']);
    assert.equal(api.prismBridge.getActiveSubTab(), 'overview');

    const modButtons = sec.querySelectorAll('[data-ag-sag-mod]');
    const modIds = modButtons.map((b) => b.getAttribute('data-ag-sag-mod'));
    assert.equal(modIds.length, 14);
    assert.equal(new Set(modIds).size, 14, 'Every module switch must be unique without duplicates');
    assert.equal(modButtons.every((b) => b.getAttribute('role') === 'switch'), true, 'All overview switches must use role=switch');

    // compactGuard card holds precompactExport sub-switch
    const cgCard = sec.querySelector('[data-ag-sag-mod-card="compactGuard"]');
    assert.ok(cgCard.querySelector('[data-ag-sag-mod="precompactExport"]'));

    // Switching to layer tabs must NOT duplicate module switches
    for (const tab of ['ui', 'conversation', 'guard', 'advanced']) {
      sec.querySelector(`[data-ag-sag-subtab="${tab}"]`).click();
      assert.equal(sec.querySelectorAll('[data-ag-sag-mod]').length, 0, `${tab} tab must not repeat module master switches`);
    }
  } finally {
    api.destroy();
  }
  assert.equal(doc.querySelectorAll('[data-ag-sg-owned="1"]').length, 0);
});

test('Settings Hub migrates legacy activeSubTab storage values and handles unknown fallbacks cleanly', () => {
  for (const [legacy, expected] of [
    ['all', 'overview'],
    ['flow', 'conversation'],
    ['auto', 'guard'],
    ['unknown-garbage', 'overview'],
  ]) {
    const { win, doc, storage, store } = createHubDom({ savedTab: legacy });
    const api = core.mountSag({
      win,
      doc,
      storage,
      autoPoll: false,
      autoObserve: false,
      bindVaultShortcut: false,
    });
    try {
      assert.equal(api.prismBridge.getActiveSubTab(), expected, `Legacy "${legacy}" should migrate to "${expected}"`);
      if (legacy === 'all' || legacy === 'flow' || legacy === 'auto') {
        assert.equal(store.get('agSag.ui.activeSubTab.v1'), expected);
      }
    } finally {
      api.destroy();
    }
  }
});

test('Settings Hub search filters across all tabs while preserving focus and clear button restores view', () => {
  const { win, doc, storage } = createHubDom();
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });

  try {
    const sec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);
    const searchInp = sec.querySelector('[data-testid="ag-sag-search-input"]');
    const resultsHost = sec.querySelector('[data-testid="ag-sag-search-results"]');
    assert.ok(searchInp && resultsHost);
    assert.equal(resultsHost.hidden, true);

    searchInp.focus();
    searchInp.value = 'precompact';
    searchInp.dispatchEvent({ type: 'input' });
    assert.ok(resultsHost.querySelector('[data-ag-sag-mod="precompactExport"]'), 'Search must match nested child module precompactExport');

    searchInp.value = 'themeCustomCss';
    searchInp.dispatchEvent({ type: 'input' });

    assert.equal(resultsHost.hidden, false);
    assert.equal(doc.activeElement, searchInp, 'Typing in search must keep input focused');
    assert.ok(resultsHost.querySelector('[data-testid="ag-sag-theme-css-textarea"]'), 'Search must surface advanced CSS control across tabs');

    // Empty search feedback
    searchInp.value = 'nonexistent-xyz-term';
    searchInp.dispatchEvent({ type: 'input' });
    assert.ok(resultsHost.querySelector('[data-testid="ag-sag-search-empty"]'));

    // Clear restores normal tabs
    sec.querySelector('[data-testid="ag-sag-search-clear"]').click();
    assert.equal(resultsHost.hidden, true);
    assert.equal(searchInp.value, '');
  } finally {
    api.destroy();
  }
});

test('Settings Hub UI & Guard hidden parameters and Advanced tab export/import/inline-reset work cleanly without window.confirm', () => {
  const { win, doc, storage, copied } = createHubDom();
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });

  try {
    const sec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);

    // UI Tab hidden appearance controls
    sec.querySelector('[data-ag-sag-subtab="ui"]').click();
    sec.querySelector('[data-ag-sag-theme-compact-sidebar="1"]').click();
    sec.querySelector('[data-ag-sag-theme-wide="1"]').click();
    const cssTa = sec.querySelector('[data-testid="ag-sag-theme-css-textarea"]');
    cssTa.value = '.foo { opacity: 0.9; }';
    sec.querySelector('[data-testid="ag-sag-theme-css-apply"]').click();
    assert.equal(api.getConfig().themeCompactSidebar, true);
    assert.equal(api.getConfig().themeWideReadable, true);
    assert.ok(api.getConfig().themeCustomCss.includes('opacity: 0.9'));

    // Guard Tab hidden controls (stall, custom allow patterns, quota soft turns)
    sec.querySelector('[data-ag-sag-subtab="guard"]').click();
    sec.querySelector('[data-ag-sag-stall="300"]').click();
    assert.equal(api.getConfig().stallThresholdSeconds, 300);

    const aaTa = sec.querySelector('[data-testid="ag-sag-aa-custom-textarea"]');
    aaTa.value = '^npm run test$\n^git status$';
    sec.querySelector('[data-testid="ag-sag-aa-custom-apply"]').click();
    assert.deepEqual(api.getConfig().autoAcceptCustomPatterns, ['^npm run test$', '^git status$']);

    const q5 = sec.querySelector('[data-testid="ag-sag-quota-5h-input"]');
    q5.value = '120';
    q5.dispatchEvent({ type: 'change' });
    assert.equal(api.getConfig().quotaSoftTurns5h, 120);

    // Advanced Tab: export, import, inline 2-step reset
    sec.querySelector('[data-ag-sag-subtab="advanced"]').click();
    sec.querySelector('[data-testid="ag-sag-cfg-export-btn"]').click();
    assert.ok(copied.some((c) => c.includes('"quotaSoftTurns5h": 120')));

    // Invalid import rejected cleanly
    const impTa = sec.querySelector('[data-testid="ag-sag-cfg-import-textarea"]');
    impTa.value = '{bad-json';
    sec.querySelector('[data-testid="ag-sag-cfg-import-btn"]').click();
    assert.equal(sec.querySelector('[data-testid="ag-sag-cfg-status"]').getAttribute('data-tone'), 'error');

    // Valid import applied & sanitized
    impTa.value = JSON.stringify({ compactThreshold: 85, modules: { hostI18n: true, quotaPulse: true } });
    sec.querySelector('[data-testid="ag-sag-cfg-import-btn"]').click();
    assert.equal(api.getConfig().compactThreshold, 85);
    assert.equal(api.getConfig().modules.quotaPulse, true);

    // Inline 2-step reset (no window.confirm)
    sec.querySelector('[data-testid="ag-sag-reset-btn"]').click();
    const confirmBtn = sec.querySelector('[data-testid="ag-sag-reset-confirm"]');
    assert.ok(confirmBtn);
    confirmBtn.click();
    assert.equal(api.getConfig().compactThreshold, 80);
    assert.equal(api.getConfig().modules.quotaPulse, false);
    assert.equal(sec.querySelector('[data-testid="ag-sag-cfg-import-textarea"]').value, '');
    sec.querySelector('[data-ag-sag-subtab="ui"]').click();
    assert.equal(sec.querySelector('[data-testid="ag-sag-theme-css-textarea"]').value, '');
  } finally {
    api.destroy();
  }
});

test('Settings Drawer opens via Ctrl+Alt+, closes via Esc, shares renderHub, renders 13 NOV categories, and cleans up on destroy()', async () => {
  const { win, doc, storage } = createHubDom({ withNativeSettings: false });
  const modulesState = {};
  for (const id of novSynergyMod.NOV_MODULE_IDS) {
    modulesState[id] = id === 'review' || id === 'guard' || id === 'xray';
  }
  const novPayload = {
    installed: true,
    bridgeConnected: true,
    version: '0.5.0',
    enabledCount: 3,
    toolCount: 12,
    config: { schemaVersion: 1, preset: 'core', locale: 'auto', modules: modulesState },
  };
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
    novInitialState: novPayload,
  });

  try {
    win.__agSagBridgeReceiver?.onPush?.({ event: 'nov:state', state: novPayload });
    assert.equal(api.prismBridge.isDrawerOpen(), false);

    // Trigger Ctrl+Alt+, shortcut
    doc.dispatchEvent({
      type: 'keydown',
      key: ',',
      code: 'Comma',
      ctrlKey: true,
      altKey: true,
      metaKey: false,
      shiftKey: false,
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(api.prismBridge.isDrawerOpen(), true);
    const drawer = doc.querySelector(`[data-testid="${prismBridge.DRAWER_TESTID}"]`);
    assert.ok(drawer);
    assert.equal(drawer.querySelectorAll('[data-ag-sag-mod]').length, 14);

    // Switch to NOV tab inside drawer and verify 5 category groups + 13 module cards + hex N icon
    drawer.querySelector('[data-ag-sag-subtab="nov"]').click();
    assert.ok(drawer.querySelector('[data-testid="ag-sag-nov-mini-hex"]'));
    assert.equal(drawer.querySelectorAll('[data-ag-nov-category]').length, 5);
    assert.equal(drawer.querySelectorAll('[data-ag-nov-mod]').length, 13);

    // Esc closes drawer
    doc.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(api.prismBridge.isDrawerOpen(), false);
    assert.equal(doc.querySelector(`[data-testid="${prismBridge.DRAWER_BACKDROP_TESTID}"]`).hidden, true);
  } finally {
    api.destroy();
  }

  assert.equal(doc.querySelectorAll('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"]').length, 0);

  // Keydown listener must be detached after destroy()
  doc.dispatchEvent({
    type: 'keydown',
    key: ',',
    code: 'Comma',
    ctrlKey: true,
    altKey: true,
    metaKey: false,
    shiftKey: false,
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(doc.querySelector(`[data-testid="${prismBridge.DRAWER_TESTID}"]`), null);
});

test('Settings Hub & Status Pill polish: thought translation mt hides form, zh-CN has zero jargon/turns, optical vial & no NOV count chip', async () => {
  const { win, doc, storage } = createHubDom();
  const footer = doc.createElement('div');
  footer.className = 'agy-composer-footer';
  footer.appendChild(doc.createElement('button'));
  doc.body.appendChild(footer);

  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });

  try {
    const sec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);
    assert.ok(sec);

    // 1. UI Tab: thought translation engine = mt hides endpoint/model/apikey/style, and row title is distinct from button
    sec.querySelector('[data-ag-sag-subtab="ui"]').click();
    assert.equal(sec.querySelector('[data-testid="ag-sag-thought-baseurl"]'), null);
    assert.equal(sec.querySelector('[data-testid="ag-sag-thought-model"]'), null);
    assert.equal(sec.querySelector('[data-testid="ag-sag-thought-apikey"]'), null);
    assert.equal(sec.querySelector('[data-ag-sag-thought-style]'), null);
    const advThought = sec.querySelector('[data-testid="ag-sag-adv-thought"]');
    assert.ok(advThought.textContent.includes('连接与缓存'));
    assert.equal(advThought.textContent.split('测试连接').length - 1, 1);
    const cssTaPlaceholder = sec.querySelector('[data-testid="ag-sag-theme-css-textarea"]')?.placeholder || '';
    assert.equal(cssTaPlaceholder.includes(':has('), false);

    // Switch to ollama -> shows baseurl & model, keeps apikey hidden
    sec.querySelector('[data-ag-sag-thought-engine="ollama"]').click();
    assert.ok(sec.querySelector('[data-testid="ag-sag-thought-baseurl"]'));
    assert.ok(sec.querySelector('[data-testid="ag-sag-thought-model"]'));
    assert.equal(sec.querySelector('[data-testid="ag-sag-thought-apikey"]'), null);

    // Switch to openai -> shows all 3 inputs + style chips
    sec.querySelector('[data-ag-sag-thought-engine="openai"]').click();
    assert.ok(sec.querySelector('[data-testid="ag-sag-thought-baseurl"]'));
    assert.ok(sec.querySelector('[data-testid="ag-sag-thought-model"]'));
    assert.ok(sec.querySelector('[data-testid="ag-sag-thought-apikey"]'));
    assert.ok(sec.querySelector('[data-ag-sag-thought-style]'));

    // 2. Conversation Tab: localized zh-CN labels without hardcoded English
    sec.querySelector('[data-ag-sag-subtab="conversation"]').click();
    const convText = sec.textContent;
    assert.equal(convText.includes('Countdown'), false);
    assert.equal(convText.includes('queued'), false);
    assert.equal(convText.includes('drafts'), false);
    assert.ok(convText.includes('倒计时自动'));

    // 3. Guard Tab: quota summary must not mention fake "轮" counts
    sec.querySelector('[data-ag-sag-subtab="guard"]').click();
    const guardText = sec.textContent;
    assert.equal(/\d+\s*轮/.test(guardText), false);

    // 4. Advanced Tab: diagnostics JSON lives collapsed inside <details> with localized summary
    sec.querySelector('[data-ag-sag-subtab="advanced"]').click();
    const diagPre = sec.querySelector('[data-testid="ag-sag-diag-pre"]');
    assert.ok(diagPre);
    const diagDetails = diagPre.closest('details');
    assert.equal(diagDetails?.open, false);
    const diagSumText = diagDetails?.querySelector('summary')?.textContent || '';
    assert.equal(/\b(drawer|native|prism)\b/.test(diagSumText), false);
    assert.ok(diagSumText.includes('设置面板'));
    const storageSum = sec.querySelector('[data-testid="ag-sag-storage-summary"]');
    assert.ok(storageSum);
    assert.equal(storageSum.textContent.includes('后台服务未连接'), false);
    assert.ok(storageSum.textContent.includes('开始检查'));

    // 4b. NOV tab: localized custom preset label & clean Chinese synergy labels
    // Test thoughtTranslator offline message contains no 'Watch sidecar'
    const ttMod = require('../packages/core/thought-translator.js');
    const ttDoc = createHubDom().doc;
    const tp = ttDoc.createElement('div');
    tp.setAttribute('data-testid', 'thinking-panel');
    tp.textContent = 'Thinking in English to check offline fallback behavior';
    const tb = ttDoc.createElement('button');
    tb.setAttribute('data-testid', 'thinking-collapsible-trigger');
    tp.appendChild(tb);
    ttDoc.body.appendChild(tp);
    const ttCtl = ttMod.createThoughtTranslatorController({
      win: { document: ttDoc },
      doc: ttDoc,
      enabled: true,
      autoObserve: false,
      triggerMode: 'manual',
      targetLang: 'zh-CN',
    });
    const ttRes = await ttCtl.translatePanel(tp);
    assert.equal(ttRes.ok, false);
    assert.equal(tp.textContent.includes('Watch sidecar'), false);
    ttCtl.destroy();

    // 5. Status Pill card: optical vial readout, concise context sub-label & zero NOV x/13 chip
    api.statusPill?.open?.();
    const card = doc.querySelector('[data-testid="ag-sg-status-card"]');
    assert.ok(card);
    assert.equal(card.hidden, false);
    const vh = card.querySelector('.ag-sg-vw .ag-sg-vh');
    assert.ok(vh);
    assert.ok(vh.textContent.includes('CTX'));
    assert.equal(card.querySelector('[data-ag-sag-card-metric="nov"]'), null);
    assert.equal(card.textContent.includes('将于 80% 自动压缩'), false);
    assert.ok(card.textContent.includes('80% 自动压缩'));

    // 6. Zero user-facing jargon leaks in SAG_UI_PACKS & nov-synergy metadata
    const i18nMod = require('../packages/core/i18n.js');
    const jargonRe = /(:has\(|零端口|模型工具|工作区实验室|工作区数据实验室|像素极客|Pixel Geek|Opt-in|Zero-ASAR|Sidecar|0600|force_ask)/i;
    for (const loc of ['zh-CN', 'zh-TW', 'en']) {
      for (const [k, v] of Object.entries(i18nMod.SAG_UI_PACKS[loc])) {
        assert.equal(jargonRe.test(String(v)), false, `SAG_UI_PACKS.${loc}.${k} leaked jargon: ${v}`);
      }
    }
    for (const m of novSynergyMod.NOV_MODULES_META) {
      assert.equal(jargonRe.test(`${m.nameZh} ${m.descZh} ${m.nameEn} ${m.descEn}`), false, `NOV module ${m.id} leaked jargon`);
    }
    for (const p of novSynergyMod.NOV_PRESETS_META) {
      assert.equal(jargonRe.test(`${p.nameZh} ${p.descZh} ${p.nameEn} ${p.descEn}`), false, `NOV preset ${p.id} leaked jargon`);
    }
  } finally {
    api.destroy();
  }
});
