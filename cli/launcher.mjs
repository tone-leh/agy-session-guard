#!/usr/bin/env node
/**
 * agy-Sag — Cross-Platform Zero-Intrusive CDP Launcher & Keepalive Controller (Zero runtime npm deps)
 *
 * Safety rules:
 *   1. Never modifies app.asar or any application binary/bundle.
 *   2. Never force-kills (SIGKILL / kill -9 / taskkill /F) Antigravity under any circumstance.
 *   3. Respects Obsidian Prism coexistence (.daemon.pid & .relaunch-prompt-state.json) and refuses symlinks.
 *   4. If Antigravity is already running without a CDP port, prints safe guidance by default;
 *      only attempts graceful quit + relaunch when --auto-relaunch-cold-start is explicitly set
 *      AND process uptime is within the 5000ms cold-start window (fail-closed otherwise).
 *   5. Enforces two-layer circuit breakers (per-session + cross-run window) persisted atomically with 0600 mode.
 */
import { execFile as nodeExecFile, spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  buildConfigPatchFromOpts,
  discoverCdpPort,
  httpGetJson,
  validateHostLang,
  validatePresetName,
} from './cdp-attach.mjs';
import {
  assertNoSymlinkAncestors,
  atomicRenameWithRetry,
  canonicalRealpathSync,
  isCliEntry,
  isPathWithinBase,
  quoteShellArgForDisplay,
  safeChmodSync,
} from './platform-utils.mjs';
import { SagWatchDaemon, isPrismDaemonActive } from './watch-daemon.mjs';

const execFileAsync = promisify(nodeExecFile);

export const DEFAULT_CDP_PORT = 9222;
export const MIN_CDP_PORT = 1024;
export const MAX_CDP_PORT = 65535;
export const REMOTE_DEBUGGING_PORT_RE = /(?:^|[\s"])--remote-debugging-port(?:=|\s|"|$)/;
export const REMOTE_DEBUGGING_PORT_VALUE_RE = /(?:^|[\s"])--remote-debugging-port(?:="?\s*|"\s+"?|\s+"?)(\d+)(?=["\s]|$)/;

export const PRISM_START_TOLERANCE_MS = 15000;
export const COLD_START_WINDOW_MS = 5000;
export const DEFAULT_GRACEFUL_QUIT_TIMEOUT_MS = 8000;
export const DEFAULT_GRACEFUL_POLL_MS = 250;

export const DEFAULT_MAX_SESSION_ATTEMPTS = 3;
export const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
export const DEFAULT_MAX_WINDOW_ATTEMPTS = 5;
export const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

export function validateCdpPort(raw, flagText = `--port=${raw}`) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < MIN_CDP_PORT || n > MAX_CDP_PORT) {
    throw new Error(`Invalid --port (expected ${MIN_CDP_PORT}..${MAX_CDP_PORT}): ${flagText}`);
  }
  return n;
}

export function parseLauncherArgs(argv = []) {
  const opts = {
    port: DEFAULT_CDP_PORT,
    explicitPort: false,
    dryRun: false,
    json: false,
    autoRelaunchColdStart: false,
    autoRelaunch: false,
    once: false,
    intervalMs: 3000,
    maxBackoffMs: 30000,
    threshold: null,
    mode: null,
    preset: null,
    lang: null,
    statePath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--auto-relaunch-cold-start') opts.autoRelaunchColdStart = true;
    else if (a === '--auto-relaunch') opts.autoRelaunch = true;
    else if (a === '--once') opts.once = true;
    else if (a.startsWith('--port=')) {
      opts.port = validateCdpPort(a.slice('--port='.length), a);
      opts.explicitPort = true;
    } else if (a.startsWith('--interval=')) {
      const n = Number(a.slice('--interval='.length));
      if (!Number.isFinite(n) || n < 500 || n > 60000) {
        throw new Error(`Invalid --interval (expected 500..60000 ms): ${a}`);
      }
      opts.intervalMs = Math.round(n);
    } else if (a.startsWith('--max-backoff=')) {
      const n = Number(a.slice('--max-backoff='.length));
      if (!Number.isFinite(n) || n < 500 || n > 300000) {
        throw new Error(`Invalid --max-backoff (expected 500..300000 ms): ${a}`);
      }
      opts.maxBackoffMs = Math.round(n);
    } else if (a.startsWith('--threshold=')) {
      const raw = a.slice('--threshold='.length).trim();
      if (raw === 'off') opts.threshold = 'off';
      else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 50 || n > 98) {
          throw new Error(`Invalid --threshold (expected off or 50..98): ${a}`);
        }
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
    } else if (a.startsWith('--state-path=')) {
      const val = a.slice('--state-path='.length).trim();
      if (!val) throw new Error(`Invalid --state-path value: ${a}`);
      opts.statePath = val;
    }
  }

  if (opts.maxBackoffMs < opts.intervalMs) {
    opts.maxBackoffMs = opts.intervalMs;
  }
  return opts;
}

export function hasRemoteDebuggingPort(commandLine) {
  return REMOTE_DEBUGGING_PORT_RE.test(String(commandLine || ''));
}

export function extractRemoteDebuggingPort(commandLine) {
  const m = String(commandLine || '').match(REMOTE_DEBUGGING_PORT_VALUE_RE);
  if (!m) return null;
  const p = Number(m[1]);
  return Number.isInteger(p) && p > 0 && p <= MAX_CDP_PORT ? p : null;
}

export function getDefaultLaunchStatePath(homeDir = os.homedir()) {
  return path.join(path.resolve(homeDir), '.gemini', 'antigravity', 'agy-sag', 'launch-state.json');
}

function getEnvCaseInsensitive(env, key) {
  if (!env || typeof env !== 'object') return undefined;
  if (env[key] !== undefined && String(env[key]).trim()) return String(env[key]).trim();
  const target = String(key).toLowerCase();
  for (const [k, v] of Object.entries(env)) {
    if (k.toLowerCase() === target && v !== undefined && String(v).trim()) {
      return String(v).trim();
    }
  }
  return undefined;
}

export function buildLaunchSpec({
  platform = process.platform,
  port = DEFAULT_CDP_PORT,
  homeDir = os.homedir(),
  env = process.env,
  existsSyncFn = fs.existsSync,
} = {}) {
  const validPort = validateCdpPort(port);
  const debugFlag = `--remote-debugging-port=${validPort}`;
  const rawHome = String(homeDir || os.homedir());
  const safeExists = (p) => {
    try {
      return Boolean(existsSyncFn(p));
    } catch {
      return false;
    }
  };

  const explicitBin = getEnvCaseInsensitive(env, 'ANTIGRAVITY_BIN');
  if (explicitBin) {
    if (platform === 'darwin' && /\.app\/?$/i.test(explicitBin)) {
      const appPath = explicitBin.replace(/\/+$/, '');
      return {
        platform,
        port: validPort,
        command: 'open',
        args: ['-na', appPath, '--args', debugFlag],
        resolvedPath: appPath,
        executableFound: safeExists(appPath),
        shell: false,
      };
    }
    return {
      platform,
      port: validPort,
      command: explicitBin,
      args: [debugFlag],
      resolvedPath: explicitBin,
      executableFound: safeExists(explicitBin),
      shell: false,
    };
  }

  if (platform === 'darwin') {
    const resolvedHome = path.resolve(rawHome);
    const candidates = [
      '/Applications/Antigravity.app',
      path.join(resolvedHome, 'Applications', 'Antigravity.app'),
    ];
    const detectedApp = candidates.find(safeExists);
    return {
      platform,
      port: validPort,
      command: 'open',
      args: ['-na', 'Antigravity', '--args', debugFlag],
      resolvedPath: detectedApp || '/Applications/Antigravity.app',
      executableFound: Boolean(detectedApp),
      shell: false,
    };
  }

  if (platform === 'win32') {
    const winHome = /^[A-Za-z]:[\\/]/.test(rawHome) || rawHome.includes('\\') ? rawHome : path.resolve(rawHome);
    const userProfile = getEnvCaseInsensitive(env, 'USERPROFILE') || winHome;
    const localAppData =
      getEnvCaseInsensitive(env, 'LOCALAPPDATA') || path.win32.join(userProfile, 'AppData', 'Local');
    const programFiles = getEnvCaseInsensitive(env, 'ProgramFiles') || 'C:\\Program Files';
    const programFilesX86 = getEnvCaseInsensitive(env, 'ProgramFiles(x86)') || 'C:\\Program Files (x86)';
    const candidates = [
      path.win32.join(localAppData, 'Programs', 'Antigravity', 'Antigravity.exe'),
      path.win32.join(localAppData, 'Antigravity', 'Antigravity.exe'),
      path.win32.join(userProfile, 'scoop', 'apps', 'antigravity', 'current', 'Antigravity.exe'),
      path.win32.join(programFiles, 'Antigravity', 'Antigravity.exe'),
      path.win32.join(programFilesX86, 'Antigravity', 'Antigravity.exe'),
    ];
    const detectedExe = candidates.find(safeExists);
    const chosen = detectedExe || candidates[0];
    return {
      platform,
      port: validPort,
      command: chosen,
      args: [debugFlag],
      resolvedPath: chosen,
      executableFound: Boolean(detectedExe),
      shell: false,
    };
  }

  // linux & other POSIX
  const posixHome = rawHome.startsWith('/') ? rawHome : path.resolve(rawHome);
  const linuxCandidates = [
    path.posix.join(posixHome, '.local', 'bin', 'antigravity'),
    path.posix.join(posixHome, '.local', 'share', 'flatpak', 'exports', 'bin', 'com.google.Antigravity'),
    '/var/lib/flatpak/exports/bin/com.google.Antigravity',
    '/usr/share/antigravity/antigravity',
    '/usr/lib/antigravity/antigravity',
    '/opt/Antigravity/antigravity',
    '/opt/antigravity/antigravity',
    '/snap/bin/antigravity',
    '/usr/bin/antigravity',
    '/usr/local/bin/antigravity',
  ];
  const detectedBin = linuxCandidates.find(safeExists);
  const chosen = detectedBin || 'antigravity';
  return {
    platform,
    port: validPort,
    command: chosen,
    args: [debugFlag],
    resolvedPath: chosen,
    executableFound: Boolean(detectedBin),
    shell: false,
  };
}

