// agy-Sag — Settings Hub Tab: Guard & Alerts (UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagSettingsTabGuard = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function renderGuardTab(pane, ctx) {
    const {
      doc,
      i18n,
      options,
      cfg,
      t,
      mkChip,
      mkSuiteRow,
      updateConfig,
      uiState,
      STALL_PRESETS,
    } = ctx;

    // 1. Stall Watchdog timeout presets
    const stallGrid = doc.createElement('div');
    stallGrid.className = 'ag-sag-ext-grid';
    for (const sec of STALL_PRESETS) {
      const b = mkChip({
        label: sec === 'off' ? t('cfgStallOff', 'Off') : `${Math.round(sec / 60)}m`,
        active: cfg.stallThresholdSeconds === sec,
        attr: 'data-ag-sag-stall',
        val: sec,
        onClick: () => updateConfig({ stallThresholdSeconds: sec }),
      });
      b.setAttribute('data-ag-sg-stall', String(sec));
      stallGrid.appendChild(b);
    }
    pane.appendChild(mkSuiteRow(t('cfgStall', 'Stall Alert'), t('guardWatchdogDesc', ''), stallGrid, { searchExtra: 'sessionWatchdog stallThresholdSeconds' }));

    // 2. Sidebar Radar & Blurred OS Notification mode
    const notifyGrid = doc.createElement('div');
    notifyGrid.className = 'ag-sag-ext-grid';
    for (const [nKey, nLbl] of [
      ['off', t('cfgNotifyOff', 'Off')],
      ['awaiting', t('cfgNotifyAwaiting', 'Awaiting Only')],
      ['all', t('cfgNotifyAll', 'Awaiting + Done')],
    ]) {
      const b = mkChip({
        label: nLbl,
        active: cfg.radarNotifyMode === nKey,
        attr: 'data-ag-sg-prism-notify',
        val: nKey,
        onClick: () => updateConfig({ radarNotifyMode: nKey }),
      });
      b.setAttribute('data-ag-sag-notify', nKey);
      notifyGrid.appendChild(b);
    }
    pane.appendChild(mkSuiteRow(t('cfgRadarNotify', 'Background Alerts'), t('guardRadarDesc', ''), notifyGrid, { searchExtra: 'sessionRadar radarNotifyMode' }));

    // 2b. Non-Visual Audio Chime / Local TTS + Quiet Hours
    const audioWrap = doc.createElement('div');
    audioWrap.className = 'ag-sag-pack-ctrl';
    const audioGrid = doc.createElement('div');
    audioGrid.className = 'ag-sag-ext-grid';
    for (const [aKey, aLbl] of [
      ['off', t('guardAudioOff', 'Off')],
      ['chime', t('guardAudioChime', 'Chime')],
      ['tts', t('guardAudioTts', 'Local TTS')],
      ['both', t('guardAudioBoth', 'Chime + TTS')],
    ]) {
      audioGrid.appendChild(
        mkChip({
          label: aLbl,
          active: (cfg.radarAudioMode || 'off') === aKey,
          attr: 'data-ag-sag-audio-mode',
          val: aKey,
          onClick: () => updateConfig({ radarAudioMode: aKey }),
        })
      );
    }
    if (typeof options.onTestRadarAudio === 'function') {
      audioGrid.appendChild(
        mkChip({
          label: t('guardAudioTestBtn', 'Test'),
          active: false,
          testId: 'ag-sag-audio-test-btn',
          onClick: () => options.onTestRadarAudio(),
        })
      );
    }
    audioWrap.appendChild(audioGrid);

    const quietRow = doc.createElement('div');
    quietRow.className = 'ag-sag-ext-grid';
    const quietInp = doc.createElement('input');
    quietInp.type = 'text';
    quietInp.className = 'ag-sag-search-input';
    quietInp.setAttribute('data-testid', 'ag-sag-quiet-hours-input');
    quietInp.placeholder = t('guardQuietPlaceholder', 'e.g. 22:00-08:00');
    quietInp.value = cfg.radarQuietHours || '';
    quietInp.addEventListener('change', () => {
      updateConfig({ radarQuietHours: quietInp.value.trim() });
    });
    quietRow.appendChild(quietInp);
    if (cfg.radarQuietHours) {
      quietRow.appendChild(
        mkChip({
          label: t('guardQuietClear', 'Clear'),
          active: false,
          testId: 'ag-sag-quiet-hours-clear',
          onClick: () => {
            quietInp.value = '';
            updateConfig({ radarQuietHours: '' });
          },
        })
      );
    }
    audioWrap.appendChild(quietRow);
    pane.appendChild(
      mkSuiteRow(t('guardAudioLabel', 'Audio Chime & Local TTS'), t('guardAudioDesc', ''), audioWrap, {
        stacked: true,
        searchExtra: 'radarAudioMode radarQuietHours chime tts audio quiet hours',
      })
    );

    // 3. Safe Auto-Accept Policy + Dry Run + <details> custom allow patterns
    const aaGrid = doc.createElement('div');
    aaGrid.className = 'ag-sag-ext-grid';
    for (const [pol, pLbl] of [
      ['readonly-safe', t('autoAcceptReadonly', 'Read-only Safe')],
      ['dev-flow', t('autoAcceptDevFlow', 'Dev Flow')],
      ['custom', t('cfgFocusCustom', 'Custom')],
    ]) {
      aaGrid.appendChild(
        mkChip({
          label: pLbl,
          active: Boolean(cfg.modules?.safeAutoAccept) && (cfg.autoAcceptPolicy || 'readonly-safe') === pol,
          attr: 'data-ag-sag-aa-policy',
          val: pol,
          risk: 'high',
          onClick: () =>
            updateConfig({
              autoAcceptPolicy: pol,
              modules: { ...cfg.modules, safeAutoAccept: true },
            }),
        })
      );
    }
    aaGrid.appendChild(
      mkChip({
        label: t('autoAcceptDryRun', 'Dry Run'),
        active: Boolean(cfg.autoAcceptDryRun),
        attr: 'data-ag-sag-aa-dryrun',
        val: '1',
        onClick: () => updateConfig({ autoAcceptDryRun: !cfg.autoAcceptDryRun }),
      })
    );
    pane.appendChild(
      mkSuiteRow(
        t('autoAcceptLabel', 'Safe Auto-Accept Policy'),
        cfg.modules?.safeAutoAccept ? t('autoAcceptDesc', '') : t('autoAcceptOffHint', ''),
        aaGrid,
        { searchExtra: 'safeAutoAccept autoAcceptPolicy dryRun' }
      )
    );

    const aaAdv = doc.createElement('details');
    aaAdv.className = 'ag-sag-details';
    aaAdv.setAttribute('data-testid', 'ag-sag-adv-aa');
    if (cfg.autoAcceptPolicy === 'custom' || uiState.customPatternsStatusText) aaAdv.open = true;
    const aaSum = doc.createElement('summary');
    aaSum.textContent = t('guardAutoAcceptAdvSummary', 'Custom Allow Rules');
    aaAdv.appendChild(aaSum);

    const aaWrap = doc.createElement('div');
    aaWrap.className = 'ag-sag-pack-ctrl';
    const aaTa = doc.createElement('textarea');
    aaTa.className = 'ag-sag-pack-textarea';
    aaTa.setAttribute('data-testid', 'ag-sag-aa-custom-textarea');
    aaTa.setAttribute('spellcheck', 'false');
    aaTa.value =
      uiState.customPatternsDraftText !== null
        ? uiState.customPatternsDraftText
        : Array.isArray(cfg.autoAcceptCustomPatterns)
          ? cfg.autoAcceptCustomPatterns.join('\n')
          : '';
    aaTa.addEventListener('input', () => {
      uiState.customPatternsDraftText = aaTa.value;
    });
    const aaBtns = doc.createElement('div');
    aaBtns.className = 'ag-sag-ext-grid';
    aaBtns.appendChild(
      mkChip({
        label: t('guardAutoAcceptCustomApply', 'Save Rules'),
        active: true,
        testId: 'ag-sag-aa-custom-apply',
        onClick: () => {
          const lines = aaTa.value
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 30);
          uiState.customPatternsDraftText = lines.join('\n');
          uiState.customPatternsStatusText = i18n.formatTemplate(t('guardAutoAcceptCustomSaved', 'Saved {n}'), { n: lines.length });
          updateConfig({ autoAcceptCustomPatterns: lines });
        },
      })
    );
    if (uiState.customPatternsStatusText) {
      const note = doc.createElement('span');
      note.className = 'ag-sag-badge-note';
      note.textContent = uiState.customPatternsStatusText;
      aaBtns.appendChild(note);
    }
    aaWrap.appendChild(aaTa);
    aaWrap.appendChild(aaBtns);
    aaAdv.appendChild(mkSuiteRow(t('guardAutoAcceptCustomLabel', 'Custom Allow Regex'), '', aaWrap, { stacked: true, searchExtra: 'autoAcceptCustomPatterns' }));
    pane.appendChild(aaAdv);

    // 4. Quota Pulse summary + <details> soft thresholds
    const qCtrl = doc.createElement('div');
    qCtrl.className = 'ag-sag-ext-grid';
    if (typeof options.getQuotaSummary === 'function' && cfg.modules?.quotaPulse) {
      const qs = options.getQuotaSummary();
      const badge = doc.createElement('span');
      badge.className = 'ag-sag-badge-note';
      badge.setAttribute('data-testid', 'ag-sag-quota-summary');
      const h = qs?.health || 'ok';
      badge.textContent =
        h === 'danger' || h === 'rate-limited'
          ? t('cardQuotaLow', 'Low Quota')
          : h === 'warn'
            ? t('cardQuotaTight', 'Running Low')
            : t('cardQuotaHealthy', 'Healthy');
      qCtrl.appendChild(badge);
    }
    pane.appendChild(
      mkSuiteRow(t('quotaLabel', 'Quota Pulse'), cfg.modules?.quotaPulse ? t('quotaDesc', '') : t('quotaOffHint', ''), qCtrl, {
        searchExtra: 'quotaPulse 5h 7d',
      })
    );

    const qAdv = doc.createElement('details');
    qAdv.className = 'ag-sag-details';
    qAdv.setAttribute('data-testid', 'ag-sag-adv-quota');
    const qSum = doc.createElement('summary');
    qSum.textContent = t('guardQuotaAdvSummary', 'Quota Soft Thresholds');
    qAdv.appendChild(qSum);
    const qBody = doc.createElement('div');
    qBody.className = 'ag-sag-details-body';

    const mkNumCtrl = (val, min, max, testId, onSave) => {
      const inp = doc.createElement('input');
      inp.type = 'number';
      inp.min = String(min);
      inp.max = String(max);
      inp.className = 'ag-sag-select';
      inp.setAttribute('data-testid', testId);
      inp.value = String(val);
      inp.addEventListener('change', () => {
        const n = Number(inp.value);
        if (Number.isFinite(n)) onSave(n);
      });
      return inp;
    };
    qBody.appendChild(
      mkSuiteRow(
        t('guardQuota5hLabel', '5h Turn Budget'),
        '',
        mkNumCtrl(cfg.quotaSoftTurns5h || 60, 10, 500, 'ag-sag-quota-5h-input', (n) => updateConfig({ quotaSoftTurns5h: n })),
        { searchExtra: 'quotaSoftTurns5h' }
      )
    );
    qBody.appendChild(
      mkSuiteRow(
        t('guardQuota7dLabel', '7d Turn Budget'),
        '',
        mkNumCtrl(cfg.quotaSoftTurns7d || 350, 30, 5000, 'ag-sag-quota-7d-input', (n) => updateConfig({ quotaSoftTurns7d: n })),
        { searchExtra: 'quotaSoftTurns7d' }
      )
    );
    qAdv.appendChild(qBody);
    pane.appendChild(qAdv);
  }

  return { renderGuardTab };
});
