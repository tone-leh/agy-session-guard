// agy-Sag — Zero-Dependency Bundle Builder (ESM)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORE_DIR = path.resolve(__dirname, '..', 'packages', 'core');

export const CORE_FILES = [
  'i18n.js',
  'coexist.js',
  'context-source.js',
  'precompact-export.js',
  'recovery-handoff.js',
  'bookmark-vault.js',
  'session-watchdog.js',
  'styles.js',
  'host-i18n-packs.js',
  'host-i18n.js',
  'thought-translator.js',
  'draft-guard.js',
  'prompt-queue.js',
  'prompt-library.js',
  'reading-nav.js',
  'safe-auto-accept.js',
  'theme-studio.js',
  'quota-pulse.js',
  'nov-synergy.js',
  'clean-slate.js',
  'status-pill.js',
  'settings/tab-overview.js',
  'settings/tab-ui.js',
  'settings/tab-conversation.js',
  'settings/tab-guard.js',
  'settings/tab-nov.js',
  'settings/tab-advanced.js',
  'prism-bridge.js',
  'outline-bookmarks.js',
  'compact-guard.js',
  'session-radar.js',
  'index.js',
];

const GLOBAL_KEYS = [
  '__agSag',
  '__agSagExtPacks',
  '__agSagCore',
  '__agSagCoexist',
  '__agSagHostI18nPacks',
  '__agSagHostI18n',
  '__agSagThoughtTranslator',
  '__agSagPromptQueue',
  '__agSagPromptLibrary',
  '__agSagReadingNav',
  '__agSagSafeAutoAccept',
  '__agSagThemeStudio',
  '__agSagQuotaPulse',
  '__agSagNovSynergy',
  '__agSagBridgeReceiver',
  '__agSagHostBridge',
  '__agSessionGuard',
  '__agSgCore',
  '__agSgI18n',
  '__agSgCoexist',
  '__agSgContextSource',
  '__agSgPrecompactExport',
  '__agSgRecoveryHandoff',
  '__agSgBookmarkVault',
  '__agSgSessionWatchdog',
  '__agSgDraftGuard',
  '__agSgCleanSlate',
  '__agSgStatusPill',
  '__agSagSettingsTabOverview',
  '__agSagSettingsTabUi',
  '__agSagSettingsTabConversation',
  '__agSagSettingsTabGuard',
  '__agSagSettingsTabNov',
  '__agSagSettingsTabAdvanced',
  '__agSgPrismBridge',
  '__agSgOutlineBookmarks',
  '__agSgStyles',
  '__agSgCompactGuard',
  '__agSgSessionRadar',
];

export const REMOVE_EXPRESSION = `(() => {
  const curOwner = window.__agSagOwner || window.__agSessionGuardOwner;
  if (curOwner && curOwner !== 'standalone') {
    return { ok: true, status: 'yielded', owner: curOwner };
  }
  try { window.__agSag?.destroy?.(); } catch {}
  try { window.__agSessionGuard?.destroy?.(); } catch {}
  try { delete window.__agSagBridgeReceiver; } catch {}
  try { delete window.__agSagHostBridge; } catch {}
  try { delete window.__agSagNovSynergy; } catch {}
  try { document.getElementById('ag-sg-core-css')?.remove(); } catch {}
  try { document.getElementById('ag-sag-theme-css')?.remove(); } catch {}
  try { document.getElementById('ag-sag-queue-css')?.remove(); } catch {}
  try { document.querySelectorAll('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"], .ag-sag-smooth-caret, .ag-sag-ambient-glow, .ag-sag-ctx-toast').forEach((n) => n.remove()); } catch {}
  try { document.querySelectorAll('[data-ag-sag-code-folded], [data-ag-sag-code-enhanced], [data-ag-sag-code-wrap], [data-ag-sag-smooth-caret], [data-ag-sag-caret-host], [data-ag-sag-thought-hidden]').forEach((n) => { n.removeAttribute('data-ag-sag-code-folded'); n.removeAttribute('data-ag-sag-code-enhanced'); n.removeAttribute('data-ag-sag-code-wrap'); n.removeAttribute('data-ag-sag-smooth-caret'); n.removeAttribute('data-ag-sag-caret-host'); if (n.hasAttribute('data-ag-sag-thought-hidden')) { n.removeAttribute('data-ag-sag-thought-hidden'); if (n.style) n.style.display = ''; } }); } catch {}
  try { if (typeof CSS !== 'undefined' && CSS.highlights && CSS.highlights.delete) { for (const h of ['ag-sag-sf0','ag-sag-sf1','ag-sag-sf2','ag-sag-sf3','ag-sag-sf4']) CSS.highlights.delete(h); } } catch {}
  try { document.querySelectorAll('#ag-prism-pulse-bar, [data-ag-prism-pulse-bar="true"], #ag-pulse-status-bar, [data-ag-pulse-bar="true"]').forEach((h) => { h?.shadowRoot?.querySelectorAll?.('[data-ag-sg-owned="1"], [data-ag-sag-owned="1"]')?.forEach?.((n) => n.remove()); }); } catch {}
  try {
    const html = document.documentElement;
    if (html) {
      const toRemove = [];
      if (html.attributes && typeof html.attributes.length === 'number') {
        for (let i = 0; i < html.attributes.length; i++) {
          const name = html.attributes[i]?.name;
          if (name && name.startsWith('data-ag-sag-')) toRemove.push(name);
        }
      }
      for (const fallbackAttr of [
        'data-ag-sag-host-i18n',
        'data-ag-sag-lang',
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
      ]) {
        if (!toRemove.includes(fallbackAttr)) toRemove.push(fallbackAttr);
      }
      for (const attr of toRemove) {
        try { html.removeAttribute(attr); } catch {}
      }
    }
  } catch {}
  for (const k of ${JSON.stringify(GLOBAL_KEYS)}) {
    try { delete window[k]; } catch {}
    try { delete globalThis[k]; } catch {}
  }
  try { window.__agSagManuallyRemoved = true; } catch {}
  return { ok: true, status: 'removed' };
})()`;

