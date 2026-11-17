// Markup only: Bun has no DOM, so the surface's effects never run and what is asserted is the first painted frame.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import type { ElementEvidence } from '@studio/events';
import { EMPTY_ATTACHMENTS, type AttachmentDraft } from '../attachments.js';
import { registerChatSubmit } from '../chat/submitRegistry.js';
import { InlineElementChat, inlineMeasureFade } from './InlineElementChat.js';
import { addInlineAttachment, noteInlineAttachFailure } from './inlineAttachments.js';
import type { InlineChatRecord } from './inlinePlacement.js';
import { resetCanvasStoreForTests, useCanvasStore } from './store.js';
import { refuseGather } from './useInlineElementChat.js';

const ANCHOR = 'el-1';

const RECORD: InlineChatRecord = {
  anchorId: ANCHOR,
  draft: 'Tighten this',
  expanded: true,
  entry: 'orb',
  placement: 'above',
  send: 'idle',
  refusal: null,
};

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

function openBubble(): void {
  useCanvasStore.getState().addElementSelection(evidence(ANCHOR), 'frame-a', false);
  useCanvasStore.getState().setInlineChat(RECORD);
}

function openBubbleWith(record: Partial<InlineChatRecord>, shiftAdded: string[] = []): void {
  useCanvasStore.getState().addElementSelection(evidence(ANCHOR), 'frame-a', false);
  for (const id of shiftAdded) {
    useCanvasStore.getState().addElementSelection(evidence(id), 'frame-a', true);
  }
  useCanvasStore.getState().setInlineChat({ ...RECORD, ...record });
}

const PASTED: AttachmentDraft = {
  ref: { id: 'img-1', mediaType: 'image/png', width: 320, height: 200 },
  name: 'hero-reference.png',
  previewUrl: 'data:image/png;base64,iVBORw0KGgo=',
};

/** The send button's own tag — a `disabled` anywhere else in the tree must not pass. */
function sendTag(html: string): string {
  const at = html.indexOf('data-testid="inline-element-bubble-send"');
  expect(at).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1);
}

/** A server render reads zustand's own creation-time snapshot, not the live state, so a selector only sees what is seeded there. */
function markup(): string {
  const initial = useCanvasStore.getInitialState();
  const live = useCanvasStore.getState();
  initial.elementSelections = live.elementSelections;
  initial.inlineChat = live.inlineChat;
  initial.inlineAttachments = live.inlineAttachments;
  return renderToStaticMarkup(
    <ReactFlowProvider>
      <InlineElementChat
        record={live.inlineChat ?? RECORD}
        box={{ x: 0, y: 0, width: 240, height: 80 }}
        frame={{ x: 0, width: 1200 }}
        exit={null}
      />
    </ReactFlowProvider>,
  );
}

describe('what the rendered bubble says about a paste it could not attach (ONL-2549)', () => {
  beforeEach(() => {
    resetCanvasStoreForTests();
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: () => undefined } },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    const initial = useCanvasStore.getInitialState();
    initial.elementSelections = [];
    initial.inlineChat = null;
    initial.inlineAttachments = EMPTY_ATTACHMENTS;
  });

  it('names the file and the reason the slice holds', () => {
    openBubble();
    noteInlineAttachFailure({ reason: 'too-large', name: 'huge.png' });

    const html = markup();

    expect(html).toContain('huge.png');
    expect(html).toContain('data-color="error"');
  });

  it('shows the refused gather when that is all it holds, and the paste failure over it', () => {
    openBubble();
    refuseGather('byte-cap');

    const refused = markup();
    expect(refused).toContain('data-color="warning"');
    expect(refused).not.toContain('huge.png');

    noteInlineAttachFailure({ reason: 'unreadable', name: 'torn.png' });
    const both = markup();
    expect(both).toContain('torn.png');
    expect(both).toContain('data-color="error"');
    expect(both).not.toContain('data-color="warning"');
  });

  it('says nothing with the slice at rest', () => {
    openBubble();

    const html = markup();

    expect(html).not.toContain('data-color="error"');
    expect(html).not.toContain('data-color="warning"');
  });
});

describe('what the rendered bubble does with an attachment it holds (ONL-2549)', () => {
  beforeEach(() => {
    resetCanvasStoreForTests();
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { telemetryEvent: () => undefined } },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    const initial = useCanvasStore.getInitialState();
    initial.elementSelections = [];
    initial.inlineChat = null;
    initial.inlineAttachments = EMPTY_ATTACHMENTS;
  });

  it('opens the drawer on an attachment alone, with no element chip beside it', () => {
    openBubble();
    addInlineAttachment(PASTED);

    const html = markup();

    expect(html).toContain('inline-element-bubble-drawer');
    expect(html).toContain('chat-attachment-chip');
    expect(html).toContain(PASTED.name);
    expect(html).not.toContain('chat-element-chip');
  });

  it('draws the element chips before the attachment pills, in the one scrolling row', () => {
    openBubbleWith({}, ['el-2']);
    addInlineAttachment(PASTED);

    const html = markup();

    const row = html.indexOf('inline-element-bubble-chips');
    const chip = html.indexOf('chat-element-chip');
    const pill = html.indexOf('chat-attachment-chip');
    expect(row).toBeGreaterThan(-1);
    expect(chip).toBeGreaterThan(row);
    expect(chip).toBeLessThan(pill);
  });

  it('opens no drawer holding neither', () => {
    openBubble();

    expect(markup()).not.toContain('inline-element-bubble-drawer');
  });

  it('arms the send on an attachment alone, where an element chip alone leaves it quiet (ONL-2549)', () => {
    const unregister = registerChatSubmit({ submit: () => Promise.resolve({ outcome: 'empty' }) });
    openBubbleWith({ draft: '' }, ['el-2']);

    expect(sendTag(markup())).toContain('disabled');

    addInlineAttachment(PASTED);

    expect(sendTag(markup())).not.toContain('disabled');
    unregister();
  });

  it('marks the orb as carrying something on an attachment with an empty draft', () => {
    openBubbleWith({ draft: '', expanded: false });

    expect(markup()).not.toContain('data-draft="true"');

    addInlineAttachment(PASTED);

    expect(markup()).toContain('data-draft="true"');
  });
});

describe('the measure fade’s gate (ONL-2549)', () => {
  it('stands down while an attachment is held, since the fade would take the pill’s X with it', () => {
    expect(inlineMeasureFade({ isMeasuring: true, draft: '', attachments: 0 })).toBe(true);
    expect(inlineMeasureFade({ isMeasuring: true, draft: '', attachments: 1 })).toBe(false);
  });

  it('is unset on a draft, and unset with ⌥ up', () => {
    expect(inlineMeasureFade({ isMeasuring: true, draft: 'a', attachments: 0 })).toBe(false);
    expect(inlineMeasureFade({ isMeasuring: false, draft: '', attachments: 0 })).toBe(false);
    expect(inlineMeasureFade({ isMeasuring: false, draft: '', attachments: 1 })).toBe(false);
  });
});
