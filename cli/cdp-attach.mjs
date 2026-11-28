#!/usr/bin/env node
/**
 * agy-Sag — Zero-ASAR Pure CDP Attacher (Zero runtime npm deps)
 *
 * Safety rules:
 *   1. Never modifies app.asar or any application binary/bundle.
 *   2. Never restarts or kills Antigravity.
 *   3. Only attaches to an already-open localhost CDP port (e.g. from Obsidian Prism or user --remote-debugging-port).
 *   4. Targets only Antigravity host windows; skips devtools://, extension, and unrelated localhost pages.
 */
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { buildInjectExpression, REMOVE_EXPRESSION } from './bundle.mjs';
import { isCliEntry } from './platform-utils.mjs';

const require = createRequire(import.meta.url);
const coexist = require('../packages/core/coexist.js');

const ALLOWED_PRESETS = Object.keys(coexist.PRESETS || {});
const ALLOWED_HOST_LOCALES = Array.isArray(coexist.ALLOWED_HOST_LOCALES) ? coexist.ALLOWED_HOST_LOCALES : [];

export function validatePresetName(raw, flagText = `--preset=${raw}`) {
  const val = String(raw ?? '').trim().toLowerCase();
  if (!val || !Object.prototype.hasOwnProperty.call(coexist.PRESETS || {}, val)) {
    throw new Error(`Invalid --preset (expected ${ALLOWED_PRESETS.join('|')}): ${flagText}`);
  }
  return val;
}

export function validateHostLang(raw, flagText = `--lang=${raw}`) {
  const val = String(raw ?? '').trim();
  if (!val || !ALLOWED_HOST_LOCALES.includes(val)) {
    throw new Error(`Invalid --lang (expected ${ALLOWED_HOST_LOCALES.join('|')}): ${flagText}`);
  }
  return val;
}

export function buildConfigPatchFromOpts(opts = {}) {
  const cfgPatch = {};
  if (opts.preset) {
    const presetPatch = coexist.resolvePresetPatch?.(opts.preset);
    if (presetPatch) {
      Object.assign(cfgPatch, presetPatch);
      if (presetPatch.modules) cfgPatch.modules = { ...presetPatch.modules };
    }
  }
  if (opts.threshold !== null && opts.threshold !== undefined) {
    cfgPatch.compactThreshold = opts.threshold;
  }
  if (opts.mode !== null && opts.mode !== undefined) {
    cfgPatch.compactTriggerMode = opts.mode;
  }
  if (opts.lang) {
    cfgPatch.hostI18nLocale = opts.lang;
    cfgPatch.modules = {
      ...(cfgPatch.modules || {}),
      hostI18n: opts.lang !== 'en',
    };
  }
  return cfgPatch;
}

export function parseCliArgs(argv) {
  const opts = {
    action: 'status',
    port: null,
    threshold: null,
    mode: null,
    dryRun: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--attach') opts.action = 'attach';
    else if (a === '--remove') opts.action = 'remove';
    else if (a === '--status') opts.action = 'status';
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--json') opts.json = true;
    else if (a.startsWith('--port=')) {
      const p = Number(a.slice('--port='.length));
      if (!Number.isInteger(p) || p <= 0 || p > 65535) throw new Error(`Invalid --port value: ${a}`);
      opts.port = p;
    } else if (a.startsWith('--threshold=')) {
      const raw = a.slice('--threshold='.length).trim();
      if (raw === 'off') opts.threshold = 'off';
      else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 50 || n > 98) throw new Error(`Invalid --threshold (expected off or 50..98): ${a}`);
        opts.threshold = Math.round(n);
      }
    } else if (a.startsWith('--mode=')) {
      const raw = a.slice('--mode='.length).trim();
      if (!['auto-silent', 'confirm', 'fill-only', 'auto-countdown'].includes(raw)) {
        throw new Error(`Invalid --mode (expected auto-silent|confirm|fill-only|auto-countdown): ${a}`);
      }
      opts.mode = raw;
    } else if (a.startsWith('--preset=')) {
      opts.preset = validatePresetName(a.slice('--preset='.length), a);
    } else if (a.startsWith('--lang=')) {
      opts.lang = validateHostLang(a.slice('--lang='.length), a);
    }
  }
  return opts;
}

