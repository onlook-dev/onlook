import { describe, expect, it } from 'bun:test';
import {
  ANCHOR_RECT_MAX_PX,
  anchorGeometryFor,
  EVIDENCE_AGGREGATE_MAX_BYTES,
  EVIDENCE_CLASS_MAX,
  EVIDENCE_CLASSES_MAX,
  EVIDENCE_DOM_PATH_MAX,
  EVIDENCE_FRAME_URL_MAX,
  EVIDENCE_ID_MAX,
  EVIDENCE_OUTER_HTML_MAX,
  EVIDENCE_PATH_DEPTH_MAX,
  EVIDENCE_TAG_MAX,
  EVIDENCE_TEXT_MAX,
  hoverReportFor,
  MAX_ELEMENT_SELECTIONS,
  parseElementEvidence,
  parseElementEvidenceBatch,
  parsePickerToHost,
  seededAnchorId,
  setOutlineVisibility,
  withinAggregateBytes,
  type ElementEvidence,
  type PickerToHost,
} from './elements.js';
import { FILENAME_MAX, FUNCTION_MAX, MESSAGE_MAX, scrubException } from './scrub.js';

function valid(overrides: Record<string, unknown> = {}): unknown {
  return {
    kind: 'element',
    id: 'el-1',
    tag: 'button',
    domPath: 'html > body:nth-of-type(1) > button:nth-of-type(1)',
    outerHtmlSnippet: '<button class="cta">Buy</button>',
    textContent: 'Buy',
    classes: ['cta'],
    frameUrl: 'http://localhost:3000/pricing',
    ...overrides,
  };
}

describe('element evidence runtime admission', () => {
  it('accepts every field at its UTF-8 byte boundary', () => {
    const evidence = valid({
      id: 'i'.repeat(EVIDENCE_ID_MAX),
      tag: 't'.repeat(EVIDENCE_TAG_MAX),
      domPath: 'd'.repeat(EVIDENCE_DOM_PATH_MAX),
      outerHtmlSnippet: 'h'.repeat(EVIDENCE_OUTER_HTML_MAX),
      textContent: 'x'.repeat(EVIDENCE_TEXT_MAX),
      classes: Array.from(
        { length: EVIDENCE_CLASSES_MAX },
        (_, index) => `${index}`.padEnd(EVIDENCE_CLASS_MAX, 'c'),
      ),
      frameUrl: `http://localhost/${'u'.repeat(EVIDENCE_FRAME_URL_MAX - 17)}`,
    });
    expect(parseElementEvidence(evidence)).not.toBeNull();
  });

  it('admits optional renderer freshness but no other boundary widening', () => {
    expect(parseElementEvidence(valid({ stale: true }))).toMatchObject({ stale: true });
    expect(parseElementEvidence(valid({ stale: 'yes' }))).toBeNull();
    expect(parseElementEvidence(valid({ unexpected: true }))).toBeNull();
  });

  it('rejects malformed, over-deep, duplicate-id, and UTF-8 byte overflow', () => {
    expect(parseElementEvidence(valid({ tag: 42 }))).toBeNull();
    expect(
      parseElementEvidence(
        valid({ domPath: Array.from({ length: EVIDENCE_PATH_DEPTH_MAX + 1 }, () => 'div').join(' > ') }),
      ),
    ).toBeNull();
    expect(parseElementEvidence(valid({ textContent: '😀'.repeat(EVIDENCE_TEXT_MAX) }))).toBeNull();
    expect(parseElementEvidenceBatch([valid(), valid()])).toEqual([]);
  });

  it('omits invalid items but rejects count and aggregate overflow as a whole batch', () => {
    expect(parseElementEvidenceBatch([valid(), valid({ id: 'bad', tag: 42 })])).toHaveLength(1);
    expect(
      parseElementEvidenceBatch(
        Array.from({ length: MAX_ELEMENT_SELECTIONS + 1 }, (_, index) => valid({ id: `el-${index}` })),
      ),
    ).toBeNull();

    const large = valid({ outerHtmlSnippet: 'x'.repeat(EVIDENCE_OUTER_HTML_MAX) });
    const count = Math.ceil(EVIDENCE_AGGREGATE_MAX_BYTES / JSON.stringify(large).length);
    expect(
      parseElementEvidenceBatch(
        Array.from({ length: Math.min(count, MAX_ELEMENT_SELECTIONS) }, (_, index) => ({
          ...(large as object),
          id: `large-${index}`,
        })),
      ),
    ).toBeNull();
  });

  it('rejects evidence that has not been secret-minimized', () => {
    expect(parseElementEvidence(valid({ frameUrl: 'https://user:pass@example.test/x?token=x#y' }))).toBeNull();
    expect(
      parseElementEvidence(valid({ outerHtmlSnippet: '<input type="password" value="hunter2">' })),
    ).toBeNull();
    expect(
      parseElementEvidence(
        valid({ outerHtmlSnippet: '<img src="//user:pass@example.test/x.png">' }),
      ),
    ).toBeNull();
    expect(
      parseElementEvidence(
        valid({
          outerHtmlSnippet:
            '<source srcset="https://cdn.test/a.png 1x, https://user:pass@cdn.test/b.png?token=x 2x">',
        }),
      ),
    ).toBeNull();
  });

  it('reads a quoted value whole when it holds the other quote (ONL-2335)', () => {
    expect(parseElementEvidence(valid({ outerHtmlSnippet: `<input value="[redacted]" title="it's">` }))).not.toBeNull();
    expect(parseElementEvidence(valid({ outerHtmlSnippet: `<a href="/what's-new">New</a>` }))).not.toBeNull();
    expect(parseElementEvidence(valid({ outerHtmlSnippet: `<input value="don't">` }))).toBeNull();
    expect(parseElementEvidence(valid({ outerHtmlSnippet: `<p data-author="O'Brien">x</p>` }))).toBeNull();
    expect(parseElementEvidence(valid({ outerHtmlSnippet: `<a href="/what's-new?ref=nav">New</a>` }))).toBeNull();
  });
});

