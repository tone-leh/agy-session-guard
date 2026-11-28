import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

import {
  TranslatorService,
  buildSystemPrompt,
  maskProxyUrl,
  protectCodeTokens,
  requestViaHttpProxy,
  resolveProxyForUrl,
  restoreCodeTokens,
  validateEndpointUrl,
  validateProxyUrl,
} from '../cli/translator-service.mjs';
import { buildInjectExpression } from '../cli/bundle.mjs';
import {
  buildConfigPatchFromOpts,
  isAntigravityHostTarget,
  isAntigravitySwarmTarget,
  mergeMigratedConfigPatch,
  readLocalSagConfig,
  selectSwarmTargets,
} from '../cli/cdp-attach.mjs';
import { readLocalTelemetrySnapshot } from '../cli/storage-doctor.mjs';
import {
  applyPrismMigration,
  buildLaunchAgentPlist,
  inspectPrismMigration,
} from '../cli/launcher.mjs';
import { SagWatchDaemon, fetchLocalQuotaSummary, normalizeLocalQuotaSummary } from '../cli/watch-daemon.mjs';

const require = createRequire(import.meta.url);
const coexist = require('../packages/core/coexist.js');
const ctxSrc = require('../packages/core/context-source.js');
const hostI18nPacks = require('../packages/core/host-i18n-packs.js');
const hostI18nMod = require('../packages/core/host-i18n.js');
const thoughtMod = require('../packages/core/thought-translator.js');
const themeStudioMod = require('../packages/core/theme-studio.js');
const readingNavMod = require('../packages/core/reading-nav.js');
const statusPillMod = require('../packages/core/status-pill.js');

