import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  COLD_START_WINDOW_MS,
  DEFAULT_CDP_PORT,
  PRISM_START_TOLERANCE_MS,
  SagKeepaliveController,
  buildLaunchSpec,
  detectAntigravityProcesses,
  evaluateCircuitBreaker,
  evaluateLaunchPlan,
  executeLaunchPlan,
  extractRemoteDebuggingPort,
  hasRemoteDebuggingPort,
  parseLauncherArgs,
  readLaunchState,
  readPrismRelaunchState,
  recordLaunchAttempt,
  runKeepaliveCli,
  runLaunchCli,
  shouldYieldToPrism,
  writeLaunchStateAtomic,
} from '../cli/launcher.mjs';
import { runSagCli } from '../cli/sag-cli.mjs';
import { SagWatchDaemon } from '../cli/watch-daemon.mjs';

function makeTempHome(prefix = 'agy-sag-launcher-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('parseLauncherArgs validates ports, intervals, presets and boolean flags', () => {
  const defaults = parseLauncherArgs([]);
  assert.equal(defaults.port, DEFAULT_CDP_PORT);
  assert.equal(defaults.explicitPort, false);
  assert.equal(defaults.autoRelaunchColdStart, false);

  const parsed = parseLauncherArgs([
    '--port=9333',
    '--dry-run',
    '--json',
    '--auto-relaunch-cold-start',
    '--interval=2000',
    '--max-backoff=12000',
    '--once',
    '--preset=power',
    '--lang=zh-CN',
  ]);
  assert.equal(parsed.port, 9333);
  assert.equal(parsed.explicitPort, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.json, true);
  assert.equal(parsed.autoRelaunchColdStart, true);
  assert.equal(parsed.intervalMs, 2000);
  assert.equal(parsed.maxBackoffMs, 12000);
  assert.equal(parsed.once, true);
  assert.equal(parsed.preset, 'power');
  assert.equal(parsed.lang, 'zh-CN');

  assert.throws(() => parseLauncherArgs(['--port=80']));
  assert.throws(() => parseLauncherArgs(['--port=1023']));
  assert.throws(() => parseLauncherArgs(['--port=65536']));
  assert.throws(() => parseLauncherArgs(['--port=abc']));
  assert.throws(() => parseLauncherArgs(['--interval=100']));
});

