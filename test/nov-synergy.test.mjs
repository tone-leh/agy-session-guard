import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../packages/core/index.js');
const novSynergyMod = require('../packages/core/nov-synergy.js');
const i18n = require('../packages/core/i18n.js');
const styles = require('../packages/core/styles.js');
const statusPill = require('../packages/core/status-pill.js');
const prismBridge = require('../packages/core/prism-bridge.js');

function createMemoryStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(String(k)),
  };
}

function createHostDom() {
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
      title: '',
      hidden: false,
      disabled: false,
      _text: '',
      children: [],
      parentElement: null,
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
        el.children.push(c);
        return c;
      },
      insertBefore(c, ref) {
        if (c.parentElement) c.remove();
        c.parentElement = el;
        const i = el.children.indexOf(ref);
        if (i >= 0) el.children.splice(i, 0, c);
        else el.children.push(c);
        return c;
      },
      removeChild(c) {
        el.children = el.children.filter((x) => x !== c);
        c.parentElement = null;
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
        const w = (n) => {
          for (const c of n.children) {
            if (matches(c, sel)) out.push(c);
            w(c);
          }
        };
        w(el);
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
      focus() {},
      click() {
        if (el.disabled) return;
        for (const fn of ls.get('click') || []) fn({ target: el, preventDefault() {}, stopPropagation() {} });
      },
    };
    return el;
  };

  const doc = {
    hidden: false,
    documentElement: null,
    head: null,
    body: null,
    createElement: makeEl,
    getElementById: (id) => doc.documentElement.querySelector('#' + id),
    querySelectorAll: (s) => doc.documentElement.querySelectorAll(s),
    querySelector: (s) => doc.documentElement.querySelector(s),
    addEventListener() {},
    removeEventListener() {},
  };
  doc.documentElement = makeEl('html');
  doc.documentElement.setAttribute('lang', 'zh-CN');
  doc.head = makeEl('head');
  doc.body = makeEl('body');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  // Conversation view + composer with .agy-composer-footer
  const conv = makeEl('div');
  conv.setAttribute('data-testid', 'conversation-view');
  conv.setAttribute('data-cascade-id', '77777777-1111-4222-8333-444444444444');
  doc.body.appendChild(conv);

  const ib = makeEl('div');
  ib.setAttribute('data-testid', 'agent-input-box');
  ib.appendChild(makeEl('textarea'));
  const footer = makeEl('div');
  footer.className = 'agy-composer-footer';
  footer.appendChild(makeEl('div'));
  footer.appendChild(makeEl('div'));
  ib.appendChild(footer);
  doc.body.appendChild(ib);

  // Native Antigravity Settings -> Appearance dialog
  const dlg = makeEl('div');
  dlg.setAttribute('role', 'dialog');
  const panel = makeEl('div');
  panel.className = 'p-6';
  const sec1 = makeEl('div');
  sec1.className = 'space-y-2';
  const h2 = makeEl('h2');
  h2.textContent = 'Appearance';
  sec1.appendChild(h2);
  panel.appendChild(sec1);
  dlg.appendChild(panel);
  doc.body.appendChild(dlg);

  const storage = createMemoryStorage();
  const win = {
    document: doc,
    localStorage: storage,
    navigator: { language: 'zh-CN' },
    addEventListener() {},
    removeEventListener() {},
  };
  return { win, doc, storage };
}

function createSimNovRuntime({ installed = true, preset = 'core', extraModules = {} } = {}) {
  const baseDef = novSynergyMod.NOV_PRESETS_MAP[preset] || novSynergyMod.NOV_PRESETS_MAP.core;
  const state = {
    installed,
    version: '0.2.0',
    config: {
      schemaVersion: 1,
      preset,
      locale: 'auto',
      defaultTab: 'review',
      modules: { ...baseDef.modules, ...extraModules },
    },
  };

  const snapshot = () => ({
    installed: state.installed,
    version: state.version,
    config: {
      ...state.config,
      preset: novSynergyMod.detectNovPreset(state.config.modules),
      modules: { ...state.config.modules },
    },
  });

  const calls = [];
  const transport = (req) => {
    calls.push(req);
    const { reqId, type, payload = {} } = req;
    if (type === 'nov:set_module' && state.installed) {
      state.config.modules[payload.moduleId] = Boolean(payload.enabled);
    } else if (type === 'nov:apply_preset' && state.installed) {
      const def = novSynergyMod.NOV_PRESETS_MAP[payload.preset];
      if (def) state.config.modules = { ...def.modules };
    } else if (type === 'nov:set_locale' && state.installed) {
      state.config.locale = String(payload.locale || 'auto');
    }
    return { ok: true, reqId, state: snapshot() };
  };

  return { state, snapshot, calls, transport };
}

