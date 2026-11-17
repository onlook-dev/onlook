import { describe, expect, it } from 'bun:test';
import { MAX_ELEMENT_SELECTIONS } from '@studio/events';
import type { AttachFailure } from '../attachments.js';
import {
  inlineDismissedFields,
  inlineSubmitText,
  type InlineChatRecord,
} from './inlinePlacement.js';
import type { GatherRefusal } from './selection.js';
import {
  carriesInlineAnchor,
  expandsOnKey,
  freshAnchorId,
  inlineSubmittedFields,
  inlineChatBand,
  inlineChatReducer,
  inlineChatStatus,
  inlineSubmitFrameIds,
  inlineSubmitVerdict,
  keepsNodeChat,
  nodeChatTarget,
  opensInlineChat,
  opensNodeChatOnKey,
  ownsInlineRecord,
  shownRecord,
} from './useInlineElementChat.js';

const OPEN: InlineChatRecord = {
  anchorId: 'el-1',
  draft: 'Tighten this',
  expanded: true,
  entry: 'orb',
  placement: 'above',
  send: 'idle',
  refusal: null,
};

describe('the bubble’s state machine (ONL-2455)', () => {
  it('opens on an anchor with nothing typed', () => {
    expect(inlineChatReducer(null, { type: 'opened', anchorId: 'el-1', entry: 'orb' })).toEqual({
      anchorId: 'el-1',
      draft: '',
      expanded: false,
      entry: 'orb',
      placement: null,
      send: 'idle',
      refusal: null,
    });
  });

  it('re-anchors an open surface and leaves the draft standing', () => {
    expect(inlineChatReducer(OPEN, { type: 'opened', anchorId: 'el-2', entry: 'orb' })).toEqual({
      anchorId: 'el-2',
      draft: 'Tighten this',
      expanded: true,
      entry: 'orb',
      placement: 'above',
      send: 'idle',
      refusal: null,
    });
  });

  it('latches the side once, and a growing draft never moves it', () => {
    const latched = inlineChatReducer(
      { ...OPEN, placement: null },
      { type: 'latched', placement: 'below' },
    );
    expect(latched?.placement).toBe('below');
    expect(inlineChatReducer(latched, { type: 'latched', placement: 'above' })).toBe(latched);
    expect(
      inlineChatReducer(latched, { type: 'drafted', draft: 'a much longer draft' })?.placement,
    ).toBe('below');
  });

  it('carries the draft and drops a standing failure on the next keystroke', () => {
    const failed = inlineChatReducer(OPEN, { type: 'refused' });
    expect(failed?.send).toBe('failed');
    expect(failed?.draft).toBe('Tighten this');
    expect(inlineChatReducer(failed, { type: 'drafted', draft: 'Tighten this!' })).toEqual({
      ...OPEN,
      draft: 'Tighten this!',
      send: 'idle',
    });
  });

  it('answers the same record when nothing moved', () => {
    expect(inlineChatReducer(OPEN, { type: 'drafted', draft: OPEN.draft })).toBe(OPEN);
    expect(inlineChatReducer(OPEN, { type: 'latched', placement: 'above' })).toBe(OPEN);
    expect(inlineChatReducer(null, { type: 'sending' })).toBeNull();
  });

  it('keeps the surface up while the send is out', () => {
    expect(inlineChatReducer(OPEN, { type: 'sending' })?.send).toBe('sending');
  });

  it('ignores every event but an open while closed', () => {
    for (const event of [
      { type: 'drafted', draft: 'x' },
      { type: 'latched', placement: 'above' },
      { type: 'sending' },
      { type: 'refused' },
      { type: 'gatherRefused', reason: 'count-cap' },
    ] as const) {
      expect(inlineChatReducer(null, event)).toBeNull();
    }
  });
});