describe('the aggregate byte measure (ONL-2455)', () => {
  const large = (index: number): ElementEvidence =>
    valid({
      id: `el-${index}`,
      outerHtmlSnippet: 'x'.repeat(EVIDENCE_OUTER_HTML_MAX),
      domPath: 'd'.repeat(EVIDENCE_DOM_PATH_MAX),
    }) as ElementEvidence;

  it('flips where the batch parser flips, so a caller refuses exactly what the door discards', () => {
    const batch = Array.from({ length: MAX_ELEMENT_SELECTIONS }, (_, index) => large(index));
    for (let count = 1; count <= batch.length; count += 1) {
      const slice = batch.slice(0, count);
      expect(withinAggregateBytes(slice)).toBe(parseElementEvidenceBatch(slice) !== null);
    }
    expect(withinAggregateBytes([large(0)])).toBe(true);
    expect(withinAggregateBytes(batch)).toBe(false);
  });
});

describe('a re-seeded anchor (ONL-2455)', () => {
  const seeds = [
    { id: 'el-1', domPath: 'body > button', tag: 'button', classes: [], textContent: '' },
    { id: 'el-2', domPath: 'body > a', tag: 'a', classes: [], textContent: '' },
  ];

  it('restores the host’s anchor when the seed carries it', () => {
    expect(seededAnchorId('el-2', seeds)).toBe('el-2');
  });

  it('is nothing when no surface is open, or when the seed dropped that id', () => {
    expect(seededAnchorId(null, seeds)).toBeNull();
    expect(seededAnchorId('el-9', seeds)).toBeNull();
    expect(seededAnchorId('el-1', [])).toBeNull();
  });
});

