// agy-Sag — Host UI Multi-Language Translation Engine (UMD)
// Zero-dependency, lossless WeakMap-reversible DOM & Shadow DOM translator with conflict arbitration.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagHostI18n = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const ATTR_WHITELIST = Object.freeze([
    'placeholder',
    'title',
    'aria-label',
    'data-tooltip',
    'alt',
    'aria-description',
  ]);

  const CHAT_PROSE_SELECTORS = Object.freeze([
    '[data-testid="user-message-bubble"]',
    '[data-testid="user-message-content"]',
    '[data-testid="planner-response-text"]',
    '[data-testid="agent-response"]',
    '[data-testid="conversation-row-sidebar"]',
    '[data-testid="terminal-output"]',
  ]);

  const HARD_SKIP_SELECTORS = Object.freeze([
    'code',
    'pre',
    'kbd',
    'samp',
    'script',
    'style',
    'noscript',
    'math',
    'svg',
    'mjx-container',
    '.katex',
    '.katex-mathml',
    '.katex-html',
    '.MathJax',
    '.math',
    '.math-inline',
    '.math-display',
    'textarea',
    'input',
    'select',
    'option',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    '[data-lexical-editor="true"]',
    '.monaco-editor',
    '.monaco-diff-editor',
    '.xterm',
    '[data-testid="user-message-bubble"]',
    '[data-testid="user-message-content"]',
    '[data-testid="planner-response-text"]',
    '[data-testid="agent-response"]',
    '[data-testid="terminal-output"]',
    '[data-testid="branch-pill-trigger"]',
    '[data-testid="workspace-name"]',
    '[data-ag-no-i18n="1"]',
    '[data-ag-sg-owned="1"]',
    '[data-ag-sag-owned="1"]',
    '[translate="no"]',
    '[data-no-translate="true"]',
    '[dir="rtl"]',
  ]);

  const HARD_SKIP_SUBTREE_TAGS = new Set([
    'CODE',
    'PRE',
    'KBD',
    'SAMP',
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'MATH',
    'SVG',
    'MJX-CONTAINER',
    'SELECT',
    'OPTION',
  ]);

  const INPUT_CONTENT_SKIP_TAGS = new Set(['TEXTAREA', 'INPUT']);

  const HARD_SKIP_CLASSES = [
    'monaco-editor',
    'monaco-diff-editor',
    'xterm',
    'katex',
    'katex-mathml',
    'katex-html',
    'MathJax',
    'math',
    'math-inline',
    'math-display',
  ];

  const HARD_SKIP_TESTIDS = new Set([
    'user-message-bubble',
    'user-message-content',
    'planner-response-text',
    'agent-response',
    'terminal-output',
    'branch-pill-trigger',
    'workspace-name',
  ]);

  // Containers whose inner text nodes (e.g. user conversation titles) must stay untranslated,
  // while descendant action buttons' whitelisted attributes (aria-label/title/data-tooltip) remain translatable.
  const TEXT_ONLY_SKIP_TESTIDS = new Set([
    'conversation-row-sidebar',
  ]);

  const SLASH_COMMAND_RE = /^\/[a-z0-9_-]+$/i;
  const WHITESPACE_SPLIT_RE = /^(\s*)([\s\S]*?)(\s*)$/;
  const CACHE_MISS = Symbol('agSagHostI18n.cacheMiss');
  const DEFAULT_MAX_CACHE_SIZE = 8000;
  const MAX_MISSING_PHRASES = 500;
  const MIN_LOWERCASE_LOOKUP_LEN = 4;
  const MAX_NODES_PER_FLUSH = 600;
  const MAX_FRAME_BUDGET_MS = 5;
  const MIN_NODES_BEFORE_TIME_YIELD = 40;
  const CONFLICT_WINDOW_MS = 1500;
  const CONFLICT_REWRITE_THRESHOLD = 3;
  const SWEEP_FLUSH_INTERVAL = 100;
  const SWEEP_REF_THRESHOLD = 500;

  // Fallback suffix patterns (linear time, zero ReDoS)
  const TRAILING_PUNCT_RE = /^(.+?)(\s*(?:\.{3}|[:：…\.!！?？]))$/;
  const SHORTCUT_SUFFIX_RE =
    /^(.+?)(\s+(?:\(?(?:(?:[⌘⇧⌥⌃]{1,4}(?:[A-Za-z0-9,./;'\[\]\\`\-=]|F(?:1[0-2]|[1-9])|[↵↩⇥⌫⌦⎋↑↓←→]))|(?:(?:Ctrl|Cmd|Command|Shift|Alt|Opt|Option|Meta|Super)(?:\+(?:Ctrl|Cmd|Command|Shift|Alt|Opt|Option|Meta|Super)){0,3}\+(?:[A-Za-z0-9,./;'\[\]\\`\-=]|F(?:1[0-2]|[1-9])|Enter|Return|Tab|Esc|Escape|Space|Backspace|Delete|Up|Down|Left|Right|Home|End|PageUp|PageDown)))\)?))$/;

  // Step command line / file path guard patterns (linear time, case-sensitive on CLI commands to protect UI prose)
  const STEP_CMD_PREFIX_RE =
    /^(?:git|npm|npx|pnpm|yarn|bun|node|deno|python|python3|pip|pip3|uv|cargo|rustc|go|make|cmake|docker|kubectl|curl|wget|ssh|scp|rsync|ls|cd|pwd|cat|head|tail|grep|rg|ag|find|fd|sed|awk|chmod|chown|mkdir|rm|cp|mv|touch|echo|printf|export|env|kill|ps|lsof|tar|zip|unzip|sh|bash|zsh|sudo|brew|apt|yum|dnf|systemctl|launchctl|sqlite3|psql|mysql|redis-cli)\s+\S/;
  const STEP_CLI_FLAG_RE = /(?:^|\s)--[A-Za-z][A-Za-z0-9-]*(?:=|\s|$)/;
  const STEP_SHELL_OP_RE = /(?:&&|\|\||\S\s*\|\s*\S)/;
  const STEP_ABS_OR_REL_PATH_RE = /^(?:~\/|\.{1,2}\/|\/[A-Za-z0-9._-]+(?:\/|$)|[A-Za-z]:\\)/;
  const STEP_EXT_PATH_RE =
    /(?:^|\s)[A-Za-z0-9._@-]+(?:[\/\\][A-Za-z0-9._@-]+)+\.[A-Za-z][A-Za-z0-9]{0,7}(?:[:#]\d+(?::\d+)?)?(?:\s|$)/;
  const STEP_MULTI_SEG_PATH_RE =
    /(?:^|\s)[A-Za-z0-9._@-]+(?:[\/\\][A-Za-z0-9._@-]+){2,}(?:\s|$)/;

  function looksLikeStepPathOrCmd(str) {
    if (typeof str !== 'string') return false;
    const s = str.trim();
    if (s.length < 3) return false;
    if (STEP_CMD_PREFIX_RE.test(s)) return true;
    if (STEP_CLI_FLAG_RE.test(s)) return true;
    if (STEP_SHELL_OP_RE.test(s)) return true;
    if (s.includes('/') || s.includes('\\')) {
      if (STEP_ABS_OR_REL_PATH_RE.test(s)) return true;
      if (STEP_EXT_PATH_RE.test(s)) return true;
      if (STEP_MULTI_SEG_PATH_RE.test(s)) return true;
    }
    return false;
  }

  // Missing-phrase safety filters (exclude secrets, paths, URLs, emails, non-ASCII, UUIDs, pure numbers)
  const NON_ENGLISH_CHAR_RE = /[^\x20-\x7E\u2018-\u201F\u2013-\u2014\u2026\u00B7]/;
  const HAS_LATIN_LETTER_RE = /[A-Za-z]/;
  const PURE_NUM_OR_PUNCT_RE = /^[\d\s.,:;!?+\-*/%=()[\]{}<>|\\~`@#$^&_'"·…]+$/;
  const URL_RE = /(?:https?|wss?|ftp|file):\/\/|\bwww\.[a-z0-9-]+/i;
  const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  const FILE_PATH_RE = /(?:^[.~]?\/|^[A-Za-z]:\\|(?:^|\s)[a-zA-Z0-9._-]+\/[a-zA-Z0-9._/-]+\.[a-zA-Z0-9]{1,8}\b|(?:^|\s)\/?(?:[a-zA-Z0-9._-]+\/){2,}[a-zA-Z0-9._-]+)/;
  const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
  const SECRET_PATTERNS = [
    /\bsk-(?:proj-|ant-|live-|test-)?[A-Za-z0-9_-]{8,}/,
    /\bAIza[0-9A-Za-z_-]{10,}/,
    /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
    /\beyJ[A-Za-z0-9_-]{6,}\.eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{12,}/,
    /\bgithub_pat_[A-Za-z0-9_]{12,}/,
    /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bnpm_[A-Za-z0-9]{12,}/,
    /-----BEGIN\s+[A-Z0-9 ]*KEY-----/,
    /[A-Za-z0-9+/=_-]{36,}/,
  ];

  function resolveDep(globalKey, relPath) {
    if (globalRoot && globalRoot[globalKey]) return globalRoot[globalKey];
    if (typeof require === 'function') return require(relPath);
    return null;
  }

  // Safe placeholder substitution that NEVER passes replacement strings to String.prototype.replace,
  // completely preventing $&, $$, $1, $`, $' expansion bugs.
  function applyPatternTemplate(template, match) {
    const tpl = String(template || '');
    let out = '';
    let lastIdx = 0;
    const placeholderRe = /\{(\d+)\}/g;
    let m;
    while ((m = placeholderRe.exec(tpl)) !== null) {
      out += tpl.slice(lastIdx, m.index);
      const groupIdx = Number(m[1]);
      if (groupIdx >= 1 && groupIdx < match.length && match[groupIdx] !== undefined) {
        out += String(match[groupIdx]);
      } else {
        out += m[0];
      }
      lastIdx = placeholderRe.lastIndex;
    }
    out += tpl.slice(lastIdx);
    return out;
  }

  function hasClass(el, clsName) {
    if (!el) return false;
    if (el.classList && typeof el.classList.contains === 'function') {
      return el.classList.contains(clsName);
    }
    const raw = typeof el.className === 'string' ? el.className : '';
    if (!raw) return false;
    return raw.split(/\s+/).includes(clsName);
  }

  function getAttr(el, name) {
    if (!el || typeof el.getAttribute !== 'function') return null;
    try {
      return el.getAttribute(name);
    } catch {
      return null;
    }
  }

  // Elements whose entire subtree AND attributes must be physically skipped.
  function isHardSkipAllElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = String(el.tagName || '').toUpperCase();
    if (HARD_SKIP_SUBTREE_TAGS.has(tag)) return true;

    for (let i = 0; i < HARD_SKIP_CLASSES.length; i++) {
      if (hasClass(el, HARD_SKIP_CLASSES[i])) return true;
    }

    const testId = getAttr(el, 'data-testid');
    if (testId && HARD_SKIP_TESTIDS.has(testId)) return true;

    if (
      getAttr(el, 'data-ag-no-i18n') === '1' ||
      getAttr(el, 'data-ag-sg-owned') === '1' ||
      getAttr(el, 'data-ag-sag-owned') === '1' ||
      getAttr(el, 'translate') === 'no' ||
      getAttr(el, 'data-no-translate') === 'true' ||
      getAttr(el, 'dir') === 'rtl'
    ) {
      return true;
    }
    return false;
  }

  // Editable / form controls: their own whitelisted UI attributes (placeholder/title/aria-label)
  // can be translated when not inside a hard-skip container, while their value & child text nodes are strictly skipped.
  function isEditableContentSkipElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = String(el.tagName || '').toUpperCase();
    if (INPUT_CONTENT_SKIP_TAGS.has(tag)) return true;
    const ce = getAttr(el, 'contenteditable');
    if (
      ce === '' ||
      (ce !== null && (String(ce).toLowerCase() === 'true' || String(ce).toLowerCase() === 'plaintext-only')) ||
      el.isContentEditable === true
    ) {
      return true;
    }
    if (getAttr(el, 'data-lexical-editor') === 'true') return true;
    return false;
  }

  function isTextOnlySkipElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const testId = getAttr(el, 'data-testid');
    return Boolean(testId && TEXT_ONLY_SKIP_TESTIDS.has(testId));
  }

  function isShadowHostSkipped(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.id === 'ag-prism-pulse-bar' || getAttr(el, 'id') === 'ag-prism-pulse-bar') return true;
    if (getAttr(el, 'data-ag-prism-pulse-bar') === 'true') return true;
    if (
      getAttr(el, 'data-ag-sg-owned') === '1' ||
      getAttr(el, 'data-ag-sag-owned') === '1' ||
      getAttr(el, 'data-ag-no-i18n') === '1'
    ) {
      return true;
    }
    return isHardSkipAllElement(el);
  }

  // Checks strict ancestor chain of `node` (including across Shadow DOM host boundaries).
  // When forContent=true, also treats editable/form & text-only-skip (conversation-row-sidebar) ancestors as skipped.
  function hasSkippedAncestor(node, forContent) {
    let cur = node;
    while (cur) {
      const pn = cur.parentNode;
      if (pn && pn.host && pn.host.nodeType === 1) {
        if (isShadowHostSkipped(pn.host)) return true;
        cur = pn.host;
      } else {
        cur = cur.parentElement || (pn && pn.nodeType === 1 ? pn : null);
      }
      if (!cur || cur.nodeType !== 1) break;
      if (isHardSkipAllElement(cur)) return true;
      if (forContent && (isEditableContentSkipElement(cur) || isTextOnlySkipElement(cur))) return true;
    }
    return false;
  }

  function hasEditableAncestor(node) {
    let cur = node;
    while (cur) {
      const pn = cur.parentNode;
      if (pn && pn.host && pn.host.nodeType === 1) {
        cur = pn.host;
      } else {
        cur = cur.parentElement || (pn && pn.nodeType === 1 ? pn : null);
      }
      if (!cur || cur.nodeType !== 1) break;
      if (isEditableContentSkipElement(cur)) return true;
    }
    return false;
  }

  function hasTextOnlySkipAncestor(node) {
    let cur = node;
    while (cur) {
      const pn = cur.parentNode;
      if (pn && pn.host && pn.host.nodeType === 1) {
        cur = pn.host;
      } else {
        cur = cur.parentElement || (pn && pn.nodeType === 1 ? pn : null);
      }
      if (!cur || cur.nodeType !== 1) break;
      if (isTextOnlySkipElement(cur)) return true;
    }
    return false;
  }

  function getChildList(node) {
    if (!node) return [];
    if (node.childNodes && typeof node.childNodes.length === 'number') {
      return node.childNodes;
    }
    if (node.children && typeof node.children.length === 'number') {
      return node.children;
    }
    return [];
  }

  function isSafeMissingPhraseCandidate(core, keepSet) {
    if (!core || core.length < 2 || core.length > 120) return false;
    if (SLASH_COMMAND_RE.test(core)) return false;
    if (keepSet.has(core)) return false;
    if (NON_ENGLISH_CHAR_RE.test(core)) return false;
    if (!HAS_LATIN_LETTER_RE.test(core)) return false;
    if (PURE_NUM_OR_PUNCT_RE.test(core)) return false;
    if (URL_RE.test(core)) return false;
    if (EMAIL_RE.test(core)) return false;
    if (FILE_PATH_RE.test(core)) return false;
    if (UUID_RE.test(core)) return false;
    for (let i = 0; i < SECRET_PATTERNS.length; i++) {
      if (SECRET_PATTERNS[i].test(core)) return false;
    }
    return true;
  }

  function makeWeakRef(target) {
    if (typeof WeakRef === 'function') {
      return new WeakRef(target);
    }
    return { deref: () => target };
  }

  function createHostI18nController(options = {}) {
    const win = options.win || globalRoot;
    const doc = options.doc !== undefined ? options.doc : win?.document || null;
    const packsMod = options.packsMod || resolveDep('__agSagHostI18nPacks', './host-i18n-packs.js');
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');

    if (!packsMod || typeof packsMod.getPack !== 'function') {
      throw new Error('host-i18n requires host-i18n-packs module');
    }

    const keepExactSet = new Set(packsMod.KEEP_UNTRANSLATED_EXACT || []);
    const keepLowerSet = new Set(Array.from(keepExactSet).map((s) => s.toLowerCase()));

    function readLocaleHint(raw) {
      if (typeof raw !== 'string') return '';
      const trimmed = raw.trim();
      if (!trimmed || trimmed.toLowerCase() === 'auto') return '';
      return trimmed;
    }

    function resolveAutoLocale() {
      const html = doc?.documentElement;
      const detected =
        readLocaleHint(getAttr(html, 'data-ag-cs-lang')) ||
        readLocaleHint(getAttr(html, 'lang')) ||
        readLocaleHint(win?.navigator?.language) ||
        'en';
      return packsMod.normalizeHostLocale(detected);
    }

    function resolveLocaleConfig(rawLocale) {
      const trimmed = typeof rawLocale === 'string' ? rawLocale.trim() : '';
      if (!trimmed || trimmed.toLowerCase() === 'auto') {
        return {
          configured: 'auto',
          resolved: resolveAutoLocale(),
        };
      }
      const norm = packsMod.normalizeHostLocale(trimmed);
      return {
        configured: norm,
        resolved: norm,
      };
    }

    let enabled = options.enabled !== undefined ? Boolean(options.enabled) : true;
    const initialLocale = resolveLocaleConfig(options.locale);
    let configuredLocale = initialLocale.configured;
    let currentLocale = initialLocale.resolved;
    let conflictPolicy = options.conflictPolicy === 'takeover' ? 'takeover' : 'yield';
    let collectMissing = Boolean(options.collectMissing);
    const respectHibernation = options.respectHibernation !== false;
    const autoObserve = options.autoObserve !== false;
    const maxCacheSize =
      Number.isFinite(Number(options.maxCacheSize)) && Number(options.maxCacheSize) > 0
        ? Math.floor(Number(options.maxCacheSize))
        : DEFAULT_MAX_CACHE_SIZE;

    let destroyed = false;
    let yieldedTo = null;
    let isApplying = false;

    // Custom pack overlays keyed by normalized locale
    const customPacks = new Map();
    if (options.customPacks && typeof options.customPacks === 'object') {
      for (const [loc, pack] of Object.entries(options.customPacks)) {
        const norm = packsMod.normalizeHostLocale(loc);
        if (pack && typeof pack === 'object') {
          customPacks.set(norm, pack);
        }
      }
    }

    // Active compiled lookup tables for currentLocale
    let exactMap = new Map();
    let lowerMap = new Map();
    let compiledPatterns = [];
    const lookupCache = new Map();

    // Missing UI phrases collector (opt-in, deduped, capped at 500)
    const missingSet = new Set();
    const inFlightExtPacks = new Map();
    const requestExtendedPackFn = typeof options.requestExtendedPack === 'function' ? options.requestExtendedPack : null;

    function ensureExtendedPack(targetLocale) {
      if (destroyed || !requestExtendedPackFn) return Promise.resolve(false);
      const norm = packsMod.normalizeHostLocale(targetLocale);
      if (norm === 'en') return Promise.resolve(false);
      if (packsMod.hasExtendedPack?.(norm)) return Promise.resolve(true);
      if (inFlightExtPacks.has(norm)) return inFlightExtPacks.get(norm);

      const p = Promise.resolve()
        .then(() => requestExtendedPackFn(norm))
        .then((extPack) => {
          inFlightExtPacks.delete(norm);
          if (destroyed || !extPack || typeof extPack !== 'object') return false;
          const reg = packsMod.registerExtendedPack?.(norm, extPack);
          if (!reg?.ok) return false;
          if (!destroyed && currentLocale === norm) {
            compileActivePack();
            if (enabled) scanNow();
            emitStateChange();
          }
          return true;
        })
        .catch(() => {
          inFlightExtPacks.delete(norm);
          return false;
        });
      inFlightExtPacks.set(norm, p);
      return p;
    }

    // Reversible DOM tracking via WeakMap + WeakRef registries
    const textRecords = new WeakMap(); // TextNode -> { orig, translated }
    let trackedTextSet = new WeakSet();
    const textRefMap = new WeakMap(); // TextNode -> WeakRef<TextNode>
    const trackedTextRefs = new Set();

    // Per-TextNode React write-conflict breaker (resets on restoreAll / setLocale / destroy)
    let exemptNodes = new WeakSet();
    let nodeConflictTrack = new WeakMap(); // TextNode -> { count, windowStart }
    let exemptCount = 0;

    const attrRecords = new WeakMap(); // Element -> Map<attr, { orig, translated }>
    let trackedAttrSet = new WeakSet();
    const attrRefMap = new WeakMap(); // Element -> WeakRef<Element>
    const trackedAttrRefs = new Set();
    let flushesSinceSweep = 0;
    let sweepCount = 0;

    function nowMs() {
      if (typeof win?.performance?.now === 'function') return win.performance.now();
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
      return Date.now();
    }

    function resetConflictExemption() {
      exemptNodes = new WeakSet();
      nodeConflictTrack = new WeakMap();
      exemptCount = 0;
    }

    function createSliceBudget() {
      return {
        remaining: MAX_NODES_PER_FLUSH,
        processed: 0,
        startMs: nowMs(),
        exhausted: false,
        overflow: [],
      };
    }

    function isBudgetExhausted(budget) {
      if (!budget) return false;
      if (budget.exhausted) return true;
      if (budget.remaining <= 0) {
        budget.exhausted = true;
        return true;
      }
      if (
        budget.processed >= MIN_NODES_BEFORE_TIME_YIELD &&
        nowMs() - budget.startMs >= MAX_FRAME_BUDGET_MS
      ) {
        budget.exhausted = true;
        return true;
      }
      return false;
    }

    // MutationObserver & batched scheduling state
    const observers = [];
    const shadowObservers = []; // { root, host, observer }
    let htmlAttrBusUnsub = null;
    let shadowPruneTimer = null;
    const shadowPruneIntervalMs = Math.max(
      100,
      Number.isFinite(Number(options.shadowPruneIntervalMs)) ? Number(options.shadowPruneIntervalMs) : 30_000
    );
    let observedRoots = new WeakSet();
    let observersStarted = false;
    let pendingQueue = [];
    let pendingCursor = 0;
    const pendingSet = new Set();
    let pendingFullScan = false;
    let flushGen = 0;
    let flushScheduled = false;
    let flushHandle = null;
    let flushHandleType = 'none'; // 'none' | 'raf' | 'timeout' | 'microtask'
    let hibernatedDirty = false;
    const eventCleanups = [];

    function clearPendingQueue() {
      pendingQueue = [];
      pendingCursor = 0;
      pendingSet.clear();
      pendingFullScan = false;
    }

    function enqueuePendingNode(node) {
      if (!node || pendingSet.has(node)) return false;
      pendingSet.add(node);
      pendingQueue.push(node);
      return true;
    }

    function hasPendingNodes() {
      return pendingCursor < pendingQueue.length;
    }

    function compactPendingQueue() {
      if (pendingCursor >= pendingQueue.length) {
        pendingQueue = [];
        pendingCursor = 0;
      } else if (pendingCursor > 512 && pendingCursor * 2 >= pendingQueue.length) {
        pendingQueue = pendingQueue.slice(pendingCursor);
        pendingCursor = 0;
      }
    }

    function emitStateChange() {
      if (typeof options.onStateChange === 'function') {
        try {
          options.onStateChange(getDebugState());
        } catch {}
      }
    }

    function compileActivePack() {
      exactMap = new Map();
      lowerMap = new Map();
      compiledPatterns = [];
      lookupCache.clear();

      if (currentLocale === 'en') return;

      const custom = customPacks.get(currentLocale);
      const pack = custom ? packsMod.mergeCustomPack(currentLocale, custom) : packsMod.getPack(currentLocale);

      if (pack && pack.exact && typeof pack.exact === 'object') {
        for (const [k, v] of Object.entries(pack.exact)) {
          if (typeof k !== 'string' || !k || typeof v !== 'string' || !v) continue;
          if (keepExactSet.has(k)) continue;
          exactMap.set(k, v);
          // Tier 2: lowercase fallback only for non-ambiguous terms (length >= 4) and never conflicting with KEEP_UNTRANSLATED_EXACT
          if (k.length >= MIN_LOWERCASE_LOOKUP_LEN) {
            const lk = k.toLowerCase();
            if (!keepLowerSet.has(lk) && !lowerMap.has(lk)) {
              lowerMap.set(lk, v);
            }
          }
        }
      }

      if (pack && Array.isArray(pack.patterns)) {
        for (let i = 0; i < pack.patterns.length; i++) {
          const item = pack.patterns[i];
          if (!item || typeof item.replace !== 'string') continue;
          try {
            const src = item.source instanceof RegExp ? item.source.source : String(item.source);
            const flg = (item.source instanceof RegExp ? item.source.flags : String(item.flags || '')).replace(/[gy]/g, '');
            compiledPatterns.push({
              regex: new RegExp(src, flg),
              replace: item.replace,
            });
          } catch {}
        }
      }
    }

    function cacheSet(key, val) {
      if (!lookupCache.has(key) && lookupCache.size >= maxCacheSize) {
        const oldestKey = lookupCache.keys().next().value;
        if (oldestKey !== undefined) {
          lookupCache.delete(oldestKey);
        }
      }
      lookupCache.set(key, val);
    }

    function maybeCollectMissing(core) {
      if (!collectMissing) return;
      if (missingSet.size >= MAX_MISSING_PHRASES) return;
      if (missingSet.has(core)) return;
      if (!isSafeMissingPhraseCandidate(core, keepExactSet)) return;
      missingSet.add(core);
    }

    function lookupExactOrLower(str) {
      if (!str || keepExactSet.has(str) || SLASH_COMMAND_RE.test(str)) return undefined;
      let hit = exactMap.get(str);
      if (hit === undefined && str.length >= MIN_LOWERCASE_LOOKUP_LEN) {
        const lc = str.toLowerCase();
        if (!keepLowerSet.has(lc)) {
          hit = lowerMap.get(lc);
        }
      }
      return hit;
    }

    // Core 3-tier + safe suffix-stripping lookup for a trimmed non-empty string. Returns translated string or null on miss.
    function lookupCore(core) {
      if (!core || currentLocale === 'en') return null;
      if (SLASH_COMMAND_RE.test(core)) return null;
      if (keepExactSet.has(core)) return null;
      if (looksLikeStepPathOrCmd(core)) return null;

      if (lookupCache.has(core)) {
        const cached = lookupCache.get(core);
        if (cached === CACHE_MISS) {
          maybeCollectMissing(core);
          return null;
        }
        return cached;
      }

      // Tier 1 & Tier 2: exact O(1) + lowercase O(1) (excluding short ambiguous words)
      let hit = lookupExactOrLower(core);

      // Tier 3: compiled regex patterns with safe placeholder substitution
      if (hit === undefined && compiledPatterns.length > 0) {
        for (let i = 0; i < compiledPatterns.length; i++) {
          const entry = compiledPatterns[i];
          const match = entry.regex.exec(core);
          if (match) {
            hit = applyPatternTemplate(entry.replace, match);
            break;
          }
        }
      }

      // Tier 4a: trailing keyboard shortcut suffix stripping (e.g. "Search ⌘K", "Copy Ctrl+C", "Command Palette ⇧⌘P")
      if (hit === undefined) {
        const sm = SHORTCUT_SUFFIX_RE.exec(core);
        if (sm) {
          const base = sm[1];
          const suffix = sm[2];
          const suffixTrim = suffix.trim();
          const parensBalanced = suffixTrim.startsWith('(') === suffixTrim.endsWith(')');
          if (parensBalanced && base.length >= 2) {
            const baseHit = lookupExactOrLower(base);
            if (baseHit !== undefined && baseHit !== base) {
              hit = baseHit + suffix;
            }
          }
        }
      }

      // Tier 4b: trailing punctuation stripping (e.g. "Settings:", "Archived.", "Thinking…")
      if (hit === undefined) {
        const pm = TRAILING_PUNCT_RE.exec(core);
        if (pm) {
          const base = pm[1];
          const punct = pm[2];
          if (base.length >= 2) {
            const baseHit = lookupExactOrLower(base);
            if (baseHit !== undefined && baseHit !== base) {
              hit = baseHit + punct;
            }
          }
        }
      }

      if (hit === undefined || hit === core) {
        cacheSet(core, CACHE_MISS);
        if (hit === undefined) maybeCollectMissing(core);
        return null;
      }

      cacheSet(core, hit);
      return hit;
    }

    // Translates a raw string preserving exact leading/trailing whitespace.
    // Returns translated string when matched, or null if untranslated/skipped.
    function translateIfMatched(raw) {
      if (typeof raw !== 'string' || !raw) return null;
      const m = WHITESPACE_SPLIT_RE.exec(raw);
      const lead = m ? m[1] : '';
      const core = m ? m[2] : raw;
      const trail = m ? m[3] : '';
      if (!core) return null;
      const translatedCore = lookupCore(core);
      if (translatedCore === null) return null;
      // Direct concatenation preserves whitespace & avoids String.prototype.replace $&/$1 pitfalls
      return lead + translatedCore + trail;
    }

    function translateText(raw) {
      if (typeof raw !== 'string') return raw;
      if (!enabled || currentLocale === 'en') return raw;
      const res = translateIfMatched(raw);
      return res !== null ? res : raw;
    }

    function detectExternalConflict() {
      const htmlAttr = doc?.documentElement?.getAttribute?.('data-ag-prism-host-i18n') === 'active';
      const winGlobal = Boolean(win && win.__agPrismHostI18n);
      return htmlAttr || winGlobal;
    }

    function syncHostMarkers(active) {
      const html = doc?.documentElement;
      if (!html) return;
      try {
        if (active) {
          if (html.getAttribute?.('data-ag-sag-host-i18n') !== 'active') {
            html.setAttribute?.('data-ag-sag-host-i18n', 'active');
          }
          if (html.getAttribute?.('data-ag-sag-lang') !== currentLocale) {
            html.setAttribute?.('data-ag-sag-lang', currentLocale);
          }
        } else {
          html.removeAttribute?.('data-ag-sag-host-i18n');
          html.removeAttribute?.('data-ag-sag-lang');
        }
      } catch {}
    }

    function trackTextNode(node, orig, translated) {
      textRecords.set(node, { orig, translated });
      if (!trackedTextSet.has(node)) {
        trackedTextSet.add(node);
        let ref = textRefMap.get(node);
        if (!ref) {
          ref = makeWeakRef(node);
          textRefMap.set(node, ref);
        }
        trackedTextRefs.add(ref);
      }
    }

    function untrackTextNode(node) {
      if (!node) return;
      textRecords.delete(node);
      trackedTextSet.delete(node);
      const ref = textRefMap.get(node);
      if (ref) {
        trackedTextRefs.delete(ref);
        textRefMap.delete(node);
      }
    }

    function trackAttrNode(el, attr, orig, translated) {
      let map = attrRecords.get(el);
      if (!map) {
        map = new Map();
        attrRecords.set(el, map);
      }
      map.set(attr, { orig, translated });
      if (!trackedAttrSet.has(el)) {
        trackedAttrSet.add(el);
        let ref = attrRefMap.get(el);
        if (!ref) {
          ref = makeWeakRef(el);
          attrRefMap.set(el, ref);
        }
        trackedAttrRefs.add(ref);
      }
    }

    function untrackAttrNode(el) {
      if (!el) return;
      attrRecords.delete(el);
      trackedAttrSet.delete(el);
      const ref = attrRefMap.get(el);
      if (ref) {
        trackedAttrRefs.delete(ref);
        attrRefMap.delete(el);
      }
    }

    function stopShadowPruneTimer() {
      if (shadowPruneTimer) {
        clearInterval(shadowPruneTimer);
        shadowPruneTimer = null;
      }
    }

    function pruneDetachedShadowObservers() {
      if (shadowObservers.length === 0) return 0;
      let removed = 0;
      for (let i = shadowObservers.length - 1; i >= 0; i -= 1) {
        const entry = shadowObservers[i];
        if (!entry || (entry.host && entry.host.isConnected === false)) {
          if (entry) {
            try { entry.observer?.disconnect?.(); } catch {}
            try { observedRoots.delete(entry.root); } catch {}
          }
          shadowObservers.splice(i, 1);
          removed += 1;
        }
      }
      if (shadowObservers.length === 0) {
        stopShadowPruneTimer();
      }
      return removed;
    }

    function ensureShadowPruneTimer() {
      if (shadowPruneTimer || destroyed || !enabled || shadowObservers.length === 0) return;
      shadowPruneTimer = setInterval(() => {
        if (destroyed || !enabled) {
          stopShadowPruneTimer();
          return;
        }
        pruneDetachedShadowObservers();
      }, shadowPruneIntervalMs);
      shadowPruneTimer?.unref?.();
    }

    function sweepDeadRefs() {
      pruneDetachedShadowObservers();
      for (const ref of trackedTextRefs) {
        const node = ref.deref();
        if (!node || !textRecords.has(node)) {
          trackedTextRefs.delete(ref);
          if (node) {
            trackedTextSet.delete(node);
            textRefMap.delete(node);
          }
        }
      }
      for (const ref of trackedAttrRefs) {
        const el = ref.deref();
        if (!el || !attrRecords.has(el)) {
          trackedAttrRefs.delete(ref);
          if (el) {
            trackedAttrSet.delete(el);
            attrRefMap.delete(el);
          }
        }
      }
      flushesSinceSweep = 0;
      sweepCount += 1;
    }

    function restoreAll() {
      cancelScheduledFlush();
      clearPendingQueue();
      resetConflictExemption();
      const prevApplying = isApplying;
      isApplying = true;
      try {
        for (const ref of trackedTextRefs) {
          const node = ref.deref();
          if (node) {
            const rec = textRecords.get(node);
            if (rec) {
              try {
                if (node.nodeValue === rec.translated) {
                  node.nodeValue = rec.orig;
                }
              } catch {}
              textRecords.delete(node);
            }
            textRefMap.delete(node);
          }
        }
        trackedTextRefs.clear();
        trackedTextSet = new WeakSet();

        for (const ref of trackedAttrRefs) {
          const el = ref.deref();
          if (el) {
            const map = attrRecords.get(el);
            if (map) {
              for (const [attr, rec] of map.entries()) {
                try {
                  if (el.getAttribute?.(attr) === rec.translated) {
                    el.setAttribute?.(attr, rec.orig);
                  }
                } catch {}
              }
              attrRecords.delete(el);
            }
            attrRefMap.delete(el);
          }
        }
        trackedAttrRefs.clear();
        trackedAttrSet = new WeakSet();
        flushesSinceSweep = 0;
      } finally {
        isApplying = prevApplying;
      }
      syncHostMarkers(false);
    }

    function processTextNode(node) {
      if (!node || node.nodeType !== 3 || node.isConnected === false) return;
      if (exemptNodes.has(node)) return;
      const cur = node.nodeValue;
      if (typeof cur !== 'string' || !cur) return;

      const rec = textRecords.get(node);
      try {
        if (rec) {
          if (cur === rec.translated) {
            const next = translateIfMatched(rec.orig);
            if (next === null) {
              node.nodeValue = rec.orig;
              untrackTextNode(node);
            } else if (next !== cur) {
              node.nodeValue = next;
              rec.translated = next;
            }
            return;
          }
          const nextFromNew = translateIfMatched(cur);
          if (nextFromNew !== null) {
            const ts = nowMs();
            let tracker = nodeConflictTrack.get(node);
            if (!tracker || ts - tracker.windowStart > CONFLICT_WINDOW_MS) {
              tracker = { count: 1, windowStart: ts };
            } else {
              tracker.count += 1;
            }
            nodeConflictTrack.set(node, tracker);
            if (tracker.count >= CONFLICT_REWRITE_THRESHOLD) {
              exemptNodes.add(node);
              exemptCount += 1;
              nodeConflictTrack.delete(node);
              untrackTextNode(node);
              return;
            }
            node.nodeValue = nextFromNew;
            trackTextNode(node, cur, nextFromNew);
          } else {
            untrackTextNode(node);
          }
          return;
        }

        const translated = translateIfMatched(cur);
        if (translated !== null && translated !== cur) {
          node.nodeValue = translated;
          trackTextNode(node, cur, translated);
        }
      } catch {}
    }

    function processElementAttributes(el) {
      if (!el || el.nodeType !== 1 || el.isConnected === false || typeof el.getAttribute !== 'function') return;
      const attrMap = attrRecords.get(el);

      for (let i = 0; i < ATTR_WHITELIST.length; i++) {
        const attr = ATTR_WHITELIST[i];
        try {
          const cur = getAttr(el, attr);
          const rec = attrMap ? attrMap.get(attr) : undefined;

          if (cur === null || cur === '') {
            if (rec && attrMap) {
              attrMap.delete(attr);
              if (attrMap.size === 0) untrackAttrNode(el);
            }
            continue;
          }

          if (rec) {
            if (cur === rec.translated) {
              const next = translateIfMatched(rec.orig);
              if (next === null) {
                el.setAttribute(attr, rec.orig);
                attrMap.delete(attr);
                if (attrMap.size === 0) untrackAttrNode(el);
              } else if (next !== cur) {
                el.setAttribute(attr, next);
                rec.translated = next;
              }
            } else {
              const nextFromNew = translateIfMatched(cur);
              if (nextFromNew !== null) {
                el.setAttribute(attr, nextFromNew);
                trackAttrNode(el, attr, cur, nextFromNew);
              } else {
                attrMap.delete(attr);
                if (attrMap.size === 0) untrackAttrNode(el);
              }
            }
            continue;
          }

          const translated = translateIfMatched(cur);
          if (translated !== null && translated !== cur) {
            el.setAttribute(attr, translated);
            trackAttrNode(el, attr, cur, translated);
          }
        } catch {}
      }
    }

    function attachRootObserver(rootNode) {
      if (!autoObserve || !enabled || destroyed || !rootNode || observedRoots.has(rootNode)) return;
      const MO = win?.MutationObserver || globalRoot?.MutationObserver;
      if (typeof MO !== 'function') return;
      try {
        const mo = new MO(handleMutations);
        mo.observe(rootNode, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ATTR_WHITELIST,
        });
        observedRoots.add(rootNode);
        if (rootNode.host && rootNode.host.nodeType === 1) {
          shadowObservers.push({ root: rootNode, host: rootNode.host, observer: mo });
          ensureShadowPruneTimer();
        } else {
          observers.push(mo);
        }
      } catch {}
    }

    function walkSubtree(node, ancestorChecked = false, budget = null, skipText = false) {
      if (!node) return;
      if (budget) {
        if (isBudgetExhausted(budget)) {
          budget.overflow.push(node);
          return;
        }
        budget.remaining -= 1;
        budget.processed += 1;
      }
      const nt = node.nodeType;

      if (nt === 3) {
        if (skipText) return;
        if (ancestorChecked || !hasSkippedAncestor(node, true)) {
          processTextNode(node);
        }
        return;
      }

      if (nt === 1) {
        if (isHardSkipAllElement(node)) return;

        const isTextSkipSelf = isTextOnlySkipElement(node);
        if (!isTextSkipSelf) {
          processElementAttributes(node);
        }

        if (isEditableContentSkipElement(node)) return;

        const childSkipText = skipText || isTextSkipSelf;

        if (node.shadowRoot && !isShadowHostSkipped(node)) {
          attachRootObserver(node.shadowRoot);
          walkSubtree(node.shadowRoot, true, budget, childSkipText);
        }

        const children = getChildList(node);
        for (let i = 0; i < children.length; i++) {
          walkSubtree(children[i], true, budget, childSkipText);
        }
        return;
      }

      if (nt === 9 || nt === 11 || node.childNodes || node.children) {
        if (node.host && isShadowHostSkipped(node.host)) return;
        const children = getChildList(node);
        for (let i = 0; i < children.length; i++) {
          walkSubtree(children[i], true, budget, skipText);
        }
      }
    }

    function evaluateConflictAndActivation() {
      if (configuredLocale === 'auto') {
        const nextAuto = resolveAutoLocale();
        if (nextAuto !== currentLocale) {
          restoreAll();
          currentLocale = nextAuto;
          compileActivePack();
          if (enabled && currentLocale !== 'en') {
            pendingFullScan = true;
          }
          emitStateChange();
        }
      }
      const conflictDetected = detectExternalConflict();
      if (conflictDetected && conflictPolicy === 'yield') {
        const changed = yieldedTo !== 'obsidian-prism';
        yieldedTo = 'obsidian-prism';
        restoreAll();
        if (changed) emitStateChange();
        return false;
      }

      const wasYielded = yieldedTo !== null;
      yieldedTo = null;
      if (wasYielded) emitStateChange();

      if (!enabled || destroyed || currentLocale === 'en') {
        restoreAll();
        return false;
      }

      return true;
    }

    function isHibernated() {
      if (!respectHibernation) return false;
      if (coexist && typeof coexist.isWindowHibernated === 'function') {
        return Boolean(coexist.isWindowHibernated(doc, win));
      }
      return Boolean(doc?.hidden || doc?.documentElement?.getAttribute?.('data-ag-cs-win-blur') === '1');
    }

    function scanNow(rootNode) {
      if (destroyed) return false;
      if (!evaluateConflictAndActivation()) return false;
      const target = rootNode || doc?.body || doc?.documentElement;
      if (!target) return false;

      const prevApplying = isApplying;
      isApplying = true;
      try {
        if (target.nodeType === 1) {
          if (!hasSkippedAncestor(target, false) && !hasEditableAncestor(target)) {
            walkSubtree(target, false, null, hasTextOnlySkipAncestor(target));
          }
        } else if (target.nodeType === 3) {
          if (!hasSkippedAncestor(target, true)) processTextNode(target);
        } else {
          walkSubtree(target);
        }
        syncHostMarkers(true);
      } finally {
        isApplying = prevApplying;
      }
      sweepDeadRefs();
      return true;
    }

    function scanSliced(rootNode) {
      if (destroyed) return false;
      cancelScheduledFlush();
      clearPendingQueue();
      if (!evaluateConflictAndActivation()) return false;
      pendingFullScan = false;
      const target = rootNode || doc?.body || doc?.documentElement;
      if (!target) return false;

      const budget = createSliceBudget();
      const prevApplying = isApplying;
      isApplying = true;
      try {
        if (target.nodeType === 1) {
          if (!hasSkippedAncestor(target, false) && !hasEditableAncestor(target)) {
            walkSubtree(target, false, budget, hasTextOnlySkipAncestor(target));
          }
        } else if (target.nodeType === 3) {
          if (!hasSkippedAncestor(target, true)) processTextNode(target);
        } else {
          walkSubtree(target, false, budget);
        }
        syncHostMarkers(true);
      } finally {
        isApplying = prevApplying;
      }
      if (budget.overflow.length > 0) {
        for (let i = 0; i < budget.overflow.length; i += 1) {
          enqueuePendingNode(budget.overflow[i]);
        }
        scheduleFlush();
      }
      sweepDeadRefs();
      return true;
    }

    function scheduleScan(rootNode) {
      return scanSliced(rootNode);
    }

    function cancelScheduledFlush() {
      flushGen += 1;
      if (!flushScheduled) return;
      if (flushHandleType === 'raf' && flushHandle !== null && typeof win?.cancelAnimationFrame === 'function') {
        try { win.cancelAnimationFrame(flushHandle); } catch {}
      } else if (flushHandleType === 'timeout' && flushHandle !== null) {
        try { clearTimeout(flushHandle); } catch {}
      }
      flushScheduled = false;
      flushHandle = null;
      flushHandleType = 'none';
    }

    function maybeSweepAfterFlush() {
      flushesSinceSweep += 1;
      if (
        flushesSinceSweep >= SWEEP_FLUSH_INTERVAL ||
        trackedTextRefs.size > SWEEP_REF_THRESHOLD ||
        trackedAttrRefs.size > SWEEP_REF_THRESHOLD
      ) {
        sweepDeadRefs();
      }
    }

    function flushPending(expectedGen = flushGen) {
      if (expectedGen !== flushGen) return;
      flushScheduled = false;
      flushHandle = null;
      flushHandleType = 'none';
      if (destroyed) return;
      pruneDetachedShadowObservers();

      if (isHibernated()) {
        hibernatedDirty = true;
        return;
      }
      hibernatedDirty = false;

      if (!evaluateConflictAndActivation()) {
        clearPendingQueue();
        return;
      }

      if (pendingFullScan) {
        clearPendingQueue();
        const rootEl = doc?.body || doc?.documentElement || doc;
        if (rootEl) {
          const budget = createSliceBudget();
          const prevApplying = isApplying;
          isApplying = true;
          try {
            walkSubtree(rootEl, true, budget);
            syncHostMarkers(true);
          } finally {
            isApplying = prevApplying;
          }
          if (budget.overflow.length > 0) {
            for (let i = 0; i < budget.overflow.length; i += 1) {
              enqueuePendingNode(budget.overflow[i]);
            }
            scheduleFlush();
          }
        }
        maybeSweepAfterFlush();
        return;
      }

      if (!hasPendingNodes()) return;

      const budget = createSliceBudget();
      const prevApplying = isApplying;
      isApplying = true;
      try {
        while (pendingCursor < pendingQueue.length && !isBudgetExhausted(budget)) {
          const n = pendingQueue[pendingCursor];
          pendingQueue[pendingCursor] = null;
          pendingCursor += 1;
          if (!n) continue;
          pendingSet.delete(n);
          if (n.isConnected === false) continue;
          if (n.nodeType === 3) {
            if (!hasSkippedAncestor(n, true)) {
              budget.remaining -= 1;
              budget.processed += 1;
              processTextNode(n);
            }
          } else if (n.nodeType === 1) {
            if (!hasSkippedAncestor(n, false) && !hasEditableAncestor(n)) {
              walkSubtree(n, true, budget, hasTextOnlySkipAncestor(n));
            }
          } else {
            walkSubtree(n, true, budget);
          }
        }
        syncHostMarkers(true);
      } finally {
        isApplying = prevApplying;
      }
      if (budget.overflow.length > 0) {
        for (let i = 0; i < budget.overflow.length; i += 1) {
          enqueuePendingNode(budget.overflow[i]);
        }
      }
      compactPendingQueue();
      if (hasPendingNodes()) {
        scheduleFlush();
      }
      maybeSweepAfterFlush();
    }

    function scheduleFlush() {
      if (flushScheduled || destroyed || !enabled) return;
      flushScheduled = true;
      const myGen = flushGen;
      if (typeof win?.requestAnimationFrame === 'function') {
        flushHandleType = 'raf';
        flushHandle = win.requestAnimationFrame(() => {
          if (myGen !== flushGen) return;
          flushPending(myGen);
        });
      } else {
        flushHandleType = 'microtask';
        flushHandle = null;
        Promise.resolve().then(() => {
          if (myGen !== flushGen) return;
          if (flushScheduled && flushHandleType === 'microtask') {
            flushPending(myGen);
          }
        });
      }
    }

    function handleMutations(records) {
      if (destroyed || !enabled || isApplying || !Array.isArray(records) || records.length === 0) return;
      if (isHibernated()) {
        hibernatedDirty = true;
        return;
      }
      let queued = false;
      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        if (!rec) continue;
        if (rec.type === 'characterData' && rec.target) {
          if (hasSkippedAncestor(rec.target, true)) continue;
          if (enqueuePendingNode(rec.target)) queued = true;
        } else if (rec.type === 'attributes' && rec.target) {
          if (hasSkippedAncestor(rec.target, false) || hasEditableAncestor(rec.target)) continue;
          if (enqueuePendingNode(rec.target)) queued = true;
        } else if (rec.type === 'childList') {
          if (shadowObservers.length > 0 && rec.removedNodes && rec.removedNodes.length > 0) {
            pruneDetachedShadowObservers();
          }
          if (rec.target && (hasSkippedAncestor(rec.target, false) || hasEditableAncestor(rec.target))) continue;
          const added = rec.addedNodes;
          if (added && added.length) {
            for (let j = 0; j < added.length; j++) {
              const an = added[j];
              if (!an || (an.nodeType === 1 && isHardSkipAllElement(an))) continue;
              if (enqueuePendingNode(an)) queued = true;
            }
          }
        }
        if (pendingSet.size > 400) {
          clearPendingQueue();
          pendingFullScan = true;
          queued = true;
          break;
        }
      }
      if (queued) scheduleFlush();
    }

    const HTML_ATTR_FILTER = ['data-ag-prism-host-i18n', 'data-ag-cs-win-blur', 'data-ag-cs-lang', 'lang'];

    function handleHtmlAttrNames(attrNames, meta = null) {
      if (destroyed || !enabled || isApplying) return;
      if (meta?.woken && hibernatedDirty) {
        hibernatedDirty = false;
        pendingFullScan = true;
        scheduleFlush();
        return;
      }
      if (!attrNames) return;
      for (const attr of attrNames) {
        if (attr === 'data-ag-prism-host-i18n') {
          pendingFullScan = true;
          scheduleFlush();
          return;
        }
        if (configuredLocale === 'auto' && (attr === 'data-ag-cs-lang' || attr === 'lang')) {
          const resolved = resolveLocaleConfig('auto');
          if (resolved.resolved !== 'en') void ensureExtendedPack(resolved.resolved);
          pendingFullScan = true;
          scheduleFlush();
          return;
        }
        if (attr === 'data-ag-cs-win-blur' && !isHibernated() && hibernatedDirty) {
          hibernatedDirty = false;
          pendingFullScan = true;
          scheduleFlush();
          return;
        }
      }
    }

    function handleHtmlAttrMutations(records) {
      if (destroyed || !enabled || isApplying || !Array.isArray(records)) return;
      const names = [];
      for (let i = 0; i < records.length; i++) {
        const attr = records[i]?.attributeName;
        if (attr) names.push(attr);
      }
      handleHtmlAttrNames(names, null);
    }

    function handleWakeup() {
      if (destroyed || !enabled || isHibernated()) return;
      if (hibernatedDirty) {
        hibernatedDirty = false;
        pendingFullScan = true;
        scheduleFlush();
      } else if (pendingFullScan || hasPendingNodes()) {
        scheduleFlush();
      }
    }

    function stopObservers() {
      cancelScheduledFlush();
      stopShadowPruneTimer();
      clearPendingQueue();
      hibernatedDirty = false;

      if (htmlAttrBusUnsub) {
        try { htmlAttrBusUnsub(); } catch {}
        htmlAttrBusUnsub = null;
      }
      while (observers.length > 0) {
        const mo = observers.pop();
        try { mo.disconnect(); } catch {}
      }
      while (shadowObservers.length > 0) {
        const entry = shadowObservers.pop();
        try { entry?.observer?.disconnect?.(); } catch {}
      }
      while (eventCleanups.length > 0) {
        const fn = eventCleanups.pop();
        try { fn(); } catch {}
      }
      observedRoots = new WeakSet();
      observersStarted = false;
    }

    function startObservers() {
      if (!autoObserve || !enabled || destroyed || !doc || observersStarted) return;
      observersStarted = true;

      const bodyTarget = doc.body || doc.documentElement;
      if (bodyTarget) {
        attachRootObserver(bodyTarget);
      }

      if (doc.documentElement) {
        const attrBus = coexist?.getHtmlAttrBus?.(doc, win);
        if (attrBus && typeof attrBus.subscribe === 'function') {
          try {
            htmlAttrBusUnsub = attrBus.subscribe(
              'host-i18n-html',
              (changedAttrs, meta) => handleHtmlAttrNames(changedAttrs, meta),
              { attributeFilter: HTML_ATTR_FILTER, wakeOnResume: true }
            );
          } catch {
            htmlAttrBusUnsub = null;
          }
        }
        if (!htmlAttrBusUnsub) {
          const MO = win?.MutationObserver || globalRoot?.MutationObserver;
          if (typeof MO === 'function') {
            try {
              const htmlMo = new MO(handleHtmlAttrMutations);
              htmlMo.observe(doc.documentElement, {
                attributes: true,
                attributeFilter: HTML_ATTR_FILTER,
              });
              observers.push(htmlMo);
            } catch {}
          }
        }
      }

      if (typeof doc.addEventListener === 'function') {
        doc.addEventListener('visibilitychange', handleWakeup);
        eventCleanups.push(() => {
          try { doc.removeEventListener('visibilitychange', handleWakeup); } catch {}
        });
      }
      if (win && typeof win.addEventListener === 'function') {
        win.addEventListener('focus', handleWakeup);
        eventCleanups.push(() => {
          try { win.removeEventListener('focus', handleWakeup); } catch {}
        });
      }
    }

    function setLocale(nextLocale) {
      if (destroyed) return currentLocale;
      cancelScheduledFlush();
      clearPendingQueue();
      resetConflictExemption();
      const resolved = resolveLocaleConfig(nextLocale);
      configuredLocale = resolved.configured;
      currentLocale = resolved.resolved;
      compileActivePack();

      if (currentLocale === 'en') {
        restoreAll();
      } else if (enabled) {
        startObservers();
        scanSliced();
        void ensureExtendedPack(currentLocale);
      }
      emitStateChange();
      return currentLocale;
    }

    function setEnabled(nextEnabled) {
      if (destroyed) return enabled;
      const flag = Boolean(nextEnabled);
      enabled = flag;
      if (!enabled) {
        stopObservers();
        restoreAll();
      } else {
        startObservers();
        if (currentLocale !== 'en') {
          scanSliced();
          void ensureExtendedPack(currentLocale);
        } else {
          evaluateConflictAndActivation();
        }
      }
      emitStateChange();
      return enabled;
    }

    function setConflictPolicy(nextPolicy) {
      if (destroyed) return conflictPolicy;
      conflictPolicy = nextPolicy === 'takeover' ? 'takeover' : 'yield';
      if (enabled && currentLocale !== 'en') {
        scanNow();
      } else {
        evaluateConflictAndActivation();
      }
      emitStateChange();
      return conflictPolicy;
    }

    function mergeCustomPack(customPack, targetLocale) {
      if (destroyed || !customPack || typeof customPack !== 'object') return false;
      const trimmedTarget = typeof targetLocale === 'string' ? targetLocale.trim() : '';
      const norm =
        trimmedTarget && trimmedTarget.toLowerCase() !== 'auto'
          ? packsMod.normalizeHostLocale(trimmedTarget)
          : currentLocale;
      const prev = customPacks.get(norm);
      const merged = {
        exact: {
          ...(prev && prev.exact ? prev.exact : {}),
          ...(customPack.exact && typeof customPack.exact === 'object' ? customPack.exact : {}),
        },
        patterns: [
          ...(Array.isArray(customPack.patterns) ? customPack.patterns : []),
          ...(prev && Array.isArray(prev.patterns) ? prev.patterns : []),
        ],
      };
      customPacks.set(norm, merged);

      if (norm === currentLocale) {
        compileActivePack();
        if (enabled && currentLocale !== 'en') {
          scanNow();
        }
      }
      return true;
    }

    function clearCustomPacks(targetLocale) {
      if (destroyed) return;
      if (targetLocale) {
        const trimmedTarget = typeof targetLocale === 'string' ? targetLocale.trim() : '';
        const norm =
          trimmedTarget && trimmedTarget.toLowerCase() !== 'auto'
            ? packsMod.normalizeHostLocale(trimmedTarget)
            : currentLocale;
        customPacks.delete(norm);
      } else {
        customPacks.clear();
      }
      compileActivePack();
      if (enabled && currentLocale !== 'en') {
        scanNow();
      }
    }

    function setCollectMissing(flag) {
      collectMissing = Boolean(flag);
      return collectMissing;
    }

    function getMissingPhrases() {
      return Array.from(missingSet);
    }

    function clearMissingPhrases() {
      missingSet.clear();
    }

    function exportMissingTemplate(locale) {
      const trimmedTarget = typeof locale === 'string' ? locale.trim() : '';
      const targetLoc =
        trimmedTarget && trimmedTarget.toLowerCase() !== 'auto'
          ? packsMod.normalizeHostLocale(trimmedTarget)
          : currentLocale;
      const exact = {};
      for (const phrase of missingSet) {
        exact[phrase] = '';
      }
      return {
        meta: {
          locale: targetLoc,
          schemaVersion: 2,
          count: missingSet.size,
        },
        exact,
        patterns: [],
      };
    }

    function countLiveTracked(refs, map) {
      let n = 0;
      for (const ref of refs) {
        const obj = ref.deref();
        if (obj && map.has(obj)) n += 1;
      }
      return n;
    }

    function getConflictState() {
      return {
        detected: detectExternalConflict(),
        yieldedTo,
        policy: conflictPolicy,
      };
    }

    function getDebugState() {
      const active = Boolean(enabled && !destroyed && !yieldedTo && currentLocale !== 'en');
      return {
        enabled,
        active,
        destroyed,
        locale: currentLocale,
        configuredLocale,
        conflictPolicy,
        yieldedTo,
        conflictDetected: detectExternalConflict(),
        cacheSize: lookupCache.size,
        maxCacheSize,
        exactCount: exactMap.size,
        lowerCount: lowerMap.size,
        patternCount: compiledPatterns.length,
        trackedTextCount: countLiveTracked(trackedTextRefs, textRecords),
        trackedAttrCount: countLiveTracked(trackedAttrRefs, attrRecords),
        trackedTextRefCount: trackedTextRefs.size,
        trackedAttrRefCount: trackedAttrRefs.size,
        exemptNodeCount: exemptCount,
        sweepCount,
        collectMissing,
        missingCount: missingSet.size,
        extendedPackLoaded: Boolean(packsMod.hasExtendedPack?.(currentLocale)),
        observerCount: observers.length + shadowObservers.length + (htmlAttrBusUnsub ? 1 : 0),
        shadowObserverCount: shadowObservers.length,
        hibernatedDirty,
        flushGen,
      };
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stopObservers();
      restoreAll();
      resetConflictExemption();
      lookupCache.clear();
      exactMap.clear();
      lowerMap.clear();
      compiledPatterns = [];
      customPacks.clear();
      missingSet.clear();
      packsMod.clearExtendedPacks?.();
      yieldedTo = null;
    }

    // Initialize
    compileActivePack();
    if (enabled) {
      startObservers();
    }
    if (options.autoScan !== false && doc) {
      if (enabled && currentLocale !== 'en') {
        scanNow();
        void ensureExtendedPack(currentLocale);
      } else {
        evaluateConflictAndActivation();
      }
    } else if (enabled && currentLocale !== 'en') {
      void ensureExtendedPack(currentLocale);
    }

    return {
      scanNow,
      scheduleScan,
      translateSubtree: scanNow,
      translateText,
      setLocale,
      getLocale: () => currentLocale,
      getConfiguredLocale: () => configuredLocale,
      setEnabled,
      isEnabled: () => enabled,
      setConflictPolicy,
      getConflictState,
      mergeCustomPack,
      clearCustomPacks,
      setCollectMissing,
      getMissingPhrases,
      exportMissingTemplate,
      clearMissingPhrases,
      restoreAll,
      ensureExtendedPack: () => ensureExtendedPack(currentLocale),
      getStats: getDebugState,
      getDebugState,
      destroy,
    };
  }

  return {
    HARD_SKIP_SELECTORS,
    CHAT_PROSE_SELECTORS,
    ATTR_WHITELIST,
    looksLikeStepPathOrCmd,
    applyPatternTemplate,
    createHostI18nController,
  };
});
