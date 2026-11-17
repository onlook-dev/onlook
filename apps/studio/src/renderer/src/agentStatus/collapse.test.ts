import { describe, expect, it } from 'bun:test';
import { createCollapseStore, FOLD_GRACE_MS, isCountSeated } from './collapse.js';

function clock(): { timers: { setTimeout: (run: () => void, ms: number) => unknown; clearTimeout: (handle: unknown) => void }; advance: (ms: number) => void } {
  let now = 0;
  const pending = new Map<number, { at: number; run: () => void }>();
  let next = 0;
  return {
    timers: {
      setTimeout: (run, ms) => {
        next += 1;
        pending.set(next, { at: now + ms, run });
        return next;
      },
      clearTimeout: (handle) => {
        pending.delete(handle as number);
      },
    },
    advance: (ms) => {
      now += ms;
      for (const [id, timer] of [...pending]) {
        if (timer.at > now) continue;
        pending.delete(id);
        timer.run();
      }
    },
  };
}

const THREE = ['chat:question', 'frame:a', 'frame:b'];

function opened(): { store: ReturnType<typeof createCollapseStore>; advance: (ms: number) => void } {
  const { timers, advance } = clock();
  const store = createCollapseStore(timers);
  store.getState().linesChanged(THREE);
  store.getState().pointerEnter();
  store.getState().tapCount();
  return { store, advance };
}

describe('the status list collapse', () => {
  it('first paint is collapsed and animates nothing', () => {
    const store = createCollapseStore(clock().timers);
    store.getState().linesChanged(THREE);
    expect(store.getState()).toMatchObject({ open: false, shut: true, intent: 'none' });
  });

  it('a tap on the count opens it from shut', () => {
    const { store } = opened();
    expect(store.getState()).toMatchObject({ open: true, intent: 'open' });
    store.getState().committed();
    expect(store.getState().intent).toBe('reopen');
  });

  it('the pointer leaving folds it once the grace runs out, not before', () => {
    const { store, advance } = opened();
    store.getState().pointerLeave();
    advance(FOLD_GRACE_MS - 1);
    expect(store.getState().open).toBe(true);
    advance(1);
    expect(store.getState()).toMatchObject({ open: false, intent: 'fold', shut: false });
    store.getState().exitsDone();
    expect(store.getState().shut).toBe(true);
  });

  it('the pointer coming back within the grace holds it open', () => {
    const { store, advance } = opened();
    store.getState().pointerLeave();
    advance(FOLD_GRACE_MS / 2);
    store.getState().pointerEnter();
    advance(FOLD_GRACE_MS * 3);
    expect(store.getState().open).toBe(true);
  });

  it('keyboard focus inside holds it open after the pointer leaves, and mouse focus does not', () => {
    const keyboard = opened();
    keyboard.store.getState().focusIn(true);
    keyboard.store.getState().pointerLeave();
    keyboard.advance(FOLD_GRACE_MS * 3);
    expect(keyboard.store.getState().open).toBe(true);

    const mouse = opened();
    mouse.store.getState().focusIn(false);
    mouse.store.getState().pointerLeave();
    mouse.advance(FOLD_GRACE_MS);
    expect(mouse.store.getState().open).toBe(false);
  });

  it('keyboard focus leaving the foot folds it after the grace, and moving between its lines does not', () => {
    const { store, advance } = opened();
    store.getState().focusIn(true);
    store.getState().pointerLeave();
    store.getState().focusOut(false);
    advance(FOLD_GRACE_MS * 3);
    expect(store.getState().open).toBe(true);
    store.getState().focusOut(true);
    advance(FOLD_GRACE_MS);
    expect(store.getState().open).toBe(false);
  });

  it('a tap while the fold is still leaving reopens it rather than opening it from shut', () => {
    const { store, advance } = opened();
    store.getState().pointerLeave();
    advance(FOLD_GRACE_MS);
    store.getState().tapCount();
    expect(store.getState()).toMatchObject({ open: true, intent: 'reopen' });
  });

  it('the tooltip stays quiet from the tap until the pointer next moves', () => {
    const { store } = opened();
    expect(store.getState().quietTip).toBe(true);
    store.getState().pointerMove();
    expect(store.getState().quietTip).toBe(false);
  });

  it('new lines roll, and dropping to one line closes it without a fold', () => {
    const { store, advance } = opened();
    store.getState().linesChanged([...THREE, 'frame:c']);
    expect(store.getState()).toMatchObject({ open: true, intent: 'roll' });
    store.getState().pointerLeave();
    store.getState().linesChanged(['frame:c']);
    expect(store.getState()).toMatchObject({ open: false, shut: true, intent: 'none' });
    advance(FOLD_GRACE_MS * 3);
    expect(store.getState().intent).toBe('none');
  });

  it('the count takes its seat only once the fold has settled: never while open, nor while the folded rows are still leaving', () => {
    const { store, advance } = opened();
    expect(isCountSeated(store.getState())).toBe(false);
    store.getState().pointerLeave();
    advance(FOLD_GRACE_MS);
    expect(store.getState().open).toBe(false);
    expect(isCountSeated(store.getState())).toBe(false);
    store.getState().exitsDone();
    expect(isCountSeated(store.getState())).toBe(true);
  });

  it('a list that first paints collapsed seats its count at once', () => {
    const store = createCollapseStore(clock().timers);
    store.getState().linesChanged(THREE);
    expect(isCountSeated(store.getState())).toBe(true);
  });

  it('a reset leaves it collapsed and cancels a pending fold', () => {
    const { store, advance } = opened();
    store.getState().pointerLeave();
    store.getState().reset();
    advance(FOLD_GRACE_MS);
    expect(store.getState()).toMatchObject({ open: false, shut: true, intent: 'none', linesKey: null });
  });
});