export function readCoreSources() {
  return CORE_FILES.map((file) => ({
    file,
    code: fs.readFileSync(path.join(CORE_DIR, file), 'utf8'),
  }));
}

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return',
  'case',
  'throw',
  'typeof',
  'in',
  'of',
  'void',
  'delete',
  'new',
  'else',
  'do',
  'yield',
  'await',
]);
const REGEX_PRECEDING_PUNCT = new Set([
  '',
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '~',
  '^',
  '+',
  '-',
  '*',
  '/',
  '%',
  '<',
  '>',
]);

const isIdentChar = (ch) => Boolean(ch) && /[\p{ID_Continue}$_\u200C\u200D]/u.test(ch);

function needsCodeSpace(prevCh, nextCh) {
  if (!prevCh || !nextCh || prevCh === '\n' || prevCh === ' ') return false;
  if (isIdentChar(prevCh) && isIdentChar(nextCh)) return true;
  if ((/[0-9]/.test(prevCh) && nextCh === '.') || (prevCh === '.' && /[0-9]/.test(nextCh))) return true;
  if (prevCh === nextCh && '+-*/&|?<>=.'.includes(prevCh)) return true;
  if (prevCh === '/' && (nextCh === '*' || nextCh === '/')) return true;
  if (prevCh === '?' && nextCh === '.') return true;
  if (prevCh === '<' && nextCh === '!') return true;
  if (prevCh === '-' && nextCh === '>') return true;
  if (prevCh === '=' && nextCh === '>') return true;
  if (nextCh === '=' && '+-*/%&|^!<>?='.includes(prevCh)) return true;
  return false;
}

function scanAndCompactJs(src) {
  const s = String(src ?? '').replace(/\r\n/g, '\n');
  if (!s) return { code: '', mode: 'code', tplDepth: 0 };

  let mode = 'code'; // 'code' | 'sq' | 'dq' | 'lineComment' | 'blockComment' | 'regex' | 'tpl'
  let inRegexClass = false;
  let blockCommentHasNewline = false;
  const tplStack = []; // stack of open '{' counts inside each nested ${...}
  let lastSigChar = '';
  let lastIdent = '';
  let curIdent = '';
  let lineHasCode = false;
  let pendingSpace = false;
  let lastOutChar = '';
  const chunks = [];

  const pushRaw = (ch) => {
    chunks.push(ch);
    lastOutChar = ch;
  };

  const flushPendingSpace = (nextCh, force = false) => {
    if (!pendingSpace) return;
    if (force || needsCodeSpace(lastOutChar, nextCh)) {
      pushRaw(' ');
    }
    pendingSpace = false;
  };

  const flushIdent = () => {
    if (curIdent) {
      lastIdent = curIdent;
      lastSigChar = '';
      curIdent = '';
    }
  };

  const canStartRegex = () => {
    if (lastIdent) return REGEX_PRECEDING_KEYWORDS.has(lastIdent);
    return REGEX_PRECEDING_PUNCT.has(lastSigChar);
  };

  const NO_ASI_AFTER = new Set([';', '{', ',', '(', '[', '=', '?', ':']);
  const emitCodeChar = (ch) => {
    if (ch === '\n') {
      flushIdent();
      pendingSpace = false;
      if (lineHasCode) {
        if (!NO_ASI_AFTER.has(lastOutChar)) {
          pushRaw('\n');
        }
        lineHasCode = false;
      }
      return;
    }
    if (ch === ' ' || ch === '\t') {
      flushIdent();
      if (lineHasCode) pendingSpace = true;
      return;
    }
    flushPendingSpace(ch);
    pushRaw(ch);
    lineHasCode = true;
  };

  const len = s.length;
  for (let i = 0; i < len; i += 1) {
    const ch = s[i];
    const next = i + 1 < len ? s[i + 1] : '';

    if (mode === 'lineComment') {
      if (ch === '\n') {
        mode = 'code';
        emitCodeChar('\n');
      }
      continue;
    }

    if (mode === 'blockComment') {
      if (ch === '\n') {
        blockCommentHasNewline = true;
      } else if (ch === '*' && next === '/') {
        mode = 'code';
        i += 1;
        if (blockCommentHasNewline) {
          emitCodeChar('\n');
        } else if (lineHasCode) {
          pendingSpace = true;
        }
        blockCommentHasNewline = false;
      }
      continue;
    }

    if (mode === 'sq' || mode === 'dq') {
      pushRaw(ch);
      if (ch === '\\' && i + 1 < len) {
        pushRaw(s[i + 1]);
        i += 1;
        continue;
      }
      if ((mode === 'sq' && ch === "'") || (mode === 'dq' && ch === '"')) {
        mode = 'code';
        lastSigChar = ch;
        lastIdent = '';
      }
      continue;
    }

    if (mode === 'regex') {
      pushRaw(ch);
      if (ch === '\\' && i + 1 < len) {
        pushRaw(s[i + 1]);
        i += 1;
        continue;
      }
      if (ch === '[' && !inRegexClass) {
        inRegexClass = true;
      } else if (ch === ']' && inRegexClass) {
        inRegexClass = false;
      } else if (ch === '/' && !inRegexClass) {
        mode = 'code';
        lastSigChar = ')';
        lastIdent = '';
      }
      continue;
    }

    if (mode === 'tpl') {
      pushRaw(ch);
      if (ch === '\\' && i + 1 < len) {
        pushRaw(s[i + 1]);
        i += 1;
        continue;
      }
      if (ch === '$' && next === '{') {
        pushRaw('{');
        i += 1;
        tplStack.push(1);
        mode = 'code';
        lineHasCode = true;
        lastSigChar = '{';
        lastIdent = '';
        curIdent = '';
        continue;
      }
      if (ch === '`') {
        mode = 'code';
        lineHasCode = true;
        lastSigChar = ')';
        lastIdent = '';
      }
      continue;
    }

    // mode === 'code'
    if (ch === '/' && next === '/') {
      flushIdent();
      mode = 'lineComment';
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      flushIdent();
      mode = 'blockComment';
      blockCommentHasNewline = false;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      flushIdent();
      flushPendingSpace(ch);
      pushRaw(ch);
      lineHasCode = true;
      mode = ch === "'" ? 'sq' : 'dq';
      continue;
    }
    if (ch === '`') {
      flushIdent();
      flushPendingSpace(ch);
      pushRaw(ch);
      lineHasCode = true;
      mode = 'tpl';
      continue;
    }
    if (ch === '/') {
      flushIdent();
      if (canStartRegex()) {
        flushPendingSpace('/', isIdentChar(lastOutChar) || lastOutChar === '/');
        pushRaw(ch);
        lineHasCode = true;
        mode = 'regex';
        inRegexClass = false;
        continue;
      }
      emitCodeChar(ch);
      lastSigChar = '/';
      lastIdent = '';
      continue;
    }

    if (ch === '{' && tplStack.length > 0) {
      tplStack[tplStack.length - 1] += 1;
    } else if (ch === '}' && tplStack.length > 0) {
      tplStack[tplStack.length - 1] -= 1;
      if (tplStack[tplStack.length - 1] === 0) {
        tplStack.pop();
        flushIdent();
        flushPendingSpace('}');
        pushRaw('}');
        lineHasCode = true;
        mode = 'tpl';
        continue;
      }
    }

    if (isIdentChar(ch)) {
      emitCodeChar(ch);
      curIdent += ch;
      continue;
    }

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      emitCodeChar(ch);
      continue;
    }

    flushIdent();
    emitCodeChar(ch);
    lastSigChar = ch;
    lastIdent = '';
  }

  return {
    code: chunks.join('').replace(/\n+$/, ''),
    mode: mode === 'lineComment' ? 'code' : mode,
    tplDepth: tplStack.length,
  };
}

