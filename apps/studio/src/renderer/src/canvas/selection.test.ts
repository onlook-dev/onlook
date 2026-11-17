import { describe, expect, it } from 'bun:test';
import {
  EVIDENCE_CLASS_MAX,
  EVIDENCE_CLASSES_MAX,
  EVIDENCE_DOM_PATH_MAX,
  EVIDENCE_FRAME_URL_MAX,
  EVIDENCE_OUTER_HTML_MAX,
  EVIDENCE_TEXT_MAX,
  MAX_ELEMENT_SELECTIONS,
  parseElementEvidence,
  parseElementEvidenceBatch,
  type CanvasNode,
  type ElementEvidence,
} from '@studio/events';
import { artifactTag } from '../nodeLabel.js';
import {
  addSelection,
  canvasNodeFacts,
  dropFrameSelections,
  isOriginChange,
  markStale,
  refreshSelection,
  rehomeFrameSelections,
  removeSelection,
  seedableSelectionsForFrame,
  selectedObjects,
  selectionEvidence,
  selectionFrameIdentity,
  selectionFrameIds,
  selectionsForFrame,
  soleNodeIdNamed,
  staleFrameSelections,
  type ElementSelection,
  type SelectedNodeFacts,
  type SelectedObject,
} from './selection.js';

function evidence(id: string, tag = 'button'): ElementEvidence {
  return {
    kind: 'element',
    id,
    tag,
    domPath: `body:nth-of-type(1) > ${tag}:nth-of-type(1)`,
    outerHtmlSnippet: `<${tag}></${tag}>`,
    textContent: '',
    classes: [],
    frameUrl: 'http://localhost:3000/',
  };
}

function held(...ids: string[]): ElementSelection[] {
  return ids.map((id) => ({ evidence: evidence(id), frameNodeId: 'f1', stale: false }));
}

function fat(id: string): ElementEvidence {
  return {
    ...evidence(id),
    domPath: 'd'.repeat(EVIDENCE_DOM_PATH_MAX),
    outerHtmlSnippet: 'h'.repeat(EVIDENCE_OUTER_HTML_MAX),
    textContent: 'x'.repeat(EVIDENCE_TEXT_MAX),
    classes: Array.from({ length: EVIDENCE_CLASSES_MAX }, (_, index) =>
      `${index}`.padEnd(EVIDENCE_CLASS_MAX, 'c'),
    ),
    frameUrl: `http://localhost/${'u'.repeat(EVIDENCE_FRAME_URL_MAX - 17)}`,
  };
}

describe('addSelection', () => {
  it('replaces on a plain pick', () => {
    const next = addSelection(held('a', 'b'), evidence('c'), 'f1', false);
    expect(next.selections.map((s) => s.evidence.id)).toEqual(['c']);
    expect(next.outcome).toBe('added');
  });

  it('appends on a SHIFT pick', () => {
    const next = addSelection(held('a'), evidence('b'), 'f1', true);
    expect(next.selections.map((s) => s.evidence.id)).toEqual(['a', 'b']);
    expect(next.outcome).toBe('added');
  });

  it('gathers across frames on a SHIFT pick, each element keeping its own frame, while a plain pick still replaces', () => {
    const current = held('a');
    const gather = addSelection(current, evidence('b'), 'f2', true);
    expect(gather.outcome).toBe('added');
    expect(gather.selections.map((s) => [s.evidence.id, s.frameNodeId])).toEqual([
      ['a', 'f1'],
      ['b', 'f2'],
    ]);
    expect(addSelection(gather.selections, evidence('c'), 'f3', false).selections).toEqual([
      { evidence: evidence('c'), frameNodeId: 'f3', stale: false },
    ]);
  });

  it('counts the element cap across every frame, not per frame', () => {
    const full = Array.from({ length: MAX_ELEMENT_SELECTIONS }, (_, index) => ({
      evidence: evidence(`e${String(index)}`),
      frameNodeId: index % 2 === 0 ? 'f1' : 'f2',
      stale: false,
    }));
    expect(addSelection(full, evidence('over'), 'f3', true).outcome).toBe('count-cap');
  });

  it('reports a SHIFT pick of something already held as held, never as a success', () => {
    const next = addSelection(held('a'), evidence('a'), 'f1', true);
    expect(next.selections.map((s) => s.evidence.id)).toEqual(['a']);
    expect(next.outcome).toBe('already-held');
  });

  it('refuses to gather past the cap, and the tenth still reports no refusal', () => {
    const nine = held(...Array.from({ length: MAX_ELEMENT_SELECTIONS - 1 }, (_, i) => `e${i}`));
    const tenth = addSelection(nine, evidence('tenth'), 'f1', true);
    expect(tenth.selections).toHaveLength(MAX_ELEMENT_SELECTIONS);
    expect(tenth.outcome).toBe('added');

    const eleventh = addSelection(tenth.selections, evidence('one-more'), 'f1', true);
    expect(eleventh.selections).toBe(tenth.selections);
    expect(eleventh.outcome).toBe('count-cap');
  });

  it('still replaces at the cap — a plain pick is never blocked', () => {
    const full = held(...Array.from({ length: MAX_ELEMENT_SELECTIONS }, (_, i) => `e${i}`));
    const next = addSelection(full, evidence('fresh'), 'f1', false);
    expect(next.selections.map((s) => s.evidence.id)).toEqual(['fresh']);
    expect(next.outcome).toBe('added');
  });
});

