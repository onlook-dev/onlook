import { afterAll, afterEach, describe, expect, it, jest } from 'bun:test';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outcome } from '@studio/fixtures';

import { AppServerTransport, classifyFrame, stripInheritedCredentials } from './transport.js';
import type { Frame } from './transport.js';

const workDir = mkdtempSync(join(tmpdir(), 'appserver-transport-test-'));
afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

afterEach(() => {
  jest.useRealTimers();
});

const BODY = 'STUDIO_TEST_FAKE_SERVER';

/** One executable per file, its behaviour read from the env: on macOS the first exec of a freshly written file costs ~120 ms. */
const FAKE_SERVER = join(workDir, 'fake-server.mjs');
writeFileSync(
  FAKE_SERVER,
  `#!/usr/bin/env node
const send = (o) => process.stdout.write(JSON.stringify(o) + "\\n");
const raw = (s) => process.stdout.write(s + "\\n");
let onLine = () => {};
let buf = "";
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\\n")) !== -1) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (line.trim()) onLine(JSON.parse(line));
  }
});
eval(process.env.${BODY});
`,
  'utf8',
);
chmodSync(FAKE_SERVER, 0o755);

function fakeServer(body: string): { bin: string; env: NodeJS.ProcessEnv } {
  return { bin: FAKE_SERVER, env: { ...process.env, [BODY]: body } };
}

async function waitFor(ready: () => boolean): Promise<void> {
  while (!ready()) await new Promise((resolve) => setTimeout(resolve, 10));
}

describe('the demux truth table (method × id)', () => {
  it('method AND id is a server request — something we must answer', () => {
    expect(classifyFrame({ method: 'item/fileChange/requestApproval', id: 'r1' })).toBe('server-request');
  });

  it('method WITHOUT id is a notification — fire and forget', () => {
    expect(classifyFrame({ method: 'turn/completed' })).toBe('notification');
  });

  it('id WITHOUT method is a response to something we sent', () => {
    expect(classifyFrame({ id: 'r1', result: {} })).toBe('response');
  });

  it('neither is unknown, and is not quietly treated as a notification', () => {
    expect(classifyFrame({} as Frame)).toBe('unknown');
  });

  it('classifies on SHAPE, not on a list of known method names', () => {
    expect(classifyFrame({ method: 'invented/after/we/compiled', id: 9 })).toBe('server-request');
    expect(classifyFrame({ method: 'invented/after/we/compiled' })).toBe('notification');
  });

  it('treats id 0 as present — a falsy id is still an id', () => {
    expect(classifyFrame({ id: 0, result: null })).toBe('response');
  });
});

describe('request/response correlation', () => {
  it('resolves the matching request and leaves the pending set empty', async () => {
    const transport = new AppServerTransport({
      ...fakeServer(`onLine = (msg) => { if (msg.method === "ping") send({ id: msg.id, result: { pong: true } }); };`),
    });
    expect(await transport.request('ping')).toEqual({ pong: true });
    expect(transport.pendingCount).toBe(0);
    await transport.close();
  });

  it('rejects with the server message when the response carries an error', async () => {
    const transport = new AppServerTransport({
      ...fakeServer(
        `onLine = (msg) => send({ id: msg.id, error: { code: -32600, message: "unknown variant \`readOnly\`" } });`,
      ),
    });
    expect(await outcome(transport.request('thread/start'))).toThrow(/unknown variant/);
    expect(transport.pendingCount).toBe(0);
    await transport.close();
  });

  it('survives an unmatched response instead of killing the reader', async () => {
    const notifications: string[] = [];
    const transport = new AppServerTransport(
      {
        ...fakeServer(
          `send({ id: "never-sent", result: {} }); send({ method: "turn/completed" });`,
        ),
      },
      { onNotification: (method) => notifications.push(method) },
    );
    await waitFor(() => notifications.length > 0);
    expect(notifications).toEqual(['turn/completed']);
    await transport.close();
  });
});

