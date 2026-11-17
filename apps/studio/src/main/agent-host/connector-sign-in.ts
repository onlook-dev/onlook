import { connectorRowAction, type AgentConnector, type ConnectorInventory, type FeaturedConnector } from '@studio/events';
import { randomUUID } from 'node:crypto';
import { connectorForTool } from './connectors.js';
import { connectorInstructions } from '../../instructions/connectors.js';

export const CONNECTOR_ENDPOINTS: Record<FeaturedConnector, string> = {
  figma: 'https://mcp.figma.com/mcp',
  mobbin: 'https://api.mobbin.com/mcp',
};

export function connectorOriginMatches(value: unknown, provider: FeaturedConnector): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === new URL(CONNECTOR_ENDPOINTS[provider]).origin || (provider === 'figma' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3845');
  } catch { return false; }
}

export function configuredConnector(servers: Record<string, { url?: unknown }>, provider: FeaturedConnector): string | undefined {
  return Object.entries(servers).find(([, server]) => {
    if (typeof server.url !== 'string') return false;
    try {
      const url = new URL(server.url);
      const expected = new URL(CONNECTOR_ENDPOINTS[provider]);
      const path = url.pathname.replace(/\/+$/, '');
      const desktopSse = provider === 'figma' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3845' && path === '/sse';
      return (path === expected.pathname || desktopSse) && connectorOriginMatches(server.url, provider);
    } catch { return false; }
  })?.[0];
}

export function unusedConnectorName(servers: Record<string, unknown>, provider: FeaturedConnector): string {
  if (!Object.hasOwn(servers, provider)) return provider;
  let name = `onlook-${provider}`;
  let suffix = 2;
  while (Object.hasOwn(servers, name)) name = `onlook-${provider}-${suffix++}`;
  return name;
}

export function connectorPause(signal: AbortSignal, milliseconds = 500): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const aborted = (): void => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', aborted); resolve(); }, milliseconds);
    timer.unref();
    signal.addEventListener('abort', aborted, { once: true });
  });
}

export function connectorAuthorizationUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Connector sign-in did not return a URL');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Connector sign-in returned an unsafe URL');
  if (url.username || url.password) throw new Error('Connector sign-in URL contains credentials');
  return url.href;
}

export interface ConnectorSignInAdapter {
  prepare(provider: FeaturedConnector, signal: AbortSignal): Promise<{ name: string; connected: boolean }>;
  authenticate(name: string, signal: AbortSignal, onBrowser: () => void): Promise<void>;
  retry?(name: string, signal: AbortSignal): Promise<AgentConnector>;
  manageExternally?(name: string, signal: AbortSignal, onBrowser: () => void): Promise<void>;
}

// A hand-off to the browser waits on a person, not on a call (ONL-3181).
const EXTERNAL_HANDOFF_TIMEOUT_MS = 10 * 60_000;

const FAILED_SIGN_IN_HOLD_MS = 10_000;

export type ConnectorFailureCategory = 'integration' | 'server' | 'authorization' | 'timeout' | 'cancelled' | 'unknown';
export class ConnectorFailure extends Error {
  readonly category: ConnectorFailureCategory;
  constructor(category: ConnectorFailureCategory, message: string = category) {
    super(message);
    this.category = category;
  }
}

export interface ConnectorActivity {
  attemptId: string;
  phase: 'started' | 'finished';
  action: 'add' | 'sign-in' | 'retry' | 'manage-externally';
  connector: FeaturedConnector | 'other';
  outcome?: 'connected' | 'failed' | 'opened' | 'cancelled';
  failure?: ConnectorFailureCategory;
}

type AttemptPhase =
  | { kind: 'adding' | 'starting' | 'awaiting-sign-in' }
  | { kind: 'failed' | 'sign-in-failed'; outcome: 'failed'; failure: ConnectorFailureCategory }
  | { kind: 'succeeded'; outcome: 'connected' | 'opened' }
  | { kind: 'cancelled'; outcome: 'cancelled'; failure: 'cancelled' | 'timeout' };

