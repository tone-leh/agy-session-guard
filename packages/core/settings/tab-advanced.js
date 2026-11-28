// agy-Sag — Settings Hub Tab: Advanced, Diagnostics & Storage Audit (UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagSettingsTabAdvanced = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function renderAdvancedTab(pane, ctx) {
    const {
      doc,
      win,
      coexist,
      i18n,
      options,
      cfg,
      t,
      mkChip,
      mkSuiteRow,
      novConnected,
      novState,
      enabledModuleCount,
      totalModuleCount,
      updateConfig,
      refreshAllViews,
      downloadJsonPayload,
      formatStorageBytes,
      getMountedRoots,
      isDestroyed,
      uiState,
    } = ctx;

    const cfgStatusEl = doc.createElement('div');
    cfgStatusEl.className = 'ag-sag-pack-status';
    cfgStatusEl.setAttribute('data-testid', 'ag-sag-cfg-status');
    if (uiState.cfgStatusText) {
      cfgStatusEl.textContent = uiState.cfgStatusText;
      cfgStatusEl.setAttribute('data-tone', uiState.cfgStatusTone || 'info');
    } else {
      cfgStatusEl.hidden = true;
    }

    const setCfgStatus = (msg, tone = 'ok') => {
      uiState.cfgStatusText = String(msg || '');
      uiState.cfgStatusTone = tone;
      const { mountedEl, drawerBodyEl } = getMountedRoots();
      const targets = new Set([
        cfgStatusEl,
        mountedEl?.querySelector?.('[data-testid="ag-sag-cfg-status"]'),
        drawerBodyEl?.querySelector?.('[data-testid="ag-sag-cfg-status"]'),
        doc.querySelector?.('[data-testid="ag-sag-cfg-status"]'),
      ]);
      for (const target of targets) {
        if (!target) continue;
        target.textContent = uiState.cfgStatusText;
        target.setAttribute('data-tone', tone);
        target.hidden = !uiState.cfgStatusText;
      }
    };

    // 1. Export full config JSON
    pane.appendChild(
      mkSuiteRow(
        t('advExportLabel', 'Export Config'),
        t('advExportDesc', ''),
        mkChip({
          label: t('advExportBtn', 'Export JSON'),
          active: false,
          testId: 'ag-sag-cfg-export-btn',
          onClick: () => {
            downloadJsonPayload('agy-sag-config.json', cfg);
            setCfgStatus(t('advExportDone', 'Exported'), 'ok');
          },
        }),
        { searchExtra: 'export config json' }
      )
    );

    // 2. Import & sanitize config JSON
    const impWrap = doc.createElement('div');
    impWrap.className = 'ag-sag-pack-ctrl';
    const impTa = doc.createElement('textarea');
    impTa.className = 'ag-sag-pack-textarea';
    impTa.setAttribute('data-testid', 'ag-sag-cfg-import-textarea');
    impTa.setAttribute('spellcheck', 'false');
    impTa.placeholder = t('advImportPlaceholder', '');
    impTa.value = uiState.cfgImportDraftText;
    impTa.addEventListener('input', () => {
      uiState.cfgImportDraftText = impTa.value;
    });
    const impBtns = doc.createElement('div');
    impBtns.className = 'ag-sag-ext-grid';
    impBtns.appendChild(
      mkChip({
        label: t('advImportApplyBtn', 'Validate & Import'),
        active: true,
        testId: 'ag-sag-cfg-import-btn',
        onClick: () => {
          const raw = impTa.value.trim();
          uiState.cfgImportDraftText = impTa.value;
          try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('Must be a JSON object');
            }
            const cleaned = coexist.sanitizeConfig(parsed, coexist.DEFAULT_CONFIG);
            updateConfig(cleaned);
            setCfgStatus(t('advImportOk', 'Imported'), 'ok');
          } catch {
            setCfgStatus(t('advImportErr', 'Invalid JSON'), 'error');
          }
        },
      })
    );
    impWrap.appendChild(impTa);
    impWrap.appendChild(impBtns);
    pane.appendChild(mkSuiteRow(t('advImportLabel', 'Import Config'), t('advImportDesc', ''), impWrap, { stacked: true, searchExtra: 'import config json' }));

    // 3. Inline 2-step Reset to Defaults (zero window.confirm)
    const resetCtrl = doc.createElement('div');
    resetCtrl.className = 'ag-sag-ext-grid';
    if (!uiState.resetConfirmPending) {
      resetCtrl.appendChild(
        mkChip({
          label: t('advResetBtn', 'Reset Defaults'),
          active: false,
          risk: 'high',
          testId: 'ag-sag-reset-btn',
          onClick: () => {
            uiState.resetConfirmPending = true;
            refreshAllViews();
          },
        })
      );
    } else {
      resetCtrl.appendChild(
        mkChip({
          label: t('advResetConfirmBtn', 'Confirm Reset?'),
          active: true,
          risk: 'high',
          testId: 'ag-sag-reset-confirm',
          onClick: () => {
            uiState.resetConfirmPending = false;
            uiState.customCssDraftText = null;
            uiState.customCssStatusText = '';
            uiState.customPatternsDraftText = null;
            uiState.customPatternsStatusText = '';
            uiState.cfgImportDraftText = '';
            uiState.plImportDraftText = '';
            uiState.plStatusText = '';
            uiState.diagCopiedFeedback = false;
            uiState.cfgStatusText = t('advResetDone', 'Restored defaults');
            uiState.cfgStatusTone = 'ok';
            const def = coexist.DEFAULT_CONFIG;
            updateConfig({ ...def, modules: { ...def.modules } });
          },
        })
      );
      resetCtrl.appendChild(
        mkChip({
          label: t('advResetCancelBtn', 'Cancel'),
          active: false,
          testId: 'ag-sag-reset-cancel',
          onClick: () => {
            uiState.resetConfirmPending = false;
            refreshAllViews();
          },
        })
      );
    }
    pane.appendChild(mkSuiteRow(t('advResetLabel', 'Reset to Defaults'), t('advResetDesc', ''), resetCtrl, { searchExtra: 'reset default' }));
    pane.appendChild(cfgStatusEl);

    // 4. Diagnostics summary
    const { drawerOpen, mountedMode } = getMountedRoots();
    const diagObj = {
      mountedMode: drawerOpen ? 'drawer' : mountedMode,
      locale: cfg.hostI18nLocale || 'auto',
      enabledModules: `${enabledModuleCount}/${totalModuleCount}`,
      hostI18n: typeof options.getHostI18nState === 'function' ? options.getHostI18nState() : null,
      novConnected,
      novPreset: novState?.config?.preset || null,
    };
    const diagWrap = doc.createElement('div');
    diagWrap.className = 'ag-sag-pack-ctrl';
    const diagBtns = doc.createElement('div');
    diagBtns.className = 'ag-sag-ext-grid';
    diagBtns.appendChild(
      mkChip({
        label: uiState.diagCopiedFeedback ? t('advDiagCopied', 'Copied') : t('advDiagCopyBtn', 'Copy Diagnostics'),
        active: false,
        testId: 'ag-sag-diag-copy-btn',
        onClick: () => {
          const text = JSON.stringify(diagObj, null, 2);
          try {
            if (typeof options.onCopyText === 'function') options.onCopyText(text);
            else if (win?.navigator?.clipboard?.writeText) void win.navigator.clipboard.writeText(text).catch(() => {});
          } catch {}
          uiState.diagCopiedFeedback = true;
          refreshAllViews();
        },
      })
    );
    const diagDetails = doc.createElement('details');
    diagDetails.className = 'ag-sag-details';
    const diagSum = doc.createElement('summary');
    const locLabel = !cfg.hostI18nLocale || cfg.hostI18nLocale === 'auto' ? t('hostI18nAuto', 'Auto Detect') : cfg.hostI18nLocale;
    const modeLabel = drawerOpen
      ? t('advDiagModeDrawer', 'Drawer')
      : mountedMode === 'prism'
        ? t('advDiagModePrism', 'Embedded')
        : mountedMode === 'native'
          ? t('advDiagModeNative', 'Settings Panel')
          : t('advDiagModeNone', 'Background');
    diagSum.textContent = `${locLabel} · ${modeLabel}`;
    const diagPre = doc.createElement('pre');
    diagPre.className = 'ag-sag-pack-textarea';
    diagPre.setAttribute('data-testid', 'ag-sag-diag-pre');
    diagPre.textContent = JSON.stringify(diagObj, null, 2);
    diagDetails.appendChild(diagSum);
    diagDetails.appendChild(diagPre);
    diagWrap.appendChild(diagBtns);
    diagWrap.appendChild(diagDetails);
    pane.appendChild(mkSuiteRow(t('advDiagLabel', 'Diagnostics'), t('advDiagDesc', ''), diagWrap, { stacked: true, searchExtra: 'diagnostics debug' }));

    // 5. Read-Only Local Storage Audit (zero-port Watch Bridge -> storage-doctor)
    const stWrap = doc.createElement('div');
    stWrap.className = 'ag-sag-pack-ctrl';
    stWrap.setAttribute('data-testid', 'ag-sag-storage-box');
    const stBtns = doc.createElement('div');
    stBtns.className = 'ag-sag-ext-grid';
    stBtns.appendChild(
      mkChip({
        label: uiState.storageAuditState?.status === 'loading' ? t('advStorageScanning', 'Scanning…') : t('advStorageAuditBtn', 'Audit Storage'),
        active: uiState.storageAuditState?.status === 'ok',
        disabled: uiState.storageAuditState?.status === 'loading',
        testId: 'ag-sag-storage-audit-btn',
        onClick: () => {
          if (typeof options.onRequestStorageAudit !== 'function') {
            uiState.storageAuditState = { status: 'offline', data: null, message: t('advStorageOffline', '') };
            refreshAllViews();
            return;
          }
          uiState.storageAuditState = { status: 'loading', data: uiState.storageAuditState?.data || null, message: '' };
          refreshAllViews();
          Promise.resolve(options.onRequestStorageAudit())
            .then((res) => {
              if (isDestroyed()) return;
              if (res?.ok && res.data) {
                uiState.storageAuditState = { status: 'ok', data: res.data, message: '' };
              } else if (res?.reason === 'bridge-offline') {
                uiState.storageAuditState = { status: 'offline', data: null, message: t('advStorageOffline', '') };
              } else {
                uiState.storageAuditState = { status: 'error', data: null, message: res?.error || t('advStorageOffline', '') };
              }
              refreshAllViews();
            })
            .catch(() => {
              if (isDestroyed()) return;
              uiState.storageAuditState = { status: 'error', data: null, message: t('advStorageOffline', '') };
              refreshAllViews();
            });
        },
      })
    );
    const backupCliCmd = 'node cli/sag-cli.mjs storage backup --out=./agy-backup --dry-run';
    stBtns.appendChild(
      mkChip({
        label: uiState.storageCmdCopied ? t('advStorageCopiedCmd', 'CLI Copied') : t('advStorageCopyCmdBtn', 'Copy Backup CLI'),
        active: false,
        testId: 'ag-sag-storage-copy-cmd',
        onClick: () => {
          try {
            if (typeof options.onCopyText === 'function') options.onCopyText(backupCliCmd);
            else if (win?.navigator?.clipboard?.writeText) void win.navigator.clipboard.writeText(backupCliCmd).catch(() => {});
          } catch {}
          uiState.storageCmdCopied = true;
          refreshAllViews();
        },
      })
    );
    stWrap.appendChild(stBtns);

    const stNote = doc.createElement('div');
    stNote.className = 'ag-sag-badge-note';
    stNote.setAttribute('data-testid', 'ag-sag-storage-summary');
    if (uiState.storageAuditState?.status === 'ok' && uiState.storageAuditState.data) {
      const d = uiState.storageAuditState.data;
      stNote.textContent = i18n.formatTemplate(
        t('advStorageSummary', 'Total {total} ({files} files) · {sessions} sessions · {convs} chats · DB {wal} · {orphans} leftover'),
        {
          total: formatStorageBytes(d.totalBytes),
          files: d.totalFiles ?? 0,
          sessions: d.brainSessionCount ?? 0,
          convs: d.conversationCount ?? 0,
          wal: d.walActive ? t('advStorageWalActive', 'In Use') : t('advStorageWalSafe', 'Idle'),
          orphans: d.orphanCount ?? 0,
        }
      );
    } else if (uiState.storageAuditState?.message) {
      stNote.textContent = uiState.storageAuditState.message;
    } else {
      stNote.textContent = t('advStorageIdleHint', 'Click "Audit Storage" to inspect local cache usage (read-only)');
    }
    stWrap.appendChild(stNote);
    pane.appendChild(
      mkSuiteRow(t('advStorageLabel', 'Local Storage Audit (Read-Only)'), t('advStorageDesc', ''), stWrap, {
        stacked: true,
        searchExtra: 'storage doctor audit backup wal sqlite brain disk',
      })
    );
  }

  return { renderAdvancedTab };
});