function parseElapsedTimeMs(etimeStr) {
  const m = String(etimeStr || '').trim().match(/^(?:(\d+)-)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const days = m[1] ? Number(m[1]) : 0;
  const hours = m[2] ? Number(m[2]) : 0;
  const mins = Number(m[3]);
  const secs = Number(m[4]);
  if (![days, hours, mins, secs].every(Number.isFinite)) return null;
  return (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1000;
}

export function parseUnixPsLine(line, nowMs = Date.now()) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  const headMatch = trimmed.match(/^(\d+)\s+(\d+)\s+(.+)$/);
  if (!headMatch) return null;

  const pid = Number(headMatch[1]);
  const ppid = Number(headMatch[2]);
  const rest = headMatch[3].trim();
  if (!Number.isInteger(pid) || pid <= 0) return null;

  let startMs = null;
  let commandLine = rest;

  // Format 1: etime + lstart + args
  const bothMatch = rest.match(
    /^((?:\d+-)?(?:\d{1,2}:)?\d{1,2}:\d{2})\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/
  );
  if (bothMatch) {
    const etimeMs = parseElapsedTimeMs(bothMatch[1]);
    const parsedLstart = Date.parse(bothMatch[2]);
    startMs = Number.isFinite(parsedLstart)
      ? parsedLstart
      : etimeMs !== null
        ? nowMs - etimeMs
        : null;
    commandLine = bothMatch[3].trim();
  } else {
    // Format 2: lstart + args
    const lstartMatch = rest.match(
      /^([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/
    );
    if (lstartMatch) {
      const parsedLstart = Date.parse(lstartMatch[1]);
      startMs = Number.isFinite(parsedLstart) ? parsedLstart : null;
      commandLine = lstartMatch[2].trim();
    } else {
      // Format 3: etime + args
      const etimeMatch = rest.match(/^((?:\d+-)?(?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/);
      if (etimeMatch) {
        const etimeMs = parseElapsedTimeMs(etimeMatch[1]);
        startMs = etimeMs !== null ? nowMs - etimeMs : null;
        commandLine = etimeMatch[2].trim();
      }
    }
  }

  return { pid, ppid, startMs, commandLine };
}

export function parseWindowsTimestamp(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw ?? '').trim();
  if (!s) return null;

  // Microsoft JSON /Date(1795441015182)/
  const msDateMatch = s.match(/^\/Date\((\d+)(?:[+-]\d+)?\)\/$/);
  if (msDateMatch) {
    const n = Number(msDateMatch[1]);
    return Number.isFinite(n) ? n : null;
  }

  // WMIC DMTF format: YYYYMMDDHHMMSS.ffffff±OOO
  const wmicMatch = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.\d+)?([+-]\d{3,4})?$/);
  if (wmicMatch) {
    const [, y, mo, d, h, mi, sec, tz] = wmicMatch;
    let offsetMin = 0;
    if (tz) {
      offsetMin = Number(tz);
    }
    const utcGuess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec));
    return Number.isFinite(utcGuess) ? utcGuess - offsetMin * 60_000 : null;
  }

  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractFirstCommandToken(cmd) {
  const s = String(cmd || '').trim();
  if (!s) return { token: '', rest: '' };
  const quote = s[0];
  if (quote === '"' || quote === "'") {
    let token = '';
    let i = 1;
    for (; i < s.length; i += 1) {
      const ch = s[i];
      if (ch === '\\' && quote === '"' && i + 1 < s.length) {
        token += s[i + 1];
        i += 1;
        continue;
      }
      if (ch === quote) {
        return { token, rest: s.slice(i + 1).trim() };
      }
      token += ch;
    }
    return { token, rest: '' };
  }
  let token = '';
  let i = 0;
  for (; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) {
      token += s[i + 1];
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      return { token, rest: s.slice(i + 1).trim() };
    }
    token += ch;
  }
  return { token, rest: '' };
}

export function isAntigravityMainProcess(commandLine, platform = process.platform) {
  const cmd = String(commandLine || '').trim();
  if (!cmd) return false;

  // Exclude CLI scripts and child/helper processes
  if (/(?:sag-cli\.mjs|launcher\.mjs|watch-daemon\.mjs|cdp-attach\.mjs|doctor\.mjs|\bagy-sag\b)/i.test(cmd)) {
    return false;
  }
  if (/(?:^|\s)--type=(?:renderer|gpu-process|utility|zygote|broker|ppapi|crashpad-handler)\b/i.test(cmd)) {
    return false;
  }
  if (/Antigravity Helper|chrome_crashpad_handler/i.test(cmd)) {
    return false;
  }

  if (platform === 'darwin') {
    return (
      /\/Antigravity\.app\/Contents\/MacOS\/(?:Electron|Antigravity)(?:\s|$)/i.test(cmd) ||
      /^"?(?:\/[^"\s]+\/)?Antigravity(?:\s|$)/i.test(cmd)
    );
  }
  if (platform === 'win32') {
    return /(?:^|[\\/\s"])Antigravity\.exe(?:"|\s|$)/i.test(cmd);
  }

  // Linux / POSIX: inspect executable basename strictly to avoid false positives like `vim antigravity.md`
  const { token: exeToken, rest } = extractFirstCommandToken(cmd);
  if (!exeToken) return false;
  const baseName = path.posix.basename(exeToken.replace(/\\/g, '/'));
  if (/^(?:antigravity|antigravity-bin|antigravity(?:-[A-Za-z0-9._+-]+)?\.appimage)$/i.test(baseName)) {
    return true;
  }
  if (/^electron(?:\d+)?$/i.test(baseName)) {
    return /(?:^|[\s"'])\/[^\s"']*\/antigravity(?:[\/\s"']|$)/i.test(rest);
  }
  // Support unquoted absolute Linux executable paths containing spaces (e.g. `/opt/My Apps/Antigravity/antigravity --flag`)
  if (cmd.startsWith('/') && !/^\/(?:usr\/)?(?:local\/)?bin\/(?:vim|vi|nano|cat|less|more|grep|rg|awk|sed|bash|zsh|sh|env|python3?|node)\b/i.test(cmd)) {
    const beforeFlags = cmd.split(/\s+--/)[0];
    if (/(?:^|\/)(?:antigravity|antigravity-bin|antigravity(?:-[A-Za-z0-9._+-]+)?\.appimage)(?:\s|$)/i.test(beforeFlags)) {
      return true;
    }
  }
  return false;
}

function defaultExecFile(file, args, options = {}) {
  return execFileAsync(file, args, {
    timeout: 5000,
    maxBuffer: 4 * 1024 * 1024,
    killSignal: 'SIGKILL',
    windowsHide: true,
    ...options,
  });
}

function parseWindowsProcessOutput(stdout, { strictJson = false } = {}) {
  const trimmed = String(stdout || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];

  if (strictJson) {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const mapped = list
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const pid = Number(item.ProcessId ?? item.pid);
        const ppid = Number(item.ParentProcessId ?? item.ppid ?? 0);
        const commandLine = String(item.CommandLine ?? item.commandLine ?? '').trim();
        const startMs = parseWindowsTimestamp(item.CreationDate ?? item.startMs);
        if (!Number.isInteger(pid) || pid <= 0) return null;
        return { pid, ppid: Number.isFinite(ppid) ? ppid : 0, startMs, commandLine };
      })
      .filter(Boolean);
    if (mapped.some((m) => !m.commandLine)) {
      throw new Error('Windows process CommandLine unavailable (incomplete query result)');
    }
    return mapped;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .map((item) => {
        const pid = Number(item?.ProcessId ?? item?.pid);
        const ppid = Number(item?.ParentProcessId ?? item?.ppid ?? 0);
        const commandLine = String(item?.CommandLine ?? item?.commandLine ?? '').trim();
        const startMs = parseWindowsTimestamp(item?.CreationDate ?? item?.startMs);
        if (!Number.isInteger(pid) || pid <= 0) return null;
        return { pid, ppid: Number.isFinite(ppid) ? ppid : 0, startMs, commandLine };
      })
      .filter(Boolean);
  }

  if (/^no instance\(s\) available\.?$/i.test(trimmed)) {
    return [];
  }

  // WMIC /format:list fallback
  const records = [];
  let current = {};
  let sawKeyValue = false;
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (Object.keys(current).length > 0) {
        records.push(current);
        current = {};
      }
      continue;
    }
    const eq = line.indexOf('=');
    if (eq > 0) {
      sawKeyValue = true;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      current[k] = v;
    }
  }
  if (Object.keys(current).length > 0) records.push(current);
  if (!sawKeyValue) {
    throw new Error(`Unrecognized WMIC process output: ${trimmed.slice(0, 120)}`);
  }

  const wmicMapped = records
    .map((item) => {
      const pid = Number(item.ProcessId);
      const ppid = Number(item.ParentProcessId || 0);
      const commandLine = String(item.CommandLine || '').trim();
      const startMs = parseWindowsTimestamp(item.CreationDate);
      if (!Number.isInteger(pid) || pid <= 0) return null;
      return { pid, ppid: Number.isFinite(ppid) ? ppid : 0, startMs, commandLine };
    })
    .filter(Boolean);
  if (wmicMapped.some((m) => !m.commandLine)) {
    throw new Error('Windows WMIC CommandLine unavailable (incomplete query result)');
  }
  return wmicMapped;
}