async function withTempDirAsync(fn) {
  const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'ag-sag-v15-')));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createMiniDom() {
  const listeners = new Map();
  const makeEl = (tag) => {
    const el = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      attrs: new Map(),
      style: {},
      className: '',
      childNodes: [],
      parentElement: null,
      hidden: false,
      isConnected: true,
      _listeners: new Map(),
      get id() { return this.attrs.get('id') || ''; },
      set id(v) { this.attrs.set('id', String(v)); },
      get children() { return this.childNodes.filter((c) => c.nodeType === 1); },
      get firstChild() { return this.childNodes[0] || null; },
      get nextElementSibling() {
        if (!this.parentElement) return null;
        const sibs = this.parentElement.children;
        const idx = sibs.indexOf(this);
        return idx >= 0 ? sibs[idx + 1] || null : null;
      },
      get textContent() {
        return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join('');
      },
      set textContent(v) {
        const str = String(v ?? '');
        this.childNodes = str ? [{ nodeType: 3, nodeValue: str, parentElement: this, isConnected: true }] : [];
      },
      setAttribute(k, v) {
        this.attrs.set(k, String(v));
        if (k === 'class') this.className = String(v);
      },
      getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; },
      hasAttribute(k) { return this.attrs.has(k); },
      removeAttribute(k) { this.attrs.delete(k); },
      appendChild(c) {
        if (c.parentElement) {
          const i = c.parentElement.childNodes.indexOf(c);
          if (i >= 0) c.parentElement.childNodes.splice(i, 1);
        }
        c.parentElement = this;
        this.childNodes.push(c);
        return c;
      },
      insertBefore(c, ref) {
        if (c.parentElement) {
          const i = c.parentElement.childNodes.indexOf(c);
          if (i >= 0) c.parentElement.childNodes.splice(i, 1);
        }
        c.parentElement = this;
        const idx = ref ? this.childNodes.indexOf(ref) : -1;
        if (idx >= 0) this.childNodes.splice(idx, 0, c);
        else this.childNodes.push(c);
        return c;
      },
      removeChild(c) {
        const idx = this.childNodes.indexOf(c);
        if (idx < 0) throw new Error('NotFoundError');
        this.childNodes.splice(idx, 1);
        c.parentElement = null;
        return c;
      },
      remove() { if (this.parentElement) this.parentElement.removeChild(this); },
      addEventListener(ev, fn) {
        if (!this._listeners.has(ev)) this._listeners.set(ev, new Set());
        this._listeners.get(ev).add(fn);
      },
      removeEventListener(ev, fn) { this._listeners.get(ev)?.delete(fn); },
      click() {
        for (const fn of this._listeners.get('click') || []) fn({ target: this, preventDefault() {}, stopPropagation() {} });
      },
      scrollIntoView() {},
      getBoundingClientRect() { return { left: 10, top: 20, right: 110, bottom: 50, width: 100, height: 30 }; },
      matches(selList) {
        return String(selList).split(',').some((raw) => {
          const s = raw.trim();
          if (!s) return false;
          if (s.startsWith('#')) return this.id === s.slice(1);
          if (s.startsWith('.')) return this.className.split(/\s+/).includes(s.slice(1));
          const attrMatch = s.match(/^([a-z0-9-]*)?\[([^=\]]+)(?:="([^"]*)")?\]$/i);
          if (attrMatch) {
            if (attrMatch[1] && this.tagName.toLowerCase() !== attrMatch[1].toLowerCase()) return false;
            return attrMatch[3] !== undefined ? this.getAttribute(attrMatch[2]) === attrMatch[3] : this.hasAttribute(attrMatch[2]);
          }
          return this.tagName.toLowerCase() === s.toLowerCase();
        });
      },
      closest(sel) {
        let cur = this;
        while (cur && cur.nodeType === 1) {
          if (cur.matches(sel)) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = (n) => {
          for (const c of n.childNodes || []) {
            if (c.nodeType !== 1) continue;
            if (c.matches(sel)) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
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
    hidden: false,
    createElement: makeEl,
    createTextNode: (t) => ({ nodeType: 3, nodeValue: String(t ?? ''), parentElement: null, isConnected: true }),
    getElementById: (id) => html.querySelector(`#${id}`),
    querySelector: (sel) => html.querySelector(sel),
    querySelectorAll: (sel) => html.querySelectorAll(sel),
    addEventListener(ev, fn) {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev).add(fn);
    },
    removeEventListener(ev, fn) { listeners.get(ev)?.delete(fn); },
    dispatchEvent(ev) { for (const fn of listeners.get(ev.type) || []) fn(ev); },
  };
  const win = {
    document: doc,
    navigator: { language: 'zh-CN', platform: 'MacIntel' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  };
  return { doc, win, makeEl };
}

test('1. v1.5 TranslatorService: 0600 disk cache, proxy resolution, technical prompt, 48k chunking, SSE streaming, Bing failover, code token protection & multi-profile', async () => {
  await withTempDirAsync(async (tmp) => {
    const secretsPath = path.join(tmp, 'translator-secrets.json');
    const cachePath = path.join(tmp, 'translator-cache.json');

    // 1a. Code token protection preserves backticks, paths and CLI flags
    const protectedObj = protectCodeTokens('Run `npm test` on /Users/dev/app.js with --dry-run flag.');
    assert.ok(protectedObj.tokens.length >= 3);
    assert.equal(protectedObj.text.includes('`npm test`'), false);
    const restored = restoreCodeTokens(protectedObj.text, protectedObj.tokens);
    assert.equal(restored, 'Run `npm test` on /Users/dev/app.js with --dry-run flag.');

    // 1b. Proxy resolution honors NO_PROXY and customProxyUrl
    const pCustom = resolveProxyForUrl('https://api.openai.com/v1/chat/completions', {
      proxyMode: 'custom',
      customProxyUrl: 'http://127.0.0.1:7890',
      env: {},
    });
    assert.equal(pCustom, 'http://127.0.0.1:7890');
    const pBypass = resolveProxyForUrl('https://api.openai.com/v1/chat/completions', {
      proxyMode: 'auto',
      env: { HTTPS_PROXY: 'http://127.0.0.1:7890', NO_PROXY: 'api.openai.com' },
    });
    assert.equal(pBypass, null);

    // 1c. Prompt includes <thought_source> anti-injection boundary and technical style
    const sysPrompt = buildSystemPrompt({ targetLang: 'zh-CN', kind: 'thought', stylePreset: 'technical' });
    assert.ok(sysPrompt.includes('<thought_source>'));
    assert.ok(sysPrompt.length > 60);

    // 1d. 0600 Disk cache persists across service restarts + SSE streaming + 48k chunking + batch titles + multi-profile
    let fetchCalls = 0;
    const svc = new TranslatorService({
      explicitPath: secretsPath,
      cachePath,
      fetchFn: async (url, init) => {
        fetchCalls += 1;
        const bodyObj = init?.body ? JSON.parse(String(init.body)) : {};
        if (bodyObj.stream) {
          const chunks = [
            'data: {"choices":[{"delta":{"content":"正在"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"检查架构。"}}]}\n\n',
            'data: [DONE]\n\n',
          ];
          const enc = new TextEncoder();
          let i = 0;
          return {
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'text/event-stream']]),
            body: {
              getReader: () => ({
                read: async () => (i < chunks.length ? { done: false, value: enc.encode(chunks[i++]) } : { done: true }),
                cancel: async () => {},
              }),
            },
          };
        }
        const userText = bodyObj.messages?.[1]?.content || '';
        if (userText.includes('[1]')) {
          return {
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'application/json']]),
            text: async () => JSON.stringify({ choices: [{ message: { content: '[1] 修复路由\n[2] 优化缓存' } }] }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({ choices: [{ message: { content: `译:${userText.slice(0, 12)}` } }] }),
        };
      },
    });

    const profRes = svc.saveProfile({
      id: 'google-h',
      name: 'Google Hydrogen',
      engine: 'openai',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-4-hydrogen',
      apiKey: 'AIzaSyTestSecretKey1234567890',
    });
    assert.equal(profRes.ok, true);
    svc.setActiveProfile('google-h');
    const profList = svc.listProfiles();
    assert.equal(profList.length, 1);
    assert.equal(profList[0].hasKey, true);
    assert.equal(JSON.stringify(profList).includes('AIzaSyTestSecretKey'), false, 'listProfiles must never expose plaintext key');

    // SSE stream callback
    const partials = [];
    const sseRes = await svc.translate(
      { engine: 'openai', text: 'Inspecting architecture.', targetLang: 'zh-CN', stylePreset: 'technical' },
      { onChunk: ({ partial }) => partials.push(partial) }
    );
    assert.equal(sseRes.ok, true);
    assert.equal(sseRes.data.translated, '正在检查架构。');
    assert.ok(partials.length >= 1);

    // Flush disk cache and verify second instance hits cache with zero fetch calls
    svc.flushCacheSync();
    assert.equal(fs.existsSync(cachePath), true);
    const svc2 = new TranslatorService({
      explicitPath: secretsPath,
      cachePath,
      fetchFn: async () => { throw new Error('Should hit disk cache'); },
    });
    const hit = await svc2.translate({ engine: 'openai', text: 'Inspecting architecture.', targetLang: 'zh-CN', stylePreset: 'technical' });
    assert.equal(hit.ok, true);
    assert.equal(hit.data.cached, true);
    assert.equal(hit.data.translated, '正在检查架构。');

    // Batch titles (1 request for 2 titles)
    const beforeBatch = fetchCalls;
    const batchRes = await svc.translateBatchTitles({
      engine: 'openai',
      targetLang: 'zh-CN',
      items: ['Fix routing bug', 'Optimize cache layer'],
    });
    assert.equal(batchRes.ok, true);
    assert.equal(fetchCalls - beforeBatch, 1, 'Batch titles must combine into 1 LLM call');
    assert.equal(batchRes.data.results[0].translated, '修复路由');
    assert.equal(batchRes.data.results[1].translated, '优化缓存');

    // 48k long thought chunking succeeds (previously rejected at >12k)
    const longThought = ('Checking edge cases for large context windows.\n\n').repeat(320); // ~15,000 chars
    const longRes = await svc.translate({ engine: 'openai', text: longThought, targetLang: 'zh-CN' });
    assert.equal(longRes.ok, true);
    assert.ok(longRes.data.translated.length > 0);

    // Google GTX 429 fails over to Bing route
    let seenBing = false;
    const mtSvc = new TranslatorService({
      explicitPath: path.join(tmp, 'mt-sec.json'),
      cachePath: false,
      fetchFn: async (url) => {
        if (String(url).includes('googleapis.com')) {
          return { ok: false, status: 429, headers: new Map(), text: async () => 'Rate limited' };
        }
        if (String(url).includes('edge.microsoft.com')) {
          return { ok: true, status: 200, headers: new Map(), text: async () => 'mock-edge-jwt' };
        }
        if (String(url).includes('cognitive.microsofttranslator.com')) {
          seenBing = true;
          return { ok: true, status: 200, headers: new Map(), text: async () => JSON.stringify([{ translations: [{ text: '运行 __SAGC0__' }] }]) };
        }
        return { ok: false, status: 500, headers: new Map(), text: async () => '' };
      },
    });
    const failoverRes = await mtSvc.translate({ engine: 'mt', text: 'Run `npm test`', targetLang: 'zh-CN' });
    assert.equal(failoverRes.ok, true);
    assert.equal(seenBing, true);
    assert.equal(failoverRes.data.translated, '运行 `npm test`');
  });
});

