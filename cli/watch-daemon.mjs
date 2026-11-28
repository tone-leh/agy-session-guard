#!/usr/bin/env node
/**
 * agy-Sag — Zero-ASAR Standalone Watch Daemon (Zero runtime npm deps)
 *
 * Continuously watches an existing localhost Antigravity CDP port and automatically
 * attaches agy-Sag to newly opened or reloaded Antigravity host windows.
 *
 * Safety rules:
 *   1. Never modifies app.asar or any application binary/bundle.
 *   2. Never restarts, spawns, or kills Antigravity.
 *   3. Adaptive backoff (default 3s active -> up to 30s steady-state / waiting-port) for near-zero idle overhead.
 *   4. Uses a lightweight probe on already-attached targets to detect Cmd+R reloads without re-evaluating the bundle.
 *   5. Honors host integrator ownership (window.__agSagOwner / legacy __agSessionGuardOwner) and never overrides yielded windows.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_FILES,
  EXT_PACK_LOCALES,
  buildInjectExpression,
  computeCoreHash,
  readExtendedPackFile,
  resolveInjectExtLocale,
} from './bundle.mjs';
import {
  buildConfigPatchFromOpts,
  discoverCdpPort,
  evalViaCdp,
  httpGetJson,
  isAntigravityHostTarget,
  isAntigravityHostUrl,
  isLoopbackWsUrl,
  validateHostLang,
  validatePresetName,
} from './cdp-attach.mjs';
import { isCliEntry } from './platform-utils.mjs';
import {
  computeNovFeedSignature,
  handleBridgePayload,
  readNovFeed,
  readNovOpsTemplates,
  readNovState,
} from './nov-bridge.mjs';
import { auditAntigravityStorage, readLocalTelemetrySnapshot, searchSanitizedSessions } from './storage-doctor.mjs';
import { TranslatorService } from './translator-service.mjs';

export const HOST_BRIDGE_BINDING_NAME = '__agSagHostBridge';
const MAX_EXECUTION_CONTEXTS = 1024;
const HOST_BRIDGE_HANDSHAKE_TIMEOUT_MS = 8000;
const STORAGE_AUDIT_CACHE_TTL_MS = 15_000;
const MAX_ZOMBIE_BRIDGE_BIND_FAILURES = 3;
const WATCH_DAEMON_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(WATCH_DAEMON_DIR, '..');
const CORE_SOURCES_DIR = path.join(DEFAULT_REPO_ROOT, 'packages', 'core');

export function serializeInlineJson(value) {
  return (JSON.stringify(value) ?? 'null').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function decodeWsMessageData(data) {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  return String(data ?? '');
}

/**
 * Read-only check for whether an Obsidian Prism background daemon is currently alive.
 * Helps agy-Sag coexist politely without prompting redundant restarts.
 */