function readLinuxProcProcesses(procDir = '/proc') {
  const dirents = fs.readdirSync(procDir, { withFileTypes: true });
  let bootTimeSec = null;
  try {
    const procStat = fs.readFileSync(path.join(procDir, 'stat'), 'utf8');
    const btimeMatch = procStat.match(/^btime\s+(\d+)/m);
    if (btimeMatch) bootTimeSec = Number(btimeMatch[1]);
  } catch {}

  const entries = [];
  let pidDirsFound = 0;
  let readableCmdlines = 0;
  for (const ent of dirents) {
    if (!/^\d+$/.test(ent.name)) continue;
    const pid = Number(ent.name);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    pidDirsFound += 1;
    const cmdlinePath = path.join(procDir, ent.name, 'cmdline');
    let rawCmd;
    try {
      rawCmd = fs.readFileSync(cmdlinePath, 'utf8');
      readableCmdlines += 1;
    } catch {
      continue;
    }
    const parts = rawCmd.split('\0').filter((s) => s.length > 0);
    if (parts.length === 0) continue;
    const commandLine = parts
      .map((part, idx) => (idx === 0 && /\s/.test(part) ? `"${part}"` : part))
      .join(' ');

    let ppid = 0;
    let startMs = null;
    try {
      const statRaw = fs.readFileSync(path.join(procDir, ent.name, 'stat'), 'utf8');
      const rparen = statRaw.lastIndexOf(')');
      if (rparen > 0) {
        const fields = statRaw.slice(rparen + 2).trim().split(/\s+/);
        // fields[0]=state, fields[1]=ppid, fields[19]=starttime (clock ticks after boot)
        const parsedPpid = Number(fields[1]);
        if (Number.isFinite(parsedPpid)) ppid = parsedPpid;
        const startTicks = Number(fields[19]);
        if (bootTimeSec !== null && Number.isFinite(startTicks)) {
          // Standard Linux USER_HZ is 100
          startMs = Math.round((bootTimeSec + startTicks / 100) * 1000);
        }
      }
    } catch {}

    entries.push({ pid, ppid, startMs, commandLine });
  }
  if (pidDirsFound > 0 && readableCmdlines === 0) {
    throw new Error(`All ${pidDirsFound} /proc/<pid>/cmdline entries were unreadable`);
  }
  return entries;
}

function makeDetectionFailedResult(errorMessage) {
  const out = [];
  out.detectionFailed = true;
  out.detectionError = String(errorMessage || 'Process detection failed');
  return out;
}

export async function detectAntigravityProcesses({
  platform = process.platform,
  execFileFn = defaultExecFile,
  nowFn = () => Date.now(),
  procDir = '/proc',
} = {}) {
  const nowMs = nowFn();
  let entries = [];

  if (platform === 'win32') {
    const psCmd =
      "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"Name='Antigravity.exe'\" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | ConvertTo-Json -Compress";
    const errors = [];
    let succeeded = false;

    for (const psExe of ['powershell.exe', 'pwsh']) {
      try {
        const res = await execFileFn(psExe, ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
          windowsHide: true,
        });
        const outText = String(res?.stdout ?? (typeof res === 'string' ? res : '')).trim();
        const errText = String(res?.stderr ?? '').trim();
        if ((typeof res?.exitCode === 'number' && res.exitCode !== 0) || (!outText && errText)) {
          throw new Error(errText || `Non-zero exit code ${res.exitCode}`);
        }
        entries = parseWindowsProcessOutput(res?.stdout ?? res, { strictJson: true });
        succeeded = true;
        break;
      } catch (err) {
        errors.push(`${psExe}: ${err?.message || String(err)}`);
      }
    }

    if (!succeeded) {
      try {
        const res = await execFileFn(
          'wmic',
          ['process', 'where', "name='Antigravity.exe'", 'get', 'ProcessId,ParentProcessId,CreationDate,CommandLine', '/format:list'],
          { windowsHide: true }
        );
        const outText = String(res?.stdout ?? (typeof res === 'string' ? res : '')).trim();
        const errText = String(res?.stderr ?? '').trim();
        if ((typeof res?.exitCode === 'number' && res.exitCode !== 0) || (!outText && errText)) {
          throw new Error(errText || `Non-zero exit code ${res.exitCode}`);
        }
        entries = parseWindowsProcessOutput(res?.stdout ?? res, { strictJson: false });
        succeeded = true;
      } catch (err) {
        errors.push(`wmic: ${err?.message || String(err)}`);
      }
    }

    if (!succeeded) {
      return makeDetectionFailedResult(errors.join('; '));
    }
  } else {
    try {
      const res = await execFileFn('ps', ['-eo', 'pid=,ppid=,etime=,lstart=,args='], {
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
      });
      const stdout = String(res?.stdout ?? res ?? '');
      const nonEmptyLines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of nonEmptyLines) {
        const parsed = parseUnixPsLine(line, nowMs);
        if (parsed) entries.push(parsed);
      }
      if (nonEmptyLines.length > 0 && entries.length === 0) {
        throw new Error('Unparseable ps output (0 valid process lines)');
      }
    } catch (psErr) {
      if (platform === 'linux') {
        try {
          entries = readLinuxProcProcesses(procDir);
        } catch (procErr) {
          return makeDetectionFailedResult(
            `ps: ${psErr?.message || String(psErr)}; proc(${procDir}): ${procErr?.message || String(procErr)}`
          );
        }
      } else {
        return makeDetectionFailedResult(`ps: ${psErr?.message || String(psErr)}`);
      }
    }
  }

  return entries
    .filter((item) => isAntigravityMainProcess(item.commandLine, platform))
    .map((item) => ({
      pid: item.pid,
      ppid: item.ppid,
      startMs: item.startMs,
      uptimeMs: item.startMs !== null && Number.isFinite(item.startMs) ? Math.max(0, nowMs - item.startMs) : null,
      commandLine: item.commandLine,
      hasRemoteDebuggingPort: hasRemoteDebuggingPort(item.commandLine),
      debuggingPort: extractRemoteDebuggingPort(item.commandLine),
    }));
}

function readJsonFileRejectSymlink(filePath) {
  let st;
  try {
    st = fs.lstatSync(filePath);
  } catch (err) {
    if (err?.code === 'ENOENT') return { ok: false, exists: false, symlinkRejected: false, data: null };
    return { ok: false, exists: false, symlinkRejected: false, error: err?.message || String(err), data: null };
  }
  if (st.isSymbolicLink()) {
    return { ok: false, exists: true, symlinkRejected: true, error: `Refusing symlink: ${filePath}`, data: null };
  }
  if (!st.isFile()) {
    return { ok: false, exists: true, symlinkRejected: false, error: `Not a regular file: ${filePath}`, data: null };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return { ok: true, exists: true, symlinkRejected: false, data };
  } catch (err) {
    return { ok: false, exists: true, symlinkRejected: false, error: err?.message || String(err), data: null };
  }
}

export function readPrismRelaunchState(homeDir = os.homedir()) {
  const filePath = path.join(
    path.resolve(homeDir),
    '.gemini',
    'config',
    'plugins',
    'obsidian-prism',
    '.relaunch-prompt-state.json'
  );
  const res = readJsonFileRejectSymlink(filePath);
  return {
    path: filePath,
    ok: res.ok,
    exists: res.exists,
    symlinkRejected: res.symlinkRejected,
    error: res.error || null,
    state: res.ok && res.data && typeof res.data === 'object' ? res.data : null,
  };
}

export function readGeminiConfigReadOnly(homeDir = os.homedir()) {
  const filePath = path.join(path.resolve(homeDir), '.gemini', 'config', 'config.json');
  const res = readJsonFileRejectSymlink(filePath);
  const data = res.ok && res.data && typeof res.data === 'object' ? res.data : null;
  const prismPluginCfg = data?.plugins?.['obsidian-prism'];
  return {
    path: filePath,
    ok: res.ok,
    exists: res.exists,
    symlinkRejected: res.symlinkRejected,
    obsidianPrismEnabled:
      prismPluginCfg && typeof prismPluginCfg === 'object' ? prismPluginCfg.enabled !== false : null,
  };
}

export function shouldYieldToPrism({
  homeDir = os.homedir(),
  processes = [],
  killFn = process.kill,
  toleranceMs = PRISM_START_TOLERANCE_MS,
} = {}) {
  const daemonActive = isPrismDaemonActive(homeDir, killFn);
  const relaunchRes = readPrismRelaunchState(homeDir);
  const configRes = readGeminiConfigReadOnly(homeDir);

  let stateMatched = false;
  let matchedPid = null;
  const st = relaunchRes.state;
  if (st && Array.isArray(processes) && processes.length > 0) {
    const stateStartMs = Number(st.hostStartMs ?? st.startTimeMs);
    const statePid = Number(st.hostPid);
    if (Number.isInteger(statePid) && statePid > 0 && Number.isFinite(stateStartMs)) {
      for (const proc of processes) {
        if (
          proc &&
          proc.pid === statePid &&
          typeof proc.startMs === 'number' &&
          Number.isFinite(proc.startMs) &&
          Math.abs(stateStartMs - proc.startMs) <= toleranceMs
        ) {
          stateMatched = true;
          matchedPid = proc.pid;
          break;
        }
      }
    }
  }

  const prismYielded = daemonActive || stateMatched;
  const reason = daemonActive
    ? 'prism_daemon_active'
    : stateMatched
      ? 'prism_relaunch_state_match'
      : null;

  return {
    prismYielded,
    reason,
    daemonActive,
    stateMatched,
    matchedPid,
    symlinkRejected: Boolean(relaunchRes.symlinkRejected || configRes.symlinkRejected),
    relaunchState: relaunchRes,
    configRef: {
      exists: configRes.exists,
      symlinkRejected: configRes.symlinkRejected,
      obsidianPrismEnabled: configRes.obsidianPrismEnabled,
    },
  };
}

function assertNoSymlinkPath(targetPath) {
  assertNoSymlinkAncestors(path.resolve(targetPath));
}

export function readLaunchState(statePath) {
  const resolved = path.resolve(statePath);
  assertNoSymlinkPath(resolved);
  const res = readJsonFileRejectSymlink(resolved);
  if (res.symlinkRejected) {
    throw new Error(`Security violation: refusing symlink path ${resolved}`);
  }
  if (!res.exists || !res.ok || !res.data || typeof res.data !== 'object') {
    return {
      version: 1,
      attempts: [],
      cooldownUntil: null,
      updatedAt: null,
    };
  }
  const attempts = Array.isArray(res.data.attempts)
    ? res.data.attempts.filter((n) => typeof n === 'number' && Number.isFinite(n))
    : [];
  const cooldownUntil =
    typeof res.data.cooldownUntil === 'number' && Number.isFinite(res.data.cooldownUntil)
      ? res.data.cooldownUntil
      : null;
  const updatedAt =
    typeof res.data.updatedAt === 'number' && Number.isFinite(res.data.updatedAt) ? res.data.updatedAt : null;
  return { version: 1, attempts, cooldownUntil, updatedAt };
}