describe('a refused gather at the surface (ONL-2455)', () => {
  const refused = (reason: GatherRefusal): InlineChatRecord | null =>
    inlineChatReducer(OPEN, { type: 'gatherRefused', reason });

  it('carries each reason the user has to see, and keeps the draft', () => {
    for (const reason of ['count-cap', 'byte-cap'] as const) {
      expect(refused(reason)).toEqual({ ...OPEN, refusal: reason });
    }
  });

  it('answers the same record for the same standing reason', () => {
    const capped = refused('count-cap');
    expect(inlineChatReducer(capped, { type: 'gatherRefused', reason: 'count-cap' })).toBe(capped);
  });

  it('clears on the next accepted pick, which is what re-opens the record', () => {
    const capped = refused('count-cap');
    expect(
      inlineChatReducer(capped, { type: 'opened', anchorId: 'el-2', entry: 'orb' })?.refusal,
    ).toBeNull();
  });

  it('stands through a keystroke — the refusal is about the selection, not the sentence', () => {
    const capped = refused('count-cap');
    expect(inlineChatReducer(capped, { type: 'drafted', draft: 'Tighten these' })?.refusal).toBe(
      'count-cap',
    );
  });

  it('steps aside for a send, so a fresh failure is not masked by a standing warning', () => {
    const capped = refused('count-cap');
    const sending = inlineChatReducer(capped, { type: 'sending' });
    expect(sending).toEqual({ ...OPEN, send: 'sending', refusal: null });
    expect(
      inlineChatBand(inlineChatReducer(sending, { type: 'refused' }) as InlineChatRecord, undefined),
    ).toEqual({
      kind: 'send-failed',
    });
  });

  it('outranks a standing send failure, because it is the newer transient', () => {
    const failed = inlineChatReducer(OPEN, { type: 'refused' }) as InlineChatRecord;
    expect(inlineChatBand(failed, undefined)).toEqual({ kind: 'send-failed' });

    const both = inlineChatReducer(failed, {
      type: 'gatherRefused',
      reason: 'byte-cap',
    }) as InlineChatRecord;
    expect(inlineChatBand(both, undefined)).toEqual({ kind: 'refusal', reason: 'byte-cap' });
  });

  it('shows no band at rest', () => {
    expect(inlineChatBand(OPEN, undefined)).toBeNull();
    expect(inlineChatBand({ ...OPEN, send: 'sending' }, undefined)).toBeNull();
  });

  it('resolves one warning per reason, none of them the same sentence', () => {
    const messages = (['count-cap', 'byte-cap'] as const).map((reason) => {
      const status = inlineChatStatus({ ...OPEN, refusal: reason }, undefined);
      expect(status?.type).toBe('warning');
      expect(status?.message?.length).toBeGreaterThan(0);
      return status?.message;
    });
    expect(new Set(messages).size).toBe(2);
    expect(messages[0]).toContain(String(MAX_ELEMENT_SELECTIONS));
  });

  it('resolves a failed send as the assertive band, and rest as no band', () => {
    expect(inlineChatStatus({ ...OPEN, send: 'failed' }, undefined)?.type).toBe('error');
    expect(inlineChatStatus(OPEN, undefined)).toBeUndefined();
  });

  it('says nothing about a prompt that is out, whatever the session is doing (ONL-2519)', () => {
    expect(inlineChatStatus({ ...OPEN, send: 'sending' }, undefined)).toBeUndefined();
  });
});

