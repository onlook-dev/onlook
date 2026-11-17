import { afterAll, describe, expect, it } from 'bun:test';
import type { AttachmentBytes, ImageRef } from '@studio/events';
import { stubImageDecoder } from '../testing/dom.js';
import { deferred, installBridge, type Deferred } from '../testing/bridge.js';
import { mountHook } from '../testing/mountHook.js';
import { useAttachments } from './useAttachments.js';

const restoreDecoder = stubImageDecoder();

const PROJECT = '/projects/one';
const OTHER = '/projects/two';

function ref(id: string): ImageRef {
  return { id, mediaType: 'image/png', name: `${id}.png` };
}

function bytes(): AttachmentBytes {
  return { bytes: new Uint8Array([137, 80, 78, 71]), mediaType: 'image/png' };
}

interface Reads {
  /** The answer each `attachmentBytes` call is still waiting on, by attachment id. */
  pending: Map<string, Deferred<AttachmentBytes | null>>;
  count: () => number;
}

function heldReads(): Reads {
  const pending = new Map<string, Deferred<AttachmentBytes | null>>();
  let count = 0;
  installBridge({
    attachmentBytes: ({ id }) => {
      count += 1;
      const held = deferred<AttachmentBytes | null>();
      pending.set(id, held);
      return held.promise;
    },
  });
  return { pending, count: () => count };
}

function mount(project: string | undefined = PROJECT) {
  return mountHook((given: { cwd: string | undefined; project: string | undefined }) =>
    useAttachments(given.cwd, given.project), { cwd: project, project });
}

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

describe('the composer\'s attachments, mounted (ONL-2509)', () => {
  it('chips an image the read answers for this project', async () => {
    const reads = heldReads();
    const hook = await mount();

    await hook.settle(() => hook.current.restore([ref('a')]));
    await hook.settle(() => reads.pending.get('a')?.settle(bytes()));

    expect(hook.current.state.drafts.map((draft) => draft.ref.id)).toEqual(['a']);
    expect(hook.current.refs()[0]?.name).toBe('a.png');
    await hook.unmount();
  });

  it('drops an answer that lands after the project changed, and keeps its url out of the next composer', async () => {
    const reads = heldReads();
    const hook = await mount();
    await hook.settle(() => hook.current.restore([ref('a')]));

    await hook.rerender({ cwd: OTHER, project: OTHER });
    await hook.settle(() => reads.pending.get('a')?.settle(bytes()));

    expect(hook.current.state.drafts).toEqual([]);
    expect(hook.current.state.failure).toBeUndefined();
    await hook.unmount();
  });

  it('never re-chips an image the user removed while its read was in the air', async () => {
    const reads = heldReads();
    const hook = await mount();
    await hook.settle(() => hook.current.restore([ref('a'), ref('b')]));
    await hook.settle(() => reads.pending.get('a')?.settle(bytes()));
    expect(hook.current.state.drafts).toHaveLength(1);

    await hook.settle(() => hook.current.remove('b'));
    await hook.settle(() => reads.pending.get('b')?.settle(bytes()));

    expect(hook.current.state.drafts.map((draft) => draft.ref.id)).toEqual(['a']);
    await hook.unmount();
  });

  it('re-reads an image the user removed and attached again', async () => {
    const reads = heldReads();
    const hook = await mount();
    await hook.settle(() => hook.current.restore([ref('a')]));
    await hook.settle(() => reads.pending.get('a')?.settle(bytes()));
    await hook.settle(() => hook.current.remove('a'));

    await hook.settle(() => hook.current.restore([ref('a')]));
    await hook.settle(() => reads.pending.get('a')?.settle(bytes()));

    expect(hook.current.state.drafts.map((draft) => draft.ref.id)).toEqual(['a']);
    expect(reads.count()).toBe(2);
    await hook.unmount();
  });

  it('throws away a read that lands after the panel is gone, rather than leaking its url', async () => {
    const reads = heldReads();
    const hook = await mount();
    await hook.settle(() => hook.current.restore([ref('a')]));

    await hook.unmount();
    revoked.length = 0;
    await hook.settle(() => reads.pending.get('a')?.settle(bytes()));

    expect(hook.current.state.drafts).toEqual([]);
    expect(revoked).toHaveLength(1);
  });

  describe('replace, which a recall step swaps the composer with', () => {
    it('swaps every image at once and names the ones it could not read', async () => {
      const reads = heldReads();
      const hook = await mount();
      await hook.settle(() => hook.current.restore([ref('old')]));
      await hook.settle(() => reads.pending.get('old')?.settle(bytes()));

      let unreadable: string[] | undefined;
      await hook.settle(() => {
        void hook.current.replace([ref('a'), ref('gone')]).then((names) => {
          unreadable = names;
        });
      });
      // Still the composer's own image: nothing is swapped until every read has answered.
      expect(hook.current.state.drafts.map((draft) => draft.ref.id)).toEqual(['old']);

      await hook.settle(() => reads.pending.get('a')?.settle(bytes()));
      await hook.settle(() => reads.pending.get('gone')?.settle(null));

      expect(hook.current.state.drafts.map((draft) => draft.ref.id)).toEqual(['a']);
      expect(unreadable).toEqual(['gone.png']);
      await hook.unmount();
    });

    it('leaves the composer alone when the walk ended mid-read, and revokes what it had read', async () => {
      const reads = heldReads();
      const hook = await mount();
      await hook.settle(() => hook.current.restore([ref('old')]));
      await hook.settle(() => reads.pending.get('old')?.settle(bytes()));
      const held = hook.current.state.drafts[0]!.previewUrl;

      let isCurrent = true;
      await hook.settle(() => {
        void hook.current.replace([ref('a')], () => isCurrent);
      });
      isCurrent = false;
      revoked.length = 0;
      await hook.settle(() => reads.pending.get('a')?.settle(bytes()));

      expect(hook.current.state.drafts.map((draft) => draft.ref.id)).toEqual(['old']);
      expect(hook.current.state.drafts[0]?.previewUrl).toBe(held);
      // The read it threw away, and only that one: the composer's own preview still has to render.
      expect(revoked).toHaveLength(1);
      expect(revoked).not.toContain(held);
      await hook.unmount();
    });

    it('swaps nothing into the project the user moved to', async () => {
      const reads = heldReads();
      const hook = await mount();

      await hook.settle(() => {
        void hook.current.replace([ref('a')]);
      });
      await hook.rerender({ cwd: OTHER, project: OTHER });
      await hook.settle(() => reads.pending.get('a')?.settle(bytes()));

      expect(hook.current.state.drafts).toEqual([]);
      await hook.unmount();
    });
  });
});