export function writeLaunchStateAtomic(statePath, state, { platform = process.platform, renameSyncFn = fs.renameSync, waitFn = null } = {}) {
  const resolved = path.resolve(statePath);
  assertNoSymlinkPath(resolved);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  safeChmodSync(dir, 0o700, { platform });
  assertNoSymlinkPath(resolved);

  const tmpName = `.launch-state.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  const tmpPath = path.join(dir, tmpName);
  const payload = JSON.stringify(
    {
      version: 1,
      attempts: Array.isArray(state?.attempts) ? state.attempts : [],
      cooldownUntil: state?.cooldownUntil ?? null,
      updatedAt: state?.updatedAt ?? Date.now(),
    },
    null,
    2
  ) + '\n';

  try {
    fs.writeFileSync(tmpPath, payload, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    safeChmodSync(tmpPath, 0o600, { platform });
    atomicRenameWithRetry(tmpPath, resolved, { platform, renameSyncFn, waitFn });
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
    throw err;
  }
  return resolved;
}

export function evaluateCircuitBreaker({
  state,
  sessionAttempts = 0,
  nowMs = Date.now(),
  maxSessionAttempts = DEFAULT_MAX_SESSION_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS,
  maxWindowAttempts = DEFAULT_MAX_WINDOW_ATTEMPTS,
} = {}) {
  if (sessionAttempts >= maxSessionAttempts) {
    return {
      tripped: true,
      layer: 'session',
      reason: `Session launch attempt limit reached (${sessionAttempts}/${maxSessionAttempts})`,
      sessionAttempts,
      windowAttempts: 0,
      cooldownUntil: state?.cooldownUntil ?? null,
    };
  }

  const cooldownUntil = state?.cooldownUntil ?? null;
  if (typeof cooldownUntil === 'number' && Number.isFinite(cooldownUntil) && nowMs < cooldownUntil) {
    return {
      tripped: true,
      layer: 'cooldown',
      reason: `Launch circuit breaker cooldown active until ${new Date(cooldownUntil).toISOString()}`,
      sessionAttempts,
      windowAttempts: 0,
      cooldownUntil,
    };
  }

  const attempts = Array.isArray(state?.attempts) ? state.attempts : [];
  const recentAttempts = attempts.filter((ts) => nowMs - ts >= 0 && nowMs - ts <= windowMs);
  if (recentAttempts.length >= maxWindowAttempts) {
    return {
      tripped: true,
      layer: 'window',
      reason: `Cross-run launch window limit reached (${recentAttempts.length}/${maxWindowAttempts} within ${Math.round(windowMs / 60000)}m)`,
      sessionAttempts,
      windowAttempts: recentAttempts.length,
      cooldownUntil,
    };
  }

  return {
    tripped: false,
    layer: null,
    reason: null,
    sessionAttempts,
    windowAttempts: recentAttempts.length,
    cooldownUntil: null,
  };
}

export function recordLaunchAttempt(
  statePath,
  nowMs = Date.now(),
  { windowMs = DEFAULT_WINDOW_MS, maxWindowAttempts = DEFAULT_MAX_WINDOW_ATTEMPTS, cooldownMs = DEFAULT_COOLDOWN_MS } = {}
) {
  const prev = readLaunchState(statePath);
  const pruned = prev.attempts.filter((ts) => nowMs - ts >= 0 && nowMs - ts <= windowMs);
  pruned.push(nowMs);
  const cooldownUntil = pruned.length >= maxWindowAttempts ? nowMs + cooldownMs : null;
  const next = {
    version: 1,
    attempts: pruned,
    cooldownUntil,
    updatedAt: nowMs,
  };
  writeLaunchStateAtomic(statePath, next);
  return next;
}

function defaultSpawnDetached(command, args) {
  const child = nodeSpawn(command, args, {
    detached: true,
    stdio: 'ignore',
    shell: false,
    windowsHide: true,
  });
  child.on('error', () => {});
  child.unref?.();
  return child;
}

function defaultIsProcessAlive(pid, killFn = process.kill) {
  try {
    killFn(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

export async function requestGracefulQuit({
  processes = [],
  platform = process.platform,
  execFileFn = defaultExecFile,
  killFn = process.kill,
  isProcessAliveFn = (pid) => defaultIsProcessAlive(pid, killFn),
  sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  nowFn = () => Date.now(),
  timeoutMs = DEFAULT_GRACEFUL_QUIT_TIMEOUT_MS,
  pollMs = DEFAULT_GRACEFUL_POLL_MS,
} = {}) {
  if (!Array.isArray(processes) || processes.length === 0) {
    return { ok: true, exitedPids: [] };
  }

  try {
    if (platform === 'darwin') {
      try {
        await execFileFn('osascript', ['-e', 'tell application "Antigravity" to quit']);
      } catch {
        for (const proc of processes) {
          try {
            killFn(proc.pid, 'SIGTERM');
          } catch (err) {
            if (err?.code === 'ESRCH' || !isProcessAliveFn(proc.pid)) continue;
            throw err;
          }
        }
      }
    } else if (platform === 'win32') {
      for (const proc of processes) {
        // Strictly without /F (never force-kill)
        try {
          await execFileFn('taskkill', ['/PID', String(proc.pid)], { windowsHide: true });
        } catch (err) {
          if (!isProcessAliveFn(proc.pid)) continue;
          throw err;
        }
      }
    } else {
      for (const proc of processes) {
        try {
          killFn(proc.pid, 'SIGTERM');
        } catch (err) {
          if (err?.code === 'ESRCH' || !isProcessAliveFn(proc.pid)) continue;
          throw err;
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      code: 'GRACEFUL_QUIT_SIGNAL_FAILED',
      error: err?.message || String(err),
      remainingPids: processes.map((p) => p.pid),
    };
  }

  const deadline = nowFn() + timeoutMs;
  while (true) {
    const alive = processes.filter((p) => isProcessAliveFn(p.pid));
    if (alive.length === 0) {
      return { ok: true, exitedPids: processes.map((p) => p.pid) };
    }
    if (nowFn() >= deadline) {
      return {
        ok: false,
        code: 'GRACEFUL_QUIT_TIMEOUT',
        error: `Timed out after ${timeoutMs}ms waiting for Antigravity to quit gracefully (fail-closed, never force-killing)`,
        remainingPids: alive.map((p) => p.pid),
      };
    }
    await sleepFn(pollMs);
  }
}

export async function evaluateLaunchPlan(options = {}) {
  const platform = options.platform || process.platform;
  const homeDir = path.resolve(options.homeDir || os.homedir());
  const port = validateCdpPort(options.port ?? DEFAULT_CDP_PORT);
  const nowFn = options.nowFn || (() => Date.now());
  const nowMs = nowFn();
  const killFn = options.killFn || process.kill;
  const execFileFn = options.execFileFn || defaultExecFile;
  const existsSyncFn = options.existsSyncFn || fs.existsSync;
  const statePath = path.resolve(options.statePath || getDefaultLaunchStatePath(homeDir));

  const env = options.env || process.env;
  const launchSpec = buildLaunchSpec({
    platform,
    port,
    homeDir,
    env,
    existsSyncFn,
  });

  const processes = await detectAntigravityProcesses({
    platform,
    execFileFn,
    nowFn,
    procDir: options.procDir ?? '/proc',
  });
  const prism = shouldYieldToPrism({ homeDir, processes, killFn });

  let launchState;
  try {
    launchState = readLaunchState(statePath);
  } catch (err) {
    return {
      ok: false,
      action: 'blocked-unsafe-state',
      code: 'STATE_SECURITY_ERROR',
      error: err?.message || String(err),
      platform,
      port,
      launchSpec,
      processes,
      prism,
      prismYielded: prism.prismYielded,
      circuitBreaker: { tripped: true, layer: 'security', reason: err?.message || String(err) },
      statePath,
      nowMs,
    };
  }

  const breaker = evaluateCircuitBreaker({
    state: launchState,
    sessionAttempts: options.sessionAttempts ?? 0,
    nowMs,
    maxSessionAttempts: options.maxSessionAttempts ?? DEFAULT_MAX_SESSION_ATTEMPTS,
    windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
    maxWindowAttempts: options.maxWindowAttempts ?? DEFAULT_MAX_WINDOW_ATTEMPTS,
  });

  if (processes.detectionFailed) {
    return {
      ok: false,
      action: 'blocked-detection-failed',
      code: 'PROCESS_DETECTION_FAILED',
      error: `Unable to verify whether Antigravity is running (${processes.detectionError || 'process detection failed'}); refusing to launch (fail-closed).`,
      platform,
      port,
      launchSpec,
      processes,
      prism,
      prismYielded: false,
      circuitBreaker: breaker,
      statePath,
      nowMs,
    };
  }

  if (prism.prismYielded) {
    return {
      ok: true,
      action: 'yield-to-prism',
      reason: prism.reason,
      message: 'Obsidian Prism is active or already handling relaunch; agy-Sag yields cleanly.',
      platform,
      port,
      launchSpec,
      processes,
      prism,
      prismYielded: true,
      circuitBreaker: breaker,
      statePath,
      nowMs,
    };
  }

  const withCdp = processes.filter((p) => p.hasRemoteDebuggingPort);
  if (withCdp.length > 0) {
    const discovered = discoverCdpPort(null, platform, homeDir, env);
    const activePort = withCdp[0].debuggingPort || discovered || port;
    return {
      ok: true,
      action: 'already-running-with-cdp',
      activePort,
      message: `Antigravity is already running with --remote-debugging-port (${activePort}).`,
      platform,
      port: activePort,
      launchSpec,
      processes,
      prism,
      prismYielded: false,
      circuitBreaker: breaker,
      statePath,
      nowMs,
    };
  }

  if (processes.length > 0) {
    const coldStartWindowMs = options.coldStartWindowMs ?? COLD_START_WINDOW_MS;
    const allWithinColdStart = processes.every(
      (p) =>
        typeof p.startMs === 'number' &&
        Number.isFinite(p.startMs) &&
        nowMs - p.startMs >= 0 &&
        nowMs - p.startMs <= coldStartWindowMs
    );

    if (!options.autoRelaunchColdStart) {
      const displayCmd = [launchSpec.command, ...launchSpec.args]
        .map((a) => quoteShellArgForDisplay(a, platform))
        .join(' ');
      return {
        ok: true,
        action: 'guide-only',
        requiresManualRelaunch: true,
        message: `Antigravity is running without --remote-debugging-port. Quit Antigravity manually and relaunch via: ${displayCmd}`,
        platform,
        port,
        launchSpec,
        processes,
        prism,
        prismYielded: false,
        circuitBreaker: breaker,
        statePath,
        nowMs,
      };
    }

    if (!allWithinColdStart) {
      return {
        ok: false,
        action: 'blocked-not-cold-start',
        code: 'COLD_START_WINDOW_EXCEEDED',
        error: `Refusing auto-relaunch: Antigravity uptime exceeds ${coldStartWindowMs}ms cold-start safety window (fail-closed).`,
        platform,
        port,
        launchSpec,
        processes,
        prism,
        prismYielded: false,
        circuitBreaker: breaker,
        statePath,
        nowMs,
      };
    }

    if (breaker.tripped) {
      return {
        ok: false,
        action: 'blocked-circuit-breaker',
        code: 'CIRCUIT_BREAKER_TRIPPED',
        error: breaker.reason,
        platform,
        port,
        launchSpec,
        processes,
        prism,
        prismYielded: false,
        circuitBreaker: breaker,
        statePath,
        nowMs,
      };
    }

    return {
      ok: true,
      action: 'graceful-relaunch',
      message: `Antigravity is within ${coldStartWindowMs}ms cold-start window; ready for graceful quit and CDP relaunch on port ${port}.`,
      platform,
      port,
      launchSpec,
      processes,
      prism,
      prismYielded: false,
      circuitBreaker: breaker,
      statePath,
      nowMs,
    };
  }

  // No Antigravity process currently running
  if (breaker.tripped) {
    return {
      ok: false,
      action: 'blocked-circuit-breaker',
      code: 'CIRCUIT_BREAKER_TRIPPED',
      error: breaker.reason,
      platform,
      port,
      launchSpec,
      processes,
      prism,
      prismYielded: false,
      circuitBreaker: breaker,
      statePath,
      nowMs,
    };
  }

  const displayWarning =
    platform === 'linux' && !getEnvCaseInsensitive(env, 'DISPLAY') && !getEnvCaseInsensitive(env, 'WAYLAND_DISPLAY')
      ? 'No DISPLAY or WAYLAND_DISPLAY detected in Linux environment; GUI launch requires an active desktop session.'
      : null;

  return {
    ok: true,
    action: 'launch',
    message: `Ready to launch Antigravity with --remote-debugging-port=${port}.`,
    ...(displayWarning ? { displayWarning } : {}),
    platform,
    port,
    launchSpec,
    processes,
    prism,
    prismYielded: false,
    circuitBreaker: breaker,
    statePath,
    nowMs,
  };
}

export async function executeLaunchPlan(plan, options = {}) {
  if (!plan.ok) return plan;

  if (
    plan.action === 'yield-to-prism' ||
    plan.action === 'already-running-with-cdp' ||
    plan.action === 'guide-only'
  ) {
    return { ...plan, executed: false };
  }

  if (options.dryRun) {
    return { ...plan, dryRun: true, executed: false };
  }

  const spec = plan.launchSpec || {};
  const executableFound =
    typeof plan.executableFound === 'boolean'
      ? plan.executableFound
      : typeof spec.executableFound === 'boolean'
        ? spec.executableFound
        : true;
  const explicitTargetPath =
    typeof plan.executablePath === 'string' && plan.executablePath.trim()
      ? plan.executablePath.trim()
      : spec.command === 'open' && typeof spec.args?.[1] === 'string' && /[\\/]/.test(spec.args[1])
        ? spec.args[1]
        : typeof spec.command === 'string'
          ? spec.command
          : '';
  const hasExplicitMissingExecutable = executableFound === false && /[\\/]/.test(explicitTargetPath);

  if (plan.action !== 'graceful-relaunch' && hasExplicitMissingExecutable) {
    return {
      ...plan,
      ok: false,
      action: 'blocked-missing-executable',
      code: 'EXECUTABLE_NOT_FOUND',
      error: `Antigravity executable not found at explicit path: ${explicitTargetPath}`,
      executed: false,
    };
  }

  const nowFn = options.nowFn || (() => Date.now());
  const spawnFn = options.spawnFn || defaultSpawnDetached;

  // Persist launch attempt BEFORE quitting the host during graceful-relaunch so a transient
  // state-file lock or permission failure never leaves Antigravity closed without relaunching.
  const updatedState = recordLaunchAttempt(plan.statePath, nowFn(), {
    windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
    maxWindowAttempts: options.maxWindowAttempts ?? DEFAULT_MAX_WINDOW_ATTEMPTS,
    cooldownMs: options.cooldownMs ?? DEFAULT_COOLDOWN_MS,
  });

  if (plan.action === 'graceful-relaunch') {
    const quitRes = await requestGracefulQuit({
      processes: plan.processes,
      platform: plan.platform,
      execFileFn: options.execFileFn || defaultExecFile,
      killFn: options.killFn || process.kill,
      isProcessAliveFn: options.isProcessAliveFn,
      sleepFn: options.sleepFn,
      nowFn,
      timeoutMs: options.gracefulQuitTimeoutMs ?? DEFAULT_GRACEFUL_QUIT_TIMEOUT_MS,
      pollMs: options.gracefulPollMs ?? DEFAULT_GRACEFUL_POLL_MS,
    });
    if (!quitRes.ok) {
      return {
        ...plan,
        ok: false,
        action: 'failed-graceful-quit',
        code: quitRes.code,
        error: quitRes.error,
        quitResult: quitRes,
        updatedState,
        executed: false,
      };
    }
    if (hasExplicitMissingExecutable) {
      return {
        ...plan,
        ok: false,
        action: 'blocked-missing-executable',
        code: 'EXECUTABLE_NOT_FOUND',
        error: `Antigravity executable not found at explicit path: ${explicitTargetPath}`,
        updatedState,
        executed: false,
      };
    }
  }

  const child = spawnFn(plan.launchSpec.command, plan.launchSpec.args, {
    detached: true,
    stdio: 'ignore',
    shell: false,
    windowsHide: true,
  });

  return {
    ...plan,
    ok: true,
    executed: true,
    spawnedPid: child?.pid ?? null,
    updatedState,
  };
}

export async function runLaunchCli(argv = [], deps = {}) {
  const opts = parseLauncherArgs(argv);
  const out = deps.out || { stdout: (s) => console.log(s), stderr: (s) => console.error(s) };
  const evalOpts = {
    ...deps,
    port: opts.explicitPort ? opts.port : (deps.port ?? opts.port),
    autoRelaunchColdStart: opts.autoRelaunchColdStart || Boolean(deps.autoRelaunchColdStart),
    statePath: opts.statePath || deps.statePath,
  };
  const plan = await evaluateLaunchPlan(evalOpts);
  const result = await executeLaunchPlan(plan, { ...evalOpts, dryRun: opts.dryRun || Boolean(deps.dryRun) });

  if (opts.json) {
    out.stdout(JSON.stringify(result, null, 2));
  } else if (!result.ok) {
    out.stderr(`[agy-Sag:launch] ${result.error || result.action}`);
  } else {
    out.stdout(`[agy-Sag:launch] (${result.action}) ${result.message}`);
  }

  return result;
}

export class SagKeepaliveController {
  constructor(options = {}) {
    this.port = validateCdpPort(options.port ?? DEFAULT_CDP_PORT);
    this.explicitPort = Boolean(options.explicitPort);
    this.platform = options.platform || process.platform;
    this.homeDir = path.resolve(options.homeDir || os.homedir());
    this.env = options.env || process.env;
    this.procDir = options.procDir ?? '/proc';
    this.statePath = path.resolve(options.statePath || getDefaultLaunchStatePath(this.homeDir));
    this.autoRelaunch = Boolean(options.autoRelaunch || options.autoRelaunchColdStart);
    this.autoRelaunchColdStart = Boolean(options.autoRelaunchColdStart);
    this.maxSessionAttempts = options.maxSessionAttempts ?? DEFAULT_MAX_SESSION_ATTEMPTS;
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxWindowAttempts = options.maxWindowAttempts ?? DEFAULT_MAX_WINDOW_ATTEMPTS;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.dryRun = Boolean(options.dryRun);

    this.nowFn = options.nowFn || (() => Date.now());
    this.execFileFn = options.execFileFn || defaultExecFile;
    this.spawnFn = options.spawnFn || defaultSpawnDetached;
    this.killFn = options.killFn || process.kill;
    this.existsSyncFn = options.existsSyncFn || fs.existsSync;
    this.isProcessAliveFn = options.isProcessAliveFn;
    this.sleepFn = options.sleepFn;
    this.setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer || ((t) => clearTimeout(t));
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};

    this.sessionAttempts = 0;
    this.disconnectCount = 0;
    this.activePort = this.explicitPort ? this.port : null;
    this.running = false;
    this._stopped = false;
    this.timer = null;
    this._externalDaemon = Boolean(options.daemon);

    const baseDiscoverPort =
      options.discoverPort || ((p) => discoverCdpPort(p, this.platform, this.homeDir, this.env));

    this.daemon =
      options.daemon ||
      new SagWatchDaemon({
        port: this.explicitPort ? this.port : null,
        config: options.config || null,
        intervalMs: options.intervalMs ?? 3000,
        maxBackoffMs: options.maxBackoffMs ?? 30000,
        discoverPort: (p) => {
          const explicit = p ?? null;
          if (explicit) return explicit;
          const discovered = baseDiscoverPort(null);
          if (discovered) return discovered;
          return this.activePort;
        },
        listTargets: options.listTargets || ((p) => httpGetJson(`http://127.0.0.1:${p}/json/list`)),
        evalTarget: options.evalTarget,
        enableHostBridge: options.enableHostBridge,
        now: this.nowFn,
        onEvent: (ev) => this.emit(`watch:${ev.event}`, ev),
      });
  }

  emit(event, data = {}) {
    try {
      this.onEvent({ ts: new Date(this.nowFn()).toISOString(), event, ...data });
    } catch {}
  }

  async reconcileOnce() {
    if (this._stopped) {
      return { status: 'stopped', launchResult: null, watchResult: null, nextDelayMs: this.daemon.currentDelayMs };
    }

    const watchResult = await this.daemon.reconcileOnce();
    if (this._stopped) {
      return { status: 'stopped', launchResult: null, watchResult, nextDelayMs: watchResult.nextDelayMs };
    }

    if (watchResult.status === 'ok') {
      this.disconnectCount = 0;
      this.emit('keepalive-healthy', { port: watchResult.port, hostPages: watchResult.hostPages });
      return { status: 'ok', watchResult, launchResult: null, nextDelayMs: watchResult.nextDelayMs };
    }

    // CDP disconnected or port missing
    this.disconnectCount += 1;
    this.emit('keepalive-disconnected', {
      reason: watchResult.status,
      disconnectCount: this.disconnectCount,
      nextDelayMs: watchResult.nextDelayMs,
    });

    if (!this.autoRelaunch) {
      return {
        status: 'waiting-cdp',
        watchResult,
        launchResult: null,
        nextDelayMs: watchResult.nextDelayMs,
      };
    }

    const plan = await evaluateLaunchPlan({
      platform: this.platform,
      homeDir: this.homeDir,
      env: this.env,
      procDir: this.procDir,
      port: this.port,
      statePath: this.statePath,
      sessionAttempts: this.sessionAttempts,
      maxSessionAttempts: this.maxSessionAttempts,
      windowMs: this.windowMs,
      maxWindowAttempts: this.maxWindowAttempts,
      autoRelaunchColdStart: this.autoRelaunchColdStart,
      nowFn: this.nowFn,
      execFileFn: this.execFileFn,
      killFn: this.killFn,
      existsSyncFn: this.existsSyncFn,
    });

    const launchResult = await executeLaunchPlan(plan, {
      dryRun: this.dryRun,
      nowFn: this.nowFn,
      spawnFn: this.spawnFn,
      execFileFn: this.execFileFn,
      killFn: this.killFn,
      isProcessAliveFn: this.isProcessAliveFn,
      sleepFn: this.sleepFn,
      windowMs: this.windowMs,
      maxWindowAttempts: this.maxWindowAttempts,
      cooldownMs: this.cooldownMs,
    });

    if (launchResult.updatedState) {
      this.sessionAttempts += 1;
    }

    if (launchResult.executed) {
      if (!launchResult.updatedState) {
        this.sessionAttempts += 1;
      }
      const verifiedPort = launchResult.activePort || launchResult.port || this.port;
      this.activePort = verifiedPort;
      this.emit('keepalive-relaunched', {
        port: verifiedPort,
        sessionAttempts: this.sessionAttempts,
        spawnedPid: launchResult.spawnedPid,
      });
    } else if (launchResult.action === 'already-running-with-cdp' && launchResult.activePort) {
      this.activePort = launchResult.activePort;
    } else if (launchResult.prismYielded) {
      this.emit('keepalive-yielded', { reason: launchResult.reason });
    } else if (!launchResult.ok) {
      this.emit('keepalive-blocked', { code: launchResult.code, error: launchResult.error });
    }

    return {
      status: launchResult.ok ? watchResult.status : 'blocked',
      watchResult,
      launchResult,
      nextDelayMs: watchResult.nextDelayMs,
    };
  }

  start() {
    if (this.running) return;
    this._stopped = false;
    this.running = true;
    const tick = async () => {
      if (!this.running || this._stopped) return;
      let nextDelayMs = this.daemon?.currentDelayMs || 3000;
      try {
        const res = await this.reconcileOnce();
        if (res && typeof res.nextDelayMs === 'number' && Number.isFinite(res.nextDelayMs)) {
          nextDelayMs = res.nextDelayMs;
        }
      } catch (err) {
        if (typeof this.daemon?._bumpBackoff === 'function') {
          nextDelayMs = this.daemon._bumpBackoff(2);
        } else {
          nextDelayMs = Math.min(30000, Math.round(nextDelayMs * 2));
        }
        this.emit('keepalive-error', { error: err?.message || String(err), nextDelayMs });
      } finally {
        if (this.running && !this._stopped) {
          this.timer = this.setTimer(tick, nextDelayMs);
          this.timer?.unref?.();
        }
      }
    };
    void tick();
  }

  stop() {
    this._stopped = true;
    this.running = false;
    if (this.timer) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
    this.daemon.stop?.();
    this.emit('keepalive-stopped', { sessionAttempts: this.sessionAttempts });
  }
}

