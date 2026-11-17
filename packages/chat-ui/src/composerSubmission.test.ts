import { describe, expect, it } from 'bun:test';
import type { TranscriptItem } from '@studio/events';
import {
  canSubmitComposer,
  resolveComposerEnter,
  resolveComposerRecall,
  resolveComposerEscape,
  composerHistory,
  type ComposerEnterVerdict,
} from './composerSubmission.js';

describe('canSubmitComposer', () => {
  it('requires a connection and either trimmed text or a payload', () => {
    expect(canSubmitComposer(true, ' hello ', false)).toBe(true);
    expect(canSubmitComposer(true, '   ', true)).toBe(true);
    expect(canSubmitComposer(true, '   ', false)).toBe(false);
    expect(canSubmitComposer(false, 'hello', true)).toBe(false);
  });
});

describe('resolveComposerEnter', () => {
  const base = {
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    keyCode: 13,
    isConnected: true,
  };

  it('owns connected text and payload Enter so Astryx cannot clear early', () => {
    expect(resolveComposerEnter({ ...base, text: 'hello', hasPayload: false })).toBe('send');
    expect(resolveComposerEnter({ ...base, text: '', hasPayload: true })).toBe('send');
    expect(resolveComposerEnter({ ...base, text: 'hello', hasPayload: true })).toBe('send');
  });

  it('leaves Shift+Enter, IME, unrelated keys, and empty input to Astryx', () => {
    expect(
      resolveComposerEnter({ ...base, shiftKey: true, text: '', hasPayload: true }),
    ).toBe('ignore');
    expect(
      resolveComposerEnter({ ...base, isComposing: true, text: '', hasPayload: true }),
    ).toBe('ignore');
    expect(
      resolveComposerEnter({ ...base, keyCode: 229, text: '', hasPayload: true }),
    ).toBe('ignore');
    expect(
      resolveComposerEnter({ ...base, key: 'Escape', text: '', hasPayload: true }),
    ).toBe('ignore');
    expect(resolveComposerEnter({ ...base, text: ' ', hasPayload: false })).toBe('ignore');
  });

  it('leaves Enter to Astryx while there is no session to send to', () => {
    expect(
      resolveComposerEnter({ ...base, isConnected: false, text: '', hasPayload: true }),
    ).toBe('ignore');
    expect(
      resolveComposerEnter({ ...base, isConnected: false, text: 'hello', hasPayload: true }),
    ).toBe('ignore');
  });

  it('answers only ignore or send across every state, so nothing is refused (ONL-2294)', () => {
    const verdicts = new Set<ComposerEnterVerdict>();
    for (const key of ['Enter', 'Escape']) {
      for (const shiftKey of [false, true]) {
        for (const isComposing of [false, true]) {
          for (const keyCode of [13, 229]) {
            for (const isConnected of [true, false]) {
              for (const text of ['', '  ', 'hello']) {
                for (const hasPayload of [false, true]) {
                  verdicts.add(
                    resolveComposerEnter({
                      key,
                      shiftKey,
                      isComposing,
                      keyCode,
                      isConnected,
                      text,
                      hasPayload,
                    }),
                  );
                }
              }
            }
          }
        }
      }
    }
    expect([...verdicts].sort()).toEqual(['ignore', 'send']);
  });
});