/** Class tokens are capped in raw UTF-8 and weighed JSON-escaped: one control byte per six, so one element outgrows the aggregate. */
function escaped(id: string): ElementEvidence {
  return {
    ...evidence(id),
    classes: Array.from({ length: EVIDENCE_CLASSES_MAX }, () =>
      ''.repeat(EVIDENCE_CLASS_MAX),
    ),
  };
}

describe('the aggregate byte budget (ONL-2455)', () => {
  it('refuses a plain pick of the one element the door would discard whole', () => {
    const current = held('a');
    const one = escaped('escaped-1');
    expect(parseElementEvidence(one)).not.toBeNull();
    expect(parseElementEvidenceBatch([one])).toBeNull();

    const refused = addSelection(current, one, 'f1', false);
    expect(refused.outcome).toBe('byte-cap');
    expect(refused.selections).toBe(current);
  });

  it('leaves an accepted plain pick survivable at the door, at its field ceilings', () => {
    const accepted = addSelection(held('a'), fat('fat-1'), 'f1', false);
    expect(accepted.outcome).toBe('added');
    expect(parseElementEvidenceBatch(selectionEvidence(accepted.selections))).toHaveLength(1);
  });

  it('refuses a ⇧-gather the door at main would discard whole', () => {
    const one = addSelection([], fat('fat-1'), 'f1', false);
    expect(parseElementEvidenceBatch(selectionEvidence(one.selections))).toHaveLength(1);

    const two = addSelection(one.selections, fat('fat-2'), 'f1', true);
    expect(two.outcome).toBe('byte-cap');
    expect(two.selections).toBe(one.selections);
    expect(parseElementEvidenceBatch(selectionEvidence(two.selections))).not.toBeNull();
  });

  it('leaves every accepted set survivable at the door, cap-full included', () => {
    let selections = addSelection([], evidence('first'), 'f1', false).selections;
    for (let index = 1; index < MAX_ELEMENT_SELECTIONS; index += 1) {
      const next = addSelection(selections, evidence(`e${index}`), 'f1', true);
      expect(next.outcome).toBe('added');
      selections = next.selections;
      expect(parseElementEvidenceBatch(selectionEvidence(selections))).toHaveLength(
        selections.length,
      );
    }
  });

  it('is measured over what the prompt carries, freshness included', () => {
    const one = addSelection([], fat('fat-1'), 'f1', false);
    const stale = markStale(one.selections, 'fat-1', true);
    expect(addSelection(stale, fat('fat-2'), 'f1', true).outcome).toBe('byte-cap');
  });
});

