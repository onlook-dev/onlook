import { describe, expect, it } from 'bun:test';
import {
  CANVAS_TEXT_SIZES,
  CANVAS_TEXT_WRAP_WIDTH,
  defaultTextBox,
  type CanvasNode,
} from '@studio/events';
import { FRAME_DRAW_CLICK_THRESHOLD } from '../model.js';
import {
  CANVAS_OVERLAY_SELECTOR,
  CANVAS_TEXT_RENDER_MAX,
  caretText,
  DEFAULT_CANVAS_TEXT_SIZE,
  isTextBoxStale,
  isTextPlacementClick,
  keepsTextEditOpen,
  measuredTextBox,
  textBoxAtSize,
  textCommitOutcome,
} from './placement.js';

describe('the press that places a text node', () => {
  it('reads a release on the spot as a placement', () => {
    expect(isTextPlacementClick({ x: 400, y: 300 }, { x: 400, y: 300 })).toBe(true);
  });

  it('reads a release a drag away as no placement, so a pan never leaves a node behind', () => {
    const far = FRAME_DRAW_CLICK_THRESHOLD + 40;
    expect(isTextPlacementClick({ x: 400, y: 300 }, { x: 400 + far, y: 300 })).toBe(false);
    expect(isTextPlacementClick({ x: 400, y: 300 }, { x: 400, y: 300 - far })).toBe(false);
  });

  it('measures the slack diagonally, not per axis', () => {
    const half = FRAME_DRAW_CLICK_THRESHOLD;
    expect(isTextPlacementClick({ x: 0, y: 0 }, { x: half, y: half })).toBe(false);
  });
});

describe('the box the renderer writes back', () => {
  it('holds the content inside the maximum layout width rather than running out as one line', () => {
    const wide = measuredTextBox(
      { width: CANVAS_TEXT_WRAP_WIDTH * 9, height: 40 },
      DEFAULT_CANVAS_TEXT_SIZE,
    );
    expect(wide.width).toBe(CANVAS_TEXT_WRAP_WIDTH);
  });

  it('rounds up to whole pixels, since the document stores integers and a browser measures fractions', () => {
    const box = measuredTextBox({ width: 120.2, height: 60.1 }, DEFAULT_CANVAS_TEXT_SIZE);
    expect(box).toEqual({ width: 121, height: 61 });
  });

  it('never measures below one line of its own size, so an emptied node keeps a caret-tall box', () => {
    for (const size of CANVAS_TEXT_SIZES) {
      const box = measuredTextBox({ width: 0, height: 0 }, size);
      expect(box.height, size).toBe(defaultTextBox(size).height);
      expect(box.width, size).toBeGreaterThan(0);
    }
  });

  it('calls a stored box stale only once it is a whole pixel out, so a correction cannot chase itself', () => {
    expect(isTextBoxStale({ width: 300, height: 38 }, { width: 300, height: 38 })).toBe(false);
    expect(isTextBoxStale({ width: 300.4, height: 38 }, { width: 300, height: 38 })).toBe(false);
    expect(isTextBoxStale({ width: 300, height: 38 }, { width: 301, height: 38 })).toBe(true);
    expect(isTextBoxStale({ width: 300, height: 38 }, { width: 300, height: 76 })).toBe(true);
  });

  it('calls the default box stale beside a measured line of real text', () => {
    const stored = defaultTextBox(DEFAULT_CANVAS_TEXT_SIZE);
    const measured = measuredTextBox({ width: 164, height: 38 }, DEFAULT_CANVAS_TEXT_SIZE);
    expect(isTextBoxStale(stored, measured)).toBe(true);
  });
});

describe('what a commit authors', () => {
  const box = { width: 200, height: 38 };

  it('authors the node itself for a placement that was typed into', () => {
    expect(textCommitOutcome({ previous: null, next: 'ship it', box })).toEqual({
      kind: 'create',
      text: 'ship it',
      box,
    });
  });

  it('authors nothing at all for a placement left empty, so the undo stack never sees it', () => {
    expect(textCommitOutcome({ previous: null, next: '', box })).toEqual({ kind: 'none' });
    expect(textCommitOutcome({ previous: null, next: '   \n  ', box })).toEqual({ kind: 'none' });
  });

  it('removes a node emptied down to whitespace', () => {
    expect(textCommitOutcome({ previous: 'ship it', next: '', box })).toEqual({ kind: 'remove' });
    expect(textCommitOutcome({ previous: 'ship it', next: ' \n\t ', box })).toEqual({
      kind: 'remove',
    });
  });

  it('carries the measured box with a changed value', () => {
    expect(textCommitOutcome({ previous: 'before', next: 'after', box })).toEqual({
      kind: 'set-text',
      text: 'after',
      box,
    });
  });

  it('authors nothing when the value came back unchanged', () => {
    expect(textCommitOutcome({ previous: 'steady', next: 'steady', box })).toEqual({ kind: 'none' });
  });

  it('keeps the line breaks it was handed', () => {
    const lines = 'first\nsecond\n\nfourth';
    expect(textCommitOutcome({ previous: null, next: lines, box })).toEqual({
      kind: 'create',
      text: lines,
      box,
    });
    expect(textCommitOutcome({ previous: 'first', next: lines, box })).toEqual({
      kind: 'set-text',
      text: lines,
      box,
    });
  });
});

