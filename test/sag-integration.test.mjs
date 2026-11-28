import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { CORE_FILES, REMOVE_EXPRESSION, buildInjectExpression, readCoreSources } from '../cli/bundle.mjs';
import { buildConfigPatchFromOpts, parseCliArgs } from '../cli/cdp-attach.mjs';
import { DOCTOR_PROBE_EXPRESSION, formatDoctorHuman, inspectNovInstall, runDoctor } from '../cli/doctor.mjs';
import { PLUGIN_ROOT_FILES, parseInstallArgs } from '../cli/install-plugin.mjs';
import { runSagCli } from '../cli/sag-cli.mjs';
import { PROBE_EXPRESSION, parseWatchArgs } from '../cli/watch-daemon.mjs';
import { SMOKE_REQUIRED_MARKERS, startWorkbenchServer } from '../workbench/server.mjs';

const require = createRequire(import.meta.url);
const core = require('../packages/core/index.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(String(k)) ? map.get(String(k)) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
  };
}

// Unified mock DOM supporting both TextNodes (for hostI18n) and CSS selector queries (for all 13 controllers)
function createFullMockDom() {
  const matches = (el, selList) => {
    if (!el || el.nodeType !== 1) return false;
    return selList.split(',').some((raw) => {
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
      for (const m of rest.matchAll(/\[([^\]=*~^$|]+)(?:(\*)?="([^"]*)")?\]/g)) {
        if (!el.hasAttribute(m[1])) return false;
        if (m[3] !== undefined) {
          const actual = el.getAttribute(m[1]) || '';
          if (m[2] === '*') {
            if (!actual.includes(m[3])) return false;
          } else if (actual !== m[3]) {
            return false;
          }
        }
      }
      return true;
    });
  };

  function makeText(value) {
    const node = {
      nodeType: 3,
      _value: String(value ?? ''),
      parentNode: null,
      parentElement: null,
      get nodeValue() {
        return node._value;
      },
      set nodeValue(v) {
        node._value = String(v ?? '');
      },
      get textContent() {
        return node._value;
      },
      set textContent(v) {
        node._value = String(v ?? '');
      },
      remove() {
        if (node.parentNode) node.parentNode.removeChild(node);
      },
    };
    return node;
  }

  function makeEl(tag, initialText) {
    const attrs = new Map();
    const cls = new Set();
    const ls = new Map();
    const el = {
      nodeType: 1,
      tagName: String(tag).toUpperCase(),
      id: '',
      value: '',
      hidden: false,
      disabled: false,
      style: {},
      childNodes: [],
      parentNode: null,
      parentElement: null,
      get children() {
        return el.childNodes.filter((n) => n.nodeType === 1);
      },
      get firstChild() {
        return el.childNodes[0] || null;
      },
      get isConnected() {
        let p = el;
        while (p) {
          if (p === doc.documentElement) return true;
          p = p.parentElement;
        }
        return false;
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
        toggle: (c, force) => {
          const on = force !== undefined ? Boolean(force) : !cls.has(c);
          if (on) cls.add(c);
          else cls.delete(c);
          return on;
        },
      },
      get textContent() {
        return el.childNodes.map((n) => (n.nodeType === 3 ? n.nodeValue : n.textContent)).join('');
      },
      set textContent(v) {
        for (const c of el.childNodes) {
          c.parentNode = null;
          c.parentElement = null;
        }
        el.childNodes = [];
        if (v !== '' && v !== null && v !== undefined) {
          el.appendChild(makeText(v));
        }
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
      },
      appendChild(c) {
        if (c.parentNode) c.parentNode.removeChild(c);
        c.parentNode = el;
        c.parentElement = el;
        el.childNodes.push(c);
        return c;
      },
      insertBefore(c, ref) {
        if (c.parentNode) c.parentNode.removeChild(c);
        c.parentNode = el;
        c.parentElement = el;
        const i = el.childNodes.indexOf(ref);
        if (i >= 0) el.childNodes.splice(i, 0, c);
        else el.childNodes.push(c);
        return c;
      },
      removeChild(c) {
        el.childNodes = el.childNodes.filter((x) => x !== c);
        c.parentNode = null;
        c.parentElement = null;
        return c;
      },
      remove() {
        if (el.parentNode) el.parentNode.removeChild(el);
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
      focus() {},
      click() {
        if (el.disabled) return;
        for (const fn of ls.get('click') || []) {
          fn({ target: el, preventDefault() {}, stopPropagation() {} });
        }
      },
    };
    if (initialText !== undefined) el.textContent = initialText;
    return el;
  }

  const doc = {
    hidden: false,
    documentElement: null,
    head: null,
    body: null,
    createElement: makeEl,
    createTextNode: makeText,
    getElementById: (id) => doc.documentElement.querySelector('#' + id),
    querySelectorAll: (s) => doc.documentElement.querySelectorAll(s),
    querySelector: (s) => doc.documentElement.querySelector(s),
    addEventListener() {},
    removeEventListener() {},
  };
  doc.documentElement = makeEl('html');
  doc.documentElement.setAttribute('lang', 'en');
  doc.head = makeEl('head');
  doc.body = makeEl('body');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  const conv = makeEl('div');
  conv.setAttribute('data-testid', 'conversation-view');
  conv.setAttribute('data-cascade-id', '11111111-2222-4333-8444-555555555555');
  doc.body.appendChild(conv);

  const compWrap = makeEl('div');
  const inputBox = makeEl('div');
  inputBox.setAttribute('data-testid', 'agent-input-box');
  inputBox.appendChild(makeEl('textarea'));
  compWrap.appendChild(inputBox);
  doc.body.appendChild(compWrap);

  const storage = createMemoryStorage();
  const win = {
    document: doc,
    localStorage: storage,
    navigator: { language: 'en-US' },
    location: { pathname: '/c/11111111-2222-4333-8444-555555555555' },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
  };
  win.window = win;
  win.self = win;
  win.top = win;

  return { win, doc, storage, makeEl, conv };
}

test('1. mountSag / mountSessionGuard mounts both __agSag & __agSessionGuard with all sub-controllers ready', () => {
  assert.equal(core.mountSag, core.mountSessionGuard);
  const { win, doc, storage } = createFullMockDom();

  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
  });

  try {
    assert.equal(api.brand, 'agy-Sag');
    assert.equal(api.version, '1.6.0');
    assert.equal(win.__agSag, api);
    assert.equal(win.__agSessionGuard, api);

    const expectedControllers = [
      'compactGuard',
      'draftGuard',
      'cleanSlate',
      'outlineBookmarks',
      'bookmarkVault',
      'sessionRadar',
      'prismBridge',
      'statusPill',
      'hostI18n',
      'promptQueue',
      'safeAutoAccept',
      'themeStudio',
      'quotaPulse',
    ];
    assert.ok(expectedControllers.length >= 12);
    for (const key of expectedControllers) {
      assert.ok(api[key] && typeof api[key] === 'object', `Expected controller "${key}" to be mounted`);
      assert.equal(typeof api[key].getDebugState, 'function', `Expected "${key}.getDebugState"`);
      assert.equal(typeof api[key].destroy, 'function', `Expected "${key}.destroy"`);
    }

    const dbg = api.getDebugState();
    assert.equal(dbg.brand, 'agy-Sag');
    assert.equal(dbg.destroyed, false);
    assert.ok(dbg.hostI18n);
    assert.ok(dbg.promptQueue);
    assert.ok(dbg.safeAutoAccept);
    assert.ok(dbg.themeStudio);
    assert.ok(dbg.quotaPulse);
  } finally {
    api.destroy();
  }

  assert.equal(win.__agSag, undefined);
  assert.equal(win.__agSessionGuard, undefined);
});