test('1. Metadata, CSS invariants (0 :has(), 0 .ag-cs-) & SAG_UI_PACKS key parity (zero Prism leaks)', () => {
  assert.equal(novSynergyMod.NOV_MODULES_META.length, 13);
  assert.deepEqual(
    novSynergyMod.NOV_MODULES_META.map((m) => m.id),
    [
      'review',
      'guard',
      'xray',
      'turbo',
      'radar',
      'verify',
      'worktree',
      'spec',
      'studio',
      'canvas',
      'mem',
      'ops',
      'remote',
    ]
  );
  assert.deepEqual(
    [...novSynergyMod.NOV_MODULE_CATEGORY_IDS],
    ['core-dev', 'safety', 'observability', 'workspace', 'connectivity']
  );
  for (const catId of novSynergyMod.NOV_MODULE_CATEGORY_IDS) {
    assert.equal(novSynergyMod.NOV_MODULE_CATEGORIES[catId].id, catId);
    assert.ok(novSynergyMod.NOV_MODULE_CATEGORIES[catId].nameZh);
    assert.ok(novSynergyMod.NOV_MODULE_CATEGORIES[catId].nameEn);
  }
  assert.equal(novSynergyMod.NOV_MODULES_MAP.remote.privacy, 'opt-in-network');
  for (const m of novSynergyMod.NOV_MODULES_META) {
    if (m.id !== 'remote') assert.equal(m.privacy, 'offline');
    assert.ok(novSynergyMod.NOV_MODULE_CATEGORIES[m.category], `Unknown category for ${m.id}`);
    assert.ok(m.nameZh && m.nameEn && m.toolCount > 0);
  }

  assert.deepEqual(
    novSynergyMod.NOV_PRESETS_META.map((p) => [p.id, p.toolCount]),
    [
      ['minimal', 6],
      ['core', 12],
      ['power', 32],
      ['local-all', 43],
      ['full', 47],
    ]
  );

  // Strict CSS hygiene
  assert.equal(/:has\(/.test(styles.CORE_CSS), false, 'CORE_CSS must stay strictly 0 :has()');
  assert.equal(/\.ag-cs-/.test(styles.CORE_CSS), false, 'CORE_CSS must never define .ag-cs-* rules');

  // SAG_UI_PACKS 3-locale key parity & zero "Prism" text
  const baseKeys = Object.keys(i18n.SAG_UI_PACKS['zh-CN']).sort();
  for (const loc of ['zh-CN', 'zh-TW', 'en']) {
    assert.deepEqual(Object.keys(i18n.SAG_UI_PACKS[loc]).sort(), baseKeys, `SAG_UI_PACKS parity failed for ${loc}`);
    for (const [k, v] of Object.entries(i18n.SAG_UI_PACKS[loc])) {
      assert.equal(String(v).includes('Prism'), false, `SAG_UI_PACKS.${loc}.${k} must never mention Prism`);
    }
  }
});

test('2. Zero-port CDP window.__agSagHostBridge request/response, reverse onPush & timeout cleanup', async () => {
  const sentRaw = [];
  const stateChanges = [];
  const runtime = createSimNovRuntime({ installed: true, preset: 'core' });

  const win = {
    __agSagHostBridge(rawJson) {
      sentRaw.push(rawJson);
      const req = JSON.parse(rawJson);
      if (req.type === 'nov:get_state' || req.type === 'nov:set_module' || req.type === 'nov:apply_preset' || req.type === 'nov:set_locale') {
        const resp = runtime.transport(req);
        queueMicrotask(() => {
          win.__agSagBridgeReceiver?.onResponse(resp);
        });
      }
    },
  };

  const ctrl = novSynergyMod.createNovSynergyController({
    win,
    autoRefresh: false,
    onStateChange: (s) => stateChanges.push(s),
  });

  try {
    assert.equal(typeof win.__agSagBridgeReceiver?.onResponse, 'function');
    assert.equal(typeof win.__agSagBridgeReceiver?.onPush, 'function');
    assert.equal(ctrl.getDebugState().transportMode, 'cdp-binding');

    // refresh() -> nov:get_state
    const r1 = await ctrl.refresh();
    assert.equal(r1.ok, true);
    assert.equal(r1.state.installed, true);
    assert.equal(r1.state.version, '0.2.0');
    assert.equal(r1.state.config.preset, 'core');
    assert.equal(r1.state.toolCount, 12);
    assert.equal(ctrl.isConnected(), true);
    assert.equal(JSON.parse(sentRaw[0]).type, 'nov:get_state');

    // setModule('mem', true) -> nov:set_module
    const r2 = await ctrl.setModule('mem', true);
    assert.equal(r2.ok, true);
    assert.equal(r2.state.config.modules.mem, true);
    assert.equal(r2.state.toolCount, 15);

    // applyPreset('power') -> nov:apply_preset
    const r3 = await ctrl.applyPreset('power');
    assert.equal(r3.ok, true);
    assert.equal(r3.state.config.preset, 'power');
    assert.equal(r3.state.config.modules.radar, true);
    assert.equal(r3.state.config.modules.verify, true);
    assert.equal(r3.state.config.modules.worktree, true);
    assert.equal(r3.state.config.modules.spec, true);
    assert.equal(r3.state.toolCount, 32);

    // setLocale('ja') -> nov:set_locale
    const r4 = await ctrl.setLocale('ja');
    assert.equal(r4.ok, true);
    assert.equal(r4.state.config.locale, 'ja');

    // Reverse live push via onPush({ event: 'nov:state', state })
    const beforePushCount = stateChanges.length;
    const pushed = win.__agSagBridgeReceiver.onPush({
      event: 'nov:state',
      state: {
        installed: true,
        version: '0.2.0',
        config: {
          preset: 'minimal',
          modules: { ...novSynergyMod.NOV_PRESETS_MAP.minimal.modules },
        },
      },
    });
    assert.equal(pushed, true);
    assert.equal(stateChanges.length, beforePushCount + 1);
    assert.equal(ctrl.getState().config.preset, 'minimal');
    assert.equal(ctrl.getState().toolCount, 6);

    // Invalid module / preset rejected safely without calling bridge
    const sentBeforeBad = sentRaw.length;
    const badMod = await ctrl.setModule('nonexistent', true);
    const badPreset = await ctrl.applyPreset('ultra-fake');
    assert.equal(badMod.ok, false);
    assert.equal(badPreset.ok, false);
    assert.equal(sentRaw.length, sentBeforeBad);
  } finally {
    ctrl.destroy();
  }
  assert.equal(win.__agSagBridgeReceiver, undefined, 'destroy() must remove owned __agSagBridgeReceiver');

  // Timeout cleanup test: silent host bridge never replies
  const silentWin = {
    __agSagHostBridge() {
      // intentionally never invokes onResponse
    },
  };
  const timeoutCtrl = novSynergyMod.createNovSynergyController({
    win: silentWin,
    autoRefresh: false,
    requestTimeoutMs: 30,
  });
  try {
    const res = await timeoutCtrl.refresh();
    assert.equal(res.ok, false);
    assert.equal(res.timedOut, true);
    assert.equal(timeoutCtrl.getDebugState().pendingCount, 0, 'Timed-out request must be cleaned from pending map');
  } finally {
    timeoutCtrl.destroy();
  }
  assert.equal(silentWin.__agSagBridgeReceiver, undefined);
});

test('3. Four Dual-Star Synergy Effects: dual-shield, context-memory, radar-dedup, dual-star-hub & uninstalled fallback', () => {
  // Uninstalled -> empty synergy list
  const emptyEffects = novSynergyMod.computeSynergyEffects(
    { modules: { safeAutoAccept: true, compactGuard: true, sessionRadar: true } },
    { installed: false },
    { bridgeConnected: false }
  );
  assert.deepEqual(emptyEffects, []);

  // Case A: dual-shield recommend + context-memory tip + radar-dedup warn + dual-star-hub connected
  const effA = novSynergyMod.computeSynergyEffects(
    { modules: { safeAutoAccept: true, compactGuard: true, sessionRadar: true } },
    {
      installed: true,
      version: '0.2.0',
      config: {
        modules: {
          review: true,
          guard: false,
          xray: true,
          turbo: false,
          radar: true,
          canvas: false,
          mem: false,
          ops: false,
          remote: false,
        },
      },
    },
    { bridgeConnected: true }
  );
  const byIdA = Object.fromEntries(effA.map((e) => [e.id, e]));
  assert.equal(byIdA['dual-shield'].status, 'recommend');
  assert.deepEqual(
    { type: byIdA['dual-shield'].quickAction.type, moduleId: byIdA['dual-shield'].quickAction.moduleId },
    { type: 'enable-nov-module', moduleId: 'guard' }
  );
  assert.equal(byIdA['context-memory'].status, 'tip');
  assert.deepEqual(
    { type: byIdA['context-memory'].quickAction.type, moduleId: byIdA['context-memory'].quickAction.moduleId },
    { type: 'enable-nov-module', moduleId: 'mem' }
  );
  assert.equal(byIdA['radar-dedup'].status, 'warn');
  assert.deepEqual(
    { type: byIdA['radar-dedup'].quickAction.type, moduleId: byIdA['radar-dedup'].quickAction.moduleId },
    { type: 'disable-sag-module', moduleId: 'sessionRadar' }
  );
  assert.equal(byIdA['dual-star-hub'].status, 'connected');
  assert.equal(byIdA['dual-star-hub'].enabledCount, 3);
  assert.equal(byIdA['dual-star-hub'].toolCount, 10); // 2 base + review(2) + xray(4) + radar(2)

  // Case B: dual-shield active + context-memory active + no duplicate radar
  const effB = novSynergyMod.computeSynergyEffects(
    { modules: { safeAutoAccept: true, compactGuard: true, sessionRadar: false } },
    {
      installed: true,
      version: '0.2.0',
      config: {
        modules: {
          review: true,
          guard: true,
          xray: true,
          turbo: false,
          radar: true,
          canvas: false,
          mem: true,
          ops: false,
          remote: false,
        },
      },
    },
    { bridgeConnected: true }
  );
  const byIdB = Object.fromEntries(effB.map((e) => [e.id, e]));
  assert.equal(byIdB['dual-shield'].status, 'active');
  assert.equal(byIdB['dual-shield'].quickAction, null);
  assert.equal(byIdB['context-memory'].status, 'active');
  assert.equal(byIdB['context-memory'].quickAction, null);
  assert.equal(byIdB['radar-dedup'], undefined);
  assert.equal(byIdB['dual-star-hub'].enabledCount, 5);
  assert.equal(byIdB['dual-star-hub'].totalModules, 13);
  assert.ok(byIdB['dual-star-hub'].descEn.includes('agy-NOV'));
  assert.ok(byIdB['dual-star-hub'].descEn.includes('connected'));
  assert.equal(byIdB['dual-star-hub'].descEn.includes('/13'), false);
  assert.equal(byIdB['dual-star-hub'].descZh.includes('/13'), false);
  assert.equal(byIdB['dual-star-hub'].descZh.includes('零端口'), false);
  assert.equal(byIdB['dual-star-hub'].descZh.includes('模型工具'), false);

  // Case C: legacy 9-key state fallback & v0.5.0 verify/spec synergy awareness
  const normalizedLegacy = novSynergyMod.normalizeNovState({
    installed: true,
    config: {
      preset: 'core',
      modules: { review: true, guard: true, xray: true },
    },
  });
  assert.equal(normalizedLegacy.config.modules.verify, false);
  assert.equal(normalizedLegacy.config.modules.worktree, false);
  assert.equal(normalizedLegacy.config.modules.spec, false);
  assert.equal(normalizedLegacy.config.modules.studio, false);

  const effC = novSynergyMod.computeSynergyEffects(
    { modules: { safeAutoAccept: true, sessionWatchdog: true, promptQueue: true } },
    {
      installed: true,
      version: '0.5.0',
      config: {
        modules: { ...novSynergyMod.NOV_PRESETS_MAP.power.modules },
      },
    },
    { bridgeConnected: true }
  );
  const byIdC = Object.fromEntries(effC.map((e) => [e.id, e]));
  assert.equal(byIdC['dual-shield'].verifyActive, true);
  assert.equal(byIdC['verify-watchdog'].status, 'active');
  assert.equal(byIdC['spec-queue'].status, 'active');
  assert.equal(byIdC['dual-star-hub'].enabledCount, 9);
  assert.equal(byIdC['dual-star-hub'].toolCount, 32);
});

test('4. Native-grade settings hub: collapsible header, 5 SubTabs, 9 agy-NOV switches, 5 presets, 1-click synergy actions & reverse push', async () => {
  const { win, doc, storage } = createHostDom();
  const runtime = createSimNovRuntime({ installed: true, preset: 'core', extraModules: { guard: false, radar: true } });

  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
    novTransport: runtime.transport,
    config: {
      modules: {
        hostI18n: true,
        compactGuard: true,
        precompactExport: true,
        draftGuard: true,
        promptQueue: true,
        sessionWatchdog: true,
        outlineBookmarks: false,
        sessionRadar: true,
        safeAutoAccept: true,
        themeStudio: false,
        quotaPulse: true,
      },
    },
    getContextSnapshot: () => ({ usedFraction: 0.42, usedTokens: 215000, maxTokens: 512000, streaming: false }),
  });

  try {
    await api.novSynergy.refresh();
    await api.evaluateNow();

    const nativeSec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);
    assert.ok(nativeSec, 'Native settings section must be mounted');
    assert.equal(nativeSec.textContent.includes('Prism'), false, 'Standalone native UI must never mention Prism');

    // Summary header with live module count + dual-star badge + collapse/expand toggle
    const foldHead = nativeSec.querySelector('[data-testid="ag-sag-fold-head"]');
    const foldBody = nativeSec.querySelector('[data-testid="ag-sag-fold-body"]');
    const dualPill = nativeSec.querySelector('[data-testid="ag-sag-dual-star-pill"]');
    assert.ok(foldHead && foldBody && dualPill);
    assert.equal(foldBody.hidden, false);
    assert.ok(dualPill.textContent.includes('agy-NOV'));

    // Click foldHead collapses body; clicking dualPill expands and focuses nov SubTab
    foldHead.click();
    assert.equal(nativeSec.querySelector('[data-testid="ag-sag-fold-body"]').hidden, true);
    nativeSec.querySelector('[data-testid="ag-sag-dual-star-pill"]').click();
    assert.equal(nativeSec.querySelector('[data-testid="ag-sag-fold-body"]').hidden, false);
    assert.equal(api.prismBridge.getActiveSubTab(), 'nov');

    // Verify all 6 horizontal SubTabs work cleanly
    const subtabs = nativeSec.querySelectorAll('[data-ag-sag-subtab]');
    assert.deepEqual(
      subtabs.map((b) => b.getAttribute('data-ag-sag-subtab')),
      ['overview', 'ui', 'conversation', 'guard', 'nov', 'advanced']
    );
    nativeSec.querySelector('[data-ag-sag-subtab="ui"]').click();
    assert.ok(nativeSec.querySelector('[data-testid="ag-sag-host-locale-select"]'));
    assert.equal(nativeSec.querySelector('[data-testid="ag-sag-nov-panel"]'), null);

    // Switch back to 'nov' SubTab to exercise 13 module cards, 5 presets & 1-click synergy actions
    nativeSec.querySelector('[data-ag-sag-subtab="nov"]').click();
    assert.equal(nativeSec.querySelectorAll('[data-ag-nov-preset]').length, 5);
    assert.equal(nativeSec.querySelectorAll('[data-ag-nov-mod]').length, 13);
    assert.equal(
      nativeSec.querySelector('[data-ag-nov-mod="remote"]').getAttribute('data-privacy'),
      'opt-in-network'
    );

    // 1-click synergy action: enable agy-NOV guard
    const synZone = nativeSec.querySelector('[data-testid="ag-sag-synergy-effects"]');
    assert.ok(synZone);
    const enableGuardBtn = synZone.querySelector('[data-ag-synergy-action="enable-nov-module"][data-ag-synergy-target="guard"]');
    assert.ok(enableGuardBtn, 'Must show 1-click button to enable agy-NOV guard');
    enableGuardBtn.click();
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(runtime.state.config.modules.guard, true);
    assert.equal(
      nativeSec.querySelector('[data-ag-synergy-id="dual-shield"]').getAttribute('data-status'),
      'active'
    );

    // 1-click synergy action: enable agy-NOV mem
    const enableMemBtn = nativeSec.querySelector('[data-ag-synergy-action="enable-nov-module"][data-ag-synergy-target="mem"]');
    assert.ok(enableMemBtn, 'Must show 1-click button to enable agy-NOV mem');
    enableMemBtn.click();
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(runtime.state.config.modules.mem, true);
    assert.equal(
      nativeSec.querySelector('[data-ag-synergy-id="context-memory"]').getAttribute('data-status'),
      'active'
    );
    const metaEl = nativeSec.querySelector('[data-testid="ag-sag-nov-meta"]');
    assert.ok(metaEl);
    assert.equal(/\bcustom\b/.test(metaEl.textContent), false, `Must localize preset label instead of raw "custom": ${metaEl.textContent}`);

    // 1-click synergy action: disable duplicate agy-Sag sessionRadar
    const dedupBtn = nativeSec.querySelector('[data-ag-synergy-action="disable-sag-module"][data-ag-synergy-target="sessionRadar"]');
    assert.ok(dedupBtn, 'Must show 1-click button to disable duplicate sessionRadar');
    dedupBtn.click();
    assert.equal(api.getConfig().modules.sessionRadar, false);
    assert.equal(nativeSec.querySelector('[data-ag-synergy-id="radar-dedup"]'), null);

    // Direct module card toggle & preset switch
    nativeSec.querySelector('[data-ag-nov-mod="canvas"]').click();
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(runtime.state.config.modules.canvas, true);

    nativeSec.querySelector('[data-ag-nov-preset="local-all"]').click();
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(api.novSynergy.getState().config.preset, 'local-all');
    assert.equal(api.novSynergy.getState().toolCount, 43);
    assert.equal(nativeSec.querySelector('[data-ag-nov-preset="local-all"]').getAttribute('aria-pressed'), 'true');

    // Reverse onPush updates embedded panel automatically
    win.__agSagBridgeReceiver.onPush({
      event: 'nov:state',
      state: {
        installed: true,
        version: '0.2.0',
        config: {
          preset: 'minimal',
          modules: { ...novSynergyMod.NOV_PRESETS_MAP.minimal.modules },
        },
      },
    });
    assert.equal(nativeSec.querySelector('[data-ag-nov-preset="minimal"]').getAttribute('aria-pressed'), 'true');
    assert.equal(nativeSec.querySelector('[data-ag-nov-mod="review"]').getAttribute('aria-pressed'), 'false');
    assert.equal(nativeSec.querySelector('[data-ag-nov-mod="guard"]').getAttribute('aria-pressed'), 'true');

    // Public mountSag synergy helpers + standalone status pill data-synergy="1" & <= 8 buttons
    await api.setNovModule('xray', true);
    assert.equal(runtime.state.config.modules.xray, true);
    await api.applyNovPreset('power');
    assert.equal(api.novSynergy.getState().config.preset, 'power');
    assert.ok(api.getSynergyEffects().some((e) => e.id === 'dual-star-hub' && e.status === 'connected'));

    const pill = doc.querySelector(`[data-testid="${statusPill.PILL_TESTID}"]`);
    assert.ok(pill);
    assert.equal(pill.getAttribute('data-synergy'), '1');
    assert.ok(pill.title.includes('agy-NOV'));
    pill.click();
    const card = doc.querySelector(`[data-testid="${statusPill.CARD_TESTID}"]`);
    assert.ok(card && card.querySelectorAll('button').length <= 8, 'Standalone status card must remain <= 8 buttons');
  } finally {
    api.destroy();
  }

  // Zero leftover nodes or bridge globals after destroy()
  assert.equal(doc.querySelectorAll('[data-ag-sg-owned="1"]').length, 0);
  assert.equal(doc.querySelectorAll('[data-ag-sag-owned="1"]').length, 0);
  assert.equal(win.__agSagBridgeReceiver, undefined);
  assert.equal(win.__agSag, undefined);
});

