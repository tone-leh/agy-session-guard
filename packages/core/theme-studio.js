// agy-Sag — Optical Theme, Atmosphere & Motion Studio 2.0 (Zero-:has(), UMD, zero runtime deps)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSagThemeStudio = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const STYLE_ID = 'ag-sag-theme-css';
  const MAX_CUSTOM_CSS_LEN = 8192;
  const STREAM_HL_NAMES = Object.freeze(['ag-sag-sf0', 'ag-sag-sf1', 'ag-sag-sf2', 'ag-sag-sf3', 'ag-sag-sf4']);
  const STREAM_FADE_MS = 280;
  const STREAM_STEP_MS = 56;
  const MAX_FADE_RANGES = 40;

  const THEME_ATTR_KEYS = [
    'data-ag-sag-theme',
    'data-ag-sag-theme-preset',
    'data-ag-sag-theme-resolved',
    'data-ag-sag-theme-scheme',
    'data-ag-sag-theme-density',
    'data-ag-sag-theme-accent',
    'data-ag-sag-theme-corners',
    'data-ag-sag-theme-surface',
    'data-ag-sag-theme-code-font',
    'data-ag-sag-theme-chat-font',
    'data-ag-sag-theme-ligatures',
    'data-ag-sag-theme-glow',
    'data-ag-sag-theme-policy',
    'data-ag-sag-theme-colors',
    'data-ag-sag-theme-cjk',
    'data-ag-sag-theme-sidebar',
    'data-ag-sag-theme-wide',
    'data-ag-sag-conv-state',
    'data-ag-sag-hibernated',
  ];

  const CJK_SANS_STACK =
    '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei UI", "Microsoft YaHei", "WenQuanYi Micro Hei", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const CJK_MONO_STACK =
    '"JetBrains Mono", "SF Mono", "Cascadia Mono", "Fira Code", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", "PingFang SC", "Noto Sans Mono CJK SC", "Microsoft YaHei UI", monospace';

  const mkMap = (rows, fn) => Object.freeze(rows.reduce((a, r) => ((a[r[0]] = Object.freeze(fn(r))), a), {}));
  const CODE_FONT_PRESETS = mkMap([
    ['default', null],
    ['jetbrains', '"JetBrains Mono", "Cascadia Code", "Fira Code", Menlo, Consolas, ui-monospace, monospace'],
    ['cascadia', '"Cascadia Code", "Cascadia Mono", "Fira Code", Consolas, ui-monospace, monospace'],
    ['fira', '"Fira Code", "JetBrains Mono", Menlo, Consolas, ui-monospace, monospace'],
    ['sfmono', '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, ui-monospace, monospace'],
    ['sarasa', '"Sarasa Mono SC", "Sarasa Term SC", "JetBrains Mono", "PingFang SC", "Microsoft YaHei UI", ui-monospace, monospace'],
  ], ([id, stack]) => ({ id, stack }));

  const CHAT_FONT_PRESETS = mkMap([
    ['default', null],
    ['system', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'],
    ['pingfang', '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", -apple-system, BlinkMacSystemFont, sans-serif'],
    ['noto', '"Noto Sans SC", "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", sans-serif'],
    ['serif', '"Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, "Times New Roman", serif'],
  ], ([id, stack]) => ({ id, stack }));

  const CORNER_PRESETS = mkMap([
    ['sharp', '3px', '5px', '8px', '8px', '10px'],
    ['balanced', '6px', '9px', '12px', '14px', '14px'],
    ['soft', '8px', '12px', '16px', '18px', '18px'],
    ['pill', '10px', '15px', '20px', '22px', '22px'],
  ], ([id, sm, md, lg, bubble, input]) => ({ id, sm, md, lg, bubble, input }));

  const SURFACE_PRESETS = mkMap([['clean'], ['smoked'], ['paper'], ['glass']], ([id]) => ({ id }));
  const AMBIENT_GLOW_LEVELS = Object.freeze(['off', 'subtle', 'vivid']);

  const ACCENT_PRESETS = mkMap([
    ['follow', null, null, null],
    ['cobalt', '#3b82f6', ['#669df6', '#081120', '#8ab4f8'], ['#2563eb', '#ffffff', '#1d4ed8']],
    ['iris', '#8b5cf6', ['#a58af8', '#130b26', '#c4b5fd'], ['#7c3aed', '#ffffff', '#6d28d9']],
    ['amber', '#f59e0b', ['#f2b84b', '#14120e', '#fcd34d'], ['#b4502b', '#ffffff', '#9a3f1e']],
    ['emerald', '#10b981', ['#34d399', '#062018', '#6ee7b7'], ['#047857', '#ffffff', '#065f46']],
    ['rose', '#f43f5e', ['#fb7185', '#1c060b', '#fda4af'], ['#e11d48', '#ffffff', '#be123c']],
    ['mono', '#94a3b8', ['#d4d7e0', '#0e0f14', '#e2e8f0'], ['#334155', '#f8fafc', '#1e293b']],
  ], ([id, swatch, d, l]) => ({
    id, swatch,
    dark: d && Object.freeze({ primary: d[0], fg: d[1], link: d[2], ring: d[0] }),
    light: l && Object.freeze({ primary: l[0], fg: l[1], link: l[2], ring: l[0] }),
  }));

  function makeSkin(cfg) {
    const isLight = cfg.colorScheme === 'light';
    const vars = Object.freeze({
      '--background': cfg.bg,
      '--content': cfg.content || cfg.bg,
      '--shell': cfg.bg,
      '--body-background': cfg.bg,
      '--sidebar': cfg.sidebar || cfg.bg,
      '--sidebar-muted': isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.045)',
      '--sidebar-secondary': isLight ? 'rgba(15, 23, 42, 0.085)' : 'rgba(255, 255, 255, 0.075)',
      '--card': cfg.card,
      '--card-border': cfg.cardBorder || cfg.border,
      '--popover': cfg.popover || cfg.card,
      '--foreground': cfg.fg,
      '--card-foreground': cfg.fg,
      '--popover-foreground': cfg.fg,
      '--muted': cfg.muted,
      '--muted-foreground': cfg.mutedFg,
      '--secondary': cfg.secondary || cfg.muted,
      '--secondary-foreground': cfg.secondaryFg || cfg.fg,
      '--placeholder': cfg.mutedFg,
      '--accent': cfg.accent || cfg.secondary || cfg.muted,
      '--accent-foreground': cfg.fg,
      '--primary': cfg.primary,
      '--primary-foreground': cfg.primaryFg,
      '--link': cfg.link || cfg.primary,
      '--border': cfg.border,
      '--input': cfg.input || cfg.border,
      '--ring': cfg.primary,
      '--error': cfg.error || (isLight ? '#dc2626' : '#f87171'),
      '--warning': cfg.warning || (isLight ? '#d97706' : '#fbbf24'),
      '--success': cfg.success || (isLight ? '#059669' : '#34d399'),
      '--scrim': isLight ? 'rgba(15, 23, 42, 0.34)' : 'rgba(6, 8, 12, 0.72)',
      '--vscode-editor-background': cfg.content || cfg.bg,
      '--vscode-sideBar-background': cfg.sidebar || cfg.bg,
      '--vscode-panel-background': cfg.bg,
      '--sdk-color-surface': cfg.card,
      '--sdk-color-canvas': cfg.sidebar || cfg.bg,
      '--sdk-primary': cfg.primary,
      '--sdk-border': cfg.border,
    });
    return Object.freeze({
      id: cfg.id,
      label: cfg.label,
      group: cfg.group,
      colorScheme: cfg.colorScheme,
      pairId: cfg.pairId || null,
      swatches: Object.freeze([cfg.bg, cfg.card, cfg.primary]),
      vars,
    });
  }

  const SKIN_SPECS = [
    // [id, label, group, scheme, pairId, bg, content, sidebar, card, popover, fg, secondaryFg, muted, mutedFg, secondary, accent, primary, primaryFg, link, border, cardBorder, input, extra]
    ['obsidian-prism', 'Obsidian Prism', 'dark', 'dark', 'crystal-day', '#0b0b0e', '#0e0e11', '#09090b', '#141418', '#17181e', '#f2f2f5', '#c4c4ce', '#18181f', '#8a8a98', '#1c1c22', '#23242e', '#669df6', '#081120', '#8ab4f8', 'rgba(218, 228, 255, 0.08)', 'rgba(218, 228, 255, 0.11)', 'rgba(218, 228, 255, 0.16)'],
    ['warm-basalt', 'Warm Basalt', 'dark', 'dark', 'warm-paper', '#141413', '#151412', '#10100f', '#1b1a18', '#201e1b', '#f2efe9', '#cec8bc', '#1f1d1a', '#a39e93', '#22201d', '#2a2621', '#d97757', '#160d09', '#e59377', 'rgba(245, 240, 230, 0.09)', 'rgba(245, 240, 230, 0.12)', 'rgba(245, 240, 230, 0.18)'],
    ['midnight-ink', 'Midnight Ink', 'dark', 'dark', 'crystal-day', '#0b0f17', '#0d1320', '#080c13', '#111827', '#151e30', '#eef2f7', '#e2e8f0', '#182235', '#94a3b8', '#1b263b', '#1f2d47', '#60a5fa', '#08101e', '#93c5fd', 'rgba(148, 163, 184, 0.22)', 'rgba(148, 163, 184, 0.24)', 'rgba(148, 163, 184, 0.28)'],
    ['nord-frost', 'Nord Frost', 'dark', 'dark', 'crystal-day', '#2e3440', '#2e3440', '#262b36', '#3b4252', '#3f4758', '#eceff4', '#e5e9f0', '#434c5e', '#aeb9cc', '#434c5e', '#4c566a', '#88c0d0', '#232831', '#8fbcbb', 'rgba(216, 222, 233, 0.17)', 'rgba(216, 222, 233, 0.20)', 'rgba(216, 222, 233, 0.24)'],
    ['oled-pure', 'OLED Pure', 'dark', 'dark', 'crystal-day', '#000000', '#000000', '#000000', '#0a0a0c', '#101014', '#f5f5f7', '#e5e7eb', '#141418', '#9ca3af', '#16161b', '#1c1c23', '#38bdf8', '#000000', '#7dd3fc', 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.19)', 'rgba(255, 255, 255, 0.22)'],
    ['tokyo-night', 'Tokyo Night', 'dark', 'dark', 'rose-dawn', '#1a1b26', '#1a1b26', '#16161e', '#24283b', '#282d42', '#c0caf5', '#a9b1d6', '#292e42', '#949bbf', '#2f3549', '#363d59', '#7aa2f7', '#15161e', '#bb9af7', 'rgba(192, 202, 245, 0.14)', 'rgba(192, 202, 245, 0.17)', 'rgba(192, 202, 245, 0.22)'],
    ['catppuccin-mocha', 'Catppuccin Mocha', 'dark', 'dark', 'rose-dawn', '#1e1e2e', '#1e1e2e', '#181825', '#262639', '#2c2c42', '#cdd6f4', '#bac2de', '#313244', '#9399b2', '#313244', '#45475a', '#cba6f7', '#11111b', '#89b4fa', 'rgba(205, 214, 244, 0.14)', 'rgba(205, 214, 244, 0.18)', 'rgba(205, 214, 244, 0.22)'],
    ['crystal-day', 'Crystal Day', 'light', 'light', 'obsidian-prism', '#f4f7fb', '#f4f7fb', '#e8eef6', '#ffffff', '#ffffff', '#0f172a', '#334155', '#ecf1f9', '#4b5b73', '#e9eff8', '#e2eaf5', '#2563eb', '#ffffff', '#1d4ed8', 'rgba(15, 23, 42, 0.11)', 'rgba(15, 23, 42, 0.15)', 'rgba(15, 23, 42, 0.18)'],
    ['warm-paper', 'Warm Paper', 'light', 'light', 'warm-basalt', '#f6f4ee', '#f6f4ee', '#ebe6dc', '#ffffff', '#fdfbf6', '#1c1814', '#3f3830', '#f1eee6', '#574f45', '#efece3', '#e7decb', '#b4502b', '#ffffff', '#a34422', 'rgba(42, 32, 20, 0.13)', 'rgba(42, 32, 20, 0.17)', 'rgba(42, 32, 20, 0.22)'],
    ['rose-dawn', 'Rosé Dawn', 'light', 'light', 'catppuccin-mocha', '#faf4ed', '#faf4ed', '#f2e9e1', '#fffaf3', '#fffaf3', '#433e63', '#5a5578', '#f2e9e1', '#655f82', '#eee4db', '#dfdad9', '#b04e62', '#fffaf3', '#963d55', 'rgba(87, 82, 121, 0.14)', 'rgba(87, 82, 121, 0.18)', 'rgba(87, 82, 121, 0.24)'],
    ['matcha-journal', 'Matcha Journal', 'style', 'light', 'pixel-terminal', '#f6f8f3', '#f6f8f3', '#eaf0e5', '#fcfdf9', '#ffffff', '#213729', '#385442', '#edf2e8', '#55705e', '#e5ede0', '#dae6d3', '#437352', '#f8faf6', '#2d4b39', 'rgba(45, 75, 57, 0.16)', 'rgba(45, 75, 57, 0.22)', 'rgba(45, 75, 57, 0.26)', { success: '#3d7a52' }],
    ['phantom-crimson', 'Phantom Crimson', 'style', 'dark', 'doodle-sketch', '#101014', '#121217', '#0a0a0d', '#18181f', '#1d1d26', '#f5f5f5', '#d4d4dc', '#1f1f29', '#9898a8', '#242430', '#2c1720', '#e11d48', '#ffffff', '#fb7185', 'rgba(225, 29, 72, 0.28)', 'rgba(245, 245, 245, 0.14)', 'rgba(225, 29, 72, 0.36)'],
    ['doodle-sketch', 'Doodle Sketch', 'style', 'light', 'phantom-crimson', '#fdfcf7', '#fdfcf7', '#f4f1e6', '#ffffff', '#ffffff', '#202020', '#3d3d3d', '#f3f0e7', '#5c5c5c', '#ece8dc', '#e5e0d2', '#d43544', '#ffffff', '#b82534', 'rgba(32, 32, 32, 0.24)', 'rgba(32, 32, 32, 0.32)', 'rgba(32, 32, 32, 0.34)'],
    ['pixel-terminal', 'Pixel Terminal', 'style', 'dark', 'matcha-journal', '#0e1117', '#10141c', '#090c11', '#151b26', '#19212f', '#e6f5ec', '#b8d8c6', '#1a2330', '#7d9b8c', '#1d2736', '#233142', '#38f28b', '#07140d', '#fbbf24', 'rgba(56, 242, 139, 0.24)', 'rgba(56, 242, 139, 0.30)', 'rgba(56, 242, 139, 0.34)', { warning: '#fbbf24', success: '#38f28b' }],
    ['aurora-glass', 'Aurora Glass', 'style', 'dark', 'crystal-day', '#0b1120', '#0d1528', '#080d1a', '#131d36', '#172340', '#eff6ff', '#cbd5e1', '#192644', '#94a3b8', '#1d2c4f', '#24365f', '#70d6ff', '#061322', '#f472b6', 'rgba(112, 214, 255, 0.22)', 'rgba(244, 114, 182, 0.20)', 'rgba(112, 214, 255, 0.30)'],
  ];

  const THEME_PRESETS = Object.freeze(
    SKIN_SPECS.reduce(
      (acc, r) => {
        const extra = r[22] || {};
        acc[r[0]] = makeSkin({
          id: r[0], label: r[1], group: r[2], colorScheme: r[3], pairId: r[4],
          bg: r[5], content: r[6], sidebar: r[7], card: r[8], popover: r[9],
          fg: r[10], secondaryFg: r[11], muted: r[12], mutedFg: r[13],
          secondary: r[14], accent: r[15], primary: r[16], primaryFg: r[17],
          link: r[18], border: r[19], cardBorder: r[20], input: r[21], ...extra,
        });
        return acc;
      },
      {
        native: Object.freeze({
          id: 'native',
          label: 'Native',
          group: 'native',
          colorScheme: null,
          pairId: null,
          swatches: Object.freeze(['#18181b', '#f4f4f5', '#38bdf8']),
          vars: null,
        }),
      }
    )
  );

  const THEME_GROUPS = Object.freeze([
    Object.freeze({ id: 'dark', ids: Object.freeze(['obsidian-prism', 'warm-basalt', 'midnight-ink', 'nord-frost', 'oled-pure', 'tokyo-night', 'catppuccin-mocha']) }),
    Object.freeze({ id: 'light', ids: Object.freeze(['crystal-day', 'warm-paper', 'rose-dawn']) }),
    Object.freeze({ id: 'style', ids: Object.freeze(['matcha-journal', 'phantom-crimson', 'doodle-sketch', 'pixel-terminal', 'aurora-glass']) }),
  ]);

  const LOOK_ROWS = [
    // [id, sw0, sw1, preset, autoPair, accent, surface, corners, density, codeFont, ligatures, glow]
    ['prism-obsidian', '#0b0b0e', '#669df6', 'obsidian-prism', false, 'follow', 'smoked', 'balanced', 'balanced', 'default', false, 'subtle'],
    ['claude-warm', '#141413', '#d97757', 'warm-basalt', false, 'follow', 'smoked', 'soft', 'balanced', 'default', false, 'subtle'],
    ['daylight-studio', '#f4f7fb', '#2563eb', 'crystal-day', false, 'cobalt', 'smoked', 'balanced', 'balanced', 'default', false, 'subtle'],
    ['matcha-note', '#f6f8f3', '#437352', 'matcha-journal', false, 'emerald', 'paper', 'soft', 'comfortable', 'default', false, 'subtle'],
    ['phantom-pop', '#101014', '#e11d48', 'phantom-crimson', false, 'rose', 'clean', 'sharp', 'compact', 'default', false, 'vivid'],
    ['doodle-ink', '#fdfcf7', '#d43544', 'doodle-sketch', false, 'follow', 'paper', 'sharp', 'balanced', 'default', false, 'off'],
    ['pixel-geek', '#0e1117', '#38f28b', 'pixel-terminal', false, 'emerald', 'clean', 'sharp', 'compact', 'jetbrains', true, 'subtle'],
    ['aurora-liquid', '#0b1120', '#70d6ff', 'aurora-glass', false, 'iris', 'glass', 'pill', 'balanced', 'default', false, 'vivid'],
  ];

  const LOOK_PRESETS = Object.freeze(
    LOOK_ROWS.reduce((acc, r) => {
      acc[r[0]] = Object.freeze({
        id: r[0],
        swatches: Object.freeze([r[1], r[2]]),
        patch: Object.freeze({
          themePreset: r[3],
          themeAutoPair: r[4],
          themeAccent: r[5],
          themeSurface: r[6],
          themeCorners: r[7],
          themeDensity: r[8],
          themeCodeFont: r[9],
          themeCodeLigatures: r[10],
          themeAmbientGlow: r[11],
          themeStreamFade: true,
          themeSmoothCaret: true,
        }),
      });
      return acc;
    }, {})
  );

  function resolveLookPresetPatch(lookId) {
    const key = String(lookId || '').trim().toLowerCase();
    const spec = Object.prototype.hasOwnProperty.call(LOOK_PRESETS, key) ? LOOK_PRESETS[key] : null;
    if (!spec) return null;
    return { ...spec.patch };
  }

  function matchesLookPreset(cfg, lookId) {
    const patch = resolveLookPresetPatch(lookId);
    if (!patch || !cfg || !cfg.modules?.themeStudio) return false;
    return (
      (cfg.themePreset || 'native') === patch.themePreset &&
      Boolean(cfg.themeAutoPair) === Boolean(patch.themeAutoPair) &&
      (cfg.themeAccent || 'follow') === patch.themeAccent &&
      (cfg.themeSurface || 'smoked') === patch.themeSurface &&
      (cfg.themeCorners || 'balanced') === patch.themeCorners &&
      (cfg.themeDensity || 'balanced') === patch.themeDensity &&
      (cfg.themeCodeFont || 'default') === patch.themeCodeFont &&
      Boolean(cfg.themeCodeLigatures) === Boolean(patch.themeCodeLigatures) &&
      (cfg.themeAmbientGlow || 'subtle') === patch.themeAmbientGlow &&
      (cfg.themeStreamFade !== false) === Boolean(patch.themeStreamFade) &&
      (cfg.themeSmoothCaret !== false) === Boolean(patch.themeSmoothCaret)
    );
  }

  const DENSITY_PRESETS = mkMap([
    ['compact', '13.5px', '1.52', '8px', '6px', '10px', '0.5em', '12.5px'],
    ['balanced', '14.5px', '1.66', '14px', '10px', '14px', '0.72em', '13px'],
    ['comfortable', '15.5px', '1.8', '20px', '14px', '18px', '0.95em', '13.5px'],
  ], ([id, fontSize, lineHeight, messageGap, blockPadY, blockPadX, paragraphGap, codeFontSize]) => ({
    id, fontSize, lineHeight, messageGap, blockPadY, blockPadX, paragraphGap, codeFontSize,
  }));

  const DEFAULT_SETTINGS = Object.freeze({
    preset: 'native',
    autoPair: false,
    accent: 'follow',
    corners: 'balanced',
    surface: 'smoked',
    codeFont: 'default',
    chatFont: 'default',
    codeLigatures: false,
    ambientGlow: 'subtle',
    streamFade: true,
    smoothCaret: true,
    cjkFontTuning: true,
    density: 'balanced',
    compactSidebar: false,
    wideReadable: false,
    customCss: '',
    conflictPolicy: 'yield',
  });

  function normalizeSettings(raw = {}, base = DEFAULT_SETTINGS) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const prev = base && typeof base === 'object' ? base : DEFAULT_SETTINGS;
    const pick = (t, k, fb) => {
      const c = src[k] !== undefined ? src[k] : prev[k];
      return Object.prototype.hasOwnProperty.call(t, String(c ?? '')) ? String(c) : fb;
    };
    const bool = (k, defTrue) => (src[k] !== undefined ? Boolean(src[k]) : defTrue ? prev[k] !== false : Boolean(prev[k]));
    const glowCand = src.ambientGlow !== undefined ? String(src.ambientGlow) : prev.ambientGlow;
    const policyCand = src.conflictPolicy !== undefined ? String(src.conflictPolicy) : prev.conflictPolicy;
    return {
      preset: pick(THEME_PRESETS, 'preset', 'native'),
      autoPair: bool('autoPair'),
      accent: pick(ACCENT_PRESETS, 'accent', 'follow'),
      corners: pick(CORNER_PRESETS, 'corners', 'balanced'),
      surface: pick(SURFACE_PRESETS, 'surface', 'smoked'),
      codeFont: pick(CODE_FONT_PRESETS, 'codeFont', 'default'),
      chatFont: pick(CHAT_FONT_PRESETS, 'chatFont', 'default'),
      codeLigatures: bool('codeLigatures'),
      ambientGlow: AMBIENT_GLOW_LEVELS.includes(glowCand) ? glowCand : 'subtle',
      streamFade: bool('streamFade', true),
      smoothCaret: bool('smoothCaret', true),
      cjkFontTuning: bool('cjkFontTuning'),
      density: pick(DENSITY_PRESETS, 'density', 'balanced'),
      compactSidebar: bool('compactSidebar'),
      wideReadable: bool('wideReadable'),
      customCss: src.customCss !== undefined ? String(src.customCss ?? '') : String(prev.customCss ?? ''),
      conflictPolicy: policyCand === 'takeover' ? 'takeover' : 'yield',
    };
  }

  function detectHostColorScheme(doc, win) {
    const html = doc?.documentElement;
    const body = doc?.body;
    const attrTheme = String(html?.getAttribute?.('data-theme') || html?.getAttribute?.('data-color-scheme') || '').toLowerCase();
    if (attrTheme === 'light') return 'light';
    if (attrTheme === 'dark') return 'dark';
    const cls = `${html?.className || ''} ${body?.className || ''}`.toLowerCase();
    if (/\b(?:theme-light|light-theme|light)\b/.test(cls) && !/\b(?:theme-dark|dark-theme|dark)\b/.test(cls)) {
      return 'light';
    }
    if (/\b(?:theme-dark|dark-theme|dark)\b/.test(cls)) {
      return 'dark';
    }
    try {
      if (typeof win?.matchMedia === 'function') {
        if (win.matchMedia('(prefers-color-scheme: light)')?.matches) return 'light';
        if (win.matchMedia('(prefers-color-scheme: dark)')?.matches) return 'dark';
      }
    } catch {}
    return 'dark';
  }

  function resolveEffectivePreset(presetId, autoPair = true, hostScheme = 'dark') {
    const baseSpec = THEME_PRESETS[presetId] || THEME_PRESETS.native;
    if (!baseSpec || !baseSpec.vars || !autoPair || !baseSpec.pairId) return baseSpec;
    if (hostScheme && baseSpec.colorScheme && baseSpec.colorScheme !== hostScheme) {
      const paired = THEME_PRESETS[baseSpec.pairId];
      if (paired && paired.vars && paired.colorScheme === hostScheme) return paired;
    }
    return baseSpec;
  }

  const MAX_SANITIZE_PASSES = 8;
  const SAFE_LOCAL_URL_RE = /^#[A-Za-z0-9_-]+$/;
  const SAFE_DATA_IMAGE_URL_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/i;

  function findMatchingParen(str, openIdx) {
    let depth = 1;
    let quote = null;
    for (let i = openIdx + 1; i < str.length; i += 1) {
      const ch = str[i];
      if (quote) {
        if (ch === '\\') {
          i += 1;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  function findUnclosedCallEnd(str, startIdx, stopAtOpenBrace = false) {
    for (let i = startIdx; i < str.length; i += 1) {
      const ch = str[i];
      if (ch === ';' || ch === '}' || ch === '\n' || (stopAtOpenBrace && ch === '{')) {
        return i;
      }
    }
    return str.length;
  }

  function replaceCssCall(css, headRegex, replacer, { checkIdentBefore = true, stopAtOpenBrace = false } = {}) {
    headRegex.lastIndex = 0;
    let out = '';
    let cursor = 0;
    let match;

    while ((match = headRegex.exec(css)) !== null) {
      const start = match.index;
      if (start < cursor) continue;
      if (checkIdentBefore && start > 0 && /[A-Za-z0-9_-]/.test(css[start - 1])) {
        continue;
      }
      const openIdx = start + match[0].length - 1;
      const closeIdx = findMatchingParen(css, openIdx);
      if (closeIdx !== -1) {
        const full = css.slice(start, closeIdx + 1);
        const inner = css.slice(openIdx + 1, closeIdx);
        out += css.slice(cursor, start) + replacer(full, inner, true);
        cursor = closeIdx + 1;
        headRegex.lastIndex = cursor;
      } else {
        const endIdx = findUnclosedCallEnd(css, openIdx + 1, stopAtOpenBrace);
        const full = css.slice(start, endIdx);
        const inner = css.slice(openIdx + 1, endIdx);
        out += css.slice(cursor, start) + replacer(full, inner, false);
        cursor = endIdx;
        headRegex.lastIndex = cursor;
      }
    }

    if (cursor === 0) return css;
    return out + css.slice(cursor);
  }

  function isSafeUrlInner(inner) {
    const trimmed = String(inner || '').trim();
    if (!trimmed) return false;
    let unquoted = trimmed;
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
    ) {
      const quote = trimmed[0];
      unquoted = trimmed.slice(1, -1).trim();
      if (unquoted.includes(quote)) return false;
    } else if (/[\s"'()]/.test(unquoted)) {
      return false;
    }
    return SAFE_LOCAL_URL_RE.test(unquoted) || SAFE_DATA_IMAGE_URL_RE.test(unquoted);
  }

  function sanitizeImageSetCalls(css) {
    return replaceCssCall(css, /(?:-(?:webkit|moz|o|ms)-)?image-set\s*\(/gi, (full, inner, closed) => {
      if (!closed) return '';
      let hasUnsafeUrl = false;
      const remainder = replaceCssCall(inner, /\burl\s*\(/gi, (_uFull, uInner, uClosed) => {
        if (!uClosed || !isSafeUrlInner(uInner)) {
          hasUnsafeUrl = true;
          return '';
        }
        return ' ';
      });
      if (hasUnsafeUrl) return '';
      if (
        /["']/.test(remainder) ||
        /(?:https?:|\/\/|ftp:|file:|javascript:|vbscript:|data:)/i.test(remainder) ||
        /\b(?:url|image-set)\s*\(/i.test(remainder)
      ) {
        return '';
      }
      return full;
    });
  }

  function sanitizeUrlCalls(css) {
    return replaceCssCall(css, /\burl\s*\(/gi, (full, inner, closed) => {
      if (!closed) return '';
      return isSafeUrlInner(inner) ? full : '';
    });
  }

  function stripHasRules(css) {
    const hasRe = /:has\s*\(/gi;
    let out = css;
    for (let g = 0; g < 128; g += 1) {
      hasRe.lastIndex = 0;
      const m = hasRe.exec(out);
      if (!m) break;
      let s = 0;
      let bp = 0;
      let bq = null;
      for (let i = m.index - 1; i >= 0; i -= 1) {
        const ch = out[i];
        if (bq) { if (ch === bq && out[i - 1] !== '\\') bq = null; continue; }
        if (ch === '"' || ch === "'") { bq = ch; continue; }
        if (ch === ')') { bp += 1; continue; }
        if (ch === '(') { if (bp > 0) bp -= 1; continue; }
        if (bp === 0 && (ch === '{' || ch === '}' || ch === ';')) { s = i + 1; break; }
      }
      const op = m.index + m[0].length - 1;
      const cp = findMatchingParen(out, op);
      let e = out.length;
      let q = null;
      let bd = 0;
      let inBlk = false;
      for (let i = cp !== -1 ? cp + 1 : op + 1; i < out.length; i += 1) {
        const ch = out[i];
        if (q) { if (ch === '\\') { i += 1; continue; } if (ch === q) q = null; continue; }
        if (ch === '"' || ch === "'") { q = ch; continue; }
        if (ch === '{') { bd += 1; inBlk = true; continue; }
        if (ch === '}') {
          if (inBlk) { if (--bd <= 0) { e = i + 1; break; } }
          else { e = i; break; }
        } else if (!inBlk && ch === ';') { e = i + 1; break; }
      }
      out = out.slice(0, s) + out.slice(e);
    }
    return out;
  }

  function sanitizeCssSinglePass(input) {
    let css = input;

    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const openComment = css.indexOf('/*');
    if (openComment !== -1) css = css.slice(0, openComment);

    css = css.replace(/\\\n/g, '');
    css = css.replace(/\\([0-9a-fA-F]{1,6})[ \t\n\f]?/g, (m, hex) => {
      const cp = parseInt(hex, 16);
      if (cp === 0) return '';
      if (cp === 0x09 || cp === 0x0a || cp === 0x0c || cp === 0x0d) return ' ';
      if (cp >= 0x20 && cp <= 0x7e) return String.fromCharCode(cp);
      return m;
    });
    css = css.replace(/\\([^\n\r\f0-9a-fA-F])/g, '$1');

    for (let t = 0; t < 4; t += 1) {
      const prevTag = css;
      css = css
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
        .replace(/<\s*\/?\s*(?:script|style|iframe|object|embed|svg|link|meta|base)\b[^>]*>?/gi, '');
      if (css === prevTag) break;
    }
    css = css.replace(/</g, '');

    css = css.replace(
      /@\s*(?:import|charset|namespace)\b(?:(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^;{}\n])*)(?:;|\n|(?=\{)|$)/gi,
      ''
    );
    css = replaceCssCall(css, /\bexpression\s*\(/gi, () => '');
    css = css.replace(/(^|[^A-Za-z0-9_-])(?:-moz-binding|behavior)\s*:[^;}\n]*/gi, '$1');

    css = sanitizeImageSetCalls(css);
    css = sanitizeUrlCalls(css);
    css = stripHasRules(css);

    return css;
  }

  function sanitizeCustomCss(raw) {
    if (raw === null || raw === undefined) return '';
    let css = String(raw).replace(/\u0000/g, '').replace(/\r\n?/g, '\n');

    if (css.length > MAX_CUSTOM_CSS_LEN * 8) {
      css = css.slice(0, MAX_CUSTOM_CSS_LEN * 8);
    }

    let converged = false;
    for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass += 1) {
      const next = sanitizeCssSinglePass(css);
      if (next === css) {
        converged = true;
        break;
      }
      css = next;
    }
    if (!converged) return '';

    css = css.trim();
    if (css.length > MAX_CUSTOM_CSS_LEN) {
      css = css.slice(0, MAX_CUSTOM_CSS_LEN).trimEnd();
      for (let pass = 0; pass < 3; pass += 1) {
        const next = sanitizeCssSinglePass(css);
        if (next === css) break;
        css = next;
      }
      css = css.trim();
    }

    if (
      css.includes('<') ||
      /@\s*(?:import|charset|namespace)\b/i.test(css) ||
      /:has\s*\(/i.test(css) ||
      /(?:^|[^A-Za-z0-9_-])expression\s*\(/i.test(css)
    ) {
      return '';
    }

    return css;
  }

  function detectPrismTheme(doc) {
    const html = doc?.documentElement;
    if (!html) return false;
    if (typeof html.hasAttribute === 'function') {
      return Boolean(html.hasAttribute('data-ag-cs-style'));
    }
    if (typeof html.getAttribute === 'function') {
      const val = html.getAttribute('data-ag-cs-style');
      return val !== null && val !== undefined;
    }
    return false;
  }

  const CONV_AWAITING_SEL =
    '[data-testid="interaction-takeover-card"], [data-testid="permission-card"], [data-testid="tool-approval-card"]';
  const CONV_ERROR_SEL = '[data-testid="agent-error"], [role="alert"][data-error="true"]';
  const CONV_STREAMING_SEL =
    '[data-testid="agent-input-box"] [data-testid="input-cancel-button"], [data-testid="agent-input-box"] [data-testid="stop-button"], [data-testid="stop-button"], [data-testid="cancel-button"]';

  function isVisibleHostSignal(el, winRef = null) {
    if (!el) return false;
    let cur = el;
    let depth = 0;
    const gcs = typeof winRef?.getComputedStyle === 'function' ? winRef.getComputedStyle.bind(winRef) : null;
    while (cur && cur.nodeType === 1 && depth < 24) {
      if (cur.hidden === true) return false;
      if (
        typeof cur.hasAttribute === 'function'
          ? cur.hasAttribute('hidden')
          : cur.getAttribute?.('hidden') !== null && cur.getAttribute?.('hidden') !== undefined
      ) {
        return false;
      }
      if (cur.getAttribute?.('aria-hidden') === 'true') return false;
      if (cur.style?.display === 'none' || cur.style?.visibility === 'hidden') return false;
      if (gcs) {
        try {
          const cs = gcs(cur);
          if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
        } catch {}
      }
      if (cur.getAttribute?.('data-ag-sag-owned') === '1' || cur.getAttribute?.('data-ag-sg-owned') === '1') return false;
      cur = cur.parentElement || null;
      depth += 1;
    }
    return true;
  }

  function hasVisibleHostSignal(doc, selector, winRef = null) {
    if (!doc) return false;
    const effWin = winRef || doc.defaultView || null;
    if (typeof doc.querySelectorAll === 'function') {
      const nodes = doc.querySelectorAll(selector) || [];
      for (let i = 0; i < nodes.length; i += 1) {
        if (isVisibleHostSignal(nodes[i], effWin)) return true;
      }
      return false;
    }
    if (typeof doc.querySelector === 'function') {
      return isVisibleHostSignal(doc.querySelector(selector), effWin);
    }
    return false;
  }

  function detectConvStateFromDom(doc, opts = {}) {
    const winRef = opts?.win || doc?.defaultView || null;
    if (hasVisibleHostSignal(doc, CONV_AWAITING_SEL, winRef)) return 'awaiting';
    if (hasVisibleHostSignal(doc, CONV_ERROR_SEL, winRef)) return 'error';
    if (opts && typeof opts.streaming === 'boolean') {
      return opts.streaming ? 'running' : 'idle';
    }
    if (hasVisibleHostSignal(doc, CONV_STREAMING_SEL, winRef)) return 'running';
    return 'idle';
  }

  function resolveAccentOverrides(accentId, scheme) {
    const spec = ACCENT_PRESETS[accentId];
    if (!spec || !spec.dark) return null;
    return scheme === 'light' ? spec.light : spec.dark;
  }

  function buildEffectiveVars(presetSpec, accentId, hostScheme) {
    const scheme = presetSpec?.colorScheme || hostScheme || 'dark';
    const base = presetSpec?.vars ? { ...presetSpec.vars } : null;
    const acc = resolveAccentOverrides(accentId, scheme);
    if (!base && !acc) return null;
    const out = base || {};
    if (acc) {
      out['--primary'] = acc.primary;
      out['--primary-foreground'] = acc.fg;
      out['--link'] = acc.link;
      out['--ring'] = acc.ring;
      out['--sdk-primary'] = acc.primary;
      out['--sag-accent'] = acc.primary;
    }
    if (out['--primary']) {
      out['--sag-theme-accent'] = out['--primary'];
    }
    return out;
  }

  function buildThemeCss(cfg = {}) {
    const settings = normalizeSettings(cfg, DEFAULT_SETTINGS);
    const prismDetected = Boolean(cfg && cfg.prismDetected);
    const hostScheme = cfg?.hostScheme || 'dark';
    const presetSpec = resolveEffectivePreset(settings.preset, settings.autoPair, hostScheme);
    const effectiveScheme = presetSpec?.colorScheme || hostScheme || 'dark';
    const densitySpec = DENSITY_PRESETS[settings.density] || DENSITY_PRESETS.balanced;
    const cornerSpec = CORNER_PRESETS[settings.corners] || CORNER_PRESETS.balanced;
    const codeFontSpec = CODE_FONT_PRESETS[settings.codeFont] || CODE_FONT_PRESETS.default;
    const chatFontSpec = CHAT_FONT_PRESETS[settings.chatFont] || CHAT_FONT_PRESETS.default;
    const colorsYielded = Boolean(prismDetected && settings.conflictPolicy === 'yield');
    const effVars = colorsYielded ? null : buildEffectiveVars(presetSpec, settings.accent, effectiveScheme);
    const applyColors = Boolean(effVars);
    const isNonNativeSkin = Boolean(!colorsYielded && presetSpec && presetSpec.id !== 'native' && presetSpec.vars);

    const blocks = [];
    const H = 'html[data-ag-sag-theme="1"]';
    const HC = `${H}[data-ag-sag-theme-colors="active"]`;
    const dt = (k) => `[data-testid="${k}"]`;
    const cm = (a, p, b = 'transparent') => `color-mix(in srgb,${a} ${p}%,${b})`;
    const mi = (p, s = '') => `${p} ${dt('agent-input-box')}:not([data-testid*="floating"]):not([data-testid*="sidebar"])${s}`;
    const miEx = (p, s = '') =>
      `${p} aside ${dt('agent-input-box')}${s},${p} ${dt('sidebar')} ${dt('agent-input-box')}${s},${p} ${dt('conversation-list-sidebar')} ${dt('agent-input-box')}${s}`;

    const I = '!important', nb = ':not([data-has-browser-hole="true"])', bd = 'var(--border)', pr = 'var(--primary)', cb = `var(--card-border,${bd})`, bg = 'var(--background)', fg = 'var(--foreground)', sb = `var(--sag-sidebar,var(--sidebar,${bg}))`, cd = 'var(--card)', bc = 'background-color';
    if (applyColors) {
      const sel =
        settings.conflictPolicy === 'takeover'
          ? `${H}[data-ag-sag-theme-policy="takeover"],${H}[data-ag-sag-theme-policy="takeover"]>body,:root[data-ag-sag-theme="1"][data-ag-sag-theme-policy="takeover"]`
          : `${HC},${HC}>body,:root[data-ag-sag-theme="1"][data-ag-sag-theme-colors="active"]`;
      const decls = presetSpec?.colorScheme ? [`color-scheme:${presetSpec.colorScheme}${I};`] : [];
      for (const [k, v] of Object.entries(effVars)) decls.push(`${k}:${v}${I};`);
      if (effVars['--sidebar']) decls.push(`--sag-sidebar:${effVars['--sidebar']}${I};`);
      if (isNonNativeSkin) {
        decls.push(`--shell-canvas:${sb}${I};--glass:var(--popover,${cd})${I};--glass-border:${cb}${I};--home-glow:transparent${I};--onyx-frame:${sb}${I};--onyx-well:var(--content,${bg})${I};--onyx-raised:${cd}${I};`);
      }
      blocks.push(`${sel}{${decls.join('')}}`);
      blocks.push(
        `${HC} :is(body,.agy-shell,.agy-sheet,.agy-inset-shell,.bg-background)${nb}{${bc}:${bg}${I};color:${fg}${I};}` +
          `${HC} :is(body,[data-has-browser-hole="true"])[data-has-browser-hole="true"]{${bc}:transparent${I};background-image:none${I};}` +
          `${HC} :is(aside,${dt('sidebar')},.bg-sidebar)${nb}{--sidebar:${sb}${I};${bc}:${sb}${I};color:${fg};}` +
          `${HC} :is(.bg-card,.bg-popover,[role="dialog"]:not(.agy-overlay))${nb}{${bc}:${cd}${I};color:${fg}${I};border-color:${cb}${I};}` +
          `${HC} [role="dialog"]:not(.agy-overlay) :is(nav,aside,.bg-sidebar){--sidebar:${sb}${I};${bc}:${sb}${I};border-color:${bd}${I};}` +
          `${HC} ${dt('conversation-view')}${nb}{${bc}:var(--content,${bg})${I};color:${fg};}` +
          `${['auxiliary-pane', 'subagents-panel', 'background-tasks-panel', 'files-changed-panel', 'terminal-panel'].map((k) => `${HC} ${dt(k)}`).join(',')}{${bc}:var(--sag-sidebar,var(--sidebar,var(--card,${bg})))${I};border-color:${bd}${I};}`
      );
      if (settings.surface === 'clean') {
        blocks.push(
          `${HC} ${dt('user-message-bubble')},${mi(HC)}{${bc}:${cd}${I};color:${fg}${I};border-color:${cb}${I};}${miEx(HC)}{${bc}:revert${I};border-color:revert${I};}`
        );
      }
    }

    if (isNonNativeSkin) {
      blocks.push(
        `${HC} ${dt('titlebar')},${HC} .titlebar{${bc}:${sb}${I};border-bottom:1px solid ${bd}${I};}` +
          `${HC} ${dt('conversation-row-sidebar')}[data-active="1"],${HC} ${dt('conversation-row-sidebar')}[aria-current="page"]{${bc}:${cm(`var(--sag-theme-accent,${pr})`, 12, 'var(--sidebar-secondary,transparent)')}${I};box-shadow:inset 2.5px 0 0 var(--sag-theme-accent,${pr});border-radius:var(--ag-sag-r-sm,6px);}` +
          `${HC} ${dt('artifact-view')}{${bc}:var(--card,${bg})${I};border:1px solid ${cb}${I};border-radius:var(--ag-sag-r-lg,12px);}` +
          `${HC} .monaco-editor{${bc}:var(--vscode-editor-background,var(--content,${bg}))${I};border:1px solid ${bd}${I};border-radius:var(--ag-sag-r-md,9px);overflow:hidden;}` +
          `${HC} .xterm{${bc}:var(--sidebar,var(--card,${bg}))${I};border:1px solid ${bd}${I};border-radius:var(--ag-sag-r-md,9px);padding:4px;}`
      );
    }

    blocks.push(
      `${H}{--ag-sag-r-sm:${cornerSpec.sm};--ag-sag-r-md:${cornerSpec.md};--ag-sag-r-lg:${cornerSpec.lg};--ag-sag-r-bubble:${cornerSpec.bubble};--ag-sag-r-input:${cornerSpec.input};}` +
        `${H} ${dt('user-message-bubble')}{border-radius:var(--ag-sag-r-bubble);}${mi(H)}{border-radius:var(--ag-sag-r-input);}${miEx(H)}{border-radius:revert;}` +
        `${['conversation-view', 'auxiliary-pane', 'terminal-panel'].map((k) => `${H} ${dt(k)} pre`).join(',')}{border-radius:var(--ag-sag-r-md);}`
    );

    if (settings.surface === 'smoked' && !colorsYielded) {
      const S = `${H}[data-ag-sag-theme-surface="smoked"]`;
      const isL = effectiveScheme === 'light';
      const specHi = isL ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.08)';
      const sh = isL ? '0 1px 3px rgba(15,23,42,0.06),0 8px 24px -8px rgba(30,58,138,0.10)' : 'inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px -10px rgba(0,0,0,0.48)';
      const bbg = isL ? cm(cd, 92, `${pr} 8%`) : cm(cd, 94, '#fff 6%');
      blocks.push(
        `${S} ${dt('user-message-bubble')}{${bc}:${bbg}${I};color:${fg}${I};border:1px solid ${cb}${I};box-shadow:${sh};padding:10px 15px;}` +
          `${mi(S)}{${bc}:${cd}${I};color:${fg}${I};border:1px solid ${cb}${I};box-shadow:inset 0 1px 0 ${specHi},${sh};transition:border-color 140ms ease,box-shadow 140ms ease;}` +
          `${mi(S, ':focus-within')}{border-color:${cm(pr, 54, bd)}${I};box-shadow:0 0 0 2px ${cm(pr, 18)},${sh};}` +
          `${miEx(S)}{${bc}:revert${I};border:revert${I};box-shadow:revert;transition:revert;}${miEx(S, ':focus-within')}{border-color:revert${I};box-shadow:revert;}` +
          `${S} ${dt('thinking-collapsible-trigger')}{background:transparent;border:0;border-left:2px solid ${cm(pr, 42)};padding-left:8px;color:var(--muted-foreground);}` +
          `${S} ${dt('changed-files-card')},${S} ${dt('artifact-view')}{border:1px solid ${cb};border-radius:var(--ag-sag-r-lg);box-shadow:${sh};}` +
          `${S} ${dt('auxiliary-pane')},${S} ${dt('terminal-panel')}{border-left:1px solid ${cb};}` +
          `${S} ::selection{${bc}:${cm(pr, 26)};}`
      );
    } else if (settings.surface === 'paper' && !colorsYielded) {
      const S = `${H}[data-ag-sag-theme-surface="paper"]`;
      blocks.push(
        `${S} ${dt('user-message-bubble')}{${bc}:${cd}${I};color:${fg}${I};border:1.5px solid ${cb}${I};box-shadow:2px 2px 0 ${cm(fg, 12)};padding:10px 15px;}` +
          `${mi(S)}{${bc}:${cd}${I};color:${fg}${I};border:1.5px solid ${cb}${I};box-shadow:0 2px 0 ${cm(fg, 10)};}${miEx(S)}{${bc}:revert${I};border:revert${I};box-shadow:revert;}` +
          `${S} ${dt('thinking-collapsible-trigger')}{border-left:2px dashed ${cm(pr, 55)};padding-left:8px;}`
      );
    } else if (settings.surface === 'glass' && !colorsYielded) {
      const S = `${H}[data-ag-sag-theme-surface="glass"]`;
      const gl = isNonNativeSkin
        ? `${S} [role="dialog"],${S} .ag-sg-status-card,${S} .ag-sag-drawer{background:${cm(`var(--popover,${cd})`, 82)}${I};backdrop-filter:blur(14px) saturate(1.15);-webkit-backdrop-filter:blur(14px) saturate(1.15);}`
        : '';
      blocks.push(
        `${S} ${dt('user-message-bubble')}{background:linear-gradient(145deg,${cm(cd, 82, `${pr} 18%`)},${cm(cd, 92)})${I};color:${fg}${I};border:1px solid ${cm(pr, 34, bd)}${I};box-shadow:inset 0 1px 0 rgba(255,255,255,0.22),0 10px 28px -12px ${cm(pr, 32, 'rgba(0,0,0,0.45)')};padding:10px 15px;}` +
          `${mi(S)}{background:${cm(cd, 88)}${I};color:${fg}${I};border:1px solid ${cm(pr, 36, bd)}${I};box-shadow:inset 0 1px 0 rgba(255,255,255,0.20),0 12px 32px -12px ${cm(pr, 26, 'rgba(0,0,0,0.4)')};}${miEx(S)}{background:revert${I};border:revert${I};box-shadow:revert;}` +
          gl
      );
    }

    const cv = dt('conversation-view'), ub = dt('user-message-bubble'), ar = dt('agent-response'), prt = dt('planner-response-text'), sbT = ['pre', 'aside', cv, dt('auxiliary-pane')];
    blocks.push(
      `${sbT.map((x) => `${H} ${x}::-webkit-scrollbar`).join(',')}{width:6px;height:6px;}` +
        `${sbT.map((x) => `${H} ${x}::-webkit-scrollbar-thumb`).join(',')}{background:${cm('var(--foreground,#94a3b8)', 20)};border-radius:999px;}`
    );

    const monoStack = codeFontSpec.stack || (settings.cjkFontTuning ? CJK_MONO_STACK : null);
    if (settings.cjkFontTuning) {
      const C = `${H}[data-ag-sag-theme-cjk="1"]`;
      blocks.push(
        `${C}{--ag-sag-font-sans:${CJK_SANS_STACK};--font-sans:${CJK_SANS_STACK};}${C} body,${C} ${cv}{font-family:var(--ag-sag-font-sans);text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;}`
      );
    }
    if (chatFontSpec.stack) {
      const CF = `${H}[data-ag-sag-theme-chat-font="${chatFontSpec.id}"]`;
      blocks.push(
        `${CF}{--ag-sag-chat-font:${chatFontSpec.stack};}${[cv, ub, ar, prt].map((k) => `${CF} ${k}`).join(',')}{font-family:var(--ag-sag-chat-font);}`
      );
    }
    if (monoStack || settings.codeLigatures) {
      const fvl = settings.codeLigatures ? 'contextual common-ligatures' : 'none';
      const ffs = settings.codeLigatures ? '"calt" 1, "liga" 1' : '"calt" 0, "liga" 0';
      blocks.push(
        `${monoStack ? `${H}{--ag-sag-font-mono:${monoStack};--font-mono:${monoStack};}` : ''}${H} pre,${H} code,${H} kbd,${H} samp{${monoStack ? 'font-family:var(--ag-sag-font-mono);' : ''}font-variant-ligatures:${fvl};font-feature-settings:${ffs};}`
      );
    }

    blocks.push(
      `${H}{--ag-sag-font-size:${densitySpec.fontSize};--ag-sag-line-height:${densitySpec.lineHeight};--ag-sag-message-gap:${densitySpec.messageGap};--ag-sag-block-pad-y:${densitySpec.blockPadY};--ag-sag-block-pad-x:${densitySpec.blockPadX};--ag-sag-paragraph-gap:${densitySpec.paragraphGap};--ag-sag-code-font-size:${densitySpec.codeFontSize};}` +
        `${H} ${cv}{gap:var(--ag-sag-message-gap);}` +
        `${[ub, ar, prt].map((k) => `${H} ${k}`).join(',')}{font-size:var(--ag-sag-font-size);line-height:var(--ag-sag-line-height);padding-top:var(--ag-sag-block-pad-y);padding-bottom:var(--ag-sag-block-pad-y);}` +
        `${H} ${ar} p,${H} ${prt} p{margin-bottom:var(--ag-sag-paragraph-gap);}` +
        `${H} ${cv} pre code{font-size:var(--ag-sag-code-font-size);}`
    );

    const p38 = 'var(--primary,#38bdf8)';
    if (settings.ambientGlow !== 'off' && !colorsYielded) {
      const m = settings.ambientGlow === 'vivid' ? 0.24 : 0.13;
      const dual = (c1, c2) => `radial-gradient(58% 100% at 36% 100%,${c1},transparent 70%),radial-gradient(54% 92% at 68% 100%,${c2},transparent 74%)`;
      const glSt = (st, f, c1, c2) => `${H}[data-ag-sag-conv-state="${st}"] .ag-sag-ambient-glow{opacity:${(m * f).toFixed(2)};background:${dual(c1, c2)};}`;
      const wn = 'var(--warning,#fbbf24)', er = 'var(--error,#f87171)', ok = 'var(--success,#34d399)';
      blocks.push(
        `.ag-sag-ambient-glow{position:fixed;left:0;right:0;bottom:0;height:92px;pointer-events:none;z-index:2;opacity:0;transition:opacity 360ms ease;}` +
          glSt('running', 1.15, p38, 'var(--link,#8ab4f8)') +
          glSt('awaiting', 1.25, wn, cm(wn, 62, p38)) +
          glSt('error', 1.3, er, cm(er, 58, wn)) +
          glSt('completed', 1.05, ok, cm(ok, 55, p38)) +
          `${H}[data-ag-sag-hibernated="1"] .ag-sag-ambient-glow{opacity:0${I};transition:none${I};}` +
          `${H} body[data-has-browser-hole="true"] .ag-sag-ambient-glow{display:none${I};}@media (prefers-reduced-motion:reduce){.ag-sag-ambient-glow{transition:none;}}`
      );
    }

    if (settings.streamFade && !colorsYielded) {
      blocks.push([20, 40, 62, 82, 94].map((p, i) => `::highlight(ag-sag-sf${i}){color:${cm('currentColor', p)};}`).join(''));
    }

    if (settings.smoothCaret && !colorsYielded) {
      blocks.push(
        `[data-ag-sag-smooth-caret="1"]{caret-color:transparent${I};}` +
          `.ag-sag-smooth-caret{position:fixed;top:0;left:0;width:2px;border-radius:999px;pointer-events:none;z-index:2147483040;background:${p38};box-shadow:0 0 8px ${cm(p38, 55)};opacity:0;transition:transform 75ms cubic-bezier(0.22,1,0.36,1),height 75ms ease,opacity 110ms ease;}` +
          `.ag-sag-smooth-caret[data-visible="1"]{opacity:1;will-change:transform,height,opacity;}@media (prefers-reduced-motion:reduce){.ag-sag-smooth-caret{transition:none;}}`
      );
    }

    if (settings.compactSidebar) {
      const B = `${H}[data-ag-sag-theme-sidebar="1"]`, cl = dt('conversation-list');
      blocks.push(
        `${B} aside a,${B} ${dt('sidebar')} a,${B} ${cl} li,${B} ${cl} a{min-height:28px;padding-top:3px;padding-bottom:3px;line-height:1.3;}${B} ${cl}{gap:2px;}`
      );
    }

    if (settings.wideReadable) {
      const W = `${H}[data-ag-sag-theme-wide="1"]`;
      blocks.push(
        `${W} ${cv},${W} ${ar},${W} ${prt},${W} ${cv} .prose{max-width:min(1180px, 94%);}`
      );
    }

    const safeCustom = sanitizeCustomCss(settings.customCss);
    if (safeCustom) {
      blocks.push(`/* ag-sag-custom-css */\n${safeCustom}`);
    }

    return blocks.join('\n\n') + '\n';
  }

  const resolveDep = (k, p) => (globalRoot?.[k] || (typeof require === 'function' ? (() => { try { return require(p); } catch { return null; } })() : null));
  const AUX_SEL =
    '[data-testid="sidebar"],[data-testid="conversation-list-sidebar"],[data-testid="side-question-panel"],[data-testid*="floating-composer"],[data-testid*="sidebar-composer"],[data-testid*="side-panel-floating"]';

  function createThemeStudioController(options = {}) {
    const win = options.win || globalRoot || null;
    const doc = options.doc || win?.document || null;
    const coexist = options.coexist || resolveDep('__agSgCoexist', './coexist.js');
    const ctxSrc = options.contextSource || resolveDep('__agSgContextSource', './context-source.js');

    let enabled = Boolean(options.enabled === true);
    let destroyed = false;
    let winBlurred = false;
    let winFocusOff = null;
    let settings = normalizeSettings(options, DEFAULT_SETTINGS);

    const isHibernated = () =>
      coexist?.isWindowHibernated ? coexist.isWindowHibernated(doc, win, winBlurred) : Boolean(winBlurred || doc?.hidden || doc?.documentElement?.getAttribute?.('data-ag-cs-win-blur') === '1');
    const markOwned = (el) => {
      if (!el?.setAttribute) return el;
      if (coexist?.markOwnedNoTranslate) return coexist.markOwnedNoTranslate(el);
      el.setAttribute('data-ag-sg-owned', '1');
      el.setAttribute('data-ag-sag-owned', '1');
      el.setAttribute('data-ag-no-i18n', '1');
      return el;
    };
    const safeAppend = (p, n) => (coexist?.safeAppendChild ? coexist.safeAppendChild(p, n) : Boolean(p?.appendChild && (() => { try { p.appendChild(n); return true; } catch { return false; } })()));
    const safeRemove = (n) => (coexist?.safeRemoveNode ? coexist.safeRemoveNode(n) : Boolean(n?.remove && (() => { try { n.remove(); return true; } catch { return false; } })()));
    const isAuxEditor = (el) => Boolean(el && (ctxSrc?.isSidebarOrAuxiliaryNode ? ctxSrc.isSidebarOrAuxiliaryNode(el) : el.closest?.(AUX_SEL)));
    let styleEl = null;
    let lastCss = '';
    let lastPrismDetected = false;
    let lastColorsYielded = false;
    let lastSurfaceYielded = false;
    let lastSyncedFrames = 0;
    let lastResolvedPreset = settings.preset;
    let lastConvState = 'idle';
    let externalConvStateSource = Boolean(options.externalConvStateSource);

    // Standalone throttled fallback conv-state detector (active only when compactGuard is off)
    let convObserver = null;
    let convBusOff = null;
    let convThrottleTimer = null;
    const convThrottleMs = Math.max(20, Number(options.convStateThrottleMs) || 160);

    // Velvet Stream Feathering state (CSS.highlights)
    let streamObserver = null;
    let hlBuckets = null;
    let fadeTimer = null;
    const fadeItems = [];
    const textLenMap = new WeakMap();

    // FastDOM Smooth Caret state (body-mounted fixed overlay)
    let caretActive = false;
    let caretRaf = 0;
    let caretComposing = false;
    let caretListenersOff = [];
    let caretEl = null;

    // Dedicated ambient glow node
    let glowEl = null;

    // Extension iframe sync state
    const frameLoadCleanups = new Map(); // iframe -> cleanup fn
    let lastFramePayload = null;

    // Host color-scheme watcher (matchMedia + HtmlAttrBus)
    let mediaQuery = null;
    let mediaListener = null;
    let schemeObserver = null;
    let schemeAttrOff = null;
    let schemeRaf = 0;
    let lastObservedHostScheme = null;

    function syncHibernatedAttr() {
      const html = doc?.documentElement;
      if (!html) return;
      if (enabled && !destroyed && isHibernated()) html.setAttribute?.('data-ag-sag-hibernated', '1');
      else html.removeAttribute?.('data-ag-sag-hibernated');
    }

    function bindWindowFocusWatcher() {
      if (winFocusOff) return;
      const offs = [];
      const onBlur = () => {
        winBlurred = true;
        syncHibernatedAttr();
        clearStreamFade();
        if (caretActive) scheduleCaretUpdate();
      };
      const onFocus = () => {
        winBlurred = false;
        syncHibernatedAttr();
        if (caretActive) scheduleCaretUpdate();
      };
      const onVis = () => {
        syncHibernatedAttr();
        if (isHibernated()) clearStreamFade();
        if (caretActive) scheduleCaretUpdate();
      };
      if (typeof doc?.addEventListener === 'function') {
        doc.addEventListener('visibilitychange', onVis);
        offs.push(() => doc.removeEventListener?.('visibilitychange', onVis));
      }
      if (typeof win?.addEventListener === 'function') {
        win.addEventListener('blur', onBlur);
        win.addEventListener('focus', onFocus);
        offs.push(() => win.removeEventListener?.('blur', onBlur));
        offs.push(() => win.removeEventListener?.('focus', onFocus));
      }
      winFocusOff = () => {
        while (offs.length) {
          try { offs.pop()(); } catch {}
        }
      };
    }

    function unbindWindowFocusWatcher() {
      if (winFocusOff) {
        try { winFocusOff(); } catch {}
        winFocusOff = null;
      }
      winBlurred = false;
    }

    function prefersReducedMotion() {
      try {
        return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
      } catch {
        return false;
      }
    }

    // --- Velvet Stream Feathering (CSS.highlights) ---
    function getHighlightBuckets() {
      const cssObj = win?.CSS || (typeof CSS !== 'undefined' ? CSS : null);
      const HlCtor = win?.Highlight || (typeof Highlight === 'function' ? Highlight : null);
      if (!cssObj?.highlights?.set || typeof HlCtor !== 'function' || typeof doc?.createRange !== 'function') {
        return null;
      }
      if (!hlBuckets) {
        hlBuckets = STREAM_HL_NAMES.map((name) => {
          const existing = cssObj.highlights.get?.(name);
          const h = existing || new HlCtor();
          cssObj.highlights.set(name, h);
          return h;
        });
      }
      return hlBuckets;
    }

    function clearStreamFade() {
      if (fadeTimer) {
        clearTimeout(fadeTimer);
        fadeTimer = null;
      }
      if (hlBuckets) {
        for (let i = 0; i < fadeItems.length; i += 1) {
          const it = fadeItems[i];
          if (it.b >= 0 && it.b < hlBuckets.length) {
            try { hlBuckets[it.b].delete(it.r); } catch {}
          }
        }
      }
      fadeItems.length = 0;
    }

    function teardownStreamFade() {
      clearStreamFade();
      if (streamObserver) {
        try { streamObserver.disconnect(); } catch {}
        streamObserver = null;
      }
      const cssObj = win?.CSS || (typeof CSS !== 'undefined' ? CSS : null);
      if (cssObj?.highlights?.delete) {
        for (const name of STREAM_HL_NAMES) {
          try { cssObj.highlights.delete(name); } catch {}
        }
      }
      hlBuckets = null;
    }

    function stepStreamFade() {
      fadeTimer = null;
      if (destroyed || !enabled || !settings.streamFade || lastSurfaceYielded || isHibernated() || fadeItems.length === 0) {
        clearStreamFade();
        return;
      }
      const buckets = getHighlightBuckets();
      if (!buckets) {
        clearStreamFade();
        return;
      }
      const now = Date.now();
      let writeIdx = 0;
      for (let i = 0; i < fadeItems.length; i += 1) {
        const it = fadeItems[i];
        const age = Math.max(0, now - it.t);
        const val = it.n ? String(it.n.nodeValue ?? it.n.data ?? '') : '';
        if (it.n?.isConnected === false || val.length < it.e || age >= STREAM_FADE_MS) {
          if (it.b >= 0 && it.b < buckets.length) {
            try { buckets[it.b].delete(it.r); } catch {}
          }
          continue;
        }
        const nextBucket = Math.min(buckets.length - 1, Math.floor(age / STREAM_STEP_MS));
        if (nextBucket !== it.b) {
          if (it.b >= 0 && it.b < buckets.length) {
            try { buckets[it.b].delete(it.r); } catch {}
          }
          try {
            buckets[nextBucket].add(it.r);
            it.b = nextBucket;
          } catch {
            continue;
          }
        }
        fadeItems[writeIdx++] = it;
      }
      fadeItems.length = writeIdx;
      if (writeIdx > 0) {
        fadeTimer = setTimeout(stepStreamFade, STREAM_STEP_MS);
        fadeTimer?.unref?.();
      }
    }

    function enqueueStreamRange(textNode, startOffset, endOffset) {
      if (!textNode || endOffset <= startOffset || prefersReducedMotion() || lastSurfaceYielded || isHibernated()) return false;
      const buckets = getHighlightBuckets();
      if (!buckets) return false;
      try {
        const range = doc.createRange();
        range.setStart(textNode, startOffset);
        range.setEnd(textNode, endOffset);
        if (fadeItems.length >= MAX_FADE_RANGES) {
          const old = fadeItems.shift();
          if (old && old.b >= 0 && old.b < buckets.length) {
            try { buckets[old.b].delete(old.r); } catch {}
          }
        }
        buckets[0].add(range);
        fadeItems.push({ n: textNode, r: range, e: endOffset, b: 0, t: Date.now() });
        if (!fadeTimer) {
          fadeTimer = setTimeout(stepStreamFade, STREAM_STEP_MS);
          fadeTimer?.unref?.();
        }
        return true;
      } catch {
        return false;
      }
    }

    function isInsideAgentResponse(node) {
      const el = node?.nodeType === 3 ? node.parentElement : node;
      if (!el || typeof el.closest !== 'function') return false;
      if (el.closest('pre, code, .katex, math, mjx-container, .MathJax, [data-ag-sag-owned="1"], [data-ag-sg-owned="1"]')) return false;
      return Boolean(el.closest('[data-testid="agent-response"], [data-testid="planner-response-text"]'));
    }

    function collectTextNodes(node, out, limit = 16) {
      if (!node || out.length >= limit) return;
      if (node.nodeType === 3) {
        if (isInsideAgentResponse(node)) out.push(node);
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = String(node.tagName || '').toUpperCase();
      if (
        tag === 'PRE' ||
        tag === 'CODE' ||
        tag === 'SCRIPT' ||
        tag === 'STYLE' ||
        tag === 'SVG' ||
        tag === 'MATH' ||
        tag === 'MJX-CONTAINER'
      ) {
        return;
      }
      if (node.classList?.contains?.('katex') || node.classList?.contains?.('MathJax')) return;
      if (node.getAttribute?.('data-ag-sag-owned') === '1' || node.getAttribute?.('data-ag-sg-owned') === '1') return;
      const kids = node.childNodes || node.children || [];
      for (let i = 0; i < kids.length && out.length < limit; i += 1) {
        collectTextNodes(kids[i], out, limit);
      }
    }

    function syncStreamFade(surfaceYielded = lastSurfaceYielded) {
      const shouldRun = Boolean(enabled && !destroyed && settings.streamFade && !surfaceYielded && !prefersReducedMotion() && doc?.body);
      if (!shouldRun) {
        teardownStreamFade();
        return;
      }
      if (streamObserver || typeof win?.MutationObserver !== 'function') return;
      streamObserver = new win.MutationObserver((records) => {
        if (destroyed || !enabled || !settings.streamFade || lastSurfaceYielded || isHibernated()) return;
        if (coexist?.isMutationOwnedOnly?.(records)) return;
        const pending = [];
        let batchChars = 0;
        for (const rec of records || []) {
          if (rec.type === 'characterData' && rec.target?.nodeType === 3) {
            const tn = rec.target;
            if (!isInsideAgentResponse(tn)) continue;
            const curLen = String(tn.nodeValue ?? tn.data ?? '').length;
            const prevLen = textLenMap.get(tn) ?? 0;
            textLenMap.set(tn, curLen);
            if (curLen > prevLen) {
              batchChars += curLen - prevLen;
              pending.push([tn, prevLen, curLen]);
            }
          } else if (rec.type === 'childList' && rec.addedNodes?.length) {
            const found = [];
            for (const added of rec.addedNodes) {
              collectTextNodes(added, found, 16);
              if (found.length >= 16) break;
            }
            for (const tn of found) {
              const len = String(tn.nodeValue ?? tn.data ?? '').length;
              textLenMap.set(tn, len);
              if (len > 0) {
                batchChars += len;
                pending.push([tn, 0, len]);
              }
            }
          }
        }
        // Skip bulk session switches / history hydration (>800 chars or >12 nodes in one mutation turn)
        if (pending.length === 0 || pending.length > 12 || batchChars > 800) return;
        for (let i = 0; i < pending.length; i += 1) {
          enqueueStreamRange(pending[i][0], pending[i][1], pending[i][2]);
        }
      });
      try {
        streamObserver.observe(doc.body, { childList: true, subtree: true, characterData: true });
      } catch {}
    }

    // --- Dedicated 0fps Ambient Glow Node ---
    function removeAmbientGlow() {
      safeRemove(glowEl);
      glowEl = null;
      if (doc && typeof doc.querySelectorAll === 'function') {
        try { doc.querySelectorAll('.ag-sag-ambient-glow').forEach((n) => safeRemove(n)); } catch {}
      }
    }

    function syncAmbientGlow(colorsYielded) {
      const shouldMount = Boolean(enabled && !destroyed && settings.ambientGlow !== 'off' && !colorsYielded && doc?.body);
      if (!shouldMount) {
        removeAmbientGlow();
        return;
      }
      if (glowEl && glowEl.parentElement === doc.body) return;
      const existing = doc.querySelector?.('.ag-sag-ambient-glow');
      if (existing) {
        glowEl = existing;
        return;
      }
      if (typeof doc.createElement !== 'function') return;
      const el = doc.createElement('div');
      el.className = 'ag-sag-ambient-glow';
      el.setAttribute('aria-hidden', 'true');
      markOwned(el);
      safeAppend(doc.body, el);
      glowEl = el;
    }

    // --- FastDOM Smooth Typing Caret (body-mounted fixed overlay, zero host intrusion) ---
    function teardownSmoothCaret() {
      caretActive = false;
      caretComposing = false;
      if (caretRaf && typeof win?.cancelAnimationFrame === 'function') {
        try { win.cancelAnimationFrame(caretRaf); } catch {}
      }
      caretRaf = 0;
      while (caretListenersOff.length) {
        try { caretListenersOff.pop()(); } catch {}
      }
      safeRemove(caretEl);
      caretEl = null;
      if (!doc || typeof doc.querySelectorAll !== 'function') return;
      try {
        doc.querySelectorAll('.ag-sag-smooth-caret').forEach((n) => safeRemove(n));
        doc.querySelectorAll('[data-ag-sag-smooth-caret]').forEach((n) => n.removeAttribute?.('data-ag-sag-smooth-caret'));
        doc.querySelectorAll('[data-ag-sag-caret-host]').forEach((n) => n.removeAttribute?.('data-ag-sag-caret-host'));
      } catch {}
    }

    function measureCollapsedRangeRect(range, ed, edRect) {
      const rects = typeof range.getClientRects === 'function' ? range.getClientRects() : [];
      const r0 = rects && rects.length ? rects[rects.length - 1] : range.getBoundingClientRect?.();
      if (r0 && r0.height > 0 && (r0.left > 0 || r0.top > 0)) {
        return { left: r0.left, top: r0.top, height: r0.height };
      }
      // Lexical empty line / <br> / <p> fallback before padding estimate
      const sc = range.startContainer;
      const so = Number(range.startOffset) || 0;
      if (sc?.nodeName === 'BR' && typeof sc.getBoundingClientRect === 'function') {
        const br = sc.getBoundingClientRect();
        if (br && br.height > 0) return { left: br.left, top: br.top, height: br.height };
      }
      if (sc && sc.nodeType === 1) {
        const kids = sc.childNodes || sc.children || [];
        const at = kids[so];
        if (at?.nodeName === 'BR' && typeof at.getBoundingClientRect === 'function') {
          const br = at.getBoundingClientRect();
          if (br && br.height > 0) return { left: br.left, top: br.top, height: br.height };
        }
        const prev = so > 0 ? kids[so - 1] : null;
        if (prev?.nodeName === 'BR' && typeof prev.getBoundingClientRect === 'function') {
          const br = prev.getBoundingClientRect();
          if (br && br.height > 0) {
            const scRect = typeof sc.getBoundingClientRect === 'function' ? sc.getBoundingClientRect() : null;
            const isSolo = kids.length === 1 || Boolean(prev.hasAttribute?.('data-lexical-managed-linebreak'));
            return {
              left: scRect && scRect.left > 0 ? scRect.left : br.left,
              top: isSolo ? br.top : br.bottom,
              height: br.height,
            };
          }
        }
        if (sc !== ed && typeof sc.getBoundingClientRect === 'function') {
          const sr = sc.getBoundingClientRect();
          if (sr && sr.height > 0 && (sr.left > 0 || sr.top > 0)) {
            return { left: sr.left, top: sr.top, height: Math.min(28, sr.height) };
          }
        }
      }
      const cs = typeof win?.getComputedStyle === 'function' ? win.getComputedStyle(ed) : null;
      const padL = parseFloat(cs?.paddingLeft || '8') || 8;
      const padT = parseFloat(cs?.paddingTop || '8') || 8;
      const fontSize = parseFloat(cs?.fontSize || '14') || 14;
      const lineH = parseFloat(cs?.lineHeight || '') || Math.round(fontSize * 1.35);
      return {
        left: edRect.left + padL,
        top: edRect.top + padT,
        height: Math.max(14, Math.min(28, lineH)),
      };
    }

    function isFocusInControlledEditor() {
      const act = doc?.activeElement;
      if (!act || act === doc?.body || act === doc?.documentElement || isAuxEditor(act)) return false;
      const ed =
        act.getAttribute?.('contenteditable') === 'true'
          ? act
          : act.closest?.('[contenteditable="true"]') || null;
      if (!ed || isAuxEditor(ed)) return false;
      return Boolean(ed.closest?.('[data-testid="agent-input-box"]'));
    }

    function measureAndPaintCaret() {
      caretRaf = 0;
      if (destroyed || !enabled || !settings.smoothCaret || lastSurfaceYielded || !doc) return;
      const editors = Array.from(
        doc.querySelectorAll?.('[data-testid="agent-input-box"] [contenteditable="true"]') || []
      ).filter((ed) => !isAuxEditor(ed));
      if (!editors.length) {
        if (caretEl) caretEl.removeAttribute?.('data-visible');
        return;
      }
      const windowFocused = !isHibernated() && (typeof doc.hasFocus !== 'function' || doc.hasFocus() !== false);
      const activeEl = doc.activeElement;
      const sel = typeof doc.getSelection === 'function' ? doc.getSelection() : null;
      const dpr = Math.max(1, Math.min(4, Number(win?.devicePixelRatio) || 1));
      const snap = (v) => Math.round((Number(v) || 0) * dpr) / dpr;

      // Measure phase (batch reads, viewport coordinates for body-mounted fixed overlay)
      let activePlan = null;
      for (const ed of editors) {
        const focused = windowFocused && (activeEl === ed || Boolean(activeEl && ed.contains?.(activeEl)));
        if (caretComposing || !focused || !sel || sel.rangeCount <= 0) continue;
        const range = typeof sel.getRangeAt === 'function' ? sel.getRangeAt(0) : null;
        if (!range || !range.collapsed || (ed.contains && !ed.contains(range.startContainer))) continue;
        const edRect = ed.getBoundingClientRect?.();
        if (!edRect) continue;
        const box = measureCollapsedRangeRect(range, ed, edRect);
        const height = Math.max(14, Math.min(28, Number(box.height) || 18));
        const outOfView =
          box.top < edRect.top - 4 ||
          box.top + height > edRect.bottom + 6 ||
          box.left < edRect.left - 4 ||
          box.left > edRect.right + 4;
        if (outOfView) continue;
        activePlan = {
          ed,
          x: snap(box.left),
          y: snap(box.top),
          h: snap(height),
        };
        break;
      }

      // Mutate phase (batch writes, zero intrusion into editor parentElement)
      for (const ed of editors) {
        if (!activePlan || ed !== activePlan.ed) {
          ed.removeAttribute?.('data-ag-sag-smooth-caret');
        }
      }
      if (!activePlan) {
        if (caretEl) caretEl.removeAttribute?.('data-visible');
        return;
      }
      const mountHost = doc.body || doc.documentElement;
      if (!mountHost) return;
      if (!caretEl || caretEl.parentElement !== mountHost) {
        caretEl = mountHost.querySelector?.('.ag-sag-smooth-caret') || null;
        if (!caretEl && typeof doc.createElement === 'function') {
          caretEl = doc.createElement('div');
          caretEl.className = 'ag-sag-smooth-caret';
          caretEl.setAttribute('aria-hidden', 'true');
          markOwned(caretEl);
          safeAppend(mountHost, caretEl);
        }
      }
      if (!caretEl) return;
      activePlan.ed.setAttribute?.('data-ag-sag-smooth-caret', '1');
      caretEl.setAttribute?.('data-visible', '1');
      if (caretEl.style) {
        caretEl.style.transform = `translate3d(${activePlan.x}px, ${activePlan.y}px, 0)`;
        caretEl.style.height = `${activePlan.h}px`;
      }
    }

    function scheduleCaretUpdate() {
      if (destroyed || !enabled || !settings.smoothCaret || lastSurfaceYielded || caretRaf) return;
      if (typeof win?.requestAnimationFrame === 'function') {
        caretRaf = win.requestAnimationFrame(measureAndPaintCaret);
      } else {
        measureAndPaintCaret();
      }
    }

    function syncSmoothCaret(surfaceYielded = lastSurfaceYielded) {
      const shouldRun = Boolean(enabled && !destroyed && settings.smoothCaret && !surfaceYielded && !prefersReducedMotion() && doc);
      if (!shouldRun) {
        teardownSmoothCaret();
        return;
      }
      if (caretActive) {
        scheduleCaretUpdate();
        return;
      }
      caretActive = true;
      const bind = (target, ev, fn, cap = false) => {
        if (!target || typeof target.addEventListener !== 'function') return;
        target.addEventListener(ev, fn, cap);
        caretListenersOff.push(() => target.removeEventListener(ev, fn, cap));
      };
      const onCompStart = () => {
        caretComposing = true;
        scheduleCaretUpdate();
      };
      const onCompEnd = () => {
        caretComposing = false;
        scheduleCaretUpdate();
      };
      const onScroll = () => {
        if (isFocusInControlledEditor()) scheduleCaretUpdate();
      };
      bind(doc, 'selectionchange', scheduleCaretUpdate, false);
      bind(doc, 'input', scheduleCaretUpdate, true);
      bind(doc, 'keyup', scheduleCaretUpdate, true);
      bind(doc, 'scroll', onScroll, true);
      bind(doc, 'focusin', scheduleCaretUpdate, true);
      bind(doc, 'focusout', scheduleCaretUpdate, true);
      bind(doc, 'compositionstart', onCompStart, true);
      bind(doc, 'compositionend', onCompEnd, true);
      bind(win, 'resize', scheduleCaretUpdate, false);
      if (win?.visualViewport) bind(win.visualViewport, 'resize', scheduleCaretUpdate, false);
      scheduleCaretUpdate();
    }

    // --- Extension iframe sync ---
    function isAllowedExtensionFrame(iframe) {
      if (!iframe) return false;
      const src = String(iframe.getAttribute?.('src') || iframe.src || '').trim();
      if (!src || src === 'about:blank') {
        return Boolean(
          iframe.hasAttribute?.('data-ag-nov-frame') ||
            iframe.hasAttribute?.('data-plugin-frame') ||
            String(iframe.getAttribute?.('name') || '').toLowerCase().includes('plugin')
        );
      }
      return /^(?:plugin|vscode-webview|antigravity-plugin|app):\/\//i.test(src) || /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(src);
    }

    function resolveFrameTargetOrigin(iframe) {
      const src = String(iframe?.getAttribute?.('src') || iframe?.src || '').trim();
      if (!src || src === 'about:blank') {
        try {
          const o = String(win?.location?.origin || '');
          if (o && o !== 'null' && /^https?:\/\//i.test(o)) return o;
        } catch {}
        return '*';
      }
      try {
        const u = new URL(src);
        if ((u.protocol === 'http:' || u.protocol === 'https:') && u.origin && u.origin !== 'null') return u.origin;
      } catch {}
      return '*';
    }

    function teardownFrameListeners() {
      for (const off of frameLoadCleanups.values()) { try { off(); } catch {} }
      frameLoadCleanups.clear();
      lastFramePayload = null;
    }

    function postToAllowedFrame(f, payload) {
      if (!f || !payload || !isAllowedExtensionFrame(f)) return false;
      try {
        if (typeof f.contentWindow?.postMessage === 'function') {
          f.contentWindow.postMessage(payload, resolveFrameTargetOrigin(f));
          return true;
        }
      } catch {}
      return false;
    }

    function syncExtensionFrames(presetSpec, colorsState, effVars) {
      if (!doc || typeof doc.querySelectorAll !== 'function') { lastSyncedFrames = 0; return 0; }
      for (const [f, off] of frameLoadCleanups.entries()) {
        if (f?.isConnected === false) { try { off(); } catch {} frameLoadCleanups.delete(f); }
      }
      let count = 0;
      const payload = {
        type: 'ag-sag:theme-sync',
        enabled: Boolean(enabled && !destroyed),
        preset: presetSpec?.id || settings.preset,
        mode: presetSpec?.colorScheme || 'inherit',
        colorsState,
        vars: colorsState === 'active' && effVars ? { ...effVars } : null,
      };
      lastFramePayload = payload;
      for (const f of Array.from(doc.querySelectorAll('iframe') || [])) {
        if (!isAllowedExtensionFrame(f)) continue;
        if (enabled && !destroyed && !frameLoadCleanups.has(f) && typeof f.addEventListener === 'function') {
          const onLoad = () => { if (!destroyed && enabled && lastFramePayload) postToAllowedFrame(f, lastFramePayload); };
          try {
            f.addEventListener('load', onLoad);
            frameLoadCleanups.set(f, () => { try { f.removeEventListener?.('load', onLoad); } catch {} });
          } catch {}
        }
        if (postToAllowedFrame(f, payload)) count += 1;
      }
      lastSyncedFrames = count;
      return count;
    }

    function clearHtmlAttributes() {
      const html = doc?.documentElement;
      if (!html) return;
      for (const key of THEME_ATTR_KEYS) {
        try { html.removeAttribute?.(key); } catch {}
      }
      if (html.attributes && typeof html.attributes.length === 'number') {
        const names = [];
        for (let i = 0; i < html.attributes.length; i++) {
          const name = html.attributes[i]?.name;
          if (name && (name.startsWith('data-ag-sag-theme') || name === 'data-ag-sag-conv-state')) names.push(name);
        }
        for (const name of names) {
          try { html.removeAttribute?.(name); } catch {}
        }
      }
    }

    function removeStyleElement() {
      safeRemove(styleEl);
      styleEl = null;
      if (doc && typeof doc.getElementById === 'function') {
        try {
          const existing = doc.getElementById(STYLE_ID);
          if (existing) safeRemove(existing);
        } catch {}
      }
      lastCss = '';
    }

    function ensureStyleElement() {
      if (!doc) return null;
      if (styleEl && styleEl.parentElement) return styleEl;
      if (typeof doc.getElementById === 'function') {
        const existing = doc.getElementById(STYLE_ID);
        if (existing) {
          styleEl = existing;
          return styleEl;
        }
      }
      if (typeof doc.createElement !== 'function') return null;
      const el = doc.createElement('style');
      el.id = STYLE_ID;
      el.setAttribute?.('id', STYLE_ID);
      markOwned(el);
      const host = doc.head || doc.documentElement || doc.body;
      if (!host || !safeAppend(host, el)) return null;
      styleEl = el;
      return styleEl;
    }

    function bindSchemeWatcher() {
      if (!mediaListener && typeof win?.matchMedia === 'function') {
        try {
          mediaQuery = win.matchMedia('(prefers-color-scheme: light)');
          mediaListener = () => {
            if (!destroyed && enabled && settings.autoPair) sync();
          };
          mediaQuery.addEventListener?.('change', mediaListener);
        } catch {}
      }
      if (!schemeAttrOff && !schemeObserver && doc?.documentElement) {
        try {
          lastObservedHostScheme = detectHostColorScheme(doc, win);
          let schemeInFlight = false;
          let schemeQueued = false;
          const runSchemeCheck = () => {
            if (destroyed || !enabled) return;
            if (schemeInFlight) {
              schemeQueued = true;
              return;
            }
            schemeInFlight = true;
            try {
              syncHibernatedAttr();
              if (isHibernated()) {
                clearStreamFade();
                if (caretActive) scheduleCaretUpdate();
              }
              const nextPrism = detectPrismTheme(doc);
              if (nextPrism !== lastPrismDetected) {
                sync();
                return;
              }
              if (!settings.autoPair) return;
              const nextScheme = detectHostColorScheme(doc, win);
              if (nextScheme !== lastObservedHostScheme) {
                lastObservedHostScheme = nextScheme;
                sync();
              }
            } finally {
              schemeInFlight = false;
              if (schemeQueued && !destroyed && enabled) {
                schemeQueued = false;
                if (typeof queueMicrotask === 'function') queueMicrotask(runSchemeCheck);
                else Promise.resolve().then(runSchemeCheck);
              }
            }
          };
          const onSchemeMut = () => {
            if (destroyed || !enabled) return;
            if (typeof win?.requestAnimationFrame === 'function') {
              if (schemeRaf) return;
              schemeRaf = win.requestAnimationFrame(() => {
                schemeRaf = 0;
                runSchemeCheck();
              });
              return;
            }
            runSchemeCheck();
          };
          const schemeFilter = ['data-theme', 'data-color-scheme', 'class', 'data-ag-cs-style', 'data-ag-cs-win-blur'];
          if (typeof coexist?.getHtmlAttrBus === 'function') {
            schemeAttrOff = coexist.getHtmlAttrBus(doc, win).subscribe('themeStudio:scheme', onSchemeMut, {
              attributeFilter: schemeFilter,
              wakeOnResume: true,
            });
          } else if (typeof win?.MutationObserver === 'function') {
            schemeObserver = new win.MutationObserver(onSchemeMut);
            schemeObserver.observe(doc.documentElement, {
              attributes: true,
              attributeFilter: schemeFilter,
            });
          }
        } catch {}
      }
    }

    function unbindSchemeWatcher() {
      if (schemeRaf && typeof win?.cancelAnimationFrame === 'function') {
        try { win.cancelAnimationFrame(schemeRaf); } catch {}
      }
      schemeRaf = 0;
      if (mediaQuery && mediaListener) {
        try { mediaQuery.removeEventListener?.('change', mediaListener); } catch {}
      }
      mediaQuery = null;
      mediaListener = null;
      if (schemeAttrOff) {
        try { schemeAttrOff(); } catch {}
        schemeAttrOff = null;
      }
      if (schemeObserver) {
        try { schemeObserver.disconnect(); } catch {}
        schemeObserver = null;
      }
      lastObservedHostScheme = null;
    }

    function setConvState(nextState) {
      const allowed = ['idle', 'running', 'awaiting', 'error', 'completed'];
      const normalized = allowed.includes(nextState) ? nextState : 'idle';
      lastConvState = normalized;
      const html = doc?.documentElement;
      if (html && enabled && !destroyed && settings.ambientGlow !== 'off' && !lastSurfaceYielded) {
        if (normalized === 'idle') html.removeAttribute?.('data-ag-sag-conv-state');
        else html.setAttribute?.('data-ag-sag-conv-state', normalized);
      } else if (html) {
        html.removeAttribute?.('data-ag-sag-conv-state');
      }
      return normalized;
    }

    function teardownConvStateWatcher() {
      if (convThrottleTimer) {
        clearTimeout(convThrottleTimer);
        convThrottleTimer = null;
      }
      if (convBusOff) {
        try { convBusOff(); } catch {}
        convBusOff = null;
      }
      if (convObserver) {
        try { convObserver.disconnect(); } catch {}
        convObserver = null;
      }
    }

    function refreshConvStateFromDom() {
      if (destroyed || !enabled || settings.ambientGlow === 'off' || lastSurfaceYielded) return 'idle';
      return setConvState(detectConvStateFromDom(doc));
    }

    function syncConvStateWatcher(surfaceYielded) {
      const shouldWatch = Boolean(
        enabled && !destroyed && settings.ambientGlow !== 'off' && !surfaceYielded && !externalConvStateSource && doc?.body
      );
      if (!shouldWatch) {
        teardownConvStateWatcher();
        return;
      }
      refreshConvStateFromDom();
      if (convBusOff || convObserver) return;
      const schedule = () => {
        if (destroyed || !enabled || externalConvStateSource || convThrottleTimer || isHibernated()) return;
        convThrottleTimer = setTimeout(() => {
          convThrottleTimer = null;
          if (!destroyed && enabled && !externalConvStateSource && settings.ambientGlow !== 'off' && !lastSurfaceYielded && !isHibernated()) {
            refreshConvStateFromDom();
          }
        }, convThrottleMs);
        convThrottleTimer?.unref?.();
      };
      const convAttrFilter = ['hidden', 'data-error', 'data-testid', 'role', 'aria-hidden'];
      if (typeof coexist?.getDomMutationBus === 'function') {
        convBusOff = coexist.getDomMutationBus(doc, win).subscribe(
          'themeStudio:convState',
          () => {
            if (destroyed || !enabled || externalConvStateSource || isHibernated()) return;
            schedule();
          },
          { attributes: true, attributeFilter: convAttrFilter, wakeOnResume: true }
        );
        return;
      }
      if (typeof win?.MutationObserver !== 'function') return;
      convObserver = new win.MutationObserver((records) => {
        if (destroyed || !enabled || externalConvStateSource || isHibernated()) return;
        if (coexist?.isMutationOwnedOnly) {
          if (coexist.isMutationOwnedOnly(records)) return;
        } else if ((records || []).every((r) => { const t = r?.target; return t?.nodeType === 1 && Boolean(t.closest?.('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"]')); })) {
          return;
        }
        schedule();
      });
      try {
        convObserver.observe(doc.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: convAttrFilter,
        });
      } catch {}
    }

    function setExternalConvStateSource(next, opts = {}) {
      const flag = Boolean(next);
      if (externalConvStateSource === flag) return externalConvStateSource;
      externalConvStateSource = flag;
      if (opts && opts.silent) return externalConvStateSource;
      if (!destroyed && enabled) {
        syncConvStateWatcher(lastSurfaceYielded);
      } else {
        teardownConvStateWatcher();
      }
      return externalConvStateSource;
    }

    function sync() {
      if (destroyed || !enabled) {
        teardownConvStateWatcher();
        teardownStreamFade();
        teardownSmoothCaret();
        removeAmbientGlow();
        unbindSchemeWatcher();
        unbindWindowFocusWatcher();
        removeStyleElement();
        clearHtmlAttributes();
        lastPrismDetected = detectPrismTheme(doc);
        lastColorsYielded = false;
        lastSurfaceYielded = false;
        syncExtensionFrames(THEME_PRESETS.native, 'disabled', null);
        teardownFrameListeners();
        return {
          applied: false,
          enabled,
          destroyed,
          prismDetected: lastPrismDetected,
          colorsYielded: false,
          cssLength: 0,
          syncedFrames: lastSyncedFrames,
        };
      }

      bindWindowFocusWatcher();
      bindSchemeWatcher();
      const prismDetected = detectPrismTheme(doc);
      const hostScheme = detectHostColorScheme(doc, win);
      lastObservedHostScheme = hostScheme;
      const presetSpec = resolveEffectivePreset(settings.preset, settings.autoPair, hostScheme);
      const effectiveScheme = presetSpec?.colorScheme || hostScheme || 'dark';
      const effVars = buildEffectiveVars(presetSpec, settings.accent, effectiveScheme);
      const surfaceYielded = Boolean(prismDetected && settings.conflictPolicy === 'yield');
      const colorsYielded = Boolean(surfaceYielded && effVars);
      const colorsState = !effVars ? 'native' : colorsYielded ? 'yielded' : 'active';

      lastPrismDetected = prismDetected;
      lastColorsYielded = colorsYielded;
      lastSurfaceYielded = surfaceYielded;
      lastResolvedPreset = presetSpec?.id || settings.preset;

      const html = doc?.documentElement;
      if (html && typeof html.setAttribute === 'function') {
        const attrs = [
          ['data-ag-sag-theme', '1'],
          ['data-ag-sag-theme-preset', settings.preset],
          ['data-ag-sag-theme-resolved', lastResolvedPreset],
          ['data-ag-sag-theme-scheme', effectiveScheme],
          ['data-ag-sag-theme-density', settings.density],
          ['data-ag-sag-theme-accent', settings.accent],
          ['data-ag-sag-theme-corners', settings.corners],
          ['data-ag-sag-theme-surface', settings.surface],
          ['data-ag-sag-theme-code-font', settings.codeFont],
          ['data-ag-sag-theme-chat-font', settings.chatFont],
          ['data-ag-sag-theme-ligatures', settings.codeLigatures ? '1' : '0'],
          ['data-ag-sag-theme-glow', settings.ambientGlow],
          ['data-ag-sag-theme-policy', settings.conflictPolicy],
          ['data-ag-sag-theme-colors', colorsState],
          ['data-ag-sag-theme-cjk', settings.cjkFontTuning ? '1' : '0'],
          ['data-ag-sag-theme-sidebar', settings.compactSidebar ? '1' : '0'],
          ['data-ag-sag-theme-wide', settings.wideReadable ? '1' : '0'],
        ];
        for (const [k, v] of attrs) html.setAttribute(k, v);
        syncHibernatedAttr();
        if (settings.ambientGlow !== 'off' && !surfaceYielded && lastConvState !== 'idle') {
          html.setAttribute('data-ag-sag-conv-state', lastConvState);
        } else {
          html.removeAttribute?.('data-ag-sag-conv-state');
        }
      }

      const css = buildThemeCss({ ...settings, prismDetected, hostScheme });
      const el = ensureStyleElement();
      if (el && lastCss !== css) {
        el.textContent = css;
        lastCss = css;
      }

      syncAmbientGlow(surfaceYielded);
      syncConvStateWatcher(surfaceYielded);
      syncStreamFade(surfaceYielded);
      syncSmoothCaret(surfaceYielded);
      const syncedFrames = syncExtensionFrames(presetSpec, colorsState, effVars);

      return {
        applied: Boolean(el || !doc),
        enabled,
        destroyed,
        prismDetected,
        colorsYielded,
        colorsState,
        resolvedPreset: lastResolvedPreset,
        cssLength: css.length,
        syncedFrames,
      };
    }

    function updateSettings(patch, opts = {}) {
      if (destroyed) return { ...settings };
      settings = normalizeSettings(patch, settings);
      if (enabled && !(opts && opts.silent)) sync();
      return { ...settings };
    }

    function setEnabled(next) {
      if (destroyed) return false;
      enabled = Boolean(next);
      sync();
      return enabled;
    }

    function getDebugState() {
      const sanitizedLen = sanitizeCustomCss(settings.customCss).length;
      const mounted = Boolean(
        styleEl && (styleEl.parentElement || (typeof doc?.getElementById === 'function' && doc.getElementById(STYLE_ID)))
      );
      return {
        enabled,
        destroyed,
        styleId: STYLE_ID,
        styleMounted: mounted,
        prismDetected: lastPrismDetected,
        colorsYielded: lastColorsYielded,
        resolvedPreset: lastResolvedPreset,
        convState: lastConvState,
        externalConvStateSource,
        convStateWatcherActive: Boolean(convBusOff || convObserver),
        convThrottlePending: Boolean(convThrottleTimer),
        streamFadeActive: Boolean(streamObserver),
        smoothCaretActive: caretActive,
        settings: { ...settings },
        sanitizedCustomCssLength: sanitizedLen,
        cssLength: lastCss.length,
        syncedFrames: lastSyncedFrames,
      };
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      teardownConvStateWatcher();
      teardownStreamFade();
      teardownSmoothCaret();
      removeAmbientGlow();
      unbindSchemeWatcher();
      unbindWindowFocusWatcher();
      removeStyleElement();
      clearHtmlAttributes();
      syncExtensionFrames(THEME_PRESETS.native, 'disabled', null);
      teardownFrameListeners();
      lastColorsYielded = false;
      lastSurfaceYielded = false;
      lastConvState = 'idle';
    }

    if (enabled) {
      sync();
    }

    return {
      updateSettings,
      setEnabled,
      setConvState,
      setExternalConvStateSource,
      sync,
      getDebugState,
      destroy,
    };
  }

  return {
    STYLE_ID,
    MAX_CUSTOM_CSS_LEN,
    STREAM_HL_NAMES,
    THEME_PRESETS,
    THEME_GROUPS,
    LOOK_PRESETS,
    ACCENT_PRESETS,
    CORNER_PRESETS,
    SURFACE_PRESETS,
    CODE_FONT_PRESETS,
    CHAT_FONT_PRESETS,
    AMBIENT_GLOW_LEVELS,
    DENSITY_PRESETS,
    DEFAULT_SETTINGS,
    resolveLookPresetPatch,
    matchesLookPreset,
    resolveEffectivePreset,
    detectHostColorScheme,
    detectConvStateFromDom,
    sanitizeCustomCss,
    buildThemeCss,
    createThemeStudioController,
  };
});
