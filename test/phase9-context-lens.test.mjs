import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ctxSrc = require('../packages/core/context-source.js');
const watchdogMod = require('../packages/core/session-watchdog.js');
const statusPillMod = require('../packages/core/status-pill.js');
const coexistMod = require('../packages/core/coexist.js');

function makeDomNode(tag) {
  const attrs = new Map();
  const cls = new Set();
  const ls = new Map();
  const el = {
    tagName: String(tag).toUpperCase(),
    nodeType: 1,
    hidden: false,
    style: {},
    children: [],
    parentElement: null,
    parentNode: null,
    scrolledIntoView: false,
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
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentElement = null; c.parentNode = null; return c; },
    remove() { el.parentElement?.removeChild(el); },
    addEventListener(ev, fn) { if (!ls.has(ev)) ls.set(ev, []); ls.get(ev).push(fn); },
    removeEventListener(ev, fn) { const a = ls.get(ev); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    dispatchEvent(ev) { const e = typeof ev === 'string' ? { type: ev } : ev; for (const fn of [...(ls.get(e.type) || [])]) fn(e); return true; },
    click() { el.dispatchEvent({ type: 'click', target: el, preventDefault() {}, stopPropagation() {} }); },
    scrollIntoView() { el.scrolledIntoView = true; },
    querySelectorAll(sel) {
      const out = [];
      const parts = sel.split(',').map((s) => s.trim());
      const match = (n) => parts.some((p) => {
        if (p === 'pre' && n.tagName === 'PRE') return true;
        if (p === 'details' && n.tagName === 'DETAILS') return true;
        if (p.startsWith('.') && n.classList.contains(p.slice(1))) return true;
        const mEq = p.match(/\[([a-zA-Z0-9-]+)="([^"]+)"\]/);
        if (mEq && n.getAttribute(mEq[1]) === mEq[2]) return true;
        const mSub = p.match(/\[([a-zA-Z0-9-]+)\*="([^"]+)"\]/);
        if (mSub && String(n.getAttribute(mSub[1]) || '').includes(mSub[2])) return true;
        return false;
      });
      const walk = (n) => {
        for (const c of n.children) {
          if (match(c)) out.push(c);
          walk(c);
        }
      };
      walk(el);
      return out;
    },
    querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
  };
  return el;
}

test('Phase 9: analyzeContextBreakdown splits user/assistant/codeTools accurately and ranks Top-3 heaviest turns', () => {
  const body = makeDomNode('body');
  const conv = makeDomNode('div');
  conv.setAttribute('data-testid', 'conversation-view');
  body.appendChild(conv);

  // Turn 1: short
  const u1 = makeDomNode('div');
  u1.setAttribute('data-testid', 'user-message-bubble');
  u1.textContent = 'Short question';
  const a1 = makeDomNode('div');
  a1.setAttribute('data-testid', 'planner-response-text');
  a1.textContent = 'Brief reply.';
  conv.appendChild(u1);
  conv.appendChild(a1);

  // Turn 2: heavy code block + assistant prose
  const u2 = makeDomNode('div');
  u2.setAttribute('data-testid', 'user-message-bubble');
  u2.textContent = 'Refactor the parser module cleanly';
  const a2 = makeDomNode('div');
  a2.setAttribute('data-testid', 'planner-response-text');
  const prose = makeDomNode('p');
  prose.textContent = 'Here is the updated implementation with full error handling.';
  const pre = makeDomNode('pre');
  pre.textContent = 'const x = 1;\n'.repeat(80);
  a2.appendChild(prose);
  a2.appendChild(pre);
  conv.appendChild(u2);
  conv.appendChild(a2);

  const doc = {
    body,
    querySelector: (s) => body.querySelector(s),
    querySelectorAll: (s) => body.querySelectorAll(s),
  };

  const bd = ctxSrc.analyzeContextBreakdown(doc);
  assert.ok(bd);
  assert.equal(bd.turnCount, 2);
  assert.equal(bd.shares.userPct + bd.shares.assistantPct + bd.shares.codeToolsPct, 100);
  assert.ok(bd.shares.codeToolsPct > 70, `Code block should dominate share, got ${bd.shares.codeToolsPct}%`);
  assert.equal(bd.topTurns[0].turnNum, 2, 'Turn 2 must rank heaviest');
  assert.equal(bd.topTurns[0].node, u2);
});

