import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  buildInjectExpression,
  compactCoreSource,
  computeCoreHash,
  inspectCoreLexState,
  readCoreSources,
} from '../cli/bundle.mjs';
import { SagWatchDaemon } from '../cli/watch-daemon.mjs';

const require = createRequire(import.meta.url);
const prismBridgeMod = require('../packages/core/prism-bridge.js');
const coexistMod = require('../packages/core/coexist.js');

test('Phase 8A: compactCoreSource preserves JS syntax across all core files, regexes & template literals and shrinks ru bundle significantly', () => {
  // Edge cases: regex containing /*, multiline template literal with // and indentation, JSDoc block comment
  const sample = [
    '  /* Leading block comment',
    '   * second line',
    '   */',
    '  // full line comment',
    '  const re = /\\/\\*foo\\*\\//g;',
    '  const tpl = `line1',
    '    // keep inside template',
    '    line3`;',
    '  return { re, tpl };',
  ].join('\n');
  const compacted = compactCoreSource(sample);
  assert.ok(!compacted.includes('Leading block comment'));
  assert.ok(!compacted.includes('full line comment'));
  assert.ok(compacted.includes('// keep inside template'), 'Must never strip lines inside template literals');
  assert.ok(compacted.includes('/\\/\\*foo\\*\\//g'), 'Must preserve regex containing /*');
  const fn = new Function(compacted);
  const res = fn();
  assert.equal(res.re.test('/*foo*/'), true);
  assert.ok(res.tpl.includes('    // keep inside template'));

  // Every CORE_FILE compiles cleanly after compaction and finishes in clean lexer state (no inTpl/inBlock drift)
  const parts = readCoreSources();
  for (const p of parts) {
    const st = inspectCoreLexState(p.code);
    assert.deepEqual(st, { mode: 'code', tplDepth: 0 }, `Clean EOF lexer state for ${p.file}`);
    assert.doesNotThrow(() => new Function(compactCoreSource(p.code)), `Syntax valid for ${p.file}`);
  }

  // Adversarial lexer cases (regex with odd backticks, block comment before template, nested templates, inline comment with backtick, operator spacing & calc CSS)
  const advCases = [
    { name: 'regex-odd-backtick', code: 'const r = /`[^`]+`/; const s = `\n  // keep-1\n`; return s;', expect: '// keep-1' },
    { name: 'leading-block-comment-tpl', code: '/* hdr */ const s = `\n  // keep-2\n`; return s;', expect: '// keep-2' },
    { name: 'nested-template', code: 'const a = 1; const s = `${a ? `x\n  // keep-3\n` : 1}`; return s;', expect: '// keep-3' },
    { name: 'inline-block-comment-backtick', code: 'const a = 1; /* ` */\nconst s = `\n  // keep-4\n`; return s;', expect: '// keep-4' },
    {
      name: 'operator-token-boundaries',
      code: 'const a = 2, b = 3; const r1 = a + +b; const r2 = a - -b; const r3 = true ? .5 : 1; const r4 = 1 .toString(); const r5 = returnRegex(); function returnRegex() { return /ok/.test("ok"); } const css = `width: calc(100% + 10px);`; return [r1, r2, r3, r4, r5, css].join("|");',
      expect: '5|5|0.5|1|true|width: calc(100% + 10px);',
    },
    {
      name: 'multiline-block-comment-asi',
      code: 'const a = 1 /*\n*/ const b = 2\nreturn String(a + b);',
      expect: '3',
    },
    {
      name: 'div-before-regex-with-quote',
      code: "const n = 10 / /'/.source.length; return String(n);",
      expect: '10',
    },
    {
      name: 'unicode-identifier-spacing',
      code: 'const 变量 = 4; return String(变量 + 1);',
      expect: '5',
    },
    {
      name: 'trailing-line-comment-eof',
      code: 'const x = 9; return String(x); // eof',
      expect: '9',
    },
  ];
  for (const c of advCases) {
    assert.deepEqual(inspectCoreLexState(c.code), { mode: 'code', tplDepth: 0 }, `EOF clean for ${c.name}`);
    const out = compactCoreSource(c.code);
    const val = new Function(out)();
    assert.ok(val.includes(c.expect), `Template content preserved for ${c.name}`);
  }

  // Sync ru bundle shrinks well below 1.55 MB (ample headroom below 1.58 MB gate & 1.6 MiB hard cap)
  const rawRu = Buffer.byteLength(buildInjectExpression({ hostI18nLocale: 'ru' }, { compact: false }), 'utf8');
  const compactRuExpr = buildInjectExpression({ hostI18nLocale: 'ru' });
  const compactRu = Buffer.byteLength(compactRuExpr, 'utf8');
  assert.ok(rawRu - compactRu > 160_000, `Expected >160 KB savings, got ${rawRu - compactRu}`);
  assert.ok(compactRu <= 1_550_000, `Compact sync ru bundle must stay <= 1.55 MB, got ${compactRu}`);
  assert.ok(compactRuExpr.includes('calc(100% + 10px)'), 'CSS calc() spacing must remain intact in compacted bundle');

  // Watch deferred ext-pack mode stays well under 960 KB
  const deferredRu = Buffer.byteLength(
    buildInjectExpression({ hostI18nLocale: 'ru' }, { deferExtPack: true }),
    'utf8'
  );
  assert.ok(deferredRu < 960_000, `Deferred Watch bundle must stay < 960 KB, got ${deferredRu}`);
  assert.ok(!buildInjectExpression({ hostI18nLocale: 'ru' }, { deferExtPack: true }).includes('window.__agSagExtPacks["ru"]'));

  // computeCoreHash matches buildInjectExpression targetHash
  const hash = computeCoreHash();
  const expr = buildInjectExpression({ hostI18nLocale: 'en' });
  assert.ok(expr.includes(`const targetHash = ${JSON.stringify(hash)};`));
});