/**
 * Zero-dependency, lexer-aware JS compactor for CDP inject bundles.
 * Safely strips comments, blank lines, and redundant code whitespace while
 * preserving strings, regex literals (including character classes), and
 * arbitrarily nested multiline template literals verbatim.
 */
export function compactCoreSource(src) {
  return scanAndCompactJs(src).code;
}

export function inspectCoreLexState(src) {
  const { mode, tplDepth } = scanAndCompactJs(src);
  return { mode, tplDepth };
}

export const EXT_PACK_LOCALES = Object.freeze([
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

export function resolveInjectExtLocale(rawLocale, navigatorLang = '') {
  const candidate = String(rawLocale || '').trim();
  const effective = !candidate || candidate.toLowerCase() === 'auto' ? String(navigatorLang || '').trim() : candidate;
  if (!effective) return null;
  const s = effective.toLowerCase().replace(/_/g, '-');
  if (s === 'en' || s.startsWith('en-')) return null;
  if (/^zh-(?:tw|hk|mo|hant)/.test(s) || /^yue\b/.test(s)) return 'zh-TW';
  if (s === 'zh' || s.startsWith('zh-')) return 'zh-CN';
  if (s === 'ja' || s.startsWith('ja-') || s === 'jp') return 'ja';
  if (s === 'ko' || s.startsWith('ko-') || s === 'kr') return 'ko';
  if (s === 'es' || s.startsWith('es-')) return 'es';
  if (s === 'fr' || s.startsWith('fr-')) return 'fr';
  if (s === 'de' || s.startsWith('de-')) return 'de';
  if (s === 'ru' || s.startsWith('ru-')) return 'ru';
  if (s === 'pt' || s.startsWith('pt-')) return 'pt-BR';
  return null;
}

export function readExtendedPackFile(locale, repoRoot = path.resolve(__dirname, '..')) {
  if (!EXT_PACK_LOCALES.includes(locale)) return null;
  const filePath = path.join(repoRoot, 'packages', 'core', 'locales', 'ext', `${locale}.json`);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const FREE_SYMBOL_RANGES = [
  [0x0100, 0x02af], // 2-byte UTF-8 (Latin Extended-A/B + IPA Extensions, 432 slots)
  [0x0370, 0x03ff], // 2-byte UTF-8 (Greek/Coptic, 144 slots)
  [0x0500, 0x052f], // 2-byte UTF-8 (Cyrillic Supplement, 48 slots)
  [0x0531, 0x0556], // 2-byte UTF-8 (Armenian uppercase, 38 slots)
  [0x0561, 0x0587], // 2-byte UTF-8 (Armenian lowercase, 39 slots)
  [0xe000, 0xf8ff], // 3-byte UTF-8 fallback (BMP Private Use Area)
];

function sqEsc(s) {
  return (
    "'" +
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\0/g, '\\x00')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029') +
    "'"
  );
}

function deepEqualAcrossRealms(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) return false;
  if (aIsArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqualAcrossRealms(a[i], b[i])) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const k = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqualAcrossRealms(a[k], b[k])) return false;
  }
  return true;
}

function evalJsExprInSandbox(exprSrc) {
  return vm.runInNewContext(`(${exprSrc})`, Object.create(null), { timeout: 2000 });
}

function evalUmdModuleInSandbox(code) {
  const sandbox = {
    module: { exports: {} },
    exports: null,
    globalThis: null,
    window: {},
  };
  sandbox.exports = sandbox.module.exports;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { timeout: 3000 });
  return sandbox.module.exports;
}