test('2. applyPreset dynamically switches sub-modules across i18n-only / power / full-auto / essential', () => {
  const { win, doc, storage } = createFullMockDom();
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
  });

  try {
    assert.equal(api.applyPreset('does-not-exist'), null);

    // i18n-only
    const p1 = api.applyPreset('i18n-only');
    assert.equal(p1.modules.hostI18n, true);
    assert.equal(p1.modules.compactGuard, false);
    assert.equal(p1.modules.promptQueue, false);
    assert.equal(p1.modules.safeAutoAccept, false);
    assert.equal(p1.modules.themeStudio, false);
    assert.equal(p1.modules.quotaPulse, false);
    assert.equal(api.hostI18n.getDebugState().enabled, true);
    assert.equal(api.promptQueue.getDebugState().enabled, false);
    assert.equal(api.safeAutoAccept.getDebugState().enabled, false);
    assert.equal(api.themeStudio.getDebugState().enabled, false);
    assert.equal(api.quotaPulse.getDebugState().enabled, false);

    // power
    const p2 = api.applyPreset('power');
    assert.equal(p2.modules.outlineBookmarks, true);
    assert.equal(p2.modules.themeStudio, true);
    assert.equal(p2.modules.quotaPulse, true);
    assert.equal(p2.modules.safeAutoAccept, false);
    assert.equal(p2.modules.sessionRadar, false);
    assert.equal(api.themeStudio.getDebugState().enabled, true);
    assert.equal(api.quotaPulse.getDebugState().enabled, true);
    assert.equal(api.safeAutoAccept.getDebugState().enabled, false);

    // full-auto
    const p3 = api.applyPreset('full-auto');
    assert.equal(p3.autoAcceptPolicy, 'readonly-safe');
    assert.equal(p3.modules.safeAutoAccept, true);
    assert.equal(p3.modules.sessionRadar, true);
    assert.equal(p3.modules.promptQueue, true);
    assert.equal(api.safeAutoAccept.getDebugState().enabled, true);
    assert.equal(api.safeAutoAccept.getDebugState().policy, 'readonly-safe');
    assert.equal(api.sessionRadar.getDebugState().enabled, true);

    // essential
    const p4 = api.applyPreset('essential');
    assert.equal(p4.modules.hostI18n, true);
    assert.equal(p4.modules.compactGuard, true);
    assert.equal(p4.modules.draftGuard, true);
    assert.equal(p4.modules.promptQueue, true);
    assert.equal(p4.modules.safeAutoAccept, false);
    assert.equal(p4.modules.themeStudio, false);
    assert.equal(p4.modules.quotaPulse, false);
    assert.equal(p4.modules.outlineBookmarks, false);
    assert.equal(p4.modules.sessionRadar, false);
    assert.equal(api.safeAutoAccept.getDebugState().enabled, false);
    assert.equal(api.themeStudio.getDebugState().enabled, false);
    assert.equal(api.quotaPulse.getDebugState().enabled, false);
  } finally {
    api.destroy();
  }
});