describe('a paste the bubble could not attach (ONL-2549)', () => {
  const FAILED: AttachFailure = { reason: 'too-large', name: 'huge.png' };

  it('takes the band while it is held', () => {
    expect(inlineChatBand(OPEN, FAILED)).toEqual({ kind: 'attach-failed', failure: FAILED });
  });

  it('outranks a refused gather and a failed send, because it is the newest transient', () => {
    const both: InlineChatRecord = { ...OPEN, refusal: 'byte-cap', send: 'failed' };
    expect(inlineChatBand(both, undefined)).toEqual({ kind: 'refusal', reason: 'byte-cap' });
    expect(inlineChatBand(both, FAILED)).toEqual({ kind: 'attach-failed', failure: FAILED });
  });

  it('names the file and the reason in the assertive band', () => {
    const status = inlineChatStatus(OPEN, FAILED);
    expect(status?.type).toBe('error');
    expect(status?.message).toContain('huge.png');
    expect(status?.message).not.toBe(inlineChatStatus({ ...OPEN, send: 'failed' }, undefined)?.message);
  });

  it('reads each reason as its own sentence', () => {
    const messages = (['unsupported-format', 'too-large', 'unreadable'] as const).map(
      (reason) => inlineChatStatus(OPEN, { reason, name: 'notes.pdf' })?.message,
    );
    expect(new Set(messages).size).toBe(3);
    for (const message of messages) expect(message).toContain('notes.pdf');
  });
});

describe('what counts as a fresh unshifted pick', () => {
  it('is a first selection the previous set did not hold', () => {
    expect(freshAnchorId(['el-1', 'el-2'], ['el-3'])).toBe('el-3');
    expect(freshAnchorId([], ['el-1'])).toBe('el-1');
  });

  it('is not a shift-add, which leaves the first selection where it was', () => {
    expect(freshAnchorId(['el-1'], ['el-1', 'el-2'])).toBeNull();
  });

  it('is not a removal that promotes a selection the previous set already held', () => {
    expect(freshAnchorId(['el-1', 'el-2'], ['el-2'])).toBeNull();
  });

  it('is nothing when the selection emptied', () => {
    expect(freshAnchorId(['el-1'], [])).toBeNull();
  });
});

describe('the send’s gate and its outcome', () => {
  it('refuses a draft with no text, so the element cannot be sent as a request on its own', () => {
    expect(inlineSubmitText('')).toBeNull();
    expect(inlineSubmitText('   \n\t ')).toBeNull();
    expect(inlineSubmitText('  Tighten this  ')).toBe('Tighten this');
  });

  it('closes on an acceptance, keeps the surface on everything the session refused', () => {
    expect(inlineSubmitVerdict('accepted')).toBe('accepted');
    for (const outcome of ['rejected', 'failed', 'unavailable'] as const) {
      expect(inlineSubmitVerdict(outcome)).toBe('refused');
    }
    for (const outcome of ['empty', 'in-flight'] as const) {
      expect(inlineSubmitVerdict(outcome)).toBe('unchanged');
    }
  });

  it('reads an acceptance the pen took as held, not as delivered (ONL-2294)', () => {
    expect(inlineSubmitVerdict('accepted', true)).toBe('held');
    expect(inlineSubmitVerdict('accepted', false)).toBe('accepted');
  });

  it('leaves every other outcome where it was, whatever the pen holds', () => {
    for (const outcome of ['rejected', 'failed', 'unavailable'] as const) {
      expect(inlineSubmitVerdict(outcome, true)).toBe('refused');
    }
    for (const outcome of ['empty', 'in-flight'] as const) {
      expect(inlineSubmitVerdict(outcome, true)).toBe('unchanged');
    }
  });
});

describe('whether a fresh pick opens the surface', () => {
  const live = { isPicking: false, tool: 'select' as const, mode: 'design' as const };

  it('opens on a pick with the composer disarmed', () => {
    expect(opensInlineChat({ ...live, openAnchorId: null }, 'el-1')).toBe(true);
  });

  it('opens nothing with the composer armed — that pick lands as a chip', () => {
    expect(opensInlineChat({ ...live, isPicking: true, openAnchorId: null }, 'el-1')).toBe(false);
  });

  it('opens nothing where no pick could have happened', () => {
    expect(opensInlineChat({ ...live, mode: 'interact', openAnchorId: null }, 'el-1')).toBe(false);
    expect(opensInlineChat({ ...live, tool: 'pan', openAnchorId: null }, 'el-1')).toBe(false);
    expect(opensInlineChat({ ...live, tool: 'frame', openAnchorId: null }, 'el-1')).toBe(false);
  });

  it('opens nothing for an anchor the selection write already re-pointed to', () => {
    expect(opensInlineChat({ ...live, openAnchorId: 'el-1' }, 'el-1')).toBe(false);
    expect(opensInlineChat({ ...live, openAnchorId: 'el-2' }, 'el-1')).toBe(true);
  });
});