test('2. v1.5 ThoughtTranslator renderer: isAlreadyTargetLang skip, batch title filtering, SSE chunk rendering & error classification', async () => {
  assert.equal(thoughtMod.isAlreadyTargetLang('正在分析这段架构代码并验证边界条件。', 'zh-CN'), true);
  assert.equal(thoughtMod.isAlreadyTargetLang('Analyzing `foo/bar.js` and verifying edge cases.', 'zh-CN'), false);
  assert.equal(thoughtMod.isSkippableTitleText('2m ago', 'zh-CN'), true);
  assert.equal(thoughtMod.isSkippableTitleText('/Users/dev/project/src/index.js', 'zh-CN'), true);
  assert.equal(thoughtMod.isSkippableTitleText('修复路由问题', 'zh-CN'), true);
  assert.equal(thoughtMod.isSkippableTitleText('Fix routing bug', 'zh-CN'), false);

  const { doc, win, makeEl } = createMiniDom();
  const rowZh = makeEl('div');
  rowZh.setAttribute('data-testid', 'conversation-row-sidebar');
  rowZh.textContent = '已经中文的标题';
  const rowTime = makeEl('div');
  rowTime.setAttribute('data-testid', 'conversation-row-sidebar');
  rowTime.textContent = '3h ago';
  const rowEn = makeEl('div');
  rowEn.setAttribute('data-testid', 'conversation-row-sidebar');
  rowEn.textContent = 'Refactor storage doctor';
  doc.body.appendChild(rowZh);
  doc.body.appendChild(rowTime);
  doc.body.appendChild(rowEn);

  const batchCalls = [];
  const ctrl = thoughtMod.createThoughtTranslatorController({
    win,
    doc,
    coexist,
    enabled: true,
    engine: 'openai',
    targetLang: 'zh-CN',
    triggerMode: 'auto',
    translateTitles: true,
    autoObserve: false,
    onRequestBatchTitles: async (req) => {
      batchCalls.push(req.items);
      return { ok: true, data: { results: req.items.map((it) => ({ id: it.id, translated: '重构存储体检' })) } };
    },
  });
  ctrl.scanNow();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(batchCalls.length, 1);
  assert.deepEqual(batchCalls[0].map((it) => it.text), ['Refactor storage doctor']);
  assert.equal(rowEn.textContent, '重构存储体检');
  assert.equal(rowZh.textContent, '已经中文的标题');
  assert.equal(rowTime.textContent, '3h ago');
  ctrl.destroy();
});

