import { describe, expect, it } from 'bun:test';
import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { t } from '@studio/i18n';
import { emptyCanvasState, hasJoinedCharacters, shortName } from './emptyCanvasState.js';

const workspace = { sourceRepoName: 'silt', workspaceName: 'amber-heron' } as WorkspaceCreated;
const known = { isDocumentKnown: true, isChatKnown: true };
const show = (create: ProjectCreateState | null, needsAnswer = false, hasLiveServer = false) =>
  emptyCanvasState(create, { hasLiveServer, needsAnswer, ...known });

describe('which state the empty canvas shows', () => {
  it('shows the copy while the project is planned or copied, naming the repo only once it is copying', () => {
    expect(show({ kind: 'planning', sourceRepoName: 'folder' })).toStrictEqual({ kind: 'copying' });
    expect(show({ kind: 'copying', sourceRepoName: 'silt', workspaceName: 'amber-heron' })).toStrictEqual({ kind: 'copying', repo: 'silt' });
  });

  it('keeps the normal canvas while setup runs in the background', () => {
    expect(show({ kind: 'installing', workspace }).kind).toBe('ready');
    expect(show({ kind: 'starting', workspace }).kind).toBe('ready');
    expect(show({ kind: 'ready', workspace }).kind).toBe('ready');
    expect(show({ kind: 'ready', workspace: { ...workspace, comfort: 'ship' } }).kind).toBe('ready');
  });

  it('rests on ready once a design-only setup ends on its ready record', () => {
    expect(show({ kind: 'ready', workspace: { ...workspace, comfort: 'design' } }).kind).toBe('ready');
  });

  it('shows the question over any setup phase while the agent waits on an answer', () => {
    expect(show({ kind: 'installing', workspace }, true).kind).toBe('question');
    expect(show(null, true).kind).toBe('question');
  });

  it('shows the failure the narration row reports, by stage, over a parked question', () => {
    expect(show({ kind: 'failed', sourceRepoName: 'silt', phase: 'copying' }, true)).toStrictEqual({ kind: 'failed', stage: 'setup' });
    expect(show({ kind: 'failed', sourceRepoName: 'silt', phase: 'starting', workspace })).toStrictEqual({ kind: 'failed', stage: 'preview' });
    expect(show({ kind: 'failed', sourceRepoName: 'silt', phase: 'installing', workspace })).toStrictEqual({ kind: 'failed', stage: 'preview' });
  });

  it('rests on ready when no failure row shows: a refusal, or a failure behind a live server', () => {
    expect(show({ kind: 'refused', sourceRepoName: 'silt', reason: 'no-base-ref' }).kind).toBe('ready');
    expect(show({ kind: 'failed', sourceRepoName: 'silt', phase: 'starting', workspace }, false, true).kind).toBe('ready');
  });

  it('rests on ready once setup is over or never ran', () => {
    for (const create of [null, { kind: 'live', workspace }, { kind: 'canceled' }] as const) expect(show(create).kind).toBe('ready');
  });
});

const blank = { hasLiveServer: false, needsAnswer: false, isBlankProject: true, isBlankMomentOn: true, hasNodes: false, hasUserMessage: false, ...known };
const ready = { kind: 'ready', workspace } as const;

