import type { ElementEvidence, ImageRef, PromptAttachment } from '@studio/events';
import { describe, expect, it } from 'bun:test';
import {
  endingVerdict,
  reducePen,
  releaseVerdict,
  restoresOnRefusal,
  type PenAction,
  type PenPrompt,
  type PenResult,
  type PenState,
} from './pen.js';

const image = (id: string): ImageRef => ({ id, mediaType: 'image/png' });

describe('queued skill choice', () => {
  it('uses the latest explicit skill while retaining held files and text', () => {
    const older = { kind: 'skill' as const, name: 'brand', description: 'Use brand assets', agent: 'claude' as const };
    const newer = { ...older, name: 'audit' };
    const file = { kind: 'file' as const, id: 'file-1', name: 'brand.svg', mediaType: 'text/plain' as const, originalSize: 15 };
    const first = held('Use the brand', { attachments: [file, older] });
    const joined = reducePen(first, { type: 'hold', isLive: true, prompt: { text: 'Audit the layout', attachments: [newer] } });
    expect(joined.pen?.attachments).toEqual([file, newer]);
    expect(joined.pen?.text).toContain('Use the brand');
    expect(joined.pen?.text).toContain('Audit the layout');
    const plain = reducePen(first, { type: 'hold', isLive: true, prompt: { text: 'And the footer' } });
    expect(plain.pen?.attachments).toEqual([file, older]);
  });
});

const element = (id: string): ElementEvidence => ({
  kind: 'element',
  id,
  tag: 'div',
  domPath: 'div:nth-of-type(1)',
  outerHtmlSnippet: '<div></div>',
  textContent: '',
  classes: [],
  frameUrl: 'http://localhost:3000/',
});

function held(
  text: string,
  options: { attachments?: PromptAttachment[]; context?: string; turnId?: string } = {},
): PenState {
  const result = reducePen(null, {
    type: 'hold',
    isLive: true,
    prompt: {
      text,
      ...(options.attachments === undefined ? {} : { attachments: options.attachments }),
      ...(options.context === undefined ? {} : { context: options.context }),
    },
    ...(options.turnId === undefined ? {} : { turnId: options.turnId }),
  });
  if (result.pen === null) throw new Error('a hold while live leaves a pen');
  return result.pen;
}

const sent = (result: PenResult): PenPrompt => {
  if (result.outcome.kind !== 'send') throw new Error(`expected a send, got ${result.outcome.kind}`);
  return result.outcome.prompt;
};

