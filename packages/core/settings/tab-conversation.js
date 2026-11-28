// agy-Sag — Settings Hub Tab: Conversation (UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagSettingsTabConversation = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function renderConversationTab(pane, ctx) {
    const {
      doc,
      i18n,
      options,
      cfg,
      t,
      mkChip,
      mkSuiteRow,
      updateConfig,
      downloadJsonPayload,
      getMountedRoots,
      uiState,
      THRESHOLD_PRESETS,
    } = ctx;

    // 1. Auto-Compact Threshold
    const thGrid = doc.createElement('div');
    thGrid.className = 'ag-sag-ext-grid';
    for (const preset of THRESHOLD_PRESETS) {
      const b = mkChip({
        label: preset === 'off' ? t('cfgThresholdOff', 'Off') : `${preset}%`,
        active: cfg.compactThreshold === preset,
        attr: 'data-ag-sag-th',
        val: preset,
        onClick: () => updateConfig({ compactThreshold: preset }),
      });
      b.setAttribute('data-ag-sg-th', String(preset));
      thGrid.appendChild(b);
    }
    pane.appendChild(
      mkSuiteRow(t('cfgThreshold', 'Auto-Compact Threshold'), t('convThresholdsDesc', ''), thGrid, {
        searchExtra: 'compactThreshold percent',
      })
    );

    // 2. Trigger Mode
    const modeGrid = doc.createElement('div');
    modeGrid.className = 'ag-sag-ext-grid';
    for (const [mKey, mLbl] of [
      ['auto-silent', t('cfgModeSilent', 'Silent Auto')],
      ['confirm', t('cfgModeConfirm', 'Confirm Bar')],
      ['fill-only', t('cfgModeFill', 'Fill Only')],
      ['auto-countdown', t('cfgModeCountdown', 'Auto (3s)')],
    ]) {
      const b = mkChip({
        label: mLbl,
        active: cfg.compactTriggerMode === mKey,
        attr: 'data-ag-sg-mode',
        val: mKey,
        onClick: () => updateConfig({ compactTriggerMode: mKey }),
      });
      b.setAttribute('data-ag-sag-mode', mKey);
      modeGrid.appendChild(b);
    }
    pane.appendChild(mkSuiteRow(t('cfgMode', 'Trigger Mode'), t('setDescMode', ''), modeGrid, { searchExtra: 'compactTriggerMode silent confirm' }));

    // 3. Compact Focus Preset + Custom directive
    const focusWrap = doc.createElement('div');
    focusWrap.className = 'ag-sag-pack-ctrl';
    const focusGrid = doc.createElement('div');
    focusGrid.className = 'ag-sag-ext-grid';
    for (const [fKey, fLbl] of [
      ['default', t('cfgFocusDefault', 'Default')],
      ['code-errors', t('cfgFocusCode', 'Code & Errors')],
      ['bookmarks', t('cfgFocusBookmarks', 'Bookmarks')],
      ['custom', t('cfgFocusCustom', 'Custom')],
    ]) {
      const b = mkChip({
        label: fLbl,
        active: (cfg.compactFocusPreset || 'default') === fKey,
        attr: 'data-ag-sg-focus',
        val: fKey,
        onClick: () => updateConfig({ compactFocusPreset: fKey }),
      });
      b.setAttribute('data-ag-sag-focus', fKey);
      focusGrid.appendChild(b);
    }
    focusWrap.appendChild(focusGrid);

    if (cfg.compactFocusPreset === 'custom') {
      const focusInp = doc.createElement('input');
      focusInp.type = 'text';
      focusInp.className = 'ag-sag-search-input';
      focusInp.setAttribute('data-ag-sg-custom-focus', '1');
      focusInp.placeholder = t('cfgFocusCustomPlaceholder', '');
      focusInp.value = cfg.customCompactFocus || '';
      focusInp.addEventListener('input', () => {
        updateConfig({ customCompactFocus: focusInp.value });
      });
      focusWrap.appendChild(focusInp);
    }
    pane.appendChild(
      mkSuiteRow(t('cfgFocus', 'Preserve Focus'), '', focusWrap, {
        stacked: cfg.compactFocusPreset === 'custom',
        searchExtra: 'compactFocusPreset customCompactFocus',
      })
    );

    // 4. Bookmarks & Vault quick action
    const bmRight = doc.createElement('div');
    bmRight.className = 'ag-sag-ext-grid';
    const bmState = typeof options.getBookmarkState === 'function' ? options.getBookmarkState() : null;
    const bmNote = doc.createElement('span');
    bmNote.className = 'ag-sag-badge-note';
    bmNote.textContent = `${bmState?.bookmarkCount ?? 0} ★`;
    bmRight.appendChild(bmNote);
    if (typeof options.onOpenVault === 'function') {
      bmRight.appendChild(
        mkChip({
          label: t('convOpenVaultBtn', 'Open Bookmark Vault'),
          active: false,
          testId: 'ag-sag-open-vault-btn',
          onClick: () => options.onOpenVault(),
        })
      );
    }
    pane.appendChild(mkSuiteRow(t('convBookmarksLabel', 'Turn Bookmarks & Vault'), t('convBookmarksDesc', ''), bmRight, { searchExtra: 'outlineBookmarks vault' }));

    // 5. Prompt Queue & Draft Guard live readout
    const pqState = typeof options.getQueueState === 'function' ? options.getQueueState() : null;
    const pqBadge = doc.createElement('span');
    pqBadge.className = 'ag-sag-badge-note';
    pqBadge.textContent = i18n.formatTemplate(t('cardChipQueue', '{n} queued'), { n: pqState?.itemCount ?? 0 });
    pane.appendChild(mkSuiteRow(t('convQueueLabel', 'Prompt Queue'), t('convQueueDesc', ''), pqBadge, { searchExtra: 'promptQueue' }));

    const dgState = typeof options.getDraftState === 'function' ? options.getDraftState() : null;
    const dgBadge = doc.createElement('span');
    dgBadge.className = 'ag-sag-badge-note';
    dgBadge.textContent = i18n.formatTemplate(t('convDraftCount', '{n} drafts'), { n: dgState?.savedDraftCount ?? 0 });
    pane.appendChild(mkSuiteRow(t('cfgModDraftGuard', 'Draft Guard'), t('convDraftDesc', ''), dgBadge, { searchExtra: 'draftGuard' }));

    // 6. Prompt Library management (<details>)
    const plDetails = doc.createElement('details');
    plDetails.className = 'ag-sag-details';
    if (uiState.plDetailsOpen || uiState.plStatusText) plDetails.open = true;
    plDetails.addEventListener('toggle', () => {
      uiState.plDetailsOpen = Boolean(plDetails.open);
    });
    const plSum = doc.createElement('summary');
    plSum.textContent = t('convPlAdvSummary', 'Prompt Library Management');
    plDetails.appendChild(plSum);

    const plCtrl = doc.createElement('div');
    plCtrl.className = 'ag-sag-pack-ctrl';
    const plState = typeof options.getPromptLibraryState === 'function' ? options.getPromptLibraryState() : null;

    const plBtnRow = doc.createElement('div');
    plBtnRow.className = 'ag-sag-ext-grid';

    const plCountNote = doc.createElement('span');
    plCountNote.className = 'ag-sag-badge-note';
    plCountNote.textContent = i18n.formatTemplate(t('convPlCountBadge', '{user} custom · {nov} NOV read-only'), {
      user: plState?.userSnippetCount ?? 0,
      nov: plState?.novTemplateCount ?? 0,
    });
    plBtnRow.appendChild(plCountNote);

    if (typeof options.onOpenPromptLibrary === 'function') {
      plBtnRow.appendChild(
        mkChip({
          label: t('convPlOpenBtn', 'Open Palette'),
          active: false,
          testId: 'ag-sag-pl-open-from-settings',
          disabled: !cfg.modules?.promptLibrary,
          onClick: () => options.onOpenPromptLibrary(),
        })
      );
    }

    const plStatus = doc.createElement('div');
    plStatus.className = 'ag-sag-pack-status';
    plStatus.setAttribute('data-testid', 'ag-sag-pl-cfg-status');
    if (uiState.plStatusText) {
      plStatus.textContent = uiState.plStatusText;
      plStatus.setAttribute('data-tone', uiState.plStatusTone || 'info');
    } else {
      plStatus.hidden = true;
    }
    const setPlStatus = (msg, tone = 'ok') => {
      uiState.plStatusText = String(msg || '');
      uiState.plStatusTone = tone;
      const { mountedEl, drawerBodyEl } = getMountedRoots();
      const targets = new Set([
        plStatus,
        mountedEl?.querySelector?.('[data-testid="ag-sag-pl-cfg-status"]'),
        drawerBodyEl?.querySelector?.('[data-testid="ag-sag-pl-cfg-status"]'),
        doc.querySelector?.('[data-testid="ag-sag-pl-cfg-status"]'),
      ]);
      for (const target of targets) {
        if (!target) continue;
        target.textContent = uiState.plStatusText;
        target.setAttribute('data-tone', tone);
        target.hidden = !uiState.plStatusText;
      }
    };

    if (typeof options.onExportPromptSnippets === 'function') {
      plBtnRow.appendChild(
        mkChip({
          label: t('convPlExportBtn', 'Export Snippets JSON'),
          active: false,
          testId: 'ag-sag-pl-export-btn',
          onClick: () => {
            uiState.plDetailsOpen = true;
            const rawJson = options.onExportPromptSnippets();
            let parsed = null;
            try { parsed = JSON.parse(rawJson); } catch {}
            downloadJsonPayload('agy-sag-prompt-snippets.json', parsed || { version: 1, snippets: [] });
            const cnt = Array.isArray(parsed?.snippets) ? parsed.snippets.length : 0;
            setPlStatus(i18n.formatTemplate(t('convPlExportDone', 'Exported ({n})'), { n: cnt }), 'ok');
          },
        })
      );
    }

    const plImpTa = doc.createElement('textarea');
    plImpTa.className = 'ag-sag-pack-textarea';
    plImpTa.setAttribute('data-testid', 'ag-sag-pl-import-textarea');
    plImpTa.setAttribute('spellcheck', 'false');
    plImpTa.placeholder = t('convPlImportPlaceholder', '');
    plImpTa.value = uiState.plImportDraftText;
    plImpTa.addEventListener('input', () => {
      uiState.plImportDraftText = plImpTa.value;
    });

    if (typeof options.onImportPromptSnippets === 'function') {
      plBtnRow.appendChild(
        mkChip({
          label: t('convPlImportBtn', 'Validate & Import Snippets'),
          active: true,
          testId: 'ag-sag-pl-import-btn',
          onClick: () => {
            uiState.plDetailsOpen = true;
            const rawVal = plImpTa.value;
            uiState.plImportDraftText = rawVal;
            const res = options.onImportPromptSnippets(rawVal);
            if (!res || !res.ok) {
              setPlStatus((res?.errors || [t('convPlImportErr', 'Invalid JSON')]).join('; '), 'error');
              return;
            }
            uiState.plImportDraftText = '';
            const { mountedEl, drawerBodyEl } = getMountedRoots();
            for (const liveTa of new Set([
              plImpTa,
              mountedEl?.querySelector?.('[data-testid="ag-sag-pl-import-textarea"]'),
              drawerBodyEl?.querySelector?.('[data-testid="ag-sag-pl-import-textarea"]'),
              doc.querySelector?.('[data-testid="ag-sag-pl-import-textarea"]'),
            ])) {
              if (liveTa) liveTa.value = '';
            }
            setPlStatus(
              i18n.formatTemplate(t('convPlImportOk', 'Imported {count} ({total} total)'), {
                count: res.count ?? 0,
                total: res.total ?? 0,
              }),
              'ok'
            );
          },
        })
      );
    }

    plCtrl.appendChild(plBtnRow);
    plCtrl.appendChild(plImpTa);
    plCtrl.appendChild(plStatus);
    plDetails.appendChild(
      mkSuiteRow(t('modPromptLibrary', 'Prompt Library'), t('modDescPromptLibrary', ''), plCtrl, {
        stacked: true,
        searchExtra: 'promptLibrary snippet template slash import export',
      })
    );
    pane.appendChild(plDetails);

    if (typeof options.onExportSession === 'function') {
      pane.appendChild(
        mkSuiteRow(
          t('convExportChatLabel', 'Export Current Chat'),
          t('convExportChatDesc', 'Download a redacted Markdown copy of this conversation.'),
          mkChip({
            label: t('cardExportMdBtn', 'Export MD'),
            testId: 'ag-sag-conv-export-md-btn',
            onClick: () => options.onExportSession(),
          }),
          { searchExtra: 'export markdown chat archive download' }
        )
      );
    }
  }

  return { renderConversationTab };
});