test('3. v1.5 Host i18n 10-language parity (534 core + 45 patterns), 6 attrs, punctuation/shortcut assembly, step guard, React conflict fuse & Swarm whitelist', () => {
  const zh = hostI18nPacks.getPack('zh-CN');
  assert.ok(Object.keys(zh.exact).length >= 534, `Expected >=534 core terms, got ${Object.keys(zh.exact).length}`);
  assert.equal(zh.exact['Explored files'], '已浏览文件');
  assert.equal(zh.exact['Swarm views'], '蜂群视图');

  const { doc, win, makeEl } = createMiniDom();
  const btn = makeEl('button');
  btn.textContent = 'Search ⌘K';
  btn.setAttribute('data-tooltip', 'Settings:');
  const step = makeEl('span');
  step.textContent = 'Explored 3 files, ran 2 commands and edited 1 file';
  const cmd = makeEl('span');
  cmd.textContent = 'git status --short';
  const row = makeEl('div');
  row.setAttribute('data-testid', 'conversation-row-sidebar');
  row.textContent = 'Settings';
  const rowBtn = makeEl('button');
  rowBtn.setAttribute('aria-label', 'Archive conversation');
  row.appendChild(rowBtn);
  doc.body.appendChild(btn);
  doc.body.appendChild(step);
  doc.body.appendChild(cmd);
  doc.body.appendChild(row);

  const i18nCtrl = hostI18nMod.createHostI18nController({ win, doc, coexist, enabled: true, locale: 'zh-CN', autoObserve: false });
  i18nCtrl.scanNow();
  assert.equal(btn.textContent, '搜索 ⌘K', 'Shortcut suffix assembly should translate prefix cleanly');
  assert.equal(btn.getAttribute('data-tooltip'), '设置:', 'data-tooltip + trailing punctuation assembly');
  assert.ok(step.textContent.includes('3') && step.textContent.includes('2') && step.textContent.includes('1'), `Composite step pattern failed: ${step.textContent}`);
  assert.equal(cmd.textContent, 'git status --short', 'CLI command must never be mistranslated');
  assert.equal(rowBtn.getAttribute('aria-label'), '归档对话', 'Sidebar row action button aria-label must still translate');
  assert.equal(row.childNodes[0].nodeValue, 'Settings', 'Sidebar row conversation title text must not be mistranslated by static UI pack');
  i18nCtrl.destroy();

  // Swarm whitelist allows ONLY exact swarm_board plugin target while keeping isAntigravityHostTarget strictly closed
  const swarmTarget = { id: 'sw1', type: 'iframe', url: 'plugin://swarm--swarm_board-abc/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/sw1' };
  const otherPlugin = { id: 'p2', type: 'iframe', url: 'plugin://other-ext/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/p2' };
  assert.equal(isAntigravityHostTarget(swarmTarget), false, 'isAntigravityHostTarget must continue rejecting plugin://');
  assert.equal(isAntigravitySwarmTarget(swarmTarget), true);
  assert.equal(isAntigravitySwarmTarget(otherPlugin), false);
  assert.equal(selectSwarmTargets([swarmTarget, otherPlugin]).length, 1);
});

test('4. v1.5 ThemeStudio surface polish + chatFont + completed glow & ReadingNav chapter badges + Omni plain-link extractor', () => {
  const { doc, win, makeEl } = createMiniDom();
  const ts = themeStudioMod.createThemeStudioController({
    win,
    doc,
    coexist,
    enabled: true,
    preset: 'obsidian-prism',
    surface: 'glass',
    chatFont: 'pingfang',
    ambientGlow: 'subtle',
  });
  ts.setConvState('completed');
  const css = doc.getElementById('ag-sag-theme-css')?.textContent || '';
  assert.equal(css.includes(':has('), false);
  assert.equal(css.includes('content-visibility'), false);
  assert.ok(css.includes('[data-testid="titlebar"]') && css.includes('.monaco-editor') && css.includes('.xterm'));
  assert.ok(css.includes('inset 2.5px 0 0'), 'Active sidebar row pill indicator must be styled');
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme-chat-font'), 'pingfang');
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-conv-state'), 'completed');
  ts.destroy();
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme-chat-font'), null);

  // ReadingNav Omni plain link/path extractor (pure, zero innerHTML, filters javascript: and slash cmds)
  const extracted = readingNavMod.extractPlainLinksAndPaths(
    'Open https://example.com/docs or http://localhost:3000/api and inspect /Users/dev/app/index.js (not /compact or javascript:alert(1)).'
  );
  assert.ok(extracted.some((x) => x.type === 'url' && x.value === 'https://example.com/docs'));
  assert.ok(extracted.some((x) => x.type === 'url' && x.value === 'http://localhost:3000/api'));
  assert.ok(extracted.some((x) => x.type === 'path' && x.value === '/Users/dev/app/index.js'));
  assert.equal(extracted.some((x) => /javascript:|\/compact/.test(x.value)), false);

  // Chapter badges appear on >= 15 turns
  const conv = makeEl('div');
  conv.setAttribute('data-testid', 'conversation-view');
  for (let i = 0; i < 22; i += 1) {
    const u = makeEl('div');
    u.setAttribute('data-testid', 'user-message-bubble');
    u.textContent = `Turn ${i + 1}`;
    conv.appendChild(u);
  }
  doc.body.appendChild(conv);
  const rn = readingNavMod.createReadingNavController({ win, doc, coexist, enabled: true, autoObserve: false });
  rn.sync();
  const chapters = doc.querySelectorAll('[data-ag-sag-rnav-chapter]');
  assert.ok(chapters.length >= 2, `Expected >=2 chapter markers for 22 turns, got ${chapters.length}`);
  rn.destroy();
});

