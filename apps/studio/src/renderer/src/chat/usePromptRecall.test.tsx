import { afterAll, describe, expect, it } from 'bun:test';
import type { ArtifactAttachment, ArtifactSummary, AttachmentBytes, ComposerDraft, ImageRef, RetryPrompt } from '@studio/events';
import { stubImageDecoder, takeComplaints } from '../testing/dom.js';
import { deferred, installBridge, type Deferred } from '../testing/bridge.js';
import { mountHook, type MountedHook } from '../testing/mountHook.js';
import { artifactChipId } from './draftRestore.js';
import { useAttachments } from './useAttachments.js';
import { usePromptRecall, type RecalledPayload } from './usePromptRecall.js';

const restoreDecoder = stubImageDecoder();
const revoked: string[] = [];
const revoke = URL.revokeObjectURL.bind(URL);
URL.revokeObjectURL = (url: string): void => {
  revoked.push(url);
  revoke(url);
};
afterAll(() => {
  restoreDecoder();
  URL.revokeObjectURL = revoke;
});

const PROJECT = '/projects/one';
const OTHER = '/projects/two';
const SESSION = 'session-1';
const SKETCH: ArtifactAttachment = { kind: 'artifact', artifactId: 'sketch', title: 'Header sketch' };

function image(id: string): ImageRef {
  return { id, mediaType: 'image/png', name: `${id}.png` };
}

function bytes(): AttachmentBytes {
  return { bytes: new Uint8Array([137, 80, 78, 71]), mediaType: 'image/png' };
}

function summary(title: string): ArtifactSummary {
  return { id: 'sketch', title, pagePath: 'index.html', updatedAt: '2026-10-13T00:00:00.000Z', readOnly: false };
}

interface Chat {
  project: string | undefined;
  sessionId: string | undefined;
  /** What the composer's own draft holds, outside a walk. */
  text: string;
  hasDraft: boolean;
}

interface Wiring {
  /** The `attachmentBytes` answers still in the air, by attachment id. */
  images: Map<string, Deferred<AttachmentBytes | null>>;
  /** The `artifactRead` answers still in the air, by artifact id. */
  sketches: Map<string, Deferred<ArtifactSummary | null>>;
  saves: { cwd: string; draft: ComposerDraft }[];
  removed: { frames: string[]; elements: string[] };
}

function wire(): Wiring {
  const wiring: Wiring = { images: new Map(), sketches: new Map(), saves: [], removed: { frames: [], elements: [] } };
  installBridge({
    attachmentBytes: ({ id }) => {
      const held = deferred<AttachmentBytes | null>();
      wiring.images.set(id, held);
      return held.promise;
    },
    artifactRead: ({ artifactId }) => {
      const held = deferred<ArtifactSummary | null>();
      wiring.sketches.set(artifactId, held);
      return held.promise;
    },
    draftSave: (request) => {
      wiring.saves.push({ cwd: request.cwd, draft: request.draft });
    },
    pickAttachments: () => Promise.resolve({ canceled: true }),
  });
  return wiring;
}

type ChatProps = Chat & { wiring: Wiring };
type ChatSurface = ReturnType<typeof useChat>;

function useChat(given: ChatProps) {
  const attachments = useAttachments(given.project, given.project);
  const recall = usePromptRecall({
    chat: { workspacePath: given.project, sessionId: given.sessionId },
    attachments,
    canvas: {
      deselectFrame: (id) => given.wiring.removed.frames.push(id),
      removeElement: (id) => given.wiring.removed.elements.push(id),
    },
    // The canvas half, which no read can undo: every element and frame this prompt names is already placed.
    take: (prompt: RetryPrompt): RecalledPayload => ({
      artifacts: (prompt.attachments ?? []).filter((ref): ref is ArtifactAttachment => 'kind' in ref && ref.kind === 'artifact'),
      missing: [],
    }),
    draft: () => given.hasDraft
      ? { text: given.text, images: attachments.refs(), ...(recall.artifacts.length === 0 ? {} : { artifacts: recall.artifacts }) }
      : undefined,
  });
  return { attachments, recall };
}

