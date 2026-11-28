import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildInjectExpression, REMOVE_EXPRESSION } from '../cli/bundle.mjs';

const require = createRequire(import.meta.url);
const themeStudio = require('../packages/core/theme-studio.js');
const coexist = require('../packages/core/coexist.js');
const i18n = require('../packages/core/i18n.js');
const styles = require('../packages/core/styles.js');
const promptLibrary = require('../packages/core/prompt-library.js');
const readingNav = require('../packages/core/reading-nav.js');
const prismBridge = require('../packages/core/prism-bridge.js');
const core = require('../packages/core/index.js');

function createRichMockDom({ hostTheme = 'dark' } = {}) {
  const listeners = new Map();
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
    const elLs = new Map();
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
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 1600,
      clientLeft: 0,
      clientTop: 0,
      style: {},
      children: [],
      parentElement: null,
      parentNode: null,
      _text: '',
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
      get attributes() {
        return [...attrs.entries()].map(([name, value]) => ({ name, value }));
      },
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
        if (k === 'id') el.id = '';
        if (k === 'class') cls.clear();
      },
      appendChild(child) {
        if (child.parentElement) child.remove();
        child.parentElement = el;
        child.parentNode = el;
        el.children.push(child);
        return child;
      },
      insertBefore(child, ref) {
        if (child.parentElement) child.remove();
        child.parentElement = el;
        child.parentNode = el;
        const idx = ref ? el.children.indexOf(ref) : -1;
        if (idx === -1) el.children.push(child);
        else el.children.splice(idx, 0, child);
        return child;
      },
      removeChild(child) {
        const idx = el.children.indexOf(child);
        if (idx !== -1) el.children.splice(idx, 1);
        child.parentElement = null;
        child.parentNode = null;
        return child;
      },
      remove() {
        if (el.parentElement) el.parentElement.removeChild(el);
      },
      contains(other) {
        let cur = other;
        while (cur) {
          if (cur === el) return true;
          cur = cur.parentElement;
        }
        return false;
      },
      closest(sel) {
        let cur = el;
        while (cur) {
          if (cur.nodeType === 1 && matches(cur, sel)) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = (node) => {
          for (const c of node.children || []) {
            if (c.nodeType === 1 && matches(c, sel)) out.push(c);
            walk(c);
          }
        };
        walk(el);
        return out;
      },
      querySelector(sel) {
        return el.querySelectorAll(sel)[0] || null;
      },
      getBoundingClientRect() {
        return { left: 20, top: 40, right: 420, bottom: 160, width: 400, height: 120 };
      },
      scrollTo(opts) {
        el.scrollTop = typeof opts === 'object' ? opts.top : Number(opts) || 0;
      },
      addEventListener(ev, fn) {
        if (!elLs.has(ev)) elLs.set(ev, new Set());
        elLs.get(ev).add(fn);
      },
      removeEventListener(ev, fn) {
        elLs.get(ev)?.delete(fn);
      },
      dispatchEvent(ev) {
        const set = elLs.get(ev.type);
        if (set) for (const fn of [...set]) fn(ev);
      },
      click() {
        el.dispatchEvent({ type: 'click', target: el, preventDefault() {}, stopPropagation() {} });
      },
    };
    return el;
  };

  const html = makeEl('html');
  html.setAttribute('data-theme', hostTheme);
  const head = makeEl('head');
  const body = makeEl('body');
  html.appendChild(head);
  html.appendChild(body);

  const doc = {
    documentElement: html,
    head,
    body,
    hidden: false,
    activeElement: null,
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => html.querySelector(`#${id}`),
    querySelector: (sel) => html.querySelector(sel),
    querySelectorAll: (sel) => html.querySelectorAll(sel),
    addEventListener(ev, fn) {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev).add(fn);
    },
    removeEventListener(ev, fn) {
      listeners.get(ev)?.delete(fn);
    },
    dispatchEvent(ev) {
      const set = listeners.get(ev.type);
      if (set) for (const fn of [...set]) fn(ev);
    },
  };

  return { doc, html, head, body, makeEl };
}

test('Phase 13: 16 theme presets, 8 look presets, auto dark/light pairing & Browser Hole transparency guard', () => {
  assert.equal(Object.keys(themeStudio.THEME_PRESETS).length, 16);
  assert.equal(Object.keys(themeStudio.LOOK_PRESETS).length, 8);
  assert.equal(Object.keys(themeStudio.ACCENT_PRESETS).length, 7);
  assert.equal(Object.keys(themeStudio.CORNER_PRESETS).length, 4);
  assert.equal(Object.keys(themeStudio.SURFACE_PRESETS).length, 4);
  assert.equal(Object.keys(themeStudio.CODE_FONT_PRESETS).length, 6);

  // Auto dark/light pairing resolves obsidian-prism -> crystal-day on light host, and warm-basalt -> warm-paper
  const pairedLight = themeStudio.resolveEffectivePreset('obsidian-prism', true, 'light');
  assert.equal(pairedLight.id, 'crystal-day');
  const pairedWarm = themeStudio.resolveEffectivePreset('warm-basalt', true, 'light');
  assert.equal(pairedWarm.id, 'warm-paper');
  const unpaired = themeStudio.resolveEffectivePreset('obsidian-prism', false, 'light');
  assert.equal(unpaired.id, 'obsidian-prism');

  // Every look preset resolves to a valid sanitized config patch and produces zero-:has() CSS
  for (const lookId of Object.keys(themeStudio.LOOK_PRESETS)) {
    const patch = themeStudio.resolveLookPresetPatch(lookId);
    assert.ok(patch && patch.themePreset, `look ${lookId} must return valid patch`);
    const cfg = coexist.sanitizeConfig(patch);
    assert.equal(cfg.themePreset, patch.themePreset);
    const css = themeStudio.buildThemeCss({
      preset: cfg.themePreset,
      autoPair: cfg.themeAutoPair,
      accent: cfg.themeAccent,
      corners: cfg.themeCorners,
      surface: cfg.themeSurface,
      codeFont: cfg.themeCodeFont,
      codeLigatures: cfg.themeCodeLigatures,
      ambientGlow: cfg.themeAmbientGlow,
      streamFade: cfg.themeStreamFade,
      smoothCaret: cfg.themeSmoothCaret,
      density: cfg.themeDensity,
    });
    assert.equal(css.includes(':has('), false, `look ${lookId} must never emit :has()`);
    assert.equal(css.includes('.ag-cs-'), false, `look ${lookId} must never touch .ag-cs-`);
    assert.ok(css.includes('data-has-browser-hole="true"'), `look ${lookId} must protect Browser Hole transparency`);
    assert.ok(css.includes('--sidebar:'), `look ${lookId} must set host surface --sidebar`);
    assert.ok(css.includes('--vscode-editor-background:'), `look ${lookId} must set editor surface var`);
  }

  // Ligatures + Sarasa font stack
  const ligCss = themeStudio.buildThemeCss({
    preset: 'pixel-terminal',
    codeFont: 'sarasa',
    codeLigatures: true,
    accent: 'emerald',
    corners: 'sharp',
    surface: 'paper',
    ambientGlow: 'vivid',
  });
  assert.ok(ligCss.includes('Sarasa Mono SC'));
  assert.ok(ligCss.includes('"calt" 1, "liga" 1'));
  assert.ok(ligCss.includes('data-ag-sag-conv-state="running"'));
  assert.ok(ligCss.includes('::highlight(ag-sag-sf0)'));
});