test('Phase 8B: SagWatchDaemon sag:storage_audit is strictly read-only, detects WAL/orphans, and hides host absolute path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sag-st-audit-'));
  try {
    const missingDir = path.join(tmpDir, 'does-not-exist');
    const daemonMissing = new SagWatchDaemon({ storageDataDir: missingDir, enableHostBridge: false });
    const resMissing = daemonMissing._handleHostBridgePayload(
      JSON.stringify({ reqId: 'st-1', type: 'sag:storage_audit', payload: {} })
    );
    assert.equal(resMissing.ok, true);
    assert.equal(resMissing.data.exists, false);
    assert.equal(fs.existsSync(missingDir), false, 'Must never create missing storage dir');

    // Populate mock antigravity dir with brain, conversations, orphan, and active WAL
    const dataDir = path.join(tmpDir, 'antigravity');
    fs.mkdirSync(path.join(dataDir, 'brain', 'sess-1'), { recursive: true });
    fs.mkdirSync(path.join(dataDir, 'brain', 'empty-orphan'), { recursive: true });
    fs.mkdirSync(path.join(dataDir, 'conversations'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'brain', 'sess-1', 'transcript.jsonl'), '{"ok":true}\n', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'conversations', 'sess-1.pb'), 'pbdata', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'state.vscdb'), 'sqlite', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'state.vscdb-wal'), 'walbytes', 'utf8');

    const daemon = new SagWatchDaemon({ storageDataDir: dataDir, enableHostBridge: false });
    const res = daemon._handleHostBridgePayload(
      JSON.stringify({ reqId: 'st-2', type: 'sag:storage_audit', payload: {} })
    );
    assert.equal(res.ok, true);
    assert.equal(res.data.exists, true);
    assert.equal(res.data.brainSessionCount, 2);
    assert.equal(res.data.conversationCount, 1);
    assert.equal(res.data.walActive, true);
    assert.equal(res.data.orphanCount, 1);
    assert.equal(JSON.stringify(res.data).includes(tmpDir), false, 'Must not leak absolute host path');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 8B: Settings Advanced tab renders storage audit card and updates summary on click', async () => {
  const makeEl = (tag) => {
    const attrs = new Map();
    const cls = new Set();
    const ls = new Map();
    const el = {
      tagName: String(tag).toUpperCase(),
      nodeType: 1,
      type: '',
      value: '',
      hidden: false,
      disabled: false,
      style: {},
      children: [],
      parentElement: null,
      parentNode: null,
      get isConnected() { return true; },
      get firstChild() { return el.children[0] || null; },
      get className() { return [...cls].join(' '); },
      set className(v) { cls.clear(); String(v || '').split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); },
      classList: { add: (...a) => a.forEach((c) => c && cls.add(c)), remove: (...a) => a.forEach((c) => cls.delete(c)), contains: (c) => cls.has(c) },
      _text: '',
      get textContent() { return el.children.length ? el._text + el.children.map((c) => c.textContent).join('') : el._text; },
      set textContent(v) { el._text = String(v ?? ''); el.children.length = 0; },
      setAttribute(k, v) { attrs.set(k, String(v)); if (k === 'class') el.className = String(v); },
      getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
      hasAttribute(k) { return attrs.has(k); },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(c) { if (c.parentElement) c.remove(); c.parentElement = el; c.parentNode = el; el.children.push(c); return c; },
      insertBefore(c, ref) { if (!ref) return el.appendChild(c); const i = el.children.indexOf(ref); c.parentElement = el; c.parentNode = el; el.children.splice(i < 0 ? el.children.length : i, 0, c); return c; },
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentElement = null; c.parentNode = null; return c; },
      remove() { el.parentElement?.removeChild(el); },
      addEventListener(ev, fn) { if (!ls.has(ev)) ls.set(ev, []); ls.get(ev).push(fn); },
      removeEventListener(ev, fn) { const a = ls.get(ev); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
      dispatchEvent(ev) { const e = typeof ev === 'string' ? { type: ev } : ev; for (const fn of [...(ls.get(e.type) || [])]) fn(e); return true; },
      click() { el.dispatchEvent({ type: 'click', target: el, preventDefault() {}, stopPropagation() {} }); },
      focus() {},
      querySelectorAll(sel) {
        const out = [];
        const walk = (n) => {
          for (const c of n.children) {
            const mTest = sel.match(/\[data-testid="([^"]+)"\]/);
            const mSub = sel.match(/\[data-ag-sag-subtab="([^"]+)"\]/);
            if (mTest && c.getAttribute('data-testid') === mTest[1]) out.push(c);
            else if (mSub && c.getAttribute('data-ag-sag-subtab') === mSub[1]) out.push(c);
            walk(c);
          }
        };
        walk(el);
        return out;
      },
      querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
    };
    return el;
  };
  const doc = {
    documentElement: makeEl('html'),
    head: makeEl('head'),
    body: makeEl('body'),
    createElement: makeEl,
    getElementById: () => null,
    querySelector: (s) => doc.documentElement.querySelector(s),
    querySelectorAll: (s) => doc.documentElement.querySelectorAll(s),
    addEventListener() {},
    removeEventListener() {},
  };
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  let copied = '';
  const pb = prismBridgeMod.createPrismBridgeController({
    win: { document: doc, addEventListener() {}, removeEventListener() {} },
    doc,
    coexist: coexistMod,
    autoObserve: false,
    bindDrawerShortcut: false,
    getLang: () => 'en',
    getConfig: () => coexistMod.DEFAULT_CONFIG,
    onCopyText: (txt) => { copied = txt; },
    onRequestStorageAudit: async () => ({
      ok: true,
      data: {
        exists: true,
        totalBytes: 10 * 1024 * 1024,
        totalFiles: 88,
        brainSessionCount: 6,
        conversationCount: 9,
        walActive: false,
        orphanCount: 2,
      },
    }),
  });
  try {
    pb.openDrawer('advanced');
    const summaryBefore = doc.querySelector('[data-testid="ag-sag-storage-summary"]');
    assert.ok(summaryBefore);
    assert.equal(summaryBefore.textContent.includes('unavailable'), false);
    assert.ok(summaryBefore.textContent.includes('Audit Storage'));
    const auditBtn = doc.querySelector('[data-testid="ag-sag-storage-audit-btn"]');
    assert.ok(auditBtn, 'Audit button rendered in Advanced tab');
    auditBtn.click();
    await new Promise((r) => setTimeout(r, 15));
    const summary = doc.querySelector('[data-testid="ag-sag-storage-summary"]');
    assert.ok(summary.textContent.includes('10.0 MiB'));
    assert.ok(summary.textContent.includes('88 files'));
    assert.ok(summary.textContent.includes('6 sessions'));
    assert.ok(summary.textContent.includes('2 leftover'));

    doc.querySelector('[data-testid="ag-sag-storage-copy-cmd"]').click();
    assert.ok(copied.includes('storage backup'));
  } finally {
    pb.destroy();
  }
});