test('5. Uninstalled agy-NOV fallback: renders companion recommendation card with 1-line install command & copy feedback', async () => {
  const { win, doc, storage } = createHostDom();
  const runtime = createSimNovRuntime({ installed: false });
  const copied = [];

  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
    novTransport: runtime.transport,
    onCopyText: (txt) => copied.push(txt),
  });

  try {
    await api.novSynergy.refresh();
    await api.evaluateNow();

    const nativeSec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);
    assert.ok(nativeSec);
    assert.equal(nativeSec.textContent.includes('Prism'), false);
    assert.equal(nativeSec.querySelector('[data-testid="ag-sag-dual-star-pill"]'), null);

    assert.equal(nativeSec.querySelector('[data-ag-sag-subtab="nov"]'), null, 'Uninstalled agy-NOV must not occupy a standalone secondary tab');
    nativeSec.querySelector('[data-ag-sag-subtab="ui"]').click();
    const promo = nativeSec.querySelector('[data-testid="ag-sag-nov-promo"]');
    assert.ok(promo, 'Must render companion recommendation card when agy-NOV is not installed');
    const cmdEl = promo.querySelector('[data-testid="ag-sag-nov-install-cmd"]');
    assert.equal(cmdEl.textContent, novSynergyMod.NOV_INSTALL_CMD);

    const copyBtn = promo.querySelector('[data-ag-nov-copy-install="1"]');
    assert.ok(copyBtn);
    copyBtn.click();
    assert.deepEqual(copied, [novSynergyMod.NOV_INSTALL_CMD]);
    assert.ok(nativeSec.querySelector('[data-ag-nov-copy-install="1"]').textContent.includes('✓'));
  } finally {
    api.destroy();
  }

  assert.equal(doc.querySelectorAll('[data-ag-sg-owned="1"]').length, 0);
  assert.equal(win.__agSagBridgeReceiver, undefined);
});