function isActive(phase: AttemptPhase): phase is Extract<AttemptPhase, { kind: 'adding' | 'starting' | 'awaiting-sign-in' }> {
  return phase.kind === 'adding' || phase.kind === 'starting' || phase.kind === 'awaiting-sign-in';
}

interface Attempt {
  id: string;
  abort: AbortController;
  phase: AttemptPhase;
  timer: ReturnType<typeof setTimeout>;
  name?: string;
  server?: AgentConnector;
  featured?: FeaturedConnector;
  action: ConnectorActivity['action'];
}

export class ConnectorSignIn {
  private readonly attempts = new Map<string, Attempt>();
  private readonly authFailures = new Set<string>();
  private inventory: ConnectorInventory = { servers: [] };
  private closed = false;
  private fingerprint?: string;

  private readonly adapter: ConnectorSignInAdapter;
  private readonly publish: (inventory: ConnectorInventory) => void;
  private readonly timeoutMs: number;
  private readonly activity: (event: ConnectorActivity) => void;
  private readonly externalTimeoutMs: number;
  private readonly failureHoldMs: number;

  constructor(adapter: ConnectorSignInAdapter, publish: (inventory: ConnectorInventory) => void, timeoutMs = 120_000, activity: (event: ConnectorActivity) => void = () => {}, externalTimeoutMs = EXTERNAL_HANDOFF_TIMEOUT_MS, failureHoldMs = FAILED_SIGN_IN_HOLD_MS) {
    this.adapter = adapter;
    this.publish = publish;
    this.timeoutMs = timeoutMs;
    this.activity = activity;
    this.externalTimeoutMs = externalTimeoutMs;
    this.failureHoldMs = failureHoldMs;
  }

  update(inventory: ConnectorInventory): void {
    if (!inventory.unavailable) {
      for (const id of this.authFailures) {
        const server = inventory.servers.find((candidate) => candidate.id === id);
        if (server === undefined || server.state === 'needs-sign-in' || server.state === 'sign-in-failed') this.authFailures.delete(id);
      }
    }
    this.inventory = { ...inventory, servers: inventory.servers.map((server) => server.state === 'connected' && this.authFailures.has(server.id) ? { ...server, state: 'needs-sign-in' } : server) };
    this.retireFinishedAttempts();
    this.emit();
  }

  private retireFinishedAttempts(): void {
    for (const [key, attempt] of this.attempts) {
      if (!isActive(attempt.phase) && attempt.server !== undefined && !this.inventory.servers.some((server) => server.id === attempt.server!.id)) { this.retire(key, attempt); continue; }
      if (!isActive(attempt.phase) && this.inventory.servers.some((server) => server.state === 'connected' && (attempt.server ? server.id === attempt.server.id : server.featured === attempt.featured))) this.retire(key, attempt);
    }
  }

  start(provider: FeaturedConnector): boolean {
    if (this.closed) return false;
    const existing = this.inventory.servers.find((server) => server.featured === provider);
    if (existing !== undefined) return this.act(existing.id);
    return this.begin(`featured:${provider}`, provider, undefined, 'add');
  }

  act(id: string): boolean {
    if (this.closed || this.inventory.unavailable) return false;
    const server = this.inventory.servers.find((candidate) => candidate.id === id);
    if (server === undefined) {
      const attempt = [...this.attempts.values()].find((candidate) => !isActive(candidate.phase) && candidate.server === undefined && (candidate.name ?? candidate.featured) === id);
      return attempt?.featured === undefined ? false : this.start(attempt.featured);
    }
    const action = connectorRowAction(server);
    if (action === undefined) return false;
    if (action === 'retry' && !this.adapter.retry || action === 'manage-externally' && !this.adapter.manageExternally) return false;
    const featuredAttempt = server.featured ? this.attempts.get(`featured:${server.featured}`) : undefined;
    if (featuredAttempt !== undefined && isActive(featuredAttempt.phase)) return false;
    return this.begin(`server:${id}`, server.featured, server, action);
  }

