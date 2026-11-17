import '../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { AgentConnection, AgentSnapshot, StudioBridge } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import { useAgentSession, type AgentSessionHandle } from './useAgentSession.js';

function snapshot(sessionId: string, harness: 'claude' | 'codex'): AgentSnapshot {
  return { sessionId, cwd: '/project', events: [], isStreaming: false, midTurn: 'steer', lastSeq: 0, connection: { status: 'ok', harness } };
}

async function mountSession() {
  const initial = deferred<AgentSnapshot>();
  const probe = deferred<AgentConnection>();
  const reads: ReturnType<typeof deferred<AgentSnapshot>>[] = [];
  let announce!: Parameters<StudioBridge['onAgentSession']>[0];
  let connect!: Parameters<StudioBridge['onAgentConnection']>[0];
  let handle!: AgentSessionHandle;
  installBridge({
    onAgentEvent: () => () => {},
    onAgentState: () => () => {},
    onAgentSession: (listen) => { announce = listen; return () => {}; },
    onAgentConnection: (listen) => { connect = listen; return () => {}; },
    agentProbe: () => probe.promise,
    agentSnapshot: () => {
      if (reads.length === 0) {
        reads.push(initial);
        return initial.promise;
      }
      const reply = deferred<AgentSnapshot>();
      reads.push(reply);
      return reply.promise;
    },
  });
  function Session() {
    handle = useAgentSession('/project');
    return null;
  }
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(<Session />));
  return { initial, probe, reads, announce, connect, current: () => handle, close: () => act(async () => root.unmount()) };
}

describe('announced session connection', () => {
  it('uses the new agent snapshot before its first turn without a connection broadcast', async () => {
    const session = await mountSession();
    try {
      await act(async () => session.initial.settle(snapshot('old', 'codex')));
      await act(async () => session.announce({ cwd: '/project' }));
      await act(async () => session.announce({ sessionId: 'new', cwd: '/project' }));
      await act(async () => session.reads[1]!.settle(snapshot('new', 'claude')));
      expect(session.current().announcedSessionId).toBe('new');
      expect(session.current().state.harnessId).toBeUndefined();
      expect(session.current().connection).toEqual({ status: 'ok', harness: 'claude' });
    } finally { await session.close(); }
  });

  it('does not replace a newer connection broadcast with a delayed snapshot', async () => {
    const session = await mountSession();
    try {
      await act(async () => session.initial.settle(snapshot('old', 'codex')));
      await act(async () => session.announce({ sessionId: 'new', cwd: '/project' }));
      await act(async () => session.connect({ status: 'ok', harness: 'codex' }));
      await act(async () => session.reads[1]!.settle(snapshot('new', 'claude')));
      expect(session.current().connection).toEqual({ status: 'ok', harness: 'codex' });
    } finally { await session.close(); }
  });

  it('ignores an old announcement answer after another session or a stop', async () => {
    for (const destination of ['latest', undefined]) {
      const session = await mountSession();
      try {
        await act(async () => session.initial.settle(snapshot('old', 'codex')));
        await act(async () => session.announce({ sessionId: 'new', cwd: '/project' }));
        await act(async () => session.announce({ sessionId: destination, cwd: '/project' }));
        await act(async () => session.reads[1]!.settle(snapshot('new', 'claude')));
        expect(session.current().connection).toEqual({ status: 'ok', harness: 'codex' });
      } finally { await session.close(); }
    }
  });

  it('does not let an older mount snapshot or probe overwrite the new agent', async () => {
    const session = await mountSession();
    try {
      await act(async () => session.announce({ sessionId: 'new', cwd: '/project' }));
      await act(async () => session.reads[1]!.settle(snapshot('new', 'claude')));
      await act(async () => {
        session.initial.settle(snapshot('old', 'codex'));
        session.probe.settle({ status: 'ok', harness: 'codex' });
      });
      expect(session.current().connection).toEqual({ status: 'ok', harness: 'claude' });
    } finally { await session.close(); }
  });

  it('hands the mount snapshot and the probe back when a stop leaves no announced read to answer', async () => {
    for (const fallback of ['snapshot', 'probe'] as const) {
      for (const announced of [undefined, 'new'] as const) {
        const session = await mountSession();
        try {
          if (announced !== undefined) await act(async () => session.announce({ sessionId: announced, cwd: '/project' }));
          await act(async () => session.announce({ sessionId: undefined, cwd: '/project' }));
          await act(async () => {
            if (fallback === 'snapshot') session.initial.settle(snapshot('old', 'codex'));
            else session.probe.settle({ status: 'ok', harness: 'codex' });
          });
          expect(session.current().connection, `${fallback} after ${announced ?? 'no'} announcement`).toEqual({ status: 'ok', harness: 'codex' });
        } finally { await session.close(); }
      }
    }
  });

  it('holds both back while an announced read can still answer', async () => {
    const session = await mountSession();
    try {
      await act(async () => session.announce({ sessionId: 'new', cwd: '/project' }));
      await act(async () => {
        session.initial.settle(snapshot('old', 'codex'));
        session.probe.settle({ status: 'ok', harness: 'codex' });
      });
      expect(session.current().connection).toEqual({ status: 'unknown' });
      await act(async () => session.reads[1]!.settle(snapshot('new', 'claude')));
      expect(session.current().connection).toEqual({ status: 'ok', harness: 'claude' });
    } finally { await session.close(); }
  });

  it('does not take connection metadata from a different snapshot session', async () => {
    const session = await mountSession();
    try {
      await act(async () => session.initial.settle(snapshot('old', 'codex')));
      await act(async () => session.announce({ sessionId: 'new', cwd: '/project' }));
      await act(async () => session.reads[1]!.settle(snapshot('elsewhere', 'claude')));
      expect(session.current().connection).toEqual({ status: 'ok', harness: 'codex' });
    } finally { await session.close(); }
  });
});