test('5. v1.5 Read-only local telemetry snapshot (local-disk / nov-xray fallback), StatusPill source badge & WatchDaemon bridge', async () => {
  await withTempDirAsync(async (tmp) => {
    const dataDir = path.join(tmp, 'ag-data');
    const novDir = path.join(tmp, 'nov-data');
    fs.mkdirSync(path.join(dataDir, 'brain', 'sess-live'), { recursive: true });
    fs.mkdirSync(path.join(novDir, 'xray'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'brain', 'sess-live', 'transcript.jsonl'), '{"step":1}\n{"step":2}\n{"step":3}\n');
    fs.writeFileSync(path.join(novDir, 'xray', 'summary.json'), JSON.stringify({ usedTokens: 128000, maxTokens: 512000, cacheHitRate: 0.72 }));

    const snap = readLocalTelemetrySnapshot({ dataDir, cascadeId: 'sess-live', novDataDir: novDir });
    assert.equal(snap.ok, true);
    assert.equal(snap.dataSource, 'nov-xray');
    assert.equal(snap.novXray.usedTokens, 128000);
    assert.ok(snap.active5hSessions >= 1);

    // Context source uses injected local telemetry instead of DOM estimate
    const CID = '11111111-2222-4333-8444-555555555555';
    fs.mkdirSync(path.join(dataDir, 'brain', CID), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'brain', CID, 'transcript.jsonl'), '{"step":1}\n{"step":2}\n');
    const snapCid = readLocalTelemetrySnapshot({ dataDir, cascadeId: CID, novDataDir: novDir });
    ctxSrc.setLocalTelemetrySnapshot(snapCid);
    const { doc, win, makeEl } = createMiniDom();
    const conv = makeEl('div');
    conv.setAttribute('data-testid', 'conversation-view');
    conv.setAttribute('data-cascade-id', CID);
    const bubble = makeEl('div');
    bubble.setAttribute('data-testid', 'user-message-bubble');
    bubble.textContent = 'Check telemetry source';
    conv.appendChild(bubble);
    doc.body.appendChild(conv);
    const read = await ctxSrc.readContextSnapshot({ doc, win });
    assert.equal(read.source, 'nov-xray');
    assert.equal(read.usedTokens, 128000);
    assert.equal(statusPillMod.formatDataSourceLabel('nov-xray'), 'NOV X-Ray');
    assert.equal(statusPillMod.formatDataSourceLabel('local-disk'), 'Local Disk');
    ctxSrc.setLocalTelemetrySnapshot(null);

    // WatchDaemon handles sag:telemetry_snapshot bridge request
    const daemon = new SagWatchDaemon({
      port: 9222,
      enableHostBridge: false,
      storageDataDir: dataDir,
      novBridgeOpts: { dataDir: novDir },
    });
    const bridgeRes = await daemon._handleHostBridgePayload(
      JSON.stringify({ reqId: 'r-tel-1', type: 'sag:telemetry_snapshot', payload: { cascadeId: 'sess-live' } }),
      { targetId: 't1' }
    );
    assert.equal(bridgeRes.ok, true);
    assert.equal(bridgeRes.data.dataSource, 'nov-xray');
  });
});