function escapeXmlEntity(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildLaunchAgentPlist({
  nodePath = process.execPath,
  cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'sag-cli.mjs'),
  label = 'local.agy-sag-keepalive',
  logDir = path.join(os.homedir(), '.gemini', 'antigravity', 'agy-sag', 'logs'),
} = {}) {
  const safeLabel = escapeXmlEntity(String(label || 'local.agy-sag-keepalive').trim() || 'local.agy-sag-keepalive');
  const safeNode = escapeXmlEntity(path.resolve(String(nodePath || process.execPath)));
  const safeCli = escapeXmlEntity(path.resolve(String(cliPath || '')));
  const resolvedLogDir = path.resolve(String(logDir || path.join(os.homedir(), '.gemini', 'antigravity', 'agy-sag', 'logs')));
  const safeOutLog = escapeXmlEntity(path.join(resolvedLogDir, 'keepalive.out.log'));
  const safeErrLog = escapeXmlEntity(path.join(resolvedLogDir, 'keepalive.err.log'));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>Label</key>',
    `  <string>${safeLabel}</string>`,
    '  <key>ProgramArguments</key>',
    '  <array>',
    `    <string>${safeNode}</string>`,
    `    <string>${safeCli}</string>`,
    '    <string>keepalive</string>',
    '  </array>',
    '  <key>RunAtLoad</key>',
    '  <true/>',
    '  <key>KeepAlive</key>',
    '  <dict>',
    '    <key>SuccessfulExit</key>',
    '    <false/>',
    '  </dict>',
    '  <key>ProcessType</key>',
    '  <string>Background</string>',
    '  <key>StandardOutPath</key>',
    `  <string>${safeOutLog}</string>`,
    '  <key>StandardErrorPath</key>',
    `  <string>${safeErrLog}</string>`,
    '</dict>',
    '</plist>',
    '',
  ].join('\n');
}

