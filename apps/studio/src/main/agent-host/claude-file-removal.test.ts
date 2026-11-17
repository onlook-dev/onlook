import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { foldSessionState } from '@studio/events';
import { readCodeFile } from '../code/read.js';
import { deleteProjectFile, deleteProjectFileTool } from './delete-project-file.js';
import { EventLog } from './event-log.js';
import { DELETE_PROJECT_FILE_TOOL } from './tool-names.js';

let worktree: string;

beforeEach(() => {
  const scratch = resolve('.scratch/tmp');
  mkdirSync(scratch, { recursive: true });
  worktree = mkdtempSync(join(scratch, 'claude-file-removal-'));
  mkdirSync(join(worktree, 'src'));
  writeFileSync(join(worktree, 'src/old.ts'), 'original');
});

afterEach(() => rmSync(worktree, { recursive: true, force: true }));

describe('Claude project file removal', () => {
  const started = (): EventLog => {
    const log = new EventLog({ sessionId: 'claude', cwd: worktree, emit: () => {} });
    log.beginTurn();
    log.push({ type: 'turn.started', turnId: log.turnId });
    log.ensureToolStart('remove', DELETE_PROJECT_FILE_TOOL, { path: 'src/old.ts' }, 'in_progress', { source: 'hook' });
    return log;
  };

  it('appears before deletion, settles only after success and opens the missing-file preview', async () => {
    const log = started();
    expect(foldSessionState(log.events).touchedFiles).toEqual([{ path: 'src/old.ts', status: 'editing' }]);
    expect(readFileSync(join(worktree, 'src/old.ts'), 'utf8')).toBe('original');
    const tool = deleteProjectFileTool((path, signal) => deleteProjectFile(worktree, path, signal));
    const result = await tool.handler({ path: 'src/old.ts' }, {});
    expect(result.isError).not.toBe(true);
    log.endTool('remove', 'completed');
    log.push({ type: 'turn.ended', turnId: log.turnId, stopReason: 'end_turn' });
    expect(foldSessionState(log.events).touchedFiles).toEqual([{ path: 'src/old.ts', status: 'deleted', hasSuccessfulChange: true }]);
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(false);
    expect(readCodeFile(worktree, { path: 'src/old.ts' })).toMatchObject({ ok: false, code: 'not-found' });
  });

  it('never deletes or completes after Stop, including a late success', async () => {
    const log = started();
    const controller = new AbortController();
    controller.abort();
    const tool = deleteProjectFileTool((path, signal) => deleteProjectFile(worktree, path, signal));
    expect(await tool.handler({ path: 'src/old.ts' }, { signal: controller.signal })).toMatchObject({ isError: true });
    log.endTool('remove', 'canceled');
    log.push({ type: 'turn.ended', turnId: log.turnId, stopReason: 'interrupted' });
    log.endTool('remove', 'completed');
    expect(foldSessionState(log.events).touchedFiles).toEqual([{ path: 'src/old.ts', status: 'stopped' }]);
    expect(readFileSync(join(worktree, 'src/old.ts'), 'utf8')).toBe('original');
  });

  it('preserves a denied file without claiming it was deleted', () => {
    const log = started();
    log.endTool('remove', 'denied');
    expect(foldSessionState(log.events).touchedFiles).toEqual([{ path: 'src/old.ts', status: 'denied' }]);
    expect(readFileSync(join(worktree, 'src/old.ts'), 'utf8')).toBe('original');
  });
});
