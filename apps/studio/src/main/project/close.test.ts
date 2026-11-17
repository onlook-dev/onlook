import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdtempSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NO_FRAME_QUOTES, type FrameQuotes } from '@studio/events';
import { FrameQuoteBook } from '../agent-host/frame-quotes.js';
import { recordProjectOpened, resetProjectOpenedForTesting } from '../agent-host/project-opened.js';
import { noteTabClosed, observeTabClosed, resetTabClosed } from '../tabs/closed.js';
import * as telemetry from '../telemetry/index.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { projectStateHeld } from './state.js';

const savedState = process.env['STUDIO_STATE_ROOT'];
const savedWorkspaces = process.env['STUDIO_WORKSPACE_ROOT'];
let real: string;
let link: string;
let other: string;

beforeEach(() => {
  process.env['STUDIO_STATE_ROOT'] = mkdtempSync(join(tmpdir(), 'project-close-state-'));
  process.env['STUDIO_WORKSPACE_ROOT'] = mkdtempSync(join(tmpdir(), 'project-close-registry-'));
  real = realpathSync(mkdtempSync(join(tmpdir(), 'project-close-')));
  other = realpathSync(mkdtempSync(join(tmpdir(), 'project-close-other-')));
  link = join(realpathSync(mkdtempSync(join(tmpdir(), 'project-close-link-'))), 'alias');
  symlinkSync(real, link);
  resetWorkspaceCache(); resetCanvasRegistryCache(); resetProjectOpenedForTesting(); resetTabClosed();
});
afterEach(() => {
  if (savedState === undefined) delete process.env['STUDIO_STATE_ROOT']; else process.env['STUDIO_STATE_ROOT'] = savedState;
  if (savedWorkspaces === undefined) delete process.env['STUDIO_WORKSPACE_ROOT']; else process.env['STUDIO_WORKSPACE_ROOT'] = savedWorkspaces;
  resetWorkspaceCache(); resetCanvasRegistryCache(); resetProjectOpenedForTesting(); resetTabClosed();
});

test('a Project\'s frame quotes are let go when its last Tab closes, before the listener runs, and no sooner', () => {
  const emitted: { cwd: string; quotes: FrameQuotes }[] = [];
  const book = new FrameQuoteBook({ emit: (cwd, quotes) => emitted.push({ cwd, quotes }), lifted: () => {}, now: () => 0, liftsAtTurnEnd: () => true, showsPage: () => true });
  book.place(link, { id: 'f1', kind: 'frame', homeUrl: 'http://localhost:3000/' }, 'A bakery site');
  book.place(other, { id: 'f2', kind: 'frame', homeUrl: 'http://localhost:3000/' }, 'Another');
  emitted.length = 0;
  const seenByListener: FrameQuotes[] = [];
  observeTabClosed((worktree) => seenByListener.push(book.view(worktree)));

  expect(projectStateHeld(real)).toContain('agent.frame-quotes');
  expect(book.view(real).byFrame).toEqual({ f1: 'A bakery site' });
  expect(emitted).toEqual([]);

  noteTabClosed(real);

  expect(seenByListener).toEqual([NO_FRAME_QUOTES]);
  expect(emitted).toEqual([{ cwd: real, quotes: NO_FRAME_QUOTES }]);
  expect(book.view(link)).toEqual(NO_FRAME_QUOTES);
  expect(projectStateHeld(real)).not.toContain('agent.frame-quotes');
  expect(book.view(other).byFrame).toEqual({ f2: 'Another' });
  expect(projectStateHeld(other)).toContain('agent.frame-quotes');
});

test('a Project opened under one spelling and closed under another counts as opened again next time', () => {
  rememberProject({ workspacePath: real, workspaceName: 'alpha', branchName: 'alpha', baseBranch: 'main', sourceRepoName: 'alpha-repo', sourcePath: real, sourceRepoRoot: real, repoIdentity: 'fixture/alpha', copiedEnvFiles: [] });
  const capture = spyOn(telemetry, 'capture').mockImplementation(() => true);
  const opens = (): number => capture.mock.calls.filter(([name]) => name === 'project_opened').length;
  try {
    recordProjectOpened(link);
    recordProjectOpened(real);
    expect(opens()).toBe(1);
    expect(projectStateHeld(real)).toContain('agent.project-opened');

    noteTabClosed(real);

    expect(projectStateHeld(link)).not.toContain('agent.project-opened');
    recordProjectOpened(link);
    expect(opens()).toBe(2);
  } finally { capture.mockRestore(); }
});
