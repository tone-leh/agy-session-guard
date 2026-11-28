// agy-Sag — Coexistence, Presets, Module Registry & Config Contract (UMD)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__agSgCoexist = factory(root);
    root.__agSagCoexist = root.__agSgCoexist;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (globalRoot) {
  'use strict';

  const OWNER_GLOBAL = '__agSagOwner';
  const LEGACY_OWNER_GLOBAL = '__agSessionGuardOwner';
  const INSTANCE_GLOBAL = '__agSag';
  const LEGACY_INSTANCE_GLOBAL = '__agSessionGuard';
  const SAG_INSTANCE_GLOBAL = INSTANCE_GLOBAL; // deprecated alias
  const STORAGE_KEY = 'agSag.config.v1';
  const LEGACY_STORAGE_KEY = 'agSessionGuard.config.v1';
  const SAG_STORAGE_KEY = STORAGE_KEY; // deprecated alias
  const LEGACY_STORAGE_PREFIX = 'agSessionGuard.';
  const SAG_STORAGE_PREFIX = 'agSag.';
  const CUSTOM_PACKS_STORAGE_KEY = 'agSag.hostI18n.customPacks.v1';

  const ALLOWED_HOST_LOCALES = Object.freeze([
    'auto',
    'en',
    'zh-CN',
    'zh-TW',
    'ja',
    'ko',
    'es',
    'fr',
    'de',
    'ru',
    'pt-BR',
  ]);
  const ALLOWED_CONFLICT_POLICIES = Object.freeze(['yield', 'takeover']);
  const ALLOWED_AUTO_ACCEPT_POLICIES = Object.freeze(['readonly-safe', 'dev-flow', 'custom']);
  const ALLOWED_THEME_PRESETS = Object.freeze([
    'native',
    'obsidian-prism',
    'warm-basalt',
    'midnight-ink',
    'nord-frost',
    'oled-pure',
    'tokyo-night',
    'catppuccin-mocha',
    'crystal-day',
    'warm-paper',
    'rose-dawn',
    'matcha-journal',
    'phantom-crimson',
    'doodle-sketch',
    'pixel-terminal',
    'aurora-glass',
  ]);
  const ALLOWED_THEME_DENSITIES = Object.freeze(['compact', 'balanced', 'comfortable']);
  const ALLOWED_THEME_ACCENTS = Object.freeze(['follow', 'cobalt', 'iris', 'amber', 'emerald', 'rose', 'mono']);
  const ALLOWED_THEME_CORNERS = Object.freeze(['sharp', 'balanced', 'soft', 'pill']);
  const ALLOWED_THEME_SURFACES = Object.freeze(['clean', 'smoked', 'paper', 'glass']);
  const ALLOWED_THEME_CODE_FONTS = Object.freeze(['default', 'jetbrains', 'cascadia', 'fira', 'sfmono', 'sarasa']);
  const ALLOWED_THEME_CHAT_FONTS = Object.freeze(['default', 'system', 'pingfang', 'noto', 'serif']);
  const ALLOWED_THEME_AMBIENT_GLOWS = Object.freeze(['off', 'subtle', 'vivid']);
  const ALLOWED_RADAR_AUDIO_MODES = Object.freeze(['off', 'chime', 'tts', 'both']);
  const ALLOWED_THOUGHT_ENGINES = Object.freeze(['mt', 'openai', 'anthropic', 'gemini', 'ollama']);
  const ALLOWED_THOUGHT_TRIGGERS = Object.freeze(['auto', 'manual']);
  const ALLOWED_THOUGHT_VIEWS = Object.freeze(['bilingual', 'translated']);
  const ALLOWED_THOUGHT_STYLES = Object.freeze(['technical', 'concise']);
  const QUIET_HOURS_RE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

  const MODULE_CATALOG = Object.freeze([
    Object.freeze({ id: 'hostI18n', category: 'ui', defaultEnabled: true, aggressive: false }),
    Object.freeze({ id: 'thoughtTranslate', category: 'ui', defaultEnabled: false, aggressive: false }),
    Object.freeze({ id: 'compactGuard', category: 'session', defaultEnabled: true, aggressive: false }),
    Object.freeze({ id: 'precompactExport', category: 'session', defaultEnabled: true, aggressive: false }),
    Object.freeze({ id: 'draftGuard', category: 'composer', defaultEnabled: true, aggressive: false }),
    Object.freeze({ id: 'promptQueue', category: 'composer', defaultEnabled: true, aggressive: false }),
    Object.freeze({ id: 'promptLibrary', category: 'composer', defaultEnabled: false, aggressive: false }),
    Object.freeze({ id: 'sessionWatchdog', category: 'session', defaultEnabled: true, aggressive: false }),
    Object.freeze({ id: 'outlineBookmarks', category: 'navigation', defaultEnabled: false, aggressive: false }),
    Object.freeze({ id: 'sessionRadar', category: 'navigation', defaultEnabled: false, aggressive: false }),
    Object.freeze({ id: 'safeAutoAccept', category: 'automation', defaultEnabled: false, aggressive: true }),
    Object.freeze({ id: 'themeStudio', category: 'ui', defaultEnabled: false, aggressive: false }),
    Object.freeze({ id: 'readingNav', category: 'ui', defaultEnabled: false, aggressive: false }),
    Object.freeze({ id: 'quotaPulse', category: 'telemetry', defaultEnabled: false, aggressive: false }),
  ]);

  const MODULE_GROUPS = Object.freeze([
    Object.freeze({ id: 'ui', layer: 'L1', settingsTab: 'ui' }),
    Object.freeze({ id: 'conversation', layer: 'L2', settingsTab: 'conversation' }),
    Object.freeze({ id: 'guard', layer: 'L3', settingsTab: 'guard' }),
  ]);

  const MODULE_META = Object.freeze({
    hostI18n: Object.freeze({ id: 'hostI18n', group: 'ui', layer: 'L1', settingsTab: 'ui', labelKey: 'modHostI18n', descKey: 'modDescHostI18n', defaultEnabled: true, aggressive: false, parentId: null }),
    thoughtTranslate: Object.freeze({ id: 'thoughtTranslate', group: 'ui', layer: 'L1', settingsTab: 'ui', labelKey: 'modThoughtTranslate', descKey: 'modDescThoughtTranslate', defaultEnabled: false, aggressive: false, parentId: null }),
    themeStudio: Object.freeze({ id: 'themeStudio', group: 'ui', layer: 'L1', settingsTab: 'ui', labelKey: 'modThemeStudio', descKey: 'modDescThemeStudio', defaultEnabled: false, aggressive: false, parentId: null }),
    readingNav: Object.freeze({ id: 'readingNav', group: 'ui', layer: 'L1', settingsTab: 'ui', labelKey: 'modReadingNav', descKey: 'modDescReadingNav', defaultEnabled: false, aggressive: false, parentId: null }),
    compactGuard: Object.freeze({ id: 'compactGuard', group: 'conversation', layer: 'L2', settingsTab: 'conversation', labelKey: 'modCompactGuard', descKey: 'modDescCompactGuard', defaultEnabled: true, aggressive: false, parentId: null }),
    precompactExport: Object.freeze({ id: 'precompactExport', group: 'conversation', layer: 'L2', settingsTab: 'conversation', labelKey: 'modPrecompactExport', descKey: 'modDescPrecompactExport', defaultEnabled: true, aggressive: false, parentId: 'compactGuard' }),
    draftGuard: Object.freeze({ id: 'draftGuard', group: 'conversation', layer: 'L2', settingsTab: 'conversation', labelKey: 'cfgModDraftGuard', descKey: 'modDescDraftGuard', defaultEnabled: true, aggressive: false, parentId: null }),
    promptQueue: Object.freeze({ id: 'promptQueue', group: 'conversation', layer: 'L2', settingsTab: 'conversation', labelKey: 'modPromptQueue', descKey: 'modDescPromptQueue', defaultEnabled: true, aggressive: false, parentId: null }),
    promptLibrary: Object.freeze({ id: 'promptLibrary', group: 'conversation', layer: 'L2', settingsTab: 'conversation', labelKey: 'modPromptLibrary', descKey: 'modDescPromptLibrary', defaultEnabled: false, aggressive: false, parentId: null }),
    outlineBookmarks: Object.freeze({ id: 'outlineBookmarks', group: 'conversation', layer: 'L2', settingsTab: 'conversation', labelKey: 'cfgModBookmarks', descKey: 'modDescBookmarks', defaultEnabled: false, aggressive: false, parentId: null }),
    sessionWatchdog: Object.freeze({ id: 'sessionWatchdog', group: 'guard', layer: 'L3', settingsTab: 'guard', labelKey: 'cfgModWatchdog', descKey: 'modDescWatchdog', defaultEnabled: true, aggressive: false, parentId: null }),
    sessionRadar: Object.freeze({ id: 'sessionRadar', group: 'guard', layer: 'L3', settingsTab: 'guard', labelKey: 'cfgModRadar', descKey: 'modDescRadar', defaultEnabled: false, aggressive: false, parentId: null }),
    safeAutoAccept: Object.freeze({ id: 'safeAutoAccept', group: 'guard', layer: 'L3', settingsTab: 'guard', labelKey: 'modSafeAutoAccept', descKey: 'modDescSafeAutoAccept', defaultEnabled: false, aggressive: true, parentId: null }),
    quotaPulse: Object.freeze({ id: 'quotaPulse', group: 'guard', layer: 'L3', settingsTab: 'guard', labelKey: 'modQuotaPulse', descKey: 'modDescQuotaPulse', defaultEnabled: false, aggressive: false, parentId: null }),
  });

  const DEFAULT_CONFIG = Object.freeze({
    compactThreshold: 80, // 'off' | 50..98 (recommended default: 80%)
    compactTriggerMode: 'auto-silent', // 'auto-silent' | 'confirm' | 'fill-only' | 'auto-countdown'
    compactFocusPreset: 'default', // 'default' | 'code-errors' | 'bookmarks' | 'custom'
    customCompactFocus: '', // custom focus instructions appended after /compact (<= 240 chars)
    countdownSeconds: 3, // 2..15 (snappy default: 3s)
    rearmDeltaPct: 10, // re-notify after dismiss if usage climbs another +10%
    resetDropPct: 10, // auto-reset dismiss state if usage drops by >=10% below threshold
    stallThresholdSeconds: 180, // 'off' | 60..900 (3 min default)
    radarNotifyMode: 'off', // 'off' | 'awaiting' | 'all' (opt-in blurred OS notifications)
    radarAudioMode: 'off', // 'off' | 'chime' | 'tts' | 'both' (opt-in zero-network WebAudio / local TTS)
    radarQuietHours: '', // '' | 'HH:MM-HH:MM' quiet window suppressing blurred alerts & audio
    hostI18nLocale: 'auto', // 'auto' | 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'pt-BR'
    hostI18nConflictPolicy: 'yield', // 'yield' | 'takeover'
    hostI18nCollectMissing: false, // opt-in collector for untranslated UI phrases
    thoughtEngine: 'mt', // 'mt' | 'openai' | 'anthropic' | 'gemini' | 'ollama'
    thoughtTargetLang: 'auto', // 'auto' | target locale code
    thoughtTrigger: 'auto', // 'auto' | 'manual'
    thoughtViewMode: 'bilingual', // 'bilingual' | 'translated'
    thoughtStylePreset: 'technical', // 'technical' | 'concise'
    thoughtTranslateTitles: false, // opt-in sidebar/breadcrumb title translation
    autoAcceptPolicy: 'readonly-safe', // 'readonly-safe' | 'dev-flow' | 'custom'
    autoAcceptCustomPatterns: Object.freeze([]), // string[] allow patterns (always subordinate to HARD_DENY_PATTERNS)
    autoAcceptDryRun: false, // audit-only simulation mode
    themePreset: 'native', // 16 presets: native + 15 dark/light/stylized optical skins
    themeAutoPair: false, // opt-in automatic dark/light skin pairing with host color scheme
    themeAccent: 'follow', // 'follow' | 'cobalt' | 'iris' | 'amber' | 'emerald' | 'rose' | 'mono'
    themeCorners: 'balanced', // 'sharp' | 'balanced' | 'soft' | 'pill'
    themeSurface: 'smoked', // 'clean' | 'smoked' | 'paper' | 'glass'
    themeCodeFont: 'default', // 'default' | 'jetbrains' | 'cascadia' | 'fira' | 'sfmono' | 'sarasa'
    themeChatFont: 'default', // 'default' | 'system' | 'pingfang' | 'noto' | 'serif'
    themeCodeLigatures: false, // enable programming ligatures (calt/liga)
    themeAmbientGlow: 'subtle', // 'off' | 'subtle' | 'vivid' (0fps CSS semantic horizon glow)
    themeStreamFade: true, // CSS.highlights 5-step velvet stream feathering (zero DOM wrap)
    themeSmoothCaret: true, // FastDOM device-pixel smooth typing caret
    themeCjkFont: true, // CJK + monospace font stack polish
    themeDensity: 'balanced', // 'compact' | 'balanced' | 'comfortable'
    themeCompactSidebar: false,
    themeWideReadable: false,
    themeCustomCss: '', // sanitized custom CSS (<= 8192 chars)
    themeConflictPolicy: 'yield', // 'yield' | 'takeover'
    readingCollapseLines: 40, // 20..200 auto-fold threshold for long <pre> blocks
    quotaSoftTurns5h: 60, // 10..500 local soft budget warning
    quotaSoftTurns7d: 350, // 30..5000 local soft weekly warning
    modules: Object.freeze({
      hostI18n: true, // Zero-ASAR native UI multi-language translator
      thoughtTranslate: false, // strict opt-in: multi-engine thought & title translator (Node sidecar proxy)
      compactGuard: true,
      precompactExport: true,
      outlineBookmarks: false, // opt-in: adds bookmark icon beside Copy/Undo in user action bar
      draftGuard: true, // unsent composer draft auto-save & crash recovery
      promptQueue: true, // queue follow-up prompts while Agent is streaming
      promptLibrary: false, // opt-in: command palette with slash shortcuts, {{var}} snippets & read-only NOV templates
      sessionRadar: false, // opt-in sidebar attention filter + alerts
      sessionWatchdog: true, // burn-rate estimate + streaming stall detector
      safeAutoAccept: false, // strict opt-in: policy-gated auto-accept with hard deny blacklist
      themeStudio: false, // opt-in: zero-:has() optical themes & typography studio
      readingNav: false, // opt-in: long code folding, sticky copy bar & Alt+Up/Down turn rail
      quotaPulse: false, // opt-in: read-only 5h/weekly quota signal monitor
    }),
  });

  const PRESETS = Object.freeze({
    essential: Object.freeze({
      id: 'essential',
      modules: Object.freeze({
        hostI18n: true,
        thoughtTranslate: false,
        compactGuard: true,
        precompactExport: true,
        draftGuard: true,
        promptQueue: true,
        promptLibrary: false,
        sessionWatchdog: true,
        outlineBookmarks: false,
        sessionRadar: false,
        safeAutoAccept: false,
        themeStudio: false,
        readingNav: false,
        quotaPulse: false,
      }),
    }),
    'i18n-only': Object.freeze({
      id: 'i18n-only',
      modules: Object.freeze({
        hostI18n: true,
        thoughtTranslate: false,
        compactGuard: false,
        precompactExport: false,
        draftGuard: false,
        promptQueue: false,
        promptLibrary: false,
        sessionWatchdog: false,
        outlineBookmarks: false,
        sessionRadar: false,
        safeAutoAccept: false,
        themeStudio: false,
        readingNav: false,
        quotaPulse: false,
      }),
    }),
    power: Object.freeze({
      id: 'power',
      modules: Object.freeze({
        hostI18n: true,
        thoughtTranslate: false,
        compactGuard: true,
        precompactExport: true,
        draftGuard: true,
        promptQueue: true,
        promptLibrary: true,
        sessionWatchdog: true,
        outlineBookmarks: true,
        sessionRadar: false,
        safeAutoAccept: false,
        themeStudio: true,
        readingNav: true,
        quotaPulse: true,
      }),
    }),
    'full-auto': Object.freeze({
      id: 'full-auto',
      autoAcceptPolicy: 'readonly-safe',
      modules: Object.freeze({
        hostI18n: true,
        thoughtTranslate: false,
        compactGuard: true,
        precompactExport: true,
        draftGuard: true,
        promptQueue: true,
        promptLibrary: true,
        sessionWatchdog: true,
        outlineBookmarks: true,
        sessionRadar: true,
        safeAutoAccept: true,
        themeStudio: true,
        readingNav: true,
        quotaPulse: true,
      }),
    }),
  });

  function resolvePresetPatch(presetId) {
    const key = String(presetId || '').trim().toLowerCase();
    const spec = PRESETS[key];
    if (!spec) return null;
    const patch = { modules: { ...spec.modules } };
    if (spec.autoAcceptPolicy) patch.autoAcceptPolicy = spec.autoAcceptPolicy;
    return patch;
  }

  function sanitizeConfig(raw, fallback = DEFAULT_CONFIG) {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    let threshold = fallback.compactThreshold;
    if (src.compactThreshold === 'off' || src.compactThreshold === false || src.compactThreshold === 0) {
      threshold = 'off';
    } else if (src.compactThreshold !== undefined && src.compactThreshold !== null && src.compactThreshold !== '') {
      const n = Number(src.compactThreshold);
      if (Number.isFinite(n) && n >= 50 && n <= 98) threshold = Math.round(n);
    }

    const allowedModes = ['auto-silent', 'confirm', 'fill-only', 'auto-countdown'];
    const mode = allowedModes.includes(src.compactTriggerMode) ? src.compactTriggerMode : fallback.compactTriggerMode;

    const allowedPresets = ['default', 'code-errors', 'bookmarks', 'custom'];
    const compactFocusPreset = allowedPresets.includes(src.compactFocusPreset)
      ? src.compactFocusPreset
      : fallback.compactFocusPreset || 'default';

    const customCompactFocus =
      typeof src.customCompactFocus === 'string'
        ? src.customCompactFocus.replace(/[\r\n]+/g, ' ').trim().slice(0, 240)
        : fallback.customCompactFocus || '';

    const cdRaw = Number(src.countdownSeconds);
    const countdownSeconds = Number.isFinite(cdRaw) ? Math.max(2, Math.min(15, Math.round(cdRaw))) : fallback.countdownSeconds;

    const rearmRaw = Number(src.rearmDeltaPct);
    const rearmDeltaPct = Number.isFinite(rearmRaw) ? Math.max(3, Math.min(30, Math.round(rearmRaw))) : fallback.rearmDeltaPct;

    const dropRaw = Number(src.resetDropPct);
    const resetDropPct = Number.isFinite(dropRaw) ? Math.max(5, Math.min(30, Math.round(dropRaw))) : fallback.resetDropPct;

    let stallThresholdSeconds = fallback.stallThresholdSeconds !== undefined ? fallback.stallThresholdSeconds : 180;
    if (src.stallThresholdSeconds === 'off' || src.stallThresholdSeconds === false || src.stallThresholdSeconds === 0) {
      stallThresholdSeconds = 'off';
    } else if (src.stallThresholdSeconds !== undefined && src.stallThresholdSeconds !== null && src.stallThresholdSeconds !== '') {
      const s = Number(src.stallThresholdSeconds);
      if (Number.isFinite(s) && s >= 30 && s <= 900) stallThresholdSeconds = Math.round(s);
    }

    const allowedNotify = ['off', 'awaiting', 'all'];
    const radarNotifyMode = allowedNotify.includes(src.radarNotifyMode) ? src.radarNotifyMode : fallback.radarNotifyMode;

    const radarAudioMode = ALLOWED_RADAR_AUDIO_MODES.includes(src.radarAudioMode)
      ? src.radarAudioMode
      : fallback.radarAudioMode || 'off';

    const rawQuiet = typeof src.radarQuietHours === 'string' ? src.radarQuietHours.trim() : null;
    const radarQuietHours =
      rawQuiet !== null
        ? (rawQuiet === '' || QUIET_HOURS_RE.test(rawQuiet) ? rawQuiet : fallback.radarQuietHours || '')
        : fallback.radarQuietHours || '';

    const hostI18nLocale = ALLOWED_HOST_LOCALES.includes(src.hostI18nLocale)
      ? src.hostI18nLocale
      : fallback.hostI18nLocale || 'auto';

    const hostI18nConflictPolicy = ALLOWED_CONFLICT_POLICIES.includes(src.hostI18nConflictPolicy)
      ? src.hostI18nConflictPolicy
      : fallback.hostI18nConflictPolicy || 'yield';

    const hostI18nCollectMissing =
      src.hostI18nCollectMissing !== undefined
        ? Boolean(src.hostI18nCollectMissing)
        : Boolean(fallback.hostI18nCollectMissing);

    const thoughtEngine = ALLOWED_THOUGHT_ENGINES.includes(src.thoughtEngine)
      ? src.thoughtEngine
      : fallback.thoughtEngine || 'mt';

    const thoughtTargetLang = ALLOWED_HOST_LOCALES.includes(src.thoughtTargetLang)
      ? src.thoughtTargetLang
      : fallback.thoughtTargetLang || 'auto';

    const thoughtTrigger = ALLOWED_THOUGHT_TRIGGERS.includes(src.thoughtTrigger)
      ? src.thoughtTrigger
      : fallback.thoughtTrigger || 'auto';

    const thoughtViewMode = ALLOWED_THOUGHT_VIEWS.includes(src.thoughtViewMode)
      ? src.thoughtViewMode
      : fallback.thoughtViewMode || 'bilingual';

    const thoughtStylePreset = ALLOWED_THOUGHT_STYLES.includes(src.thoughtStylePreset)
      ? src.thoughtStylePreset
      : fallback.thoughtStylePreset || 'technical';

    const thoughtTranslateTitles =
      src.thoughtTranslateTitles !== undefined
        ? Boolean(src.thoughtTranslateTitles)
        : Boolean(fallback.thoughtTranslateTitles);

    const autoAcceptPolicy = ALLOWED_AUTO_ACCEPT_POLICIES.includes(src.autoAcceptPolicy)
      ? src.autoAcceptPolicy
      : fallback.autoAcceptPolicy || 'readonly-safe';

    const autoAcceptCustomPatterns = Array.isArray(src.autoAcceptCustomPatterns)
      ? src.autoAcceptCustomPatterns
          .filter((item) => typeof item === 'string' && item.trim())
          .map((item) => item.trim().slice(0, 160))
          .slice(0, 30)
      : Array.isArray(fallback.autoAcceptCustomPatterns)
        ? [...fallback.autoAcceptCustomPatterns]
        : [];

    const autoAcceptDryRun =
      src.autoAcceptDryRun !== undefined ? Boolean(src.autoAcceptDryRun) : Boolean(fallback.autoAcceptDryRun);

    const themePreset = ALLOWED_THEME_PRESETS.includes(src.themePreset)
      ? src.themePreset
      : fallback.themePreset || 'native';

    const themeAutoPair =
      src.themeAutoPair !== undefined ? Boolean(src.themeAutoPair) : Boolean(fallback.themeAutoPair);

    const themeAccent = ALLOWED_THEME_ACCENTS.includes(src.themeAccent)
      ? src.themeAccent
      : fallback.themeAccent || 'follow';

    const themeCorners = ALLOWED_THEME_CORNERS.includes(src.themeCorners)
      ? src.themeCorners
      : fallback.themeCorners || 'balanced';

    const themeSurface = ALLOWED_THEME_SURFACES.includes(src.themeSurface)
      ? src.themeSurface
      : fallback.themeSurface || 'smoked';

    const themeCodeFont = ALLOWED_THEME_CODE_FONTS.includes(src.themeCodeFont)
      ? src.themeCodeFont
      : fallback.themeCodeFont || 'default';

    const themeChatFont = ALLOWED_THEME_CHAT_FONTS.includes(src.themeChatFont)
      ? src.themeChatFont
      : fallback.themeChatFont || 'default';

    const themeCodeLigatures =
      src.themeCodeLigatures !== undefined
        ? Boolean(src.themeCodeLigatures)
        : Boolean(fallback.themeCodeLigatures);

    const themeAmbientGlow = ALLOWED_THEME_AMBIENT_GLOWS.includes(src.themeAmbientGlow)
      ? src.themeAmbientGlow
      : fallback.themeAmbientGlow || 'subtle';

    const themeStreamFade =
      src.themeStreamFade !== undefined ? Boolean(src.themeStreamFade) : fallback.themeStreamFade !== false;

    const themeSmoothCaret =
      src.themeSmoothCaret !== undefined ? Boolean(src.themeSmoothCaret) : fallback.themeSmoothCaret !== false;

    const themeCjkFont =
      src.themeCjkFont !== undefined ? Boolean(src.themeCjkFont) : fallback.themeCjkFont !== false;

    const themeDensity = ALLOWED_THEME_DENSITIES.includes(src.themeDensity)
      ? src.themeDensity
      : fallback.themeDensity || 'balanced';

    const themeCompactSidebar =
      src.themeCompactSidebar !== undefined
        ? Boolean(src.themeCompactSidebar)
        : Boolean(fallback.themeCompactSidebar);

    const themeWideReadable =
      src.themeWideReadable !== undefined
        ? Boolean(src.themeWideReadable)
        : Boolean(fallback.themeWideReadable);

    const themeCustomCss =
      typeof src.themeCustomCss === 'string'
        ? src.themeCustomCss.slice(0, 8192)
        : typeof fallback.themeCustomCss === 'string'
          ? fallback.themeCustomCss.slice(0, 8192)
          : '';

    const themeConflictPolicy = ALLOWED_CONFLICT_POLICIES.includes(src.themeConflictPolicy)
      ? src.themeConflictPolicy
      : fallback.themeConflictPolicy || 'yield';

    const rLinesRaw = Number(src.readingCollapseLines);
    const readingCollapseLines = Number.isFinite(rLinesRaw)
      ? Math.max(20, Math.min(200, Math.round(rLinesRaw)))
      : fallback.readingCollapseLines || 40;

    const q5Raw = Number(src.quotaSoftTurns5h);
    const quotaSoftTurns5h = Number.isFinite(q5Raw)
      ? Math.max(10, Math.min(500, Math.round(q5Raw)))
      : fallback.quotaSoftTurns5h || 60;

    const q7Raw = Number(src.quotaSoftTurns7d);
    const quotaSoftTurns7d = Number.isFinite(q7Raw)
      ? Math.max(30, Math.min(5000, Math.round(q7Raw)))
      : fallback.quotaSoftTurns7d || 350;

    const mSrc = src.modules && typeof src.modules === 'object' ? src.modules : {};
    const fbMods = fallback.modules || DEFAULT_CONFIG.modules;
    const modules = {
      hostI18n: mSrc.hostI18n !== undefined ? Boolean(mSrc.hostI18n) : fbMods.hostI18n !== false,
      thoughtTranslate: mSrc.thoughtTranslate !== undefined ? Boolean(mSrc.thoughtTranslate) : Boolean(fbMods.thoughtTranslate),
      compactGuard: mSrc.compactGuard !== undefined ? Boolean(mSrc.compactGuard) : fbMods.compactGuard,
      precompactExport: mSrc.precompactExport !== undefined ? Boolean(mSrc.precompactExport) : fbMods.precompactExport,
      outlineBookmarks: mSrc.outlineBookmarks !== undefined ? Boolean(mSrc.outlineBookmarks) : fbMods.outlineBookmarks,
      draftGuard: mSrc.draftGuard !== undefined ? Boolean(mSrc.draftGuard) : fbMods.draftGuard !== false,
      promptQueue: mSrc.promptQueue !== undefined ? Boolean(mSrc.promptQueue) : fbMods.promptQueue !== false,
      promptLibrary: mSrc.promptLibrary !== undefined ? Boolean(mSrc.promptLibrary) : Boolean(fbMods.promptLibrary),
      sessionRadar: mSrc.sessionRadar !== undefined ? Boolean(mSrc.sessionRadar) : fbMods.sessionRadar,
      sessionWatchdog: mSrc.sessionWatchdog !== undefined ? Boolean(mSrc.sessionWatchdog) : fbMods.sessionWatchdog !== false,
      safeAutoAccept: mSrc.safeAutoAccept !== undefined ? Boolean(mSrc.safeAutoAccept) : Boolean(fbMods.safeAutoAccept),
      themeStudio: mSrc.themeStudio !== undefined ? Boolean(mSrc.themeStudio) : Boolean(fbMods.themeStudio),
      readingNav: mSrc.readingNav !== undefined ? Boolean(mSrc.readingNav) : Boolean(fbMods.readingNav),
      quotaPulse: mSrc.quotaPulse !== undefined ? Boolean(mSrc.quotaPulse) : Boolean(fbMods.quotaPulse),
    };

    return {
      compactThreshold: threshold,
      compactTriggerMode: mode,
      compactFocusPreset,
      customCompactFocus,
      countdownSeconds,
      rearmDeltaPct,
      resetDropPct,
      stallThresholdSeconds,
      radarNotifyMode,
      radarAudioMode,
      radarQuietHours,
      hostI18nLocale,
      hostI18nConflictPolicy,
      hostI18nCollectMissing,
      thoughtEngine,
      thoughtTargetLang,
      thoughtTrigger,
      thoughtViewMode,
      thoughtStylePreset,
      thoughtTranslateTitles,
      autoAcceptPolicy,
      autoAcceptCustomPatterns,
      autoAcceptDryRun,
      themePreset,
      themeAutoPair,
      themeAccent,
      themeCorners,
      themeSurface,
      themeCodeFont,
      themeChatFont,
      themeCodeLigatures,
      themeAmbientGlow,
      themeStreamFade,
      themeSmoothCaret,
      themeCjkFont,
      themeDensity,
      themeCompactSidebar,
      themeWideReadable,
      themeCustomCss,
      themeConflictPolicy,
      readingCollapseLines,
      quotaSoftTurns5h,
      quotaSoftTurns7d,
      modules,
    };
  }

  function readHostOwner(win) {
    const w = win || globalRoot;
    if (!w) return undefined;
    return w[OWNER_GLOBAL] || w[LEGACY_OWNER_GLOBAL];
  }

  function shouldYieldToHostIntegrator(win, source = 'standalone') {
    const owner = readHostOwner(win);
    if (source === 'standalone' && typeof owner === 'string' && owner && owner !== 'standalone') {
      return true;
    }
    return false;
  }

  function isWindowHibernated(doc, win, blurredFlag = false) {
    if (blurredFlag) return true;
    if (doc?.hidden) return true;
    if (doc?.documentElement?.getAttribute?.('data-ag-cs-win-blur') === '1') return true;
    if (win && typeof win.document?.hasFocus === 'function' && win.document.hidden) return true;
    return false;
  }

  function markOwnedNoTranslate(el) {
    if (!el || typeof el.setAttribute !== 'function') return el;
    el.setAttribute('data-ag-sg-owned', '1');
    el.setAttribute('data-ag-sag-owned', '1');
    el.setAttribute('data-ag-no-i18n', '1');
    el.setAttribute('translate', 'no');
    el.setAttribute('data-no-translate', 'true');
    el.setAttribute('data-ag-localization-skip', 'true');
    el.setAttribute('data-agy-no-translate', 'true');
    el.setAttribute('data-antigravity-zh-skip', '1');
    return el;
  }

  function readStoredConfig(storage) {
    try {
      const raw = storage?.getItem?.(STORAGE_KEY) || storage?.getItem?.(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      return sanitizeConfig(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function writeStoredConfig(storage, cfg) {
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      const payload = JSON.stringify(sanitizeConfig(cfg));
      storage.setItem(STORAGE_KEY, payload);
      try {
        storage.removeItem?.(LEGACY_STORAGE_KEY);
      } catch {}
      return true;
    } catch {
      return false;
    }
  }

  function clearStoredConfig(storage) {
    if (!storage || typeof storage.removeItem !== 'function') return false;
    try {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem(LEGACY_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function migrateLegacyStorage(storage) {
    const res = { migrated: 0, skipped: 0, failed: 0 };
    if (
      !storage ||
      typeof storage.length !== 'number' ||
      typeof storage.key !== 'function' ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return res;
    }
    const legacyKeys = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (typeof k === 'string' && k.startsWith(LEGACY_STORAGE_PREFIX)) {
          legacyKeys.push(k);
        }
      }
    } catch {
      return res;
    }

    for (const oldKey of legacyKeys) {
      const newKey = SAG_STORAGE_PREFIX + oldKey.slice(LEGACY_STORAGE_PREFIX.length);
      try {
        const existingNew = storage.getItem(newKey);
        if (existingNew === null || existingNew === undefined) {
          const oldVal = storage.getItem(oldKey);
          if (oldVal !== null && oldVal !== undefined) {
            storage.setItem(newKey, oldVal);
            const verified = storage.getItem(newKey);
            if (verified !== null && verified !== undefined) {
              storage.removeItem(oldKey);
              res.migrated += 1;
            } else {
              res.failed += 1;
            }
          } else {
            storage.removeItem(oldKey);
            res.skipped += 1;
          }
        } else {
          // New key takes precedence; remove obsolete legacy key
          storage.removeItem(oldKey);
          res.skipped += 1;
        }
      } catch {
        res.failed += 1;
      }
    }
    return res;
  }

  function isOwnedNode(node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || el.nodeType !== 1) return false;
    if (el.getAttribute?.('data-ag-sg-owned') === '1' || el.getAttribute?.('data-ag-sag-owned') === '1') return true;
    return Boolean(el.closest?.('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"]'));
  }

  function isMutationOwnedOnly(records) {
    if (!Array.isArray(records) || records.length === 0) return true;
    for (let i = 0; i < records.length; i += 1) {
      const r = records[i];
      if (!r) continue;
      if (isOwnedNode(r.target)) continue;
      if (r.type === 'childList') {
        const added = r.addedNodes || [];
        const removed = r.removedNodes || [];
        if (added.length > 0 || removed.length > 0) {
          let allOwned = true;
          for (let j = 0; j < added.length; j += 1) {
            if (!isOwnedNode(added[j])) { allOwned = false; break; }
          }
          if (allOwned) {
            for (let j = 0; j < removed.length; j += 1) {
              if (!isOwnedNode(removed[j])) { allOwned = false; break; }
            }
          }
          if (allOwned) continue;
        }
      }
      return false;
    }
    return true;
  }

  function safeInsertBefore(parent, node, ref) {
    if (!parent || !node) return false;
    try {
      if (ref && ref.parentElement === parent && typeof parent.insertBefore === 'function') {
        parent.insertBefore(node, ref);
        return true;
      }
      if (typeof parent.appendChild === 'function') {
        parent.appendChild(node);
        return true;
      }
    } catch {}
    return false;
  }

  function safeAppendChild(parent, node) {
    if (!parent || !node || typeof parent.appendChild !== 'function') return false;
    try {
      parent.appendChild(node);
      return true;
    } catch {
      return false;
    }
  }

  function safeRemoveNode(node) {
    if (!node) return false;
    try {
      if (node.parentElement && typeof node.parentElement.removeChild === 'function') {
        node.parentElement.removeChild(node);
        return true;
      }
      if (typeof node.remove === 'function') {
        node.remove();
        return true;
      }
    } catch {}
    return false;
  }

  const domMutationBuses = new WeakMap();
  const htmlAttrBuses = new WeakMap();

  function resolveMO(doc, win) {
    return (
      win?.MutationObserver ||
      doc?.defaultView?.MutationObserver ||
      globalRoot?.MutationObserver ||
      (typeof MutationObserver !== 'undefined' ? MutationObserver : null)
    );
  }

  function getDomMutationBus(doc, win) {
    if (!doc || typeof doc !== 'object') {
      return {
        subscribe: () => () => {},
        getDebugState: () => ({ subscriberCount: 0, observing: false, dirtyWhileHibernated: false, configKey: '' }),
      };
    }
    let bus = domMutationBuses.get(doc);
    if (bus) {
      if (win) bus._setWin(win);
      return bus.api;
    }

    let winRef = win || doc.defaultView || globalRoot || null;
    const subscribers = new Map();
    let observer = null;
    let observingTarget = null;
    let observingConfigKey = '';
    let dirtyWhileHibernated = false;
    let resumeBound = false;
    let boundWin = null;

    const flushWake = () => {
      if (subscribers.size === 0 || !dirtyWhileHibernated) return;
      if (isWindowHibernated(doc, winRef)) return;
      dirtyWhileHibernated = false;
      for (const sub of Array.from(subscribers.values())) {
        if (sub.wakeOnResume === false) continue;
        try { sub.handler([], { woken: true }); } catch {}
      }
    };

    const onVis = () => {
      if (doc.hidden) return;
      flushWake();
    };

    const onFocus = () => {
      flushWake();
    };

    const bindResume = () => {
      if (resumeBound) return;
      resumeBound = true;
      boundWin = winRef;
      try { doc.addEventListener?.('visibilitychange', onVis); } catch {}
      try { boundWin?.addEventListener?.('focus', onFocus); } catch {}
    };

    const unbindResume = () => {
      if (!resumeBound) return;
      resumeBound = false;
      try { doc.removeEventListener?.('visibilitychange', onVis); } catch {}
      try { boundWin?.removeEventListener?.('focus', onFocus); } catch {}
      boundWin = null;
    };

    const teardown = () => {
      try { observer?.disconnect?.(); } catch {}
      observer = null;
      observingTarget = null;
      observingConfigKey = '';
      dirtyWhileHibernated = false;
      unbindResume();
    };

    const computeObserveConfig = () => {
      let needAttrs = false;
      let unfiltered = false;
      const filterSet = new Set();
      for (const sub of subscribers.values()) {
        if (!sub.attributes) continue;
        needAttrs = true;
        if (!sub.attributeFilter) {
          unfiltered = true;
        } else {
          for (let i = 0; i < sub.attributeFilter.length; i += 1) {
            filterSet.add(sub.attributeFilter[i]);
          }
        }
      }
      if (!needAttrs) {
        return { key: 'c', opts: { childList: true, subtree: true } };
      }
      if (unfiltered || filterSet.size === 0) {
        return { key: 'a:*', opts: { childList: true, subtree: true, attributes: true } };
      }
      const list = Array.from(filterSet).sort();
      return { key: `a:${list.join(',')}`, opts: { childList: true, subtree: true, attributes: true, attributeFilter: list } };
    };

    const ensureStarted = () => {
      if (subscribers.size === 0) {
        teardown();
        return;
      }
      bindResume();
      const target = doc.body || doc.documentElement;
      if (!target) return;
      const MO = resolveMO(doc, winRef);
      if (typeof MO !== 'function') return;
      const cfg = computeObserveConfig();
      if (observer && observingTarget === target && observingConfigKey === cfg.key) return;
      if (!observer) {
        observer = new MO((records) => {
          if (subscribers.size === 0) return;
          if (isWindowHibernated(doc, winRef)) {
            dirtyWhileHibernated = true;
            return;
          }
          if (isMutationOwnedOnly(records)) return;
          for (const sub of Array.from(subscribers.values())) {
            try { sub.handler(records, { woken: false }); } catch {}
          }
        });
      } else {
        try { observer.disconnect(); } catch {}
      }
      try {
        observer.observe(target, cfg.opts);
        observingTarget = target;
        observingConfigKey = cfg.key;
      } catch {}
    };

    const api = {
      subscribe(id, handler, opts = {}) {
        if (typeof handler !== 'function') return () => {};
        const key = String(id || `sub-${subscribers.size + 1}`);
        const filter =
          Array.isArray(opts?.attributeFilter) && opts.attributeFilter.length > 0
            ? opts.attributeFilter.map(String).filter(Boolean)
            : null;
        const entry = {
          id: key,
          handler,
          attributes: Boolean(opts?.attributes),
          attributeFilter: filter,
          wakeOnResume: opts?.wakeOnResume !== false,
        };
        subscribers.set(key, entry);
        ensureStarted();
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          if (subscribers.get(key) === entry) {
            subscribers.delete(key);
            if (subscribers.size === 0) teardown();
            else ensureStarted();
          }
        };
      },
      getDebugState: () => ({
        subscriberCount: subscribers.size,
        observing: Boolean(observer),
        dirtyWhileHibernated,
        configKey: observingConfigKey,
      }),
    };

    bus = {
      api,
      _setWin(nextWin) {
        if (!nextWin || nextWin === winRef) return;
        const wasBound = resumeBound;
        if (wasBound) unbindResume();
        winRef = nextWin;
        if (wasBound && subscribers.size > 0) bindResume();
      },
    };
    domMutationBuses.set(doc, bus);
    return api;
  }

  function getHtmlAttrBus(doc, win) {
    if (!doc || typeof doc !== 'object') {
      return {
        subscribe: () => () => {},
        getDebugState: () => ({ subscriberCount: 0, observing: false, pendingAttrCount: 0, configKey: '' }),
      };
    }
    let bus = htmlAttrBuses.get(doc);
    if (bus) {
      if (win) bus._setWin(win);
      return bus.api;
    }

    let winRef = win || doc.defaultView || globalRoot || null;
    const subscribers = new Map();
    const pendingAttrs = new Set();
    let observer = null;
    let observingConfigKey = '';
    let resumeBound = false;
    let boundWin = null;

    const dispatchAttrs = (attrSet, woken) => {
      const wildcard = attrSet.has('*');
      for (const sub of Array.from(subscribers.values())) {
        if (woken && sub.wakeOnResume === false) continue;
        let matched;
        if (!sub.filterSet) {
          matched = new Set(attrSet);
        } else if (wildcard) {
          matched = new Set(sub.filterSet);
        } else {
          matched = new Set();
          for (const a of attrSet) {
            if (sub.filterSet.has(a)) matched.add(a);
          }
        }
        if (matched.size === 0) continue;
        try { sub.handler(matched, { woken }); } catch {}
      }
    };

    const flushWake = () => {
      if (subscribers.size === 0 || pendingAttrs.size === 0) return;
      if (isWindowHibernated(doc, winRef)) return;
      const toReplay = new Set(pendingAttrs);
      pendingAttrs.clear();
      dispatchAttrs(toReplay, true);
    };

    const onVis = () => {
      if (doc.hidden) return;
      flushWake();
    };

    const onFocus = () => {
      flushWake();
    };

    const bindResume = () => {
      if (resumeBound) return;
      resumeBound = true;
      boundWin = winRef;
      try { doc.addEventListener?.('visibilitychange', onVis); } catch {}
      try { boundWin?.addEventListener?.('focus', onFocus); } catch {}
    };

    const unbindResume = () => {
      if (!resumeBound) return;
      resumeBound = false;
      try { doc.removeEventListener?.('visibilitychange', onVis); } catch {}
      try { boundWin?.removeEventListener?.('focus', onFocus); } catch {}
      boundWin = null;
    };

    const teardown = () => {
      try { observer?.disconnect?.(); } catch {}
      observer = null;
      observingConfigKey = '';
      pendingAttrs.clear();
      unbindResume();
    };

    const computeObserveConfig = () => {
      let unfiltered = false;
      const filterSet = new Set();
      for (const sub of subscribers.values()) {
        if (!sub.filterSet) {
          unfiltered = true;
        } else {
          for (const a of sub.filterSet) filterSet.add(a);
        }
      }
      if (unfiltered || filterSet.size === 0) {
        return { key: '*', opts: { attributes: true } };
      }
      const list = Array.from(filterSet).sort();
      return { key: list.join(','), opts: { attributes: true, attributeFilter: list } };
    };

    const ensureStarted = () => {
      if (subscribers.size === 0) {
        teardown();
        return;
      }
      bindResume();
      const target = doc.documentElement;
      if (!target) return;
      const MO = resolveMO(doc, winRef);
      if (typeof MO !== 'function') return;
      const cfg = computeObserveConfig();
      if (observer && observingConfigKey === cfg.key) return;
      if (!observer) {
        observer = new MO((records) => {
          if (subscribers.size === 0) return;
          const changedAttrs = new Set();
          if (Array.isArray(records) && records.length > 0) {
            for (let i = 0; i < records.length; i += 1) {
              const name = records[i]?.attributeName;
              if (name) changedAttrs.add(String(name));
            }
          }
          if (changedAttrs.size === 0) changedAttrs.add('*');
          if (isWindowHibernated(doc, winRef)) {
            for (const a of changedAttrs) pendingAttrs.add(a);
            return;
          }
          if (pendingAttrs.size > 0) {
            for (const a of pendingAttrs) changedAttrs.add(a);
            pendingAttrs.clear();
          }
          dispatchAttrs(changedAttrs, false);
        });
      } else {
        try { observer.disconnect(); } catch {}
      }
      try {
        observer.observe(target, cfg.opts);
        observingConfigKey = cfg.key;
      } catch {}
    };

    const api = {
      subscribe(id, handler, opts = {}) {
        if (typeof handler !== 'function') return () => {};
        const key = String(id || `attr-${subscribers.size + 1}`);
        const filterList =
          Array.isArray(opts?.attributeFilter) && opts.attributeFilter.length > 0
            ? opts.attributeFilter.map(String).filter(Boolean)
            : null;
        const entry = {
          id: key,
          handler,
          filterSet: filterList ? new Set(filterList) : null,
          wakeOnResume: opts?.wakeOnResume !== false,
        };
        subscribers.set(key, entry);
        ensureStarted();
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          if (subscribers.get(key) === entry) {
            subscribers.delete(key);
            if (subscribers.size === 0) teardown();
            else ensureStarted();
          }
        };
      },
      getDebugState: () => ({
        subscriberCount: subscribers.size,
        observing: Boolean(observer),
        pendingAttrCount: pendingAttrs.size,
        configKey: observingConfigKey,
      }),
    };

    bus = {
      api,
      _setWin(nextWin) {
        if (!nextWin || nextWin === winRef) return;
        const wasBound = resumeBound;
        if (wasBound) unbindResume();
        winRef = nextWin;
        if (wasBound && subscribers.size > 0) bindResume();
      },
    };
    htmlAttrBuses.set(doc, bus);
    return api;
  }

  function writeComposerTextSafely(doc, win, ed, text, { replace = true } = {}) {
    if (!ed) return false;
    try {
      ed.focus?.();
      const tag = String(ed.tagName || '').toUpperCase();
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        ed.value = text;
        ed.dispatchEvent?.(new (win?.Event || Event)('input', { bubbles: true }));
        return true;
      }
      const isLexical =
        ed?.getAttribute?.('data-lexical-editor') === 'true' ||
        Boolean(ed?.closest?.('[data-lexical-editor="true"]'));
      if (replace) {
        let selected = false;
        if (typeof win?.getSelection === 'function' && typeof doc?.createRange === 'function') {
          try {
            const range = doc.createRange();
            range.selectNodeContents(ed);
            const sel = win.getSelection();
            sel?.removeAllRanges?.();
            sel?.addRange?.(range);
            selected = true;
          } catch {}
        }
        if (!selected && typeof doc?.execCommand === 'function') {
          try { doc.execCommand('selectAll', false); } catch {}
        }
      }
      const InputEv = win?.InputEvent || (typeof InputEvent === 'function' ? InputEvent : null);
      if (text === '') {
        let deleted = false;
        if (typeof doc?.execCommand === 'function') {
          try { deleted = Boolean(doc.execCommand('delete', false)); } catch {}
        }
        if (isLexical) {
          if (deleted || !String(ed.textContent || '').replace(/\u200B/g, '').trim()) {
            return true;
          }
          if (InputEv) {
            try {
              const ev = new InputEv('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' });
              const notCanceled = ed.dispatchEvent?.(ev);
              if (notCanceled === false) return true;
              ed.dispatchEvent?.(new InputEv('input', { bubbles: true, inputType: 'deleteContentBackward' }));
            } catch {}
          }
          return !String(ed.textContent || '').replace(/\u200B/g, '').trim();
        }
        if (String(ed.textContent || '').replace(/\u200B/g, '').trim()) {
          ed.textContent = '';
          ed.dispatchEvent?.(new (win?.Event || Event)('input', { bubbles: true }));
        }
        return true;
      }
      if (typeof doc?.execCommand === 'function' && doc.execCommand('insertText', false, text)) {
        return true;
      }
      if (isLexical) {
        if (InputEv) {
          try {
            const ev = new InputEv('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text });
            const notCanceled = ed.dispatchEvent?.(ev);
            if (notCanceled === false) return true;
          } catch {}
        }
        return false;
      }
      ed.textContent = text;
      ed.dispatchEvent?.(new (win?.Event || Event)('input', { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    OWNER_GLOBAL,
    LEGACY_OWNER_GLOBAL,
    INSTANCE_GLOBAL,
    LEGACY_INSTANCE_GLOBAL,
    SAG_INSTANCE_GLOBAL,
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    SAG_STORAGE_KEY,
    LEGACY_STORAGE_PREFIX,
    SAG_STORAGE_PREFIX,
    CUSTOM_PACKS_STORAGE_KEY,
    ALLOWED_HOST_LOCALES,
    ALLOWED_CONFLICT_POLICIES,
    ALLOWED_AUTO_ACCEPT_POLICIES,
    ALLOWED_THEME_PRESETS,
    ALLOWED_THEME_DENSITIES,
    ALLOWED_THEME_ACCENTS,
    ALLOWED_THEME_CORNERS,
    ALLOWED_THEME_SURFACES,
    ALLOWED_THEME_CODE_FONTS,
    ALLOWED_THEME_CHAT_FONTS,
    ALLOWED_THEME_AMBIENT_GLOWS,
    ALLOWED_THOUGHT_STYLES,
    MODULE_CATALOG,
    MODULE_GROUPS,
    MODULE_META,
    PRESETS,
    DEFAULT_CONFIG,
    resolvePresetPatch,
    sanitizeConfig,
    readHostOwner,
    shouldYieldToHostIntegrator,
    isWindowHibernated,
    markOwnedNoTranslate,
    isOwnedNode,
    isMutationOwnedOnly,
    safeInsertBefore,
    safeAppendChild,
    safeRemoveNode,
    getDomMutationBus,
    getHtmlAttrBus,
    writeComposerTextSafely,
    readStoredConfig,
    writeStoredConfig,
    clearStoredConfig,
    migrateLegacyStorage,
  };
});
