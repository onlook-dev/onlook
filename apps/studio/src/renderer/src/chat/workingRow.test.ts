import { describe, expect, it } from 'bun:test';
import { t } from '@studio/i18n';
import {
  INITIAL_WORKING_ROW_STATE,
  workingRowCopy,
  workingRowReducer,
  type ResolvedFrame,
  type WorkingRowState,
} from './workingRow.js';

const resolvers: Record<string, ResolvedFrame> = {
  fr_1: { name: 'Pricing', link: '[Pricing](onlook://project/repo/frame/fr_1)' },
  fr_2: { name: 'Checkout', link: '[Checkout](onlook://project/repo/frame/fr_2)' },
};
const resolve = (id: string): ResolvedFrame | undefined => resolvers[id];

describe('workingRowReducer', () => {
  it('an idle session ignores a turn ending — no stray row (the inverse criterion)', () => {
    const state = workingRowReducer(INITIAL_WORKING_ROW_STATE, { type: 'streaming', isStreaming: false });
    expect(state).toEqual(INITIAL_WORKING_ROW_STATE);
  });

  it('a turn starting goes working with no frames yet, forgetting the LAST turn entirely', () => {
    const done: WorkingRowState = { phase: 'done', frameIds: ['fr_1'] };
    const state = workingRowReducer(done, { type: 'streaming', isStreaming: true });
    expect(state).toEqual({ phase: 'working', frameIds: [] });
  });

  it('a frames push while idle is dropped — a straggler with nothing to attribute it to', () => {
    const state = workingRowReducer(INITIAL_WORKING_ROW_STATE, { type: 'frames', frameIds: ['fr_1'] });
    expect(state).toEqual(INITIAL_WORKING_ROW_STATE);
  });

  it('an empty frames push is main clearing the CANVAS overlay, never the row', () => {
    const working: WorkingRowState = { phase: 'working', frameIds: ['fr_1'] };
    const state = workingRowReducer(working, { type: 'frames', frameIds: [] });
    expect(state).toEqual(working);
  });

  it('a non-empty push while working replaces the frame set (whole, not a delta)', () => {
    const working: WorkingRowState = { phase: 'working', frameIds: ['fr_1'] };
    const state = workingRowReducer(working, { type: 'frames', frameIds: ['fr_1', 'fr_2'] });
    expect(state).toEqual({ phase: 'working', frameIds: ['fr_1', 'fr_2'] });
  });

  it('a turn ending keeps the frames and flips to done — persists past the turn', () => {
    const working: WorkingRowState = { phase: 'working', frameIds: ['fr_1'] };
    const state = workingRowReducer(working, { type: 'streaming', isStreaming: false });
    expect(state).toEqual({ phase: 'done', frameIds: ['fr_1'] });
  });

  it('done persists across a stray empty frames push too', () => {
    const done: WorkingRowState = { phase: 'done', frameIds: ['fr_1'] };
    const state = workingRowReducer(done, { type: 'frames', frameIds: [] });
    expect(state).toEqual(done);
  });

  it('the next turn takes the row down — Done never rides a running turn (ONL-2383)', () => {
    const fold = (state: WorkingRowState, actions: Parameters<typeof workingRowReducer>[1][]) =>
      actions.reduce(workingRowReducer, state);

    const settled = fold(INITIAL_WORKING_ROW_STATE, [
      { type: 'streaming', isStreaming: true },
      { type: 'frames', frameIds: ['fr_1'] },
      { type: 'streaming', isStreaming: false },
    ]);
    expect(workingRowCopy(settled, resolve)?.text).toContain('Pricing');

    // Whatever raised streaming — the prompt's accept, not codex's first frame — the row goes.
    const next = workingRowReducer(settled, { type: 'streaming', isStreaming: true });
    expect(next).toEqual({ phase: 'working', frameIds: [] });
    expect(workingRowCopy(next, resolve)).toBeUndefined();
  });
});

describe('workingRowCopy', () => {
  it('is undefined while idle — no row at all', () => {
    expect(workingRowCopy(INITIAL_WORKING_ROW_STATE, resolve)).toBeUndefined();
  });

  it('working: no row — the turn timer already carries it', () => {
    expect(workingRowCopy({ phase: 'working', frameIds: ['fr_1'] }, resolve)).toBeUndefined();
  });

  it('done, one frame: a link, not plain text', () => {
    const copy = workingRowCopy({ phase: 'done', frameIds: ['fr_1'] }, resolve);
    expect(copy).toEqual({ phase: 'done', text: t('chat.workingRow.done', { frame: resolvers['fr_1']!.link }) });
  });

  it('done, more than one frame: every link', () => {
    const copy = workingRowCopy({ phase: 'done', frameIds: ['fr_1', 'fr_2'] }, resolve);
    expect(copy?.phase).toBe('done');
    expect(copy?.text).toContain(resolvers['fr_1']!.link);
    expect(copy?.text).toContain(resolvers['fr_2']!.link);
  });

  it('done, nothing ever marked: the generic label, not a broken link', () => {
    const copy = workingRowCopy({ phase: 'done', frameIds: [] }, resolve);
    expect(copy).toEqual({ phase: 'done', text: t('chat.workingRow.doneGeneric') });
  });

  it('a frame the canvas no longer carries is dropped, not shown broken', () => {
    const copy = workingRowCopy({ phase: 'done', frameIds: ['fr_1', 'gone'] }, resolve);
    expect(copy).toEqual({ phase: 'done', text: t('chat.workingRow.done', { frame: resolvers['fr_1']!.link }) });
  });
});

describe('a new chat starts the row over (ONL-2556)', () => {
  it('drops the finished row, so the fresh chat shows no Done behind no turn', () => {
    const done = workingRowReducer({ phase: 'working', frameIds: ['fr_1'] }, { type: 'streaming', isStreaming: false });
    expect(workingRowCopy(done, resolve)).toBeDefined();

    const fresh = workingRowReducer(done, { type: 'reset' });

    expect(fresh).toEqual(INITIAL_WORKING_ROW_STATE);
    expect(workingRowCopy(fresh, resolve)).toBeUndefined();
  });

  it('a reset row stays quiet until the next turn streams', () => {
    const fresh = workingRowReducer({ phase: 'done', frameIds: ['fr_1'] }, { type: 'reset' });

    expect(workingRowCopy(workingRowReducer(fresh, { type: 'frames', frameIds: ['fr_2'] }), resolve)).toBeUndefined();
    expect(workingRowReducer(fresh, { type: 'streaming', isStreaming: true }).phase).toBe('working');
  });
});