function createFreeSymbolGenerator(text) {
  const used = new Set();
  for (let i = 0; i < text.length; i += 1) {
    used.add(text.charCodeAt(i));
  }
  let rangeIdx = 0;
  let curCode = FREE_SYMBOL_RANGES[0][0];
  return function nextFreeSymbol() {
    while (rangeIdx < FREE_SYMBOL_RANGES.length) {
      const [, end] = FREE_SYMBOL_RANGES[rangeIdx];
      while (curCode <= end) {
        const code = curCode;
        curCode += 1;
        if (!used.has(code)) {
          used.add(code);
          return String.fromCharCode(code);
        }
      }
      rangeIdx += 1;
      if (rangeIdx < FREE_SYMBOL_RANGES.length) {
        curCode = FREE_SYMBOL_RANGES[rangeIdx][0];
      }
    }
    return null;
  };
}

function encodeDictLiteral(dict) {
  const joined = dict.join('');
  const sepCandidates = ['~', '^', '`', '|', '¦', '§', '¤', '¬', '¶', '¿', '\u00a6', '\u00a7'];
  const sep = sepCandidates.find((ch) => !joined.includes(ch));
  const arrSrc = `[${dict.map(sqEsc).join(',')}]`;
  if (!sep) return arrSrc;
  const splitSrc = `${sqEsc(dict.join(sep))}.split(${sqEsc(sep)})`;
  return Buffer.byteLength(splitSrc, 'utf8') < Buffer.byteLength(arrSrc, 'utf8') ? splitSrc : arrSrc;
}

function collectBpeNgramCandidates(text, { minOccurrences = 3, maxCount = 320, symBytes = 2, skipToken = null } = {}) {
  const freq = new Map();
  const len = text.length;
  for (let n = 4; n >= 2; n -= 1) {
    const step = len > 120000 ? 2 : 1;
    for (let i = 0; i <= len - n; i += step) {
      const tok = text.slice(i, i + n);
      if (skipToken && skipToken(tok)) continue;
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  const out = [];
  for (const [tok, cnt] of freq.entries()) {
    if (cnt < minOccurrences) continue;
    const tb = Buffer.byteLength(tok, 'utf8');
    if (tb <= symBytes) continue;
    const gain = (cnt - 1) * (tb - symBytes) - 4;
    if (gain > 4) out.push({ tok, cnt, gain });
  }
  return out.sort((a, b) => b.gain - a.gain || b.tok.length - a.tok.length).slice(0, maxCount);
}

function compressWithFreeSymbols(rawText, candidates, { minOccurrences = 2, entryOverhead = 3, bpePasses = 1, skipBpeToken = null } = {}) {
  const nextSym = createFreeSymbolGenerator(rawText);
  let packed = rawText;
  const dict = [];
  const syms = [];
  let pendingSym = null;

  const applyList = (list, minOcc) => {
    for (const { tok } of list) {
      const sym = pendingSym || nextSym();
      if (!sym) break;
      pendingSym = sym;
      const symBytes = Buffer.byteLength(sym, 'utf8');
      const tokBytes = Buffer.byteLength(tok, 'utf8');
      if (tokBytes <= symBytes) continue;
      const parts = packed.split(tok);
      const occurrences = parts.length - 1;
      if (
        occurrences >= minOcc &&
        occurrences * (tokBytes - symBytes) > tokBytes + symBytes + entryOverhead
      ) {
        packed = parts.join(sym);
        dict.push(tok);
        syms.push(sym);
        pendingSym = null;
      }
    }
  };

  applyList(candidates, minOccurrences);

  // Optional BPE-style second pass over already-compressed text (zero extra decoder overhead)
  for (let pass = 0; pass < bpePasses; pass += 1) {
    const extra = collectBpeNgramCandidates(packed, { minOccurrences: 3, maxCount: 280, skipToken: skipBpeToken });
    if (!extra.length) break;
    const prevLen = dict.length;
    applyList(extra, 3);
    if (dict.length === prevLen) break;
  }

  if (!dict.length) return null;
  let check = packed;
  for (let i = dict.length - 1; i >= 0; i -= 1) {
    check = check.split(syms[i]).join(dict[i]);
  }
  if (check !== rawText) return null;
  return { k: syms.join(''), d: dict, s: packed };
}

function minifyStaticCss(css) {
  const s = String(css ?? '');
  let out = '';
  let quote = '';
  const len = s.length;
  for (let i = 0; i < len; i += 1) {
    const ch = s[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < len) {
        out += s[i + 1];
        i += 1;
      } else if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (
      ch === ' ' ||
      ch === '\t' ||
      ch === '\n' ||
      ch === '\r' ||
      (ch === '/' && i + 1 < len && s[i + 1] === '*')
    ) {
      let j = i;
      while (j < len) {
        const c = s[j];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
          j += 1;
        } else if (c === '/' && j + 1 < len && s[j + 1] === '*') {
          j += 2;
          while (j < len && !(s[j] === '*' && j + 1 < len && s[j + 1] === '/')) {
            j += 1;
          }
          j += 2;
        } else {
          break;
        }
      }
      const prev = out.length > 0 ? out[out.length - 1] : '';
      const next = j < len ? s[j] : '';
      i = j - 1;
      if (!prev || !next) continue;
      // Preserve valid empty custom property declarations such as `--x: ;`
      if (prev === ':' && (next === ';' || next === '}')) {
        out += ' ';
        continue;
      }
      if ('{};,>~:'.includes(prev) || '{};,>~'.includes(next)) {
        continue;
      }
      out += ' ';
      continue;
    }
    out += ch;
  }
  return out;
}

function findTemplateConstRange(code, constName) {
  const marker = `const ${constName}=`;
  const start = code.indexOf(marker);
  if (start < 0) return null;
  let exprStart = start + marker.length;
  while (exprStart < code.length && (code[exprStart] === ' ' || code[exprStart] === '\t')) {
    exprStart += 1;
  }
  if (code[exprStart] !== '`') return null;
  let i = exprStart + 1;
  while (i < code.length) {
    const c = code[i];
    if (c === '\\' && i + 1 < code.length) {
      i += 2;
      continue;
    }
    if (c === '$' && code[i + 1] === '{') {
      // Dynamic template literal: refuse static CSS compaction
      return null;
    }
    if (c === '`') {
      let exprEnd = i + 1;
      if (code.startsWith('.trim()', exprEnd)) {
        exprEnd += '.trim()'.length;
      }
      return { exprStart, exprEnd };
    }
    i += 1;
  }
  return null;
}

function collectPatternCandidates(text, patterns, { minGain = 8, maxCount = 512, symBytes = 2 } = {}) {
  const freq = new Map();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const tok = m[0];
      if (!tok) {
        re.lastIndex += 1;
        continue;
      }
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .map(([tok, cnt]) => ({ tok, cnt, gain: (cnt - 1) * (Buffer.byteLength(tok, 'utf8') - symBytes) - 6 }))
    .filter((x) => x.gain > minGain)
    .sort((a, b) => b.gain - a.gain || b.tok.length - a.tok.length)
    .slice(0, maxCount);
}

function packExtExactLossless(exactObj) {
  const rawJson = JSON.stringify(exactObj || {});
  const candidates = collectPatternCandidates(
    rawJson,
    [
      /":"[A-Za-zА-Яа-яЁё0-9_-]{3,20}/g,
      /","[A-Za-z0-9_-]{3,20}/g,
      /[A-Za-zА-Яа-яЁё0-9_-]{4,28}/g,
      /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]{2,6}/g,
      /[A-Za-zА-Яа-яЁё]{3,16} [A-Za-zА-Яа-яЁё]{3,16}/g,
    ],
    { minGain: 18, maxCount: 600 }
  );

  return compressWithFreeSymbols(rawJson, candidates, { minOccurrences: 3, entryOverhead: 8 });
}