describe('picker generation contract', () => {
  it('requires a non-negative generation on every guest event', () => {
    expect(
      parsePickerToHost({
        type: 'picked',
        evidence: valid(),
        shiftHeld: false,
        generation: 3,
      }),
    ).not.toBeNull();
    expect(parsePickerToHost({ type: 'escape', generation: 3 })).toEqual({
      type: 'escape',
      generation: 3,
    });
    expect(parsePickerToHost({ type: 'escape', seq: 3 })).toBeNull();
    expect(parsePickerToHost({ type: 'space-pan', held: true, generation: 3 })).toEqual({
      type: 'space-pan',
      held: true,
      generation: 3,
    });
    expect(parsePickerToHost({ type: 'space-pan', held: 'yes', generation: 3 })).toBeNull();
  });

  it('admits refreshed evidence only with a valid generation and evidence shape', () => {
    expect(
      parsePickerToHost({ type: 'refreshed', evidence: valid(), generation: 5 }),
    ).not.toBeNull();
    expect(parsePickerToHost({ type: 'refreshed', evidence: valid(), generation: -1 })).toBeNull();
    expect(
      parsePickerToHost({ type: 'refreshed', evidence: valid({ tag: 42 }), generation: 5 }),
    ).toBeNull();
  });
});

describe("the anchor's geometry (ONL-2455)", () => {
  const rect = { x: 12, y: 40, width: 100, height: 24 };

  function geometry(overrides: Record<string, unknown> = {}): unknown {
    return { type: 'anchorGeometry', id: 'el-1', rect, generation: 5, ...overrides };
  }

  it('parses a finite bounded rect in guest client px, negative offsets included', () => {
    expect(parsePickerToHost(geometry())).toEqual({
      type: 'anchorGeometry',
      id: 'el-1',
      rect,
      generation: 5,
    });
    expect(
      parsePickerToHost(geometry({ rect: { x: -400, y: -50, width: 0, height: 0 } })),
    ).not.toBeNull();
  });

  it('refuses an extra key, a missing rect field, and a forged non-number', () => {
    expect(parsePickerToHost(geometry({ extra: 1 }))).toBeNull();
    expect(parsePickerToHost(geometry({ rect: { ...rect, extra: 1 } }))).toBeNull();
    expect(parsePickerToHost(geometry({ rect: { x: 0, y: 0, width: 10 } }))).toBeNull();
    expect(parsePickerToHost(geometry({ rect: { ...rect, width: Number.NaN } }))).toBeNull();
    expect(
      parsePickerToHost(geometry({ rect: { ...rect, height: Number.POSITIVE_INFINITY } })),
    ).toBeNull();
    expect(parsePickerToHost(geometry({ rect: { ...rect, x: '10' } }))).toBeNull();
    expect(parsePickerToHost(geometry({ rect: null }))).toBeNull();
    expect(parsePickerToHost(geometry({ id: '' }))).toBeNull();
  });

  it('refuses a rect past the bound in magnitude, or with a negative size', () => {
    expect(
      parsePickerToHost(geometry({ rect: { ...rect, width: ANCHOR_RECT_MAX_PX + 1 } })),
    ).toBeNull();
    expect(
      parsePickerToHost(geometry({ rect: { ...rect, x: -(ANCHOR_RECT_MAX_PX + 1) } })),
    ).toBeNull();
    expect(parsePickerToHost(geometry({ rect: { ...rect, height: -1 } }))).toBeNull();
  });

  it('is composed for the anchor alone, and never for a rect the host would refuse', () => {
    expect(anchorGeometryFor('el-1', 'el-1', rect)).toEqual({
      type: 'anchorGeometry',
      id: 'el-1',
      rect,
    });
    expect(anchorGeometryFor('el-1', 'el-2', rect)).toBeNull();
    expect(anchorGeometryFor(null, 'el-2', rect)).toBeNull();
    expect(anchorGeometryFor('el-1', 'el-1', { ...rect, width: Number.NaN })).toBeNull();
    expect(
      anchorGeometryFor('el-1', 'el-1', { ...rect, height: ANCHOR_RECT_MAX_PX + 1 }),
    ).toBeNull();
  });
});