const PRISM_PALETTE_MAP = Object.freeze({
  native: 'native',
  obsidian: 'obsidian-prism',
  'obsidian-prism': 'obsidian-prism',
  prism: 'obsidian-prism',
  warm: 'warm-basalt',
  'warm-basalt': 'warm-basalt',
  claude: 'warm-basalt',
  midnight: 'midnight-ink',
  'midnight-ink': 'midnight-ink',
  nord: 'nord-frost',
  'nord-frost': 'nord-frost',
  oled: 'oled-pure',
  'oled-pure': 'oled-pure',
  tokyo: 'tokyo-night',
  'tokyo-night': 'tokyo-night',
  catppuccin: 'catppuccin-mocha',
  'catppuccin-mocha': 'catppuccin-mocha',
  crystal: 'crystal-day',
  'crystal-day': 'crystal-day',
  daylight: 'crystal-day',
  paper: 'warm-paper',
  'warm-paper': 'warm-paper',
  rose: 'rose-dawn',
  'rose-dawn': 'rose-dawn',
  matcha: 'matcha-journal',
  'matcha-journal': 'matcha-journal',
  phantom: 'phantom-crimson',
  crimson: 'phantom-crimson',
  'phantom-crimson': 'phantom-crimson',
  doodle: 'doodle-sketch',
  'doodle-sketch': 'doodle-sketch',
  pixel: 'pixel-terminal',
  'pixel-terminal': 'pixel-terminal',
  aurora: 'aurora-glass',
  'aurora-glass': 'aurora-glass',
});

const PRISM_ACCENT_ALLOWED = new Set(['follow', 'cobalt', 'iris', 'amber', 'emerald', 'rose', 'mono']);
const PRISM_CORNER_ALLOWED = new Set(['sharp', 'balanced', 'soft', 'pill']);

function mapPrismPaletteToSagPreset(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(PRISM_PALETTE_MAP, key) ? PRISM_PALETTE_MAP[key] : null;
}

function readFirstExistingJsonNoSymlink(candidates) {
  for (const filePath of candidates) {
    if (!filePath) continue;
    const resolved = path.resolve(filePath);
    try {
      assertNoSymlinkPath(resolved);
    } catch (err) {
      return {
        path: resolved,
        ok: false,
        exists: true,
        symlinkRejected: true,
        error: err?.message || String(err),
        data: null,
      };
    }
    const res = readJsonFileRejectSymlink(resolved);
    if (res.exists || res.symlinkRejected) {
      return { path: resolved, ...res };
    }
  }
  return {
    path: candidates[0] ? path.resolve(candidates[0]) : null,
    ok: false,
    exists: false,
    symlinkRejected: false,
    error: null,
    data: null,
  };
}