function mount(chat: Partial<Chat> = {}) {
  const wiring = wire();
  const props: ChatProps = { project: PROJECT, sessionId: SESSION, text: '', hasDraft: false, ...chat, wiring };
  return mountHook(useChat, props).then((hook) => ({ hook, wiring, props }));
}

/** One ArrowUp: the panel reports the walk, then hands the step's prompt to the host. */
async function walkBack(hook: MountedHook<ChatProps, ChatSurface>, prompt: RetryPrompt): Promise<void> {
  await hook.settle(() => {
    hook.current.recall.setRecalling(true);
    hook.current.recall.restore(prompt, false);
  });
}

const RECALLED: RetryPrompt = { text: 'make the header taller', attachments: [image('shot'), SKETCH] };

describe('a prompt recall holding the composer, mounted (ONL-2509)', () => {
  it('carries an admitted manual draft across a session without rereading or replacing its attachments', async () => {
    const { hook, wiring, props } = await mount();
    await hook.settle(() => hook.current.attachments.restore([image('shot')]));
    await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
    const admitted = hook.current.attachments.state.drafts[0];
    await hook.rerender({ ...props, sessionId: 'other-agent' });
    await hook.settle(() => hook.current.recall.restoreDraft(RECALLED));
    expect(hook.current.attachments.state.drafts[0]).toBe(admitted);
    expect(hook.current.recall.artifacts).toEqual([SKETCH]);
    expect(hook.current.recall.isRestoring).toBe(false);
    expect(wiring.images.size).toBe(1);
    expect(wiring.sketches.size).toBe(0);
    await hook.unmount();
  });

  it('brings the step\'s image and sketch chips back when nothing interrupts it', async () => {
    const { hook, wiring } = await mount();

    await walkBack(hook, RECALLED);
    expect(hook.current.recall.isRestoring).toBe(true);

    await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
    // Renamed since the prompt was sent: the chip wears what the read says, not what the transcript remembers.
    await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch, renamed')));

    expect(hook.current.attachments.state.drafts.map((draft) => draft.ref.id)).toEqual(['shot']);
    expect(hook.current.recall.artifacts).toEqual([{ ...SKETCH, title: 'Header sketch, renamed' }]);
    expect(hook.current.recall.isRestoring).toBe(false);
    expect(hook.current.recall.missing).toEqual([]);
    await hook.unmount();
  });

  it('names what the reads could not bring back', async () => {
    const { hook, wiring } = await mount();

    await walkBack(hook, RECALLED);
    await hook.settle(() => wiring.images.get('shot')?.settle(null));
    await hook.settle(() => wiring.sketches.get('sketch')?.settle(null));

    expect(hook.current.attachments.state.drafts).toEqual([]);
    expect(hook.current.recall.artifacts).toEqual([]);
    expect(hook.current.recall.missing).toEqual(['shot.png', 'Header sketch']);
    await hook.unmount();
  });

  describe('a composer the user takes back mid-read', () => {
    it('keeps a typed edit, and the answers that land after it change nothing', async () => {
      const { hook, wiring } = await mount();
      await walkBack(hook, RECALLED);

      await hook.settle(() => hook.current.recall.end('edit'));
      // The flag turns at the edit, not at the answer: the composer is the user's again now.
      expect(hook.current.recall.isRestoring).toBe(false);
      expect(hook.current.recall.isRecalling).toBe(false);

      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));

      expect(hook.current.attachments.state.drafts).toEqual([]);
      expect(hook.current.recall.artifacts).toEqual([]);
      expect(hook.current.recall.missing).toEqual([]);
      await hook.unmount();
    });

    it('raises no warning when the step\'s reads refuse after the walk ended', async () => {
      const { hook, wiring } = await mount();
      await walkBack(hook, RECALLED);

      await hook.settle(() => hook.current.recall.end('edit'));
      await hook.settle(() => wiring.images.get('shot')?.refuse(new Error('the bridge refused')));
      await hook.settle(() => wiring.sketches.get('sketch')?.refuse(new Error('the bridge refused')));

      // Both refusals read back as nothing, and the warning belongs to the walk the user ended.
      expect(hook.current.recall.missing).toEqual([]);
      expect(hook.current.recall.isRestoring).toBe(false);
      await hook.unmount();
    });

    it('never re-chips an image the user removed while the step was still reading', async () => {
      const { hook, wiring } = await mount();
      // The composer's own image, before any walk.
      await hook.settle(() => hook.current.attachments.restore([image('own')]));
      await hook.settle(() => wiring.images.get('own')?.settle(bytes()));

      await walkBack(hook, RECALLED);
      await hook.settle(() => hook.current.recall.payload.removeAttachment('own'));
      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));

      expect(hook.current.attachments.state.drafts).toEqual([]);
      expect(hook.current.recall.artifacts).toEqual([]);
      await hook.unmount();
    });

    it('ends the walk from every control that hands the composer back', async () => {
      const takeBacks: ((recall: ChatSurface['recall']) => void)[] = [
        (recall) => recall.payload.removeAttachment('own'),
        (recall) => recall.payload.removeFrame('frame-1'),
        (recall) => recall.payload.removeElement('element-1'),
        (recall) => recall.payload.acceptFiles([]),
        (recall) => recall.payload.pickImages(),
      ];

      for (const takeBack of takeBacks) {
        const { hook, wiring } = await mount();
        await walkBack(hook, RECALLED);
        expect(hook.current.recall.isRestoring).toBe(true);

        await hook.settle(() => takeBack(hook.current.recall));
        expect(hook.current.recall.isRestoring).toBe(false);
        expect([...wiring.removed.frames, ...wiring.removed.elements].length).toBeLessThan(2);
        expect(hook.current.recall.isRecalling).toBe(false);

        await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
        await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));
        expect(hook.current.attachments.state.drafts).toEqual([]);
        expect(hook.current.recall.artifacts).toEqual([]);
        await hook.unmount();
      }
    });

    it('takes away a restored sketch chip, and the canvas is never asked to deselect it', async () => {
      const { hook, wiring } = await mount();
      await walkBack(hook, RECALLED);
      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));
      expect(hook.current.recall.artifacts).toEqual([SKETCH]);

      await hook.settle(() => hook.current.recall.payload.removeFrame(artifactChipId(SKETCH)));

      expect(hook.current.recall.artifacts).toEqual([]);
      // A restored reference has no canvas node behind it; deselecting one would be a different object.
      expect(wiring.removed.frames).toEqual([]);
      await hook.unmount();
    });
  });

  describe('a chat the walk no longer belongs to', () => {
    it('drops the step when the same project starts another chat', async () => {
      const { hook, wiring, props } = await mount();
      await walkBack(hook, RECALLED);

      await hook.rerender({ ...props, sessionId: 'session-2' });
      expect(hook.current.recall.isRestoring).toBe(false);

      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));

      // The new chat's composer is empty: neither the image nor the sketch belongs to it.
      expect(hook.current.attachments.state.drafts).toEqual([]);
      expect(hook.current.recall.artifacts).toEqual([]);
      expect(hook.current.recall.missing).toEqual([]);
      await hook.unmount();
    });

    it('drops the step when the user moves to another project', async () => {
      const { hook, wiring, props } = await mount();
      await walkBack(hook, RECALLED);

      // The project alone: the same chat id would end the walk by itself and prove nothing about the project.
      await hook.rerender({ ...props, project: OTHER });
      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));

      expect(hook.current.attachments.state.drafts).toEqual([]);
      expect(hook.current.recall.artifacts).toEqual([]);
      await hook.unmount();
    });

    it('clears a warning the chat before it left behind', async () => {
      const { hook, wiring, props } = await mount();
      await walkBack(hook, RECALLED);
      await hook.settle(() => wiring.images.get('shot')?.settle(null));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(null));
      expect(hook.current.recall.missing).toHaveLength(2);

      await hook.rerender({ ...props, sessionId: 'session-2' });

      expect(hook.current.recall.missing).toEqual([]);
      await hook.unmount();
    });

    it('writes nothing once the panel is gone', async () => {
      const { hook, wiring } = await mount({ hasDraft: true, text: 'half a thought' });
      await walkBack(hook, RECALLED);

      await hook.unmount();
      revoked.length = 0;
      const writes = wiring.saves.length;
      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));

      // Read after the panel went: the image it decoded is thrown away rather than chipped or leaked.
      expect(revoked).toHaveLength(1);
      expect(wiring.saves).toHaveLength(writes);
      expect(takeComplaints()).toEqual([]);
    });
  });

  describe('the draft the walk started from', () => {
    it('is not written again while the user browses, and is still there at the end', async () => {
      const { hook, wiring, props } = await mount({ hasDraft: true, text: 'half a thought' });
      await hook.settle(() => hook.current.attachments.restore([image('own')]));
      await hook.settle(() => wiring.images.get('own')?.settle(bytes()));
      const saved = wiring.saves.at(-1);
      expect(saved?.draft.text).toBe('half a thought');
      expect(saved?.draft.images.map((ref) => ref.id)).toEqual(['own']);
      const writes = wiring.saves.length;

      // Two steps back, with the composer's text standing in for what the panel put there.
      await walkBack(hook, RECALLED);
      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));
      await hook.rerender({ ...props, hasDraft: true, text: RECALLED.text });
      await walkBack(hook, { text: 'an older prompt' });
      await hook.rerender({ ...props, hasDraft: true, text: 'an older prompt' });

      expect(wiring.saves).toHaveLength(writes);
      expect(wiring.saves.at(-1)?.draft.text).toBe('half a thought');
      await hook.unmount();
    });

    it('is held while ArrowDown reads it back, before any walk flag has turned', async () => {
      const own = image('own');
      const { hook, wiring, props } = await mount({ hasDraft: true, text: 'half a thought' });
      await hook.settle(() => hook.current.attachments.restore([own]));
      await hook.settle(() => wiring.images.get('own')?.settle(bytes()));
      const writes = wiring.saves.length;

      // One step back, settled: the composer now holds the recalled prompt's text and its image.
      await walkBack(hook, RECALLED);
      await hook.settle(() => wiring.images.get('shot')?.settle(bytes()));
      await hook.settle(() => wiring.sketches.get('sketch')?.settle(summary('Header sketch')));
      await hook.rerender({ ...props, hasDraft: true, text: RECALLED.text });

      // Past the newest entry the panel reports the walk over first, then hands the draft back to be read.
      await hook.settle(() => {
        hook.current.recall.setRecalling(false);
        hook.current.recall.restore({ text: 'half a thought', attachments: [own] }, true);
      });
      await hook.rerender({ ...props, hasDraft: true, text: 'half a thought' });
      expect(hook.current.recall.isRecalling).toBe(false);
      expect(hook.current.recall.isRestoring).toBe(true);
      // The window the walk's own flag no longer covers: the text is the draft's again, the image is still the step's.
      expect(hook.current.attachments.state.drafts.map((draft) => draft.ref.id)).toEqual(['shot']);
      expect(wiring.saves).toHaveLength(writes);

      await hook.settle(() => wiring.images.get('own')?.settle(bytes()));
      expect(wiring.saves.at(-1)?.draft.images.map((ref) => ref.id)).toEqual(['own']);
      expect(wiring.saves.at(-1)?.draft.text).toBe('half a thought');
      await hook.unmount();
    });

    it('is not written back to disk by the restore that just read it', async () => {
      const { hook, wiring, props } = await mount();
      const stored = { text: 'half a thought', images: [] };

      await hook.settle(() => hook.current.recall.markSaved(PROJECT, stored));
      await hook.rerender({ ...props, hasDraft: true, text: 'half a thought' });

      expect(wiring.saves).toEqual([]);
      await hook.unmount();
    });

    it('is saved again once the walk hands the composer back', async () => {
      const { hook, wiring, props } = await mount({ hasDraft: true, text: 'half a thought' });
      const writes = wiring.saves.length;
      await walkBack(hook, RECALLED);

      await hook.settle(() => hook.current.recall.end('edit'));
      await hook.rerender({ ...props, hasDraft: true, text: 'half a thought, edited' });

      expect(wiring.saves.length).toBeGreaterThan(writes);
      expect(wiring.saves.at(-1)?.draft.text).toBe('half a thought, edited');
      await hook.unmount();
    });
  });
});
