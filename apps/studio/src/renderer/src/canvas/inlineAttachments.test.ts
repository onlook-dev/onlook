import { beforeEach, describe, expect, it } from 'bun:test';
import {
  IMAGE_MAX_BYTES,
  type ElementEvidence,
  type ImageRef,
  type RegisterImageResult,
} from '@studio/events';
import { EMPTY_ATTACHMENTS, type AttachmentDraft } from '../attachments.js';
import { setLogMirror } from '../log.js';
import { useWorkspaceStore } from '../workspace/store.js';
import type { ImageIngestSource } from './image/ingest.js';
import {
  acceptInlineFiles,
  addInlineAttachment,
  attachInlineFiles,
  clearInlineAttachments,
  dismissInlineAttachFailure,
  noteInlineAttachFailure,
  openInlineAttachments,
  removeInlineAttachment,
  type InlineAttachDeps,
} from './inlineAttachments.js';
import { resetCanvasStoreForTests, useCanvasStore } from './store.js';
import { dismissInlineChat, draftInlineChat } from './useInlineElementChat.js';

const store = () => useCanvasStore.getState();

function evidence(id: string): ElementEvidence {
  return {
    kind: 'element',
    id,
    tag: 'button',
    domPath: 'html:nth-of-type(1) > body:nth-of-type(1) > button:nth-of-type(1)',
    outerHtmlSnippet: '<button></button>',
    textContent: '',
    classes: [],
    frameUrl: 'http://localhost:3000/',
  };
}

const ref = (id: string): ImageRef => ({ id, mediaType: 'image/png', width: 8, height: 8 });

const draft = (id: string): AttachmentDraft => ({
  ref: ref(id),
  name: `${id}.png`,
  previewUrl: `blob:${id}`,
});

function openBubble(anchorId: string): void {
  store().addElementSelection(evidence(anchorId), 'frame-a', false);
  store().setInlineChat({
    anchorId,
    draft: 'Tighten this',
    expanded: true,
    entry: 'orb',
    placement: 'above',
    send: 'idle',
    refusal: null,
  });
}

const draftIds = (): string[] =>
  openInlineAttachments(store()).drafts.map((held) => held.ref.id);

describe('the open bubble’s attachments (ONL-2549)', () => {
  beforeEach(() => {
    resetCanvasStoreForTests();
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: () => undefined } },
      configurable: true,
      writable: true,
    });
  });

  it('reads none with no bubble open, whatever the slice still holds', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));

    store().clearElementSelections('escape');

    expect(store().inlineChat).toBeNull();
    expect(store().inlineAttachments.drafts).toHaveLength(1);
    expect(openInlineAttachments(store())).toEqual(EMPTY_ATTACHMENTS);
  });

  it('reads the drafts it was handed while a bubble is open', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    addInlineAttachment(draft('b'));

    expect(draftIds()).toEqual(['a', 'b']);
  });

  it('a fresh open clears what the last bubble left and moves the token', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    const before = store().inlineChatOpenToken;
    store().clearElementSelections('escape');

    openBubble('el-2');

    expect(openInlineAttachments(store())).toEqual(EMPTY_ATTACHMENTS);
    expect(store().inlineChatOpenToken).toBeGreaterThan(before);
  });

  it('a write over an open record leaves the drafts and the token alone', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    const token = store().inlineChatOpenToken;
    const held = store().inlineChat;
    if (held === null) throw new Error('the bubble did not open');

    store().setInlineChat({ ...held, expanded: false });

    expect(draftIds()).toEqual(['a']);
    expect(store().inlineChatOpenToken).toBe(token);
  });

  it('a re-anchoring pick keeps the attachments, as it keeps the draft', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    const token = store().inlineChatOpenToken;

    store().addElementSelection(evidence('el-2'), 'frame-a', false);

    expect(store().inlineChat?.anchorId).toBe('el-2');
    expect(store().inlineChat?.draft).toBe('Tighten this');
    expect(draftIds()).toEqual(['a']);
    expect(store().inlineChatOpenToken).toBe(token);
  });

  it('a dismiss then a fresh open on the same element moves the token', () => {
    openBubble('el-1');
    const stamped = store().inlineChatOpenToken;

    dismissInlineChat('escape');
    openBubble('el-1');

    expect(store().inlineChat?.anchorId).toBe('el-1');
    expect(store().inlineChatOpenToken).not.toBe(stamped);
  });

  it('removing one pill leaves the others in the order they arrived', () => {
    openBubble('el-1');
    for (const id of ['a', 'b', 'c']) addInlineAttachment(draft(id));

    removeInlineAttachment('b');

    expect(draftIds()).toEqual(['a', 'c']);
  });

  it('removing an id the bubble does not hold changes nothing', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    const held = store().inlineAttachments;

    removeInlineAttachment('ghost');

    expect(store().inlineAttachments).toBe(held);
  });

  it('a failure reads while the bubble is open and is gone with it', () => {
    openBubble('el-1');
    noteInlineAttachFailure({ reason: 'too-large', name: 'huge.png' });
    expect(openInlineAttachments(store()).failure).toEqual({
      reason: 'too-large',
      name: 'huge.png',
    });

    dismissInlineAttachFailure();
    expect(openInlineAttachments(store()).failure).toBeUndefined();

    noteInlineAttachFailure({ reason: 'unreadable', name: 'broken.jpg' });
    store().clearElementSelections('escape');
    expect(openInlineAttachments(store()).failure).toBeUndefined();
  });

  it('clearing drops the pills the send named and no others — the send’s own reset', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    addInlineAttachment(draft('b'));

    clearInlineAttachments(['a', 'b']);

    expect(openInlineAttachments(store()).drafts).toEqual([]);
  });

  it('leaves a pill the send did not name, and keeps a failure that is about it (ONL-2549)', () => {
    openBubble('el-1');
    addInlineAttachment(draft('sent'));
    addInlineAttachment(draft('late'));
    noteInlineAttachFailure({ reason: 'too-large', name: 'huge.png' });

    clearInlineAttachments(['sent']);

    expect(openInlineAttachments(store()).drafts.map((held) => held.ref.id)).toEqual(['late']);
    expect(openInlineAttachments(store()).failure).toEqual({
      reason: 'too-large',
      name: 'huge.png',
    });
  });
});