test('Phase 13: Velvet Stream Feathering (CSS.highlights), FastDOM Smooth Caret & 0fps Semantic Glow clean teardown', () => {
  const { doc, html, body, makeEl } = createRichMockDom({ hostTheme: 'dark' });

  // Mock CSS.highlights + Highlight + createRange
  const hlMap = new Map();
  class MockHighlight {
    constructor() {
      this.ranges = new Set();
    }
    add(r) {
      this.ranges.add(r);
    }
    delete(r) {
      this.ranges.delete(r);
    }
  }
  doc.createRange = () => ({
    start: null,
    end: null,
    setStart(n, o) {
      this.start = [n, o];
    },
    setEnd(n, o) {
      this.end = [n, o];
    },
  });

  // Build composer + agent response DOM
  const inputBox = makeEl('div');
  inputBox.setAttribute('data-testid', 'agent-input-box');
  const editorHost = makeEl('div');
  const editor = makeEl('div');
  editor.setAttribute('contenteditable', 'true');
  editorHost.appendChild(editor);
  inputBox.appendChild(editorHost);
  body.appendChild(inputBox);

  const agentResp = makeEl('div');
  agentResp.setAttribute('data-testid', 'agent-response');
  const para = makeEl('p');
  agentResp.appendChild(para);
  body.appendChild(agentResp);

  const textNode = { nodeType: 3, nodeValue: 'Hello', parentElement: para, isConnected: true };
  let moCb = null;
  class MockMutationObserver {
    constructor(cb) {
      moCb = cb;
      this.disconnected = false;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }

  doc.activeElement = editor;
  doc.getSelection = () => ({
    rangeCount: 1,
    getRangeAt: () => ({
      collapsed: true,
      startContainer: editor,
      getClientRects: () => [{ left: 48, top: 60, height: 18 }],
      getBoundingClientRect: () => ({ left: 48, top: 60, height: 18 }),
    }),
  });

  const win = {
    document: doc,
    devicePixelRatio: 2,
    CSS: { highlights: hlMap },
    Highlight: MockHighlight,
    MutationObserver: MockMutationObserver,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };

  const ctrl = themeStudio.createThemeStudioController({
    win,
    doc,
    enabled: true,
    preset: 'obsidian-prism',
    surface: 'smoked',
    streamFade: true,
    smoothCaret: true,
    ambientGlow: 'subtle',
  });

  // Smooth caret painted as body-level fixed overlay (zero intrusion into Lexical editorHost)
  const caret = doc.body.querySelector('.ag-sag-smooth-caret');
  assert.ok(caret, 'smooth caret node must be mounted on doc.body');
  assert.equal(editorHost.querySelector('.ag-sag-smooth-caret'), null, 'must not intrude into editorHost');
  assert.equal(editorHost.hasAttribute('data-ag-sag-caret-host'), false, 'must not mutate editorHost attributes');
  assert.equal(caret.getAttribute('data-visible'), '1');
  assert.equal(editor.getAttribute('data-ag-sag-smooth-caret'), '1');
  assert.equal(caret.style.transform, 'translate3d(48px, 60px, 0)');

  // Semantic glow state updates
  ctrl.setConvState('running');
  assert.equal(html.getAttribute('data-ag-sag-conv-state'), 'running');
  ctrl.setConvState('awaiting');
  assert.equal(html.getAttribute('data-ag-sag-conv-state'), 'awaiting');

  // Stream fade enqueues into CSS.highlights bucket 0
  assert.ok(typeof moCb === 'function');
  textNode.nodeValue = 'Hello world!';
  moCb([{ type: 'characterData', target: textNode, oldValue: 'Hello' }]);
  assert.equal(hlMap.has('ag-sag-sf0'), true);
  assert.equal(hlMap.get('ag-sag-sf0').ranges.size, 1);

  // Destroy leaves zero artifacts
  ctrl.destroy();
  assert.equal(doc.body.querySelector('.ag-sag-smooth-caret'), null);
  assert.equal(editor.hasAttribute('data-ag-sag-smooth-caret'), false);
  assert.equal(editorHost.hasAttribute('data-ag-sag-caret-host'), false);
  assert.equal(html.hasAttribute('data-ag-sag-conv-state'), false);
  assert.equal(html.hasAttribute('data-ag-sag-theme'), false);
  assert.equal(hlMap.size, 0, 'all CSS.highlights buckets must be cleared on destroy');
});

test('Phase 13: PromptLibrary standalone context menu supports /btw & /plan and yields to Prism', () => {
  const { doc, body, makeEl } = createRichMockDom();
  const conv = makeEl('div');
  conv.setAttribute('data-testid', 'conversation-view');
  body.appendChild(conv);

  const inputBox = makeEl('div');
  inputBox.setAttribute('data-testid', 'agent-input-box');
  const ta = makeEl('textarea');
  inputBox.appendChild(ta);
  body.appendChild(inputBox);

  const pl = promptLibrary.createPromptLibraryController({
    win: { document: doc, Event },
    doc,
    enabled: true,
    autoObserve: false,
  });

  // Selection menu includes /btw
  assert.equal(pl.openContextMenu({ selection: 'why does this fail?', x: 20, y: 30 }), true);
  const btwBtn = doc.querySelector('[data-ag-sag-ctx-act="btw-sel"]');
  assert.ok(btwBtn, 'selection context menu should include /btw');
  btwBtn.click();
  assert.equal(ta.value, '/btw why does this fail? ');

  // Quick slash menu protects parameterized /btw draft, and replaces bare slash placeholder cleanly
  assert.equal(pl.openContextMenu({ allowQuickSlash: true, x: 20, y: 30 }), true);
  const planBtn = doc.querySelector('[data-ag-sag-ctx-act="plan-quick"]');
  assert.ok(planBtn, 'quick context menu should include /plan');
  planBtn.click();
  assert.equal(ta.value, '/btw why does this fail? ', 'Parameterized slash draft must not be overwritten');

  ta.value = '/btw';
  assert.equal(pl.openContextMenu({ allowQuickSlash: true, x: 20, y: 30 }), true);
  doc.querySelector('[data-ag-sag-ctx-act="plan-quick"]').click();
  assert.equal(ta.value, '/plan ');

  // Auto-yield when Obsidian Prism context menu marker is active
  const prismMenu = makeEl('div');
  prismMenu.className = 'ag-cs-ctx-menu';
  body.appendChild(prismMenu);
  assert.equal(pl.openContextMenu({ allowQuickSlash: true, x: 20, y: 30 }), false);

  pl.destroy();
  assert.equal(doc.querySelector('[data-testid="ag-sag-ctx-menu"]'), null);
});

test('Phase 13: ReadingNav exposes smooth scroll-to-bottom button in turn rail', () => {
  const { doc, body, makeEl } = createRichMockDom();
  const conv = makeEl('div');
  conv.setAttribute('data-testid', 'conversation-view');
  const vp = makeEl('div');
  vp.setAttribute('data-testid', 'autoscroll-viewport');
  vp.scrollTop = 100;
  vp.scrollHeight = 2400;
  const b1 = makeEl('div');
  b1.setAttribute('data-testid', 'user-message-bubble');
  b1.textContent = 'First turn';
  const b2 = makeEl('div');
  b2.setAttribute('data-testid', 'user-message-bubble');
  b2.textContent = 'Second turn';
  vp.appendChild(b1);
  vp.appendChild(b2);
  conv.appendChild(vp);
  body.appendChild(conv);

  const rn = readingNav.createReadingNavController({
    win: { document: doc },
    doc,
    enabled: true,
    autoObserve: false,
  });

  const bottomBtn = doc.querySelector('[data-ag-sag-rnav-step="bottom"]');
  assert.ok(bottomBtn, 'mini rail must render scroll-to-bottom button');
  bottomBtn.click();
  assert.equal(vp.scrollTop, 2400);
  rn.destroy();
});

test('Phase 13: Settings Hub UI tab keeps 0 duplicate master switches, i18n parity, zero Prism leaks & <= 1.6 MiB ru cap', () => {
  // 1. SAG_UI_PACKS key parity & zero "Prism" leaks
  const zhKeys = Object.keys(i18n.SAG_UI_PACKS['zh-CN']).sort();
  const twKeys = Object.keys(i18n.SAG_UI_PACKS['zh-TW']).sort();
  const enKeys = Object.keys(i18n.SAG_UI_PACKS.en).sort();
  assert.deepEqual(twKeys, zhKeys, 'zh-TW SAG_UI_PACKS keys must match zh-CN');
  assert.deepEqual(enKeys, zhKeys, 'en SAG_UI_PACKS keys must match zh-CN');
  for (const loc of ['zh-CN', 'zh-TW', 'en']) {
    for (const [k, v] of Object.entries(i18n.SAG_UI_PACKS[loc])) {
      assert.equal(/\bPrism\b/i.test(String(v)), false, `SAG_UI_PACKS.${loc}.${k} must not leak "Prism"`);
    }
  }

  // 2. Core styles zero :has() and zero .ag-cs-
  assert.equal(styles.CORE_CSS.includes(':has('), false);
  assert.equal(styles.CORE_CSS.includes('.ag-cs-'), false);

  // 3. UI tab renders 8 looks, 16 theme swatches, and 0 master module switches
  const { doc, body, makeEl } = createRichMockDom();
  const dlg = makeEl('div');
  dlg.setAttribute('role', 'dialog');
  const p6 = makeEl('div');
  p6.className = 'p-6';
  const h2 = makeEl('h2');
  h2.textContent = 'Appearance';
  const sec = makeEl('div');
  sec.className = 'space-y-2';
  p6.appendChild(h2);
  p6.appendChild(sec);
  dlg.appendChild(p6);
  body.appendChild(dlg);

  const storage = new Map([['agSag.ui.activeSubTab.v1', 'ui']]);
  const fakeStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };

  let cfg = coexist.sanitizeConfig({});
  const bridge = prismBridge.createPrismBridgeController({
    win: { document: doc, localStorage: fakeStorage },
    doc,
    storage: fakeStorage,
    getConfig: () => cfg,
    onUpdateConfig: (patch) => {
      cfg = coexist.sanitizeConfig({ ...cfg, ...patch, modules: { ...cfg.modules, ...(patch.modules || {}) } });
      bridge.sync();
      return cfg;
    },
  });
  bridge.sync();

  assert.equal(doc.querySelectorAll('[data-ag-sag-mod]').length, 0, 'UI tab must never duplicate master switches');
  assert.equal(doc.querySelectorAll('[data-ag-sag-look]').length, 8, 'UI tab must render 8 one-click look presets');
  assert.equal(doc.querySelectorAll('[data-ag-sag-theme]').length, 16, 'UI tab must render 16 theme swatches');

  // Clicking a look preset applies theme + surface + enables themeStudio
  doc.querySelector('[data-ag-sag-look="matcha-note"]').click();
  assert.equal(cfg.modules.themeStudio, true);
  assert.equal(cfg.themePreset, 'matcha-journal');
  assert.equal(cfg.themeSurface, 'paper');
  assert.equal(cfg.themeAccent, 'emerald');
  bridge.destroy();

  // 4. Bundle size <= 1.6 MiB hard budget & REMOVE_EXPRESSION cleans caret + highlights
  const ruExpr = buildInjectExpression(null, { extLocale: 'ru' });
  const ruBytes = Buffer.byteLength(ruExpr, 'utf8');
  assert.ok(ruBytes <= 1677721, `ru sync bundle (${ruBytes} B) exceeded 1,677,721 B cap`);
  assert.ok(REMOVE_EXPRESSION.includes('ag-sag-smooth-caret'));
  assert.ok(REMOVE_EXPRESSION.includes('ag-sag-sf0'));

  // 5. Full integration mountSag exposes 14 modules (incl. v1.4 opt-in thoughtTranslate)
  assert.equal(coexist.MODULE_CATALOG.length, 14);
  const inst = core.mountSag({ win: { document: doc, localStorage: fakeStorage }, doc, storage: fakeStorage, autoObserve: false });
  inst.updateConfig({ modules: { themeStudio: true }, themePreset: 'aurora-glass', themeSurface: 'glass' });
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme-preset'), 'aurora-glass');
  inst.destroy();
  assert.equal(doc.documentElement.hasAttribute('data-ag-sag-theme'), false);
});