describe('removeSelection and markStale', () => {
  it('drops exactly the named selection', () => {
    expect(removeSelection(held('a', 'b', 'c'), 'b').map((s) => s.evidence.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('is a no-op for an unknown id', () => {
    const current = held('a');
    expect(removeSelection(current, 'ghost')).toBe(current);
  });

  it('marks and unmarks staleness — an element can come back', () => {
    const stale = markStale(held('a', 'b'), 'a', true);
    expect(stale.find((s) => s.evidence.id === 'a')?.stale).toBe(true);
    expect(stale.find((s) => s.evidence.id === 'b')?.stale).toBe(false);
    const back = markStale(stale, 'a', false);
    expect(back.find((s) => s.evidence.id === 'a')?.stale).toBe(false);
  });
});

describe('refreshSelection', () => {
  it('replaces re-resolved evidence and clears its stale state', () => {
    const stale = markStale(held('a'), 'a', true);
    const refreshed = evidence('a', 'a');
    refreshed.textContent = 'Current copy';
    const next = refreshSelection(stale, refreshed);
    expect(next[0]?.evidence).toEqual(refreshed);
    expect(next[0]?.stale).toBe(false);
  });

  it('keeps the held copy when the re-resolved one would outgrow the aggregate', () => {
    const current = addSelection([], evidence('a'), 'f1', false).selections;
    expect(refreshSelection(current, escaped('a'))).toBe(current);
  });

  it('preserves identity for unknown or unchanged evidence', () => {
    const selections = held('a');
    expect(refreshSelection(selections, evidence('ghost'))).toBe(selections);
    expect(refreshSelection(selections, evidence('a'))).toBe(selections);
  });
});

describe('the tier-3 verdict (ONL-1994)', () => {
  it('answers true only for a positive origin-to-origin change', () => {
    expect(isOriginChange('http://localhost:3000/', 'http://localhost:3001/')).toBe(true);
    expect(isOriginChange('http://localhost:3000/', 'http://example.com:3000/')).toBe(true);
    expect(isOriginChange('http://localhost:3000/', 'https://localhost:3000/')).toBe(true);
  });

  it('reads a same-origin move as no change — tier 2 territory, never a drop', () => {
    expect(isOriginChange('http://localhost:3000/', 'http://localhost:3000/settings')).toBe(false);
    expect(isOriginChange('http://localhost:3000/a', 'http://localhost:3000/a')).toBe(false);
  });

  it('refuses a verdict on unparseable or opaque origins — no evidence the user left the app', () => {
    expect(isOriginChange('not a url', 'http://localhost:3000/')).toBe(false);
    expect(isOriginChange('http://localhost:3000/', 'about:blank')).toBe(false);
  });
});

describe('dropFrameSelections (tier 3)', () => {
  it('drops exactly the named frame’s selections', () => {
    const mixed: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f1', stale: false },
      { evidence: evidence('b'), frameNodeId: 'f2', stale: false },
      { evidence: evidence('c'), frameNodeId: 'f1', stale: true },
    ];
    expect(dropFrameSelections(mixed, 'f1').map((s) => s.evidence.id)).toEqual(['b']);
  });

  it('preserves identity when the frame holds nothing', () => {
    const current = held('a', 'b');
    expect(dropFrameSelections(current, 'other-frame')).toBe(current);
  });
});

describe('selectionFrameIds', () => {
  it('names each frame the selections came from once, in pick order', () => {
    const mixed: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f2', stale: false },
      { evidence: evidence('b'), frameNodeId: 'f1', stale: false },
      { evidence: evidence('c'), frameNodeId: 'f2', stale: false },
    ];
    expect(selectionFrameIds(mixed)).toEqual(['f2', 'f1']);
    expect(selectionFrameIds([])).toEqual([]);
  });
});

describe('selectionFrameIdentity', () => {
  it('is empty with nothing selected', () => {
    expect(selectionFrameIdentity([], () => 'ghost')).toBe('');
  });

  it('resolves to the frame the pick came FROM — identity, never URL matching', () => {
    const names = new Map([
      ['f-desktop', 'desktop'],
      ['f-mobile', 'mobile'],
    ]);
    const pickedInMobile: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f-mobile', stale: false },
    ];
    expect(selectionFrameIdentity(pickedInMobile, (id) => names.get(id))).toBe(
      'The selected elements were picked in canvas frame "mobile" (id f-mobile).',
    );
  });

  it('falls back to the bare frame id when no name resolves', () => {
    const current: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f9', stale: false },
    ];
    expect(selectionFrameIdentity(current, () => undefined)).toBe(
      'The selected elements were picked in canvas frame f9.',
    );
  });

  it('groups per frame when selections span frames', () => {
    const mixed: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f1', stale: false },
      { evidence: evidence('b'), frameNodeId: 'f2', stale: false },
      { evidence: evidence('c'), frameNodeId: 'f1', stale: false },
    ];
    expect(selectionFrameIdentity(mixed, (id) => (id === 'f1' ? 'desktop' : undefined))).toBe(
      [
        'The selected elements were picked in these canvas frames:',
        '- "desktop" (id f1): a, c',
        '- f2: b',
      ].join('\n'),
    );
  });
});