describe('the bubble’s three measurements (ONL-2455)', () => {
  it('carries only the dismissal method and whether a draft went with it', () => {
    expect(inlineDismissedFields(OPEN, 'escape')).toEqual({ method: 'escape', draft_lost: true });
    expect(inlineDismissedFields({ ...OPEN, draft: '' }, 'click-away')).toEqual({
      method: 'click-away',
      draft_lost: false,
    });
    expect(inlineDismissedFields({ ...OPEN, draft: '   ' }, 'mode-switch')).toEqual({
      method: 'mode-switch',
      draft_lost: false,
    });
  });

  it('carries counts and the rail state on a submit, never the sentence', () => {
    const fields = inlineSubmittedFields({
      elementCount: 3,
      frameCount: 2,
      imageCount: 1,
      text: 'Make the hero bigger',
      isRightRailHidden: true,
    });
    expect(fields).toEqual({
      element_count: 3,
      frame_count: 2,
      image_count: 1,
      prompt_chars: 20,
      rail_open: false,
    });
    expect(Object.values(fields)).not.toContain('Make the hero bigger');
  });

  it('reads the rail as open when it is not hidden', () => {
    expect(
      inlineSubmittedFields({ elementCount: 1, frameCount: 1, imageCount: 0, text: 'x', isRightRailHidden: false }).rail_open,
    ).toBe(true);
  });

  it('names no field derived from the user’s codebase', () => {
    const banned = ['tag', 'domPath', 'path', 'text', 'prompt', 'draft', 'anchorId', 'frameUrl'];
    const keys = [
      ...Object.keys(inlineDismissedFields(OPEN, 'escape')),
      ...Object.keys(inlineSubmittedFields({ elementCount: 1, frameCount: 1, imageCount: 0, text: 'x', isRightRailHidden: false })),
    ];
    expect(keys.filter((key) => banned.includes(key))).toEqual([]);
  });
});

describe('a send outlives the surface it left from (ONL-2455)', () => {
  it('owns the record while the anchor is unchanged', () => {
    expect(ownsInlineRecord(OPEN, 'el-1')).toBe(true);
  });

  it('disowns a record re-anchored to another element', () => {
    expect(ownsInlineRecord({ ...OPEN, anchorId: 'el-2' }, 'el-1')).toBe(false);
  });

  it('disowns a surface that closed', () => {
    expect(ownsInlineRecord(null, 'el-1')).toBe(false);
  });

  it('reads a submitted set that carried the anchor', () => {
    expect(carriesInlineAnchor(OPEN, [{ id: 'el-9' }, { id: 'el-1' }])).toBe(true);
  });

  it('reads a submitted set that carried only other elements', () => {
    expect(carriesInlineAnchor(OPEN, [{ id: 'el-9' }])).toBe(false);
  });

  it('carries nothing when no surface is open', () => {
    expect(carriesInlineAnchor(null, [{ id: 'el-1' }])).toBe(false);
  });
});

