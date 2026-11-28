#!/usr/bin/env node
/**
 * agy-Sag (Antigravity Superpower & Agent Guard) — Unified Zero-Dependency CLI Entrypoint (ESM)
 *
 * Subcommands:
 *   agy-sag help | --help
 *   agy-sag presets [--json]
 *   agy-sag i18n list [--json]
 *   agy-sag i18n validate [--json]
 *   agy-sag storage <audit|backup|export> [...]
 *   agy-sag attach [--preset=...] [--lang=...] [--port=...] [--threshold=...] [--mode=...] [--dry-run] [--json]
 *   agy-sag status [--port=...] [--json]
 *   agy-sag remove [--port=...] [--dry-run] [--json]
 *   agy-sag watch [--preset=...] [--lang=...] [--port=...] [--interval=...] [--once] [--json]
 *   agy-sag doctor [--port=...] [--prism-dir=...] [--json]
 *   agy-sag nov <status|enable|disable|preset|locale> [...]
 *   agy-sag install [--dir=...] [--dry-run]
 *   agy-sag workbench [--port=4179] [--smoke]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXT_PACK_LOCALES } from './bundle.mjs';
import { runCdpAttachCli } from './cdp-attach.mjs';
import { runDoctorCli } from './doctor.mjs';
import { runInstallPluginCli } from './install-plugin.mjs';
import {
  ALLOWED_NOV_LOCALES,
  NOV_MODULE_IDS,
  NOV_PRESET_IDS,
  applyNovCommand,
  readNovState,
} from './nov-bridge.mjs';
import {
  auditAntigravityStorage,
  createStorageBackup,
  exportSanitizedSession,
  formatStorageAuditHuman,
  formatStorageSearchHuman,
  parseStorageArgs,
  searchSanitizedSessions,
} from './storage-doctor.mjs';
import {
  applyPrismMigration,
  buildLaunchAgentPlist,
  inspectPrismMigration,
  runKeepaliveCli,
  runLaunchCli,
} from './launcher.mjs';
import { isCliEntry } from './platform-utils.mjs';
import { startWatchDaemonCli } from './watch-daemon.mjs';

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coexist = require('../packages/core/coexist.js');
const packsMod = require('../packages/core/host-i18n-packs.js');

const PRESET_DESCRIPTIONS = Object.freeze({
  essential: 'Balanced default: 10-language UI translation, compact guard, draft vault, prompt queue & watchdog.',
  'i18n-only': 'Minimal footprint: native Antigravity UI translation only; all other modules disabled.',
  power: 'Power workspace: essential modules + prompt library, reading navigation, turn bookmarks, optical theme studio & read-only quota pulse.',
  'full-auto': 'All 13 modules active, including sidebar radar and policy-gated safe auto-accept (readonly-safe).',
});

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let idx = 0;
  let val = n;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return idx === 0 ? `${Math.round(val)} B` : `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${units[idx]}`;
}

export function formatHelpText() {
  return [
    'agy-Sag — Modular Zero-ASAR Deep Enhancement Suite for Google Antigravity 2.0',
    '=============================================================================',
    '',
    'Usage: agy-sag <command> [options]',
    '',
    'Commands:',
    '  help, --help                 Show this help message',
    '  presets [--json]             List essential / i18n-only / power / full-auto presets & enabled modules',
    '  i18n list [--json]           List all 10 native host UI translation locales with pack counts',
    '  i18n validate [--json]       Validate all built-in host i18n packs (exit 0 on pass, 1 on error)',
    '  storage <cmd> [...]          Offline storage doctor: audit | backup | export | search (read-only & redacted)',
    '  attach [...]                 Attach agy-Sag to Antigravity CDP windows (--preset=, --lang=, --port=)',
    '  status [...]                 Inspect mounted agy-Sag state on Antigravity CDP windows',
    '  remove [...]                 Losslessly detach & clean agy-Sag from Antigravity CDP windows',
    '  watch [...]                  Start Zero-ASAR auto-attach watch daemon (--preset=, --lang=, --once)',
    '  launch [...]                 Zero-intrusive CDP launch helper (--port=, --dry-run, --print-launchagent)',
    '  keepalive [...]              CDP keepalive + SagWatchDaemon supervisor (--port=, --interval=, --once)',
    '  migrate-from-prism [...]     Inspect or migrate Obsidian Prism settings & thought provider (--dry-run | --apply)',
    '  doctor [...]                 Run environment, Obsidian Prism & agy-NOV dual-star diagnostics',
    '  nov <cmd> [...]              Dual-star agy-NOV control: status | enable | disable | preset | locale',
    '  install [...]                Install native plugin bundle to ~/.gemini/config/plugins/agy-sag',
    '  workbench [--port=4179]      Launch All-in-One Offline Workbench (--smoke for self-check)',
    '',
    'Examples:',
    '  agy-sag presets',
    '  agy-sag i18n validate',
    '  agy-sag attach --preset=power --lang=zh-CN',
    '  agy-sag watch --preset=essential --lang=ja',
    '  agy-sag nov status',
    '  agy-sag nov preset power',
    '  agy-sag storage audit --top=15',
    '  agy-sag workbench --smoke',
  ].join('\n');
}

function buildPresetsData() {
  const presetsObj = coexist.PRESETS || {};
  const list = Object.keys(presetsObj).map((id) => {
    const spec = presetsObj[id];
    const modulesMap = spec?.modules || {};
    const enabledModules = Object.entries(modulesMap)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([modId]) => modId);
    const disabledModules = Object.entries(modulesMap)
      .filter(([, enabled]) => !enabled)
      .map(([modId]) => modId);
    return {
      id,
      description: PRESET_DESCRIPTIONS[id] || '',
      autoAcceptPolicy: spec.autoAcceptPolicy || null,
      enabledCount: enabledModules.length,
      totalModules: Object.keys(modulesMap).length,
      enabledModules,
      disabledModules,
      modules: { ...modulesMap },
    };
  });
  return {
    ok: true,
    count: list.length,
    presets: list,
  };
}

function formatPresetsHuman(data) {
  const lines = [
    'agy-Sag · Configuration Presets',
    '===============================',
  ];
  for (const p of data.presets) {
    const policyTag = p.autoAcceptPolicy ? ` [autoAcceptPolicy: ${p.autoAcceptPolicy}]` : '';
    lines.push(`• ${p.id} (${p.enabledCount}/${p.totalModules} modules)${policyTag}`);
    if (p.description) lines.push(`  ${p.description}`);
    lines.push(`  Enabled: ${p.enabledModules.join(', ')}`);
  }
  return lines.join('\n');
}

function buildI18nListData() {
  const metas = packsMod.listLocales();
  const locales = metas.map((meta) => {
    const pack = packsMod.getPack(meta.locale);
    const exactCount = Object.keys(pack.exact || {}).length;
    const patternCount = Array.isArray(pack.patterns) ? pack.patterns.length : 0;
    return {
      locale: meta.locale,
      nativeName: meta.nativeName,
      englishName: meta.englishName,
      schemaVersion: meta.schemaVersion,
      exactCount,
      patternCount,
    };
  });
  return {
    ok: true,
    count: locales.length,
    locales,
  };
}

function formatI18nListHuman(data) {
  const lines = [
    `agy-Sag · Host UI Locales (${data.count} built-in packs)`,
    '================================================',
    `${'Locale'.padEnd(8)}  ${'Native Name'.padEnd(20)}  ${'Exact'.padStart(6)}  ${'Patterns'.padStart(8)}`,
    `${'-'.repeat(8)}  ${'-'.repeat(20)}  ${'-'.repeat(6)}  ${'-'.repeat(8)}`,
  ];
  for (const row of data.locales) {
    lines.push(
      `${row.locale.padEnd(8)}  ${row.nativeName.padEnd(20)}  ${String(row.exactCount).padStart(6)}  ${String(row.patternCount).padStart(8)}`
    );
  }
  return lines.join('\n');
}

function validateExtendedPacksOnDisk(repoRoot = REPO_ROOT) {
  const extDir = path.join(repoRoot, 'packages', 'core', 'locales', 'ext');
  const keepSet = new Set();
  for (const k of packsMod.KEEP_UNTRANSLATED_EXACT || []) {
    keepSet.add(k);
    keepSet.add(String(k).trim());
  }
  const errors = [];
  const extStats = {};
  if (!fs.existsSync(extDir)) {
    return { errors, extStats };
  }
  for (const file of fs.readdirSync(extDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const loc = file.slice(0, -'.json'.length);
    if (!EXT_PACK_LOCALES.includes(loc)) {
      errors.push(`[ext:${loc}] Unexpected extended pack locale outside allowlist`);
      continue;
    }
    const full = path.join(extDir, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      errors.push(`[ext:${loc}] Invalid JSON: ${e.message}`);
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push(`[ext:${loc}] Root must be an object`);
      continue;
    }
    let exactCount = 0;
    let patternCount = 0;
    if (parsed.exact && typeof parsed.exact === 'object' && !Array.isArray(parsed.exact)) {
      for (const [k, v] of Object.entries(parsed.exact)) {
        if (keepSet.has(k) || keepSet.has(String(k).trim())) {
          errors.push(`[ext:${loc}] exact contains protected KEEP key "${k}"`);
        }
        if (typeof v !== 'string' || !v.trim()) {
          errors.push(`[ext:${loc}] exact["${k}"] must be a non-empty string`);
        }
        exactCount += 1;
      }
    } else if (parsed.exact !== undefined) {
      errors.push(`[ext:${loc}] exact must be an object`);
    }
    if (Array.isArray(parsed.patterns)) {
      for (let i = 0; i < parsed.patterns.length; i++) {
        const p = parsed.patterns[i];
        const src = p?.source;
        const flg = String(p?.flags || '').replace(/[gy]/g, '');
        if (typeof src !== 'string' || !src.trim() || typeof p?.replace !== 'string' || !p.replace.trim()) {
          errors.push(`[ext:${loc}] patterns[${i}] missing source or replace`);
          continue;
        }
        try {
          new RegExp(src, flg);
        } catch (e) {
          errors.push(`[ext:${loc}] patterns[${i}] invalid RegExp: ${e.message}`);
          continue;
        }
        if (/\((?:[^()\\]|\\.)*[+*][^()]*\)[+*{]/.test(src)) {
          errors.push(`[ext:${loc}] patterns[${i}] unsafe nested quantifier`);
          continue;
        }
        if (/\\[1-9]|\\k</.test(src)) {
          errors.push(`[ext:${loc}] patterns[${i}] backreference not allowed`);
          continue;
        }
        const groups = packsMod.countCapturingGroups ? packsMod.countCapturingGroups(src) : 0;
        for (const m of p.replace.matchAll(/\{(\d+)\}/g)) {
          const idx = Number(m[1]);
          if (idx < 1 || idx > groups) {
            errors.push(`[ext:${loc}] patterns[${i}] placeholder {${idx}} out of range (groups=${groups})`);
          }
        }
        patternCount += 1;
      }
    } else if (parsed.patterns !== undefined) {
      errors.push(`[ext:${loc}] patterns must be an array`);
    }
    extStats[loc] = { exactCount, patternCount, total: exactCount + patternCount };
  }
  return { errors, extStats };
}

function formatI18nValidateHuman(res) {
  const metaMap = new Map(packsMod.listLocales().map((m) => [m.locale, m]));
  const extStats = res.stats?.extendedLocales || {};
  const lines = [
    `agy-Sag · Host i18n Pack Validation (${res.ok ? 'PASS' : 'FAIL'})`,
    '========================================================================',
    `${'Locale'.padEnd(8)}  ${'Native Name'.padEnd(20)}  ${'Core'.padStart(6)}  ${'Ext'.padStart(6)}  ${'Patterns'.padStart(8)}  ${'Coverage'.padStart(8)}`,
    `${'-'.repeat(8)}  ${'-'.repeat(20)}  ${'-'.repeat(6)}  ${'-'.repeat(6)}  ${'-'.repeat(8)}  ${'-'.repeat(8)}`,
  ];
  for (const [loc, st] of Object.entries(res.stats?.locales || {})) {
    const nativeName = metaMap.get(loc)?.nativeName || loc;
    const ext = extStats[loc] || { exactCount: 0, patternCount: 0 };
    const totalPat = st.patternCount + ext.patternCount;
    const coverage = st.exactCount + ext.exactCount + totalPat;
    lines.push(
      `${loc.padEnd(8)}  ${nativeName.padEnd(20)}  ${String(st.exactCount).padStart(6)}  ${String(ext.exactCount).padStart(6)}  ${String(totalPat).padStart(8)}  ${String(coverage).padStart(8)}`
    );
  }
  lines.push('');
  if (res.ok) {
    lines.push(`✔ Validated ${res.stats?.localeCount || 0} built-in pack(s) + ${Object.keys(extStats).length} extended pack(s) with 0 errors.`);
  } else {
    lines.push(`✖ Validation failed with ${res.errors.length} error(s):`);
    for (const err of res.errors) {
      lines.push(`  • ${err}`);
    }
  }
  return lines.join('\n');
}

function runStorageForward(rest, out) {
  const opts = parseStorageArgs(rest);
  if (opts.help) {
    out.stdout(
      [
        'Usage:',
        '  agy-sag storage audit [--data-dir=<dir>] [--top=<n>] [--json]',
        '  agy-sag storage backup --out=<dir> [--data-dir=<dir>] [--dry-run] [--json]',
        '  agy-sag storage export --session=<id> [--data-dir=<dir>] [--format=md|json] [--out=<file>]',
        '  agy-sag storage search --q=<keyword> [--data-dir=<dir>] [--limit=<1..20>] [--json]',
      ].join('\n')
    );
    return { ok: true, exitCode: 0 };
  }

  if (opts.command === 'search') {
    const report = searchSanitizedSessions({
      dataDir: opts.dataDir,
      query: opts.query,
      limit: opts.limit,
    });
    out.stdout(opts.json ? JSON.stringify(report, null, 2) : formatStorageSearchHuman(report));
    return { ok: true, exitCode: 0, data: report };
  }

  if (opts.command === 'audit') {
    const report = auditAntigravityStorage({ dataDir: opts.dataDir, topN: opts.topN });
    out.stdout(opts.json ? JSON.stringify(report, null, 2) : formatStorageAuditHuman(report));
    return { ok: true, exitCode: 0, data: report };
  }

  if (opts.command === 'backup') {
    const res = createStorageBackup({
      dataDir: opts.dataDir,
      outDir: opts.outDir,
      dryRun: opts.dryRun,
    });
    if (opts.json) {
      out.stdout(JSON.stringify(res, null, 2));
    } else {
      const mode = res.dryRun ? 'DRY RUN' : 'BACKUP COMPLETE';
      out.stdout(`[agy-Sag:storage] ${mode}: ${res.fileCount} file(s), ${formatBytes(res.totalBytes)} -> ${res.outDir}`);
      if (res.walActive) {
        out.stdout('⚠ WAL active detected; live SQLite WAL/SHM/DB lock files were skipped safely.');
      }
      for (const w of res.warnings) out.stdout(`  • ${w}`);
    }
    return { ok: Boolean(res.ok), exitCode: res.ok ? 0 : 1, data: res };
  }

  if (opts.command === 'export') {
    const res = exportSanitizedSession({
      dataDir: opts.dataDir,
      sessionId: opts.sessionId,
      outFile: opts.outFile,
      format: opts.format,
    });
    if (typeof res === 'string') {
      out.rawStdout(res);
      return { ok: true, exitCode: 0, data: res };
    }
    if (opts.json) {
      out.stdout(JSON.stringify({ ...res, content: undefined }, null, 2));
    } else {
      out.stdout(`[agy-Sag:storage] Exported ${res.entryCount} entries (${formatBytes(res.bytes)}) -> ${res.outFile}`);
    }
    return { ok: true, exitCode: 0, data: res };
  }

  return { ok: false, exitCode: 1 };
}

function parseNovSubArgs(argv = []) {
  const opts = {
    json: false,
    dataDir: null,
    positional: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? '');
    if (a === '--json') {
      opts.json = true;
    } else if (a.startsWith('--data-dir=')) {
      const val = a.slice('--data-dir='.length).trim();
      if (!val) throw new Error('Invalid --data-dir value: expected non-empty path');
      opts.dataDir = val;
    } else if (a === '--data-dir') {
      const next = argv[i + 1];
      if (!next || String(next).startsWith('--')) {
        throw new Error('Missing path after --data-dir');
      }
      opts.dataDir = String(next).trim();
      i += 1;
    } else {
      opts.positional.push(a);
    }
  }
  return opts;
}

function formatNovStateHuman(state, actionBanner = null) {
  const lines = [
    'agy-Sag × agy-NOV · Dual-Star Native Module Control',
    '===================================================',
  ];
  if (actionBanner) {
    lines.push(`✔ ${actionBanner}`);
  }
  const installTxt = state.installed
    ? `installed${state.version ? ` v${state.version}` : ''} (${state.pluginDir})`
    : 'not detected (config still readable/writable)';
  lines.push(`Plugin:   ${installTxt}`);
  lines.push(`Data Dir: ${state.dataDir}`);
  lines.push(`Config:   ${state.configPath} (${state.configExists ? 'exists' : 'defaults / read-only'})`);
  lines.push(
    `Preset:   ${state.config.preset} | Locale: ${state.config.locale} | Enabled: ${state.enabledModules.length}/${NOV_MODULE_IDS.length} (${state.enabledToolsCount} tools)`
  );
  lines.push('');
  lines.push(`${'Module'.padEnd(10)}  ${'State'.padEnd(8)}  ${'Tier'.padEnd(8)}  ${'Tools'.padStart(5)}`);
  lines.push(`${'-'.repeat(10)}  ${'-'.repeat(8)}  ${'-'.repeat(8)}  ${'-'.repeat(5)}`);
  for (const id of NOV_MODULE_IDS) {
    const meta = state.catalog[id];
    const enabled = Boolean(state.config.modules[id]);
    lines.push(
      `${id.padEnd(10)}  ${(enabled ? 'ON' : 'off').padEnd(8)}  ${meta.tier.padEnd(8)}  ${String(meta.toolsCount).padStart(5)}`
    );
  }
  return lines.join('\n');
}

function runNovForward(rest, out, io = {}) {
  const sub = (rest[0] || '').trim().toLowerCase();
  const subRest = rest.slice(1);

  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    const text = [
      'Usage:',
      '  agy-sag nov status [--json] [--data-dir=<dir>]',
      `  agy-sag nov enable <${NOV_MODULE_IDS.join('|')}> [--json] [--data-dir=<dir>]`,
      `  agy-sag nov disable <${NOV_MODULE_IDS.join('|')}> [--json] [--data-dir=<dir>]`,
      `  agy-sag nov preset <${NOV_PRESET_IDS.join('|')}> [--json] [--data-dir=<dir>]`,
      `  agy-sag nov locale <${ALLOWED_NOV_LOCALES.join('|')}> [--json] [--data-dir=<dir>]`,
    ].join('\n');
    out.stdout(text);
    return { ok: true, exitCode: 0, data: text };
  }

  let parsed;
  try {
    parsed = parseNovSubArgs(subRest);
  } catch (err) {
    const msg = err?.message || String(err);
    out.stderr(`[agy-Sag:nov] ${msg}`);
    return { ok: false, exitCode: 1, error: msg };
  }

  const bridgeOpts = {
    ...(io.novBridgeOpts || {}),
    ...(parsed.dataDir ? { explicitDataDir: parsed.dataDir } : {}),
  };

  if (sub === 'status') {
    const state = readNovState(bridgeOpts);
    const payload = { ok: true, state };
    out.stdout(parsed.json ? JSON.stringify(payload, null, 2) : formatNovStateHuman(state));
    return { ok: true, exitCode: 0, data: state };
  }

  let cmdObj = null;
  let banner = null;
  const arg = parsed.positional[0];

  if (sub === 'enable' || sub === 'disable') {
    if (!arg) {
      const msg = `Missing <moduleId> for "nov ${sub}" (allowed: ${NOV_MODULE_IDS.join(', ')})`;
      if (parsed.json) out.stdout(JSON.stringify({ ok: false, error: msg }, null, 2));
      else out.stderr(`[agy-Sag:nov] ${msg}`);
      return { ok: false, exitCode: 1, error: msg };
    }
    const enabled = sub === 'enable';
    cmdObj = { action: 'set_module', moduleId: arg, enabled };
    banner = `${enabled ? 'Enabled' : 'Disabled'} agy-NOV module "${arg}"`;
  } else if (sub === 'preset') {
    if (!arg) {
      const msg = `Missing <preset> for "nov preset" (allowed: ${NOV_PRESET_IDS.join(', ')})`;
      if (parsed.json) out.stdout(JSON.stringify({ ok: false, error: msg }, null, 2));
      else out.stderr(`[agy-Sag:nov] ${msg}`);
      return { ok: false, exitCode: 1, error: msg };
    }
    cmdObj = { action: 'apply_preset', preset: arg };
    banner = `Applied agy-NOV preset "${arg}"`;
  } else if (sub === 'locale') {
    if (!arg) {
      const msg = `Missing <locale> for "nov locale" (allowed: ${ALLOWED_NOV_LOCALES.join(', ')})`;
      if (parsed.json) out.stdout(JSON.stringify({ ok: false, error: msg }, null, 2));
      else out.stderr(`[agy-Sag:nov] ${msg}`);
      return { ok: false, exitCode: 1, error: msg };
    }
    cmdObj = { action: 'set_locale', locale: arg };
    banner = `Set agy-NOV locale to "${arg}"`;
  } else {
    const msg = `Unknown nov subcommand: "${rest[0] || ''}" (expected status | enable | disable | preset | locale)`;
    if (parsed.json) out.stdout(JSON.stringify({ ok: false, error: msg }, null, 2));
    else out.stderr(`[agy-Sag:nov] ${msg}`);
    return { ok: false, exitCode: 1, error: msg };
  }

  const res = applyNovCommand(cmdObj, bridgeOpts);
  if (!res.ok) {
    if (parsed.json) out.stdout(JSON.stringify(res, null, 2));
    else out.stderr(`[agy-Sag:nov] ${res.error}`);
    return { ok: false, exitCode: 1, error: res.error, data: res };
  }

  out.stdout(parsed.json ? JSON.stringify(res, null, 2) : formatNovStateHuman(res.state, banner));
  return { ok: true, exitCode: 0, data: res.state };
}

export async function runSagCli(argv = process.argv.slice(2), io = {}) {
  const args = Array.isArray(argv) ? argv.map(String) : [];
  const out = {
    stdout: typeof io.stdout === 'function' ? io.stdout : (s) => console.log(s),
    rawStdout: typeof io.rawStdout === 'function' ? io.rawStdout : (s) => process.stdout.write(s),
    stderr: typeof io.stderr === 'function' ? io.stderr : (s) => console.error(s),
  };

  const cmd = (args[0] || '').trim().toLowerCase();
  const rest = args.slice(1);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    const text = formatHelpText();
    out.stdout(text);
    return { ok: true, exitCode: 0, data: text };
  }

  if (cmd === 'presets') {
    const jsonMode = rest.includes('--json');
    const data = buildPresetsData();
    out.stdout(jsonMode ? JSON.stringify(data, null, 2) : formatPresetsHuman(data));
    return { ok: true, exitCode: 0, data };
  }

  if (cmd === 'i18n') {
    const sub = (rest[0] || '').trim().toLowerCase();
    const subRest = rest.slice(1);
    const jsonMode = subRest.includes('--json');

    if (sub === 'list') {
      const data = buildI18nListData();
      out.stdout(jsonMode ? JSON.stringify(data, null, 2) : formatI18nListHuman(data));
      return { ok: true, exitCode: 0, data };
    }

    if (sub === 'validate') {
      const coreRes = packsMod.validatePacks();
      const extCheck = validateExtendedPacksOnDisk();
      const res = {
        ok: Boolean(coreRes.ok && extCheck.errors.length === 0),
        errors: [...(coreRes.errors || []), ...extCheck.errors],
        stats: {
          ...(coreRes.stats || {}),
          extendedLocales: extCheck.extStats,
        },
      };
      out.stdout(jsonMode ? JSON.stringify(res, null, 2) : formatI18nValidateHuman(res));
      return { ok: Boolean(res.ok), exitCode: res.ok ? 0 : 1, data: res };
    }

    const msg = `Unknown i18n subcommand: "${rest[0] || ''}" (expected list | validate)`;
    out.stderr(`[agy-Sag] ${msg}`);
    return { ok: false, exitCode: 1, error: msg };
  }

  if (cmd === 'storage') {
    return runStorageForward(rest, out);
  }

  if (cmd === 'attach' || cmd === 'status' || cmd === 'remove') {
    const flag = `--${cmd}`;
    const forwarded = rest.includes(flag) ? rest : [flag, ...rest];
    const data = await runCdpAttachCli(forwarded);
    const ok = data ? data.ok !== false : true;
    return { ok, exitCode: ok ? 0 : 1, data };
  }

  if (cmd === 'watch') {
    const data = await startWatchDaemonCli(rest);
    const failed = Boolean(data && (data.ok === false || (data.status && data.status !== 'ok')));
    return { ok: !failed, exitCode: failed ? 1 : 0, data };
  }

  if (cmd === 'launch') {
    if (rest.includes('--print-launchagent')) {
      const plist = buildLaunchAgentPlist({
        nodePath: process.execPath,
        cliPath: path.join(REPO_ROOT, 'cli', 'sag-cli.mjs'),
      });
      out.stdout(plist);
      return { ok: true, exitCode: 0, data: { plist } };
    }
    const data = await runLaunchCli(rest, { out });
    const ok = data ? data.ok !== false : true;
    return { ok, exitCode: ok ? 0 : 1, data };
  }

  if (cmd === 'migrate-from-prism') {
    const jsonMode = rest.includes('--json');
    const applyMode = rest.includes('--apply') && !rest.includes('--dry-run');
    const data = applyMode ? applyPrismMigration({ dryRun: false }) : inspectPrismMigration({});
    if (jsonMode) {
      out.stdout(JSON.stringify(data, null, 2));
    } else {
      const src = data.sources || {};
      const lines = [
        `agy-Sag · Obsidian Prism Migration (${applyMode ? 'APPLIED' : 'DRY-RUN'})`,
        '============================================================',
        `Prism config found: ${src.prismConfigFound ? 'yes' : 'no'} | Thought config found: ${src.thoughtConfigFound ? 'yes' : 'no'}`,
      ];
      if (data.suggestedConfig) {
        const sc = data.suggestedConfig;
        lines.push(
          `Mapped: locale=${sc.hostI18nLocale || 'auto'} | theme=${sc.themePreset || 'native'} | thought=${sc.modules?.thoughtTranslate ? `${sc.thoughtEngine || 'openai'}/${sc.thoughtViewMode || 'bilingual'}` : 'off'} | style=${sc.thoughtStylePreset || 'technical'} | proxy=${sc.thoughtProxyMode || 'auto'}`
        );
      }
      if (Array.isArray(data.thoughtProfiles) && data.thoughtProfiles.length > 0) {
        lines.push('Thought profiles (redacted):');
        for (const p of data.thoughtProfiles) {
          lines.push(`  • ${p.active ? '[active] ' : ''}${p.name || 'default'} — ${p.model || 'n/a'} @ ${p.baseUrl || 'default'} (key=${p.hasApiKey ? 'stored' : 'none'})`);
        }
      }
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        lines.push('Recommendations:');
        for (const n of data.recommendations) lines.push(`  • ${n}`);
      }
      if (!applyMode) {
        lines.push('Run with --apply to write mapped agy-Sag config & 0600 translator-secrets.json (Prism files are never modified).');
      }
      out.stdout(lines.join('\n'));
    }
    const ok = data ? data.ok !== false : true;
    return { ok, exitCode: ok ? 0 : 1, data };
  }

  if (cmd === 'keepalive') {
    const data = await runKeepaliveCli(rest, { out });
    const failed = Boolean(data && data.status === 'blocked');
    return { ok: !failed, exitCode: failed ? 1 : 0, data };
  }

  if (cmd === 'doctor') {
    const data = await runDoctorCli(rest);
    const failed = Boolean(
      data &&
        (!data.node?.ok ||
          (data.cdp?.port && !data.cdp?.reachable) ||
          (Array.isArray(data.windows) && data.windows.some((w) => !w.ok)))
    );
    return { ok: !failed, exitCode: failed ? 1 : 0, data };
  }

  if (cmd === 'nov') {
    return runNovForward(rest, out, io);
  }

  if (cmd === 'install') {
    const data = runInstallPluginCli(rest);
    return { ok: Boolean(data?.ok), exitCode: data?.ok ? 0 : 1, data };
  }

  if (cmd === 'workbench') {
    let runWorkbenchCli;
    try {
      ({ runWorkbenchCli } = await import('../workbench/server.mjs'));
    } catch (err) {
      throw new Error(
        `Offline workbench is not bundled in this installed copy (run from repository checkout): ${err?.message || err}`
      );
    }
    const data = await runWorkbenchCli(rest);
    return { ok: true, exitCode: 0, data };
  }

  const msg = `Unknown command: "${args[0]}". Run "agy-sag help" to list supported commands.`;
  out.stderr(`[agy-Sag] ${msg}`);
  return { ok: false, exitCode: 1, error: msg };
}

const isEntry = isCliEntry(import.meta.url);
if (isEntry) {
  runSagCli(process.argv.slice(2))
    .then((res) => {
      if (res && typeof res.exitCode === 'number' && res.exitCode !== 0) {
        process.exitCode = res.exitCode;
      }
    })
    .catch((err) => {
      console.error('[agy-Sag]', err?.message || err);
      process.exitCode = 1;
    });
}
