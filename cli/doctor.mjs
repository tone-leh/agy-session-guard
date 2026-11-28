#!/usr/bin/env node
/**
 * agy-Sag — Zero-Dependency Environment, Prism Coexistence & Dual-Star Doctor CLI
 *
 * 100% Read-Only Diagnostics:
 *   1. Validates Node.js >= 22 + native WebSocket support.
 *   2. Checks Obsidian Prism installation / local beta checkout & unified-settings hooks.
 *   3. Checks companion plugin agy-NOV installation for dual-star synergy.
 *   4. Discovers Antigravity CDP port across macOS / Windows / Linux and probes host windows.
 *   5. Reports agy-Sag mount/yield status, Prism coexistence, sagModules state, context %, bookmarks & drafts.
 *   6. Prints platform-specific remediation steps when anything needs setup.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverCdpPort, evalViaCdp, httpGetJson, isAntigravityHostTarget } from './cdp-attach.mjs';
import { NOV_MODULE_IDS, readNovState } from './nov-bridge.mjs';
import { isCliEntry } from './platform-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export const DOCTOR_PROBE_EXPRESSION = `(() => {
  const html = document.documentElement;
  const settingsSec = document.getElementById('ag-cs-settings-sec');
  const modulesGroup = settingsSec?.querySelector?.('[data-ag-cs-group="modules"]') || null;
  const sgApi = window.__agSag || window.__agSessionGuard || null;
  const sgState = sgApi?.getDebugState?.() || null;
  const owner = window.__agSagOwner || window.__agSessionGuardOwner || null;

  let versionHint = '';
  try {
    const aboutTxt = settingsSec?.querySelector?.('[data-ag-cs-about="1"]')?.textContent || '';
    const m = aboutTxt.match(/Obsidian\\s+Prism\\s+v([0-9]+\\.[0-9]+\\.[0-9]+(?:-(?:beta|alpha|rc)\\.[0-9]+)?)/i);
    if (m && m[1]) versionHint = m[1];
  } catch {}

  let bookmarkCount = 0;
  let draftCount = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('agSag.bookmarks.v1:') || k.startsWith('agSessionGuard.bookmarks.v1:')) {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(arr)) bookmarkCount += arr.length;
      } else if (k.startsWith('agSag.draft.v1:') || k.startsWith('agSessionGuard.draft.v1:')) {
        draftCount += 1;
      }
    }
  } catch {}

  let ctxPct = sgState?.compactGuard?.lastSnapshot?.usedPct ?? null;
  let ctxSource = sgState?.compactGuard?.lastSnapshot?.source || '';
  if (ctxPct === null) {
    try {
      const snap = window.__agPrismMetricsBridge?.getLatestSnapshot?.();
      const frac = snap?.speed?.context?.usedFraction ?? snap?.context?.usedFraction;
      if (typeof frac === 'number' && Number.isFinite(frac)) {
        ctxPct = Math.round(Math.max(0, frac) * 100);
        ctxSource = 'prism-bridge';
      }
    } catch {}
  }

  let quotaSummary = null;
  try {
    quotaSummary = sgApi?.quotaPulse?.getSummary?.() || null;
  } catch {}

  const state =
    owner && owner !== 'standalone'
      ? 'yielded'
      : sgState && !sgState.destroyed
        ? 'mounted'
        : 'missing';

  return {
    lang: html?.getAttribute?.('data-ag-sag-lang') || html?.getAttribute?.('data-ag-cs-lang') || html?.getAttribute?.('lang') || navigator.language || '',
    theme: html?.getAttribute?.('data-ag-sag-theme-preset') || html?.getAttribute?.('data-ag-cs-theme') || '',
    sag: {
      state,
      owner: owner || (state === 'mounted' ? 'standalone' : null),
      version: sgApi?.version || null,
      codeHash: sgApi?.__agSgHash || null,
      threshold: sgState?.compactGuard?.config?.compactThreshold ?? null,
      mode: sgState?.compactGuard?.config?.compactTriggerMode ?? null,
      prismSettingsEmbedded: Boolean(sgState?.prismBridge?.embedded),
      bookmarkCount,
      draftCount,
    },
    sagModules: {
      hostI18nLocale: sgState?.hostI18n?.locale || sgState?.compactGuard?.config?.hostI18nLocale || null,
      hostI18nActive: Boolean(sgState?.hostI18n?.active),
      queueCount: Number(sgState?.promptQueue?.itemCount || 0),
      autoAcceptEnabled: Boolean(sgState?.safeAutoAccept?.enabled),
      themePreset: sgState?.themeStudio?.settings?.preset || sgState?.compactGuard?.config?.themePreset || 'native',
      quotaHealth: quotaSummary?.health || (sgState?.quotaPulse?.observed?.rateLimited ? 'limited' : 'ok'),
    },
    obsidianPrism: {
      active: Boolean(
        html?.hasAttribute?.('data-ag-cs-style') ||
          settingsSec ||
          window.__agPrismMetricsBridge ||
          document.querySelector('#ag-prism-pulse-bar, [data-ag-prism-pulse-bar="true"]')
      ),
      versionHint: versionHint || null,
      settingsPanelMounted: Boolean(settingsSec),
      modulesGroupFound: Boolean(modulesGroup),
      metricsBridgePresent: Boolean(window.__agPrismMetricsBridge),
      pulseBarPresent: Boolean(document.querySelector('#ag-prism-pulse-bar, [data-ag-prism-pulse-bar="true"]')),
    },
    context: {
      usedPct: ctxPct,
      source: ctxSource || null,
    },
  };
})()`;

export function parseDoctorArgs(argv) {
  const opts = {
    port: null,
    prismDir: null,
    json: false,
  };
  for (const a of argv || []) {
    if (a === '--json') opts.json = true;
    else if (a.startsWith('--port=')) {
      const p = Number(a.slice('--port='.length));
      if (!Number.isInteger(p) || p <= 0 || p > 65535) throw new Error(`Invalid --port value: ${a}`);
      opts.port = p;
    } else if (a.startsWith('--prism-dir=')) {
      const p = a.slice('--prism-dir='.length).trim();
      if (!p) throw new Error(`Invalid --prism-dir value: ${a}`);
      opts.prismDir = p;
    }
  }
  return opts;
}

export function checkNodeRuntime(version = process.version, hasWebSocket = typeof WebSocket === 'function') {
  const m = String(version || '').match(/^v?(\d+)\.(\d+)\.(\d+)/);
  const major = m ? Number(m[1]) : 0;
  const ok = major >= 22 && Boolean(hasWebSocket);
  return {
    ok,
    version: String(version || ''),
    major,
    hasWebSocket: Boolean(hasWebSocket),
  };
}

function readPrismPackageAt(dir) {
  if (!dir) return null;
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg || pkg.name !== 'obsidian-prism') return null;
    const settingsPath = path.join(dir, 'settings-panel.js');
    let unifiedSettingsHookReady = false;
    if (fs.existsSync(settingsPath)) {
      const src = fs.readFileSync(settingsPath, 'utf8');
      unifiedSettingsHookReady =
        src.includes('ag-cs-settings-sec') &&
        src.includes('data-ag-cs-group') &&
        src.includes("'modules'");
    }
    const ver = String(pkg.version || '');
    return {
      found: true,
      dir,
      version: ver,
      channel: /-beta\./i.test(ver) ? 'beta' : 'stable',
      unifiedSettingsHookReady,
    };
  } catch {
    return null;
  }
}

export function inspectPrismInstall({
  homeDir = os.homedir(),
  repoRoot = REPO_ROOT,
  explicitPrismDir = null,
  env = process.env,
} = {}) {
  const installedCandidates = [];
  if (explicitPrismDir) installedCandidates.push(path.resolve(explicitPrismDir));
  if (env?.AGY_PRISM_DIR) installedCandidates.push(path.resolve(env.AGY_PRISM_DIR));
  installedCandidates.push(path.join(homeDir, '.gemini', 'config', 'plugins', 'obsidian-prism'));

  let installed = null;
  for (const dir of installedCandidates) {
    const res = readPrismPackageAt(dir);
    if (res) {
      installed = res;
      break;
    }
  }

  const devCandidates = [
    env?.AGY_PRISM_REPO ? path.resolve(env.AGY_PRISM_REPO) : null,
    path.resolve(repoRoot, '..', 'obsidian-prism-dev'),
    path.resolve(repoRoot, '..', 'obsidian-prism'),
  ].filter(Boolean);

  let devCheckout = null;
  for (const dir of devCandidates) {
    if (installed && path.resolve(dir) === path.resolve(installed.dir)) continue;
    const res = readPrismPackageAt(dir);
    if (res) {
      devCheckout = res;
      break;
    }
  }

  return {
    installed: installed || { found: false, version: null, channel: null, unifiedSettingsHookReady: false },
    devCheckout: devCheckout || { found: false, version: null, channel: null, unifiedSettingsHookReady: false },
  };
}

export function inspectMarketplaceCompliance(repoRoot = REPO_ROOT) {
  const ALLOWED_MANIFEST_KEYS = new Set([
    'name',
    'displayName',
    'description',
    'version',
    'logo',
    'author',
    'homepage',
    'repository',
    'license',
    'keywords',
  ]);
  const issues = [];
  const manifestPath = path.join(repoRoot, 'plugin.json');
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    issues.push('plugin.json missing or invalid JSON');
  }
  if (manifest && typeof manifest === 'object') {
    for (const key of Object.keys(manifest)) {
      if (!ALLOWED_MANIFEST_KEYS.has(key)) {
        issues.push(`Unsupported plugin.json field: ${key}`);
      }
    }
    if (typeof manifest.name !== 'string' || !/^[a-z0-9-]+$/.test(manifest.name)) {
      issues.push('plugin.json name must be lowercase kebab-case');
    }
    if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      issues.push('plugin.json version must be semver');
    }
    const desc = String(manifest.description || '');
    if (!desc || desc.length > 160) {
      issues.push(`plugin.json description length (${desc.length}) should be 1..160 chars`);
    }
    if (manifest.logo && !fs.existsSync(path.join(repoRoot, String(manifest.logo)))) {
      issues.push(`plugin.json logo asset not found: ${manifest.logo}`);
    }
  }
  const sidecarPath = path.join(repoRoot, 'sidecars', 'daemon', 'sidecar.json');
  try {
    const sc = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    if (!sc || typeof sc.command !== 'string' || !Array.isArray(sc.args)) {
      issues.push('sidecars/daemon/sidecar.json missing command/args');
    }
  } catch {
    issues.push('sidecars/daemon/sidecar.json missing or invalid JSON');
  }
  return { ok: issues.length === 0, issues, version: manifest?.version || null };
}

export function inspectNovInstall({ homeDir = os.homedir(), env = process.env, explicitDataDir = null } = {}) {
  const defaultDir = path.join(homeDir, '.gemini', 'config', 'plugins', 'agy-nov');
  const state = readNovState({ homeDir, env, explicitDataDir });
  const enabledModules = Array.isArray(state.enabledModules)
    ? state.enabledModules
    : NOV_MODULE_IDS.filter((id) => Boolean(state.config?.modules?.[id]));

  return {
    found: Boolean(state.installed),
    dir: state.pluginDir || defaultDir,
    version: state.version ?? null,
    dataDir: state.dataDir,
    configPath: state.configPath,
    configExists: Boolean(state.configExists),
    preset: state.config?.preset || 'core',
    locale: state.config?.locale || 'auto',
    enabledModules,
    enabledCount: enabledModules.length,
    totalModules: NOV_MODULE_IDS.length,
    enabledToolsCount: state.enabledToolsCount ?? 0,
    bridgeReady: Boolean(state.installed),
  };
}

export function buildRemediationHints(report, platform = process.platform) {
  const hints = [];
  const appendNovCompanionHint = () => {
    if (report.novInstall && !report.novInstall.found) {
      hints.push(
        '推荐搭配安装 agy-NOV（零 CDP 原生协议工作台：PR Diff 审阅、PreToolUse 安全护盾、Token 透视与手机远程审批），与 agy-Sag 组成双星协同工作台。'
      );
    }
  };

  if (!report.node?.ok) {
    hints.push('Upgrade to Node.js >= 22.0.0 so built-in global WebSocket is available without npm dependencies.');
  }
  if (!report.cdp?.port || !report.cdp?.reachable) {
    if (platform === 'darwin') {
      hints.push('Start Antigravity with CDP enabled: open -a Antigravity --args --remote-debugging-port=0 (or fixed port for 2.33+: open -na Antigravity --args --remote-debugging-port=9222)');
      hints.push('Or run the built-in launcher/keepalive: node cli/sag-cli.mjs launch --dry-run');
    } else if (platform === 'win32') {
      hints.push('Launch Antigravity with --remote-debugging-port=0 or --remote-debugging-port=9222 (run: node cli/sag-cli.mjs launch --dry-run for exact Windows shortcut guidance).');
    } else {
      hints.push('Launch Antigravity with --remote-debugging-port=0 or --remote-debugging-port=9222 (add to .desktop Exec= or run: node cli/sag-cli.mjs launch --dry-run).');
    }
    hints.push('If Antigravity uses a custom port, run: npm run doctor -- --port=<PORT>');
    appendNovCompanionHint();
    return hints;
  }

  const pages = Array.isArray(report.windows) ? report.windows : [];
  if (pages.length === 0) {
    hints.push('CDP is reachable, but no Antigravity conversation host window was found. Open an Antigravity window and re-run.');
    appendNovCompanionHint();
    return hints;
  }

  const missingCount = pages.filter((w) => (w.probe?.sag || w.probe?.sessionGuard)?.state === 'missing').length;
  if (missingCount > 0) {
    hints.push(`Attach agy-Sag to ${missingCount} unmounted window(s): npm run attach (or keep auto-attached with: npm run watch)`);
  }

  const prismActive = pages.some((w) => w.probe?.obsidianPrism?.active);
  const yieldedCount = pages.filter((w) => (w.probe?.sag || w.probe?.sessionGuard)?.state === 'yielded').length;
  if (yieldedCount > 0) {
    hints.push('Obsidian Prism natively owns agy-Sag on yielded window(s); standalone auto-yielded cleanly with zero duplicates.');
  } else if (prismActive && missingCount === 0) {
    hints.push('Obsidian Prism + agy-Sag are coexisting smoothly: open Prism Settings -> Modules tab to configure both in one place.');
  }

  if (
    report.prismInstall?.installed?.found &&
    report.prismInstall?.devCheckout?.found &&
    report.prismInstall.installed.version !== report.prismInstall.devCheckout.version
  ) {
    hints.push(
      `Local Prism dev repo is v${report.prismInstall.devCheckout.version} while installed plugin is v${report.prismInstall.installed.version}; run npm test to validate latest beta compatibility.`
    );
  }
  appendNovCompanionHint();
  return hints;
}

export async function runDoctor(options = {}) {
  const platform = options.platform || process.platform;
  const homeDir = options.homeDir || os.homedir();
  const nodeInfo = options.nodeInfo || checkNodeRuntime();
  const prismInstall =
    options.prismInstall ||
    inspectPrismInstall({
      homeDir,
      repoRoot: options.repoRoot || REPO_ROOT,
      explicitPrismDir: options.prismDir || null,
      env: options.env || process.env,
    });
  const novInstall =
    options.novInstall ||
    inspectNovInstall({
      homeDir,
      env: options.env || process.env,
    });

  const env = options.env || process.env;
  const discoverFn = options.discoverPort || ((p) => discoverCdpPort(p, platform, homeDir, env));
  const listFn = options.listTargets || ((port) => httpGetJson(`http://127.0.0.1:${port}/json/list`));
  const evalFn = options.evalTarget || ((wsUrl, expr) => evalViaCdp(wsUrl, expr));

  const port = discoverFn(options.port ?? null);
  const cdp = { port, reachable: false, error: null, totalTargets: 0, hostWindowCount: 0 };
  const windows = [];

  if (port) {
    try {
      const targets = await listFn(port);
      const list = Array.isArray(targets) ? targets : [];
      cdp.reachable = true;
      cdp.totalTargets = list.length;
      const hostPages = list.filter((t) => isAntigravityHostTarget(t, { expectedPort: port }));
      cdp.hostWindowCount = hostPages.length;

      for (const page of hostPages) {
        try {
          const probe = await evalFn(page.webSocketDebuggerUrl, DOCTOR_PROBE_EXPRESSION);
          windows.push({
            title: page.title || '',
            url: page.url || '',
            ok: true,
            probe: probe || null,
          });
        } catch (err) {
          windows.push({
            title: page.title || '',
            url: page.url || '',
            ok: false,
            error: err?.message || String(err),
            probe: null,
          });
        }
      }
    } catch (err) {
      cdp.error = err?.message || String(err);
    }
  }

  const mountedCount = windows.filter((w) => (w.probe?.sag || w.probe?.sessionGuard)?.state === 'mounted').length;
  const yieldedCount = windows.filter((w) => (w.probe?.sag || w.probe?.sessionGuard)?.state === 'yielded').length;
  const ok = Boolean(nodeInfo.ok && cdp.reachable && cdp.hostWindowCount > 0 && mountedCount + yieldedCount > 0);

  const marketplace = options.marketplace || inspectMarketplaceCompliance(options.repoRoot || REPO_ROOT);
  const report = {
    ok,
    checkedAt: new Date().toISOString(),
    platform,
    node: nodeInfo,
    marketplace,
    prismInstall,
    novInstall,
    cdp,
    windows,
    hints: [],
  };
  report.hints = buildRemediationHints(report, platform);
  return report;
}

export function formatDoctorHuman(report) {
  const lines = [];
  lines.push('agy-Sag · Environment Doctor');
  lines.push('============================');

  const n = report.node;
  lines.push(`${n.ok ? '✔' : '✖'} Node.js: ${n.version} (WebSocket: ${n.hasWebSocket ? 'available' : 'missing'})`);
  if (report.marketplace) {
    lines.push(
      report.marketplace.ok
        ? `✔ Marketplace Manifest: plugin.json v${report.marketplace.version || '?'} + sidecar.json compliant`
        : `⚠ Marketplace Manifest: ${report.marketplace.issues.join('; ')}`
    );
  }

  const pi = report.prismInstall?.installed;
  const pd = report.prismInstall?.devCheckout;
  if (pi?.found) {
    const hook = pi.unifiedSettingsHookReady ? 'unified settings hook OK' : 'settings hook unknown';
    lines.push(`✔ Obsidian Prism (installed): v${pi.version} [${pi.channel}] · ${hook}`);
  } else {
    lines.push('ℹ Obsidian Prism (installed): not detected (standalone mode works out of the box)');
  }
  if (pd?.found) {
    const hook = pd.unifiedSettingsHookReady ? 'unified settings hook OK' : 'settings hook unknown';
    lines.push(`ℹ Obsidian Prism (dev checkout): v${pd.version} [${pd.channel}] · ${hook}`);
  }

  if (report.novInstall?.found) {
    const verPart = report.novInstall.version ? ` v${report.novInstall.version}` : '';
    lines.push(`✔ 双星协同：agy-NOV${verPart} + agy-Sag`);
    if (report.novInstall.preset) {
      const enabledCount = report.novInstall.enabledCount ?? 0;
      const totalModules = report.novInstall.totalModules ?? NOV_MODULE_IDS.length;
      const cfgPart = report.novInstall.configPath ? ` · config: ${report.novInstall.configPath}` : '';
      const bridgePart = report.novInstall.bridgeReady ? ' · 双星协同桥就绪' : '';
      lines.push(
        `  ↳ preset=${report.novInstall.preset} (${enabledCount}/${totalModules} modules, locale=${report.novInstall.locale || 'auto'})${cfgPart}${bridgePart}`
      );
    }
  } else if (report.novInstall) {
    lines.push('ℹ agy-NOV (companion): not installed (optional zero-CDP native MCP Apps workbench)');
  }

  if (report.cdp.port && report.cdp.reachable) {
    lines.push(
      `✔ Antigravity CDP: port ${report.cdp.port} reachable (${report.cdp.hostWindowCount} host window(s) / ${report.cdp.totalTargets} total targets)`
    );
  } else if (report.cdp.port) {
    lines.push(`✖ Antigravity CDP: port ${report.cdp.port} unreachable (${report.cdp.error || 'connection failed'})`);
  } else {
    lines.push('⚠ Antigravity CDP: no DevToolsActivePort found');
  }

  if (report.windows.length > 0) {
    lines.push('');
    lines.push('Host Windows:');
    for (const w of report.windows) {
      if (!w.ok || !w.probe) {
        lines.push(`  ✖ ${w.title || w.url}: probe failed (${w.error || 'unknown'})`);
        continue;
      }
      const sg = w.probe.sag || w.probe.sessionGuard;
      if (!sg) {
        lines.push(`  ✖ ${w.title || w.url}: probe missing agy-Sag payload`);
        continue;
      }
      const pr = w.probe.obsidianPrism;
      const sm = w.probe.sagModules;
      const icon = sg.state === 'mounted' || sg.state === 'yielded' ? '✔' : '⚠';
      const ctxTxt = w.probe.context?.usedPct !== null ? `${w.probe.context.usedPct}%` : 'n/a';
      const prismTxt = pr.active
        ? `Prism ${pr.versionHint ? `v${pr.versionHint}` : 'active'}${sg.prismSettingsEmbedded ? ' (settings unified)' : ''}`
        : 'no Prism';
      lines.push(
        `  ${icon} ${w.title || '(untitled)'} — agy-Sag: ${sg.state}${sg.threshold ? ` (${sg.threshold}%/${sg.mode})` : ''} | ${prismTxt} | ctx: ${ctxTxt} | ★ ${sg.bookmarkCount} | drafts: ${sg.draftCount}`
      );
      if (sm && typeof sm === 'object') {
        const i18nTxt = sm.hostI18nActive ? `${sm.hostI18nLocale || 'active'}` : `off (${sm.hostI18nLocale || 'en'})`;
        lines.push(
          `    Modules: hostI18n=${i18nTxt} | queue=${sm.queueCount ?? 0} | autoAccept=${sm.autoAcceptEnabled ? 'on' : 'off'} | theme=${sm.themePreset || 'native'} | quota=${sm.quotaHealth || 'ok'}`
        );
      }
    }
  }

  if (report.hints.length > 0) {
    lines.push('');
    lines.push('Next Steps / Notes:');
    for (const h of report.hints) {
      lines.push(`  • ${h}`);
    }
  }
  if (report.prism?.installed?.found) {
    lines.push('  • 如计划停用 Obsidian Prism 并切换至纯 agy-Sag：请勿删除 Prism 插件目录的 plugin.json（以保留系统冷启动 CDP 监听），并可运行 agy-sag migrate-from-prism --dry-run 预览配置平滑迁移。');
  }

  return lines.join('\n');
}

export async function runDoctorCli(argv = process.argv.slice(2)) {
  const opts = parseDoctorArgs(argv);
  const report = await runDoctor(opts);
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatDoctorHuman(report));
  }
  if (!report.node.ok || (report.cdp.port && !report.cdp.reachable) || report.windows.some((w) => !w.ok)) {
    process.exitCode = 1;
  }
  return report;
}

const isEntry = isCliEntry(import.meta.url);
if (isEntry) {
  runDoctorCli(process.argv.slice(2)).catch((err) => {
    console.error('[agy-Sag:doctor]', err?.message || err);
    process.exitCode = 1;
  });
}