describe('NDJSON framing', () => {
  it('reassembles a frame split across stdout chunks', async () => {
    const notifications: string[] = [];
    const transport = new AppServerTransport(
      {
        ...fakeServer(
          `process.stdout.write('{"method":"turn/'); setTimeout(() => process.stdout.write('started"}\\n'), 40);`,
        ),
      },
      { onNotification: (method) => notifications.push(method) },
    );
    await waitFor(() => notifications.length > 0);
    expect(notifications).toEqual(['turn/started']);
    await transport.close();
  });

  it('delivers several frames arriving in one chunk, in order', async () => {
    const notifications: string[] = [];
    const transport = new AppServerTransport(
      {
        ...fakeServer(
          `raw('{"method":"a"}\\n{"method":"b"}\\n{"method":"c"}'.replace(/\\n$/, ""));`,
        ),
      },
      { onNotification: (method) => notifications.push(method) },
    );
    await waitFor(() => notifications.length >= 3);
    expect(notifications).toEqual(['a', 'b', 'c']);
    await transport.close();
  });

  it('reports a non-JSON line rather than swallowing it', async () => {
    const malformed: string[] = [];
    const notifications: string[] = [];
    const transport = new AppServerTransport(
      {
        ...fakeServer(`raw("panicked at src/main.rs:1"); send({ method: "turn/started" });`),
      },
      {
        onMalformed: (line) => malformed.push(line),
        onNotification: (method) => notifications.push(method),
      },
    );
    await waitFor(() => malformed.length > 0 && notifications.length > 0);
    expect(malformed).toEqual(['panicked at src/main.rs:1']);
    expect(notifications).toEqual(['turn/started']);
    await transport.close();
  });

  it('skips blank lines without reporting them as malformed', async () => {
    const malformed: string[] = [];
    const received: string[] = [];
    const transport = new AppServerTransport(
      { ...fakeServer(`raw(""); raw("   "); send({ method: "turn/started" });`) },
      { onMalformed: (line) => malformed.push(line), onNotification: (m) => received.push(m) },
    );
    await waitFor(() => received.length > 0);
    expect(received).toEqual(['turn/started']);
    expect(malformed).toEqual([]);
    await transport.close();
  });
});

describe('nothing is ever left parked', () => {
  it('fails every pending request when the child dies', async () => {
    const transport = new AppServerTransport({
      ...fakeServer(`onLine = () => { process.exit(3); };`),
    });
    const failure = await transport.request('turn/start').catch((error: unknown) => error);
    expect(failure).toMatchObject({ reason: 'exited', exit: { exitCode: 3, signal: null } });
    expect(transport.pendingCount).toBe(0);
  });

  it('fails every pending request on close, and closing settles them FIRST', async () => {
    const transport = new AppServerTransport(fakeServer(`onLine = () => {};`));
    // `close()` rejects synchronously; a `.rejects` written after it races and surfaces as an unhandled rejection.
    let rejection: Error | undefined;
    const parked = transport
      .request('item/fileChange/requestApproval')
      .catch((error: Error) => {
        rejection = error;
      });
    expect(transport.pendingCount).toBe(1);
    let closed = false;
    const closing = transport.close().then(() => {
      closed = true;
    });
    await parked;
    expect(rejection?.message).toMatch(/closed/);
    expect(closed).toBe(false);
    expect(transport.pendingCount).toBe(0);
    await closing;
  });

  it('close() returns even when the child has already exited', async () => {
    let exited = false;
    const transport = new AppServerTransport(fakeServer(`process.exit(0);`), {
      onExit: () => {
        exited = true;
      },
    });
    await waitFor(() => exited);
    expect(await transport.close()).toBeUndefined();
  });

  it('close() is safe to call twice', async () => {
    const transport = new AppServerTransport(fakeServer(`onLine = () => {};`));
    await transport.close();
    expect(await transport.close()).toBeUndefined();
  });

  it('refuses to send after exit rather than parking a new caller', async () => {
    let exited = false;
    const transport = new AppServerTransport(fakeServer(`process.exit(0);`), {
      onExit: () => {
        exited = true;
      },
    });
    await waitFor(() => exited);
    expect(await outcome(transport.request('anything'))).toThrow(/exited/);
  });

  it('refuses a new request between close() and the child actually exiting', async () => {
    let signalled: () => void = () => undefined;
    const termed = new Promise<void>((resolve) => {
      signalled = resolve;
    });
    let exit: NodeJS.Signals | null | undefined;
    const transport = new AppServerTransport(
      fakeServer(
        'process.on("SIGTERM", () => send({ method: "sigterm" })); process.stdin.on("end", () => setTimeout(() => {}, 10_000)); onLine = (msg) => { if (msg.method === "ready") send({ id: msg.id, result: {} }); };',
      ),
      {
        onNotification: (method) => {
          if (method === 'sigterm') signalled();
        },
        onExit: (_code, signal) => {
          exit = signal;
        },
      },
    );
    await transport.request('ready');
    let parkedRejection: Error | undefined;
    const parked = transport.request('item/fileChange/requestApproval').catch((error: Error) => {
      parkedRejection = error;
    });

    jest.useFakeTimers();
    const closing = transport.close(400);
    await termed;
    expect(exit).toBeUndefined();

    const late = transport.request('thread/start');
    expect(transport.pendingCount).toBe(0);
    expect(await outcome(late)).toThrow(/closed/);
    await parked;
    expect(parkedRejection?.message).toMatch(/closed/);

    jest.advanceTimersByTime(400);
    await closing;
    expect(exit).toBe('SIGKILL');
  });

  it('refuses to send after a spawn failure rather than parking every later caller', async () => {
    const transport = new AppServerTransport({ bin: join(workDir, 'no-such-binary') });
    let spawnFailure: Error | undefined;
    const first = transport.request('initialize').catch((error: Error) => {
      spawnFailure = error;
    });
    // Not pinned to `ENOENT`: Bun reaches the dead wire through a destroyed stdin rather than the spawn error.
    await waitFor(() => spawnFailure !== undefined);
    expect(spawnFailure).toBeDefined();
    expect(spawnFailure).toMatchObject({ reason: 'connection' });

    const late = transport.request('thread/start');
    // Before the await: a caller parked here never settles, so a reorder hangs instead of going red.
    expect(transport.pendingCount).toBe(0);
    expect(await outcome(late)).toThrow(/cannot send/);
    await first;
    await transport.close();
  });

  it('gives up on a live child that never answers, when the caller asked for a bound', async () => {
    const transport = new AppServerTransport(fakeServer(`onLine = () => {};`));
    jest.useFakeTimers();
    const asked = transport.request('account/read', {}, 150).catch((error: unknown) => error);
    jest.advanceTimersByTime(149);
    expect(transport.pendingCount).toBe(1);
    jest.advanceTimersByTime(1);
    expect(await asked).toMatchObject({ reason: 'timeout', exit: undefined });
    expect(transport.pendingCount).toBe(0);
    await transport.close();
  });

  it('leaves an unbounded request unbounded', async () => {
    const transport = new AppServerTransport(fakeServer(`onLine = () => {};`));
    let settled = false;
    jest.useFakeTimers();
    void transport.request('account/read').then(
      () => (settled = true),
      () => (settled = true),
    );
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(settled).toBe(false);
    expect(transport.pendingCount).toBe(1);
    // Closing under fake timers never settles, and the dangling child times out every later test in this file.
    jest.useRealTimers();
    await transport.close();
  });

  it('a late answer to a timed-out request is drift, not a throw', async () => {
    let answered = false;
    const transport = new AppServerTransport(
      fakeServer(
        'let held; onLine = (msg) => { if (msg.method === "release") send({ id: held.id, result: { late: true } }); else held = msg; };',
      ),
      { onFrame: (_raw, _frame, kind) => (answered ||= kind === 'response') },
    );
    jest.useFakeTimers();
    const asked = outcome(transport.request('ping', {}, 100));
    jest.advanceTimersByTime(100);
    jest.useRealTimers();
    expect(await asked).toThrow(/no answer/);

    transport.notify('release');
    await waitFor(() => answered);
    expect(transport.pendingCount).toBe(0);
    await transport.close();
  });
});

