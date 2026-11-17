import type { CanvasHistoryResult } from '../canvas/index.js';
import { redoAgentCanvas, undoAgentCanvas } from '../canvas/index.js';
import type { StudioToolSinks } from './studio-tools.js';

interface HistoryDeps {
  undo(worktreePath: string): Promise<CanvasHistoryResult>;
  redo(worktreePath: string): Promise<CanvasHistoryResult>;
}

const historyDeps: HistoryDeps = { undo: undoAgentCanvas, redo: redoAgentCanvas };

export function canvasHistorySinks(
  worktreePath: string,
  deps: HistoryDeps = historyDeps,
): Pick<StudioToolSinks, 'onUndoCanvas' | 'onRedoCanvas'> {
  return {
    onUndoCanvas: () => deps.undo(worktreePath),
    onRedoCanvas: () => deps.redo(worktreePath),
  };
}
