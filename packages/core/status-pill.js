// agy-Sag — Unified Segmented Status Capsule HUD & Prism Context Embed (UMD, zero runtime deps)
// Seamless dual-mode architecture (Less is More):
//   1) With Obsidian Prism (#ag-prism-pulse-bar open Shadow DOM #context-card):
//      - ZERO extra top-level pill on the composer footer!
//      - Embeds read-only Auto-Compact %, Clean Restart, HUD chips & Settings link inside Prism's Context Card
//   2) Standalone (no Obsidian Prism):
//      - Renders a unified multi-segment HUD capsule in .agy-composer-footer + serene read-only quick card
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSgStatusPill = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const PILL_TESTID = 'ag-sg-status-pill';
  const CARD_TESTID = 'ag-sg-status-card';
  const PRISM_SEC_TESTID = 'ag-sg-pv-sec';
  const PRISM_STYLE_ID = 'ag-sg-pv-style';

  const QUOTA_TONE_MAP = Object.freeze({
    ok: 'ok',
    warm: 'warm',
    warn: 'warn',
    limited: 'danger',
  });

  function resolveDep(globalKey, relPath) {
    if (globalRoot && globalRoot[globalKey]) return globalRoot[globalKey];
    if (typeof require === 'function') return require(relPath);
    return null;
  }

  function computeTone(snap, cfg, watchdog) {
    if (watchdog?.stalled && !watchdog?.stallDismissed) return 'warn';
    const pct = snap && typeof snap.usedPct === 'number' ? snap.usedPct : null;
    if (pct === null) return 'idle';
    if (pct >= 100) return 'danger';
    const th = cfg?.compactThreshold === 'off' ? 85 : Number(cfg?.compactThreshold) || 80;
    if (pct >= th) return 'warn';
    if (pct >= Math.max(55, th - 12)) return 'warm';
    return 'ok';
  }

  function formatTpl(tpl, vars = {}) {
    let out = String(tpl || '');
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v ?? ''));
    }
    return out;
  }

  function formatDurationMMSS(sec) {
    const total = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatDataSourceLabel(source) {
    const key = String(source || '').trim().toLowerCase();
    if (key === 'host-bridge' || key === 'bridge-estimate' || key === 'pulse-dom') return 'Prism RPC';
    if (key === 'nov-xray') return 'NOV X-Ray';
    if (key === 'local-disk') return 'Local Disk';
    if (key === 'dom-est' || key === 'dom-estimate') return 'DOM Est';
    return null;
  }

  function computeQuotaPct(quota) {
    if (!quota) return 0;
    const obsPct = quota.observed?.observedPct;
    if (typeof obsPct === 'number' && Number.isFinite(obsPct)) return Math.max(0, Math.round(obsPct));
    const ratio = Number(quota.localEstimate?.warn5hRatio) || 0;
    return Math.max(0, Math.round(ratio * 100));
  }

  function pickActiveQuotaGroup(groups, modelText = '', selectedId = '') {
    if (!Array.isArray(groups) || groups.length === 0) return null;
    if (selectedId) {
      const hit = groups.find((g) => g && (g.id === selectedId || g.shortName === selectedId));
      if (hit) return hit;
    }
    const ml = String(modelText || '').toLowerCase();
    if (/argon/i.test(ml)) {
      const a = groups.find((g) => g && g.id === 'argon');
      if (a) return a;
    }
    if (/claude|anthropic|sonnet|opus|haiku|gpt|openai/i.test(ml)) {
      const c = groups.find((g) => g && g.id === 'claude');
      if (c) return c;
    }
    return groups.find((g) => g && g.id === 'gemini') || groups[0] || null;
  }

  function formatResetDurationMs(ms) {
    const val = Number(ms);
    if (!Number.isFinite(val) || val <= 0) return '';
    const s = Math.max(1, Math.round(val / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return h > 0 ? `${d}d${h}h` : `${d}d`;
    if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`;
    return `${Math.max(1, m)}m`;
  }

  function remainingTone(pct) {
    if (pct <= 15) return 'danger';
    if (pct <= 35) return 'warn';
    return 'ok';
  }

  function computeHudSegments({
    cfg = {},
    snap = null,
    watchdog = null,
    quota = null,
    quotaSummary = null,
    activeModel = '',
    queue = null,
    bookmarkCount = 0,
    autoAccept = null,
    nov = null,
    strings = {},
    formatTokens = null,
  } = {}) {
    const mods = cfg?.modules || {};
    const segs = [];

    // 1. ctx segment
    if (mods.compactGuard && snap && typeof snap.usedPct === 'number' && Number.isFinite(snap.usedPct)) {
      const pct = Math.max(0, Math.min(100, Math.round(snap.usedPct)));
      const fmt = typeof formatTokens === 'function' ? formatTokens : (n) => String(n ?? '—');
      const used = fmt(snap.usedTokens);
      const max = fmt(snap.maxTokens);
      const ctxTitle = `${strings.cardContextLabel || 'Context'}: ${snap.usedPct}% (${used} / ${max})`;
      segs.push({
        id: 'ctx',
        text: `${snap.usedPct}%`,
        tone: computeTone(snap, cfg, watchdog),
        title: ctxTitle,
        pct,
      });
    }

    // 2. eta / stall segment
    if (mods.sessionWatchdog && watchdog) {
      if (watchdog.stalled && !watchdog.stallDismissed) {
        const time = formatDurationMMSS(watchdog.stalledForSec);
        const text = formatTpl(strings.hudStallShort || 'Stalled {time}', { time });
        segs.push({
          id: 'eta',
          text,
          tone: 'warn',
          title: text,
        });
      } else if (Number(watchdog.estimatedTurnsLeft) > 0) {
        const turns = Number(watchdog.estimatedTurnsLeft);
        const text = formatTpl(strings.hudEtaShort || '≈{n} turns', { n: turns });
        let title = formatTpl(strings.pillBurnEta || '· ~{turns} turns left', { turns }).replace(/^[·\s]+/, '');
        if (watchdog.spikeDetected && Number(watchdog.lastDeltaPct) > 0) {
          title += ` ${formatTpl(strings.pillSpikeHint || '· +{delta}%', { delta: watchdog.lastDeltaPct })}`;
        }
        segs.push({
          id: 'eta',
          text,
          tone: watchdog.spikeDetected ? 'warm' : 'idle',
          title,
        });
      }
    }

    // 3. quota segment — prefer official local LS remaining % over local estimate
    const liveGroups = Array.isArray(quotaSummary?.groups) ? quotaSummary.groups : [];
    const activeGroup = mods.quotaPulse ? pickActiveQuotaGroup(liveGroups, activeModel) : null;
    if (activeGroup && (activeGroup.fiveHour || activeGroup.weekly)) {
      const b5 = activeGroup.fiveHour;
      const bw = activeGroup.weekly;
      const mainBucket = b5 || bw;
      const remPct = Math.max(0, Math.min(100, Math.round(Number(mainBucket.remainingPct ?? (Number(mainBucket.remainingFraction) * 100)) || 0)));
      const minPct = Math.min(
        b5 ? Number(b5.remainingPct ?? 100) : 100,
        bw ? Number(bw.remainingPct ?? 100) : 100
      );
      const parts = [activeGroup.shortName || activeGroup.displayName];
      if (b5) parts.push(`5h ${b5.remainingPct}%${b5.resetInMs > 0 ? ` (${formatResetDurationMs(b5.resetInMs)})` : ''}`);
      if (bw) parts.push(`7d ${bw.remainingPct}%${bw.resetInMs > 0 ? ` (${formatResetDurationMs(bw.resetInMs)})` : ''}`);
      segs.push({
        id: 'quota',
        text: `${b5 ? '5h' : '7d'} ${remPct}%`,
        tone: remainingTone(minPct),
        title: parts.join(' · '),
      });
    } else if (mods.quotaPulse && quota) {
      const qPct = computeQuotaPct(quota);
      const turns5h = Number(quota.localEstimate?.turns5h) || 0;
      const soft5h = Number(quota.limits?.softTurns5h) || 60;
      const turns7d = Number(quota.localEstimate?.turns7d) || 0;
      const soft7d = Number(quota.limits?.softTurns7d) || 350;
      if (quota.observed?.rateLimited || quota.observed?.observedPct !== null || turns5h > 0) {
        segs.push({
          id: 'quota',
          text: `5h ${qPct}%`,
          tone: QUOTA_TONE_MAP[quota.health] || 'ok',
          title: formatTpl(
            strings.hudQuotaTitle || 'Quota Pulse · 5h {turns5h}/{soft5h} · 7d {turns7d}/{soft7d}',
            { turns5h, soft5h, turns7d, soft7d }
          ),
        });
      }
    }

    // 4. queue segment
    const qCount = Number(queue?.itemCount) || 0;
    if (mods.promptQueue && qCount > 0) {
      const base = formatTpl(strings.hudQueueShort || 'Queue {n}', { n: qCount });
      const text = queue?.paused ? `${base} ⏸` : base;
      segs.push({
        id: 'queue',
        text,
        tone: queue?.paused ? 'warn' : 'idle',
        title: text,
      });
    }

    // 5. bookmarks segment
    const bmCount = Number(bookmarkCount) || 0;
    if (mods.outlineBookmarks && bmCount > 0) {
      const text = `★${bmCount}`;
      segs.push({
        id: 'bookmarks',
        text,
        tone: 'idle',
        title: `${strings.cardBookmarksLabel || 'Bookmarks'}: ${bmCount}`,
      });
    }

    // 6. autoAccept segment
    if (mods.safeAutoAccept && autoAccept && autoAccept.enabled && !autoAccept.paused) {
      const text = autoAccept.dryRun
        ? (strings.hudAutoAcceptDryRun || 'Dry-run')
        : (strings.hudAutoAcceptShort || 'Auto-OK');
      segs.push({
        id: 'autoAccept',
        text,
        tone: autoAccept.dryRun ? 'idle' : 'warm',
        title: text,
      });
    }

    // 7. nov segment (enriched with read-only sag:nov_feed lock/drift/guard signals)
    if (nov && nov.connected) {
      const on = Number(nov.enabledCount) || 0;
      const total = Number(nov.total) || 13;
      const locked = Boolean(nov.specWriteLocked);
      const drifted = Math.max(0, Number(nov.memDrifted) || 0);
      const blocked = Math.max(0, Number(nov.guardBlocked) || 0);
      const forceAsk = Math.max(0, Number(nov.guardForceAsk) || 0);
      const verifyFail = Boolean(nov.verifyFailed);
      const verifyBlocked = Boolean(nov.verifyBlocked);
      const healthScore = typeof nov.healthScore === 'number' && Number.isFinite(nov.healthScore) ? nov.healthScore : null;
      let text = 'NOV';
      let tone = 'accent';
      if (locked) {
        text = 'NOV 🔒';
        tone = 'warn';
      } else if (verifyBlocked) {
        text = 'NOV ⛔';
        tone = 'warn';
      } else if (verifyFail) {
        text = 'NOV !';
        tone = 'warn';
      } else if (drifted > 0) {
        text = `NOV · Δ${drifted}`;
        tone = 'warn';
      }
      const extras = [];
      if (locked) extras.push('Spec Lock');
      if (verifyBlocked) extras.push('Verify blocked');
      else if (verifyFail) extras.push('Verify fail');
      if (drifted > 0) extras.push(`Mem drift ${drifted}`);
      if (blocked > 0) extras.push(`Guard blocked ${blocked}`);
      if (forceAsk > 0) extras.push(`Guard force_ask ${forceAsk}`);
      if (healthScore !== null) extras.push(`Health ${healthScore}`);
      const baseTitle = formatTpl(strings.hudNovTitle || 'agy-NOV connected · {on}/{total} modules', { on, total });
      segs.push({
        id: 'nov',
        text,
        tone,
        title: extras.length ? `${baseTitle} · ${extras.join(' · ')}` : baseTitle,
      });
    }

    // 8. brand fallback
    if (segs.length === 0) {
      segs.push({
        id: 'brand',
        text: strings.brandShort || 'agy-Sag',
        tone: 'idle',
        title: strings.pillEntryTitle || 'agy-Sag',
      });
    }

    return segs;
  }

  // Scoped Shadow DOM styles that inherit Obsidian Prism's exact light/dark variables (--f, --mu, --d, --ct, --sl, --ac)
  const PRISM_SHADOW_CSS =
    '#context-card[data-ag-pulse-vial-mode="vial"] .ag-sg-pv-sec{grid-column:2;}' +
    '.ag-sg-pv-sec{margin-top:8px;padding-top:8px;border-top:1px solid var(--d,rgba(148,163,184,.18));display:flex;flex-direction:column;gap:6px;}' +
    '.ag-sg-pv-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
    '.ag-sg-pv-title-wrap{display:inline-flex;align-items:center;gap:6px;min-width:0;}' +
    '.ag-sg-pv-title{font-size:11px;font-weight:600;color:var(--f,#eef1f7);white-space:nowrap;}' +
    '.ag-sg-pv-bm{appearance:none;border:0;padding:0 5px;height:18px;border-radius:999px;background:rgba(245,158,11,.14);color:#d97706;font:600 10px/18px inherit;cursor:pointer;white-space:nowrap;}' +
    '.ag-sg-pv-bm:hover{filter:brightness(1.08);}' +
    '.ag-sg-pv-act{appearance:none;height:20px;padding:0 8px;border-radius:999px;border:1px solid var(--b,rgba(148,163,184,.26));background:var(--ct,rgba(148,163,184,.12));color:var(--ch,var(--f,#eef1f7));font:500 10.5px/18px inherit;cursor:pointer;white-space:nowrap;transition:background 130ms ease,color 130ms ease,border-color 130ms ease;}' +
    '.ag-sg-pv-act:hover{background:var(--hv,rgba(148,163,184,.22));color:var(--f,#eef1f7);border-color:var(--ac,#3186ff);}' +
    '.ag-sg-pv-hud{display:flex;flex-wrap:wrap;gap:4px;}' +
    '.ag-sg-pv-chip{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:999px;background:var(--ct,rgba(148,163,184,.14));color:var(--mu,#94a3b8);font:500 10.5px/18px inherit;font-variant-numeric:tabular-nums;white-space:nowrap;}' +
    '.ag-sg-pv-chip[data-tone="warn"]{color:#d97706;}.ag-sg-pv-chip[data-tone="danger"]{color:#ef4444;}.ag-sg-pv-chip[data-tone="ok"]{color:#10b981;}.ag-sg-pv-chip[data-tone="accent"]{color:var(--ac,#3186ff);}' +
    '.ag-sg-pv-link{appearance:none;border:0;padding:0;background:transparent;color:var(--ac,#3186ff);font:500 10.5px/1.3 inherit;align-self:flex-end;cursor:pointer;}' +
    '.ag-sg-pv-link:hover{text-decoration:underline;}';

  function createStatusPillController(options = {}) {
    const win = options.win || globalRoot;
    const doc = options.doc || win?.document || null;
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');
    const ctxSrc = options.contextSource || resolveDep('__agSgContextSource', './context-source.js');
    const i18n = options.i18n || resolveDep('__agSgI18n', './i18n.js');
    const styles = options.styles || resolveDep('__agSgStyles', './styles.js');

    let destroyed = false;
    let cardOpen = false;
    let activePaneEl = null;
    let wrapEl = null;
    let pillBtn = null;
    let dotEl = null;
    let segsEl = null;
    let cardEl = null;
    let createdStyleEl = null;
    let embeddedShadowHosts = new Set();
    let lastSegments = [];
    let lastBreakdownCache = null;
    let selectedQuotaGroupId = '';
    let lastState = {
      snap: null,
      watchdog: null,
      bookmarkCount: 0,
      hasDraft: false,
      queue: null,
      quota: null,
      quotaSummary: null,
      autoAccept: null,
      nov: null,
      synergyConnected: false,
    };
    const listeners = [];

    const getConfig = () => (typeof options.getConfig === 'function' ? options.getConfig() : coexist.DEFAULT_CONFIG);
    const getLang = () => (typeof options.getLang === 'function' ? i18n.normalizeLang(options.getLang()) : i18n.detectLang(doc, win));
    const S = () => i18n.getStrings(getLang());
    const getScope = () => (ctxSrc.resolveActivePaneScope ? ctxSrc.resolveActivePaneScope(doc, activePaneEl) : doc);
    const mk = (tag, cls, txt, attrs) => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (txt !== undefined) e.textContent = txt;
      if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      return e;
    };
    const mkBtn = (cls, txt, attrs, fn) => {
      const b = mk('button', cls, txt, attrs);
      b.type = 'button';
      if (fn) b.addEventListener('click', (ev) => { ev?.preventDefault?.(); ev?.stopPropagation?.(); fn(ev); });
      return b;
    };

    function ensureStyle() {
      if (!doc || !styles) return;
      const existing = doc.getElementById?.(styles.STYLE_ID);
      if (existing) {
        if (existing.textContent !== styles.CORE_CSS) {
          existing.textContent = styles.CORE_CSS;
        }
        return;
      }
      const el = doc.createElement('style');
      el.id = styles.STYLE_ID;
      el.textContent = styles.CORE_CSS;
      coexist.markOwnedNoTranslate(el);
      (doc.head || doc.documentElement || doc.body)?.appendChild?.(el);
      createdStyleEl = el;
    }

    function removeStandalonePill() {
      cardOpen = false;
      try { wrapEl?.remove?.(); } catch {}
      wrapEl = pillBtn = dotEl = segsEl = cardEl = null;
    }

    function findFooterHost(scope = getScope()) {
      if (!doc) return null;
      const root = scope && scope.isConnected !== false ? scope : doc;
      const pick = (container, sel) => {
        if (!container || typeof container.querySelectorAll !== 'function') return null;
        const nodes = container.querySelectorAll(sel) || [];
        for (let i = 0; i < nodes.length; i += 1) {
          if (!ctxSrc?.isSidebarOrAuxiliaryNode?.(nodes[i])) return nodes[i];
        }
        return null;
      };
      return (
        pick(root, '.agy-composer-footer') ||
        (root !== doc ? pick(doc, '.agy-composer-footer') : null) ||
        pick(root, '[data-testid="agent-input-box"] .composer-foot') ||
        (root !== doc ? pick(doc, '[data-testid="agent-input-box"] .composer-foot') : null) ||
        null
      );
    }

    function findPrismPulseHosts() {
      if (!doc || typeof doc.querySelectorAll !== 'function') return [];
      return Array.from(
        doc.querySelectorAll('#ag-prism-pulse-bar, [data-ag-prism-pulse-bar="true"], #ag-pulse-status-bar, [data-ag-pulse-bar="true"]') || []
      );
    }

    function closePrismContextCard(sr) {
      try {
        const card = sr?.getElementById?.('context-card');
        if (card) card.hidden = true;
        const chip = sr?.querySelector?.('.chip[data-card="context"], .chip[aria-expanded="true"]');
        if (chip) chip.setAttribute?.('aria-expanded', 'false');
      } catch {}
    }

    function buildNovInput(cfg) {
      if (lastState.nov && typeof lastState.nov === 'object') {
        return lastState.nov;
      }
      const connected = Boolean(
        lastState.synergyConnected || (typeof options.novSynergy?.isConnected === 'function' && options.novSynergy.isConnected())
      );
      const ns = options.novSynergy?.getState?.();
      const nf = options.novSynergy?.getFeed?.();
      return {
        connected,
        enabledCount: Number(ns?.enabledCount) || 0,
        total: 13,
        specWriteLocked: Boolean(nf?.spec?.writeLockActive),
        memDrifted: Number(nf?.mem?.driftedCount) || 0,
        guardBlocked: Number(nf?.guard?.blockedCount) || 0,
        guardForceAsk: Number(nf?.guard?.forceAskCount) || 0,
        verifyFailed: nf?.verify?.lastStatus === 'fail',
        radarAwaiting: Number(nf?.radar?.awaitingCount) || 0,
      };
    }

    function detectActiveModelLabel() {
      try {
        const scope = getScope();
        const el =
          scope?.querySelector?.('[data-testid="model-selector-trigger"]') ||
          doc?.querySelector?.('[data-testid="model-selector-trigger"]');
        return String(el?.getAttribute?.('aria-label') || el?.textContent || '').trim();
      } catch {
        return '';
      }
    }

    function getCurrentSegments(cfg, strings) {
      return computeHudSegments({
        cfg,
        snap: lastState.snap,
        watchdog: lastState.watchdog,
        quota: lastState.quota,
        quotaSummary: lastState.quotaSummary,
        activeModel: detectActiveModelLabel(),
        queue: lastState.queue,
        bookmarkCount: lastState.bookmarkCount,
        autoAccept: lastState.autoAccept,
        nov: buildNovInput(cfg),
        strings,
        formatTokens: ctxSrc?.formatTokens,
      });
    }

    function syncPrismContextCards() {
      const hosts = findPrismPulseHosts();
      let embeddedCount = 0;
      const cfg = getConfig();
      const strings = S();
      const bmCount = Number(lastState.bookmarkCount) || 0;
      const thText = cfg.compactThreshold === 'off' ? strings.cfgThresholdOff : `${cfg.compactThreshold}%`;
      const allSegs = getCurrentSegments(cfg, strings);
      lastSegments = allSegs;
      const chipSegs = allSegs.filter((seg) => seg.id !== 'ctx' && seg.id !== 'bookmarks' && seg.id !== 'brand');

      for (const host of hosts) {
        const sr = host?.shadowRoot;
        if (!sr || typeof sr.getElementById !== 'function') continue;
        const ctxCard = sr.getElementById('context-card');
        if (!ctxCard) continue;

        // Ensure scoped Shadow DOM style
        let st = sr.getElementById(PRISM_STYLE_ID);
        if (!st) {
          st = coexist.markOwnedNoTranslate(doc.createElement('style'));
          st.id = PRISM_STYLE_ID;
          st.textContent = PRISM_SHADOW_CSS;
          sr.appendChild(st);
        }

        // Reuse or create embedded section right before #context-note inside #context-card
        let sec = ctxCard.querySelector?.(`[data-testid="${PRISM_SEC_TESTID}"]`) || null;
        if (!sec) {
          sec = coexist.markOwnedNoTranslate(doc.createElement('section'));
          sec.className = 'ag-sg-pv-sec';
          sec.setAttribute('data-testid', PRISM_SEC_TESTID);
          const note = sr.getElementById('context-note');
          if (note && note.parentElement === ctxCard && typeof ctxCard.insertBefore === 'function') {
            ctxCard.insertBefore(sec, note);
          } else {
            ctxCard.appendChild(sec);
          }
        }

        while (sec.firstChild) sec.removeChild(sec.firstChild);

        const head = mk('div', 'ag-sg-pv-head');
        const titleWrap = mk('div', 'ag-sg-pv-title-wrap');
        const title = mk('span', 'ag-sg-pv-title', `${strings.pvAutoCompactTitle} ${thText}`);
        title.title = strings.setDescThreshold;
        titleWrap.appendChild(title);
        if (bmCount > 0 && typeof options.onOpenVault === 'function') {
          titleWrap.appendChild(mkBtn('ag-sg-pv-bm', `★ ${bmCount}`, { 'data-ag-sg-pv-act': 'open-vault' }, () => { closePrismContextCard(sr); options.onOpenVault(); }));
        }
        head.appendChild(titleWrap);
        if (typeof options.onCleanRestart === 'function') {
          const cb = mkBtn('ag-sg-pv-act', strings.btnClearKeep, { 'data-ag-sg-pv-act': 'clean-restart' }, () => { closePrismContextCard(sr); options.onCleanRestart({ mode: 'keep' }); });
          cb.title = strings.clearKeepTip;
          head.appendChild(cb);
        }
        sec.appendChild(head);

        const hudRow = mk('div', 'ag-sg-pv-hud');
        if (chipSegs.length === 0) hudRow.hidden = true;
        else {
          for (const seg of chipSegs) {
            const chip = mk('span', 'ag-sg-pv-chip', seg.text, { 'data-ag-sag-hud-seg': seg.id, 'data-tone': seg.tone });
            if (seg.title) chip.title = seg.title;
            hudRow.appendChild(chip);
          }
        }
        sec.appendChild(hudRow);
        sec.appendChild(mkBtn('ag-sg-pv-link', strings.cardOpenSettingsBtn || 'Full Settings →', { 'data-ag-sg-pv-act': 'open-settings' }, () => { closePrismContextCard(sr); options.onOpenSettings?.('conversation'); }));

        embeddedShadowHosts.add(host);
        embeddedCount += 1;
      }

      return embeddedCount;
    }

    function formatResetCompact(sec) {
      const s = Number(sec);
      if (!Number.isFinite(s) || s <= 0) return '';
      const h = Math.floor(s / 3600);
      const m = Math.max(1, Math.ceil((s % 3600) / 60));
      if (h > 0) return `${h}h${m < 60 ? `${m}m` : ''}`;
      return `${m}m`;
    }

    function ratioTone(pct, limited = false) {
      if (limited || pct >= 95) return 'danger';
      if (pct >= 80) return 'warn';
      if (pct >= 60) return 'warm';
      return 'ok';
    }

    function appendMeterRow(container, { label, pct, sub, tone, testAttr, title }) {
      const row = mk('div', 'ag-sag-meter', undefined, testAttr ? { 'data-ag-sag-card-metric': testAttr } : null);
      if (title) row.title = title;
      const top = mk('div', 'ag-sag-meter-head');
      top.appendChild(mk('span', 'ag-sag-meter-label', label));
      const valWrap = mk('span', 'ag-sag-meter-val');
      if (sub) valWrap.appendChild(mk('span', 'ag-sag-meter-sub', sub));
      valWrap.appendChild(mk('span', 'ag-sag-meter-pct', pct === null ? '—' : `${pct}%`, { 'data-tone': tone || 'ok' }));
      top.appendChild(valWrap);
      row.appendChild(top);
      const track = mk('div', 'ag-sag-quota-bar ag-sag-meter-track');
      const fill = mk('span', 'ag-sag-quota-bar-fill', undefined, { 'data-tone': tone || 'ok' });
      const clamped = pct === null ? 0 : Math.max(0, Math.min(100, pct));
      if (fill.style) fill.style.width = `${clamped}%`;
      track.appendChild(fill);
      row.appendChild(track);
      container.appendChild(row);
    }

    function renderStandaloneCard() {
      if (!cardEl || destroyed) return;
      cardEl.hidden = !cardOpen;
      if (!cardOpen) return;

      const cfg = getConfig();
      const mods = cfg.modules || {};
      const strings = S();
      const sagStr = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang()) : {};
      const snap = lastState.snap;
      const ctxPct = snap && typeof snap.usedPct === 'number' ? Math.max(0, Math.min(100, Math.round(snap.usedPct))) : null;
      const usedLbl = snap ? ctxSrc.formatTokens(snap.usedTokens) : '—';
      const maxLbl = snap ? ctxSrc.formatTokens(snap.maxTokens) : '—';
      const tokText = snap ? `${usedLbl} / ${maxLbl}` : '';
      const bmCount = Number(lastState.bookmarkCount) || 0;
      const thText = cfg.compactThreshold === 'off' ? strings.cfgThresholdOff : `${cfg.compactThreshold}%`;

      while (cardEl.firstChild) cardEl.removeChild(cardEl.firstChild);

      // 1. Minimal header: title + quiet timing / source note (no noisy DOM Est pill)
      const head = mk('div', 'ag-sg-card-head');
      head.appendChild(mk('span', 'ag-sg-card-title', sagStr.cardHeaderTitle || 'Usage & Context'));
      const metaWrap = mk('span', 'ag-sg-card-meta');
      const lastElapsed = Number(lastState.watchdog?.lastTurnElapsedSec);
      const elapsedText =
        mods.sessionWatchdog && Number.isFinite(lastElapsed) && lastElapsed > 0
          ? `${lastElapsed >= 60 ? formatDurationMMSS(lastElapsed) : `${lastElapsed}s`}`
          : '';
      const rawSrc = String(snap?.source || snap?.telemetry?.dataSource || '');
      const srcTag = formatDataSourceLabel(rawSrc);
      if (elapsedText) {
        metaWrap.appendChild(mk('span', 'ag-sag-card-elapsed', elapsedText));
      }
      if (srcTag && rawSrc !== 'dom-est') {
        const srcEl = mk('span', 'ag-sag-card-source', srcTag, {
          'data-testid': 'ag-sag-card-source',
          'data-source': rawSrc,
        });
        metaWrap.appendChild(srcEl);
      } else if (srcTag) {
        metaWrap.title = srcTag;
      }
      head.appendChild(metaWrap);
      cardEl.appendChild(head);

      // 2. Model Quota section (Prism-aligned: real 5h & weekly remaining % + reset countdown, zero fake turn counts)
      if (mods.quotaPulse) {
        const qSec = mk('section', 'ag-sag-qsec', undefined, { 'data-testid': 'ag-sag-quota-section' });
        const liveGroups = Array.isArray(lastState.quotaSummary?.groups) ? lastState.quotaSummary.groups : [];
        const activeGroup = pickActiveQuotaGroup(liveGroups, detectActiveModelLabel(), selectedQuotaGroupId);

        if (activeGroup && (activeGroup.fiveHour || activeGroup.weekly)) {
          const b5 = activeGroup.fiveHour;
          const bw = activeGroup.weekly;
          const minPct = Math.min(
            b5 ? Number(b5.remainingPct ?? 100) : 100,
            bw ? Number(bw.remainingPct ?? 100) : 100
          );
          const paceTone = remainingTone(minPct);
          const paceLabel =
            paceTone === 'danger'
              ? sagStr.cardQuotaLow || 'Low Quota'
              : paceTone === 'warn'
                ? sagStr.cardQuotaTight || 'Running Low'
                : sagStr.cardQuotaHealthy || 'Healthy';

          const qHead = mk('div', 'ag-sag-qhead');
          const qTitle = mk('span', 'ag-sag-qtitle');
          qTitle.appendChild(mk('span', undefined, activeGroup.shortName || activeGroup.displayName));
          qTitle.appendChild(mk('span', 'ag-sag-qpace', paceLabel, { 'data-tone': paceTone }));
          qHead.appendChild(qTitle);

          if (liveGroups.length > 1) {
            const tabs = mk('div', 'ag-sag-qtabs');
            for (const g of liveGroups) {
              const isAct = g.id === activeGroup.id;
              tabs.appendChild(
                mkBtn(
                  'ag-sag-qtab',
                  g.shortName || g.displayName,
                  { 'data-ag-sag-qgroup': g.id, 'aria-pressed': String(isAct) },
                  () => {
                    selectedQuotaGroupId = g.id;
                    renderStandaloneCard();
                  }
                )
              );
            }
            qHead.appendChild(tabs);
          }
          qSec.appendChild(qHead);

          const rows = mk('div', 'ag-sag-qrows');
          const addQuotaRow = (label, bucket, attr) => {
            if (!bucket) return;
            const remPct = Math.max(
              0,
              Math.min(100, Math.round(Number(bucket.remainingPct ?? (Number(bucket.remainingFraction) * 100)) || 0))
            );
            const row = mk('div', 'ag-sag-qrow', undefined, { 'data-ag-sag-card-metric': attr });
            row.appendChild(mk('span', 'ag-sag-qlbl', label));
            const track = mk('div', 'ag-sag-quota-bar ag-sag-meter-track');
            const fill = mk('span', 'ag-sag-quota-bar-fill', undefined, { 'data-tone': remainingTone(remPct) });
            if (fill.style) fill.style.width = `${remPct}%`;
            track.appendChild(fill);
            row.appendChild(track);
            const eta = bucket.resetInMs > 0 ? formatResetDurationMs(bucket.resetInMs) : '';
            row.appendChild(mk('span', 'ag-sag-qval', eta ? `${remPct}% · ${eta}` : `${remPct}%`));
            rows.appendChild(row);
          };
          addQuotaRow(sagStr.cardQuota5h || '5h Win', b5, 'quota');
          addQuotaRow(sagStr.cardQuota7d || 'Weekly', bw, 'quota-7d');
          qSec.appendChild(rows);
        } else {
          const obs = lastState.quota?.observed || null;
          if (obs && (obs.rateLimited || (typeof obs.observedPct === 'number' && Number.isFinite(obs.observedPct)))) {
            const usedObs = obs.rateLimited ? 100 : Math.max(0, Math.min(100, Math.round(obs.observedPct)));
            const remObs = Math.max(0, 100 - usedObs);
            const rows = mk('div', 'ag-sag-qrows');
            const row = mk('div', 'ag-sag-qrow', undefined, { 'data-ag-sag-card-metric': 'quota' });
            row.appendChild(mk('span', 'ag-sag-qlbl', obs.bucket === 'weekly' ? (sagStr.cardQuota7d || 'Weekly') : (sagStr.cardQuota5h || '5h Win')));
            const track = mk('div', 'ag-sag-quota-bar ag-sag-meter-track');
            const fill = mk('span', 'ag-sag-quota-bar-fill', undefined, { 'data-tone': remainingTone(remObs) });
            if (fill.style) fill.style.width = `${remObs}%`;
            track.appendChild(fill);
            row.appendChild(track);
            const eta = obs.remainingSec ? formatResetCompact(obs.remainingSec) : '';
            row.appendChild(mk('span', 'ag-sag-qval', eta ? `${remObs}% · ${eta}` : `${remObs}%`));
            rows.appendChild(row);
            qSec.appendChild(rows);
          } else {
            qSec.appendChild(mk('div', 'ag-sag-qnote', sagStr.cardQuotaOffline || 'Waiting for local quota service'));
          }
        }
        cardEl.appendChild(qSec);
      }

      // 3. Compact current context bar
      const meters = mk('div', 'ag-sag-meters');
      if (mods.compactGuard) {
        const autoNote = cfg.compactThreshold === 'off' ? '' : formatTpl(sagStr.cardAutoAt || 'Auto at {th}', { th: thText });
        const ctxSub = [tokText, cfg.compactThreshold === 'off' ? '' : thText].filter(Boolean).join(' · ');
        appendMeterRow(meters, {
          label: sagStr.cardContextTitle || strings.cardContextLabel || 'Context',
          pct: ctxPct,
          sub: ctxSub,
          tone: ratioTone(ctxPct ?? 0, false),
          testAttr: 'context',
          title: [tokText, autoNote].filter(Boolean).join(' · '),
        });
      }
      if (meters.children.length > 0) cardEl.appendChild(meters);

      // 3. Quiet conditional chips: ONLY render non-zero / active items (zero clutter when idle)
      const chips = mk('div', 'ag-sag-card-chips');
      const etaTurns = Number(lastState.watchdog?.estimatedTurnsLeft) || 0;
      if (mods.sessionWatchdog && etaTurns > 0) {
        chips.appendChild(mk('span', 'ag-sag-card-chip', formatTpl(sagStr.cardChipEta || '~{n} turns left', { n: etaTurns }), { 'data-ag-sag-card-metric': 'eta' }));
      }
      if (mods.outlineBookmarks && bmCount > 0) {
        if (typeof options.onOpenVault === 'function') {
          chips.appendChild(mkBtn('ag-sag-card-chip ag-sag-card-chip-btn', `★ ${bmCount}`, { 'data-ag-sg-card-act': 'open-vault', 'data-ag-sag-card-metric': 'bookmarks' }, () => { close(); options.onOpenVault(); }));
        } else {
          chips.appendChild(mk('span', 'ag-sag-card-chip', `★ ${bmCount}`, { 'data-ag-sag-card-metric': 'bookmarks' }));
        }
      }
      if (mods.draftGuard !== false && lastState.hasDraft) {
        chips.appendChild(mk('span', 'ag-sag-card-chip', sagStr.cardChipDraft || 'Draft saved', { 'data-ag-sag-card-metric': 'draft' }));
      }
      const qCnt = mods.promptQueue && lastState.queue ? Number(lastState.queue.itemCount) || 0 : 0;
      if (qCnt > 0) {
        chips.appendChild(mk('span', 'ag-sag-card-chip', formatTpl(sagStr.cardChipQueue || '{n} queued', { n: qCnt }), { 'data-ag-sag-card-metric': 'queue' }));
      }
      const novInfo = buildNovInput(cfg);
      if (novInfo.connected) {
        chips.appendChild(mk('span', 'ag-sag-card-chip', `NOV ${novInfo.enabledCount}/${novInfo.total}`, { 'data-ag-sag-card-metric': 'nov' }));
      }
      if (chips.children.length > 0) cardEl.appendChild(chips);

      // 4. Collapsible breakdown & activity details (collapsed by default so main view stays clean)
      let lensNode = null;
      if (mods.compactGuard && typeof ctxSrc?.analyzeContextBreakdown === 'function') {
        const nowMs = Date.now();
        const curCid = String(lastState.snap?.cascadeId || '');
        if (!lastBreakdownCache || nowMs - lastBreakdownCache.ts > 3000 || lastBreakdownCache.cid !== curCid) {
          lastBreakdownCache = { ts: nowMs, cid: curCid, data: ctxSrc.analyzeContextBreakdown(doc, activePaneEl) };
        }
        const bd = lastBreakdownCache.data;
        if (bd && bd.totalChars > 0) {
          const lens = mk('div', 'ag-sag-ctx-lens', undefined, { 'data-testid': 'ag-sag-ctx-lens' });
          const bar = mk('div', 'ag-sag-ctx-bar');
          const segDefs = [
            { kind: 'user', pct: bd.shares.userPct, label: sagStr.ctxLensUser || 'User' },
            { kind: 'assistant', pct: bd.shares.assistantPct, label: sagStr.ctxLensAssistant || 'Reply' },
            { kind: 'code', pct: bd.shares.codeToolsPct, label: sagStr.ctxLensCodeTools || 'Code' },
          ];
          for (const sd of segDefs) {
            if (sd.pct <= 0) continue;
            const part = mk('span', 'ag-sag-ctx-bar-seg', undefined, { 'data-kind': sd.kind });
            if (part.style) part.style.width = `${sd.pct}%`;
            part.title = `${sd.label} ${sd.pct}%`;
            bar.appendChild(part);
          }
          lens.appendChild(bar);
          lens.appendChild(
            mk(
              'div',
              'ag-sag-ctx-legend',
              `${sagStr.ctxLensUser || 'User'} ${bd.shares.userPct}% · ${sagStr.ctxLensAssistant || 'Reply'} ${bd.shares.assistantPct}% · ${sagStr.ctxLensCodeTools || 'Code'} ${bd.shares.codeToolsPct}%`
            )
          );
          if (bd.topTurns && bd.topTurns.length > 0) {
            const topRow = mk('div', 'ag-sag-ctx-top-turns', undefined, { 'data-testid': 'ag-sag-ctx-top-turns' });
            for (const tt of bd.topTurns) {
              const jb = mkBtn('ag-sag-ctx-turn-chip', `#${tt.turnNum} · ${tt.pctOfChat}%`, { 'data-ag-sag-jump-turn': String(tt.turnNum) }, () => {
                close();
                try { tt.node?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); } catch {}
              });
              jb.title = `#${tt.turnNum} (~${ctxSrc.formatTokens(tt.estTokens)}) ${tt.preview || ''}`.trim();
              topRow.appendChild(jb);
            }
            lens.appendChild(topRow);
          }
          lensNode = lens;
        }
      }

      let telNode = null;
      const tel = snap?.telemetry || lastState.telemetry || null;
      if (tel && typeof tel === 'object' && [tel.active5hSessions, tel.active5hSteps, tel.active7dSteps].some((n) => Number.isFinite(Number(n)))) {
        const num = (v) => Math.max(0, Math.round(Number(v) || 0));
        const telRow = mk('div', 'ag-sag-telemetry-row', undefined, { 'data-testid': 'ag-sag-telemetry-row' });
        telRow.appendChild(mk('span', undefined, `5h · ${num(tel.active5hSessions)} sess / ${num(tel.active5hSteps)} steps`));
        telRow.appendChild(mk('span', undefined, `7d · ${num(tel.active7dSteps)} steps`));
        telNode = telRow;
      }

      if (lensNode || telNode) {
        const details = mk('details', 'ag-sag-card-details');
        details.appendChild(mk('summary', 'ag-sag-card-details-sum', sagStr.cardDetailsSummary || 'Breakdown & details'));
        const inner = mk('div', 'ag-sag-card-details-body');
        if (lensNode) inner.appendChild(lensNode);
        if (telNode) inner.appendChild(telNode);
        details.appendChild(inner);
        cardEl.appendChild(details);
      }

      // 5. Crisp single-row footer (high-frequency actions only; low-frequency Export lives in Settings -> Conversation)
      const foot = mk('div', 'ag-sg-card-foot');
      const addAct = (cls, text, act, fn, title) => {
        const b = mkBtn(cls, text, { 'data-ag-sg-card-act': act }, () => { close(); fn(); });
        if (title) b.title = title;
        foot.appendChild(b);
      };
      if (typeof options.onCompactNow === 'function') addAct('ag-sg-btn', sagStr.cardBtnCompact || strings.btnCompactNow, 'compact-now', options.onCompactNow);
      if (typeof options.onCleanRestart === 'function') addAct('ag-sg-btn ag-sg-btn-primary', sagStr.cardBtnRestart || strings.btnClearKeep, 'clean-restart', () => options.onCleanRestart({ mode: 'keep' }), strings.clearKeepTip);
      if (typeof options.onOpenSettings === 'function') addAct('ag-sg-btn', sagStr.cardBtnSettings || 'Settings', 'open-settings', () => options.onOpenSettings('overview'));
      if (foot.children.length > 0) cardEl.appendChild(foot);
    }

    function ensureStandalonePill() {
      if (!doc || destroyed) return null;
      const footer = findFooterHost();
      if (!footer) return null;
      ensureStyle();

      if (!wrapEl || wrapEl.parentElement !== footer) {
        try { wrapEl?.remove?.(); } catch {}
        wrapEl = coexist.markOwnedNoTranslate(mk('div', 'ag-sg-pill-wrap', undefined, { 'data-testid': 'ag-sg-pill-wrap' }));
        pillBtn = mkBtn('ag-sg-status-pill', undefined, { 'data-testid': PILL_TESTID, 'aria-haspopup': 'dialog', 'aria-expanded': 'false' }, toggle);
        dotEl = mk('span', 'ag-sg-status-dot', undefined, { 'aria-hidden': 'true' });
        segsEl = mk('span', 'ag-sag-hud-segs');
        pillBtn.appendChild(dotEl);
        pillBtn.appendChild(segsEl);
        cardEl = mk('div', 'ag-sg-status-card', undefined, { role: 'dialog', 'data-testid': CARD_TESTID });
        cardEl.hidden = true;
        wrapEl.appendChild(pillBtn);
        wrapEl.appendChild(cardEl);
        const kids = Array.from(footer.children || []);
        const trailing = kids.length > 1 ? kids[kids.length - 1] : null;
        if (trailing && coexist?.safeInsertBefore) coexist.safeInsertBefore(footer, wrapEl, trailing);
        else if (coexist?.safeAppendChild) coexist.safeAppendChild(footer, wrapEl);
        else { try { footer.appendChild(wrapEl); } catch {} }
      }
      return wrapEl;
    }

    function sync(statePatch = null) {
      if (destroyed) return;
      if (statePatch && typeof statePatch === 'object') {
        lastState = { ...lastState, ...statePatch };
      }

      // Priority 1: Integrate directly inside Obsidian Prism's Context Card -> zero extra top-level footer pill
      const embeddedCount = syncPrismContextCards();
      if (embeddedCount > 0) {
        removeStandalonePill();
        return;
      }

      // Priority 2: Standalone user -> render unified multi-segment HUD capsule in composer footer
      const cfg = getConfig();
      const strings = S();
      const segs = getCurrentSegments(cfg, strings);
      lastSegments = segs;

      const el = ensureStandalonePill();
      if (!el || !pillBtn || !segsEl) return;

      const ctxSeg = segs.find((s) => s.id === 'ctx');
      const pillTone = ctxSeg ? ctxSeg.tone : 'idle';
      const novInfo = buildNovInput(cfg);
      const synergyOn = Boolean(novInfo.connected);

      if (dotEl) {
        dotEl.hidden = Boolean(ctxSeg);
      }

      pillBtn.setAttribute('data-tone', pillTone);
      pillBtn.setAttribute('data-compact', '0');
      pillBtn.setAttribute('aria-expanded', String(cardOpen));
      if (synergyOn) {
        pillBtn.setAttribute('data-synergy', '1');
        dotEl?.setAttribute?.('data-synergy', '1');
      } else {
        pillBtn.removeAttribute?.('data-synergy');
        dotEl?.removeAttribute?.('data-synergy');
      }

      const titles = segs.map((s) => s.title).filter(Boolean);
      if (strings.pillEntryTitle) titles.push(strings.pillEntryTitle);
      pillBtn.title = titles.join(' · ');

      while (segsEl.firstChild) segsEl.removeChild(segsEl.firstChild);
      for (const seg of segs) {
        const segEl = doc.createElement('span');
        segEl.className = 'ag-sag-hud-seg';
        segEl.setAttribute('data-ag-sag-hud-seg', seg.id);
        segEl.setAttribute('data-tone', seg.tone);
        if (seg.title) segEl.title = seg.title;

        if (seg.id === 'ctx') {
          const ring = doc.createElement('span');
          ring.className = 'ag-sag-hud-ring';
          ring.setAttribute('aria-hidden', 'true');
          ring.setAttribute('data-tone', seg.tone);
          ring.setAttribute('data-pct', String(seg.pct ?? 0));
          ring.style?.setProperty?.('--ag-sag-hud-p', String(seg.pct ?? 0));
          segEl.appendChild(ring);
        }

        const txt = doc.createElement('span');
        txt.textContent = seg.text;
        segEl.appendChild(txt);
        segsEl.appendChild(segEl);
      }

      renderStandaloneCard();
    }

    function open() {
      if (destroyed) return;
      cardOpen = true;
      try { options.onRequestQuotaRefresh?.(); } catch {}
      sync();
    }

    function close() {
      cardOpen = false;
      if (pillBtn) pillBtn.setAttribute('aria-expanded', 'false');
      if (cardEl) cardEl.hidden = true;
    }

    function toggle() {
      if (cardOpen) close();
      else open();
    }

    const addL = (target, ev, fn, cap = false) => {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(ev, fn, cap);
      listeners.push(() => target.removeEventListener?.(ev, fn, cap));
    };

    const onOutsideClick = (ev) => {
      if (!cardOpen || destroyed || !wrapEl) return;
      const t = ev?.target;
      if (t && (t === wrapEl || t.closest?.('[data-testid="ag-sg-pill-wrap"]'))) return;
      close();
    };
    const onKeyDown = (ev) => {
      if (cardOpen && !destroyed && String(ev?.key || '').toLowerCase() === 'escape') {
        ev.preventDefault?.();
        close();
      }
    };
    const onPaneFocus = (ev) => {
      if (destroyed || !ev?.target || !ctxSrc.findPaneRootForNode) return;
      const rootPane = ctxSrc.findPaneRootForNode(ev.target, doc);
      if (rootPane && rootPane !== activePaneEl) {
        activePaneEl = rootPane;
        sync();
      }
    };

    addL(doc, 'pointerdown', onOutsideClick, true);
    addL(doc, 'pointerdown', onPaneFocus, true);
    addL(doc, 'focusin', onPaneFocus, true);
    addL(win, 'keydown', onKeyDown);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cardOpen = false;
      while (listeners.length) {
        try { listeners.pop()(); } catch {}
      }
      removeStandalonePill();
      try { createdStyleEl?.remove?.(); } catch {}
      createdStyleEl = null;
      // Lossless Shadow DOM teardown across every Obsidian Prism Pulse host
      const hosts = new Set([...embeddedShadowHosts, ...findPrismPulseHosts()]);
      for (const h of hosts) {
        try {
          const sr = h?.shadowRoot;
          sr?.getElementById?.(PRISM_STYLE_ID)?.remove?.();
          sr?.querySelectorAll?.(`[data-testid="${PRISM_SEC_TESTID}"]`)?.forEach?.((n) => n.remove?.());
        } catch {}
      }
      embeddedShadowHosts.clear();
      activePaneEl = null;
      lastSegments = [];
    }

    sync();

    return {
      sync,
      open,
      close,
      toggle,
      getDebugState: () => {
        const prismEmbedded = findPrismPulseHosts().some((h) =>
          Boolean(h?.shadowRoot?.querySelector?.(`[data-testid="${PRISM_SEC_TESTID}"]`))
        );
        return {
          destroyed,
          mode: prismEmbedded ? 'prism-context-card' : wrapEl && wrapEl.isConnected !== false ? 'standalone-pill' : 'none',
          prismCardEmbedded: prismEmbedded,
          mounted: prismEmbedded || Boolean(wrapEl && wrapEl.isConnected !== false),
          cardOpen,
          synergyConnected: Boolean(buildNovInput(getConfig()).connected),
          label: segsEl?.textContent || '',
          segments: lastSegments.map((s) => s.id),
          novText: lastSegments.find((s) => s.id === 'nov')?.text || '',
        };
      },
      destroy,
    };
  }

  return {
    PILL_TESTID,
    CARD_TESTID,
    PRISM_SEC_TESTID,
    PRISM_STYLE_ID,
    formatDataSourceLabel,
    computeHudSegments,
    createStatusPillController,
  };
});