export function parsePrismPidFileContent(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() || '';
  if (/^\d+$/.test(firstLine)) {
    const pid = Number(firstLine);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const pid = Number(parsed?.pid);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function isPrismDaemonActive(homeDir = os.homedir(), killFn = process.kill) {
  try {
    const pidFile = path.join(path.resolve(homeDir), '.gemini', 'config', 'plugins', 'obsidian-prism', '.daemon.pid');
    const st = fs.lstatSync(pidFile);
    if (st.isSymbolicLink() || !st.isFile()) return false;
    const raw = fs.readFileSync(pidFile, 'utf8');
    const pid = parsePrismPidFileContent(raw);
    if (!pid) return false;
    try {
      killFn(pid, 0);
      return true;
    } catch (err) {
      return err?.code === 'EPERM';
    }
  } catch {
    return false;
  }
}

/**
 * Lightweight persistent CDP session providing zero-port bidirectional communication
 * via main-context-scoped Runtime.addBinding('__agSagHostBridge') and Runtime.evaluate push/response callbacks.
 */
export class HostBridgeSession {
  constructor({
    targetId,
    wsUrl,
    WebSocketImpl = globalThis.WebSocket,
    handshakeTimeoutMs = HOST_BRIDGE_HANDSHAKE_TIMEOUT_MS,
    onPayload,
    onOpen = () => {},
    onReady = () => {},
    onClose = () => {},
    onEvent = () => {},
  }) {
    const rawTargetId = targetId !== undefined && targetId !== null ? String(targetId).trim() : '';
    this.pageTargetId = rawTargetId && !/^wss?:\/\//i.test(rawTargetId) ? rawTargetId : null;
    this.targetId = rawTargetId || String(wsUrl || '');
    this.wsUrl = wsUrl;
    this.WebSocketImpl = WebSocketImpl;
    this.handshakeTimeoutMs =
      Number.isFinite(Number(handshakeTimeoutMs)) && Number(handshakeTimeoutMs) > 0
        ? Math.floor(Number(handshakeTimeoutMs))
        : HOST_BRIDGE_HANDSHAKE_TIMEOUT_MS;
    this.onPayload = typeof onPayload === 'function' ? onPayload : () => ({ reqId: null, ok: false, error: 'No handler' });
    this.onOpen = typeof onOpen === 'function' ? onOpen : () => {};
    this.onReady = typeof onReady === 'function' ? onReady : () => {};
    this.onClose = typeof onClose === 'function' ? onClose : () => {};
    this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};

    this.ws = null;
    this.nextId = 1;
    this.ready = false;
    this.closed = false;
    this.mainFrameId = null;
    this.mainContextId = null;
    this._authoritativeMainFrameId = null;
    this._boundContextId = null;
    this._frameTreeReqId = null;
    this._frameTreeResolved = false;
    this._frameTreeSupported = true;
    this._executionContexts = new Map(); // ctxId -> { id, frameId, isDefault, type }
    this._handshakeTimer = null;
    this._lastNovStateSig = undefined;
    this._lastNovFeedSig = undefined;
    this._bindingFailureCount = 0;
    this._unreadyBindAttempts = 0;
  }

  _clearHandshakeTimer() {
    if (this._handshakeTimer !== null) {
      clearTimeout(this._handshakeTimer);
      this._handshakeTimer = null;
    }
  }

  _pruneExecutionContexts() {
    if (this._executionContexts.size <= MAX_EXECUTION_CONTEXTS) return;
    // Pass 1: evict non-default contexts first (workers/isolated worlds) to protect main-frame default context
    for (const [entryId, entry] of this._executionContexts) {
      if (this._executionContexts.size <= MAX_EXECUTION_CONTEXTS) break;
      if (entryId === this.mainContextId) continue;
      if (entry.isDefault === false) {
        this._executionContexts.delete(entryId);
      }
    }
    // Pass 2: evict contexts belonging to non-authoritative frames
    if (this._executionContexts.size > MAX_EXECUTION_CONTEXTS) {
      for (const [entryId, entry] of this._executionContexts) {
        if (this._executionContexts.size <= MAX_EXECUTION_CONTEXTS) break;
        if (entryId === this.mainContextId) continue;
        if (this._authoritativeMainFrameId && entry.frameId === this._authoritativeMainFrameId) continue;
        this._executionContexts.delete(entryId);
      }
    }
    // Pass 3: hard cap fallback
    if (this._executionContexts.size > MAX_EXECUTION_CONTEXTS) {
      for (const entryId of this._executionContexts.keys()) {
        if (this._executionContexts.size <= MAX_EXECUTION_CONTEXTS) break;
        if (entryId === this.mainContextId) continue;
        this._executionContexts.delete(entryId);
      }
    }
  }

  isOpen() {
    if (this.closed || !this.ws) return false;
    const openState = typeof this.ws.OPEN === 'number' ? this.ws.OPEN : 1;
    return this.ready && this.ws.readyState === openState;
  }

  isMainContextReady() {
    return (
      this.isOpen() &&
      this._frameTreeResolved &&
      Boolean(this._authoritativeMainFrameId) &&
      typeof this.mainContextId === 'number'
    );
  }

  _sendCdpWithId(method, params) {
    if (this.closed || !this.ws) return null;
    const openState = typeof this.ws.OPEN === 'number' ? this.ws.OPEN : 1;
    if (this.ws.readyState !== openState) return null;
    const id = this.nextId++;
    const msg = params === undefined ? { id, method } : { id, method, params };
    try {
      this.ws.send(JSON.stringify(msg));
      return id;
    } catch {
      return null;
    }
  }

  _sendCdp(method, params) {
    return this._sendCdpWithId(method, params) !== null;
  }

  _requestFrameTree() {
    const reqId = this._sendCdpWithId('Page.getFrameTree');
    if (reqId !== null) {
      this._frameTreeReqId = reqId;
      this._frameTreeResolved = false;
    }
    return reqId;
  }

  _findLatestDefaultContextForFrame(frameId) {
    if (!frameId) return null;
    let matched = null;
    for (const ctx of this._executionContexts.values()) {
      if (ctx.isDefault && ctx.frameId === frameId) {
        matched = ctx;
      }
    }
    return matched;
  }

  _bindMainContext(ctxId) {
    if (!this.isOpen() || typeof ctxId !== 'number') return false;
    const alreadyBound = this.mainContextId === ctxId && this._boundContextId === ctxId;
    this.mainContextId = ctxId;
    if (alreadyBound) return true;
    const sent = this._sendCdp('Runtime.addBinding', {
      name: HOST_BRIDGE_BINDING_NAME,
      executionContextId: ctxId,
    });
    if (!sent) return false;
    this._boundContextId = ctxId;
    this._bindingFailureCount = 0;
    this._unreadyBindAttempts = 0;
    this.onEvent('bridge-ready', {
      targetId: this.targetId,
      mainFrameId: this.mainFrameId,
      mainContextId: ctxId,
    });
    try {
      this.onReady(this);
    } catch {}
    return true;
  }

  _reconcileMainContext() {
    // Fail-closed: only bind after Page.getFrameTree authoritatively resolves top-level mainFrameId.
    if (this._frameTreeResolved && this._authoritativeMainFrameId) {
      this.mainFrameId = this._authoritativeMainFrameId;
      const matched = this._findLatestDefaultContextForFrame(this._authoritativeMainFrameId);
      if (matched) {
        return this._bindMainContext(matched.id);
      }
      this.mainContextId = null;
      this._boundContextId = null;
      return false;
    }

    this.mainContextId = null;
    this._boundContextId = null;
    return false;
  }

  ensureBinding() {
    if (!this.isOpen()) return false;
    if (!this._frameTreeResolved || !this._authoritativeMainFrameId || typeof this.mainContextId !== 'number') {
      if (this._frameTreeReqId === null && (!this._frameTreeResolved || !this._authoritativeMainFrameId)) {
        this._requestFrameTree();
      }
      return false;
    }
    const sent = this._sendCdp('Runtime.addBinding', {
      name: HOST_BRIDGE_BINDING_NAME,
      executionContextId: this.mainContextId,
    });
    if (sent) {
      this._boundContextId = this.mainContextId;
    }
    return sent;
  }

  open() {
    if (this.closed || this.ws || typeof this.WebSocketImpl !== 'function' || !this.wsUrl) return false;
    if (!isLoopbackWsUrl(this.wsUrl)) {
      this.closed = true;
      this.onEvent('bridge-error', {
        targetId: this.targetId,
        error: `Refusing non-loopback CDP WebSocket URL: ${this.wsUrl}`,
      });
      this.onClose(this);
      return false;
    }
    let ws;
    try {
      ws = new this.WebSocketImpl(this.wsUrl);
    } catch (err) {
      this.closed = true;
      this.onEvent('bridge-error', { targetId: this.targetId, error: err?.message || String(err) });
      this.onClose(this);
      return false;
    }
    this.ws = ws;

    const handleOpen = () => {
      this._clearHandshakeTimer();
      if (this.closed || this.ws !== ws) {
        try { ws.close(); } catch {}
        return;
      }
      this.ready = true;
      this._sendCdp('Page.enable');
      this._requestFrameTree();
      this._sendCdp('Runtime.enable');
      this.onEvent('bridge-open', { targetId: this.targetId });
      try {
        this.onOpen(this);
      } catch {}
    };

    const handleMessage = (ev) => {
      if (this.closed || this.ws !== ws) return;
      let msg;
      try {
        msg = JSON.parse(decodeWsMessageData(ev?.data));
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      // Response to Page.getFrameTree: authoritatively lock the top-level frame ID & verify host URL (fail-closed)
      if (this._frameTreeReqId !== null && msg.id === this._frameTreeReqId) {
        this._frameTreeReqId = null;
        const topFrame = msg.result?.frameTree?.frame || null;
        const topFrameId = typeof topFrame?.id === 'string' && topFrame.id ? topFrame.id : null;
        const topFrameUrl = typeof topFrame?.url === 'string' ? topFrame.url.trim() : '';
        const urlAllowed = !topFrameUrl || isAntigravityHostUrl(topFrameUrl);
        if (topFrameId && !msg.error && urlAllowed) {
          this._frameTreeResolved = true;
          this._frameTreeSupported = true;
          this._authoritativeMainFrameId = topFrameId;
          this.mainFrameId = topFrameId;
          this._reconcileMainContext();
        } else {
          // Fail-closed: never fall back to an unverified default context or non-host URL
          this._frameTreeResolved = false;
          this._frameTreeSupported = false;
          this._authoritativeMainFrameId = null;
          this.mainFrameId = null;
          this.mainContextId = null;
          this._boundContextId = null;
          this._bindingFailureCount += 1;
          this.onEvent('bridge-frame-tree-failed', {
            targetId: this.targetId,
            error: !urlAllowed
              ? `Disallowed top frame URL: ${topFrameUrl}`
              : msg.error?.message || 'Missing authoritative top frame id',
          });
        }
        return;
      }

      if (msg.method === 'Page.frameAttached') {
        const childId = typeof msg.params?.frameId === 'string' && msg.params.frameId ? msg.params.frameId : null;
        const parentId =
          typeof msg.params?.parentFrameId === 'string' && msg.params.parentFrameId ? msg.params.parentFrameId : null;
        if (childId && parentId) {
          if (this.mainFrameId === childId && this._authoritativeMainFrameId !== childId) {
            this.mainFrameId = null;
            this.mainContextId = null;
            this._boundContextId = null;
            this._reconcileMainContext();
          }
        }
        return;
      }

      if (msg.method === 'Page.frameNavigated') {
        const frame = msg.params?.frame;
        const frameId = typeof frame?.id === 'string' && frame.id ? frame.id : null;
        if (frameId) {
          if (frame.parentId) {
            if (this.mainFrameId === frameId && this._authoritativeMainFrameId !== frameId) {
              this.mainFrameId = null;
              this.mainContextId = null;
              this._boundContextId = null;
              this._reconcileMainContext();
            }
          } else if (this._frameTreeResolved) {
            const navUrl = typeof frame?.url === 'string' ? frame.url.trim() : '';
            if (navUrl && !isAntigravityHostUrl(navUrl)) {
              this._frameTreeResolved = false;
              this._authoritativeMainFrameId = null;
              this.mainFrameId = null;
              this.mainContextId = null;
              this._boundContextId = null;
              return;
            }
            this._authoritativeMainFrameId = frameId;
            this.mainFrameId = frameId;
            this._reconcileMainContext();
          } else if (this.isOpen() && this._frameTreeReqId === null) {
            this._requestFrameTree();
          }
        }
        return;
      }

      if (msg.method === 'Runtime.executionContextCreated') {
        const ctx = msg.params?.context;
        if (ctx && typeof ctx.id === 'number') {
          const aux = ctx.auxData && typeof ctx.auxData === 'object' ? ctx.auxData : {};
          const type = typeof aux.type === 'string' ? aux.type : null;
          const isDefault = aux.isDefault === true && (type === null || type === 'default');
          const frameId = typeof aux.frameId === 'string' && aux.frameId ? aux.frameId : null;
          this._executionContexts.set(ctx.id, {
            id: ctx.id,
            frameId,
            isDefault,
            type,
          });
          this._pruneExecutionContexts();
          if (isDefault) {
            this._reconcileMainContext();
          }
        }
        return;
      }

      if (msg.method === 'Runtime.executionContextDestroyed') {
        const destroyedId = msg.params?.executionContextId;
        if (typeof destroyedId === 'number') {
          this._executionContexts.delete(destroyedId);
          if (destroyedId === this.mainContextId) {
            this.mainContextId = null;
            if (this._boundContextId === destroyedId) {
              this._boundContextId = null;
            }
            this._reconcileMainContext();
          }
        }
        return;
      }

      if (msg.method === 'Runtime.executionContextsCleared') {
        this._executionContexts.clear();
        this._frameTreeResolved = false;
        this._authoritativeMainFrameId = null;
        this.mainFrameId = null;
        this.mainContextId = null;
        this._boundContextId = null;
        if (this.isOpen()) {
          this._requestFrameTree();
        }
        return;
      }

      if (msg.method === 'Runtime.bindingCalled') {
        const params = msg.params || {};
        if (params.name !== HOST_BRIDGE_BINDING_NAME) return;
        // Fail-closed: never dispatch until Page.getFrameTree has resolved and mainContextId strictly matches
        if (!this._frameTreeResolved || this.mainContextId === null) {
          this.onEvent('bridge-ignored', {
            targetId: this.targetId,
            reason: 'main-context-unready',
            executionContextId: typeof params.executionContextId === 'number' ? params.executionContextId : null,
          });
          return;
        }
        if (typeof params.executionContextId !== 'number' || params.executionContextId !== this.mainContextId) {
          this.onEvent('bridge-ignored', {
            targetId: this.targetId,
            reason: 'non-main-context',
            executionContextId: typeof params.executionContextId === 'number' ? params.executionContextId : null,
            expectedContextId: this.mainContextId,
          });
          return;
        }
        void this._dispatchBindingCall(params.payload, this.mainContextId);
      }
    };

    const handleCloseOrError = (kind, err) => {
      if (this.ws !== ws) return;
      this._clearHandshakeTimer();
      const wasClosed = this.closed;
      this.ready = false;
      this.closed = true;
      this.ws = null;
      this.mainContextId = null;
      this._boundContextId = null;
      this._frameTreeReqId = null;
      this._executionContexts.clear();
      if (kind === 'error') {
        this.onEvent('bridge-error', {
          targetId: this.targetId,
          error: err?.message || (typeof err === 'string' ? err : 'WebSocket error'),
        });
      }
      if (!wasClosed) {
        try { ws.close?.(); } catch {}
        this.onEvent('bridge-closed', { targetId: this.targetId });
        this.onClose(this);
      }
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('close', () => handleCloseOrError('close'));
    ws.addEventListener('error', (err) => handleCloseOrError('error', err));

    this._clearHandshakeTimer();
    this._handshakeTimer = setTimeout(() => {
      this._handshakeTimer = null;
      if (this.closed || this.ready || this.ws !== ws) return;
      handleCloseOrError('error', new Error(`CDP WebSocket handshake timeout (${this.handshakeTimeoutMs}ms)`));
    }, this.handshakeTimeoutMs);
    this._handshakeTimer?.unref?.();
    return true;
  }

  async _dispatchBindingCall(rawPayload, callContextId = this.mainContextId) {
    if (!this._frameTreeResolved || typeof callContextId !== 'number' || this.mainContextId !== callContextId) {
      return;
    }
    let response;
    try {
      response = await this.onPayload(rawPayload, { targetId: this.targetId });
    } catch (err) {
      response = { reqId: null, ok: false, error: err?.message || String(err) };
    }
    if (!this._frameTreeResolved || this.mainContextId !== callContextId) return;
    this.sendResponse(response);
  }

  evaluate(expression, { silent = true } = {}) {
    if (!this.isOpen()) return false;
    const params = { expression: String(expression), silent: Boolean(silent) };
    if (typeof this.mainContextId === 'number') {
      params.contextId = this.mainContextId;
    }
    return this._sendCdp('Runtime.evaluate', params);
  }

  sendResponse(response) {
    if (!this.isMainContextReady()) return false;
    const serialized = serializeInlineJson(response);
    const expression = `(() => { try { window.__agSagBridgeReceiver?.onResponse?.(${serialized}); } catch {} })()`;
    return this.evaluate(expression, { silent: true });
  }

  push(eventName, data = {}) {
    if (!this.isMainContextReady()) return false;
    const payload = { event: String(eventName || ''), ...data };
    const serialized = serializeInlineJson(payload);
    const expression = `(() => { try { window.__agSagBridgeReceiver?.onPush?.(${serialized}); } catch {} })()`;
    return this.evaluate(expression, { silent: true });
  }

  close() {
    this._clearHandshakeTimer();
    if (this.closed && !this.ws) return;
    const ws = this.ws;
    this.closed = true;
    this.ready = false;
    this.ws = null;
    this.mainContextId = null;
    this._boundContextId = null;
    this._frameTreeReqId = null;
    this._executionContexts.clear();
    if (ws) {
      try { ws.close?.(); } catch {}
    }
  }
}

export const PROBE_EXPRESSION = `(() => {
  const owner = window.__agSagOwner || window.__agSessionGuardOwner;
  let locale = '';
  try {
    const rawCfg = localStorage.getItem('agSag.config.v1') || localStorage.getItem('agSessionGuard.config.v1');
    if (rawCfg) {
      const parsed = JSON.parse(rawCfg);
      if (parsed && typeof parsed.hostI18nLocale === 'string') locale = parsed.hostI18nLocale;
    }
  } catch {}
  if (!locale || locale === 'auto') {
    locale = document.documentElement?.getAttribute?.('data-ag-cs-lang') || navigator.language || 'en';
  }
  if (owner && owner !== 'standalone') return { state: 'yielded', owner, locale };
  if (window.__agSagManuallyRemoved) return { state: 'removed-by-user', locale };
  const api = window.__agSag || window.__agSessionGuard;
  if (api && !api.getDebugState?.()?.destroyed) {
    return { state: 'mounted', codeHash: api.__agSgHash || '', locale };
  }
  return { state: 'missing', locale };
})()`;

export function parseWatchArgs(argv) {
  const opts = {
    port: null,
    threshold: null,
    mode: null,
    intervalMs: 3000,
    maxBackoffMs: 30000,
    once: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--once') opts.once = true;
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
    }
  }
  if (opts.maxBackoffMs < opts.intervalMs) {
    opts.maxBackoffMs = opts.intervalMs;
  }
  return opts;
}

export class SagWatchDaemon {
  constructor(options = {}) {
    this.explicitPort = options.port ?? null;
    this.config = options.config && Object.keys(options.config).length ? options.config : null;
    this.intervalMs = Math.max(500, Number(options.intervalMs) || 3000);
    this.maxBackoffMs = Math.max(this.intervalMs, Number(options.maxBackoffMs) || 30000);
    this.discoverPort = options.discoverPort || ((p) => discoverCdpPort(p));
    this.listTargets = options.listTargets || ((port) => httpGetJson(`http://127.0.0.1:${port}/json/list`));
    const hasCustomEval = typeof options.evalTarget === 'function';
    this.evalTarget = options.evalTarget || ((wsUrl, expr) => evalViaCdp(wsUrl, expr));
    this.WebSocketImpl = options.WebSocketImpl || globalThis.WebSocket;
    this.enableHostBridge =
      typeof options.enableHostBridge === 'boolean'
        ? options.enableHostBridge
        : !hasCustomEval && typeof this.WebSocketImpl === 'function';
    this.deferExtPack = typeof options.deferExtPack === 'boolean' ? options.deferExtPack : this.enableHostBridge;
    this.storageDataDir = options.storageDataDir || undefined;
    this.translatorService = options.translatorService || new TranslatorService(options.translatorOpts || {});
    this._defaultInjectCache = new Map();
    this._storageAuditCache = new Map();
    this._novConfigStatCache = null;
    this.extPacksRepoRoot = options.extPacksRepoRoot || undefined;
    this.buildInject =
      options.buildInject ||
      (({ extLocale = null } = {}) => {
        const deferFlag = Boolean(this.deferExtPack);
        const rawLocale = deferFlag ? '' : String(extLocale || this.config?.hostI18nLocale || '');
        const normalizedLocale = deferFlag ? '' : (resolveInjectExtLocale(rawLocale) || '');
        const cfgKey = JSON.stringify(this.config ?? null);
        const srcSig = this._computeInjectSourceSignature(normalizedLocale);
        const cacheKey = `${deferFlag ? '1' : '0'}|${normalizedLocale}|${cfgKey}|${srcSig}`;
        const cached = this._defaultInjectCache.get(cacheKey);
        if (cached) return cached;
        const expression = buildInjectExpression(this.config, {
          source: 'standalone',
          extLocale: normalizedLocale || null,
          deferExtPack: deferFlag,
          respectManualRemove: true,
        });
        const hashMatch = expression.match(/const targetHash = "([a-f0-9]+)";/);
        const codeHash = hashMatch ? hashMatch[1] : computeCoreHash();
        const built = { codeHash, expression };
        if (this._defaultInjectCache.size >= 16) {
          const oldestKey = this._defaultInjectCache.keys().next().value;
          if (oldestKey !== undefined) this._defaultInjectCache.delete(oldestKey);
        }
        this._defaultInjectCache.set(cacheKey, built);
        return built;
      });
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
    this.now = options.now || (() => Date.now());
    this.setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer || ((t) => clearTimeout(t));
    this.novBridgeOpts = options.novBridgeOpts || {};
    this.createBridgeSession = typeof options.createBridgeSession === 'function' ? options.createBridgeSession : null;

    this.running = false;
    this._stopped = false;
    this.timer = null;
    this.currentDelayMs = this.intervalMs;
    this.lastPort = null;
    this.cycleCount = 0;
    this.attachedTargets = new Map(); // targetKey -> { codeHash, url, wsUrl, status, updatedAt }
    this.bridgeSessions = new Map(); // targetKey -> HostBridgeSession
    this.lastNovSignature = null;
    this._novSignatureInitialized = false;
    this.lastNovFeedSignature = null;
    this._novFeedSignatureInitialized = false;
  }

  emit(type, data = {}) {
    try {
      this.onEvent({ ts: new Date(this.now()).toISOString(), event: type, ...data });
    } catch {}
  }

  _bumpBackoff(factor = 1.5) {
    this.currentDelayMs = Math.min(this.maxBackoffMs, Math.round(this.currentDelayMs * factor));
    return this.currentDelayMs;
  }

  _resetBackoff() {
    this.currentDelayMs = this.intervalMs;
    return this.currentDelayMs;
  }

  _computeInjectSourceSignature(normalizedExtLocale = '') {
    const parts = [];
    for (const file of CORE_FILES) {
      try {
        const st = fs.statSync(path.join(CORE_SOURCES_DIR, file));
        parts.push(`${st.mtimeMs}:${st.size}`);
      } catch {
        parts.push('missing');
      }
    }
    if (normalizedExtLocale && EXT_PACK_LOCALES.includes(normalizedExtLocale)) {
      const repoRoot = this.extPacksRepoRoot ? path.resolve(this.extPacksRepoRoot) : DEFAULT_REPO_ROOT;
      const extPath = path.join(repoRoot, 'packages', 'core', 'locales', 'ext', `${normalizedExtLocale}.json`);
      try {
        const st = fs.statSync(extPath);
        parts.push(`ext:${st.mtimeMs}:${st.size}`);
      } catch {
        parts.push('ext:missing');
      }
    }
    return parts.join(',');
  }

  _statNovConfigFast(configPath, pluginDir) {
    let cfgSig = 'missing';
    if (configPath) {
      try {
        const st = fs.statSync(configPath);
        if (st.isFile()) cfgSig = `${st.ino}:${st.mtimeMs}:${st.size}`;
      } catch {}
    }
    let pluginSig = 'none';
    if (pluginDir) {
      try {
        const st = fs.statSync(pluginDir);
        if (st.isDirectory()) pluginSig = `${st.ino}:${st.mtimeMs}`;
      } catch {}
    }
    return `${cfgSig}|${pluginSig}`;
  }

  _readNovStateWithStatFastPath({ forceRead = false } = {}) {
    const cached = this._novConfigStatCache;
    if (!forceRead && cached && cached.configPath && cached.statSig && !cached.statSig.startsWith('missing|')) {
      const curStatSig = this._statNovConfigFast(cached.configPath, cached.pluginDir);
      if (curStatSig === cached.statSig) {
        return cached.state;
      }
    }
    const state = readNovState(this.novBridgeOpts);
    const configPath = state?.configPath || null;
    const pluginDir = state?.pluginDir || null;
    this._novConfigStatCache = {
      configPath,
      pluginDir,
      statSig: this._statNovConfigFast(configPath, pluginDir),
      state,
    };
    return state;
  }

  _computeNovSignature(state) {
    if (!state) return 'none';
    return `${state.installed ? '1' : '0'}:${state.version || ''}:${state.configPath || ''}:${state.signature || 'none'}`;
  }

  _isSessionReady(session) {
    if (!session) return false;
    return typeof session.isMainContextReady === 'function'
      ? session.isMainContextReady()
      : Boolean(session.isOpen?.());
  }

  _pushInitialNovState(session, key) {
    if (this._stopped || !this.enableHostBridge || !session) return false;
    if (this.bridgeSessions.get(key) !== session) return false;
    let state;
    try {
      state = this._readNovStateWithStatFastPath({ forceRead: true });
    } catch {
      return false;
    }
    const sig = this._computeNovSignature(state);
    if (session.push?.('nov:state', { state })) {
      session._lastNovStateSig = sig;
      this.lastNovSignature = sig;
      this._novSignatureInitialized = true;
      this.emit('nov-state-pushed', {
        signature: state.signature,
        preset: state.config?.preset || null,
        targets: 1,
        reason: 'initial',
      });
      try {
        const feedSig = computeNovFeedSignature(this.novBridgeOpts);
        if (session._lastNovFeedSig === undefined) {
          session._lastNovFeedSig = feedSig;
        }
        this.lastNovFeedSignature = feedSig;
        this._novFeedSignatureInitialized = true;
      } catch {}
      return true;
    }
    return false;
  }

  _handleHostBridgePayload(rawPayload, meta = {}) {
    if (this._stopped) {
      return { reqId: null, ok: false, error: 'Watch daemon is stopped' };
    }
    // Check extended pack request first (strict allowlist, zero path traversal, max 64KB payload)
    if (typeof rawPayload === 'string' && rawPayload.length <= 65536 && Buffer.byteLength(rawPayload, 'utf8') <= 65536) {
      try {
        const parsed = JSON.parse(rawPayload);
        if (parsed && typeof parsed === 'object' && parsed.type === 'sag:ext_pack') {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          const loc = parsed.payload && typeof parsed.payload.locale === 'string' ? parsed.payload.locale : '';
          if (!EXT_PACK_LOCALES.includes(loc)) {
            return { reqId, ok: false, error: 'Unsupported or invalid extended pack locale' };
          }
          const pack = readExtendedPackFile(loc, this.extPacksRepoRoot);
          if (!pack) {
            return { reqId, ok: false, error: `Extended pack not found for locale: ${loc}` };
          }
          return { reqId, ok: true, data: { locale: loc, pack } };
        }
        if (parsed && typeof parsed === 'object' && parsed.type === 'sag:nov_templates') {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          const tplRes = readNovOpsTemplates(this.novBridgeOpts);
          if (!tplRes.ok) {
            return { reqId, ok: false, error: tplRes.error || 'Failed to read agy-NOV templates' };
          }
          return { reqId, ok: true, data: { available: tplRes.available, templates: tplRes.templates } };
        }
        if (parsed && typeof parsed === 'object' && parsed.type === 'sag:nov_feed') {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          const feedRes = readNovFeed(this.novBridgeOpts);
          if (!feedRes.ok) {
            return { reqId, ok: false, error: (feedRes.errors || ['Failed to read agy-NOV feed']).join('; ') };
          }
          return { reqId, ok: true, data: { available: feedRes.available, feed: feedRes.feed } };
        }
        if (parsed && typeof parsed === 'object' && parsed.type === 'sag:search_sessions') {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          try {
            const q = String(parsed.payload?.query || '').trim().slice(0, 120);
            const rawLimit = Number(parsed.payload?.limit);
            const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(20, Math.floor(rawLimit))) : 20;
            const res = searchSanitizedSessions({
              ...(this.storageDataDir ? { dataDir: this.storageDataDir } : {}),
              query: q,
              limit,
            });
            return { reqId, ok: true, data: res };
          } catch {
            return { reqId, ok: false, error: 'Session search failed' };
          }
        }
        if (parsed && typeof parsed === 'object' && parsed.type === 'sag:storage_audit') {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          try {
            const cacheKey = this.storageDataDir ? path.resolve(this.storageDataDir) : '__default__';
            const nowMs = this.now();
            const cached = this._storageAuditCache.get(cacheKey);
            if (cached && cached.expiresAt > nowMs) {
              return { reqId, ok: true, data: cached.data };
            }
            const rep = auditAntigravityStorage({
              ...(this.storageDataDir ? { dataDir: this.storageDataDir } : {}),
              topN: 5,
            });
            const data = {
              exists: Boolean(rep?.exists),
              totalBytes: Number(rep?.totalBytes) || 0,
              totalFiles: Number(rep?.totalFiles) || 0,
              brainSessionCount: Number(rep?.brain?.sessionCount) || 0,
              brainBytes: Number(rep?.brain?.totalBytes) || 0,
              conversationCount: Number(rep?.conversations?.fileCount) || 0,
              conversationBytes: Number(rep?.conversations?.totalBytes) || 0,
              walActive: Boolean(rep?.sqlite?.walActive),
              orphanCount: Array.isArray(rep?.orphans) ? rep.orphans.length : 0,
              corruptCount: Array.isArray(rep?.corruptFiles) ? rep.corruptFiles.length : 0,
              warningCount: Array.isArray(rep?.warnings) ? rep.warnings.length : 0,
            };
            if (this._storageAuditCache.size >= 8) {
              const oldestKey = this._storageAuditCache.keys().next().value;
              if (oldestKey !== undefined) this._storageAuditCache.delete(oldestKey);
            }
            this._storageAuditCache.set(cacheKey, {
              expiresAt: nowMs + STORAGE_AUDIT_CACHE_TTL_MS,
              data,
            });
            return { reqId, ok: true, data };
          } catch {
            return { reqId, ok: false, error: 'Storage audit failed' };
          }
        }
        if (parsed && typeof parsed === 'object' && parsed.type === 'sag:telemetry_snapshot') {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          try {
            const cascadeId = typeof parsed.payload?.cascadeId === 'string' ? parsed.payload.cascadeId.slice(0, 128) : '';
            const snap = readLocalTelemetrySnapshot({
              ...(this.storageDataDir ? { dataDir: this.storageDataDir } : {}),
              cascadeId,
              ...(this.novBridgeOpts?.dataDir ? { novDataDir: this.novBridgeOpts.dataDir } : {}),
            });
            return { reqId, ok: true, data: snap };
          } catch {
            return { reqId, ok: false, error: 'Telemetry snapshot failed' };
          }
        }
        if (
          parsed &&
          typeof parsed === 'object' &&
          (parsed.type === 'sag:translate_status' ||
            parsed.type === 'sag:translate_save_provider' ||
            parsed.type === 'sag:translate_save_config' ||
            parsed.type === 'sag:translate_text' ||
            parsed.type === 'sag:translate_batch_titles' ||
            parsed.type === 'sag:translate_diagnose' ||
            parsed.type === 'sag:translate_cache_stats' ||
            parsed.type === 'sag:translate_clear_cache' ||
            parsed.type === 'sag:translate_profiles' ||
            parsed.type === 'sag:translate_save_profile' ||
            parsed.type === 'sag:translate_delete_profile' ||
            parsed.type === 'sag:translate_set_active_profile')
        ) {
          const reqId = typeof parsed.reqId === 'string' && parsed.reqId.length <= 128 ? parsed.reqId : null;
          const payload = parsed.payload || {};
          const streamRequestId = typeof payload.requestId === 'string' ? payload.requestId.slice(0, 128) : '';
          const session = meta?.targetId ? this.bridgeSessions.get(meta.targetId) : null;
          const streamOpts =
            parsed.type === 'sag:translate_text' && streamRequestId && session?.push
              ? {
                  onChunk: ({ partial }) => {
                    try {
                      session.push('translate:chunk', { requestId: streamRequestId, partial });
                    } catch {}
                  },
                }
              : undefined;
          return Promise.resolve(this.translatorService.handleBridgeRequest(parsed.type, payload, streamOpts))
            .then((res) => ({ reqId, ...(res || { ok: false, error: 'Translator service error' }) }))
            .catch((err) => ({ reqId, ok: false, error: err?.message || 'Translator service error' }));
        }
      } catch {}
    }
    // Delegate size check (64KB) and JSON parsing exclusively to handleBridgePayload
    const res = handleBridgePayload(rawPayload, this.novBridgeOpts);
    if (res.ok && res._meta?.mutated && res.data) {
      this._novConfigStatCache = {
        configPath: res.data.configPath || null,
        pluginDir: res.data.pluginDir || null,
        statSig: this._statNovConfigFast(res.data.configPath || null, res.data.pluginDir || null),
        state: res.data,
      };
      const nextSig = this._computeNovSignature(res.data);
      this.lastNovSignature = nextSig;
      this._novSignatureInitialized = true;
      let peersPushed = 0;
      for (const [key, session] of this.bridgeSessions.entries()) {
        if (key === meta.targetId || session?.targetId === meta.targetId) {
          if (session) session._lastNovStateSig = nextSig;
          continue;
        }
        if (session?.push?.('nov:state', { state: res.data })) {
          session._lastNovStateSig = nextSig;
          peersPushed += 1;
        }
      }
      if (peersPushed > 0) {
        this.emit('nov-state-pushed', {
          signature: res.data.signature,
          preset: res.data.config?.preset || null,
          targets: peersPushed,
        });
      }
    }
    return res;
  }

  _ensureBridgeSession(key, wsUrl, reInjected = false, pageId = null) {
    if (this._stopped || !this.enableHostBridge || !wsUrl) return null;
    const existing = this.bridgeSessions.get(key);
    if (existing && !existing.closed && existing.wsUrl === wsUrl) {
      const isReady = this._isSessionReady(existing);
      const isOpen = Boolean(existing.isOpen?.());
      if (reInjected) {
        existing.ensureBinding?.();
        if (isReady) {
          existing._unreadyBindAttempts = 0;
          this._pushInitialNovState(existing, key);
        }
        return existing;
      }
      if (isOpen && !isReady) {
        const failCount = (existing._unreadyBindAttempts || 0) + (existing._bindingFailureCount || 0);
        if (failCount >= MAX_ZOMBIE_BRIDGE_BIND_FAILURES) {
          try { existing.close?.(); } catch {}
          this.bridgeSessions.delete(key);
        } else {
          const hasInFlightFrameTree = existing._frameTreeReqId !== null && existing._frameTreeReqId !== undefined;
          if (!hasInFlightFrameTree) {
            existing._unreadyBindAttempts = (existing._unreadyBindAttempts || 0) + 1;
            existing.ensureBinding?.();
          }
          return existing;
        }
      } else {
        if (isReady) existing._unreadyBindAttempts = 0;
        return existing;
      }
    }
    if (existing) {
      try { existing.close?.(); } catch {}
      this.bridgeSessions.delete(key);
    }

    const sessionArgs = {
      targetId: pageId || key,
      wsUrl,
      WebSocketImpl: this.WebSocketImpl,
      onPayload: (rawPayload, meta) => this._handleHostBridgePayload(rawPayload, meta),
      onReady: (sess) => {
        this._pushInitialNovState(sess, key);
      },
      onClose: (sess) => {
        if (this.bridgeSessions.get(key) === sess) {
          this.bridgeSessions.delete(key);
        }
      },
      onEvent: (eventName, data) => this.emit(eventName, data),
    };

    const session = this.createBridgeSession
      ? this.createBridgeSession(sessionArgs)
      : new HostBridgeSession(sessionArgs);
    this.bridgeSessions.set(key, session);
    session.open?.();
    if (this._stopped) {
      this._closeBridgeSession(key);
      return null;
    }
    return session;
  }

  _closeBridgeSession(key) {
    const existing = this.bridgeSessions.get(key);
    if (!existing) return;
    this.bridgeSessions.delete(key);
    try { existing.close?.(); } catch {}
  }

  _closeAllBridgeSessions() {
    for (const [key, session] of [...this.bridgeSessions.entries()]) {
      this.bridgeSessions.delete(key);
      try { session.close?.(); } catch {}
    }
  }

  syncNovStateToBridges({ forcePush = false } = {}) {
    if (this._stopped || !this.enableHostBridge || this.bridgeSessions.size === 0) {
      return { pushed: 0, changed: false };
    }
    let state;
    try {
      state = this._readNovStateWithStatFastPath({ forceRead: Boolean(forcePush) });
    } catch {
      return { pushed: 0, changed: false };
    }
    const sig = this._computeNovSignature(state);
    const sessions = [...this.bridgeSessions.values()];
    const readySessions = sessions.filter((s) => this._isSessionReady(s));
    if (!forcePush && readySessions.length === 0) {
      return { pushed: 0, changed: false, signature: sig };
    }

    if (!this._novSignatureInitialized) {
      this.lastNovSignature = sig;
      this._novSignatureInitialized = true;
      if (!forcePush) {
        for (const s of readySessions) {
          if (s._lastNovStateSig === undefined) s._lastNovStateSig = sig;
        }
        return { pushed: 0, changed: false, signature: sig };
      }
    }

    const targetsToPush = forcePush
      ? sessions
      : readySessions.filter((s) => s._lastNovStateSig !== sig);

    if (targetsToPush.length === 0) {
      this.lastNovSignature = sig;
      return { pushed: 0, changed: false, signature: sig };
    }

    let pushed = 0;
    for (const session of targetsToPush) {
      if (session?.push?.('nov:state', { state })) {
        session._lastNovStateSig = sig;
        pushed += 1;
      }
    }
    if (pushed > 0 || forcePush) {
      this.lastNovSignature = sig;
    }
    if (pushed > 0) {
      this.emit('nov-state-pushed', {
        signature: state.signature,
        preset: state.config?.preset || null,
        targets: pushed,
      });
    }
    return { pushed, changed: pushed > 0 || forcePush, signature: sig, state };
  }

  syncNovFeedToBridges({ forcePush = false } = {}) {
    if (this._stopped || !this.enableHostBridge || this.bridgeSessions.size === 0) {
      return { pushed: 0, changed: false };
    }
    let sig;
    try {
      sig = computeNovFeedSignature(this.novBridgeOpts);
    } catch {
      return { pushed: 0, changed: false };
    }
    const sessions = [...this.bridgeSessions.values()];
    const readySessions = sessions.filter((s) => this._isSessionReady(s));
    if (!forcePush && readySessions.length === 0) {
      return { pushed: 0, changed: false, signature: sig };
    }

    if (!this._novFeedSignatureInitialized) {
      this.lastNovFeedSignature = sig;
      this._novFeedSignatureInitialized = true;
      if (!forcePush) {
        for (const s of readySessions) {
          if (s._lastNovFeedSig === undefined) s._lastNovFeedSig = sig;
        }
        return { pushed: 0, changed: false, signature: sig };
      }
    }

    const targetsToPush = forcePush
      ? sessions
      : readySessions.filter((s) => s._lastNovFeedSig !== sig);

    if (targetsToPush.length === 0) {
      this.lastNovFeedSignature = sig;
      return { pushed: 0, changed: false, signature: sig };
    }

    let feedRes;
    try {
      feedRes = readNovFeed(this.novBridgeOpts);
    } catch {
      return { pushed: 0, changed: false, signature: sig };
    }
    if (!feedRes || !feedRes.ok) {
      return { pushed: 0, changed: false, signature: sig, error: feedRes?.errors?.join('; ') || 'Invalid feed' };
    }

    let pushed = 0;
    for (const session of targetsToPush) {
      if (session?.push?.('nov:feed', { feed: feedRes.feed })) {
        session._lastNovFeedSig = sig;
        pushed += 1;
      }
    }
    if (pushed > 0 || forcePush) {
      this.lastNovFeedSignature = sig;
    }
    if (pushed > 0) {
      this.emit('nov-feed-pushed', {
        signature: sig,
        writeLockActive: Boolean(feedRes.feed?.spec?.writeLockActive),
        targets: pushed,
      });
    }
    return { pushed, changed: pushed > 0 || forcePush, signature: sig, feed: feedRes.feed };
  }

  async reconcileOnce() {
    if (this._stopped) {
      return {
        status: 'stopped',
        port: null,
        attached: 0,
        reused: 0,
        yielded: 0,
        errors: 0,
        nextDelayMs: this.currentDelayMs,
      };
    }
    this.cycleCount += 1;
    const port = this.discoverPort(this.explicitPort);
    if (!port) {
      this.attachedTargets.clear();
      this._closeAllBridgeSessions();
      this.lastPort = null;
      const nextDelayMs = this.cycleCount === 1 ? this.currentDelayMs : this._bumpBackoff(2);
      const out = { status: 'no-port', port: null, attached: 0, reused: 0, yielded: 0, errors: 0, nextDelayMs };
      this.emit('waiting-port', out);
      return out;
    }

    let targets;
    try {
      targets = await this.listTargets(port);
    } catch (err) {
      if (this._stopped) {
        this._closeAllBridgeSessions();
        return {
          status: 'stopped',
          port,
          attached: 0,
          reused: 0,
          yielded: 0,
          errors: 0,
          nextDelayMs: this.currentDelayMs,
        };
      }
      this.attachedTargets.clear();
      this._closeAllBridgeSessions();
      this.lastPort = null;
      const nextDelayMs = this._bumpBackoff(2);
      const out = {
        status: 'unreachable',
        port,
        error: err?.message || String(err),
        attached: 0,
        reused: 0,
        yielded: 0,
        errors: 1,
        nextDelayMs,
      };
      this.emit('port-unreachable', out);
      return out;
    }

    if (this._stopped) {
      this._closeAllBridgeSessions();
      return {
        status: 'stopped',
        port,
        attached: 0,
        reused: 0,
        yielded: 0,
        errors: 0,
        nextDelayMs: this.currentDelayMs,
      };
    }

    const portChanged = this.lastPort !== null && this.lastPort !== port;
    if (portChanged) {
      this.attachedTargets.clear();
      this._closeAllBridgeSessions();
    }
    this.lastPort = port;

    const hostPages = (Array.isArray(targets) ? targets : []).filter((t) => isAntigravityHostTarget(t, { expectedPort: port }));
    const activeKeys = new Set();
    let changed = portChanged;
    let attached = 0;
    let reused = 0;
    let yielded = 0;
    let errors = 0;

    // Lazy-build inject bundle only if at least one target needs full injection
    const bundleCache = new Map();
    const getBundle = (extLocale = null) => {
      const cacheKey = String(extLocale || '');
      if (!bundleCache.has(cacheKey)) {
        bundleCache.set(cacheKey, this.buildInject(extLocale ? { extLocale } : undefined));
      }
      return bundleCache.get(cacheKey);
    };

    for (const page of hostPages) {
      if (this._stopped) break;
      const key = String(page.id || page.webSocketDebuggerUrl);
      activeKeys.add(key);
      const prev = this.attachedTargets.get(key);
      let probedLocale = null;

      try {
        let needsReinject = false;
        if (prev && prev.wsUrl === page.webSocketDebuggerUrl && prev.url === page.url) {
          const probe = await this.evalTarget(page.webSocketDebuggerUrl, PROBE_EXPRESSION);
          if (this._stopped) break;
          if (probe?.locale && typeof probe.locale === 'string') probedLocale = probe.locale;
          if (probe?.state === 'yielded' || probe?.state === 'removed-by-user') {
            yielded += 1;
            prev.status = probe.state === 'removed-by-user' ? 'removed-by-user' : 'yielded';
            prev.updatedAt = this.now();
            this._closeBridgeSession(key);
            continue;
          }
          if (probe?.state === 'mounted' && probe.codeHash && probe.codeHash === prev.codeHash) {
            reused += 1;
            prev.updatedAt = this.now();
            this._ensureBridgeSession(key, page.webSocketDebuggerUrl, false, page.id || null);
            continue;
          }
          // Window reloaded or agy-Sag was cleared -> re-inject cleanly below
          needsReinject = true;
        }

        const bundle = getBundle(probedLocale);
        const res = await this.evalTarget(page.webSocketDebuggerUrl, bundle.expression);
        if (this._stopped) break;
        if (res?.yielded) {
          yielded += 1;
          const nextStatus = res.removedByUser ? 'removed-by-user' : 'yielded';
          if (
            !prev ||
            prev.status !== nextStatus ||
            prev.wsUrl !== page.webSocketDebuggerUrl ||
            prev.url !== page.url
          ) {
            changed = true;
          }
          this.attachedTargets.set(key, {
            codeHash: bundle.codeHash,
            url: page.url,
            wsUrl: page.webSocketDebuggerUrl,
            status: nextStatus,
            updatedAt: this.now(),
          });
          this._closeBridgeSession(key);
          this.emit('target-yielded', { port, targetId: key, title: page.title || '', url: page.url });
        } else if (res?.ok) {
          attached += 1;
          const nextCodeHash = res.codeHash || bundle.codeHash;
          if (
            !prev ||
            needsReinject ||
            prev.status !== 'attached' ||
            prev.codeHash !== nextCodeHash ||
            prev.wsUrl !== page.webSocketDebuggerUrl ||
            prev.url !== page.url
          ) {
            changed = true;
          }
          this.attachedTargets.set(key, {
            codeHash: nextCodeHash,
            url: page.url,
            wsUrl: page.webSocketDebuggerUrl,
            status: 'attached',
            updatedAt: this.now(),
          });
          this._ensureBridgeSession(key, page.webSocketDebuggerUrl, true, page.id || null);
          this.emit('target-attached', {
            port,
            targetId: key,
            title: page.title || '',
            reused: Boolean(res.reused),
            codeHash: nextCodeHash,
          });
        } else {
          errors += 1;
          this.attachedTargets.delete(key);
          this._closeBridgeSession(key);
          this.emit('target-skipped', { port, targetId: key, title: page.title || '', result: res });
        }
      } catch (err) {
        if (this._stopped) break;
        errors += 1;
        this.attachedTargets.delete(key);
        this._closeBridgeSession(key);
        this.emit('target-error', { port, targetId: key, title: page.title || '', error: err?.message || String(err) });
      }
    }

    if (this._stopped) {
      this._closeAllBridgeSessions();
      return {
        status: 'stopped',
        port,
        hostPages: hostPages.length,
        attached,
        reused,
        yielded,
        errors,
        nextDelayMs: this.currentDelayMs,
      };
    }

    // Prune closed windows
    for (const key of [...this.attachedTargets.keys()]) {
      if (!activeKeys.has(key)) {
        this.attachedTargets.delete(key);
        this._closeBridgeSession(key);
        changed = true;
        this.emit('target-closed', { port, targetId: key });
      }
    }
    for (const key of [...this.bridgeSessions.keys()]) {
      if (!activeKeys.has(key)) {
        this._closeBridgeSession(key);
      }
    }

    if (this.enableHostBridge && this.bridgeSessions.size > 0) {
      this.syncNovStateToBridges();
      this.syncNovFeedToBridges();
    }

    const nextDelayMs = changed ? this._resetBackoff() : this._bumpBackoff(1.5);
    const allTargetsFailed = hostPages.length > 0 && attached === 0 && reused === 0 && yielded === 0 && errors > 0;
    const status = hostPages.length === 0 ? 'no-host-windows' : allTargetsFailed ? 'all-failed' : 'ok';
    const ok = status === 'ok';
    const summary = {
      ok,
      status,
      port,
      hostPages: hostPages.length,
      attached,
      reused,
      yielded,
      errors,
      nextDelayMs,
    };
    this.emit('cycle', summary);
    return summary;
  }

  start() {
    if (this.running) return;
    this._stopped = false;
    this.running = true;
    const tick = async () => {
      if (!this.running || this._stopped) return;
      let nextDelayMs = this.currentDelayMs;
      try {
        const res = await this.reconcileOnce();
        if (res && typeof res.nextDelayMs === 'number' && Number.isFinite(res.nextDelayMs)) {
          nextDelayMs = res.nextDelayMs;
        }
      } catch (err) {
        nextDelayMs = this._bumpBackoff(2);
        this.emit('error', { error: err?.message || String(err), nextDelayMs });
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
    this._closeAllBridgeSessions();
    this.emit('stopped', { trackedTargets: this.attachedTargets.size });
  }

  getState() {
    return {
      running: this.running,
      lastPort: this.lastPort,
      currentDelayMs: this.currentDelayMs,
      cycleCount: this.cycleCount,
      bridgeSessions: this.bridgeSessions.size,
      trackedTargets: [...this.attachedTargets.entries()].map(([id, info]) => ({ id, ...info })),
    };
  }
}

export const SessionGuardWatchDaemon = SagWatchDaemon; // legacy alias

export async function startWatchDaemonCli(argv = process.argv.slice(2)) {
  const opts = parseWatchArgs(argv);
  const cfgPatch = buildConfigPatchFromOpts(opts);

  const formatLog = (ev) => {
    if (opts.json) {
      console.log(JSON.stringify(ev));
      return;
    }
    if (ev.event === 'waiting-port') {
      console.log(`[agy-Sag:watch] Waiting for Antigravity CDP port... (retry in ${Math.round(ev.nextDelayMs / 1000)}s)`);
    } else if (ev.event === 'port-unreachable') {
      console.log(`[agy-Sag:watch] Port ${ev.port} unreachable (${ev.error}); retrying in ${Math.round(ev.nextDelayMs / 1000)}s`);
    } else if (ev.event === 'target-attached') {
      console.log(`[agy-Sag:watch] Attached -> "${ev.title || ev.targetId}" (port ${ev.port}, hash ${ev.codeHash})`);
    } else if (ev.event === 'target-yielded') {
      console.log(`[agy-Sag:watch] Yielded to host integrator on "${ev.title || ev.targetId}"`);
    } else if (ev.event === 'target-closed') {
      console.log(`[agy-Sag:watch] Target closed -> ${ev.targetId}`);
    } else if (ev.event === 'nov-state-pushed') {
      console.log(`[agy-Sag:watch] Synced agy-NOV state (preset=${ev.preset || 'custom'}) -> ${ev.targets} window(s)`);
    } else if (ev.event === 'target-error') {
      console.error(`[agy-Sag:watch] Target error (${ev.targetId}): ${ev.error}`);
    } else if (ev.event === 'stopped') {
      console.log('[agy-Sag:watch] Watch daemon stopped cleanly.');
    }
  };

  const daemon = new SagWatchDaemon({
    port: opts.port,
    config: cfgPatch,
    intervalMs: opts.intervalMs,
    maxBackoffMs: opts.maxBackoffMs,
    enableHostBridge: opts.once ? false : undefined,
    onEvent: formatLog,
  });

  if (opts.once) {
    const res = await daemon.reconcileOnce();
    if (opts.json) console.log(JSON.stringify(res));
    if (res.status !== 'ok' || res.ok === false) process.exitCode = 1;
    return res;
  }

  const shutdown = () => {
    daemon.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (!opts.json) {
    console.log(
      `[agy-Sag:watch] Starting Zero-ASAR watch daemon (interval=${opts.intervalMs}ms, maxBackoff=${opts.maxBackoffMs}ms). Press Ctrl+C to stop.`
    );
  }
  daemon.start();
  // Keep event loop alive until SIGINT/SIGTERM
  setInterval(() => {}, 60_000);
}

const isEntry = isCliEntry(import.meta.url);
if (isEntry) {
  startWatchDaemonCli(process.argv.slice(2)).catch((err) => {
    console.error('[agy-Sag:watch]', err?.message || err);
    process.exitCode = 1;
  });
}