describe('the ambient frame-selection arm (ONL-2045)', () => {
  const names = new Map([
    ['f1', 'Desktop'],
    ['f2', 'Mobile'],
  ]);
  const lookup = (id: string): string | undefined => names.get(id);
  const heldFrames = (ids: readonly string[], name = lookup): SelectedObject[] =>
    selectedObjects(ids, (id) => {
      const found = name(id);
      return found === undefined ? undefined : { kind: 'browser', name: found, label: found };
    });

  it('names one selected frame in the ambient register — not aim phrasing', () => {
    expect(selectionFrameIdentity([], lookup, heldFrames(['f1']))).toBe(
      'The user currently has canvas frame "Desktop" (id f1) selected.',
    );
  });

  it('names several selected frames, in selection order', () => {
    expect(selectionFrameIdentity([], lookup, heldFrames(['f2', 'f1']))).toBe(
      'The user currently has these canvas frames selected: "Mobile" (id f2), "Desktop" (id f1).',
    );
  });

  it('a MIXED composition cross-references: the selected frame is named as NOT the elements’ frame', () => {
    const picked: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f2', stale: false },
    ];
    expect(selectionFrameIdentity(picked, lookup, heldFrames(['f1']))).toBe(
      [
        'The selected elements were picked in canvas frame "Mobile" (id f2).',
        'The user currently has canvas frame "Desktop" (id f1) selected — not the frame the selected elements were picked in.',
      ].join('\n'),
    );
  });

  it('the SAME-frame composition stays byte-identical to the pre-batch shape', () => {
    const picked: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f2', stale: false },
    ];
    expect(selectionFrameIdentity(picked, lookup, heldFrames(['f2']))).toBe(
      [
        'The selected elements were picked in canvas frame "Mobile" (id f2).',
        'The user currently has canvas frame "Mobile" (id f2) selected.',
      ].join('\n'),
    );
  });

  it('a mixed PLURAL selection annotates the elements’ frame instead of listing it as a bare target', () => {
    const picked: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f2', stale: false },
    ];
    expect(selectionFrameIdentity(picked, lookup, heldFrames(['f2', 'f1']))).toBe(
      [
        'The selected elements were picked in canvas frame "Mobile" (id f2).',
        'The user currently has these canvas frames selected: "Mobile" (id f2) (where the selected elements were picked), "Desktop" (id f1).',
      ].join('\n'),
    );
  });

  it('a plural selection DISJOINT from the elements’ frame says none of them holds the elements', () => {
    const names3 = (id: string): string | undefined =>
      id === 'f3' ? 'Tablet' : lookup(id);
    const picked: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f3', stale: false },
    ];
    expect(selectionFrameIdentity(picked, names3, heldFrames(['f2', 'f1'], names3))).toBe(
      [
        'The selected elements were picked in canvas frame "Tablet" (id f3).',
        'The user currently has these canvas frames selected: "Mobile" (id f2), "Desktop" (id f1) — none of them the frame the selected elements were picked in.',
      ].join('\n'),
    );
  });

  it('names an artifact as an artifact, never as an image', () => {
    // The agent reads this line and acts on what it says: calling a sketch an image sends it
    // looking for a picture to edit (ONL-2568).
    const sketch = selectedObjects(['a1'], () => ({
      kind: 'artifact',
      name: '',
      label: 'Pricing',
    }));

    expect(selectionFrameIdentity([], lookup, sketch)).toBe(
      'The user currently has the canvas artifact "Pricing" (id a1) selected.',
    );
  });

  it('names an artifact among several selected objects', () => {
    const several = selectedObjects(['a1', 'f1'], (id) =>
      id === 'a1'
        ? { kind: 'artifact', name: '', label: 'Pricing' }
        : { kind: 'browser', name: 'Desktop', label: 'Desktop' },
    );

    expect(selectionFrameIdentity([], lookup, several)).toBe(
      'The user currently has these canvas objects selected: the artifact "Pricing" (id a1), "Desktop" (id f1).',
    );
  });

  it('skips an in-flight mint the lookup cannot name', () => {
    expect(selectionFrameIdentity([], lookup, heldFrames(['minted-not-yet-echoed']))).toBe('');
    expect(selectionFrameIdentity([], lookup, heldFrames(['minted-not-yet-echoed', 'f1']))).toBe(
      'The user currently has canvas frame "Desktop" (id f1) selected.',
    );
  });
});