describe('suppressing an outline in Interact (ONL-2455)', () => {
  it('hides on its own axis, so the placement survives and a restore needs no re-seed', () => {
    const placed = { display: 'block', visibility: 'visible' };

    setOutlineVisibility(placed, false);
    expect(placed).toEqual({ display: 'block', visibility: 'hidden' });

    setOutlineVisibility(placed, true);
    expect(placed).toEqual({ display: 'block', visibility: 'visible' });
  });

  it('does not paint a box the placement never placed — a stale entry stays unpainted', () => {
    const unplaced = { display: 'none', visibility: 'visible' };

    setOutlineVisibility(unplaced, false);
    setOutlineVisibility(unplaced, true);
    expect(unplaced.display).toBe('none');
  });
});

describe("the guest's hover report (ONL-2455)", () => {
  function hovered(overrides: Record<string, unknown> = {}): unknown {
    return {
      type: 'hovered',
      tag: 'button',
      domPath: 'body > button:nth-of-type(1)',
      hitTests: 7,
      generation: 5,
      ...overrides,
    };
  }

  it('parses a tag, a path and the guest’s own hit-test count', () => {
    expect(parsePickerToHost(hovered())).toEqual({
      type: 'hovered',
      tag: 'button',
      domPath: 'body > button:nth-of-type(1)',
      hitTests: 7,
      generation: 5,
    });
  });

  it('parses a miss, where the point landed on nothing pickable', () => {
    expect(parsePickerToHost(hovered({ tag: null, domPath: null }))).toEqual({
      type: 'hovered',
      tag: null,
      domPath: null,
      hitTests: 7,
      generation: 5,
    });
  });

  it('refuses an extra key, a bad tag, an unbounded path and a non-count', () => {
    expect(parsePickerToHost({ ...(hovered() as object), extra: 1 })).toBeNull();
    expect(parsePickerToHost(hovered({ tag: 'Button' }))).toBeNull();
    expect(parsePickerToHost(hovered({ domPath: 'd'.repeat(EVIDENCE_DOM_PATH_MAX + 1) }))).toBeNull();
    expect(parsePickerToHost(hovered({ hitTests: -1 }))).toBeNull();
    expect(parsePickerToHost(hovered({ hitTests: 1.5 }))).toBeNull();
    expect(parsePickerToHost(hovered({ generation: -1 }))).toBeNull();
  });

  it('carries no page content — a tag and a path are what an outline already draws', () => {
    const parsed = parsePickerToHost(hovered());
    expect(Object.keys(parsed ?? {}).sort()).toEqual([
      'domPath',
      'generation',
      'hitTests',
      'tag',
      'type',
    ]);
  });
});

describe("the guest's hover emit gate (ONL-2455)", () => {
  it('emits nothing at all until the host enabled reports — a shipped build pays for no hover', () => {
    expect(hoverReportFor(false, { tag: 'button', domPath: 'body > button' }, 3)).toBeNull();
    expect(hoverReportFor(false, null, 3)).toBeNull();
  });

  it('emits what the hit-test found, with the running count', () => {
    expect(hoverReportFor(true, { tag: 'button', domPath: 'body > button' }, 3)).toEqual({
      type: 'hovered',
      tag: 'button',
      domPath: 'body > button',
      hitTests: 3,
    });
  });

  it('emits a miss as a miss, so the count keeps running over empty page', () => {
    expect(hoverReportFor(true, null, 4)).toEqual({
      type: 'hovered',
      tag: null,
      domPath: null,
      hitTests: 4,
    });
  });

  it('reports an identity this module’s own parser would refuse as a miss, never as a dropped message', () => {
    expect(hoverReportFor(true, { tag: 'Button', domPath: 'body > button' }, 5)).toEqual({
      type: 'hovered',
      tag: null,
      domPath: null,
      hitTests: 5,
    });
    expect(
      hoverReportFor(true, { tag: 'button', domPath: 'd'.repeat(EVIDENCE_DOM_PATH_MAX + 1) }, 5),
    ).toEqual({ type: 'hovered', tag: null, domPath: null, hitTests: 5 });
  });

  it('survives its own round trip through the parser', () => {
    const report = hoverReportFor(true, { tag: 'a', domPath: 'body > a:nth-of-type(2)' }, 9);
    expect(parsePickerToHost({ ...report, generation: 2 })).toEqual({
      type: 'hovered',
      tag: 'a',
      domPath: 'body > a:nth-of-type(2)',
      hitTests: 9,
      generation: 2,
    });
  });
});