function extractRawThoughtProfiles(thoughtCfg) {
  if (!thoughtCfg || typeof thoughtCfg !== 'object') return [];
  const rawProfiles = thoughtCfg.profiles;
  const list = [];
  if (Array.isArray(rawProfiles)) {
    for (const item of rawProfiles) {
      if (!item || typeof item !== 'object') continue;
      list.push({
        id: String(item.id || '').trim(),
        name: String(item.name || item.id || '').trim(),
        baseUrl: String(item.baseUrl || item.endpoint || item.url || '').trim(),
        model: String(item.model || '').trim(),
        apiKey: typeof item.apiKey === 'string' ? item.apiKey : '',
      });
    }
  } else if (rawProfiles && typeof rawProfiles === 'object') {
    for (const [k, item] of Object.entries(rawProfiles)) {
      if (!item || typeof item !== 'object') continue;
      list.push({
        id: String(item.id || k || '').trim(),
        name: String(item.name || k || '').trim(),
        baseUrl: String(item.baseUrl || item.endpoint || item.url || '').trim(),
        model: String(item.model || '').trim(),
        apiKey: typeof item.apiKey === 'string' ? item.apiKey : '',
      });
    }
  }
  return list.filter((p) => p.name || p.baseUrl || p.model);
}

function buildPrismMigrationPlan({
  prismPluginDir,
  prismConfigDir,
  sagConfigDir,
  homeDir = os.homedir(),
  launchAgentsDir = null,
} = {}) {
  const resolvedHome = path.resolve(homeDir || os.homedir());
  const resolvedPluginDir = path.resolve(
    prismPluginDir || path.join(resolvedHome, '.gemini', 'config', 'plugins', 'obsidian-prism')
  );
  const resolvedPrismCfgDir = path.resolve(
    prismConfigDir || path.join(resolvedHome, '.gemini', 'config')
  );
  const resolvedSagCfgDir = path.resolve(
    sagConfigDir || path.join(resolvedHome, '.config', 'agy-sag')
  );
  const resolvedLaunchAgentsDir = path.resolve(
    launchAgentsDir || path.join(resolvedHome, 'Library', 'LaunchAgents')
  );

  const prismConfigCandidates = [
    path.join(resolvedPluginDir, 'config.json'),
    path.join(resolvedPrismCfgDir, 'obsidian-prism', 'config.json'),
  ];
  if (resolvedPrismCfgDir !== resolvedPluginDir) {
    prismConfigCandidates.push(path.join(resolvedPrismCfgDir, 'config.json'));
  }
  const thoughtConfigCandidates = [
    path.join(resolvedPrismCfgDir, 'obsidian-prism-thought.json'),
    path.join(resolvedPluginDir, 'obsidian-prism-thought.json'),
  ];

  const mainRes = readFirstExistingJsonNoSymlink(prismConfigCandidates);
  const thoughtRes = readFirstExistingJsonNoSymlink(thoughtConfigCandidates);

  const mainCfg = mainRes.ok && mainRes.data && typeof mainRes.data === 'object' ? mainRes.data : {};
  const thoughtCfg = thoughtRes.ok && thoughtRes.data && typeof thoughtRes.data === 'object' ? thoughtRes.data : {};

  const suggestedConfig = {
    modules: {},
  };

  if (mainCfg.hostLocalization !== undefined) {
    if (typeof mainCfg.hostLocalization === 'boolean') {
      suggestedConfig.hostI18n = mainCfg.hostLocalization;
      suggestedConfig.modules.hostI18n = mainCfg.hostLocalization;
    } else if (typeof mainCfg.hostLocalization === 'string' && mainCfg.hostLocalization.trim()) {
      const rawLoc = mainCfg.hostLocalization.trim();
      const enabledLoc = rawLoc.toLowerCase() !== 'off';
      suggestedConfig.hostI18n = enabledLoc;
      suggestedConfig.modules.hostI18n = enabledLoc;
      if (enabledLoc && rawLoc.toLowerCase() !== 'on') {
        suggestedConfig.hostI18nLocale = rawLoc;
      }
    } else if (mainCfg.hostLocalization && typeof mainCfg.hostLocalization === 'object') {
      const enabledLoc = mainCfg.hostLocalization.enabled !== false;
      suggestedConfig.hostI18n = enabledLoc;
      suggestedConfig.modules.hostI18n = enabledLoc;
      if (typeof mainCfg.hostLocalization.locale === 'string' && mainCfg.hostLocalization.locale.trim()) {
        suggestedConfig.hostI18nLocale = mainCfg.hostLocalization.locale.trim();
      }
    }
  }
  const explicitLang = typeof mainCfg.language === 'string' ? mainCfg.language.trim() : typeof mainCfg.lang === 'string' ? mainCfg.lang.trim() : '';
  if (explicitLang && !suggestedConfig.hostI18nLocale) {
    suggestedConfig.hostI18nLocale = explicitLang;
  }

  const mappedPalette = mapPrismPaletteToSagPreset(mainCfg.palette);
  if (mappedPalette) {
    suggestedConfig.themePreset = mappedPalette;
    if (mappedPalette !== 'native') suggestedConfig.modules.themeStudio = true;
  }
  if (mainCfg.lightPreset !== undefined) {
    const mappedLight = mapPrismPaletteToSagPreset(mainCfg.lightPreset);
    suggestedConfig.themeAutoPair = Boolean(mainCfg.lightPreset && String(mainCfg.lightPreset).trim().toLowerCase() !== 'off');
    if (mappedLight && !suggestedConfig.themePreset) {
      suggestedConfig.themePreset = mappedLight;
    }
  }
  if (typeof mainCfg.accentTone === 'string') {
    const acc = mainCfg.accentTone.trim().toLowerCase();
    if (PRISM_ACCENT_ALLOWED.has(acc)) suggestedConfig.themeAccent = acc;
  }
  if (typeof mainCfg.cornerStyle === 'string') {
    const cor = mainCfg.cornerStyle.trim().toLowerCase();
    if (PRISM_CORNER_ALLOWED.has(cor)) suggestedConfig.themeCorners = cor;
  }
  if (typeof mainCfg.smoothCaret === 'boolean') {
    suggestedConfig.themeSmoothCaret = mainCfg.smoothCaret;
  }

  const rawThoughtMode = typeof mainCfg.thoughtTranslate === 'string' ? mainCfg.thoughtTranslate.trim().toLowerCase() : '';
  const thoughtEnabled =
    typeof mainCfg.thoughtTranslate === 'boolean'
      ? mainCfg.thoughtTranslate
      : rawThoughtMode
        ? rawThoughtMode !== 'off'
        : typeof thoughtCfg.enabled === 'boolean'
          ? thoughtCfg.enabled
          : undefined;
  if (thoughtEnabled !== undefined) {
    suggestedConfig.thoughtTranslate = thoughtEnabled;
    suggestedConfig.modules.thoughtTranslate = thoughtEnabled;
    if (thoughtEnabled) {
      suggestedConfig.thoughtEngine = rawThoughtMode === 'mt' ? 'mt' : 'openai';
    }
  }
  const thoughtView = mainCfg.thoughtView ?? thoughtCfg.viewMode ?? thoughtCfg.thoughtView;
  if (typeof thoughtView === 'string' && thoughtView.trim()) {
    const v = thoughtView.trim().toLowerCase();
    suggestedConfig.thoughtViewMode = v === 'immersive' || v === 'translated' ? 'translated' : 'bilingual';
  }
  const translateTitles = mainCfg.translateTitles ?? thoughtCfg.translateTitles;
  if (typeof translateTitles === 'boolean') {
    suggestedConfig.thoughtTranslateTitles = translateTitles;
  }
  const stylePreset = thoughtCfg.stylePreset ?? mainCfg.stylePreset;
  if (typeof stylePreset === 'string' && stylePreset.trim()) {
    suggestedConfig.thoughtStylePreset = stylePreset.trim();
  }
  const proxyMode = thoughtCfg.proxyMode ?? mainCfg.proxyMode;
  if (typeof proxyMode === 'string' && proxyMode.trim()) {
    suggestedConfig.thoughtProxyMode = proxyMode.trim();
  }
  const activeProfile = thoughtCfg.activeProfileId ?? thoughtCfg.activeProfile ?? mainCfg.activeProfileId ?? mainCfg.activeProfile;
  if (typeof activeProfile === 'string' && activeProfile.trim()) {
    suggestedConfig.thoughtActiveProfile = activeProfile.trim();
  }

  const rawProfiles = extractRawThoughtProfiles(thoughtCfg);
  const sanitizedProfiles = rawProfiles.map((p, idx) => ({
    id: p.id || `prism_${idx + 1}`,
    name: p.name,
    baseUrl: p.baseUrl,
    model: p.model,
    hasApiKey: Boolean(p.apiKey && p.apiKey.trim().length > 0),
    active: Boolean(activeProfile && (p.id === activeProfile || p.name === activeProfile)),
  }));

  const prismWatchPlistPath = path.join(resolvedLaunchAgentsDir, 'local.antigravity-prism-watch.plist');
  let prismWatchDetected = false;
  try {
    const st = fs.lstatSync(prismWatchPlistPath);
    prismWatchDetected = Boolean(st && !st.isSymbolicLink() && st.isFile());
  } catch {
    prismWatchDetected = false;
  }

  const recommendations = [];
  if (prismWatchDetected) {
    recommendations.push(
      'Detected local.antigravity-prism-watch LaunchAgent: disable Prism watch agent (do NOT delete obsidian-prism/plugin.json to preserve rollback) or switch to agy-Sag LaunchAgent via buildLaunchAgentPlist().'
    );
  } else if (mainRes.exists || thoughtRes.exists) {
    recommendations.push(
      'To avoid duplicate CDP injection, disable Obsidian Prism in Antigravity plugins (keep obsidian-prism/plugin.json intact) or run agy-Sag LaunchAgent.'
    );
  }
  if (sanitizedProfiles.some((p) => p.hasApiKey)) {
    recommendations.push(
      'Thought translation API keys are never returned in inspect output and must only be written to an isolated 0600 secrets file outside ~/.gemini/antigravity/.'
    );
  }

  return {
    publicReport: {
      ok: true,
      readOnly: true,
      sources: {
        prismConfigPath: mainRes.exists ? mainRes.path : null,
        prismConfigFound: Boolean(mainRes.exists && mainRes.ok),
        thoughtConfigPath: thoughtRes.exists ? thoughtRes.path : null,
        thoughtConfigFound: Boolean(thoughtRes.exists && thoughtRes.ok),
        symlinkRejected: Boolean(mainRes.symlinkRejected || thoughtRes.symlinkRejected),
      },
      sagConfigDir: resolvedSagCfgDir,
      suggestedConfig,
      thoughtProfiles: sanitizedProfiles,
      prismWatchDetected,
      prismWatchPlistPath,
      recommendations,
    },
    internalSecrets: {
      activeProfile: typeof activeProfile === 'string' ? activeProfile.trim() : null,
      proxyMode: typeof proxyMode === 'string' && proxyMode.trim() ? proxyMode.trim() : 'auto',
      customProxyUrl: typeof thoughtCfg.customProxyUrl === 'string' ? thoughtCfg.customProxyUrl.trim() : '',
      stylePreset: typeof stylePreset === 'string' && stylePreset.trim() ? stylePreset.trim() : 'technical',
      customPrompt: typeof thoughtCfg.customPrompt === 'string' ? thoughtCfg.customPrompt.trim().slice(0, 600) : '',
      profiles: rawProfiles,
    },
  };
}