describe('answering the server', () => {
  it('sends a result the server can read back', async () => {
    const echoed: unknown[] = [];
    let asked = false;
    const transport = new AppServerTransport(
      {
        ...fakeServer(
          `send({ method: "ask", id: "a1" }); onLine = (msg) => send({ method: "got", params: msg });`,
        ),
      },
      {
        onNotification: (method, params) => echoed.push({ method, params }),
        onServerRequest: () => {
          asked = true;
        },
      },
    );
    await waitFor(() => asked);
    transport.respond('a1', { decision: 'accept' });
    await waitFor(() => echoed.length > 0);
    expect(echoed).toContainEqual({
      method: 'got',
      params: { id: 'a1', result: { decision: 'accept' } },
    });
    await transport.close();
  });

  it('sends an explicit ERROR, never an empty object', async () => {
    const echoed: unknown[] = [];
    let asked = false;
    const transport = new AppServerTransport(
      {
        ...fakeServer(
          `send({ method: "ask", id: "a1" }); onLine = (msg) => send({ method: "got", params: msg });`,
        ),
      },
      {
        onNotification: (method, params) => echoed.push({ method, params }),
        onServerRequest: () => {
          asked = true;
        },
      },
    );
    await waitFor(() => asked);
    transport.respondError('a1', 'not implemented');
    await waitFor(() => echoed.length > 0);
    expect(echoed).toContainEqual({
      method: 'got',
      params: { id: 'a1', error: { code: -32601, message: 'not implemented' } },
    });
    await transport.close();
  });
});

describe('what the codex child does NOT inherit', () => {
  // `CODEX_ACCESS_TOKEN` is the one codex honours; a case pinning only `OPENAI_API_KEY` passes while it sails through.
  it('drops every environment-supplied credential', () => {
    const stripped = stripInheritedCredentials({
      OPENAI_API_KEY: 'sk-from-the-users-shell',
      CODEX_API_KEY: 'ck-from-the-users-shell',
      CODEX_ACCESS_TOKEN: 'at-from-the-users-shell',
      PATH: '/usr/bin',
    });
    expect(stripped['OPENAI_API_KEY']).toBeUndefined();
    expect(stripped['CODEX_API_KEY']).toBeUndefined();
    expect(stripped['CODEX_ACCESS_TOKEN']).toBeUndefined();
  });

  it('leaves the rest of the environment alone', () => {
    const stripped = stripInheritedCredentials({ PATH: '/usr/bin', HOME: '/Users/x' });
    expect(stripped['PATH']).toBe('/usr/bin');
    expect(stripped['HOME']).toBe('/Users/x');
  });
});