const FALLBACK = 'Pasted image';

const failure = (): { reason: string; name: string } | undefined =>
  openInlineAttachments(store()).failure;

function source(over: Partial<ImageIngestSource> = {}): ImageIngestSource {
  return {
    name: 'hero.png',
    size: 1024,
    bytes: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    ...over,
  };
}

function rig(over: Partial<InlineAttachDeps> = {}): { deps: InlineAttachDeps; registered: string[] } {
  const registered: string[] = [];
  return {
    registered,
    deps: {
      register: async ({ name }): Promise<RegisterImageResult> => {
        registered.push(name);
        return { ok: true, image: { id: `blob-${name}`, mediaType: 'image/png' } };
      },
      resolve: async (image) => `blob:${image.id}`,
      measure: async () => ({ width: 320, height: 200 }),
      ...over,
    },
  };
}

/** Hands back the release for whatever the admission is made to wait on. */
function gate(): { held: Promise<void>; release: () => void } {
  let release = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    release = () => {
      resolve();
    };
  });
  return { held, release };
}

describe('a paste the open bubble takes (ONL-2549)', () => {
  beforeEach(() => {
    resetCanvasStoreForTests();
    useWorkspaceStore.setState({ workspace: null });
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: () => undefined } },
      configurable: true,
      writable: true,
    });
  });

  it('refuses a file over the cap by name, and never offers its bytes to main', async () => {
    openBubble('el-1');
    const { deps, registered } = rig();

    await attachInlineFiles(
      [source({ name: 'huge.png', size: IMAGE_MAX_BYTES + 1 })],
      FALLBACK,
      deps,
    );

    expect(failure()).toEqual({ reason: 'too-large', name: 'huge.png' });
    expect(registered).toEqual([]);
    expect(draftIds()).toEqual([]);
  });

  it('carries main’s own reason for a file it will not register', async () => {
    openBubble('el-1');

    await attachInlineFiles(
      [source({ name: 'notes.pdf' })],
      FALLBACK,
      rig({ register: async () => ({ ok: false, reason: 'unsupported-format' }) }).deps,
    );

    expect(failure()).toEqual({ reason: 'unsupported-format', name: 'notes.pdf' });
    expect(draftIds()).toEqual([]);
  });

  it('reads a register that throws as unreadable', async () => {
    openBubble('el-1');

    await attachInlineFiles(
      [source({ name: 'torn.png' })],
      FALLBACK,
      rig({
        register: () => Promise.reject(new Error('the bridge refused')),
      }).deps,
    );

    expect(failure()).toEqual({ reason: 'unreadable', name: 'torn.png' });
    expect(draftIds()).toEqual([]);
  });

  it('adds no pill for bytes it cannot read back or decode', async () => {
    openBubble('el-1');

    await attachInlineFiles([source()], FALLBACK, rig({ resolve: async () => null }).deps);
    expect(failure()).toEqual({ reason: 'unreadable', name: 'hero.png' });
    expect(draftIds()).toEqual([]);

    await attachInlineFiles([source()], FALLBACK, rig({ measure: async () => null }).deps);
    expect(failure()).toEqual({ reason: 'unreadable', name: 'hero.png' });
    expect(draftIds()).toEqual([]);
  });

  it('carries the decoded intrinsic size on the ref the send will hand over', async () => {
    openBubble('el-1');

    await attachInlineFiles(
      [source()],
      FALLBACK,
      rig({ measure: async () => ({ width: 1280, height: 720 }) }).deps,
    );

    expect(openInlineAttachments(store()).drafts).toEqual([
      {
        ref: { id: 'blob-hero.png', mediaType: 'image/png', width: 1280, height: 720 },
        name: 'hero.png',
        previewUrl: 'blob:blob-hero.png',
      },
    ]);
  });

  it('calls a file with no name of its own what the surface calls it', async () => {
    openBubble('el-1');

    await attachInlineFiles([source({ name: '' })], FALLBACK, rig().deps);

    expect(openInlineAttachments(store()).drafts[0]?.name).toBe(FALLBACK);
  });

  it('leaves one pill and one failure when a batch holds both', async () => {
    openBubble('el-1');

    await attachInlineFiles(
      [source({ name: 'huge.png', size: IMAGE_MAX_BYTES + 1 }), source({ name: 'ok.png' })],
      FALLBACK,
      rig().deps,
    );

    expect(draftIds()).toEqual(['blob-ok.png']);
    expect(failure()).toEqual({ reason: 'too-large', name: 'huge.png' });
  });

  it('drops an admission that lands after another bubble opened', async () => {
    openBubble('el-1');
    const { held, release } = gate();
    const pending = attachInlineFiles(
      [source()],
      FALLBACK,
      rig({
        resolve: async (image) => {
          await held;
          return `blob:${image.id}`;
        },
      }).deps,
    );

    store().clearElementSelections('escape');
    openBubble('el-2');
    release();
    await pending;

    expect(draftIds()).toEqual([]);
    expect(failure()).toBeUndefined();
  });

  it('lands an admission that finishes after a re-anchor of the same bubble', async () => {
    openBubble('el-1');
    const { held, release } = gate();
    const pending = attachInlineFiles(
      [source()],
      FALLBACK,
      rig({
        resolve: async (image) => {
          await held;
          return `blob:${image.id}`;
        },
      }).deps,
    );

    store().addElementSelection(evidence('el-2'), 'frame-a', false);
    release();
    await pending;

    expect(store().inlineChat?.anchorId).toBe('el-2');
    expect(draftIds()).toEqual(['blob-hero.png']);
  });

  it('attaches nothing and says so in the log when no project is open', () => {
    openBubble('el-1');
    const warned: string[] = [];
    const real = console.warn;
    console.warn = (...args: unknown[]) => {
      warned.push(String(args[0]));
    };
    setLogMirror(true);
    try {
      acceptInlineFiles([new File([new Uint8Array([1])], 'hero.png', { type: 'image/png' })]);
    } finally {
      setLogMirror(false);
      console.warn = real;
    }

    expect(warned).toHaveLength(1);
    expect(draftIds()).toEqual([]);
    expect(failure()).toBeUndefined();
  });
});

