import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { computeNovFeedSignature, readNovFeed } from '../cli/nov-bridge.mjs';
import { inspectMarketplaceCompliance } from '../cli/doctor.mjs';
import { parseStorageArgs, searchSanitizedSessions } from '../cli/storage-doctor.mjs';
import { runSagCli } from '../cli/sag-cli.mjs';
import { SagWatchDaemon } from '../cli/watch-daemon.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const coreMod = require('../packages/core/index.js');
const packsMod = require('../packages/core/host-i18n-packs.js');
const themeStudioMod = require('../packages/core/theme-studio.js');
const readingNavMod = require('../packages/core/reading-nav.js');
const promptLibMod = require('../packages/core/prompt-library.js');
const statusPillMod = require('../packages/core/status-pill.js');
const vaultMod = require('../packages/core/bookmark-vault.js');
const draftMod = require('../packages/core/draft-guard.js');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-sag-v14-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function withTempDirAsync(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-sag-v14-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createMiniDom() {
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
      const mTag = s.match(/^[a-z0-9-]+/i);
      if (mTag && el.tagName.toLowerCase() !== mTag[0].toLowerCase()) return false;
      const clsMatches = [...s.matchAll(/\.([A-Za-z0-9_-]+)/g)];
      for (const m of clsMatches) {
        if (!String(el.className || '').split(/\s+/).includes(m[1])) return false;
      }
      const attrMatches = [...s.matchAll(/\[([^\]=^$*]+)(?:([*^$]?=)"([^"]*)")?\]/g)];
      for (const m of attrMatches) {
        const [, attr, op, val] = m;
        const actual = el.getAttribute(attr);
        if (actual === null) return false;
        if (op === '=' && actual !== val) return false;
        if (op === '*=' && !actual.includes(val)) return false;
        if (op === '^=' && !actual.startsWith(val)) return false;
      }
      return true;
    });
  };

  const makeEl = (tag) => {
    const attrs = new Map();
    const listeners = new Map();
    const el = {
      nodeType: 1,
      tagName: String(tag || 'div').toUpperCase(),
      children: [],
      parentElement: null,
      hidden: false,
      value: '',
      style: {},
      _text: '',
      get className() {
        return attrs.get('class') || '';
      },
      set className(v) {
        attrs.set('class', String(v || ''));
      },
      get id() {
        return attrs.get('id') || '';
      },
      set id(v) {
        attrs.set('id', String(v || ''));
      },
      get firstChild() {
        return el.children[0] || null;
      },
      get isConnected() {
        let cur = el;
        while (cur) {
          if (cur === doc.documentElement) return true;
          cur = cur.parentElement;
        }
        return false;
      },
      get textContent() {
        if (el.children.length === 0) return el._text;
        return el._text + el.children.map((c) => c.textContent).join('');
      },
      set textContent(v) {
        el.children = [];
        el._text = String(v ?? '');
      },
      setAttribute(k, v) {
        attrs.set(String(k), String(v));
      },
      getAttribute(k) {
        return attrs.has(String(k)) ? attrs.get(String(k)) : null;
      },
      hasAttribute(k) {
        return attrs.has(String(k));
      },
      removeAttribute(k) {
        attrs.delete(String(k));
      },
      appendChild(child) {
        if (!child) return child;
        if (child.parentElement) child.parentElement.removeChild(child);
        child.parentElement = el;
        el.children.push(child);
        return child;
      },
      insertBefore(child, ref) {
        if (!child) return child;
        if (child.parentElement) child.parentElement.removeChild(child);
        child.parentElement = el;
        const idx = ref ? el.children.indexOf(ref) : -1;
        if (idx >= 0) el.children.splice(idx, 0, child);
        else el.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = el.children.indexOf(child);
        if (idx >= 0) {
          el.children.splice(idx, 1);
          child.parentElement = null;
        }
        return child;
      },
      remove() {
        el.parentElement?.removeChild(el);
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = (n) => {
          for (const c of n.children || []) {
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
      closest(sel) {
        let cur = el;
        while (cur) {
          if (matches(cur, sel)) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      addEventListener(ev, fn) {
        if (!listeners.has(ev)) listeners.set(ev, new Set());
        listeners.get(ev).add(fn);
      },
      removeEventListener(ev, fn) {
        listeners.get(ev)?.delete(fn);
      },
      dispatchEvent(ev) {
        for (const fn of listeners.get(ev?.type) || []) fn(ev);
      },
      click() {
        el.dispatchEvent({ type: 'click', target: el, preventDefault() {}, stopPropagation() {} });
      },
      focus() {},
    };
    return el;
  };

  const html = makeEl('html');
  const head = makeEl('head');
  const body = makeEl('body');
  html.appendChild(head);
  html.appendChild(body);
  const doc = {
    documentElement: html,
    head,
    body,
    createElement: makeEl,
    querySelector: (s) => html.querySelector(s),
    querySelectorAll: (s) => html.querySelectorAll(s),
    getElementById: (id) => html.querySelector(`[id="${id}"]`),
    addEventListener() {},
    removeEventListener() {},
  };
  const win = {
    document: doc,
    Event: class MockEvent {
      constructor(type) {
        this.type = type;
      }
    },
    addEventListener() {},
    removeEventListener() {},
    navigator: { language: 'zh-CN' },
  };
  return { doc, win, makeEl };
}

function createMemoryStorage() {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => m.delete(String(k)),
  };
}

test('1. agy-NOV v1.2 feed parity: unwraps snap.summary, supports verify=blocked, xray, health-sweep.json & /nov-workflow', () => {
  withTempDir((tmp) => {
    const novDir = path.join(tmp, 'agy-nov');
    fs.mkdirSync(novDir, { recursive: true });
    fs.writeFileSync(
      path.join(novDir, 'feed-snapshot.json'),
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: '2026-11-28T00:00:00Z',
        summary: {
          guard: {
            blockedCount: 3,
            snapshotCount: 9,
            latestSnapshotId: 'snap-9',
            lastEvent: {
              timestamp: '2026-11-28T00:01:00Z',
              toolName: 'run_command',
              reason: 'Blocked secret token Bearer eyJ1234567890.abcdefghijk.lmnopqrstuv',
            },
          },
          verify: { status: 'blocked', failedCount: 2, passedCount: 10 },
          xray: { totalTokens: 128500, cacheHitPct: 74, sessionCount: 4 },
          radar: { awaitingCount: 1, runningCount: 2, headline: '1 waiting' },
          mem: { totalCount: 12, driftedCount: 1 },
          spec: { writeLockActive: false, activeSpecId: 'spec-1' },
        },
      })
    );
    fs.writeFileSync(
      path.join(novDir, 'health-sweep.json'),
      JSON.stringify({ score: 92, grade: 'A', status: 'healthy', warnings: ['minor-1'] })
    );

    const sig = computeNovFeedSignature({ homeDir: tmp, explicitDataDir: novDir });
    assert.ok(!sig.startsWith('missing|missing'), 'signature tracks both snapshot and health-sweep');

    const res = readNovFeed({ homeDir: tmp, explicitDataDir: novDir });
    assert.equal(res.ok, true);
    assert.equal(res.available, true);
    assert.equal(res.feed.guard.blockedCount, 3);
    assert.equal(res.feed.guard.latestBlocked.tool, 'run_command');
    assert.equal(res.feed.guard.latestBlocked.ts, '2026-11-28T00:01:00Z');
    assert.ok(!res.feed.guard.latestBlocked.reason.includes('eyJ1234567890'));
    assert.equal(res.feed.verify.lastStatus, 'blocked');
    assert.equal(res.feed.xray.totalTokens, 128500);
    assert.equal(res.feed.xray.cacheHitPct, 74);
    assert.equal(res.feed.healthSweep.score, 92);
    assert.equal(res.feed.healthSweep.grade, 'A');
    assert.equal(res.feed.healthSweep.warningsCount, 1);

    // /nov-workflow playbook present when NOV connected
    const { doc, win } = createMiniDom();
    const plConnected = promptLibMod.createPromptLibraryController({
      win,
      doc,
      enabled: true,
      isNovConnected: () => true,
    });
    plConnected.open();
    const modalOn = doc.querySelector('[data-testid="ag-sag-pl-modal"]');
    assert.ok(modalOn && modalOn.textContent.includes('/nov-workflow'));
    plConnected.destroy();
    const plDisconnected = promptLibMod.createPromptLibraryController({
      win,
      doc,
      enabled: true,
      isNovConnected: () => false,
    });
    plDisconnected.open();
    const modalOff = doc.querySelector('[data-testid="ag-sag-pl-modal"]');
    assert.ok(modalOff && !modalOff.textContent.includes('/nov-workflow'));
    plDisconnected.destroy();

    // Status pill HUD segment renders verifyBlocked + healthScore cleanly
    const segs = statusPillMod.computeHudSegments({
      nov: { connected: true, verifyBlocked: true, healthScore: 92, blockedCount: 3 },
    });
    const novSeg = segs.find((x) => x.id === 'nov');
    assert.ok(novSeg && novSeg.text.includes('NOV ⛔'));
    assert.ok(String(novSeg.title || '').includes('92'));
  });
});

test('2. Marketplace compliance check passes on repo and flags bad description/unknown field', () => {
  const realRes = inspectMarketplaceCompliance(REPO_ROOT);
  assert.equal(realRes.ok, true, `Expected repo plugin.json compliance pass, got: ${realRes.issues.join('; ')}`);
  assert.equal(realRes.version, '1.6.0');

  withTempDir((tmp) => {
    fs.writeFileSync(
      path.join(tmp, 'plugin.json'),
      JSON.stringify({ name: 'bad-pkg', version: '1.0.0', description: 'x'.repeat(180), unknownField: true })
    );
    const badRes = inspectMarketplaceCompliance(tmp);
    assert.equal(badRes.ok, false);
    assert.ok(badRes.issues.some((i) => i.includes('Unsupported plugin.json field')));
    assert.ok(badRes.issues.some((i) => i.includes('description length')));
  });
});

test('3. Dual-star 8-locale sync forwards supported locales to agy-NOV and skips unsupported ones', () => {
  const { doc, win } = createMiniDom();
  const storage = createMemoryStorage();
  const sentLocales = [];
  const mockNov = {
    isConnected: () => true,
    isBridgeAvailable: () => true,
    getState: () => ({ installed: true, config: { modules: { guard: true }, locale: 'en' } }),
    getFeed: () => null,
    setLocale: (loc) => {
      sentLocales.push(loc);
      return Promise.resolve({ ok: true });
    },
    destroy() {},
  };

  const api = coreMod.mountSag({
    win,
    doc,
    storage,
    autoPoll: false,
    autoObserve: false,
    novSynergyMod: { createNovSynergyController: () => mockNov },
  });
  api.setHostLocale('ja');
  api.setHostLocale('fr');
  api.setHostLocale('ru'); // not in agy-NOV 8-locale intersection
  assert.deepEqual(sentLocales, ['ja', 'fr']);
  api.destroy();
});

test('4. Antigravity 2.35.2 i18n parity (9 locales) + Auxiliary Pane theme CSS & code folding', () => {
  const requiredKeys = [
    'Scheduled Tasks',
    'Background Tasks',
    'Project-Level Settings',
    'Tool Execution Policy',
    'Terminal Sandbox',
    'Auxiliary Pane',
    'Files Changed',
    'Terminals',
    'Command Allowlist',
    'Command Denylist',
  ];
  for (const loc of ['zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt-BR']) {
    const pack = packsMod.getPack(loc);
    for (const key of requiredKeys) {
      assert.ok(pack.exact[key] && pack.exact[key].trim().length > 0, `Missing "${key}" in locale ${loc}`);
    }
  }

  const css = themeStudioMod.buildThemeCss({ preset: 'obsidian-prism', surface: 'smoked' });
  assert.ok(!css.includes(':has('), 'zero :has() rule enforced');
  assert.ok(!css.includes('.ag-cs-'), 'zero .ag-cs- rule enforced');
  for (const testid of ['auxiliary-pane', 'subagents-panel', 'background-tasks-panel', 'files-changed-panel', 'terminal-panel']) {
    assert.ok(css.includes(`[data-testid="${testid}"]`), `Theme CSS should cover ${testid}`);
  }

  const { doc, win, makeEl } = createMiniDom();
  const aux = makeEl('div');
  aux.setAttribute('data-testid', 'auxiliary-pane');
  const term = makeEl('div');
  term.setAttribute('data-testid', 'terminal-panel');
  const pre = makeEl('pre');
  pre.textContent = Array.from({ length: 55 }, (_, i) => `log line ${i + 1}`).join('\n');
  term.appendChild(pre);
  aux.appendChild(term);
  doc.body.appendChild(aux);

  const nav = readingNavMod.createReadingNavController({ win, doc, enabled: true, collapseLines: 30, autoObserve: false });
  nav.sync();
  const navDbg = nav.getDebugState();
  assert.equal(navDbg.enhancedCodeBlocks, 1, 'Nested auxiliary-pane + terminal-panel should enhance pre exactly once');
  assert.equal(navDbg.foldedCodeBlocks, 1);
  assert.equal(pre.getAttribute('data-ag-sag-code-folded'), '1');
  nav.destroy();
  assert.equal(pre.hasAttribute('data-ag-sag-code-folded'), false);
  assert.equal(doc.querySelectorAll('[data-ag-sag-code-bar="1"]').length, 0);
});

test('5. Read-only sanitized session search (CLI + WatchDaemon bridge + BookmarkVault scope switch)', async () => {
  await withTempDirAsync(async (tmp) => {
    const brain = path.join(tmp, 'brain');
    const s1 = path.join(brain, 'sess-alpha', '.system_generated', 'logs');
    const s2 = path.join(brain, 'sess-beta');
    fs.mkdirSync(s1, { recursive: true });
    fs.mkdirSync(s2, { recursive: true });
    fs.writeFileSync(
      path.join(s1, 'transcript.jsonl'),
      [
        JSON.stringify({ role: 'user', text: 'Investigate Auxiliary Pane layout with token sk-proj-secret1234567890abcdef' }),
        JSON.stringify({ role: 'assistant', text: 'Fixed Auxiliary Pane border alignment cleanly.' }),
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(s2, 'transcript.jsonl'),
      JSON.stringify({ role: 'user', text: 'Unrelated topic only' }) + '\n'
    );

    const parsed = parseStorageArgs(['search', '--q=Auxiliary', `--data-dir=${tmp}`, '--limit=5', '--json']);
    assert.equal(parsed.command, 'search');
    assert.equal(parsed.query, 'Auxiliary');
    assert.equal(parsed.limit, 5);

    const report = searchSanitizedSessions({ dataDir: tmp, query: 'Auxiliary', limit: 5 });
    assert.equal(report.ok, true);
    assert.equal(report.scannedSessions, 2);
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].sessionId, 'sess-alpha');
    assert.ok(!JSON.stringify(report).includes('sk-proj-secret1234567890abcdef'), 'Secrets must be redacted');
    assert.ok(JSON.stringify(report).includes('[REDACTED_KEY]'));

    // CLI forwarding
    let stdout = '';
    const cliRes = await runSagCli(['storage', 'search', '--q=Auxiliary', `--data-dir=${tmp}`, '--json'], {
      stdout: (s) => { stdout += s; },
      stderr: () => {},
    });
    assert.equal(cliRes.exitCode, 0);
    assert.equal(JSON.parse(stdout).results.length, 1);

    // WatchDaemon zero-port bridge handler
    const daemon = new SagWatchDaemon({ storageDataDir: tmp, enableHostBridge: true });
    const bridgeRes = await daemon._handleHostBridgePayload(
      JSON.stringify({ reqId: 'r-search', type: 'sag:search_sessions', payload: { query: 'Auxiliary', limit: 10 } }),
      { targetId: 'win-1' }
    );
    assert.equal(bridgeRes.ok, true);
    assert.equal(bridgeRes.reqId, 'r-search');
    assert.equal(bridgeRes.data.results.length, 1);

    // BookmarkVault UI scope switch
    const { doc, win } = createMiniDom();
    const storage = createMemoryStorage();
    const vault = vaultMod.createBookmarkVaultController({
      win,
      doc,
      storage,
      bindShortcut: false,
      getLang: () => 'zh-CN',
      onSearchSessions: async (q) => searchSanitizedSessions({ dataDir: tmp, query: q }),
    });
    vault.open();
    assert.ok(doc.querySelector('[data-ag-sg-vault-tab="bookmarks"]'));
    assert.ok(doc.querySelector('[data-ag-sg-vault-tab="sessions"]'));
    await vault.setScope('sessions');
    await vault.setQuery('Auxiliary');
    assert.ok(doc.querySelector('[data-ag-sg-session-hit="sess-alpha"]'));
    vault.destroy();
    assert.equal(doc.querySelector('[data-testid="ag-sg-vault-overlay"]'), null);
  });
});

