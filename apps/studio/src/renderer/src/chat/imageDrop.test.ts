import { describe, expect, it } from 'bun:test';
import {
  dragCarriesFiles,
  dragCarriesImages,
  dragWouldNavigate,
  foldDragDepth,
} from './imageDrop.js';

const file = (type: string) => ({ kind: 'file', type });
const text = (type: string) => ({ kind: 'string', type });

describe('dragCarriesFiles', () => {
  it('sees a file of any type — this is the navigation guard, not the feature', () => {
    expect(dragCarriesFiles([file('application/pdf')])).toBe(true);
    expect(dragCarriesFiles([file('')])).toBe(true);
  });

  it('ignores a text drag', () => {
    expect(dragCarriesFiles([text('text/plain'), text('text/html')])).toBe(false);
  });

  it('ignores an empty drag', () => {
    expect(dragCarriesFiles([])).toBe(false);
  });

  it('sees the file in a mixed drag', () => {
    expect(dragCarriesFiles([text('text/plain'), file('image/png')])).toBe(true);
  });
});

describe('dragCarriesImages', () => {
  it('stays dark for a non-image file', () => {
    expect(dragCarriesImages([file('application/pdf')])).toBe(false);
  });

  it('stays dark for a string item that merely claims an image type', () => {
    expect(dragCarriesImages([text('image/png')])).toBe(false);
  });

  it('stays dark for an unlabelled file', () => {
    expect(dragCarriesImages([file('')])).toBe(false);
  });

  it('lights for the image in a mixed drag', () => {
    expect(dragCarriesImages([file('application/pdf'), file('image/jpeg')])).toBe(true);
  });
});

describe('dragWouldNavigate', () => {
  it('covers a dragged link, which is not a file', () => {
    expect(dragCarriesFiles([text('text/uri-list')])).toBe(false);
    expect(dragWouldNavigate([text('text/uri-list')])).toBe(true);
  });

  it('covers file drags', () => {
    expect(dragWouldNavigate([file('application/pdf')])).toBe(true);
  });

  it('leaves a plain text drag alone', () => {
    expect(dragWouldNavigate([text('text/plain'), text('text/html')])).toBe(false);
  });

  it('leaves an empty drag alone', () => {
    expect(dragWouldNavigate([])).toBe(false);
  });
});

describe('foldDragDepth', () => {
  it('counts up on enter and down on leave', () => {
    expect(foldDragDepth(0, 'enter')).toBe(1);
    expect(foldDragDepth(1, 'leave')).toBe(0);
  });

  it('clamps at zero, so an unmatched leave cannot owe the next enter', () => {
    expect(foldDragDepth(0, 'leave')).toBe(0);
  });

  it('stays lit while the cursor crosses a boundary', () => {
    let depth = foldDragDepth(0, 'enter');
    depth = foldDragDepth(depth, 'enter');
    depth = foldDragDepth(depth, 'leave');
    expect(depth).toBeGreaterThan(0);
  });

  it('goes dark only when the last element is left', () => {
    const crossings: ('enter' | 'leave')[] = [
      'enter', 'enter', 'leave', 'enter', 'leave', 'leave',
    ];
    expect(crossings.reduce(foldDragDepth, 0)).toBe(0);
  });
});