test('3. setHostLocale("ja") translates native UI while skipping code/slash/chat, and setHostLocale("en") restores losslessly', () => {
  const { win, doc, storage, makeEl, conv } = createFullMockDom();

  const uiBar = makeEl('div');
  const settingsEl = makeEl('span', 'Settings');
  const appearanceEl = makeEl('span', 'Appearance');
  const filesChangedEl = makeEl('span', '3 files changed');
  const slashEl = makeEl('span', '/compact');
  const codeEl = makeEl('code', 'Settings');
  uiBar.appendChild(settingsEl);
  uiBar.appendChild(appearanceEl);
  uiBar.appendChild(filesChangedEl);
  uiBar.appendChild(slashEl);
  uiBar.appendChild(codeEl);
  doc.body.appendChild(uiBar);

  const userBubble = makeEl('div');
  userBubble.setAttribute('data-testid', 'user-message-bubble');
  const bubbleSpan = makeEl('span', 'Settings');
  userBubble.appendChild(bubbleSpan);
  conv.appendChild(userBubble);

  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
  });

  try {
    api.setHostLocale('ja');
    assert.equal(settingsEl.textContent, '設定');
    assert.equal(appearanceEl.textContent, '外観');
    assert.notEqual(filesChangedEl.textContent, '3 files changed');
    assert.ok(filesChangedEl.textContent.includes('3'), 'Regex template must preserve dynamic numeric parameter');
    assert.equal(slashEl.textContent, '/compact', 'Slash command must remain untouched');
    assert.equal(codeEl.textContent, 'Settings', '<code> elements must be physically skipped');
    assert.equal(bubbleSpan.textContent, 'Settings', 'User chat bubbles must be physically skipped');
    assert.equal(doc.documentElement.getAttribute('data-ag-sag-lang'), 'ja');
    assert.equal(doc.documentElement.getAttribute('data-ag-sag-host-i18n'), 'active');

    api.setHostLocale('en');
    assert.equal(settingsEl.textContent, 'Settings');
    assert.equal(appearanceEl.textContent, 'Appearance');
    assert.equal(filesChangedEl.textContent, '3 files changed');
    assert.equal(doc.documentElement.getAttribute('data-ag-sag-lang'), null);
    assert.equal(doc.documentElement.getAttribute('data-ag-sag-host-i18n'), null);
    assert.equal(api.getConfig().modules.hostI18n, false);
  } finally {
    api.destroy();
  }
});

