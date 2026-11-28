// agy-Sag — Reading Navigation & Long Code Block Folding (UMD, zero runtime deps)
// Opt-in reading ergonomics for long Antigravity conversations:
//   1) Automatic folding for >= N-line code blocks (<pre>) with sticky header bar (lines badge, expand/collapse, copy)
//   2) Alt+ArrowUp / Alt+ArrowDown turn-to-turn keyboard navigation (never hijacks editable inputs)
//   3) Floating mini turn rail with bookmark star indicators (auto-yields to Obsidian Prism outline rail)
//   4) Zero innerHTML, non-destructive DOM attributes, zero-loop debounced MutationObserver, 100% lossless destroy()
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagReadingNav = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const RAIL_TESTID = 'ag-sag-rnav-rail';
  const OUTLINE_TESTID = 'ag-sag-rnav-outline';
  const MERMAID_MODAL_TESTID = 'ag-sag-mermaid-modal';
  const OMNI_PILL_TESTID = 'ag-sag-omni-pill';
  const CODE_BAR_ATTR = 'data-ag-sag-code-bar';
  const CODE_FOLDED_ATTR = 'data-ag-sag-code-folded';
  const CODE_ENHANCED_ATTR = 'data-ag-sag-code-enhanced';
  const CODE_WRAP_ATTR = 'data-ag-sag-code-wrap';
  const MERMAID_BTN_ATTR = 'data-ag-sag-mermaid-zoom';
  const DEFAULT_COLLAPSE_LINES = 40;
  const MIN_COLLAPSE_LINES = 20;
  const MAX_COLLAPSE_LINES = 200;

  const TRAILING_PUNCT_RE = /[.,;:!?'"`)\]}>。，；：！？》】）]+$/;
  const URL_RE = /\bhttps?:\/\/[^\s<>'"`()[\]{}]+/gi;
  const PATH_RE =
    /(?:^|[\s([{"'：:，,（【「])((?:~\/|\.\.?\/)[A-Za-z0-9._@+\-\/\\~]+|[A-Za-z]:\\[^\s<>'"`|?*()[\]{}]+|\/[A-Za-z0-9._@+\-]+\/[A-Za-z0-9._@+\-\/~]*)/g;

  function trimMatchedToken(raw) {
    return String(raw || '').replace(TRAILING_PUNCT_RE, '').trim();
  }

  function extractPlainLinksAndPaths(text) {
    const src = String(text || '');
    if (!src.trim()) return [];
    const found = [];
    const seen = new Set();
    let masked = src;

    URL_RE.lastIndex = 0;
    let m;
    while ((m = URL_RE.exec(src)) !== null && found.length < 8) {
      const raw = m[0];
      const val = trimMatchedToken(raw);
      if (!val || !/^https?:\/\/[^\s/]+/i.test(val)) continue;
      if (!seen.has(val)) {
        seen.add(val);
        found.push({ type: 'url', value: val, raw, index: m.index });
      }
      masked = masked.slice(0, m.index) + ' '.repeat(raw.length) + masked.slice(m.index + raw.length);
    }

    PATH_RE.lastIndex = 0;
    while ((m = PATH_RE.exec(masked)) !== null && found.length < 8) {
      const candidate = m[1];
      const val = trimMatchedToken(candidate);
      if (!val || val.length < 3 || val === '//' || val.startsWith('//')) continue;
      if (!seen.has(val)) {
        seen.add(val);
        found.push({ type: 'path', value: val, raw: candidate, index: m.index });
      }
    }

    found.sort((a, b) => a.index - b.index);
    return found.slice(0, 8).map(({ type, value, raw }) => ({ type, value, raw }));
  }

  function resolveDep(globalKey, relPath) {
    if (globalRoot && globalRoot[globalKey]) return globalRoot[globalKey];
    if (typeof require === 'function') {
      try {
        return require(relPath);
      } catch {
        return null;
      }
    }
    return null;
  }

  function clampCollapseLines(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_COLLAPSE_LINES;
    return Math.max(MIN_COLLAPSE_LINES, Math.min(MAX_COLLAPSE_LINES, Math.round(n)));
  }

  function countCodeLines(text) {
    const src = String(text || '');
    if (!src.trim()) return 0;
    const trimmedEnd = src.replace(/\r?\n+$/, '');
    if (!trimmedEnd) return 0;
    return trimmedEnd.split(/\r?\n/).length;
  }

  function isEditableTarget(el) {
    if (!el) return false;
    const tag = String(el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.getAttribute?.('contenteditable') === 'true') return true;
    if (el.closest?.('[contenteditable="true"], [data-lexical-editor="true"]')) return true;
    return false;
  }

  function isOwnedNode(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.getAttribute?.('data-ag-sg-owned') === '1' || node.getAttribute?.('data-ag-sag-owned') === '1') return true;
    if (node.closest?.('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"]')) return true;
    return false;
  }

  function createReadingNavController(options = {}) {
    const win = options.win || globalRoot;
    const doc = options.doc || win?.document || null;
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');
    const ctxSrc = options.contextSource || resolveDep('__agSgContextSource', './context-source.js');
    const i18n = options.i18n || resolveDep('__agSgI18n', './i18n.js');
    const styles = options.styles || resolveDep('__agSgStyles', './styles.js');

    let enabled = Boolean(options.enabled);
    let destroyed = false;
    let collapseLines = clampCollapseLines(options.collapseLines ?? DEFAULT_COLLAPSE_LINES);
    let currentTurnIndex = -1;
    let railYielded = false;
    let foldedCount = 0;
    let enhancedCount = 0;

    let railEl = null;
    let outlineEl = null;
    let outlineOpen = false;
    let outlineQuery = '';
    let outlineStarOnly = false;
    let mermaidModalEl = null;
    let mermaidZoomScale = 1;
    let omniPillEl = null;
    let allFoldedToggleState = true;
    let createdStyleEl = null;
    let keydownOff = null;
    let paneTrackOff = null;
    let omniOff = null;
    let domObserver = null;
    let domBusUnsub = null;
    let observerTimer = null;
    let pulseTimer = null;
    let pulsedEl = null;
    let activePaneEl = null;

    const userToggleState = new WeakMap(); // preEl -> boolean (true = expanded by user, false = folded by user)
    const preLineCache = new WeakMap(); // preEl -> { len, lines }
    const enhancedPres = new Set(); // track pre elements for lossless teardown
    const codeBars = new WeakMap(); // preEl -> barEl
    const mermaidBtns = new Map(); // svgEl -> btnEl
    const originalDetailsOpen = new WeakMap(); // detailsEl -> original boolean open state
    const modifiedDetails = new Set(); // track modified host <details> for lossless restore
    let lastRailSig = '';

    const safeInsert = (p, n, r) => (typeof coexist?.safeInsertBefore === 'function' ? coexist.safeInsertBefore(p, n, r) : (() => { try { r && r.parentElement === p && typeof p.insertBefore === 'function' ? p.insertBefore(n, r) : p?.appendChild?.(n); return true; } catch { return false; } })());
    const safeRemove = (n) => (typeof coexist?.safeRemoveNode === 'function' ? coexist.safeRemoveNode(n) : (() => { try { n?.remove?.(); return true; } catch { return false; } })());
    const mk = (tag, cls, txt, attrs, owned) => {
      const e = owned && coexist?.markOwnedNoTranslate ? coexist.markOwnedNoTranslate(doc.createElement(tag)) : doc.createElement(tag);
      if (cls) e.className = cls;
      if (txt !== undefined) e.textContent = txt;
      if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      return e;
    };
    const mkBtn = (cls, txt, attrs, fn, stop) => {
      const b = mk('button', cls, txt, attrs);
      b.type = 'button';
      if (fn) b.addEventListener('click', stop ? (ev) => { ev?.preventDefault?.(); ev?.stopPropagation?.(); fn(ev); } : fn);
      return b;
    };

    const pruneDetachedDetails = () => {
      for (const det of Array.from(modifiedDetails)) {
        if (!det || det.isConnected === false) {
          originalDetailsOpen.delete(det);
          modifiedDetails.delete(det);
        }
      }
    };

    function extractCodeCopyText(pre) {
      const srcEl = pre?.querySelector?.('code') || pre;
      if (!srcEl) return '';
      if (typeof srcEl.innerText === 'string' && srcEl.innerText.length > 0) return srcEl.innerText;
      return String(srcEl.textContent || '');
    }

    const isStreamingNow = () => {
      if (typeof options.isStreaming === 'function') {
        try {
          return Boolean(options.isStreaming());
        } catch {}
      }
      return Boolean(ctxSrc?.isTurnStreaming?.(doc, getScope()));
    };

    const getLang = () =>
      typeof options.getLang === 'function' ? i18n.normalizeLang(options.getLang()) : i18n.detectLang(doc, win);
    const t = (key, fallback = '') => {
      const sag = typeof i18n?.getSagStrings === 'function' ? i18n.getSagStrings(getLang()) : null;
      return sag?.[key] ?? fallback;
    };
    const getScope = () => (ctxSrc?.resolveActivePaneScope ? ctxSrc.resolveActivePaneScope(doc, activePaneEl) : doc);

    function ensureStyle() {
      if (!doc || !styles) return;
      const existing = doc.getElementById?.(styles.STYLE_ID);
      if (existing) {
        if (existing.textContent !== styles.CORE_CSS) existing.textContent = styles.CORE_CSS;
        return;
      }
      const el = doc.createElement('style');
      el.id = styles.STYLE_ID;
      el.textContent = styles.CORE_CSS;
      coexist?.markOwnedNoTranslate?.(el);
      (doc.head || doc.documentElement || doc.body)?.appendChild?.(el);
      createdStyleEl = el;
    }

    function getConversationContainer() {
      if (!doc) return null;
      const scope = getScope();
      if (scope && scope !== doc) {
        if (scope.getAttribute?.('data-testid') === 'conversation-view') return scope;
        const scopedConv = scope.querySelector?.('[data-testid="conversation-view"]') || null;
        if (scopedConv) return scopedConv;
      }
      return (
        (ctxSrc?.resolveActiveConversationView ? ctxSrc.resolveActiveConversationView(doc, scope) : null) ||
        scope?.querySelector?.('[data-testid="conversation-view"]') ||
        doc.querySelector?.('[data-testid="conversation-view"]') ||
        null
      );
    }

    function getUserTurnElements() {
      const conv = getConversationContainer();
      if (!conv || typeof conv.querySelectorAll !== 'function') return [];
      return Array.from(conv.querySelectorAll('[data-testid="user-message-bubble"]') || []);
    }

    function hasPrismNavConflict() {
      if (!doc || typeof doc.querySelector !== 'function') return false;
      return Boolean(
        doc.querySelector('.ag-cs-nav-outline-trigger, .ag-cs-nav-rail, [data-ag-prism-nav-rail="1"]')
      );
    }

    function clearPulse() {
      if (pulseTimer) {
        clearTimeout(pulseTimer);
        pulseTimer = null;
      }
      if (pulsedEl) {
        try { pulsedEl.removeAttribute?.('data-ag-sg-pulse'); } catch {}
        pulsedEl = null;
      }
    }

    function getScrollBehavior() {
      try {
        if (win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return 'auto';
      } catch {}
      return 'smooth';
    }

    function jumpToTurn(index) {
      if (destroyed || !enabled) return false;
      const turns = getUserTurnElements();
      if (!turns.length) return false;
      const clamped = Math.max(0, Math.min(turns.length - 1, Number(index)));
      const target = turns[clamped];
      if (!target) return false;

      currentTurnIndex = clamped;
      clearPulse();
      try {
        target.scrollIntoView?.({ behavior: getScrollBehavior(), block: 'center' });
      } catch {}
      try {
        target.setAttribute?.('data-ag-sg-pulse', '1');
        pulsedEl = target;
        pulseTimer = setTimeout(() => {
          clearPulse();
        }, 1400);
        pulseTimer?.unref?.();
      } catch {}
      renderRail();
      if (typeof options.onNavigateTurn === 'function') {
        try {
          options.onNavigateTurn({ index: clamped, total: turns.length, element: target });
        } catch {}
      }
      return true;
    }

    function jumpRelative(delta) {
      const turns = getUserTurnElements();
      if (!turns.length) return false;
      let nextIdx;
      if (currentTurnIndex < 0 || currentTurnIndex >= turns.length) {
        nextIdx = delta < 0 ? turns.length - 1 : 0;
      } else {
        nextIdx = Math.max(0, Math.min(turns.length - 1, currentTurnIndex + delta));
      }
      return jumpToTurn(nextIdx);
    }

    function copyCodeText(text, btn) {
      const str = String(text || '');
      const origLabel = btn && typeof btn.textContent === 'string' && btn.textContent ? btn.textContent : t('rnavCopyBtn', 'Copy');
      const show = (ok) => {
        if (!btn || destroyed || btn.isConnected === false) return;
        btn.textContent = ok ? t('rnavCopiedBtn', 'Copied ✓') : t('rnavCopyFailedBtn', 'Copy failed');
        const tm = setTimeout(() => {
          if (!destroyed && btn.isConnected !== false) btn.textContent = origLabel;
        }, 1200);
        tm?.unref?.();
      };
      const done = (r) => (r && typeof r.then === 'function' ? r.then((v) => show(v !== false), () => show(false)) : show(r !== false));
      try {
        if (typeof options.onCopyCode === 'function') return void done(options.onCopyCode(str));
        const wf = win?.navigator?.clipboard?.writeText;
        if (typeof wf !== 'function') return void show(false);
        done(wf.call(win.navigator.clipboard, str));
      } catch {
        show(false);
      }
    }

    function applyPreFoldVisual(pre, bar, isFolded, lineCount) {
      if (isFolded) {
        if (pre.getAttribute?.(CODE_FOLDED_ATTR) !== '1') pre.setAttribute?.(CODE_FOLDED_ATTR, '1');
      } else {
        if (pre.hasAttribute?.(CODE_FOLDED_ATTR)) pre.removeAttribute?.(CODE_FOLDED_ATTR);
      }
      if (bar) {
        const meta = bar.querySelector?.('[data-ag-sag-code-meta]');
        const metaTxt = i18n?.formatTemplate
          ? i18n.formatTemplate(t('rnavLinesBadge', '{n} lines'), { n: lineCount })
          : `${lineCount} lines`;
        if (meta && meta.textContent !== metaTxt) meta.textContent = metaTxt;

        const toggleBtn = bar.querySelector?.('[data-ag-sag-code-toggle]');
        if (toggleBtn) {
          const lbl = isFolded ? t('rnavExpandBtn', 'Expand') : t('rnavCollapseBtn', 'Collapse');
          if (toggleBtn.textContent !== lbl) toggleBtn.textContent = lbl;
          toggleBtn.setAttribute?.('aria-expanded', String(!isFolded));
        }
      }
    }

    function cleanupEnhancedCodeBlocks() {
      for (const pre of Array.from(enhancedPres)) {
        const bar = codeBars.get(pre);
        safeRemove(bar);
        codeBars.delete(pre);
        try { pre.removeAttribute?.(CODE_FOLDED_ATTR); } catch {}
        try { pre.removeAttribute?.(CODE_ENHANCED_ATTR); } catch {}
        try { pre.removeAttribute?.(CODE_WRAP_ATTR); } catch {}
        enhancedPres.delete(pre);
      }
      if (doc && typeof doc.querySelectorAll === 'function') {
        try {
          doc.querySelectorAll(`[${CODE_BAR_ATTR}="1"]`).forEach((n) => safeRemove(n));
          doc.querySelectorAll(`[${CODE_FOLDED_ATTR}]`).forEach((n) => n.removeAttribute?.(CODE_FOLDED_ATTR));
          doc.querySelectorAll(`[${CODE_ENHANCED_ATTR}]`).forEach((n) => n.removeAttribute?.(CODE_ENHANCED_ATTR));
          doc.querySelectorAll(`[${CODE_WRAP_ATTR}]`).forEach((n) => n.removeAttribute?.(CODE_WRAP_ATTR));
        } catch {}
      }
      foldedCount = 0;
      enhancedCount = 0;
    }

    function collectTargetContainers() {
      const out = [];
      const conv = getConversationContainer();
      if (conv) out.push({ el: conv, isConv: true });
      const scope = getScope();
      const sel = '[data-testid="artifact-view"], [data-testid="auxiliary-pane"], [data-testid="terminal-panel"]';
      const auxNodes =
        scope?.querySelectorAll?.(sel) ||
        doc?.querySelectorAll?.(sel) ||
        [];
      for (const node of auxNodes) {
        if (node && !out.some((x) => x.el === node)) out.push({ el: node, isConv: false });
      }
      return out;
    }

    function togglePreWithScrollCompensation(pre, bar) {
      const currentlyFolded = pre.getAttribute?.(CODE_FOLDED_ATTR) === '1';
      const nextFolded = !currentlyFolded;
      const vp = nextFolded ? ctxSrc?.findConversationScrollViewport?.(doc, getScope()) : null;
      const prevH = Number(pre.offsetHeight) || 0;
      const prevTop = typeof pre.getBoundingClientRect === 'function' ? pre.getBoundingClientRect()?.top ?? 0 : 0;

      userToggleState.set(pre, currentlyFolded); // true means user expanded
      applyPreFoldVisual(pre, bar, nextFolded, countCodeLines(pre.textContent || ''));
      recountFolded();

      // Anchor scrollTop compensation when folding a tall block whose top scrolled above viewport
      if (nextFolded && prevTop < 0 && vp && typeof vp.scrollTop === 'number' && prevH > 0) {
        const measuredAfter = Number(pre.offsetHeight) || 0;
        const afterH = measuredAfter > 0 && measuredAfter < prevH ? measuredAfter : Math.min(prevH, 220);
        const delta = Math.max(0, prevH - afterH);
        if (delta > 0) {
          try {
            vp.scrollTop = Math.max(0, vp.scrollTop - delta);
          } catch {}
        }
      }
    }

    function scanCodeBlocks() {
      if (destroyed || !enabled) return { enhanced: 0, folded: 0 };
      const containers = collectTargetContainers();
      if (!containers.length) return { enhanced: 0, folded: 0 };
      ensureStyle();

      // Prune detached pre elements & modifiedDetails
      for (const pre of Array.from(enhancedPres)) {
        if (pre.isConnected === false) {
          safeRemove(codeBars.get(pre));
          codeBars.delete(pre);
          preLineCache.delete(pre);
          enhancedPres.delete(pre);
        }
      }
      pruneDetachedDetails();

      const streaming = isStreamingNow();
      let curEnhanced = 0;
      let curFolded = 0;
      const seenPres = new Set();

      for (const { el: rootEl, isConv } of containers) {
        const pres = Array.from(rootEl.querySelectorAll?.('pre') || []);
        const lastIdx = pres.length - 1;
        for (let idx = 0; idx < pres.length; idx += 1) {
          const pre = pres[idx];
          if (!pre || seenPres.has(pre) || isOwnedNode(pre)) continue;
          seenPres.add(pre);
          const isStreamingTail = streaming && isConv && idx === lastIdx;
          // Streaming guard: never interrupt the active tail code block while assistant is still generating
          if (isStreamingTail && !enhancedPres.has(pre)) continue;

          const rawText = String(pre.textContent || '');
          const textLen = rawText.length;
          let lines;
          const cached = !isStreamingTail && enhancedPres.has(pre) ? preLineCache.get(pre) : null;
          if (cached && cached.len === textLen) {
            lines = cached.lines;
          } else {
            lines = countCodeLines(rawText);
            if (!isStreamingTail) preLineCache.set(pre, { len: textLen, lines });
          }

          if (lines < collapseLines) {
            if (enhancedPres.has(pre)) {
              safeRemove(codeBars.get(pre));
              codeBars.delete(pre);
              preLineCache.delete(pre);
              pre.removeAttribute?.(CODE_FOLDED_ATTR);
              pre.removeAttribute?.(CODE_ENHANCED_ATTR);
              pre.removeAttribute?.(CODE_WRAP_ATTR);
              enhancedPres.delete(pre);
            }
            continue;
          }

          curEnhanced += 1;
          let bar = codeBars.get(pre) || null;
          if (!bar || bar.isConnected === false) {
            bar = mk('div', 'ag-sag-code-bar', undefined, { [CODE_BAR_ATTR]: '1' }, true);
            const meta = mk('span', 'ag-sag-code-meta', undefined, { 'data-ag-sag-code-meta': '1' });
            const acts = mk('div', 'ag-sag-code-acts');
            const toggleBtn = mkBtn('ag-sag-code-btn', undefined, { 'data-ag-sag-code-toggle': '1' }, () => togglePreWithScrollCompensation(pre, bar), true);
            const wrapBtn = mkBtn('ag-sag-code-btn', t('rnavWrapBtn', 'Wrap'), { 'data-ag-sag-code-wrap-btn': '1', 'aria-pressed': 'false' }, () => {
              const w = pre.getAttribute?.(CODE_WRAP_ATTR) === '1';
              w ? pre.removeAttribute?.(CODE_WRAP_ATTR) : pre.setAttribute?.(CODE_WRAP_ATTR, '1');
              wrapBtn.setAttribute('aria-pressed', String(!w));
            }, true);
            const copyBtn = mkBtn('ag-sag-code-btn', t('rnavCopyBtn', 'Copy'), { 'data-ag-sag-code-copy': '1' }, () => copyCodeText(extractCodeCopyText(pre), copyBtn), true);
            acts.appendChild(toggleBtn);
            acts.appendChild(wrapBtn);
            acts.appendChild(copyBtn);
            bar.appendChild(meta);
            bar.appendChild(acts);
            if (pre.parentElement) safeInsert(pre.parentElement, bar, pre);
            codeBars.set(pre, bar);
            enhancedPres.add(pre);
            pre.setAttribute?.(CODE_ENHANCED_ATTR, '1');
          }

          const userExpanded = userToggleState.has(pre) ? Boolean(userToggleState.get(pre)) : false;
          const shouldFold = !userExpanded;
          if (shouldFold) curFolded += 1;
          applyPreFoldVisual(pre, bar, shouldFold, lines);
        }
      }

      enhancedCount = curEnhanced;
      foldedCount = curFolded;
      return { enhanced: enhancedCount, folded: foldedCount };
    }

    function restoreModifiedDetails() {
      for (const det of Array.from(modifiedDetails)) {
        if (det && det.isConnected !== false && originalDetailsOpen.has(det)) {
          try {
            det.open = Boolean(originalDetailsOpen.get(det));
          } catch {}
        }
        originalDetailsOpen.delete(det);
        modifiedDetails.delete(det);
      }
    }

    function syncFoldButtonsUi() {
      const railFoldBtn = railEl?.querySelector?.('[data-ag-sag-rnav-act="fold-all"]');
      if (railFoldBtn) {
        railFoldBtn.textContent = allFoldedToggleState ? '⊞' : '⊟';
        railFoldBtn.setAttribute?.('aria-pressed', String(allFoldedToggleState));
      }
      const outFoldBtn = outlineEl?.querySelector?.('[data-testid="ag-sag-rnav-outline-fold"]');
      if (outFoldBtn) {
        outFoldBtn.textContent = allFoldedToggleState
          ? t('rnavExpandStepsBtn', '⊞ Expand Steps')
          : t('rnavFoldStepsBtn', '⊟ Fold Steps');
        outFoldBtn.setAttribute?.('aria-pressed', String(allFoldedToggleState));
      }
    }

    function toggleFoldAllStepsAndCode(forceFold = null) {
      const targetFold = typeof forceFold === 'boolean' ? forceFold : !allFoldedToggleState;
      allFoldedToggleState = targetFold;
      for (const pre of enhancedPres) {
        if (pre.isConnected === false) continue;
        const bar = codeBars.get(pre);
        userToggleState.set(pre, !targetFold);
        applyPreFoldVisual(pre, bar, targetFold, countCodeLines(pre.textContent || ''));
      }
      recountFolded();
      const conv = getConversationContainer();
      let toggledSteps = 0;
      if (conv && typeof conv.querySelectorAll === 'function') {
        const detailsList = conv.querySelectorAll('details') || [];
        for (const det of detailsList) {
          if (isOwnedNode(det)) continue;
          try {
            if (!originalDetailsOpen.has(det)) {
              originalDetailsOpen.set(det, Boolean(det.open));
            }
            modifiedDetails.add(det);
            det.open = !targetFold;
            toggledSteps += 1;
          } catch {}
        }
        const triggers =
          conv.querySelectorAll('[data-testid="thinking-collapsible-trigger"], [data-testid="tool-call-collapsible-trigger"]') || [];
        for (const trig of triggers) {
          if (isOwnedNode(trig)) continue;
          const exp = trig.getAttribute?.('aria-expanded');
          if ((targetFold && exp === 'true') || (!targetFold && exp === 'false')) {
            try {
              trig.click?.();
              toggledSteps += 1;
            } catch {}
          }
        }
      }
      syncFoldButtonsUi();
      return { folded: targetFold, foldedCodeBlocks: foldedCount, toggledSteps };
    }

    function closeMermaidModal() {
      safeRemove(mermaidModalEl);
      mermaidModalEl = null;
      mermaidZoomScale = 1;
    }

    function openMermaidZoom(svgEl) {
      if (!svgEl || !doc?.body || destroyed) return false;
      closeMermaidModal();
      ensureStyle();
      mermaidZoomScale = 1;

      const overlay = mk('div', 'ag-sag-mermaid-modal', undefined, { 'data-testid': MERMAID_MODAL_TESTID, role: 'dialog' }, true);
      overlay.addEventListener('click', (ev) => { if (ev?.target === overlay) closeMermaidModal(); });
      const box = mk('div', 'ag-sag-mermaid-box');
      const head = mk('div', 'ag-sag-mermaid-head');
      const ttl = mk('strong', null, t('rnavMermaidZoom', 'Mermaid Diagram'));
      const ctrls = mk('div', 'ag-sag-code-acts');
      const stage = mk('div', 'ag-sag-mermaid-stage');
      const canvas = mk('div', 'ag-sag-mermaid-canvas');
      const cloned = typeof svgEl.cloneNode === 'function' ? svgEl.cloneNode(true) : null;
      if (cloned) canvas.appendChild(cloned);
      stage.appendChild(canvas);

      const scaleLbl = mk('span', 'ag-sag-code-meta', '100%');
      const applyScale = (next) => {
        mermaidZoomScale = Math.max(0.5, Math.min(3, Math.round(next * 100) / 100));
        if (canvas.style) canvas.style.transform = `scale(${mermaidZoomScale})`;
        scaleLbl.textContent = `${Math.round(mermaidZoomScale * 100)}%`;
      };
      const mBtn = (txt, act, fn) => mkBtn('ag-sag-code-btn', txt, { 'data-ag-sag-mermaid-act': act }, fn, true);

      ctrls.appendChild(mBtn('-', 'zoom-out', () => applyScale(mermaidZoomScale - 0.25)));
      ctrls.appendChild(scaleLbl);
      ctrls.appendChild(mBtn('+', 'zoom-in', () => applyScale(mermaidZoomScale + 0.25)));
      ctrls.appendChild(mBtn('100%', 'zoom-reset', () => applyScale(1)));
      ctrls.appendChild(mBtn(t('rnavMermaidExportSvg', 'Download SVG'), 'export-svg', () => {
        try {
          const Serializer = win?.XMLSerializer || globalThis.XMLSerializer;
          const rawSvg = Serializer ? new Serializer().serializeToString(svgEl) : String(svgEl.outerHTML || '');
          const BlobCtor = win?.Blob || globalThis.Blob;
          const UrlApi = win?.URL || globalThis.URL;
          if (!rawSvg || !BlobCtor || !UrlApi?.createObjectURL) return;
          const url = UrlApi.createObjectURL(new BlobCtor([rawSvg], { type: 'image/svg+xml;charset=utf-8' }));
          const a = mk('a', null, undefined, null, true);
          a.href = url;
          a.download = 'mermaid-diagram.svg';
          if (a.style) a.style.display = 'none';
          doc.body.appendChild(a);
          a.click?.();
          safeRemove(a);
          const tm = setTimeout(() => { try { UrlApi.revokeObjectURL?.(url); } catch {} }, 1000);
          tm?.unref?.();
        } catch {}
      }));
      ctrls.appendChild(mBtn(t('rnavClose', 'Close'), 'close', closeMermaidModal));

      head.appendChild(ttl);
      head.appendChild(ctrls);
      box.appendChild(head);
      box.appendChild(stage);
      overlay.appendChild(box);
      doc.body.appendChild(overlay);
      mermaidModalEl = overlay;
      return true;
    }

    function cleanupMermaidButtons() {
      closeMermaidModal();
      for (const [svg, btn] of mermaidBtns.entries()) {
        safeRemove(btn);
        mermaidBtns.delete(svg);
      }
      if (doc && typeof doc.querySelectorAll === 'function') {
        try {
          doc.querySelectorAll(`[${MERMAID_BTN_ATTR}="1"]`).forEach((n) => safeRemove(n));
        } catch {}
      }
    }

    function scanMermaidDiagrams() {
      if (destroyed || !enabled) return 0;
      const containers = collectTargetContainers();
      if (!containers.length) return 0;
      for (const [svg, btn] of mermaidBtns.entries()) {
        if (svg.isConnected === false) {
          safeRemove(btn);
          mermaidBtns.delete(svg);
        }
      }
      let count = 0;
      for (const { el: rootEl } of containers) {
        const svgs = Array.from(rootEl.querySelectorAll?.('svg[id^="mermaid"], .mermaid svg') || []);
        for (const svg of svgs) {
          if (!svg || isOwnedNode(svg)) continue;
          count += 1;
          const existing = mermaidBtns.get(svg);
          if (existing && existing.isConnected !== false) continue;
          const zTitle = t('rnavMermaidZoom', 'Zoom Mermaid Diagram');
          const btn = mk('button', 'ag-sag-code-btn ag-sag-mermaid-btn', '⤢', { [MERMAID_BTN_ATTR]: '1', 'aria-label': zTitle }, true);
          btn.type = 'button';
          btn.title = zTitle;
          btn.addEventListener('click', (ev) => { ev?.preventDefault?.(); ev?.stopPropagation?.(); openMermaidZoom(svg); });
          if (svg.parentElement) safeInsert(svg.parentElement, btn, svg);
          mermaidBtns.set(svg, btn);
        }
      }
      return count;
    }

    function recountFolded() {
      let f = 0;
      for (const pre of enhancedPres) {
        if (pre.isConnected !== false && pre.getAttribute?.(CODE_FOLDED_ATTR) === '1') f += 1;
      }
      foldedCount = f;
    }

    function removeOutline() {
      safeRemove(outlineEl);
      outlineEl = null;
      outlineOpen = false;
    }

    function removeRail() {
      safeRemove(railEl);
      railEl = null;
      lastRailSig = '';
      removeOutline();
    }

    function renderOutlinePopover(focusInput = false) {
      if (destroyed || !enabled || !outlineOpen || !doc?.body) {
        safeRemove(outlineEl);
        outlineEl = null;
        return;
      }
      ensureStyle();
      const turns = getUserTurnElements();
      const starred = getStarredTurnSet();

      if (!outlineEl || outlineEl.isConnected === false) {
        outlineEl = coexist?.markOwnedNoTranslate
          ? coexist.markOwnedNoTranslate(doc.createElement('div'))
          : doc.createElement('div');
        outlineEl.className = 'ag-sag-rnav-outline';
        outlineEl.setAttribute('data-testid', OUTLINE_TESTID);
        doc.body.appendChild(outlineEl);
      }

      let inp = outlineEl.querySelector?.('[data-testid="ag-sag-rnav-outline-input"]');
      let listBox = outlineEl.querySelector?.('[data-testid="ag-sag-rnav-outline-list"]');
      let starBtn = outlineEl.querySelector?.('[data-testid="ag-sag-rnav-outline-star"]');

      if (!inp || !listBox) {
        while (outlineEl.firstChild) outlineEl.removeChild(outlineEl.firstChild);
        const head = mk('div', 'ag-sag-rnav-outline-head');
        inp = mk('input', 'ag-sag-search-input', undefined, { 'data-testid': 'ag-sag-rnav-outline-input' });
        inp.type = 'search';
        inp.placeholder = t('rnavOutlinePlaceholder', 'Filter turns (Enter to jump)…');
        inp.value = outlineQuery;
        inp.addEventListener('input', () => {
          outlineQuery = inp.value;
          populateOutlineList(listBox, getUserTurnElements(), getStarredTurnSet());
        });
        inp.addEventListener('keydown', (ev) => {
          if (ev?.key === 'Escape') { ev.preventDefault?.(); removeOutline(); return; }
          if (ev?.key === 'Enter') {
            ev.preventDefault?.();
            const firstItem = listBox.querySelector?.('[data-ag-sag-outline-idx]');
            const idx = firstItem ? Number(firstItem.getAttribute('data-ag-sag-outline-idx')) : NaN;
            if (Number.isFinite(idx)) { jumpToTurn(idx); removeOutline(); }
          }
        });

        starBtn = mkBtn('ag-sag-code-btn', undefined, { 'data-testid': 'ag-sag-rnav-outline-star' }, () => {
          outlineStarOnly = !outlineStarOnly;
          starBtn.setAttribute('aria-pressed', String(outlineStarOnly));
          populateOutlineList(listBox, getUserTurnElements(), getStarredTurnSet());
        });
        const foldStepsBtn = mkBtn('ag-sag-code-btn', undefined, { 'data-testid': 'ag-sag-rnav-outline-fold' }, () => toggleFoldAllStepsAndCode());
        foldStepsBtn.title = t('rnavFoldAllBtn', 'Toggle fold all code blocks & steps');
        const closeBtn = mkBtn('ag-sag-code-btn', '×', null, removeOutline);
        closeBtn.title = t('rnavClose', 'Close');

        head.appendChild(inp);
        head.appendChild(starBtn);
        head.appendChild(foldStepsBtn);
        head.appendChild(closeBtn);
        outlineEl.appendChild(head);

        listBox = mk('div', 'ag-sag-rnav-outline-list', undefined, { 'data-testid': 'ag-sag-rnav-outline-list' });
        outlineEl.appendChild(listBox);
      }

      if (starBtn) {
        starBtn.textContent = `★ ${t('rnavOutlineStarOnly', 'Starred')}`;
        starBtn.setAttribute('aria-pressed', String(outlineStarOnly));
      }
      syncFoldButtonsUi();
      populateOutlineList(listBox, turns, starred);
      if (focusInput) {
        try { inp?.focus?.(); } catch {}
      }
    }

    function populateOutlineList(listBox, turns, starred) {
      if (!listBox) return;
      while (listBox.firstChild) listBox.removeChild(listBox.firstChild);
      const q = String(outlineQuery || '').trim().toLowerCase();
      const useChapters = turns.length >= 15;
      let lastChapter = -1;
      let matched = 0;
      for (let i = 0; i < turns.length; i += 1) {
        const turnNum = i + 1;
        const isStar = starred.has(turnNum);
        if (outlineStarOnly && !isStar) continue;
        const rawText = String(turns[i]?.textContent || '').replace(/\s+/g, ' ').trim();
        if (q && !rawText.toLowerCase().includes(q) && !`#${turnNum}`.includes(q)) continue;
        matched += 1;
        if (useChapters) {
          const chapStart = Math.floor(i / 10) * 10 + 1;
          if (chapStart !== lastChapter) {
            lastChapter = chapStart;
            const chapEnd = Math.min(chapStart + 9, turns.length);
            const hdr = doc.createElement('div');
            hdr.className = 'ag-sag-rnav-outline-chapter';
            hdr.setAttribute('data-ag-sag-outline-chapter', `§${chapStart}`);
            hdr.textContent = `§${chapStart} · #${chapStart}–#${chapEnd}`;
            listBox.appendChild(hdr);
          }
        }
        const row = doc.createElement('button');
        row.type = 'button';
        row.className = 'ag-sag-rnav-outline-item';
        row.setAttribute('data-ag-sag-outline-idx', String(i));
        if (i === currentTurnIndex) row.setAttribute('data-active', '1');
        row.textContent = `#${turnNum}${isStar ? ' ★' : ''} ${rawText.slice(0, 72) || '(empty)'}`;
        row.addEventListener('click', () => {
          jumpToTurn(i);
          removeOutline();
        });
        listBox.appendChild(row);
      }
      if (matched === 0) {
        const empty = doc.createElement('div');
        empty.className = 'ag-sag-badge-note';
        empty.textContent = t('rnavOutlineEmpty', 'No matching turns');
        listBox.appendChild(empty);
      }
    }

    function openOutlineSearch() {
      if (destroyed || !enabled) return false;
      outlineOpen = true;
      renderOutlinePopover(true);
      return true;
    }

    function getStarredTurnSet() {
      if (typeof options.getStarredTurns !== 'function') return new Set();
      try {
        const res = options.getStarredTurns();
        if (res instanceof Set) return res;
        if (Array.isArray(res)) return new Set(res.map((n) => Number(n)));
      } catch {}
      return new Set();
    }

    function sampleRailIndices(total, activeIdx, starredSet) {
      const MAX_DOTS = 80;
      if (total <= MAX_DOTS) {
        const all = new Array(total);
        for (let i = 0; i < total; i += 1) all[i] = i;
        return all;
      }
      const keep = new Set([0, total - 1]);
      for (const tn of starredSet) {
        const idx = Number(tn) - 1;
        if (idx >= 0 && idx < total) keep.add(idx);
      }
      const anchor = activeIdx >= 0 && activeIdx < total ? activeIdx : total - 1;
      const winStart = Math.max(0, anchor - 20);
      const winEnd = Math.min(total - 1, anchor + 20);
      for (let i = winStart; i <= winEnd; i += 1) keep.add(i);
      const remaining = MAX_DOTS - keep.size;
      if (remaining > 0) {
        const step = (total - 1) / (remaining + 1);
        for (let k = 1; k <= remaining && keep.size < MAX_DOTS; k += 1) {
          keep.add(Math.min(total - 1, Math.max(0, Math.round(k * step))));
        }
      }
      return Array.from(keep).sort((a, b) => a - b);
    }

    function renderRail() {
      if (destroyed || !enabled || !doc || !doc.body) {
        removeRail();
        railYielded = false;
        return;
      }

      if (hasPrismNavConflict()) {
        railYielded = true;
        removeRail();
        return;
      }
      railYielded = false;

      const turns = getUserTurnElements();
      if (turns.length < 2) {
        removeRail();
        return;
      }

      const starred = getStarredTurnSet();
      const starredSig = [...starred].sort((a, b) => a - b).join(',');
      const railSig = `${turns.length}:${currentTurnIndex}:${starredSig}`;
      if (railEl && railEl.isConnected !== false && railSig === lastRailSig) {
        return;
      }

      ensureStyle();
      if (!railEl || railEl.isConnected === false) {
        railEl = coexist?.markOwnedNoTranslate
          ? coexist.markOwnedNoTranslate(doc.createElement('nav'))
          : doc.createElement('nav');
        railEl.className = 'ag-sag-rnav-rail';
        railEl.setAttribute('data-testid', RAIL_TESTID);
        railEl.setAttribute('aria-label', t('rnavRailLabel', 'Turn Navigation'));
        doc.body.appendChild(railEl);
      }

      lastRailSig = railSig;
      while (railEl.firstChild) railEl.removeChild(railEl.firstChild);

      const addStep = (txt, title, attrs, fn) => {
        const b = mkBtn('ag-sag-rnav-step', txt, attrs, fn);
        b.title = title;
        railEl.appendChild(b);
      };
      addStep('☰', t('rnavOutlineBtn', 'Search Outline (Alt+F)'), { 'data-ag-sag-rnav-act': 'outline' }, () => { outlineOpen = !outlineOpen; renderOutlinePopover(outlineOpen); });
      addStep(allFoldedToggleState ? '⊞' : '⊟', t('rnavFoldAllBtn', 'Toggle fold all code blocks & steps'), { 'data-ag-sag-rnav-act': 'fold-all', 'aria-pressed': allFoldedToggleState }, () => toggleFoldAllStepsAndCode());
      addStep('↑', t('rnavPrevTip', 'Previous turn (Alt+↑)'), { 'data-ag-sag-rnav-step': 'prev' }, () => jumpRelative(-1));

      const dotsWrap = mk('div', 'ag-sag-rnav-dots');
      const showChapters = turns.length >= 15;
      let chapterTicksInserted = 0;
      const dotIndices = sampleRailIndices(turns.length, currentTurnIndex, starred);
      for (let d = 0; d < dotIndices.length; d += 1) {
        const i = dotIndices[d];
        const turnNum = i + 1;
        const isChapterStart = showChapters && (turnNum - 1) % 10 === 0;
        const chapLabel = isChapterStart ? `§${turnNum}` : '';
        if (isChapterStart && chapterTicksInserted < 12) {
          dotsWrap.appendChild(mk('span', 'ag-sag-rnav-chapter', chapLabel, { 'data-ag-sag-rnav-chapter': chapLabel, 'aria-hidden': 'true' }));
          chapterTicksInserted += 1;
        }
        const snippet = String(turns[i]?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 64);
        const title = `${chapLabel ? `${chapLabel} · ` : ''}#${turnNum}${starred.has(turnNum) ? ' ★' : ''}: ${snippet}`;
        const attrs = { 'data-ag-sag-rnav-turn': turnNum, 'aria-label': title };
        if (isChapterStart) attrs['data-ag-sag-chapter'] = chapLabel;
        if (starred.has(turnNum)) attrs['data-starred'] = '1';
        if (i === currentTurnIndex) attrs['data-active'] = '1';
        const dot = mkBtn('ag-sag-rnav-dot', undefined, attrs, () => jumpToTurn(i));
        dot.title = title;
        dotsWrap.appendChild(dot);
      }
      railEl.appendChild(dotsWrap);

      addStep('↓', t('rnavNextTip', 'Next turn (Alt+↓)'), { 'data-ag-sag-rnav-step': 'next' }, () => jumpRelative(1));
      addStep('⤓', t('rnavBottomTip', 'Scroll to bottom'), { 'data-ag-sag-rnav-step': 'bottom' }, () => scrollToBottom());

      if (outlineOpen) renderOutlinePopover(false);
    }

    function findScopedScrollViewport() {
      const scope = getScope();
      const conv = getConversationContainer();
      const ok = (el) => Boolean(el && el.isConnected !== false);
      const hit =
        conv?.querySelector?.('[data-testid="autoscroll-viewport"]') ||
        (scope && scope !== doc ? scope.querySelector?.('[data-testid="autoscroll-viewport"]') : null);
      if (ok(hit)) return hit;
      const canScroll = (el) => {
        if (!ok(el) || (Number(el.scrollHeight) || 0) <= (Number(el.clientHeight) || 0) + 20) return false;
        try {
          const ov = String((win?.getComputedStyle || doc?.defaultView?.getComputedStyle)?.(el)?.overflowY || '');
          if (ov && !/(auto|scroll|overlay)/.test(ov)) return false;
        } catch {}
        return true;
      };
      if (conv) {
        if (canScroll(conv)) return conv;
        // Bounded BFS (depth <= 4, max 60 nodes) instead of unbounded conv.querySelectorAll('*')
        const queue = [];
        const kids = conv.children || [];
        for (let i = 0; i < kids.length; i += 1) queue.push([kids[i], 1]);
        let visited = 0;
        while (queue.length > 0 && visited < 60) {
          const [el, depth] = queue.shift();
          visited += 1;
          if (canScroll(el)) return el;
          if (depth < 4 && el?.children?.length) {
            for (let j = 0; j < el.children.length && visited + queue.length < 120; j += 1) {
              queue.push([el.children[j], depth + 1]);
            }
          }
        }
        return conv;
      }
      return scope && scope !== doc ? scope : null;
    }

    function scrollToBottom() {
      if (destroyed || !enabled) return false;
      const vp = findScopedScrollViewport();
      if (!vp) return false;
      const targetTop = Math.max(0, Number(vp.scrollHeight) || 0);
      if (typeof vp.scrollTo === 'function') {
        try {
          vp.scrollTo({ top: targetTop, behavior: getScrollBehavior() });
          return true;
        } catch {}
      }
      try {
        vp.scrollTop = targetTop;
        return true;
      } catch {
        return false;
      }
    }

    function removeOmniPill() {
      safeRemove(omniPillEl);
      omniPillEl = null;
      if (doc && typeof doc.querySelectorAll === 'function') {
        try {
          doc.querySelectorAll(`[data-testid="${OMNI_PILL_TESTID}"]`).forEach((n) => safeRemove(n));
        } catch {}
      }
    }

    function openExternalUrlSafe(url) {
      const clean = String(url || '').trim();
      if (!/^https?:\/\//i.test(clean)) return false;
      try {
        if (typeof win?.open === 'function') {
          win.open(clean, '_blank', 'noopener,noreferrer');
          return true;
        }
      } catch {}
      try {
        if (doc?.body && typeof doc.createElement === 'function') {
          const a = coexist?.markOwnedNoTranslate ? coexist.markOwnedNoTranslate(doc.createElement('a')) : doc.createElement('a');
          a.href = clean;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          if (a.style) a.style.display = 'none';
          doc.body.appendChild(a);
          a.click?.();
          safeRemove(a);
          return true;
        }
      } catch {}
      return false;
    }

    function renderOmniPill(items, anchorEv = null, anchorEl = null) {
      if (destroyed || !enabled || !doc?.body || !Array.isArray(items) || items.length === 0) {
        removeOmniPill();
        return false;
      }
      removeOmniPill();
      ensureStyle();

      const pill = mk('div', 'ag-sag-omni-pill', undefined, {
        'data-ag-sg-owned': '1',
        'data-ag-sag-owned': '1',
        'data-ag-no-i18n': '1',
        'data-testid': OMNI_PILL_TESTID,
        role: 'toolbar',
      }, true);
      const primary = items[0];
      const preview = mk('span', 'ag-sag-code-meta', primary.value.length > 44 ? `${primary.value.slice(0, 41)}…` : primary.value);
      preview.title = primary.value;
      pill.appendChild(preview);
      if (primary.type === 'url') {
        pill.appendChild(mkBtn('ag-sag-code-btn', t('rnavOpenLinkBtn', 'Open Link'), { 'data-ag-sag-omni-act': 'open-url' }, () => { openExternalUrlSafe(primary.value); removeOmniPill(); }, true));
      }
      const copyBtn = mkBtn(
        'ag-sag-code-btn',
        primary.type === 'path' ? t('rnavCopyPathBtn', 'Copy Path') : t('rnavCopyBtn', 'Copy'),
        { 'data-ag-sag-omni-act': primary.type === 'path' ? 'copy-path' : 'copy-url' },
        () => copyCodeText(primary.value, copyBtn),
        true
      );
      pill.appendChild(copyBtn);
      const closeBtn = mkBtn('ag-sag-code-btn', '×', { 'data-ag-sag-omni-act': 'close' }, removeOmniPill, true);
      closeBtn.title = t('rnavClose', 'Close');
      pill.appendChild(closeBtn);

      if (pill.style) {
        const vw = Number(win?.innerWidth) || 1200;
        const vh = Number(win?.innerHeight) || 800;
        const rect = typeof anchorEl?.getBoundingClientRect === 'function' ? anchorEl.getBoundingClientRect() : null;
        const rawX = Number.isFinite(anchorEv?.clientX) ? anchorEv.clientX : rect ? rect.left + 12 : 24;
        const rawY = Number.isFinite(anchorEv?.clientY) ? anchorEv.clientY - 40 : rect ? rect.top - 36 : 24;
        Object.assign(pill.style, {
          position: 'fixed',
          left: `${Math.max(12, Math.min(vw - 260, Math.round(rawX)))}px`,
          top: `${Math.max(12, Math.min(vh - 48, Math.round(rawY)))}px`,
          zIndex: '2147483050',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '999px',
          border: '1px solid var(--border,rgba(148,163,184,0.3))',
          background: 'var(--popover,var(--card,#18181f))',
          color: 'var(--foreground,#f2f2f5)',
          boxShadow: '0 8px 24px -8px rgba(0,0,0,0.45)',
        });
      }

      doc.body.appendChild(pill);
      omniPillEl = pill;
      return true;
    }

    function handleConversationTextAction(ev) {
      if (destroyed || !enabled || !doc) return;
      const target = ev?.target;
      if (!target || target.nodeType !== 1) return;
      if (omniPillEl && (target === omniPillEl || omniPillEl.contains?.(target) || target.closest?.(`[data-testid="${OMNI_PILL_TESTID}"]`))) {
        return;
      }
      if (isOwnedNode(target) || isEditableTarget(target)) {
        removeOmniPill();
        return;
      }
      if (target.closest?.('a, button')) {
        removeOmniPill();
        return;
      }
      const msgHost = target.closest?.(
        '[data-testid="agent-response"], [data-testid="planner-response-text"], [data-testid="user-message-bubble"]'
      );
      if (!msgHost) return;

      let candidate = '';
      try {
        const sel = typeof win?.getSelection === 'function' ? win.getSelection() : typeof doc?.getSelection === 'function' ? doc.getSelection() : null;
        const selText = String(sel?.toString?.() || '').trim();
        if (selText && selText.length <= 2000) candidate = selText;
      } catch {}

      if (!candidate && ev?.type === 'click') {
        const elText = String(target.textContent || '').trim();
        if (elText.length > 0 && elText.length <= 280) candidate = elText;
      }

      if (!candidate) return;
      const hits = extractPlainLinksAndPaths(candidate);
      if (hits.length > 0) {
        renderOmniPill(hits, ev, target);
      } else {
        removeOmniPill();
      }
    }

    function onKeyDown(ev) {
      if (destroyed || !enabled) return;
      const key = String(ev?.key || '');
      if (key === 'Escape') {
        if (omniPillEl) {
          removeOmniPill();
          ev.preventDefault?.();
          return;
        }
        if (mermaidModalEl) {
          closeMermaidModal();
          ev.preventDefault?.();
          return;
        }
        if (outlineOpen) {
          removeOutline();
          ev.preventDefault?.();
          return;
        }
      }
      if (!ev?.altKey || ev?.ctrlKey || ev?.metaKey || ev?.shiftKey) return;
      if (isEditableTarget(ev?.target)) return;
      if (key === 'ArrowUp') {
        if (jumpRelative(-1)) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
        }
      } else if (key === 'ArrowDown') {
        if (jumpRelative(1)) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
        }
      } else if (key.toLowerCase() === 'f' || String(ev?.code || '') === 'KeyF') {
        if (openOutlineSearch()) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
        }
      }
    }

    function scheduleSync() {
      if (destroyed || !enabled) return;
      if (observerTimer) {
        clearTimeout(observerTimer);
        observerTimer = null;
      }
      const delayMs = isStreamingNow() ? 350 : 200;
      observerTimer = setTimeout(() => {
        observerTimer = null;
        if (destroyed || !enabled) return;
        if (coexist?.isWindowHibernated?.(doc, win, false)) return;
        scanCodeBlocks();
        scanMermaidDiagrams();
        renderRail();
      }, delayMs);
      observerTimer?.unref?.();
    }

    function attachListeners() {
      if (!doc || keydownOff) return;
      doc.addEventListener?.('keydown', onKeyDown, true);
      keydownOff = () => doc.removeEventListener?.('keydown', onKeyDown, true);

      if (ctxSrc?.findPaneRootForNode) {
        const onPaneFocus = (ev) => {
          if (destroyed || !enabled || !ev?.target || isOwnedNode(ev.target)) return;
          const pane = ctxSrc.findPaneRootForNode(ev.target, doc);
          if (pane && pane !== activePaneEl) {
            activePaneEl = pane;
          }
        };
        doc.addEventListener?.('pointerdown', onPaneFocus, true);
        doc.addEventListener?.('focusin', onPaneFocus, true);
        paneTrackOff = () => {
          doc.removeEventListener?.('pointerdown', onPaneFocus, true);
          doc.removeEventListener?.('focusin', onPaneFocus, true);
        };
      }

      if (!omniOff) {
        const onOutsidePointer = (ev) => {
          if (!omniPillEl || destroyed) return;
          const tgt = ev?.target;
          if (tgt && (tgt === omniPillEl || omniPillEl.contains?.(tgt) || tgt.closest?.(`[data-testid="${OMNI_PILL_TESTID}"]`))) {
            return;
          }
          removeOmniPill();
        };
        doc.addEventListener?.('pointerdown', onOutsidePointer, true);
        doc.addEventListener?.('mouseup', handleConversationTextAction, false);
        doc.addEventListener?.('click', handleConversationTextAction, false);
        omniOff = () => {
          doc.removeEventListener?.('pointerdown', onOutsidePointer, true);
          doc.removeEventListener?.('mouseup', handleConversationTextAction, false);
          doc.removeEventListener?.('click', handleConversationTextAction, false);
        };
      }

      if (options.autoObserve !== false && doc.body) {
        const bus = coexist?.getDomMutationBus?.(doc, win);
        if (bus && typeof bus.subscribe === 'function') {
          try {
            domBusUnsub = bus.subscribe(
              'reading-nav',
              (_records, meta) => {
                if (!enabled || destroyed) return;
                if (!meta?.woken && coexist?.isWindowHibernated?.(doc, win, false)) return;
                scheduleSync();
              },
              { wakeOnResume: true }
            );
          } catch {
            domBusUnsub = null;
          }
        }
        if (!domBusUnsub && typeof win?.MutationObserver === 'function') {
          domObserver = new win.MutationObserver((records) => {
            if (!enabled || destroyed) return;
            if (coexist?.isWindowHibernated?.(doc, win, false)) return;
            if (typeof coexist?.isMutationOwnedOnly === 'function') {
              if (coexist.isMutationOwnedOnly(records)) return;
            } else if (Array.isArray(records) && records.length > 0) {
              const hasExternal = records.some((rec) => {
                if (!isOwnedNode(rec?.target)) {
                  const added = Array.from(rec?.addedNodes || []);
                  const removed = Array.from(rec?.removedNodes || []);
                  const allOwned =
                    (added.length > 0 || removed.length > 0) &&
                    added.every(isOwnedNode) &&
                    removed.every(isOwnedNode);
                  return !allOwned;
                }
                return false;
              });
              if (!hasExternal) return;
            }
            scheduleSync();
          });
          try {
            domObserver.observe(doc.body, { childList: true, subtree: true });
          } catch {}
        }
      }
    }

    function detachListeners() {
      if (observerTimer) {
        clearTimeout(observerTimer);
        observerTimer = null;
      }
      if (keydownOff) {
        try { keydownOff(); } catch {}
        keydownOff = null;
      }
      if (paneTrackOff) {
        try { paneTrackOff(); } catch {}
        paneTrackOff = null;
      }
      if (omniOff) {
        try { omniOff(); } catch {}
        omniOff = null;
      }
      if (domBusUnsub) {
        try { domBusUnsub(); } catch {}
        domBusUnsub = null;
      }
      if (domObserver) {
        try { domObserver.disconnect(); } catch {}
        domObserver = null;
      }
    }

    function sync() {
      if (destroyed) return;
      if (!enabled) {
        removeOmniPill();
        restoreModifiedDetails();
        cleanupEnhancedCodeBlocks();
        cleanupMermaidButtons();
        removeRail();
        return;
      }
      scanCodeBlocks();
      scanMermaidDiagrams();
      renderRail();
    }

    function setEnabled(next) {
      if (destroyed) return;
      const val = Boolean(next);
      if (val === enabled) {
        if (enabled) sync();
        return;
      }
      enabled = val;
      if (enabled) {
        attachListeners();
        sync();
      } else {
        detachListeners();
        clearPulse();
        removeOmniPill();
        restoreModifiedDetails();
        cleanupEnhancedCodeBlocks();
        cleanupMermaidButtons();
        removeRail();
        railYielded = false;
      }
    }

    function setCollapseLines(nextLines) {
      collapseLines = clampCollapseLines(nextLines);
      if (enabled && !destroyed) scanCodeBlocks();
      return collapseLines;
    }

    function getDebugState() {
      return {
        enabled,
        destroyed,
        collapseLines,
        enhancedCodeBlocks: enhancedCount,
        foldedCodeBlocks: foldedCount,
        mermaidCount: mermaidBtns.size,
        mermaidModalOpen: Boolean(mermaidModalEl && mermaidModalEl.isConnected !== false),
        outlineOpen: Boolean(outlineOpen && outlineEl && outlineEl.isConnected !== false),
        omniPillOpen: Boolean(omniPillEl && omniPillEl.isConnected !== false),
        railMounted: Boolean(railEl && railEl.isConnected !== false),
        railYielded,
        currentTurnIndex,
      };
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      detachListeners();
      clearPulse();
      removeOmniPill();
      restoreModifiedDetails();
      cleanupEnhancedCodeBlocks();
      cleanupMermaidButtons();
      removeRail();
      safeRemove(createdStyleEl);
      createdStyleEl = null;
      activePaneEl = null;
      railYielded = false;
    }

    if (enabled) {
      attachListeners();
      sync();
    }

    return {
      sync,
      setEnabled,
      setCollapseLines,
      jumpToTurn,
      jumpRelative,
      scrollToBottom,
      openOutlineSearch,
      toggleFoldAllStepsAndCode,
      openMermaidZoom,
      getDebugState,
      destroy,
    };
  }

  return {
    RAIL_TESTID,
    OMNI_PILL_TESTID,
    CODE_BAR_ATTR,
    CODE_FOLDED_ATTR,
    CODE_ENHANCED_ATTR,
    DEFAULT_COLLAPSE_LINES,
    clampCollapseLines,
    countCodeLines,
    extractPlainLinksAndPaths,
    createReadingNavController,
  };
});