export function discoverCdpPort(
  explicitPort = null,
  platform = process.platform,
  homeDir = os.homedir(),
  env = process.env
) {
  if (Number.isInteger(explicitPort) && explicitPort > 0) return explicitPort;
  const candidates = [];
  if (platform === 'darwin') {
    candidates.push(path.join(homeDir, 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort'));
  } else if (platform === 'win32') {
    const appData = env?.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    const localAppData = env?.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    candidates.push(path.join(appData, 'Antigravity', 'DevToolsActivePort'));
    const localCand = path.join(localAppData, 'Antigravity', 'DevToolsActivePort');
    if (!candidates.includes(localCand)) {
      candidates.push(localCand);
    }
  } else {
    const xdgConfigHome = typeof env?.XDG_CONFIG_HOME === 'string' ? env.XDG_CONFIG_HOME.trim() : '';
    if (xdgConfigHome) {
      candidates.push(path.join(xdgConfigHome, 'Antigravity', 'DevToolsActivePort'));
      candidates.push(path.join(xdgConfigHome, 'antigravity', 'DevToolsActivePort'));
    }
    candidates.push(path.join(homeDir, '.config', 'Antigravity', 'DevToolsActivePort'));
    candidates.push(path.join(homeDir, '.config', 'antigravity', 'DevToolsActivePort'));
    candidates.push(
      path.join(homeDir, '.var', 'app', 'com.google.Antigravity', 'config', 'Antigravity', 'DevToolsActivePort')
    );
    candidates.push(
      path.join(homeDir, 'snap', 'antigravity', 'current', '.config', 'Antigravity', 'DevToolsActivePort')
    );
  }
  const seen = new Set();
  for (const file of candidates) {
    if (!file || seen.has(file)) continue;
    seen.add(file);
    try {
      if (!fs.existsSync(file)) continue;
      const firstLine = fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]?.trim();
      const port = Number(firstLine);
      if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
    } catch {}
  }
  return null;
}

const MAX_HTTP_JSON_BYTES = 4 * 1024 * 1024;

export function httpGetJson(url, timeoutMs = 2500, maxBytes = MAX_HTTP_JSON_BYTES) {
  return new Promise((resolve, reject) => {
    const byteLimit =
      Number.isFinite(Number(maxBytes)) && Number(maxBytes) > 0
        ? Math.floor(Number(maxBytes))
        : MAX_HTTP_JSON_BYTES;
    const totalMs =
      Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Math.floor(Number(timeoutMs)) : 2500;
    let settled = false;
    let req = null;
    let totalTimer = null;

    const finish = (ok, val) => {
      if (settled) return;
      settled = true;
      if (totalTimer !== null) {
        clearTimeout(totalTimer);
        totalTimer = null;
      }
      if (ok) resolve(val);
      else reject(val instanceof Error ? val : new Error(String(val)));
    };

    try {
      req = http.get(url, { timeout: totalMs }, (res) => {
        const statusCode = res.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          finish(false, new Error(`HTTP ${statusCode}`));
          return;
        }
        const chunks = [];
        let totalBytes = 0;
        res.on('data', (chunk) => {
          if (settled) return;
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buf.length;
          if (totalBytes > byteLimit) {
            finish(false, new Error(`HTTP response exceeds ${byteLimit} byte limit`));
            try { res.destroy(); } catch {}
            try { req.destroy(); } catch {}
            return;
          }
          chunks.push(buf);
        });
        res.on('error', (err) => {
          finish(false, err instanceof Error ? err : new Error(String(err)));
        });
        res.on('aborted', () => {
          finish(false, new Error('HTTP response aborted'));
        });
        res.on('end', () => {
          if (settled) return;
          try {
            const text = Buffer.concat(chunks, totalBytes).toString('utf8');
            finish(true, JSON.parse(text));
          } catch (err) {
            finish(false, err);
          }
        });
      });
    } catch (err) {
      finish(false, err);
      return;
    }

    totalTimer = setTimeout(() => {
      const timeoutErr = new Error('HTTP timeout');
      finish(false, timeoutErr);
      try { req.destroy(timeoutErr); } catch {}
    }, totalMs);
    totalTimer?.unref?.();

    req.on('error', (err) => {
      finish(false, err);
    });
    req.on('timeout', () => {
      const timeoutErr = new Error('HTTP timeout');
      finish(false, timeoutErr);
      try { req.destroy(timeoutErr); } catch {}
    });
  });
}