function packStringArrayConst(code, constName, { allow2D = true } = {}) {
  const marker = `const ${constName}=`;
  const start = code.indexOf(marker);
  if (start < 0) return code;
  const arrStart = start + marker.length;
  if (code[arrStart] !== '[') return code;
  let depth = 0;
  let quote = '';
  let arrEnd = -1;
  for (let i = arrStart; i < code.length; i += 1) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) { arrEnd = i + 1; break; }
    }
  }
  if (arrEnd < 0) return code;

  let parsed;
  try {
    parsed = evalJsExprInSandbox(code.slice(arrStart, arrEnd));
  } catch {
    return code;
  }
  if (
    !allow2D ||
    !Array.isArray(parsed) ||
    !parsed.length ||
    !parsed.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))
  ) {
    return code;
  }

  // Pick two separators guaranteed absent from parsed cells (prefer 1-byte ASCII, fallback to 2-byte ¦/§/¤/¬)
  const sepCandidates = ['~', '^', '`', '|', '¦', '§', '¤', '¬', '¶', '¿', '\u001e', '\u001f'];
  const allText = parsed.map((r) => r.join('')).join('');
  const freeSeps = sepCandidates.filter((ch) => !allText.includes(ch));
  if (freeSeps.length < 2) return code;
  const colSep = freeSeps[0];
  const rowSep = freeSeps[1];
  const flat = parsed.map((row) => row.join(colSep)).join(rowSep);

  const candidates = collectPatternCandidates(
    flat,
    [
      /[\u4e00-\u9fff]{2,6}/g,
      /[\u3040-\u30ff\u4e00-\u9fff]{2,6}/g,
      /[\uac00-\ud7af]{2,6}/g,
      /[A-Za-zА-Яа-яЁёÀ-ÿ0-9_-]{4,28}/g,
      /[A-Za-zÀ-ÿА-Яа-яЁё]{3,14} [A-Za-zÀ-ÿА-Яа-яЁё]{3,14}/g,
    ],
    { minGain: 8, maxCount: 600 }
  );

  const compressed = compressWithFreeSymbols(flat, candidates, { minOccurrences: 2, entryOverhead: 3, bpePasses: 3 });
  let replacement;
  if (compressed) {
    const dictSrc = encodeDictLiteral(compressed.d);
    replacement = `(()=>{const _k=${sqEsc(compressed.k)},_d=${dictSrc};let _s=${sqEsc(compressed.s)};for(let i=_d.length-1;i>=0;i--)_s=_s.split(_k[i]).join(_d[i]);return _s.split(${sqEsc(rowSep)}).map(r=>r.split(${sqEsc(colSep)}));})()`;
  } else {
    replacement = `${sqEsc(flat)}.split(${sqEsc(rowSep)}).map(r=>r.split(${sqEsc(colSep)}))`;
  }

  try {
    const restored = evalJsExprInSandbox(replacement);
    if (!deepEqualAcrossRealms(restored, parsed)) return code;
  } catch {
    return code;
  }

  if (Buffer.byteLength(replacement, 'utf8') >= Buffer.byteLength(code.slice(arrStart, arrEnd), 'utf8')) return code;
  return code.slice(0, arrStart) + replacement + code.slice(arrEnd);
}

function packHostI18nExactRows(code) {
  let out = packStringArrayConst(code, 'EXACT_ROWS');
  out = packStringArrayConst(out, 'PATTERN_ROWS');
  return out;
}

