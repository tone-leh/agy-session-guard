// agy-Sag — Universal Control Center Hub & Settings Drawer (Native Settings + Prism Modules + Global Drawer, UMD)
// Single-Source-of-Truth IA:
//   - 6 mutually exclusive tabs: overview | ui | conversation | guard | nov | advanced
//   - Module master switches live strictly in "overview" (zero duplicate switches)
//   - Parameters live strictly in their layer tab; advanced controls fold inside <details>
//   - Same renderHub() powers native Settings, Prism embed, and Ctrl/Cmd+Alt+, Drawer
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSgPrismBridge = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const PRISM_SETTINGS_SEC_ID = 'ag-cs-settings-sec';
  const PRISM_MODULES_GROUP_SEL = '[data-ag-cs-group="modules"]';
  const EMBED_SECTION_TESTID = 'ag-sg-prism-settings-section';
  const NATIVE_SECTION_TESTID = 'ag-sg-native-settings-section';
  const DRAWER_BACKDROP_TESTID = 'ag-sag-drawer-backdrop';
  const DRAWER_TESTID = 'ag-sag-settings-drawer';
  const THRESHOLD_PRESETS = ['off', 75, 80, 85, 90];
  const STALL_PRESETS = ['off', 60, 180, 300, 600];
  const SUBTAB_IDS = ['overview', 'ui', 'conversation', 'guard', 'nov', 'advanced'];
  const LEGACY_TAB_MAP = {
    all: 'overview',
    flow: 'conversation',
    auto: 'guard',
  };
  const SETTINGS_APPEARANCE_TITLES = new Set([
    'Appearance',
    '外观',
    '外觀',
    '外観',
    '외관',
    '모양',
    'Apariencia',
    'Apparence',
    'Darstellung',
    'Erscheinungsbild',
    'Внешний вид',
    'Aparência',
  ]);

  function resolveDep(globalKey, relPath) {
    if (globalRoot && globalRoot[globalKey]) return globalRoot[globalKey];
    if (typeof require === 'function') return require(relPath);
    return null;
  }

  function detectPrismEnvironment(doc, win) {
    const html = doc?.documentElement || null;
    const styleAttr = html?.hasAttribute?.('data-ag-cs-style') || false;
    const settingsEl = doc?.getElementById?.(PRISM_SETTINGS_SEC_ID) || null;
    const modulesGroup = settingsEl?.querySelector?.(PRISM_MODULES_GROUP_SEL) || null;
    const metricsBridgePresent = Boolean(win?.__agPrismMetricsBridge && typeof win.__agPrismMetricsBridge.getMetrics === 'function');
    const pulseHostPresent = Boolean(win?.agPulseHost && typeof win.agPulseHost.getMetrics === 'function');
    const pulseBarPresent = Boolean(doc?.querySelector?.('#ag-prism-pulse-bar, [data-ag-prism-pulse-bar="true"]'));
    const outlinePopoverPresent = Boolean(doc?.querySelector?.('.ag-cs-nav-outline-popover'));
    const lang = html?.getAttribute?.('data-ag-cs-lang') || settingsEl?.getAttribute?.('data-ag-cs-lang') || '';
    const theme = html?.getAttribute?.('data-ag-cs-theme') || '';

    let versionHint = '';
    try {
      const aboutTxt = settingsEl?.querySelector?.('[data-ag-cs-about="1"]')?.textContent || '';
      const m = aboutTxt.match(/Obsidian\s+Prism\s+v([0-9]+\.[0-9]+\.[0-9]+(?:-(?:beta|alpha|rc)\.[0-9]+)?)/i);
      if (m && m[1]) versionHint = m[1];
    } catch {}

    const active = Boolean(styleAttr || settingsEl || metricsBridgePresent || pulseBarPresent);
    return {
      active,
      versionHint,
      settingsPanelMounted: Boolean(settingsEl),
      modulesGroupFound: Boolean(modulesGroup),
      metricsBridgePresent,
      pulseHostPresent,
      pulseBarPresent,
      outlinePopoverPresent,
      lang,
      theme,
    };
  }

  function findNativeSettingsAnchor(doc) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return null;
    let panel = null;
    const headings = Array.from(doc.querySelectorAll('[role="dialog"] h2') || []);
    for (const h2 of headings) {
      if (SETTINGS_APPEARANCE_TITLES.has(String(h2.textContent || '').trim())) {
        panel = h2.closest?.('div.p-6') || h2.parentElement?.parentElement || null;
        if (panel) break;
      }
    }
    if (!panel) {
      for (const h2 of headings) {
        const dlg = h2.closest?.('[role="dialog"]');
        const aria = String(dlg?.getAttribute?.('aria-label') || '');
        if (/settings|设置|設定|설정|ajustes|paramètres|einstellungen|настройки|configurações/i.test(aria)) {
          const candidate = h2.closest?.('div.p-6') || h2.parentElement?.parentElement || null;
          if (candidate && candidate.id !== PRISM_SETTINGS_SEC_ID) {
            panel = candidate;
            break;
          }
        }
      }
    }
    if (!panel || typeof panel.querySelectorAll !== 'function') return null;
    const sections = Array.from(panel.querySelectorAll('div.space-y-2') || []).filter(
      (s) =>
        s.getAttribute?.('data-ag-sg-owned') !== '1' &&
        !String(s.id || '').startsWith('ag-cs-') &&
        !(s.parentElement && s.parentElement.closest?.('div.space-y-2'))
    );
    const anchor = sections[sections.length - 1] || null;
    if (!anchor || !anchor.parentElement) return null;
    return { panel, anchor, parent: anchor.parentElement };
  }

  function normalizeSubTab(rawTab) {
    const t = String(rawTab || '').trim();
    if (SUBTAB_IDS.includes(t)) return t;
    if (Object.prototype.hasOwnProperty.call(LEGACY_TAB_MAP, t)) return LEGACY_TAB_MAP[t];
    return 'overview';
  }

  function createPrismBridgeController(options = {}) {
    const win = options.win || globalRoot;
    const doc = options.doc || win?.document || null;
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');
    const i18n = options.i18n || resolveDep('__agSgI18n', './i18n.js');
    const styles = options.styles || resolveDep('__agSgStyles', './styles.js');
    const novSynergyMod = options.novSynergyMod || resolveDep('__agSagNovSynergy', './nov-synergy.js');
    const novSynergy = options.novSynergy || null;
    const uiStorage = options.storage || win?.localStorage || null;

    const SUBTAB_STORAGE_KEY = 'agSag.ui.activeSubTab.v1';
    const EXPANDED_STORAGE_KEY = 'agSag.ui.panelExpanded.v1';

    function readUiState(key, fallback) {
      try {
        const val = uiStorage?.getItem?.(key);
        return val !== null && val !== undefined ? val : fallback;
      } catch {
        return fallback;
      }
    }

    function writeUiState(key, val) {
      try {
        uiStorage?.setItem?.(key, String(val));
      } catch {}
    }

    let destroyed = false;
    let mountedEl = null;
    let mountedMode = 'none'; // 'none' | 'prism' | 'native'
    let drawerBackdropEl = null;
    let drawerEl = null;
    let drawerBodyEl = null;
    let drawerOpen = false;
    let shortcutSheetEl = null;
    let shortcutSheetOpen = false;
    let settingsNavEl = null;
    let createdStyleEl = null;
    let domObserver = null;
    let domBusUnsub = null;
    let domDebounceTimer = null;
    let htmlObserver = null;
    let htmlBusUnsub = null;
    let htmlRaf = 0;
    let htmlSyncInFlight = false;
    let htmlSyncQueued = false;
    let keydownCleanup = null;
    let compositionCleanup = null;
    let imeComposing = false;
    let lastLang = '';
    let lastTheme = '';

    const savedRawTab = String(readUiState(SUBTAB_STORAGE_KEY, 'overview') || '').trim();
    let activeSubTab = normalizeSubTab(savedRawTab);
    if (savedRawTab && savedRawTab !== activeSubTab && Object.prototype.hasOwnProperty.call(LEGACY_TAB_MAP, savedRawTab)) {
      writeUiState(SUBTAB_STORAGE_KEY, activeSubTab);
    }

    const savedExpanded = readUiState(EXPANDED_STORAGE_KEY, '1');
    let panelExpanded = savedExpanded !== '0';

    // Ephemeral UI draft states shared across modular Settings tab renderers (preserved across re-renders)
    let searchQuery = '';
    const uiState = {
      copiedInstallFeedback: false,
      copyResetTimer: null,
      novAutoRefreshInFlight: false,
      novAutoRefreshAttempted: false,
      customPackEditorOpen: false,
      customPackDraftText: '',
      customPackStatusText: '',
      customPackStatusTone: 'info',
      customCssDraftText: null,
      customCssStatusText: '',
      customPatternsDraftText: null,
      customPatternsStatusText: '',
      cfgImportDraftText: '',
      cfgStatusText: '',
      cfgStatusTone: 'info',
      plDetailsOpen: false,
      plImportDraftText: '',
      plStatusText: '',
      plStatusTone: 'info',
      resetConfirmPending: false,
      diagCopiedFeedback: false,
      storageAuditState: null, // { status: 'idle'|'loading'|'ok'|'offline'|'error', data, message }
      storageCmdCopied: false,
    };

    const tabOverviewMod = resolveDep('__agSagSettingsTabOverview', './settings/tab-overview.js');
    const tabUiMod = resolveDep('__agSagSettingsTabUi', './settings/tab-ui.js');
    const tabConversationMod = resolveDep('__agSagSettingsTabConversation', './settings/tab-conversation.js');
    const tabGuardMod = resolveDep('__agSagSettingsTabGuard', './settings/tab-guard.js');
    const tabNovMod = resolveDep('__agSagSettingsTabNov', './settings/tab-nov.js');
    const tabAdvancedMod = resolveDep('__agSagSettingsTabAdvanced', './settings/tab-advanced.js');

    function formatStorageBytes(bytes) {
      const n = Number(bytes);
      if (!Number.isFinite(n) || n <= 0) return '0 B';
      const units = ['B', 'KiB', 'MiB', 'GiB'];
      let idx = 0;
      let val = n;
      while (val >= 1024 && idx < units.length - 1) {
        val /= 1024;
        idx += 1;
      }
      return idx === 0 ? `${Math.round(val)} B` : `${val.toFixed(val >= 100 ? 0 : 1)} ${units[idx]}`;
    }

    function downloadJsonPayload(filename, dataObj) {
      const jsonText = JSON.stringify(dataObj, null, 2);
      try {
        win?.navigator?.clipboard?.writeText?.(jsonText)?.catch?.(() => {});
      } catch {}
      if (typeof options.onCopyText === 'function') {
        try { options.onCopyText(jsonText); } catch {}
      }
      const BlobCtor = win?.Blob || (typeof Blob !== 'undefined' ? Blob : null);
      const UrlApi = win?.URL || (typeof URL !== 'undefined' ? URL : null);
      if (BlobCtor && UrlApi && typeof UrlApi.createObjectURL === 'function' && doc?.createElement) {
        let objectUrl = '';
        let a = null;
        try {
          const blob = new BlobCtor([jsonText], { type: 'application/json;charset=utf-8' });
          objectUrl = UrlApi.createObjectURL(blob);
          a = coexist.markOwnedNoTranslate(doc.createElement('a'));
          a.href = objectUrl;
          a.download = filename;
          a.setAttribute?.('download', filename);
          if (a.style) a.style.display = 'none';
          (doc.body || doc.documentElement)?.appendChild?.(a);
          a.click?.();
          const t = setTimeout(() => {
            try { UrlApi.revokeObjectURL?.(objectUrl); } catch {}
          }, 1000);
          t?.unref?.();
        } catch {
          if (objectUrl) {
            try { UrlApi.revokeObjectURL?.(objectUrl); } catch {}
          }
        } finally {
          safeRemove(a);
        }
      }
      return jsonText;
    }

    const getConfig = () => (typeof options.getConfig === 'function' ? options.getConfig() : coexist.DEFAULT_CONFIG);
    const updateConfig = (patch) => {
      if (typeof options.onUpdateConfig === 'function') return options.onUpdateConfig(patch);
      return getConfig();
    };
    const getLang = () => (typeof options.getLang === 'function' ? i18n.normalizeLang(options.getLang()) : i18n.detectLang(doc, win));
    const S = () => i18n.getStrings(getLang());
    const safeRemove = (node) => {
      if (typeof coexist?.safeRemoveNode === 'function') return coexist.safeRemoveNode(node);
      try { node?.remove?.(); return true; } catch { return false; }
    };

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
      coexist.markOwnedNoTranslate(el);
      (doc.head || doc.documentElement || doc.body)?.appendChild?.(el);
      createdStyleEl = el;
    }

    function createHexBadgeSvg(letter, size = 15, testId = '') {
      const mkSvg = (tag) =>
        typeof doc.createElementNS === 'function' ? doc.createElementNS('http://www.w3.org/2000/svg', tag) : doc.createElement(tag);
      const svg = mkSvg('svg');
      svg.setAttribute('class', 'ag-sag-hex-icon');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('aria-hidden', 'true');
      if (testId) svg.setAttribute('data-testid', testId);

      const gradId = `ag-sag-hex-grad-${letter}`;
      const defs = mkSvg('defs');
      const lg = mkSvg('linearGradient');
      lg.setAttribute('id', gradId);
      lg.setAttribute('x1', '0%');
      lg.setAttribute('y1', '0%');
      lg.setAttribute('x2', '100%');
      lg.setAttribute('y2', '100%');
      for (const [offset, color] of [
        ['0%', '#38bdf8'],
        ['50%', '#818cf8'],
        ['100%', '#34d399'],
      ]) {
        const st = mkSvg('stop');
        st.setAttribute('offset', offset);
        st.setAttribute('stop-color', color);
        lg.appendChild(st);
      }
      defs.appendChild(lg);
      svg.appendChild(defs);

      const poly = mkSvg('polygon');
      poly.setAttribute('points', '12,2 21,7 21,17 12,22 3,17 3,7');
      poly.setAttribute('fill', `url(#${gradId})`);
      svg.appendChild(poly);

      const txt = mkSvg('text');
      txt.setAttribute('x', '12');
      txt.setAttribute('y', '16');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#ffffff');
      txt.setAttribute('font-size', '12');
      txt.setAttribute('font-weight', '800');
      txt.setAttribute('font-family', 'Inter,system-ui,sans-serif');
      txt.textContent = letter;
      svg.appendChild(txt);
      return svg;
    }

    function refreshAllViews() {
      if (destroyed) return;
      renderIntoSettings();
      if (drawerOpen && drawerBodyEl) {
        renderHub(drawerBodyEl, { inPrism: false, inDrawer: true });
      }
    }

    function buildCtx(inPrism, inDrawer) {
      const cfg = getConfig();
      const strings = S();
      const sagStrings = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang()) : {};
      const lang = getLang();
      const isZh = lang === 'zh-CN' || lang === 'zh-TW' || lang === 'yue';
      const novState = novSynergy?.getState ? novSynergy.getState() : null;
      const novConnected = Boolean(novState?.installed && novState?.bridgeConnected);
      const t = (key, fallback = '') => sagStrings?.[key] ?? strings?.[key] ?? fallback;

      const allModuleKeys = Object.keys(cfg.modules || {});
      const enabledModuleCount = allModuleKeys.filter((k) => Boolean(cfg.modules?.[k])).length;
      const totalModuleCount = allModuleKeys.length || 11;

      const detectActiveSagPreset = () => {
        const presets = coexist?.PRESETS || {};
        for (const pid of ['essential', 'i18n-only', 'power', 'full-auto']) {
          const spec = presets[pid];
          if (!spec || !spec.modules) continue;
          const keys = Object.keys(spec.modules);
          if (keys.every((k) => Boolean(cfg.modules?.[k]) === Boolean(spec.modules[k]))) {
            return pid;
          }
        }
        return '';
      };

      const mkChip = ({ label, active, attr, val, risk, title, testId, disabled, onClick }) => {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'ag-sag-chip';
        b.textContent = label;
        if (title) b.title = title;
        if (testId) b.setAttribute('data-testid', testId);
        b.setAttribute('aria-pressed', String(Boolean(active)));
        if (attr && val !== undefined) b.setAttribute(attr, String(val));
        if (risk) b.setAttribute('data-risk', risk);
        if (disabled) b.disabled = true;
        b.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          onClick();
        });
        return b;
      };

      const mkSwitch = ({ checked, attr, val, risk, title, testId, onClick }) => {
        const sw = doc.createElement('button');
        sw.type = 'button';
        sw.className = 'ag-sag-switch';
        sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-checked', String(Boolean(checked)));
        if (title) {
          sw.title = title;
          sw.setAttribute('aria-label', title);
        }
        if (testId) sw.setAttribute('data-testid', testId);
        if (attr && val !== undefined) sw.setAttribute(attr, String(val));
        if (risk) sw.setAttribute('data-risk', risk);
        sw.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          onClick();
        });
        return sw;
      };

      const mkSuiteRow = (labelText, descText, rightEl, opts = {}) => {
        const r = doc.createElement('div');
        r.className = opts.stacked ? 'ag-sag-suite-row ag-sag-suite-row-stack' : 'ag-sag-suite-row';
        const searchTerms = [labelText, descText, opts.searchExtra || ''].filter(Boolean).join(' ').toLowerCase();
        r.setAttribute('data-ag-sag-search', searchTerms);
        if (opts.testId) r.setAttribute('data-testid', opts.testId);
        const left = doc.createElement('div');
        left.className = 'ag-sag-suite-label';
        const st = doc.createElement('strong');
        st.textContent = labelText;
        left.appendChild(st);
        if (descText) {
          const sp = doc.createElement('span');
          sp.textContent = descText;
          left.appendChild(sp);
        }
        r.appendChild(left);
        if (rightEl) r.appendChild(rightEl);
        return r;
      };

      return {
        doc,
        win,
        coexist,
        i18n,
        options,
        cfg,
        strings,
        sagStrings,
        lang,
        isZh,
        inPrism,
        inDrawer,
        novState,
        novConnected,
        novSynergy,
        novSynergyMod,
        t,
        enabledModuleCount,
        totalModuleCount,
        activeSagPreset: detectActiveSagPreset(),
        mkChip,
        mkSwitch,
        mkSuiteRow,
        updateConfig,
        refreshAllViews,
        resolveDep,
        downloadJsonPayload,
        formatStorageBytes,
        gotoTab: (tabId) => {
          activeSubTab = normalizeSubTab(tabId);
          searchQuery = '';
          if (activeSubTab === 'nov') uiState.novAutoRefreshAttempted = false;
          writeUiState(SUBTAB_STORAGE_KEY, activeSubTab);
          refreshAllViews();
        },
        getMountedRoots: () => ({ mountedEl, drawerBodyEl, drawerOpen, mountedMode }),
        isDestroyed: () => destroyed,
        uiState,
        THRESHOLD_PRESETS,
        STALL_PRESETS,
      };
    }

    function renderHeader(suite, ctx, onFocusAfterToggle) {
      const { cfg, t, enabledModuleCount, totalModuleCount, novConnected, inDrawer } = ctx;
      const foldHead = doc.createElement('div');
      foldHead.className = 'ag-sag-fold-head';
      foldHead.setAttribute('data-testid', 'ag-sag-fold-head');
      foldHead.setAttribute('role', 'button');
      foldHead.setAttribute('tabindex', '0');
      const expandedNow = inDrawer ? true : panelExpanded;
      foldHead.setAttribute('aria-expanded', String(expandedNow));
      foldHead.title = expandedNow ? t('foldCollapse', 'Collapse') : t('foldExpand', 'Expand');

      const foldLeft = doc.createElement('div');
      foldLeft.className = 'ag-sag-fold-left';

      const brandBadge = doc.createElement('span');
      brandBadge.className = 'ag-sag-brand-badge';
      brandBadge.appendChild(createHexBadgeSvg('S', 15, 'ag-sag-hex-logo'));
      const brandTxt = doc.createElement('span');
      brandTxt.textContent = t('foldBrand', 'agy-Sag');
      brandBadge.appendChild(brandTxt);
      foldLeft.appendChild(brandBadge);

      const foldRight = doc.createElement('div');
      foldRight.className = 'ag-sag-fold-right';

      if (novConnected) {
        const dualPill = doc.createElement('button');
        dualPill.type = 'button';
        dualPill.className = 'ag-sag-dual-pill';
        dualPill.setAttribute('data-testid', 'ag-sag-dual-star-pill');
        dualPill.appendChild(createHexBadgeSvg('N', 13, 'ag-sag-nov-mini-hex'));
        const dLbl = doc.createElement('span');
        dLbl.textContent = 'agy-NOV';
        dualPill.appendChild(dLbl);
        dualPill.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          panelExpanded = true;
          activeSubTab = 'nov';
          searchQuery = '';
          writeUiState(EXPANDED_STORAGE_KEY, '1');
          writeUiState(SUBTAB_STORAGE_KEY, 'nov');
          refreshAllViews();
        });
        foldRight.appendChild(dualPill);
      }

      if (!inDrawer) {
        const chev = doc.createElement('span');
        chev.className = 'ag-sag-fold-chevron';
        chev.setAttribute('aria-hidden', 'true');
        chev.textContent = panelExpanded ? '▾' : '▸';
        foldRight.appendChild(chev);

        const toggleFold = () => {
          panelExpanded = !panelExpanded;
          writeUiState(EXPANDED_STORAGE_KEY, panelExpanded ? '1' : '0');
          refreshAllViews();
        };
        foldHead.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          toggleFold();
        });
        foldHead.addEventListener('keydown', (ev) => {
          if (ev?.key === 'Enter' || ev?.key === ' ') {
            ev?.preventDefault?.();
            ev?.stopPropagation?.();
            toggleFold();
            onFocusAfterToggle?.();
          }
        });
      }

      foldHead.appendChild(foldLeft);
      foldHead.appendChild(foldRight);
      suite.appendChild(foldHead);
    }

    function renderPresetRow(foldBody, ctx) {
      if (typeof options.onApplyPreset !== 'function') return;
      const { t, activeSagPreset, mkChip } = ctx;
      const topDeck = doc.createElement('div');
      topDeck.className = 'ag-sag-topdeck';
      topDeck.setAttribute('data-testid', 'ag-sag-topdeck');
      const tdLeft = doc.createElement('div');
      tdLeft.className = 'ag-sag-suite-label';
      const tdTitle = doc.createElement('strong');
      tdTitle.textContent = t('presetLabel', 'Presets');
      const tdDesc = doc.createElement('span');
      tdDesc.textContent = t('presetDesc', '');
      tdLeft.appendChild(tdTitle);
      tdLeft.appendChild(tdDesc);

      const pGrid = doc.createElement('div');
      pGrid.className = 'ag-sag-ext-grid';
      for (const [pId, pLbl] of [
        ['essential', t('presetEssential', 'Essential')],
        ['i18n-only', t('presetI18nOnly', 'i18n Only')],
        ['power', t('presetPower', 'Power')],
        ['full-auto', t('presetFullAuto', 'Full Auto')],
      ]) {
        pGrid.appendChild(
          mkChip({
            label: pLbl,
            active: activeSagPreset === pId,
            attr: 'data-ag-sag-preset',
            val: pId,
            onClick: () => options.onApplyPreset(pId),
          })
        );
      }
      if (!activeSagPreset) {
        const customTag = doc.createElement('span');
        customTag.className = 'ag-sag-meta-pill';
        customTag.setAttribute('data-testid', 'ag-sag-preset-custom');
        customTag.textContent = t('presetCustomTag', 'Custom');
        pGrid.appendChild(customTag);
      }
      topDeck.appendChild(tdLeft);
      topDeck.appendChild(pGrid);
      foldBody.appendChild(topDeck);
    }

    function renderTabBar(foldBody, ctx, rootHost) {
      const { cfg, t, novConnected } = ctx;
      const subtabs = doc.createElement('div');
      subtabs.className = 'ag-sag-subtabs';
      subtabs.setAttribute('data-testid', 'ag-sag-subtabs');
      subtabs.setAttribute('role', 'tablist');

      const uiHasOn = Boolean(cfg.modules?.hostI18n || cfg.modules?.themeStudio);
      const convHasOn = Boolean(
        cfg.modules?.compactGuard ||
          cfg.modules?.precompactExport ||
          cfg.modules?.draftGuard ||
          cfg.modules?.promptQueue ||
          cfg.modules?.outlineBookmarks
      );
      const guardHasOn = Boolean(
        cfg.modules?.sessionWatchdog ||
          cfg.modules?.sessionRadar ||
          cfg.modules?.safeAutoAccept ||
          cfg.modules?.quotaPulse
      );

      const showNovTab = Boolean(novConnected || ctx.novState?.installed);
      const tabSpecs = [
        ['overview', t('tabOverview', 'Overview'), false],
        ['ui', t('tabUi', 'UI'), uiHasOn],
        ['conversation', t('tabConversation', 'Chat'), convHasOn],
        ['guard', t('tabGuard', 'Guard'), guardHasOn],
        ...(showNovTab ? [['nov', t('tabNov', 'agy-NOV'), novConnected]] : []),
        ['advanced', t('tabAdvanced', 'Advanced'), false],
      ];

      for (const [tabId, tabLabel, hasDot] of tabSpecs) {
        const tb = doc.createElement('button');
        tb.type = 'button';
        tb.className = 'ag-sag-subtab';
        tb.setAttribute('role', 'tab');
        tb.setAttribute('data-ag-sag-subtab', tabId);
        tb.setAttribute('aria-pressed', String(activeSubTab === tabId));
        tb.setAttribute('aria-selected', String(activeSubTab === tabId));
        if (hasDot) {
          const dot = doc.createElement('span');
          dot.className = 'ag-sag-subtab-dot';
          dot.setAttribute('aria-hidden', 'true');
          tb.appendChild(dot);
        }
        const lblSpan = doc.createElement('span');
        lblSpan.textContent = tabLabel;
        tb.appendChild(lblSpan);
        tb.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          const wasFocused = doc.activeElement === tb;
          activeSubTab = tabId;
          searchQuery = '';
          if (tabId === 'nov') uiState.novAutoRefreshAttempted = false;
          writeUiState(SUBTAB_STORAGE_KEY, tabId);
          refreshAllViews();
          if (wasFocused) {
            rootHost?.querySelector?.(`[data-ag-sag-subtab="${tabId}"]`)?.focus?.();
          }
        });
        subtabs.appendChild(tb);
      }
      foldBody.appendChild(subtabs);
    }

    const renderOverview = (pane, ctx) => tabOverviewMod?.renderOverviewTab?.(pane, ctx);
    const renderUiTab = (pane, ctx) => tabUiMod?.renderUiTab?.(pane, ctx);
    const renderConversationTab = (pane, ctx) => tabConversationMod?.renderConversationTab?.(pane, ctx);
    const renderGuardTab = (pane, ctx) => tabGuardMod?.renderGuardTab?.(pane, ctx);
    const renderNovTab = (pane, ctx) => tabNovMod?.renderNovTab?.(pane, ctx);
    const renderAdvancedTab = (pane, ctx) => tabAdvancedMod?.renderAdvancedTab?.(pane, ctx);

    function renderHub(section, { inPrism = false, inDrawer = false } = {}) {
      if (!section || !doc) return;
      const sagStrings = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang()) : null;
      if (!sagStrings) return;

      const hadSearchFocus = doc.activeElement?.getAttribute?.('data-testid') === 'ag-sag-search-input';
      const ctx = buildCtx(inPrism, inDrawer);
      while (section.firstChild) section.removeChild(section.firstChild);

      const suite = doc.createElement('div');
      suite.className = 'ag-sag-suite-panel';
      suite.setAttribute('data-testid', 'ag-sag-suite-panel');

      renderHeader(suite, ctx, () => {
        section.querySelector?.('[data-testid="ag-sag-fold-head"]')?.focus?.();
      });

      const foldBody = doc.createElement('div');
      foldBody.className = 'ag-sag-fold-body';
      foldBody.setAttribute('data-testid', 'ag-sag-fold-body');
      foldBody.hidden = inDrawer ? false : !panelExpanded;

      // Global Search Input (stays mounted in place during typing so focus is preserved)
      const searchWrap = doc.createElement('div');
      searchWrap.className = 'ag-sag-search-wrap';
      const searchInp = doc.createElement('input');
      searchInp.type = 'search';
      searchInp.className = 'ag-sag-search-input';
      searchInp.setAttribute('data-testid', 'ag-sag-search-input');
      searchInp.placeholder = ctx.t('searchPlaceholder', 'Search settings…');
      searchInp.value = searchQuery;

      const clearSearchBtn = ctx.mkChip({
        label: ctx.t('searchClear', 'Clear'),
        active: false,
        testId: 'ag-sag-search-clear',
        onClick: () => {
          searchQuery = '';
          searchInp.value = '';
          updateSearchView();
          searchInp.focus?.();
        },
      });
      clearSearchBtn.hidden = !searchQuery.trim();
      searchWrap.appendChild(searchInp);
      searchWrap.appendChild(clearSearchBtn);
      foldBody.appendChild(searchWrap);

      const presetAndTabsWrap = doc.createElement('div');
      presetAndTabsWrap.className = 'ag-sag-pane';
      renderPresetRow(presetAndTabsWrap, ctx);
      renderTabBar(presetAndTabsWrap, ctx, section);

      const showNovTab = Boolean(ctx.novConnected || ctx.novState?.installed);
      const effectiveTab = activeSubTab === 'nov' && !showNovTab ? 'overview' : activeSubTab;
      const pane = doc.createElement('div');
      pane.className = 'ag-sag-pane';
      pane.setAttribute('data-ag-sag-pane', effectiveTab);
      if (effectiveTab === 'overview') renderOverview(pane, ctx);
      else if (effectiveTab === 'ui') renderUiTab(pane, ctx);
      else if (effectiveTab === 'conversation') renderConversationTab(pane, ctx);
      else if (effectiveTab === 'guard') renderGuardTab(pane, ctx);
      else if (effectiveTab === 'nov') renderNovTab(pane, ctx);
      else if (effectiveTab === 'advanced') renderAdvancedTab(pane, ctx);
      presetAndTabsWrap.appendChild(pane);

      const searchResultsHost = doc.createElement('div');
      searchResultsHost.className = 'ag-sag-pane';
      searchResultsHost.setAttribute('data-testid', 'ag-sag-search-results');

      const updateSearchView = () => {
        const q = searchQuery.trim().toLowerCase();
        clearSearchBtn.hidden = !q;
        while (searchResultsHost.firstChild) searchResultsHost.removeChild(searchResultsHost.firstChild);
        if (!q) {
          presetAndTabsWrap.hidden = false;
          searchResultsHost.hidden = true;
          return;
        }
        presetAndTabsWrap.hidden = true;
        searchResultsHost.hidden = false;

        const virtualAll = doc.createElement('div');
        const searchCtx = { ...ctx, allowNovAutoRefresh: false };
        renderOverview(virtualAll, searchCtx);
        renderUiTab(virtualAll, searchCtx);
        renderConversationTab(virtualAll, searchCtx);
        renderGuardTab(virtualAll, searchCtx);
        if (showNovTab) renderNovTab(virtualAll, searchCtx);
        renderAdvancedTab(virtualAll, searchCtx);

        const matches = Array.from(virtualAll.querySelectorAll?.('[data-ag-sag-search]') || []).filter((el) =>
          String(el.getAttribute('data-ag-sag-search') || '').includes(q)
        );
        if (!matches.length) {
          const emptyEl = doc.createElement('div');
          emptyEl.className = 'ag-sag-badge-note';
          emptyEl.setAttribute('data-testid', 'ag-sag-search-empty');
          emptyEl.textContent = ctx.t('searchEmpty', 'No matching settings found');
          searchResultsHost.appendChild(emptyEl);
          return;
        }
        for (const item of matches) {
          searchResultsHost.appendChild(item);
        }
        const liveCfgStatus = virtualAll.querySelector?.('[data-testid="ag-sag-cfg-status"]');
        if (liveCfgStatus && !searchResultsHost.querySelector?.('[data-testid="ag-sag-cfg-status"]')) {
          searchResultsHost.appendChild(liveCfgStatus);
        }
      };

      searchInp.addEventListener('input', () => {
        searchQuery = searchInp.value;
        updateSearchView();
      });

      updateSearchView();
      foldBody.appendChild(presetAndTabsWrap);
      foldBody.appendChild(searchResultsHost);
      suite.appendChild(foldBody);
      section.appendChild(suite);

      if (hadSearchFocus) {
        try { searchInp.focus?.(); } catch {}
      }
    }

    function ensureDrawerDom() {
      if (!doc || !doc.body || destroyed) return null;
      ensureStyle();
      if (!drawerBackdropEl || !drawerBackdropEl.isConnected) {
        drawerBackdropEl = coexist.markOwnedNoTranslate(doc.createElement('div'));
        drawerBackdropEl.className = 'ag-sag-drawer-backdrop';
        drawerBackdropEl.setAttribute('data-testid', DRAWER_BACKDROP_TESTID);
        drawerBackdropEl.hidden = true;
        drawerBackdropEl.addEventListener('click', (ev) => {
          if (ev?.target === drawerBackdropEl) closeDrawer();
        });

        drawerEl = doc.createElement('div');
        drawerEl.className = 'ag-sag-drawer';
        drawerEl.setAttribute('role', 'dialog');
        drawerEl.setAttribute('aria-modal', 'true');
        drawerEl.setAttribute('data-testid', DRAWER_TESTID);

        const dHead = doc.createElement('div');
        dHead.className = 'ag-sag-drawer-head';
        const dTitle = doc.createElement('div');
        dTitle.className = 'ag-sag-brand-badge';
        dTitle.appendChild(createHexBadgeSvg('S', 16));
        const dTxt = doc.createElement('span');
        dTxt.textContent = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang())?.drawerTitle || 'agy-Sag' : 'agy-Sag';
        dTitle.appendChild(dTxt);

        const dActs = doc.createElement('div');
        dActs.className = 'ag-sag-code-acts';

        const dKey = doc.createElement('button');
        dKey.type = 'button';
        dKey.className = 'ag-sag-chip';
        dKey.setAttribute('data-testid', 'ag-sag-drawer-shortcuts');
        dKey.textContent = '⌨';
        dKey.title = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang())?.scBtnTitle || 'Shortcuts (Ctrl/Cmd+Shift+Alt+/)' : 'Shortcuts (Ctrl/Cmd+Shift+Alt+/)';
        dKey.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          openShortcutSheet();
        });

        const dClose = doc.createElement('button');
        dClose.type = 'button';
        dClose.className = 'ag-sag-chip';
        dClose.setAttribute('data-testid', 'ag-sag-drawer-close');
        dClose.textContent = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang())?.drawerClose || 'Close' : 'Close';
        dClose.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          closeDrawer();
        });
        dActs.appendChild(dKey);
        dActs.appendChild(dClose);
        dHead.appendChild(dTitle);
        dHead.appendChild(dActs);

        drawerBodyEl = doc.createElement('div');
        drawerBodyEl.className = 'ag-sag-drawer-body';

        drawerEl.appendChild(dHead);
        drawerEl.appendChild(drawerBodyEl);
        drawerBackdropEl.appendChild(drawerEl);
        doc.body.appendChild(drawerBackdropEl);
      }
      return drawerBackdropEl;
    }

    function openDrawer(tabId) {
      if (destroyed || !doc) return false;
      if (tabId) {
        activeSubTab = normalizeSubTab(tabId);
        writeUiState(SUBTAB_STORAGE_KEY, activeSubTab);
      }
      drawerOpen = true;
      const bd = ensureDrawerDom();
      if (!bd || !drawerBodyEl) return false;
      bd.hidden = false;
      renderHub(drawerBodyEl, { inPrism: false, inDrawer: true });
      return true;
    }

    function closeDrawer() {
      drawerOpen = false;
      if (drawerBackdropEl) {
        drawerBackdropEl.hidden = true;
      }
      if (drawerBodyEl) {
        while (drawerBodyEl.firstChild) drawerBodyEl.removeChild(drawerBodyEl.firstChild);
      }
      return true;
    }

    function closeShortcutSheet() {
      shortcutSheetOpen = false;
      safeRemove(shortcutSheetEl);
      shortcutSheetEl = null;
      return true;
    }

    function openShortcutSheet() {
      if (destroyed || !doc?.body) return false;
      closeShortcutSheet();
      ensureStyle();
      const cfg = getConfig();
      const mods = cfg.modules || {};
      const sag = typeof i18n.getSagStrings === 'function' ? i18n.getSagStrings(getLang()) : {};
      const navPlat = String(win?.navigator?.platform || win?.navigator?.userAgent || '');
      const isMac = /mac|darwin/i.test(navPlat);
      const modKey = isMac ? 'Cmd' : navPlat ? 'Ctrl' : 'Ctrl/Cmd';
      const rows = [
        { keys: `${modKey} + Alt + ,`, desc: sag.scSettingsDrawer || 'Toggle agy-Sag Settings Drawer' },
        { keys: `${modKey} + Shift + Alt + /`, desc: sag.scShortcutSheet || 'Show Active Keyboard Shortcuts' },
      ];
      if (mods.promptLibrary) {
        rows.push({ keys: `${modKey} + Alt + P`, desc: sag.scPromptPalette || 'Open Prompt Library & Command Palette' });
        rows.push({ keys: sag.scSlashSlashKey || '// (empty composer)', desc: sag.scSlashSlash || 'Quick-open Prompt Library from composer' });
      }
      if (mods.readingNav) {
        rows.push({ keys: 'Alt + ↑ / ↓', desc: sag.scTurnJump || 'Jump to previous / next user turn' });
        rows.push({ keys: 'Alt + F', desc: sag.scOutlineSearch || 'Search turns in current conversation outline' });
      }
      if (mods.outlineBookmarks) {
        rows.push({ keys: `${modKey} + Shift + B`, desc: sag.scBookmarkVault || 'Open Cross-Session Bookmark Vault' });
      }
      if (mods.draftGuard !== false) {
        rows.push({ keys: 'Ctrl + ↑ / ↓', desc: sag.scSentHistory || 'Cycle recent sent prompts in empty composer' });
      }

      const bd = coexist.markOwnedNoTranslate(doc.createElement('div'));
      bd.className = 'ag-sag-mermaid-modal';
      bd.setAttribute('data-testid', 'ag-sag-shortcuts-modal');
      bd.setAttribute('role', 'dialog');
      bd.addEventListener('click', (ev) => {
        if (ev?.target === bd) closeShortcutSheet();
      });

      const card = doc.createElement('div');
      card.className = 'ag-sag-shortcuts-card';

      const head = doc.createElement('div');
      head.className = 'ag-sag-mermaid-head';
      const title = doc.createElement('strong');
      title.textContent = sag.scSheetTitle || 'agy-Sag Active Shortcuts';
      const closeBtn = doc.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ag-sag-chip';
      closeBtn.setAttribute('data-testid', 'ag-sag-shortcuts-close');
      closeBtn.textContent = sag.drawerClose || 'Close';
      closeBtn.addEventListener('click', () => closeShortcutSheet());
      head.appendChild(title);
      head.appendChild(closeBtn);
      card.appendChild(head);

      const list = doc.createElement('div');
      list.className = 'ag-sag-shortcuts-list';
      for (const r of rows) {
        const row = doc.createElement('div');
        row.className = 'ag-sag-shortcuts-row';
        const kbd = doc.createElement('kbd');
        kbd.className = 'ag-sag-kbd';
        kbd.textContent = r.keys;
        const d = doc.createElement('span');
        d.textContent = r.desc;
        row.appendChild(kbd);
        row.appendChild(d);
        list.appendChild(row);
      }
      card.appendChild(list);
      bd.appendChild(card);
      doc.body.appendChild(bd);
      shortcutSheetEl = bd;
      shortcutSheetOpen = true;
      return true;
    }

    function ensureNativeSettingsNavAnchor(sectionEl) {
      if (!doc || !sectionEl || destroyed) return;
      try {
        sectionEl.querySelectorAll?.('[data-testid="ag-sag-settings-nav-item"]')?.forEach?.((n) => safeRemove(n));
      } catch {}
      const dialog = sectionEl.closest?.('[role="dialog"]') || doc.querySelector?.('[role="dialog"]') || null;
      if (!dialog) return;
      const navCandidates =
        typeof dialog.querySelectorAll === 'function'
          ? Array.from(dialog.querySelectorAll('nav, aside') || [])
          : [dialog.querySelector?.('nav, aside')].filter(Boolean);
      const navHost =
        navCandidates.find((el) => el && !isNodeInside(sectionEl, el) && !el.closest?.('[data-ag-sag-owned="1"], .ag-sag-suite-panel')) ||
        null;
      if (!navHost) return;
      let navBtn = navHost.querySelector?.('[data-testid="ag-sag-settings-nav-item"]') || null;
      if (!navBtn) {
        navBtn = coexist.markOwnedNoTranslate(doc.createElement('button'));
        navBtn.type = 'button';
        navBtn.className = 'ag-sag-settings-nav-item';
        navBtn.setAttribute('data-testid', 'ag-sag-settings-nav-item');
        navBtn.textContent = 'agy-Sag';
        navBtn.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          panelExpanded = true;
          writeUiState(EXPANDED_STORAGE_KEY, '1');
          refreshAllViews();
          try {
            mountedEl?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
          } catch {}
        });
        coexist.safeAppendChild(navHost, navBtn);
      }
      settingsNavEl = navBtn;
    }

    function isNodeInside(container, node) {
      if (!container || !node) return false;
      if (node === container) return true;
      if (typeof container.contains === 'function') {
        try {
          if (container.contains(node)) return true;
        } catch {}
      }
      let cur = node.parentElement || node.parentNode || null;
      let hops = 0;
      while (cur && hops < 64) {
        if (cur === container) return true;
        cur = cur.parentElement || cur.parentNode || null;
        hops += 1;
      }
      return false;
    }

    function isUserEditingInside(container) {
      if (!container || container.isConnected === false || !doc) return false;
      const act = doc.activeElement;
      if (!act || act === doc.body || act === doc.documentElement) return false;
      if (!isNodeInside(container, act)) return false;
      if (imeComposing) return true;
      const tag = String(act.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return Boolean(act.isContentEditable || act.getAttribute?.('contenteditable') === 'true');
    }

    function renderIntoSettings({ fromObserver = false } = {}) {
      if (destroyed || !doc) return false;
      const settingsEl = doc.getElementById?.(PRISM_SETTINGS_SEC_ID);
      const modulesGroup = settingsEl?.querySelector?.(PRISM_MODULES_GROUP_SEL) || null;
      const prismAvailable = Boolean(settingsEl && modulesGroup);
      if (fromObserver && mountedEl && mountedEl.isConnected !== false) {
        const modeUnchanged =
          (mountedMode === 'prism' && prismAvailable && mountedEl.parentElement === modulesGroup) ||
          (mountedMode === 'native' && !prismAvailable);
        if (modeUnchanged) return true;
        if (isUserEditingInside(mountedEl)) return true;
      }
      ensureStyle();

      // Priority 1: Embed cleanly inside Obsidian Prism's Modules tab if #ag-cs-settings-sec exists
      if (prismAvailable) {
        doc.querySelectorAll?.(`[data-testid="${NATIVE_SECTION_TESTID}"]`)?.forEach?.((n) => safeRemove(n));
        safeRemove(settingsNavEl);
        settingsNavEl = null;
        let section = modulesGroup.querySelector?.(`[data-testid="${EMBED_SECTION_TESTID}"]`) || null;
        if (!section) {
          section = coexist.markOwnedNoTranslate(doc.createElement('div'));
          section.className = 'ag-sg-set-section';
          section.setAttribute('data-testid', EMBED_SECTION_TESTID);
          coexist.safeAppendChild(modulesGroup, section);
        }
        mountedEl = section;
        mountedMode = 'prism';
        if (fromObserver && isUserEditingInside(section)) return true;
        renderHub(section, { inPrism: true, inDrawer: false });
        return true;
      }

      // Priority 2: Standalone user -> mount cleanly in Antigravity's native Settings dialog
      const nativeAnchor = findNativeSettingsAnchor(doc);
      if (nativeAnchor) {
        let section = nativeAnchor.parent.querySelector?.(`[data-testid="${NATIVE_SECTION_TESTID}"]`) || null;
        if (!section) {
          section = coexist.markOwnedNoTranslate(doc.createElement('div'));
          section.className = 'space-y-2 ag-sg-native-section';
          section.setAttribute('data-testid', NATIVE_SECTION_TESTID);
          coexist.safeAppendChild(nativeAnchor.parent, section);
        }
        mountedEl = section;
        mountedMode = 'native';
        if (fromObserver && isUserEditingInside(section)) return true;
        renderHub(section, { inPrism: false, inDrawer: false });
        ensureNativeSettingsNavAnchor(section);
        return true;
      }

      const existingNative =
        mountedMode === 'native' && mountedEl && mountedEl.isConnected
          ? mountedEl
          : doc.querySelector?.(`[data-testid="${NATIVE_SECTION_TESTID}"]`) || null;
      if (existingNative && existingNative.isConnected) {
        mountedEl = existingNative;
        mountedMode = 'native';
        if (fromObserver && isUserEditingInside(existingNative)) return true;
        renderHub(existingNative, { inPrism: false, inDrawer: false });
        return true;
      }

      if (mountedEl && mountedEl.isConnected === false) {
        mountedEl = null;
        mountedMode = 'none';
      }
      return false;
    }

    function readHostLangSignature() {
      const html = doc?.documentElement;
      if (!html) return '';
      return [
        html.getAttribute?.('data-ag-cs-lang') || '',
        html.getAttribute?.('data-ag-sag-lang') || '',
        html.getAttribute?.('lang') || '',
      ].join('|');
    }

    function checkHostContextChange() {
      if (destroyed || !doc?.documentElement) return;
      const curLang = readHostLangSignature();
      const curTheme =
        doc.documentElement.getAttribute?.('data-ag-sag-theme') ||
        doc.documentElement.getAttribute?.('data-ag-cs-theme') ||
        '';
      if (curLang !== lastLang || curTheme !== lastTheme) {
        lastLang = curLang;
        lastTheme = curTheme;
        if (typeof options.onHostContextChange === 'function') {
          try { options.onHostContextChange({ lang: curLang, theme: curTheme }); } catch {}
        }
        lastLang = readHostLangSignature();
        refreshAllViews();
      }
    }

    function sync() {
      if (destroyed) return false;
      checkHostContextChange();
      const mountedOk = renderIntoSettings();
      if (drawerOpen && drawerBodyEl) {
        renderHub(drawerBodyEl, { inPrism: false, inDrawer: true });
      }
      return mountedOk;
    }

    function bindShortcuts() {
      if (!doc || typeof doc.addEventListener !== 'function') return;
      if (options.bindDrawerShortcut === false) return;
      const handler = (ev) => {
        if (destroyed || !ev) return;
        if (ev.key === 'Escape' && shortcutSheetOpen) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
          closeShortcutSheet();
          return;
        }
        if (ev.key === 'Escape' && drawerOpen) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
          closeDrawer();
          return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.altKey && ev.shiftKey && (ev.key === '/' || ev.key === '?' || ev.code === 'Slash')) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
          if (shortcutSheetOpen) closeShortcutSheet();
          else openShortcutSheet();
          return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.altKey && !ev.shiftKey && (ev.key === ',' || ev.code === 'Comma')) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
          if (drawerOpen) closeDrawer();
          else openDrawer();
        }
      };
      doc.addEventListener('keydown', handler, true);
      keydownCleanup = () => doc.removeEventListener('keydown', handler, true);
    }

    function startObservers() {
      if (!doc) return;
      if (!compositionCleanup && typeof doc.addEventListener === 'function') {
        const onCompStart = () => { imeComposing = true; };
        const onCompEnd = () => { imeComposing = false; };
        doc.addEventListener('compositionstart', onCompStart, true);
        doc.addEventListener('compositionend', onCompEnd, true);
        compositionCleanup = () => {
          doc.removeEventListener?.('compositionstart', onCompStart, true);
          doc.removeEventListener?.('compositionend', onCompEnd, true);
        };
      }
      const scheduleDomRender = () => {
        if (domDebounceTimer) clearTimeout(domDebounceTimer);
        domDebounceTimer = setTimeout(() => {
          domDebounceTimer = null;
          if (!destroyed && !coexist.isWindowHibernated(doc, win, false)) {
            renderIntoSettings({ fromObserver: true });
          }
        }, 250);
        domDebounceTimer?.unref?.();
      };
      const runHtmlSync = () => {
        if (destroyed || coexist.isWindowHibernated(doc, win, false)) return;
        if (htmlSyncInFlight) {
          htmlSyncQueued = true;
          return;
        }
        htmlSyncInFlight = true;
        try {
          checkHostContextChange();
        } finally {
          htmlSyncInFlight = false;
          if (htmlSyncQueued && !destroyed) {
            htmlSyncQueued = false;
            if (typeof queueMicrotask === 'function') queueMicrotask(runHtmlSync);
            else Promise.resolve().then(runHtmlSync);
          }
        }
      };
      const scheduleHtmlSync = () => {
        if (destroyed || coexist.isWindowHibernated(doc, win, false)) return;
        if (typeof win?.requestAnimationFrame === 'function') {
          if (htmlRaf) return;
          htmlRaf = win.requestAnimationFrame(() => {
            htmlRaf = 0;
            runHtmlSync();
          });
          return;
        }
        runHtmlSync();
      };
      const HTML_ATTR_FILTER = ['data-ag-sag-lang', 'data-ag-sag-theme', 'data-ag-cs-lang', 'data-ag-cs-theme', 'data-ag-cs-style', 'lang'];
      try {
        if (!domObserver && !domBusUnsub) {
          const domBus = coexist?.getDomMutationBus?.(doc, win);
          if (domBus && typeof domBus.subscribe === 'function') {
            try {
              domBusUnsub = domBus.subscribe(
                'prism-bridge-dom',
                (_muts, meta) => {
                  if (destroyed) return;
                  if (!meta?.woken && coexist.isWindowHibernated(doc, win, false)) return;
                  scheduleDomRender();
                },
                { wakeOnResume: true }
              );
            } catch {
              domBusUnsub = null;
            }
          }
          if (!domBusUnsub && typeof win?.MutationObserver === 'function') {
            domObserver = new win.MutationObserver((muts) => {
              if (destroyed || coexist.isWindowHibernated(doc, win, false)) return;
              if (typeof coexist.isMutationOwnedOnly === 'function') {
                if (coexist.isMutationOwnedOnly(muts)) return;
              } else {
                const relevant = (muts || []).some((m) => {
                  const t = m?.target;
                  if (
                    t?.getAttribute?.('data-ag-sg-owned') === '1' ||
                    t?.getAttribute?.('data-ag-sag-owned') === '1' ||
                    t?.closest?.('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"]')
                  ) {
                    return false;
                  }
                  return true;
                });
                if (!relevant) return;
              }
              scheduleDomRender();
            });
            const rootNode = doc.body || doc.documentElement;
            if (rootNode) domObserver.observe(rootNode, { childList: true, subtree: true });
          }
        }
        if (!htmlObserver && !htmlBusUnsub && doc.documentElement) {
          const attrBus = coexist?.getHtmlAttrBus?.(doc, win);
          if (attrBus && typeof attrBus.subscribe === 'function') {
            try {
              htmlBusUnsub = attrBus.subscribe(
                'prism-bridge-html',
                (_changedAttrs, meta) => {
                  if (destroyed) return;
                  if (!meta?.woken && coexist.isWindowHibernated(doc, win, false)) return;
                  scheduleHtmlSync();
                },
                { attributeFilter: HTML_ATTR_FILTER, wakeOnResume: true }
              );
            } catch {
              htmlBusUnsub = null;
            }
          }
          if (!htmlBusUnsub && typeof win?.MutationObserver === 'function') {
            htmlObserver = new win.MutationObserver(() => {
              if (!destroyed && !coexist.isWindowHibernated(doc, win, false)) scheduleHtmlSync();
            });
            htmlObserver.observe(doc.documentElement, {
              attributes: true,
              attributeFilter: HTML_ATTR_FILTER,
            });
          }
        }
      } catch {}
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      drawerOpen = false;
      if (domDebounceTimer) {
        try { clearTimeout(domDebounceTimer); } catch {}
        domDebounceTimer = null;
      }
      if (htmlRaf && typeof win?.cancelAnimationFrame === 'function') {
        try { win.cancelAnimationFrame(htmlRaf); } catch {}
      }
      htmlRaf = 0;
      htmlSyncInFlight = false;
      htmlSyncQueued = false;
      if (uiState.copyResetTimer) {
        try { clearTimeout(uiState.copyResetTimer); } catch {}
        uiState.copyResetTimer = null;
      }
      if (keydownCleanup) {
        try { keydownCleanup(); } catch {}
        keydownCleanup = null;
      }
      if (compositionCleanup) {
        try { compositionCleanup(); } catch {}
        compositionCleanup = null;
      }
      imeComposing = false;
      if (domBusUnsub) {
        try { domBusUnsub(); } catch {}
        domBusUnsub = null;
      }
      if (htmlBusUnsub) {
        try { htmlBusUnsub(); } catch {}
        htmlBusUnsub = null;
      }
      try { domObserver?.disconnect?.(); } catch {}
      try { htmlObserver?.disconnect?.(); } catch {}
      domObserver = htmlObserver = null;
      safeRemove(mountedEl);
      safeRemove(drawerBackdropEl);
      closeShortcutSheet();
      safeRemove(settingsNavEl);
      settingsNavEl = null;
      safeRemove(createdStyleEl);
      try {
        doc?.querySelectorAll?.(
          `[data-testid="${EMBED_SECTION_TESTID}"], [data-testid="${NATIVE_SECTION_TESTID}"], [data-testid="${DRAWER_BACKDROP_TESTID}"], [data-testid="ag-sag-shortcuts-modal"], [data-testid="ag-sag-settings-nav-item"]`
        )?.forEach?.((n) => safeRemove(n));
      } catch {}
      mountedEl = drawerBackdropEl = drawerEl = drawerBodyEl = createdStyleEl = null;
      mountedMode = 'none';
    }

    lastLang = readHostLangSignature();
    lastTheme =
      doc?.documentElement?.getAttribute?.('data-ag-sag-theme') ||
      doc?.documentElement?.getAttribute?.('data-ag-cs-theme') ||
      '';
    bindShortcuts();
    renderIntoSettings();
    if (options.autoObserve !== false) startObservers();

    return {
      sync,
      renderHub,
      openDrawer,
      closeDrawer,
      isDrawerOpen: () => drawerOpen,
      openShortcutSheet,
      closeShortcutSheet,
      isShortcutSheetOpen: () => shortcutSheetOpen,
      getActiveSubTab: () => activeSubTab,
      setActiveSubTab: (tabId) => {
        const next = normalizeSubTab(tabId);
        if (!SUBTAB_IDS.includes(next)) return false;
        activeSubTab = next;
        searchQuery = '';
        writeUiState(SUBTAB_STORAGE_KEY, next);
        refreshAllViews();
        return true;
      },
      isExpanded: () => panelExpanded,
      setExpanded: (expanded) => {
        panelExpanded = Boolean(expanded);
        writeUiState(EXPANDED_STORAGE_KEY, panelExpanded ? '1' : '0');
        refreshAllViews();
        return panelExpanded;
      },
      detectEnvironment: () => detectPrismEnvironment(doc, win),
      getDebugState: () => ({
        destroyed,
        embedded: Boolean(mountedEl && mountedEl.isConnected !== false),
        mountedMode: mountedEl && mountedEl.isConnected !== false ? mountedMode : 'none',
        drawerOpen,
        activeSubTab,
        panelExpanded,
        env: detectPrismEnvironment(doc, win),
      }),
      destroy,
    };
  }

  return {
    PRISM_SETTINGS_SEC_ID,
    PRISM_MODULES_GROUP_SEL,
    EMBED_SECTION_TESTID,
    NATIVE_SECTION_TESTID,
    DRAWER_BACKDROP_TESTID,
    DRAWER_TESTID,
    SUBTAB_IDS,
    LEGACY_TAB_MAP,
    normalizeSubTab,
    detectPrismEnvironment,
    findNativeSettingsAnchor,
    createPrismBridgeController,
  };
});