describe('reducePen', () => {
  it('holds a prompt sent while a turn is live and mints a receipt for it', () => {
    const result = reducePen(null, {
      type: 'hold',
      isLive: true,
      turnId: 't1',
      prompt: { text: 'make the header tighter', attachments: [image('i1')] },
    });

    expect(result.outcome).toEqual({ kind: 'held' });
    expect(result.pen?.text).toBe('make the header tighter');
    expect(result.pen?.attachments).toEqual([image('i1')]);
    expect(result.pen?.turnId).toBe('t1');
    expect(result.pen?.penId).toBe(1);
    expect(result.pen?.verdict).toBeUndefined();
  });

  it('joins a second prompt into the held one, unions its attachments, and retires the receipt', () => {
    const first = held('make the header tighter', {
      attachments: [image('i1'), element('e1')],
      context: 'frame: home',
      turnId: 't1',
    });

    const result = reducePen(first, {
      type: 'hold',
      isLive: true,
      turnId: 't1',
      prompt: {
        text: 'and raise the contrast',
        attachments: [image('i1'), image('i2'), element('e2')],
        context: 'frame: pricing',
      },
    });

    expect(result.outcome).toEqual({ kind: 'held' });
    expect(result.pen?.text).toBe('make the header tighter\n\nand raise the contrast');
    expect(result.pen?.attachments).toEqual([
      image('i1'),
      element('e1'),
      image('i2'),
      element('e2'),
    ]);
    expect(result.pen?.context).toBe('frame: pricing');
    expect(result.pen?.penId).not.toBe(first.penId);
  });

  it('keeps the held context when the joining prompt carries none', () => {
    const first = held('make the header tighter', { context: 'frame: home', turnId: 't1' });
    const result = reducePen(first, {
      type: 'hold',
      isLive: true,
      turnId: 't1',
      prompt: { text: 'and raise the contrast' },
    });

    expect(result.pen?.context).toBe('frame: home');
  });

  it('sends a prompt that arrives while nothing is running instead of leaving it waiting', () => {
    const result = reducePen(null, {
      type: 'hold',
      isLive: false,
      prompt: { text: 'make the header tighter', attachments: [image('i1')] },
    });

    expect(result.pen).toBeNull();
    expect(result.outcome).toEqual({
      kind: 'send',
      cause: 'immediate',
      prompt: { text: 'make the header tighter', attachments: [image('i1')] },
    });
  });

  it('joins a prompt into a loaded pen and sends the pair when nothing is running', () => {
    const first = held('make the header tighter', { attachments: [image('i1')] });

    const result = reducePen(first, {
      type: 'hold',
      isLive: false,
      prompt: { text: 'and raise the contrast', attachments: [image('i2')] },
    });

    expect(result.pen).toBeNull();
    expect(sent(result)).toEqual({
      text: 'make the header tighter\n\nand raise the contrast',
      attachments: [image('i1'), image('i2')],
    });
  });

  describe('a tap from the next-tasks card (ONL-2901)', () => {
    const tap = { text: 'Show the page on mobile', context: 'one of the tasks you suggested', suggestion: { index: 0, taps: 1 } };
    const resend = { text: 'Show the page on mobile', resends: 'suggestion' as const };

    it('sends alone as a tap, or as a resent one', () => {
      expect(sent(reducePen(null, { type: 'hold', isLive: false, prompt: tap }))).toEqual(tap);
      expect(sent(reducePen(null, { type: 'hold', isLive: false, prompt: resend }))).toEqual(resend);
    });

    it('never joins a waiting message, which stays waiting as it was', () => {
      const waiting: PenState = { ...held('make the header tighter', { context: 'frame: home' }), verdict: 'hold' };
      for (const given of [tap, resend]) {
        const result = reducePen(waiting, { type: 'hold', isLive: false, prompt: given });
        expect(sent(result)).toEqual(given);
        expect(result.pen).toBe(waiting);
      }
      expect(reducePen(waiting, { type: 'hold', isLive: true, prompt: tap })).toEqual({ pen: waiting, outcome: { kind: 'none' } });
    });

    it('keeps its suggestion when it parked alone and is released alone', () => {
      const parked = reducePen(null, { type: 'hold', isLive: true, prompt: tap, turnId: 't1' }).pen;
      expect(sent(reducePen(parked, { type: 'turnEnded', turnId: 't1', stopReason: 'success' })).suggestion).toEqual({ index: 0, taps: 1 });
    });

    it('becomes the designer\'s words once a typed message joins it, or once it is taken back', () => {
      const parked = reducePen(null, { type: 'hold', isLive: true, prompt: tap, turnId: 't1' }).pen;
      const joined = reducePen(parked, { type: 'hold', isLive: true, prompt: { text: 'and make it dark' } }).pen;
      expect(sent(reducePen(joined, { type: 'turnEnded', turnId: 't1', stopReason: 'success' }))).toEqual({
        text: 'Show the page on mobile\n\nand make it dark',
        context: 'one of the tasks you suggested',
      });
      if (parked === null) throw new Error('expected a parked tap');
      const taken = reducePen(parked, { type: 'take', penId: parked.penId }).outcome;
      expect(taken.kind === 'taken' ? taken.prompt : undefined).toEqual({ text: tap.text, context: tap.context });
    });
  });

  it('hands the text and the attachments back on a take, and empties the pen', () => {
    const pen = held('make the header tighter', {
      attachments: [image('i1'), element('e1')],
      context: 'frame: home',
      turnId: 't1',
    });

    const result = reducePen(pen, { type: 'take', penId: pen.penId });

    expect(result.pen).toBeNull();
    expect(result.outcome).toEqual({
      kind: 'taken',
      prompt: {
        text: 'make the header tighter',
        attachments: [image('i1'), element('e1')],
        context: 'frame: home',
      },
    });
  });

  it('empties the pen on a discard and asks for no send', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const result = reducePen(pen, { type: 'discard', penId: pen.penId });

    expect(result.pen).toBeNull();
    expect(result.outcome).toEqual({ kind: 'emptied', reason: 'discard' });
  });

  it('refuses a take and a discard that quote a receipt the pen has retired', () => {
    const first = held('make the header tighter', { turnId: 't1' });
    const joined = reducePen(first, {
      type: 'hold',
      isLive: true,
      turnId: 't1',
      prompt: { text: 'and raise the contrast' },
    }).pen;
    if (joined === null) throw new Error('a hold while live leaves a pen');

    const stale: PenAction[] = [
      { type: 'take', penId: first.penId },
      { type: 'discard', penId: first.penId },
    ];
    for (const action of stale) {
      const result = reducePen(joined, action);
      expect(result.outcome).toEqual({ kind: 'none' });
      expect(result.pen).toBe(joined);
    }
  });

  it('binds a prompt held before the backend named a turn to the turn that arrives next', () => {
    const pen = held('make the header tighter');
    expect(pen.turnId).toBeUndefined();

    const bound = reducePen(pen, { type: 'turnStarted', turnId: 't7' }).pen;
    expect(bound?.turnId).toBe('t7');
    expect(bound?.penId).toBe(pen.penId);

    const ended = reducePen(bound, { type: 'turnEnded', turnId: 't7', stopReason: 'completed' });
    expect(ended.pen).toBeNull();
    expect(ended.outcome).toEqual({
      kind: 'send',
      cause: 'released',
      prompt: { text: 'make the header tighter' },
    });
  });

  it('rebinds to a later turn, so a turn that died without an ending cannot strand it', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const rebound = reducePen(pen, { type: 'turnStarted', turnId: 't2' });

    expect(rebound.pen?.turnId).toBe('t2');
    expect(rebound.outcome).toEqual({ kind: 'none' });
    expect(sent(reducePen(rebound.pen, { type: 'turnEnded', turnId: 't2', stopReason: 'completed' }))).toEqual(
      { text: 'make the header tighter' },
    );
  });

  it('leaves a pen already held back alone when a later turn starts', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const stopped = reducePen(pen, { type: 'turnEnded', turnId: 't1', stopReason: 'interrupted' }).pen;
    const result = reducePen(stopped, { type: 'turnStarted', turnId: 't2' });

    expect(result.pen?.turnId).toBe('t1');
    expect(result.outcome).toEqual({ kind: 'none' });
  });

  it('releases a cleanly ended turn on the falling edge when the ending still read live', () => {
    const pen = held('make the header tighter', { turnId: 't1' });

    const latched = reducePen(pen, {
      type: 'turnEnded',
      turnId: 't1',
      stopReason: 'success',
      isLive: true,
    });
    expect(latched.outcome).toEqual({ kind: 'none' });
    expect(latched.pen?.verdict).toBe('send');

    const released = reducePen(latched.pen, { type: 'liveSettled' });
    expect(released.pen).toBeNull();
    expect(released.outcome).toEqual({
      kind: 'send',
      cause: 'released',
      prompt: { text: 'make the header tighter' },
    });
  });

  it('releases once, so a second falling edge asks for nothing', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const released = reducePen(pen, { type: 'turnEnded', turnId: 't1', stopReason: 'success' });
    expect(released.outcome.kind).toBe('send');

    const again = reducePen(released.pen, { type: 'liveSettled' });
    expect(again.pen).toBeNull();
    expect(again.outcome).toEqual({ kind: 'none' });
  });

  it('leaves the prompt waiting when the designer stopped the turn', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const result = reducePen(pen, {
      type: 'turnEnded',
      turnId: 't1',
      stopReason: 'interrupted',
    });

    expect(result.outcome).toEqual({ kind: 'none' });
    expect(result.pen?.text).toBe('make the header tighter');
    expect(result.pen?.verdict).toBe('hold');
    expect(reducePen(result.pen, { type: 'liveSettled' }).outcome).toEqual({ kind: 'none' });
  });

  it('latches a hold when the turn ended and reported no verdict', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const result = reducePen(pen, { type: 'endedUnreported' });

    expect(result.outcome).toEqual({ kind: 'none' });
    expect(result.pen?.text).toBe('make the header tighter');
    expect(result.pen?.verdict).toBe('hold');
  });

  it('leaves a pen already latched to send alone when an ending reports no verdict', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const latched = reducePen(pen, {
      type: 'turnEnded',
      turnId: 't1',
      stopReason: 'success',
      isLive: true,
    }).pen;
    expect(latched?.verdict).toBe('send');

    const result = reducePen(latched, { type: 'endedUnreported' });
    expect(result.pen).toBe(latched);
    expect(result.outcome).toEqual({ kind: 'none' });
    expect(reducePen(result.pen, { type: 'liveSettled' }).outcome.kind).toBe('send');
  });

  it('leaves the prompt waiting for a turn.ended the pen is not bound to', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const result = reducePen(pen, { type: 'turnEnded', turnId: 't2', stopReason: 'success' });

    expect(result.pen).toBe(pen);
    expect(result.outcome).toEqual({ kind: 'none' });
  });

  it('leaves the prompt waiting for an ending the pen was never bound to a turn for', () => {
    const pen = held('make the header tighter');
    const result = reducePen(pen, { type: 'turnEnded', turnId: 't1', stopReason: 'success' });

    expect(result.pen).toBe(pen);
    expect(result.outcome).toEqual({ kind: 'none' });
  });

  it('re-arms a held-back pen behind the turn that is running when the next prompt joins it', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const stopped = reducePen(pen, {
      type: 'turnEnded',
      turnId: 't1',
      stopReason: 'interrupted',
    }).pen;

    const rearmed = reducePen(stopped, {
      type: 'hold',
      isLive: true,
      turnId: 't2',
      prompt: { text: 'and raise the contrast' },
    }).pen;
    expect(rearmed?.turnId).toBe('t2');
    expect(rearmed?.verdict).toBeUndefined();

    const released = reducePen(rearmed, { type: 'turnEnded', turnId: 't2', stopReason: 'success' });
    expect(sent(released)).toEqual({
      text: 'make the header tighter\n\nand raise the contrast',
    });
  });

  it('keeps the prompt when the session under it is replaced, and stops it releasing on its own', () => {
    const pen = held('make the header tighter', { attachments: [image('i1')], turnId: 't1' });
    const result = reducePen(pen, { type: 'sessionReplaced' });

    expect(result.outcome).toEqual({ kind: 'none' });
    expect(result.pen?.text).toBe('make the header tighter');
    expect(result.pen?.attachments).toEqual([image('i1')]);
    expect(result.pen?.penId).toBe(pen.penId);
    expect(result.pen?.turnId).toBeUndefined();
    expect(result.pen?.verdict).toBe('hold');
    expect(reducePen(result.pen, { type: 'turnStarted', turnId: 't2' }).pen?.turnId).toBeUndefined();
  });

  it('still carries the prompt out after the session under the pen was replaced', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const survived = reducePen(pen, { type: 'sessionReplaced' }).pen;
    const result = reducePen(survived, {
      type: 'hold',
      isLive: false,
      prompt: { text: 'and raise the contrast' },
    });

    expect(result.pen).toBeNull();
    expect(sent(result)).toEqual({
      text: 'make the header tighter\n\nand raise the contrast',
    });
  });

  it('empties the pen on teardown', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    const result = reducePen(pen, { type: 'teardown' });

    expect(result.pen).toBeNull();
    expect(result.outcome).toEqual({ kind: 'emptied', reason: 'teardown' });
  });

  it('answers every action on an empty pen with nothing to do', () => {
    expect(reducePen(null, { type: 'take', penId: 1 })).toEqual({ pen: null, outcome: { kind: 'none' } });
    expect(reducePen(null, { type: 'discard', penId: 1 })).toEqual({ pen: null, outcome: { kind: 'none' } });
    expect(reducePen(null, { type: 'turnStarted', turnId: 't1' })).toEqual({ pen: null, outcome: { kind: 'none' } });
    expect(reducePen(null, { type: 'turnEnded', turnId: 't1', stopReason: 'success' })).toEqual({
      pen: null,
      outcome: { kind: 'none' },
    });
    expect(reducePen(null, { type: 'liveSettled' })).toEqual({ pen: null, outcome: { kind: 'none' } });
    expect(reducePen(null, { type: 'endedUnreported' })).toEqual({ pen: null, outcome: { kind: 'none' } });
    expect(reducePen(null, { type: 'sessionReplaced' })).toEqual({ pen: null, outcome: { kind: 'none' } });
    expect(reducePen(null, { type: 'teardown' })).toEqual({ pen: null, outcome: { kind: 'none' } });
  });
});