test('Phase 13 hardening: all 15 skins and 6 accents pass WCAG AA contrast gates', () => {
  const hexToRgb = (h) => {
    const s = h.replace('#', '');
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => {
    const l1 = lum(hexToRgb(a));
    const l2 = lum(hexToRgb(b));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  for (const [id, spec] of Object.entries(themeStudio.THEME_PRESETS)) {
    if (!spec.vars) continue;
    const v = spec.vars;
    assert.ok(contrast(v['--foreground'], v['--background']) >= 7, `${id} fg/bg must >= 7`);
    assert.ok(contrast(v['--foreground'], v['--card']) >= 7, `${id} fg/card must >= 7`);
    assert.ok(contrast(v['--muted-foreground'], v['--background']) >= 4.5, `${id} muted/bg must >= 4.5`);
    assert.ok(contrast(v['--muted-foreground'], v['--card']) >= 4.5, `${id} muted/card must >= 4.5`);
    assert.ok(contrast(v['--primary-foreground'], v['--primary']) >= 4.5, `${id} primaryFg/primary must >= 4.5`);
    assert.ok(contrast(v['--link'], v['--background']) >= 4.5, `${id} link/bg must >= 4.5`);
  }
  for (const [id, spec] of Object.entries(themeStudio.ACCENT_PRESETS)) {
    if (!spec.dark) continue;
    assert.ok(contrast(spec.dark.fg, spec.dark.primary) >= 4.5, `accent ${id} dark fg/primary must >= 4.5`);
    assert.ok(contrast(spec.light.fg, spec.light.primary) >= 4.5, `accent ${id} light fg/primary must >= 4.5`);
  }
});

test('Phase 13 hardening: Look switching clears prior codeFont/ligatures, matchesLookPreset is exact, and dark host clicking light skin is WYSIWYG', () => {
  const { doc, html, body, makeEl } = createRichMockDom({ hostTheme: 'dark' });
  const dlg = makeEl('div');
  dlg.setAttribute('role', 'dialog');
  const p6 = makeEl('div');
  p6.className = 'p-6';
  const h2 = makeEl('h2');
  h2.textContent = 'Appearance';
  const sec = makeEl('div');
  sec.className = 'space-y-2';
  p6.appendChild(h2);
  p6.appendChild(sec);
  dlg.appendChild(p6);
  body.appendChild(dlg);

  const storage = new Map([['agSag.ui.activeSubTab.v1', 'ui']]);
  const fakeStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };

  let cfg = coexist.sanitizeConfig({});
  assert.equal(cfg.themeAutoPair, false, 'themeAutoPair default must be false so clicking any skin is WYSIWYG');

  const bridge = prismBridge.createPrismBridgeController({
    win: { document: doc, localStorage: fakeStorage },
    doc,
    storage: fakeStorage,
    getConfig: () => cfg,
    onUpdateConfig: (patch) => {
      cfg = coexist.sanitizeConfig({ ...cfg, ...patch, modules: { ...cfg.modules, ...(patch.modules || {}) } });
      bridge.sync();
      return cfg;
    },
  });
  bridge.sync();

  // When themeStudio is OFF, sub-option chips must not falsely report aria-pressed="true"
  assert.equal(doc.querySelector('[data-ag-sag-theme-surface="smoked"]').getAttribute('aria-pressed'), 'false');
  assert.equal(doc.querySelector('[data-ag-sag-theme-accent="follow"]').getAttribute('aria-pressed'), 'false');
  assert.equal(doc.querySelectorAll('.ag-sag-subrow').length, 6, 'Surface/Corners/Density & Font/Motion/Glow must render 6 labeled sub-rows');

  // Switch pixel-geek -> matcha-note must reset codeFont & ligatures cleanly
  doc.querySelector('[data-ag-sag-look="pixel-geek"]').click();
  assert.equal(cfg.themeCodeFont, 'jetbrains');
  assert.equal(cfg.themeCodeLigatures, true);
  assert.equal(doc.querySelector('[data-ag-sag-look="pixel-geek"]').getAttribute('aria-pressed'), 'true');

  doc.querySelector('[data-ag-sag-look="matcha-note"]').click();
  assert.equal(cfg.themeCodeFont, 'default');
  assert.equal(cfg.themeCodeLigatures, false);
  assert.equal(doc.querySelector('[data-ag-sag-look="matcha-note"]').getAttribute('aria-pressed'), 'true');

  // Tweaking accent breaks exact look match
  doc.querySelector('[data-ag-sag-theme-accent="rose"]').click();
  assert.equal(doc.querySelector('[data-ag-sag-look="matcha-note"]').getAttribute('aria-pressed'), 'false');

  // Enable prism-obsidian (WYSIWYG), explicitly toggle autoPair ON, then click light skin matcha-journal -> disables autoPair so WYSIWYG
  doc.querySelector('[data-ag-sag-look="prism-obsidian"]').click();
  assert.equal(cfg.themeAutoPair, false);
  doc.querySelector('[data-ag-sag-theme-autopair]').click();
  assert.equal(cfg.themeAutoPair, true);
  doc.querySelector('[data-ag-sag-theme="matcha-journal"]').click();
  assert.equal(cfg.themePreset, 'matcha-journal');
  assert.equal(cfg.themeAutoPair, false);

  // Dark host with themeAutoPair=true clicking light look matcha-note must also disable autoPair immediately (WYSIWYG)
  doc.querySelector('[data-ag-sag-theme-autopair]').click();
  assert.equal(cfg.themeAutoPair, true);
  doc.querySelector('[data-ag-sag-look="matcha-note"]').click();
  assert.equal(cfg.themePreset, 'matcha-journal');
  assert.equal(cfg.themeAutoPair, false);

  // Light host with migrated themeAutoPair=true clicking dark look prism-obsidian must turn dark immediately
  const lightDom = createRichMockDom({ hostTheme: 'light' });
  const lightDlg = lightDom.makeEl('div');
  lightDlg.setAttribute('role', 'dialog');
  const lp6 = lightDom.makeEl('div');
  lp6.className = 'p-6';
  const lh2 = lightDom.makeEl('h2');
  lh2.textContent = 'Appearance';
  const lsec = lightDom.makeEl('div');
  lsec.className = 'space-y-2';
  lp6.appendChild(lh2);
  lp6.appendChild(lsec);
  lightDlg.appendChild(lp6);
  lightDom.body.appendChild(lightDlg);
  const lightStore = new Map([['agSag.ui.activeSubTab.v1', 'ui']]);
  const lightFakeStorage = {
    getItem: (k) => (lightStore.has(k) ? lightStore.get(k) : null),
    setItem: (k, v) => lightStore.set(k, String(v)),
    removeItem: (k) => lightStore.delete(k),
  };
  const lightInst = core.mountSag({
    win: { document: lightDom.doc, localStorage: lightFakeStorage },
    doc: lightDom.doc,
    storage: lightFakeStorage,
    autoObserve: false,
    autoPoll: false,
    bindVaultShortcut: false,
    config: {
      themePreset: 'obsidian-prism',
      themeAutoPair: true,
      modules: { themeStudio: true, hostI18n: false, compactGuard: false },
    },
  });
  try {
    assert.equal(lightDom.html.getAttribute('data-ag-sag-theme-resolved'), 'crystal-day');
    assert.equal(lightDom.html.getAttribute('data-ag-sag-theme-scheme'), 'light');
    lightDom.doc.querySelector('[data-ag-sag-look="prism-obsidian"]').click();
    assert.equal(lightInst.getConfig().themeAutoPair, false);
    assert.equal(lightDom.html.getAttribute('data-ag-sag-theme-resolved'), 'obsidian-prism');
    assert.equal(lightDom.html.getAttribute('data-ag-sag-theme-scheme'), 'dark');
    lightDom.doc.querySelector('[data-ag-sag-look="matcha-note"]').click();
    assert.equal(lightDom.html.getAttribute('data-ag-sag-theme-resolved'), 'matcha-journal');
    assert.equal(lightDom.html.getAttribute('data-ag-sag-theme-scheme'), 'light');
  } finally {
    lightInst.destroy();
  }

  // Verify live host data-theme MutationObserver updates autoPair automatically
  const moInstances = [];
  class TrackedMO {
    constructor(cb) {
      this.cb = cb;
      this.disconnected = false;
      moInstances.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  const ctrl = themeStudio.createThemeStudioController({
    win: {
      document: doc,
      MutationObserver: TrackedMO,
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    },
    doc,
    enabled: true,
    preset: 'obsidian-prism',
    autoPair: true,
    streamFade: false,
    smoothCaret: false,
  });
  assert.equal(html.getAttribute('data-ag-sag-theme-resolved'), 'obsidian-prism');
  html.setAttribute('data-theme', 'light');
  moInstances.forEach((m) => m.cb([]));
  assert.equal(html.getAttribute('data-ag-sag-theme-resolved'), 'crystal-day');

  ctrl.destroy();
  bridge.destroy();
  assert.ok(moInstances.every((m) => m.disconnected));
});

test('Phase 13 hardening: Smooth Caret IME guard + Lexical <br> fallback + lazy mount + React element stream fade + dedicated ambient glow node', () => {
  const { doc, html, body, makeEl } = createRichMockDom({ hostTheme: 'dark' });
  const hlMap = new Map();
  class MockHighlight {
    constructor() {
      this.ranges = new Set();
    }
    add(r) {
      this.ranges.add(r);
    }
    delete(r) {
      this.ranges.delete(r);
    }
  }
  doc.createRange = () => ({ setStart() {}, setEnd() {} });

  const inputBox = makeEl('div');
  inputBox.setAttribute('data-testid', 'agent-input-box');
  const editorHost = makeEl('div');
  const editor = makeEl('div');
  editor.setAttribute('contenteditable', 'true');
  editorHost.appendChild(editor);
  inputBox.appendChild(editorHost);
  body.appendChild(inputBox);

  const agentResp = makeEl('div');
  agentResp.setAttribute('data-testid', 'agent-response');
  body.appendChild(agentResp);

  const mos = [];
  class TrackedMO {
    constructor(cb) {
      this.cb = cb;
      mos.push(this);
    }
    observe() {}
    disconnect() {}
  }

  // Initially unfocused -> lazy mount must NOT create caret DOM
  doc.activeElement = null;
  const brNode = makeEl('br');
  brNode.nodeName = 'BR';
  brNode.getBoundingClientRect = () => ({ left: 32, top: 84, height: 20 });
  const lineP = makeEl('p');
  lineP.childNodes = [brNode];
  lineP.appendChild(brNode);
  editor.appendChild(lineP);

  doc.getSelection = () => ({
    rangeCount: 1,
    getRangeAt: () => ({
      collapsed: true,
      startContainer: lineP,
      startOffset: 0,
      getClientRects: () => [],
      getBoundingClientRect: () => ({ left: 0, top: 0, height: 0 }),
    }),
  });

  const ctrl = themeStudio.createThemeStudioController({
    win: {
      document: doc,
      devicePixelRatio: 1,
      CSS: { highlights: hlMap },
      Highlight: MockHighlight,
      MutationObserver: TrackedMO,
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    },
    doc,
    enabled: true,
    preset: 'obsidian-prism',
    ambientGlow: 'subtle',
    streamFade: true,
    smoothCaret: true,
  });

  assert.equal(doc.body.querySelector('.ag-sag-smooth-caret'), null, 'unfocused editor must not eagerly mount caret DOM');
  assert.ok(doc.querySelector('.ag-sag-ambient-glow'), 'dedicated ambient glow element must be mounted');

  // Focus on empty Lexical <p><br></p> line -> uses BR viewport rect (32, 84) in fixed body overlay
  doc.activeElement = editor;
  doc.dispatchEvent({ type: 'focusin' });
  const caret = doc.body.querySelector('.ag-sag-smooth-caret');
  assert.ok(caret);
  assert.equal(editorHost.querySelector('.ag-sag-smooth-caret'), null);
  assert.equal(caret.getAttribute('data-visible'), '1');
  assert.equal(caret.style.transform, 'translate3d(32px, 84px, 0)');

  // IME compositionstart hides custom caret and restores native caret; compositionend restores custom caret
  doc.dispatchEvent({ type: 'compositionstart' });
  assert.equal(caret.hasAttribute('data-visible'), false);
  assert.equal(editor.hasAttribute('data-ag-sag-smooth-caret'), false);
  doc.dispatchEvent({ type: 'compositionend' });
  assert.equal(caret.getAttribute('data-visible'), '1');

  // Stream fade handles React-inserted <p> element containing text node, and skips bulk history (>800 chars)
  const newP = makeEl('p');
  const newText = { nodeType: 3, nodeValue: 'Streamed paragraph chunk', parentElement: newP, isConnected: true };
  newP.childNodes = [newText];
  agentResp.appendChild(newP);
  mos.forEach((m) => m.cb([{ type: 'childList', addedNodes: [newP] }]));
  assert.equal(hlMap.get('ag-sag-sf0')?.ranges.size, 1);

  const bulkP = makeEl('p');
  const bulkText = { nodeType: 3, nodeValue: 'x'.repeat(900), parentElement: bulkP, isConnected: true };
  bulkP.childNodes = [bulkText];
  agentResp.appendChild(bulkP);
  mos.forEach((m) => m.cb([{ type: 'childList', addedNodes: [bulkP] }]));
  assert.equal(hlMap.get('ag-sag-sf0')?.ranges.size, 1, 'bulk >800 char history mount must not flash-fade');

  ctrl.destroy();
  assert.equal(doc.querySelector('.ag-sag-ambient-glow'), null);
  assert.equal(editorHost.querySelector('.ag-sag-smooth-caret'), null);
  assert.equal(html.hasAttribute('data-ag-sag-theme'), false);
});

test('Phase 13 hardening: PromptLibrary context menu respects interactive elements, Shift+Right-Click native passthrough, draft safety & viewport clamp', () => {
  const { doc, body, makeEl } = createRichMockDom();
  const conv = makeEl('div');
  conv.setAttribute('data-testid', 'conversation-view');
  const link = makeEl('a');
  link.setAttribute('href', 'https://example.com');
  link.textContent = 'Docs';
  const plainP = makeEl('p');
  plainP.textContent = 'Assistant reply paragraph';
  conv.appendChild(link);
  conv.appendChild(plainP);
  body.appendChild(conv);

  const inputBox = makeEl('div');
  inputBox.setAttribute('data-testid', 'agent-input-box');
  const ta = makeEl('textarea');
  inputBox.appendChild(ta);
  body.appendChild(inputBox);

  const pl = promptLibrary.createPromptLibraryController({
    win: { document: doc, Event, innerWidth: 400, innerHeight: 300 },
    doc,
    enabled: true,
    autoObserve: false,
  });

  // Right-click on <a href> link must NOT hijack native menu
  let prevented = false;
  doc.dispatchEvent({ type: 'contextmenu', target: link, clientX: 50, clientY: 50, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(doc.querySelector('[data-testid="ag-sag-ctx-menu"]'), null);

  // Shift+Right-Click on plain paragraph yields to native menu
  doc.dispatchEvent({ type: 'contextmenu', target: plainP, shiftKey: true, clientX: 50, clientY: 50, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);

  // Normal right-click near bottom-right clamps inside viewport (400x300)
  doc.dispatchEvent({ type: 'contextmenu', target: plainP, clientX: 390, clientY: 290, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  const menu = doc.querySelector('[data-testid="ag-sag-ctx-menu"]');
  assert.ok(menu);
  assert.ok(parseInt(menu.style.left, 10) <= 400 - 228 - 8);
  assert.ok(parseInt(menu.style.top, 10) <= 300 - 220 - 8);

  // Protect existing normal draft: clicking /btw must NOT overwrite unsent draft and should show toast
  ta.value = 'Important unsent user draft';
  doc.querySelector('[data-ag-sag-ctx-act="btw-quick"]').click();
  assert.equal(ta.value, 'Important unsent user draft');
  assert.ok(doc.querySelector('[data-testid="ag-sag-ctx-toast"]'));

  // Selection menu includes both /btw and /plan
  ta.value = '';
  assert.equal(pl.openContextMenu({ selection: 'Refactor auth middleware', x: 10, y: 10 }), true);
  assert.ok(doc.querySelector('[data-ag-sag-ctx-act="btw-sel"]'));
  assert.ok(doc.querySelector('[data-ag-sag-ctx-act="plan-sel"]'));
  doc.querySelector('[data-ag-sag-ctx-act="plan-sel"]').click();
  assert.equal(ta.value, '/plan Refactor auth middleware ');

  pl.destroy();
  assert.equal(doc.querySelector('[data-testid="ag-sag-ctx-toast"]'), null);
  assert.equal(doc.querySelector('[data-testid="ag-sag-ctx-menu"]'), null);
});

test('Phase 13 hardening: ambient glow works independently when compactGuard is disabled and cleans up 100% of observers/timers', async () => {
  const { doc, html, body, makeEl } = createRichMockDom({ hostTheme: 'dark' });

  const inputBox = makeEl('div');
  inputBox.setAttribute('data-testid', 'agent-input-box');
  const stopBtn = makeEl('button');
  stopBtn.setAttribute('data-testid', 'stop-button');
  stopBtn.hidden = true;
  inputBox.appendChild(stopBtn);
  body.appendChild(inputBox);

  const mos = [];
  class TrackedMO {
    constructor(cb) {
      this.cb = cb;
      this.disconnected = false;
      this.observed = false;
      mos.push(this);
    }
    observe() {
      this.observed = true;
    }
    disconnect() {
      this.disconnected = true;
    }
  }

  const storageMap = new Map();
  const fakeStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
  };

  const win = {
    document: doc,
    localStorage: fakeStorage,
    MutationObserver: TrackedMO,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };

  const inst = core.mountSag({
    win,
    doc,
    storage: fakeStorage,
    autoPoll: false,
    autoObserve: false,
    convStateThrottleMs: 20,
    config: {
      themePreset: 'obsidian-prism',
      themeAmbientGlow: 'subtle',
      themeStreamFade: false,
      themeSmoothCaret: false,
      modules: {
        compactGuard: false,
        themeStudio: true,
        hostI18n: false,
      },
    },
  });

  const fireActiveMos = (target = body) => {
    for (const m of mos) {
      if (!m.disconnected && m.observed) m.cb([{ type: 'childList', target }]);
    }
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  assert.equal(inst.themeStudio.getDebugState().externalConvStateSource, false);
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, true);
  assert.equal(html.hasAttribute('data-ag-sag-conv-state'), false, 'initial state must be idle');

  // 1. running (stop button becomes visible)
  stopBtn.hidden = false;
  fireActiveMos(stopBtn);
  await wait(35);
  assert.equal(html.getAttribute('data-ag-sag-conv-state'), 'running');
  assert.equal(inst.themeStudio.getDebugState().convState, 'running');

  // 2. awaiting takes precedence over running
  const permCard = makeEl('div');
  permCard.setAttribute('data-testid', 'permission-card');
  body.appendChild(permCard);
  fireActiveMos(body);
  await wait(35);
  assert.equal(html.getAttribute('data-ag-sag-conv-state'), 'awaiting');

  // 3. error takes precedence over running once awaiting clears
  permCard.remove();
  const errCard = makeEl('div');
  errCard.setAttribute('data-testid', 'agent-error');
  body.appendChild(errCard);
  fireActiveMos(body);
  await wait(35);
  assert.equal(html.getAttribute('data-ag-sag-conv-state'), 'error');

  // 4. idle once error & streaming clear
  errCard.hidden = true;
  stopBtn.hidden = true;
  fireActiveMos(body);
  await wait(35);
  assert.equal(html.hasAttribute('data-ag-sag-conv-state'), false);
  assert.equal(inst.themeStudio.getDebugState().convState, 'idle');

  // 5. Re-enabling compactGuard tears down standalone observer (no duplicate work)
  inst.updateConfig({ modules: { ...inst.getConfig().modules, compactGuard: true } });
  assert.equal(inst.themeStudio.getDebugState().externalConvStateSource, true);
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, false);

  // 6. Disabling compactGuard again re-activates standalone observer; ambientGlow='off' disconnects it
  inst.updateConfig({ modules: { ...inst.getConfig().modules, compactGuard: false } });
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, true);
  inst.updateConfig({ themeAmbientGlow: 'off' });
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, false);
  assert.equal(doc.querySelector('.ag-sag-ambient-glow'), null);

  // 7. Trigger pending throttle timer right before destroy() -> zero lingering timers/observers or post-destroy writes
  inst.updateConfig({ themeAmbientGlow: 'vivid' });
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, true);
  stopBtn.hidden = false;
  fireActiveMos(stopBtn);
  assert.equal(inst.themeStudio.getDebugState().convThrottlePending, true);

  inst.destroy();
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, false);
  assert.equal(inst.themeStudio.getDebugState().convThrottlePending, false);
  assert.ok(mos.every((m) => m.disconnected), 'every MutationObserver must be disconnected after destroy()');
  await wait(40);
  assert.equal(html.hasAttribute('data-ag-sag-conv-state'), false, 'no timer may mutate DOM after destroy()');
  assert.equal(doc.querySelector('.ag-sag-ambient-glow'), null);
});

test('Phase 13 hardening: Restore Host Native clears accent override and Prism yield/takeover gates glow cleanly', () => {
  const { doc, html, body, makeEl } = createRichMockDom({ hostTheme: 'dark' });
  html.setAttribute('data-ag-cs-style', 'obsidian');

  // 1. Prism yield on native preset suppresses glow node & watcher; takeover enables them
  const ctl = themeStudio.createThemeStudioController({
    win: { document: doc, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) },
    doc,
    enabled: true,
    preset: 'native',
    ambientGlow: 'subtle',
    conflictPolicy: 'yield',
    streamFade: false,
    smoothCaret: false,
  });
  assert.equal(doc.querySelector('.ag-sag-ambient-glow'), null, 'Prism yield must not mount glow node even on native preset');
  ctl.updateSettings({ conflictPolicy: 'takeover' });
  assert.ok(doc.querySelector('.ag-sag-ambient-glow'), 'takeover must mount glow node');
  ctl.destroy();

  // 2. Restore Host Native resets themeAccent back to follow
  html.removeAttribute('data-ag-cs-style');
  const dlg = makeEl('div');
  dlg.setAttribute('role', 'dialog');
  const p6 = makeEl('div');
  p6.className = 'p-6';
  const h2 = makeEl('h2');
  h2.textContent = 'Appearance';
  const sec = makeEl('div');
  sec.className = 'space-y-2';
  p6.appendChild(h2);
  p6.appendChild(sec);
  dlg.appendChild(p6);
  body.appendChild(dlg);

  const storage = new Map([['agSag.ui.activeSubTab.v1', 'ui']]);
  const fakeStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };
  let cfg = coexist.sanitizeConfig({});
  const bridge = prismBridge.createPrismBridgeController({
    win: { document: doc, localStorage: fakeStorage },
    doc,
    storage: fakeStorage,
    getConfig: () => cfg,
    onUpdateConfig: (patch) => {
      cfg = coexist.sanitizeConfig({ ...cfg, ...patch, modules: { ...cfg.modules, ...(patch.modules || {}) } });
      bridge.sync();
      return cfg;
    },
  });
  bridge.sync();
  doc.querySelector('[data-ag-sag-look="aurora-liquid"]').click();
  assert.equal(cfg.themeAccent, 'iris');
  doc.querySelector('[data-ag-sag-theme="native"]').click();
  assert.equal(cfg.themePreset, 'native');
  assert.equal(cfg.themeAccent, 'follow');
  assert.equal(cfg.themeAutoPair, false);
  bridge.destroy();
});