  toolFailed(name: string, result: string): string | undefined {
    const server = connectorForTool(name, this.inventory.servers);
    if (server === undefined || server.state !== 'needs-sign-in' && !/\b(?:401|unauthorized|authentication required|not authenticated|not logged in|sign[ -]?in required)\b/i.test(result)) return undefined;
    this.authFailures.add(server.id);
    this.inventory = { ...this.inventory, servers: this.inventory.servers.map((candidate) => candidate.id === server.id ? { ...candidate, state: 'needs-sign-in' } : candidate) };
    this.emit();
    return server.featured === 'figma' ? 'Figma' : server.featured === 'mobbin' ? 'Mobbin' : server.name;
  }

  promptContext(text: string): string | undefined {
    if (!/\b(?:figma|mobbin)\b/i.test(text)) return undefined;
    return connectorInstructions(this.fingerprint === undefined ? { servers: [], unavailable: true } : this.inventory);
  }

  private begin(key: string, featured: FeaturedConnector | undefined, server: AgentConnector | undefined, action: ConnectorActivity['action']): boolean {
    const current = this.attempts.get(key);
    if (current !== undefined && isActive(current.phase)) return false;
    for (const [previousKey, previous] of this.attempts) {
      if (!isActive(previous.phase) && (previous.server?.id === server?.id && server !== undefined || featured !== undefined && previous.featured === featured)) this.retire(previousKey, previous);
    }
    const abort = new AbortController();
    const external = action === 'manage-externally';
    const attempt: Attempt = { id: randomUUID(), abort, phase: { kind: action === 'add' ? 'adding' : 'starting' }, server, featured, action, timer: setTimeout(() => external ? this.giveUp(key, attempt) : this.fail(key, attempt, 'timeout'), external ? this.externalTimeoutMs : this.timeoutMs) };
    attempt.timer.unref();
    this.attempts.set(key, attempt);
    this.activity({ phase: 'started', attemptId: attempt.id, action, connector: featured ?? 'other' });
    this.emit();
    void this.run(key, attempt);
    return true;
  }

  close(): void {
    this.closed = true;
    for (const attempt of this.attempts.values()) {
      this.transition(attempt, { kind: 'cancelled', outcome: 'cancelled', failure: 'cancelled' });
      clearTimeout(attempt.timer);
    }
    this.attempts.clear();
    this.authFailures.clear();
  }

  private async run(key: string, attempt: Attempt): Promise<void> {
    const signal = attempt.abort.signal;
    try {
      if (attempt.action === 'manage-externally') {
        await this.adapter.manageExternally!(attempt.server!.id, signal, () => {
          if (this.transition(attempt, { kind: 'awaiting-sign-in' })) this.emit();
        });
        signal.throwIfAborted();
        this.attempts.delete(key);
        this.transition(attempt, { kind: 'succeeded', outcome: 'opened' });
        this.emit();
        return;
      }
      if (attempt.action === 'retry') {
        const server = await this.adapter.retry!(attempt.server!.id, signal);
        signal.throwIfAborted();
        if (server.id !== attempt.server!.id) throw new ConnectorFailure('integration');
        this.attempts.delete(key);
        this.inventory = { ...this.inventory, servers: this.inventory.servers.map((candidate) => candidate.id === server.id ? server : candidate) };
        if (server.state === 'connected') this.authFailures.delete(server.id);
        this.transition(attempt, server.state === 'connected'
          ? { kind: 'succeeded', outcome: 'connected' }
          : { kind: 'failed', outcome: 'failed', failure: 'server' });
        this.emit();
        return;
      }
      const prepared = attempt.server ? { name: attempt.server.id, connected: false } : await this.adapter.prepare(attempt.featured!, signal);
      signal.throwIfAborted();
      attempt.name = prepared.name;
      if (!prepared.connected) await this.adapter.authenticate(prepared.name, signal, () => {
        if (this.transition(attempt, { kind: 'awaiting-sign-in' })) this.emit();
      });
      signal.throwIfAborted();
      this.attempts.delete(key);
      this.transition(attempt, { kind: 'succeeded', outcome: 'connected' });
      this.authFailures.delete(prepared.name);
      const connected: AgentConnector = { ...attempt.server, id: prepared.name, name: attempt.server?.name ?? prepared.name, ...(attempt.featured ? { featured: attempt.featured } : {}), state: 'connected' };
      this.inventory = { servers: [...this.inventory.servers.filter((server) => server.id !== prepared.name), connected] };
      this.emit();
    } catch (error) {
      if (!signal.aborted) this.fail(key, attempt, error instanceof ConnectorFailure ? error.category : 'unknown');
    }
  }

