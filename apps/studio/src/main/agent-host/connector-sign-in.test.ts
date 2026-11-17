import { describe, expect, it, jest } from 'bun:test';
import { connectorRowAction, type ConnectorInventory } from '@studio/events';
import { ConnectorSignIn, ConnectorFailure, configuredConnector, unusedConnectorName, connectorAuthorizationUrl, type ConnectorActivity, type ConnectorSignInAdapter } from './connector-sign-in.js';

const tick = async (): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, 0)); };

function fixture(timeout = 120_000) {
  const published: ConnectorInventory[] = [];
  const finishes: (() => void)[] = [];
  let reject: () => void = () => {};
  let preparations = 0;
  const adapter: ConnectorSignInAdapter = {
    prepare: async (provider) => { preparations++; return { name: provider, connected: false }; },
    authenticate: async (_name, _signal, onBrowser) => {
      onBrowser();
      await new Promise<void>((resolve, refuse) => { finishes.push(resolve); reject = () => refuse(new Error('refused')); });
    },
  };
  const controller = new ConnectorSignIn(adapter, (inventory) => published.push(inventory), timeout);
  return { controller, published, finish: (index = finishes.length - 1) => finishes[index]?.(), reject: () => reject(), preparations: () => preparations };
}

describe('connector sign-in lifecycle', () => {
  it('settles timeout before synchronous abort cleanup can cancel it again', async () => {
    jest.useFakeTimers();
    const activity: ConnectorActivity[] = [];
    const authentication = Promise.withResolvers<void>();
    const controller = new ConnectorSignIn({
      prepare: async (provider) => ({ name: provider, connected: false }),
      authenticate: async (_name, signal) => {
        signal.addEventListener('abort', () => controller.close(), { once: true });
        authentication.resolve();
        await new Promise<void>(() => {});
      },
    }, () => {}, 10, (event) => activity.push(event));
    try {
      expect(controller.start('figma')).toBe(true);
      await authentication.promise;
      jest.advanceTimersByTime(9);
      expect(activity.filter((event) => event.phase === 'finished')).toEqual([]);
      jest.advanceTimersByTime(1);
      expect(activity.filter((event) => event.phase === 'finished')).toEqual([
        { phase: 'finished', attemptId: activity[0]!.attemptId, action: 'add', connector: 'figma', outcome: 'failed', failure: 'timeout' },
      ]);
      expect(controller.start('figma')).toBe(false);
    } finally { controller.close(); jest.useRealTimers(); }
  });

  it('cannot return a completed attempt to browser handoff or finish it twice', async () => {
    jest.useFakeTimers();
    const published: ConnectorInventory[] = [];
    const activity: ConnectorActivity[] = [];
    const connection = Promise.withResolvers<void>();
    let browser: () => void = () => {};
    const controller = new ConnectorSignIn({
      prepare: async (provider) => ({ name: provider, connected: false }),
      authenticate: async (_name, _signal, onBrowser) => { browser = onBrowser; onBrowser(); },
    }, (inventory) => {
      published.push(inventory);
      if (inventory.servers[0]?.state === 'connected') connection.resolve();
    }, 10, (event) => activity.push(event));
    try {
      controller.start('mobbin');
      await connection.promise;
      expect(published.at(-1)?.servers[0]?.state).toBe('connected');
      const count = published.length;
      browser();
      jest.advanceTimersByTime(25);
      expect(published).toHaveLength(count);
      expect(activity.filter((event) => event.phase === 'finished').map((event) => event.outcome)).toEqual(['connected']);
    } finally { controller.close(); jest.useRealTimers(); }
    expect(activity.filter((event) => event.phase === 'finished')).toHaveLength(1);
  });

  it('keeps an obsolete browser callback out of the replacement attempt', async () => {
    const published: ConnectorInventory[] = [];
    const activity: ConnectorActivity[] = [];
    const browsers: (() => void)[] = [];
    const refusals: ((error: Error) => void)[] = [];
    const controller = new ConnectorSignIn({
      prepare: async (provider) => ({ name: provider, connected: false }),
      authenticate: async (_name, _signal, onBrowser) => {
        browsers.push(onBrowser);
        await new Promise<void>((_resolve, reject) => { refusals.push(reject); });
      },
    }, (inventory) => published.push(inventory), 120_000, (event) => activity.push(event));
    try {
      controller.start('figma');
      await tick();
      refusals[0]!(new Error('refused'));
      await tick();
      expect(published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
      expect(controller.start('figma')).toBe(true);
      await tick();
      browsers[0]!();
      expect(published.at(-1)?.servers[0]?.state).toBe('adding');
      browsers[1]!();
      expect(published.at(-1)?.servers[0]?.state).toBe('awaiting-sign-in');
      expect(activity.filter((event) => event.phase === 'finished')).toHaveLength(1);
    } finally { controller.close(); }
    expect(activity.filter((event) => event.phase === 'finished').map((event) => event.outcome)).toEqual(['failed', 'cancelled']);
  });

  it('does not offer sign-in when featured setup reports a failed server', async () => {
    const published: ConnectorInventory[] = [];
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new ConnectorFailure('server'); },
      authenticate: async () => { throw new Error('must not authenticate'); },
    }, (inventory) => published.push(inventory));
    controller.update({ servers: [] });
    controller.start('figma');
    await tick();
    expect(published.at(-1)?.servers[0]?.state).toBe('failed');
    controller.close();
  });

  it('retries a synthetic featured row when Add failed before installation', async () => {
    let prepares = 0;
    const published: ConnectorInventory[] = [];
    const controller = new ConnectorSignIn({
      prepare: async (provider) => { if (++prepares === 1) throw new ConnectorFailure('integration'); return { name: provider, connected: true }; },
      authenticate: async () => { throw new Error('must not authenticate'); },
    }, (inventory) => published.push(inventory));
    controller.update({ servers: [] });
    expect(controller.start('mobbin')).toBe(true);
    await tick();
    expect(published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
    expect(controller.act('unknown')).toBe(false);
    expect(controller.act('mobbin')).toBe(true);
    await tick();
    expect(prepares).toBe(2);
    expect(published.at(-1)?.servers[0]?.state).toBe('connected');
    controller.close();
  });

  it('keeps tool-observed sign-in failures through stale connected snapshots until sign-in succeeds', async () => {
    const given = fixture();
    const design = { id: 'design', name: 'Private alias', featured: 'figma' as const, state: 'connected' as const };
    given.controller.update({ servers: [design] });
    given.controller.toolFailed('mcp__design__read', '401 Unauthorized');
    given.controller.update({ servers: [design, { id: 'other', name: 'Other', state: 'starting' }] });
    expect(given.published.at(-1)?.servers[0]?.state).toBe('needs-sign-in');
    for (const state of ['starting', 'failed', 'off'] as const) {
      given.controller.update({ servers: [{ ...design, state }] });
      expect(given.published.at(-1)?.servers[0]?.state).toBe(state);
      given.controller.update({ servers: [design] });
      expect(given.published.at(-1)?.servers[0]?.state).toBe('needs-sign-in');
    }
    expect(given.controller.promptContext('Use Figma')).toContain('Figma: needs sign-in');
    expect(given.controller.act('design')).toBe(true);
    await tick();
    given.finish(); await tick();
    expect(given.published.at(-1)?.servers.find((server) => server.id === 'design')?.state).toBe('connected');
    given.controller.update({ servers: [design] });
    expect(given.published.at(-1)?.servers[0]?.state).toBe('connected');
    given.controller.close();
  });

  it('shows a connected snapshot after a pending sign-in times out and reports only one terminal outcome', async () => {
    const published: ConnectorInventory[] = [];
    const activity: ConnectorActivity[] = [];
    let finish: () => void = () => {};
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('must not add'); },
      authenticate: async () => new Promise<void>((resolve) => { finish = resolve; }),
    }, (inventory) => published.push(inventory), 10, (event) => activity.push(event));
    controller.update({ servers: [{ id: 'design', name: 'Design', state: 'needs-sign-in' }] });
    controller.act('design');
    await tick();
    controller.update({ servers: [{ id: 'design', name: 'Design', state: 'connected' }] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(published.at(-1)?.servers[0]?.state).toBe('connected');
    expect(activity).toHaveLength(2);
    expect(activity[1]).toMatchObject({ outcome: 'failed', failure: 'timeout' });
    finish(); await tick(); controller.close();
    expect(activity).toHaveLength(2);
    expect(published.at(-1)?.servers[0]?.state).toBe('connected');
  });

  it('emits correlated bounded facts for a private row and never sends its raw failure', async () => {
    const activity: ConnectorActivity[] = [];
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('not adding'); },
      authenticate: async () => { throw new ConnectorFailure('integration', 'Rust::Internal https://private.test/token'); },
    }, () => {}, 120_000, (event) => activity.push(event));
    controller.update({ servers: [{ id: 'top-secret', name: 'Private client', state: 'needs-sign-in' }] });
    expect(controller.act('top-secret')).toBe(true);
    await tick();
    expect(activity).toHaveLength(2);
    expect(activity[0]).toMatchObject({ phase: 'started', action: 'sign-in', connector: 'other' });
    expect(activity[1]).toMatchObject({ phase: 'finished', action: 'sign-in', connector: 'other', outcome: 'failed', failure: 'integration', attemptId: activity[0]!.attemptId });
    const serialized = JSON.stringify(activity);
    for (const secret of ['top-secret', 'Private client', 'Rust', 'https://']) expect(serialized).not.toContain(secret);
    controller.close();
    expect(activity).toHaveLength(2);
  });

  it('cloud connectors open management without adding, OAuth or reconnecting', async () => {
    let opened = 0;
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('must not add'); },
      authenticate: async () => { throw new Error('must not authenticate'); },
      retry: async () => { throw new Error('must not reconnect'); },
      manageExternally: async () => { opened++; },
    }, () => {});
    controller.update({ servers: [{ id: 'cloud', name: 'claude.ai Linear', state: 'failed', managedExternally: true }] });
    expect(controller.act('cloud')).toBe(true);
    await tick();
    expect(opened).toBe(1);
    controller.close();
  });

  it('closing during external management cancels its owner and ignores the late browser result', async () => {
    const published: ConnectorInventory[] = [];
    const activity: ConnectorActivity[] = [];
    let finish!: () => void;
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('must not add'); },
      authenticate: async () => { throw new Error('must not authenticate'); },
      manageExternally: (_name, _signal, _onBrowser) => new Promise<void>((resolve) => { finish = resolve; }),
    }, (inventory) => published.push(inventory), 120_000, (event) => activity.push(event));
    controller.update({ servers: [{ id: 'cloud', name: 'claude.ai Mobbin', featured: 'mobbin', state: 'needs-sign-in', managedExternally: true }] });
    expect(controller.act('cloud')).toBe(true);
    controller.close();
    const count = published.length;
    finish();
    await tick();
    expect(published).toHaveLength(count);
    expect(activity.filter((event) => event.phase === 'finished').map((event) => event.outcome)).toEqual(['cancelled']);
  });

  it('an open external hand-off reads as waiting and cannot be clicked again', async () => {
    const published: ConnectorInventory[] = [];
    let finish!: () => void;
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('must not add'); },
      authenticate: async () => { throw new Error('must not authenticate'); },
      manageExternally: (_name, _signal, onBrowser) => new Promise<void>((resolve) => { onBrowser(); finish = resolve; }),
    }, (inventory) => published.push(inventory));
    try {
      controller.update({ servers: [{ id: 'cloud', name: 'claude.ai Mobbin', state: 'needs-sign-in', managedExternally: true }] });
      expect(controller.act('cloud')).toBe(true);
      await tick();
      const row = published.at(-1)!.servers[0]!;
      expect(row.state).toBe('awaiting-sign-in');
      expect(connectorRowAction(row)).toBeUndefined();
      expect(controller.act('cloud')).toBe(false);
      finish();
      await tick();
      expect(published.at(-1)?.servers[0]?.state).toBe('needs-sign-in');
    } finally { controller.close(); }
  });

  it('an external hand-off past its window gives up quietly and frees the row for a replacement', async () => {
    const published: ConnectorInventory[] = [];
    const activity: ConnectorActivity[] = [];
    const finishes: (() => void)[] = [];
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('must not add'); },
      authenticate: async () => { throw new Error('must not authenticate'); },
      manageExternally: (_name, _signal, onBrowser) => new Promise<void>((resolve) => { onBrowser(); finishes.push(resolve); }),
    }, (inventory) => published.push(inventory), 120_000, (event) => activity.push(event), 20);
    try {
      controller.update({ servers: [{ id: 'cloud', name: 'claude.ai Mobbin', featured: 'mobbin', state: 'needs-sign-in', managedExternally: true }] });
      expect(controller.act('cloud')).toBe(true);
      expect(published.at(-1)?.servers[0]?.state).toBe('awaiting-sign-in');
      await new Promise((resolve) => setTimeout(resolve, 35));
      expect(published.at(-1)?.servers[0]?.state).toBe('needs-sign-in');
      expect(activity.filter((event) => event.phase === 'finished')).toEqual([
        { phase: 'finished', attemptId: activity[0]!.attemptId, action: 'manage-externally', connector: 'mobbin', outcome: 'cancelled', failure: 'timeout' },
      ]);
      expect(controller.act('cloud')).toBe(true);
      const count = published.length;
      finishes[0]!();
      await tick();
      expect(published).toHaveLength(count);
      expect(activity.filter((event) => event.phase === 'finished').map((event) => event.outcome)).toEqual(['cancelled']);
      finishes[1]!();
      await tick();
      expect(activity.filter((event) => event.phase === 'finished').map((event) => event.outcome)).toEqual(['cancelled', 'opened']);
      expect(published.at(-1)?.servers[0]?.state).toBe('needs-sign-in');
    } finally { controller.close(); }
  });

  it.each(['connected', 'starting', 'off', 'adding', 'awaiting-sign-in'] as const)('%s rows are inert', (state) => {
    const given = fixture();
    given.controller.update({ servers: [{ id: 'row', name: 'row', state }] });
    expect(given.controller.act('row')).toBe(false);
    expect(given.preparations()).toBe(0);
    given.controller.close();
  });

  it('generic sign-in deadline stays failed after a late approval', async () => {
    const given = fixture(10);
    given.controller.update({ servers: [{ id: 'custom', name: 'Custom', state: 'needs-sign-in' }] });
    given.controller.act('custom'); await tick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(given.published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
    given.finish(); await tick();
    expect(given.published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
    given.controller.close();
  });

  it('a connector tool authentication failure updates the menu but unrelated tool errors do not', () => {
    const given = fixture();
    given.controller.update({ servers: [{ id: 'design', name: 'Private alias', featured: 'figma', state: 'connected' }] });
    expect(given.controller.toolFailed('Bash', '401 unauthorized')).toBeUndefined();
    expect(given.controller.toolFailed('mcp__design__get_design_context', 'rate limit')).toBeUndefined();
    expect(given.controller.toolFailed('mcp__design__get_design_context', '401 Unauthorized')).toBe('Figma');
    expect(given.published.at(-1)?.servers[0]?.state).toBe('needs-sign-in');
    given.controller.close();
  });

  it('signs in an arbitrary inventory row without adding a featured server', async () => {
    const given = fixture();
    given.controller.update({ servers: [{ id: 'private-linear', name: 'My private server', state: 'needs-sign-in' }] });
    expect(given.controller.act('missing')).toBe(false);
    expect(given.controller.act('private-linear')).toBe(true);
    expect(given.controller.act('private-linear')).toBe(false);
    await tick();
    expect(given.preparations()).toBe(0);
    expect(given.published.at(-1)?.servers[0]?.state).toBe('awaiting-sign-in');
    given.finish(); await tick();
    expect(given.published.at(-1)?.servers).toEqual([{ id: 'private-linear', name: 'My private server', state: 'connected' }]);
    given.controller.close();
  });

  it('retries failed rows without starting OAuth and preserves the server reason', async () => {
    let authenticated = false;
    const published: ConnectorInventory[] = [];
    const controller = new ConnectorSignIn({
      prepare: async () => { throw new Error('must not add'); },
      authenticate: async () => { authenticated = true; },
      retry: async (name) => ({ id: name, name, state: 'failed', error: 'Connection closed' }),
    }, (inventory) => published.push(inventory));
    controller.update({ servers: [{ id: 'broken', name: 'broken', state: 'failed' }] });
    expect(controller.act('broken')).toBe(true);
    await tick();
    expect(authenticated).toBe(false);
    expect(published.at(-1)?.servers).toEqual([{ id: 'broken', name: 'broken', state: 'failed', error: 'Connection closed' }]);
    controller.close();
  });

  it.each(['figma', 'mobbin'] as const)('%s connects without a menu subscription or restarting a session', async (provider) => {
    const given = fixture();
    expect(given.controller.start(provider)).toBe(true);
    expect(given.controller.start(provider)).toBe(false);
    await tick();
    expect(given.published.at(-1)?.servers[0]?.state).toBe('awaiting-sign-in');
    given.controller.update({ servers: [{ id: 'other', name: 'Other', state: 'connected' }] });
    given.finish();
    await tick();
    expect(given.published.at(-1)?.servers).toContainEqual({ id: provider, name: provider, featured: provider, state: 'connected' });
    expect(given.published.at(-1)?.servers.some((server) => server.id === 'other')).toBe(true);
    expect(given.preparations()).toBe(1);
    given.controller.close();
  });

  it('refusal leaves a retryable sign-in failure and retry can connect', async () => {
    const given = fixture();
    given.controller.start('figma');
    await tick(); given.reject(); await tick();
    expect(given.published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
    expect(given.controller.start('figma')).toBe(true);
    await tick(); given.finish(); await tick();
    expect(given.published.at(-1)?.servers[0]?.state).toBe('connected');
    given.controller.close();
  });

  it('a deadline aborts an attempt and its late success cannot overwrite retry', async () => {
    const given = fixture(20);
    given.controller.start('mobbin');
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 35));
    expect(given.published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
    expect(given.controller.start('mobbin')).toBe(true);
    await tick(); given.finish(0); await tick();
    expect(given.published.at(-1)?.servers[0]?.state).toBe('awaiting-sign-in');
    await tick(); given.finish(); await tick();
    expect(given.published.at(-1)?.servers[0]?.state).toBe('connected');
    given.controller.close();
  });

  it('closing a backend cancels its timer and never publishes a late result', async () => {
    const given = fixture();
    given.controller.start('figma'); await tick();
    given.controller.close();
    const count = given.published.length;
    given.finish(); await tick();
    expect(given.published).toHaveLength(count);
    expect(given.controller.start('figma')).toBe(false);
  });

  for (const provider of ['figma', 'mobbin'] as const) {
    it.each(['refusal', 'deadline'] as const)(`${provider} a later connected inventory retires a failed %s attempt`, async (failure) => {
      const given = fixture(failure === 'deadline' ? 20 : 120_000);
      given.controller.start(provider);
      await tick();
      if (failure === 'deadline') await new Promise((resolve) => setTimeout(resolve, 35));
      else { given.reject(); await tick(); }
      expect(given.published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
      given.controller.update({ servers: [{ id: 'external-alias', name: 'Design', featured: provider, state: 'needs-sign-in' }] });
      expect(given.published.at(-1)?.servers[0]?.state).toBe('sign-in-failed');
      given.controller.update({ servers: [{ id: 'external-alias', name: 'Design', featured: provider, state: 'connected' }] });
      expect(given.published.at(-1)?.servers).toEqual([{ id: 'external-alias', name: 'Design', featured: provider, state: 'connected' }]);
      given.finish(); await tick();
      expect(given.published.at(-1)?.servers[0]?.id).toBe('external-alias');
      given.controller.close();
    });
  }

  it('inventory recovery preserves another provider failure and an active retry', async () => {
    const given = fixture();
    given.controller.start('figma'); await tick(); given.reject(); await tick();
    given.controller.start('mobbin'); await tick(); given.reject(); await tick();
    given.controller.start('figma'); await tick();
    given.controller.update({ servers: [{ id: 'figma', name: 'Figma', featured: 'figma', state: 'connected' }] });
    expect(given.published.at(-1)?.servers.find((server) => server.featured === 'figma')?.state).toBe('awaiting-sign-in');
    expect(given.published.at(-1)?.servers.find((server) => server.featured === 'mobbin')?.state).toBe('sign-in-failed');
    given.controller.close();
  });

  it('a sign-in that did not finish goes back to what the inventory says once its hold ends', async () => {
    jest.useFakeTimers();
    const published: ConnectorInventory[] = [];
    const refusals: (() => void)[] = [];
    const controller = new ConnectorSignIn({
      prepare: async (provider) => ({ name: provider, connected: false }),
      authenticate: async (_name, _signal, onBrowser) => {
        onBrowser();
        await new Promise<void>((_resolve, refuse) => refusals.push(() => refuse(new Error('refused'))));
      },
    }, (inventory) => published.push(inventory), 120_000, () => {}, undefined, 10_000);
    const flush = async (): Promise<void> => { for (let step = 0; step < 10; step++) await Promise.resolve(); };
    const states = (): string[] | undefined => published.at(-1)?.servers.map((server) => `${server.id}:${server.state}`);
    try {
      controller.update({ servers: [{ id: 'linear', name: 'Linear', state: 'needs-sign-in' }] });
      controller.act('linear');
      controller.start('figma');
      await flush();
      expect(refusals).toHaveLength(2);
      for (const refuse of refusals) refuse();
      await flush();
      expect(states()).toEqual(['linear:sign-in-failed', 'figma:sign-in-failed']);
      jest.advanceTimersByTime(9_999);
      expect(states()).toEqual(['linear:sign-in-failed', 'figma:sign-in-failed']);
      jest.advanceTimersByTime(1);
      expect(published.at(-1)?.servers).toEqual([{ id: 'linear', name: 'Linear', state: 'needs-sign-in' }]);
    } finally { controller.close(); jest.useRealTimers(); }
  });

  it('a row waiting on the browser keeps its place in the list', async () => {
    const given = fixture();
    given.controller.update({ servers: [{ id: 'first', name: 'First', state: 'needs-sign-in' }, { id: 'second', name: 'Second', state: 'needs-sign-in' }, { id: 'third', name: 'Third', state: 'connected' }] });
    given.controller.act('first'); await tick();
    expect(given.published.at(-1)?.servers.map((server) => `${server.id}:${server.state}`)).toEqual(['first:awaiting-sign-in', 'second:needs-sign-in', 'third:connected']);
    given.controller.close();
  });

  it('reuses aliases by endpoint, preserves conflicting names, and rejects unsafe browser URLs', () => {
    const servers = { figma: { url: 'https://unrelated.test' }, design: { url: 'https://mcp.figma.com/mcp' }, 'onlook-figma': {} };
    expect(configuredConnector(servers, 'figma')).toBe('design');
    expect(configuredConnector({ desktop: { url: 'http://localhost:3845/mcp' } }, 'figma')).toBe('desktop');
    expect(configuredConnector({ alias: { url: 'https://api.mobbin.com/mcp/' } }, 'mobbin')).toBe('alias');
    expect(unusedConnectorName(servers, 'figma')).toBe('onlook-figma-2');
    for (const url of ['file:///tmp/private', 'javascript:alert(1)', 'https://user:password@example.test', 'http://example.test']) expect(() => connectorAuthorizationUrl(url)).toThrow();
    expect(connectorAuthorizationUrl('https://design.example.test/oauth?state=private')).toContain('https://design.example.test/');
  });
});
