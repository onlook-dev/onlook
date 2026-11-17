import type { StudioBridge } from '@studio/events';
import { ignoreRefusal } from '../../refusal.js';
import { isFrameFlowNode } from '../model.js';
import { useCanvasStore, type CanvasState } from '../store.js';
import { studio } from '../../bridge.js';

const INSPIRATION_CHAT_WAIT_MS = 30_000;

type FramePage = 'loading' | 'live' | 'gone';

function framePage(state: CanvasState, frameId: string): FramePage {
  const node = state.nodes.find((candidate) => candidate.id === frameId);
  if (node === undefined || !isFrameFlowNode(node) || node.data.health === 'unreachable') return 'gone';
  return node.data.health === 'live' ? 'live' : 'loading';
}

/** Once the Frame's page has loaded, asks main to open the agent's turn on it; a page that fails, a Frame removed, or the wait running out sends nothing. */
export function openInspirationChat(
  frameId: string,
  { bridge = studio(), waitMs = INSPIRATION_CHAT_WAIT_MS }: { bridge?: Pick<StudioBridge, 'agentCommand'>; waitMs?: number } = {},
): () => void {
  let done = false;
  let unsubscribe = (): void => undefined;
  const finish = (): void => {
    done = true;
    clearTimeout(timer);
    unsubscribe();
  };
  const check = (state: CanvasState): void => {
    if (done) return;
    const page = framePage(state, frameId);
    if (page === 'loading') return;
    finish();
    if (page === 'live') void bridge.agentCommand({ type: 'inspiration.start', frameId }).catch(ignoreRefusal('canvas', 'inspiration chat'));
  };
  const timer = setTimeout(finish, waitMs);
  unsubscribe = useCanvasStore.subscribe(check);
  check(useCanvasStore.getState());
  return finish;
}