  // A hand-off that outlasts its window is not a failure: the row falls back to its inventory state (ONL-3181).
  private giveUp(key: string, attempt: Attempt): void {
    if (this.closed || this.attempts.get(key) !== attempt) return;
    if (!this.transition(attempt, { kind: 'cancelled', outcome: 'cancelled', failure: 'timeout' })) return;
    this.attempts.delete(key);
    this.emit();
  }

  private fail(key: string, attempt: Attempt, failure: ConnectorFailureCategory): void {
    if (this.closed || this.attempts.get(key) !== attempt) return;
    const kind = failure === 'server' || attempt.action === 'retry' || attempt.action === 'manage-externally' ? 'failed' : 'sign-in-failed';
    if (!this.transition(attempt, { kind, outcome: 'failed', failure })) return;
    if (kind === 'sign-in-failed') {
      attempt.timer = setTimeout(() => {
        if (this.closed || this.attempts.get(key) !== attempt) return;
        this.attempts.delete(key);
        this.emit();
      }, this.failureHoldMs);
      attempt.timer.unref();
    }
    this.retireFinishedAttempts();
    this.emit();
  }

  private retire(key: string, attempt: Attempt): void {
    clearTimeout(attempt.timer);
    this.attempts.delete(key);
  }

  private transition(attempt: Attempt, phase: AttemptPhase): boolean {
    if (!isActive(attempt.phase)) return false;
    attempt.phase = phase;
    if (!isActive(phase)) {
      clearTimeout(attempt.timer);
      if (phase.kind !== 'succeeded') attempt.abort.abort();
      this.activity({ phase: 'finished', attemptId: attempt.id, action: attempt.action, connector: attempt.featured ?? 'other', outcome: phase.outcome, ...('failure' in phase ? { failure: phase.failure } : {}) });
    }
    return true;
  }

  private emit(): void {
    if (this.closed) return;
    let servers = [...this.inventory.servers];
    for (const attempt of this.attempts.values()) {
      if (attempt.phase.kind === 'succeeded' || attempt.phase.kind === 'cancelled') continue;
      const server: AgentConnector = { ...attempt.server, id: attempt.name ?? attempt.server?.id ?? attempt.featured!, name: attempt.server?.name ?? attempt.name ?? attempt.featured!, ...(attempt.featured ? { featured: attempt.featured } : {}), state: attempt.phase.kind };
      const replaces = (candidate: AgentConnector): boolean => attempt.server ? candidate.id === attempt.server.id : candidate.featured === attempt.featured;
      const at = servers.findIndex(replaces);
      servers = servers.filter((candidate) => !replaces(candidate));
      servers.splice(at === -1 ? servers.length : at, 0, server);
    }
    const inventory = { ...this.inventory, servers };
    const fingerprint = JSON.stringify(inventory);
    if (fingerprint === this.fingerprint) return;
    this.fingerprint = fingerprint;
    this.publish(inventory);
  }
}