export function inspectPrismMigration(options = {}) {
  return buildPrismMigrationPlan(options).publicReport;
}

function writeJsonAtomic0600(filePath, dataObj, { platform = process.platform, renameSyncFn = fs.renameSync, waitFn = null } = {}) {
  const resolved = path.resolve(filePath);
  assertNoSymlinkPath(resolved);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  safeChmodSync(dir, 0o700, { platform });
  assertNoSymlinkPath(resolved);

  const tmpName = `.sag-migrate.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  const tmpPath = path.join(dir, tmpName);
  const payload = JSON.stringify(dataObj, null, 2) + '\n';
  try {
    fs.writeFileSync(tmpPath, payload, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    safeChmodSync(tmpPath, 0o600, { platform });
    atomicRenameWithRetry(tmpPath, resolved, { platform, renameSyncFn, waitFn });
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch {}
    throw err;
  }
  return resolved;
}

export function applyPrismMigration({
  prismPluginDir,
  prismConfigDir,
  sagConfigDir,
  sagSecretsPath,
  dryRun = true,
  homeDir = os.homedir(),
  launchAgentsDir = null,
  platform = process.platform,
} = {}) {
  const resolvedHome = path.resolve(homeDir || os.homedir());
  const plan = buildPrismMigrationPlan({
    prismPluginDir,
    prismConfigDir,
    sagConfigDir,
    homeDir: resolvedHome,
    launchAgentsDir,
  });
  const report = plan.publicReport;
  const resolvedConfigPath = path.join(report.sagConfigDir, 'config.json');
  const resolvedSecretsPath = path.resolve(
    sagSecretsPath || path.join(report.sagConfigDir, 'translator-secrets.json')
  );

  // Never allow writing secrets into ~/.gemini/antigravity/
  const forbiddenAgDir = path.join(resolvedHome, '.gemini', 'antigravity');
  const canonicalizeAllowMissing = (p) => {
    const abs = path.resolve(p);
    const tail = [];
    let cur = abs;
    while (true) {
      try {
        const real = canonicalRealpathSync(cur);
        return tail.length ? path.join(real, ...tail.reverse()) : real;
      } catch {
        const parent = path.dirname(cur);
        if (parent === cur) return abs;
        tail.push(path.basename(cur));
        cur = parent;
      }
    }
  };
  if (
    isPathWithinBase(canonicalizeAllowMissing(resolvedSecretsPath), canonicalizeAllowMissing(forbiddenAgDir)) ||
    isPathWithinBase(canonicalizeAllowMissing(resolvedConfigPath), canonicalizeAllowMissing(forbiddenAgDir))
  ) {
    throw new Error(`Security violation: refusing to write migration files inside ${forbiddenAgDir}`);
  }

  const isDryRun = dryRun !== false;
  if (isDryRun) {
    return {
      ...report,
      dryRun: true,
      written: false,
      configPath: resolvedConfigPath,
      secretsPath: resolvedSecretsPath,
      prismFilesModified: false,
    };
  }

  writeJsonAtomic0600(
    resolvedConfigPath,
    {
      version: 1,
      migratedFrom: 'obsidian-prism',
      migratedAt: new Date().toISOString(),
      ...report.suggestedConfig,
    },
    { platform }
  );

  let secretsWritten = false;
  if (plan.internalSecrets.profiles.length > 0) {
    // Preserve existing non-OpenAI provider secrets & non-colliding profiles if target file already exists
    let existingStore = null;
    try {
      assertNoSymlinkPath(resolvedSecretsPath);
      const st = fs.lstatSync(resolvedSecretsPath);
      if (st && !st.isSymbolicLink() && st.isFile() && st.size <= 256 * 1024) {
        const parsed = JSON.parse(fs.readFileSync(resolvedSecretsPath, 'utf8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) existingStore = parsed;
      }
    } catch {
      existingStore = null;
    }
    const mappedProfiles = plan.internalSecrets.profiles.map((p, idx) => ({
      id: p.id || `prism_${idx + 1}`,
      name: p.name || `Prism ${idx + 1}`,
      engine: 'openai',
      baseUrl: p.baseUrl || '',
      model: p.model || '',
      apiKey: p.apiKey || '',
    }));
    const existingProfiles = Array.isArray(existingStore?.profiles) ? existingStore.profiles : [];
    const mappedIds = new Set(mappedProfiles.map((p) => p.id));
    const mergedProfiles = [
      ...existingProfiles.filter((p) => p && typeof p === 'object' && p.id && !mappedIds.has(p.id)),
      ...mappedProfiles,
    ];
    const activeObj =
      mappedProfiles.find(
        (p) =>
          plan.internalSecrets.activeProfile &&
          (p.id === plan.internalSecrets.activeProfile || p.name === plan.internalSecrets.activeProfile)
      ) ||
      mappedProfiles.find((p) => p.apiKey) ||
      mappedProfiles[0];
    const existingProviders =
      existingStore?.providers && typeof existingStore.providers === 'object' ? existingStore.providers : {};
    writeJsonAtomic0600(
      resolvedSecretsPath,
      {
        ...(existingStore || {}),
        version: 1,
        migratedFrom: 'obsidian-prism-thought',
        migratedAt: new Date().toISOString(),
        proxyMode: plan.internalSecrets.proxyMode || existingStore?.proxyMode || 'auto',
        customProxyUrl: plan.internalSecrets.customProxyUrl || existingStore?.customProxyUrl || '',
        stylePreset: plan.internalSecrets.stylePreset || existingStore?.stylePreset || 'technical',
        customPrompt: plan.internalSecrets.customPrompt || existingStore?.customPrompt || '',
        activeProfileId: activeObj?.id || existingStore?.activeProfileId || '',
        profiles: mergedProfiles,
        providers: {
          ...existingProviders,
          openai: {
            baseUrl: activeObj?.baseUrl || existingProviders.openai?.baseUrl || 'https://api.openai.com/v1',
            model: activeObj?.model || existingProviders.openai?.model || 'gpt-4o-mini',
            apiKey: activeObj?.apiKey || existingProviders.openai?.apiKey || '',
          },
        },
      },
      { platform }
    );
    secretsWritten = true;
  }

  return {
    ...report,
    readOnly: false,
    dryRun: false,
    written: true,
    configWritten: true,
    secretsWritten,
    configPath: resolvedConfigPath,
    secretsPath: resolvedSecretsPath,
    prismFilesModified: false,
  };
}

export async function runKeepaliveCli(argv = [], deps = {}) {
  const opts = parseLauncherArgs(argv);
  const cfgPatch = buildConfigPatchFromOpts(opts);
  const out = deps.out || { stdout: (s) => console.log(s), stderr: (s) => console.error(s) };

  const controller = new SagKeepaliveController({
    ...deps,
    port: opts.explicitPort ? opts.port : (deps.port ?? opts.port),
    explicitPort: opts.explicitPort || Boolean(deps.explicitPort),
    config: Object.keys(cfgPatch).length ? cfgPatch : deps.config,
    intervalMs: opts.intervalMs,
    maxBackoffMs: opts.maxBackoffMs,
    autoRelaunch: opts.autoRelaunch || opts.autoRelaunchColdStart || Boolean(deps.autoRelaunch),
    autoRelaunchColdStart: opts.autoRelaunchColdStart || Boolean(deps.autoRelaunchColdStart),
    dryRun: opts.dryRun || Boolean(deps.dryRun),
    statePath: opts.statePath || deps.statePath,
    enableHostBridge: opts.once ? false : deps.enableHostBridge,
    onEvent:
      deps.onEvent ||
      ((ev) => {
        if (opts.json) {
          if (!opts.once) out.stdout(JSON.stringify(ev));
        } else {
          out.stdout(`[agy-Sag:keepalive] ${ev.event}${ev.port ? ` (port=${ev.port})` : ''}`);
        }
      }),
  });

  if (opts.once) {
    const res = await controller.reconcileOnce();
    if (opts.json) out.stdout(JSON.stringify(res, null, 2));
    return res;
  }

  const shutdown = () => {
    controller.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  controller.start();
  const keepAliveHandle = setInterval(() => {}, 60_000);
  return { controller, keepAliveHandle };
}

const isEntry = isCliEntry(import.meta.url);
if (isEntry) {
  const rawArgs = process.argv.slice(2);
  const mode = rawArgs[0] === 'keepalive' ? 'keepalive' : 'launch';
  const subArgs = rawArgs[0] === 'keepalive' || rawArgs[0] === 'launch' ? rawArgs.slice(1) : rawArgs;
  const runner = mode === 'keepalive' ? runKeepaliveCli(subArgs) : runLaunchCli(subArgs);
  runner
    .then((res) => {
      if (res && res.ok === false) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error('[agy-Sag:launcher]', err?.message || err);
      process.exitCode = 1;
    });
}
