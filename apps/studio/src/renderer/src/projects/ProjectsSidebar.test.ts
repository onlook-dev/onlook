import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { ProjectsSidebar, reorderedWorkspaceIds, type ProjectsSidebarProps } from './ProjectsSidebar.js';

const ROWS = [
  { id: 'a', name: 'alpha' },
  { id: 'b', name: 'bravo' },
  { id: 'c', name: 'charlie' },
];

describe('reorderedWorkspaceIds (ONL-2523)', () => {
  test('moves the dragged row to the drop edge', () => {
    expect(reorderedWorkspaceIds(ROWS, 'c', { id: 'a', edge: 'before' }, [])).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(reorderedWorkspaceIds(ROWS, 'a', { id: 'c', edge: 'after' }, [])).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  test('leaves a row being removed out of the order it commits', () => {
    expect(reorderedWorkspaceIds(ROWS, 'c', { id: 'a', edge: 'before' }, ['b'])).toEqual([
      'c',
      'a',
    ]);
  });

  test('commits nothing when the dragged row is the target', () => {
    expect(reorderedWorkspaceIds(ROWS, 'b', { id: 'b', edge: 'before' }, [])).toBeUndefined();
  });

  test('commits nothing when the target is the row being removed', () => {
    expect(reorderedWorkspaceIds(ROWS, 'a', { id: 'b', edge: 'after' }, ['b'])).toBeUndefined();
  });
});

function rail(props: Partial<ProjectsSidebarProps> = {}): string {
  return renderToStaticMarkup(createElement(ProjectsSidebar, { workspaces: ROWS, ...props }));
}

describe('the archive section (ONL-2523)', () => {
  test('is absent while nothing is archived', () => {
    expect(rail()).not.toContain(t('projects.section.archive'));
  });

  test('appears with the first archived workspace', () => {
    const markup = rail({ archivedWorkspaces: [{ id: 'z', name: 'zulu' }] });

    expect(markup).toContain(t('projects.section.archive'));
    expect(markup).toContain('zulu');
  });

  test('keeps the workspaces heading, which carries the add control', () => {
    expect(rail({ workspaces: [] })).toContain(t('projects.section.workspaces'));
  });
});