test('4. cli/bundle.mjs CORE_FILES readable, buildInjectExpression compiles & runs in vm, REMOVE_EXPRESSION cleans up', () => {
  const sources = readCoreSources();
  assert.equal(sources.length, CORE_FILES.length);
  for (const part of sources) {
    assert.ok(part.code.length > 50, `Expected non-empty core source for ${part.file}`);
  }

  const expr = buildInjectExpression({ hostI18nLocale: 'ja', modules: { hostI18n: true } }, { source: 'standalone' });
  // Compile both expressions explicitly to ensure zero syntax errors
  new vm.Script(expr);
  new vm.Script(REMOVE_EXPRESSION);

  const { win, doc } = createFullMockDom();
  const sandbox = {
    window: null,
    globalThis: null,
    document: doc,
    localStorage: win.localStorage,
    navigator: win.navigator,
    location: win.location,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  sandbox.window = sandbox;
  sandbox.window.self = sandbox;
  sandbox.window.top = sandbox;
  sandbox.window.addEventListener = () => {};
  sandbox.window.removeEventListener = () => {};
  sandbox.globalThis = sandbox;

  const mounted = vm.runInNewContext(expr, sandbox);
  assert.equal(mounted.ok, true);
  assert.equal(mounted.brand, 'agy-Sag');
  assert.ok(sandbox.__agSag);
  assert.ok(sandbox.__agSessionGuard);
  assert.equal(sandbox.__agSag, sandbox.__agSessionGuard);

  // Verify DOCTOR_PROBE_EXPRESSION & PROBE_EXPRESSION against mounted __agSag
  const probe = vm.runInNewContext(PROBE_EXPRESSION, sandbox);
  assert.equal(probe.state, 'mounted');
  assert.equal(probe.codeHash, mounted.codeHash);

  const docProbe = vm.runInNewContext(DOCTOR_PROBE_EXPRESSION, sandbox);
  assert.equal(docProbe.sag.state, 'mounted');
  assert.equal(docProbe.sagModules.hostI18nLocale, 'ja');
  assert.equal(docProbe.sagModules.hostI18nActive, true);
  assert.equal(docProbe.sagModules.queueCount, 0);
  assert.equal(docProbe.sagModules.autoAcceptEnabled, false);
  assert.equal(docProbe.sagModules.themePreset, 'native');
  assert.equal(docProbe.sagModules.quotaHealth, 'ok');

  const removed = vm.runInNewContext(REMOVE_EXPRESSION, sandbox);
  assert.equal(removed.ok, true);
  assert.equal(removed.status, 'removed');
  assert.equal(sandbox.__agSag, undefined);
  assert.equal(sandbox.__agSessionGuard, undefined);
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-lang'), null);
});

test('5. cdp-attach.mjs & watch-daemon.mjs support --preset= / --lang=, reject invalid values & build cfgPatch', () => {
  const cliOpts = parseCliArgs(['--attach', '--preset=power', '--lang=ja', '--port=9222']);
  assert.equal(cliOpts.action, 'attach');
  assert.equal(cliOpts.preset, 'power');
  assert.equal(cliOpts.lang, 'ja');
  assert.equal(cliOpts.port, 9222);

  const patchPowerJa = buildConfigPatchFromOpts(cliOpts);
  assert.equal(patchPowerJa.hostI18nLocale, 'ja');
  assert.equal(patchPowerJa.modules.hostI18n, true);
  assert.equal(patchPowerJa.modules.themeStudio, true);
  assert.equal(patchPowerJa.modules.quotaPulse, true);
  assert.equal(patchPowerJa.modules.safeAutoAccept, false);

  const patchEn = buildConfigPatchFromOpts(parseCliArgs(['--attach', '--preset=i18n-only', '--lang=en']));
  assert.equal(patchEn.hostI18nLocale, 'en');
  assert.equal(patchEn.modules.hostI18n, false);
  assert.equal(patchEn.modules.compactGuard, false);

  const watchOpts = parseWatchArgs(['--preset=full-auto', '--lang=pt-BR', '--once']);
  assert.equal(watchOpts.preset, 'full-auto');
  assert.equal(watchOpts.lang, 'pt-BR');
  assert.equal(watchOpts.once, true);

  const patchFullAuto = buildConfigPatchFromOpts(watchOpts);
  assert.equal(patchFullAuto.autoAcceptPolicy, 'readonly-safe');
  assert.equal(patchFullAuto.modules.safeAutoAccept, true);
  assert.equal(patchFullAuto.hostI18nLocale, 'pt-BR');
  assert.equal(patchFullAuto.modules.hostI18n, true);

  // Invalid values must throw explicitly
  assert.throws(() => parseCliArgs(['--preset=invalid-tier']), /Invalid --preset/);
  assert.throws(() => parseCliArgs(['--lang=xx-ZZ']), /Invalid --lang/);
  assert.throws(() => parseWatchArgs(['--preset=turbo']), /Invalid --preset/);
  assert.throws(() => parseWatchArgs(['--lang=klingon']), /Invalid --lang/);
});

test('6. cli/sag-cli.mjs executes i18n validate, i18n list, presets & help cleanly with JSON output', async () => {
  const capture = async (argv) => {
    const out = [];
    const err = [];
    const res = await runSagCli(argv, {
      stdout: (s) => out.push(String(s)),
      rawStdout: (s) => out.push(String(s)),
      stderr: (s) => err.push(String(s)),
    });
    return { res, stdout: out.join('\n'), stderr: err.join('\n') };
  };

  // i18n validate --json
  const valRun = await capture(['i18n', 'validate', '--json']);
  assert.equal(valRun.res.exitCode, 0);
  const valJson = JSON.parse(valRun.stdout);
  assert.equal(valJson.ok, true);
  assert.equal(valJson.errors.length, 0);
  assert.equal(valJson.stats.localeCount, 10);

  // i18n list --json
  const listRun = await capture(['i18n', 'list', '--json']);
  assert.equal(listRun.res.exitCode, 0);
  const listJson = JSON.parse(listRun.stdout);
  assert.equal(listJson.ok, true);
  assert.equal(listJson.count, 10);
  assert.equal(listJson.locales.length, 10);
  for (const item of listJson.locales) {
    assert.ok(item.locale && item.nativeName);
    if (item.locale !== 'en') {
      assert.ok(item.exactCount >= 180, `${item.locale} exactCount should be >= 180`);
      assert.ok(item.patternCount >= 18, `${item.locale} patternCount should be >= 18`);
    }
  }

  // presets --json
  const presetsRun = await capture(['presets', '--json']);
  assert.equal(presetsRun.res.exitCode, 0);
  const presetsJson = JSON.parse(presetsRun.stdout);
  assert.equal(presetsJson.ok, true);
  assert.deepEqual(
    presetsJson.presets.map((p) => p.id),
    ['essential', 'i18n-only', 'power', 'full-auto']
  );

  // help & unknown command
  const helpRun = await capture(['--help']);
  assert.equal(helpRun.res.exitCode, 0);
  assert.ok(helpRun.stdout.includes('agy-sag'));

  const unknownRun = await capture(['unknown-subcmd']);
  assert.equal(unknownRun.res.exitCode, 1);
  assert.ok(unknownRun.stderr.includes('Unknown command'));

  // Real subprocess verification for CLI exit code and JSON stdout
  const cliOut = execFileSync(process.execPath, [path.join(REPO_ROOT, 'cli', 'sag-cli.mjs'), 'i18n', 'validate', '--json'], {
    encoding: 'utf8',
  });
  const parsedSub = JSON.parse(cliOut);
  assert.equal(parsedSub.ok, true);
  assert.equal(parsedSub.stats.localeCount, 10);
});

test('7. workbench/server.mjs serves HTTP 200 on ephemeral port 0 with all legacy & v1.0.0 demo sections', async () => {
  const srv = await startWorkbenchServer(0);
  try {
    const { port } = srv.address();
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.ok((res.headers.get('content-type') || '').includes('text/html'));
    const html = await res.text();

    for (const marker of SMOKE_REQUIRED_MARKERS) {
      assert.ok(html.includes(marker), `Workbench HTML missing required marker: ${marker}`);
    }

    const demoMarkers = [
      'agy-Sag · All-in-One Offline Workbench',
      'sim-host-ui-zone',
      '3 files changed',
      'Thought for 6s',
      'Resets in 2h 15m',
      'const Settings = true;',
      'data-preset-btn="essential"',
      'data-preset-btn="full-auto"',
      'btn-queue-push',
      'btn-spawn-safe-card',
      'btn-spawn-danger-card',
      'theme-studio-sel',
      '429 Rate limit · Resets in 1h 45m',
    ];
    for (const m of demoMarkers) {
      assert.ok(html.includes(m), `Workbench HTML missing interactive demo element: ${m}`);
    }

    const notFound = await fetch(`http://127.0.0.1:${port}/does-not-exist`);
    assert.equal(notFound.status, 404);
  } finally {
    srv.close();
  }
});

test('8. doctor dual-star agy-NOV detection & install-plugin agy-sag default path', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sag-nov-'));
  try {
    // Missing agy-NOV -> hint recommends installing agy-NOV
    const missingRes = inspectNovInstall({ homeDir: tmp, env: {} });
    assert.equal(missingRes.found, false);

    const reportWithoutNov = await runDoctor({
      homeDir: tmp,
      env: {},
      nodeInfo: { ok: true, version: 'v22.15.0', major: 22, hasWebSocket: true },
      prismInstall: {
        installed: { found: false, version: null, channel: null, unifiedSettingsHookReady: false },
        devCheckout: { found: false, version: null, channel: null, unifiedSettingsHookReady: false },
      },
      discoverPort: () => null,
    });
    assert.equal(reportWithoutNov.novInstall.found, false);
    assert.ok(reportWithoutNov.hints.some((h) => h.includes('agy-NOV')));

    // Installed agy-NOV -> human report displays dual-star synergy banner
    const novDir = path.join(tmp, '.gemini', 'config', 'plugins', 'agy-nov');
    fs.mkdirSync(novDir, { recursive: true });
    fs.writeFileSync(path.join(novDir, 'plugin.json'), JSON.stringify({ name: 'agy-nov', version: '1.2.0' }));

    const foundRes = inspectNovInstall({ homeDir: tmp, env: {} });
    assert.equal(foundRes.found, true);
    assert.equal(foundRes.version, '1.2.0');

    const reportWithNov = await runDoctor({
      homeDir: tmp,
      env: {},
      nodeInfo: { ok: true, version: 'v22.15.0', major: 22, hasWebSocket: true },
      prismInstall: {
        installed: { found: false, version: null, channel: null, unifiedSettingsHookReady: false },
        devCheckout: { found: false, version: null, channel: null, unifiedSettingsHookReady: false },
      },
      discoverPort: () => null,
    });
    const human = formatDoctorHuman(reportWithNov);
    assert.ok(human.includes('双星协同：agy-NOV v1.2.0 + agy-Sag'));

    // install-plugin defaults to ~/.gemini/config/plugins/agy-sag and includes AGENTS.md
    const installOpts = parseInstallArgs([]);
    assert.equal(installOpts.targetDir, path.join(os.homedir(), '.gemini', 'config', 'plugins', 'agy-sag'));
    assert.ok(PLUGIN_ROOT_FILES.includes('AGENTS.md'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('9. mountSag retries sag:ext_pack when bridgeConnected becomes true and destroy() cleans __agSagExtPacks', async () => {
  const packsMod = require('../packages/core/host-i18n-packs.js');
  packsMod.clearExtendedPacks();
  const { win, doc, storage } = createFullMockDom();
  win.navigator = { language: 'zh-CN' };
  win.__agSagExtPacks = { ja: { exact: { __Pre__: 'プレ' }, patterns: [] } };

  let bridgeReqCount = 0;
  const api = core.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    config: { hostI18nLocale: 'zh-CN' },
  });

  try {
    // Initially __agSagHostBridge is missing -> extended pack not yet loaded
    assert.equal(api.hostI18n.getDebugState().extendedPackLoaded, false);

    // Late bind __agSagHostBridge and emit nov:state reverse push (bridgeConnected -> true)
    win.__agSagHostBridge = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'sag:ext_pack') {
        bridgeReqCount += 1;
        queueMicrotask(() => {
          win.__agSagBridgeReceiver.onResponse(
            JSON.stringify({
              reqId: msg.reqId,
              ok: true,
              data: {
                locale: msg.payload.locale,
                pack: { exact: { __LateBridgeKey__: '延迟桥接词条' }, patterns: [] },
              },
            })
          );
        });
      }
    };
    win.__agSagBridgeReceiver.onPush({ event: 'nov:state', state: { installed: true, preset: 'core', modules: {} } });

    await new Promise((r) => setTimeout(r, 30));
    assert.equal(bridgeReqCount, 1);
    assert.equal(api.hostI18n.getDebugState().extendedPackLoaded, true);
    assert.equal(packsMod.hasExtendedPack('zh-CN'), true);
  } finally {
    api.destroy();
    assert.equal('__agSagExtPacks' in win, false, 'api.destroy() must delete win.__agSagExtPacks');
    assert.equal(packsMod.hasExtendedPack('zh-CN'), false, 'api.destroy() must clear module EXTENDED_PACKS');
    packsMod.clearExtendedPacks();
  }
});
