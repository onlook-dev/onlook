import { describe, expect, it } from 'bun:test';
import type { ImageRef } from '@studio/events';
import {
  addDraft,
  attachmentRefs,
  beginBatch,
  dismissFailure,
  dismissFailureOnKeystroke,
  EMPTY_ATTACHMENTS,
  endBatch,
  noteFailure,
  planDraftSwap,
  removeDraft,
  replaceDrafts,
} from './attachments.js';

const ref = (id: string): ImageRef => ({ id, mediaType: 'image/png', width: 8, height: 8 });
const draft = (id: string) => ({ ref: ref(id), name: `${id}.png`, previewUrl: `blob:${id}` });

describe('attachment drafts', () => {
  it('keeps valid drafts while recording a failure from the same batch', () => {
    let state = EMPTY_ATTACHMENTS;
    state = addDraft(state, draft('a'));
    state = noteFailure(state, { reason: 'unsupported-format', name: 'diagram.svg' });
    state = addDraft(state, draft('b'));

    expect(state.drafts).toHaveLength(2);
    expect(state.failure).toEqual({ reason: 'unsupported-format', name: 'diagram.svg' });
  });

  it('newest failure wins', () => {
    let state = noteFailure(EMPTY_ATTACHMENTS, { reason: 'too-large', name: 'huge.png' });
    state = noteFailure(state, { reason: 'unreadable', name: 'broken.jpg' });
    expect(state.failure?.reason).toBe('unreadable');
  });

  it('removal surrenders exactly the removed chip’s object URL', () => {
    let state = addDraft(EMPTY_ATTACHMENTS, draft('a'));
    state = addDraft(state, draft('b'));
    const { state: next, revokedUrl } = removeDraft(state, 'a');
    expect(revokedUrl).toBe('blob:a');
    expect(next.drafts.map((d) => d.ref.id)).toEqual(['b']);
  });

  it('removing an unknown id changes nothing and revokes nothing', () => {
    const state = addDraft(EMPTY_ATTACHMENTS, draft('a'));
    const { state: next, revokedUrl } = removeDraft(state, 'ghost');
    expect(revokedUrl).toBeUndefined();
    expect(next.drafts).toHaveLength(1);
  });

  it('a swap returns every outgoing URL for revocation and holds only the incoming drafts', () => {
    let state = addDraft(EMPTY_ATTACHMENTS, draft('a'));
    state = addDraft(state, draft('b'));
    const { state: next, revokedUrls } = replaceDrafts(state, [draft('c')]);
    expect(next.drafts.map((d) => d.ref.id)).toEqual(['c']);
    expect(revokedUrls).toEqual(['blob:a', 'blob:b']);
  });

  it('a swap to nothing empties the strip', () => {
    const state = addDraft(EMPTY_ATTACHMENTS, draft('a'));
    expect(replaceDrafts(state, []).state).toEqual(EMPTY_ATTACHMENTS);
  });

  it('a swap the walk outlived reports itself stale and still hands back every URL it read (ONL-2509)', async () => {
    let isWalking = true;
    const reads: string[] = [];
    const swap = await planDraftSwap(
      [{ ref: ref('wanted'), name: 'wanted.png' }],
      async (wanted, name) => {
        reads.push(wanted.id);
        // The user removes a chip, edits the text, or leaves the chat while main is still reading.
        isWalking = false;
        return { ref: wanted, name, previewUrl: `blob:${wanted.id}` };
      },
      () => isWalking,
    );

    expect(reads).toEqual(['wanted']);
    expect(swap.isCurrent).toBe(false);
    // The composer's own drafts are untouched: nothing was cleared ahead of a read that never lands.
    expect(swap.drafts.map((d) => d.previewUrl)).toEqual(['blob:wanted']);
  });

  it('a swap names what it could not read and still carries the rest', async () => {
    const swap = await planDraftSwap(
      [{ ref: ref('kept'), name: 'kept.png' }, { ref: ref('gone'), name: 'gone.png' }],
      async (wanted, name) => wanted.id === 'gone' ? null : { ref: wanted, name, previewUrl: `blob:${wanted.id}` },
      () => true,
    );

    expect(swap.isCurrent).toBe(true);
    expect(swap.drafts.map((d) => d.ref.id)).toEqual(['kept']);
    expect(swap.unreadable).toEqual(['gone.png']);
  });

  it('sends references and the name the chip showed — no bytes, no URLs', () => {
    const state = addDraft(EMPTY_ATTACHMENTS, draft('a'));
    const refs = attachmentRefs(state);
    expect(refs).toEqual([{ id: 'a', mediaType: 'image/png', name: 'a.png', width: 8, height: 8 }]);
    for (const sent of refs) {
      expect('previewUrl' in sent).toBe(false);
      expect('bytes' in sent).toBe(false);
    }
  });

  it('dismissing the failure leaves the drafts alone', () => {
    let state = addDraft(EMPTY_ATTACHMENTS, draft('a'));
    state = noteFailure(state, { reason: 'too-large', name: 'huge.png' });
    const next = dismissFailure(state);
    expect(next.failure).toBeUndefined();
    expect(next.drafts).toHaveLength(1);
  });

  it('two failures read as one notice that a dismissal then clears', () => {
    let state = noteFailure(EMPTY_ATTACHMENTS, { reason: 'too-large', name: 'huge.png' });
    state = noteFailure(state, { reason: 'text-too-large', name: 'notes.md' });
    expect(state.failure?.previous).toEqual([{ reason: 'too-large', name: 'huge.png' }]);
    expect(dismissFailure(state).failure).toBeUndefined();
  });

  it('a keystroke mid-batch keeps the files already reported', () => {
    let state = beginBatch(EMPTY_ATTACHMENTS);
    state = noteFailure(state, { reason: 'too-large', name: 'huge.png' });
    state = dismissFailureOnKeystroke(state);
    expect(state.failure?.name).toBe('huge.png');

    state = noteFailure(state, { reason: 'text-too-large', name: 'notes.md' });
    expect(state.failure?.previous).toEqual([{ reason: 'too-large', name: 'huge.png' }]);

    state = dismissFailureOnKeystroke(endBatch(state));
    expect(state.failure).toBeUndefined();
  });

  it('overlapping batches clear only once every one has settled', () => {
    let state = beginBatch(beginBatch(EMPTY_ATTACHMENTS));
    state = noteFailure(state, { reason: 'unreadable', name: 'broken.jpg' });
    state = endBatch(state);
    expect(dismissFailureOnKeystroke(state).failure?.name).toBe('broken.jpg');
    expect(dismissFailureOnKeystroke(endBatch(state)).failure).toBeUndefined();
  });

  it('a settled batch never counts below zero, so the next keystroke still clears', () => {
    expect(endBatch(EMPTY_ATTACHMENTS).pending).toBe(0);
  });

  it('a swap drops the failure naming the drafts it replaced, and leaves its batch running', () => {
    let state = beginBatch(addDraft(EMPTY_ATTACHMENTS, draft('a')));
    state = noteFailure(state, { reason: 'too-large', name: 'huge.png' });
    // Or a walk's "couldn't bring these back" warning loses the band to an error about a file the composer no longer holds.
    const { state: next } = replaceDrafts(state, [draft('b')]);
    expect(next.failure).toBeUndefined();
    expect(next.pending).toBe(1);
  });
});