test('6. draftGuard records composer attachment count and shows gentle re-attach hint on restore bar', () => {
  const { doc, win, makeEl } = createMiniDom();
  const storage = createMemoryStorage();
  const wrap = makeEl('div');
  const box = makeEl('div');
  box.setAttribute('data-testid', 'agent-input-box');
  const chip1 = makeEl('div');
  chip1.setAttribute('data-testid', 'attachment-chip');
  const img = makeEl('img');
  img.setAttribute('src', 'blob:https://antigravity.local/img-1');
  const ta = makeEl('textarea');
  ta.value = 'Please analyze these two screenshots before refactoring';
  box.appendChild(chip1);
  box.appendChild(img);
  box.appendChild(ta);
  wrap.appendChild(box);
  doc.body.appendChild(wrap);

  const dg = draftMod.createDraftGuardController({
    win,
    doc,
    storage,
    enabled: true,
    debounceMs: 0,
    hydrationGraceMs: 0,
    getLang: () => 'zh-CN',
  });
  const saved = dg.flushNow('cid-media-1');
  assert.equal(saved.attachmentCount, 2);

  // Simulate session reload with empty composer
  ta.value = '';
  const loaded = draftMod.loadDraft(storage, 'cid-media-1');
  assert.equal(loaded.attachmentCount, 2);

  // Trigger restore bar rendering for cid-media-1
  const row = makeEl('div');
  row.setAttribute('data-testid', 'conversation-row-sidebar');
  row.setAttribute('data-cascade-id', 'cid-media-1');
  row.setAttribute('data-active', '1');
  doc.body.appendChild(row);
  dg.sync();
  const bar = doc.querySelector('[data-testid="ag-sg-draft-bar"]');
  assert.ok(bar && !bar.hidden);
  assert.ok(bar.textContent.includes('2 个附件'), `Expected attachment hint in bar, got: ${bar.textContent}`);
  dg.destroy();
});