describe('resolveComposerRecall', () => {
  const items: TranscriptItem[] = [
    { kind: 'user', id: 'u1', text: 'make the header blue' },
    { kind: 'assistant-text', id: 'a1', text: 'Done.', isStreaming: false },
    { kind: 'user', id: 'u2', text: 'now make it teal', attachments: [{ id: 'i1', mediaType: 'image/png' }] },
    { kind: 'user', id: 'u3', text: '', attachments: [{ id: 'i2', mediaType: 'image/png' }] },
    { kind: 'user', id: 'u4', text: 'set up the project', origin: 'studio' },
  ];
  const base = {
    key: 'ArrowUp',
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    isComposing: false,
    text: '',
    hasSkill: false,
    items,
  };

  it('recalls the latest user prompt including attachment-only prompts, excluding Studio', () => {
    expect(resolveComposerRecall(base)?.prompt).toEqual({ text: '', attachments: [{ id: 'i2', mediaType: 'image/png' }] });
    expect(resolveComposerRecall({ ...base, items: [] })).toBeUndefined();
  });

  it('walks back and forward without a cap and restores the exact original draft payload', () => {
    const draft = { text: '', attachments: [{ id: 'draft-image', mediaType: 'image/png' as const }] };
    const newest = resolveComposerRecall(base, draft)!;
    const older = resolveComposerRecall({ ...base, text: newest.prompt.text, walk: newest.walk! })!;
    expect(older.prompt).toEqual({ text: 'now make it teal', attachments: [{ id: 'i1', mediaType: 'image/png' }] });
    expect(older.stepsBack).toBe(2);
    const oldest = resolveComposerRecall({ ...base, text: older.prompt.text, walk: older.walk! })!;
    expect(oldest.prompt.text).toBe('make the header blue');
    expect(resolveComposerRecall({ ...base, text: oldest.prompt.text, walk: oldest.walk! })?.stepsBack).toBe(3);
    const forward = resolveComposerRecall({ ...base, key: 'ArrowDown', walk: older.walk! })!;
    const restored = resolveComposerRecall({ ...base, key: 'ArrowDown', walk: forward.walk! })!;
    expect(restored.prompt).toEqual(draft);
    expect(restored.walk).toBeUndefined();
    expect(restored.stepsBack).toBe(0);
  });

  it('collapses only consecutive equivalent typed prompts and retains context and steering', () => {
    const prompt: TranscriptItem = { kind: 'user', id: 'first', text: 'same', context: 'frame context', delivery: 'steering', attachments: [{ id: 'image', mediaType: 'image/png' }] };
    expect(composerHistory([prompt, { kind: 'assistant-text', id: 'reply', text: 'ok', isStreaming: false }, { ...prompt, id: 'second' }, { kind: 'user', id: 'studio', origin: 'studio', text: 'setup' }])).toEqual([{ text: prompt.text, attachments: prompt.attachments!, context: 'frame context' }]);
    expect(composerHistory([prompt, { ...prompt, id: 'different', attachments: [{ id: 'other', mediaType: 'image/png' }] }, prompt])).toHaveLength(3);
  });

  it('walks past a tapped next task, which the designer never typed (ONL-2901)', () => {
    const items: TranscriptItem[] = [{ kind: 'user', id: 'typed-1', text: 'Remix the hero' }, { kind: 'user', id: 'tap', text: 'Push the remix further', origin: 'suggestion', context: 'one of the tasks you suggested' }, { kind: 'user', id: 'typed-2', text: 'Make it blue' }];
    const walked = (): string[] => {
      const texts: string[] = [];
      let step = resolveComposerRecall({ ...base, items });
      while (step?.walk !== undefined) {
        texts.push(step.prompt.text);
        if (step.walk.index === 0) break;
        step = resolveComposerRecall({ ...base, items, text: step.prompt.text, walk: step.walk });
      }
      return texts;
    };
    expect(walked()).toEqual(['Make it blue', 'Remix the hero']);
  });

  it('acts only on a plain ArrowUp in an empty composer, so a draft keeps its caret movement', () => {
    expect(resolveComposerRecall({ ...base, text: 'draft' })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, text: '\n' })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, key: 'ArrowDown' })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, shiftKey: true })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, altKey: true })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, metaKey: true })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, ctrlKey: true })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, isComposing: true })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, keyCode: 229 })).toBeUndefined();
  });

  it('keeps a chosen skill instead of recalling over it, since the token is not text to walk past', () => {
    expect(resolveComposerRecall({ ...base, hasSkill: true })).toBeUndefined();
    expect(resolveComposerRecall({ ...base, hasSkill: true, text: 'arguments' })).toBeUndefined();
  });

  it('walks on through a step that restores a token, which only the start refuses', () => {
    const started = resolveComposerRecall(base)!;
    const next = resolveComposerRecall({ ...base, hasSkill: true, text: started.prompt.text, walk: started.walk! });
    expect(next?.prompt.text).toBe('now make it teal');
  });
});

describe('resolveComposerEscape', () => {
  const running = {
    key: 'Escape',
    isComposing: false,
    keyCode: 27,
    isRepeat: false,
    isTurnRunning: true,
    isAwaitingUser: false,
    isEscapeClaimed: false,
  };

  it('stops a running turn, as the stop button does', () => {
    expect(resolveComposerEscape(running)).toBe('stop');
  });

  it('does nothing when no turn is running, so a draft survives Esc', () => {
    expect(resolveComposerEscape({ ...running, isTurnRunning: false })).toBe('ignore');
  });

  it('leaves Esc to the input method while it is composing', () => {
    expect(resolveComposerEscape({ ...running, isComposing: true })).toBe('ignore');
    expect(resolveComposerEscape({ ...running, keyCode: 229 })).toBe('ignore');
  });

  it('stops once per press, not on auto-repeat', () => {
    expect(resolveComposerEscape({ ...running, isRepeat: true })).toBe('ignore');
  });

  it('never stops a turn that waits on a question or permission card', () => {
    expect(resolveComposerEscape({ ...running, isAwaitingUser: true })).toBe('ignore');
  });

  it('yields to a host that already gives Esc a meaning', () => {
    expect(resolveComposerEscape({ ...running, isEscapeClaimed: true })).toBe('ignore');
  });

  it('answers only Escape', () => {
    expect(resolveComposerEscape({ ...running, key: 'Enter' })).toBe('ignore');
  });
});