describe('endingVerdict', () => {
  it('sends on either backend spelling of a clean finish', () => {
    expect(endingVerdict('success')).toBe('send');
    expect(endingVerdict('completed')).toBe('send');
  });

  it('holds on every ending that hands the decision back to the designer', () => {
    expect(endingVerdict('interrupted')).toBe('hold');
    expect(endingVerdict('failed')).toBe('hold');
    expect(endingVerdict('error')).toBe('hold');
    expect(endingVerdict('error_max_turns')).toBe('hold');
    expect(endingVerdict('aborted_streaming')).toBe('hold');
    expect(endingVerdict('refused')).toBe('hold');
  });

  it('holds on an ending that names no reason, which telemetry would read as a success', () => {
    expect(endingVerdict(undefined)).toBe('hold');
  });

  it('holds on a reason it does not recognise, rather than reading it as a clean finish', () => {
    expect(endingVerdict('unknown')).toBe('hold');
    expect(endingVerdict('max_turns')).toBe('hold');
    expect(endingVerdict('something_a_backend_adds_later')).toBe('hold');
  });
});

describe('releaseVerdict', () => {
  it('sends only for the ending of the turn the pen is bound to', () => {
    const pen = held('make the header tighter', { turnId: 't1' });
    expect(releaseVerdict(pen, { turnId: 't1', stopReason: 'success' })).toBe('send');
    expect(releaseVerdict(pen, { turnId: 't2', stopReason: 'success' })).toBe('hold');
  });

  it('holds for a pen behind no turn at all', () => {
    const pen = held('make the header tighter');
    expect(releaseVerdict(pen, { turnId: 't1', stopReason: 'success' })).toBe('hold');
  });

  it('holds once a verdict is latched, so a later ending cannot send it', () => {
    const pen: PenState = { ...held('make the header tighter', { turnId: 't1' }), verdict: 'hold' };
    expect(releaseVerdict(pen, { turnId: 't1', stopReason: 'success' })).toBe('hold');
  });
});

describe('restoresOnRefusal', () => {
  it('leaves a purely fresh prompt to the composer, which still holds that copy', () => {
    expect(restoresOnRefusal('immediate', null)).toBe(false);
  });

  it('puts a joined prompt back, because the pen held the only copy of the earlier words', () => {
    expect(restoresOnRefusal('immediate', held('make the header tighter'))).toBe(true);
  });

  it('puts the prompt back for a send the release asked for', () => {
    expect(restoresOnRefusal('released', held('make the header tighter'))).toBe(true);
    expect(restoresOnRefusal('released', null)).toBe(true);
  });
});