describe('the box a size change carries', () => {
  const oneLine = measuredTextBox({ width: 164, height: 38 }, 'medium');

  it('grows the box going up the ramp and shrinks it going down', () => {
    expect(textBoxAtSize(oneLine, 'medium', 'large').height).toBeGreaterThan(oneLine.height);
    expect(textBoxAtSize(oneLine, 'medium', 'small').height).toBeLessThan(oneLine.height);
    expect(textBoxAtSize(oneLine, 'medium', 'large').width).toBeGreaterThan(oneLine.width);
  });

  it('hands back the same box for the size it already is', () => {
    for (const size of CANVAS_TEXT_SIZES) {
      expect(textBoxAtSize(oneLine, size, size), size).toEqual(oneLine);
    }
  });

  it('holds the grown box inside the one layout width every text node shares', () => {
    const wide = { width: CANVAS_TEXT_WRAP_WIDTH, height: 38 };
    expect(textBoxAtSize(wide, 'small', 'large').width).toBe(CANVAS_TEXT_WRAP_WIDTH);
  });

  it('never falls below one line of the size it is going to', () => {
    for (const size of CANVAS_TEXT_SIZES.filter((candidate) => candidate !== 'medium')) {
      const box = textBoxAtSize({ width: 1, height: 1 }, 'medium', size);
      expect(box.height, size).toBeGreaterThanOrEqual(defaultTextBox(size).height);
      expect(box.width, size).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('authored wrapping widths (ONL-2521)', () => {
  for (const wrapWidth of [240, 720]) {
    it(`keeps ${wrapWidth}px while measuring content-fit height`, () => {
      expect(measuredTextBox({ width: 164, height: 151.2 }, 'medium', wrapWidth)).toEqual({
        width: wrapWidth,
        height: 152,
      });
    });

    it(`keeps ${wrapWidth}px across each font step`, () => {
      for (const size of CANVAS_TEXT_SIZES) {
        expect(textBoxAtSize({ width: wrapWidth, height: 152 }, 'medium', size, wrapWidth).width).toBe(wrapWidth);
      }
    });
  }
});

describe('where the caret went', () => {
  const inside = { closest: (selector: string) => (selector === CANVAS_OVERLAY_SELECTOR ? {} : null) };
  const elsewhere = { closest: () => null };

  it('keeps the edit open when focus lands on one of the canvas’s own overlays', () => {
    expect(keepsTextEditOpen(inside)).toBe(true);
  });

  it('lets a blur anywhere else commit', () => {
    expect(keepsTextEditOpen(elsewhere)).toBe(false);
  });

  it('lets a blur with nothing to take focus commit, which is the window losing it', () => {
    expect(keepsTextEditOpen(null)).toBe(false);
  });
});

describe('which string the caret is given (ONL-2486)', () => {
  const box = { pageId: 'pg_main', x: 0, y: 0, width: 10, height: 10, order: 0 };
  const whole = 'y'.repeat(CANVAS_TEXT_RENDER_MAX * 2);
  const nodes: Record<string, CanvasNode> = {
    long: { ...box, id: 'long', kind: 'text', name: '', content: { text: whole, size: 'medium' } },
    shot: {
      ...box,
      id: 'shot',
      pageId: 'pg_main',
      kind: 'image',
      name: 'shot.png',
      content: { imageId: 'blob-1', name: 'shot.png', originalWidth: 8, originalHeight: 6 },
    },
  };

  it('gives the node holding the caret every character it stores', () => {
    expect(caretText(nodes, 'long', 'long')).toBe(whole);
  });

  it('gives a resting node nothing, so the canvas goes on drawing the truncation', () => {
    expect(caretText(nodes, null, 'long')).toBeUndefined();
    expect(caretText(nodes, 'other', 'long')).toBeUndefined();
  });

  it('gives nothing for a node of another kind, or one the document dropped', () => {
    expect(caretText(nodes, 'shot', 'shot')).toBeUndefined();
    expect(caretText(nodes, 'gone', 'gone')).toBeUndefined();
    expect(caretText(undefined, 'long', 'long')).toBeUndefined();
  });
});
