import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import type { AgentCommandAcceptance, ClientCommand, FrameHealth } from '@studio/events';
import type { CanvasFlowNode } from '../model.js';
import { useCanvasStore } from '../store.js';
import { openInspirationChat } from './chat.js';

const frameNode = (id: string, health: FrameHealth): CanvasFlowNode =>
  ({ id, type: 'frame', position: { x: 0, y: 0 }, data: { health } }) as unknown as CanvasFlowNode;

const setFrame = (health: FrameHealth | null): void => {
  useCanvasStore.setState({ nodes: health === null ? [] : [frameNode('f1', health)] });
};

function fakeBridge(): { sent: ClientCommand[]; bridge: { agentCommand: (command: ClientCommand) => Promise<AgentCommandAcceptance> } } {
  const sent: ClientCommand[] = [];
  return { sent, bridge: { agentCommand: async (command) => (sent.push(command), { accepted: true }) } };
}

describe('openInspirationChat', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    setFrame(null);
  });

  it('asks once, when the page has loaded', () => {
    setFrame('loading');
    const { sent, bridge } = fakeBridge();
    openInspirationChat('f1', { bridge, waitMs: 1_000 });
    expect(sent).toEqual([]);
    setFrame('live');
    setFrame('loading');
    setFrame('live');
    expect(sent).toEqual([{ type: 'inspiration.start', frameId: 'f1' }]);
  });

  it('asks nothing when the page fails or the Frame goes', () => {
    setFrame('loading');
    const failed = fakeBridge();
    openInspirationChat('f1', { bridge: failed.bridge, waitMs: 1_000 });
    setFrame('unreachable');
    setFrame('live');
    expect(failed.sent).toEqual([]);

    setFrame('loading');
    const removed = fakeBridge();
    openInspirationChat('f1', { bridge: removed.bridge, waitMs: 1_000 });
    setFrame(null);
    setFrame('live');
    expect(removed.sent).toEqual([]);
  });

  it('asks nothing once the wait has run out', () => {
    setFrame('loading');
    const { sent, bridge } = fakeBridge();
    openInspirationChat('f1', { bridge, waitMs: 1_000 });
    jest.advanceTimersByTime(1_001);
    setFrame('live');
    expect(sent).toEqual([]);
  });
});