test('6. Regression [H-2 & L-2]: late host bridge attachment auto-refreshes when opening nov tab, and enabledToolsCount is honored', async () => {
  const { win, doc, storage } = createHostDom();
  let refreshCalls = 0;

  // Cold-start: mount before __agSagHostBridge exists on window
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    bindVaultShortcut: false,
  });

  try {
    assert.equal(api.novSynergy.getState().bridgeConnected, false);

    // Sidecar attaches __agSagHostBridge after initial mount (simulating cold-start race)
    win.__agSagHostBridge = (raw) => {
      const req = JSON.parse(raw);
      if (req.type === 'nov:get_state') {
        refreshCalls += 1;
        Promise.resolve().then(() => {
          win.__agSagBridgeReceiver?.onResponse?.({
            reqId: req.reqId,
            ok: true,
            data: {
              installed: true,
              version: '0.2.0',
              enabledToolsCount: 20,
              config: {
                schemaVersion: 1,
                preset: 'power',
                locale: 'ja',
                modules: {
                  review: true,
                  guard: true,
                  xray: true,
                  turbo: true,
                  radar: true,
                  canvas: false,
                  mem: false,
                  ops: true,
                  remote: false,
                },
              },
            },
          });
        });
      }
    };

    const nativeSec = doc.querySelector(`[data-testid="${prismBridge.NATIVE_SECTION_TESTID}"]`);
    assert.ok(nativeSec);
    // Opening UI tab auto-triggers discovery once late bridge becomes available, revealing nov tab when installed
    nativeSec.querySelector('[data-ag-sag-subtab="ui"]').click();
    await new Promise((r) => setTimeout(r, 20));
    nativeSec.querySelector('[data-ag-sag-subtab="nov"]')?.click();

    assert.equal(refreshCalls, 1, 'Opening nov tab must trigger single auto-refresh once late bridge becomes available');
    assert.equal(api.novSynergy.getState().bridgeConnected, true);
    assert.equal(api.novSynergy.getState().installed, true);
    assert.equal(api.novSynergy.getState().toolCount, 20, 'normalizeNovState must honor enabledToolsCount from nov-bridge');
    assert.equal(api.novSynergy.getState().config.locale, 'ja');
    assert.ok(nativeSec.querySelector('[data-testid="ag-sag-nov-mod-grid"]'), 'Connected 9-module agy-NOV grid must render after auto-refresh');
  } finally {
    api.destroy();
  }
});