test('Phase 9: sessionWatchdog records lastTurnElapsedSec on stream completion & statusPill renders context lens, quota bar & export MD', () => {
  let t = 1000;
  const wd = watchdogMod.createSessionWatchdog({ now: () => t, enabled: true });
  wd.observe({ snap: { cascadeId: 'c1', usedPct: 30, streaming: true } });
  t += 14_000;
  wd.observe({ snap: { cascadeId: 'c1', usedPct: 35, streaming: true } });
  t += 2_000;
  const done = wd.observe({ snap: { cascadeId: 'c1', usedPct: 38, streaming: false } });
  assert.equal(done.lastTurnElapsedSec, 16);

  const doc = {
    documentElement: makeDomNode('html'),
    head: makeDomNode('head'),
    body: makeDomNode('body'),
    createElement: makeDomNode,
    getElementById: () => null,
    querySelector: (s) => doc.documentElement.querySelector(s),
    querySelectorAll: (s) => doc.documentElement.querySelectorAll(s),
    addEventListener() {},
    removeEventListener() {},
  };
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  const conv = makeDomNode('div');
  conv.setAttribute('data-testid', 'conversation-view');
  const u1 = makeDomNode('div');
  u1.setAttribute('data-testid', 'user-message-bubble');
  u1.textContent = 'Explain architecture';
  const a1 = makeDomNode('div');
  a1.setAttribute('data-testid', 'planner-response-text');
  const pre = makeDomNode('pre');
  pre.textContent = 'code line\n'.repeat(20);
  a1.appendChild(pre);
  conv.appendChild(u1);
  conv.appendChild(a1);
  doc.body.appendChild(conv);

  const footer = makeDomNode('div');
  footer.className = 'agy-composer-footer';
  doc.body.appendChild(footer);

  let exported = 0;
  const sp = statusPillMod.createStatusPillController({
    win: { document: doc, addEventListener() {}, removeEventListener() {} },
    doc,
    coexist: coexistMod,
    getLang: () => 'en',
    getConfig: () => ({
      ...coexistMod.DEFAULT_CONFIG,
      modules: { ...coexistMod.DEFAULT_CONFIG.modules, quotaPulse: true },
    }),
    onExportSession: () => { exported += 1; },
  });
  try {
    sp.sync({
      snap: { usedPct: 48, usedTokens: 96000, maxTokens: 200000 },
      watchdog: done,
      quota: { health: 'warm', localEstimate: { turns5h: 30 }, limits: { softTurns5h: 60 } },
    });
    sp.open();

    const lens = doc.querySelector('[data-testid="ag-sag-ctx-lens"]');
    assert.ok(lens, 'Context breakdown lens must render inside quick card');
    assert.ok(doc.querySelector('.ag-sg-card-meta').textContent.includes('16s'), 'Elapsed turn timing must display in card header');
    assert.ok(doc.querySelector('.ag-sag-quota-bar-fill'), 'Quota progress bar must render');

    const jumpBtn = doc.querySelector('[data-ag-sag-jump-turn="1"]');
    assert.ok(jumpBtn);
    jumpBtn.click();
    assert.equal(u1.scrolledIntoView, true, 'Clicking top turn chip must scroll bubble into view');

    sp.open();
    assert.equal(
      doc.querySelector('[data-ag-sg-card-act="export-md"]'),
      null,
      'Low-frequency Export MD must not clutter primary status card footer'
    );
  } finally {
    sp.destroy();
  }
});
