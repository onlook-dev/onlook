import { describe, expect, test } from 'bun:test';
import type { AttachmentDraft } from '../attachments.js';
import { chipRowCount } from './InlineChipRow.js';
import type { ElementSelection } from './selection.js';

function selection(id: string): ElementSelection {
  return {
    evidence: {
      kind: 'element',
      id,
      tag: 'button',
      domPath: `main:nth-of-type(1) > button:nth-of-type(1)`,
      outerHtmlSnippet: '<button></button>',
      textContent: '',
      classes: [],
      frameUrl: 'http://localhost:3000/',
    },
    frameNodeId: 'frame-a',
    stale: false,
  };
}

function draft(id: string): AttachmentDraft {
  return {
    ref: { id, mediaType: 'image/png', width: 8, height: 8 },
    name: `${id}.png`,
    previewUrl: `blob:${id}`,
  };
}

describe('the chip row’s watched count (ONL-2549)', () => {
  test('an arriving attachment grows the count with the element chips unchanged', () => {
    const chips = [selection('el-1')];
    expect(chipRowCount(chips, [])).toBe(1);
    expect(chipRowCount(chips, [draft('img-1')])).toBe(2);
    expect(chipRowCount(chips, [draft('img-1'), draft('img-2')])).toBe(3);
  });

  test('an attachment alone is counted, so the first pasted pill scrolls into view', () => {
    expect(chipRowCount([], [])).toBe(0);
    expect(chipRowCount([], [draft('img-1')])).toBe(1);
  });
});
