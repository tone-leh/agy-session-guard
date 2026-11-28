// agy-Sag — Dual-Star Synergy Controller & Zero-Port CDP Bridge Client for agy-NOV (UMD, zero runtime deps)
// Independent MIT-licensed implementation:
//   - Bridges renderer UI to Watch Sidecar via CDP Runtime.addBinding (window.__agSagHostBridge) or injected novTransport
//   - Receives live reverse state pushes via window.__agSagBridgeReceiver.onPush({ event: 'nov:state', state })
//   - Computes the 4 real-time Dual-Star Synergy Effects (dual-shield, context-memory, radar-dedup, dual-star-hub)
//   - 100% lossless destroy() with strict receiver ownership checks and pending timer teardown
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagNovSynergy = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const HOST_BRIDGE_GLOBAL = '__agSagHostBridge';
  const RECEIVER_GLOBAL = '__agSagBridgeReceiver';
  const NOV_INSTALL_CMD = 'agy plugin install https://github.com/tone-leh/agy-NOV';
  const NOV_BASE_TOOL_COUNT = 2; // nov_open + nov_status
  const DEFAULT_TIMEOUT_MS = 4000;

  const NOV_MODULE_IDS = Object.freeze([
    'review',
    'guard',
    'xray',
    'turbo',
    'radar',
    'verify',
    'worktree',
    'spec',
    'studio',
    'canvas',
    'mem',
    'ops',
    'remote',
  ]);

  const NOV_MODULE_CATEGORY_IDS = Object.freeze([
    'core-dev',
    'safety',
    'observability',
    'workspace',
    'connectivity',
  ]);

  const NOV_MODULE_CATEGORIES = Object.freeze({
    'core-dev': Object.freeze({
      id: 'core-dev',
      nameZh: '代码与极速',
      nameEn: 'Code & Speed',
      descZh: 'PR 行内审阅、并行 Worktree 与极速检索压缩',
      descEn: 'PR-grade diff review, worktrees, and token-saving batch tools',
    }),
    safety: Object.freeze({
      id: 'safety',
      nameZh: '安全护盾与门禁',
      nameEn: 'Safety Shield & Gate',
      descZh: '密钥防火墙、改前快照与 Stop 实测校验门',
      descEn: 'Secret firewall, pre-edit snapshots, and stop verify gate',
    }),
    observability: Object.freeze({
      id: 'observability',
      nameZh: '透视与雷达',
      nameEn: 'Context & Radar',
      descZh: 'Token 缓存透视、跨会话检索与多会话雷达',
      descEn: 'Token/cache X-Ray, cross-session search, and completion radar',
    }),
    workspace: Object.freeze({
      id: 'workspace',
      nameZh: '工作区、Spec 与记忆',
      nameEn: 'Spec, Studio & Workspace',
      descZh: 'Spec 写锁任务图、离线数据实验室、视觉画布与长期记忆',
      descEn: 'Spec DAG, local data studio, visual canvas, memory graph & ops',
    }),
    connectivity: Object.freeze({
      id: 'connectivity',
      nameZh: '按需远程协作',
      nameEn: 'Opt-In Remote',
      descZh: '默认零端口关闭；按需开启手机 PWA 与 IM 远程审批',
      descEn: 'Strictly OFF by default: mobile PWA and IM webhook approvals',
    }),
  });

  const NOV_MODULES_META = Object.freeze([
    Object.freeze({
      id: 'review',
      category: 'core-dev',
      nameZh: 'Diff 审阅',
      nameEn: 'Diff Review',
      shortZh: '审阅',
      shortEn: 'Review',
      descZh: 'PR 级行内 Diff 批注与精准返修',
      descEn: 'PR-grade inline diff review & line annotations',
      toolCount: 2,
      privacy: 'offline',
      defaultEnabled: true,
    }),
    Object.freeze({
      id: 'guard',
      category: 'safety',
      nameZh: '安全护盾与快照',
      nameEn: 'Guard & Snapshots',
      shortZh: '护盾',
      shortEn: 'Guard',
      descZh: '密钥防泄漏、命令防火墙与零 Git 改前快照',
      descEn: 'Secret firewall, command guard & pre-edit snapshots',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: true,
    }),
    Object.freeze({
      id: 'xray',
      category: 'observability',
      nameZh: '上下文透视',
      nameEn: 'Context X-Ray',
      shortZh: '透视',
      shortEn: 'X-Ray',
      descZh: 'Token 缓存拆解、改动文件树与跨会话检索',
      descEn: 'Token/cache breakdown & cross-session BM25 search',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: true,
    }),
    Object.freeze({
      id: 'turbo',
      category: 'core-dev',
      nameZh: '极速检索与压缩',
      nameEn: 'Turbo & Output Guard',
      shortZh: '极速',
      shortEn: 'Turbo',
      descZh: '批量代码检索、符号大纲切片与超长日志压缩',
      descEn: 'Batch search, outline slices & large-output compaction',
      toolCount: 3,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'radar',
      category: 'observability',
      nameZh: '多会话雷达',
      nameEn: 'Session Radar & Chime',
      shortZh: '雷达',
      shortEn: 'Radar',
      descZh: '基于官方 Hook 的多会话看板与完成提示音',
      descEn: 'Hook-based multi-session board & completion chimes',
      toolCount: 2,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'verify',
      category: 'safety',
      nameZh: '校验门禁',
      nameEn: 'Verify Gate',
      shortZh: '校验',
      shortEn: 'Verify',
      descZh: 'Stop Hook 实测门禁与证据链，拦截未验证完成声明',
      descEn: 'Stop-hook verification gate blocking unverified "done" claims',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'worktree',
      category: 'core-dev',
      nameZh: '工作树编排',
      nameEn: 'Worktree Orchestrator',
      shortZh: '工作树',
      shortEn: 'Worktree',
      descZh: '安全并行 Git Worktree、分支 Diff 预览与孤儿清理',
      descEn: 'Safe parallel Git worktrees, branch diff previews & orphan cleanup',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'spec',
      category: 'workspace',
      nameZh: 'Spec 流程与任务图',
      nameEn: 'Spec Flow & Task DAG',
      shortZh: 'Spec',
      shortEn: 'Spec',
      descZh: '结构化 Spec -> Plan -> Task DAG 与审批前写锁门禁',
      descEn: 'Spec-driven development, dependency task DAG & pre-approval write lock',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'studio',
      category: 'workspace',
      nameZh: '工作区数据实验室',
      nameEn: 'Workspace Studio',
      shortZh: '实验室',
      shortEn: 'Studio',
      descZh: '离线 SQLite/CSV/DOCX/XLSX/PDF 切片与本地回环探测',
      descEn: 'Offline SQLite/CSV/DOCX/XLSX/PDF slicer & loopback HTTP probe',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'canvas',
      category: 'workspace',
      nameZh: '视觉画布',
      nameEn: 'Visual Canvas',
      shortZh: '画布',
      shortEn: 'Canvas',
      descZh: 'HTML/SVG/幻灯片隔离沙盒预览与图钉批注',
      descEn: 'Sandboxed HTML/SVG/Slide preview & pin feedback',
      toolCount: 4,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'mem',
      category: 'workspace',
      nameZh: '记忆图谱',
      nameEn: 'Memory Graph',
      shortZh: '记忆',
      shortEn: 'Memory',
      descZh: 'SHA-256 代码锚定的跨会话长期记忆与漂移告警',
      descEn: 'Code-anchored long-term memory with drift detection',
      toolCount: 3,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'ops',
      category: 'workspace',
      nameZh: '提示词库与体检',
      nameEn: 'Prompt Vault & Budget Doctor',
      shortZh: '运维',
      shortEn: 'Ops',
      descZh: '参数化提示词模板库、工作区资产与存储审计',
      descEn: 'Parameterized prompt vault & workspace rule/tool budget audit',
      toolCount: 3,
      privacy: 'offline',
      defaultEnabled: false,
    }),
    Object.freeze({
      id: 'remote',
      category: 'connectivity',
      nameZh: '手机与 IM 远程',
      nameEn: 'Mobile & IM Remote',
      shortZh: '远程',
      shortEn: 'Remote',
      descZh: '默认彻底关闭；按需开启手机 PWA 或 IM 通知与审批',
      descEn: 'Opt-in mobile PWA & IM webhook alerts / approvals',
      toolCount: 4,
      privacy: 'opt-in-network',
      defaultEnabled: false,
    }),
  ]);

  const NOV_MODULES_MAP = Object.freeze(
    NOV_MODULES_META.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, Object.create(null))
  );

  function buildPresetModulesMap(enabledList) {
    const enabledSet = new Set(enabledList);
    const out = {};
    for (const id of NOV_MODULE_IDS) {
      out[id] = enabledSet.has(id);
    }
    return Object.freeze(out);
  }

  const NOV_PRESETS_META = Object.freeze([
    Object.freeze({
      id: 'minimal',
      nameZh: '极简护盾',
      nameEn: 'Minimal',
      descZh: '仅开启 Guard，最低工具开销 (6 工具)',
      descEn: 'Guard only, minimum tool footprint (6 tools)',
      enabledModules: Object.freeze(['guard']),
      modules: buildPresetModulesMap(['guard']),
      toolCount: 6,
      privacy: 'offline',
    }),
    Object.freeze({
      id: 'core',
      nameZh: '核心默认',
      nameEn: 'Core',
      descZh: 'Review + Guard + X-Ray，100% 本地离线 (12 工具)',
      descEn: 'Review + Guard + X-Ray, 100% offline (12 tools)',
      enabledModules: Object.freeze(['review', 'guard', 'xray']),
      modules: buildPresetModulesMap(['review', 'guard', 'xray']),
      toolCount: 12,
      privacy: 'offline',
    }),
    Object.freeze({
      id: 'power',
      nameZh: '极客日常 9 项',
      nameEn: 'Power',
      descZh: 'Core + Turbo + Radar + Verify + Worktree + Spec + Ops，纯离线工程闭环 (32 工具)',
      descEn: 'Core + Turbo + Radar + Verify + Worktree + Spec + Ops, offline workflow (32 tools)',
      enabledModules: Object.freeze([
        'review',
        'guard',
        'xray',
        'turbo',
        'radar',
        'verify',
        'worktree',
        'spec',
        'ops',
      ]),
      modules: buildPresetModulesMap([
        'review',
        'guard',
        'xray',
        'turbo',
        'radar',
        'verify',
        'worktree',
        'spec',
        'ops',
      ]),
      toolCount: 32,
      privacy: 'offline',
    }),
    Object.freeze({
      id: 'local-all',
      nameZh: '全本地 12 项',
      nameEn: 'Local All',
      descZh: '全部 12 个离线模块含工作区实验室，Remote 零端口 (43 工具)',
      descEn: 'All 12 offline modules incl. Studio, Remote zero ports (43 tools)',
      enabledModules: Object.freeze([
        'review',
        'guard',
        'xray',
        'turbo',
        'radar',
        'verify',
        'worktree',
        'spec',
        'studio',
        'canvas',
        'mem',
        'ops',
      ]),
      modules: buildPresetModulesMap([
        'review',
        'guard',
        'xray',
        'turbo',
        'radar',
        'verify',
        'worktree',
        'spec',
        'studio',
        'canvas',
        'mem',
        'ops',
      ]),
      toolCount: 43,
      privacy: 'offline',
    }),
    Object.freeze({
      id: 'full',
      nameZh: '全套 13 项',
      nameEn: 'Full',
      descZh: '全部 13 个模块含按需联网的 Remote (47 工具)',
      descEn: 'All 13 modules incl. opt-in Remote (47 tools)',
      enabledModules: NOV_MODULE_IDS,
      modules: buildPresetModulesMap(NOV_MODULE_IDS),
      toolCount: 47,
      privacy: 'opt-in-network',
    }),
  ]);

  const NOV_PRESETS_MAP = Object.freeze(
    NOV_PRESETS_META.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, Object.create(null))
  );

  function createDefaultNovModules() {
    const out = {};
    for (const m of NOV_MODULES_META) {
      out[m.id] = Boolean(m.defaultEnabled);
    }
    return out;
  }

  function detectNovPreset(modules) {
    const mods = modules && typeof modules === 'object' ? modules : {};
    for (const preset of NOV_PRESETS_META) {
      if (NOV_MODULE_IDS.every((id) => Boolean(mods[id]) === Boolean(preset.modules[id]))) {
        return preset.id;
      }
    }
    return 'custom';
  }

  function countEnabledNovModules(modules) {
    const mods = modules && typeof modules === 'object' ? modules : {};
    let count = 0;
    for (const id of NOV_MODULE_IDS) {
      if (mods[id]) count += 1;
    }
    return count;
  }

  function countNovModelTools(modules) {
    const mods = modules && typeof modules === 'object' ? modules : {};
    let total = NOV_BASE_TOOL_COUNT;
    for (const m of NOV_MODULES_META) {
      if (mods[m.id]) total += m.toolCount;
    }
    return total;
  }

  function normalizeNovState(raw, fallbackConnected = false) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const installed = Boolean(src.installed);
    const rawCfg = src.config && typeof src.config === 'object' ? src.config : {};
    const rawMods =
      rawCfg.modules && typeof rawCfg.modules === 'object'
        ? rawCfg.modules
        : src.modules && typeof src.modules === 'object'
          ? src.modules
          : {};
    const baseMods = createDefaultNovModules();
    const modules = {};
    for (const id of NOV_MODULE_IDS) {
      modules[id] = typeof rawMods[id] === 'boolean' ? rawMods[id] : baseMods[id];
    }
    const preset =
      typeof rawCfg.preset === 'string' && (NOV_PRESETS_MAP[rawCfg.preset] || rawCfg.preset === 'custom')
        ? rawCfg.preset
        : typeof src.preset === 'string' && (NOV_PRESETS_MAP[src.preset] || src.preset === 'custom')
          ? src.preset
          : detectNovPreset(modules);
    const locale = typeof rawCfg.locale === 'string' && rawCfg.locale ? rawCfg.locale : 'auto';
    const enabledCount = installed ? countEnabledNovModules(modules) : 0;
    const rawToolCount =
      src.toolCount !== undefined && src.toolCount !== null ? src.toolCount : src.enabledToolsCount;
    const toolCount =
      installed
        ? Number.isFinite(Number(rawToolCount)) && Number(rawToolCount) >= NOV_BASE_TOOL_COUNT
          ? Math.round(Number(rawToolCount))
          : countNovModelTools(modules)
        : 0;
    const bridgeConnected =
      typeof src.bridgeConnected === 'boolean' ? src.bridgeConnected : Boolean(fallbackConnected);

    return {
      installed,
      version: typeof src.version === 'string' ? src.version : '',
      dataDir: typeof src.dataDir === 'string' ? src.dataDir : '',
      bridgeConnected,
      enabledCount,
      toolCount,
      updatedAt: typeof rawCfg.updatedAt === 'string' ? rawCfg.updatedAt : typeof src.updatedAt === 'string' ? src.updatedAt : '',
      config: {
        schemaVersion: 1,
        preset,
        modules,
        locale,
        defaultTab: typeof rawCfg.defaultTab === 'string' ? rawCfg.defaultTab : 'review',
      },
    };
  }

  function computeSynergyEffects(sagConfig, novState, options = {}) {
    const sagMods = sagConfig && typeof sagConfig === 'object' && sagConfig.modules && typeof sagConfig.modules === 'object'
      ? sagConfig.modules
      : {};
    const nov = normalizeNovState(novState, Boolean(options.bridgeConnected));
    const novMods = nov.config.modules;
    const bridgeConnected =
      typeof options.bridgeConnected === 'boolean' ? options.bridgeConnected : Boolean(nov.bridgeConnected);

    const effects = [];

    if (!nov.installed) {
      return effects;
    }

    // 1) dual-shield: safeAutoAccept x agy-NOV guard (+ optional verify gate awareness)
    if (Boolean(sagMods.safeAutoAccept)) {
      if (Boolean(novMods.guard)) {
        const verifyActive = Boolean(novMods.verify);
        effects.push({
          id: 'dual-shield',
          status: 'active',
          tone: 'ok',
          verifyActive,
          titleZh: verifyActive ? '三层安全校验护盾已激活' : '双层安全护盾已激活',
          titleEn: verifyActive ? 'Triple-Layer Safety & Verify Shield Active' : 'Dual-Layer Safety Shield Active',
          descZh: verifyActive
            ? '🛡 安全护盾已激活：前端铁壁黑名单 + agy-NOV 后端改前快照 + Verify 校验门'
            : '🛡 双层安全护盾已激活：前端铁壁黑名单 + agy-NOV 后端改前快照',
          descEn: verifyActive
            ? '🛡 Safety shield active: frontend hard-deny + agy-NOV pre-edit snapshots + Verify Gate'
            : '🛡 Dual-layer shield active: frontend hard-deny blacklist + agy-NOV backend pre-edit snapshots',
          quickAction: null,
        });
      } else {
        effects.push({
          id: 'dual-shield',
          status: 'recommend',
          tone: 'warn',
          verifyActive: Boolean(novMods.verify),
          titleZh: '建议开启 agy-NOV 后端快照护盾',
          titleEn: 'Recommend Enabling agy-NOV Guard',
          descZh: '🛡 已开启前端自动审批，建议一键开启 agy-NOV guard 补齐密钥防火墙与改前快照防线',
          descEn: '🛡 Auto-Accept is active. Enable agy-NOV guard for backend secret firewall & pre-edit snapshots',
          quickAction: {
            type: 'enable-nov-module',
            moduleId: 'guard',
            labelZh: '一键开启 agy-NOV guard',
            labelEn: 'Enable agy-NOV guard',
          },
        });
      }
    }

    // 2) context-memory: compactGuard x agy-NOV mem & xray
    if (Boolean(sagMods.compactGuard)) {
      if (Boolean(novMods.mem) && Boolean(novMods.xray)) {
        effects.push({
          id: 'context-memory',
          status: 'active',
          tone: 'ok',
          titleZh: '防爆 × 记忆 × 透视全链路协同',
          titleEn: 'Compact × Memory × X-Ray Full Synergy',
          descZh: '🧠 压缩护航 + 代码锚定记忆 + X-Ray 透视全链路已协同',
          descEn: '🧠 Auto-compact + code-anchored memory + Context X-Ray synced end to end',
          quickAction: null,
        });
      } else if (!novMods.mem) {
        effects.push({
          id: 'context-memory',
          status: 'tip',
          tone: 'info',
          titleZh: '压缩前自动沉淀跨会话记忆',
          titleEn: 'Anchor Decisions Before Compaction',
          descZh: '🧠 建议开启 agy-NOV mem，压缩前自动沉淀跨会话架构决策并锚定代码哈希',
          descEn: '🧠 Enable agy-NOV mem to preserve architectural decisions anchored to code hashes before compacting',
          quickAction: {
            type: 'enable-nov-module',
            moduleId: 'mem',
            labelZh: '一键开启 agy-NOV mem',
            labelEn: 'Enable agy-NOV mem',
          },
        });
      } else if (!novMods.xray) {
        effects.push({
          id: 'context-memory',
          status: 'tip',
          tone: 'info',
          titleZh: '补齐 X-Ray Token 缓存透视',
          titleEn: 'Add X-Ray Token & Cache Analytics',
          descZh: '🧠 建议开启 agy-NOV xray，配合压缩护航实时拆解缓存命中率与高耗工具',
          descEn: '🧠 Enable agy-NOV xray alongside Compact Guard to inspect cache hits and token-heavy tools',
          quickAction: {
            type: 'enable-nov-module',
            moduleId: 'xray',
            labelZh: '一键开启 agy-NOV xray',
            labelEn: 'Enable agy-NOV xray',
          },
        });
      }
    }

    // 3) radar-dedup: sessionRadar x agy-NOV radar
    if (Boolean(sagMods.sessionRadar) && Boolean(novMods.radar)) {
      effects.push({
        id: 'radar-dedup',
        status: 'warn',
        tone: 'warn',
        titleZh: '检测到双侧提醒同时开启',
        titleEn: 'Duplicate Session Alerts Detected',
        descZh: '🔔 检测到 agy-Sag 侧栏聚光与 agy-NOV 多会话雷达同时开启，建议一键关闭重复的侧栏通知保持清爽',
        descEn: '🔔 Both agy-Sag Session Radar and agy-NOV Radar are ON. Disable the duplicate sidebar alert to stay uncluttered',
        quickAction: {
          type: 'disable-sag-module',
          moduleId: 'sessionRadar',
          labelZh: '关闭重复提醒',
          labelEn: 'Disable Duplicate Radar',
        },
      });
    }

    // 4) verify-watchdog: sessionWatchdog x agy-NOV verify (only when both enabled)
    if (Boolean(sagMods.sessionWatchdog) && Boolean(novMods.verify)) {
      effects.push({
        id: 'verify-watchdog',
        status: 'active',
        tone: 'ok',
        titleZh: '看门狗 × Verify 实测闭环',
        titleEn: 'Watchdog × Verify Gate Closed-Loop',
        descZh: '✅ 会话卡死监测 + agy-NOV Stop Verify 实测门禁已形成交付闭环',
        descEn: '✅ Session Watchdog + agy-NOV Stop Verify Gate active for end-to-end delivery checks',
        quickAction: null,
      });
    }

    // 5) spec-queue: promptQueue x agy-NOV spec (only when both enabled)
    if (Boolean(sagMods.promptQueue) && Boolean(novMods.spec)) {
      effects.push({
        id: 'spec-queue',
        status: 'active',
        tone: 'ok',
        titleZh: '提示词排队 × Spec 流程协同',
        titleEn: 'Prompt Queue × Spec Flow Synced',
        descZh: '📐 运行中提示词排队与 agy-NOV Spec 任务图写锁门禁已协同',
        descEn: '📐 Prompt Queue + agy-NOV Spec Flow write-lock DAG active together',
        quickAction: null,
      });
    }

    // 6) dual-star-hub: unified dual-star control plane
    if (bridgeConnected) {
      const enabledModules = NOV_MODULE_IDS.filter((id) => Boolean(novMods[id]));
      const enabledCount = enabledModules.length;
      const totalModules = NOV_MODULE_IDS.length;
      const toolCount = countNovModelTools(novMods);
      const verLabel = nov.version ? ` v${nov.version}` : '';
      effects.push({
        id: 'dual-star-hub',
        status: 'connected',
        tone: 'accent',
        enabledCount,
        totalModules,
        enabledModules,
        toolCount,
        titleZh: '双星统一控制面已连通',
        titleEn: 'Dual-Star Control Hub Connected',
        descZh: `✦ agy-NOV${verLabel} 零端口直连 · 已启用 ${enabledCount}/${totalModules} 模块 · 暴露 ${toolCount} 个模型工具`,
        descEn: `✦ agy-NOV${verLabel} zero-port bridged · ${enabledCount}/${totalModules} modules ON · ${toolCount} model tools exposed`,
        quickAction: null,
      });
    }

    return effects;
  }

  function parseIncomingMessage(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return typeof raw === 'object' ? raw : null;
  }

  function extractStateFromPayload(msg) {
    if (!msg || typeof msg !== 'object') return null;
    if (msg.state && typeof msg.state === 'object') return msg.state;
    if (msg.result && typeof msg.result === 'object') {
      if (msg.result.state && typeof msg.result.state === 'object') return msg.result.state;
      if (typeof msg.result.installed === 'boolean' || msg.result.config) return msg.result;
    }
    if (msg.data && typeof msg.data === 'object') {
      if (msg.data.state && typeof msg.data.state === 'object') return msg.data.state;
      if (typeof msg.data.installed === 'boolean' || msg.data.config) return msg.data;
    }
    if (msg.payload && typeof msg.payload === 'object') {
      if (msg.payload.state && typeof msg.payload.state === 'object') return msg.payload.state;
      if (typeof msg.payload.installed === 'boolean' || msg.payload.config) return msg.payload;
    }
    if (typeof msg.installed === 'boolean' || msg.config) return msg;
    return null;
  }

  function createNovSynergyController(options = {}) {
    const win = options.win || globalRoot;
    const timeoutMs = Math.max(10, Number(options.requestTimeoutMs) || DEFAULT_TIMEOUT_MS);
    const setTimer = typeof options.setTimer === 'function' ? options.setTimer : (fn, ms) => setTimeout(fn, ms);
    const clearTimer = typeof options.clearTimer === 'function' ? options.clearTimer : (t) => clearTimeout(t);
    const novTransport = options.novTransport || null;

    let destroyed = false;
    let reqSeq = 0;
    let bridgeConnected = false;
    let lastError = null;
    let lastUpdatedAt = 0;
    let currentState = normalizeNovState(options.initialState || null, false);
    const normalizeNovFeed = (raw) => {
      const f = raw && typeof raw === 'object' ? raw : {};
      return {
        guard: {
          blockedCount: Math.max(0, Number(f.guard?.blockedCount) || 0),
          askCount: Math.max(0, Number(f.guard?.askCount) || 0),
          forceAskCount: Math.max(0, Number(f.guard?.forceAskCount) || 0),
          permissionMode: typeof f.guard?.permissionMode === 'string' ? f.guard.permissionMode : null,
          snapshotCount: Math.max(0, Number(f.guard?.snapshotCount) || 0),
          latestSnapshotId: typeof f.guard?.latestSnapshotId === 'string' ? f.guard.latestSnapshotId : null,
          latestBlocked: f.guard?.latestBlocked && typeof f.guard.latestBlocked === 'object'
            ? {
                ts: String(f.guard.latestBlocked.ts || ''),
                tool: String(f.guard.latestBlocked.tool || ''),
                decision: String(f.guard.latestBlocked.decision || 'deny'),
                reason: String(f.guard.latestBlocked.reason || ''),
              }
            : null,
        },
        radar: {
          awaitingCount: Math.max(0, Number(f.radar?.awaitingCount) || 0),
          runningCount: Math.max(0, Number(f.radar?.runningCount) || 0),
          headline: String(f.radar?.headline || ''),
        },
        mem: {
          totalCount: Math.max(0, Number(f.mem?.totalCount) || 0),
          driftedCount: Math.max(0, Number(f.mem?.driftedCount) || 0),
        },
        spec: {
          writeLockActive: Boolean(f.spec?.writeLockActive),
          activeSpecId: typeof f.spec?.activeSpecId === 'string' ? f.spec.activeSpecId : null,
          activeSpecTitle: String(f.spec?.activeSpecTitle || ''),
        },
        verify: {
          enforceOnStop: Boolean(f.verify?.enforceOnStop),
          lastStatus: typeof f.verify?.lastStatus === 'string' ? f.verify.lastStatus : null,
          dirtyFilesCount: Math.max(0, Number(f.verify?.dirtyFilesCount) || 0),
        },
        alerts: Array.isArray(f.alerts) ? f.alerts.filter((a) => typeof a === 'string' && a.trim()).slice(0, 4) : [],
      };
    };
    let currentFeed = normalizeNovFeed(options.initialFeed || null);
    const pending = new Map(); // reqId -> { resolve, timer, type }
    const subscribers = new Set();
    let unsubscribeTransport = null;

    if (typeof options.onStateChange === 'function') {
      subscribers.add(options.onStateChange);
    }

    function hasHostBridge() {
      return Boolean(win && typeof win[HOST_BRIDGE_GLOBAL] === 'function');
    }

    function hasTransport() {
      return Boolean(
        novTransport &&
          (typeof novTransport === 'function' ||
            typeof novTransport.request === 'function' ||
            typeof novTransport.send === 'function')
      );
    }

    function isBridgeAvailable() {
      return !destroyed && (hasTransport() || hasHostBridge());
    }

    function notifyStateChange() {
      const snapshot = getState();
      for (const cb of subscribers) {
        try {
          cb(snapshot);
        } catch {}
      }
    }

    function applyIncomingState(rawState, markConnected = true) {
      if (destroyed || !rawState || typeof rawState !== 'object') return currentState;
      if (markConnected) bridgeConnected = true;
      currentState = normalizeNovState(rawState, bridgeConnected);
      lastError = null;
      lastUpdatedAt = typeof options.now === 'function' ? options.now() : Date.now();
      notifyStateChange();
      return currentState;
    }

    function handleResponse(rawMsg) {
      if (destroyed) return false;
      const msg = parseIncomingMessage(rawMsg);
      if (!msg || !msg.reqId) return false;
      const entry = pending.get(String(msg.reqId));
      if (!entry) return false;
      pending.delete(String(msg.reqId));
      try {
        clearTimer(entry.timer);
      } catch {}

      const ok = msg.ok !== false && !msg.error;
      if (!entry.skipStateApply) {
        const stateObj = extractStateFromPayload(msg);
        if (ok && stateObj) {
          applyIncomingState(stateObj, true);
        } else if (ok) {
          bridgeConnected = true;
          currentState = { ...currentState, bridgeConnected: true };
        } else {
          lastError = String(msg.error || 'Bridge request failed');
        }
      }

      entry.resolve({
        ok,
        reqId: String(msg.reqId),
        error: ok ? null : String(msg.error || 'Bridge request failed'),
        state: getState(),
        raw: msg,
      });
      return true;
    }

    function handlePush(rawMsg) {
      if (destroyed) return false;
      const msg = parseIncomingMessage(rawMsg);
      if (!msg) return false;
      const ev = String(msg.event || msg.type || '');
      if (ev === 'nov:feed') {
        const feedObj = msg.feed || msg.data?.feed || null;
        if (feedObj && typeof feedObj === 'object') {
          currentFeed = normalizeNovFeed(feedObj);
          notifyStateChange();
          return true;
        }
      }
      if (ev === 'nov:state' || ev === 'nov:state_changed') {
        const stateObj = extractStateFromPayload(msg);
        if (stateObj) {
          applyIncomingState(stateObj, true);
          return true;
        }
      }
      if (typeof options.onPushEvent === 'function') {
        try {
          if (options.onPushEvent(ev, msg)) return true;
        } catch {}
      }
      return false;
    }

    const receiver = {
      onResponse: handleResponse,
      onPush: handlePush,
    };

    if (win) {
      try {
        win[RECEIVER_GLOBAL] = receiver;
      } catch {}
    }

    if (novTransport && typeof novTransport.subscribe === 'function') {
      try {
        unsubscribeTransport = novTransport.subscribe((pushMsg) => handlePush(pushMsg));
      } catch {}
    }

    function sendRequest(type, payload = {}, opts = {}) {
      if (destroyed) {
        return Promise.resolve({ ok: false, error: 'Controller destroyed', state: getState() });
      }
      if (!isBridgeAvailable()) {
        bridgeConnected = false;
        currentState = { ...currentState, bridgeConnected: false };
        return Promise.resolve({ ok: false, error: 'Bridge unavailable', unavailable: true, state: getState() });
      }

      reqSeq += 1;
      const reqId = `sag-nov-${reqSeq}-${Math.random().toString(36).slice(2, 7)}`;
      const envelope = { reqId, type, payload };
      const skipStateApply = Boolean(opts && opts.rawOnly);

      // Mode A: Injected novTransport (offline workbench & unit tests)
      if (hasTransport()) {
        return new Promise((resolve) => {
          let settled = false;
          const finish = (res) => {
            if (settled) return;
            settled = true;
            pending.delete(reqId);
            try {
              clearTimer(timer);
            } catch {}
            resolve(res);
          };
          const timer = setTimer(() => {
            lastError = 'Bridge request timed out';
            finish({ ok: false, reqId, timedOut: true, error: 'Bridge request timed out', state: getState() });
          }, timeoutMs);
          pending.set(reqId, { resolve: finish, timer, type, skipStateApply });

          try {
            const callPromise =
              typeof novTransport === 'function'
                ? Promise.resolve(novTransport(envelope))
                : typeof novTransport.request === 'function'
                  ? Promise.resolve(novTransport.request(envelope))
                  : Promise.resolve(novTransport.send(envelope));

            callPromise.then(
              (resp) => {
                if (settled || destroyed) return;
                if (resp !== undefined && resp !== null) {
                  const msg = parseIncomingMessage(resp);
                  if (msg && !msg.reqId) msg.reqId = reqId;
                  if (msg) {
                    handleResponse(msg);
                    return;
                  }
                }
              },
              (err) => {
                if (settled || destroyed) return;
                lastError = err?.message || String(err);
                finish({ ok: false, reqId, error: lastError, state: getState() });
              }
            );
          } catch (err) {
            lastError = err?.message || String(err);
            finish({ ok: false, reqId, error: lastError, state: getState() });
          }
        });
      }

      // Mode B: Zero-Port CDP Runtime.addBinding (window.__agSagHostBridge)
      return new Promise((resolve) => {
        const timer = setTimer(() => {
          if (!pending.has(reqId)) return;
          pending.delete(reqId);
          lastError = 'Bridge request timed out';
          resolve({ ok: false, reqId, timedOut: true, error: 'Bridge request timed out', state: getState() });
        }, timeoutMs);
        pending.set(reqId, { resolve, timer, type, skipStateApply });

        try {
          win[HOST_BRIDGE_GLOBAL](JSON.stringify(envelope));
        } catch (err) {
          if (pending.has(reqId)) {
            pending.delete(reqId);
            try {
              clearTimer(timer);
            } catch {}
          }
          lastError = err?.message || String(err);
          resolve({ ok: false, reqId, error: lastError, state: getState() });
        }
      });
    }

    function requestRaw(type, payload = {}) {
      return sendRequest(type, payload, { rawOnly: true });
    }

    function refresh() {
      return sendRequest('nov:get_state', {});
    }

    function setModule(moduleId, enabled) {
      const id = String(moduleId || '').trim();
      if (!NOV_MODULES_MAP[id]) {
        return Promise.resolve({ ok: false, error: `Unknown agy-NOV module: ${id}`, state: getState() });
      }
      return sendRequest('nov:set_module', { moduleId: id, enabled: Boolean(enabled) });
    }

    function applyPreset(preset) {
      const id = String(preset || '').trim().toLowerCase();
      if (!NOV_PRESETS_MAP[id]) {
        return Promise.resolve({ ok: false, error: `Unknown agy-NOV preset: ${id}`, state: getState() });
      }
      return sendRequest('nov:apply_preset', { preset: id });
    }

    function setLocale(locale) {
      const loc = String(locale || 'auto').trim();
      return sendRequest('nov:set_locale', { locale: loc });
    }

    function getState() {
      return {
        ...currentState,
        bridgeConnected,
        config: {
          ...currentState.config,
          modules: { ...currentState.config.modules },
        },
      };
    }

    function getSynergyEffects(sagConfigOverride) {
      const sagCfg =
        sagConfigOverride ||
        (typeof options.getSagConfig === 'function' ? options.getSagConfig() : null) ||
        {};
      return computeSynergyEffects(sagCfg, currentState, { bridgeConnected });
    }

    function onStateChange(fn) {
      if (typeof fn !== 'function') return () => {};
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }

    function getDebugState() {
      return {
        destroyed,
        bridgeAvailable: isBridgeAvailable(),
        bridgeConnected,
        transportMode: hasTransport() ? 'injected' : hasHostBridge() ? 'cdp-binding' : 'none',
        installed: currentState.installed,
        version: currentState.version,
        preset: currentState.config.preset,
        enabledCount: currentState.enabledCount,
        toolCount: currentState.toolCount,
        pendingCount: pending.size,
        lastError,
        lastUpdatedAt,
      };
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const [reqId, entry] of pending.entries()) {
        try {
          clearTimer(entry.timer);
        } catch {}
        try {
          entry.resolve({ ok: false, reqId, error: 'Controller destroyed', state: getState() });
        } catch {}
      }
      pending.clear();
      subscribers.clear();
      if (typeof unsubscribeTransport === 'function') {
        try {
          unsubscribeTransport();
        } catch {}
        unsubscribeTransport = null;
      }
      if (win && win[RECEIVER_GLOBAL] === receiver) {
        try {
          delete win[RECEIVER_GLOBAL];
        } catch {}
      }
    }

    if (options.autoRefresh !== false && isBridgeAvailable()) {
      void refresh();
    }

    async function fetchFeed() {
      if (destroyed || !isBridgeAvailable()) {
        return { ok: false, feed: getFeed(), error: 'Bridge unavailable' };
      }
      try {
        const res = await requestRaw('sag:nov_feed', {});
        const feedObj = res?.raw?.data?.feed || res?.data?.feed || res?.raw?.feed || null;
        if (res?.ok && feedObj && typeof feedObj === 'object') {
          currentFeed = normalizeNovFeed(feedObj);
          notifyStateChange();
          return { ok: true, feed: getFeed(), error: null };
        }
        return { ok: false, feed: getFeed(), error: res?.error || 'Invalid agy-NOV feed response' };
      } catch (err) {
        return { ok: false, feed: getFeed(), error: err?.message || String(err) };
      }
    }

    function getFeed() {
      return {
        guard: {
          ...currentFeed.guard,
          latestBlocked: currentFeed.guard.latestBlocked ? { ...currentFeed.guard.latestBlocked } : null,
        },
        radar: { ...currentFeed.radar },
        mem: { ...currentFeed.mem },
        spec: { ...currentFeed.spec },
        verify: { ...currentFeed.verify },
        alerts: [...(currentFeed.alerts || [])],
      };
    }

    return {
      refresh,
      fetchFeed,
      setModule,
      applyPreset,
      setLocale,
      requestRaw,
      getState,
      getFeed,
      getSynergyEffects,
      isBridgeAvailable,
      isConnected: () => Boolean(!destroyed && bridgeConnected && currentState.installed),
      onStateChange,
      getDebugState,
      destroy,
    };
  }

  return {
    HOST_BRIDGE_GLOBAL,
    RECEIVER_GLOBAL,
    NOV_INSTALL_CMD,
    NOV_BASE_TOOL_COUNT,
    NOV_MODULE_IDS,
    NOV_MODULE_CATEGORY_IDS,
    NOV_MODULE_CATEGORIES,
    NOV_MODULES_META,
    NOV_MODULES_MAP,
    NOV_PRESETS_META,
    NOV_PRESETS_MAP,
    detectNovPreset,
    countEnabledNovModules,
    countNovModelTools,
    normalizeNovState,
    computeSynergyEffects,
    createNovSynergyController,
  };
});
