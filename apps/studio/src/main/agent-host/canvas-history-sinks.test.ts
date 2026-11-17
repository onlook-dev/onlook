import { describe, expect, it } from 'bun:test';
import { canvasHistorySinks } from './canvas-history-sinks.js';

describe('canvas history sinks', () => {
  it('routes undo and redo to the matching project-bound host operation', async () => {
    const calls: string[] = [];
    const sinks = canvasHistorySinks('/repo/worktree', {
      undo: async (path) => {
        calls.push(`undo:${path}`);
        return { ok: true, applied: false, frames: [] };
      },
      redo: async (path) => {
        calls.push(`redo:${path}`);
        return { ok: true, applied: false, frames: [] };
      },
    });

    await sinks.onUndoCanvas();
    await sinks.onRedoCanvas();

    expect(calls).toEqual(['undo:/repo/worktree', 'redo:/repo/worktree']);
  });
});