describe('guest error report', () => {
  function sentByPreload(error: unknown): Extract<PickerToHost, { type: 'error' }> {
    const scrubbed = scrubException(error, 'web:javascript');
    return {
      type: 'error',
      report: { type: scrubbed.type, value: scrubbed.value, frames: scrubbed.stacktrace?.frames ?? [] },
      generation: 1,
    };
  }

  it.each([
    ['at the cap', 'x'.repeat(MESSAGE_MAX)],
    ['over the cap', 'x'.repeat(MESSAGE_MAX * 4)],
    ['multibyte, at the cap', 'é'.repeat(MESSAGE_MAX)],
  ])('reaches the host as the preload scrubbed it when the message is %s', (_, message) => {
    const sent = sentByPreload(new Error(message));
    expect(parsePickerToHost(sent)).toEqual(sent);
  });

  const appDir = '/Applications/Studio.app/Contents/Resources/app.asar/out/preload';
  it.each([
    ['filename', `at handler (${appDir}/${'a'.repeat(FILENAME_MAX)}.js:1:2)`],
    ['function name', `at ${'f'.repeat(FUNCTION_MAX * 2)} (${appDir}/guest.js:1:2)`],
    ['line number', `at handler (${appDir}/guest.js:${'9'.repeat(20)}:2)`],
  ])('reaches the host as the preload scrubbed it when an app frame %s is out of bounds', (_, frameLine) => {
    const error = new Error('boom');
    error.stack = `Error: boom\n    ${frameLine}`;
    const sent = sentByPreload(error);
    expect(sent.report.frames.map((frame) => frame.in_app)).toEqual([true]);
    expect(parsePickerToHost(sent)).toEqual(sent);
  });

  it('refuses a field past what the scrubber writes, and any other malformed report', () => {
    const report = { type: 'Error', value: 'boom', frames: [] };
    const frame = { platform: 'web:javascript', filename: 'app://studio/preload/guest.js', function: 'handler', in_app: true };
    const send = (overrides: Record<string, unknown>) =>
      parsePickerToHost({ type: 'error', report: { ...report, ...overrides }, generation: 1 });
    expect(send({})).not.toBeNull();
    expect(send({ frames: [frame] })).not.toBeNull();
    expect(send({ value: 'x'.repeat(MESSAGE_MAX + 1) })).toBeNull();
    expect(send({ frames: [{ ...frame, filename: 'f'.repeat(FILENAME_MAX + 1) }] })).toBeNull();
    expect(send({ frames: [{ ...frame, function: 'f'.repeat(FUNCTION_MAX + 1) }] })).toBeNull();
    expect(send({ frames: [{ ...frame, lineno: 2 ** 53 }] })).toBeNull();
    expect(send({ frames: [{ ...frame, platform: 'node:javascript' }] })).toBeNull();
    expect(send({ value: 42 })).toBeNull();
    expect(send({ type: '' })).toBeNull();
    expect(send({ extra: true })).toBeNull();
  });
});
