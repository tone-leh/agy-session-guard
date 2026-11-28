// agy-Sag — Opt-In Thought & Sidebar Title Real-Time Translator (UMD, zero deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.__agSagThoughtTranslator = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const TRIGGER_SEL = 'button[data-testid="thinking-collapsible-trigger"]';
  const TITLE_SEL = '[data-testid="conversation-row-sidebar"], [data-testid="conversation-row-history"], [data-testid="breadcrumb-segment"]';
  const BOX_CLASS = 'ag-sag-thought-box';
  const BAR_CLASS = 'ag-sag-thought-bar';
  const MAX_CACHE = 200;
  const MAX_AUTO_PANELS_PER_SCAN = 5;
  const MAX_AUTO_CONCURRENT = 2;
  const MAX_TITLES_PER_SCAN = 20;
  const MAX_TITLE_CONCURRENT = 2;
  const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

  const RE_CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
  const RE_KANA = /[\u3040-\u309f\u30a0-\u30ff]/g;
  const RE_HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g;
  const RE_CYR = /[\u0400-\u04ff]/g;
  const RE_LATIN_WORD = /[A-Za-z]{2,}/g;
  const RE_ACRONYM = /^[A-Z]{2,6}$/;
  const RE_SKIP_TIME = /^(?:just\s+now|now|today|yesterday|tomorrow|earlier|last\s+week|刚刚|刚才|今天|昨天|前天|\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?|w|wks?|weeks?|mo|y|yrs?)(?:\s+ago)?|\d+\s*(?:秒|分钟|小时|天|周|个月|年)前|\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2}(?:,\s*\d{4})?)$/i;
  const RE_SKIP_PATH = /^(?:(?:\/|~\/|\.\.?\/|[A-Za-z]:\\)\S+|[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+|[A-Za-z0-9._-]+\.(?:[cm]?js|[jt]sx?|json|md|css|html|py|go|rs|sh|ya?ml|toml|sql|txt|log)|[0-9a-f]{7,40}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const LANG_CUES = {
    es: /[ñáéíóú¿¡]|\b(?:el|la|los|las|para|con|que|por|una|como)\b/g,
    fr: /[àâçéèêëîïôùûüœ]|\b(?:le|la|les|des|pour|avec|dans|une|sur)\b/g,
    de: /[äöüß]|\b(?:der|die|das|und|für|mit|nicht|eine|auch)\b/g,
    'pt-BR': /[ãõçáéíóúâêô]|\b(?:para|com|uma|como|dos|das|por|não)\b/g,
  };

  function resolveDep(k, p) {
    if (globalRoot && globalRoot[k]) return globalRoot[k];
    if (typeof require === 'function') { try { return require(p); } catch {} }
    return null;
  }

  function stripNoise(t) {
    return String(t || '')
      .replace(/```[\s\S]*?```|`[^`\n]+`|https?:\/\/\S+/gi, ' ')
      .replace(/(?:^|\s)(?:[A-Za-z]:\\[^\s]+|\/(?:Users|home|var|etc|opt|usr|tmp|Applications|System|Library|private|mnt|srv|root)\/[^\s]+|\.{0,2}\/[A-Za-z0-9._/-]+|[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+\.[A-Za-z0-9]{1,8}\b|--[a-zA-Z0-9][a-zA-Z0-9_-]*(?:=[^\s,;)"]+)?)/g, ' ');
  }

  function hasLongLatinRun(s) {
    if ((s.match(RE_LATIN_WORD) || []).length < 5) return false;
    for (const seg of s.split(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\n.;:!?。！？；]+/)) {
      const ws = (seg.match(/[A-Za-z]{2,}(?:['’-][A-Za-z]+)?/g) || []).filter((w) => !RE_ACRONYM.test(w));
      if (ws.length >= 5) return true;
    }
    return false;
  }

  function isAlreadyTargetLang(text, targetLang = 'zh-CN') {
    const lang = String(targetLang || 'zh-CN');
    const s = stripNoise(text).trim();
    if (!s) return false;
    const cjk = (s.match(RE_CJK) || []).length;
    const kana = (s.match(RE_KANA) || []).length;
    const hangul = (s.match(RE_HANGUL) || []).length;
    const cyr = (s.match(RE_CYR) || []).length;
    const words = (s.match(RE_LATIN_WORD) || []).filter((w) => !RE_ACRONYM.test(w));

    if (lang === 'zh-CN' || lang === 'zh-TW') {
      if (cjk < 2 || kana >= 2 || hangul >= 2 || hasLongLatinRun(s)) return false;
      return words.length <= 2 || cjk / (cjk + words.length * 2.5) >= 0.55;
    }
    if (lang === 'ja') return kana >= 2 && !hasLongLatinRun(s) && (kana + cjk) / (kana + cjk + words.length * 2.5) >= 0.55;
    if (lang === 'ko') return hangul >= 2 && !hasLongLatinRun(s) && hangul / (hangul + words.length * 2.5) >= 0.55;
    if (lang === 'ru') {
      if (cyr < 3 || hasLongLatinRun(s)) return false;
      const lat = (s.match(/[A-Za-z]/g) || []).length;
      return cyr / (cyr + lat) >= 0.55;
    }
    if (cjk + kana + hangul + cyr > 0) return false;
    if (lang === 'en') return words.length >= 2 && !(s.match(/[àáâãäåçèéêëìíîïñòóôõöùúûüýÿß]/gi) || []).length;
    const re = LANG_CUES[lang];
    if (!re) return false;
    const hits = (` ${s.toLowerCase()} `.match(re) || []).length;
    return hits >= 2 && hits >= Math.ceil(words.length * 0.25);
  }

  function isSkippableTitleText(text, targetLang = 'zh-CN') {
    const s = String(text || '').trim();
    if (!s || s.length < 3 || s.length > 200) return true;
    if (/^[#vV]?\d+(?:[.,:/-]\d+)*(?:\s*[kKmMbB%])?$|^[+\-]?\d+(?:\s+[+\-]?\d+)*$|^[^A-Za-z\u00c0-\u024f\u0400-\u04ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+$/.test(s)) return true;
    if (RE_SKIP_TIME.test(s)) return true;
    if (!/\s/.test(s) && (RE_SKIP_PATH.test(s) || (/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(s) && /\d/.test(s)))) return true;
    return isAlreadyTargetLang(s, targetLang);
  }

  function classifyTranslateError(rawError, targetLang = 'zh-CN') {
    const raw = String(rawError || 'Translation failed').trim();
    const zh = targetLang === 'zh-CN' || targetLang === 'zh-TW';
    if (/timeout|timed\s*out|aborted|ETIMEDOUT/i.test(raw)) {
      return { kind: 'timeout', message: zh ? `请求超时，请重试或切换引擎 (${raw})` : `Timed out. Retry or switch engine (${raw})` };
    }
    if (/\b429\b|rate\s*limit|too\s*many\s*requests|quota/i.test(raw)) {
      return { kind: 'rate-limit', message: zh ? `触发限流 (429)，请稍后重试 (${raw})` : `Rate limited (429). Retry later (${raw})` };
    }
    if (/\b401\b|\b403\b|unauthorized|forbidden|invalid.*key|api\s*key.*not\s*configured|authentication/i.test(raw)) {
      return { kind: 'auth', message: zh ? `鉴权失败 (401/403)，请检查 API Key (${raw})` : `Auth failed (401/403). Check API key (${raw})` };
    }
    if (/ECONNREFUSED|ENOTFOUND|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|fetch\s*failed|network|proxy|CONNECT|socket|TLS|CERT|offline/i.test(raw)) {
      return { kind: 'network', message: zh ? `代理或网络不通，请检查连接 (${raw})` : `Proxy/network unreachable (${raw})` };
    }
    return { kind: 'unknown', message: raw };
  }

  function isTriggerStreaming(btn) {
    if (!btn) return false;
    if (btn.getAttribute?.('data-op-thought-state') === 'streaming' || btn.getAttribute?.('data-ag-cs-spark-streaming') === '1') return true;
    try { if (btn.querySelector?.('.animate-spin, .animate-pulse, .animate-shimmer-text, [class*="animate-shimmer"]')) return true; } catch {}
    const txt = String(btn.textContent || '').trim();
    return /thinking|正在思考|思考中|推演中/i.test(txt) && !/\d+\s*(s|sec|秒|m|min|分)/i.test(txt);
  }

  function findThoughtPanel(btn) {
    if (!btn) return null;
    const ctrlId = btn.getAttribute?.('aria-controls');
    if (ctrlId && btn.ownerDocument?.getElementById) {
      const byId = btn.ownerDocument.getElementById(ctrlId);
      if (byId) return byId;
    }
    for (let sib = btn.nextElementSibling; sib; sib = sib.nextElementSibling) {
      if (sib.getAttribute?.('data-ag-sag-owned') !== '1' && !sib.classList?.contains?.(BOX_CLASS)) return sib;
    }
    const parent = btn.parentElement;
    if (parent?.children?.length >= 2) {
      for (const ch of Array.from(parent.children)) {
        if (ch !== btn && ch.getAttribute?.('data-ag-sag-owned') !== '1') return ch;
      }
    }
    return null;
  }

  function extractThoughtText(panel) {
    if (!panel) return '';
    const parts = [];
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 3) {
        const s = String(node.nodeValue || '');
        if (s.trim()) parts.push(s);
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.getAttribute?.('data-ag-sag-owned') === '1' || node.getAttribute?.('data-ag-sg-owned') === '1' || node.getAttribute?.('data-op-thought') === '1') return;
      for (const c of node.childNodes ? Array.from(node.childNodes) : []) walk(c);
      const tag = String(node.tagName || '').toUpperCase();
      if (tag === 'P' || tag === 'DIV' || tag === 'LI' || tag === 'BR' || tag === 'PRE') parts.push('\n');
    };
    walk(panel);
    return parts.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function createThoughtTranslatorController(options = {}) {
    const win = options.win || globalRoot;
    const doc = options.doc || win?.document || null;
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');

    let enabled = Boolean(options.enabled);
    let engine = String(options.engine || 'mt');
    let targetLang = String(options.targetLang || 'zh-CN');
    let triggerMode = options.triggerMode === 'manual' ? 'manual' : 'auto';
    let viewMode = options.viewMode === 'translated' ? 'translated' : 'bilingual';
    let stylePreset = options.stylePreset === 'concise' ? 'concise' : 'technical';
    let translateTitles = Boolean(options.translateTitles);
    let conflictPolicy = options.conflictPolicy === 'takeover' ? 'takeover' : 'yield';

    let destroyed = false;
    let observer = null;
    let busOff = null;
    let scanTimer = null;
    let yieldedToPrism = false;
    let runEpoch = 0;
    let reqSeq = 0;

    const requestTimeoutMs = Math.max(100, Number(options.requestTimeoutMs) || DEFAULT_REQUEST_TIMEOUT_MS);
    const cache = new Map();
    const inFlightKeys = new Set();
    const activeRequests = new Map();
    let panelState = new WeakMap();
    const hiddenSrcPanels = new Set();
    const titleOriginals = new WeakMap();
    const modifiedTitles = new Set();
    const autoQueue = [];
    const autoQueuedSet = new WeakSet();
    let autoInFlight = 0;
    const titleQueue = [];
    const titleQueuedSet = new WeakSet();
    let titleInFlight = 0;

    const safeAppend = (p, n) =>
      typeof coexist?.safeAppendChild === 'function' ? coexist.safeAppendChild(p, n) : (p?.appendChild?.(n), true);
    const safeInsert = (p, n, ref) => {
      if (typeof coexist?.safeInsertBefore === 'function') return coexist.safeInsertBefore(p, n, ref);
      try {
        if (ref && ref.parentElement === p && typeof p.insertBefore === 'function') p.insertBefore(n, ref);
        else p?.appendChild?.(n);
        return true;
      } catch { return false; }
    };
    const safeRemove = (n) =>
      typeof coexist?.safeRemoveNode === 'function' ? coexist.safeRemoveNode(n) : (n?.remove?.(), true);

    const callWithTimeout = (fn, req) =>
      new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, error: 'Translation timeout' });
        }, requestTimeoutMs);
        timer?.unref?.();
        let p;
        try { p = Promise.resolve(fn(req)); }
        catch (err) { settled = true; clearTimeout(timer); reject(err); return; }
        p.then(
          (res) => { if (!settled) { settled = true; clearTimeout(timer); resolve(res); } },
          (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } }
        );
      });

    const isPrismThoughtActive = () => {
      if (!doc || conflictPolicy === 'takeover') return false;
      if (doc.documentElement?.hasAttribute?.('data-ag-prism-thought-owner')) return true;
      try { return Boolean(doc.querySelector?.('.ag-prism-thought-overlay[data-op-thought="1"]')); } catch { return false; }
    };

    const isRunValid = (epoch, node) =>
      epoch === runEpoch && !destroyed && enabled && !yieldedToPrism && !isPrismThoughtActive() && node && node.isConnected !== false;

    const getEffectiveTargetLang = () => {
      if (targetLang && targetLang !== 'auto') return targetLang;
      const hostLang = typeof options.getEffectiveLang === 'function' ? options.getEffectiveLang() : '';
      return hostLang && hostLang !== 'auto' && hostLang !== 'en' ? hostLang : 'zh-CN';
    };

    const getCache = (k) => {
      if (!cache.has(k)) return null;
      const v = cache.get(k);
      cache.delete(k);
      cache.set(k, v);
      return v;
    };

    const setCache = (k, v) => {
      if (cache.has(k)) cache.delete(k);
      cache.set(k, v);
      while (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    };

    const clearAutoQueue = () => { while (autoQueue.length) { const p = autoQueue.pop(); if (p) autoQueuedSet.delete(p); } };
    const clearTitleQueue = () => { while (titleQueue.length) { const x = titleQueue.pop(); if (x?.textNode) titleQueuedSet.delete(x.textNode); } };

    const pruneDetachedTitles = () => {
      for (const tn of Array.from(modifiedTitles)) {
        if (!tn || tn.isConnected === false || tn.parentElement?.isConnected === false) modifiedTitles.delete(tn);
      }
    };

    const fillBodyParagraphs = (body, text) => {
      while (body.firstChild) body.removeChild(body.firstChild);
      for (const para of String(text || '').split(/\n{2,}/)) {
        const t = para.trim();
        if (!t) continue;
        const pEl = doc.createElement('p');
        pEl.textContent = t;
        body.appendChild(pEl);
      }
    };

    const applyViewModeToPanel = (panel, st) => {
      if (!panel || !st) return;
      const body = st.boxEl?.querySelector?.('.ag-sag-thought-body');
      const hideSource = viewMode === 'translated' && !st.showOriginal && Boolean(st.translated);
      if (body) body.hidden = viewMode === 'bilingual' && st.showOriginal;
      if (hideSource) {
        panel.setAttribute?.('data-ag-sag-thought-hide-src', '1');
        hiddenSrcPanels.add(panel);
      } else if (panel.getAttribute?.('data-ag-sag-thought-hide-src') === '1' || hiddenSrcPanels.has(panel)) {
        panel.removeAttribute?.('data-ag-sag-thought-hide-src');
        hiddenSrcPanels.delete(panel);
      }
    };

    const renderTranslatedBox = (panel, translatedText, meta = {}) => {
      if (!doc || !panel) return;
      let st = panelState.get(panel);
      if (!st) {
        st = { sourceText: meta.sourceText || '', translated: '', showOriginal: false, boxEl: null };
        panelState.set(panel, st);
      }
      st.translated = translatedText;
      if (meta.sourceText) st.sourceText = meta.sourceText;

      let box = panel.querySelector?.(`.${BOX_CLASS}[data-ag-sag-owned="1"]`) || null;
      if (!box && st.boxEl && st.boxEl.isConnected !== false && st.boxEl.parentElement === panel) box = st.boxEl;
      if (!box) {
        box = coexist.markOwnedNoTranslate(doc.createElement('div'));
        box.className = BOX_CLASS;
        box.setAttribute('data-testid', 'ag-sag-thought-box');
        if (!safeAppend(panel, box)) return;
      }
      st.boxEl = box;
      while (box.firstChild) box.removeChild(box.firstChild);

      const head = doc.createElement('div');
      head.className = 'ag-sag-thought-box-head';
      const tag = doc.createElement('span');
      tag.className = 'ag-sag-thought-tag';
      const diag = meta.error ? classifyTranslateError(meta.error, meta.lang || getEffectiveTargetLang()) : null;
      tag.textContent = diag
        ? `agy-Sag · ${diag.kind}`
        : `agy-Sag · ${meta.engine || engine}${meta.cached ? ' (cached)' : meta.streaming ? ' · streaming' : ''}`;
      head.appendChild(tag);

      const acts = doc.createElement('div');
      acts.className = 'ag-sag-thought-actions';
      const toggleBtn = doc.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'ag-sag-thought-btn';
      toggleBtn.setAttribute('data-testid', 'ag-sag-thought-toggle');
      const syncToggleLabel = () => {
        toggleBtn.textContent = st.showOriginal ? '译文' : viewMode === 'translated' ? '原文' : '隐藏译文';
      };
      syncToggleLabel();
      toggleBtn.addEventListener('click', (ev) => {
        ev?.preventDefault?.(); ev?.stopPropagation?.();
        st.showOriginal = !st.showOriginal;
        applyViewModeToPanel(panel, st);
        syncToggleLabel();
      });
      acts.appendChild(toggleBtn);

      const retryBtn = doc.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'ag-sag-thought-btn';
      retryBtn.setAttribute('data-testid', 'ag-sag-thought-retry');
      retryBtn.textContent = '重译';
      retryBtn.addEventListener('click', (ev) => {
        ev?.preventDefault?.(); ev?.stopPropagation?.();
        void translatePanel(panel, { force: true });
      });
      acts.appendChild(retryBtn);
      head.appendChild(acts);
      box.appendChild(head);

      const body = doc.createElement('div');
      body.className = 'ag-sag-thought-body';
      body.setAttribute('data-testid', 'ag-sag-thought-body');
      if (meta.loading) {
        body.textContent = 'Translating…';
      } else if (diag) {
        body.setAttribute('data-tone', 'error');
        body.setAttribute('data-error-kind', diag.kind);
        body.textContent = diag.message;
      } else {
        if (meta.streaming) body.setAttribute('data-streaming', '1');
        fillBodyParagraphs(body, translatedText);
      }
      box.appendChild(body);
      applyViewModeToPanel(panel, st);
    };

    const applyStreamChunk = (requestId, partialText) => {
      const rec = activeRequests.get(String(requestId || ''));
      if (!rec || !doc || !isRunValid(rec.epoch, rec.panel)) return false;
      const chunkStr = String(partialText || '').trim();
      if (!chunkStr) return false;
      const st = panelState.get(rec.panel);
      const body = st?.boxEl?.querySelector?.('.ag-sag-thought-body');
      if (st && body) {
        st.translated = chunkStr;
        body.removeAttribute?.('data-tone');
        body.removeAttribute?.('data-error-kind');
        body.setAttribute?.('data-streaming', '1');
        fillBodyParagraphs(body, chunkStr);
        applyViewModeToPanel(rec.panel, st);
        return true;
      }
      renderTranslatedBox(rec.panel, chunkStr, { sourceText: rec.sourceText, engine: rec.engine, lang: rec.lang, streaming: true });
      return true;
    };

    const ensureTriggerButton = (btn, panel) => {
      if (!doc || !btn || !panel || btn.parentElement?.querySelector?.(`.${BAR_CLASS}[data-ag-sag-owned="1"]`)) return;
      const chip = coexist.markOwnedNoTranslate(doc.createElement('button'));
      chip.type = 'button';
      chip.className = BAR_CLASS;
      chip.setAttribute('data-testid', 'ag-sag-thought-trigger-btn');
      chip.textContent = '译';
      chip.title = 'Translate thought block (agy-Sag)';
      chip.addEventListener('click', (ev) => {
        ev?.preventDefault?.(); ev?.stopPropagation?.();
        void translatePanel(panel, { force: false });
      });
      safeInsert(btn.parentElement, chip, btn.nextElementSibling || null);
    };

    const translatePanel = async (panel, { force = false } = {}) => {
      if (!isRunValid(runEpoch, panel)) return { ok: false, reason: 'disabled' };
      const text = extractThoughtText(panel);
      if (!text || text.length < 4) return { ok: false, reason: 'empty' };
      const reqEngine = engine;
      const lang = getEffectiveTargetLang();
      if (!force && isAlreadyTargetLang(text, lang)) return { ok: false, reason: 'already-target-lang' };
      const reqStyle = stylePreset;
      const cacheKey = `thought|${reqEngine}|${lang}|${reqStyle}|${text}`;
      if (!force) {
        const hit = getCache(cacheKey);
        if (hit) {
          renderTranslatedBox(panel, hit, { sourceText: text, engine: reqEngine, lang, cached: true });
          return { ok: true, cached: true, translated: hit };
        }
      }
      if (inFlightKeys.has(cacheKey)) return { ok: false, reason: 'in-flight' };
      if (typeof options.onRequestTranslate !== 'function') {
        renderTranslatedBox(panel, '', { sourceText: text, lang, error: 'Watch sidecar bridge offline' });
        return { ok: false, reason: 'bridge-offline' };
      }
      const epoch = runEpoch;
      const requestId = `tt-${++reqSeq}-${Date.now().toString(36)}`;
      inFlightKeys.add(cacheKey);
      activeRequests.set(requestId, { panel, epoch, sourceText: text, engine: reqEngine, lang });
      renderTranslatedBox(panel, '', { sourceText: text, engine: reqEngine, lang, loading: true });
      try {
        const res = await callWithTimeout(options.onRequestTranslate, {
          requestId, engine: reqEngine, targetLang: lang, kind: 'thought', stylePreset: reqStyle, text, force,
        });
        if (!isRunValid(epoch, panel)) return { ok: false, reason: 'aborted' };
        if (extractThoughtText(panel) !== text) {
          const curSt = panelState.get(panel);
          if (curSt && !curSt.translated) {
            safeRemove(curSt.boxEl);
            panelState.delete(panel);
          }
          return { ok: false, reason: 'stale-source' };
        }
        if (res?.ok && res.data?.translated) {
          setCache(cacheKey, res.data.translated);
          renderTranslatedBox(panel, res.data.translated, {
            sourceText: text, engine: res.data.engine || reqEngine, lang, cached: Boolean(res.data.cached),
          });
          return { ok: true, translated: res.data.translated };
        }
        renderTranslatedBox(panel, '', { sourceText: text, lang, error: res?.error || 'Translation failed' });
        return { ok: false, error: res?.error || 'Translation failed' };
      } catch (err) {
        if (isRunValid(epoch, panel) && extractThoughtText(panel) === text) {
          renderTranslatedBox(panel, '', { sourceText: text, lang, error: err?.message || 'Translation failed' });
        }
        return { ok: false, error: err?.message || 'Translation failed' };
      } finally {
        activeRequests.delete(requestId);
        inFlightKeys.delete(cacheKey);
      }
    };

    const drainAutoQueue = () => {
      while (autoInFlight < MAX_AUTO_CONCURRENT && autoQueue.length > 0 && !destroyed && enabled && triggerMode === 'auto') {
        const panel = autoQueue.shift();
        if (panel) autoQueuedSet.delete(panel);
        if (!panel || panel.isConnected === false) continue;
        autoInFlight += 1;
        void Promise.resolve(translatePanel(panel, { force: false }))
          .catch(() => {})
          .finally(() => {
            autoInFlight = Math.max(0, autoInFlight - 1);
            if (!destroyed && enabled && triggerMode === 'auto') drainAutoQueue();
          });
      }
    };

    const enqueueAutoPanel = (panel) => {
      if (!panel || autoQueuedSet.has(panel) || autoQueue.length >= MAX_AUTO_PANELS_PER_SCAN) return;
      autoQueuedSet.add(panel);
      autoQueue.push(panel);
    };

    const applyTranslatedTitle = (task, translatedRaw) => {
      const tr = String(translatedRaw || '').trim();
      if (!tr || !translateTitles || !isRunValid(task.epoch, task.textNode) || task.textNode.parentElement?.isConnected === false) return false;
      setCache(task.key, tr);
      titleOriginals.set(task.textNode, { orig: task.origText, translated: tr });
      modifiedTitles.add(task.textNode);
      try { task.textNode.nodeValue = tr; } catch {}
      return true;
    };

    const drainTitleQueue = () => {
      while (titleInFlight < MAX_TITLE_CONCURRENT && titleQueue.length > 0 && translateTitles && isRunValid(runEpoch, doc)) {
        const task = titleQueue.shift();
        if (task?.textNode) titleQueuedSet.delete(task.textNode);
        if (!task || !isRunValid(task.epoch, task.textNode) || task.textNode.parentElement?.isConnected === false || inFlightKeys.has(task.key)) continue;
        inFlightKeys.add(task.key);
        titleInFlight += 1;
        void callWithTimeout(options.onRequestTranslate, {
          engine: task.engine, targetLang: task.lang, kind: 'title', stylePreset: task.stylePreset, text: task.origText, force: false,
        })
          .then((res) => { if (res?.ok && res.data?.translated) applyTranslatedTitle(task, res.data.translated); })
          .catch(() => {})
          .finally(() => {
            inFlightKeys.delete(task.key);
            titleInFlight = Math.max(0, titleInFlight - 1);
            if (!destroyed && enabled && translateTitles && !yieldedToPrism) drainTitleQueue();
          });
      }
    };

    const dispatchTitleBatch = (tasks) => {
      if (!tasks.length) return;
      for (const t of tasks) inFlightKeys.add(t.key);
      const first = tasks[0];
      void callWithTimeout(options.onRequestBatchTitles, {
        engine: first.engine,
        targetLang: first.lang,
        stylePreset: first.stylePreset,
        items: tasks.map((t, idx) => ({ id: String(idx), text: t.origText })),
      })
        .then((res) => {
          if (!res?.ok || !res.data) return;
          const list = Array.isArray(res.data.results) ? res.data.results : Array.isArray(res.data.translations) ? res.data.translations : [];
          for (let i = 0; i < list.length; i += 1) {
            const item = list[i];
            if (typeof item === 'string') { if (tasks[i]) applyTranslatedTitle(tasks[i], item); continue; }
            const idx = Number.isInteger(item?.index) ? item.index : Number(item?.id);
            const task = Number.isInteger(idx) && tasks[idx] ? tasks[idx] : tasks[i];
            if (task && item?.translated) applyTranslatedTitle(task, item.translated);
          }
        })
        .catch(() => {})
        .finally(() => { for (const t of tasks) inFlightKeys.delete(t.key); });
    };

    function findFirstMeaningfulTextNode(rootEl) {
      if (!rootEl) return null;
      const stack = [rootEl];
      while (stack.length) {
        const cur = stack.shift();
        if (!cur) continue;
        if (cur.nodeType === 3) { if (String(cur.nodeValue || '').trim().length >= 3) return cur; continue; }
        if (cur.nodeType !== 1 || cur.getAttribute?.('data-ag-sag-owned') === '1' || cur.getAttribute?.('data-ag-no-i18n') === '1') continue;
        for (const c of cur.childNodes ? Array.from(cur.childNodes) : []) stack.push(c);
      }
      return null;
    }

    const scanTitles = () => {
      if (!doc || !translateTitles || !isRunValid(runEpoch, doc)) return;
      const useBatch = typeof options.onRequestBatchTitles === 'function';
      if (!useBatch && typeof options.onRequestTranslate !== 'function') return;
      const reqEngine = engine;
      const lang = getEffectiveTargetLang();
      const reqStyle = stylePreset;
      const epoch = runEpoch;
      const batchTasks = [];

      for (const el of Array.from(doc.querySelectorAll?.(TITLE_SEL) || [])) {
        if (!el || el.isConnected === false || el.getAttribute?.('data-ag-sag-owned') === '1') continue;
        const textNode = findFirstMeaningfulTextNode(el);
        if (!textNode || textNode.isConnected === false) continue;
        const curText = String(textNode.nodeValue || '').trim();
        const tracked = titleOriginals.get(textNode);
        if (tracked && tracked.translated === curText) continue;
        const origText = tracked ? tracked.orig : curText;
        if (isSkippableTitleText(origText, lang)) continue;

        const key = `title|${reqEngine}|${lang}|${origText}`;
        const hit = getCache(key);
        if (hit) {
          if (!tracked) { titleOriginals.set(textNode, { orig: origText, translated: hit }); modifiedTitles.add(textNode); }
          else tracked.translated = hit;
          try { textNode.nodeValue = hit; } catch {}
          continue;
        }
        if (inFlightKeys.has(key)) continue;
        if (useBatch) {
          if (batchTasks.length >= MAX_TITLES_PER_SCAN) break;
          if (batchTasks.some((t) => t.textNode === textNode)) continue;
          batchTasks.push({ textNode, origText, key, engine: reqEngine, lang, stylePreset: reqStyle, epoch });
        } else {
          if (batchTasks.length >= MAX_TITLES_PER_SCAN || titleQueue.length >= MAX_TITLES_PER_SCAN) break;
          if (titleQueuedSet.has(textNode)) continue;
          titleQueuedSet.add(textNode);
          const task = { textNode, origText, key, engine: reqEngine, lang, stylePreset: reqStyle, epoch };
          titleQueue.push(task);
          batchTasks.push(task);
        }
      }
      if (useBatch) dispatchTitleBatch(batchTasks);
      else drainTitleQueue();
    };

    const restoreTitles = () => {
      for (const tn of Array.from(modifiedTitles)) {
        const rec = titleOriginals.get(tn);
        if (rec && typeof rec.orig === 'string') { try { tn.nodeValue = rec.orig; } catch {} }
      }
      modifiedTitles.clear();
    };

    const cleanupDom = () => {
      restoreTitles();
      activeRequests.clear();
      panelState = new WeakMap();
      if (!doc) return;
      try { doc.querySelectorAll?.(`.${BOX_CLASS}[data-ag-sag-owned="1"], .${BAR_CLASS}[data-ag-sag-owned="1"]`)?.forEach?.((n) => safeRemove(n)); } catch {}
      for (const p of Array.from(hiddenSrcPanels)) { try { p.removeAttribute?.('data-ag-sag-thought-hide-src'); } catch {} }
      hiddenSrcPanels.clear();
      try { doc.querySelectorAll?.('[data-ag-sag-thought-hide-src="1"]')?.forEach?.((n) => n.removeAttribute?.('data-ag-sag-thought-hide-src')); } catch {}
    };

    const scanNow = () => {
      if (destroyed || !doc) return;
      if (!enabled) {
        if (yieldedToPrism) runEpoch += 1;
        yieldedToPrism = false;
        clearAutoQueue(); clearTitleQueue(); cleanupDom();
        return;
      }
      if (isPrismThoughtActive()) {
        if (!yieldedToPrism) {
          yieldedToPrism = true; runEpoch += 1;
          clearAutoQueue(); clearTitleQueue(); cleanupDom();
        }
        return;
      }
      if (yieldedToPrism) { yieldedToPrism = false; runEpoch += 1; }
      pruneDetachedTitles();

      const lang = getEffectiveTargetLang();
      const triggers = Array.from(doc.querySelectorAll?.(TRIGGER_SEL) || []);
      let autoEligibleSeen = 0;
      for (let i = triggers.length - 1; i >= 0; i -= 1) {
        const btn = triggers[i];
        const panel = findThoughtPanel(btn);
        if (!panel) continue;
        ensureTriggerButton(btn, panel);
        const prev = panelState.get(panel);
        if (triggerMode === 'auto' && !isTriggerStreaming(btn)) {
          const text = extractThoughtText(panel);
          if (text && !isAlreadyTargetLang(text, lang)) {
            autoEligibleSeen += 1;
            if (autoEligibleSeen <= MAX_AUTO_PANELS_PER_SCAN) {
              if (!prev || prev.sourceText !== text) enqueueAutoPanel(panel);
              else applyViewModeToPanel(panel, prev);
            } else if (prev) applyViewModeToPanel(panel, prev);
          } else if (prev) applyViewModeToPanel(panel, prev);
        } else if (prev) applyViewModeToPanel(panel, prev);
      }
      if (triggerMode === 'auto') drainAutoQueue();
      if (translateTitles) scanTitles();
      else if (modifiedTitles.size > 0) { clearTitleQueue(); restoreTitles(); }
    };

    const scheduleScan = () => {
      if (destroyed || !enabled) return;
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        scanTimer = null;
        if (!destroyed && enabled && !coexist?.isWindowHibernated?.(doc, win, false)) scanNow();
      }, 600);
      scanTimer?.unref?.();
    };

    const startObserver = () => {
      if (busOff || observer || !doc || options.autoObserve === false) return;
      if (typeof coexist?.getDomMutationBus === 'function') {
        busOff = coexist.getDomMutationBus(doc, win).subscribe('thoughtTranslator', () => {
          if (enabled && !destroyed) scheduleScan();
        }, { wakeOnResume: true });
        return;
      }
      const MO = win?.MutationObserver || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
      if (!MO || !doc.body) return;
      observer = new MO((records) => {
        if (!enabled || destroyed || coexist?.isWindowHibernated?.(doc, win, false)) return;
        if (typeof coexist?.isMutationOwnedOnly === 'function') {
          if (!coexist.isMutationOwnedOnly(records)) scheduleScan();
          return;
        }
        for (const rec of records) {
          if (!rec.target?.closest?.('[data-ag-sag-owned="1"], [data-ag-sg-owned="1"]')) { scheduleScan(); break; }
        }
      });
      try { observer.observe(doc.body, { childList: true, subtree: true }); } catch {}
    };

    const stopObserver = () => {
      if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
      if (busOff) { try { busOff(); } catch {} busOff = null; }
      try { observer?.disconnect?.(); } catch {}
      observer = null;
    };

    const configure = (patch = {}) => {
      const prevEnabled = enabled;
      const changed =
        (typeof patch.engine === 'string' && patch.engine !== engine) ||
        (typeof patch.targetLang === 'string' && patch.targetLang !== targetLang) ||
        ((patch.stylePreset === 'technical' || patch.stylePreset === 'concise') && patch.stylePreset !== stylePreset);
      const policyChanged = (patch.conflictPolicy === 'yield' || patch.conflictPolicy === 'takeover') && patch.conflictPolicy !== conflictPolicy;

      if (typeof patch.enabled === 'boolean') enabled = patch.enabled;
      if (typeof patch.engine === 'string') engine = patch.engine;
      if (typeof patch.targetLang === 'string') targetLang = patch.targetLang;
      if (patch.triggerMode === 'auto' || patch.triggerMode === 'manual') triggerMode = patch.triggerMode;
      if (patch.viewMode === 'bilingual' || patch.viewMode === 'translated') viewMode = patch.viewMode;
      if (patch.stylePreset === 'technical' || patch.stylePreset === 'concise') stylePreset = patch.stylePreset;
      if (typeof patch.translateTitles === 'boolean') translateTitles = patch.translateTitles;
      if (patch.conflictPolicy === 'yield' || patch.conflictPolicy === 'takeover') conflictPolicy = patch.conflictPolicy;

      if (!enabled || changed || policyChanged) { runEpoch += 1; clearAutoQueue(); clearTitleQueue(); }
      if (!enabled) { stopObserver(); cleanupDom(); }
      else {
        if (changed) cleanupDom();
        if (!prevEnabled) startObserver();
        scanNow();
      }
    };

    const destroy = () => {
      if (destroyed) return;
      destroyed = true; enabled = false; runEpoch += 1;
      stopObserver(); clearAutoQueue(); clearTitleQueue(); cleanupDom();
      cache.clear(); inFlightKeys.clear(); activeRequests.clear();
    };

    if (enabled) { startObserver(); scanNow(); }

    return {
      configure,
      scanNow,
      translatePanel,
      applyStreamChunk,
      clearCache: () => cache.clear(),
      getDebugState: () => ({
        enabled, destroyed, engine, targetLang: getEffectiveTargetLang(), triggerMode, viewMode,
        stylePreset, translateTitles, yieldedToPrism, cacheSize: cache.size, modifiedTitleCount: modifiedTitles.size,
      }),
      destroy,
    };
  }

  return {
    TRIGGER_SEL,
    TITLE_SEL,
    BOX_CLASS,
    BAR_CLASS,
    isAlreadyTargetLang,
    isSkippableTitleText,
    classifyTranslateError,
    isTriggerStreaming,
    findThoughtPanel,
    extractThoughtText,
    createThoughtTranslatorController,
  };
});
