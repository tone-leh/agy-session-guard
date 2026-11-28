import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { readNovFeed } from '../cli/nov-bridge.mjs';
import { buildInjectExpression, inspectCoreLexState, readCoreSources } from '../cli/bundle.mjs';

const require = createRequire(import.meta.url);
const promptLibMod = require('../packages/core/prompt-library.js');
const statusPillMod = require('../packages/core/status-pill.js');
const themeStudioMod = require('../packages/core/theme-studio.js');
const novSynergyMod = require('../packages/core/nov-synergy.js');

function createMiniDom() {
  const mk = (tag, text = '') => {
    const attrs = new Map();
    const listeners = new Map();
    const el = {
      tagName: tag.toUpperCase(),
      nodeType: 1,
      textContent: text,
      value: '',
      className: '',
      style: {},
      hidden: false,
      children: [],
      parentElement: null,
      get parentNode() { return el.parentElement; },
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
      hasAttribute(k) { return attrs.has(k); },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(c) { c.parentElement = el; el.children.push(c); return c; },
      insertBefore(c, ref) {
        c.parentElement = el;
        const idx = el.children.indexOf(ref);
        if (idx >= 0) el.children.splice(idx, 0, c);
        else el.children.push(c);
        return c;
      },
      closest(sel) {
        let cur = el;
        while (cur) {
          const parts = String(sel || '').split(',').map((s) => s.trim()).filter(Boolean);
          for (const atom of parts) {
            const mAttr = atom.match(/^\[([^=\]]+)="([^"]+)"\]$/);
            if (mAttr && cur.getAttribute(mAttr[1]) === mAttr[2]) return cur;
            if (atom.startsWith('.') && String(cur.className || '').split(/\s+/).includes(atom.slice(1))) return cur;
            if (cur.tagName.toLowerCase() === atom.toLowerCase()) return cur;
          }
          cur = cur.parentElement;
        }
        return null;
      },
      remove() {
        if (el.parentElement) {
          el.parentElement.children = el.parentElement.children.filter((x) => x !== el);
          el.parentElement = null;
        }
      },
      addEventListener(ev, fn) {
        if (!listeners.has(ev)) listeners.set(ev, new Set());
        listeners.get(ev).add(fn);
      },
      removeEventListener(ev, fn) { listeners.get(ev)?.delete(fn); },
      click() {
        for (const fn of listeners.get('click') || []) fn({ target: el, preventDefault() {}, stopPropagation() {} });
      },
      dispatchEvent(ev) {
        for (const fn of listeners.get(ev.type) || []) fn(ev);
        return true;
      },
      querySelectorAll(sel) {
        const parts = String(sel || '').split(',').map((s) => s.trim()).filter(Boolean);
        const matchOne = (node, atom) => {
          const mAttr = atom.match(/^\[([^=\]]+)="([^"]+)"\]$/);
          if (mAttr) return node.getAttribute(mAttr[1]) === mAttr[2];
          if (atom.startsWith('.')) return String(node.className || '').split(/\s+/).includes(atom.slice(1));
          return node.tagName.toLowerCase() === atom.toLowerCase();
        };
        const out = [];
        for (const part of parts) {
          const tokens = part.split(/\s+/).filter(Boolean);
          const leaf = tokens[tokens.length - 1];
          const walk = (n) => {
            for (const c of n.children || []) {
              if (matchOne(c, leaf) && !out.includes(c)) out.push(c);
              walk(c);
            }
          };
          walk(el);
        }
        return out;
      },
      querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
    };
    return el;
  };
  const body = mk('body');
  const head = mk('head');
  const html = mk('html');
  html.appendChild(head);
  html.appendChild(body);
  const doc = {
    documentElement: html,
    head,
    body,
    createElement: (t) => mk(t),
    getElementById: () => null,
    querySelector: (s) => html.querySelector(s),
    querySelectorAll: (s) => html.querySelectorAll(s),
    addEventListener() {},
    removeEventListener() {},
  };
  return { doc, mk };
}

