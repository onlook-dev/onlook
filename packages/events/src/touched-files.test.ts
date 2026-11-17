import { describe, expect, it } from 'bun:test';
import type { StudioEvent, ToolFileChange, TouchedFileView } from './events.js';
import { touchedFilesOf } from './touched-files.js';

const base = { sessionId: 's', eventId: 'e', seq: 1, ts: 1 };
const turn = (turnId: string): StudioEvent => ({ ...base, type: 'turn.started', turnId });
const start = (toolCallId: string, fileChanges: ToolFileChange[]): StudioEvent => ({
  ...base, type: 'tool.start', toolCallId, name: 'Edit', kind: 'edit', title: 'Edit', status: 'in_progress', fileChanges,
});
const end = (toolCallId: string, status: 'completed' | 'canceled' | 'failed' | 'denied'): StudioEvent => ({ ...base, type: 'tool.end', toolCallId, status });
const file = (path: string, operation: ToolFileChange['operation'] = 'edit'): ToolFileChange => ({ path, operation });

describe('latest turn touched files', () => {
  it('replaces partial counts, sums completed calls once and excludes unsuccessful calls', () => {
    const change = { ...file('a.ts'), additions: 2, deletions: 1 };
    const update: StudioEvent = { ...base, type: 'tool.update', toolCallId: 'a', fileChanges: [{ ...change, additions: 4 }] };
    const events = [turn('t1'), start('a', [change]), update, update, end('a', 'completed'), start('b', [change]), end('b', 'completed'), start('c', [change]), end('c', 'denied')];
    expect(touchedFilesOf(events)).toEqual([{ path: 'a.ts', status: 'denied', hasSuccessfulChange: true, additions: 6, deletions: 2 }]);
    expect(touchedFilesOf([turn('t1'), start('a', [change]), end('a', 'failed')])).toEqual([{ path: 'a.ts', status: 'failed' }]);
  });
  it('keeps counts unknown when one successful edit has no counts', () => {
    expect(touchedFilesOf([turn('t1'), start('a', [{ ...file('a.ts'), additions: 2, deletions: 1 }]), end('a', 'completed'), start('b', [file('a.ts')]), end('b', 'completed')])).toEqual([{ path: 'a.ts', status: 'edited', hasSuccessfulChange: true }]);
  });
  it('grows at start, ignores reads and coalesces paths in first-touch order', () => {
    const events = [turn('t1'), start('a', [file('src/a.ts'), file('src/b.ts', 'create')]), start('read', []), start('b', [file('src/a.ts')])];
    expect(touchedFilesOf(events)).toEqual([{ path: 'src/a.ts', status: 'editing' }, { path: 'src/b.ts', status: 'editing' }]);
  });

  it('settles mixed operations per file and retains creation across subsequent edits', () => {
    const events = [turn('t1'), start('a', [file('new.ts', 'create'), file('old.ts', 'delete'), file('edit.ts')]), end('a', 'completed')];
    expect(touchedFilesOf(events)).toEqual([{ path: 'new.ts', status: 'created', hasSuccessfulChange: true }, { path: 'old.ts', status: 'deleted', hasSuccessfulChange: true }, { path: 'edit.ts', status: 'edited', hasSuccessfulChange: true }]);
    expect(touchedFilesOf([...events, start('b', [file('new.ts')]), end('b', 'completed')])[0]?.status).toBe('created');
  });

  it.each(['canceled', 'failed', 'denied'] as const)('never completes %s, even after late success', (status) => {
    expect(touchedFilesOf([turn('t1'), start('a', [file('a.ts')]), end('a', status), end('a', 'completed')]))
      .toEqual([{ path: 'a.ts', status: status === 'canceled' ? 'stopped' : status }]);
  });

  it('keeps the stopped list and rejects late tools or updates after turn end', () => {
    const stopped: StudioEvent[] = [turn('t1'), start('a', [file('a.ts')]), end('a', 'completed'), start('b', [file('b.ts')]), { ...base, type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' }];
    const expected: TouchedFileView[] = [{ path: 'a.ts', status: 'edited', hasSuccessfulChange: true }, { path: 'b.ts', status: 'stopped' }];
    expect(touchedFilesOf(stopped)).toEqual(expected);
    expect(touchedFilesOf([...stopped, end('b', 'completed'), start('late', [file('late.ts')])])).toEqual(expected);
    expect(touchedFilesOf([...stopped, turn('t2')])).toEqual([]);
  });

  it('accepts paths learned after an empty start without resurrecting a canceled tool', () => {
    const update: StudioEvent = { ...base, type: 'tool.update', toolCallId: 'a', fileChanges: [file('a.ts')] };
    expect(touchedFilesOf([turn('t1'), start('a', []), update])[0]?.status).toBe('editing');
    expect(touchedFilesOf([turn('t1'), start('a', []), end('a', 'canceled'), update])[0]?.status).toBe('stopped');
  });

  it('keeps a file editing until all overlapping changes finish', () => {
    expect(touchedFilesOf([turn('t1'), start('a', [file('a.ts')]), start('b', [file('a.ts')]), end('a', 'completed')])[0]?.status).toBe('editing');
  });

  it('uses revised operations while running but freezes the operation on completion', () => {
    const revision: StudioEvent = { ...base, type: 'tool.update', toolCallId: 'a', fileChanges: [file('a.ts', 'delete')] };
    expect(touchedFilesOf([turn('t1'), start('a', [file('a.ts')]), revision, end('a', 'completed')]))
      .toEqual([{ path: 'a.ts', status: 'deleted', hasSuccessfulChange: true }]);
    expect(touchedFilesOf([turn('t1'), start('a', [file('a.ts')]), end('a', 'completed'), revision]))
      .toEqual([{ path: 'a.ts', status: 'edited', hasSuccessfulChange: true }]);
  });
});
