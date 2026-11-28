// agy-Sag — Settings Hub Tab: Overview (UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagSettingsTabOverview = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function renderOverviewTab(pane, ctx) {
    const { doc, coexist, cfg, t, mkSwitch, updateConfig, gotoTab } = ctx;
    const groups = coexist?.MODULE_GROUPS || [
      { id: 'ui', layer: 'L1', settingsTab: 'ui' },
      { id: 'conversation', layer: 'L2', settingsTab: 'conversation' },
      { id: 'guard', layer: 'L3', settingsTab: 'guard' },
    ];
    const metaMap = coexist?.MODULE_META || {};
    const allMeta = Object.values(metaMap);

    const groupTitleMap = {
      ui: t('groupUi', 'Interface'),
      conversation: t('groupConversation', 'Conversation'),
      guard: t('groupGuard', 'Protection'),
    };

    for (const grp of groups) {
      const grpBox = doc.createElement('div');
      grpBox.className = 'ag-sag-overview-group';
      grpBox.setAttribute('data-ag-sag-group', grp.id);

      const gHead = doc.createElement('div');
      gHead.className = 'ag-sag-group-title';
      gHead.textContent = groupTitleMap[grp.id] || grp.id;
      grpBox.appendChild(gHead);

      const grid = doc.createElement('div');
      grid.className = 'ag-sag-mod-grid';

      const topMods = allMeta.filter((m) => m.group === grp.id && !m.parentId);
      for (const m of topMods) {
        const isOn = Boolean(cfg.modules?.[m.id]);
        const card = doc.createElement('div');
        card.className = 'ag-sag-mod-card';
        card.setAttribute('data-ag-sag-mod-card', m.id);
        card.setAttribute('data-active', isOn ? '1' : '0');

        const mTitle = t(m.labelKey, m.id);
        const mDesc = t(m.descKey, '');
        const subMods = allMeta.filter((sub) => sub.parentId === m.id);
        const subSearch = subMods
          .map((sub) => `${t(sub.labelKey, sub.id)} ${t(sub.descKey, '')} ${sub.id}`)
          .join(' ');
        card.setAttribute('data-ag-sag-search', `${mTitle} ${mDesc} ${m.id} ${subSearch}`.trim().toLowerCase());

        const head = doc.createElement('div');
        head.className = 'ag-sag-mod-card-head';
        const titleEl = doc.createElement('span');
        titleEl.className = 'ag-sag-mod-card-title';
        titleEl.textContent = mTitle;
        head.appendChild(titleEl);
        head.appendChild(
          mkSwitch({
            checked: isOn,
            attr: 'data-ag-sag-mod',
            val: m.id,
            risk: m.aggressive ? 'high' : '',
            title: mTitle,
            onClick: () => updateConfig({ modules: { ...cfg.modules, [m.id]: !isOn } }),
          })
        );
        card.appendChild(head);

        const descEl = doc.createElement('div');
        descEl.className = 'ag-sag-mod-card-desc';
        descEl.textContent = mDesc;
        card.appendChild(descEl);

        // Child module switch (e.g., precompactExport inside compactGuard)
        for (const sub of subMods) {
          const subOn = Boolean(cfg.modules?.[sub.id]);
          const subRow = doc.createElement('div');
          subRow.className = 'ag-sag-mod-sub';
          const subLbl = doc.createElement('span');
          subLbl.textContent = t(sub.labelKey, sub.id);
          subRow.appendChild(subLbl);
          subRow.appendChild(
            mkSwitch({
              checked: subOn,
              attr: 'data-ag-sag-mod',
              val: sub.id,
              title: t(sub.labelKey, sub.id),
              onClick: () => updateConfig({ modules: { ...cfg.modules, [sub.id]: !subOn } }),
            })
          );
          card.appendChild(subRow);
        }

        const foot = doc.createElement('div');
        foot.className = 'ag-sag-mod-card-foot';
        const goBtn = doc.createElement('button');
        goBtn.type = 'button';
        goBtn.className = 'ag-sag-link-btn';
        goBtn.setAttribute('data-ag-sag-goto', m.settingsTab);
        goBtn.textContent = t('goToSettings', 'Settings →');
        goBtn.addEventListener('click', (ev) => {
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
          gotoTab(m.settingsTab);
        });
        foot.appendChild(goBtn);
        card.appendChild(foot);

        grid.appendChild(card);
      }

      grpBox.appendChild(grid);
      pane.appendChild(grpBox);
    }
  }

  return { renderOverviewTab };
});