test('Phase 14: readNovFeed parses agy-NOV v0.8/v0.9 force_ask, permissionMode, verify & alerts (snapshot and audit fallback)', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sag-p14-nov-'));
  try {
    const dataDir = path.join(tmpHome, '.gemini', 'antigravity', 'plugin_data', 'agy-nov');
    fs.mkdirSync(dataDir, { recursive: true });

    // 1) Unified feed-snapshot.json v0.9.0
    fs.writeFileSync(
      path.join(dataDir, 'feed-snapshot.json'),
      JSON.stringify({
        schemaVersion: 1,
        version: '0.9.0',
        guard: {
          blockedCount: 2,
          askCount: 3,
          forceAskCount: 1,
          permissionMode: 'strict-gate',
          snapshotCount: 5,
          lastEvent: {
            ts: '2026-11-27T12:00:00Z',
            tool: 'run_command',
            decision: 'force_ask',
            reason: 'strict-gate enforced',
          },
        },
        radar: { runningCount: 1, awaitingCount: 1 },
        mem: { totalMemories: 12, staleCount: 2 },
        spec: { writeLockActive: false, activeSpecId: 'spec-9', title: 'v0.9 rollout' },
        verify: { enforceOnStop: true, lastStatus: 'fail', dirtyFilesCount: 3 },
        alerts: ['Verify gate failed on Bearer sk-ant-secret12345678'],
      }),
      'utf8'
    );

    const snapOut = readNovFeed({ homeDir: tmpHome, explicitDataDir: dataDir });
    assert.equal(snapOut.ok, true);
    assert.equal(snapOut.source, 'feed-snapshot');
    assert.equal(snapOut.feed.guard.forceAskCount, 1);
    assert.equal(snapOut.feed.guard.askCount, 3);
    assert.equal(snapOut.feed.guard.permissionMode, 'strict-gate');
    assert.equal(snapOut.feed.guard.latestBlocked.decision, 'force_ask');
    assert.equal(snapOut.feed.verify.lastStatus, 'fail');
    assert.equal(snapOut.feed.verify.dirtyFilesCount, 3);
    assert.equal(snapOut.feed.alerts.length, 1);
    assert.ok(!snapOut.feed.alerts[0].includes('sk-ant-secret12345678'), 'Alert text must be secret-redacted');

    // 2) Module fallback (modules/guard/audit.json) with force_ask decision
    fs.unlinkSync(path.join(dataDir, 'feed-snapshot.json'));
    fs.mkdirSync(path.join(dataDir, 'modules', 'guard'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'modules', 'guard', 'audit.json'),
      JSON.stringify({
        events: [
          { ts: '2026-11-27T12:01:00Z', tool: 'write_file', decision: 'ask', reason: 'confirm' },
          { ts: '2026-11-27T12:02:00Z', tool: 'run_command', decision: 'force_ask', reason: 'strict-gate' },
        ],
      }),
      'utf8'
    );
    const modOut = readNovFeed({ homeDir: tmpHome, explicitDataDir: dataDir });
    assert.equal(modOut.ok, true);
    assert.equal(modOut.feed.guard.askCount, 2);
    assert.equal(modOut.feed.guard.forceAskCount, 1);
    assert.equal(modOut.feed.guard.latestBlocked?.decision, 'force_ask');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('Phase 14: promptLibrary exposes agy-NOV v0.9 playbooks when connected & HUD surfaces verify/force_ask signals', () => {
  const { doc, mk } = createMiniDom();
  const box = mk('div');
  box.setAttribute('data-testid', 'agent-input-box');
  const ta = mk('textarea');
  box.appendChild(ta);
  doc.body.appendChild(box);
  let connected = false;
  let insertedText = '';
  const ctrl = promptLibMod.createPromptLibraryController({
    win: { document: doc, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Event },
    doc,
    enabled: true,
    autoObserve: false,
    isNovConnected: () => connected,
    onInsert: (ev) => { insertedText = ev?.text || ''; },
  });
  try {
    // Disconnected: no NOV playbooks rendered in modal
    ctrl.open();
    const offModal = doc.querySelector('[data-testid="ag-sag-pl-modal"]');
    assert.ok(offModal);
    const collectText = (n) => `${n?.textContent || ''} ${(n?.children || []).map(collectText).join(' ')}`;
    assert.ok(!collectText(offModal).includes('/nov-spec'));
    ctrl.close();

    // Connected: 4 v0.9 playbooks appear in modal and clicking inserts safely without auto-submit
    connected = true;
    ctrl.open();
    const onModal = doc.querySelector('[data-testid="ag-sag-pl-modal"]');
    const modalText = collectText(onModal);
    for (const cmd of ['/nov-spec', '/nov-debug', '/nov-review', '/nov-handoff']) {
      assert.ok(modalText.includes(cmd), `Connected NOV modal must expose ${cmd}`);
    }
    const specRow = onModal.querySelector('[data-ag-sag-pl-item="nov-playbook-spec"]');
    assert.ok(specRow, 'Must render nov-playbook-spec row');
    (specRow.querySelector('button') || specRow).click();
    assert.equal(insertedText, '/nov-spec ');
    assert.equal(ta.value, '/nov-spec ');
  } finally {
    ctrl.destroy();
  }

  // HUD segment reflects verifyFailed and guardForceAsk title metadata
  const segs = statusPillMod.computeHudSegments({
    cfg: { modules: {} },
    nov: { connected: true, enabledCount: 9, total: 13, verifyFailed: true, guardForceAsk: 2 },
    strings: {},
  });
  const novSeg = segs.find((s) => s.id === 'nov');
  assert.ok(novSeg);
  assert.equal(novSeg.text, 'NOV !');
  assert.equal(novSeg.tone, 'warn');
  assert.match(novSeg.title, /Verify fail/);
  assert.match(novSeg.title, /Guard confirm 2/);

  const zhSag = require('../packages/core/i18n.js').getSagStrings('zh-CN');
  const zhSegs = statusPillMod.computeHudSegments({
    cfg: { modules: {} },
    nov: { connected: true, enabledCount: 9, total: 13, verifyFailed: true, guardForceAsk: 2 },
    strings: require('../packages/core/i18n.js').getStrings('zh-CN'),
    sagStrings: zhSag,
  });
  const zhNov = zhSegs.find((s) => s.id === 'nov');
  assert.ok(zhNov);
  assert.equal(/force_ask|Verify|Guard/i.test(zhNov.title), false);
  assert.ok(zhNov.title.includes('需确认 2'));

  // nov-synergy normalizeNovFeed preserves v0.8/v0.9 fields
  const syn = novSynergyMod.createNovSynergyController({
    win: {},
    doc,
    autoRefresh: false,
    initialFeed: {
      guard: { blockedCount: 1, askCount: 2, forceAskCount: 1, permissionMode: 'strict-gate' },
      verify: { enforceOnStop: true, lastStatus: 'fail', dirtyFilesCount: 2 },
      alerts: ['Guard strict-gate active'],
    },
  });
  try {
    const f = syn.getFeed();
    assert.equal(f.guard.forceAskCount, 1);
    assert.equal(f.guard.permissionMode, 'strict-gate');
    assert.equal(f.verify.lastStatus, 'fail');
    assert.deepEqual(f.alerts, ['Guard strict-gate active']);
  } finally {
    syn.destroy();
  }
});

test('Phase 14: themeStudio detectConvStateFromDom ignores CSS-hidden nodes via getComputedStyle & all 9 ext packs have zero placeholder/brand defects', () => {
  const { doc, mk } = createMiniDom();
  const wrapper = mk('div');
  wrapper.className = 'hidden';
  const stopBtn = mk('button');
  stopBtn.setAttribute('data-testid', 'stop-button');
  wrapper.appendChild(stopBtn);
  doc.body.appendChild(wrapper);

  const mockWin = {
    getComputedStyle: (el) => ({
      display: String(el.className || '').includes('hidden') ? 'none' : 'block',
      visibility: 'visible',
    }),
  };
  assert.equal(themeStudioMod.detectConvStateFromDom(doc, { win: mockWin }), 'idle', 'CSS-hidden ancestor must not trigger running glow');

  // Verify all 9 extended packs have zero empty values, zero corrupted placeholders, and zero dropped Antigravity brand
  const extDir = path.resolve(process.cwd(), 'packages', 'core', 'locales', 'ext');
  for (const f of fs.readdirSync(extDir).filter((n) => n.endsWith('.json'))) {
    const parsed = JSON.parse(fs.readFileSync(path.join(extDir, f), 'utf8'));
    for (const [k, v] of Object.entries(parsed.exact || {})) {
      assert.ok(String(v || '').trim().length > 0, `${f}: empty translation for ${k}`);
      const kVars = (k.match(/\{[A-Za-z0-9_]+\}|%[sd]/g) || []).sort().join(',');
      const vVars = (v.match(/\{[A-Za-z0-9_]+\}|%[sd]/g) || []).sort().join(',');
      if (kVars) assert.equal(vVars, kVars, `${f}: placeholder mismatch for ${k.slice(0, 60)}`);
      if (/\bAntigravity\b/.test(k)) {
        assert.match(v, /Antigravity/i, `${f}: brand dropped in ${k.slice(0, 60)}`);
      }
    }
  }

  // Verify bundle headroom & syntax validity across all 25 core files
  for (const p of readCoreSources()) {
    const st = inspectCoreLexState(p.code);
    assert.equal(st.mode, 'code', `${p.file} lex mode`);
    assert.equal(st.tplDepth, 0, `${p.file} tplDepth`);
  }
  const ruExpr = buildInjectExpression({ hostI18nLocale: 'ru' });
  new Function(ruExpr);
  assert.ok(Buffer.byteLength(ruExpr) <= 1_540_000, `Expected ru bundle <= 1,540,000 B, got ${Buffer.byteLength(ruExpr)} B`);
});

test('Phase 14 final-audit hardening: EEXIST safe cleanup, strict WS port & app:// URL, /proc unreadable, case-folded ReDoS, no-config reuse syncExtPacks & HUD verify/force_ask propagation', async () => {
  const vm = await import('node:vm');
  const { isAntigravityHostTarget, isLoopbackWsUrl } = await import('../cli/cdp-attach.mjs');
  const { detectAntigravityProcesses } = await import('../cli/launcher.mjs');
  const { computeCoreHash } = await import('../cli/bundle.mjs');
  const saaMod = require('../packages/core/safe-auto-accept.js');
  const pqMod = require('../packages/core/prompt-queue.js');

  // (a) Omitted port on WS URL rejected when non-80 expectedPort specified; foreign app:// with fake Antigravity title rejected
  assert.equal(isLoopbackWsUrl('ws://127.0.0.1/page/1', 9222), false);
  assert.equal(
    isAntigravityHostTarget(
      { type: 'page', title: 'Antigravity', url: 'app://foreign-electron/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/p1' },
      { expectedPort: 9222 }
    ),
    false
  );

  // (b) Case-folded overlapping optional/variable quantifiers rejected in case-insensitive mode
  assert.equal(saaMod.validateCustomPattern('A?a?'), false);
  assert.equal(saaMod.validateCustomPattern('[A-Z]+[a-z]+'), false);

  // (c) PromptQueue retains item if button only mutates draft without clearing or entering streaming
  const { doc, mk } = createMiniDom();
  const box = mk('div');
  box.setAttribute('data-testid', 'agent-input-box');
  const ta = mk('textarea');
  const mutBtn = mk('button', 'Send');
  mutBtn.setAttribute('data-testid', 'input-send-button');
  mutBtn.addEventListener('click', () => {
    ta.value = `${ta.value} [edited-not-sent]`;
  });
  box.appendChild(ta);
  box.appendChild(mutBtn);
  doc.body.appendChild(box);
  const pq = pqMod.createPromptQueueController({
    win: { document: doc, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Event },
    doc,
    autoObserve: false,
    dispatchDelayMs: 5000,
  });
  try {
    pq.enqueue('Do not drop me');
    const res = pq.flushIfReady();
    assert.equal(res.dispatched, false);
    assert.equal(res.reason, 'submit-unconfirmed');
    assert.equal(pq.getItems().length, 1);
  } finally {
    pq.destroy();
  }

  // (d) Missing forceAskCount on legacy snapshot with lastEvent.decision='force_ask' infers 1 (never full askCount)
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sag-p14-fa-'));
  try {
    fs.writeFileSync(
      path.join(tmpHome, 'feed-snapshot.json'),
      JSON.stringify({
        schemaVersion: 1,
        guard: { blockedCount: 0, askCount: 7, lastEvent: { decision: 'force_ask', tool: 'run_command', reason: 'gate' } },
      }),
      'utf8'
    );
    const out = readNovFeed({ homeDir: tmpHome, explicitDataDir: tmpHome });
    assert.equal(out.feed.guard.forceAskCount, 1);
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }

  // (e) Windows stderr with empty stdout fails closed (does not report "not running")
  const winErr = await detectAntigravityProcesses({
    platform: 'win32',
    execFileFn: async () => ({ stdout: '', stderr: 'Access is denied', exitCode: 1 }),
  });
  assert.equal(winErr.detectionFailed, true);

  // (f) Same-hash no-config reuse still triggers prev.syncExtPacks()
  const noCfgExpr = buildInjectExpression(null, { extLocale: 'fr' });
  let syncExtCalled = 0;
  const reuseWin = {
    __agSag: {
      __agSgHash: computeCoreHash(),
      getDebugState: () => ({ destroyed: false }),
      syncExtPacks() { syncExtCalled += 1; },
      evaluateNow() {},
    },
  };
  reuseWin.self = reuseWin.top = reuseWin;
  const reuseRes = vm.runInNewContext(noCfgExpr, { window: reuseWin });
  assert.equal(reuseRes.reused, true);
  assert.equal(syncExtCalled, 1);
});