test('buildLaunchSpec generates safe cross-platform commands without shell interpolation', () => {
  const mac = buildLaunchSpec({
    platform: 'darwin',
    port: 9222,
    homeDir: '/Users/tester',
    existsSyncFn: (p) => p === '/Applications/Antigravity.app',
  });
  assert.equal(mac.command, 'open');
  assert.deepEqual(mac.args, ['-na', 'Antigravity', '--args', '--remote-debugging-port=9222']);
  assert.equal(mac.shell, false);
  assert.equal(mac.executableFound, true);

  const winPrimary = buildLaunchSpec({
    platform: 'win32',
    port: 9229,
    homeDir: 'C:\\Users\\tester',
    env: { LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' },
    existsSyncFn: (p) => p === 'C:\\Users\\tester\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe',
  });
  assert.equal(winPrimary.command, 'C:\\Users\\tester\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe');
  assert.deepEqual(winPrimary.args, ['--remote-debugging-port=9229']);
  assert.equal(winPrimary.shell, false);
  assert.equal(winPrimary.executableFound, true);

  const winFallback = buildLaunchSpec({
    platform: 'win32',
    port: 9229,
    homeDir: 'C:\\Users\\tester',
    env: { LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local', ProgramFiles: 'D:\\Programs' },
    existsSyncFn: (p) => p === 'D:\\Programs\\Antigravity\\Antigravity.exe',
  });
  assert.equal(winFallback.command, 'D:\\Programs\\Antigravity\\Antigravity.exe');
  assert.equal(winFallback.executableFound, true);

  const linuxFound = buildLaunchSpec({
    platform: 'linux',
    port: 9222,
    homeDir: '/home/tester',
    existsSyncFn: (p) => p === '/usr/share/antigravity/antigravity',
  });
  assert.equal(linuxFound.command, '/usr/share/antigravity/antigravity');
  assert.deepEqual(linuxFound.args, ['--remote-debugging-port=9222']);

  const linuxFallback = buildLaunchSpec({
    platform: 'linux',
    port: 9222,
    homeDir: '/home/tester',
    existsSyncFn: () => false,
  });
  assert.equal(linuxFallback.command, 'antigravity');
  assert.equal(linuxFallback.executableFound, false);
});

test('hasRemoteDebuggingPort regex respects exact flag boundaries', () => {
  assert.equal(hasRemoteDebuggingPort('/Applications/Antigravity.app/Contents/MacOS/Electron --remote-debugging-port=9222'), true);
  assert.equal(hasRemoteDebuggingPort('Antigravity.exe --remote-debugging-port 9229 --flag'), true);
  assert.equal(hasRemoteDebuggingPort('--remote-debugging-port'), true);
  assert.equal(extractRemoteDebuggingPort('Antigravity --remote-debugging-port=9225 --other'), 9225);
  assert.equal(extractRemoteDebuggingPort('Antigravity --remote-debugging-port 9333'), 9333);

  // Boundary negatives
  assert.equal(hasRemoteDebuggingPort('/path/Antigravity --remote-debugging-port-extra=9222'), false);
  assert.equal(hasRemoteDebuggingPort('/path/Antigravity --not-remote-debugging-port=9222'), false);
  assert.equal(hasRemoteDebuggingPort('/path/Antigravity --foo--remote-debugging-port'), false);
  assert.equal(hasRemoteDebuggingPort(''), false);
});

test('detectAntigravityProcesses parses macOS/Linux ps and Windows PowerShell/WMIC while filtering helpers', async () => {
  const nowMs = Date.parse('Fri Nov 27 15:00:00 2026');
  const macPsOut = [
    '  100     1    00:03 Fri Nov 27 14:59:57 2026 /Applications/Antigravity.app/Contents/MacOS/Electron --remote-debugging-port=9222',
    '  101   100    00:02 Fri Nov 27 14:59:58 2026 /Applications/Antigravity.app/Contents/MacOS/Electron --type=renderer --remote-debugging-port=9222',
    '  102     1    00:05 Fri Nov 27 14:59:55 2026 node /Users/test/agy-Sag/cli/sag-cli.mjs launch',
  ].join('\n');

  const macProcs = await detectAntigravityProcesses({
    platform: 'darwin',
    nowFn: () => nowMs,
    execFileFn: async () => ({ stdout: macPsOut }),
  });
  assert.equal(macProcs.length, 1);
  assert.equal(macProcs[0].pid, 100);
  assert.equal(macProcs[0].hasRemoteDebuggingPort, true);
  assert.equal(macProcs[0].debuggingPort, 9222);
  assert.equal(macProcs[0].uptimeMs, 3000);

  const winJsonOut = JSON.stringify([
    {
      ProcessId: 4040,
      ParentProcessId: 1000,
      CreationDate: '/Date(1795791597000)/',
      CommandLine: '"C:\\Users\\u\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe" --remote-debugging-port=9229',
    },
    {
      ProcessId: 4041,
      ParentProcessId: 4040,
      CreationDate: '/Date(1795791598000)/',
      CommandLine: '"C:\\Users\\u\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe" --type=gpu-process',
    },
  ]);

  const winProcs = await detectAntigravityProcesses({
    platform: 'win32',
    nowFn: () => 1795791600000,
    execFileFn: async (cmd) => {
      assert.equal(cmd, 'powershell.exe');
      return { stdout: winJsonOut };
    },
  });
  assert.equal(winProcs.length, 1);
  assert.equal(winProcs[0].pid, 4040);
  assert.equal(winProcs[0].debuggingPort, 9229);
  assert.equal(winProcs[0].uptimeMs, 3000);

  // Windows WMIC fallback when PowerShell errors
  const wmicOut = [
    'CommandLine="C:\\Apps\\Antigravity.exe"',
    'CreationDate=20261127145958.000000+000',
    'ParentProcessId=12',
    'ProcessId=5555',
    '',
  ].join('\n');
  const wmicProcs = await detectAntigravityProcesses({
    platform: 'win32',
    nowFn: () => Date.UTC(2026, 10, 27, 15, 0, 0),
    execFileFn: async (cmd) => {
      if (cmd === 'powershell.exe') throw new Error('powershell disabled');
      return { stdout: wmicOut };
    },
  });
  assert.equal(wmicProcs.length, 1);
  assert.equal(wmicProcs[0].pid, 5555);
  assert.equal(wmicProcs[0].hasRemoteDebuggingPort, false);
  assert.equal(wmicProcs[0].uptimeMs, 2000);
});

test('Obsidian Prism coexistence yields on live .daemon.pid, matching .relaunch-prompt-state.json (<=15000ms), and rejects symlinks', () => {
  const homeDir = makeTempHome();
  try {
    const prismDir = path.join(homeDir, '.gemini', 'config', 'plugins', 'obsidian-prism');
    fs.mkdirSync(prismDir, { recursive: true });

    // 1) .daemon.pid active -> yield
    const pidFile = path.join(prismDir, '.daemon.pid');
    fs.writeFileSync(pidFile, '98765\n', 'utf8');
    const yieldDaemon = shouldYieldToPrism({
      homeDir,
      processes: [],
      killFn: (pid, sig) => {
        if (pid === 98765 && sig === 0) return true;
        const err = new Error('ESRCH');
        err.code = 'ESRCH';
        throw err;
      },
    });
    assert.equal(yieldDaemon.prismYielded, true);
    assert.equal(yieldDaemon.reason, 'prism_daemon_active');

    // Remove .daemon.pid; test .relaunch-prompt-state.json within 15000ms tolerance
    fs.unlinkSync(pidFile);
    const relaunchFile = path.join(prismDir, '.relaunch-prompt-state.json');
    const baseStart = 1795441015000;
    fs.writeFileSync(
      relaunchFile,
      JSON.stringify({
        hostPid: 78988,
        startTimeMs: baseStart,
        hostStartMs: baseStart + 12000,
        decision: 'yes',
      }),
      'utf8'
    );

    const yieldMatch = shouldYieldToPrism({
      homeDir,
      processes: [{ pid: 78988, startMs: baseStart }],
      killFn: () => {
        throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
      },
    });
    assert.equal(yieldMatch.prismYielded, true);
    assert.equal(yieldMatch.reason, 'prism_relaunch_state_match');
    assert.equal(yieldMatch.matchedPid, 78988);

    // Beyond 15000ms tolerance -> do not falsely match
    const noYieldFar = shouldYieldToPrism({
      homeDir,
      processes: [{ pid: 78988, startMs: baseStart + PRISM_START_TOLERANCE_MS + 13000 }],
      killFn: () => {
        throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
      },
    });
    assert.equal(noYieldFar.prismYielded, false);

    // Symlink protection on .relaunch-prompt-state.json
    const secretFile = path.join(homeDir, 'outside-secret.json');
    fs.writeFileSync(secretFile, JSON.stringify({ hostPid: 78988, hostStartMs: baseStart }), 'utf8');
    fs.unlinkSync(relaunchFile);
    fs.symlinkSync(secretFile, relaunchFile);

    const symRead = readPrismRelaunchState(homeDir);
    assert.equal(symRead.ok, false);
    assert.equal(symRead.symlinkRejected, true);
    assert.equal(symRead.state, null);

    const yieldSym = shouldYieldToPrism({
      homeDir,
      processes: [{ pid: 78988, startMs: baseStart }],
    });
    assert.equal(yieldSym.prismYielded, false);
    assert.equal(yieldSym.symlinkRejected, true);

    // config.json read-only minimal summary (does not leak unrelated userSettings/sidecars)
    const configFile = path.join(homeDir, '.gemini', 'config', 'config.json');
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        plugins: { 'obsidian-prism': { enabled: true } },
        userSettings: { remoteControlHostname: 'secret-host' },
      }),
      'utf8'
    );
    const withConfig = shouldYieldToPrism({ homeDir, processes: [] });
    assert.equal(withConfig.configRef.obsidianPrismEnabled, true);
    assert.equal('userSettings' in withConfig.configRef, false);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('Cold-start protection: running without CDP defaults to guide-only; <=5000ms allows graceful quit + relaunch; >5000ms refuses; quit failure fail-closed without SIGKILL', async () => {
  const homeDir = makeTempHome();
  try {
    const nowMs = Date.parse('Fri Nov 27 15:00:00 2026');
    const statePath = path.join(homeDir, '.gemini', 'antigravity', 'agy-sag', 'launch-state.json');

    // 1) Running without port & NO --auto-relaunch-cold-start -> guide-only, zero kills, zero spawns
    const signalsSent = [];
    let spawnCount = 0;
    const guidePlan = await evaluateLaunchPlan({
      platform: 'darwin',
      homeDir,
      statePath,
      nowFn: () => nowMs,
      execFileFn: async () => ({
        stdout: '  222     1    00:02 Fri Nov 27 14:59:58 2026 /Applications/Antigravity.app/Contents/MacOS/Electron',
      }),
      killFn: (pid, sig) => {
        signalsSent.push({ pid, sig });
        throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
      },
    });
    assert.equal(guidePlan.ok, true);
    assert.equal(guidePlan.action, 'guide-only');
    assert.equal(guidePlan.requiresManualRelaunch, true);
    const guideExec = await executeLaunchPlan(guidePlan, {
      spawnFn: () => {
        spawnCount += 1;
        return { pid: 999 };
      },
    });
    assert.equal(guideExec.executed, false);
    assert.equal(spawnCount, 0);
    assert.equal(signalsSent.length, 0);

    // 2) Running without port > 5000ms with --auto-relaunch-cold-start -> blocked (fail-closed)
    const oldPlan = await evaluateLaunchPlan({
      platform: 'darwin',
      homeDir,
      statePath,
      autoRelaunchColdStart: true,
      nowFn: () => nowMs,
      execFileFn: async () => ({
        stdout: '  222     1    00:10 Fri Nov 27 14:59:50 2026 /Applications/Antigravity.app/Contents/MacOS/Electron',
      }),
    });
    assert.equal(oldPlan.ok, false);
    assert.equal(oldPlan.action, 'blocked-not-cold-start');
    assert.equal(oldPlan.code, 'COLD_START_WINDOW_EXCEEDED');

    // 3) Running <= 5000ms with --auto-relaunch-cold-start -> osascript graceful quit, confirm exit, then spawn
    const execLog = [];
    let alive = true;
    const coldPlan = await evaluateLaunchPlan({
      platform: 'darwin',
      homeDir,
      statePath,
      port: 9222,
      autoRelaunchColdStart: true,
      nowFn: () => nowMs,
      execFileFn: async () => ({
        stdout: `  333     1    00:04 Fri Nov 27 14:59:56 2026 /Applications/Antigravity.app/Contents/MacOS/Electron`,
      }),
    });
    assert.equal(coldPlan.ok, true);
    assert.equal(coldPlan.action, 'graceful-relaunch');

    const spawnedCalls = [];
    const coldExec = await executeLaunchPlan(coldPlan, {
      nowFn: () => nowMs,
      execFileFn: async (cmd, args) => {
        execLog.push({ cmd, args });
        if (cmd === 'osascript') {
          alive = false;
        }
        return { stdout: '' };
      },
      isProcessAliveFn: () => alive,
      sleepFn: async () => {},
      spawnFn: (cmd, args, opts) => {
        spawnedCalls.push({ cmd, args, opts });
        return { pid: 4444 };
      },
    });
    assert.equal(coldExec.ok, true);
    assert.equal(coldExec.executed, true);
    assert.equal(coldExec.spawnedPid, 4444);
    assert.deepEqual(execLog, [
      { cmd: 'osascript', args: ['-e', 'tell application "Antigravity" to quit'] },
    ]);
    assert.equal(spawnedCalls[0].cmd, 'open');
    assert.deepEqual(spawnedCalls[0].args, ['-na', 'Antigravity', '--args', '--remote-debugging-port=9222']);

    // 4) Windows graceful quit uses taskkill /PID <pid> WITHOUT /F and fail-closes on timeout (never force-kills)
    let winNow = nowMs + 10_000;
    const winExecCalls = [];
    const winPlan = await evaluateLaunchPlan({
      platform: 'win32',
      homeDir,
      statePath,
      port: 9222,
      autoRelaunchColdStart: true,
      nowFn: () => winNow,
      execFileFn: async () => ({
        stdout: JSON.stringify({
          ProcessId: 777,
          ParentProcessId: 10,
          CreationDate: `/Date(${winNow - COLD_START_WINDOW_MS + 1000})/`,
          CommandLine: 'C:\\Users\\u\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe',
        }),
      }),
    });
    assert.equal(winPlan.ok, true);
    assert.equal(winPlan.action, 'graceful-relaunch');

    let spawnAfterTimeout = 0;
    const winFailExec = await executeLaunchPlan(winPlan, {
      nowFn: () => winNow,
      execFileFn: async (cmd, args) => {
        winExecCalls.push({ cmd, args });
        return { stdout: '' };
      },
      isProcessAliveFn: () => true, // refuses to exit
      sleepFn: async (ms) => {
        winNow += ms;
      },
      gracefulQuitTimeoutMs: 500,
      gracefulPollMs: 250,
      spawnFn: () => {
        spawnAfterTimeout += 1;
        return { pid: 888 };
      },
    });
    assert.equal(winFailExec.ok, false);
    assert.equal(winFailExec.action, 'failed-graceful-quit');
    assert.equal(winFailExec.code, 'GRACEFUL_QUIT_TIMEOUT');
    assert.equal(winFailExec.executed, false);
    assert.equal(spawnAfterTimeout, 0);
    assert.deepEqual(winExecCalls, [{ cmd: 'taskkill', args: ['/PID', '777'] }]);
    assert.equal(
      winExecCalls.some((c) => c.args.includes('/F')),
      false,
      'Must never pass /F to taskkill'
    );
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('Two-layer circuit breaker, atomic 0600 launch-state.json persistence & symlink rejection', async () => {
  const homeDir = makeTempHome();
  try {
    const statePath = path.join(homeDir, '.gemini', 'antigravity', 'agy-sag', 'launch-state.json');
    const t0 = 1_795_500_000_000;

    // Layer 1: session attempts limit
    const sessionTripped = evaluateCircuitBreaker({
      state: { version: 1, attempts: [], cooldownUntil: null },
      sessionAttempts: 3,
      nowMs: t0,
      maxSessionAttempts: 3,
    });
    assert.equal(sessionTripped.tripped, true);
    assert.equal(sessionTripped.layer, 'session');

    // Layer 2: cross-run window attempts (5 within 10 min) -> records cooldown & blocks
    for (let i = 0; i < 5; i++) {
      recordLaunchAttempt(statePath, t0 + i * 10_000);
    }
    const stat = fs.statSync(statePath);
    if (process.platform !== 'win32') {
      assert.equal(stat.mode & 0o777, 0o600, 'launch-state.json must have 0600 permissions');
    }

    const loaded = readLaunchState(statePath);
    assert.equal(loaded.attempts.length, 5);
    assert.equal(typeof loaded.cooldownUntil, 'number');

    const cooldownTripped = evaluateCircuitBreaker({
      state: loaded,
      sessionAttempts: 0,
      nowMs: t0 + 60_000,
    });
    assert.equal(cooldownTripped.tripped, true);
    assert.equal(cooldownTripped.layer, 'cooldown');

    const planBlocked = await evaluateLaunchPlan({
      homeDir,
      statePath,
      nowFn: () => t0 + 60_000,
      execFileFn: async () => ({ stdout: '' }),
    });
    assert.equal(planBlocked.ok, false);
    assert.equal(planBlocked.action, 'blocked-circuit-breaker');

    // Symlink attack rejection on read and atomic write
    const evilTarget = path.join(homeDir, 'evil.json');
    fs.writeFileSync(evilTarget, '{"attempts":[]}', 'utf8');
    fs.unlinkSync(statePath);
    fs.symlinkSync(evilTarget, statePath);

    assert.throws(() => readLaunchState(statePath), /symlink/i);
    assert.throws(() => writeLaunchStateAtomic(statePath, { attempts: [] }), /symlink/i);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('SagKeepaliveController coordinates with SagWatchDaemon, exponential backoff, conservative default & controlled relaunch', async () => {
  const homeDir = makeTempHome();
  try {
    const statePath = path.join(homeDir, '.gemini', 'antigravity', 'agy-sag', 'launch-state.json');
    let activePort = null;
    const spawned = [];
    const events = [];
    const nowMs = Date.parse('Fri Nov 27 15:00:00 2026');

    const daemon = new SagWatchDaemon({
      intervalMs: 1000,
      maxBackoffMs: 4000,
      discoverPort: () => activePort,
      listTargets: async () => [
        {
          id: 'host-1',
          type: 'page',
          title: 'Antigravity',
          url: 'app://antigravity/index.html',
          webSocketDebuggerUrl: 'ws://127.0.0.1:9222/host-1',
        },
      ],
      buildInject: () => ({ codeHash: 'h1', expression: 'INJECT' }),
      evalTarget: async () => ({ ok: true, yielded: false, codeHash: 'h1' }),
    });

    // 1) Conservative mode (autoRelaunch=false): backs off via SagWatchDaemon and does NOT spawn
    const conservative = new SagKeepaliveController({
      homeDir,
      statePath,
      daemon,
      autoRelaunch: false,
      nowFn: () => nowMs,
      onEvent: (ev) => events.push(ev),
    });
    const r1 = await conservative.reconcileOnce();
    assert.equal(r1.status, 'waiting-cdp');
    assert.equal(r1.launchResult, null);
    assert.equal(r1.nextDelayMs, 1000);
    const r2 = await conservative.reconcileOnce();
    assert.equal(r2.nextDelayMs, 2000);
    assert.equal(spawned.length, 0);

    // 2) Auto-relaunch mode with maxSessionAttempts=2 when host is down -> relaunches twice then trips session circuit breaker
    const activeDaemon = new SagWatchDaemon({
      intervalMs: 1000,
      maxBackoffMs: 4000,
      discoverPort: () => activePort,
      listTargets: async () => [
        {
          id: 'host-1',
          type: 'page',
          title: 'Antigravity',
          url: 'app://antigravity/index.html',
          webSocketDebuggerUrl: 'ws://127.0.0.1:9222/host-1',
        },
      ],
      buildInject: () => ({ codeHash: 'h1', expression: 'INJECT' }),
      evalTarget: async () => ({ ok: true, yielded: false, codeHash: 'h1' }),
    });
    const controller = new SagKeepaliveController({
      platform: 'darwin',
      homeDir,
      statePath,
      port: 9222,
      daemon: activeDaemon,
      autoRelaunch: true,
      maxSessionAttempts: 2,
      nowFn: () => nowMs,
      execFileFn: async () => ({ stdout: '' }),
      spawnFn: (cmd, args) => {
        spawned.push({ cmd, args });
        return { pid: 5000 + spawned.length };
      },
      onEvent: (ev) => events.push(ev),
    });

    const a1 = await controller.reconcileOnce();
    assert.equal(a1.launchResult.executed, true);
    assert.equal(controller.sessionAttempts, 1);

    const a2 = await controller.reconcileOnce();
    assert.equal(a2.launchResult.executed, true);
    assert.equal(controller.sessionAttempts, 2);

    // 3rd disconnect hits session breaker limit (2/2)
    const a3 = await controller.reconcileOnce();
    assert.equal(a3.status, 'blocked');
    assert.equal(a3.launchResult.code, 'CIRCUIT_BREAKER_TRIPPED');
    assert.equal(a3.launchResult.circuitBreaker.layer, 'session');
    assert.equal(spawned.length, 2);

    // When CDP port comes online, keepalive returns healthy ok
    activePort = 9222;
    const healthy = await controller.reconcileOnce();
    assert.equal(healthy.status, 'ok');
    assert.equal(controller.disconnectCount, 0);

    controller.stop();
    assert.equal(activeDaemon.running, false);
    assert.ok(events.some((e) => e.event === 'keepalive-stopped'));
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('sag-cli routes launch --dry-run --json, keepalive --once --json, and help includes new commands', async () => {
  const homeDir = makeTempHome();
  try {
    const helpRes = await runSagCli(['help'], { stdout: () => {}, stderr: () => {} });
    assert.equal(helpRes.ok, true);
    assert.match(helpRes.data, /launch \[\.\.\.\]/);
    assert.match(helpRes.data, /keepalive \[\.\.\.\]/);

    const lines = [];
    const cliRes = await runSagCli(['launch', '--dry-run', '--json', '--port=9222'], {
      stdout: (s) => lines.push(s),
      stderr: () => {},
    });
    assert.equal(cliRes.exitCode, 0);
    const parsed = JSON.parse(lines.join('\n'));
    if (parsed.action === 'already-running-with-cdp') {
      assert.ok(Number.isInteger(parsed.port) && parsed.port > 0, 'already-running-with-cdp must report active CDP port');
      assert.equal(parsed.launchSpec?.port, 9222);
    } else {
      assert.equal(parsed.port, 9222);
    }
    assert.equal(typeof parsed.action, 'string');
    assert.equal(parsed.executed, false);

    // Isolated dry-run via runLaunchCli & runKeepaliveCli
    const statePath = path.join(homeDir, '.gemini', 'antigravity', 'agy-sag', 'launch-state.json');
    const outBuf = [];
    const launchRes = await runLaunchCli(['--dry-run', '--json', '--port=9444'], {
      platform: 'linux',
      homeDir,
      statePath,
      execFileFn: async () => ({ stdout: '' }),
      existsSyncFn: () => false,
      out: { stdout: (s) => outBuf.push(s), stderr: () => {} },
    });
    assert.equal(launchRes.ok, true);
    assert.equal(launchRes.dryRun, true);
    assert.equal(launchRes.executed, false);
    assert.equal(JSON.parse(outBuf.join('\n')).launchSpec.args[0], '--remote-debugging-port=9444');

    const kaBuf = [];
    const kaRes = await runKeepaliveCli(['--once', '--json', '--dry-run', '--port=9444'], {
      platform: 'linux',
      homeDir,
      statePath,
      discoverPort: () => null,
      out: { stdout: (s) => kaBuf.push(s), stderr: () => {} },
    });
    assert.equal(kaRes.status, 'waiting-cdp');
    assert.equal(JSON.parse(kaBuf.join('\n')).status, 'waiting-cdp');

    // --remote-debugging-port=0 resolves activePort from DevToolsActivePort
    const devToolsDir = path.join(homeDir, '.config', 'Antigravity');
    fs.mkdirSync(devToolsDir, { recursive: true });
    fs.writeFileSync(path.join(devToolsDir, 'DevToolsActivePort'), '51234\n/devtools/browser/abc\n', 'utf8');
    const zeroPortPlan = await evaluateLaunchPlan({
      platform: 'linux',
      homeDir,
      statePath,
      execFileFn: async () => ({
        stdout: '  801     1    00:10 Fri Nov 27 14:59:50 2026 /usr/share/antigravity/antigravity --remote-debugging-port=0',
      }),
    });
    assert.equal(zeroPortPlan.action, 'already-running-with-cdp');
    assert.equal(zeroPortPlan.activePort, 51234);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});
