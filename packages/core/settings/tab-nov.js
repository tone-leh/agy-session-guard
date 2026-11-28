// agy-Sag — Settings Hub Tab: Dual-Star agy-NOV Synergy (UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagSettingsTabNov = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function renderNovTab(pane, ctx) {
    const {
      doc,
      win,
      i18n,
      options,
      cfg,
      isZh,
      t,
      novState,
      novConnected,
      novSynergy,
      novSynergyMod,
      mkChip,
      mkSuiteRow,
      updateConfig,
      refreshAllViews,
      isDestroyed,
      uiState,
    } = ctx;
    pane.setAttribute('data-testid', 'ag-sag-nov-panel');

    if (
      ctx.allowNovAutoRefresh !== false &&
      !novState?.bridgeConnected &&
      typeof novSynergy?.isBridgeAvailable === 'function' &&
      novSynergy.isBridgeAvailable() &&
      !uiState.novAutoRefreshInFlight &&
      !uiState.novAutoRefreshAttempted
    ) {
      uiState.novAutoRefreshInFlight = true;
      uiState.novAutoRefreshAttempted = true;
      Promise.resolve(novSynergy.refresh?.())
        .catch(() => {})
        .finally(() => {
          uiState.novAutoRefreshInFlight = false;
        });
    } else if (novState?.bridgeConnected) {
      uiState.novAutoRefreshAttempted = false;
    }

    const novModulesMeta = novSynergyMod?.NOV_MODULES_META || [];
    const novCategoryMap = novSynergyMod?.NOV_MODULE_CATEGORIES || {};
    const novCategoryIds = novSynergyMod?.NOV_MODULE_CATEGORY_IDS || Object.keys(novCategoryMap);
    const novCategories = Array.isArray(novCategoryMap)
      ? novCategoryMap
      : novCategoryIds.map((id) => novCategoryMap[id]).filter(Boolean);
    const novPresetsMeta = novSynergyMod?.NOV_PRESETS_META || [];
    const installCmd = novSynergyMod?.NOV_INSTALL_CMD || 'agy plugin install https://github.com/tone-leh/agy-NOV';

    if (novConnected && novState) {
      const banner = doc.createElement('div');
      banner.className = 'ag-sag-nov-banner';
      const bLeft = doc.createElement('div');
      bLeft.className = 'ag-sag-suite-label';
      const bTitle = doc.createElement('strong');
      bTitle.textContent = t('novHeaderTitle', 'agy-NOV Control Hub');
      const bMeta = doc.createElement('span');
      bMeta.className = 'ag-sag-nov-meta';
      bMeta.setAttribute('data-testid', 'ag-sag-nov-meta');
      const rawPresetId = novState.config?.preset || 'core';
      const matchedPreset = novPresetsMeta.find((p) => p && p.id === rawPresetId);
      const presetLabel =
        rawPresetId === 'custom'
          ? t('presetCustomTag', 'Custom')
          : matchedPreset
            ? isZh
              ? matchedPreset.nameZh
              : matchedPreset.nameEn
            : rawPresetId;
      bMeta.textContent = i18n.formatTemplate(t('novConnectedMeta', 'v{ver} · {preset}'), {
        ver: novState.version || '0.5.0',
        preset: presetLabel,
      });
      bLeft.appendChild(bTitle);
      bLeft.appendChild(bMeta);
      banner.appendChild(bLeft);

      if (typeof novSynergy?.refresh === 'function') {
        banner.appendChild(
          mkChip({
            label: t('novRefreshBtn', 'Refresh'),
            active: false,
            attr: 'data-ag-nov-refresh',
            val: '1',
            onClick: () => {
              void novSynergy.refresh();
              void novSynergy.fetchFeed?.();
            },
          })
        );
      }
      pane.appendChild(banner);

      // 5 agy-NOV Scene Presets
      const novPresetGrid = doc.createElement('div');
      novPresetGrid.className = 'ag-sag-ext-grid';
      for (const p of novPresetsMeta) {
        novPresetGrid.appendChild(
          mkChip({
            label: isZh ? p.nameZh : p.nameEn,
            title: isZh ? p.descZh : p.descEn,
            active: (novState.config?.preset || '') === p.id,
            attr: 'data-ag-nov-preset',
            val: p.id,
            risk: p.privacy === 'opt-in-network' ? 'high' : '',
            onClick: () => void novSynergy.applyPreset(p.id),
          })
        );
      }
      pane.appendChild(mkSuiteRow(t('novPresetLabel', 'agy-NOV Presets'), t('novPresetDesc', ''), novPresetGrid, { searchExtra: 'nov preset' }));

      // 13 agy-NOV Modules grouped by category
      const catContainer = doc.createElement('div');
      catContainer.className = 'ag-sag-pack-ctrl';
      catContainer.setAttribute('data-testid', 'ag-sag-nov-mod-grid');

      const renderModuleCards = (mods) => {
        const modGrid = doc.createElement('div');
        modGrid.className = 'ag-sag-nov-grid';
        for (const m of mods) {
          const isOn = Boolean(novState.config?.modules?.[m.id]);
          const cardBtn = doc.createElement('button');
          cardBtn.type = 'button';
          cardBtn.className = 'ag-sag-nov-card';
          cardBtn.setAttribute('data-ag-nov-mod', m.id);
          cardBtn.setAttribute('data-privacy', m.privacy);
          cardBtn.setAttribute('aria-pressed', String(isOn));
          cardBtn.title = isZh ? m.descZh : m.descEn;

          const top = doc.createElement('div');
          top.className = 'ag-sag-nov-card-top';
          const nm = doc.createElement('span');
          nm.className = 'ag-sag-nov-card-name';
          nm.textContent = isZh ? m.nameZh : m.nameEn;
          const led = doc.createElement('span');
          led.className = 'ag-sag-nov-led';
          led.setAttribute('aria-hidden', 'true');
          top.appendChild(nm);
          top.appendChild(led);

          const tags = doc.createElement('div');
          tags.className = 'ag-sag-nov-card-tags';
          const toolTag = doc.createElement('span');
          toolTag.className = 'ag-sag-nov-tag';
          toolTag.textContent = i18n.formatTemplate(t('novToolsBadge', '{n} tools'), { n: m.toolCount });
          tags.appendChild(toolTag);

          const privTag = doc.createElement('span');
          privTag.className = 'ag-sag-nov-tag';
          if (m.privacy === 'opt-in-network') {
            privTag.setAttribute('data-kind', 'network');
            privTag.textContent = t('novPrivacyNetwork', 'On-Demand');
          } else {
            privTag.textContent = t('novPrivacyOffline', 'Offline');
          }
          tags.appendChild(privTag);

          cardBtn.appendChild(top);
          cardBtn.appendChild(tags);
          cardBtn.addEventListener('click', (ev) => {
            ev?.preventDefault?.();
            ev?.stopPropagation?.();
            void novSynergy.setModule(m.id, !isOn);
          });
          modGrid.appendChild(cardBtn);
        }
        return modGrid;
      };

      if (novCategories.length > 0) {
        for (const cat of novCategories) {
          const mods = novModulesMeta.filter((m) => m.category === cat.id);
          if (!mods.length) continue;
          const catBox = doc.createElement('div');
          catBox.className = 'ag-sag-overview-group';
          catBox.setAttribute('data-ag-nov-category', cat.id);
          const catHead = doc.createElement('div');
          catHead.className = 'ag-sag-group-title';
          catHead.textContent = isZh ? cat.nameZh : cat.nameEn;
          catBox.appendChild(catHead);
          catBox.appendChild(renderModuleCards(mods));
          catContainer.appendChild(catBox);
        }
      } else {
        catContainer.appendChild(renderModuleCards(novModulesMeta));
      }

      pane.appendChild(mkSuiteRow(t('novModulesLabel', '13 Native Modules'), t('novModulesDesc', ''), catContainer, { stacked: true, searchExtra: 'nov modules' }));

      // Dual-Star Synergy Effects
      const synEffects = novSynergy?.getSynergyEffects
        ? novSynergy.getSynergyEffects(cfg)
        : novSynergyMod?.computeSynergyEffects
          ? novSynergyMod.computeSynergyEffects(cfg, novState, { bridgeConnected: true })
          : [];
      const synBox = doc.createElement('div');
      synBox.className = 'ag-sag-synergy-box';
      synBox.setAttribute('data-testid', 'ag-sag-synergy-effects');
      const synTitle = doc.createElement('div');
      synTitle.className = 'ag-sag-synergy-title';
      synTitle.textContent = t('novSynergyTitle', 'Dual-Star Synergy');
      synBox.appendChild(synTitle);

      const synList = doc.createElement('div');
      synList.className = 'ag-sag-synergy-list';
      if (!synEffects.length) {
        const empty = doc.createElement('span');
        empty.className = 'ag-sag-badge-note';
        empty.textContent = t('novSynergyEmpty', '');
        synList.appendChild(empty);
      } else {
        for (const eff of synEffects) {
          const rowEl = doc.createElement('div');
          rowEl.className = 'ag-sag-synergy-item';
          rowEl.setAttribute('data-ag-synergy-id', eff.id);
          rowEl.setAttribute('data-status', eff.status);
          const txt = doc.createElement('span');
          txt.className = 'ag-sag-synergy-text';
          txt.textContent = isZh ? eff.descZh : eff.descEn;
          rowEl.appendChild(txt);
          if (eff.quickAction) {
            const act = eff.quickAction;
            const actBtn = doc.createElement('button');
            actBtn.type = 'button';
            actBtn.className = 'ag-sag-synergy-act';
            actBtn.setAttribute('data-ag-synergy-action', act.type);
            actBtn.setAttribute('data-ag-synergy-target', act.moduleId);
            actBtn.textContent = isZh ? act.labelZh : act.labelEn;
            actBtn.addEventListener('click', (ev) => {
              ev?.preventDefault?.();
              ev?.stopPropagation?.();
              if (act.type === 'enable-nov-module' && novSynergy?.setModule) {
                void novSynergy.setModule(act.moduleId, true);
              } else if (act.type === 'disable-sag-module') {
                updateConfig({ modules: { ...cfg.modules, [act.moduleId]: false } });
              }
            });
            rowEl.appendChild(actBtn);
          }
          synList.appendChild(rowEl);
        }
      }
      synBox.appendChild(synList);
      pane.appendChild(synBox);

      // Live NOV Status Feed
      const feed = typeof novSynergy?.getFeed === 'function' ? novSynergy.getFeed() : null;
      if (feed) {
        const parts = [];
        if (feed.guard?.blockedCount > 0 || feed.guard?.forceAskCount > 0 || feed.guard?.snapshotCount > 0 || feed.guard?.permissionMode) {
          const faTag = feed.guard.forceAskCount > 0 ? (isZh ? ` · 待确认 ${feed.guard.forceAskCount}` : ` · confirm ${feed.guard.forceAskCount}`) : '';
          parts.push(
            isZh
              ? `安全护盾 拦截 ${feed.guard.blockedCount}${faTag} · 快照 ${feed.guard.snapshotCount}`
              : `Guard blocked ${feed.guard.blockedCount}${faTag} · snapshots ${feed.guard.snapshotCount}`
          );
        }
        if (feed.spec?.writeLockActive) {
          parts.push(isZh ? `规划写锁开启（排队已暂停）` : `Spec write-lock active (queue paused)`);
        }
        if (feed.verify?.lastStatus === 'blocked') {
          parts.push(isZh ? `校验门已拦截` : `Verify gate blocked`);
        } else if (feed.verify?.lastStatus === 'fail') {
          parts.push(isZh ? `校验未通过` : `Verify gate failed`);
        }
        if (feed.healthSweep && typeof feed.healthSweep.score === 'number') {
          parts.push(isZh ? `健康分 ${feed.healthSweep.score}` : `Health ${feed.healthSweep.score}`);
        }
        if (feed.mem?.driftedCount > 0) {
          parts.push(isZh ? `记忆待核对 ${feed.mem.driftedCount}` : `Memory drift ${feed.mem.driftedCount}`);
        }
        if (feed.radar?.awaitingCount > 0) {
          parts.push(isZh ? `后台待确认 ${feed.radar.awaitingCount}` : `Awaiting ${feed.radar.awaitingCount}`);
        }
        if (parts.length > 0) {
          const feedEl = doc.createElement('div');
          feedEl.className = 'ag-sag-badge-note';
          feedEl.setAttribute('data-testid', 'ag-sag-nov-live-feed');
          feedEl.textContent = `${isZh ? '联动动态：' : 'Live NOV Status: '}${parts.join(' · ')}`;
          pane.appendChild(feedEl);
        }
      }
    } else if (novState?.installed && !novState.bridgeConnected) {
      const waitCard = doc.createElement('div');
      waitCard.className = 'ag-sag-nov-promo';
      waitCard.setAttribute('data-testid', 'ag-sag-nov-waiting');
      const wt = doc.createElement('div');
      wt.className = 'ag-sag-nov-promo-title';
      wt.textContent = t('novHeaderTitle', 'agy-NOV Control Hub');
      const wd = doc.createElement('div');
      wd.className = 'ag-sag-nov-promo-desc';
      wd.textContent = t('novBridgeWaiting', '');
      waitCard.appendChild(wt);
      waitCard.appendChild(wd);
      if (typeof novSynergy?.refresh === 'function') {
        waitCard.appendChild(
          mkChip({
            label: t('novRefreshBtn', 'Refresh'),
            active: false,
            attr: 'data-ag-nov-refresh',
            val: '1',
            onClick: () => void novSynergy.refresh(),
          })
        );
      }
      pane.appendChild(waitCard);
    }
  }

  return { renderNovTab };
});