describe('the ball and the input (ONL-2455)', () => {
  const BALL: InlineChatRecord = { ...OPEN, expanded: false };

  it('a pick opens as the ball, which leaves the keyboard alone', () => {
    expect(inlineChatReducer(null, { type: 'opened', anchorId: 'el-1', entry: 'orb' })?.expanded).toBe(false);
  });

  it('a re-anchor keeps the surface as the user left it', () => {
    expect(inlineChatReducer(OPEN, { type: 'opened', anchorId: 'el-2', entry: 'orb' })?.expanded).toBe(true);
    expect(inlineChatReducer(BALL, { type: 'opened', anchorId: 'el-2', entry: 'orb' })?.expanded).toBe(false);
  });

  it('collapsing keeps the draft, and expanding brings it back', () => {
    const collapsed = inlineChatReducer(OPEN, { type: 'collapsed' });
    expect(collapsed).toEqual({ ...OPEN, expanded: false });
    expect(inlineChatReducer(collapsed, { type: 'expanded' })).toEqual(OPEN);
  });

  it('a repeated expand or collapse is the same record', () => {
    expect(inlineChatReducer(OPEN, { type: 'expanded' })).toBe(OPEN);
    expect(inlineChatReducer(BALL, { type: 'collapsed' })).toBe(BALL);
  });

  const KEY = {
    key: 'Enter',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    isComposing: false,
    defaultPrevented: false,
    isFieldTarget: false,
    record: BALL,
  };

  it('a bare Enter on the canvas expands the ball', () => {
    expect(expandsOnKey(KEY)).toBe(true);
  });

  it('Enter claims nothing else: an open input, a field, a chord, a composition, no pick', () => {
    expect(expandsOnKey({ ...KEY, record: OPEN })).toBe(false);
    expect(expandsOnKey({ ...KEY, record: null })).toBe(false);
    expect(expandsOnKey({ ...KEY, isFieldTarget: true })).toBe(false);
    expect(expandsOnKey({ ...KEY, metaKey: true })).toBe(false);
    expect(expandsOnKey({ ...KEY, shiftKey: true })).toBe(false);
    expect(expandsOnKey({ ...KEY, isComposing: true })).toBe(false);
    expect(expandsOnKey({ ...KEY, defaultPrevented: true })).toBe(false);
    expect(expandsOnKey({ ...KEY, key: 'a' })).toBe(false);
  });
});

describe('the entry flag (ONL-2455)', () => {
  it('an input entry opens straight to the input', () => {
    const opened = inlineChatReducer(null, { type: 'opened', anchorId: 'el-1', entry: 'input' });
    expect(opened?.expanded).toBe(true);
    expect(opened?.entry).toBe('input');
  });

  it('an orb entry opens as the orb', () => {
    const opened = inlineChatReducer(null, { type: 'opened', anchorId: 'el-1', entry: 'orb' });
    expect(opened?.expanded).toBe(false);
    expect(opened?.entry).toBe('orb');
  });

  it('a surface keeps the entry it opened with across a re-anchor, whatever the flag says now', () => {
    const input = inlineChatReducer(null, { type: 'opened', anchorId: 'el-1', entry: 'input' });
    const moved = inlineChatReducer(input, { type: 'opened', anchorId: 'el-2', entry: 'orb' });
    expect(moved?.entry).toBe('input');
    expect(moved?.expanded).toBe(true);
  });

  it('an input entry has no orb to collapse into', () => {
    const input = inlineChatReducer(null, { type: 'opened', anchorId: 'el-1', entry: 'input' });
    expect(inlineChatReducer(input, { type: 'collapsed' })).toBe(input);
  });
});

describe('the bubble across Interact (ONL-2455)', () => {
  it('Design shows the record, Interact hides it without dropping it', () => {
    expect(shownRecord({ mode: 'design', inlineChat: OPEN })).toBe(OPEN);
    expect(shownRecord({ mode: 'interact', inlineChat: OPEN })).toBeNull();
    expect(shownRecord({ mode: 'design', inlineChat: null })).toBeNull();
  });
});