function packStaticJsonConst(code, constName, obj) {
  if (!obj || typeof obj !== 'object') return code;
  const marker = `const ${constName}=`;
  const start = code.indexOf(marker);
  if (start < 0) return code;
  const objStart = start + marker.length;
  if (code[objStart] !== '{') return code;
  let depth = 0;
  let quote = '';
  let objEnd = -1;
  for (let i = objStart; i < code.length; i += 1) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) { objEnd = i + 1; break; }
    }
  }
  if (objEnd < 0) return code;

  const rawJson = JSON.stringify(obj);
  const candidates = collectPatternCandidates(
    rawJson,
    [
      /","[A-Za-z0-9_]{3,32}":"/g,
      /"[A-Za-z0-9_]{4,32}":/g,
      /[\u4e00-\u9fff]{2,6}/g,
      /[\u3040-\u30ff\u4e00-\u9fff]{2,6}/g,
      /[\uac00-\ud7af]{2,6}/g,
      /[A-Za-zÀ-ÿА-Яа-яЁё0-9_-]{4,28}/g,
      /[A-Za-zÀ-ÿ]{3,14} [A-Za-zÀ-ÿ]{3,14}/g,
    ],
    { minGain: 6, maxCount: 640 }
  );

  const compressed = compressWithFreeSymbols(rawJson, candidates, { minOccurrences: 2, entryOverhead: 3, bpePasses: 3 });
  if (!compressed) return code;

  const dictSrc = encodeDictLiteral(compressed.d);
  const replacement = `(()=>{const _k=${sqEsc(compressed.k)},_d=${dictSrc};let _s=${sqEsc(compressed.s)};for(let i=_d.length-1;i>=0;i--)_s=_s.split(_k[i]).join(_d[i]);return JSON.parse(_s);})()`;

  try {
    const restored = evalJsExprInSandbox(replacement);
    if (!deepEqualAcrossRealms(restored, obj)) return code;
  } catch {
    return code;
  }

  if (Buffer.byteLength(replacement, 'utf8') >= Buffer.byteLength(code.slice(objStart, objEnd), 'utf8')) return code;
  return code.slice(0, objStart) + replacement + code.slice(objEnd);
}

function packStaticCssConstInCode(code, constName, { useDict = false, runtimeCss = null } = {}) {
  const range = findTemplateConstRange(code, constName);
  if (!range) return code;
  let origCss = runtimeCss;
  if (typeof origCss !== 'string') {
    try {
      const evaluated = evalJsExprInSandbox(code.slice(range.exprStart, range.exprEnd));
      if (typeof evaluated !== 'string') return code;
      origCss = evaluated;
    } catch {
      return code;
    }
  }
  const min = minifyStaticCss(origCss);
  let replacement = sqEsc(min);

  if (useDict) {
    const candidates = collectPatternCandidates(
      min,
      [
        /[a-z-]{4,24}:[^;{}]{4,40};/g,
        /color-mix\(in srgb,var\(--[a-z0-9-]{3,28}[^)]{0,32}\)/g,
        /var\(--[a-z0-9-]{3,32}(?:,[^)]{1,28})?\)/g,
        /\.ag-(?:sag|sg)-[a-z0-9-]+/g,
        /rgba\(\d+,\d+,\d+,[^)]+\)/g,
        /[a-z-]{5,28}:/g,
        /!important;/g,
      ],
      { minGain: 6, maxCount: 512 }
    );

    const compressed = compressWithFreeSymbols(min, candidates, {
      minOccurrences: 2,
      entryOverhead: 3,
      bpePasses: 1,
      skipBpeToken: (tok) => /[+()%01]/.test(tok) || /calc/i.test(tok),
    });
    if (compressed) {
      const dictSrc = encodeDictLiteral(compressed.d);
      const dictExpr = `(()=>{const _k=${sqEsc(compressed.k)},_d=${dictSrc};let _s=${sqEsc(compressed.s)};for(let i=_d.length-1;i>=0;i--)_s=_s.split(_k[i]).join(_d[i]);return _s;})()`;
      if (Buffer.byteLength(dictExpr, 'utf8') < Buffer.byteLength(replacement, 'utf8')) {
        replacement = dictExpr;
      }
    }
  }

  try {
    const restored = evalJsExprInSandbox(replacement);
    if (restored !== min) return code;
  } catch {
    return code;
  }

  if (Buffer.byteLength(replacement, 'utf8') >= Buffer.byteLength(code.slice(range.exprStart, range.exprEnd), 'utf8')) {
    return code;
  }
  return code.slice(0, range.exprStart) + replacement + code.slice(range.exprEnd);
}

function packFrozenArrayConst(code, constName) {
  const marker = `const ${constName}=Object.freeze([`;
  const start = code.indexOf(marker);
  if (start < 0) return code;
  const exprStart = start + `const ${constName}=`.length;
  const callOpen = exprStart + 'Object.freeze'.length;
  let depth = 0;
  let quote = '';
  let exprEnd = -1;
  for (let i = callOpen; i < code.length; i += 1) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) { exprEnd = i + 1; break; }
    }
  }
  if (exprEnd < 0) return code;

  let origArr;
  try {
    origArr = evalJsExprInSandbox(code.slice(exprStart, exprEnd));
  } catch {
    return code;
  }
  if (!Array.isArray(origArr) || !origArr.length) return code;
  const rawJson = JSON.stringify(origArr);
  try {
    if (!deepEqualAcrossRealms(JSON.parse(rawJson), origArr)) return code;
  } catch {
    return code;
  }

  const candidates = collectPatternCandidates(
    rawJson,
    [
      /","[A-Za-z0-9_]{3,24}":"/g,
      /"[A-Za-z0-9_]{3,24}":/g,
      /[\u4e00-\u9fff]{2,6}/g,
      /[A-Za-z0-9_-]{4,28}/g,
      /[A-Za-z]{3,14} [A-Za-z]{3,14}/g,
    ],
    { minGain: 6, maxCount: 384 }
  );
  const compressed = compressWithFreeSymbols(rawJson, candidates, { minOccurrences: 2, entryOverhead: 3, bpePasses: 1 });
  if (!compressed) return code;

  const dictSrc = encodeDictLiteral(compressed.d);
  const replacement = `Object.freeze((()=>{const _k=${sqEsc(compressed.k)},_d=${dictSrc};let _s=${sqEsc(compressed.s)};for(let i=_d.length-1;i>=0;i--)_s=_s.split(_k[i]).join(_d[i]);return JSON.parse(_s).map(Object.freeze);})())`;

  try {
    const restored = evalJsExprInSandbox(replacement);
    if (!deepEqualAcrossRealms(restored, origArr)) return code;
  } catch {
    return code;
  }

  if (Buffer.byteLength(replacement, 'utf8') >= Buffer.byteLength(code.slice(exprStart, exprEnd), 'utf8')) return code;
  return code.slice(0, exprStart) + replacement + code.slice(exprEnd);
}

