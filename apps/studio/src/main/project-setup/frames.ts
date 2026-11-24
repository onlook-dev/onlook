import { MAX_CANVAS_OPS_PER_REQUEST, type CanvasOp } from '@studio/events';
import { t } from '@studio/i18n';
import { portFollowOps, type ApplyCanvasOps } from '../canvas/authors.js';
import { drainCanvasOps } from '../canvas/duplicate.js';

function assertApplied(answer: unknown, port: number): void {
  if (typeof answer === 'object' && answer !== null && 'ok' in answer && answer.ok === false) {
    throw new Error(t('projectSetup.failure.portMove', { port }));
  }
}

export function createSetupPortMove(apply: ApplyCanvasOps) {
  return async (cwd: string, from: number, to: number, signal: AbortSignal): Promise<() => Promise<void>> => {
    const changed = new Map<string, { docId: string; before: string; after: string }>();
    const undo = async (): Promise<void> => {
      assertApplied(await drainCanvasOps((resolve) => apply('system', resolve, cwd), (doc) => {
        const ops: CanvasOp[] = [];
        for (const [id, change] of changed) {
          const node = doc.nodes[id];
          if (doc.docId === change.docId && node?.kind === 'browser' && node.content.homeUrl === change.after && node.content.pendingHomeUrl === undefined) {
            ops.push({ type: 'set-home-url', id, homeUrl: change.before });
          }
          if (ops.length === MAX_CANVAS_OPS_PER_REQUEST) break;
        }
        return ops;
      }), from);
    };
    try {
      const answer = await drainCanvasOps((resolve) => apply('system', (doc) => {
        if (signal.aborted) return { reason: t('projectSetup.failure.canceled') };
        return resolve(doc);
      }, cwd), (doc) => {
        const ops = portFollowOps(doc, from, to);
        for (const op of ops) {
          if (op.type !== 'set-home-url') continue;
          const node = doc.nodes[op.id];
          if (node?.kind === 'browser') changed.set(op.id, { docId: doc.docId, before: node.content.homeUrl, after: op.homeUrl });
        }
        return ops;
      });
      assertApplied(answer, to);
      signal.throwIfAborted();
      return undo;
    } catch (error) {
      await undo();
      throw error;
    }
  };
}