describe('selectedObjects — the pill projection (ONL-2045)', () => {
  const objects: Record<string, SelectedNodeFacts> = {
    f1: { kind: 'browser', name: 'Desktop', label: 'Desktop' },
    f2: { kind: 'browser', name: 'Mobile', label: 'Mobile' },
    t1: { kind: 'text', name: '', label: 'Variants', text: 'Variants' },
    i1: { kind: 'image', name: 'mockup.png', label: 'mockup.png', imageId: 'blob-7' },
  };
  const lookup = (id: string): SelectedNodeFacts | undefined => objects[id];

  it('projects the selection set in its own recency order, names joined', () => {
    expect(selectedObjects(['f2', 'f1'], lookup)).toEqual([
      { id: 'f2', kind: 'browser', name: 'Mobile', label: 'Mobile' },
      { id: 'f1', kind: 'browser', name: 'Desktop', label: 'Desktop' },
    ]);
  });

  it('skips a mint with no composed node', () => {
    expect(selectedObjects(['minted', 'f1'], lookup)).toEqual([
      { id: 'f1', kind: 'browser', name: 'Desktop', label: 'Desktop' },
    ]);
    expect(selectedObjects(['minted'], lookup)).toEqual([]);
  });

  it('names each kind, and carries a picture stored id (ONL-2486)', () => {
    expect(selectedObjects(['t1', 'i1'], lookup)).toEqual([
      { id: 't1', kind: 'text', name: '', label: 'Variants', text: 'Variants' },
      { id: 'i1', kind: 'image', name: 'mockup.png', label: 'mockup.png', imageId: 'blob-7' },
    ]);
  });
});

const ONE_ARTIFACT = '3f9c1d20-1111-4111-8111-aaaaaaaaaaaa';
const TWO_ARTIFACT = 'b71e4a55-2222-4222-8222-bbbbbbbbbbbb';
/** Two valid uuids whose first four characters are one string (ONL-2568). */
const SHARED_ONE_ARTIFACT = '3c49a1b2-1111-4111-8111-aaaaaaaaaaaa';
const SHARED_TWO_ARTIFACT = '3c49f7e8-2222-4222-8222-bbbbbbbbbbbb';

