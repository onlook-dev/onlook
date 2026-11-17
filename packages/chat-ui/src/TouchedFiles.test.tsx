import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { foldSessionState, touchedFilesOf, type StudioEvent, type TouchedFileView } from '@studio/events';
import { TouchedFiles, type TouchedFilesProps } from './TouchedFiles.js';

const strings: TouchedFilesProps['strings'] = {
  title: 'Files changed',
  editedOne: 'Edited 1 file', editedMany: 'Edited {count} files', showOneMore: 'Show 1 more file', showMore: 'Show {count} more files', showLess: 'Show fewer files',
  open: 'Open {path}',
  statuses: { editing: 'Editing', edited: 'Edited', created: 'Created', deleted: 'Deleted', stopped: 'Stopped', failed: 'Failed', denied: 'Denied' },
};

function render(files: readonly TouchedFileView[]): string {
  return renderToStaticMarkup(<TouchedFiles files={files} strings={strings} onOpen={() => {}} />);
}

describe('Files changed', () => {
  it('keeps successful uncounted files in the header after later denied attempts without inventing a partial total', () => {
    const base = { sessionId: 's', eventId: 'e', seq: 1, ts: 1 };
    const events: StudioEvent[] = [
      { ...base, type: 'turn.started', turnId: 'one' },
      { ...base, type: 'tool.start', toolCallId: 'write', name: 'Write', kind: 'edit', title: 'Write', status: 'in_progress', fileChanges: [{ path: 'a.ts', operation: 'edit' }] },
      { ...base, type: 'tool.end', toolCallId: 'write', status: 'completed' },
      { ...base, type: 'tool.start', toolCallId: 'denied', name: 'Edit', kind: 'edit', title: 'Edit', status: 'in_progress', fileChanges: [{ path: 'a.ts', operation: 'edit' }] },
      { ...base, type: 'tool.end', toolCallId: 'denied', status: 'denied' },
      { ...base, type: 'tool.start', toolCallId: 'create', name: 'Write', kind: 'edit', title: 'Write', status: 'in_progress', fileChanges: [{ path: 'b.ts', operation: 'create', additions: 2, deletions: 0 }] },
      { ...base, type: 'tool.end', toolCallId: 'create', status: 'completed' },
      { ...base, type: 'turn.ended', turnId: 'one', stopReason: 'end_turn' },
    ];
    const markup = render(touchedFilesOf(events));
    expect(markup).toContain('Edited 2 files');
    expect(markup).toContain('Denied');
    expect(markup).not.toContain('touched-files-totals');
    expect(foldSessionState(events).latestTurnId).toBe('one');
    expect(foldSessionState([...events, { ...base, type: 'turn.started', turnId: 'two' }]).latestTurnId).toBe('two');
  });
  it('has no empty panel', () => {
    expect(render([])).toBe('');
  });

  it('keeps every state distinct and names each file-opening button', () => {
    const statuses = Object.keys(strings.statuses) as TouchedFileView['status'][];
    for (const status of statuses) {
      const markup = render([{ path: `src/${status}.tsx`, status }]);
      expect(markup).toContain('data-testid="touched-files"');
      expect(markup).toContain(`data-status="${status}"`);
      expect(markup).toContain(`data-path="src/${status}.tsx"`);
      expect(markup).toContain(`aria-label="Open src/${status}.tsx"`);
      expect(markup).toContain(strings.statuses[status]);
    }
  });

  it('shows full paths even when filenames match, with bounded vertical scrolling', () => {
    const files = ['src/header/Button.tsx', 'src/footer/Button.tsx', `${'nested/'.repeat(24)}Button.tsx`].map((path) => ({ path, status: 'editing' as const }));
    const markup = render(files);
    for (const { path } of files) expect(markup).toContain(`>${path}</span>`);
    expect(markup).toContain('overflow-wrap:anywhere');
    expect(markup).toContain('max-height:240px');
    expect(markup).toContain('overflow-y:auto');
    expect(markup).not.toContain('disabled=');
  });

  it('renders supplied copy rather than hard-coded labels', () => {
    const markup = renderToStaticMarkup(<TouchedFiles files={[{ path: 'src/main.ts', status: 'stopped' }]} strings={{ ...strings, title: 'ZZ title', open: 'ZZ {path}', statuses: { ...strings.statuses, stopped: 'ZZ stopped' } }} onOpen={() => {}} />);
    expect(markup).toContain('ZZ title');
    expect(markup).toContain('aria-label="ZZ src/main.ts"');
    expect(markup).toContain('ZZ stopped');
    expect(markup).not.toContain('Files changed');
  });

  it('shows per-file and total counts with singular and plural summaries', () => {
    const file = { path: 'src/a.ts', status: 'edited' as const, additions: 4, deletions: 2 };
    expect(render([file])).toContain('Edited 1 file');
    const markup = render([file, { ...file, path: 'src/b.ts', additions: 3, deletions: 1 }]);
    expect(markup).toContain('Edited 2 files');
    expect(markup).toContain('+7');
    expect(markup).toContain('−3');
    expect(markup).toContain('var(--color-text-green)');
    expect(markup).toContain('var(--color-text-red)');
  });

  it('collapses after three files but includes hidden files in totals', () => {
    const files = Array.from({ length: 5 }, (_, index) => ({ path: `src/${index}.ts`, status: 'edited' as const, additions: 2, deletions: 1 }));
    const markup = render(files);
    expect(markup.match(/data-testid="touched-file"/g)).toHaveLength(3);
    expect(markup).toContain('Show 2 more files');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('+10');
    expect(markup).toContain('−5');
    expect(markup).not.toContain('data-path="src/4.ts"');
    expect(render(files.slice(0, 4))).toContain('Show 1 more file');
  });

  it('does not invent totals for stored turns without counts or claim failed attempts were edited', () => {
    expect(render([{ path: 'legacy.ts', status: 'edited' }])).not.toContain('touched-files-totals');
    const markup = render([{ path: 'denied.ts', status: 'denied' }]);
    expect(markup).toContain('Files changed');
    expect(markup).not.toContain('Edited 1 file');
  });
});
