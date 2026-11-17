import { describe, expect, it } from 'bun:test';
import type { ComposerDraft, ElementEvidence, ImageRef } from '@studio/events';
import { planDraftRestore, planRecalledElements, planRecalledFrames, restoreArtifactReferences, restoredArtifactLabels } from './draftRestore.js';

it('restores stored element evidence as a stale chip only on one matching frame', () => {
  const evidence: ElementEvidence = { kind: 'element', id: 'element', tag: 'h1', domPath: 'h1:nth-of-type(1)', outerHtmlSnippet: '<h1>Header</h1>', textContent: 'Header', classes: [], frameUrl: 'http://localhost:3000/' };
  const frame = { id: 'frame', currentUrl: evidence.frameUrl };
  expect(planRecalledElements([evidence], [frame])).toEqual({ selections: [{ evidence, frameNodeId: 'frame', stale: true }], missing: [] });
  expect(planRecalledElements([evidence], [{ id: 'target', targetUrl: evidence.frameUrl }]).selections[0]?.frameNodeId).toBe('target');
  expect(planRecalledElements([evidence], [])).toEqual({ selections: [], missing: ['h1'] });
  expect(planRecalledElements([evidence], [frame, { ...frame, id: 'duplicate' }])).toEqual({ selections: [], missing: ['h1'] });
  expect(planRecalledElements([evidence], [{ id: 'other-origin', currentUrl: 'http://localhost:4000/' }])).toEqual({ selections: [], missing: ['h1'] });
});

it('restores a frame chip only when this page holds exactly one frame with that label (ONL-2509)', () => {
  const chip = { kind: 'frame' as const, name: 'Home' };
  expect(planRecalledFrames([chip], [{ id: 'home', label: 'Home' }])).toEqual({ frameNodeIds: ['home'], missing: [] });
  // The twin on another page is not among this page's, so the chip is not ambiguous here.
  expect(planRecalledFrames([chip], [{ id: 'home', label: 'Home' }, { id: 'pricing', label: 'Pricing' }]).frameNodeIds).toEqual(['home']);
  expect(planRecalledFrames([chip], [{ id: 'home', label: 'Home' }, { id: 'twin', label: 'Home' }])).toEqual({ frameNodeIds: [], missing: ['Home'] });
  expect(planRecalledFrames([chip], [])).toEqual({ frameNodeIds: [], missing: ['Home'] });
  expect(planRecalledFrames([chip], [{ id: 'unnamed', label: undefined }])).toEqual({ frameNodeIds: [], missing: ['Home'] });
  expect(planRecalledFrames([{ kind: 'artifact', artifactId: 'a', title: 'Home' }], [{ id: 'home', label: 'Home' }])).toEqual({ frameNodeIds: [], missing: [] });
});

it('restores title-only labels unless a distinct sketch shares the current title on the canvas or draft', () => {
  const first = { kind: 'artifact' as const, artifactId: '12340000-1111-4111-8111-000000000001', title: 'Old title' };
  const second = { ...first, artifactId: '12340001-1111-4111-8111-000000000002' };
  const titles = new Map([[first.artifactId, 'Pricing'], [second.artifactId, 'Pricing']]);
  expect(restoredArtifactLabels([first], [], titles).get(first.artifactId)).toBe('Pricing');
  expect(restoredArtifactLabels([first], [{ id: first.artifactId, title: 'Stale' }], titles).get(first.artifactId)).toBe('Pricing');
  const draft = restoredArtifactLabels([first, second], [], titles);
  expect(draft.get(first.artifactId)).toBe('Pricing · 12340000');
  expect(draft.get(second.artifactId)).toBe('Pricing · 12340001');
  expect(restoredArtifactLabels([first], [{ id: second.artifactId, title: 'Stale' }], titles).get(first.artifactId)).toBe('Pricing · 12340000');
  expect(restoredArtifactLabels([first, second], [], new Map([[first.artifactId, 'Pricing'], [second.artifactId, 'Checkout']])).get(first.artifactId)).toBe('Pricing');
});

it('keeps readable stored titles when the artifact catalog is temporarily unavailable', () => {
  const references = [
    { kind: 'artifact' as const, artifactId: '12340000-1111-4111-8111-000000000001', title: 'Pricing' },
    { kind: 'artifact' as const, artifactId: '12340001-1111-4111-8111-000000000002', title: 'Checkout' },
  ];
  expect([...restoredArtifactLabels(references, [], new Map()).values()]).toEqual(['Pricing', 'Checkout']);
});

it('drops deleted artifact and page references while restoring canonical titles', async () => {
  const references = ['kept', 'deleted', 'removed-page'].map((artifactId) => ({ kind: 'artifact' as const, artifactId, title: 'Old title', pagePath: 'pages/index.html' }));
  const restored = await restoreArtifactReferences(references, async (id) => id === 'deleted' ? null : {
    id, title: 'Current title', pagePath: 'pages/index.html', updatedAt: '', readOnly: false,
    pages: [{ path: id === 'removed-page' ? 'pages/cart.html' : 'pages/index.html', name: 'Home' }],
  });
  expect(restored).toEqual([{ ...references[0], title: 'Current title' }]);
});

it('does not discard a reference when its read fails rather than answering missing', async () => {
  const reference = { kind: 'artifact' as const, artifactId: 'kept', title: 'Kept' };
  const refuse = async (): Promise<never> => { throw new Error('temporarily unavailable'); };
  expect(await restoreArtifactReferences([reference], refuse)).toEqual([reference]);
  // A chip the recall is introducing is not kept on a refusal: unconfirmed, it would ride out on the next send (ONL-2509).
  expect(await restoreArtifactReferences([reference], refuse, 'drop')).toEqual([]);
});

const ref = (id: string): ImageRef => ({ id, mediaType: 'image/png', width: 8, height: 8 });
const stored = (text: string, images: ImageRef[] = []): ComposerDraft => ({ text, images });

describe('planDraftRestore', () => {
  it('carries the stored text whole, so the caret lands where the user stopped typing', () => {
    const text = 'make the hero taller,\nand leave the copy\n';
    expect(planDraftRestore(stored(text), { text: '' })).toEqual({ text });
  });

  it('leaves a composer that already holds text alone — no duplicate, no concatenation', () => {
    const restore = planDraftRestore(stored('from the draft'), { text: 'typed just now' });
    expect(restore).toBeNull();
  });

  it('never clears: an empty stored draft is no restore at all', () => {
    expect(planDraftRestore(stored(''), { text: 'typed just now' })).toBeNull();
    expect(planDraftRestore(stored(''), { text: '' })).toBeNull();
    expect(planDraftRestore(stored('', [ref('a')]), { text: '' })).toBeNull();
  });

  it('ignores the stored images when deciding the text, however many there are', () => {
    const text = 'crop it tighter';
    expect(planDraftRestore(stored(text, [ref('a'), ref('b')]), { text: '' })).toEqual({ text });
  });
});