function packFrozenObjectConst(code, constName, runtimeObj = null) {
  const marker = `const ${constName}=Object.freeze(`;
  const start = code.indexOf(marker);
  if (start < 0) return code;
  const exprStart = start + `const ${constName}=`.length;
  const callOpen = exprStart + 'Object.freeze'.length;
  let depth = 0;
  let quote = '';
  let exprEnd = -1;
  for (let i = callOpen; i < code.length; i += 1) {
    const c = code[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) { exprEnd = i + 1; break; }
    }
  }
  if (exprEnd < 0) return code;

  let origObj = runtimeObj;
  if (!origObj || typeof origObj !== 'object' || Array.isArray(origObj)) {
    try {
      origObj = evalJsExprInSandbox(code.slice(exprStart, exprEnd));
    } catch {
      return code;
    }
  }
  if (!origObj || typeof origObj !== 'object' || Array.isArray(origObj)) return code;
  const rawJson = JSON.stringify(origObj);
  try {
    if (!deepEqualAcrossRealms(JSON.parse(rawJson), origObj)) return code;
  } catch {
    return code;
  }

  const candidates = collectPatternCandidates(
    rawJson,
    [
      /","[A-Za-z0-9_-]{3,28}":"/g,
      /"[A-Za-z0-9_-]{3,28}":/g,
      /#[0-9a-fA-F]{6}/g,
      /rgba\([^)]{4,28}\)/g,
      /[A-Za-z0-9_-]{4,28}/g,
    ],
    { minGain: 4, maxCount: 384 }
  );
  const compressed = compressWithFreeSymbols(rawJson, candidates, { minOccurrences: 2, entryOverhead: 3, bpePasses: 1 });
  let replacement;
  if (compressed) {
    const dictSrc = encodeDictLiteral(compressed.d);
    replacement = `(()=>{const _f=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const k in v)_f(v[k]);}return v;},_k=${sqEsc(compressed.k)},_d=${dictSrc};let _s=${sqEsc(compressed.s)};for(let i=_d.length-1;i>=0;i--)_s=_s.split(_k[i]).join(_d[i]);return _f(JSON.parse(_s));})()`;
  } else {
    replacement = `(()=>{const _f=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const k in v)_f(v[k]);}return v;};return _f(JSON.parse(${sqEsc(rawJson)}));})()`;
  }

  try {
    const restored = evalJsExprInSandbox(replacement);
    if (!deepEqualAcrossRealms(restored, origObj)) return code;
  } catch {
    return code;
  }

  if (Buffer.byteLength(replacement, 'utf8') >= Buffer.byteLength(code.slice(exprStart, exprEnd), 'utf8')) return code;
  return code.slice(0, exprStart) + replacement + code.slice(exprEnd);
}

function compactCorePart(part) {
  let code = compactCoreSource(part.code);
  if (part.file === 'styles.js') {
    let runtimeCss = null;
    try {
      const stylesMod = evalUmdModuleInSandbox(part.code);
      if (typeof stylesMod?.CORE_CSS === 'string') runtimeCss = stylesMod.CORE_CSS;
    } catch {}
    code = packStaticCssConstInCode(code, 'CORE_CSS', { useDict: true, runtimeCss });
  } else if (part.file === 'prompt-queue.js') {
    code = packStaticCssConstInCode(code, 'QUEUE_CSS', { useDict: true });
  } else if (part.file === 'status-pill.js') {
    code = packStaticCssConstInCode(code, 'PRISM_SHADOW_CSS', { useDict: true });
  } else if (part.file === 'prompt-library.js') {
    code = packFrozenArrayConst(code, 'BUILTIN_SLASH_ITEMS');
    code = packFrozenArrayConst(code, 'NOV_PLAYBOOK_ITEMS');
    code = packFrozenArrayConst(code, 'BUILTIN_TEMPLATES');
  } else if (part.file === 'nov-synergy.js') {
    code = packFrozenArrayConst(code, 'NOV_MODULES_META');
    code = packFrozenArrayConst(code, 'NOV_PRESETS_META');
    code = packFrozenObjectConst(code, 'NOV_MODULE_CATEGORIES');
  } else if (part.file === 'coexist.js') {
    code = packFrozenObjectConst(code, 'MODULE_META');
    code = packFrozenObjectConst(code, 'DEFAULT_CONFIG');
    code = packFrozenObjectConst(code, 'PRESETS');
  } else if (part.file === 'theme-studio.js') {
    let tsMod = null;
    try { tsMod = evalUmdModuleInSandbox(part.code); } catch {}
    code = packFrozenObjectConst(code, 'THEME_PRESETS', tsMod?.THEME_PRESETS);
    code = packFrozenObjectConst(code, 'LOOK_PRESETS', tsMod?.LOOK_PRESETS);
    code = packFrozenObjectConst(code, 'ACCENT_PRESETS', tsMod?.ACCENT_PRESETS);
    code = packFrozenObjectConst(code, 'SURFACE_PRESETS', tsMod?.SURFACE_PRESETS);
    code = packFrozenObjectConst(code, 'CORNER_PRESETS', tsMod?.CORNER_PRESETS);
    code = packFrozenObjectConst(code, 'CODE_FONT_PRESETS', tsMod?.CODE_FONT_PRESETS);
    code = packFrozenObjectConst(code, 'CHAT_FONT_PRESETS', tsMod?.CHAT_FONT_PRESETS);
    code = packFrozenObjectConst(code, 'DENSITY_PRESETS', tsMod?.DENSITY_PRESETS);
    code = packFrozenObjectConst(code, 'DEFAULT_SETTINGS', tsMod?.DEFAULT_SETTINGS);
  } else if (part.file === 'host-i18n-packs.js') {
    code = packHostI18nExactRows(code);
  } else if (part.file === 'i18n.js') {
    try {
      const i18nMod = evalUmdModuleInSandbox(part.code);
      code = packStaticJsonConst(code, 'PACKS', i18nMod?.PACKS);
      code = packStaticJsonConst(code, 'SAG_UI_PACKS', i18nMod?.SAG_UI_PACKS);
    } catch {}
  }
  return code;
}

