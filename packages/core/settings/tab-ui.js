// agy-Sag — Settings Hub Tab: UI & Theme Studio (UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagSettingsTabUi = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function renderUiTab(pane, ctx) {
    const {
      doc,
      win,
      coexist,
      i18n,
      options,
      cfg,
      t,
      mkChip,
      mkSwitch,
      mkSuiteRow,
      updateConfig,
      resolveDep,
      downloadJsonPayload,
      getMountedRoots,
      uiState,
    } = ctx;

    // 1. Native UI Language selector + conflict arbitration (NO module master switch)
    const langCtrl = doc.createElement('div');
    langCtrl.className = 'ag-sag-ext-grid';
    const sel = doc.createElement('select');
    sel.className = 'ag-sag-select';
    sel.setAttribute('data-testid', 'ag-sag-host-locale-select');
    const localeOpts = [
      ['auto', t('hostI18nAuto', 'Auto Detect')],
      ['en', t('hostI18nOrig', 'English')],
      ['zh-CN', '简体中文 (zh-CN)'],
      ['zh-TW', '繁體中文 (zh-TW)'],
      ['ja', '日本語 (ja)'],
      ['ko', '한국어 (ko)'],
      ['es', 'Español (es)'],
      ['fr', 'Français (fr)'],
      ['de', 'Deutsch (de)'],
      ['ru', 'Русский (ru)'],
      ['pt-BR', 'Português (pt-BR)'],
    ];
    for (const [code, label] of localeOpts) {
      const opt = doc.createElement('option');
      opt.value = code;
      opt.textContent = label;
      if ((cfg.hostI18nLocale || 'auto') === code) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.value = cfg.hostI18nLocale || 'auto';
    sel.addEventListener('change', (ev) => {
      const nextLoc = ev?.target?.value || sel.value || 'auto';
      updateConfig({
        hostI18nLocale: nextLoc,
        modules: { ...cfg.modules, hostI18n: nextLoc !== 'en' },
      });
    });
    langCtrl.appendChild(sel);
    langCtrl.appendChild(
      mkChip({
        label: cfg.hostI18nConflictPolicy === 'takeover' ? t('conflictTakeover', 'Takeover') : t('conflictYield', 'Auto Yield'),
        active: cfg.hostI18nConflictPolicy === 'takeover',
        attr: 'data-ag-sag-i18n-policy',
        val: cfg.hostI18nConflictPolicy || 'yield',
        onClick: () =>
          updateConfig({
            hostI18nConflictPolicy: cfg.hostI18nConflictPolicy === 'takeover' ? 'yield' : 'takeover',
          }),
      })
    );
    pane.appendChild(mkSuiteRow(t('hostI18nLabel', 'Native UI Translation'), t('hostI18nDesc', ''), langCtrl, { searchExtra: 'hostI18n locale language' }));

    // 2. One-Click Visual Atmosphere Looks (8 curated combinations) + Auto Dark/Light Pairing
    const themeStudioMod = resolveDep('__agSagThemeStudio', './theme-studio.js');
    const themeOn = Boolean(cfg.modules?.themeStudio);
    const hostScheme = themeStudioMod?.detectHostColorScheme ? themeStudioMod.detectHostColorScheme(doc, win) : 'dark';
    const resolvedSpec = themeStudioMod?.resolveEffectivePreset
      ? themeStudioMod.resolveEffectivePreset(cfg.themePreset || 'native', Boolean(cfg.themeAutoPair), hostScheme)
      : null;
    const lookRow = doc.createElement('div');
    lookRow.className = 'ag-sag-look-row';
    const lookDefs = [
      ['prism-obsidian', t('lookPrismObsidian', 'Obsidian Optics'), ['#0b0b0e', '#669df6']],
      ['claude-warm', t('lookClaudeWarm', 'Warm Study'), ['#141413', '#d97757']],
      ['daylight-studio', t('lookDaylightStudio', 'Daylight Crystal'), ['#f4f7fb', '#2563eb']],
      ['matcha-note', t('lookMatchaNote', 'Matcha Journal'), ['#f6f8f3', '#437352']],
      ['phantom-pop', t('lookPhantomPop', 'Phantom Pop'), ['#101014', '#e11d48']],
      ['doodle-ink', t('lookDoodleInk', 'Doodle Ink'), ['#fdfcf7', '#d43544']],
      ['pixel-geek', t('lookPixelGeek', 'Pixel Geek'), ['#0e1117', '#38f28b']],
      ['aurora-liquid', t('lookAuroraLiquid', 'Aurora Liquid'), ['#0b1120', '#70d6ff']],
    ];
    for (const [lid, lLbl, dots] of lookDefs) {
      const patch = themeStudioMod?.resolveLookPresetPatch ? themeStudioMod.resolveLookPresetPatch(lid) : null;
      const isLookMatch = themeStudioMod?.matchesLookPreset ? themeStudioMod.matchesLookPreset(cfg, lid) : false;
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-sag-look-chip';
      btn.setAttribute('data-ag-sag-look', lid);
      btn.setAttribute('aria-pressed', String(isLookMatch));
      const dotWrap = doc.createElement('span');
      dotWrap.className = 'ag-sag-swatch-dots';
      for (const color of dots) {
        const d = doc.createElement('span');
        d.className = 'ag-sag-swatch-dot';
        if (d.style) d.style.background = color;
        dotWrap.appendChild(d);
      }
      const lbl = doc.createElement('span');
      lbl.textContent = lLbl;
      btn.appendChild(dotWrap);
      btn.appendChild(lbl);
      btn.addEventListener('click', () => {
        if (!patch) return;
        updateConfig({
          ...patch,
          modules: { ...cfg.modules, themeStudio: true },
        });
      });
      lookRow.appendChild(btn);
    }
    lookRow.appendChild(
      mkChip({
        label: t('themeAutoPairLabel', 'Auto Dark/Light Pairing'),
        active: themeOn && Boolean(cfg.themeAutoPair),
        attr: 'data-ag-sag-theme-autopair',
        val: cfg.themeAutoPair ? '1' : '0',
        onClick: () =>
          updateConfig({
            themeAutoPair: !cfg.themeAutoPair,
            modules: { ...cfg.modules, themeStudio: true },
          }),
      })
    );
    pane.appendChild(
      mkSuiteRow(t('themeLookLabel', 'One-Click Visual Looks'), t('themeLookDesc', ''), lookRow, {
        stacked: true,
        searchExtra: 'look preset obsidian matcha phantom doodle pixel aurora autoPair',
      })
    );

    // 3. Visual Theme Swatch Gallery (Standalone Restore Native + 15 grouped dark / light / stylized skins)
    const gallery = doc.createElement('div');
    gallery.className = 'ag-sag-theme-gallery';
    const themeLabels = {
      native: t('themeNative', 'Native'),
      'obsidian-prism': t('themeObsidianPrism', 'Obsidian Dark'),
      'warm-basalt': t('themeWarmBasalt', 'Warm Basalt'),
      'midnight-ink': t('themeMidnight', 'Midnight Ink'),
      'nord-frost': t('themeNord', 'Nord Frost'),
      'oled-pure': t('themeOled', 'OLED Pure'),
      'tokyo-night': t('themeTokyoNight', 'Tokyo Night'),
      'catppuccin-mocha': t('themeCatppuccin', 'Catppuccin Mocha'),
      'crystal-day': t('themeCrystalDay', 'Crystal Day'),
      'warm-paper': t('themeWarmPaper', 'Warm Paper'),
      'rose-dawn': t('themeRoseDawn', 'Rosé Dawn'),
      'matcha-journal': t('themeMatchaJournal', 'Matcha Journal'),
      'phantom-crimson': t('themePhantomCrimson', 'Phantom Crimson'),
      'doodle-sketch': t('themeDoodleSketch', 'Doodle Sketch'),
      'pixel-terminal': t('themePixelTerminal', 'Pixel Terminal'),
      'aurora-glass': t('themeAuroraGlass', 'Aurora Glass'),
    };
    const themePresetMap = themeStudioMod?.THEME_PRESETS || {};

    const galleryBar = doc.createElement('div');
    galleryBar.className = 'ag-sag-gallery-bar';
    galleryBar.appendChild(
      mkChip({
        label: t('themeNativeRestore', 'Restore Host Native'),
        active: !themeOn || (cfg.themePreset || 'native') === 'native',
        attr: 'data-ag-sag-theme',
        val: 'native',
        onClick: () =>
          updateConfig({
            themePreset: 'native',
            themeAutoPair: false,
            themeAccent: 'follow',
            modules: { ...cfg.modules, themeStudio: Boolean(cfg.modules?.themeStudio) },
          }),
      })
    );
    if (themeOn && cfg.themeAutoPair && resolvedSpec && resolvedSpec.id && resolvedSpec.id !== (cfg.themePreset || 'native')) {
      const pairHint = doc.createElement('span');
      pairHint.className = 'ag-sag-pair-hint';
      pairHint.setAttribute('data-testid', 'ag-sag-pair-hint');
      const resolvedName = themeLabels[resolvedSpec.id] || resolvedSpec.id;
      pairHint.textContent = t('themePairActiveHint', 'Auto-pair active: showing {name}').replace('{name}', resolvedName);
      galleryBar.appendChild(pairHint);
    }
    gallery.appendChild(galleryBar);

    const gallerySections = [
      [t('themeGroupDark', 'Classic Dark'), ['obsidian-prism', 'warm-basalt', 'midnight-ink', 'nord-frost', 'oled-pure', 'tokyo-night', 'catppuccin-mocha']],
      [t('themeGroupLight', 'Classic Light'), ['crystal-day', 'warm-paper', 'rose-dawn']],
      [t('themeGroupStyle', 'Stylized Aesthetics'), ['matcha-journal', 'phantom-crimson', 'doodle-sketch', 'pixel-terminal', 'aurora-glass']],
    ];
    for (const [grpTitle, ids] of gallerySections) {
      const gLbl = doc.createElement('div');
      gLbl.className = 'ag-sag-theme-group-label';
      gLbl.textContent = grpTitle;
      gallery.appendChild(gLbl);
      const grid = doc.createElement('div');
      grid.className = 'ag-sag-swatch-grid';
      for (const tid of ids) {
        const spec = themePresetMap[tid];
        const swatches = spec?.swatches || ['#18181b', '#27272a', '#38bdf8'];
        const card = doc.createElement('button');
        card.type = 'button';
        card.className = 'ag-sag-swatch-card';
        card.setAttribute('data-ag-sag-theme', tid);
        card.setAttribute('aria-pressed', String(themeOn && (cfg.themePreset || 'native') === tid));
        const dots = doc.createElement('span');
        dots.className = 'ag-sag-swatch-dots';
        for (const hex of swatches) {
          const dot = doc.createElement('span');
          dot.className = 'ag-sag-swatch-dot';
          if (dot.style) dot.style.background = hex;
          dots.appendChild(dot);
        }
        const nameEl = doc.createElement('span');
        nameEl.className = 'ag-sag-swatch-name';
        nameEl.textContent = themeLabels[tid] || tid;
        card.appendChild(dots);
        card.appendChild(nameEl);
        card.addEventListener('click', () => {
          const patch = {
            themePreset: tid,
            modules: { ...cfg.modules, themeStudio: true },
          };
          if (spec?.colorScheme && spec.colorScheme !== hostScheme && cfg.themeAutoPair) {
            patch.themeAutoPair = false;
          }
          updateConfig(patch);
        });
        grid.appendChild(card);
      }
      gallery.appendChild(grid);
    }
    pane.appendChild(
      mkSuiteRow(t('themeLabel', 'Optical Theme & Aesthetic Skins'), t('themeDesc', ''), gallery, {
        stacked: true,
        searchExtra: 'theme skin palette obsidian warm midnight nord oled tokyo catppuccin crystal paper matcha phantom doodle pixel aurora',
      })
    );

    // 4. Accent Tone Override (7 options with color dots)
    const accRow = doc.createElement('div');
    accRow.className = 'ag-sag-ext-grid';
    for (const [aid, aLbl, hex] of [
      ['follow', t('accentFollow', 'Theme Default'), null],
      ['cobalt', t('accentCobalt', 'Cobalt'), '#3b82f6'],
      ['iris', t('accentIris', 'Iris'), '#8b5cf6'],
      ['amber', t('accentAmber', 'Amber'), '#f59e0b'],
      ['emerald', t('accentEmerald', 'Emerald'), '#10b981'],
      ['rose', t('accentRose', 'Rose'), '#f43f5e'],
      ['mono', t('accentMono', 'Titanium Mono'), '#94a3b8'],
    ]) {
      const chip = mkChip({
        label: aLbl,
        active: themeOn && (cfg.themeAccent || 'follow') === aid,
        attr: 'data-ag-sag-theme-accent',
        val: aid,
        onClick: () =>
          updateConfig({
            themeAccent: aid,
            modules: { ...cfg.modules, themeStudio: true },
          }),
      });
      if (hex) {
        const dot = doc.createElement('span');
        dot.className = 'ag-sag-accent-dot';
        if (dot.style) dot.style.background = hex;
        chip.insertBefore ? chip.insertBefore(dot, chip.firstChild) : chip.appendChild(dot);
      }
      accRow.appendChild(chip);
    }
    pane.appendChild(
      mkSuiteRow(t('themeAccentLabel', 'Accent Tone Override'), t('themeAccentDesc', ''), accRow, {
        stacked: true,
        searchExtra: 'themeAccent accent cobalt iris amber emerald rose mono',
      })
    );

    const mkLabeledSubRow = (subTitle, chips) => {
      const wrap = doc.createElement('div');
      wrap.className = 'ag-sag-subrow';
      const lbl = doc.createElement('span');
      lbl.className = 'ag-sag-subrow-label';
      lbl.textContent = subTitle;
      const grid = doc.createElement('div');
      grid.className = 'ag-sag-ext-grid';
      for (const c of chips) grid.appendChild(c);
      wrap.appendChild(lbl);
      wrap.appendChild(grid);
      return wrap;
    };

    // 5. Surface Material, Corners & Density
    const surfWrap = doc.createElement('div');
    surfWrap.className = 'ag-sag-theme-gallery';
    surfWrap.appendChild(
      mkLabeledSubRow(
        t('themeSubSurface', 'Surface'),
        [
          ['clean', t('surfaceClean', 'Clean Native')],
          ['smoked', t('surfaceSmoked', 'Smoked Facets')],
          ['paper', t('surfacePaper', 'Paper & Ink')],
          ['glass', t('surfaceGlass', 'Aurora Glass')],
        ].map(([sid, sLbl]) =>
          mkChip({
            label: sLbl,
            active: themeOn && (cfg.themeSurface || 'smoked') === sid,
            attr: 'data-ag-sag-theme-surface',
            val: sid,
            onClick: () =>
              updateConfig({
                themeSurface: sid,
                modules: { ...cfg.modules, themeStudio: true },
              }),
          })
        )
      )
    );
    surfWrap.appendChild(
      mkLabeledSubRow(
        t('themeSubCorners', 'Corners'),
        [
          ['sharp', t('cornerSharp', 'Sharp')],
          ['balanced', t('cornerBalanced', 'Balanced')],
          ['soft', t('cornerSoft', 'Soft')],
          ['pill', t('cornerPill', 'Pill')],
        ].map(([cid, cLbl]) =>
          mkChip({
            label: cLbl,
            active: themeOn && (cfg.themeCorners || 'balanced') === cid,
            attr: 'data-ag-sag-theme-corners',
            val: cid,
            onClick: () =>
              updateConfig({
                themeCorners: cid,
                modules: { ...cfg.modules, themeStudio: true },
              }),
          })
        )
      )
    );
    surfWrap.appendChild(
      mkLabeledSubRow(
        t('themeSubDensity', 'Density'),
        [
          ['compact', t('densityCompact', 'Compact')],
          ['balanced', t('densityBalanced', 'Balanced')],
          ['comfortable', t('densityComfortable', 'Comfortable')],
        ].map(([did, dLbl]) =>
          mkChip({
            label: dLbl,
            active: themeOn && (cfg.themeDensity || 'balanced') === did,
            attr: 'data-ag-sag-theme-density',
            val: did,
            onClick: () =>
              updateConfig({
                themeDensity: did,
                modules: { ...cfg.modules, themeStudio: true },
              }),
          })
        )
      )
    );
    pane.appendChild(
      mkSuiteRow(t('themeSurfaceLabel', 'Surface Material, Corners & Density'), t('themeSurfaceDesc', ''), surfWrap, {
        stacked: true,
        searchExtra: 'themeSurface smoked paper glass themeCorners sharp balanced soft pill themeDensity',
      })
    );

    // 6. Code Font, Reading Motion Toggles & 0fps Horizon Glow
    const fmWrap = doc.createElement('div');
    fmWrap.className = 'ag-sag-theme-gallery';
    fmWrap.appendChild(
      mkLabeledSubRow(
        t('themeSubCodeFont', 'Code Font'),
        [
          ['default', t('codeFontDefault', 'Default Mono')],
          ['jetbrains', t('codeFontJetbrains', 'JetBrains')],
          ['cascadia', t('codeFontCascadia', 'Cascadia')],
          ['fira', t('codeFontFira', 'Fira Code')],
          ['sfmono', t('codeFontSfmono', 'SF Mono')],
          ['sarasa', t('codeFontSarasa', 'Sarasa SC')],
        ].map(([fid, fLbl]) =>
          mkChip({
            label: fLbl,
            active: themeOn && (cfg.themeCodeFont || 'default') === fid,
            attr: 'data-ag-sag-theme-code-font',
            val: fid,
            onClick: () =>
              updateConfig({
                themeCodeFont: fid,
                modules: { ...cfg.modules, themeStudio: true },
              }),
          })
        )
      )
    );
    fmWrap.appendChild(
      mkLabeledSubRow(t('themeSubMotion', 'Motion Toggles'), [
        mkChip({
          label: t('themeLigatures', 'Ligatures'),
          active: themeOn && Boolean(cfg.themeCodeLigatures),
          attr: 'data-ag-sag-theme-ligatures',
          val: cfg.themeCodeLigatures ? '1' : '0',
          onClick: () =>
            updateConfig({
              themeCodeLigatures: !cfg.themeCodeLigatures,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
        mkChip({
          label: t('themeStreamFade', 'Velvet Stream Fade'),
          active: themeOn && cfg.themeStreamFade !== false,
          attr: 'data-ag-sag-theme-stream-fade',
          val: cfg.themeStreamFade !== false ? '1' : '0',
          onClick: () =>
            updateConfig({
              themeStreamFade: cfg.themeStreamFade === false,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
        mkChip({
          label: t('themeSmoothCaret', 'Smooth Caret'),
          active: themeOn && cfg.themeSmoothCaret !== false,
          attr: 'data-ag-sag-theme-smooth-caret',
          val: cfg.themeSmoothCaret !== false ? '1' : '0',
          onClick: () =>
            updateConfig({
              themeSmoothCaret: cfg.themeSmoothCaret === false,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
      ])
    );
    fmWrap.appendChild(
      mkLabeledSubRow(
        t('themeSubGlow', 'Horizon Glow'),
        [
          ['off', t('themeGlowOff', 'Glow: Off')],
          ['subtle', t('themeGlowSubtle', 'Glow: Subtle')],
          ['vivid', t('themeGlowVivid', 'Glow: Vivid')],
        ].map(([gid, gLbl]) =>
          mkChip({
            label: gLbl,
            active: themeOn && (cfg.themeAmbientGlow || 'subtle') === gid,
            attr: 'data-ag-sag-theme-glow',
            val: gid,
            onClick: () =>
              updateConfig({
                themeAmbientGlow: gid,
                modules: { ...cfg.modules, themeStudio: true },
              }),
          })
        )
      )
    );
    pane.appendChild(
      mkSuiteRow(t('themeFontMotionLabel', 'Code Font & Reading Motion'), t('themeFontMotionDesc', ''), fmWrap, {
        stacked: true,
        searchExtra: 'themeCodeFont jetbrains cascadia fira sfmono sarasa ligatures streamFade smoothCaret ambientGlow',
      })
    );

    // 7. Advanced Appearance (<details>)
    const advThemeDetails = doc.createElement('details');
    advThemeDetails.className = 'ag-sag-details';
    advThemeDetails.setAttribute('data-testid', 'ag-sag-adv-appearance');
    const advThemeSum = doc.createElement('summary');
    advThemeSum.textContent = t('themeAdvSummary', 'Advanced Appearance');
    advThemeDetails.appendChild(advThemeSum);

    const advThemeBody = doc.createElement('div');
    advThemeBody.className = 'ag-sag-details-body';

    const chatFontRow = doc.createElement('div');
    chatFontRow.className = 'ag-sag-ext-grid';
    for (const [cfId, cfLbl] of [
      ['default', t('chatFontDefault', 'Default')],
      ['system', t('chatFontSystem', 'System Sans')],
      ['pingfang', t('chatFontPingfang', 'PingFang/CJK')],
      ['noto', t('chatFontNoto', 'Noto Sans')],
      ['serif', t('chatFontSerif', 'Serif')],
    ]) {
      chatFontRow.appendChild(
        mkChip({
          label: cfLbl,
          active: themeOn && (cfg.themeChatFont || 'default') === cfId,
          attr: 'data-ag-sag-theme-chat-font',
          val: cfId,
          onClick: () =>
            updateConfig({
              themeChatFont: cfId,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        })
      );
    }
    advThemeBody.appendChild(
      mkSuiteRow(t('themeSubChatFont', 'Chat Font'), '', chatFontRow, {
        stacked: true,
        searchExtra: 'themeChatFont system pingfang noto serif',
      })
    );

    advThemeBody.appendChild(
      mkSuiteRow(
        t('themeCjk', 'CJK Font Tuning'),
        '',
        mkSwitch({
          checked: cfg.themeCjkFont !== false,
          attr: 'data-ag-sag-theme-cjk',
          val: '1',
          title: t('themeCjk', 'CJK Font Tuning'),
          onClick: () =>
            updateConfig({
              themeCjkFont: cfg.themeCjkFont === false,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
        { searchExtra: 'themeCjkFont cjk' }
      )
    );

    advThemeBody.appendChild(
      mkSuiteRow(
        t('themeConflictPolicyLabel', 'External Theme Policy'),
        '',
        mkChip({
          label: cfg.themeConflictPolicy === 'takeover' ? t('conflictTakeover', 'Takeover') : t('conflictYield', 'Auto Yield'),
          active: cfg.themeConflictPolicy === 'takeover',
          attr: 'data-ag-sag-theme-policy',
          val: cfg.themeConflictPolicy || 'yield',
          onClick: () =>
            updateConfig({
              themeConflictPolicy: cfg.themeConflictPolicy === 'takeover' ? 'yield' : 'takeover',
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
        { searchExtra: 'themeConflictPolicy yield takeover' }
      )
    );

    advThemeBody.appendChild(
      mkSuiteRow(
        t('themeCompactSidebarLabel', 'Compact Sidebar'),
        t('themeCompactSidebarDesc', ''),
        mkSwitch({
          checked: Boolean(cfg.themeCompactSidebar),
          attr: 'data-ag-sag-theme-compact-sidebar',
          val: '1',
          title: t('themeCompactSidebarLabel', 'Compact Sidebar'),
          onClick: () =>
            updateConfig({
              themeCompactSidebar: !cfg.themeCompactSidebar,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
        { searchExtra: 'themeCompactSidebar' }
      )
    );

    advThemeBody.appendChild(
      mkSuiteRow(
        t('themeWideReadableLabel', 'Wide Readable Layout'),
        t('themeWideReadableDesc', ''),
        mkSwitch({
          checked: Boolean(cfg.themeWideReadable),
          attr: 'data-ag-sag-theme-wide',
          val: '1',
          title: t('themeWideReadableLabel', 'Wide Readable Layout'),
          onClick: () =>
            updateConfig({
              themeWideReadable: !cfg.themeWideReadable,
              modules: { ...cfg.modules, themeStudio: true },
            }),
        }),
        { searchExtra: 'themeWideReadable' }
      )
    );

    const cssWrap = doc.createElement('div');
    cssWrap.className = 'ag-sag-pack-ctrl';
    const cssTa = doc.createElement('textarea');
    cssTa.className = 'ag-sag-pack-textarea';
    cssTa.setAttribute('data-testid', 'ag-sag-theme-css-textarea');
    cssTa.setAttribute('spellcheck', 'false');
    cssTa.placeholder = t('themeCustomCssPlaceholder', '');
    cssTa.value = uiState.customCssDraftText !== null ? uiState.customCssDraftText : cfg.themeCustomCss || '';
    cssTa.addEventListener('input', () => {
      uiState.customCssDraftText = cssTa.value;
    });
    const cssBtns = doc.createElement('div');
    cssBtns.className = 'ag-sag-ext-grid';
    cssBtns.appendChild(
      mkChip({
        label: t('themeCustomCssApply', 'Apply CSS'),
        active: true,
        testId: 'ag-sag-theme-css-apply',
        onClick: () => {
          const val = cssTa.value;
          uiState.customCssDraftText = val;
          uiState.customCssStatusText = t('themeCustomCssApplied', 'Applied');
          updateConfig({
            themeCustomCss: val,
            modules: { ...cfg.modules, themeStudio: true },
          });
        },
      })
    );
    cssBtns.appendChild(
      mkChip({
        label: t('themeCustomCssClear', 'Clear CSS'),
        active: false,
        testId: 'ag-sag-theme-css-clear',
        onClick: () => {
          uiState.customCssDraftText = '';
          cssTa.value = '';
          uiState.customCssStatusText = '';
          updateConfig({ themeCustomCss: '' });
        },
      })
    );
    if (uiState.customCssStatusText) {
      const cssNote = doc.createElement('span');
      cssNote.className = 'ag-sag-badge-note';
      cssNote.textContent = uiState.customCssStatusText;
      cssBtns.appendChild(cssNote);
    }
    cssWrap.appendChild(cssTa);
    cssWrap.appendChild(cssBtns);
    advThemeBody.appendChild(mkSuiteRow(t('themeCustomCssLabel', 'Custom CSS'), '', cssWrap, { stacked: true, searchExtra: 'themeCustomCss' }));

    // ReadingNav auto-fold line threshold
    const rnGrid = doc.createElement('div');
    rnGrid.className = 'ag-sag-ext-grid';
    for (const nLines of [20, 40, 60, 80]) {
      rnGrid.appendChild(
        mkChip({
          label: `${nLines}`,
          active: (cfg.readingCollapseLines || 40) === nLines,
          attr: 'data-ag-sag-rnav-lines',
          val: nLines,
          onClick: () => updateConfig({ readingCollapseLines: nLines }),
        })
      );
    }
    advThemeBody.appendChild(
      mkSuiteRow(t('uiReadingCollapseLabel', 'Code Fold Threshold'), t('uiReadingCollapseDesc', ''), rnGrid, {
        searchExtra: 'readingNav readingCollapseLines fold code',
      })
    );

    advThemeDetails.appendChild(advThemeBody);
    pane.appendChild(advThemeDetails);

    // 8. Custom Language Pack Tools (<details>)
    const packDetails = doc.createElement('details');
    packDetails.className = 'ag-sag-details';
    packDetails.setAttribute('data-testid', 'ag-sag-adv-custom-pack');
    if (uiState.customPackEditorOpen || cfg.hostI18nCollectMissing || uiState.customPackStatusText) {
      packDetails.open = true;
    }
    const packSum = doc.createElement('summary');
    packSum.textContent = t('customPackAdvSummary', 'Custom Packs & Missing Phrases');
    packDetails.appendChild(packSum);

    const packCtrl = doc.createElement('div');
    packCtrl.className = 'ag-sag-pack-ctrl';
    const packBtnRow = doc.createElement('div');
    packBtnRow.className = 'ag-sag-ext-grid';

    const fileInput = coexist.markOwnedNoTranslate(doc.createElement('input'));
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.hidden = true;
    fileInput.setAttribute('data-testid', 'ag-sag-pack-file-input');

    const editorWrap = doc.createElement('div');
    editorWrap.className = 'ag-sag-pack-editor';
    editorWrap.setAttribute('data-testid', 'ag-sag-pack-editor-wrap');
    editorWrap.hidden = !uiState.customPackEditorOpen;

    const textarea = doc.createElement('textarea');
    textarea.className = 'ag-sag-pack-textarea';
    textarea.setAttribute('data-testid', 'ag-sag-pack-textarea');
    textarea.setAttribute('spellcheck', 'false');
    textarea.placeholder = t('customPackPlaceholder', '');
    textarea.value = uiState.customPackDraftText;
    textarea.addEventListener('input', () => {
      uiState.customPackDraftText = textarea.value;
    });

    const statusEl = doc.createElement('div');
    statusEl.className = 'ag-sag-pack-status';
    statusEl.setAttribute('data-testid', 'ag-sag-pack-status');
    if (uiState.customPackStatusText) {
      statusEl.textContent = uiState.customPackStatusText;
      statusEl.setAttribute('data-tone', uiState.customPackStatusTone || 'info');
    } else {
      statusEl.hidden = true;
    }

    const setPackStatus = (msg, tone = 'info') => {
      uiState.customPackStatusText = String(msg || '');
      uiState.customPackStatusTone = tone;
      const { mountedEl, drawerBodyEl } = getMountedRoots();
      const targets = new Set([
        statusEl,
        mountedEl?.querySelector?.('[data-testid="ag-sag-pack-status"]'),
        drawerBodyEl?.querySelector?.('[data-testid="ag-sag-pack-status"]'),
        doc.querySelector?.('[data-testid="ag-sag-pack-status"]'),
      ]);
      for (const target of targets) {
        if (!target) continue;
        target.textContent = uiState.customPackStatusText;
        target.setAttribute('data-tone', tone);
        target.hidden = !uiState.customPackStatusText;
      }
    };

    const importBtn = mkChip({
      label: t('customPackImportBtn', 'Import JSON'),
      active: false,
      testId: 'ag-sag-pack-import-btn',
      onClick: () => fileInput.click?.(),
    });

    const toggleEditorBtn = mkChip({
      label: uiState.customPackEditorOpen ? t('customPackHideBtn', 'Hide Editor') : t('customPackEditBtn', 'Edit JSON'),
      active: uiState.customPackEditorOpen,
      testId: 'ag-sag-pack-toggle-btn',
      onClick: () => {
        uiState.customPackEditorOpen = !uiState.customPackEditorOpen;
        packDetails.open = true;
        editorWrap.hidden = !uiState.customPackEditorOpen;
        toggleEditorBtn.textContent = uiState.customPackEditorOpen ? t('customPackHideBtn', 'Hide') : t('customPackEditBtn', 'Edit');
        toggleEditorBtn.setAttribute('aria-pressed', String(uiState.customPackEditorOpen));
      },
    });

    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      try {
        let text = '';
        if (typeof f.text === 'function') {
          text = await f.text();
        } else if (typeof win?.FileReader === 'function') {
          text = await new Promise((resolve, reject) => {
            const reader = new win.FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('File read error'));
            reader.readAsText(f);
          });
        }
        uiState.customPackDraftText = text;
        textarea.value = text;
        uiState.customPackEditorOpen = true;
        packDetails.open = true;
        editorWrap.hidden = false;
        toggleEditorBtn.textContent = t('customPackHideBtn', 'Hide');
        toggleEditorBtn.setAttribute('aria-pressed', 'true');
      } catch (err) {
        setPackStatus(err?.message || 'File read failed', 'error');
      } finally {
        try { fileInput.value = ''; } catch {}
      }
    });

    const exportBtn = mkChip({
      label: t('customPackExportBtn', 'Export Custom Pack'),
      active: false,
      testId: 'ag-sag-pack-export-btn',
      onClick: () => {
        const all = typeof options.onExportCustomPacks === 'function' ? options.onExportCustomPacks() : {};
        const keys = Object.keys(all || {});
        if (keys.length === 0) {
          setPackStatus(t('customPackEmpty', 'Empty'), 'error');
          return;
        }
        const targetLoc = cfg.hostI18nLocale && all[cfg.hostI18nLocale] ? cfg.hostI18nLocale : keys[0];
        const payload = all[targetLoc] || all;
        downloadJsonPayload(`agy-sag-pack-${targetLoc}.json`, payload);
        setPackStatus(i18n.formatTemplate(t('customPackExported', 'Exported {locale}'), { locale: targetLoc }), 'ok');
      },
    });

    const collectMissingBtn = mkChip({
      label: t('customPackCollectBtn', 'Collect Missing'),
      active: Boolean(cfg.hostI18nCollectMissing),
      attr: 'data-ag-sag-collect-missing',
      val: cfg.hostI18nCollectMissing ? '1' : '0',
      onClick: () => updateConfig({ hostI18nCollectMissing: !cfg.hostI18nCollectMissing }),
    });

    const exportMissingBtn = mkChip({
      label: t('customPackMissingBtn', 'Export Missing'),
      active: false,
      testId: 'ag-sag-pack-missing-btn',
      title: cfg.hostI18nCollectMissing ? undefined : t('customPackMissingTip', ''),
      disabled: !cfg.hostI18nCollectMissing,
      onClick: () => {
        if (!cfg.hostI18nCollectMissing) return;
        const tpl = typeof options.onExportMissingTemplate === 'function' ? options.onExportMissingTemplate() : null;
        const out = tpl || { meta: { locale: cfg.hostI18nLocale || 'zh-CN', schemaVersion: 2, count: 0 }, exact: {}, patterns: [] };
        const loc = out.meta?.locale || cfg.hostI18nLocale || 'zh-CN';
        downloadJsonPayload(`agy-sag-missing-template-${loc}.json`, out);
        setPackStatus(
          i18n.formatTemplate(t('customPackMissingExported', 'Exported {count}'), { count: out.meta?.count || 0 }),
          'ok'
        );
      },
    });

    const clearBtn = mkChip({
      label: t('customPackClearBtn', 'Clear Custom Packs'),
      active: false,
      risk: 'high',
      testId: 'ag-sag-pack-clear-btn',
      onClick: () => {
        if (typeof options.onClearCustomPacks === 'function') options.onClearCustomPacks();
        uiState.customPackDraftText = '';
        textarea.value = '';
        setPackStatus(t('customPackCleared', 'Cleared'), 'ok');
      },
    });

    packBtnRow.appendChild(fileInput);
    packBtnRow.appendChild(importBtn);
    packBtnRow.appendChild(toggleEditorBtn);
    packBtnRow.appendChild(exportBtn);
    packBtnRow.appendChild(collectMissingBtn);
    packBtnRow.appendChild(exportMissingBtn);
    packBtnRow.appendChild(clearBtn);

    const applyBtn = mkChip({
      label: t('customPackApplyBtn', 'Apply'),
      active: true,
      testId: 'ag-sag-pack-apply-btn',
      onClick: () => {
        const rawText = textarea.value;
        uiState.customPackDraftText = rawText;
        const importer =
          typeof options.onImportCustomPack === 'function'
            ? options.onImportCustomPack
            : (v) => {
                const packsMod = resolveDep('__agSagHostI18nPacks', './host-i18n-packs.js');
                return packsMod?.sanitizeImportedPack
                  ? packsMod.sanitizeImportedPack(v)
                  : { ok: false, errors: ['Pack sanitizer unavailable'], stats: { exactCount: 0, patternCount: 0 } };
              };
        const res = importer(rawText);
        if (!res || !res.ok) {
          const msg = (res?.errors && res.errors.length ? res.errors : ['Invalid pack']).join('; ');
          setPackStatus(msg, 'error');
          return;
        }
        setPackStatus(
          i18n.formatTemplate(t('customPackApplied', 'Applied'), {
            exact: res.stats?.exactCount ?? Object.keys(res.pack?.exact || {}).length,
            patterns: res.stats?.patternCount ?? (res.pack?.patterns?.length || 0),
            locale: res.pack?.locale || '',
          }),
          'ok'
        );
      },
    });

    const editorFoot = doc.createElement('div');
    editorFoot.className = 'ag-sag-pack-actions';
    editorFoot.appendChild(applyBtn);
    editorWrap.appendChild(textarea);
    editorWrap.appendChild(editorFoot);

    packCtrl.appendChild(packBtnRow);
    packCtrl.appendChild(editorWrap);
    packCtrl.appendChild(statusEl);
    packDetails.appendChild(mkSuiteRow(t('customPackLabel', 'Custom Language Pack'), t('customPackDesc', ''), packCtrl, { stacked: true, searchExtra: 'customPack import export collectMissing' }));
    pane.appendChild(packDetails);

    // 9. Opt-In Multi-Engine Thought & Sidebar Title Translator (<details>)
    const thDetails = doc.createElement('details');
    thDetails.className = 'ag-sag-details';
    thDetails.setAttribute('data-testid', 'ag-sag-adv-thought');
    if (cfg.modules?.thoughtTranslate || uiState.thoughtStatusText) thDetails.open = true;
    const thSum = doc.createElement('summary');
    thSum.textContent = t('thoughtAdvSummary', 'Thought & Sidebar Title Translation (Opt-In)');
    thDetails.appendChild(thSum);

    const thBody = doc.createElement('div');
    thBody.className = 'ag-sag-details-body';

    const privNote = doc.createElement('div');
    privNote.className = 'ag-sag-badge-note';
    privNote.textContent = t('thoughtPrivacyHint', '');
    thBody.appendChild(privNote);

    const curEngine = cfg.thoughtEngine || 'mt';
    const engGrid = doc.createElement('div');
    engGrid.className = 'ag-sag-ext-grid';
    for (const [eid, eLbl] of [
      ['mt', t('thoughtEngineMt', 'Machine Translate (Keyless)')],
      ['openai', t('thoughtEngineOpenai', 'OpenAI-Compatible')],
      ['anthropic', t('thoughtEngineAnthropic', 'Anthropic')],
      ['gemini', t('thoughtEngineGemini', 'Gemini')],
      ['ollama', t('thoughtEngineOllama', 'Local Ollama')],
    ]) {
      engGrid.appendChild(
        mkChip({
          label: eLbl,
          active: curEngine === eid,
          attr: 'data-ag-sag-thought-engine',
          val: eid,
          onClick: () => updateConfig({ thoughtEngine: eid }),
        })
      );
    }
    thBody.appendChild(
      mkSuiteRow(t('thoughtEngineLabel', 'Translation Engine'), '', engGrid, {
        stacked: true,
        searchExtra: 'thoughtTranslate engine mt openai anthropic gemini ollama',
      })
    );

    const modeGrid = doc.createElement('div');
    modeGrid.className = 'ag-sag-ext-grid';
    for (const [tk, tLbl] of [
      ['auto', t('thoughtTriggerAuto', 'Auto Translate')],
      ['manual', t('thoughtTriggerManual', 'Manual Click')],
    ]) {
      modeGrid.appendChild(
        mkChip({
          label: tLbl,
          active: (cfg.thoughtTrigger || 'auto') === tk,
          attr: 'data-ag-sag-thought-trigger',
          val: tk,
          onClick: () => updateConfig({ thoughtTrigger: tk }),
        })
      );
    }
    for (const [vk, vLbl] of [
      ['bilingual', t('thoughtViewBilingual', 'Bilingual')],
      ['translated', t('thoughtViewTranslated', 'Translated Only')],
    ]) {
      modeGrid.appendChild(
        mkChip({
          label: vLbl,
          active: (cfg.thoughtViewMode || 'bilingual') === vk,
          attr: 'data-ag-sag-thought-view',
          val: vk,
          onClick: () => updateConfig({ thoughtViewMode: vk }),
        })
      );
    }
    modeGrid.appendChild(
      mkChip({
        label: t('thoughtTitlesToggle', 'Translate Sidebar Titles'),
        active: Boolean(cfg.thoughtTranslateTitles),
        attr: 'data-ag-sag-thought-titles',
        val: cfg.thoughtTranslateTitles ? '1' : '0',
        onClick: () => updateConfig({ thoughtTranslateTitles: !cfg.thoughtTranslateTitles }),
      })
    );
    thBody.appendChild(
      mkSuiteRow(t('thoughtTriggerLabel', 'Trigger & Display Mode'), '', modeGrid, {
        stacked: true,
        searchExtra: 'thoughtTrigger thoughtViewMode thoughtTranslateTitles bilingual',
      })
    );

    // Provider endpoint / model / 0600 isolated API key form (sent strictly via Node sidecar)
    const provWrap = doc.createElement('div');
    provWrap.className = 'ag-sag-pack-ctrl';
    const cachedProv = uiState.thoughtProviderStatus?.providers?.[curEngine] || null;
    if (!uiState.thoughtStatusFetched && typeof options.onTranslatorStatus === 'function') {
      uiState.thoughtStatusFetched = true;
      Promise.resolve(options.onTranslatorStatus())
        .then((res) => {
          if (res?.ok && res.data) {
            uiState.thoughtProviderStatus = res.data;
            ctx.refreshAllViews?.();
          }
        })
        .catch(() => {});
    }

    const baseInp = doc.createElement('input');
    baseInp.type = 'text';
    baseInp.className = 'ag-sag-search-input';
    baseInp.setAttribute('data-testid', 'ag-sag-thought-baseurl');
    baseInp.placeholder = t('thoughtBaseUrlPh', 'Custom Base URL / Endpoint');
    baseInp.value =
      uiState.thoughtDraftBaseUrl?.[curEngine] !== undefined
        ? uiState.thoughtDraftBaseUrl[curEngine]
        : curEngine === 'mt'
          ? cachedProv?.endpoint || ''
          : cachedProv?.baseUrl || '';
    baseInp.addEventListener('input', () => {
      if (!uiState.thoughtDraftBaseUrl) uiState.thoughtDraftBaseUrl = {};
      uiState.thoughtDraftBaseUrl[curEngine] = baseInp.value;
    });
    provWrap.appendChild(baseInp);

    let modelInp = null;
    let keyInp = null;
    if (curEngine !== 'mt') {
      modelInp = doc.createElement('input');
      modelInp.type = 'text';
      modelInp.className = 'ag-sag-search-input';
      modelInp.setAttribute('data-testid', 'ag-sag-thought-model');
      modelInp.placeholder = t('thoughtModelPh', 'Model ID');
      modelInp.value =
        uiState.thoughtDraftModel?.[curEngine] !== undefined
          ? uiState.thoughtDraftModel[curEngine]
          : cachedProv?.model || '';
      modelInp.addEventListener('input', () => {
        if (!uiState.thoughtDraftModel) uiState.thoughtDraftModel = {};
        uiState.thoughtDraftModel[curEngine] = modelInp.value;
      });
      provWrap.appendChild(modelInp);

      keyInp = doc.createElement('input');
      keyInp.type = 'password';
      keyInp.className = 'ag-sag-search-input';
      keyInp.setAttribute('data-testid', 'ag-sag-thought-apikey');
      keyInp.placeholder = cachedProv?.hasKey
        ? `${t('thoughtApiKeyPh', 'API Key')} (${cachedProv.maskedKey || 'stored'})`
        : t('thoughtApiKeyPh', 'API Key');
      keyInp.value = '';
      provWrap.appendChild(keyInp);
    }

    const thStatusEl = doc.createElement('div');
    thStatusEl.className = 'ag-sag-pack-status';
    thStatusEl.setAttribute('data-testid', 'ag-sag-thought-status');
    if (uiState.thoughtStatusText) {
      thStatusEl.textContent = uiState.thoughtStatusText;
      thStatusEl.setAttribute('data-tone', uiState.thoughtStatusTone || 'info');
    } else {
      thStatusEl.hidden = true;
    }
    const setThStatus = (msg, tone = 'info') => {
      uiState.thoughtStatusText = String(msg || '');
      uiState.thoughtStatusTone = tone;
      const { mountedEl, drawerBodyEl } = getMountedRoots();
      for (const node of new Set([
        thStatusEl,
        mountedEl?.querySelector?.('[data-testid="ag-sag-thought-status"]'),
        drawerBodyEl?.querySelector?.('[data-testid="ag-sag-thought-status"]'),
        doc.querySelector?.('[data-testid="ag-sag-thought-status"]'),
      ])) {
        if (!node) continue;
        node.textContent = uiState.thoughtStatusText;
        node.setAttribute('data-tone', tone);
        node.hidden = !uiState.thoughtStatusText;
      }
    };

    const provBtns = doc.createElement('div');
    provBtns.className = 'ag-sag-ext-grid';
    provBtns.appendChild(
      mkChip({
        label: t('thoughtSaveBtn', 'Save Provider'),
        active: true,
        testId: 'ag-sag-thought-save-btn',
        onClick: () => {
          if (typeof options.onTranslatorSaveProvider !== 'function') {
            setThStatus(t('thoughtOfflineErr', 'Watch Sidecar offline'), 'error');
            return;
          }
          const req =
            curEngine === 'mt'
              ? { engine: 'mt', endpoint: baseInp.value.trim() }
              : {
                  engine: curEngine,
                  baseUrl: baseInp.value.trim(),
                  model: modelInp?.value?.trim() || '',
                  ...(keyInp?.value?.trim() ? { apiKey: keyInp.value.trim() } : {}),
                };
          Promise.resolve(options.onTranslatorSaveProvider(req))
            .then((res) => {
              if (res?.ok) {
                if (res.data) uiState.thoughtProviderStatus = res.data;
                if (keyInp) keyInp.value = '';
                setThStatus(t('thoughtSavedOk', 'Saved'), 'ok');
                ctx.refreshAllViews?.();
              } else {
                setThStatus(res?.error || t('thoughtOfflineErr', 'Save failed'), 'error');
              }
            })
            .catch((err) => setThStatus(err?.message || 'Save failed', 'error'));
        },
      })
    );
    if (curEngine !== 'mt') {
      provBtns.appendChild(
        mkChip({
          label: t('thoughtClearKeyBtn', 'Clear Key'),
          active: false,
          risk: 'high',
          testId: 'ag-sag-thought-clearkey-btn',
          onClick: () => {
            if (typeof options.onTranslatorSaveProvider !== 'function') {
              setThStatus(t('thoughtOfflineErr', 'Watch Sidecar offline'), 'error');
              return;
            }
            Promise.resolve(options.onTranslatorSaveProvider({ engine: curEngine, clearApiKey: true }))
              .then((res) => {
                if (res?.ok) {
                  if (res.data) uiState.thoughtProviderStatus = res.data;
                  setThStatus(t('thoughtSavedOk', 'Cleared'), 'ok');
                  ctx.refreshAllViews?.();
                } else {
                  setThStatus(res?.error || 'Clear failed', 'error');
                }
              })
              .catch((err) => setThStatus(err?.message || 'Clear failed', 'error'));
          },
        })
      );
    }
    provBtns.appendChild(
      mkChip({
        label: t('thoughtTestBtn', 'Test Connection'),
        active: false,
        testId: 'ag-sag-thought-test-btn',
        onClick: () => {
          if (typeof options.onTranslatorDiagnose !== 'function') {
            setThStatus(t('thoughtOfflineErr', 'Watch Sidecar offline'), 'error');
            return;
          }
          const targetLang = cfg.thoughtTargetLang && cfg.thoughtTargetLang !== 'auto'
            ? cfg.thoughtTargetLang
            : cfg.hostI18nLocale && cfg.hostI18nLocale !== 'auto' && cfg.hostI18nLocale !== 'en'
              ? cfg.hostI18nLocale
              : 'zh-CN';
          setThStatus('Testing…', 'info');
          Promise.resolve(options.onTranslatorDiagnose({ engine: curEngine, targetLang }))
            .then((res) => {
              if (res?.ok && res.data) {
                setThStatus(`OK (${res.data.latencyMs ?? 0}ms): ${res.data.sample || ''}`, 'ok');
              } else {
                setThStatus(res?.error || t('thoughtOfflineErr', 'Test failed'), 'error');
              }
            })
            .catch((err) => setThStatus(err?.message || 'Test failed', 'error'));
        },
      })
    );
    if (typeof options.onTranslatorClearCache === 'function') {
      provBtns.appendChild(
        mkChip({
          label: t('thoughtClearCacheBtn', 'Clear Cache'),
          active: false,
          testId: 'ag-sag-thought-clearcache-btn',
          onClick: () => {
            Promise.resolve(options.onTranslatorClearCache())
              .then((res) => {
                if (res?.ok) setThStatus(t('thoughtCacheCleared', 'Cache cleared'), 'ok');
                else setThStatus(res?.error || 'Clear cache failed', 'error');
              })
              .catch((err) => setThStatus(err?.message || 'Clear cache failed', 'error'));
          },
        })
      );
    }
    const styleWrap = doc.createElement('div');
    styleWrap.className = 'ag-sag-ext-grid';
    for (const [sid, sLbl] of [
      ['technical', t('thoughtStyleTech', 'Technical Notes')],
      ['concise', t('thoughtStyleConcise', 'Concise')],
    ]) {
      styleWrap.appendChild(
        mkChip({
          label: sLbl,
          active: (cfg.thoughtStylePreset || 'technical') === sid,
          attr: 'data-ag-sag-thought-style',
          val: sid,
          onClick: () => updateConfig({ thoughtStylePreset: sid }),
        })
      );
    }
    thBody.appendChild(
      mkSuiteRow(t('thoughtStyleLabel', 'Style Preset'), '', styleWrap, {
        searchExtra: 'thoughtStylePreset technical concise prompt',
      })
    );
    provWrap.appendChild(provBtns);
    provWrap.appendChild(thStatusEl);
    thBody.appendChild(
      mkSuiteRow(t('thoughtProviderLabel', 'Model & Secret Settings (0600 Isolated)'), '', provWrap, {
        stacked: true,
        searchExtra: 'thoughtTranslate apikey model baseUrl ollama openai anthropic gemini mt',
      })
    );

    thDetails.appendChild(thBody);
    pane.appendChild(thDetails);
  }

  return { renderUiTab };
});