export function isLoopbackWsUrl(wsUrl, expectedPort = null) {
  if (typeof wsUrl !== 'string' || !wsUrl.trim()) return false;
  let parsed;
  try {
    parsed = new URL(wsUrl.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'ws:') return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]' && host !== '::1') {
    return false;
  }
  const hasExpectedPort = Number.isInteger(expectedPort) && expectedPort > 0;
  if (parsed.port !== '') {
    const portNum = Number(parsed.port);
    if (!Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) return false;
    if (hasExpectedPort && expectedPort !== portNum) {
      return false;
    }
  } else if (hasExpectedPort && expectedPort !== 80) {
    return false;
  }
  return true;
}

export function isAntigravityHostUrl(rawUrl) {
  const url = String(rawUrl || '').toLowerCase();
  if (!url) return false;
  if (/^(?:devtools|chrome|chrome-extension|data|blob|plugin):/.test(url)) return false;
  if (/\/launchpad(?:\.html)?(?:[?#]|$)/i.test(url)) return false;
  if (/^(?:vscode-file|app):/.test(url)) {
    return /(?:^app:\/\/antigravity\/|\/antigravity\/|\/workbench\/workbench|workbench\.html|^vscode-file:\/\/vscode-app\/index\.html(?:[?#]|$))/i.test(url);
  }
  if (/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//.test(url)) {
    return true;
  }
  return false;
}

export function isAntigravityHostTarget(target, opts = null) {
  const expectedPort =
    opts && typeof opts === 'object' && Number.isInteger(opts.expectedPort) && opts.expectedPort > 0
      ? opts.expectedPort
      : null;
  if (!target || target.type !== 'page' || !isLoopbackWsUrl(target.webSocketDebuggerUrl, expectedPort)) return false;
  const url = String(target.url || '').toLowerCase();
  const title = String(target.title || '');
  if (/^(?:devtools|chrome|chrome-extension|data|blob|plugin):/.test(url)) return false;
  if (/\/launchpad(?:\.html)?(?:[?#]|$)/i.test(url)) return false;
  if (/^(?:vscode-file|app):/.test(url)) {
    return isAntigravityHostUrl(url);
  }
  if (/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//.test(url) && /antigravity/i.test(title)) {
    return true;
  }
  return false;
}

const SWARM_TARGET_URL_RE = /^plugin:\/\/swarm--swarm_board(?:[-/]|$)/i;

export function isAntigravitySwarmTarget(target, opts = null) {
  const expectedPort =
    opts && typeof opts === 'object' && Number.isInteger(opts.expectedPort) && opts.expectedPort > 0
      ? opts.expectedPort
      : null;
  if (!target || (target.type !== 'page' && target.type !== 'iframe')) return false;
  if (!isLoopbackWsUrl(target.webSocketDebuggerUrl, expectedPort)) return false;
  const url = String(target.url || '').trim();
  return SWARM_TARGET_URL_RE.test(url);
}

export function selectSwarmTargets(targets, opts = null) {
  if (!Array.isArray(targets)) return [];
  return targets.filter((t) => isAntigravitySwarmTarget(t, opts));
}

function formatCdpExceptionDetails(exceptionDetails) {
  if (!exceptionDetails || typeof exceptionDetails !== 'object') {
    return 'Uncaught CDP evaluation exception';
  }
  const desc = exceptionDetails.exception?.description;
  if (typeof desc === 'string' && desc.trim()) return desc.trim();
  const val = exceptionDetails.exception?.value;
  if (typeof val === 'string' && val.trim()) return val.trim();
  const text = exceptionDetails.text;
  if (typeof text === 'string' && text.trim()) return text.trim();
  return 'Uncaught CDP evaluation exception';
}

export function evalViaCdp(wsUrl, expression, timeoutMs = 4000, WebSocketImpl = globalThis.WebSocket) {
  return new Promise((resolve, reject) => {
    if (!isLoopbackWsUrl(wsUrl)) {
      return reject(new Error(`Refusing non-loopback CDP WebSocket URL: ${wsUrl}`));
    }
    if (typeof WebSocketImpl !== 'function') {
      return reject(new Error('Node.js >= 22 global WebSocket is required'));
    }
    let ws;
    try {
      ws = new WebSocketImpl(wsUrl);
    } catch (err) {
      return reject(err instanceof Error ? err : new Error(String(err)));
    }
    let settled = false;
    let timer = null;
    const settle = (ok, val) => {
      if (settled) return;
      settled = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      try { ws.close(); } catch {}
      if (ok) resolve(val);
      else reject(val instanceof Error ? val : new Error(String(val)));
    };

    timer = setTimeout(() => {
      settle(false, new Error('CDP evaluation timeout'));
    }, timeoutMs);
    timer?.unref?.();

    ws.addEventListener('open', () => {
      if (settled) return;
      try {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true, awaitPromise: true },
        }));
      } catch (err) {
        settle(false, err instanceof Error ? err : new Error(String(err)));
      }
    });
    ws.addEventListener('message', (ev) => {
      if (settled) return;
      try {
        const msg = JSON.parse(String(ev.data || '{}'));
        if (msg.id === 1) {
          if (msg.error) return settle(false, new Error(msg.error.message || 'CDP error'));
          if (msg.result?.exceptionDetails) {
            return settle(false, new Error(formatCdpExceptionDetails(msg.result.exceptionDetails)));
          }
          settle(true, msg.result?.result?.value ?? null);
        }
      } catch (err) {
        settle(false, err instanceof Error ? err : new Error(String(err)));
      }
    });
    ws.addEventListener('error', (err) => {
      settle(false, err instanceof Error ? err : new Error('WebSocket error'));
    });
    ws.addEventListener('close', () => {
      settle(false, new Error('CDP WebSocket closed before response'));
    });
  });
}

export async function runCdpAttachCli(argv = process.argv.slice(2), deps = {}) {
  const opts = parseCliArgs(argv);
  const discoverFn = deps.discoverPort || ((p) => discoverCdpPort(p));
  const listFn = deps.listTargets || ((port) => httpGetJson(`http://127.0.0.1:${port}/json/list`));
  const evalFn = deps.evalTarget || ((wsUrl, expr) => evalViaCdp(wsUrl, expr));
  const logOut = deps.log || ((s) => console.log(s));
  const logErr = deps.error || ((s) => console.error(s));

  const port = discoverFn(opts.port);
  if (!port) {
    logErr('[agy-Sag] No active Antigravity CDP port found. Start Antigravity with --remote-debugging-port=0 or pass --port=<PORT>.');
    process.exitCode = 1;
    return { ok: false, reason: 'no-port' };
  }

  const targets = await listFn(port);
  const hostPages = (Array.isArray(targets) ? targets : []).filter((t) => isAntigravityHostTarget(t, { expectedPort: port }));

  const cfgPatch = buildConfigPatchFromOpts(opts);

  if (opts.dryRun) {
    const out = {
      ok: true,
      dryRun: true,
      action: opts.action,
      port,
      ...(Object.keys(cfgPatch).length ? { configPatch: cfgPatch } : {}),
      hostPages: hostPages.map((p) => ({ title: p.title, url: p.url })),
    };
    logOut(JSON.stringify(out, null, 2));
    return out;
  }

  if (hostPages.length === 0 && (opts.action === 'attach' || opts.action === 'remove')) {
    const summary = {
      ok: false,
      reason: 'no-host-windows',
      action: opts.action,
      port,
      targets: [],
    };
    logOut(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return summary;
  }

  const expr =
    opts.action === 'remove'
      ? REMOVE_EXPRESSION
      : opts.action === 'status'
        ? '(() => (window.__agSag || window.__agSessionGuard)?.getDebugState?.() || { mounted: false })()'
        : buildInjectExpression(Object.keys(cfgPatch).length ? cfgPatch : null, {
            source: 'standalone',
            extLocale: opts.lang || null,
          });

  const results = [];
  let failedCount = 0;
  for (const page of hostPages) {
    try {
      const res = await evalFn(page.webSocketDebuggerUrl, expr);
      const targetFailed =
        (opts.action === 'attach' || opts.action === 'remove') &&
        (!res || typeof res !== 'object' || res.ok !== true);
      if (targetFailed) failedCount += 1;
      results.push({ title: page.title, ok: !targetFailed, result: res });
    } catch (err) {
      failedCount += 1;
      results.push({ title: page.title, ok: false, error: err?.message || String(err), result: null });
    }
  }
  const ok = failedCount === 0;
  const summary = {
    ok,
    action: opts.action,
    port,
    ...(failedCount > 0 ? { failedCount } : {}),
    targets: results,
  };
  logOut(JSON.stringify(summary, null, 2));
  if (!ok) process.exitCode = 1;
  return summary;
}

const isEntry = isCliEntry(import.meta.url);
if (isEntry) {
  runCdpAttachCli(process.argv.slice(2)).catch((err) => {
    console.error('[agy-Sag]', err?.message || err);
    process.exitCode = 1;
  });
}