describe('canvasNodeFacts — the document node the projection reads (ONL-2486)', () => {
  const box = { pageId: 'pg_main', x: 0, y: 0, width: 10, height: 10, order: 0 };

  const translate = (key: string, params?: Record<string, string | number>): string =>
    params === undefined ? key : `${key}:${Object.values(params).join(':')}`;
  /** A node is named against the set it sits in, and most of these sit alone in theirs. */
  const factsOf = (node: CanvasNode): SelectedNodeFacts | undefined =>
    canvasNodeFacts(node, translate, [node]);
  const artifact = (id: string, title: string, artifactId: string): CanvasNode => ({
    ...box,
    id,
    kind: 'artifact',
    name: '',
    content: { artifactId, title },
  });

  it('shows the current artifact title alone, keeping the node alias stored but unshown (ONL-2593)', () => {
    const node = {...artifact('node', 'Old title', 'artifact'), name: 'Local alias'};
    const current = canvasNodeFacts(node, translate, [node], new Map([['artifact', 'New title']]));
    expect(current?.name).toBe('New title');
    expect(current?.label).toBe('New title');
    expect(node.name).toBe('Local alias');
    expect(node.content).toEqual({artifactId: 'artifact', title: 'Old title'});
  });

  it('carries a picture stored id and nothing else off the content', () => {
    expect(
      factsOf({
        ...box,
        id: 'i1',
        pageId: 'pg_main',
        kind: 'image',
        name: 'mockup.png',
        content: { imageId: 'blob-7', name: 'mockup.png', originalWidth: 8, originalHeight: 6 },
      }),
    ).toEqual({ kind: 'image', name: 'mockup.png', label: 'mockup.png', imageId: 'blob-7' });
  });

  it('names a frame and a text object by kind, and answers nothing for an id the document dropped', () => {
    expect(
      factsOf({ ...box, id: 't1', kind: 'text', name: 'Variants', content: { text: 'Variants', size: 'medium' } }),
      // The words ride along: a blank name derives its label from them, on the row and in the chip alike.
    ).toEqual({ kind: 'text', name: 'Variants', label: 'Variants', text: 'Variants' });
    expect(
      factsOf({ ...box, id: 'f1', kind: 'browser', name: 'Desktop', content: { homeUrl: 'http://localhost:3000/' } }),
    ).toEqual({ kind: 'browser', name: 'Desktop', label: 'Desktop' });
    expect(canvasNodeFacts(undefined, translate, [])).toBeUndefined();
  });

  it('labels a real text node, whose stored name is always blank, by its own words (ONL-2486)', () => {
    expect(
      factsOf({ ...box, id: 't1', kind: 'text', name: '', content: { text: 'Checkout, final pass', size: 'medium' } }),
    ).toEqual({ kind: 'text', name: '', label: 'Checkout, final pass', text: 'Checkout, final pass' });
  });

  it('falls back to the catalogue for a blank label with no words to derive from', () => {
    expect(
      factsOf({ ...box, id: 't1', kind: 'text', name: '', content: { text: '  ', size: 'medium' } })?.label,
    ).toBe('sidebar.text.untitled');
  });

  it('gives two artifacts sharing a title different chip labels (ONL-2568)', () => {
    const one = artifact('a1', 'Pricing', ONE_ARTIFACT);
    const two = artifact('a2', 'Pricing', TWO_ARTIFACT);
    const among = [one, two];

    const first = canvasNodeFacts(one, translate, among)?.label;
    const second = canvasNodeFacts(two, translate, among)?.label;

    expect(first).not.toBe(second);
    expect(first).toContain(artifactTag(ONE_ARTIFACT));
    expect(second).toContain(artifactTag(TWO_ARTIFACT));
  });

  it('gives them different labels even when their ids share the tag’s leading characters (ONL-2568)', () => {
    const one = artifact('a1', 'Pricing', SHARED_ONE_ARTIFACT);
    const two = artifact('a2', 'Pricing', SHARED_TWO_ARTIFACT);
    const among = [one, two];

    const first = canvasNodeFacts(one, translate, among)?.label;
    const second = canvasNodeFacts(two, translate, among)?.label;

    expect(artifactTag(SHARED_ONE_ARTIFACT)).toBe(artifactTag(SHARED_TWO_ARTIFACT));
    expect(first).not.toBe(second);
    expect(first).toContain('3c49a');
    expect(second).toContain('3c49f');
  });

  it('leaves an artifact chip label plain while no other artifact holds its title', () => {
    const one = artifact('a1', 'Pricing', ONE_ARTIFACT);

    expect(canvasNodeFacts(one, translate, [one, artifact('a2', 'Checkout', TWO_ARTIFACT)])?.label).toBe(
      'Pricing',
    );
  });
});