describe('when a blank project offers ideas', () => {
  it('offers ideas on a blank project with no frames before the person has spoken', () => {
    expect(emptyCanvasState(ready, blank)).toStrictEqual({ kind: 'ideas' });
    expect(emptyCanvasState(null, blank)).toStrictEqual({ kind: 'ideas' });
  });

  it('offers ideas while the starter installs and starts in the background', () => {
    expect(emptyCanvasState({ kind: 'installing', workspace }, blank).kind).toBe('ideas');
    expect(emptyCanvasState({ kind: 'starting', workspace }, blank).kind).toBe('ideas');
  });

  it('goes quiet once the person has sent a message and no frame has landed', () => {
    expect(emptyCanvasState(ready, { ...blank, hasUserMessage: true })).toStrictEqual({ kind: 'quiet' });
  });

  it('keeps the normal canvas for an imported project', () => {
    expect(emptyCanvasState(ready, { ...blank, isBlankProject: false }).kind).toBe('ready');
    expect(emptyCanvasState(ready, { ...blank, isBlankProject: false, hasUserMessage: true }).kind).toBe('ready');
  });

  it('keeps the normal canvas once the project has frames', () => {
    expect(emptyCanvasState(ready, { ...blank, hasNodes: true }).kind).toBe('ready');
  });

  it('keeps the normal canvas with the flag off, spoken or not', () => {
    expect(emptyCanvasState(ready, { ...blank, isBlankMomentOn: false }).kind).toBe('ready');
    expect(emptyCanvasState(ready, { ...blank, isBlankMomentOn: false, hasUserMessage: true }).kind).toBe('ready');
  });

  it("keeps a blank project's own centre while the agent waits on an answer", () => {
    expect(emptyCanvasState(ready, { ...blank, needsAnswer: true }).kind).toBe('ideas');
    expect(emptyCanvasState(ready, { ...blank, needsAnswer: true, hasUserMessage: true }).kind).toBe('quiet');
  });

  it('shows main’s question centre on a blank project with blank-first-moment off', () => {
    expect(emptyCanvasState(ready, { ...blank, needsAnswer: true, isBlankMomentOn: false }).kind).toBe('question');
  });

  it('shows the question on an imported project while the agent waits on an answer', () => {
    expect(emptyCanvasState(ready, { ...blank, isBlankProject: false, needsAnswer: true }).kind).toBe('question');
  });

  it('lets a failure win over the ideas', () => {
    expect(emptyCanvasState({ kind: 'failed', sourceRepoName: 'silt', phase: 'starting', workspace }, blank).kind).toBe('failed');
  });
});

describe('before the open project has told the canvas what it holds', () => {
  it('shows nothing on a blank project until its document lands, though it has no objects yet', () => {
    expect(emptyCanvasState(null, { ...blank, isDocumentKnown: false })).toStrictEqual({ kind: 'unknown' });
    expect(emptyCanvasState(ready, { ...blank, isDocumentKnown: false })).toStrictEqual({ kind: 'unknown' });
  });

  it('shows nothing on an imported project until its document lands', () => {
    expect(emptyCanvasState(null, { ...blank, isBlankProject: false, isDocumentKnown: false })).toStrictEqual({ kind: 'unknown' });
  });

  it('shows nothing on an empty blank project until main says whether its chat holds a message', () => {
    expect(emptyCanvasState(null, { ...blank, isChatKnown: false })).toStrictEqual({ kind: 'unknown' });
    expect(emptyCanvasState(null, { ...blank, isChatKnown: false, hasUserMessage: true })).toStrictEqual({ kind: 'unknown' });
  });

  it('does not wait on the chat where the chat changes nothing: an imported project, or a blank one with objects or the flag off', () => {
    expect(emptyCanvasState(null, { ...blank, isChatKnown: false, isBlankProject: false }).kind).toBe('ready');
    expect(emptyCanvasState(null, { ...blank, isChatKnown: false, hasNodes: true }).kind).toBe('ready');
    expect(emptyCanvasState(null, { ...blank, isChatKnown: false, isBlankMomentOn: false }).kind).toBe('ready');
  });

  it('still shows the copy, the failure and the question, which are not read from the document', () => {
    const unknown = { ...blank, isDocumentKnown: false, isChatKnown: false };
    expect(emptyCanvasState({ kind: 'copying', sourceRepoName: 'silt', workspaceName: 'amber-heron' }, unknown).kind).toBe('copying');
    expect(emptyCanvasState({ kind: 'failed', sourceRepoName: 'silt', phase: 'copying' }, unknown).kind).toBe('failed');
    expect(emptyCanvasState(null, { ...unknown, isBlankProject: false, needsAnswer: true }).kind).toBe('question');
  });
});

describe('the repo name the copying caption shows', () => {
  it('keeps a short name whole', () => {
    expect(shortName('silt')).toBe('silt');
  });

  it('cuts a long name after 23 whole characters, never splitting a flag or a joined emoji', () => {
    const kept = `${'a'.repeat(21)}🇯🇵👨‍👩‍👧`;
    expect(shortName(`${kept}tail`)).toBe(t('canvas.empty.truncated', { name: kept }));
  });
});

describe('which captions the character morph can carry', () => {
  it('flags text with a character built from several code points', () => {
    expect(hasJoinedCharacters('Creating a copy of 🇯🇵')).toBe(true);
    expect(hasJoinedCharacters('Creating a copy of 👨‍👩‍👧')).toBe(true);
  });

  it('passes plain text and single-code-point emoji', () => {
    expect(hasJoinedCharacters('Creating a copy of silt 😀')).toBe(false);
  });
});