test('6. v1.5 LaunchAgent plist generator & Prism zero-leak migration (dryRun, forbidden dir guard, apply -> TranslatorService load)', async () => {
  const plist = buildLaunchAgentPlist({ nodePath: '/usr/local/bin/node', cliPath: '/Users/a&b/agy-Sag/cli/sag-cli.mjs' });
  assert.ok(plist.includes('<string>local.agy-sag-keepalive</string>'));
  assert.ok(plist.includes('/Users/a&amp;b/agy-Sag/cli/sag-cli.mjs'), 'XML special characters must be escaped');

  await withTempDirAsync(async (tmp) => {
    const prismPluginDir = path.join(tmp, 'plugins', 'obsidian-prism');
    const prismConfigDir = path.join(tmp, 'gemini-config');
    const sagConfigDir = path.join(tmp, 'sag-config');
    fs.mkdirSync(prismPluginDir, { recursive: true });
    fs.mkdirSync(prismConfigDir, { recursive: true });

    const origPrismCfg = JSON.stringify({
      language: 'zh-CN',
      hostLocalization: 'on',
      palette: 'obsidian',
      lightPreset: 'alabaster',
      accentTone: 'follow',
      cornerStyle: 'balanced',
      smoothCaret: true,
      thoughtTranslate: 'ai',
      thoughtView: 'bilingual',
    });
    const origThoughtCfg = JSON.stringify({
      stylePreset: 'technical',
      viewMode: 'bilingual',
      proxyMode: 'auto',
      translateTitles: true,
      activeProfileId: 'prof_google',
      profiles: [
        { id: 'prof_google', name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-4-hydrogen', apiKey: 'AIzaSyMigrateTestKey99999' },
      ],
    });
    fs.writeFileSync(path.join(prismPluginDir, 'config.json'), origPrismCfg);
    fs.writeFileSync(path.join(prismConfigDir, 'obsidian-prism-thought.json'), origThoughtCfg);

    // Inspect is strictly read-only and never leaks plaintext API key
    const inspected = inspectPrismMigration({ prismPluginDir, prismConfigDir, sagConfigDir, homeDir: tmp });
    assert.equal(inspected.sources.prismConfigFound, true);
    assert.equal(inspected.sources.thoughtConfigFound, true);
    assert.equal(inspected.suggestedConfig.hostI18nLocale, 'zh-CN');
    assert.equal(inspected.suggestedConfig.themePreset, 'obsidian-prism');
    assert.equal(inspected.suggestedConfig.modules.thoughtTranslate, true);
    assert.equal(inspected.thoughtProfiles[0].active, true);
    assert.equal(inspected.thoughtProfiles[0].hasApiKey, true);
    assert.equal(JSON.stringify(inspected).includes('AIzaSyMigrateTestKey'), false);

    // Refuse writing secrets into ~/.gemini/antigravity/
    assert.throws(
      () =>
        applyPrismMigration({
          prismPluginDir,
          prismConfigDir,
          sagConfigDir,
          sagSecretsPath: path.join(tmp, '.gemini', 'antigravity', 'bad-secrets.json'),
          dryRun: false,
          homeDir: tmp,
        }),
      /Security violation/i
    );

    // Apply writes 0600 config & TranslatorService-compatible translator-secrets.json without touching Prism files
    const applied = applyPrismMigration({ prismPluginDir, prismConfigDir, sagConfigDir, dryRun: false, homeDir: tmp });
    assert.equal(applied.written, true);
    assert.equal(applied.secretsWritten, true);
    assert.equal(fs.readFileSync(path.join(prismPluginDir, 'config.json'), 'utf8'), origPrismCfg);
    assert.equal(fs.readFileSync(path.join(prismConfigDir, 'obsidian-prism-thought.json'), 'utf8'), origThoughtCfg);

    // TranslatorService loads migrated translator-secrets.json seamlessly
    const loadedSvc = new TranslatorService({ explicitPath: applied.secretsPath, cachePath: false });
    const status = loadedSvc.getStatus();
    assert.equal(status.providers.openai.hasKey, true);
    assert.equal(status.providers.openai.model, 'gemini-4-hydrogen');
    assert.equal(status.activeProfileId, 'prof_google');
  });
});

test('7. v1.5 Security audit hardening: hanging proxy stream timeout, proxy credential masking, trailing-dot SSRF, no MT fallback for private LLM, migration secret preservation & deep-freeze bundle', async () => {
  // 7a. Trailing-dot FQDN metadata SSRF must be blocked on both endpoint & proxy URLs
  assert.equal(validateEndpointUrl('https://metadata.google.internal./v1').ok, false);
  assert.equal(validateProxyUrl('http://metadata.google.internal.:80').ok, false);
  assert.equal(validateProxyUrl('http://user:%ZZ@127.0.0.1:8080').ok, false);

  // 7b. Custom proxy mode must still bypass loopback endpoints (e.g., local Ollama)
  assert.equal(
    resolveProxyForUrl('http://127.0.0.1:11434/api/chat', {
      proxyMode: 'custom',
      customProxyUrl: 'http://proxy.corp:8080',
      env: {},
    }),
    null
  );

  // 7c. Proxy credentials must be masked in getStatus() and maskProxyUrl()
  assert.equal(maskProxyUrl('http://alice:TOPSECRET99@proxy.corp.local:8080'), 'http://***@proxy.corp.local:8080');
  await withTempDirAsync(async (tmp) => {
    const secPath = path.join(tmp, 'proxy-sec.json');
    const svc = new TranslatorService({ explicitPath: secPath, cachePath: false });
    svc.saveConfig({ proxyMode: 'custom', customProxyUrl: 'http://alice:TOPSECRET99@proxy.corp.local:8080' });
    const statusJson = JSON.stringify(svc.getStatus());
    assert.equal(statusJson.includes('TOPSECRET99'), false, 'Proxy password must never leak to renderer status');
    assert.equal(statusJson.includes('http://***@proxy.corp.local:8080'), true);

    // 7d. Private/local Ollama batch title failure must NOT silently exfiltrate text to public MT
    let externalCalled = false;
    const privSvc = new TranslatorService({
      explicitPath: path.join(tmp, 'priv-sec.json'),
      cachePath: false,
      fetchFn: async (url) => {
        if (!String(url).includes('127.0.0.1')) externalCalled = true;
        return { ok: false, status: 500, headers: new Map(), text: async () => 'Ollama down' };
      },
    });
    const privRes = await privSvc.translateBatchTitles({
      engine: 'ollama',
      targetLang: 'zh-CN',
      items: ['Internal confidential roadmap'],
    });
    assert.equal(externalCalled, false, 'Private Ollama failure must never fall back to public MT');
    assert.equal(privRes.ok, false, 'Failed private Ollama batch must return ok:false rather than leaking to MT');
    assert.match(String(privRes.error || ''), /500|Ollama down/i);

    // 7e. applyPrismMigration preserves existing non-OpenAI provider secrets & blocks sagConfigDir inside ~/.gemini/antigravity
    const prismPluginDir = path.join(tmp, 'plugins', 'obsidian-prism');
    const prismConfigDir = path.join(tmp, 'gemini-config');
    const sagConfigDir = path.join(tmp, 'sag-config');
    fs.mkdirSync(prismPluginDir, { recursive: true });
    fs.mkdirSync(prismConfigDir, { recursive: true });
    fs.mkdirSync(sagConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(prismConfigDir, 'obsidian-prism-thought.json'),
      JSON.stringify({
        activeProfileId: 'g1',
        profiles: [{ id: 'g1', name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-4-hydrogen', apiKey: 'AIzaSyNew123456' }],
      })
    );
    const existingSecPath = path.join(sagConfigDir, 'translator-secrets.json');
    fs.writeFileSync(
      existingSecPath,
      JSON.stringify({
        version: 1,
        providers: { anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-haiku-latest', apiKey: 'sk-ant-keep-me-12345' } },
        profiles: [{ id: 'existing-p', name: 'Existing', engine: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-keep' }],
      })
    );
    assert.throws(
      () =>
        applyPrismMigration({
          prismPluginDir,
          prismConfigDir,
          sagConfigDir: path.join(tmp, '.gemini', 'antigravity', 'bad-cfg'),
          sagSecretsPath: existingSecPath,
          dryRun: false,
          homeDir: tmp,
        }),
      /Security violation/i
    );
    applyPrismMigration({ prismPluginDir, prismConfigDir, sagConfigDir, dryRun: false, homeDir: tmp });
    const merged = JSON.parse(fs.readFileSync(existingSecPath, 'utf8'));
    assert.equal(merged.providers.anthropic.apiKey, 'sk-ant-keep-me-12345', 'Existing non-OpenAI secrets must be preserved');
    assert.ok(merged.profiles.some((p) => p.id === 'existing-p'), 'Existing non-colliding profiles must be preserved');
  });

  // 7f. Hanging HTTP proxy stream must abort on timeout after headers arrive (no permanent socket/slot deadlock)
  const sockets = new Set();
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n');
    // Intentionally hang without ending response
  });
  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const t0 = Date.now();
    const resp = await requestViaHttpProxy(`http://127.0.0.1:${port}/stream`, { method: 'GET' }, {
      proxyUrl: `http://127.0.0.1:${port}`,
      timeoutMs: 120,
      allowPrivateHttp: true,
    });
    const reader = resp.body.getReader();
    const first = await reader.read();
    assert.equal(first.done, false);
    await assert.rejects(() => reader.read(), /timed out|aborted|closed/i);
    assert.ok(Date.now() - t0 < 1000, 'Hanging proxy stream must reject promptly on timeout');
  } finally {
    for (const s of sockets) s.destroy();
    await new Promise((resolve) => server.close(resolve));
  }

  // 7g. Bundled frozen objects preserve nested Object.isFrozen invariant
  const expr = buildInjectExpression(null, { deferExtPack: true });
  const makeStubEl = () => ({
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    appendChild() {},
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  const sb = {
    document: {
      documentElement: makeStubEl(),
      head: makeStubEl(),
      body: makeStubEl(),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => makeStubEl(),
      addEventListener() {},
      removeEventListener() {},
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Event,
    navigator: { language: 'en-US' },
    addEventListener() {},
    removeEventListener() {},
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.runInNewContext(expr, sb, { timeout: 3000 });
  assert.equal(Object.isFrozen(sb.__agSgCoexist.PRESETS.essential.modules), true, 'Nested frozen config objects must remain frozen after bundle unpack');
  sb.__agSag?.destroy?.();
});

test('8. v1.5 Migrated local config auto-loading: whitelist filtering, symlink rejection & preset merge preservation', async () => {
  await withTempDirAsync(async (tmp) => {
    const cfgPath = path.join(tmp, 'config.json');
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({
        version: 1,
        migratedFrom: 'obsidian-prism',
        apiKey: 'sk-should-be-dropped',
        themeCustomCss: 'body { display: none; }',
        hostI18nLocale: 'zh-CN',
        themePreset: 'obsidian-prism',
        themeSmoothCaret: true,
        thoughtEngine: 'openai',
        thoughtViewMode: 'bilingual',
        thoughtTranslateTitles: true,
        thoughtStylePreset: 'technical',
        modules: {
          hostI18n: true,
          themeStudio: true,
          thoughtTranslate: true,
          unknownModule: true,
        },
      })
    );

    const loaded = readLocalSagConfig({ explicitPath: cfgPath });
    assert.ok(loaded);
    assert.equal(loaded.apiKey, undefined, 'Non-whitelisted keys must be stripped');
    assert.equal(loaded.themeCustomCss, undefined, 'themeCustomCss must not be auto-loaded from migrated config');
    assert.equal(loaded.themePreset, 'obsidian-prism');
    assert.equal(loaded.thoughtEngine, 'openai');
    assert.equal(loaded.modules.thoughtTranslate, true);
    assert.equal(loaded.modules.unknownModule, undefined);

    const powerPatch = buildConfigPatchFromOpts({ preset: 'power' });
    const merged = mergeMigratedConfigPatch(powerPatch, loaded);
    assert.equal(merged.hostI18nLocale, 'zh-CN');
    assert.equal(merged.themePreset, 'obsidian-prism');
    assert.equal(merged.thoughtEngine, 'openai');
    assert.equal(merged.modules.thoughtTranslate, true, 'Migrated thoughtTranslate=true must survive --preset=power');
    assert.equal(merged.modules.promptLibrary, true, 'Preset modules must still apply');

    const langOverride = mergeMigratedConfigPatch(buildConfigPatchFromOpts({ preset: 'power', lang: 'ja' }), loaded);
    assert.equal(langOverride.hostI18nLocale, 'ja', 'Explicit CLI --lang must override migrated locale');

    if (process.platform !== 'win32') {
      const symPath = path.join(tmp, 'sym-config.json');
      fs.symlinkSync(cfgPath, symPath);
      assert.equal(readLocalSagConfig({ explicitPath: symPath }), null, 'Symlink config must be rejected fail-closed');
    }
  });

  // StatusPill popover footer must wrap cleanly instead of clipping leftmost action buttons
  const stylesMod = require('../packages/core/styles.js');
  assert.match(stylesMod.CORE_CSS, /\.ag-sg-card-foot\{[^}]*flex-wrap:\s*wrap/i);
  assert.match(stylesMod.CORE_CSS, /\.ag-sg-status-card\{[^}]*width:min\(316px/i);
  assert.match(stylesMod.CORE_CSS, /\.ag-sag-qrow\{/i);
});

test('9. v1.5 Official local LS RetrieveUserQuotaSummary (real 5h & weekly remaining %, 60s cache, Prism-style card, no fake turns & no card Export)', async () => {
  const nowMs = Date.parse('2026-11-28T15:00:00Z');
  const sampleRaw = {
    response: {
      groups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.2865, resetTime: '2026-12-03T06:00:00Z' },
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.9662, resetTime: '2026-11-28T19:55:00Z' },
          ],
        },
        {
          displayName: 'Claude and GPT models',
          buckets: [
            { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 0.2916, resetTime: '2026-11-30T15:00:00Z' },
            { bucketId: '3p-5h', window: '5h', remainingFraction: 1 },
          ],
        },
      ],
    },
  };

  // 9a. Normalization & loopback-only guard
  const norm = normalizeLocalQuotaSummary(sampleRaw, nowMs);
  assert.equal(norm.available, true);
  assert.equal(norm.groups.length, 2);
  assert.equal(norm.groups[0].id, 'gemini');
  assert.equal(norm.groups[0].fiveHour.remainingPct, 97);
  assert.equal(norm.groups[0].weekly.remainingPct, 29);
  assert.equal(norm.groups[1].id, 'claude');
  assert.equal(norm.groups[1].fiveHour.remainingPct, 100);

  const blockedRemote = await fetchLocalQuotaSummary({
    lsAddress: 'evil.example.com:5387',
    csrfToken: 'tok',
    fetchFn: async () => { throw new Error('must not fetch remote'); },
  });
  assert.equal(blockedRemote.available, false);
  assert.equal(blockedRemote.reason, 'non-loopback');

  // 9b. WatchDaemon sag:quota_summary 60s cache
  let calls = 0;
  let clock = nowMs;
  const daemon = new SagWatchDaemon({
    port: 9222,
    enableHostBridge: false,
    now: () => clock,
    fetchQuotaSummary: async () => {
      calls += 1;
      return norm;
    },
  });
  const r1 = await daemon._handleHostBridgePayload(JSON.stringify({ reqId: 'q1', type: 'sag:quota_summary', payload: {} }));
  const r2 = await daemon._handleHostBridgePayload(JSON.stringify({ reqId: 'q2', type: 'sag:quota_summary', payload: {} }));
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(calls, 1, '60s cache must deduplicate quota summary calls');
  assert.equal(r1.data.groups[0].fiveHour.remainingPct, 97);

  // 9c. StatusPill card renders real remaining 5h & weekly % with group switcher, zero turn counts, and zero Export button
  const { doc, win, makeEl } = createMiniDom();
  const footer = makeEl('div');
  footer.className = 'agy-composer-footer';
  doc.body.appendChild(footer);
  const sp = statusPillMod.createStatusPillController({
    win,
    doc,
    coexist,
    getLang: () => 'zh-CN',
    getConfig: () => ({
      ...coexist.DEFAULT_CONFIG,
      modules: { ...coexist.DEFAULT_CONFIG.modules, quotaPulse: true },
    }),
    onCompactNow: () => {},
    onCleanRestart: () => {},
    onOpenSettings: () => {},
  });
  try {
    sp.sync({
      snap: { usedPct: 12, usedTokens: 61440, maxTokens: 512000 },
      quotaSummary: norm,
    });
    sp.open();
    const card = doc.querySelector('[data-testid="ag-sg-status-card"]');
    assert.ok(card && !card.hidden);
    assert.ok(card.textContent.includes('97%'), 'Must display real 5h remaining 97%');
    assert.ok(card.textContent.includes('29%'), 'Must display real weekly remaining 29%');
    assert.ok(card.textContent.includes('4h55m'), 'Must display 5h reset countdown');
    assert.equal(card.textContent.includes('/60'), false, 'Must never display fake turn counts');
    assert.equal(card.querySelector('[data-ag-sg-card-act="export-md"]'), null, 'Card footer must not contain low-frequency Export');
    const claudeTab = card.querySelector('[data-ag-sag-qgroup="claude"]');
    assert.ok(claudeTab, 'Must render Claude / GPT group switch tab');
    claudeTab.click();
    assert.ok(card.textContent.includes('100%'), 'Switching to Claude / GPT tab must show 100% 5h remaining');
  } finally {
    sp.destroy();
  }
});