describe('per-frame views', () => {
  it('re-seeds only the frame that owns the selection', () => {
    const mixed: ElementSelection[] = [
      { evidence: evidence('a'), frameNodeId: 'f1', stale: false },
      { evidence: evidence('b'), frameNodeId: 'f2', stale: false },
    ];
    expect(selectionsForFrame(mixed, 'f1').map((s) => s.evidence.id)).toEqual(['a']);
  });

  it('sends every selection, stale ones included', () => {
    const withStale = markStale(held('a', 'b'), 'b', true);
    expect(selectionEvidence(withStale).map((e) => e.id)).toEqual(['a', 'b']);
    expect(selectionEvidence(withStale).map((e) => e.stale)).toEqual([false, true]);
  });
});

describe('what a frame’s elements become when their page is gone (ONL-2518)', () => {
  const mixed = (): ElementSelection[] => [
    { evidence: evidence('a'), frameNodeId: 'f1', stale: false },
    { evidence: evidence('b'), frameNodeId: 'f2', stale: false },
  ];

  it('flags only the frame whose page went, leaving every other frame’s alone', () => {
    const after = staleFrameSelections(mixed(), 'f1');
    expect(after.map((s) => [s.evidence.id, s.stale])).toEqual([
      ['a', true],
      ['b', false],
    ]);
  });

  it('keeps the evidence whole, so the submit still carries the path and the url', () => {
    expect(staleFrameSelections(mixed(), 'f1')[0]?.evidence).toEqual(evidence('a'));
  });

  it('returns the same array when the frame has nothing fresh to flag', () => {
    const already = staleFrameSelections(mixed(), 'f1');
    expect(staleFrameSelections(already, 'f1')).toBe(already);
    expect(staleFrameSelections(already, 'absent')).toBe(already);
  });
});

describe('which held elements a document is offered to re-adopt (ONL-2518)', () => {
  const heldAcrossOrigins = (): ElementSelection[] => [
    { evidence: evidence('a'), frameNodeId: 'f1', stale: false },
    {
      evidence: { ...evidence('b'), frameUrl: 'http://localhost:5173/' },
      frameNodeId: 'f1',
      stale: true,
    },
    { evidence: evidence('c'), frameNodeId: 'f2', stale: false },
  ];

  const offered = (currentUrl: string | undefined): string[] =>
    seedableSelectionsForFrame(heldAcrossOrigins(), 'f1', currentUrl).map((s) => s.evidence.id);

  it('offers the ones picked on the origin the page is on now, flagged or not', () => {
    expect(offered('http://localhost:3000/other')).toEqual(['a']);
  });

  it('offers those picked on the page itself, however deep the path changed', () => {
    expect(offered('http://localhost:3000/a/b/c')).toEqual(['a']);
  });

  it('offers nothing of another origin, which a matching domPath there would answer wrongly', () => {
    expect(offered('https://example.com/')).toEqual([]);
  });

  it('offers nothing when the frame has no measured url, rather than everything', () => {
    expect(offered(undefined)).toEqual([]);
  });

  it('offers nothing to a document whose origin cannot be read, which matches nothing safely', () => {
    expect(offered('about:blank')).toEqual([]);
    expect(offered('data:text/html,<p>hi</p>')).toEqual([]);
    expect(offered('not a url')).toEqual([]);
  });

  it('offers only the asking frame’s own elements', () => {
    expect(
      seedableSelectionsForFrame(heldAcrossOrigins(), 'f2', 'http://localhost:3000/').map(
        (s) => s.evidence.id,
      ),
    ).toEqual(['c']);
  });
});