function combineCoreParts(parts, useCompact) {
  return parts
    .map((p) => (useCompact ? compactCorePart(p) : `/* ${p.file} */\n${p.code}`))
    .join('\n;\n');
}

export function computeCoreHash(parts = readCoreSources(), opts = {}) {
  const useCompact = opts.compact !== false;
  const combined = combineCoreParts(parts, useCompact);
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
}

export function buildInjectExpression(config = null, opts = {}) {
  const parts = Array.isArray(opts.parts) ? opts.parts : readCoreSources();
  const useCompact = opts.compact !== false;
  const combined = combineCoreParts(parts, useCompact);
  const codeHash = crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
  const cfgJson = JSON.stringify(config && typeof config === 'object' ? config : null);
  const sourceJson = JSON.stringify(typeof opts.source === 'string' && opts.source ? opts.source : 'standalone');

  const resolvedExtLoc = opts.deferExtPack
    ? null
    : resolveInjectExtLocale(
        opts.extLocale ?? (config && typeof config === 'object' ? config.hostI18nLocale : null),
        opts.navigatorLang || ''
      );
  const extPack = resolvedExtLoc ? readExtendedPackFile(resolvedExtLoc) : null;
  let extPrelude = '';
  if (extPack) {
    const compactPatterns = Array.isArray(extPack.patterns)
      ? extPack.patterns.map((p) => (p?.flags && p.flags !== 'i' ? [p.source, p.replace, p.flags] : [p?.source || '', p?.replace || '']))
      : [];
    const exactObj = extPack.exact && typeof extPack.exact === 'object' ? extPack.exact : {};
    const packedExact = packExtExactLossless(exactObj);
    let packedPrelude = '';
    if (packedExact) {
      const metaJson = JSON.stringify({ locale: extPack.meta?.locale || resolvedExtLoc });
      const dictSrc = encodeDictLiteral(packedExact.d);
      const patSrc = JSON.stringify(compactPatterns);
      const candidatePrelude = `(()=>{const _k=${sqEsc(packedExact.k)},_d=${dictSrc},_p=${patSrc};let _s=${sqEsc(packedExact.s)};for(let i=_d.length-1;i>=0;i--)_s=_s.split(_k[i]).join(_d[i]);window.__agSagExtPacks=window.__agSagExtPacks||{};window.__agSagExtPacks[${JSON.stringify(resolvedExtLoc)}]={meta:${metaJson},exact:JSON.parse(_s),patterns:_p.map(x=>({source:x[0],flags:x[2]||'i',replace:x[1]}))};})();`;
      try {
        const probeBox = { window: {} };
        vm.runInNewContext(candidatePrelude, probeBox, { timeout: 2000 });
        if (deepEqualAcrossRealms(probeBox.window.__agSagExtPacks?.[resolvedExtLoc]?.exact, exactObj)) {
          packedPrelude = candidatePrelude;
        }
      } catch {}
    }
    if (packedPrelude) {
      extPrelude = packedPrelude;
    } else {
      const wirePack = {
        meta: { locale: extPack.meta?.locale || resolvedExtLoc },
        exact: exactObj,
        p: compactPatterns,
      };
      extPrelude = `(()=>{const _w=${JSON.stringify(wirePack)};window.__agSagExtPacks=window.__agSagExtPacks||{};window.__agSagExtPacks[${JSON.stringify(resolvedExtLoc)}]={meta:_w.meta,exact:_w.exact,patterns:_w.p.map(x=>({source:x[0],flags:x[2]||'i',replace:x[1]}))};})();`;
    }
  }

  return `(() => {
  try {
    if (window.self !== window.top) return { ok: false, status: 'skipped-subframe' };
  } catch {
    return { ok: false, status: 'skipped-subframe' };
  }
  const targetHash = ${JSON.stringify(codeHash)};
  const bootCfg = ${cfgJson};
  const source = ${sourceJson};
  const respectManualRemove = ${JSON.stringify(Boolean(opts.respectManualRemove))};
  const curOwner = window.__agSagOwner || window.__agSessionGuardOwner;
  if (curOwner && curOwner !== source) {
    return { ok: true, yielded: true, owner: curOwner, codeHash: targetHash, brand: 'agy-Sag' };
  }
  if (respectManualRemove && window.__agSagManuallyRemoved) {
    return { ok: true, yielded: true, removedByUser: true, codeHash: targetHash, brand: 'agy-Sag' };
  }
  try { delete window.__agSagManuallyRemoved; } catch {}
  ${extPrelude}
  const prev = window.__agSag || window.__agSessionGuard;
  if (prev && !prev.getDebugState?.()?.destroyed && prev.__agSgHash === targetHash) {
    if (typeof prev.syncExtPacks === 'function') prev.syncExtPacks();
    if (bootCfg && typeof prev.updateConfig === 'function') prev.updateConfig(bootCfg);
    if (typeof prev.evaluateNow === 'function') void prev.evaluateNow();
    return { ok: true, reused: true, codeHash: targetHash, brand: 'agy-Sag' };
  }
  ${combined}
  const api = (window.__agSagCore || window.__agSgCore)?.mountSag?.({
    win: window,
    doc: document,
    source,
    ...(bootCfg ? { config: bootCfg } : {}),
  }) || (window.__agSagCore || window.__agSgCore)?.mountSessionGuard?.({
    win: window,
    doc: document,
    source,
    ...(bootCfg ? { config: bootCfg } : {}),
  });
  if (api) api.__agSgHash = targetHash;
  return { ok: Boolean(api), yielded: Boolean(api?.yielded), codeHash: targetHash, brand: 'agy-Sag', version: api?.version || '1.5.0' };
})()`;
}
