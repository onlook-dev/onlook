import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting, type LogLine } from '../log/index.js';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { ViewRouting, type ViewSink } from './view-routing.js';

function fakeSink(): { sink: ViewSink; received: Array<{ channel: string; payload: unknown }> } {
  const received: Array<{ channel: string; payload: unknown }> = [];
  return {
    sink: { send: (channel, payload) => void received.push({ channel, payload }) },
    received,
  };
}

describe('routeTo', () => {
  it('delivers to a view registered for the addressed project', () => {
    const routing = new ViewRouting();
    const a = fakeSink();
    routing.register(1, '/workspaces/a', a.sink);

    routing.routeTo('/workspaces/a', 'agent:event', { type: 'ping' });

    expect(a.received).toEqual([{ channel: 'agent:event', payload: { type: 'ping' } }]);
  });

  it('never reaches a view registered to a different project', () => {
    const routing = new ViewRouting();
    const a = fakeSink();
    const b = fakeSink();
    routing.register(1, '/workspaces/a', a.sink);
    routing.register(2, '/workspaces/b', b.sink);

    routing.routeTo('/workspaces/a', 'agent:event', { type: 'from-a' });

    expect(a.received.length).toBe(1);
    expect(b.received.length).toBe(0);
  });

  it('stops delivering to an unregistered view', () => {
    const routing = new ViewRouting();
    const a = fakeSink();
    routing.register(1, '/workspaces/a', a.sink);
    routing.unregister(1);

    routing.routeTo('/workspaces/a', 'agent:event', { type: 'ping' });

    expect(a.received.length).toBe(0);
  });

  describe('an undefined cwd', () => {
    it('broadcasts to every registered view rather than dropping the message, and logs the channel as an error', () => {
      const routing = new ViewRouting();
      const a = fakeSink();
      const b = fakeSink();
      routing.register(1, '/workspaces/a', a.sink);
      routing.register(2, '/workspaces/b', b.sink);
      recordLinesForTesting();
      let errors: readonly LogLine[];
      try {
        routing.routeTo(undefined, 'agent:state', { isStreaming: true });
        errors = peekLinesForTesting().filter((line) => line.level === 'error');
      } finally {
        resetLogForTesting();
      }

      expect(a.received.length).toBe(1);
      expect(b.received.length).toBe(1);
      expect(errors.map((line) => line['channel'])).toEqual(['agent:state']);
    });
  });

  describe('workspaceOf / openWorkspaces (ONL-2226)', () => {
    it('answers the project a registered view shows', () => {
      const routing = new ViewRouting();
      routing.register(1, '/workspaces/a', fakeSink().sink);

      expect(routing.workspaceOf(1)).toBe('/workspaces/a');
      expect(routing.workspaceOf(2)).toBeUndefined();
    });

    it('drops from openWorkspaces once unregistered', () => {
      const routing = new ViewRouting();
      routing.register(1, '/workspaces/a', fakeSink().sink);
      routing.register(2, '/workspaces/b', fakeSink().sink);

      expect(routing.openWorkspaces()).toEqual(new Set(['/workspaces/a', '/workspaces/b']));

      routing.unregister(1);

      expect(routing.openWorkspaces()).toEqual(new Set(['/workspaces/b']));
    });

    it('collapses two views on the same project to one open entry', () => {
      const routing = new ViewRouting();
      routing.register(1, '/workspaces/a', fakeSink().sink);
      routing.register(2, '/workspaces/a', fakeSink().sink);

      expect(routing.openWorkspaces()).toEqual(new Set(['/workspaces/a']));
    });
  });

  describe('canonicalization', () => {
    let scratchDir: string | undefined;

    afterEach(() => {
      if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
      scratchDir = undefined;
    });

    it('matches a symlinked spelling of the same real project', () => {
      scratchDir = mkdtempSync(join(tmpdir(), 'onl-2203-view-routing-'));
      const real = join(scratchDir, 'real-workspace');
      const alias = join(scratchDir, 'alias-workspace');
      mkdirSync(real);
      symlinkSync(real, alias);

      const routing = new ViewRouting();
      const view = fakeSink();
      routing.register(1, alias, view.sink);

      routing.routeTo(real, 'agent:event', { type: 'ping' });

      expect(view.received.length).toBe(1);
    });
  });
});