test('Phase 13 hardening: ancestor-hidden/owned signals are ignored, dynamic Prism data-ag-cs-style toggles yield live, and updateConfig syncs once', () => {
  const { doc, html, body, makeEl } = createRichMockDom({ hostTheme: 'dark' });

  // 1. Ancestor-hidden & agy-Sag-owned containers must never trigger ambient glow states
  const hiddenWrap = makeEl('div');
  hiddenWrap.hidden = true;
  const hiddenStop = makeEl('button');
  hiddenStop.setAttribute('data-testid', 'stop-button');
  hiddenWrap.appendChild(hiddenStop);
  body.appendChild(hiddenWrap);

  const ownedWrap = makeEl('div');
  ownedWrap.setAttribute('data-ag-sag-owned', '1');
  const ownedErr = makeEl('div');
  ownedErr.setAttribute('role', 'alert');
  ownedErr.setAttribute('data-error', 'true');
  ownedWrap.appendChild(ownedErr);
  body.appendChild(ownedWrap);

  const styleHiddenWrap = makeEl('div');
  styleHiddenWrap.style.display = 'none';
  const hiddenPerm = makeEl('div');
  hiddenPerm.setAttribute('data-testid', 'permission-card');
  styleHiddenWrap.appendChild(hiddenPerm);
  body.appendChild(styleHiddenWrap);

  assert.equal(themeStudio.detectConvStateFromDom(doc), 'idle', 'hidden/owned ancestor signals must resolve to idle');
  hiddenWrap.hidden = false;
  assert.equal(themeStudio.detectConvStateFromDom(doc), 'running', 'unhiding ancestor reveals real host signal');
  hiddenWrap.hidden = true;

  // 2. Dynamic Prism data-ag-cs-style addition/removal hot-switches yield/active even when autoPair=false
  const mos = [];
  class TrackedMO {
    constructor(cb) {
      this.cb = cb;
      this.disconnected = false;
      this.observed = false;
      mos.push(this);
    }
    observe() {
      this.observed = true;
    }
    disconnect() {
      this.disconnected = true;
    }
  }

  const iframeMessages = [];
  const extFrame = makeEl('iframe');
  extFrame.setAttribute('src', 'plugin://agy-nov/panel.html');
  extFrame.contentWindow = { postMessage: (msg) => iframeMessages.push(msg) };
  body.appendChild(extFrame);

  const storageMap = new Map();
  const fakeStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
  };

  const inst = core.mountSag({
    win: {
      document: doc,
      localStorage: fakeStorage,
      MutationObserver: TrackedMO,
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    },
    doc,
    storage: fakeStorage,
    autoPoll: false,
    autoObserve: false,
    config: {
      themePreset: 'obsidian-prism',
      themeAutoPair: false,
      themeAmbientGlow: 'subtle',
      themeStreamFade: false,
      themeSmoothCaret: false,
      themeConflictPolicy: 'yield',
      modules: { compactGuard: false, themeStudio: true, hostI18n: false },
    },
  });

  assert.equal(html.getAttribute('data-ag-sag-theme-colors'), 'active');
  assert.ok(doc.querySelector('.ag-sag-ambient-glow'));
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, true);

  // Prism attaches dynamically -> themeStudio must yield automatically
  html.setAttribute('data-ag-cs-style', 'obsidian');
  for (const m of [...mos]) if (!m.disconnected && m.observed) m.cb([]);
  assert.equal(html.getAttribute('data-ag-sag-theme-colors'), 'yielded');
  assert.equal(doc.querySelector('.ag-sag-ambient-glow'), null);
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, false);

  // Prism detaches -> themeStudio restores automatically
  html.removeAttribute('data-ag-cs-style');
  for (const m of [...mos]) if (!m.disconnected && m.observed) m.cb([]);
  assert.equal(html.getAttribute('data-ag-sag-theme-colors'), 'active');
  assert.ok(doc.querySelector('.ag-sag-ambient-glow'));
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, true);

  // 3. Single updateConfig must trigger at most 1 theme sync broadcast (no 3x sync churn)
  iframeMessages.length = 0;
  inst.updateConfig({ themeAccent: 'amber', modules: { ...inst.getConfig().modules, compactGuard: true } });
  assert.equal(iframeMessages.length, 1, 'single updateConfig must broadcast theme sync exactly once');
  assert.equal(inst.themeStudio.getDebugState().convStateWatcherActive, false);

  inst.destroy();
  assert.ok(mos.every((m) => m.disconnected));
});