describe('what retires the bubble’s attach failure (ONL-2549)', () => {
  beforeEach(() => {
    resetCanvasStoreForTests();
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: () => undefined } },
      configurable: true,
      writable: true,
    });
  });

  it('a keystroke', () => {
    openBubble('el-1');
    noteInlineAttachFailure({ reason: 'too-large', name: 'huge.png' });

    draftInlineChat('Tighten this more');

    expect(failure()).toBeUndefined();
  });

  it('taking a pill back off', () => {
    openBubble('el-1');
    addInlineAttachment(draft('a'));
    noteInlineAttachFailure({ reason: 'too-large', name: 'huge.png' });

    removeInlineAttachment('a');

    expect(failure()).toBeUndefined();
  });

  it('a later paste that attaches, while a batch keeps its own refusal', async () => {
    openBubble('el-1');
    noteInlineAttachFailure({ reason: 'too-large', name: 'huge.png' });

    await attachInlineFiles([source({ name: 'ok.png' })], FALLBACK, rig().deps);
    expect(failure()).toBeUndefined();

    await attachInlineFiles(
      [source({ name: 'huge.png', size: IMAGE_MAX_BYTES + 1 }), source({ name: 'ok2.png' })],
      FALLBACK,
      rig().deps,
    );
    expect(failure()).toEqual({ reason: 'too-large', name: 'huge.png' });
  });
});
