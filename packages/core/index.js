// agy-Sag — Unified Modular Suite Entrypoint (UMD)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSgCore = factory(root);
    root.__agSagCore = root.__agSgCore;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const VERSION = '1.6.0';

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

  function mountSag(options = {}) {
    const win = options.win || globalRoot;
    const doc = options.doc || win?.document || null;
    const source = options.source || 'standalone';
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');
    const compactMod = options.compactGuardMod || resolveDep('__agSgCompactGuard', './compact-guard.js');
    const draftMod = options.draftGuardMod || resolveDep('__agSgDraftGuard', './draft-guard.js');
    const cleanSlateMod = options.cleanSlateMod || resolveDep('__agSgCleanSlate', './clean-slate.js');
    const bookmarkMod = options.outlineBookmarksMod || resolveDep('__agSgOutlineBookmarks', './outline-bookmarks.js');
    const vaultMod = options.bookmarkVaultMod || resolveDep('__agSgBookmarkVault', './bookmark-vault.js');
    const radarMod = options.sessionRadarMod || resolveDep('__agSgSessionRadar', './session-radar.js');
    const prismBridgeMod = options.prismBridgeMod || resolveDep('__agSgPrismBridge', './prism-bridge.js');
    const statusPillMod = options.statusPillMod || resolveDep('__agSgStatusPill', './status-pill.js');
    const hostI18nMod = options.hostI18nMod || resolveDep('__agSagHostI18n', './host-i18n.js');
    const hostI18nPacksMod = options.hostI18nPacksMod || resolveDep('__agSagHostI18nPacks', './host-i18n-packs.js');
    const promptQueueMod = options.promptQueueMod || resolveDep('__agSagPromptQueue', './prompt-queue.js');
    const promptLibraryMod = options.promptLibraryMod || resolveDep('__agSagPromptLibrary', './prompt-library.js');
    const readingNavMod = options.readingNavMod || resolveDep('__agSagReadingNav', './reading-nav.js');
    const safeAutoAcceptMod = options.safeAutoAcceptMod || resolveDep('__agSagSafeAutoAccept', './safe-auto-accept.js');
    const themeStudioMod = options.themeStudioMod || resolveDep('__agSagThemeStudio', './theme-studio.js');
    const quotaPulseMod = options.quotaPulseMod || resolveDep('__agSagQuotaPulse', './quota-pulse.js');
    const novSynergyMod = options.novSynergyMod || resolveDep('__agSagNovSynergy', './nov-synergy.js');
    const thoughtTranslatorMod = options.thoughtTranslatorMod || resolveDep('__agSagThoughtTranslator', './thought-translator.js');

    // Coexistence auto-yield: if a host integrator (e.g. Obsidian Prism Channel 13) already owns agy-Sag, standalone yields cleanly
    if (coexist.shouldYieldToHostIntegrator(win, source)) {
      const owner = coexist.readHostOwner
        ? coexist.readHostOwner(win)
        : win?.[coexist.OWNER_GLOBAL] || win?.[coexist.LEGACY_OWNER_GLOBAL];
      return {
        version: VERSION,
        yielded: true,
        owner,
        destroy() {},
        getDebugState: () => ({ yielded: true, owner, version: VERSION }),
      };
    }

    // Capture preloaded extended packs BEFORE tearing down any prior instance so hot-reloads never lose them
    const rawPreloadedExtPacks = options.extPacks || win?.__agSagExtPacks || globalRoot?.__agSagExtPacks || null;
    const preloadedExtPacks =
      rawPreloadedExtPacks && typeof rawPreloadedExtPacks === 'object' ? { ...rawPreloadedExtPacks } : null;

    // Replace any prior standalone instance losslessly
    try { win?.[coexist.INSTANCE_GLOBAL]?.destroy?.({ replacing: true }); } catch {}
    if (coexist.LEGACY_INSTANCE_GLOBAL) {
      try { win?.[coexist.LEGACY_INSTANCE_GLOBAL]?.destroy?.({ replacing: true }); } catch {}
    }

    // Migrate legacy agSessionGuard.* keys to agSag.* before sub-modules initialize
    try { coexist.migrateLegacyStorage?.(win?.localStorage); } catch {}
    try { coexist.migrateLegacyStorage?.(win?.sessionStorage); } catch {}
    if (options.storage && options.storage !== win?.localStorage && options.storage !== win?.sessionStorage) {
      try { coexist.migrateLegacyStorage?.(options.storage); } catch {}
    }

    let draftGuard = null;
    let cleanSlate = null;
    let outlineBookmarks = null;
    let bookmarkVault = null;
    let sessionRadar = null;
    let prismBridge = null;
    let statusPill = null;
    let hostI18n = null;
    let promptQueue = null;
    let promptLibrary = null;
    let readingNav = null;
    let safeAutoAccept = null;
    let themeStudio = null;
    let quotaPulse = null;
    let novSynergy = null;
    let thoughtTranslator = null;
    const quotaBySession = new Map();

    let quotaSummary = null;
    let lastQuotaSummaryAtMs = 0;
    let quotaSummaryInflight = false;

    const refreshQuotaSummary = () => {
      if (destroyed || options.novTransport || !novSynergy?.isBridgeAvailable?.()) return;
      const nowMs = Date.now();
      if (quotaSummaryInflight || (lastQuotaSummaryAtMs > 0 && nowMs - lastQuotaSummaryAtMs < 60000)) return;
      quotaSummaryInflight = true;
      lastQuotaSummaryAtMs = nowMs;
      Promise.resolve(novSynergy.requestRaw?.('sag:quota_summary', {}))
        .then((res) => {
          const data = res?.raw?.data ?? res?.data ?? null;
          if (!destroyed && res?.ok && data && typeof data === 'object') {
            quotaSummary = data;
            syncStatusPill();
          }
        })
        .catch(() => {})
        .finally(() => {
          quotaSummaryInflight = false;
        });
    };

    const openVault = () => bookmarkVault?.open?.();
    const syncStatusPill = () => {
      if (!statusPill) return;
      const cgState = compactGuard.getDebugState();
      const bmState = outlineBookmarks?.getDebugState?.() || null;
      const dgState = draftGuard?.getDebugState?.() || null;
      const pqState = promptQueue?.getDebugState?.() || null;
      const qpState = quotaPulse?.getSummary?.() || null;
      const aaState = safeAutoAccept?.getDebugState?.() || null;
      const hiState = hostI18n?.getDebugState?.() || null;
      const novState = novSynergy?.getState?.() || null;
      const novFeed = novSynergy?.getFeed?.() || null;
      const novConnected = Boolean(novSynergy?.isConnected?.());
      statusPill.sync({
        snap: cgState.lastSnapshot || null,
        watchdog: cgState.watchdog || null,
        bookmarkCount: bmState?.bookmarkCount || 0,
        hasDraft: Boolean(dgState?.barVisible || (dgState?.savedDraftCount || 0) > 0),
        queue: pqState ? { itemCount: pqState.itemCount || 0, paused: Boolean(pqState.paused) } : null,
        quota: qpState,
        quotaSummary,
        autoAccept: aaState
          ? { enabled: Boolean(aaState.enabled), paused: Boolean(aaState.paused), dryRun: Boolean(aaState.dryRun) }
          : null,
        nov: {
          connected: novConnected,
          enabledCount: Number(novState?.enabledCount) || 0,
          total: novSynergyMod?.NOV_MODULE_IDS?.length || 13,
          specWriteLocked: Boolean(novFeed?.spec?.writeLockActive),
          memDrifted: Number(novFeed?.mem?.driftedCount) || 0,
          guardBlocked: Number(novFeed?.guard?.blockedCount) || 0,
          guardForceAsk: Number(novFeed?.guard?.forceAskCount) || 0,
          verifyFailed: novFeed?.verify?.lastStatus === 'fail',
          verifyBlocked: novFeed?.verify?.lastStatus === 'blocked',
          healthScore: typeof novFeed?.healthSweep?.score === 'number' ? novFeed.healthSweep.score : null,
          radarAwaiting: Number(novFeed?.radar?.awaitingCount) || 0,
        },
        hostLocale: hiState?.locale || 'en',
        synergyConnected: novConnected,
      });
    };

    const syncExtPacks = () => {
      const liveExtPacks = win?.__agSagExtPacks || globalRoot?.__agSagExtPacks || null;
      if (liveExtPacks && hostI18nPacksMod?.registerExtendedPack) {
        for (const [extLoc, extPack] of Object.entries(liveExtPacks)) {
          if (extPack && typeof extPack === 'object' && !hostI18nPacksMod.hasExtendedPack?.(extLoc)) {
            try { hostI18nPacksMod.registerExtendedPack(extLoc, extPack); } catch {}
          }
        }
      }
    };

    const syncSubModulesFromConfig = (nextCfg) => {
      draftGuard?.setEnabled?.(Boolean(nextCfg.modules?.draftGuard));
      outlineBookmarks?.setEnabled?.(Boolean(nextCfg.modules?.outlineBookmarks));
      sessionRadar?.setEnabled?.(Boolean(nextCfg.modules?.sessionRadar));
      sessionRadar?.setNotifyMode?.(nextCfg.radarNotifyMode || 'off');
      sessionRadar?.setAudioMode?.(nextCfg.radarAudioMode || 'off');
      sessionRadar?.setQuietHours?.(nextCfg.radarQuietHours || '');

      if (hostI18n) {
        syncExtPacks();
        const prevHostLoc = hostI18n.getDebugState?.()?.locale || '';
        hostI18n.setConflictPolicy?.(nextCfg.hostI18nConflictPolicy || 'yield');
        hostI18n.setCollectMissing?.(Boolean(nextCfg.hostI18nCollectMissing));
        hostI18n.setLocale?.(nextCfg.hostI18nLocale || 'auto');
        hostI18n.setEnabled?.(Boolean(nextCfg.modules?.hostI18n));
        // Optional dual-star 8-locale sync: when host locale changes inside agy-NOV's supported set, sync NOV too
        const nextLoc = nextCfg.hostI18nLocale || 'auto';
        const novAllowedLocs = novSynergyMod?.ALLOWED_NOV_LOCALES || ['auto', 'en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de'];
        if (
          prevHostLoc &&
          nextLoc !== prevHostLoc &&
          novAllowedLocs.includes(nextLoc) &&
          novSynergy?.isConnected?.() &&
          typeof novSynergy.setLocale === 'function' &&
          novSynergy.getState?.()?.config?.locale !== nextLoc
        ) {
          void novSynergy.setLocale(nextLoc).catch?.(() => {});
        }
      }

      if (promptQueue) {
        promptQueue.setEnabled?.(Boolean(nextCfg.modules?.promptQueue));
      }

      if (promptLibrary) {
        promptLibrary.setEnabled?.(Boolean(nextCfg.modules?.promptLibrary));
      }

      if (readingNav) {
        readingNav.setCollapseLines?.(nextCfg.readingCollapseLines || 40);
        readingNav.setEnabled?.(Boolean(nextCfg.modules?.readingNav));
      }

      if (safeAutoAccept) {
        safeAutoAccept.setPolicy?.(nextCfg.autoAcceptPolicy || 'readonly-safe');
        safeAutoAccept.setCustomAllowPatterns?.(nextCfg.autoAcceptCustomPatterns || []);
        safeAutoAccept.setDryRun?.(Boolean(nextCfg.autoAcceptDryRun));
        safeAutoAccept.setEnabled?.(Boolean(nextCfg.modules?.safeAutoAccept));
      }

      if (themeStudio) {
        const nextThemeEnabled = Boolean(nextCfg.modules?.themeStudio);
        const wasThemeEnabled = Boolean(themeStudio.getDebugState?.()?.enabled);
        themeStudio.setExternalConvStateSource?.(Boolean(nextCfg.modules?.compactGuard), { silent: true });
        themeStudio.updateSettings?.(
          {
            preset: nextCfg.themePreset || 'native',
            autoPair: Boolean(nextCfg.themeAutoPair),
            accent: nextCfg.themeAccent || 'follow',
            corners: nextCfg.themeCorners || 'balanced',
            surface: nextCfg.themeSurface || 'smoked',
            codeFont: nextCfg.themeCodeFont || 'default',
            chatFont: nextCfg.themeChatFont || 'default',
            codeLigatures: Boolean(nextCfg.themeCodeLigatures),
            ambientGlow: nextCfg.themeAmbientGlow || 'subtle',
            streamFade: nextCfg.themeStreamFade !== false,
            smoothCaret: nextCfg.themeSmoothCaret !== false,
            cjkFontTuning: nextCfg.themeCjkFont !== false,
            density: nextCfg.themeDensity || 'balanced',
            compactSidebar: Boolean(nextCfg.themeCompactSidebar),
            wideReadable: Boolean(nextCfg.themeWideReadable),
            customCss: nextCfg.themeCustomCss || '',
            conflictPolicy: nextCfg.themeConflictPolicy || 'yield',
          },
          { silent: true }
        );
        if (nextThemeEnabled || wasThemeEnabled) {
          themeStudio.setEnabled?.(nextThemeEnabled);
        }
      }

      if (quotaPulse) {
        quotaPulse.updateLimits?.({
          softTurns5h: nextCfg.quotaSoftTurns5h || 60,
          softTurns7d: nextCfg.quotaSoftTurns7d || 350,
        });
        quotaPulse.setEnabled?.(Boolean(nextCfg.modules?.quotaPulse));
      }

      if (thoughtTranslator) {
        thoughtTranslator.configure?.({
          enabled: Boolean(nextCfg.modules?.thoughtTranslate),
          engine: nextCfg.thoughtEngine || 'mt',
          targetLang: nextCfg.thoughtTargetLang || 'auto',
          triggerMode: nextCfg.thoughtTrigger || 'auto',
          viewMode: nextCfg.thoughtViewMode || 'bilingual',
          stylePreset: nextCfg.thoughtStylePreset || 'technical',
          translateTitles: Boolean(nextCfg.thoughtTranslateTitles),
          conflictPolicy: nextCfg.hostI18nConflictPolicy || 'yield',
        });
      }

      prismBridge?.sync?.();
      syncStatusPill();
    };

    let lastStreamStartedAtMs = 0;
    let lastCompletedAtMs = 0;

    const compactGuard = compactMod.createCompactGuardController({
      ...options,
      win,
      doc,
      coexist,
      prismBridgeMod,
      onOpenVault: openVault,
      onOpenSettingsDrawer: (tabId) => prismBridge?.openDrawer?.(tabId),
      isSettingsDrawerOpen: () => Boolean(prismBridge?.isDrawerOpen?.()),
      onEvaluated: (snap) => {
        if (quotaPulse && compactGuard.getConfig().modules?.quotaPulse) {
          const usedTokens = Number(snap?.usedTokens);
          const cid = String(snap?.cascadeId || 'default');
          const streaming = Boolean(snap?.streaming);
          if (Number.isFinite(usedTokens) && usedTokens > 0) {
            const prev = quotaBySession.get(cid);
            if (!prev) {
              quotaBySession.set(cid, { usedTokens, streaming });
            } else if (!streaming) {
              // Record once per completed turn (or steady-state growth) per isolated cascadeId
              if (usedTokens > prev.usedTokens) {
                quotaPulse.recordTurn?.({
                  deltaTokens: usedTokens - prev.usedTokens,
                  cascadeId: cid,
                });
              }
              quotaBySession.set(cid, { usedTokens, streaming: false });
            } else {
              // While streaming, keep baseline usedTokens until turn finishes to avoid double-counting
              quotaBySession.set(cid, { usedTokens: prev.usedTokens, streaming: true });
            }
          }
          quotaPulse.scanDomForSignals?.();
        }
        if (promptQueue && compactGuard.getConfig().modules?.promptQueue && !snap?.streaming) {
          promptQueue.sync?.();
        }
        if (themeStudio && compactGuard.getConfig().modules?.themeStudio) {
          const nowTs = Date.now();
          let convState = themeStudioMod?.detectConvStateFromDom
            ? themeStudioMod.detectConvStateFromDom(doc, { streaming: Boolean(snap?.streaming) })
            : Boolean(
                  doc?.querySelector?.(
                    '[data-testid="interaction-takeover-card"], [data-testid="permission-card"], [data-testid="tool-approval-card"]'
                  )
                )
              ? 'awaiting'
              : Boolean(doc?.querySelector?.('[data-testid="agent-error"], [role="alert"][data-error="true"]'))
                ? 'error'
                : snap?.streaming
                  ? 'running'
                  : 'idle';
          if (convState === 'running') {
            if (!lastStreamStartedAtMs) lastStreamStartedAtMs = nowTs;
          } else {
            if (convState === 'idle' && lastStreamStartedAtMs > 0 && nowTs - lastStreamStartedAtMs >= 20000) {
              lastCompletedAtMs = nowTs;
            }
            lastStreamStartedAtMs = 0;
            if (convState === 'idle' && lastCompletedAtMs > 0 && nowTs - lastCompletedAtMs < 15000) {
              convState = 'completed';
            }
          }
          themeStudio.setConvState?.(convState);
        }
        syncStatusPill();
      },
      onStallDetected: (ev) => {
        sessionRadar?.notifyStall?.(ev);
        syncStatusPill();
        if (typeof options.onStallDetected === 'function') options.onStallDetected(ev);
      },
      onConfigChange: (nextCfg) => {
        syncSubModulesFromConfig(nextCfg);
        if (typeof options.onConfigChange === 'function') options.onConfigChange(nextCfg);
      },
    });
    const cfg = compactGuard.getConfig();

    draftGuard = draftMod?.createDraftGuardController
      ? draftMod.createDraftGuardController({
          win,
          doc,
          storage: options.storage,
          coexist,
          enabled: cfg.modules?.draftGuard !== false,
          now: options.now,
          debounceMs: options.draftDebounceMs,
          getLang: options.getLang,
          onDraftRestored: (ev) => {
            syncStatusPill();
            if (typeof options.onDraftRestored === 'function') options.onDraftRestored(ev);
          },
          onDraftDiscarded: (ev) => {
            syncStatusPill();
            if (typeof options.onDraftDiscarded === 'function') options.onDraftDiscarded(ev);
          },
        })
      : null;

    outlineBookmarks = bookmarkMod.createOutlineBookmarksController({
      win,
      doc,
      storage: options.storage,
      coexist,
      enabled: Boolean(cfg.modules?.outlineBookmarks),
      autoObserve: options.autoObserve,
      getLang: options.getLang,
      onOpenVault: openVault,
      onCopyHandoff: options.onCopyHandoff,
      onBookmarksChange: (ev) => {
        void compactGuard.evaluateNow().then(syncStatusPill);
        readingNav?.sync?.();
        syncStatusPill();
        if (typeof options.onBookmarksChange === 'function') options.onBookmarksChange(ev);
      },
      onExportMarkdown: options.onExportMarkdown,
      onDownloadMarkdown: options.onDownloadMarkdown,
      isRollbackAvailable: () => Boolean(novSynergy?.isConnected?.() && novSynergy?.getState?.()?.config?.modules?.guard),
      onCompactFromTurn: ({ turnNum, snippet }) => {
        const cmd = `/compact Focus on turn #${turnNum}${snippet ? `: ${snippet}` : ''}`;
        if (promptLibrary?.insertIntoComposer) {
          return promptLibrary.insertIntoComposer(cmd, { mode: 'replace' });
        }
        const ctxSrc = resolveDep('__agSgContextSource', './context-source.js');
        const ed = ctxSrc?.findComposerEditor?.(doc);
        if (!ed) return { ok: false, reason: 'no-editor' };
        return { ok: Boolean(coexist.writeComposerTextSafely(doc, win, ed, cmd, { replace: true })) };
      },
      onRollbackTurn: ({ turnNum, snippet }) => {
        const prompt = `Please use agy-NOV guard to list snapshots before turn #${turnNum}${snippet ? ` ("${snippet}")` : ''} and confirm before rolling back workspace files.`;
        if (promptLibrary?.insertIntoComposer) {
          return promptLibrary.insertIntoComposer(prompt, { mode: 'append' });
        }
        const ctxSrc = resolveDep('__agSgContextSource', './context-source.js');
        const ed = ctxSrc?.findComposerEditor?.(doc);
        if (!ed) return { ok: false, reason: 'no-editor' };
        const existing = String(ctxSrc?.readComposerDraft?.(doc) || '');
        const finalText = existing.trim() ? `${existing}\n\n${prompt}` : prompt;
        return { ok: Boolean(coexist.writeComposerTextSafely(doc, win, ed, finalText, { replace: true })) };
      },
    });

    const requestSearchSessions = async (query) => {
      if (typeof options.onSearchSessions === 'function') return options.onSearchSessions(query);
      if (novSynergy && typeof novSynergy.requestRaw === 'function' && novSynergy.isBridgeAvailable?.()) {
        try {
          const res = await novSynergy.requestRaw('sag:search_sessions', { query, limit: 20 });
          if (res?.ok && res?.raw?.data) return { ok: true, ...res.raw.data };
        } catch {}
      }
      return { ok: false, offline: true, results: [] };
    };

    bookmarkVault = vaultMod?.createBookmarkVaultController
      ? vaultMod.createBookmarkVaultController({
          win,
          doc,
          storage: options.storage,
          coexist,
          getLang: options.getLang,
          bindShortcut: options.bindVaultShortcut,
          onSearchSessions: requestSearchSessions,
          onVaultMutated: () => {
            outlineBookmarks?.sync?.();
            void compactGuard.evaluateNow().then(syncStatusPill);
          },
          onCopyHandoff: options.onCopyHandoff,
          onExportMarkdown: options.onExportMarkdown,
          onDownloadMarkdown: options.onDownloadMarkdown,
        })
      : null;

    sessionRadar = radarMod.createSessionRadarController({
      win,
      doc,
      coexist,
      enabled: Boolean(cfg.modules?.sessionRadar),
      notifyMode: cfg.radarNotifyMode || 'off',
      audioMode: cfg.radarAudioMode || 'off',
      quietHours: cfg.radarQuietHours || '',
      now: options.now,
      getLang: options.getLang,
      onTransition: options.onRadarTransition,
      onNotify: options.onRadarNotify,
    });

    cleanSlate = cleanSlateMod?.createCleanSlateController
      ? cleanSlateMod.createCleanSlateController({
          win,
          doc,
          storage: options.storage,
          coexist,
          draftGuardMod: draftMod,
          now: options.now,
          getLang: options.getLang,
          onNavigateNewConversation: options.onNavigateNewConversation,
          onClearTriggered: options.onClearTriggered,
          onCleanRestartApplied: options.onCleanRestartApplied,
        })
      : null;

    const customPackStorage = options.storage || win?.localStorage || null;
    const customPacksStorageKey = coexist.CUSTOM_PACKS_STORAGE_KEY || 'agSag.hostI18n.customPacks.v1';

    function readStoredCustomPacks() {
      const out = {};
      if (!customPackStorage || typeof customPackStorage.getItem !== 'function') return out;
      try {
        const raw = customPackStorage.getItem(customPacksStorageKey);
        if (!raw) return out;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
        for (const [loc, pack] of Object.entries(parsed)) {
          if (!pack || typeof pack !== 'object') continue;
          const candidate = pack.locale ? pack : { ...pack, locale: loc };
          if (hostI18nPacksMod?.sanitizeImportedPack) {
            const res = hostI18nPacksMod.sanitizeImportedPack(candidate);
            if (res.ok) out[res.pack.locale] = res.pack;
          } else {
            out[loc] = candidate;
          }
        }
      } catch {}
      return out;
    }

    function writeStoredCustomPacks(packsMap) {
      if (!customPackStorage) return false;
      try {
        const keys = Object.keys(packsMap || {});
        if (keys.length === 0) {
          customPackStorage.removeItem?.(customPacksStorageKey);
        } else {
          customPackStorage.setItem?.(customPacksStorageKey, JSON.stringify(packsMap));
        }
        return true;
      } catch {
        return false;
      }
    }

    const DISALLOWED_LOC_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const storedCustomPacks = readStoredCustomPacks();
    const initialCustomPacks = Object.create(null);
    for (const [loc, pack] of Object.entries(storedCustomPacks)) {
      if (!DISALLOWED_LOC_KEYS.has(loc)) initialCustomPacks[loc] = pack;
    }
    if (options.customHostI18nPacks && typeof options.customHostI18nPacks === 'object') {
      for (const [rawLoc, pack] of Object.entries(options.customHostI18nPacks)) {
        if (DISALLOWED_LOC_KEYS.has(rawLoc) || !pack || typeof pack !== 'object') continue;
        const normLoc = hostI18nPacksMod?.normalizeHostLocale
          ? hostI18nPacksMod.normalizeHostLocale(rawLoc)
          : rawLoc;
        if (!DISALLOWED_LOC_KEYS.has(normLoc) && normLoc !== 'en') {
          initialCustomPacks[normLoc] = pack;
        }
      }
    }

    if (preloadedExtPacks && hostI18nPacksMod?.registerExtendedPack) {
      for (const [extLoc, extPack] of Object.entries(preloadedExtPacks)) {
        if (extPack && typeof extPack === 'object') {
          try { hostI18nPacksMod.registerExtendedPack(extLoc, extPack); } catch {}
        }
      }
    }

    const requestExtendedPack = async (locale) => {
      if (typeof options.extendedPackLoader === 'function') {
        try {
          const loaded = await options.extendedPackLoader(locale);
          if (loaded && typeof loaded === 'object') return loaded;
        } catch {}
      }
      if (novSynergy && typeof novSynergy.requestRaw === 'function' && novSynergy.isBridgeAvailable?.()) {
        try {
          const res = await novSynergy.requestRaw('sag:ext_pack', { locale });
          if (res?.ok && res?.raw?.data?.pack && typeof res.raw.data.pack === 'object') {
            return res.raw.data.pack;
          }
          if (res?.ok && res?.raw?.pack && typeof res.raw.pack === 'object') {
            return res.raw.pack;
          }
        } catch {}
      }
      return null;
    };

    hostI18n = hostI18nMod?.createHostI18nController
      ? hostI18nMod.createHostI18nController({
          win,
          doc,
          coexist,
          enabled: cfg.modules?.hostI18n !== false,
          locale: cfg.hostI18nLocale || 'auto',
          conflictPolicy: cfg.hostI18nConflictPolicy || 'yield',
          collectMissing: Boolean(cfg.hostI18nCollectMissing),
          autoObserve: options.autoObserve,
          customPacks: initialCustomPacks,
          requestExtendedPack,
        })
      : null;

    promptQueue = promptQueueMod?.createPromptQueueController
      ? promptQueueMod.createPromptQueueController({
          win,
          doc,
          storage: options.storage,
          coexist,
          enabled: cfg.modules?.promptQueue !== false,
          autoObserve: options.autoObserve,
          now: options.now,
          dispatchDelayMs: options.promptQueueDispatchDelayMs,
          getLang: options.getLang,
          isStreaming: () => Boolean(compactGuard.getDebugState()?.lastSnapshot?.streaming),
          isSpecWriteLocked: () => Boolean(novSynergy?.isConnected?.() && novSynergy?.getFeed?.()?.spec?.writeLockActive),
          onDispatch: options.onPromptQueueDispatch,
          onQueueChange: (ev) => {
            syncStatusPill();
            if (typeof options.onPromptQueueChange === 'function') options.onPromptQueueChange(ev);
          },
        })
      : null;

    safeAutoAccept = safeAutoAcceptMod?.createSafeAutoAcceptController
      ? safeAutoAcceptMod.createSafeAutoAcceptController({
          win,
          doc,
          coexist,
          enabled: Boolean(cfg.modules?.safeAutoAccept),
          policy: cfg.autoAcceptPolicy || 'readonly-safe',
          customAllowPatterns: cfg.autoAcceptCustomPatterns || [],
          dryRun: Boolean(cfg.autoAcceptDryRun),
          autoObserve: options.autoObserve,
          now: options.now,
          cooldownMs: options.autoAcceptCooldownMs,
          onDecision: (ev) => {
            syncStatusPill();
            if (typeof options.onAutoAcceptDecision === 'function') options.onAutoAcceptDecision(ev);
          },
        })
      : null;

    themeStudio = themeStudioMod?.createThemeStudioController
      ? themeStudioMod.createThemeStudioController({
          win,
          doc,
          coexist,
          enabled: Boolean(cfg.modules?.themeStudio),
          externalConvStateSource: Boolean(cfg.modules?.compactGuard),
          convStateThrottleMs: options.convStateThrottleMs,
          preset: cfg.themePreset || 'native',
          autoPair: Boolean(cfg.themeAutoPair),
          accent: cfg.themeAccent || 'follow',
          corners: cfg.themeCorners || 'balanced',
          surface: cfg.themeSurface || 'smoked',
          codeFont: cfg.themeCodeFont || 'default',
          chatFont: cfg.themeChatFont || 'default',
          codeLigatures: Boolean(cfg.themeCodeLigatures),
          ambientGlow: cfg.themeAmbientGlow || 'subtle',
          streamFade: cfg.themeStreamFade !== false,
          smoothCaret: cfg.themeSmoothCaret !== false,
          cjkFontTuning: cfg.themeCjkFont !== false,
          density: cfg.themeDensity || 'balanced',
          compactSidebar: Boolean(cfg.themeCompactSidebar),
          wideReadable: Boolean(cfg.themeWideReadable),
          customCss: cfg.themeCustomCss || '',
          conflictPolicy: cfg.themeConflictPolicy || 'yield',
        })
      : null;

    quotaPulse = quotaPulseMod?.createQuotaPulseController
      ? quotaPulseMod.createQuotaPulseController({
          win,
          doc,
          storage: options.storage,
          enabled: Boolean(cfg.modules?.quotaPulse),
          softTurns5h: cfg.quotaSoftTurns5h || 60,
          softTurns7d: cfg.quotaSoftTurns7d || 350,
          now: options.now,
        })
      : null;

    let novFeedFetched = false;
    let novFeedInFlight = false;
    let localTelemetryFetched = false;
    const ctxSourceMod = options.contextSource || resolveDep('__agSgContextSource', './context-source.js');
    novSynergy = novSynergyMod?.createNovSynergyController
      ? novSynergyMod.createNovSynergyController({
          win,
          doc,
          novTransport: options.novTransport,
          initialState: options.novInitialState,
          initialFeed: options.novInitialFeed,
          requestTimeoutMs: options.novRequestTimeoutMs,
          autoRefresh: options.novAutoRefresh,
          now: options.now,
          getSagConfig: () => compactGuard.getConfig(),
          onPushEvent: (ev, msg) => {
            if (ev === 'translate:chunk') {
              const reqId = msg?.requestId || msg?.data?.requestId || '';
              const partial = msg?.partial ?? msg?.data?.partial ?? '';
              if (reqId && thoughtTranslator?.applyStreamChunk) {
                thoughtTranslator.applyStreamChunk(reqId, partial);
                return true;
              }
            }
            if (ev === 'telemetry:snapshot') {
              const snap = msg?.snapshot || msg?.data || null;
              if (snap && ctxSourceMod?.setLocalTelemetrySnapshot) {
                ctxSourceMod.setLocalTelemetrySnapshot(snap);
                syncStatusPill();
                return true;
              }
            }
            return false;
          },
          onStateChange: (novState) => {
            if (novState?.bridgeConnected && !localTelemetryFetched && ctxSourceMod?.setLocalTelemetrySnapshot && !options.novTransport) {
              localTelemetryFetched = true;
              const t = setTimeout(() => {
                if (destroyed || !novSynergy?.isBridgeAvailable?.()) return;
                refreshQuotaSummary();
                const cid = ctxSourceMod?.detectCascadeId?.(doc, win) || '';
                Promise.resolve(novSynergy.requestRaw?.('sag:telemetry_snapshot', { cascadeId: cid }))
                  .then((res) => {
                    const snap = res?.raw?.data ?? res?.data ?? null;
                    if (!destroyed && res?.ok && snap) {
                      ctxSourceMod.setLocalTelemetrySnapshot(snap);
                      syncStatusPill();
                    }
                  })
                  .catch(() => {});
              }, 0);
              t?.unref?.();
            }
            if (novState?.bridgeConnected && hostI18n) {
              const dbg = hostI18n.getDebugState?.();
              if (dbg?.enabled && !dbg.destroyed && dbg.locale && dbg.locale !== 'en' && !dbg.extendedPackLoaded) {
                void hostI18n.ensureExtendedPack?.();
              }
            }
            if (novState?.bridgeConnected && !novFeedFetched && !novFeedInFlight) {
              novFeedInFlight = true;
              Promise.resolve(novSynergy?.fetchFeed?.())
                .then((res) => {
                  if (res?.ok) novFeedFetched = true;
                })
                .catch(() => {})
                .finally(() => {
                  novFeedInFlight = false;
                });
            }
            if (novState?.bridgeConnected && promptLibrary?.getDebugState?.()?.enabled) {
              void promptLibrary.refreshNovTemplates?.();
            }
            outlineBookmarks?.sync?.();
            promptQueue?.sync?.();
            prismBridge?.sync?.();
            syncStatusPill();
            if (typeof options.onNovStateChange === 'function') options.onNovStateChange(novState);
          },
        })
      : null;

    const requestNovTemplates = async () => {
      if (novSynergy && typeof novSynergy.requestRaw === 'function' && novSynergy.isBridgeAvailable?.()) {
        try {
          const res = await novSynergy.requestRaw('sag:nov_templates', {});
          const tpls = res?.raw?.data?.templates || res?.data?.templates || res?.raw?.templates;
          if (res?.ok && Array.isArray(tpls)) {
            return tpls;
          }
        } catch {}
      }
      return [];
    };

    promptLibrary = promptLibraryMod?.createPromptLibraryController
      ? promptLibraryMod.createPromptLibraryController({
          win,
          doc,
          storage: options.storage,
          coexist,
          enabled: Boolean(cfg.modules?.promptLibrary),
          autoObserve: options.autoObserve,
          getLang: options.getLang,
          initialNovTemplates: options.initialNovTemplates,
          requestNovTemplates,
          isNovConnected: () => Boolean(novSynergy?.isConnected?.()),
          onChange: () => {
            prismBridge?.sync?.();
          },
        })
      : null;

    readingNav = readingNavMod?.createReadingNavController
      ? readingNavMod.createReadingNavController({
          win,
          doc,
          coexist,
          enabled: Boolean(cfg.modules?.readingNav),
          collapseLines: cfg.readingCollapseLines || 40,
          autoObserve: options.autoObserve,
          getLang: options.getLang,
          onCopyCode: options.onCopyText,
          isStreaming: () => Boolean(compactGuard?.getDebugState?.()?.lastSnapshot?.streaming),
          getStarredTurns: () => {
            const st = outlineBookmarks?.getDebugState?.();
            if (Array.isArray(st?.bookmarks)) return st.bookmarks;
            if (Array.isArray(st?.bookmarkedTurns)) return st.bookmarkedTurns;
            if (Array.isArray(st?.turns)) return st.turns;
            return [];
          },
        })
      : null;

    statusPill = statusPillMod?.createStatusPillController
      ? statusPillMod.createStatusPillController({
          win,
          doc,
          coexist,
          novSynergy,
          getLang: options.getLang,
          getConfig: () => compactGuard.getConfig(),
          onUpdateConfig: (patch) => api.updateConfig(patch),
          onCompactNow: () => compactGuard.insertCompact({ submit: true }),
          onCleanRestart: (opts) => cleanSlate?.triggerCleanClear?.(opts),
          onRequestQuotaRefresh: () => refreshQuotaSummary(),
          onOpenVault: openVault,
          onOpenSettings: (tabId) => prismBridge?.openDrawer?.(tabId),
        })
      : null;

    function importCustomHostPack(raw) {
      if (!hostI18nPacksMod?.sanitizeImportedPack) {
        return { ok: false, pack: { locale: '', exact: {}, patterns: [] }, errors: ['host-i18n-packs unavailable'], stats: { exactCount: 0, patternCount: 0, droppedNonString: 0 } };
      }
      const res = hostI18nPacksMod.sanitizeImportedPack(raw);
      if (!res.ok) return res;
      const nextStored = readStoredCustomPacks();
      nextStored[res.pack.locale] = res.pack;
      writeStoredCustomPacks(nextStored);
      // Replace prior in-memory custom pack for this locale so runtime matches persistence 1:1
      hostI18n?.clearCustomPacks?.(res.pack.locale);
      hostI18n?.mergeCustomPack?.(res.pack, res.pack.locale);
      prismBridge?.sync?.();
      syncStatusPill();
      return res;
    }

    function exportCustomHostPacks() {
      return readStoredCustomPacks();
    }

    function clearCustomHostPacks(targetLocale) {
      if (targetLocale) {
        const norm = hostI18nPacksMod?.normalizeHostLocale ? hostI18nPacksMod.normalizeHostLocale(targetLocale) : targetLocale;
        const nextStored = readStoredCustomPacks();
        delete nextStored[norm];
        writeStoredCustomPacks(nextStored);
      } else {
        try {
          customPackStorage?.removeItem?.(customPacksStorageKey);
        } catch {}
      }
      hostI18n?.clearCustomPacks?.(targetLocale);
      prismBridge?.sync?.();
      syncStatusPill();
      return true;
    }

    const callTranslatorBridge = async (type, payload = {}) => {
      if (typeof options.onTranslatorBridge === 'function') {
        return options.onTranslatorBridge(type, payload);
      }
      if (!novSynergy || typeof novSynergy.requestRaw !== 'function' || !novSynergy.isBridgeAvailable?.()) {
        const curLang = compactGuard.getConfig()?.hostI18nLocale || 'zh-CN';
        const errMsg = i18n?.getSagStrings?.(curLang)?.thoughtOfflineErr || 'Background service unavailable';
        return { ok: false, reason: 'bridge-offline', error: errMsg };
      }
      try {
        const res = await novSynergy.requestRaw(type, payload);
        const data = res?.raw?.data ?? res?.data ?? null;
        if (res?.ok) return { ok: true, data };
        return { ok: false, error: res?.error || res?.raw?.error || 'Translator request failed' };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    };

    thoughtTranslator = thoughtTranslatorMod?.createThoughtTranslatorController
      ? thoughtTranslatorMod.createThoughtTranslatorController({
          win,
          doc,
          coexist,
          enabled: Boolean(cfg.modules?.thoughtTranslate),
          engine: cfg.thoughtEngine || 'mt',
          targetLang: cfg.thoughtTargetLang || 'auto',
          triggerMode: cfg.thoughtTrigger || 'auto',
          viewMode: cfg.thoughtViewMode || 'bilingual',
          stylePreset: cfg.thoughtStylePreset || 'technical',
          translateTitles: Boolean(cfg.thoughtTranslateTitles),
          conflictPolicy: cfg.hostI18nConflictPolicy || 'yield',
          autoObserve: options.autoObserve,
          getEffectiveLang: () => compactGuard.getConfig()?.hostI18nLocale || 'zh-CN',
          onRequestTranslate: (req) => callTranslatorBridge('sag:translate_text', req),
          onRequestBatchTitles: (req) => callTranslatorBridge('sag:translate_batch_titles', req),
        })
      : null;

    prismBridge = prismBridgeMod?.createPrismBridgeController
      ? prismBridgeMod.createPrismBridgeController({
          win,
          doc,
          storage: options.storage,
          coexist,
          novSynergy,
          novSynergyMod,
          autoObserve: options.autoObserve,
          getLang: options.getLang,
          getConfig: () => compactGuard.getConfig(),
          onUpdateConfig: (patch) => api.updateConfig(patch),
          onApplyPreset: (presetId) => api.applyPreset(presetId),
          onCopyText: options.onCopyText,
          onImportCustomPack: (raw) => importCustomHostPack(raw),
          onExportCustomPacks: () => exportCustomHostPacks(),
          onClearCustomPacks: (loc) => clearCustomHostPacks(loc),
          onExportMissingTemplate: (loc) => hostI18n?.exportMissingTemplate?.(loc) || null,
          getHostI18nState: () => hostI18n?.getDebugState?.() || null,
          getAutoAcceptState: () => safeAutoAccept?.getDebugState?.() || null,
          getQuotaSummary: () => quotaPulse?.getSummary?.() || null,
          getQueueState: () => promptQueue?.getDebugState?.() || null,
          getDraftState: () => draftGuard?.getDebugState?.() || null,
          getBookmarkState: () => outlineBookmarks?.getDebugState?.() || null,
          getPromptLibraryState: () => promptLibrary?.getDebugState?.() || null,
          onOpenPromptLibrary: () => promptLibrary?.open?.(),
          onRequestStorageAudit: async () => {
            if (!novSynergy || typeof novSynergy.requestRaw !== 'function' || !novSynergy.isBridgeAvailable?.()) {
              return { ok: false, reason: 'bridge-offline' };
            }
            try {
              const res = await novSynergy.requestRaw('sag:storage_audit', {});
              const data = res?.raw?.data || res?.data || null;
              if (res?.ok && data) return { ok: true, data };
              return { ok: false, error: res?.error || 'Storage audit unavailable' };
            } catch (err) {
              return { ok: false, error: err?.message || String(err) };
            }
          },
          onTranslatorStatus: () => callTranslatorBridge('sag:translate_status', {}),
          onTranslatorSaveProvider: (req) => callTranslatorBridge('sag:translate_save_provider', req),
          onTranslatorDiagnose: (req) => callTranslatorBridge('sag:translate_diagnose', req),
          onTranslatorClearCache: () => callTranslatorBridge('sag:translate_clear_cache', {}),
          onTranslatorSaveConfig: (req) => callTranslatorBridge('sag:translate_save_config', req),
          onTestRadarAudio: () => sessionRadar?.testAudioAlert?.(),
          onExportSession: () => compactGuard.exportMarkdown?.({ download: true }),
          onExportPromptSnippets: () => promptLibrary?.exportSnippetsJson?.() || '{"version":1,"snippets":[]}',
          onImportPromptSnippets: (raw) => promptLibrary?.importSnippetsJson?.(raw) || { ok: false, errors: ['Prompt Library unavailable'] },
          onOpenVault: (q) => openVault(q),
          bindDrawerShortcut: options.bindDrawerShortcut !== false,
          onHostContextChange: () => {
            compactGuard.refreshUi?.();
            draftGuard?.sync?.();
            outlineBookmarks?.sync?.();
            sessionRadar?.syncFromDom?.();
            if (typeof hostI18n?.scheduleScan === 'function') hostI18n.scheduleScan();
            else hostI18n?.scanNow?.();
            promptLibrary?.sync?.();
            readingNav?.sync?.();
            themeStudio?.sync?.();
            syncStatusPill();
          },
        })
      : null;

    let destroyed = false;

    const api = {
      version: VERSION,
      brand: 'agy-Sag',
      source,
      yielded: false,
      compactGuard,
      draftGuard,
      cleanSlate,
      outlineBookmarks,
      bookmarkVault,
      sessionRadar,
      prismBridge,
      statusPill,
      hostI18n,
      promptQueue,
      promptLibrary,
      readingNav,
      safeAutoAccept,
      themeStudio,
      quotaPulse,
      novSynergy,
      thoughtTranslator,
      evaluateNow: async () => {
        draftGuard?.sync?.();
        cleanSlate?.sync?.();
        outlineBookmarks.sync();
        sessionRadar.syncFromDom();
        hostI18n?.scanNow?.();
        thoughtTranslator?.scanNow?.();
        promptQueue?.sync?.();
        promptLibrary?.sync?.();
        readingNav?.sync?.();
        safeAutoAccept?.scanNow?.();
        themeStudio?.sync?.();
        quotaPulse?.scanDomForSignals?.();
        prismBridge?.sync?.();
        const snap = await compactGuard.evaluateNow();
        syncStatusPill();
        return snap;
      },
      updateConfig: (patch) => {
        // compactGuard.updateConfig already triggers onConfigChange -> syncSubModulesFromConfig
        return compactGuard.updateConfig(patch);
      },
      applyPreset: (presetId) => {
        const patch = coexist.resolvePresetPatch?.(presetId);
        if (!patch) return null;
        return api.updateConfig(patch);
      },
      setHostLocale: (locale) => {
        return api.updateConfig({
          hostI18nLocale: locale,
          modules: { ...api.getConfig().modules, hostI18n: locale !== 'en' },
        });
      },
      importCustomHostPack,
      exportCustomHostPacks,
      clearCustomHostPacks,
      requestExtendedPack,
      exportMissingHostTemplate: (loc) => hostI18n?.exportMissingTemplate?.(loc) || null,
      setNovModule: (id, enabled) => {
        if (!novSynergy?.setModule) return Promise.resolve({ ok: false, error: 'nov-synergy unavailable' });
        return novSynergy.setModule(id, enabled);
      },
      applyNovPreset: (preset) => {
        if (!novSynergy?.applyPreset) return Promise.resolve({ ok: false, error: 'nov-synergy unavailable' });
        return novSynergy.applyPreset(preset);
      },
      getSynergyEffects: () => {
        if (!novSynergy?.getSynergyEffects) return [];
        return novSynergy.getSynergyEffects(compactGuard.getConfig());
      },
      getCatalog: () => ({
        modules: coexist.MODULE_CATALOG || [],
        presets: coexist.PRESETS || {},
      }),
      getConfig: () => compactGuard.getConfig(),
      clearAndRestart: (opts) => cleanSlate?.triggerCleanClear?.(opts),
      copyNewSessionHandoff: () => compactGuard.copyNewSessionHandoff(),
      openStatusCard: () => statusPill?.open?.(),
      openSettingsPopover: (tabId) => prismBridge?.openDrawer?.(tabId),
      openSettingsDrawer: (tabId) => prismBridge?.openDrawer?.(tabId),
      closeSettingsDrawer: () => prismBridge?.closeDrawer?.(),
      openPromptLibrary: () => promptLibrary?.open?.(),
      openBookmarkVault: (q) => bookmarkVault?.open?.(q),
      syncExtPacks,
      getDebugState: () => ({
        version: VERSION,
        brand: 'agy-Sag',
        source,
        yielded: false,
        destroyed,
        compactGuard: compactGuard.getDebugState(),
        draftGuard: draftGuard?.getDebugState?.() || null,
        cleanSlate: cleanSlate?.getDebugState?.() || null,
        outlineBookmarks: outlineBookmarks.getDebugState(),
        bookmarkVault: bookmarkVault?.getDebugState?.() || null,
        sessionRadar: sessionRadar.getDebugState(),
        prismBridge: prismBridge?.getDebugState?.() || null,
        statusPill: statusPill?.getDebugState?.() || null,
        hostI18n: hostI18n?.getDebugState?.() || null,
        promptQueue: promptQueue?.getDebugState?.() || null,
        promptLibrary: promptLibrary?.getDebugState?.() || null,
        readingNav: readingNav?.getDebugState?.() || null,
        safeAutoAccept: safeAutoAccept?.getDebugState?.() || null,
        themeStudio: themeStudio?.getDebugState?.() || null,
        quotaPulse: quotaPulse?.getDebugState?.() || null,
        novSynergy: novSynergy?.getDebugState?.() || null,
        thoughtTranslator: thoughtTranslator?.getDebugState?.() || null,
      }),
      destroy(destroyOpts = {}) {
        if (destroyed) return;
        destroyed = true;
        const isReplacing = Boolean(destroyOpts && destroyOpts.replacing);
        statusPill?.destroy?.();
        prismBridge?.destroy?.();
        novSynergy?.destroy?.();
        thoughtTranslator?.destroy?.();
        hostI18n?.destroy?.();
        promptQueue?.destroy?.();
        promptLibrary?.destroy?.();
        readingNav?.destroy?.();
        safeAutoAccept?.destroy?.();
        themeStudio?.destroy?.();
        quotaPulse?.destroy?.();
        cleanSlate?.destroy?.();
        draftGuard?.destroy?.();
        compactGuard.destroy();
        outlineBookmarks.destroy();
        bookmarkVault?.destroy?.();
        sessionRadar.destroy();
        try { doc?.getElementById?.('ag-sg-core-css')?.remove?.(); } catch {}
        try { doc?.getElementById?.('ag-sag-theme-css')?.remove?.(); } catch {}
        try {
          if (win && win[coexist.INSTANCE_GLOBAL] === api) delete win[coexist.INSTANCE_GLOBAL];
          if (win && coexist.LEGACY_INSTANCE_GLOBAL && win[coexist.LEGACY_INSTANCE_GLOBAL] === api) {
            delete win[coexist.LEGACY_INSTANCE_GLOBAL];
          }
          if (win && win[coexist.OWNER_GLOBAL] === source) delete win[coexist.OWNER_GLOBAL];
          if (win && coexist.LEGACY_OWNER_GLOBAL && win[coexist.LEGACY_OWNER_GLOBAL] === source) {
            delete win[coexist.LEGACY_OWNER_GLOBAL];
          }
          if (!isReplacing) {
            if (win && '__agSagExtPacks' in win) delete win.__agSagExtPacks;
            if (globalRoot && '__agSagExtPacks' in globalRoot) delete globalRoot.__agSagExtPacks;
          }
        } catch {}
      },
    };

    syncStatusPill();

    if (win) {
      win[coexist.INSTANCE_GLOBAL] = api;
      if (coexist.LEGACY_INSTANCE_GLOBAL) win[coexist.LEGACY_INSTANCE_GLOBAL] = api;
      if (source !== 'standalone') {
        win[coexist.OWNER_GLOBAL] = source;
        if (coexist.LEGACY_OWNER_GLOBAL) win[coexist.LEGACY_OWNER_GLOBAL] = source;
      }
    }
    return api;
  }

  return { VERSION, mountSag, mountSessionGuard: mountSag };
});
