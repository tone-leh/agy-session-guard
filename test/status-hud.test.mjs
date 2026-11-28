import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const statusPill = require('../packages/core/status-pill.js');
const i18n = require('../packages/core/i18n.js');

const enStrings = i18n.getStrings('en');

function makeCfg(modOverrides = {}) {
  return {
    compactThreshold: 80,
    modules: {
      hostI18n: true,
      compactGuard: true,
      precompactExport: true,
      draftGuard: true,
      promptQueue: true,
      outlineBookmarks: false,
      sessionRadar: false,
      sessionWatchdog: true,
      safeAutoAccept: false,
      themeStudio: false,
      quotaPulse: false,
      ...modOverrides,
    },
  };
}

test('computeHudSegments returns ctx and eta when compactGuard & sessionWatchdog are enabled', () => {
  const segs = statusPill.computeHudSegments({
    cfg: makeCfg({ compactGuard: true, sessionWatchdog: true }),
    snap: { usedPct: 42, usedTokens: 210000, maxTokens: 500000 },
    watchdog: { estimatedTurnsLeft: 6, stalled: false, spikeDetected: false },
    strings: enStrings,
  });
  assert.deepEqual(segs.map((s) => s.id), ['ctx', 'eta']);
  assert.equal(segs[0].text, '42%');
  assert.equal(segs[0].pct, 42);
  assert.equal(segs[1].text, '≈6 turns');
});

test('computeHudSegments hides eta when sessionWatchdog module is disabled', () => {
  const segs = statusPill.computeHudSegments({
    cfg: makeCfg({ compactGuard: true, sessionWatchdog: false }),
    snap: { usedPct: 42, usedTokens: 210000, maxTokens: 500000 },
    watchdog: { estimatedTurnsLeft: 6, stalled: false },
    strings: enStrings,
  });
  assert.deepEqual(segs.map((s) => s.id), ['ctx']);
});

test('computeHudSegments falls back to brand when all modules are disabled and nov is disconnected', () => {
  const segs = statusPill.computeHudSegments({
    cfg: makeCfg({
      compactGuard: false,
      sessionWatchdog: false,
      quotaPulse: false,
      promptQueue: false,
      outlineBookmarks: false,
      safeAutoAccept: false,
    }),
    snap: { usedPct: 42 },
    watchdog: { estimatedTurnsLeft: 6 },
    quota: { health: 'warn', observed: { observedPct: 87 } },
    queue: { itemCount: 2, paused: false },
    bookmarkCount: 3,
    autoAccept: { enabled: true, paused: false },
    nov: { connected: false },
    strings: enStrings,
  });
  assert.deepEqual(segs.map((s) => s.id), ['brand']);
  assert.equal(segs[0].text, enStrings.brandShort);
});

test('computeHudSegments formats quota warning with observedPct and warn tone', () => {
  const segs = statusPill.computeHudSegments({
    cfg: makeCfg({ compactGuard: false, sessionWatchdog: false, quotaPulse: true }),
    quota: {
      health: 'warn',
      observed: { observedPct: 87 },
      localEstimate: { turns5h: 50, turns7d: 120, warn5hRatio: 0.83 },
      limits: { softTurns5h: 60, softTurns7d: 350 },
    },
    strings: enStrings,
  });
  assert.equal(segs.length, 1);
  assert.equal(segs[0].id, 'quota');
  assert.equal(segs[0].text, '5h 87%');
  assert.equal(segs[0].tone, 'warn');
});

test('computeHudSegments formats paused queue with pause symbol and warn tone', () => {
  const segs = statusPill.computeHudSegments({
    cfg: makeCfg({ compactGuard: false, sessionWatchdog: false, promptQueue: true }),
    queue: { itemCount: 3, paused: true },
    strings: enStrings,
  });
  assert.equal(segs.length, 1);
  assert.equal(segs[0].id, 'queue');
  assert.ok(segs[0].text.endsWith('⏸'));
  assert.equal(segs[0].tone, 'warn');
});

test('computeHudSegments formats stalled state in m:ss format', () => {
  const segs = statusPill.computeHudSegments({
    cfg: makeCfg({ compactGuard: false, sessionWatchdog: true }),
    watchdog: { stalled: true, stallDismissed: false, stalledForSec: 200 },
    strings: enStrings,
  });
  assert.equal(segs.length, 1);
  assert.equal(segs[0].id, 'eta');
  assert.ok(segs[0].text.includes('3:20'));
  assert.equal(segs[0].tone, 'warn');
});

test('computeHudSegments omits nov when connected & idle, and surfaces nov warn segment only on pending alerts', () => {
  const segsIdle = statusPill.computeHudSegments({
    cfg: makeCfg({
      compactGuard: true,
      sessionWatchdog: false,
      outlineBookmarks: true,
      safeAutoAccept: true,
    }),
    snap: { usedPct: 50 },
    bookmarkCount: 2,
    autoAccept: { enabled: true, paused: false, dryRun: true },
    nov: { connected: true, enabledCount: 5, total: 13 },
    strings: enStrings,
  });
  assert.deepEqual(segsIdle.map((s) => s.id), ['ctx', 'bookmarks', 'autoAccept']);
  assert.equal(segsIdle[2].text, enStrings.hudAutoAcceptDryRun);
  assert.equal(segsIdle[2].tone, 'idle');

  const segsAlert = statusPill.computeHudSegments({
    cfg: makeCfg({
      compactGuard: true,
      sessionWatchdog: false,
      outlineBookmarks: true,
      safeAutoAccept: true,
    }),
    snap: { usedPct: 50 },
    bookmarkCount: 2,
    autoAccept: { enabled: true, paused: false, dryRun: true },
    nov: { connected: true, enabledCount: 5, total: 13, radarAwaiting: 2 },
    strings: enStrings,
  });
  assert.deepEqual(segsAlert.map((s) => s.id), ['ctx', 'bookmarks', 'autoAccept', 'nov']);
  assert.equal(segsAlert[3].text, 'NOV · ⏳2');
  assert.equal(segsAlert[3].tone, 'warn');
  assert.ok(segsAlert[3].title.includes('agy-NOV'));
});