describe('Enter on a lone Frame or Artifact', () => {
  const NODE_KEY = {
    key: 'Enter',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    isComposing: false,
    defaultPrevented: false,
    isFieldTarget: false,
  };
  const kinds: Record<string, string> = { f: 'browser', art: 'artifact', txt: 'text', img: 'image' };
  const CANVAS = {
    mode: 'design' as const,
    tool: 'select' as const,
    isPicking: false,
    inlineChat: null,
    elementSelections: [],
    selectedNodeIds: ['f'],
    renamingFrameId: null,
    textEditId: null,
    nodeKind: (id: string) => kinds[id],
  };
  const NODE_OPEN: InlineChatRecord = {
    anchorId: 'f',
    anchor: 'node',
    draft: '',
    expanded: true,
    entry: 'input',
    placement: null,
    send: 'idle',
    refusal: null,
  };

  it('targets a lone browser or artifact', () => {
    expect(nodeChatTarget(CANVAS)).toBe('f');
    expect(nodeChatTarget({ ...CANVAS, selectedNodeIds: ['art'] })).toBe('art');
  });

  it('does nothing for text, an image, a multiple selection or none', () => {
    expect(nodeChatTarget({ ...CANVAS, selectedNodeIds: ['txt'] })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, selectedNodeIds: ['img'] })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, selectedNodeIds: ['f', 'art'] })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, selectedNodeIds: [] })).toBeNull();
  });

  it('does nothing while a rename, a text edit, a pick, an open chat or an element selection holds', () => {
    expect(nodeChatTarget({ ...CANVAS, renamingFrameId: 'f' })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, textEditId: 'txt' })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, isPicking: true })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, inlineChat: NODE_OPEN })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, elementSelections: [{}] })).toBeNull();
  });

  it('does nothing in Interact or under another tool', () => {
    expect(nodeChatTarget({ ...CANVAS, mode: 'interact' })).toBeNull();
    expect(nodeChatTarget({ ...CANVAS, tool: 'pan' })).toBeNull();
  });

  it('takes only a bare Enter outside any field', () => {
    expect(opensNodeChatOnKey(NODE_KEY, 'f')).toBe(true);
    expect(opensNodeChatOnKey(NODE_KEY, null)).toBe(false);
    expect(opensNodeChatOnKey({ ...NODE_KEY, isFieldTarget: true }, 'f')).toBe(false);
    expect(opensNodeChatOnKey({ ...NODE_KEY, shiftKey: true }, 'f')).toBe(false);
    expect(opensNodeChatOnKey({ ...NODE_KEY, metaKey: true }, 'f')).toBe(false);
    expect(opensNodeChatOnKey({ ...NODE_KEY, isComposing: true }, 'f')).toBe(false);
    expect(opensNodeChatOnKey({ ...NODE_KEY, defaultPrevented: true }, 'f')).toBe(false);
    expect(opensNodeChatOnKey({ ...NODE_KEY, key: 'a' }, 'f')).toBe(false);
  });

  it('opens expanded on the node, input first, and never over an open surface', () => {
    expect(inlineChatReducer(null, { type: 'openedOnNode', nodeId: 'f' })).toEqual(NODE_OPEN);
    expect(inlineChatReducer(OPEN, { type: 'openedOnNode', nodeId: 'f' })).toBe(OPEN);
  });

  it('closes when the node selection moves off its node', () => {
    expect(keepsNodeChat(NODE_OPEN, ['f'])).toBe(true);
    expect(keepsNodeChat(NODE_OPEN, ['art'])).toBe(false);
    expect(keepsNodeChat(NODE_OPEN, ['f', 'art'])).toBe(false);
    expect(keepsNodeChat(NODE_OPEN, [])).toBe(false);
    expect(keepsNodeChat(OPEN, [])).toBe(true);
  });

  it('sends the node as the subject, and an element chat its elements’ frames', () => {
    expect(inlineSubmitFrameIds(NODE_OPEN, ['x'])).toEqual(['f']);
    expect(inlineSubmitFrameIds(OPEN, ['x', 'y'])).toEqual(['x', 'y']);
  });
});