describe('a frame following its app to a new port (ONL-2518)', () => {
  const held2 = (): ElementSelection[] => [
    { evidence: evidence('a'), frameNodeId: 'f1', stale: false },
    { evidence: evidence('b'), frameNodeId: 'f2', stale: false },
  ];

  it('moves the frame’s elements to the address it followed, leaving other frames alone', () => {
    const after = rehomeFrameSelections(held2(), 'f1', 'http://localhost:4000/');
    expect(after.map((s) => s.evidence.frameUrl)).toEqual([
      'http://localhost:4000/',
      'http://localhost:3000/',
    ]);
  });

  it('keeps everything else about the element, so the path it was picked by still holds', () => {
    const after = rehomeFrameSelections(held2(), 'f1', 'http://localhost:4000/');
    expect(after[0]).toEqual({
      evidence: { ...evidence('a'), frameUrl: 'http://localhost:4000/' },
      frameNodeId: 'f1',
      stale: false,
    });
  });

  it('leaves the new address offered to the page it followed to', () => {
    const after = rehomeFrameSelections(held2(), 'f1', 'http://localhost:4000/');
    expect(seedableSelectionsForFrame(after, 'f1', 'http://localhost:4000/').map((s) => s.evidence.id)).toEqual(['a']);
  });

  it('returns the same array when the frame is already at that address', () => {
    const current = held2();
    expect(rehomeFrameSelections(current, 'f1', 'http://localhost:3000/')).toBe(current);
    expect(rehomeFrameSelections(current, 'absent', 'http://localhost:4000/')).toBe(current);
  });

  it('keeps the old address rather than growing past what the door admits', () => {
    const many = Array.from({ length: MAX_ELEMENT_SELECTIONS }, (_, index) => ({
      evidence: evidence(`e${String(index)}`),
      frameNodeId: 'f1',
      stale: false,
    }));
    const long = `http://localhost/${'u'.repeat(EVIDENCE_FRAME_URL_MAX - 17)}`;
    expect(rehomeFrameSelections(many, 'f1', long)).toBe(many);
  });
});

describe('an element the guest reports again after the host gave up on it (ONL-2518)', () => {
  it('clears the flag the host wrote, even when nothing about the element changed', () => {
    const flagged = markStale(held('a'), 'a', true);
    expect(refreshSelection(flagged, evidence('a'))[0]?.stale).toBe(false);
  });

  it('still returns the same array when there was no flag to clear', () => {
    const current = held('a');
    expect(refreshSelection(current, evidence('a'))).toBe(current);
  });
});

describe('soleNodeIdNamed — what a transcript chip resolves to (ONL-2488)', () => {
  const frame = (id: string, pageId: string, name: string): CanvasNode => ({
    id,
    pageId,
    kind: 'browser',
    name,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    order: 0,
    content: { homeUrl: `http://localhost:3000/${id}` },
  });

  it('answers the one node wearing the name', () => {
    const nodes = { a: frame('a', 'pg_a', 'Checkout'), b: frame('b', 'pg_b', 'Settings') };

    expect(soleNodeIdNamed(nodes, 'Settings')).toBe('b');
    expect(soleNodeIdNamed(nodes, 'Nothing')).toBeUndefined();
    expect(soleNodeIdNamed(undefined, 'Checkout')).toBeUndefined();
  });

  it('answers nothing for two frames sharing a name on different pages, as it would on one', () => {
    const together = { a: frame('a', 'pg_a', 'Checkout'), b: frame('b', 'pg_a', 'Checkout') };
    const apart = { a: frame('a', 'pg_a', 'Checkout'), b: frame('b', 'pg_b', 'Checkout') };

    expect(soleNodeIdNamed(together, 'Checkout')).toBeUndefined();
    expect(soleNodeIdNamed(apart, 'Checkout')).toBeUndefined();
  });
});
